// The Sprite Lab's game screen: the real game (public/, served under /game/), played with the
// keyboard (WASD or the arrows, as in the game), with any sprite in any part. The hero
// cannot die unless told to, the game's own waves are off unless turned on, and level-ups,
// chests and gear never stop the action. The lab drives it with messages:
//   { lab: true, action, ... }
//   hero     { role, id }       play as this class, wearing this sprite (id null: the game's own)
//   monster  { part, id }       this sprite plays this monster, prop or boss from now on
//   spawn    { part, n }        bring n of it (a boss comes alone, props stand near the hero)
//   clear                       send every monster away
//   lineup   { heroes }         every part standing in a row by the hero, labelled with its height
//   waves | god | fight { value } the game's own spawning; can't die; the hero's weapons
//   grow { value }              the game's own sprites as drawn, or grown to the knight's scale
//   tweak { kind, role, id, values }  recolour what a part wears (while it wears sprite id),
//                               by the colour bar's sliders (lib/recolour.js)
//   save { kind, role }         save what the part wears, recoloured, as a new version; it
//                               then wears that ({ saved: entry } and { wearing } answer)
//   zoom { value } ('game' | 'closer' | 'native'), pause { value }, restart
import { initView, view, presentUI, onResize } from '/game/js/engine/view.js';
import { buildSprites, SPR, Frame } from '/game/js/engine/sprites.js';
import { input, initInput } from '/game/js/engine/input.js';
import { Game } from '/game/js/game/game.js';
import { HEROES } from '/game/js/data/heroes.js';
import { ENEMIES } from '/game/js/data/enemies.js';
import { defaultProfile, metaBonuses } from '/game/js/shared/profile.js';
import { drawText, textWidth } from '/game/js/ui/ui.js';
import { loadCast, roleOf, addVersion, HERO_ROLES, MONSTER_ROLES } from '/lib/cast.js';
import { gameSprite, rememberOriginals } from '/lib/gamesprite.js';
import { recolourSprite, spriteSheet, isNeutral } from '/lib/recolour.js';

const q = new URLSearchParams(location.search);
let zoom = q.get('zoom') || 'game', paused = false;
const opts = { god: true, fight: true, waves: false, grow: false };

const note = document.querySelector('#note');
const send = (data) => parent !== window && parent.postMessage({ lab: true, ...data }, location.origin);
const say = (text, bad = false) => {
  note.textContent = text;
  note.className = bad ? 'bad' : '';
  note.hidden = !text;
};
window.addEventListener('error', (e) => {
  say('Error: ' + e.message, true);
  send({ error: e.message });
});
window.addEventListener('unhandledrejection', (e) => {
  say('Error: ' + (e.reason?.message || e.reason), true);
  send({ error: String(e.reason?.message || e.reason) });
});

// ----------------------------------------------------------------- zoom --

// As the game sizes itself, or a step closer, or one screen pixel per art pixel.
function applyZoom() {
  const S0 = Math.max(1, Math.round(Math.min(view.pxW, view.pxH) / 300));
  const S = zoom === 'closer' ? S0 + 1 : zoom === 'native' ? 1 : S0;
  view.S = S;
  view.W = Math.ceil(view.pxW / S);
  view.H = Math.ceil(view.pxH / S);
  view.ui.width = view.W;
  view.ui.height = view.H;
  view.uctx.imageSmoothingEnabled = false;
  view.ctx.imageSmoothingEnabled = false;
  send({ orbs: orbsReach() });
}
// How far the HUD's orbs reach in from the bottom corners, in the page's pixels (each is 48
// HUD pixels wide, 4 in from its side): the lab's colour bar sits between them.
const orbsReach = () => Math.ceil((52 * view.S) / view.dpr);

const canvasEl = document.querySelector('#canvas');
initView(canvasEl);
initInput(canvasEl);
onResize(applyZoom);
applyZoom();
buildSprites();
rememberOriginals();
const ANIM = Object.fromEntries(Object.entries(ENEMIES).map(([k, d]) => [k, d.anim]));
const cast = await loadCast();

// ---------------------------------------------------------------- sprites --

// What each part wears (its candidate's id), the sprite as drawn (bare), and the colour bar's
// recolouring of it ({ id, values }: only while it still wears that sprite).
const worn = { hero: {}, monster: {} }, bare = { hero: {}, monster: {} }, tweaks = { hero: {}, monster: {} };
let floating = false;
const own = (kind, part) => cast.byId.get('game:' + (kind === 'hero' ? HEROES[part].sprite : ENEMIES[part].sprite));

