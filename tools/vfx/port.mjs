// Ports one of Sprite Fusion's pixel-art effects (https://www.spritefusion.com/pixel-art-vfx, MIT,
// Copyright (c) 2026 Hugo Duprez) from the TypeScript the site hands out to the plain JS that
// tools/vfx/bake.mjs runs, the same way every time, so that a later version of theirs is ported
// again by running this, not by hand (28 October 2026):
//   node tools/vfx/port.mjs <downloaded effect.ts> <name>     one effect into tools/vfx/src/<name>.mjs
//   node tools/vfx/port.mjs --all <folder>                     every pick, from <folder>/<name>/x/<name>.ts
// A download is untrusted: it is never run. Node's type stripping only parses it, and a source that
// reaches for anything outside its own maths (a module, the network, the page, eval) is refused.
// Then the blanks the types leave are closed up (outside quotes; their strings are only colours
// and labels), line 1 is our plain credit (ATTRIBUTION) in place of theirs, line 4 says what this
// is, and our few edits (PATCHES, each marked FS in the port)
// go in, every one where it must be found exactly once. Lines keep their numbers: a port reads
// line for line against its download. A download that is not the one these patches were written
// for (PINS, sha256) is ported with a warning: look its changes over before baking it.
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// The first 16 hex of the sha256 of each download the ports were made from (28 October 2026).
export const PINS = {
  slash: '2d6a996732290c3d', 'holy-light': '97606dabe032ec16', lightning: 'd85dcfabde73c72c', explosion: 'e8b869ff86db6b0b',
  impact: 'd0e1de09d983946a', sparkle: '47e5a146b44cd91d', ice: '1a58e6dcc251fa4a', energy: '03f1222c41f045b8',
};

