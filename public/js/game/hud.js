// In-game HUD, drawn into the low-res UI canvas (1 unit = 1 art pixel).

import { drawText, textCanvas, textWidth, GLYPH_H } from '../engine/font.js';
import { logo, padlock } from '../ui/ui.js';
import { SPR, buildSprite } from '../engine/sprites.js';
import { input, padKey } from '../engine/input.js';
import { fmtTime, fmtNum, clamp, makeCanvas, hexToRgb, TAU, ease } from '../engine/util.js';
import { WEAPONS, MAX_WEAPON_LEVEL, MAX_WEAPONS, MAX_RELICS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { RANKS, HERO_UNLOCK_TIME } from '../shared/profile.js';
import { NIGHTMARE } from '../data/difficulty.js';
import { view } from '../engine/view.js';
import { ringSprite } from './fxsprites.js';
import { DEATH, FLASH_SOFT, COMBO, comboTier } from './game.js';
import { ARRIVAL, LOW_HP, CARD_END } from './arrival.js';
import { ULT_LAUNCH, COMET } from './ultimate.js';
import { WARN, RECORD_GRACE } from './events.js';
import { SURVIVAL_BOSSES, RANKED_BOSS_EVERY } from '../data/waves.js';
import { HEROES } from '../data/heroes.js';
import { THIEF } from './enemies.js';

// Beside the clock on a Nightmare (three times the monsters; never Ranked).
const NIGHTMARE_TAG = NIGHTMARE.name.toUpperCase();

const ORB_R = 21, ORB_S = ORB_R * 2 + 6;
// The fury orb's three states: filling; ALMOST from `almost`% (its rim glows and pulses, the
// liquid shines `glow` of a full orb's); FULL (a chime and a ring bursting out of it for `burst` s
// when it fills: Player.addFury, then the key to press).
export const FURY_ORB = { almost: 85, glow: 0.45, burst: 0.55 };

// An orb's shape, the same for every orb and every frame: what each pixel of its square is. The
// glass's rims never change, so only the liquid inside is painted again each frame.
const OUT = 0, INK = 1, RIM_LIT = 2, RIM_DARK = 3, LIQUID = 4;
const RIMS = [null, [24, 20, 37], [254, 174, 52], [190, 74, 47]];
const SHAPE = new Uint8Array(ORB_S * ORB_S);
// Over the liquid, the glass: 0 clear, 1 its sheen (lightens), 2 its shaded edge (darkens).
const GLASS = new Uint8Array(ORB_S * ORB_S);
{
  const s = ORB_S, R = ORB_R, cx = s / 2, cy = s / 2;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const p = y * s + x, dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r > R + 2.5) SHAPE[p] = OUT;
      else if (r > R + 1.5) SHAPE[p] = INK;
      else if (r > R + 0.5) SHAPE[p] = dx + dy < 0 ? RIM_LIT : RIM_DARK;
      else if (r > R - 0.5) SHAPE[p] = INK;
      else {
        SHAPE[p] = LIQUID;
        if (Math.hypot(dx + R * 0.38, dy + R * 0.42) < R * 0.28) GLASS[p] = 1;
        else if (r > R - 2.5 && dx + dy > R * 0.6) GLASS[p] = 2;
      }
    }
  }
}
// The liquid's tones, by depth from the surface (an orb's own colours), and the dark above it.
const DEEP = 0, MID = 1, TOP = 2, FOAM = 3, EMPTY = 4;
const EMPTY_RGB = [13, 11, 20];
// This frame's surface height and rising bubbles, column by column (Orb.render).
const WAVE = new Float64Array(ORB_S), BUBBLE = new Uint8Array(ORB_S);

// Liquid orb rendered per-pixel into a small canvas.
class Orb {
  constructor(colors) {
    this.colors = colors.map(hexToRgb);
    const s = ORB_S;
    this.c = makeCanvas(s, s);
    this.g = this.c.getContext('2d');
    this.img = this.g.createImageData(s, s);
    this.shown = 1;
    // Each tone (deep, mid, top, foam, then the empty dark) under clear glass, its sheen and its
    // shaded edge, as red, green, blue; and the same lit by the glow of a full orb, each frame.
    const rgb = [...this.colors, EMPTY_RGB];
    this.tones = new Float64Array(rgb.length * 9);
    rgb.forEach((col, k) => {
      for (let ch = 0; ch < 3; ch++) {
        const c = col[ch], i = k * 9 + ch;
        this.tones[i] = c;
        this.tones[i + 3] = c + (255 - c) * 0.35;
        this.tones[i + 6] = c * 0.75;
      }
    });
    this.lit = new Uint8ClampedArray(this.tones.length);
    // The rims once, and the whole orb opaque: the square outside it stays clear.
    const d = this.img.data;
    for (let p = 0; p < s * s; p++) {
      if (SHAPE[p] === OUT) continue;
      const col = RIMS[SHAPE[p]];
      if (col) {
        d[p * 4] = col[0];
        d[p * 4 + 1] = col[1];
        d[p * 4 + 2] = col[2];
      }
      d[p * 4 + 3] = 255;
    }
  }

  // glow: how much the liquid shines, pulsing (0 none; the fury orb's ALMOST and FULL, FURY_GLOW).
  render(frac, t, glow) {
    this.shown += (frac - this.shown) * 0.15;
    const s = ORB_S, R = ORB_R, cy = s / 2;
    const d = this.img.data, tones = this.tones, lit = this.lit;
    const level = cy + R - 2 * R * clamp(this.shown, 0, 1);
    const shine = 40 * glow * (0.5 + 0.5 * Math.sin(t * 8));
    for (let k = 0; k < tones.length; k++) lit[k] = glow ? Math.min(255, tones[k] + shine) : tones[k];
    for (let x = 0; x < s; x++) {
      WAVE[x] = Math.sin(x * 0.45 + t * 3) * 1.1 + Math.sin(x * 0.2 - t * 2) * 0.8;
      BUBBLE[x] = Math.floor((t * 7 + x * 13) % 9) === 0 ? 1 : 0;
    }
    for (let y = 0; y < s; y++) {
      const depth = (y - level) / (2 * R);
      const tone = depth < 0.08 ? FOAM : depth < 0.3 ? TOP : depth < 0.65 ? MID : DEEP;
      // Rising bubbles.
      const bubbles = Math.floor(y + t * 20) % 11 === 0;
      for (let x = 0; x < s; x++) {
        const p = y * s + x;
        if (SHAPE[p] !== LIQUID) continue;
        const k = y + 0.5 > level + WAVE[x] ? (bubbles && BUBBLE[x] ? FOAM : tone) : EMPTY;
        const j = k * 9 + GLASS[p] * 3, i = p * 4;
        d[i] = lit[j];
        d[i + 1] = lit[j + 1];
        d[i + 2] = lit[j + 2];
      }
    }
    this.g.putImageData(this.img, 0, 0);
    return this.c;
  }
}

// A crisp ring of radius r round (cx, cy) on the HUD.
function orbRing(ctx, cx, cy, r, color) {
  const img = ringSprite(r, color);
  ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));
}

// Where a line of text drawn at y ends, its outline and all.
const lineBottom = (y) => y + GLYPH_H + 1;
// A boss's bar: lower in a dungeon or a crypt, under their own lines.
const bossBarY = (g) => (g.mode === 'dungeon' || g.inCrypt ? 48 : 43);
// The night's bar under the clock: its half width, and the marks on it (drawTop).
// On a narrow screen it keeps clear of the relic slots (drawSlots: 18 px apart from x 3), never
// narrower than its old 60 px.
const NIGHT_BAR = 60, SLOTS_RIGHT = 3 + Math.max(MAX_WEAPONS, MAX_RELICS) * 18;
export const nightBarHalf = (cx) => Math.max(30, Math.min(NIGHT_BAR, Math.floor(cx) - SLOTS_RIGHT - 4));
// A small skull, 5 x 5: a mark for a boss on the night's bar.
const SKULL = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
function drawSkull(ctx, x, y, color) {
  ctx.fillStyle = '#181425';
  ctx.fillRect(x - 3, y - 1, 7, 7);
  ctx.fillStyle = color;
  SKULL.forEach((row, j) => {
    for (let i = 0; i < 5; i++) if (row[i] === '#') ctx.fillRect(x - 2 + i, y + j, 1, 1);
  });
}
// A hero's head, cut from the top of their standing sprite to 6 x 6 (cached): the face of the hero
// a run is about to unlock, on the night's bar.
const heads = new Map();
function heroHead(id) {
  if (heads.has(id)) return heads.get(id);
  const spr = SPR[HEROES[id].sprite], src = spr && spr.frames[0] && spr.frames[0].c;
  if (!src) return null;
  let d = null;
  try {
    d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  } catch {
    // no pixels to read (a headless run): no face
  }
  if (!d) {
    heads.set(id, null);
    return null;
  }
  let x0 = src.width, x1 = -1, y0 = src.height, y1 = -1;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (d[(y * src.width + x) * 4 + 3] < 20) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return null;
  const side = Math.max(6, Math.round((y1 - y0 + 1) * 0.42)), cx = Math.round((x0 + x1) / 2);
  const c = makeCanvas(6, 6), cc = c.getContext('2d');
  cc.imageSmoothingEnabled = false;
  cc.drawImage(src, cx - side / 2, y0, side, side, 0, 0, 6, 6);
  heads.set(id, c);
  return c;
}
// The bar's width, its name's colours, and how a fallen boss's bar ends (Hud.barFall).
const BAR_W = (W) => Math.min(220, W - 120);
const BAR_NAME = ['#fee761', '#feae34', '#be4a2f'];
export const BAR_FALL = { hold: 0.8, flash: 0.15, drop: 0.7, pieces: 22 };
// The experience bar's wrap (28 October 2026, the 27 October review's C3: it snapped down to what
// was left): levels gained at once run it to its end at `fill` bars a second, flash it white for
// `flash` s (FLASHES: SOFT: FLASH_SOFT) and start it again from nought, one by one; within a level
// it eases to the hero's at `ease` a second (it was a quarter a frame); of a burst of many (the
// developer's +10) only the last `most` are run.
export const XP_WRAP = { fill: 5, flash: 0.1, ease: 17, most: 3 };
// The combo's pop (drawCombo), in real time: the count at `count` times its size as it comes up and
// at each new tier, settling at `settle` a second (it was a fifth a frame); a new tier's word at
// `word` times, settling over `wordFor` s, white for its first `white` s (not with FLASHES: SOFT).
export const COMBO_POP = { count: 1.5, settle: 13, word: 1.5, wordFor: 0.35, white: 0.1 };
const COMBO_WORDS = ['COMBO', 'CARNAGE!', 'MASSACRE!', 'ANNIHILATION!', 'GODLIKE!'];
function barFrame(ctx, x, y, w) {
  ctx.fillStyle = '#181425';
  ctx.fillRect(x - 2, y - 2, w + 4, 10);
  ctx.fillStyle = '#3e2731';
  ctx.fillRect(x, y, w, 6);
}
// The phase notches at a quarter, a half and three quarters.
function barNotches(ctx, x, y, w) {
  ctx.fillStyle = '#181425';
  for (let q = 1; q < 4; q++) ctx.fillRect(x + Math.round((w * q) / 4), y, 1, 6);
}