// The part's sprite into the game, recoloured if the bar says so.
function install(kind, role) {
  const base = bare[kind][role];
  if (!base) return;
  const t = tweaks[kind][role];
  const spr = t && t.id === worn[kind][role] ? recolourSprite(base, t.values) : base;
  if (kind === 'hero') {
    SPR[HEROES[role].sprite] = spr;
    return;
  }
  SPR[ENEMIES[role].sprite] = spr;
  if (g) for (const e of g.enemies) if (e.type === role) {
    e.spr = spr;
    e.h = spr.h * e.scale;
  }
}

async function wearHero(role, id) {
  const c = (id && cast.byId.get(id)) || own('hero', role);
  const spr = await gameSprite(c, { as: 'hero', height: 30, grow: opts.grow });
  bare.hero[role] = spr;
  worn.hero[role] = c.id;
  install('hero', role);
  if (role === heroRole) floating = !!spr.floating;
  return c;
}
async function wearMonster(part, id) {
  const c = (id && cast.byId.get(id)) || own('monster', part);
  const spr = await gameSprite(c, { as: 'monster', height: roleOf('monster', part).h, grow: opts.grow });
  bare.monster[part] = spr;
  // The game plays a monster's frames round and round at its own rate: this sprite's.
  ENEMIES[part].anim = spr.animFps || ANIM[part];
  worn.monster[part] = c.id;
  install('monster', part);
  return c;
}

// The bar's sliders move many times a second: each part is recoloured at most once a frame.
const retint = new Set();
function tweak(kind, role, id, values) {
  tweaks[kind][role] = isNeutral(values) ? null : { id, values: { ...values } };
  retint.add(kind + ':' + role);
}

// What the part wears, as recoloured, saved as a new version (sprites/lab/versions.json), which
// it then wears: the sheet as lib/gamesprite.js reads it, the frame lists and rates as the game
// plays them, and the licence of the sprite it was made from.
async function saveVersion(kind, role) {
  const t = tweaks[kind][role], from = cast.byId.get(worn[kind][role]);
  if (!t || t.id !== worn[kind][role] || !from) throw new Error('nothing recoloured to save');
  const spr = recolourSprite(bare[kind][role], t.values), sheet = spriteSheet(spr, kind);
  const root = from.mine ? from.lab.root : from.name.replace(/ \(in the game now\)$/, '');
  const entry = {
    w: sheet.w, h: sheet.h, frames: sheet.frames, rows: sheet.rows,
    walk: spr.walk, idle: spr.idle, attack: spr.attack, attackFps: spr.attackFps, motionRate: spr.motionRate, idleRate: spr.idleRate,
    anchorY: spr.anchorY + (kind === 'monster' ? sheet.h - spr.h : 0), selfBob: spr.selfBob, floating: !!spr.floating,
    fitW: spr.fitW, fitH: spr.fitH, animFps: spr.animFps || null,
  };
  const r = await fetch('/api/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      as: kind, role, root, entry, adjust: t.values, png: sheet.canvas.toDataURL('image/png'),
      from: from.id, fromName: from.mine ? from.name : root, by: from.by, licence: from.licence, restricted: from.restricted,
    }),
  });
  const saved = await r.json();
  if (!r.ok) throw new Error(saved.error || 'not saved (' + r.status + ')');
  const c = addVersion(cast, saved);
  if (kind === 'hero') {
    await wearHero(role, c.id);
    if (role === heroRole) applyOpts();
  } else await wearMonster(role, c.id);
  return { entry: saved, id: c.id };
}

// ------------------------------------------------------------------ game --

let g = null, heroRole = q.get('hero') && HEROES[q.get('hero')] ? q.get('hero') : 'knight', weapons = [], spawnWaves = null, lineup = [];
function newGame() {
  g = new Game({ hero: heroRole, mode: 's15', meta: metaBonuses(defaultProfile()), settings: {} });
  g.banners.length = 0;
  spawnWaves = g.spawner.update.bind(g.spawner);
  weapons = g.player.weapons.slice();
  lineup = [];
  applyOpts();
}
function applyOpts() {
  g.player.devGod = opts.god;
  g.spawner.update = opts.waves ? spawnWaves : () => {};
  g.player.weapons.length = 0;
  if (opts.fight) g.player.weapons.push(...weapons);
  g.player.stepT = floating ? Infinity : g.player.stepT === Infinity ? 0 : g.player.stepT;
}
function clear() {
  for (const e of g.enemies) g.enemyPool.put(e);
  g.enemies.length = 0;
  g.boss = null;
  lineup = [];
}

function spawn(part, n) {
  const r = roleOf('monster', part), p = g.player;
  for (let i = 0; i < n; i++) {
    if (r.group === 'Props') {
      const a = Math.random() * Math.PI * 2, d = 28 + Math.random() * 40;
      g.spawnProp(part, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7);
    } else if (r.group === 'Bosses') {
      const pt = g.world.spawnPoint(g, 20);
      if (pt) g.spawnBoss(part, pt.x, pt.y);
      g.banners.length = 0;
      return;
    } else {
      const pt = g.world.spawnPoint(g, 20);
      if (pt) g.spawnEnemy(part, pt.x, pt.y, { instant: true });
    }
  }
}

