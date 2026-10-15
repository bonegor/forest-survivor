// Morvath, the Necromancer: a Blood Lich (remaster-v1).
import { Pic, palette, outline, dropStrays, toBuf, across, inked, sideShade, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // robe: near-black, warm; a maroon fold tint
  h: 'h', a: 'a', A: 'A', m: 'm', q: 'q',
  // blood runes and eyes, dim to burning
  R: 'R', r: 'r', x: 'x',
  // bone: crown, skull, collar; the gaunt face
  z: 'z', T: 'T', Z: 'Z', Q: 'Q', W: 'W',
  // grimoire pages
  t: 't',
});

const L = (x, y, rows) => ({ x, y, rows });

// Bone crown, the cowl behind a gaunt grey face with burning eyes, a ribbed bone collar.
const HEAD = L(15, 11, [
  '.....z.z.z.z...', // 11
  '.....zTzxzTz...', // 12
  '....hTZZZZZZh..', // 13
  '...hhqZZZZZZZ..', // 14
  '..zhhqWxZZWx...', // 15
  '..ZhhqQWZZQW...', // 16
  '.zZhhqqQZWZQ...', // 17
  '.zZhhhqQzzz....', // 18
  '.TZhhhhqQQ.....', // 19
  '..ZZhhhhq......', // 20
]);

const put = (pic, layer, dx = 0, dy = 0) => pic.stamp(layer.rows, layer.x + dx, layer.y + dy);

// The robe from the shoulders to the ground, runes down its front and along the hem.
function robe(p, by, sway, front, glow) {
  const top = 20 + by;
  p.poly([[18, top], [28, top], [30, top + 5], [31 + front, 38.4], [15 + sway, 38.4], [15, top + 9], [16, top + 3]], 'h');
  sideShade(p, { hi: 'a', mid: 'm', lo: 'h', lit: 0.26, dark: 0.34 });
  // A fold: a blood-tinted shadow beside a lit ridge.
  p.line(21, top + 8, 20 + sway, 37, 'h', true);
  p.line(20, top + 8, 19 + sway, 37, 'A', true);
  // Belt of bone plaques.
  for (let x = 15; x <= 31; x++) {
    p.on(x, top + 7, (x - 16) % 3 === 0 ? 'Z' : 'k');
  }
  // The front panel's edge, and runes burning down it.
  for (let y = top + 3; y <= 37; y++) p.on(26 + Math.round((y - top) * 0.13 + (y > 32 ? front * 0.5 : 0)), y, 'k');
  const runes = [[27, top + 4], [27, top + 8], [28, top + 12], [28, top + 15]];
  runes.forEach(([x, y], k) => {
    const c = glow && k % 2 === 0 ? 'x' : 'r';
    p.on(x, y, c);
    p.on(x, y + 1, c);
  });
  // Hem band of runes: burning pairs on a dim band.
  for (let x = 13; x <= 34; x++) if (p.get(x, 38)) p.set(x, 38, (x + (glow ? 2 : 0)) % 5 < 2 ? (glow ? 'x' : 'r') : 'R');
}

function staff(p, top, bottom) {
  const [tx, ty] = top, [bx, by] = bottom;
  p.line(tx, ty + 3, bx, by, 'Q');
  p.line(tx + 1, ty + 4, bx + 1, by, 'W');
  // Skull with burning sockets, a bone collar under it.
  p.stamp(['.zzz.', 'zzzzZ', 'zxzxZ', 'zZzZQ', '.zZQ.', 'Z.Q.Q'], tx - 2, ty - 2);
}

// The open grimoire: two cream pages over a blood-red cover, a glyph on each page.
function book(p, x, y, glow) {
  p.stamp(['TTt.TTt', 'TxtzTxt', 'tTttTtt', 'RRRmRRm'], x, y, { map: glow ? {} : { x: 'r' } });
}