// The clock the HUD shows, and the pause screen with it: a timed run's time left; Ranked's and a
// Dungeon Run's time so far.
export const clockCountsDown = (g) => g.mode !== 'dungeon' && g.mode !== 'ranked';
export const clockTime = (g) => (clockCountsDown(g) ? Math.max(0, g.duration - g.time) : g.time);

// The markers at the screen's edge: an arrow, and beside it, on the inner side, the icon of what it
// points at, so that colour is not all that tells a boss from a Shrine of Fury, or a chest from the
// thief. The arrow keeps within MARK_R of where it stands (its tip, its bob, rounding); the icon's
// middle is MARK_IN further in. The band's edges go round from the top: top, right, bottom, left.
const MARK_R = 9, MARK_IN = 11;
const IN_X = [0, -1, 0, 1], IN_Y = [1, 0, -1, 0];
// The icons: 6×6, 8×8 with the outline. A shrine's gem (#) is its shrine's colour.
const MARK_ART = {
  boss: ['.zzzz.', 'zzzzzz', 'zxzzxz', 'zxzzxz', '.zzzz.', '.zkkz.'],
  chest: ['.bbbb.', 'bBBBBb', 'yyYYyy', 'bByyBb', 'bBBBBb', 'bbbbbb'],
  coin: ['.yyyy.', 'yYYYyo', 'yYyyyo', 'yYyyyo', 'yyyyoo', '.oooo.'],
  crypt: ['.NNNN.', 'NNppNN', 'NpPPpN', 'NpPPpN', 'NpPPpN', 'NNNNNN'],
  stairs: ['....GG', '....Gg', '..GGgg', '..Gggg', 'GGgggg', 'Gggggg'],
  shrine: ['..##..', '.#w##.', '..##..', '.GGgg.', '.Gggg.', 'GGgggg'],
  warn: ['..oo..', '.okko.', '.okko.', 'ookkoo', 'oooooo', 'ookkoo'], // an event coming: a warning triangle
};
const SHRINE_GEMS = { fury: 'r', haste: 'c', fortune: 'y', wisdom: 'j', protection: 'L' };
// What the world's own marker is, told by its colour (Dungeon.marker): the stairs down, a crypt's
// way out, a guardian or a lord asleep.
const WORLD_MARKS = { '#63c74d': 'stairs', '#2ce8f5': 'stairs', '#e43b44': 'boss' };
let MARKS = null;
function marks() {
  if (MARKS) return MARKS;
  const icon = (rows) => buildSprite('mark', { frames: [rows] }).frames[0].c;
  MARKS = { shrine: {} };
  for (const [id, rows] of Object.entries(MARK_ART)) if (id !== 'shrine') MARKS[id] = icon(rows);
  for (const [id, gem] of Object.entries(SHRINE_GEMS)) MARKS.shrine[id] = icon(MARK_ART.shrine.map((r) => r.replaceAll('#', gem)));
  return MARKS;
}

// This frame's band the markers stand on, and the boxes ([x, y, w, h]) they keep off
// (Hud.markerBand); where a marker stands (placeMarker). Reused from frame to frame.
const BAND = { top: 0, right: 0, bottom: 0, left: 0 };
const KEEP = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
let keepN = 0;
function keep(x, y, w, h) {
  const k = KEEP[keepN++];
  k[0] = x;
  k[1] = y;
  k[2] = w;
  k[3] = h;
}
const SPOT = { x: 0, y: 0, edge: 0 };

// The point u of the way round the band, clockwise from its top-left corner, into SPOT.
function bandPoint(u) {
  const b = BAND, w = b.right - b.left, h = b.bottom - b.top, round = 2 * (w + h);
  u = ((u % round) + round) % round;
  if (u < w) (SPOT.x = b.left + u), (SPOT.y = b.top), (SPOT.edge = 0);
  else if (u < w + h) (SPOT.x = b.right), (SPOT.y = b.top + u - w), (SPOT.edge = 1);
  else if (u < 2 * w + h) (SPOT.x = b.right - (u - w - h)), (SPOT.y = b.bottom), (SPOT.edge = 2);
  else (SPOT.x = b.left), (SPOT.y = b.bottom - (u - 2 * w - h)), (SPOT.edge = 3);
}

// Whether a marker standing at SPOT, arrow and icon, is clear of every box it keeps off.
function spotClear() {
  const x = SPOT.x, y = SPOT.y, ix = x + IN_X[SPOT.edge] * MARK_IN, iy = y + IN_Y[SPOT.edge] * MARK_IN;
  const x0 = Math.min(x - MARK_R, ix - 5), x1 = Math.max(x + MARK_R, ix + 5);
  const y0 = Math.min(y - MARK_R, iy - 5), y1 = Math.max(y + MARK_R, iy + 5);
  for (let i = 0; i < keepN; i++) {
    const k = KEEP[i];
    if (x0 < k[0] + k[2] && x1 > k[0] && y0 < k[1] + k[3] && y1 > k[1]) return false;
  }
  return true;
}

// Where the marker toward HUD point (sx, sy) stands, into SPOT: where the line from the band's
// middle toward it crosses the band, or, if that is on something it keeps off, the nearest spot
// along the band that is not.
function placeMarker(sx, sy) {
  const b = BAND, w = b.right - b.left, h = b.bottom - b.top;
  const a = Math.atan2(sy - (b.top + b.bottom) / 2, sx - (b.left + b.right) / 2), c = Math.cos(a), s = Math.sin(a);
  const kx = w / 2 / Math.abs(c || 1e-6), ky = h / 2 / Math.abs(s || 1e-6);
  let u;
  if (kx < ky) u = c > 0 ? w + h / 2 + s * kx : 2 * w + (3 * h) / 2 - s * kx;
  else u = s > 0 ? w + h + w / 2 - c * ky : w / 2 + c * ky;
  bandPoint(u);
  if (spotClear()) return;
  for (let d = 1; d < w + h; d++) {
    bandPoint(u + d);
    if (spotClear()) return;
    bandPoint(u - d);
    if (spotClear()) return;
  }
  bandPoint(u);
}

// Whether a foe stands where the hero has seen: in a crypt or on a Dungeon Run floor, a tile of the
// fog he has lit (Dungeon.seenAt), and in a crypt with no wall between them now (Game.inView);
// anywhere in the forest.
const seenBy = (g, e) => (!g.world.seenAt || g.world.seenAt(e.x, e.y)) && g.inView(e);

// The elites named this frame (the nearest the hero), and how far each is (squared).
const NAMED = 3;
const NEAR = new Array(NAMED).fill(null), NEAR_D = new Float64Array(NAMED);
// Over a foe's head, in HUD pixels (overHead).
const AT = { x: 0, y: 0 };

// The build as the HUD shows it, copied so it stays as it is (Hud.held): each weapon (w, the weapon
// itself, for the crypt's dimming; its icon, level and whether it had evolved), each relic's
// [id, rank], the gold.
export function heldBuild(g) {
  return {
    weapons: g.player.weapons.map((w) => ({ w, icon: w.def.icon, level: w.level, evolved: w.evolved })),
    relics: [...g.player.passives.entries()],
    gold: g.gold,
  };
}

// How long a slot a chest has just raised stays lit (ChestOverlay): seconds.
export const SLOT_LIT = 0.3;
// How lit one slot (row 'w' or 'r', i) is in drawSlots' lit: the brightest light on it, 0 for none.
function litK(lit, row, i) {
  let k = 0;
  for (const l of lit) if (l.row === row && l.i === i) k = Math.max(k, l.k);
  return k;
}
// How many of the slots' columns (18 px apart from x 3, a lit one's frame a pixel round it) stand
// wholly left of x: those a chest's screen paints in full light beside EVOLUTION! (drawSlots' cols).
export const slotsLeftOf = (x) => Math.max(0, Math.floor((x - 2) / 18));

