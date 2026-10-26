// Bakes heroes picked in the Sprite Lab (gms/3001) into the game: each picked sheet, frames
// left to right in the game's pixels, packed as palette indices into a module under
// public/assets/heroes that public/js/art/hero-sheets.js plays. The frames ship exactly as
// picked; the animation lists and rates come from the lab's catalogue (or, for a version saved
// from its colour bar, the private assets checkout's versions.json beside this repo).
//
//   node tools/bake-heroes.mjs            (needs ../forest-survivor-assets, or LAB_ASSETS)
//
// Only art made for the game goes in: the bake refuses any sheet whose licence says otherwise.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './png.mjs';
import { PAL } from '../public/js/art/palette.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lab = join(root, 'gms/3001/sprites/lab');
const assets = resolve(process.env.LAB_ASSETS || join(root, '../forest-survivor-assets'));

// What ships, by the game's sprite name: the pick in the lab (role/id). The picks of 15 October
// were tuned on the hero review page and animated in the lab (src/animated-oct15): each is already
// in the colours the user saved there.
const BAKE = {
  archer: 'archer/silverleaf-picked',
  mage: 'mage/grand-archmage-picked',
  necromancer: 'necromancer/soulflame-picked',
  rogue: 'rogue/eclipse-wraith-tweak-1',
  // The four of 20 October 2026, drawn in the lab (src/newheroes-oct20).
  paladin: 'paladin/v1',
  druid: 'druid/v1',
  berserker: 'berserker/v1',
  witchhunter: 'witchhunter/v1',
  // The Knight's second look, drawn with claude-pxl (src/knight-b), a skin chosen on the hero screen.
  knight_b: 'knight/b',
  // Five more of 22 October 2026, each drawn with claude-pxl by its own artist and reviewer subagent.
  knight_c: 'knight/c',
  knight_d: 'knight/d',
  knight_e: 'knight/e',
  knight_f: 'knight/f',
  knight_g: 'knight/g',
  // The Ranger's two looks in the plumed Knight's style (26 October 2026): A drawn in code, B with claude-pxl.
  archer_b: 'archer/knightstyle-a',
  archer_c: 'archer/knightstyle-b',
  // Three more from B: hooded, a bit more Pokémon-like, and both (its C, D and E).
  archer_d: 'archer/knightstyle-c',
  archer_e: 'archer/knightstyle-d',
  archer_f: 'archer/knightstyle-e',
  // Round 3 (26 October 2026): two reworks of C, the user's favourite (its F and G), and two looks for
  // every other hero in the plumed Knight's style, each drawn by its own artist with claude-pxl.
  archer_g: 'archer/knightstyle-f',
  archer_h: 'archer/knightstyle-g',
  mage_b: 'mage/knightstyle-a',
  mage_c: 'mage/knightstyle-b',
  rogue_b: 'rogue/knightstyle-a',
  rogue_c: 'rogue/knightstyle-b',
  necromancer_b: 'necromancer/knightstyle-a',
  necromancer_c: 'necromancer/knightstyle-b',
  paladin_b: 'paladin/knightstyle-a',
  paladin_c: 'paladin/knightstyle-b',
  druid_b: 'druid/knightstyle-a',
  druid_c: 'druid/knightstyle-b',
  berserker_b: 'berserker/knightstyle-a',
  berserker_c: 'berserker/knightstyle-b',
  witchhunter_b: 'witchhunter/knightstyle-a',
  witchhunter_c: 'witchhunter/knightstyle-b',
};
const OURS = new Set(['made for Forest Survivor', "the game's own"]);

const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const packHex = (h) => (parseInt(h.slice(1, 3), 16) | (parseInt(h.slice(3, 5), 16) << 8) | (parseInt(h.slice(5, 7), 16) << 16) | (255 << 24)) >>> 0;
const catalog = readJson(join(lab, 'catalog.json')).entries;
const versions = [lab, join(assets, 'sprites/lab')].flatMap((d) => (existsSync(join(d, 'versions.json')) ? readJson(join(d, 'versions.json')).entries.map((e) => ({ ...e, dir: d })) : []));

