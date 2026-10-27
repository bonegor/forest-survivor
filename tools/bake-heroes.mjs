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

// What ships, by the game's sprite name: the pick in the lab (role/id). The user's picks of
// 27 October 2026, all in the plumed Knight's style and drawn with claude-pxl, except the Shadow,
// who stays the Eclipse Wraith (tweaked in the lab). The Knight is his plumed self (knight-plumed.js).
const BAKE = {
  archer: 'archer/knightstyle-b',
  // Style A with his head turned a little toward us, both eyes showing.
  mage: 'mage/knightstyle-a2',
  necromancer: 'necromancer/knightstyle-a',
  rogue: 'rogue/eclipse-wraith-tweak-1',
  // Her two looks to pick from: Style B with a barrel helm (C), Style A with a squared hood (D),
  // each head made cylindrical and set off the shoulders.
  // These four heroes' heads, as the Sorcerer's, turned a little toward us so both eyes show (the
  // owner's, 27 October 2026: "both eyes are visible like in case of ranger, necromancer").
  paladin: 'paladin/knightstyle-c2',
  paladin_d: 'paladin/knightstyle-d2',
  druid: 'druid/knightstyle-a2',
  berserker: 'berserker/knightstyle-a2',
  witchhunter: 'witchhunter/knightstyle-a2',
  // Kept in the lab for villains, not baked: rogue/knightstyle-b (the Wraith) and
  // necromancer/knightstyle-b (the Grave lord).
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