// One thing a chest gave (an item of Game.rollChest), now shown on a held build: an evolution, a
// weapon or relic a level up or new. (A filler shows in no slot: a Blessing, a heal, and a Purse
// of Gold, whose gold the chest's screen counts with its own and its coins carry to the counter,
// 28 October 2026.) Returns the slot it changed, { row: 'w' (a weapon's) or 'r' (a relic's), i },
// or null: the chest's screen lights it up (drawSlots' lit).
export function revealOn(held, it, g) {
  if (it.type === 'evolve') {
    const i = held.weapons.findIndex((x) => x.w === it.w);
    if (i >= 0) {
      Object.assign(held.weapons[i], { icon: WEAPONS[it.id].icon, level: MAX_WEAPON_LEVEL, evolved: true });
      return { row: 'w', i };
    }
  } else if (it.type === 'weapon') {
    let i = held.weapons.findIndex((x) => x.w.id === it.id);
    if (i >= 0) held.weapons[i].level = it.level;
    else {
      const w = g.player.weapons.find((x) => x.id === it.id);
      if (!w) return null;
      i = held.weapons.push({ w, icon: w.def.icon, level: it.level, evolved: false }) - 1;
    }
    return { row: 'w', i };
  } else if (it.type === 'passive') {
    let i = held.relics.findIndex(([id]) => id === it.id);
    if (i >= 0) held.relics[i][1] = it.level;
    else i = held.relics.push([it.id, it.level]) - 1;
    return { row: 'r', i };
  }
  return null;
}

// The review's C8(c) (28 October 2026): a run nearing the most kills a run has made (Game.records,
// the profile's as the run began) shows it, dim, past KILL_NEAR of it, and NEW BEST in green once
// Game.checkRecords' banner has told it passed; never in the first minute (RECORD_GRACE), as that
// banner. Only a real record: none before one is kept. { text, color }, or null: nothing to show.
export const KILL_NEAR = 0.85;
export function killBest(g) {
  const rec = g.records?.kills || 0;
  if (rec <= 0 || g.time < RECORD_GRACE) return null;
  if (g.recordsBroken?.has('kills')) return { text: 'NEW BEST', color: '#63c74d' };
  return g.kills >= rec * KILL_NEAR ? { text: `BEST ${fmtNum(rec)}`, color: '#8b9bb4' } : null;
}

export class Hud {
  constructor(g) {
    this.g = g;
    this.hp = new Orb(['#5c0f1c', '#a22633', '#e43b44', '#f6757a']);
    this.fury = new Orb(['#2a1438', '#68386c', '#b55088', '#f6757a']);
    this.furyFull = new Orb(['#3b2346', '#b55088', '#f6757a', '#ffffff']);
    // The experience bar as shown (drawXp): how full, for which level (null until first drawn), and
    // its flash at a level gained.
    this.xpShown = 0;
    this.xpLevel = null;
    this.xpFlash = 0;
    this.comboScale = 1;
    this.tierShown = -1; // the combo's tier drawn last frame (drawCombo)
    this.comboRun = g.comboRun; // which combo that was (Game.comboRun)
    this.comboWordT = Infinity; // since a new tier's word popped
    // While a chest shows what it gave (ChestOverlay), the build as it was before it, which the
    // slots and the gold counter show until each thing is revealed (heldBuild); null: as it is.
    this.held = null;
    // The boss or lord whose bar was drawn last frame (its id, name line and drained bar then), and
    // the bar of one that fell, breaking up (barFall).
    this.barE = null;
    this.barId = 0;
    this.barLabel = '';
    this.barShown = 0;
    this.fall = null;
    // The gold counter as shown: it rolls up to the gold (Game.gold, or a chest's held gold) over
    // about half a second, pulsing as it gains; coins flung to it from gold piles (fling).
    this.goldRoll = 0;
    this.goldPulse = 0;
    this.flung = [];
  }

  // A coin flying from world point (x, y) to the gold counter (a gold pile picked up).
  fling(x, y) {
    const cam = this.g.cam, z = cam.S / view.S;
    if (this.flung.length < 12) this.flung.push({ x: (x - cam.x) * z, y: (y - 8 - cam.y) * z, t: 0 });
  }

  // A fury orb picked up: a comet from world point (x, y) to the HUD's orb, carrying `amount` of the
  // fury (already the hero's: the orb's fill waits for it, drawOrbs).
  comet(x, y, amount) {
    if (this.g.player.ultLocked) return; // no fury to carry to a locked orb
    const cam = this.g.cam, z = cam.S / view.S;
    (this.comets ??= []).push({ x: (x - cam.x) * z, y: (y - 8 - cam.y) * z, amount, t: 0 });
  }

  // The fury the orb shows: the hero's, less what is still flying to it.
  shownFury() {
    let f = this.g.player.fury;
    for (const c of this.comets || []) f -= c.amount;
    return Math.max(0, f);
  }

  // dt: real seconds since the last frame (the falling bar runs by it).
  draw(ctx, W, H, t, dt = 1 / 60) {
    const g = this.g, p = g.player;
    this.lastDt = dt;
    this.drawRingWarnings(ctx, W, H, t);
    this.drawUltLaunch(ctx, W, H);
    this.drawXp(ctx, W, p, dt);
    this.drawSlots(ctx, p);
    this.drawTop(ctx, W, t, dt);
    this.drawOrbs(ctx, W, H, p, t);
    this.drawBoss(ctx, W, dt);
    this.drawNames(ctx, W, H);
    this.drawCryptDoor(ctx, W);
    this.drawIndicators(ctx, W, H, t);
    this.drawSpeech(ctx, W, H);
    this.drawCombo(ctx, W, H, t, dt);
    this.drawBanners(ctx, W, H);
    this.drawArrival(ctx, W, H);
    this.drawSlain(ctx, W, H);
    if (g.world.drawMinimap) g.world.drawMinimap(ctx, W, H, g.showMap);
    if (input.device === 'touch') this.drawTouch(ctx, W, H, p);
  }

