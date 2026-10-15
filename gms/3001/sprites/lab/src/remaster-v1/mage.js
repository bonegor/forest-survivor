// Eldrin, the Sorcerer: a Frost Archmage (remaster-v1).
import { Pic, palette, outline, dropStrays, toBuf, across, inked, sideShade, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // robe and hat: royal blue, dark to light
  K: 'K', u: 'u', '7': '#1f6fbf', U: 'U', '8': '#7fd0f5',
  // silver trim, beard
  w: 'w', G: 'G', g: 'g', N: 'N',
  // skin
  s: 's', S: 'S',
  // staff wood
  B: 'B', b: 'b', m: 'm',
  // ice
  X: 'X', c: 'c',
});

const L = (x, y, rows) => ({ x, y, rows });

// Hat (bent cone, silver band, wide brim), face, brows, beard and the shoulder mantle.
const HEAD = L(15, 11, [
  '.....u7..........', // 11
  '......u77........', // 12
  '.......u77.......', // 13
  '.......877u......', // 14
  '......U877uu.....', // 15
  '.....UU877uuK....', // 16
  '....UUU877uuKK...', // 17
  '....GwGGGGgggN...', // 18
  '.u777777777777uK.', // 19
  '..KKKKKKKKKKKKK..', // 20
  '........SSSSSs...', // 21
  '.......GwGksss...', // 22
  '......GwwGGsSs...', // 23
  '......wwwGGGg....', // 24
  '.....GwwGGGGg....', // 25
  '......wwGGgGg....', // 26
  '......wGGgGg.....', // 27
  '.......wGGgg.....', // 28
  '.......wGgg......', // 29
  '........wGg......', // 30
  '........Gg.......', // 31
  '.........g.......', // 32
]);

const put = (pic, layer, dx = 0, dy = 0) => pic.stamp(layer.rows, layer.x + dx, layer.y + dy);

// Robe from the shoulders to the ground: the outer robe open down the front over a pale
// inner robe, silver trim on its edges and hem. front: how far the hem kicks forward.
function robe(p, by, sway, front, back, lean = 0) {
  const top = 21 + by;
  p.poly([[18 + lean, top], [29 + lean, top], [30 + lean, top + 6], [31 + front, 38.4], [16 + sway - back, 38.4], [16 - back + lean * 0.5, top + 9], [17 + lean, top + 3]], '7');
  sideShade(p, { hi: 'U', mid: '7', lo: 'u', lit: 0.3, dark: 0.3 });
  // Inner robe down the front opening.
  for (let y = top + 6; y <= 37; y++) {
    const x = 26 + Math.round(((y - top - 6) / (37 - top - 6)) * (2 + front));
    p.on(x, y, 'G');
    p.on(x + 1, y, '8');
    p.on(x + 2, y, 'U');
  }
  // Folds: a shadow with a lit ridge beside it.
  p.line(22, top + 9, 21 + sway - back, 37, 'u', true);
  p.line(21, top + 9, 20 + sway - back, 37, '8', true);
  // Sash with a silver clasp.
  for (let x = 15; x <= 32; x++) {
    p.on(x, top + 7, x === 26 ? 'G' : 'K');
    p.on(x, top + 8, x === 26 ? 'g' : 'u');
  }
  // Hem trim.
  for (let x = 12; x <= 35; x++) if (p.get(x, 38)) p.set(x, 38, x > 27 ? 'g' : 'G');
}

// The staff of pale driftwood, an ice orb held in a crescent claw at the top.
function staff(p, orb, foot, glow) {
  const [ox, oy] = orb, [fx, fy] = foot;
  const s = new Pic();
  s.line(ox, oy + 3, fx, fy, 'B');
  s.line(ox + 1, oy + 5, fx + 1, fy, 'b');
  // Claw.
  s.set(ox - 2, oy, 'g');
  s.set(ox - 2, oy + 1, 'N');
  s.set(ox - 1, oy + 2, 'N');
  s.set(ox + 2, oy, 'g');
  s.set(ox + 2, oy + 1, 'N');
  s.set(ox + 1, oy + 2, 'N');
  s.set(ox, oy + 2, 'b');
  // Orb.
  s.ellipse(ox, oy - 1, 1.5, 1.5, (x, y, nx, ny) => (nx + ny < -0.7 ? 'w' : nx + ny < 0.2 ? 'X' : 'c'));
  p.over(s);
  if (glow) {
    // Frost glints around the orb.
    const g = new Pic();
    const pts = glow === 2 ? [[-3, 1], [3, -2], [-3, -2], [3, 2]] : [[-3, -1], [3, 1]];
    for (const [dx, dy] of pts) g.set(ox + dx, oy - 1 + dy, 'c');
    p.over(g);
  }
}