function entryFor(pick) {
  const [role, id] = pick.split('/');
  const e = catalog.find((c) => c.cls === role && c.id === id);
  if (e) return { ...e, dir: lab, by: e.creator || e.licence };
  const v = versions.find((c) => c.role === role && c.id === id);
  if (v) return v;
  throw new Error(`${pick}: not in the lab's catalogue or versions`);
}

const out = join(root, 'public/assets/heroes');
mkdirSync(out, { recursive: true });
for (const [name, pick] of Object.entries(BAKE)) {
  const e = entryFor(pick);
  if (!OURS.has(e.licence)) throw new Error(`${pick}: licence "${e.licence}" is not the game's to publish`);
  // The first row faces right; any others are its glow, which the game makes itself from the
  // glowing colours (entry.glow).
  const rows = e.rows || ['right'];
  if (rows[0] !== 'right' || rows.slice(1).some((r) => !r.startsWith('glow'))) throw new Error(`${pick}: rows ${rows}: only a sheet facing right (and its glow) is baked`);
  const file = join(e.dir, e.sheet);
  const png = readPng(file);
  if (png.w < e.w * e.frames || png.h < e.h) throw new Error(`${pick}: ${e.sheet} is ${png.w}x${png.h}, too small for ${e.frames} frames of ${e.w}x${e.h}`);
  // Index 0 is clear; every other colour as it is in the sheet.
  const palette = [0], index = new Map([[0, 0]]);
  const frames = [];
  for (let k = 0; k < e.frames; k++) {
    const px = [];
    for (let y = 0; y < e.h; y++) {
      for (let x = 0; x < e.w; x++) {
        let c = png.d[y * png.w + k * e.w + x] >>> 0;
        if (c >>> 24 === 0) c = 0;
        if (!index.has(c)) {
          index.set(c, palette.length);
          palette.push(c);
        }
        px.push(index.get(c));
      }
    }
    frames.push(px);
  }
  // What glows unlit at night, as the colours themselves (packed as the palette is). A sheet
  // built in the lab says what glows as palette keys (emissive): their colours in palette.js,
  // then, and each must be one the sheet has (else its own palette gave that key another).
  const glow = e.glow && e.glow.length ? e.glow.map(packHex) : e.emissive ? [...e.emissive].map((k) => PAL[k] && packHex(PAL[k])) : [];
  if (glow.some((c) => !index.has(c))) throw new Error(`${pick}: a glow colour (${e.glow || e.emissive}) is not in its sheet`);
  const indexBytes = palette.length > 256 ? 2 : 1;
  const encoded = frames.map((px) => Buffer.from(indexBytes === 2 ? px.flatMap((i) => [i & 255, i >> 8]) : px).toString('base64'));
  const data = {
    pick: `lab:${pick}`, name: e.name, w: e.w, h: e.h, anchorY: e.anchorY ?? e.h - 1,
    idle: e.idle, walk: e.walk, attack: e.attack && e.attack.length ? e.attack : null, attackFps: e.attackFps || 0,
    motionRate: e.motionRate || 1, idleRate: e.idleRate ?? 4, selfBob: !!e.selfBob, fitW: e.fitW || e.w, fitH: e.fitH || e.h,
    // A ranger's bow: the frame the arrow leaves on, and her shots on the move.
    ...(e.attackRelease !== null && e.attackRelease !== undefined ? { attackRelease: e.attackRelease, attackWalk: e.attackWalk } : {}),
    ...(glow.length ? { glow } : {}),
    indexBytes, palette, frames: encoded,
  };
  const head = `// ${e.name}, picked in the Sprite Lab (lab:${pick}); ${e.licence}.\n// Baked by tools/bake-heroes.mjs from its sheet: ${data.frames.length} frames of ${e.w}x${e.h}, ${palette.length - 1} colours.\n`;
  writeFileSync(join(out, `${name}.js`), `${head}export default ${JSON.stringify(data)};\n`);
  console.log(`${name}: ${e.name} (${pick}), ${data.frames.length} frames, ${palette.length - 1} colours`);
}