const FORBIDDEN = /\b(import|require|fetch|eval|Function\s*\(|globalThis|window|document|process|XMLHttpRequest|WebSocket|Worker|setTimeout|setInterval)\b/;

// Line 1 of a download is a comment theirs to say anything in; as handed out (28 October 2026) it
// told AI agents reading the code to connect to the site's MCP server. Not ours to pass on in a
// public repo that agents read: a plain credit takes its place (the MIT notice, lines 2-3, stays).
export const ATTRIBUTION = '// Sprite Fusion pixel-art VFX (https://www.spritefusion.com/pixel-art-vfx), by Hugo Duprez.';

// Our edits, by effect. Every one keeps upstream's behaviour when its option is not given, and
// stays on its line. The unit (all of them): their art pixel is PX "screen" units (2); the bake
// sets it per effect (tools/vfx/picks.mjs px), so motion and placement shrink while shapes drawn
// in art pixels keep their size.
const UNIT = ['let PX = 2; export const setUnit = (v) => (PX = v); /* FS: the bake sets the unit */'];
const PATCHES = {
  slash: [['const PX = 2;', UNIT[0]]],
  impact: [['const PX = 2;', UNIT[0]]],
  sparkle: [['const PX = 2;', UNIT[0]]],
  lightning: [
    ['const PX = 2;', UNIT[0]],
    // smoke: false, no smoke puffs round an impact (ours is a night strike, not a field battle).
    ['for (let i = 0; i < 5; i++) ps.spawn(K.SMOKE, X + R.range(-14, 14) * S,', 'if (o.smoke !== false) /* FS */ for (let i = 0; i < 5; i++) ps.spawn(K.SMOKE, X + R.range(-14, 14) * S,'],
  ],
  'holy-light': [
    ['const PX = 2;', UNIT[0]],
    // stars (50): the sparks the slam throws; spread (1): how fast they fly.
    ['for (let i = 0; i < 50; i++) {', 'for (let i = 0; i < (o.stars ?? 50); i++) { /* FS */'],
    ['const s = R.sign(), sp = R.range(120, 520);', 'const s = R.sign(), sp = R.range(120, 520) * (o.spread ?? 1); /* FS */'],
    ['Y - 4, s * sp, -R.range(40, 260),', 'Y - 4, s * sp, -R.range(40, 260) * (o.spread ?? 1) /* FS */,'],
    // feathers (8): the feathers drifting down (none for a smite).
    ['for (let i = 0; i < 8; i++) {', 'for (let i = 0; i < (o.feathers ?? 8); i++) { /* FS */'],
    // glowR (1): the width of the glow on the ground; ringR (104): the ring's, at its widest.
    ['const rx = 10 + (t < SLAM ? 14 * t : 34 + 4 * Math.sin(t * 5)),', 'const rx = (10 + (t < SLAM ? 14 * t : 34 + 4 * Math.sin(t * 5))) * (o.glowR ?? 1) /* FS */,'],
    ['ringE(buf, cx, cy, 14 + 90 * e * sc, 3 + 13 * e * sc,', 'ringE(buf, cx, cy, (14 + 90 * e * sc) * ((o.ringR ?? 104) / 104), (3 + 13 * e * sc) * ((o.ringR ?? 104) / 104) /* FS */,'],
  ],
  explosion: [
    ['const PX = 2;', UNIT[0]],
    // ramp (9) and smokeRamp (5): the fire and the smoke in other colours (ours); floor (true):
    // the shock ring along the ground line, which a top-down blast doesn't have; dust (below).
    ['export default function explosion(o = {}) {', 'export default function explosion(o = {}) { useRamps(o.ramp, o.smokeRamp); /* FS */'],
    // dust (1): the smoke rolling out along the ground line both ways, side-on: from above, a
    // flat grey band cut off at the sprite's edges, so a top-down crash rolls none (0).
    ['for (let i = 0; i < Math.round(RAD * 0.5); i++) {', 'for (let i = 0; i < Math.round(RAD * 0.5 * (o.dust ?? 1)); i++) { /* FS */'],
    ['floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, true);', 'if (o.floor !== false) /* FS */ floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, true);'],
    ['floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, false);', 'if (o.floor !== false) /* FS */ floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, false);'],
    ['const PAL = { hot:', 'let /* FS */ PAL = { hot:'],
    ['const FIRE_RAMP = [', 'let /* FS */ FIRE_RAMP = ['],
    ['const HEAT_RAMP = [', 'let /* FS */ HEAT_RAMP = ['],
    ['const SMOKE_RAMP = [hex(', 'let /* FS */ SMOKE_RAMP = [hex('],
    [null, [
      '// FS: the fire ramp (9, white first) and the smoke ramp (5) of a blast, upstream\'s unless given.',
      'const UPSTREAM = { PAL, FIRE_RAMP, HEAT_RAMP, SMOKE_RAMP };',
      'function useRamps(fire, smoke) {',
      '  FIRE_RAMP = fire ?? UPSTREAM.FIRE_RAMP;',
      '  HEAT_RAMP = fire ? [...fire, fire[fire.length - 1]] : UPSTREAM.HEAT_RAMP;',
      '  PAL = fire ? { hot: fire[1], yellow: fire[2], gold: fire[3], orange: fire[4], deepOrange: fire[5], red: fire[6] } : UPSTREAM.PAL;',
      '  SMOKE_RAMP = smoke ?? UPSTREAM.SMOKE_RAMP;',
      '}',
    ]],
  ],
  ice: [
    ['const PX = 2, TAU = Math.PI * 2,', 'let PX = 2; export const setUnit = (v) => (PX = v); /* FS: the bake sets the unit */ const TAU = Math.PI * 2,'],
    // burst (0.36): how soon after the crack a shattering block bursts.
    ['BURST = CRACK + 0.36,', 'BURST = CRACK + (o.burst ?? 0.36) /* FS */,'],
    // rise (true): the block grows up out of the ground; false, it stands whole from the start
    // (a frozen foe's body, in its place).
    ['const rise = outBack(t / 0.25, 1.6),', 'const rise = o.rise === false ? 1 /* FS */ : outBack(t / 0.25, 1.6),'],
  ],
  energy: [
    ['const PX = 2;', UNIT[0]],
    // motes (70): the spray a release throws; ringScale (1): how far its rings and light reach.
    ['for (let i = 0; i < 70; i++) {', 'for (let i = 0; i < (o.motes ?? 70); i++) { /* FS */'],
    ['buf.ring(ox, oy, 4 + 80 * e,', 'buf.ring(ox, oy, 4 + 80 * e * (o.ringScale ?? 1) /* FS */,'],
    ['buf.ring(ox, oy, 2 + 44 * outCubic(q * 1.4),', 'buf.ring(ox, oy, 2 + 44 * outCubic(q * 1.4) * (o.ringScale ?? 1) /* FS */,'],
    ['light.glow(ox, oy, 130 * (0.4 + 0.6 * e),', 'light.glow(ox, oy, 130 * (0.4 + 0.6 * e) * (o.ringScale ?? 1) /* FS */,'],
  ],
};

// Closes up the blanks type stripping leaves, outside quotes and comments: a run of spaces inside
// a line becomes one, and a space left before , ; ) ] goes (it held a type or a `!`). Leading
// indentation and line breaks stay.
export function closeUp(src) {
  return src.split('\n').map((line) => {
    const lead = /^\s*/.exec(line)[0];
    let out = '', q = '', i = lead.length;
    for (; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        out += ch;
        if (ch === '\\') out += line[++i] ?? '';
        else if (ch === q) q = '';
        continue;
      }
      if (ch === '/' && line[i + 1] === '/') {
        out += line.slice(i);
        break;
      }
      if (ch === '"' || ch === "'" || ch === '`') q = ch;
      if (ch === ' ' && (out.endsWith(' ') || out === '')) continue;
      if (',;)]'.includes(ch) && out.endsWith(' ')) out = out.slice(0, -1);
      out += ch;
    }
    out = out.trimEnd();
    return out ? lead + out : '';
  }).join('\n');
}

