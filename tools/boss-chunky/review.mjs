import { createRequire } from 'node:module';
import { deepStrictEqual } from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ART } from '../../public/js/art/defs.js';
import { ENEMIES } from '../../public/js/data/enemies.js';
import { reforgedBossDef } from '../../public/js/art/bosses-reforged.js';
import { bakedDef } from '../../public/js/art/baked.js';
import { buildSprites, buildSprite, SPR } from '../../public/js/engine/sprites.js';
import { view } from '../../public/js/engine/view.js';
import { input } from '../../public/js/engine/input.js';
import { mulberry32 } from '../../public/js/engine/util.js';
import { hexPack } from '../../public/js/engine/pixels.js';
import { Game } from '../../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../../public/js/shared/profile.js';
import { makeBossScene, BOSS_IDS } from '../hero-round2-review/boss-scene.js';
import { contract } from '../boss-polish/contracts.mjs';

const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
buildSprites();

const args = process.argv.slice(2);
const motion = args.includes('--motion');
const legs = args.includes('--legs');
const selected = args.filter(arg => arg !== '--motion' && arg !== '--legs');
if (legs && selected.some(id => id !== 'boneking')) throw Error('Only the Bone King has a legged style');
const ids = legs ? ['boneking'] : selected.length ? selected : BOSS_IDS;
if (ids.some(id => !BOSS_IDS.includes(id))) throw Error(`Choose a boss from ${BOSS_IDS.join(', ')}`);
const candidates = process.env.BOSS_CHUNKY_OUT || 'output/boss-chunky/candidates';
const baseline = process.env.BOSS_CHUNKY_BASELINE;
const dest = process.env.BOSS_CHUNKY_REVIEW || 'output/boss-chunky/review';
const maps = { pharaoh: 'desert', frostgiant: 'frozen', thornqueen: 'meadow', pitlord: 'hell', demonlord: 'hell' };
mkdirSync(dest, { recursive: true });

const scale = 3;
const world = createCanvas(1200, 600);
const ctx = world.getContext('2d');
const ui = createCanvas(world.width / scale, world.height / scale);
Object.assign(view, { canvas: world, ctx, ui, uctx: ui.getContext('2d'), S: scale, W: ui.width, H: ui.height, pxW: world.width, pxH: world.height, zoom: 1 });

const drawingId = id => id === 'boneking' ? 'boneking_floating' : id;
async function load(dir, id) {
  const drawing = resolve(dir, `${drawingId(id)}.js`);
  const filename = existsSync(drawing) ? drawing : resolve(dir, `${id}.js`);
  return (await import(pathToFileURL(filename))).default;
}
const definition = (id, data) => data.delta16 ? reforgedBossDef(data) : bakedDef(data, {
  outline: ART[id].outline, palette: ART[id].palette, glow: data.glow.map(col => hexPack(col)),
});

function sceneFor(id, sprite, legged = false) {
  const current = SPR[id];
  if (id !== 'boneking') SPR[id] = sprite;
  Math.random = mulberry32(7127);
  const scene = makeBossScene({ Game, defaultProfile, metaBonuses, input }, id, { map: maps[id] || 'forest' });
  SPR[id] = current;
  scene.g.settings.boneKingLegs = legged;
  if (id === 'boneking' && !legged) {
    const draw = scene.draw;
    scene.draw = ctx => {
      const previous = SPR.boneking_floating;
      SPR.boneking_floating = sprite;
      try { draw(ctx); } finally { SPR.boneking_floating = previous; }
    };
  }
  return scene;
}

function label(ctx, text, x, y, font = 'bold 17px Segoe UI', color = '#efe5d2') {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.fillText(text, x, y);
}

function visibleRect(frame, [x, y, w, h], flip) {
  const [left, top, right, bottom] = frame.box;
  const l = flip ? frame.w - right : left;
  const r = flip ? frame.w - left : right;
  return [x + l * w / frame.w, y + top * h / frame.h, x + r * w / frame.w, y + bottom * h / frame.h];
}