  // dt: real seconds since the last frame (the wrap runs on it, under the cards too: XP_WRAP).
  drawXp(ctx, W, p, dt = 1 / 60) {
    const f = clamp(p.xp / p.xpNext, 0, 1);
    // A new run's bar, or a level taken back: as it stands.
    if (this.xpLevel === null || p.level < this.xpLevel) {
      this.xpLevel = p.level;
      this.xpShown = f;
      this.xpFlash = 0;
    }
    this.xpLevel = Math.max(this.xpLevel, p.level - XP_WRAP.most);
    if (this.xpFlash > 0) {
      this.xpFlash -= dt;
      if (this.xpFlash <= 0) {
        this.xpLevel++;
        this.xpShown = 0;
      }
    } else if (this.xpLevel < p.level) {
      this.xpShown = Math.min(1, this.xpShown + XP_WRAP.fill * dt);
      if (this.xpShown >= 1) this.xpFlash = XP_WRAP.flash;
    } else {
      this.xpShown += (f - this.xpShown) * (1 - Math.exp(-dt * XP_WRAP.ease));
      if (f < this.xpShown) this.xpShown = f;
    }
    ctx.fillStyle = '#181425';
    ctx.fillRect(0, 0, W, 7);
    ctx.fillStyle = '#262b44';
    ctx.fillRect(1, 1, W - 2, 5);
    const w = Math.round((W - 2) * this.xpShown);
    ctx.fillStyle = '#124e89';
    ctx.fillRect(1, 1, w, 5);
    ctx.fillStyle = '#0099db';
    ctx.fillRect(1, 1, w, 3);
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(1, 1, w, 1);
    if (w > 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w - 1, 1, 2, 5);
    }
    if (this.xpFlash > 0) {
      // A level gained: the full bar flashes white (FLASHES: SOFT, held to FLASH_SOFT).
      ctx.globalAlpha = this.g.settings.softFlash === true ? FLASH_SOFT : 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 1, W - 2, 5);
      ctx.globalAlpha = 1;
    } else if (this.xpShown >= 0.85) {
      // Nearly there (85%): a shine runs along the bar and it breathes brighter.
      const t = this.g.clock, at = ((t * 1.6) % 1) * w;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 9);
      ctx.fillStyle = '#c0f8ff';
      ctx.fillRect(1, 1, w, 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(at), 1, 6, 5);
      ctx.globalAlpha = 1;
    }
    // The level as the bar has come to it, a step at each flash.
    drawText(ctx, `LV ${this.xpLevel + (this.xpFlash > 0 ? 1 : 0)}`, W - 3, 9, { align: 'right', color: ['#ffffff', '#fee761', '#feae34'] });
  }

  // lit: the slots a chest has just raised (ChestOverlay), each { row: 'w' or 'r', i, k }, k its
  // light running from 1 down to 0 (litMark); none on the HUD itself. cols: how many of the slots'
  // columns to draw, from the left (slotsLeftOf: a chest's screen leaves those under EVOLUTION! to
  // the HUD under its dim); all of them on the HUD itself.
  drawSlots(ctx, p, lit = null, cols = MAX_WEAPONS) {
    let x = 3;
    const y = 9;
    // In a crypt, where he fights by hand with his own weapon alone, the others are dimmed.
    const main = this.g.caveStrike ? this.g.mainWeapon() : null;
    const held = this.held;
    // The run's slots open; those the Armory's Arsenal and Reliquary have yet to add, locked
    // (Game.maxWeapons, maxRelics).
    const { maxWeapons = MAX_WEAPONS, maxRelics = MAX_RELICS } = this.g;
    for (let i = 0; i < Math.min(MAX_WEAPONS, cols); i++) {
      const h = held && held.weapons[i], w = held ? h && h.w : p.weapons[i];
      if (i >= maxWeapons && !h && !w) {
        this.lockedSlot(ctx, x, y);
        x += 18;
        continue;
      }
      if (main && w && w !== main) ctx.globalAlpha = 0.3;
      if (h) this.slot(ctx, x, y, SPR[h.icon], h.evolved ? -1 : h.level, MAX_WEAPON_LEVEL, h.evolved);
      else this.slot(ctx, x, y, w ? SPR[w.def.icon] : null, w ? (w.evolved ? -1 : w.level) : 0, MAX_WEAPON_LEVEL, w && w.evolved);
      // EVOLVE READY: the next chest opened evolves it (Game.evolvable, kept as evoReady). Not one
      // evolved since evoReady was last taken: a chest's screen holds the run still, and Game.update
      // with it, so the weapon it has just evolved would still be marked over the screen.
      if (w && !held && !w.evolved && this.g.evoReady.includes(w)) this.evoMark(ctx, x, y, this.g.clock);
      ctx.globalAlpha = 1;
      if (lit) this.litMark(ctx, x, y, litK(lit, 'w', i));
      x += 18;
    }
    x = 3;
    const ps = held ? held.relics : [...p.passives.entries()];
    for (let i = 0; i < Math.min(MAX_RELICS, cols); i++) {
      const e = ps[i];
      if (i >= maxRelics && !e) this.lockedSlot(ctx, x, y + 21, true);
      else this.slot(ctx, x, y + 21, e ? SPR[PASSIVES[e[0]].icon] : null, e ? e[1] : 0, e ? PASSIVES[e[0]].max : 5, false, true);
      if (lit) this.litMark(ctx, x, y + 21, litK(lit, 'r', i));
      x += 18;
    }
    // Shrine buffs.
    let bx = 3;
    for (const [id, b] of p.buffs) {
      const col = SHRINE_COLORS[id] || '#ffffff';
      ctx.fillStyle = '#181425';
      ctx.fillRect(bx, y + 42, 26, 9);
      ctx.fillStyle = col;
      ctx.fillRect(bx + 1, y + 43, Math.round(24 * (b.t / b.max)), 7);
      const icon = SPR['i_' + id];
      if (icon) {
        // A found power-up: its icon and the seconds left, not a shrine's name.
        ctx.drawImage(icon.frames[0].c, bx + 1, y + 42, 9, 9);
        drawText(ctx, String(Math.ceil(b.t)), bx + 18, y + 43, { align: 'center', color: '#181425', outline: null });
      } else drawText(ctx, id.slice(0, 4).toUpperCase(), bx + 13, y + 43, { align: 'center', color: '#181425', outline: null });
      bx += 28;
    }
  }

  // A slot whose weapon the next chest evolves: an orange frame pulsing, and EVO under it.
  evoMark(ctx, x, y, t) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 8);
    ctx.fillStyle = '#f77622';
    ctx.fillRect(x - 1, y - 1, 19, 1);
    ctx.fillRect(x - 1, y + 17, 19, 1);
    ctx.fillRect(x - 1, y, 1, 17);
    ctx.fillRect(x + 17, y, 1, 17);
    ctx.globalAlpha = 1;
    drawText(ctx, 'EVO', x + 9, y + 19, { align: 'center', color: '#f77622' });
  }

  // A slot a chest has just raised: a white frame round it, its pips too, and a white wash over
  // it, fading as k runs down to 0 (SLOT_LIT). (FLASHES: SOFT: no white pulse, so the frame in
  // gold and the wash held to FLASH_SOFT; a boss's chest raises up to five in a row.)
  litMark(ctx, x, y, k) {
    if (k <= 0) return;
    const soft = this.g.settings.softFlash === true;
    ctx.globalAlpha = k;
    ctx.fillStyle = soft ? '#fee761' : '#ffffff';
    ctx.fillRect(x - 1, y - 1, 19, 1);
    ctx.fillRect(x - 1, y + 19, 19, 1);
    ctx.fillRect(x - 1, y, 1, 19);
    ctx.fillRect(x + 17, y, 1, 19);
    ctx.globalAlpha = (soft ? FLASH_SOFT : 0.45) * k;
    ctx.fillRect(x + 1, y + 1, 15, 15);
    ctx.globalAlpha = 1;
  }

  // A slot this run doesn't have: a dim frame round a quiet padlock.
  lockedSlot(ctx, x, y, small) {
    ctx.fillStyle = '#181425';
    ctx.fillRect(x, y, 17, 17);
    ctx.fillStyle = small ? '#1d1928' : '#221c2e';
    ctx.fillRect(x + 1, y + 1, 15, 15);
    ctx.globalAlpha = 0.75;
    padlock(ctx, x + 4, y + 4, 1, '#3a4466', '#5a6988');
    ctx.globalAlpha = 1;
  }

  slot(ctx, x, y, spr, level, max, evolved, small) {
    ctx.fillStyle = '#181425';
    ctx.fillRect(x, y, 17, 17);
    ctx.fillStyle = evolved ? '#be4a2f' : small ? '#262b44' : '#3a4466';
    ctx.fillRect(x + 1, y + 1, 15, 15);
    if (!spr) return;
    ctx.drawImage(spr.frames[0].c, x + 1 - 1, y + 1 - 1 + 1, 16, 16);
    if (level > 0) {
      // Level pips under the icon.
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < level ? (level >= max ? '#feae34' : '#fee761') : '#3a4466';
        ctx.fillRect(x + 1 + i * 2, y + 17, 1, 2);
      }
    } else if (evolved) {
      ctx.fillStyle = '#feae34';
      ctx.fillRect(x + 1, y + 17, 15, 1);
    }
  }

  drawTop(ctx, W, t, dt = 1 / 60) {
    const g = this.g;
    const cx = Math.floor(W / 2);
    if (g.mode === 'dungeon') {
      drawText(ctx, `FLOOR ${g.floor} · ${g.floorName.toUpperCase()}`, cx, 10, { align: 'center', color: ['#ffffff', '#c0cbdc', '#8b9bb4'] });
      if (g.objective) drawText(ctx, g.objective, cx, 21, { align: 'center', color: '#feae34' });
      const clock = fmtTime(g.time);
      drawText(ctx, clock, cx, 32, { align: 'center', color: '#8b9bb4' });
      if (g.nightmare) drawText(ctx, NIGHTMARE_TAG, cx + Math.ceil(textWidth(clock) / 2) + 5, 32, { color: '#e43b44' });
    } else if (g.mode === 'ranked') {
      // Endless: the clock counts up; the bar fills toward the next rank.
      const c = textCanvas(fmtTime(g.time), g.bestBeaten ? ['#ffffff', '#9ee562', '#63c74d'] : ['#ffffff', '#ffffff', '#c0cbdc'], '#181425');
      ctx.drawImage(c, cx - c.width, 9, c.width * 2, c.height * 2);
      const cur = RANKS[g.rankIdx], next = RANKS[g.rankIdx + 1];
      const u = next ? clamp((g.time - cur[0] * 60) / ((next[0] - cur[0]) * 60), 0, 1) : 1;
      ctx.fillStyle = '#181425';
      ctx.fillRect(cx - 30, 30, 60, 4);
      ctx.fillStyle = '#feae34';
      ctx.fillRect(cx - 29, 31, Math.round(58 * u), 2);
      // The next boss's skull, where on the way to the next rank it comes.
      if (next) {
        const nb = (g.spawner.bossIdx + 1) * RANKED_BOSS_EVERY, k = (nb - cur[0] * 60) / ((next[0] - cur[0]) * 60);
        if (k >= 0 && k <= 1) drawSkull(ctx, cx - 29 + Math.round(58 * k), 29, '#8b9bb4');
      }
      drawText(ctx, cur[1].toUpperCase(), cx - 34, 29, { align: 'right', color: '#fee761' });
      if (g.rankedBest) drawText(ctx, `BEST ${fmtTime(Math.max(g.rankedBest, g.bestBeaten ? g.time : 0))}`, cx + 34, 29, { color: g.bestBeaten ? '#63c74d' : '#8b9bb4' });
    } else {
      const remain = clockTime(g);
      const c = textCanvas(fmtTime(remain), remain < 60 ? ['#ffffff', '#fee761', '#feae34'] : ['#ffffff', '#ffffff', '#c0cbdc'], '#181425');
      ctx.drawImage(c, cx - c.width, 9, c.width * 2, c.height * 2);
      const u = g.time / g.duration, B = nightBarHalf(cx), at = (s) => cx - B + 1 + Math.round((2 * B - 2) * Math.min(1, s / g.duration));
      ctx.fillStyle = '#181425';
      ctx.fillRect(cx - B, 30, 2 * B, 4);
      ctx.fillStyle = u > 0.9 ? '#f6757a' : '#5a6988';
      ctx.fillRect(cx - B + 1, 31, Math.round((2 * B - 2) * u), 2);
      // A tiny moon/sun showing the night's progress.
      ctx.fillStyle = u > 0.93 ? '#feae34' : '#c0cbdc';
      ctx.fillRect(at(g.time) - 1, 29, 2, 6);
      // The night's shape: a skull where each boss comes (gold once slain), and the face of the hero
      // this run unlocks at 5:00, under the bar, until then.
      for (const m of SURVIVAL_BOSSES[g.mode] || []) {
        const slain = g.stats.bossLog.some((l) => l.id === m.id && l.kill !== undefined);
        drawSkull(ctx, at(m.at), 29, slain ? '#fee761' : g.time >= m.at ? '#e43b44' : '#8b9bb4');
      }
      const head = g.unlocks && g.time < HERO_UNLOCK_TIME ? heroHead(g.unlocks) : null;
      if (head) {
        const hx = at(HERO_UNLOCK_TIME);
        ctx.fillStyle = HEROES[g.unlocks].color || '#c0cbdc';
        ctx.fillRect(hx - 4, 34, 8, 8);
        ctx.fillStyle = '#181425';
        ctx.fillRect(hx - 3, 35, 6, 6);
        ctx.drawImage(head, hx - 3, 35);
      }
      // Where Ranked shows its best time.
      if (g.nightmare) drawText(ctx, NIGHTMARE_TAG, cx + B + 4, 29, { color: '#e43b44' });
    }
    // In a crypt the clock above stands still.
    if (g.inCrypt) drawText(ctx, `${g.inCrypt.name.toUpperCase()} · TIME STANDS STILL`, cx, 38, { align: 'center', color: '#b55088' });
    // Kills and gold.
    let y = 10;
    const right = W - 4;
    const k = fmtNum(g.kills);
    drawText(ctx, k, right, y + 10, { align: 'right', color: '#c0cbdc' });
    ctx.drawImage(SPR.h_skull.frames[0].c, right - textWidth(k) - 11, y + 9);
    // The record near or beaten (killBest), beside the count, left of its skull: under the count
    // stands the gold, and under that a crypt's or a floor's map. In the Dungeon the floor's
    // objective is centred on the same row: where they would meet (a portrait screen, the seal's
    // long line) the record gives way (28 October 2026).
    const kb = killBest(g), kx = right - textWidth(k) - 14;
    const clear = !kb || g.mode !== 'dungeon' || !g.objective || kx - textWidth(kb.text) > cx + Math.ceil(textWidth(g.objective) / 2) + 4;
    if (kb && clear) drawText(ctx, kb.text, kx, y + 10, { align: 'right', color: kb.color });
    // Gold, rolling up to what it is (never down: a fresh run, or a shown chest's held gold, snaps).
    const want = this.held ? this.held.gold : g.gold;
    if (want < this.goldRoll) this.goldRoll = want;
    else if (want > this.goldRoll) {
      const before = Math.floor(this.goldRoll);
      this.goldRoll = Math.min(want, this.goldRoll + Math.max(dt * 8, (want - this.goldRoll) * Math.min(1, dt * 7)));
      if (Math.floor(this.goldRoll) > before) this.goldPulse = 0.18;
    }
    this.goldPulse = Math.max(0, this.goldPulse - dt);
    this.drawGold(ctx, W);
    this.drawFlung(ctx, right - 6, y + 24, dt);
  }

  // The gold counter as it stands (drawTop rolls it up, once a frame). Also painted over a chest's
  // dim (ChestOverlay), where the chest's coins land on it; it changes nothing.
  drawGold(ctx, W) {
    const right = W - 4, y = 10, gd = fmtNum(Math.floor(this.goldRoll));
    drawText(ctx, gd, right, y + 21, { align: 'right', color: this.goldPulse > 0.09 ? '#ffffff' : '#fee761' });
    ctx.drawImage(SPR.h_coin.frames[0].c, right - textWidth(gd) - 10, y + 21 - (this.goldPulse > 0 ? 1 : 0));
  }

  // Coins flung from gold piles, arcing to the gold counter at (tx, ty).
  drawFlung(ctx, tx, ty, dt) {
    for (let i = this.flung.length - 1; i >= 0; i--) {
      const f = this.flung[i];
      f.t += dt;
      const k = f.t / 0.45;
      if (k >= 1) {
        this.flung.splice(i, 1);
        continue;
      }
      const e = ease.inOutSine(k);
      const x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 18;
      ctx.drawImage(SPR.coin.frames[Math.floor((f.t * 14) % 4)].c, Math.round(x - 3), Math.round(y - 3));
    }
  }

  drawOrbs(ctx, W, H, p, t) {
    const g = this.g;
    const hpImg = this.hp.render(p.hp / p.maxHp, t, false);
    const ox = 4, oy = H - hpImg.height - 4;
    ctx.drawImage(hpImg, ox, oy);
    drawText(ctx, `${Math.ceil(p.hp)}`, ox + hpImg.width / 2, oy + hpImg.height / 2 - 4, { align: 'center', color: '#ffffff' });
    const shown = this.shownFury();
    const full = p.fury >= 100 && shown >= 100, almost = !full && shown >= FURY_ORB.almost;
    const fImg = (full ? this.furyFull : this.fury).render(shown / 100, t, full ? 1 : almost ? FURY_ORB.glow : 0);
    const fx = W - fImg.width - 4, fy = H - fImg.height - 4;
    const ocx = fx + fImg.width / 2, ocy = fy + fImg.height / 2;
    // His ultimate not open yet (shared/progress.js ultTime; Player.ultLocked): the orb stands
    // empty and dim behind a padlock, with nothing to press.
    if (p.ultLocked) {
      ctx.globalAlpha = 0.45;
      ctx.drawImage(fImg, fx, fy);
      ctx.globalAlpha = 0.85;
      padlock(ctx, ocx - 9, ocy - 9, 2, '#3a4466', '#5a6988');
      ctx.globalAlpha = 1;
    } else ctx.drawImage(fImg, fx, fy);
    if (almost) {
      // ALMOST: the rim glows, pulsing.
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 7);
      orbRing(ctx, ocx, ocy, ORB_R + 3, '#fee761');
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 7);
      orbRing(ctx, ocx, ocy, ORB_R + 4, '#f6757a');
      ctx.globalAlpha = 1;
    }
    // FULL: a ring bursts out of it as it fills (on the clock the run's moments keep).
    const since = p.furyFullAt == null ? Infinity : g.clock - p.furyFullAt;
    if (full && since >= 0 && since < FURY_ORB.burst) {
      const k = since / FURY_ORB.burst;
      ctx.globalAlpha = 1 - k;
      orbRing(ctx, ocx, ocy, ORB_R + 3 + k * 16, '#ffffff');
      orbRing(ctx, ocx, ocy, ORB_R + 1 + k * 10, '#fee761');
      ctx.globalAlpha = 1;
    }
    // The ultimate's name above the orb, flush with its right edge (centred, a long one ran off).
    if (p.ultLocked) {
      // Nothing over a locked orb.
    } else if (p.ult) {
      drawText(ctx, this.ultLabel(), fx + fImg.width, fy - 11, { align: 'right', color: '#f6757a' });
    } else if (full) {
      const key = input.device === 'pad' ? padKey('X') : input.device === 'touch' ? 'TAP' : 'SPACE';
      const blink = Math.floor(t * 3) % 2 === 0;
      drawText(ctx, key, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: blink ? '#ffffff' : '#fee761' });
      drawText(ctx, this.ultLabel(), fx + fImg.width, fy - 11, { align: 'right', color: blink ? '#fee761' : '#f6757a' });
    } else {
      drawText(ctx, `${Math.floor(shown)}%`, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: '#e8b796' });
    }
    // The ultimate's own kills, counting beside the orb while it lasts.
    const run = g.ultRun;
    if (run && run.kills > 0) {
      const c = textCanvas(`×${run.kills}`, ['#ffffff', '#f6757a', '#be4a2f'], '#181425', null, 'bold');
      ctx.drawImage(c, Math.round(fx - c.width * 2 - 4), Math.round(ocy - c.height), c.width * 2, c.height * 2);
    }
    // Fury comets on their way: a bright head and a tail, landing in the orb.
    for (let i = (this.comets || []).length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.t += this.lastDt || 1 / 60;
      const k = c.t / COMET;
      if (k >= 1) {
        this.comets.splice(i, 1);
        this.cometHit = 0.15;
        continue;
      }
      const e = ease.inQuad(k), at = (kk) => [c.x + (ocx - c.x) * kk, c.y + (ocy - c.y) * kk - Math.sin(kk * Math.PI) * 30];
      // The tail, fading back along its arc; then a glow and the bright head.
      for (let j = 10; j >= 1; j--) {
        const [x, y] = at(Math.max(0, e - j * 0.03)), r = Math.max(1, 4 - j * 0.35);
        ctx.globalAlpha = 0.75 - j * 0.065;
        ctx.fillStyle = j > 5 ? '#be4a2f' : '#f6757a';
        ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), Math.round(r), Math.round(r));
      }
      const [hx, hy] = at(e);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#feae34';
      ctx.fillRect(Math.round(hx - 4), Math.round(hy - 4), 8, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(hx - 2), Math.round(hy - 2), 5, 5);
    }
    if (this.cometHit > 0) {
      this.cometHit -= this.lastDt || 1 / 60;
      ctx.globalAlpha = clamp(this.cometHit / 0.15, 0, 1);
      orbRing(ctx, ocx, ocy, ORB_R + 2, '#ffffff');
      ctx.globalAlpha = 1;
    }
    if (g.player.revives > 0) ctx.drawImage(SPR.i_revival.frames[0].c, ox + hpImg.width - 6, oy - 8, 12, 12);
  }

  // The ultimate's name as the HUD shows it.
  ultLabel() {
    return (this.ultName ??= this.g.player.hero.ultName.toUpperCase());
  }

  // How far down the HUD's lines at the top reach: the clock and its bar; a dungeon's floor, seal
  // and clock lines; a crypt's line; a boss's bar and name under them (a fallen one's too, while it
  // breaks up).
  topLines() {
    const g = this.g;
    if ((g.boss && !g.boss.dead) || this.fall) return lineBottom(bossBarY(g) + 9);
    return lineBottom(g.inCrypt ? 38 : g.mode === 'dungeon' ? 32 : 33);
  }

  // The boss's (or lord's) bar. When the one it showed falls, its bar stays on, empty, then flashes
  // white and breaks apart (barFall) before another boss still fighting takes it.
  drawBoss(ctx, W, dt) {
    const g = this.g, b = g.boss && !g.boss.dead ? g.boss : null;
    // Fallen: dead, or back in the pool as another monster already (its id changed).
    const was = this.barE;
    if (was && (was.dead || was.id !== this.barId) && !this.fall) this.fall = { t: 0, label: this.barLabel, shown: this.barShown, pieces: null };
    this.barE = null;
    if (this.fall) {
      this.barFall(ctx, W, dt);
      return;
    }
    if (!b) return;
    // It slams in at its time (Game.bossIntro: after a night boss's name card), dropping from
    // above with a white flash.
    const since = b.introT === undefined ? 9 : b.introT - (b.slamAt || 0);
    if (since < 0) return;
    const drop = Math.round((1 - ease.outBack(clamp(since / ARRIVAL.slam, 0, 1))) * 26);
    const w = BAR_W(W), x = Math.floor(W / 2 - w / 2), y = bossBarY(this.g) - drop;
    const f = clamp(b.hp / b.maxHp, 0, 1);
    b._shown = b._shown === undefined ? f : b._shown + (f - b._shown) * 0.06;
    const label = b.lord ? `${b.name.toUpperCase()}, LORD OF THE CRYPT` : `${b.def.name.toUpperCase()}, ${b.def.title.toUpperCase()}`;
    this.barE = b;
    this.barId = b.id;
    this.barLabel = label;
    this.barShown = b._shown;
    barFrame(ctx, x, y, w);
    ctx.fillStyle = '#feae34';
    ctx.fillRect(x, y, Math.round(w * b._shown), 6);
    ctx.fillStyle = '#a22633';
    ctx.fillRect(x, y, Math.round(w * f), 6);
    ctx.fillStyle = '#e43b44';
    ctx.fillRect(x, y, Math.round(w * f), 3);
    ctx.fillStyle = '#f6757a';
    ctx.fillRect(x, y, Math.round(w * f), 1);
    barNotches(ctx, x, y, w);
    // Landed: a white flash. Nearly done (under LOW_HP): the bar pulses white with its heartbeat.
    // (FLASHES: SOFT: the landing flash held to FLASH_SOFT, no pulse.)
    this.pulseT = (this.pulseT || 0) + dt;
    const soft = this.g.settings.softFlash === true;
    const flash = since >= ARRIVAL.slam && since < ARRIVAL.slam + 0.12 ? (soft ? FLASH_SOFT : 0.8) : f < LOW_HP && !soft ? 0.15 + 0.4 * (0.5 + 0.5 * Math.cos((this.pulseT * TAU) / ARRIVAL.beat)) : 0;
    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, y - 1, w + 2, 8);
      ctx.globalAlpha = 1;
    }
    drawText(ctx, label, W / 2, y + 9, { align: 'center', color: BAR_NAME });
  }

  // The ultimate's launch (Game.launchUlt, ULT_LAUNCH): the screen dims round a light on the hero and
  // a cut-in slides across, his menu pose and the ultimate's name in the logo font.
  drawUltLaunch(ctx, W, H) {
    const g = this.g, L = g.ultLaunch;
    if (!L) return;
    const T = ULT_LAUNCH, t = L.started ? T.stop + L.t : T.stop - g.ultStop;
    const fade = t < 0.08 ? t / 0.08 : t > T.dur - 0.15 ? clamp((T.dur - t) / 0.15, 0, 1) : 1;
    const cam = g.cam, z = cam.S / view.S, hx = (g.player.x - cam.x) * z, hy = (g.player.y - 10 - cam.y) * z;
    const grad = ctx.createRadialGradient(hx, hy, 18, hx, hy, Math.hypot(W, H) * 0.5);
    grad.addColorStop(0, 'rgba(10,6,16,0)');
    grad.addColorStop(0.25, `rgba(10,6,16,${(0.55 * fade).toFixed(3)})`);
    grad.addColorStop(1, `rgba(10,6,16,${(0.8 * fade).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // The cut-in: a band sliding in from the left, holding, then away to the right.
    const k = t < T.slideIn ? ease.outCubic(t / T.slideIn) : t < T.slideOut ? 1 : 1 + ease.inCubic(clamp((t - T.slideOut) / (T.dur - T.slideOut), 0, 1));
    const bh = Math.round(H * 0.26), by = Math.round(H * 0.62 - bh / 2), off = Math.round((k - 1) * W);
    ctx.save();
    ctx.translate(off, 0);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#181425';
    ctx.beginPath();
    ctx.moveTo(0, by + 10);
    ctx.lineTo(W, by);
    ctx.lineTo(W, by + bh - 10);
    ctx.lineTo(0, by + bh);
    ctx.fill();
    ctx.fillStyle = '#f6757a';
    ctx.fillRect(0, by + bh - 3, W, 2);
    ctx.fillRect(0, by + 4, W, 1);
    ctx.globalAlpha = 1;
    const hero = g.player.hero, pose = SPR[hero.pose] || SPR[hero.sprite], pf = pose.frames[0].c, ps = (bh - 6) / pf.height;
    ctx.drawImage(pf, Math.round(W * 0.18 - (pf.width * ps) / 2), by + 3, Math.round(pf.width * ps), Math.round(pf.height * ps));
    const name = logo(hero.ultName.toUpperCase(), ['#ffffff', '#fee761', '#f6757a', '#be4a2f', '#73172d']), ns = Math.min(1, (W * 0.62) / name.width);
    ctx.drawImage(name, Math.round(W * 0.34), Math.round(by + bh / 2 - (name.height * ns) / 2), Math.round(name.width * ns), Math.round(name.height * ns));
    ctx.restore();
  }

  // A boss's arrival (arrival.js): before it, the screen's edges darken with "Something stirs in the
  // dark…"; as it comes, its name card (its name big in its colour, its title under it) and, for a
  // night's boss, the letterbox bars.
  drawArrival(ctx, W, H) {
    const g = this.g, s = g.stir, c = g.card;
    if (s) {
      const a = clamp(s.t / ARRIVAL.stir, 0, 1) * (s.done ? clamp(1 - s.after / ARRIVAL.stirOut, 0, 1) : 1);
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      grad.addColorStop(0, 'rgba(8,4,12,0)');
      grad.addColorStop(1, `rgba(8,4,12,${(0.9 * a).toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      if (!s.done) {
        ctx.globalAlpha = clamp(s.t / 0.5, 0, 1);
        drawText(ctx, 'Something stirs in the dark…', W / 2, Math.round(H * 0.3), { align: 'center', color: '#c0cbdc' });
        ctx.globalAlpha = 1;
      }
    }
    if (!c) return;
    const t = c.t, gone = c.end != null ? clamp(1 - (t - c.end) / CARD_END, 0, 1) : 1;
    if (c.letterbox) {
      const L = ARRIVAL.letterbox, k = gone * (t < 0.15 ? t / 0.15 : t < L ? 1 : clamp(1 - (t - L) / 0.25, 0, 1));
      const bh = Math.round(H * 0.12 * ease.outCubic(k));
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, bh);
      ctx.fillRect(0, H - bh, W, bh);
    }
    const a = gone * (t < 0.12 ? t / 0.12 : clamp((ARRIVAL.card - t) / 0.6, 0, 1));
    const name = textCanvas(c.name.toUpperCase(), ['#ffffff', c.color, c.color], '#181425', null, 'bold');
    const big = c.letterbox ? 3 : 2, pop = t < 0.2 ? 1 + 0.6 * (1 - ease.outCubic(t / 0.2)) : 1, s2 = Math.min(big * pop, (W - 20) / name.width);
    const y = Math.round(H * 0.34);
    ctx.globalAlpha = a;
    ctx.drawImage(name, Math.round(W / 2 - (name.width * s2) / 2), Math.round(y - (name.height * s2) / 2), Math.round(name.width * s2), Math.round(name.height * s2));
    drawText(ctx, c.title, W / 2, Math.round(y + (name.height * s2) / 2 + 3), { align: 'center', color: c.color });
    ctx.globalAlpha = 1;
  }

  // A fallen boss's bar (drawBoss): empty for BAR_FALL.hold s while what it had shown drains away,
  // white for BAR_FALL.flash s, then in BAR_FALL.pieces pieces that tumble and fade for
  // BAR_FALL.drop s, its name fading with them. Real time, so it plays out under the cards too.
  barFall(ctx, W, dt) {
    const F = this.fall, H = BAR_FALL, w = BAR_W(W), x = Math.floor(W / 2 - w / 2), y = bossBarY(this.g);
    F.t += dt;
    const t = F.t;
    if (t >= H.hold + H.flash + H.drop) {
      this.fall = null;
      return;
    }
    if (t < H.hold + H.flash) {
      barFrame(ctx, x, y, w);
      if (t < H.hold) {
        F.shown *= Math.exp(-dt * 6);
        ctx.fillStyle = '#feae34';
        ctx.fillRect(x, y, Math.round(w * F.shown), 6);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, 6);
      }
      barNotches(ctx, x, y, w);
      drawText(ctx, F.label, W / 2, y + 9, { align: 'center', color: BAR_NAME });
      return;
    }
    // The pieces, set off once, each its own way (no dice: the run's random numbers stay the run's).
    const n = H.pieces, pw = w / n;
    if (!F.pieces) {
      F.pieces = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5;
        F.pieces.push({ x: x + i * pw, y, vx: u * 90 + ((i * 37) % 7) - 3, vy: -40 - ((i * 53) % 5) * 12, spin: 0 });
      }
    }
    const k = (t - H.hold - H.flash) / H.drop;
    ctx.globalAlpha = clamp(1 - k, 0, 1);
    for (let i = 0; i < n; i++) {
      const p = F.pieces[i];
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = '#181425';
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, Math.ceil(pw) + 2, 8);
      ctx.fillStyle = i % 3 ? '#e43b44' : '#ffffff';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(pw), 6);
    }
    drawText(ctx, F.label, W / 2, y + 9, { align: 'center', color: BAR_NAME });
    ctx.globalAlpha = 1;
  }

  // Where over a foe's head its name or its speech goes, in HUD pixels, into AT; false if that is
  // well off the screen.
  overHead(e, W, H) {
    const cam = this.g.cam;
    // World positions to HUD pixels: the world is drawn smaller than the HUD.
    const z = cam.S / view.S;
    AT.x = (e.x - cam.x) * z;
    AT.y = (e.y - e.h - 6 - cam.y) * z;
    return AT.x >= -40 && AT.y >= -20 && AT.x <= W + 40 && AT.y <= H + 20;
  }

  drawNames(ctx, W, H) {
    const g = this.g, cam = g.cam, p = g.player;
    const z = cam.S / view.S;
    // Only the elites nearest the hero are named, so that a pack's names do not pile up; the rest
    // show their health alone. One that speaks shows its words instead.
    NEAR.fill(null);
    let named = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.elite || e.speech || !this.overHead(e, W, H) || !seenBy(g, e)) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (named === NAMED && d >= NEAR_D[NAMED - 1]) continue;
      let i = named < NAMED ? named++ : NAMED - 1;
      for (; i > 0 && NEAR_D[i - 1] > d; i--) {
        NEAR[i] = NEAR[i - 1];
        NEAR_D[i] = NEAR_D[i - 1];
      }
      NEAR[i] = e;
      NEAR_D[i] = d;
    }
    for (const e of g.enemies) {
      if (e.dead || e.speech || (!e.elite && e.type !== 'thief') || !this.overHead(e, W, H) || !seenBy(g, e)) continue;
      const x = AT.x, y = AT.y;
      if (e.elite) {
        // A name kept whole on the screen, never cut at its edge.
        if (NEAR.includes(e)) {
          const hw = textWidth(e.name) / 2 + 2;
          drawText(ctx, e.name, Math.round(clamp(x, hw, W - hw)), Math.round(clamp(y - 9, 2, H - 12)), { align: 'center', color: e.mod ? e.mod.color : '#feae34' });
        }
        const w = 26, f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#181425';
        ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 4);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), Math.round(w * f), 2);
      } else if (e.type === 'thief') {
        const w = 22, f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#181425';
        ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 6);
        ctx.fillStyle = '#feae34';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), Math.round(w * f), 2);
        // Its escape clock (THIEF.time): a sliver under its health that runs down, red its last
        // THIEF.warn seconds (the 27 October 2026 review, C10: the near miss shown as it is). A
        // steady colour, never a blink, so FLASHES has nothing to hold back.
        const left = clamp(THIEF.time - e.life, 0, THIEF.time);
        ctx.fillStyle = left < THIEF.warn ? '#e43b44' : '#c0cbdc';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 5), Math.round((w * left) / THIEF.time), 1);
        // What it carries besides its gold: a chest (Enemy.init), the edge marker's chest icon over its bar.
        if (e.chest) {
          const c = marks().chest;
          ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height));
        }
      }
    }
    // Player health bar (classic survivors style).
    if (!p.dead) {
      const x = Math.round((p.x - cam.x) * z), y = Math.round((p.y - cam.y + 3) * z);
      const f = clamp(p.hp / p.maxHp, 0, 1);
      ctx.fillStyle = '#181425';
      ctx.fillRect(x - 9, y, 18, 4);
      ctx.fillStyle = '#3e2731';
      ctx.fillRect(x - 8, y + 1, 16, 2);
      ctx.fillStyle = f < 0.3 ? '#ff0044' : '#e43b44';
      ctx.fillRect(x - 8, y + 1, Math.round(16 * f), 2);
    }
  }

  // On a crypt's steps: over its door its name, what lies below, and a bar that fills while the
  // hero pushes up its steps (Game.cryptDoor, Game.doorInfo); full, he goes in.
  drawCryptDoor(ctx, W) {
    const g = this.g, d = g.cryptDoor;
    if (!d) return;
    const cam = g.cam, z = cam.S / view.S, info = g.doorInfo(d);
    const sub = `Time stands still · ${info.lords} lord${info.lords === 1 ? '' : 's'} below`;
    const key = input.device === 'pad' ? 'HOLD UP TO ENTER' : input.device === 'touch' ? 'PUSH UP TO ENTER' : 'HOLD UP TO ENTER';
    const w = Math.max(textWidth(info.name), textWidth(sub), textWidth(key)) + 12, h = 40;
    const x = Math.round(clamp((d.x - cam.x) * z - w / 2, 2, W - w - 2)), y = Math.round((d.y - 36 - cam.y) * z - h);
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = '#181425';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#b55088';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    drawText(ctx, info.name, x + w / 2, y + 3, { align: 'center', color: ['#ffffff', '#f4c4e4', '#b55088'] });
    drawText(ctx, sub, x + w / 2, y + 13, { align: 'center', color: '#c0cbdc' });
    const bw = w - 16, bx = x + 8, by = y + 24;
    ctx.fillStyle = '#3a4466';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = info.k >= 1 ? '#ffffff' : '#b55088';
    ctx.fillRect(bx, by, Math.round(bw * info.k), 3);
    drawText(ctx, key, x + w / 2, y + 29, { align: 'center', color: info.k > 0 ? '#fee761' : '#8b9bb4' });
  }

  // What a boss says: after the names and the edge markers, over them; on the screen, and below
  // its own name at the top, not on it.
  drawSpeech(ctx, W, H) {
    const top = this.topLines() + 1;
    for (const e of this.g.enemies) {
      if (e.dead || !e.speech || !this.overHead(e, W, H)) continue;
      const tw = textWidth(e.speech.text);
      const x = Math.round(clamp(AT.x, tw / 2 + 5, W - tw / 2 - 5)), y = Math.round(Math.max(AT.y, top + 14));
      ctx.fillStyle = '#181425';
      ctx.fillRect(Math.round(x - tw / 2 - 4), y - 14, tw + 8, 13);
      ctx.fillStyle = '#ead4aa';
      ctx.fillRect(Math.round(x - tw / 2 - 3), y - 13, tw + 6, 11);
      ctx.fillRect(Math.round(clamp(AT.x, x - tw / 2, x + tw / 2) - 1), y - 2, 3, 2);
      drawText(ctx, e.speech.text, x, y - 11, { align: 'center', color: '#3e2731', outline: null });
    }
  }

  // Markers at the screen's edge toward what's worth finding off it: the boss, shrines, crypts,
  // chests, the thief and the world's own marker (the stairs, a sleeping lord), in that order.
  drawIndicators(ctx, W, H, t) {
    const g = this.g, m = marks();
    this.markerBand(W, H);
    if (g.boss && !g.boss.dead) this.pointer(ctx, W, H, t, g.boss.x, g.boss.y - 10, '#e43b44', m.boss);
    for (const s of g.shrines) if (!s.used) this.pointer(ctx, W, H, t, s.x, s.y - 10, SHRINE_COLORS[s.type], m.shrine[s.type]);
    for (const d of g.crypts) if (!d.sealed) this.pointer(ctx, W, H, t, d.x, d.y - 12, '#b55088', m.crypt);
    for (const pk of g.pickups) if (pk.kind === 'chest') this.pointer(ctx, W, H, t, pk.x, pk.y, '#feae34', m.chest);
    for (const e of g.enemies) if (e.type === 'thief' && !e.dead) this.pointer(ctx, W, H, t, e.x, e.y, '#fee761', m.coin);
    if (g.world.marker) {
      const w = g.world.marker();
      if (w) this.pointer(ctx, W, H, t, w[0], w[1], w[2], m[w[3] || WORLD_MARKS[w[2]]]);
    }
    // An event about to come: an orange arrow from its side, a warning's own icon (events.js), not
    // the boss's red skull.
    const p = g.player;
    for (const w of g.warnings) if (w.from) this.pointer(ctx, W, H, t, p.x + w.from[0], p.y + w.from[1], '#f77622', m.warn);
  }

  // A ring about to close, or the last stand (a ring too): for its last WARN.ring s, a faint ring
  // on the ground round the hero.
  drawRingWarnings(ctx, W, H, t) {
    const g = this.g, cam = g.cam, z = cam.S / view.S;
    for (const w of g.warnings) {
      if ((w.ev.type !== 'ring' && w.ev.type !== 'stand') || w.t < WARN.lead - WARN.ring) continue;
      const k = clamp((w.t - (WARN.lead - WARN.ring)) / WARN.ring, 0, 1);
      const x = (g.player.x - cam.x) * z, y = (g.player.y - 4 - cam.y) * z, r = Math.min(W, H) * (0.46 - 0.12 * k);
      ctx.globalAlpha = (0.18 + 0.22 * k) * (0.75 + 0.25 * Math.sin(t * 12));
      ctx.strokeStyle = '#e43b44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // This frame's band for the markers, inset from the screen's edge and below the HUD's lines at
  // the top (a boss's bar and name, a dungeon's floor and seal lines), and what they keep off: the
  // slots, the orbs in the bottom corners with the phoenix feather and the ultimate's name over
  // them, a dungeon's minimap (Dungeon.drawMinimap) and the combo at the right edge (drawCombo:
  // its count, its word under it and its timer over it, from COMBO.show kills on; 69 x 37 at rest,
  // up to 82 x 46 as a four-digit count swells).
  markerBand(W, H) {
    const g = this.g, p = g.player;
    BAND.top = Math.max(52, this.topLines() + MARK_R);
    BAND.bottom = H - 30;
    BAND.left = 14;
    BAND.right = W - 14;
    keepN = 0;
    keep(0, 0, 3 + 18 * Math.max(MAX_WEAPONS, MAX_RELICS), 49);
    if (p.buffs.size) keep(0, 49, 3 + 28 * p.buffs.size, 12);
    keep(0, H - ORB_S - 4, ORB_S + 4, ORB_S + 4);
    keep(W - ORB_S - 4, H - ORB_S - 4, ORB_S + 4, ORB_S + 4);
    if (p.revives > 0) keep(ORB_S - 2, H - ORB_S - 12, 12, 12);
    if (p.ult || p.fury >= 100) {
      const tw = textWidth(this.ultLabel());
      keep(W - 5 - tw, H - ORB_S - 16, tw + 2, GLYPH_H + 2);
    }
    if (g.world.drawMinimap && !g.showMap) keep(W - g.world.W - 6, 34, g.world.W + 4, g.world.H + 4);
    if (g.combo >= COMBO.show) keep(W - 88, Math.round(H * 0.42) - 20, 88, 48);
  }

  // One of those markers, toward world point (wx, wy), unless that is on screen: an arrow in its
  // colour and the icon of what it points at.
  pointer(ctx, W, H, t, wx, wy, col, icon) {
    const cam = this.g.cam;
    const z = cam.S / view.S;
    const sx = (wx - cam.x) * z, sy = (wy - cam.y) * z;
    if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) return;
    placeMarker(sx, sy);
    const x = SPOT.x, y = SPOT.y, a = Math.atan2(sy - y, sx - x);
    const bob = Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.translate(Math.round(x + Math.cos(a) * bob), Math.round(y + Math.sin(a) * bob));
    ctx.rotate(a);
    ctx.fillStyle = '#181425';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-3, 3);
    ctx.fill();
    ctx.restore();
    if (icon) ctx.drawImage(icon, Math.round(x + IN_X[SPOT.edge] * MARK_IN - icon.width / 2), Math.round(y + IN_Y[SPOT.edge] * MARK_IN - icon.height / 2));
  }

  // dt: real seconds since the last frame (the pop settles by it: COMBO_POP).
  drawCombo(ctx, W, H, t, dt = this.lastDt ?? 1 / 60) {
    const g = this.g, tier = comboTier(g.comboTiers, g.combo);
    // A combo the lull broke in a frame whose kills brought the next one up at once never showed
    // below COMBO.show between them: the new one still comes up with its pop (Game.comboRun).
    if (g.comboRun !== this.comboRun) {
      this.comboRun = g.comboRun;
      this.tierShown = -1;
    }
    if (tier < 0) {
      this.tierShown = -1;
      return;
    }
    // It pops as it comes up and at each new tier, never at a kill that only counts (28 October
    // 2026, the review's C7: popping at every kill it sat at about 1.45 times late in a fight and
    // told nothing); a new tier's word pops with it, its sting rung (Game.update).
    if (tier > this.tierShown) {
      this.comboScale = COMBO_POP.count;
      if (tier > 0) this.comboWordT = 0;
    }
    this.tierShown = tier;
    this.comboScale = 1 + (this.comboScale - 1) * Math.exp(-dt * COMBO_POP.settle);
    this.comboWordT += dt;
    const colors = [
      ['#ffffff', '#c0cbdc'],
      ['#fee761', '#feae34'],
      ['#feae34', '#f77622'],
      ['#f6757a', '#e43b44'],
      ['#ffffff', '#b55088'],
    ][tier];
    const c = textCanvas(`${g.combo}`, colors, '#181425', null, 'bold');
    const s = 2 * this.comboScale;
    const x = W - 6 - c.width * s, y = Math.round(H * 0.42 - (c.height * s) / 2);
    ctx.globalAlpha = clamp(g.comboT * 2, 0, 1);
    ctx.drawImage(c, Math.round(x), y, Math.round(c.width * s), Math.round(c.height * s));
    // The tier's word under the count: popping in as the tier comes, white at first (FLASHES:
    // SOFT: in its colour), then settled where it stays.
    const word = COMBO_WORDS[tier], wy = y + Math.round(c.height * s) + 1, u = this.comboWordT / COMBO_POP.wordFor;
    if (u < 1) {
      const white = this.comboWordT < COMBO_POP.white && g.settings.softFlash !== true;
      const wc = textCanvas(word, white ? '#ffffff' : colors[1], '#181425'), k = 1 + (COMBO_POP.word - 1) * (1 - ease.outCubic(u));
      ctx.drawImage(wc, Math.round(W - 5 - wc.width * k), Math.round(wy - 1 - (wc.height * (k - 1)) / 2), Math.round(wc.width * k), Math.round(wc.height * k));
    } else drawText(ctx, word, W - 6, wy, { align: 'right', color: colors[1] });
    // Timer sliver: what is left of the lull a combo can take (COMBO.hold).
    const left = clamp(g.comboT / COMBO.hold, 0, 1);
    ctx.fillStyle = colors[1];
    ctx.fillRect(W - 6 - Math.round(40 * left), y - 3, Math.round(40 * left), 1);
    ctx.globalAlpha = 1;
  }

  // Fallen: "Slain by …" fades in over the drained world (Game DEATH.name), before the results.
  drawSlain(ctx, W, H) {
    const g = this.g;
    if (g.state !== 'dying' || !g.player.dead || g.deathT < DEATH.name) return;
    const who = g.stats.killedBy;
    const c = textCanvas(who ? `SLAIN BY ${who.toUpperCase()}` : 'YOU HAVE FALLEN', ['#ffffff', '#f6757a', '#a22633'], '#181425');
    const s = c.width * 2 <= W - 16 ? 2 : 1;
    ctx.globalAlpha = clamp((g.deathT - DEATH.name) / 0.5, 0, 1);
    ctx.drawImage(c, Math.round(W / 2 - (c.width * s) / 2), Math.round(H * 0.3), c.width * s, c.height * s);
    ctx.globalAlpha = 1;
  }

  drawBanners(ctx, W, H) {
    const g = this.g;
    // Under a card, chest, gear or pause screen they stay hidden (they still run out, but for a
    // first-run hint and a lock of the Codex reached, which wait: Game.fadeReal).
    if (g.state === 'levelup' || g.state === 'chest' || g.state === 'item' || g.state === 'paused') return;
    if (g.card) return; // a boss's name card has the screen; they wait (Game.fadeReal)
    // Below the lines at the top: a boss's own banner came down on its name.
    let y = Math.max(Math.round(H * 0.22), this.topLines() + 4);
    const held = g.hintsHeld;
    for (const b of g.banners) {
      if (b.hint && held) continue; // a first-run hint waits its turn (Game.hintsHeld)
      const u = b.t / b.dur;
      const a = u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1;
      const pop = u < 0.12 ? 1.6 - ease.outCubic(u / 0.12) * 0.6 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      const c = textCanvas(b.title, [ '#ffffff', b.color, b.color ], '#181425');
      const s = 2 * pop;
      ctx.drawImage(c, Math.round(W / 2 - (c.width * s) / 2), Math.round(y - (c.height * (s - 2)) / 2), Math.round(c.width * s), Math.round(c.height * s));
      if (b.sub) drawText(ctx, b.sub, Math.round(W / 2), y + 21, { align: 'center', color: '#c0cbdc' });
      y += b.sub ? 34 : 24;
    }
    ctx.globalAlpha = 1;
  }

  drawTouch(ctx, W, H, p) {
    const s = input.stick;
    if (s.active) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#c0cbdc';
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, 22, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy), k = Math.min(1, 22 / (l || 1));
      ctx.arc(s.ox + dx * k, s.oy + dy * k, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Pause button.
    ctx.fillStyle = '#181425';
    ctx.fillRect(W / 2 - 9, H - 18, 18, 14);
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(W / 2 - 4, H - 15, 3, 8);
    ctx.fillRect(W / 2 + 1, H - 15, 3, 8);
  }
}

export const SHRINE_COLORS = {
  fury: '#e43b44',
  haste: '#2ce8f5',
  fortune: '#feae34',
  wisdom: '#8f5bb0',
  protection: '#63c74d',
  wildcap: '#e43b44',
  ward: '#2ce8f5',
  mirror: '#8fb8ff',
};

export const SHRINE_INFO = {
  fury: ['Shrine of Fury', 'Damage +60% for 30s'],
  haste: ['Shrine of Haste', 'Speed and attack speed up for 30s'],
  fortune: ['Shrine of Fortune', 'Double gold for 30s'],
  wisdom: ['Shrine of Wisdom', 'Experience +50% for 30s'],
  protection: ['Shrine of Protection', 'Half damage taken, regeneration for 30s'],
};
