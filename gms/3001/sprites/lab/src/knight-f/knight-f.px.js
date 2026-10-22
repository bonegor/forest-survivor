// Thorn Knight (Knight look F) for Forest Survivor: a guardian of the ancient forest. Dark bark
// armour with moss-green lacquered plates, leaves and tiny flowers at the joints, a helm with
// branching antlers and glowing green eyes, a leaf-shaped cape, a round wooden shield with a
// carved tree on his back, a bronze leaf-bladed sword wrapped in a glowing vine.
// 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
pal({
  k: "#181425",                                                           // ink (the cast's outline)
  a: "#33261f", A: "#5a4034", p: "#86613f", P: "#b98c52", q: "#e6bd78",   // dark bark
  n: "#17432a", g: "#2a6a3c", m: "#44a050", M: "#68c262", l: "#9ee27a", L: "#daf9b0",  // moss lacquer
  o: "#6e4118", O: "#b0702a", y: "#e4ac48", Y: "#fbdf8c",                  // bronze
  w: "#5e3c22", W: "#946234", x: "#c28e4c", X: "#ecc47c",                  // the shield's wood
  d: "#0b1510", t: "#1f5e45", T: "#2f8a5a", U: "#62c48a",                                                           // the visor's dark
  f: "#f27ea0", F: "#ffd6e4",                                             // tiny flowers
  E: "#d8ff8a", V: "#5bff7d", Z: "#fff6d6", G: "#c4ff9c",                                             // glow: the eyes, the vine, the whip's arc, the blade's glint
})
ramps("kaApPq", "kngmMlL", "koOyY", "kwWxX")

const PART = { outline: "k", pivot: [0, 0] }

// ---------------------------------------------------------------- parts
// The helm, 11x10, 3/4 facing right: moss lacquer, a bark brow band, a dark visor with two
// glowing eyes, a leaf cheek plate under it.
sprite("_helm", PART, `
  ...gMlLlm..
  ..FmMlLLlm.
  .fymMMlLlMm
  ggfAPPPqPPA
  gnmAddEdEdA
  gnmAddEdEdA
  gnmmAdddddA
  .gnAppPPpPn
  ..gnAppPpn.
  ...aAApPn..`)

// Antlers: forked bark branches placed pixel by pixel (1 px branches carry 1 px of ink each
// side, so prongs stand 3+ px apart). `pts` run from the base up; the lit tone alternates
// along each branch. The near one carries a leaf on its outer tine.
const bark = (c, pts, k, hi, thick = 0, side = "p") => pts.forEach(([x, y], i) => {
  if (i < thick) c.px(x + 1, y, side)
  c.px(x, y, i % 3 === 1 ? hi : k)
})
sprite("_antN", { ...PART, w: 12, h: 10 }, (c) => {
  bark(c, [[2, 9], [3, 8], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3], [9, 2], [10, 1], [11, 0]], "P", "q", 10)
  bark(c, [[3, 6], [3, 5], [3, 4], [3, 3], [3, 2]], "P", "q", 4)
  bark(c, [[8, 2], [8, 1], [8, 0]], "P", "q", 2)
  c.px(2, 1, "l"); c.px(3, 1, "L"); c.px(3, 0, "M")
})
sprite("_antF", { ...PART, w: 9, h: 8 }, (c) => {
  bark(c, [[6, 7], [5, 6], [4, 5], [3, 4], [2, 3], [1, 2], [0, 1]], "p", "P", 7, "A")
  bark(c, [[5, 4], [5, 3], [5, 2], [5, 1]], "p", "P", 3, "A")
})
function antlers(c, hx, hy) {
  c.stamp("_antF", hx - 3, hy - 6)
  c.stamp("_antN", hx + 4, hy - 8)
}

// The torso, 12x11: lacquered lames with bark trim, a vine belt with a bronze buckle, and a
// skirt of three leaf tassets.
sprite("_torso", PART, `
  ..aAPPPpAn..
  .aAmlLLlMAn.
  aAmMLLLlMgAn
  aAmMlLLlMgAn
  aAgmMLlMmgAn
  aAAgmMlmgnAn
  ApPpPpPVyYPA
  .gMLagMLagML
  .gmMagmMagmM
  ..gm.gmm.gm.
  ..o...o...o.`)

