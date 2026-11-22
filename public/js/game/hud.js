// In-game HUD, drawn into the low-res UI canvas (1 unit = 1 art pixel).

import { drawText, textCanvas, textWidth, GLYPH_H } from '../engine/font.js';
import { logo, padlock } from '../ui/ui.js';
import { SPR, buildSprite } from '../engine/sprites.js';
import { input, padKey } from '../engine/input.js';
import { fmtTime, fmtNum, clamp, makeCanvas, hexToRgb, TAU, ease } from '../engine/util.js';
import { WEAPONS, MAX_WEAPON_LEVEL, MAX_WEAPONS, MAX_RELICS } from '../data/weapons.js';
import { isCopper } from '../data/copper.js';
import { FILLERS, PASSIVES } from '../data/passives.js';
import { blessingTypes, drawLoadout, loadoutItems, loadoutLayout } from './loadout.js';
import { view } from '../engine/view.js';
import { ringSprite } from './fxsprites.js';
import { FLASH_SOFT } from './game.js';
import { ARRIVAL, LOW_HP, CARD_END } from './arrival.js';
import { ULT_LAUNCH, COMET } from './ultimate.js';
import { WARN, RECORD_GRACE } from './events.js';
import { THIEF } from './enemies.js';
import { faceAttack } from './facing.js';

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
        // The sheen, a crescent up on the lit side: its circle less the same circle moved about 2 px
        // toward the middle (a whole lightened disc read as a sticker on the glass).
        const hx = dx + R * 0.38, hy = dy + R * 0.42;
        if (Math.hypot(hx, hy) < R * 0.28 && Math.hypot(hx - 1.3, hy - 1.5) >= R * 0.28) GLASS[p] = 1;
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
    // shaded edge, as red, green, blue; and the same lit by the glow of a full orb, each frame. The
    // sheen lifts the liquid a third toward white, the empty dark only a little (a third of the way
    // made a grey moon on every empty or low orb).
    const rgb = [...this.colors, EMPTY_RGB];
    this.tones = new Float64Array(rgb.length * 9);
    rgb.forEach((col, k) => {
      for (let ch = 0; ch < 3; ch++) {
        const c = col[ch], i = k * 9 + ch;
        this.tones[i] = c;
        this.tones[i + 3] = c + (255 - c) * (k === EMPTY ? 0.08 : 0.35);
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
  // The liquid eases toward its level by time: 15% of the way a frame at 60 fps, at any frame rate.
  render(frac, t, glow, dt = 1 / 60) {
    this.shown += (frac - this.shown) * (1 - Math.pow(0.85, dt * 60));
    const s = ORB_S, R = ORB_R, cy = s / 2;
    const d = this.img.data, tones = this.tones, lit = this.lit;
    const level = cy + R - 2 * R * clamp(this.shown, 0, 1);
    const shine = 40 * glow * (0.5 + 0.5 * Math.sin(t * 8));
    for (let k = 0; k < tones.length; k++) lit[k] = glow ? Math.min(255, tones[k] + shine) : tones[k];
    // The surface's swell calms as the orb nears empty: at nought no stray liquid shows at its foot.
    const swell = Math.min(1, this.shown * 8);
    for (let x = 0; x < s; x++) {
      WAVE[x] = (Math.sin(x * 0.45 + t * 3) * 1.1 + Math.sin(x * 0.2 - t * 2) * 0.8) * swell;
      BUBBLE[x] = Math.floor((t * 7 + x * 13) % 9) === 0 ? 1 : 0;
    }
    // The tones by depth over the liquid there is, at least half an orb's: a low orb darkens toward
    // its foot as a full one does (by the whole orb's depth it was all foam and top, paler than full),
    // and a sliver of one still never goes all to the deepest.
    const deep = Math.max(R, cy + R - level);
    for (let y = 0; y < s; y++) {
      const depth = (y - level) / deep;
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

// The fury orb not open yet (Player.ultLocked): the same glass, opaque as every other piece of the
// HUD (it was the orb at 45%, the grass showing through it), in quiet slate rims round a flat dark
// inside with its shaded edge, no sheen and no liquid; its padlock goes over it. Made once.
let LOCKED_ORB = null;
function lockedOrb() {
  if (LOCKED_ORB) return LOCKED_ORB;
  const s = ORB_S, c = makeCanvas(s, s), g = c.getContext('2d'), img = g.createImageData(s, s), d = img.data;
  const cols = [null, RIMS[INK], hexToRgb('#5a6988'), hexToRgb('#3a4466'), hexToRgb('#1d1928')];
  for (let p = 0; p < s * s; p++) {
    const col = cols[SHAPE[p]];
    if (!col) continue;
    const k = GLASS[p] === 2 ? 0.75 : 1;
    d[p * 4] = col[0] * k;
    d[p * 4 + 1] = col[1] * k;
    d[p * 4 + 2] = col[2] * k;
    d[p * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return (LOCKED_ORB = c);
}

// A line of text cut to w px with an ellipsis, whole when it fits (as gamescreen.js's).
function fitText(s, w) {
  if (textWidth(s) <= w) return s;
  while (s.length > 1 && textWidth(s + '…') > w) s = s.slice(0, -1);
  return s + '…';
}

// The rows of a picture that are really there (alpha at least half), { top, bottom, h }: a hero's
// pose is cut from his idle frames' box, which takes in their faint fringe. Measured once a canvas.
const SOLID = new WeakMap();
function solidRows(c) {
  let r = SOLID.get(c);
  if (r) return r;
  const d = c.getContext('2d').getImageData?.(0, 0, c.width, c.height)?.data; // none on a dummy canvas
  let top = -1, bottom = c.height - 1;
  for (let y = 0; d && y < c.height; y++) {
    let on = false;
    for (let x = 0; x < c.width && !on; x++) on = d[(y * c.width + x) * 4 + 3] >= 128;
    if (on) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) top = 0;
  r = { top, bottom, h: bottom - top + 1 };
  SOLID.set(c, r);
  return r;
}

// The ultimate's name for its cut-in, never drawn below its own size (a fraction dropped rows and
// columns of its letters): the logo if it fits w across, else on two lines split nearest the middle
// if they fit h; the same with the bold logo at half the size; else the bold text itself.
const ULT_COLORS = ['#ffffff', '#fee761', '#f6757a', '#be4a2f', '#73172d'];
const ultLogos = new Map();
function ultLogo(text, w, h) {
  const key = `${text}|${w}|${h}`;
  let c = ultLogos.get(key);
  if (c) return c;
  const words = text.split(' ');
  for (const font of ['normal', 'bold']) {
    const make = (s) => logo(s, ULT_COLORS, '#181425', font);
    c = make(text);
    if (c.width <= w) break;
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = make(words.slice(0, i).join(' ')), b = make(words.slice(i).join(' '));
      if (!best || Math.max(a.width, b.width) < Math.max(best[0].width, best[1].width)) best = [a, b];
    }
    // Each logo carries its outline and shadow below its letters: the second line tucks 3 px up.
    if (best && Math.max(best[0].width, best[1].width) <= w && best[0].height + best[1].height - 3 <= h) {
      c = makeCanvas(Math.max(best[0].width, best[1].width), best[0].height + best[1].height - 3);
      const g = c.getContext('2d');
      g.drawImage(best[1], Math.round((c.width - best[1].width) / 2), best[0].height - 3);
      g.drawImage(best[0], Math.round((c.width - best[0].width) / 2), 0);
      break;
    }
    c = null;
  }
  c ??= textCanvas(text, ULT_COLORS.slice(0, 3), '#181425', null, 'bold');
  ultLogos.set(key, c);
  return c;
}

// The edge markers' arrows and the crypt's aim chevron in whole pixels, never a rotated path (its
// edges came out as half-tone pixels on the HUD's canvas, then blown up S×S): for each of TURNS
// headings, the runs of ink and of colour round the point they are drawn at. inside(u, v), in the
// shape's own frame (u along its heading): 2 its colour, 1 its ink, 0 clear; any clear pixel beside
// its colour is ink too, so the rim is closed all round.
const TURNS = 32;
function bakeTurns(inside, reach) {
  const n = 2 * reach, turns = [];
  for (let i = 0; i < TURNS; i++) {
    const a = (i / TURNS) * TAU, cs = Math.cos(a), sn = Math.sin(a), at = new Uint8Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const px = x - reach + 0.5, py = y - reach + 0.5;
        at[y * n + x] = inside(px * cs + py * sn, -px * sn + py * cs);
      }
    }
    const col = (x, y) => x >= 0 && y >= 0 && x < n && y < n && at[y * n + x] === 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (!at[y * n + x] && (col(x - 1, y) || col(x + 1, y) || col(x, y - 1) || col(x, y + 1))) at[y * n + x] = 1;
    }
    const runs = [[], []];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; ) {
        const k = at[y * n + x];
        let e = x + 1;
        while (e < n && at[y * n + e] === k) e++;
        if (k) runs[k - 1].push(x - reach, y - reach, e - x);
        x = e;
      }
    }
    turns.push(runs);
  }
  return turns;
}
const turnOf = (a) => ((Math.round((a / TAU) * TURNS) % TURNS) + TURNS) % TURNS;
// A baked shape at heading a, round the context's origin: its ink, then its colour.
function drawTurn(ctx, turns, a, color) {
  const [ink, col] = turns[turnOf(a)];
  ctx.fillStyle = '#181425';
  for (let i = 0; i < ink.length; i += 3) ctx.fillRect(ink[i], ink[i + 1], ink[i + 2], 1);
  ctx.fillStyle = color;
  for (let i = 0; i < col.length; i += 3) ctx.fillRect(col[i], col[i + 1], col[i + 2], 1);
}
// The triangle from (tip, 0) back to (back, ±half).
const inTriangle = (u, v, tip, back, half) => u <= tip && u >= back && Math.abs(v) <= (half * (tip - u)) / (tip - back);
let ARROWS = null, CHEVRONS = null;
// The marker's arrow: its point 4 px ahead, 3 back, 6 wide, in an ink rim a pixel or two round it.
const arrows = () => (ARROWS ??= bakeTurns((u, v) => (inTriangle(u, v, 4, -3, 3) ? 2 : inTriangle(u, v, 6, -4, 5) ? 1 : 0), 7));
// The aim chevron: (-2, -4) to (3, 0) to (-2, 4), a pixel thick in a pixel of ink.
function segDist(u, v, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, k = clamp(((u - x0) * dx + (v - y0) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(u - x0 - k * dx, v - y0 - k * dy);
}
const chevrons = () => (CHEVRONS ??= bakeTurns((u, v) => {
  const d = Math.min(segDist(u, v, -2, -4, 3, 0), segDist(u, v, 3, 0, -2, 4));
  return d < 0.8 ? 2 : d < 1.5 ? 1 : 0;
}, 7));

// A ring w px wide round (cx, cy), rx across and ry down, in whole pixels: a run or two a row.
function ringBand(ctx, cx, cy, rx, ry, w) {
  const ix = rx - w, iy = ry - w;
  for (let y = -ry; y < ry; y++) {
    const yc = y + 0.5, ox = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yc / ry) ** 2)));
    if (ox <= 0) continue;
    const inx = Math.abs(yc) < iy ? Math.round(ix * Math.sqrt(1 - (yc / iy) ** 2)) : 0;
    if (inx <= 0) ctx.fillRect(cx - ox, cy + y, 2 * ox, 1);
    else {
      ctx.fillRect(cx - ox, cy + y, ox - inx, 1);
      ctx.fillRect(cx + inx, cy + y, ox - inx, 1);
    }
  }
}