// A hero's resting pose as something that stands in the world like a monster: its idle frames
// cut off at its feet (a monster's frame ends at its feet).
function standee(role) {
  const spr = SPR[HEROES[role].sprite], idle = spr.idle || [0], foot = spr.anchorY;
  const frames = idle.map((i) => {
    const f = spr.frames[i], h = Math.min(f.h, foot);
    const d = new Uint32Array(f.w * h);
    d.set(f.buf.d.subarray(0, f.w * h));
    return new Frame({ w: f.w, h, d });
  });
  return { name: 'standee-' + role, frames, walk: null, idle: null, motionRate: 1, idleRate: 4, attack: null, attackFps: 0, selfBob: false, anchorY: frames[0].h - 1, fitW: spr.w, fitH: frames[0].h, fps: 0, hires: 1, small: null, picture: null, w: spr.w, h: frames[0].h };
}

// Every part standing still in rows to the hero's right (heroes, monsters, bosses, props), five
// to a row, each in a cell as wide as its label, facing him, labelled with its name and
// height; the hero's weapons are put away.
const PER_ROW = 5;
async function lineUp(heroes) {
  clear();
  opts.fight = false;
  applyOpts();
  const p = g.player, rows = [];
  // The other classes as they are worn (or picked), each standing as a statue.
  const others = [];
  for (const r of HERO_ROLES) {
    if (r.id === heroRole) continue;
    await wearHero(r.id, heroes?.[r.id] ?? worn.hero[r.id]);
    const key = 'lineup_' + r.id;
    SPR[key] = standee(r.id);
    ENEMIES[key] = { name: r.name, sprite: key, hp: 1e9, spd: 0, dmg: 0, r: 5, xp: 0, ai: 'static', mass: 99, anim: 3, death: 'blood' };
    others.push({ part: key, label: r.name, h: 30 });
  }
  const groups = [others];
  for (const group of ['Monsters', 'Bosses', 'Props']) groups.push(MONSTER_ROLES.filter((r) => r.group === group).map((r) => ({ part: r.id, label: r.name })));
  for (const list of groups) for (let i = 0; i < list.length; i += PER_ROW) rows.push(list.slice(i, i + PER_ROW));
  // World pixels per HUD pixel: labels are drawn on the HUD, which is drawn larger than the world.
  const z = g.cam.S / view.S, line = 9 / z;
  const placed = rows.map((row) => {
    const made = [];
    for (const it of row) {
      const e = g.spawnEnemy(it.part, 0, 0, { instant: true });
      if (!e) continue;
      // Standing for its portrait: no moving, no blows, no spells or summons.
      e.holdT = 1e9;
      e.dmg = 0;
      e.ai = () => [0, 0, 0];
      e.face = -1;
      const px = `${standsTall(e.spr)} px`;
      made.push({ e, name: it.label, px, w: Math.max(e.spr.w * 0.7, textWidth(it.label) / z, textWidth(px) / z) + 12 });
    }
    return { made, tallest: Math.max(10, ...made.map((m) => m.e.h)) };
  });
  // The whole block beside the hero, its middle level with him, so it all fits on the screen.
  const gap = line * 2 + 14, total = placed.reduce((t, r) => t + r.tallest + gap, 0);
  let y = p.y - total / 2;
  for (const { made, tallest } of placed) {
    y += tallest;
    let x = p.x + 26;
    for (const m of made) {
      m.e.x = x + m.w / 2;
      m.e.y = y;
      x += m.w;
      lineup.push(m);
    }
    y += gap;
  }
  send({ status: 'Line-up: every part standing by the hero, with its height in game pixels. Walk along it.' });
}

// How tall a sprite really stands: its tallest frame, top pixel to feet.
function standsTall(spr) {
  let H = 0;
  for (const f of spr.frames.slice(0, 24)) {
    const d = f.buf.d;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        if (d[y * f.w + x] >>> 24 > 24) {
          if (y0 < 0) y0 = y;
          y1 = y;
          break;
        }
      }
    }
    if (y1 >= 0) H = Math.max(H, y1 - y0 + 1);
  }
  return H;
}

// The line-up's names and heights under each, in the game's own lettering.
function drawLabels() {
  if (!lineup.length) return;
  const cam = g.cam, z = cam.S / view.S;
  for (const { e, name, px } of lineup) {
    if (e.dead) continue;
    const x = Math.round((e.x - cam.x) * z), y = Math.round((e.y - cam.y) * z + 3);
    if (x < -60 || y < -20 || x > view.W + 60 || y > view.H + 20) continue;
    drawText(view.uctx, name, x, y, { align: 'center', color: '#e8e4d9' });
    drawText(view.uctx, px, x, y + 9, { align: 'center', color: '#feae34' });
  }
}

