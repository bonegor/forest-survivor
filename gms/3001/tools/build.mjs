// Builds sprite proposals written as code into the Sprite Lab. A module (by convention under
// gms/3001/sprites/lab/src/) exports by default a list of proposals:
//   { cls: 'knight' | 'archer' | 'mage' | 'rogue' | 'necromancer'  (a hero's class)
//     or role: '<an ENEMIES id>'                                   (a monster's part),
//     id: 'remaster-v1', name, description, collection, def }
// def is a sprite definition as the game's buildSprite takes it: frames as palette rows, or
// gen() returning pixel buffers ({ w, h, d: Uint32Array }), every frame the same size, facing
// right, with idle, walk and attack (frame lists), motionRate, idleRate, attackFps, anchorY
// (the ground line under the feet), selfBob, outline (false: drawn with its own outline), and
// emissive (the palette keys, as in public/js/art/palette.js, of what glows unlit in the dark).
// Each is built with the game's own sprite code into sprites/lab/sheets/<part>-<id>.png, its
// entry put in sprites/lab/catalog.json (replacing one with the same part and id), and
// measured (tools/measure.mjs).
//   node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v1/knight.js [more.js ...]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { measure, verdict } from './measure.mjs';

const LAB = fileURLToPath(new URL('../sprites/lab/', import.meta.url));
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const mod = (f) => import(pathToFileURL(join(ROOT, f)).href);
await mod('tools/headless.mjs');
const { buildSprite } = await mod('public/js/engine/sprites.js');
const { makeBuf, blit, keepColors, flipX, hexPack } = await mod('public/js/engine/pixels.js');
const { packedPalette } = await mod('public/js/art/palette.js');
const PAL = packedPalette();
const { HEROES } = await mod('public/js/data/heroes.js');
const { ENEMIES } = await mod('public/js/data/enemies.js');
const { writePng } = await mod('tools/png.mjs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('node gms/3001/tools/build.mjs <proposal module.js> [...]');
  process.exit(1);
}
const catalog = JSON.parse(readFileSync(join(LAB, 'catalog.json'), 'utf8'));
let failed = 0;
for (const file of files) {
  const path = resolve(file);
  const list = (await import(pathToFileURL(path).href + '?t=' + Date.now())).default;
  for (const p of Array.isArray(list) ? list : [list]) {
    const part = p.cls || p.role, label = `${part}/${p.id}`;
    try {
      if (p.cls ? !HEROES[p.cls] : !ENEMIES[p.role]) throw new Error(`no ${p.cls ? 'hero class' : 'monster part'} "${part}"`);
      if (!/^[a-z0-9-]{2,60}$/.test(p.id || '')) throw new Error('id: lower-case letters, digits and dashes');
      if (!p.name || !p.def) throw new Error('needs a name and a def');
      const spr = buildSprite(`build_${part}_${p.id}`, p.def);
      const { w, h } = spr.frames[0];
      const odd = spr.frames.findIndex((f) => f.w !== w || f.h !== h);
      if (odd >= 0) throw new Error(`frame ${odd} is ${spr.frames[odd].w}x${spr.frames[odd].h}, frame 0 is ${w}x${h}: every frame must be the same size`);
      for (const k of ['idle', 'walk', 'attack']) {
        const bad = (spr[k] || []).find((i) => !Number.isInteger(i) || i < 0 || i >= spr.frames.length);
        if (bad !== undefined) throw new Error(`${k} lists frame ${bad}, but there are ${spr.frames.length}`);
      }
      // What glows in the dark (def.emissive: palette keys, as the game's sprites have it) gets two
      // more rows, the glow facing right and facing left, which the lab draws unlit as the game does.
      // ...or p.glow: the glowing colours as '#rrggbb', for art drawn in colours of its own.
      const glow = p.def.emissive ? new Set([...p.def.emissive].map((ch) => PAL[ch]).filter((c) => c !== undefined))
        : p.glow && p.glow.length ? new Set(p.glow.map((hex) => hexPack(hex))) : null;
      const rows = glow ? ['right', 'glow', 'glowLeft'] : ['right'];
      const sheet = makeBuf(w * spr.frames.length, h * rows.length);
      spr.frames.forEach((f, i) => {
        blit(sheet, f.buf, i * w, 0);
        if (!glow) return;
        const g = keepColors(f.buf, glow);
        blit(sheet, g, i * w, h);
        blit(sheet, flipX(g), i * w, 2 * h);
      });
      const file = `sheets/${part}-${p.id}.png`;
      mkdirSync(join(LAB, 'sheets'), { recursive: true });
      writePng(join(LAB, file), sheet);
      const n = spr.frames.length;
      const base = {
        kind: 'proposal', id: p.id, name: p.name, description: p.description || '', creator: null, source: null, licence: 'made for Forest Survivor', colour: null,
        w, h, frames: n, collection: p.collection || 'Made for the game', origin: relative(ROOT, path).split('\\').join('/'), made: new Date().toISOString(),
      };
      const entry = p.cls
        ? {
            cls: p.cls, ...base,
            walk: spr.walk || [0], idle: spr.idle || [0], attack: spr.attack && spr.attack.length ? spr.attack : null, attackFps: spr.attackFps || 0,
            // A ranger's bow: the attack frame the arrow leaves on, and its shots on the move
            // (attackWalk[attack frame][walk step]), as public/js/game/ranger-animation.js plays them.
            attackRelease: spr.attackRelease ?? null, attackWalk: spr.attackWalk || null,
            walkFps: null, idleFps: null, motionRate: spr.motionRate || 1, idleRate: spr.idleRate ?? 4, anchorY: spr.anchorY, selfBob: !!spr.selfBob,
            floating: !!p.def.floating, fitW: spr.fitW || w, fitH: spr.fitH || h, outline: false, sheet: file,
            ...(glow ? { rows, emissive: p.def.emissive || null, ...(p.glow && p.glow.length ? { glow: p.glow } : {}) } : {}),
          }
        : { as: 'monster', role: p.role, ...base, walk: null, idle: null, attack: null, animFps: p.def.animFps || null, anchorY: h - 1, fitW: w, fitH: h, outline: false, sheet: file };
      const at = catalog.entries.findIndex((e) => (e.cls || e.role) === part && e.id === p.id);
      if (at >= 0) catalog.entries[at] = entry;
      else catalog.entries.push(entry);
      const v = verdict(measure(spr));
      console.log(`${at >= 0 ? 'rebuilt' : 'built'} lab:${label}  ${p.name}\n  ${v.line}${v.notes.length ? '\n  ! ' + v.notes.join('\n  ! ') : '\n  lines up cleanly'}`);
    } catch (e) {
      failed++;
      console.error(`could not build lab:${label}: ${e.message}`);
    }
  }
}
writeFileSync(join(LAB, 'catalog.json'), JSON.stringify(catalog, null, 1));
process.exit(failed ? 1 : 0);