// Where a line of text drawn at y ends, its outline and all.
const lineBottom = (y) => y + GLYPH_H + 1;
// Boss health belongs beside the foe, leaving the top edge to the clock.
const BAR_W = (W) => Math.min(72, W - 24);
const BAR_NAME = ['#fee761', '#feae34', '#be4a2f'];
export const BAR_FALL = { hold: 0.8, flash: 0.15, drop: 0.7, pieces: 22 };
// The experience bar's wrap (28 October 2026, the 27 October review's C3: it snapped down to what
// was left): levels gained at once run it to its end at `fill` bars a second, flash it white for
// `flash` s (FLASHES: SOFT: FLASH_SOFT) and start it again from nought, one by one; within a level
// it eases to the hero's at `ease` a second (it was a quarter a frame); of a burst of many (the
// developer's +10) only the last `most` are run.
export const XP_WRAP = { fill: 5, flash: 0.1, ease: 17, most: 3 };
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
  // A fae ring waking (the Bloomvale's: game/fae.js, 28 October 2026): a pink ring lit top-left (z),
  // shaded magenta to the lower right (P), round a gold heart (Y lit, y); its inside goes to ink with
  // the outline, so the heart sits in a dark eye as the ring's own clear middle does.
  ring: ['.izii.', 'z....i', 'i.YY.P', 'i.Yy.P', 'i....P', '.iPPP.'],
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
// How much higher a flyer's head is, in world px: it is drawn off the ground and bobs (enemies.js
// HOVER, up 6 and bob 2), and its name and bar sat on its body.
const FLY_LIFT = 8;
// What the elites' names keep off this frame (drawNames): the bars, the hero and the names placed
// before, each [x, y, w, h]. Reused from frame to frame.
const TAKEN = [];
let takenN = 0;
function take(x, y, w, h) {
  const r = (TAKEN[takenN++] ??= [0, 0, 0, 0]);
  r[0] = x;
  r[1] = y;
  r[2] = w;
  r[3] = h;
}
function untaken(x, y, w, h) {
  for (let i = 0; i < takenN; i++) {
    const r = TAKEN[i];
    if (x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]) return false;
  }
  return true;
}