// The grimoire's flare: a blood-red flame rising off the pages, burning hotter at its core.
function flare(p, x, y, n) {
  const shapes = {
    1: ['..x...', '.xRx..', '.RxR..'],
    2: ['...x...', '..xR...', '.RxxR..', '.RxrxR.', 'RrxrxrR', '.RRxRR.'],
    3: ['..x..x..', '..xR.Rx.', '.RxxRxR.', '.RxrrxR.', 'RrxrrxrR', 'RxrrrrxR', '.RRxxRR.'],
  };
  const rows = shapes[n];
  p.stamp(rows, x + 3 - Math.floor(rows[0].length / 2), y - rows.length);
}

function lichFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0;
  const st = new Pic();
  staff(st, q.skull, q.foot);
  pic.over(inked(st, 'k', null, 'rd'));
  const rb = new Pic();
  robe(rb, by, q.sway, q.front || 0, q.glow);
  pic.over(rb);
  const head = new Pic();
  put(head, HEAD, 0, by + br);
  pic.over(head);
  // Far arm holds the open grimoire out in front.
  const fa = new Pic();
  fa.stroke(27, 22 + by + br, q.book[0] + 1, q.book[1] + 3, 1.4, 1.5, across(['a', 'h', 'q']));
  fa.set(q.book[0] + 2, q.book[1] + 4, 'Z');
  book(fa, q.book[0], q.book[1], q.glow);
  if (q.flare) flare(fa, q.book[0], q.book[1], q.flare);
  pic.over(inked(fa, 'k', null, 'lrd'));
  // Near arm grips the staff.
  const na = new Pic();
  na.stroke(19, 22 + by + br, q.hand[0] + 1, q.hand[1], 1.5, 1.7, across(['a', 'h', 'q']));
  na.set(R(q.hand[0]), R(q.hand[1]), 'Z');
  na.set(R(q.hand[0]), R(q.hand[1]) + 1, 'Q');
  pic.over(inked(na, 'k', null, 'rd'));
  return dropStrays(outline(pic, 'k'));
}

const BASE = { bob: 0, breath: 0, sway: 0, skull: [14, 8], foot: [14, 38], hand: [15, 25], book: [29, 23], glow: false, flare: 0 };

function idle(i) {
  const br = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return { ...BASE, breath: br, sway: [0, 0, 1, 1, 1, 0, 0, 0][i], book: [29, 23 + br], hand: [15, 25 + br], glow: i >= 2 && i <= 5, flare: i === 3 || i === 4 ? 1 : 0 };
}
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const fwd = [2, 1, 0, -1, -2, -1, 0, 1][i];
  return { ...BASE, bob, sway: [-1, -1, 0, 1, 1, 1, 0, -1][i], front: [1, 1, 0, 0, 1, 1, 0, 0][i], book: [29, 23 + bob], hand: [15, 25 + bob], skull: [14 + (fwd > 0 ? 1 : 0), 8 + bob], foot: [14 + (fwd > 0 ? 1 : 0), 38] };
}
// Raise the skull staff, the grimoire's pages catch fire and flare (the blow, frame 3), the
// fire dies down, recover.
function attack(i) {
  const T = [
    { skull: [15, 7], hand: [16, 24], glow: true, flare: 1 },
    { skull: [16, 6], hand: [17, 22], glow: true, flare: 2 },
    { skull: [17, 5], hand: [18, 21], glow: true, flare: 3 },
    { skull: [17, 5], hand: [18, 21], glow: true, flare: 3, book: [30, 22] },
    { skull: [16, 6], hand: [17, 22], glow: true, flare: 2 },
    { skull: [14, 8], hand: [15, 25], flare: 1 },
  ][i];
  return { ...BASE, ...T, foot: [T.skull[0], 38] };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => lichFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => lichFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => lichFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'necromancer',
  id: 'remaster-v1',
  name: 'Remaster V1 · Necromancer',
  description: 'Morvath the Blood Lich: a bone crown on a gaunt grey skull-face with burning eyes, a ribbed bone collar, a near-black robe traced with blood-red runes, a skull staff and an open grimoire. He raises the staff and the grimoire bursts into blood-red flame.',
  collection: 'Remasters',
  def: {
    gen, emissive: 'x',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 12, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