export function port(src, name) {
  const pin = createHash('sha256').update(src).digest('hex').slice(0, 16);
  if (FORBIDDEN.test(src)) throw new Error(`${name}: reaches outside its own maths (${FORBIDDEN.exec(src)[0]}); refused`);
  const lines = closeUp(stripTypeScriptTypes(src, { mode: 'strip' })).split('\n');
  if (!/^\/\/ MIT License/.test(lines[1]) || !/^\/\/ Copyright \(c\) 2026 Hugo Duprez/.test(lines[2])) throw new Error(`${name}: lines 2-3 are not the MIT notice`);
  if (!/^\/\//.test(lines[0])) throw new Error(`${name}: line 1 is not a comment, for our credit`);
  if (lines[3].trim()) throw new Error(`${name}: line 4 is not free for our note`);
  lines[0] = ATTRIBUTION;
  lines[3] = '// Forest Survivor (28 October 2026): ported to plain JS for tools/vfx/bake.mjs; our edits marked "FS".';
  let js = lines.join('\n');
  for (const [from, to] of PATCHES[name] || [['const PX = 2;', UNIT[0]]]) {
    if (from === null) {
      js = js.trimEnd() + '\n' + to.join('\n') + '\n';
      continue;
    }
    const n = js.split(from).length - 1;
    if (n !== 1) throw new Error(`${name}: FS patch found ${n} times, not once: ${from}`);
    js = js.replace(from, () => to);
  }
  return { js: js.trimEnd() + '\n', pin, pinned: PINS[name] === pin };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const jobs = args[0] === '--all'
    ? Object.keys(PINS).map((name) => [join(args[1], name, 'x', `${name}.ts`), name])
    : [[args[0], args[1]]];
  if (!jobs.length || jobs.some(([f, n]) => !f || !n)) {
    console.log('node tools/vfx/port.mjs <effect.ts> <name>  |  --all <folder>');
    process.exit(1);
  }
  mkdirSync(join(HERE, 'src'), { recursive: true });
  for (const [file, name] of jobs) {
    const { js, pin, pinned } = port(readFileSync(file, 'utf8'), name);
    writeFileSync(join(HERE, 'src', `${name}.mjs`), js);
    console.log(`${name.padEnd(11)} ${pin} ${pinned ? 'as pinned' : `NOT the pinned download (${PINS[name] || 'no pin'}): look its changes over`}`);
  }
}