// The build as the HUD shows it, copied so it stays as it is (Hud.held): each weapon (w, the weapon
// itself, for the crypt's dimming; its icon, level and whether it had evolved), each relic's
// [id, rank], the gold.
export function heldBuild(g) {
  return {
    weapons: g.player.weapons.map((w) => ({ w, icon: w.def.icon, level: w.level, rankBonus: w.effectiveRank(1) - 1, evolved: w.evolved })),
    relics: [...g.player.passives.entries()],
    blessings: Object.fromEntries(blessingTypes.map(def => [def.count, g.player[def.count]])),
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
      i = held.weapons.push({ w, icon: w.def.icon, level: it.level, rankBonus: w.effectiveRank(1) - 1, evolved: false }) - 1;
    }
    return { row: 'w', i };
  } else if (it.type === 'passive') {
    let i = held.relics.findIndex(([id]) => id === it.id);
    if (i >= 0) held.relics[i][1] = it.level;
    else i = held.relics.push([it.id, it.level]) - 1;
    return { row: 'r', i };
  } else if (FILLERS[it.type]?.count && held.blessings) {
    held.blessings[FILLERS[it.type].count]++;
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
    // The banners as laid out this frame, and the block they make, which a boss's bar keeps off
    // (layoutBanners).
    this.bannerRows = [];
    this.bannerSpan = null;
    // Where the ultimate's kill count stands while it counts, which the edge markers keep off.
    this.killBox = null;
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
    const belt = this.loadout(W, H);
    this.lastDt = dt;
    // What belongs to the world first, under the HUD's own chrome: the rings on the ground, the
    // ultimate's dimming, the elites' names and the hero's bar (they printed over the plates and
    // orbs), and a night boss's letterbox bars (they cut the orbs and plates in half).
    this.drawRingWarnings(ctx, W, H, t);
    this.drawUltDim(ctx, W, H);
    this.drawNames(ctx, W, H);
    this.drawLetterbox(ctx, W, H);
    this.drawXp(ctx, W, p, dt);
    drawLoadout(ctx, belt, t);
    this.drawTop(ctx, W, t, dt);
    this.drawOrbs(ctx, W, H, p, t, belt, dt);
    this.layoutBanners(W, H); // the block the boss's bar keeps off
    this.drawBoss(ctx, W, dt, H);
    this.drawCryptStrike(ctx, W, H, belt);
    this.drawCryptDoor(ctx, W);
    this.drawIndicators(ctx, W, H, t, belt);
    this.drawMapHint(ctx, W, H, belt);
    this.drawSpeech(ctx, W, H);
    // No kill-streak count at the right edge since 28 October 2026 (game.js COMBO: the owner's "the
    // combo counter on the right actually doesn't make sense"); the damage numbers flash instead.
    this.drawBanners(ctx, W, H);
    this.drawArrival(ctx, W, H);
    this.drawSlain(ctx, W, H);
    if (g.showMap && g.world.drawMinimap) g.world.drawMinimap(ctx, W, H, true);
    // The ultimate's cut-in over all of it (its band hid nothing: the hero's bar, the markers, the
    // banners and its own name printed across it); the touch stick stays over it, as he still moves.
    this.drawUltBand(ctx, W, H);
    if (input.device === 'touch') this.drawTouch(ctx, W, H, p);
    if (g.state === 'dying') this.drawDepartingSoul(ctx);
  }

  loadout(W, H) {
    return loadoutLayout(W, H, input.device === 'touch', loadoutItems(this.g, this.held), view.safe);
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
  drawSlots(ctx, p, lit = null, cols = MAX_WEAPONS, weaponsOnly = false) {
    let x = 3;
    const y = 9;
    // In a crypt, where he fights by hand with his own weapon alone, the others are dimmed.
    const main = this.g.caveStrike ? this.g.mainWeapon() : null;
    const held = this.held;
    // During play show owned weapons and the free slots this run can actually fill.
    // Chest reveals may still show both build rows, including their locked slots.
    const { maxWeapons = MAX_WEAPONS, maxRelics = MAX_RELICS } = this.g;
    const weaponCols = weaponsOnly ? Math.max(maxWeapons, held ? held.weapons.length : p.weapons.length) : MAX_WEAPONS;
    for (let i = 0; i < Math.min(MAX_WEAPONS, cols, weaponCols); i++) {
      const h = held && held.weapons[i], w = held ? h && h.w : p.weapons[i];
      if (i >= maxWeapons && !h && !w) {
        this.lockedSlot(ctx, x, y);
        x += 18;
        continue;
      }
      if (main && w && w !== main && !isCopper(w)) ctx.globalAlpha = 0.3;
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
    if (weaponsOnly) return;
    x = 3;
    const ps = held ? held.relics : [...p.passives.entries()];
    for (let i = 0; i < Math.min(MAX_RELICS, cols); i++) {
      const e = ps[i];
      if (i >= maxRelics && !e) this.lockedSlot(ctx, x, y + 21, true);
      else this.slot(ctx, x, y + 21, e ? SPR[PASSIVES[e[0]].icon] : null, e ? e[1] : 0, e ? PASSIVES[e[0]].max : 5, false, true);
      if (lit) this.litMark(ctx, x, y + 21, litK(lit, 'r', i));
      x += 18;
    }
    // Worn rank grants have their own strip; the two build rows keep their learned ranks.
    const ranks = p.gearRanks, grants = [];
    if (ranks && !held && !lit && cols === MAX_WEAPONS) {
      if (ranks.allWeapons) grants.push('i_sword');
      if (ranks.allPassives) grants.push('i_cooldown');
      for (const id of ranks.weapons) grants.push(WEAPONS[id].icon);
      for (const id of ranks.passives) grants.push(PASSIVES[id].icon);
    }
    if (grants.length) {
      const gy = y + 42, gx = 8 + textWidth('GEAR +1');
      ctx.fillStyle = '#221c2b';
      ctx.fillRect(3, gy, gx - 1 + grants.length * 14, 13);
      drawText(ctx, 'GEAR +1', 5, gy + 3, { color: '#cdb3ee' });
      grants.forEach((icon, i) => ctx.drawImage(SPR[icon].frames[0].c, gx + i * 14, gy, 12, 12));
    }
    // Shrine buffs.
    const buffY = y + 42 + (grants.length ? 15 : 0);
    let bx = 3;
    for (const [id, b] of p.buffs) {
      const col = SHRINE_COLORS[id] || '#ffffff';
      ctx.fillStyle = '#181425';
      ctx.fillRect(bx, buffY, 26, 9);
      ctx.fillStyle = col;
      ctx.fillRect(bx + 1, buffY + 1, Math.round(24 * (b.t / b.max)), 7);
      const icon = SPR['i_' + id];
      if (icon) {
        // A found power-up: its icon and the seconds left, not a shrine's name.
        ctx.drawImage(icon.frames[0].c, bx + 1, buffY, 9, 9);
        drawText(ctx, String(Math.ceil(b.t)), bx + 18, buffY + 1, { align: 'center', color: '#181425', outline: null });
      } else drawText(ctx, id.slice(0, 4).toUpperCase(), bx + 13, buffY + 1, { align: 'center', color: '#181425', outline: null });
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
    const g = this.g, remain = clockTime(g);
    const color = clockCountsDown(g) && remain < 60
      ? ['#ffffff', '#fee761', '#feae34']
      : g.mode === 'ranked' && g.bestBeaten
        ? ['#ffffff', '#9ee562', '#63c74d']
        : ['#ffffff', '#ffffff', '#c0cbdc'];
    // On the level's line (topLines): at 8 its outline ran into the experience bar's frame.
    drawText(ctx, fmtTime(remain), Math.floor(W / 2), 9, { align: 'center', color });
    // Gold, rolling up to what it is (never down: a fresh run, or a shown chest's held gold, snaps).
    const want = this.held ? this.held.gold : g.gold;
    if (want < this.goldRoll) this.goldRoll = want;
    else if (want > this.goldRoll) {
      const before = Math.floor(this.goldRoll);
      this.goldRoll = Math.min(want, this.goldRoll + Math.max(dt * 8, (want - this.goldRoll) * Math.min(1, dt * 7)));
      if (Math.floor(this.goldRoll) > before) this.goldPulse = 0.18;
    }
    this.goldPulse = Math.max(0, this.goldPulse - dt);
    // Chest reveals still use the gold counter; loose coins no longer fly toward an invisible HUD.
    this.flung.length = 0;
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

  drawOrbs(ctx, W, H, p, t, belt = this.loadout(W, H), dt = 1 / 60) {
    const g = this.g;
    const hpImg = this.hp.render(p.hp / p.maxHp, t, false, dt);
    const ox = 4 + view.safe.left, oy = H - view.safe.bottom - hpImg.height - 4;
    ctx.drawImage(hpImg, ox, oy);
    drawText(ctx, `${Math.ceil(p.hp)}`, ox + hpImg.width / 2, oy + hpImg.height / 2 - 4, { align: 'center', color: '#ffffff' });
    const shown = this.shownFury();
    const full = p.fury >= 100 && shown >= 100, almost = !full && shown >= FURY_ORB.almost;
    const fImg = (full ? this.furyFull : this.fury).render(shown / 100, t, full ? 1 : almost ? FURY_ORB.glow : 0, dt);
    const fx = W - view.safe.right - fImg.width - 4, fy = H - view.safe.bottom - fImg.height - 4;
    const ocx = fx + fImg.width / 2, ocy = fy + fImg.height / 2;
    // His ultimate not open yet (shared/progress.js ultTime; Player.ultLocked): the orb stands
    // empty and dark in slate behind a padlock, with nothing to press (lockedOrb).
    if (p.ultLocked) {
      ctx.drawImage(lockedOrb(), fx, fy);
      padlock(ctx, ocx - 9, ocy - 9, 2, '#3a4466', '#5a6988');
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
    // Fury comets on their way, in the orb's own magenta: a tail of pixels fading back along the
    // arc and a small star for a head, sinking into the orb under its count (drawn after them).
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
      for (let j = 8; j >= 1; j--) {
        const [x, y] = at(Math.max(0, e - j * 0.035)), r = j > 4 ? 1 : 2;
        ctx.globalAlpha = 1 - j * 0.1;
        ctx.fillStyle = j > 6 ? '#68386c' : j > 2 ? '#b55088' : '#f6757a';
        ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), r, r);
      }
      const [hx, hy] = at(e), x = Math.round(hx), y = Math.round(hy);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#b55088';
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillRect(x - 1, y - 2, 3, 1);
      ctx.fillRect(x - 1, y + 2, 3, 1);
      ctx.fillStyle = '#f6757a';
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillRect(x - 1, y, 3, 1);
    }
    if (this.cometHit > 0) {
      this.cometHit -= this.lastDt || 1 / 60;
      ctx.globalAlpha = clamp(this.cometHit / 0.15, 0, 1);
      orbRing(ctx, ocx, ocy, ORB_R + 2, '#ffffff');
      ctx.globalAlpha = 1;
    }
    // The ultimate's name above the orb, flush with its right edge (centred, a long one ran off);
    // not while its cut-in is up, which shows it big (its band's rule ran through this one).
    const cutIn = (this.ultT() ?? Infinity) < ULT_LAUNCH.dur;
    if (p.ultLocked) {
      // Nothing over a locked orb.
    } else if (p.ult) {
      if (!cutIn) drawText(ctx, this.ultLabel(), fx + fImg.width, this.ultLabelY(W, H, belt), { align: 'right', color: '#f6757a' });
    } else if (full) {
      const key = input.device === 'pad' ? padKey('X') : input.device === 'touch' ? 'TAP' : 'SPACE';
      const blink = Math.floor(t * 3) % 2 === 0;
      drawText(ctx, key, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: blink ? '#ffffff' : '#fee761' });
      drawText(ctx, this.ultLabel(), fx + fImg.width, this.ultLabelY(W, H, belt), { align: 'right', color: blink ? '#fee761' : '#f6757a' });
    } else {
      drawText(ctx, `${Math.floor(shown)}%`, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: '#e8b796' });
    }
    // The ultimate's own kills, counting beside the orb while it lasts; the edge markers keep off it
    // (markerBand: killBox).
    const run = g.ultRun;
    this.killBox = null;
    if (run && run.kills > 0) {
      const c = textCanvas(`×${run.kills}`, ['#ffffff', '#f6757a', '#be4a2f'], '#181425', null, 'bold');
      const x = Math.round(fx - c.width * 2 - 4);
      const y = Math.round(x < belt.x + belt.w ? Math.min(ocy - c.height, belt.y - 2 * c.height - 2) : ocy - c.height);
      ctx.drawImage(c, x, y, c.width * 2, c.height * 2);
      const kb = (this.killBoxAt ??= [0, 0, 0, 0]);
      kb[0] = x;
      kb[1] = y;
      kb[2] = c.width * 2;
      kb[3] = c.height * 2;
      this.killBox = kb;
    }
    if (g.player.revives > 0) ctx.drawImage(SPR.i_revival.frames[0].c, ox + hpImg.width - 6, oy - 8, 12, 12);
  }

  // The ultimate's name as the HUD shows it.
  ultLabel() {
    return (this.ultName ??= this.g.player.hero.ultName.toUpperCase());
  }

  ultLabelY(W, H, belt) {
    const y = H - view.safe.bottom - ORB_S - 15;
    const left = W - view.safe.right - 5 - textWidth(this.ultLabel());
    return left < belt.x + belt.w && y + GLYPH_H + 1 >= belt.y && y <= belt.y + belt.h
      ? belt.y - GLYPH_H - 3 : y;
  }

  // The clock and level sit just below the experience bar; the weapon row is reserved separately.
  topLines() {
    return lineBottom(9);
  }

  // The boss's (or lord's) bar. When the one it showed falls, its bar stays on, empty, then flashes
  // white and breaks apart (barFall) before another boss still fighting takes it.
  drawBoss(ctx, W, dt, H = view.H) {
    const g = this.g, b = g.boss && !g.boss.dead ? g.boss : null;
    // Fallen: dead, or back in the pool as another monster already (its id changed).
    const was = this.barE;
    if (was && (was.dead || was.id !== this.barId) && !this.fall) this.fall = { t: 0, label: this.barLabel, shown: this.barShown, point: this.barPoint, pieces: null };
    this.barE = null;
    if (this.fall) {
      this.barFall(ctx, W, dt, H);
      return;
    }
    // While it speaks too (its bar went away for every line, often just as an attack wound up): its
    // words then take its name's place over the bar (drawSpeech).
    if (!b || !this.overHead(b, W, H) || !seenBy(g, b)) return;
    if (AT.x < 0 || AT.y < 0 || AT.x > W || AT.y > H) return;
    // It slams in at its time (Game.bossIntro: after a night boss's name card), dropping from
    // above with a white flash.
    const since = b.introT === undefined ? 9 : b.introT - (b.slamAt || 0);
    if (since < 0) return;
    const drop = Math.round((1 - ease.outBack(clamp(since / ARRIVAL.slam, 0, 1))) * 8);
    const label = (b.lord ? b.name : b.def.name).toUpperCase();
    const w = BAR_W(W), x = Math.round(clamp(AT.x - w / 2, 3, W - w - 3));
    const y = this.barClear(x + w / 2, w, label, Math.round(clamp(AT.y - 6, this.topLines() + 16, H - 12)), H) - drop;
    const f = clamp(b.hp / b.maxHp, 0, 1);
    b._shown = b._shown === undefined ? f : b._shown + (f - b._shown) * (1 - Math.pow(0.94, dt * 60)); // by time, as the orbs
    this.barPoint = { x, y, cx: x + w / 2 };
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
    if (b.speech) return; // its words stand where its name does
    const hw = textWidth(label) / 2 + 2;
    drawText(ctx, label, Math.round(clamp(x + w / 2, hw, W - hw)), y - 11, { align: 'center', color: BAR_NAME });
  }

  // Where a boss's bar at y (its name over it, centred on cx) stands clear of the banners
  // (bannerSpan): at y if they don't meet; else just above their block or just below it, whichever
  // is nearer and on the screen. The banners keep their line (a slain, dawn or swarm banner ran
  // across the bar and its name); the bar, which moves with its boss anyway, gives way.
  barClear(cx, w, label, y, H = view.H) {
    const span = this.bannerSpan;
    if (!span) return y;
    const hw = Math.max(w, textWidth(label) + 4) / 2;
    // The name's outline from y - 12, the bar's frame to y + 7.
    if (cx + hw <= span.x0 || cx - hw >= span.x1 || y + 8 <= span.top || y - 12 >= span.bottom) return y;
    const above = span.top - 9, below = span.bottom + 13;
    const up = above >= this.topLines() + 16, down = below <= H - 12;
    if (up && (!down || y - above <= below - y)) return above;
    return down ? below : y;
  }

  // How far the ultimate's launch has run (Game.launchUlt, ULT_LAUNCH), in seconds from its key:
  // its cut-in has gone at T.dur; null with none.
  ultT() {
    const g = this.g, L = g.ultLaunch, T = ULT_LAUNCH;
    return L ? (L.started ? T.stop + L.t : T.stop - g.ultStop) : null;
  }

  // The ultimate's launch: the screen dims round a light on the hero, under the HUD (the hero and
  // the HUD go on), and a cut-in slides across over everything (drawUltBand).
  drawUltDim(ctx, W, H) {
    const t = this.ultT(), T = ULT_LAUNCH;
    if (t == null) return;
    const g = this.g, fade = t < 0.08 ? t / 0.08 : t > T.dur - 0.15 ? clamp((T.dur - t) / 0.15, 0, 1) : 1;
    const cam = g.cam, z = cam.S / view.S, hx = (g.player.x - cam.x) * z, hy = (g.player.y - 10 - cam.y) * z;
    const grad = ctx.createRadialGradient(hx, hy, 18, hx, hy, Math.hypot(W, H) * 0.5);
    grad.addColorStop(0, 'rgba(10,6,16,0)');
    grad.addColorStop(0.25, `rgba(10,6,16,${(0.55 * fade).toFixed(3)})`);
    grad.addColorStop(1, `rgba(10,6,16,${(0.8 * fade).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // The cut-in: a band sliding in from the left, holding, then away to the right, with his menu
  // pose and the ultimate's name in the logo font.
  drawUltBand(ctx, W, H) {
    const t = this.ultT(), T = ULT_LAUNCH;
    if (t == null || t >= T.dur) return;
    const hero = this.g.player.hero, pose = SPR[hero.pose] || SPR[hero.sprite], pf = pose.frames[0].c;
    // The pose a whole number of pixels to each of its own (at a fraction some rows and columns came
    // out a pixel wider than the rest), as near the band's own height as that allows, by the rows
    // that are really there (solidRows); the band as tall as it must be to hold him under its top,
    // at most 40% of the screen, and its foot kept above the orbs.
    const solid = solidRows(pf), bh0 = Math.round(H * 0.26);
    const ps = Math.max(1, Math.min(Math.round((bh0 - 6) / solid.h), Math.floor((H * 0.4 - 12) / solid.h)));
    const bh = Math.max(bh0, solid.h * ps + 12), by = Math.min(Math.round(H * 0.62 - bh / 2), H - view.safe.bottom - ORB_S - 6 - bh);
    const k = t < T.slideIn ? ease.outCubic(t / T.slideIn) : t < T.slideOut ? 1 : 1 + ease.inCubic(clamp((t - T.slideOut) / (T.dur - T.slideOut), 0, 1));
    const off = Math.round((k - 1) * W);
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
    // He stands on the lower rule, his head under the band's top (it rose over the upper rule).
    const pw = pf.width * ps, ph = pf.height * ps;
    ctx.drawImage(pf, Math.round(W * 0.18 - pw / 2), by + bh - 3 - (solid.bottom + 1) * ps, pw, ph);
    const left = Math.round(W * 0.34), name = ultLogo(hero.ultName.toUpperCase(), W - left - 6, bh - 8);
    ctx.drawImage(name, left, Math.round(by + bh / 2 - name.height / 2));
    ctx.restore();
  }

  // A night boss's letterbox bars as it comes (arrival.js), drawn before the HUD's chrome: over the
  // world alone, the XP bar, clock, orbs and plates sitting whole on them (drawn last, they cut the
  // orbs and plates in half along their edge).
  drawLetterbox(ctx, W, H) {
    const c = this.g.card;
    if (!c || !c.letterbox) return;
    const t = c.t, gone = c.end != null ? clamp(1 - (t - c.end) / CARD_END, 0, 1) : 1;
    const L = ARRIVAL.letterbox, k = gone * (t < 0.15 ? t / 0.15 : t < L ? 1 : clamp(1 - (t - L) / 0.25, 0, 1));
    const bh = Math.round(H * 0.12 * ease.outCubic(k));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, bh);
    ctx.fillRect(0, H - bh, W, bh);
  }

  // A boss's arrival (arrival.js): before it, the screen's edges darken with "Something stirs in the
  // dark…"; as it comes, its name card (its name big in its colour, its title under it), over a
  // night's boss's letterbox bars (drawLetterbox).
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
    const a = gone * (t < 0.12 ? t / 0.12 : clamp((ARRIVAL.card - t) / 0.6, 0, 1));
    const name = textCanvas(c.name.toUpperCase(), ['#ffffff', c.color, c.color], '#181425', null, 'bold');
    // Its pop in whole steps, one size up then its own (a fraction drew some strokes a pixel wider
    // than others), and never wider than the screen.
    const big = c.letterbox ? 3 : 2, pop = t < 0.2 ? 1 + 0.6 * (1 - ease.outCubic(t / 0.2)) : 1;
    const s2 = Math.max(1, Math.min(big + 1, Math.round(big * pop), Math.floor((W - 20) / name.width)));
    const y = Math.round(H * 0.34);
    ctx.globalAlpha = a;
    ctx.drawImage(name, Math.round(W / 2 - (name.width * s2) / 2), Math.round(y - (name.height * s2) / 2), Math.round(name.width * s2), Math.round(name.height * s2));
    if (c.title) drawText(ctx, c.title, W / 2, Math.round(y + (name.height * s2) / 2 + 3), { align: 'center', color: c.color });
    ctx.globalAlpha = 1;
  }

  // A fallen boss's bar (drawBoss): empty for BAR_FALL.hold s while what it had shown drains away,
  // white for BAR_FALL.flash s, then in BAR_FALL.pieces pieces that tumble and fade for
  // BAR_FALL.drop s, its name fading with them. Real time, so it plays out under the cards too.
  barFall(ctx, W, dt, screenH = view.H) {
    const F = this.fall, H = BAR_FALL, w = BAR_W(W), { x, cx } = F.point;
    // Off the banners too: the slain banner comes up as it falls (barClear).
    const y = this.barClear(cx, w, F.label, F.point.y, screenH);
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
      drawText(ctx, F.label, cx, y - 11, { align: 'center', color: BAR_NAME });
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
    drawText(ctx, F.label, cx, y - 11, { align: 'center', color: BAR_NAME });
    ctx.globalAlpha = 1;
  }

  // Where over a foe's head its name or its speech goes, in HUD pixels, into AT; false if that is
  // well off the screen.
  overHead(e, W, H) {
    const cam = this.g.cam;
    // World positions to HUD pixels: the world is drawn smaller than the HUD.
    const z = cam.S / view.S;
    AT.x = (e.x - cam.x) * z;
    AT.y = (e.y - e.h - 6 - (e.def?.fly ? FLY_LIFT : 0) - cam.y) * z;
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
      if (e.dead || !e.elite || e === g.boss || e.speech || !this.overHead(e, W, H) || !seenBy(g, e)) continue;
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
    // What their names keep off (TAKEN): every bar drawn below, and the names placed; the names go
    // after the bars. And the hero's head and body (not his legs: a champion just below him has its
    // head there).
    takenN = 0;
    const hx = (p.x - 9 - cam.x) * z, hy = (p.y - 34 - cam.y) * z, hw = 18 * z, hh = 24 * z;
    for (const e of g.enemies) {
      if (e.dead || e === g.boss || e.speech || (!e.elite && e.type !== 'thief') || !this.overHead(e, W, H) || !seenBy(g, e)) continue;
      const x = AT.x, y = AT.y;
      if (e.elite) {
        const w = 26, f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#181425';
        ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 4);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), Math.round(w * f), 2);
        take(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 4);
      } else if (e.type === 'thief') {
        const w = 22, f = clamp(e.hp / e.maxHp, 0, 1);
        take(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 6);
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
          take(Math.round(x - c.width / 2), Math.round(y - c.height), c.width, c.height);
        }
      }
    }
    // The names, nearest first, each kept whole on the screen, never cut at its edge: over its own
    // bar, or a line or two higher where that is taken (a pack's names printed over one another, and
    // over the hero). Never lifted onto the hero (over him it read as his): one that can only go on
    // him is left out, its bar still there; one with no other line free stays over its bar, as ever.
    for (const e of NEAR) {
      if (!e || !this.overHead(e, W, H)) continue;
      const half = textWidth(e.name) / 2 + 2, x = Math.round(clamp(AT.x, half, W - half));
      const bx = Math.round(x - half + 1), bw = Math.round(2 * half - 2), own = Math.round(clamp(AT.y - 9, 2, H - 12));
      const onHero = (y) => !p.dead && bx < hx + hw && bx + bw > hx && y - 1 < hy + hh && y + GLYPH_H + 1 > hy;
      let at = onHero(own) ? null : own;
      for (let up = 0; up <= 2; up++) {
        const y = own - up * (GLYPH_H + 2);
        if (y < 2 || (up > 0 && onHero(y))) break;
        if (!onHero(y) && untaken(bx, y - 1, bw, GLYPH_H + 2)) {
          at = y;
          break;
        }
      }
      if (at === null) continue;
      take(bx, at - 1, bw, GLYPH_H + 2);
      drawText(ctx, e.name, x, at, { align: 'center', color: e.mod ? e.mod.color : '#feae34' });
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

  drawCryptStrike(ctx, W, H, belt = this.loadout(W, H)) {
    const g = this.g, p = g.player;
    if (!g.caveStrike || p.dead) return;
    const weapon = g.mainWeapon();
    if (!weapon) return;
    const cam = g.cam, z = cam.S / view.S;
    const x = Math.round((p.x - cam.x) * z), y = Math.round((p.y - cam.y) * z);
    const copper = isCopper(weapon), ready = copper || weapon.cd <= 0;
    const key = input.device === 'touch' ? '2ND FINGER' : input.device === 'pad' ? padKey('RB') : 'X / SHIFT';
    const label = copper ? 'COPPER · AUTO' : `${key} · ${ready ? 'READY' : 'RECOVERING'}`;
    const color = ready ? '#fee761' : '#c0cbdc';
    if ((g.inCrypt.strikes || 0) < 10) {
      const width = textWidth(label) + 10, left = Math.round(clamp(x - width / 2, 2, W - width - 2));
      const top = Math.round(clamp(y + 12, 0, belt.y - 15));
      ctx.fillStyle = '#181425';
      ctx.fillRect(left, top, width, 13);
      drawText(ctx, label, left + width / 2, top + 2, { align: 'center', color });
      ctx.fillStyle = '#3a4466';
      ctx.fillRect(left + 3, top + 11, width - 6, 1);
      ctx.fillStyle = color;
      ctx.fillRect(left + 3, top + 11, Math.round((width - 6) * (copper ? 1 : clamp(1 - weapon.cd / weapon.s.cd, 0, 1))), 1);
    }

    if (copper || weapon.def.kind === 'summon' || weapon.def.kind === 'meteor') return;
    let { target, angle } = g.strikeAim(weapon);
    if (target && !g.inView(target)) return;
    if (weapon.def.kind === 'sword') angle = faceAttack(p.face, p.moving, Math.cos(angle), Math.sin(angle)) < 0 ? Math.PI : 0;
    ctx.save();
    ctx.translate(Math.round(x + Math.cos(angle) * 16), Math.round(y - 8 + Math.sin(angle) * 16));
    drawTurn(ctx, chevrons(), angle, color);
    ctx.restore();
  }

  mapHint() {
    const g = this.g, visit = g.inCrypt;
    if (!visit || visit.mapHintSeen || g.showMap || !Number.isFinite(visit.enteredAt) || g.clock - visit.enteredAt >= 12) return null;
    return input.device === 'touch' ? 'TAP MAP TO EXPLORE' : input.device === 'pad' ? `PRESS ${input.pad.ps ? 'SHARE' : 'VIEW'} FOR MAP` : 'PRESS M FOR MAP';
  }

  drawMapHint(ctx, W, H, belt = this.loadout(W, H)) {
    const label = this.mapHint();
    if (!label) return;
    const width = textWidth(label) + 12, x = Math.round((W - width) / 2), y = Math.min(H - 39, belt.y - 15);
    ctx.fillStyle = '#181425';
    ctx.fillRect(x, y, width, 13);
    drawText(ctx, label, W / 2, y + 3, { align: 'center', color: '#c0cbdc' });
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

  // What a boss says: after the names and the edge markers, over them; on the screen, below the
  // clock. A boss whose bar is up keeps it: its words stand over the bar in its name's place
  // (drawBoss leaves the name out), their tail on the bar.
  drawSpeech(ctx, W, H) {
    const top = this.topLines() + 1;
    for (const e of this.g.enemies) {
      if (e.dead || !e.speech || !this.overHead(e, W, H)) continue;
      const tw = textWidth(e.speech.text), base = e === this.barE ? this.barPoint.y - 2 : AT.y;
      const x = Math.round(clamp(AT.x, tw / 2 + 5, W - tw / 2 - 5)), y = Math.round(Math.max(base, top + 14));
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
  // In a duststorm (the Sunscorch's: Hazards.hazeR, 28 October 2026) what stands on the screen but is
  // lost in the sand beyond the hero's clear sight shows its icon where it stands (hazeMark); what is off
  // the screen keeps its arrow. Without a haze (the Darkwood, every other map, a clear sky) as ever.
  drawIndicators(ctx, W, H, t, belt = this.loadout(W, H)) {
    const g = this.g, m = marks();
    this.hazeR = g.hazards ? g.hazards.hazeR : null;
    this.markerBand(W, H, belt);
    if (g.boss && !g.boss.dead) this.pointer(ctx, W, H, t, g.boss.x, g.boss.y - 10, '#e43b44', m.boss);
    for (const s of g.shrines) if (!s.used) this.pointer(ctx, W, H, t, s.x, s.y - 10, SHRINE_COLORS[s.type], m.shrine[s.type]);
    for (const d of g.crypts) if (!d.sealed) this.pointer(ctx, W, H, t, d.x, d.y - 12, '#b55088', m.crypt);
    for (const pk of g.pickups) if ((pk.kind === 'chest' || pk.kind === 'stall') && !pk.dead) this.pointer(ctx, W, H, t, pk.x, pk.y, '#feae34', m.chest); // and the merchant's stall (game/stall.js)
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

  // Keep the useful warning for an approaching attack without persistent exploration arrows.
  drawWarningIndicators(ctx, W, H, t) {
    const g = this.g, p = g.player;
    if (!g.warnings.some((w) => w.from)) return;
    this.hazeR = null;
    this.markerBand(W, H);
    for (const w of g.warnings) if (w.from) this.pointer(ctx, W, H, t, p.x + w.from[0], p.y + w.from[1], '#f77622', marks().warn);
  }

  // A ring about to close, or the last stand (a ring too): for its last WARN.ring s, a faint ring
  // on the ground round the hero.
  drawRingWarnings(ctx, W, H, t) {
    const g = this.g, cam = g.cam, z = cam.S / view.S;
    for (const w of g.warnings) {
      if ((w.ev.type !== 'ring' && w.ev.type !== 'stand') || w.t < WARN.lead - WARN.ring) continue;
      const k = clamp((w.t - (WARN.lead - WARN.ring)) / WARN.ring, 0, 1);
      const x = Math.round((g.player.x - cam.x) * z), y = Math.round((g.player.y - 4 - cam.y) * z), r = Math.round(Math.min(W, H) * (0.46 - 0.12 * k));
      ctx.globalAlpha = (0.18 + 0.22 * k) * (0.75 + 0.25 * Math.sin(t * 12));
      ctx.fillStyle = '#e43b44';
      ringBand(ctx, x, y, r, Math.round(r * 0.8), 2); // whole pixels: a stroked ellipse came out in half-tones
      ctx.globalAlpha = 1;
    }
  }

  // Edge markers keep clear of the weapon row, corner orbs, revival feather,
  // ultimate name, and the crypt's entry map reminder.
  markerBand(W, H, belt = this.loadout(W, H)) {
    const g = this.g, p = g.player;
    BAND.top = this.topLines() + MARK_R + 2;
    BAND.bottom = H - view.safe.bottom - 30;
    BAND.left = view.safe.left + 14;
    BAND.right = W - view.safe.right - 14;
    keepN = 0;
    keep(belt.x, belt.y, belt.w, belt.h);
    keep(view.safe.left, H - view.safe.bottom - ORB_S - 4, ORB_S + 4, ORB_S + 4);
    keep(W - view.safe.right - ORB_S - 4, H - view.safe.bottom - ORB_S - 4, ORB_S + 4, ORB_S + 4);
    if (p.revives > 0) keep(view.safe.left + ORB_S - 2, H - view.safe.bottom - ORB_S - 12, 12, 12);
    if (p.ult || p.fury >= 100) {
      const tw = textWidth(this.ultLabel());
      keep(W - view.safe.right - 5 - tw, this.ultLabelY(W, H, belt) - 1, tw + 2, GLYPH_H + 2);
    }
    // The ultimate's kill count beside the fury orb (a marker landed on its ×3 for the whole ult).
    const kb = this.killBox;
    if (kb && g.ultRun?.kills > 0) keep(kb[0] - 2, kb[1] - 2, kb[2] + 4, kb[3] + 4);
    const mapHint = this.mapHint();
    if (mapHint) {
      const width = textWidth(mapHint) + 12;
      keep(Math.round((W - width) / 2), Math.min(H - 39, belt.y - 15), width, 13);
    }
  }

  // One of those markers, toward world point (wx, wy), unless that is on screen: an arrow in its
  // colour and the icon of what it points at.
  pointer(ctx, W, H, t, wx, wy, col, icon) {
    const cam = this.g.cam;
    const z = cam.S / view.S;
    const sx = (wx - cam.x) * z, sy = (wy - cam.y) * z;
    if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) {
      if (this.hazeR != null && icon) this.hazeMark(ctx, t, wx, wy, sx, sy, icon);
      return;
    }
    placeMarker(sx, sy);
    const x = SPOT.x, y = SPOT.y, a = Math.atan2(sy - y, sx - x);
    const bob = Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.translate(Math.round(x + Math.cos(a) * bob), Math.round(y + Math.sin(a) * bob));
    drawTurn(ctx, arrows(), a, col);
    ctx.restore();
    if (icon) ctx.drawImage(icon, Math.round(x + IN_X[SPOT.edge] * MARK_IN - icon.width / 2), Math.round(y + IN_Y[SPOT.edge] * MARK_IN - icon.height / 2));
  }

  // A marker's icon where world point (wx, wy) stands on the screen (HUD point sx, sy), when it is
  // lost in the duststorm's sand: more than hazeR + 16 world px from the hero (the haze's clear sight,
  // and a little), pulsing, without an arrow (the owner's "duststorm with effect reduced visibility",
  // 28 October 2026: the sand hides the boss, a shrine, a crypt, a chest, the thief, never their place).
  hazeMark(ctx, t, wx, wy, sx, sy, icon) {
    const p = this.g.player;
    if (Math.hypot(wx - p.x, wy - p.y) <= this.hazeR + 16) return;
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
    ctx.drawImage(icon, Math.round(sx - icon.width / 2), Math.round(sy - icon.height / 2));
    ctx.globalAlpha = 1;
  }

  // Draw over the HUD so a rising wisp can cross the top edge.
  drawDepartingSoul(ctx) {
    const g = this.g, p = g.player, c = g.cam;
    const wisp = SPR[p.hero.sprite]?.fall?.wisp;
    if (!wisp) return;
    const age = g.deathT - wisp.release;
    if (age < 0 || age >= g.soulDuration(wisp)) return;

    const frame = wisp.frames[wisp.frameAt(age)];
    const flip = p._rect ? p._rect[5] : p.face < 0;
    const scale = c.S / view.S; // World pixels expressed on the HUD canvas.
    const groundY = (p.y - c.y) * scale;
    if (wisp.walkOff) {
      const { rise, speed } = wisp.walkOff;
      const steps = Math.max(0, age - rise) * speed * (flip ? -1 : 1);
      const x = (p.x - c.x + steps - frame.w / 2) * scale;
      ctx.save();
      ctx.globalAlpha *= .86 * clamp(age / .24, 0, 1);
      ctx.drawImage(frame.get(flip), Math.round(x), Math.round(groundY - wisp.anchorY * scale), frame.w * scale, frame.h * scale);
      ctx.restore();
      return;
    }
    const u = age / wisp.duration;
    const startY = groundY + (wisp.offsetY - wisp.anchorY) * scale;
    const drift = (wisp.sinks ? 1.75 : 4) * Math.sin(age * 3.5);
    const x = (p.x - c.x + (flip ? -1 : 1) * (wisp.offsetX + drift) - frame.w / 2) * scale;
    if (wisp.sinks) {
      // Mask the ribbon at the ground as its leading tip and then its tail pass through.
      const y = Math.round(startY + (groundY - startY) * u);
      const height = Math.min(frame.h * scale, Math.round(groundY) - y);
      if (height / scale > frame.box[1]) {
        ctx.drawImage(frame.get(flip), 0, 0, frame.w, height / scale,
          Math.round(x), y, frame.w * scale, height);
      }
      return;
    }
    const distance = startY + frame.h * scale + 1;
    // The initial lift has the same pace at any zoom. The wisp then accelerates to
    // cover the remaining distance, including its full tail, even on a tall display.
    const launch = Math.min(64 * scale, distance);
    const y = startY - u * (launch + (distance - launch) * u);
    ctx.drawImage(frame.get(flip), Math.round(x), Math.round(y), frame.w * scale, frame.h * scale);
  }

  // Fallen: "Slain by …" fades in over the drained world (Game DEATH.name), before the results.
  drawSlain(ctx, W, H) {
    const g = this.g;
    if (g.state !== 'dying' || !g.player.dead || g.deathT < g.deathTiming.name) return;
    const who = g.stats.killedBy;
    const c = textCanvas(who ? `SLAIN BY ${who.toUpperCase()}` : 'YOU HAVE FALLEN', ['#ffffff', '#f6757a', '#a22633'], '#181425');
    const s = c.width * 2 <= W - 16 ? 2 : 1;
    ctx.globalAlpha = clamp((g.deathT - g.deathTiming.name) / 0.5, 0, 1);
    // Leave the spirit's path above the fallen hero clear.
    const y = H * (SPR[g.player.hero.sprite]?.fall?.wisp ? 0.63 : 0.3);
    ctx.drawImage(c, Math.round(W / 2 - (c.width * s) / 2), Math.round(y), c.width * s, c.height * s);
    ctx.globalAlpha = 1;
  }

  // The banners shown this frame, top to bottom (bannerRows: each its banner, title canvas, scale,
  // top, sub-line, width and height), and the block they make (bannerSpan: x0, x1, top, bottom),
  // which a boss's bar keeps off (barClear); none under a card, chest, gear or pause screen.
  layoutBanners(W, H) {
    const g = this.g, rows = this.bannerRows, pool = (this.bannerPool ??= []);
    rows.length = 0;
    this.bannerSpan = null;
    // Under a card, chest, gear or pause screen they stay hidden (they still run out, but for a
    // first-run hint and a lock of the Codex reached, which wait: Game.fadeReal).
    if (g.state === 'levelup' || g.state === 'chest' || g.state === 'item' || g.state === 'paused') return rows;
    if (g.card) return rows; // a boss's name card has the screen; they wait (Game.fadeReal)
    // Below the lines at the top: a boss's own banner came down on its name.
    const top = Math.max(Math.round(H * 0.22), this.topLines() + 4);
    const held = g.hintsHeld;
    let y = top, x0 = W, x1 = 0;
    for (const b of g.banners) {
      if (b.hint && held) continue; // a first-run hint waits its turn (Game.hintsHeld)
      // Twice its size where that fits the screen, else at its own (as drawSlain), cut short only
      // if even that is too wide; its sub-line cut to the screen (an ultimate's receipt ran off both
      // edges of a phone).
      let c = textCanvas(b.title, ['#ffffff', b.color, b.color], '#181425');
      const s = c.width * 2 <= W - 8 ? 2 : 1;
      if (c.width > W - 8) c = textCanvas(fitText(b.title, W - 10), ['#ffffff', b.color, b.color], '#181425');
      const sub = b.sub ? fitText(b.sub, W - 8) : '', th = c.height * s;
      const w = Math.max(c.width * s, sub ? textWidth(sub) + 2 : 0), h = sub ? th + GLYPH_H : th;
      const r = (pool[rows.length] ??= {});
      r.b = b;
      r.c = c;
      r.s = s;
      r.y = y;
      r.sub = sub;
      r.w = w;
      r.h = h;
      rows.push(r);
      x0 = Math.min(x0, Math.floor(W / 2 - w / 2));
      x1 = Math.max(x1, Math.ceil(W / 2 + w / 2));
      y += sub ? th + 12 : th + 2;
    }
    if (rows.length) {
      const span = (this.span ??= {}), last = rows[rows.length - 1];
      span.x0 = x0;
      span.x1 = x1;
      span.top = top;
      span.bottom = last.y + last.h;
      this.bannerSpan = span;
    }
    return rows;
  }

  drawBanners(ctx, W, H) {
    const sun = !!this.g.look?.sun;
    for (const r of this.layoutBanners(W, H)) {
      const b = r.b, c = r.c, u = b.t / b.dur;
      const a = clamp(u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1, 0, 1);
      // By day (the Sunscorch, the Frostfell) the light ground took the white of the letters and the
      // sub-line's grey: a dark backing behind each banner, stepped at its ends.
      if (sun) {
        const w = r.w + 8, x = Math.round(W / 2 - w / 2), y = r.y - 1, h = r.h + 2;
        ctx.globalAlpha = 0.5 * a;
        ctx.fillStyle = '#181425';
        ctx.fillRect(x + 2, y, w - 4, 1);
        ctx.fillRect(x + 1, y + 1, w - 2, 1);
        ctx.fillRect(x, y + 2, w, h - 4);
        ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
        ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
      }
      // It pops in one size up, then its own, in whole steps (a fraction drew some strokes a pixel
      // wider than others), the step up only where it fits.
      const pop = u < 0.12 ? 1.6 - ease.outCubic(u / 0.12) * 0.6 : 1;
      let s = Math.round(r.s * pop);
      if (c.width * s > W - 8) s = r.s;
      ctx.globalAlpha = a;
      ctx.drawImage(c, Math.round(W / 2 - (c.width * s) / 2), Math.round(r.y - (c.height * (s - r.s)) / 2), c.width * s, c.height * s);
      if (r.sub) drawText(ctx, r.sub, Math.round(W / 2), r.y + c.height * r.s - 1, { align: 'center', color: '#c0cbdc' });
    }
    ctx.globalAlpha = 1;
  }

  drawTouch(ctx, W, H, p) {
    H -= view.safe.bottom;
    const s = input.stick;
    if (s.active) {
      // Crisp pixel discs, still see-through (canvas arcs came out with soft half-tone rims): the
      // base a ring round a faint fill, the knob solid.
      const base = ringSprite(22, '#c0cbdc', 1, ['#c0cbdc', 128]), knob = ringSprite(9, '#c0cbdc', 99);
      const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy), k = Math.min(1, 22 / (l || 1));
      ctx.globalAlpha = 0.6;
      ctx.drawImage(base, Math.round(s.ox - base.width / 2), Math.round(s.oy - base.height / 2));
      ctx.globalAlpha = 0.7;
      ctx.drawImage(knob, Math.round(s.ox + dx * k - knob.width / 2), Math.round(s.oy + dy * k - knob.height / 2));
      ctx.globalAlpha = 1;
    }
    // Pause button, on whole pixels at any width (at an odd one, W / 2 put its edges on half pixels).
    const cx = Math.floor(W / 2);
    ctx.fillStyle = '#181425';
    ctx.fillRect(cx - 9, H - 18, 18, 14);
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(cx - 4, H - 15, 3, 8);
    ctx.fillRect(cx + 1, H - 15, 3, 8);
    if (this.g.inCrypt || this.g.mode === 'dungeon') {
      ctx.fillStyle = '#181425';
      ctx.fillRect(cx + 19, H - 20, 32, 18);
      drawText(ctx, 'MAP', cx + 35, H - 15, { align: 'center', color: this.g.showMap ? '#2ce8f5' : '#c0cbdc' });
    }
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