// The round shield on his back, 11x11: bark rim, wood, a carved tree.
sprite("_shield", { ...PART, w: 11, h: 11 }, (c) => {
  const cx = 5, cy = 5
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const d = Math.hypot(x - cx, y - cy)
    if (d > 5.3) continue
    const lit = (x - cx) * 0.4 - (y - cy) * 0.9
    if (d > 4.2) c.px(x, y, lit > 1 ? "P" : lit > -2 ? "p" : "A")
    else c.px(x, y, lit > 2.5 ? "X" : lit > 0 ? "x" : lit > -2.5 ? "W" : "w")
  }
  // the carved tree: a round crown with two inlaid leaves, a trunk with roots
  for (let y = 2; y <= 6; y++) for (let x = 3; x <= 7; x++) if (Math.hypot(x - 5, y - 4) <= 2.1) c.px(x, y, "w")
  for (const [x, y] of [[5, 7], [5, 8], [4, 8], [6, 8]]) c.px(x, y, "w")
  c.px(4, 3, "m"); c.px(5, 3, "M"); c.px(6, 4, "m"); c.px(4, 5, "g")
  c.px(2, 6, "y"); c.px(8, 6, "O")
})

// The near arm at rest (idle and walk), 8x11: the leaf-lamed pauldron, the bark arm, the
// vambrace, the gauntlet closed on the grip.
sprite("_arm", PART, `
  .gMlLmlL
  gfFlLlmn
  mMfllMgn
  noOyOoOn
  .ApPPpA.
  ..ApPA..
  ..AmMpA.
  ..nApPPp
  ...nApqp`)

sprite("_foot", PART, `
  pPqMl
  aAAmM`)
sprite("_pauldron", PART, `
  .gMlm.
  gMlLlm
  mMllmn
  noOyOn`)

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "aApP", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "aAAp" : "ApPP"
  const ax = hx + dx, ay = 35 - lift
  let kx = (hx + ax) / 2, ky = 32
  const paint = (part) => {
    if (lift > 0) {
      kx = hx + Math.max(dx, 0) + 1; ky = 32 - lift
      limb(c, hx, hy, 1.4, kx, ky, 1.2, ramp, part)
      limb(c, kx, ky, 1.2, ax, ay, 1.0, ramp, part)
    } else limb(c, hx, hy, 1.5, ax, ay, 1.1, ramp, part)
  }
  paint("ink")
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { P: "p", q: "P", p: "A", M: "m", l: "M", A: "a" } } : {})
  paint("fill")
  const kxr = Math.round(kx), kyr = Math.round(ky)
  c.px(kxr, kyr, far ? "m" : "l")
  c.px(kxr, kyr + 1, far ? "n" : "g")
}
// The leaf-bladed sword: hand at (hx, hy), pointing `deg` (clockwise from right), `len` px.
// A bronze blade swelling like a leaf (measured square to the blade, so it keeps its shape at
// any angle), a lit rib, the upper half lit and the lower in shade; a vine wound round the grip
// and the blade's root, glowing.
function sword(c, hx, hy, deg, len = 13, glint = -1) {
  const u = [Math.cos(deg * R), Math.sin(deg * R)]
  let n = [u[1], -u[0]]
  if (n[1] > 0.2 || (Math.abs(n[1]) <= 0.2 && n[0] < 0)) n = [-n[0], -n[1]]   // n points to the lit side
  const at = (r, t = 0) => [Math.round(hx + u[0] * r + n[0] * t), Math.round(hy + u[1] * r + n[1] * t)]
  const pts = new Map()
  const put = (x, y, k) => pts.set(x + "," + y, [x, y, k])
  const seg = (p, q, k) => {
    const m = Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]))
    for (let i = 0; i <= m; i++) put(Math.round(p[0] + ((q[0] - p[0]) * i) / (m || 1)), Math.round(p[1] + ((q[1] - p[1]) * i) / (m || 1)), k)
  }
  seg(at(-3), at(-1), "p")                                 // grip
  put(...at(-1), "m"); put(...at(-2), "V"); put(...at(-3), "Y"); put(...at(-4), "O")   // the vine round it; the pommel
  for (let r = 3.5; r <= len; r += 0.5) {
    const f = (r - 3.5) / (len - 3.5)
    const hw = f < 0.12 ? 0.5 : Math.max(0.5, 1.35 * Math.pow(Math.sin(Math.PI * Math.min(1, (f - 0.05) / 0.95)), 0.7))
    for (let t = -hw; t <= hw + 1e-6; t += 0.5) {
      const q = t / hw
      const k = hw <= 0.5 ? "O" : q <= -0.6 ? "Y" : q < -0.2 ? "y" : q <= 0.2 ? "O" : q < 0.6 ? "O" : "o"
      put(...at(r, t), r > len - 0.6 ? "Y" : k)
    }
  }
  put(...at(4), "V"); put(...at(5), "m"); put(...at(6), "V")      // the vine at the blade's root
  if (glint >= 0) put(...at(5 + glint, -0.5), "Z")
  const g = at(3)                                          // the cross-guard, out past the fist
  seg(at(3, -2.5), at(3, 2.5), "O")
  put(...at(3, -2.5), "Y"); put(...at(3, -1.5), "y"); put(...at(3, 2.5), "o")
  put(g[0], g[1], "Y")
  seg(at(2, -0.5), at(2, 0.5), "o")
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) c.px(x, y, k)
}
function fist(c, x, y) {
  c.rect(x - 2, y - 1, 5, 3, "k"); c.rect(x - 1, y - 2, 3, 5, "k")
  c.rect(x - 1, y - 1, 3, 3, "P")
  c.px(x - 1, y - 1, "q"); c.px(x, y - 1, "q"); c.px(x + 1, y - 1, "P")
  c.px(x - 1, y + 1, "A"); c.px(x, y + 1, "p"); c.px(x + 1, y + 1, "p")
}
function armIn(c, sh, elbow, hand) {
  limb(c, sh[0], sh[1] + 1, 1.5, elbow[0], elbow[1], 1.3, "aApPq")
  limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "aApPq")
  c.px(Math.round(elbow[0]), Math.round(elbow[1]), "l")
  c.stamp("_pauldron", sh[0] - 2, sh[1] - 1)
}
// The leaf cape hanging behind the shield: a leaf with its tip down and back, its vein lit.
function cape(c, ux, uy, sway) {
  const tx = 12 + sway
  c.poly([14 + ux, 21 + uy, 20 + ux, 22 + uy, 20 + ux, 31 + uy, 17 + ux, 35 + uy, tx + ux, 36 + uy, 9 + ux, 31 + uy, 8 + ux, 26 + uy], "k")
  c.poly([14 + ux, 22 + uy, 19 + ux, 23 + uy, 19 + ux, 31 + uy, 16 + ux, 34 + uy, tx + ux, 35 + uy, 10 + ux, 31 + uy, 9 + ux, 26 + uy], "T")
  c.line(14 + ux, 23 + uy, tx + ux, 34 + uy, "U")
  c.line(10 + ux, 27 + uy, 13 + ux, 29 + uy, "U"); c.line(17 + ux, 26 + uy, 14 + ux, 29 + uy, "U")
  c.line(9 + ux, 29 + uy, 10 + ux, 32 + uy, "t"); c.line(18 + ux, 30 + uy, 16 + ux, 33 + uy, "t")
}