async function record(id, name, sprite, fileId) {
  const fps = 12;
  const zoom = 2;
  const canvas = createCanvas(460, 284);
  const movieCtx = canvas.getContext('2d');
  const originalView = { ...view };
  Object.assign(view, { canvas, ctx: movieCtx, S: zoom, W: canvas.width / zoom, H: canvas.height / zoom, pxW: canvas.width, pxH: canvas.height });
  const scene = sceneFor(id, sprite, legs);
  const file = join(dest, `${fileId}-motion.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo',
    '-pixel_format', 'rgba', '-video_size', `${canvas.width}x${canvas.height}`, '-framerate', String(fps),
    '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true });
  const finished = once(ffmpeg, 'close');
  // If either end closes early, surface the encoder failure even during a drain.
  finished.catch(() => {});
  const visited = new Set();
  const segments = [];
  try {
    for (const face of [1, -1]) {
      for (const action of scene.sequence) {
        scene.setAction(action);
        scene.setFace(face);
        const seen = new Set();
        for (let t = 0; t < 180; t++) {
          scene.tick(1 / 60);
          seen.add(scene.e.frameIndex());
          if (t % (60 / fps)) continue;
          const { g, e } = scene;
          const { cam, player } = g;
          // Keep the real draw, with the camera framed on the action for this recording.
          const gap = Math.max(-110, Math.min(110, player.x - e.x));
          const { x, y } = cam;
          cam.x = e.x + gap / 2 - cam.W / 2;
          cam.y = e.y - cam.H * .72;
          scene.draw(movieCtx);
          Object.assign(cam, { x, y });
          movieCtx.fillStyle = '#151922';
          movieCtx.fillRect(0, 0, canvas.width, 32);
          label(movieCtx, `${name}  ·  ${action}  ·  ${face > 0 ? 'right' : 'left'}`, 10, 21, 'bold 15px Segoe UI');
          if (!ffmpeg.stdin.write(canvas.data())) await once(ffmpeg.stdin, 'drain');
        }
        for (const frame of seen) visited.add(frame);
        segments.push({ action, face, poses: [...seen] });
      }
    }
    ffmpeg.stdin.end();
    const [status] = await finished;
    if (status !== 0) throw Error(`${id}: ffmpeg returned ${status}`);
    writeFileSync(join(dest, `${fileId}-motion.json`), JSON.stringify({ fps, framesVisited: [...visited], segments }, null, 2) + '\n');
  } finally {
    ffmpeg.stdin.destroy();
    Object.assign(view, originalView);
  }
}

for (const id of ids) {
  const fileId = legs ? 'boneking-legged' : id;
  const before = !legs && baseline ? buildSprite(id, definition(id, await load(baseline, id))) : SPR[drawingId(id)];
  const after = legs ? SPR.boneking_legs : buildSprite(id, definition(id, await load(candidates, id)));
  if (id !== 'boneking') {
    deepStrictEqual(contract(after), contract(before), `${id}: changed canvas, silhouette, positions or clocks`);
  }
  const stripe = 257;
  const tile = 330;
  const board = createCanvas(tile * 4, 2 * stripe + 74);
  const bc = board.getContext('2d');
  bc.imageSmoothingEnabled = false;
  bc.fillStyle = '#171b23';
  bc.fillRect(0, 0, board.width, board.height);
  const name = { boneking: 'Bone King', butcher: 'Butcher', lich: 'Lich', demonlord: 'Demon Lord', pharaoh: 'Pharaoh', frostgiant: 'Frost Giant', thornqueen: 'Thorn Queen', pitlord: 'Pit Lord' }[id];
  label(bc, name + ' · In-game comparison', 20, 31, 'bold 23px Segoe UI');
  const comparison = legs ? 'Floating above · Legged below' : 'Original above · Candidate below';
  label(bc, `${comparison} · Same camera zoom`, 20, 55, '15px Segoe UI', '#b7beca');

  for (const [row, sprite] of [before, after].entries()) {
    const scene = sceneFor(id, sprite, legs && row === 1);
    const attack = scene.sequence[2];
    const actions = [['idle', 12, 1, 'Idle'], ['travel', 49, -1, 'Travel · left'], [attack, 31, 1, `${attack} · windup`], [attack, 75, 1, `${attack} · release / recovery`]];
    for (const [column, [action, ticks, face, title]] of actions.entries()) {
      scene.setAction(action);
      scene.setFace(face);
      for (let t = 0; t < ticks; t++) scene.tick(1 / 60);
      scene.draw(ctx);
      const { e, g } = scene;
      const foe = visibleRect(sprite.frames[e.frameIndex()], e._rect, e._rect[4]);
      const hero = g.player._rect;
      const player = visibleRect(hero[4], hero, hero[5]);
      const left = column ? foe[0] : Math.min(foe[0], player[0]);
      const right = column ? foe[2] : Math.max(foe[2], player[2]);
      const x = (left + right) / 2;
      const y = (e.y - g.cam.y) * scale;
      const startX = Math.round(Math.max(0, Math.min(view.pxW - tile, x - tile / 2)));
      const startY = Math.round(Math.max(0, Math.min(view.pxH - stripe + 32, y - stripe + 66, foe[1] - 6)));
      const dy = 74 + row * stripe;
      bc.drawImage(world, startX, startY, tile - 2, stripe - 33, column * tile + 1, dy, tile - 2, stripe - 33);
      label(bc, title, column * tile + 9, dy + stripe - 12, '15px Segoe UI', row ? '#e7bd84' : '#bdc5ce');
    }
  }
  writeFileSync(join(dest, `${fileId}-game.png`), board.toBuffer('image/png'));

  const keys = Object.entries(after.poses || {}).filter(([, clip]) => clip.length > 1);
  const rows = keys.length || 1;
  const zoom = 2 * (ENEMIES[id].scale || 1) / after.hires;
  const columnWidth = Math.max(152, Math.ceil(zoom * Math.max(...after.frames.map(f => f.box[2] - f.box[0]))) + 12);
  const rowHeight = Math.max(164, Math.ceil(zoom * Math.max(...after.frames.map(f => f.box[3] - f.box[1]))) + 44);
  const contact = createCanvas(columnWidth * 6, rows * rowHeight);
  const cc = contact.getContext('2d');
  cc.imageSmoothingEnabled = false;
  cc.fillStyle = '#26313a';
  cc.fillRect(0, 0, contact.width, contact.height);
  for (const [row, [pose, sequence]] of (keys.length ? keys : [['rest', after.idle || [0]]]).entries()) {
    label(cc, pose, 16, row * rowHeight + 23, 'bold 16px Segoe UI');
    for (let i = 0; i < 6; i++) {
      const index = sequence[Math.round(i * (sequence.length - 1) / 5)];
      const frame = after.frames[index];
      const [left, top, right, bottom] = frame.box;
      const w = (right - left) * zoom;
      const h = (bottom - top) * zoom;
      const center = (i + .5) * columnWidth;
      const end = (row + 1) * rowHeight;
      cc.drawImage(frame.c, left, top, right - left, bottom - top, Math.round(center - w / 2), end - 17 - h, w, h);
      label(cc, `${index}`, center - 8, end - 6, '12px Segoe UI', '#b7beca');
    }
  }
  writeFileSync(join(dest, `${fileId}-poses.png`), contact.toBuffer('image/png'));
  if (motion) await record(id, legs ? `${name} (legged)` : name, after, fileId);
  console.log(`${id}: ${after.frames.length} poses, ${dest}`);
}
