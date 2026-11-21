import { bounds, flipX } from '../engine/pixels.js';
import {
  SOUL_RELEASE, appendDecay, blank, departingSoul, easeBetween, fallFrameAt, mix, paint, sinkingSoul, turn,
} from './hero-fall.js';
import { recruitPoses } from './recruit-fall-poses.js';

const clamp = (value, lo, hi) => Math.max(lo, Math.min(value, hi));
const difference = (a, b) => [a[0] - b[0], a[1] - b[1]];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function scanlines(keys) {
  const lines = new Map();
  for (let i = 1; i < keys.length; i++) {
    const [y0, l0, r0] = keys[i - 1], [y1, l1, r1] = keys[i];
    for (let y = y0; y <= y1; y++) {
      const f = (y - y0) / (y1 - y0);
      lines.set(y, [Math.round(mix(l0, l1, f)), Math.round(mix(r0, r1, f))]);
    }
  }
  return lines;
}

function contains(lines, x, y) {
  const row = lines?.get(y);
  return row && x >= row[0] && x <= row[1];
}

function trim(full) {
  const b = bounds(full);
  if (!b) return null;
  const buf = blank(b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
  for (let y = 0; y < buf.h; ++y) {
    const i = (b.y0 + y) * full.w + b.x0;
    buf.d.set(full.d.subarray(i, i + buf.w), y * buf.w);
  }
  return { x: b.x0, y: b.y0, buf };
}

function stamp(out, part, sourcePivot, destPivot, angle = 0, height = 1, width = 1) {
  if (part) paint(out, part.buf, [sourcePivot[0] - part.x, sourcePivot[1] - part.y], destPivot, angle, height, width);
}

// Measure from the pivot to the lowest painted pixel after rotation.
function lowest(part, sourcePivot, angle) {
  const a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  let limit = -Infinity;
  for (let y = 0; y < part.buf.h; ++y) for (let x = 0; x < part.buf.w; ++x) {
    if (part.buf.d[y * part.buf.w + x] >>> 24 < 40) continue;
    limit = Math.max(limit, (part.x + x - sourcePivot[0]) * s + (part.y + y - sourcePivot[1]) * c);
  }
  return limit;
}

function state(rig, seconds) {
  const keys = rig.motion;
  const next = keys.findIndex(k => k[0] >= seconds);
  if (next < 0) return keys.at(-1);
  if (!next) return keys[0];
  const before = keys[next - 1], after = keys[next];
  const f = (seconds - before[0]) / (after[0] - before[0]);
  return before.map((n, i) => mix(n, after[i], f));
}

function separate(standing, rig) {
  const { w, h } = standing, gear = rig.gear.map(g => ({ ...g, lines: scanlines(g.rows), raw: blank(w, h) }));
  const arm = scanlines(rig.arm), flame = rig.flame && scanlines(rig.flame);
  const names = ['head', 'coat', 'arm', 'train', 'flame', 'rearThigh', 'rearShin', 'rearFoot', 'foreThigh', 'foreShin', 'foreFoot'];
  const layers = Object.fromEntries(names.map(n => [n, blank(w, h)]));
  const body = new Uint32Array(standing.d);
  for (const g of gear) for (const [y, [left, right]] of g.lines) {
    const hide = g.gripRows && y >= g.gripRows[0] && y <= g.gripRows[1];
    for (let x = left; x <= right; x++) {
      const i = y * w + x;
      if (hide) {
        // Continue the edge and wood through the few pixels covered by the fingers.
        const srcY = g.gripRows[1] + 1, src = g.lines.get(srcY);
        if (src) {
          const u = right === left ? 0 : (x - left) / (right - left);
          g.raw.d[i] = standing.d[srcY * w + Math.round(mix(src[0], src[1], u))];
        }
      } else {
        g.raw.d[i] = body[i];
        body[i] = 0;
      }
    }
  }
  const sample = (x, y) => body[y * w + x];
  const [hx, hy] = rig.hip;
  // Fill only the interior seams where a worn sword passed across the belt or
  // thigh. Both neighbours must be painted; silhouettes and leg gaps stay open.
  for (let y = hy - 7; y <= hy + 6; y++) for (let x = hx - 6; x <= hx + 5; x++) {
    const i = y * w + x;
    if (body[i] || !gear.some(g => contains(g.lines, x, y))) continue;
    let up = 0, down = 0;
    for (let k = 1; k <= 5; k++) {
      up ||= sample(x, y - k);
      down ||= sample(x, y + k);
    }
    if (up >>> 24 > 80 && down >>> 24 > 80) body[i] = y <= hy ? up : down;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, pixel = body[i];
    if (pixel >>> 24 < 18 || pixel === 0xffff00ff) continue;
    let id;
    if (contains(flame, x, y)) id = 'flame';
    else if (contains(arm, x, y)) id = 'arm';
    else if (y <= rig.neck[1] && x >= rig.headSpan[0] && x <= rig.headSpan[1]) id = 'head';
    else if (y <= hy) id = 'coat';
    else if (rig.spectral || x < rig.legs[0][0] - 3) id = 'train';
    else {
      const side = x < hx ? 0 : 1, [, ky, , ay] = rig.legs[side];
      id = (side ? 'fore' : 'rear') + (y <= ky ? 'Thigh' : y < ay - 1 ? 'Shin' : 'Foot');
    }
    layers[id].d[i] = pixel;
    // One or two overlapping rows join adjacent pieces at the jaw, belt,
    // knees and instep even after the source pixels turn to different angles.
    if (id === 'head' && y >= rig.neck[1] - 1) layers.coat.d[i] = pixel;
    if (id === 'arm' && distance([x, y], rig.shoulder) < 3) layers.coat.d[i] = pixel;
    if (y === hy || y === hy + 1) {
      layers.coat.d[i] = pixel;
      if (!rig.spectral) layers[x < hx ? 'rearThigh' : 'foreThigh'].d[i] = pixel;
    }
    if (!rig.spectral && y > hy && x >= rig.legs[0][0] - 3) {
      const side = x < hx ? 0 : 1, prefix = side ? 'fore' : 'rear', [, ky, , ay] = rig.legs[side];
      if (y === ky || y === ky + 1) {
        layers[prefix + 'Thigh'].d[i] = pixel;
        layers[prefix + 'Shin'].d[i] = pixel;
      }
      if (y === ay - 2 || y === ay - 1) {
        layers[prefix + 'Shin'].d[i] = pixel;
        layers[prefix + 'Foot'].d[i] = pixel;
      }
    }
  }
  const pieces = Object.fromEntries(names.map(n => [n, trim(layers[n])]));
  pieces.gear = gear.map(({ raw, lines, ...g }) => {
    const part = trim(raw);
    return { ...g, part, center: [part.x + (part.buf.w - 1) / 2, part.y + (part.buf.h - 1) / 2] };
  });
  return pieces;
}

function heading(a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; }

// Drive the ankle in the ground plane while preserving both measured leg
// lengths. When the hip drops the knee bends instead of either boot stretching.
function leg(out, parts, rig, side, hip, dx, dy, seconds) {
  const [kx, ky, ax, ay] = rig.legs[side];
  const root = [rig.hip[0] + (side ? 2 : -2), rig.hip[1]], knee0 = [kx, ky], ankle0 = [ax, ay];
  const h = [hip[0] + root[0] - rig.hip[0], hip[1]];
  const upper = distance(root, knee0), lower = distance(knee0, ankle0);
  const near = Math.abs(upper - lower) + .01, far = upper + lower - .01;
  const vertical = clamp(ay + dy - h[1], -far, far);
  const nearX = Math.sqrt(Math.max(0, near ** 2 - vertical ** 2));
  const farX = Math.sqrt(Math.max(0, far ** 2 - vertical ** 2));
  const intendedX = ax + dx - h[0];
  const ankle = [h[0] + (Math.sign(intendedX) || 1) * clamp(Math.abs(intendedX), nearX, farX), h[1] + vertical];
  const length = distance(h, ankle);
  const ux = (ankle[0] - h[0]) / length, uy = (ankle[1] - h[1]) / length;
  const along = (upper ** 2 - lower ** 2 + length ** 2) / (2 * length);
  const outward = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  const knee = [h[0] + ux * along + uy * outward, h[1] + uy * along - ux * outward];
  const prefix = side ? 'fore' : 'rear';
  stamp(out, parts[prefix + 'Thigh'], root, h, heading(h, knee) - heading(root, knee0));
  const shinAngle = heading(knee, ankle) - heading(knee0, ankle0);
  stamp(out, parts[prefix + 'Shin'], knee0, knee, shinAngle);
  const footAngle = clamp(shinAngle, -40, 40) * easeBetween(seconds, .2, .8);
  stamp(out, parts[prefix + 'Foot'], ankle0, ankle, footAngle);
}

function upper(rig, pose) {
  const [, dx, dy, angle, head, arm] = pose, hip = [rig.hip[0] + dx, rig.hip[1] + dy];
  return { hip, angle, head: angle + head, arm,
    shoulder: turn(difference(rig.shoulder, rig.hip), angle, hip),
    neck: turn(difference(rig.neck, rig.hip), angle, hip) };
}

function held(rig, item, seconds) {
  const u = upper(rig, state(rig, seconds));
  const armSide = (item.grip[0] - rig.hip[0]) * (rig.shoulder[0] - rig.hip[0]) > 0;
  const angle = armSide ? u.arm : u.angle;
  const wrist = armSide ? turn(difference(item.grip, rig.shoulder), angle, u.shoulder)
    : turn(difference(item.grip, rig.hip), angle, u.hip);
  return { center: turn(difference(item.center, item.grip), angle, wrist), angle };
}

function gearPosition(rig, item, seconds, ground) {
  const start = held(rig, item, Math.min(seconds, item.release));
  if (seconds <= item.release) return start;
  const f = clamp((seconds - item.release) / (item.contact - item.release), 0, 1), smooth = f * f * (3 - 2 * f);
  const angle = mix(start.angle, item.angle, smooth);
  const limit = ground - lowest(item.part, item.center, angle);
  const land = ground - lowest(item.part, item.center, item.angle);
  return { center: [mix(start.center[0], item.x, smooth),
    Math.min(limit, mix(start.center[1], land, f * f) - item.lift * Math.sin(Math.PI * f))], angle };
}

function paintGear(out, rig, pieces, seconds, ground) {
  for (const item of pieces.gear) {
    const { center, angle } = gearPosition(rig, item, seconds, ground);
    stamp(out, item.part, item.center, center, angle);
  }
}

function physical(standing, rig, parts, time, ground) {
  const frame = blank(standing.w, standing.h), out = { ...frame, h: ground + 1 };
  const pose = state(rig, time), u = upper(rig, pose);
  const headFloor = ground - lowest(parts.head, rig.neck, u.head);
  const headRoom = headFloor - u.neck[1];
  const settle = Math.max(-3, Math.min(0, headRoom * .55));
  u.hip[1] += settle;
  u.shoulder[1] += settle;
  u.neck[1] += settle;
  if (!rig.spectral) {
    leg(out, parts, rig, 0, u.hip, pose[6], pose[7], time);
    leg(out, parts, rig, 1, u.hip, pose[8], pose[9], time);
  }
  const fold = easeBetween(pose[2], 1, 8);
  stamp(out, parts.train, rig.hip, u.hip, u.angle * (rig.spectral ? .64 : .45), 1 - .38 * fold);
  stamp(out, parts.coat, rig.hip, u.hip, u.angle);
  const neck = [u.neck[0], u.neck[1] + clamp(headFloor - u.neck[1], -2, 0)];
  stamp(out, parts.head, rig.neck, neck, u.head);
  stamp(out, parts.arm, rig.shoulder, u.shoulder, u.arm);
  if (parts.flame && time < .57) {
    const glow = 1 - easeBetween(time, .16, .58);
    stamp(out, parts.flame, rig.shoulder, u.shoulder, u.arm, glow, glow);
  }
  paintGear(out, rig, parts, time, ground);
  return frame;
}

export function recruitFall(id, sprite) {
  const rig = recruitPoses[id], ground = sprite.anchorY, times = [];
  for (let i = 0; i <= 34; i++) times.push([i / 20]);
  // Preserve the exact native contact times, even between painted in-betweens.
  for (const [time] of rig.motion) {
    if (!times.some(([tick]) => Math.abs(tick - time) < .0001)) times.push([time]);
  }
  times.sort((a, b) => a[0] - b[0]);
  const [offsetX, offsetY] = rig.soul;
  const cues = rig.gear.filter(item => item.shield).map(item => ({ time: item.contact, sound: 'shieldfall' }));
  cues.push({ time: SOUL_RELEASE, sound: 'souldepart' });
  let frames;
  return {
    anchorY: ground, outline: false, frameAt: seconds => fallFrameAt(times, seconds),
    wisp: { ...(rig.sinks ? sinkingSoul : departingSoul), offsetX, offsetY }, cues,
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]], parts = separate(standing, rig);
      frames = times.map(([t]) => t < .1 ? standing : physical(standing, rig, parts, t, ground));
      const remains = blank(standing.w, standing.h);
      paintGear({ ...remains, h: ground + 1 }, rig, parts, times.at(-1)[0], ground);
      // The shared decay starts at the boots and finishes at the head on its
      // right. Run it in body space for a class that has fallen backwards.
      if (rig.motion.at(-1)[3] < 0) {
        const facingRight = [flipX(frames.at(-1))];
        appendDecay(facingRight, flipX(remains), ground);
        frames.push(...facingRight.slice(1).map(flipX));
      } else {
        appendDecay(frames, remains, ground);
      }
      return frames;
    },
  };
}