function draw() {
  g.draw(view.ctx);
  view.uctx.clearRect(0, 0, view.W, view.H);
  g.hud.draw(view.uctx, view.W, view.H, g.time);
  drawLabels();
  presentUI();
}

// As the game's own loop (public/js/main.js): one update a frame, at most 1/20 s at a time.
let previous = performance.now(), overT = 0;
function tick(now) {
  const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  for (const k of retint) install(...k.split(':'));
  retint.clear();
  input.update();
  if (!paused) {
    g.update(dt);
    // Nothing stops the action: no level-up choices, chests or gear to answer.
    g.pendingLevels = 0;
    g.chestQueue.length = 0;
    g.itemQueue.length = 0;
    if (g.state === 'over' && (overT += dt) > 2) {
      overT = 0;
      newGame();
    }
  }
  draw();
  input.endFrame();
  requestAnimationFrame(tick);
}

// A hint while the keys go elsewhere.
const focusHint = () => say(document.hasFocus() ? '' : 'Click the game to walk the hero (WASD or the arrows)');
window.addEventListener('focus', focusHint);
window.addEventListener('blur', focusHint);
canvasEl.addEventListener('pointerdown', () => window.focus());

window.addEventListener('message', async (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.lab) return;
  const m = e.data;
  try {
    if (m.action === 'hero') {
      const c = await wearHero(m.role, m.id);
      if (m.role !== heroRole) {
        heroRole = m.role;
        floating = !!SPR[HEROES[heroRole].sprite].floating;
        newGame();
      } else applyOpts();
      send({ wearing: { kind: 'hero', role: m.role, id: c.id } });
    } else if (m.action === 'monster') {
      const c = await wearMonster(m.part, m.id);
      send({ wearing: { kind: 'monster', role: m.part, id: c.id } });
    } else if (m.action === 'spawn') spawn(m.part, m.n || 1);
    else if (m.action === 'clear') clear();
    else if (m.action === 'lineup') await lineUp(m.heroes);
    else if (m.action === 'grow') {
      // The game's own sprites as drawn, or grown to the knight's scale: wear every part again.
      opts.grow = !!m.value;
      for (const r of HERO_ROLES) await wearHero(r.id, worn.hero[r.id]);
      for (const r of MONSTER_ROLES) await wearMonster(r.id, worn.monster[r.id]);
      if (lineup.length) await lineUp(worn.hero);
      send({ status: opts.grow ? "The game's own sprites grown to the knight's scale: heroes 30 px, monsters as the size table has them" : "The game's own sprites as the game draws them" });
    } else if (m.action === 'tweak') {
      // A part still in the game's own sprite, not yet put on by the lab: put it on, to recolour.
      if (!bare[m.kind][m.role]) await (m.kind === 'hero' ? wearHero : wearMonster)(m.role, null);
      tweak(m.kind, m.role, m.id, m.values);
    } else if (m.action === 'save') {
      const { entry, id } = await saveVersion(m.kind, m.role);
      send({ saved: { kind: m.kind, role: m.role, entry } });
      send({ wearing: { kind: m.kind, role: m.role, id } });
    } else if (m.action === 'waves' || m.action === 'god' || m.action === 'fight') {
      opts[m.action] = !!m.value;
      applyOpts();
    } else if (m.action === 'zoom') {
      zoom = m.value;
      applyZoom();
    } else if (m.action === 'pause') paused = !!m.value;
    else if (m.action === 'restart') newGame();
  } catch (err) {
    say('Error: ' + err.message, true);
    send({ error: err.message });
  }
});

// Start as picked: every hero class and monster part wearing its pick; but the hero in what
// ?wear= names, and the part ?part= names in what ?mwear= does (the Compare page's "Try it").
const picks = await fetch('/api/picks', { cache: 'no-store' }).then((r) => r.json());
const wear = q.get('wear'), mpart = ENEMIES[q.get('part')] ? q.get('part') : null, mwear = mpart && q.get('mwear');
for (const r of HERO_ROLES) await wearHero(r.id, r.id === heroRole && wear ? wear : picks.hero[r.id]);
for (const r of MONSTER_ROLES) if (r.id === mpart ? mwear : picks.monster[r.id]) await wearMonster(r.id, r.id === mpart ? mwear : picks.monster[r.id]);
floating = !!SPR[HEROES[heroRole].sprite].floating;
newGame();
focusHint();
send({ ready: true, worn, orbs: orbsReach() });
requestAnimationFrame(tick);