// The whip of light: a crescent about (cx, cy), outer edge at radius r, swept from angle `from` to `to`,
// thin at the tail and swelling to `width` at the end. Drawn from pixel centres (so the edges stay
// smooth lines, not stair-steps), inked all round, with a lighter inner rim over the thick half.
function crescent(c, cx, cy, r, from, to, width, key) {
  const set = new Map()
  for (let y = 0; y < 46; y++) for (let x = 0; x < 46; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy
    const t = (Math.atan2(dy, dx) / R - from) / (to - from)
    if (t < 0 || t > 1) continue
    const d = Math.hypot(dx, dy)
    let w = width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7)
    w = Math.max(w, 1.1)
    if (d > r || d < r - w) continue
    set.set(x + "," + y, [x, y, t, d - (r - w)])
  }
  for (const [x, y] of set.values()) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!set.has(x + ax + "," + (y + ay))) c.px(x + ax, y + ay, "k")
  for (const [x, y, t, inD] of set.values()) c.px(x, y, t > 0.35 && inD < 1 && width > 3 ? "l" : key)
}
const SH = [28, 19]                                // near shoulder (at rest)
const FSH = [19, 20]                               // far shoulder
function figure(c, f) {
  const ux = f.ux, uy = f.uy
  const hand = f.hand, elbow = f.elbow
  const sh = [SH[0] + ux, SH[1] + uy]
  cape(c, ux, uy, f.sway || 0)
  c.stamp("_shield", 8 + ux, 14 + uy)
  limb(c, FSH[0] + ux, FSH[1] + uy, 1.3, f.farHand[0], f.farHand[1], 1.1, "kaAp")
  leg(c, 20, 28, f.far[0], f.far[1], true)
  leg(c, 25, 28, f.near[0], f.near[1], false)
  c.stamp("_torso", 18 + ux, 18 + uy)
  antlers(c, 19 + ux, 9 + uy + (f.hy || 0))
  if (f.smear) {
    const [from, to, inner, key] = f.smear
    const tx = hand[0] + Math.cos(f.deg * R) * f.len, ty = hand[1] + Math.sin(f.deg * R) * f.len
    const cx = 25 + ux, cy = 20 + uy                       // the whip swings about his middle
    const r = Math.min(f.smearMax || 19, Math.round(Math.hypot(tx - cx, ty - cy)))
    crescent(c, cx, cy, r, from, to, inner, key || "G")
    // leaves shed from the whip: each a lit pixel with a darker one trailing behind it
    const dir = Math.sign(to - from)
    for (const [frac, out] of f.leaves || []) {
      const ang = (from + (to - from) * frac) * R
      const lx = cx + Math.cos(ang) * (r + out), ly = cy + Math.sin(ang) * (r + out)
      const tx = -Math.sin(ang) * dir, ty = Math.cos(ang) * dir
      c.px(Math.round(lx), Math.round(ly), "L"); c.px(Math.round(lx - tx * 1.2), Math.round(ly - ty * 1.2), "l"); c.px(Math.round(lx - tx * 2.4), Math.round(ly - ty * 2.4), "M")
    }
  }
  if (f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len)
  if (f.helmOverArm) armIn(c, sh, elbow, hand)
  c.stamp("_helm", 19 + ux, 9 + uy + (f.hy || 0))
  if (f.blink) { c.px(25 + ux, 14 + uy + (f.hy || 0), "d"); c.px(27 + ux, 14 + uy + (f.hy || 0), "d") }   // eyes shut to a slit
  if (f.helmOverArm) { limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "aApPq"); c.px(elbow[0], elbow[1], "l"); fist(c, hand[0], hand[1]) }
  else if (f.rest) { c.stamp("_arm", 26 + ux, 18 + uy); sword(c, hand[0], hand[1], f.deg, f.len, f.glint ?? -1); fist(c, hand[0], hand[1]) }
  else {
    if (!f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len, f.glint ?? -1)
    armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1])
  }
}

