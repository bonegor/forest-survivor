// Disposable native-canvas review using the shipping Game and HeroScreen.
// No storage/session APIs: the profile exists only inside this process.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || 'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites, SPR } = await import('../public/js/engine/sprites.js');
const { Game } = await import('../public/js/game/game.js');
const { Dungeon, cryptHasEaNasir } = await import('../public/js/game/dungeon.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');
const { HeroScreen } = await import('../public/js/ui/hero-selection.js');
const { PauseOverlay } = await import('../public/js/ui/gamescreen.js');
const { MenuScene } = await import('../public/js/ui/background.js');
const { UI } = await import('../public/js/ui/ui.js');
const { input } = await import('../public/js/engine/input.js');
const { view } = await import('../public/js/engine/view.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
buildSprites();
const root = 'output/eanasir-review';
mkdirSync(root + '/encounter', { recursive: true });
function surface(w, h) {
  const canvas = createCanvas(w, h), ctx = canvas.getContext('2d');
  const ui = createCanvas(w, h), uctx = ui.getContext('2d');
  ctx.imageSmoothingEnabled = uctx.imageSmoothingEnabled = false;
  Object.assign(view, { canvas, ctx, ui, uctx, S: 1, W: w, H: h, pxW: w, pxH: h, zoom: 1 });
  return { canvas, ctx, ui, uctx, w, h };
}
function save(surface, name) { writeFileSync(`${root}/${name}.png`, surface.canvas.toBuffer('image/png')); }
Math.random = mulberry32(20261113);
input.mouse.x = input.mouse.y = -1;
for (const [w, h] of [[640, 420], [480, 270]]) {
  const s = surface(w, h), profile = defaultProfile();
  profile.heroes.push('eanasir');
  const before = JSON.stringify(profile);
  const app = { ui: new UI(), store: { profile }, settings: { diff: 'easy' }, choice: { hero: 'eanasir' }, scene: new MenuScene(), go() {} };
  const screen = new HeroScreen(); screen.enter(app);
  for (let i = 0; i < 45; i++) screen.draw(s.ctx, w, h, 1 / 60);
  save(s, `selection-${w}`);
  screen.infoScroll = 10000; screen.draw(s.ctx, w, h, 1 / 60); save(s, `selection-notes-${w}`);
  if (JSON.stringify(profile) !== before) throw Error('HeroScreen changed its in-memory profile');
}
if (process.argv.includes('--selection-only')) process.exit(0);

const s = surface(640, 420), p0 = defaultProfile();
const g = new Game({ hero: 'knight', mode: 's15', map: 'forest', diff: 'easy', meta: metaBonuses(p0), settings: { numbers: true, softFlash: true, weather: false }, crypts: false });
g.spawner.update = () => {}; g.weather = null; g.banners.length = 0;
g.enemies = []; g.pickups = []; g.effects = [];
const p = g.player;
p.addXp = () => {}; p.ultLocked = true;
const seed = Array.from({ length: 200 }, (_, i) => i).find(seed => cryptHasEaNasir(seed, p.id));
g.inCrypt = { key: 'review', hp: p.hp, minute: 0, depth: 1 };
new Dungeon(g, 1, seed, { name: 'The Copper Crypt', theme: 'crypt', lords: 2 });
const boss = g.enemies.find(e => e.type === 'eanasir');
if (!boss) throw Error('Seeded merchant crypt did not contain Ea-nasir');
for (const e of g.enemies) if (e !== boss) e.dead = true;
boss.sleeping = boss.dormant = false; boss.aware = true;
p.x = boss.x - 56; p.y = boss.y;
for (const id of ['axe', 'bow', 'daggers', 'fireball', 'miasma']) g.addWeapon(id);
g.maxWeapons = 6;
g.player.weapons.forEach((w, i) => { w.level = i + 1; w.recompute(); });
g.syncCam(); g.snapCam();
input.bot = { x: 0, y: 0 };
const seen = {}, phases = [], captured = new Set();
let prevAttack = '', sample = 0;
for (let f = 0; f < 60 * 44; f++) {
  // Keep the disposable observer alive to inspect all six curses, while keeping
  // the actual hurt/invulnerability and hit collision rules intact.
  p.hp = p.maxHp;
  g.update(1 / 60);
  if (g.state !== 'play') throw Error(`Encounter capture left play: ${g.state}`);
  const key = boss.state === 'wind' ? boss.data.attack : 'move';
  if (key !== prevAttack) phases.push({ time: g.clock, phase: key });
  prevAttack = key;
  (seen[key] ??= new Set()).add(boss.frameIndex());
  if (f % 3) continue;
  g.draw(s.ctx); s.uctx.clearRect(0, 0, s.w, s.h); g.hud.draw(s.uctx, s.w, s.h, g.clock, 1 / 20); s.ctx.drawImage(s.ui, 0, 0);
  if (f < 60 * 12) save(s, `encounter/${String(sample++).padStart(4, '0')}`);
  if (key !== 'move' && !captured.has(key) && boss.stateT < boss.data.wind * .4) {
    save(s, `boss-${key}`); captured.add(key);
  }
  if (g.eshots.some(shot => shot.kind === 'pqc') && !captured.has('projectile')) { save(s, 'boss-projectile'); captured.add('projectile'); }
  if (p.weapons.every(w => w.def.copper) && !captured.has('six')) { save(s, 'six-copper'); captured.add('six'); }
}
save(s, 'encounter-end');
const pause = new PauseOverlay({ game: g, app: { ui: new UI(), settings: g.settings, store: { profile: p0 } } });
pause.draw(s.ctx, s.w, s.h, 1 / 60); save(s, 'six-copper-build');
const icons = surface(7 * 80, 90);
icons.ctx.fillStyle = '#191d27'; icons.ctx.fillRect(0, 0, icons.w, icons.h);
for (const [i, id] of ['i_copper', 'i_copper_furnace', 'i_copper_crown', 'i_copper_return', 'i_copper_hail', 'i_copper_arc', 'i_copper_foundry'].entries()) icons.ctx.drawImage(SPR[id].frames[0].c, i * 80 + 8, 8, 64, 64);
save(icons, 'copper-icons');
writeFileSync(`${root}/encounter-coverage.json`, JSON.stringify({ seed, seconds: 44, frames: sample, seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]])), phases, copper: p.weapons.map(w => w.id), bossHp: boss.hp, damage: g.stats.damage, captured: [...captured] }, null, 2));
console.log(`Review saved: ${root}; copper ${p.weapons.map(w => w.id).join(', ')}`);