// A starburst of frost at the orb for the attack.
function burst(p, cx, cy, r) {
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4, len = a % 2 ? r * 0.6 : r;
    for (let k = 1; k <= len; k++) p.set(R(cx + Math.cos(ang) * k), R(cy + Math.sin(ang) * k), k > len - 1.5 ? 'c' : k > len * 0.5 ? 'X' : 'w');
  }
  p.ellipse(cx, cy, 1.5, 1.5, 'w');
}

function mageFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0;
  // Staff behind the far hand.
  const st = new Pic();
  staff(st, q.orb, q.foot, q.glow);
  if (q.burst) burst(st, q.orb[0], q.orb[1] - 1, q.burst);
  pic.over(inked(st, 'k', null, 'rd'));
  const rb = new Pic();
  const lean = q.lean || 0;
  robe(rb, by, q.sway, q.front || 0, q.back || 0, lean);
  pic.over(rb);
  // The leading boot's toe peeks out under the front of the hem.
  if (q.toe) {
    const t = new Pic();
    t.stamp(['uU.', 'Kuu'], q.toe, 37);
    pic.over(inked(t, 'k', null, 'ur'));
  }
  const head = new Pic();
  put(head, HEAD, lean, by + br);
  pic.over(head);
  // Far sleeve and the hand on the staff.
  const fs2 = new Pic();
  fs2.stroke(28 + lean, 23 + by + br, q.grip[0] - 2, q.grip[1], 1.4, 1.3, across(['U', '7', 'u']));
  pic.over(inked(fs2, 'k', null, 'rd'));
  const hand = new Pic();
  hand.rect(q.grip[0] - 1, q.grip[1], 2, 2, 's');
  hand.set(q.grip[0] - 1, q.grip[1] + 1, 'S');
  hand.set(q.grip[0] - 2, q.grip[1], 'u');
  hand.set(q.grip[0] - 2, q.grip[1] + 1, 'u');
  pic.over(hand);
  // Near bell sleeve.
  const sl = new Pic();
  sl.stroke(19 + lean, 24 + by + br, q.sleeve[0] + lean, q.sleeve[1], 1.6, 2.2, across(['U', '7', 'u']));
  sl.set(R(q.sleeve[0]) + lean + 1, R(q.sleeve[1]) + 2, 's');
  sl.set(R(q.sleeve[0]) + lean, R(q.sleeve[1]) + 2, 'S');
  pic.over(inked(sl, 'k', null, 'rd'));
  return dropStrays(outline(pic, 'k'));
}

const BASE = { bob: 0, breath: 0, sway: 0, orb: [33, 7], foot: [33, 38], grip: [33, 25], sleeve: [20, 29], glow: 0 };

function idle(i) {
  const br = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return { ...BASE, breath: br, sway: [0, 0, 1, 1, 1, 0, 0, 0][i], glow: [0, 1, 2, 1, 0, 1, 2, 1][i], sleeve: [20, 29 + br] };
}
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const fwd = [2, 1, 0, -1, -2, -1, 0, 1][i];
  const toe = [31, 30, null, null, 31, 30, null, null][i];
  return { ...BASE, bob, sway: [-1, -1, 0, 1, 1, 1, 0, -1][i], front: [1, 1, 0, 0, 1, 1, 0, 0][i], toe, orb: [33, 7 + bob], grip: [33, 25 + bob], sleeve: [20 - fwd * 0.5, 29 + bob] };
}
// Draw the staff back and gather frost, thrust it forward, the orb bursts (the blow, frame 3),
// the burst fades, recover.
function attack(i) {
  const T = [
    { lean: -1, orb: [31, 8], foot: [32, 38], grip: [32, 25], glow: 1, back: 1 },
    { lean: -1, orb: [30, 7], foot: [32, 38], grip: [31, 25], glow: 2, back: 1 },
    { lean: 1, orb: [36, 9], foot: [31, 38], grip: [33, 25], glow: 2, front: 1 },
    { lean: 2, orb: [38, 11], foot: [31, 38], grip: [35, 25], burst: 6, front: 2 },
    { lean: 2, orb: [37, 10], foot: [31, 38], grip: [34, 25], burst: 3, front: 2 },
    { lean: 1, orb: [34, 8], foot: [32, 38], grip: [33, 25], glow: 1, front: 1 },
  ][i];
  return { ...BASE, ...T };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => mageFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => mageFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => mageFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'mage',
  id: 'remaster-v1',
  name: 'Remaster V1 · Sorcerer',
  description: 'Eldrin the Frost Archmage: a tall bent hat with a silver band, a long white beard, royal-blue robes with a silver-trimmed front and sash, a driftwood staff crowned with a glinting ice orb. He draws the staff back and thrusts it, and the orb bursts into a frost star.',
  collection: 'Remasters',
  def: {
    gen, emissive: 'cX',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