// ---------------------------------------------------------------- the moves
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0],
    hand: [33, 27 + uy], elbow: [30, 25 + uy], farHand: [18, 26 + uy],
    rest: true, deg: -45, len: 14, glint: [-1, 0, 3, 6, 9, -1, -1, -1][i],
    sway: [0, 0, 0, 1, 1, 1, 0, 0][i], blink: i === 6,
  }
})
const GAIT = [[3, 0], [2, 0], [1, 0], [-2, 0], [-3, 1], [-2, 2], [0, 2], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i], sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    ux: 0, uy, hy: 0, near: GAIT[i], far: GAIT[(i + 4) % 8],
    hand: [33, 27 + uy], elbow: [30, 25 + uy], farHand: [18 + sw, 26 + uy],
    rest: true, deg: -45, len: 14, sway: [-1, -2, -1, 0, 1, 2, 1, 0][i],
  }
})
const ATTACK = [
  { ux: -1, uy: 0, near: [2, 0], far: [-2, 0], hand: [36, 13], elbow: [34, 17], farHand: [17, 25], deg: -75, len: 12, swordBehind: true, helmOverArm: true, sway: -2 },
  { ux: 0, uy: 0, near: [3, 0], far: [-3, 0], hand: [33, 12], elbow: [32, 16], farHand: [18, 25], deg: -60, len: 12, smear: [-150, -62, 6], smearMax: 18, sway: -2, leaves: [[0.3, 2], [0.7, 2]] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [34, 21], elbow: [31, 20], farHand: [19, 26], deg: 12, len: 10, smear: [-78, 34, 8], smearMax: 18, sway: -3, leaves: [[0.2, 3], [0.5, 2], [0.85, -1]] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [33, 28], elbow: [32, 23], farHand: [19, 26], deg: 50, len: 10, sway: -2 },
  { ux: 0, uy: 0, near: [2, 0], far: [-2, 0], hand: [33, 27], elbow: [31, 24], farHand: [18, 26], deg: 5, len: 11, sway: -1 },
  { ux: 0, uy: 0, near: [1, 0], far: [-1, 0], hand: [32, 26], elbow: [30, 24], farHand: [18, 26], deg: -30, len: 14, sway: 0 },
]
const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
const fig = (list) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, list[c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(IDLE))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(WALK))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(ATTACK))
anim("knight_f", { ...BOX, frames: 22, fps: 10 }, fig(ALL))
