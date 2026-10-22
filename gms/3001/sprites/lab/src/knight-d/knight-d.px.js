// Knight D, the Frost Warden, for Forest Survivor: a northern guardian in pale ice-blue enamel with
// silver trim. A heavy white wolf-fur mantle round his shoulders (the big fluffy shape), an open
// helm with two swept-back silver wings and a small stern face with icy eyes, a round shield of
// blue ice carrying a snowflake on his arm, and a crystal-blue longsword held upright beside his
// head that glows with frost. His cut is a wide cold arc that sheds ice shards.
// 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
// The glowing colours (G H J: eyes, blade, snowflake, the cold arc) are used for nothing else.
// Build: node <pxl>/bin/pxl.js build knight-d.px.js, then node build-sheet-d.mjs <anims/knight_d.png>
// adds the two glow rows and writes sheets/knight-d.png.
pal({
  k: "#181425",                                                          // ink (the cast's outline)
  a: "#2c5594", b: "#4a8bd0", c: "#86c3f0", d: "#c2e8fb", e: "#f2fcff",  // ice-blue enamel plate
  s: "#4a5168", t: "#7f88a2", u: "#b9c1d4", v: "#eaeef7",                // silver trim
  f: "#6a7eae", g: "#b8c8e3", h: "#e8f0fa", i: "#ffffff",                // wolf fur, white
  m: "#162851", n: "#233f82", o: "#3566b8",                              // deep frost-blue cloth
  x: "#b06a55", y: "#e9ae8d", z: "#ffd8bc", p: "#e8868a",                // skin and the cold cheek
  q: "#244fa6", r: "#3f86e0", w: "#7cc4f5",                              // shield ice
  L: "#3a2f48", l: "#5d4c6e",                                            // boot and belt leather
  G: "#4fcdfc", H: "#a6efff", J: "#effeff",                              // frost glow
})
ramps("kabcde", "kstuv", "kfghi", "kmno", "kxyz", "kqrw", "kLl", "kGHJ")

const PART = { outline: "k", pivot: [0, 0] }
const must = (rows, w, name) => rows.forEach((r, i) => { if (r.length !== w) throw new Error(name + " row " + i + " is " + r.length + ", not " + w + ": " + r) })

// ---------------------------------------------------------------- parts (grids, fill at 0,0)
// The open helm, 11x10, 3/4 facing right: a silver dome with a lit crown, a brim band, the near
// ear flap on the left, and the face on the right: a stern brow, icy eyes, a cold cheek.
const HELM = [
  "...abdddb..",
  "..abdeeedb.",
  ".abcdeeddcb",
  ".suuvvvuuus",
  ".sbtxLLyLL.",
  ".sbbxHJyHJ.",
  ".saaxyyyyy.",
  ".saaxpyypy.",
  "..sbxxyyy..",
  "...sabyy...",
]
must(HELM, 11, "helm")
sprite("_helm", PART, HELM.join("\n"))

// A wing, 9x5, swept back and up from the temple: the tip at the top left, the root at the lower right.
const WING = [
  "vv.........",
  ".vvvu......",
  "..uvvvvu...",
  ".vv.tuvvvu.",
  "..uvvstuvvv",
  "....uvvstuv",
  "......sttus",
]
must(WING, 11, "wing")
sprite("_wing", PART, WING.join("\n"))
sprite("_wingfar", { ...PART, swap: { u: "t", v: "u", t: "s" } }, WING.join("\n"))

// The wolf mantle is painted from puffed clumps (cx, cy, rx, ry), lowest first so the upper ones overlap:
// each clump is lit from the upper left (white crown, grey-blue underside), the overlaps make the
// creases, the hem is a row of hanging tufts. Collar clumps sit on top, round the neck.
const CLUMPS = [
  [15.6, 21.6, 1.6, 3], [19.2, 22, 1.6, 3.2], [22.8, 22.2, 1.6, 3.2], [26.4, 22, 1.6, 3.2], [30, 21.8, 1.6, 3.1], [33, 21, 1.5, 2.4],
  [14.6, 20, 2.3, 2.3], [17, 19, 3.4, 3.2], [21.5, 20, 3.2, 3.2], [26.5, 20.4, 3.2, 3.2], [30.8, 19, 3.6, 3.3],
  [20.5, 17.6, 2.7, 2.4], [24.5, 18.3, 2.7, 2.4], [28.6, 17.6, 2.5, 2.3],
]
function mantle(c, ox, oy) {
  const pts = new Map()
  for (const [cx, cy, rx, ry] of CLUMPS) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = Math.hypot(nx, ny)
      if (d > 1) continue
      const lit = -(nx * 0.45 + ny * 0.85) * (0.55 + 0.45 * d) + (1 - d) * 0.35
      pts.set(x + "," + y, [x, y, lit > 0.5 ? "i" : lit > 0.08 ? "h" : lit > -0.38 ? "g" : "f"])
    }
  }
  for (const gx of [17, 21, 24, 28, 31.5]) for (const gy of [21, 22, 23]) {   // the strands between the tufts
    const q = pts.get(Math.round(gx) + "," + gy); if (q) q[2] = gy === 21 ? "g" : "f"
  }
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx + ox, y + dy + oy, "k")
  for (const [x, y, k] of pts.values()) c.px(x + ox, y + oy, k)
}

// The torso under it, 12x8: the chest plate, a silver belt with a buckle, then the skirt: pale
// plate tassets either side of a deep blue cloth panel, a silver hem.
const TORSO = [
  "..abccdddb..",
  ".abcddddeeb.",
  ".abcdeeedcb.",
  ".abcddddcbb.",
  ".sttuvvuttt.",
  ".abcdnncdcb.",
  "abcddnnbcddb",
  "..stuuuutus.",
]
must(TORSO, 12, "torso")
sprite("_torso", PART, TORSO.join("\n"))

// The boot, toes to the right: dark leather with a lit top; a fur cuff is added at the ankle.
sprite("_foot", PART, `
  Lllu.
  kLLll`)
sprite("_cuff", PART, `
  .hih.
  gfhfg`)

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "abcd", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
// A leg from the hip, its ankle dx along and lifted by `lift`; `far` is the darker far leg.
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "mab" : "abcd"
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
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { u: "l", l: "L", L: "k" } } : {})
  paint("fill")
  c.stamp("_cuff", Math.round(ax) - 2, ay - 1, far ? { swap: { h: "g", i: "h", g: "f" } } : {})
  const kxr = Math.round(kx), kyr = Math.round(ky)
  c.px(kxr, kyr - 1, far ? "b" : "e")
  c.px(kxr, kyr, far ? "a" : "c")
}
// The crystal longsword: its hand at (hx, hy), pointing `deg` (clockwise from right). A 3 px blade
// whose core is white, edges ice cyan, a silver cross-guard, a leather grip, a crystal pommel.
function sword(c, hx, hy, deg, len = 13, glint = -1) {
  const u = [Math.cos(deg * R), Math.sin(deg * R)]
  const P = (r, ox = 0, oy = 0) => [Math.round(hx + u[0] * r + ox), Math.round(hy + u[1] * r + oy)]
  const up = Math.abs(u[1]) > 0.8 ? [-1, 0] : [0, -1]
  const pts = new Map()
  const put = (x, y, k) => pts.set(x + "," + y, [x, y, k])
  const seg = (a, b, k) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
    for (let i = 0; i <= n; i++) put(Math.round(a[0] + ((b[0] - a[0]) * i) / (n || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (n || 1)), k)
  }
  seg(P(-3), P(-1), "l")                                    // grip
  put(...P(-4), "G")                                        // pommel crystal
  seg(P(2, -up[0], -up[1]), P(len - 2, -up[0], -up[1]), "G") // the shaded flat
  seg(P(2, ...up), P(len - 1, ...up), "H")                  // the lit edge
  seg(P(2), P(len), "J")                                    // the white core
  put(...P(len + 1), "H")                                   // the point
  if (glint >= 0) put(...P(3 + glint), "J")
  const g = P(1), n = [-u[1], u[0]]                         // the cross-guard, square to the blade
  seg([g[0] - n[0] * 2.6, g[1] - n[1] * 2.6], [g[0] + n[0] * 2.6, g[1] + n[1] * 2.6], "u")
  put(g[0] - Math.round(n[0] * 2.6), g[1] - Math.round(n[1] * 2.6), "v")
  put(g[0], g[1], "t")
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) c.px(x, y, k)
}
// A gauntlet closed round the grip: knuckles lit, the fingers' underside dark.
function fist(c, x, y) {
  c.rect(x - 2, y - 1, 5, 3, "k"); c.rect(x - 1, y - 2, 3, 5, "k")
  c.rect(x - 1, y - 1, 3, 3, "c")
  c.px(x - 1, y - 1, "d"); c.px(x, y - 1, "e"); c.px(x + 1, y - 1, "d")
  c.px(x - 1, y + 1, "a"); c.px(x, y + 1, "b"); c.px(x + 1, y + 1, "b")
}
// The round ice shield, 11 wide: a silver rim lit top left, an ice face in three tones with a
// facet, the snowflake in the middle (it glows).
function shield(c, x0, y0) {
  const cx = x0 + 5, cy = y0 + 5
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
    const d = Math.hypot(x, y)
    if (d > 5.55) continue
    const px = cx + x, py = cy + y
    if (d > 4.6) { c.px(px, py, "k"); continue }
    const lit = -(x * 0.6 + y * 0.8)                         // light from the upper left
    if (d > 3.6) c.px(px, py, lit > 3.6 ? "v" : lit > 0 ? "u" : lit > -3 ? "t" : "s")
    else c.px(px, py, d < 2.6 ? "m" : lit > 2.6 ? "w" : lit > 0.2 ? "r" : "q")
  }
  const F = ["H.J.H", ".HJH.", "JJJJJ", ".HJH.", "H.J.H"]
  F.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") c.px(cx - 2 + i, cy - 2 + j, ch) }))
  c.px(cx - 3, cy - 3, "w"); c.px(cx - 2, cy - 4, "w")        // the facet's glint
}
// The sword arm in action, from behind the mantle: upper arm, couter, vambrace, gauntlet.
function armIn(c, sh, elbow, hand) {
  limb(c, sh[0], sh[1] + 1, 1.5, elbow[0], elbow[1], 1.3, "abcd")
  limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "abcd")
}
// Ice shards and snow motes shed along a cut: [x, y, kind]; "p" a plus (cold centre, glowing
// arms), "d" a two pixel diamond chip, "s" a single bright mote.
function shards(c, list) {
  for (const [x, y, k] of list) {
    if (k === "p") { c.px(x, y, "J"); c.px(x - 1, y, "H"); c.px(x + 1, y, "H"); c.px(x, y - 1, "H"); c.px(x, y + 1, "H") }
    else if (k === "d") { c.px(x, y, "J"); c.px(x + 1, y + 1, "G") }
    else c.px(x, y, "J")
  }
}

// One frame. f: { ux, uy (upper body offset), hy (helm extra), near/far legs [dx, lift],
// hand [x, y], elbow [x, y], deg, len, smear [from, to, inner] | null, front, glint, sparks, shards }
const SH = [31, 20]                                  // the sword shoulder, under the fur
function smear(c, f, sh) {
  const [from, to, inner, key] = f.smear
  const tx = f.hand[0] + Math.cos(f.deg * R) * f.len, ty = f.hand[1] + Math.sin(f.deg * R) * f.len
  const r = Math.min(f.smearMax || 19, Math.round(Math.hypot(tx - sh[0], ty - sh[1])))
  c.arc(sh[0], sh[1], r + 1, from - 4, to, "k", { inner: r - inner - 1, taper: true })
  c.arc(sh[0], sh[1], r, from, to, key || "H", { inner: r - inner, taper: true })
  c.arc(sh[0], sh[1], r - inner + 1, from + (to - from) * 0.5, to, "G")
}
// Three ways of carrying the sword: at rest (f.hi and f.low unset) the forearm comes out of the fur
// and the blade stands beside the helm; raised (f.hi: wind-up, the blade over the head) the arm is
// in front of the fur; low (f.low: the cut and its follow-through) the arm and blade are put in
// under the fur and the shield, so only the forearm, fist and blade show and nothing crosses the shield.
function figure(c, f) {
  const ux = f.ux, uy = f.uy
  const hand = f.hand, elbow = f.elbow
  const sh = [SH[0] + ux, SH[1] + uy]
  const hy = f.hy || 0
  // behind: the far wing, the legs, the torso
  c.stamp("_wingfar", 11 + ux, 7 + uy + hy)
  leg(c, 20, 28, f.far[0], f.far[1], true)
  leg(c, 25, 28, f.near[0], f.near[1], false)
  c.stamp("_torso", 18 + ux, 21 + uy)
  if (f.low) {
    if (f.smear) smear(c, f, sh)
    sword(c, hand[0], hand[1], f.deg, f.len); armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1])
  } else if (!f.hi) limb(c, sh[0] - 1, sh[1] + 1, 1.4, hand[0], hand[1], 1.2, "abcd")   // the forearm, its root under the fur
  mantle(c, ux, uy)
  shield(c, 28 + ux + (f.sx || 0), 22 + uy + (f.sy || 0))
  if (f.smear && !f.low) smear(c, f, sh)
  if (f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len)
  if (f.helmOverArm) armIn(c, sh, elbow, hand)
  c.stamp("_wing", 9 + ux, 7 + uy + hy)
  c.stamp("_helm", 19 + ux, 8 + uy + hy)
  if (f.helmOverArm) { limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "abcd"); fist(c, hand[0], hand[1]) }
  else if (f.hi) { sword(c, hand[0], hand[1], f.deg, f.len); armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1]) }
  else if (!f.low) { sword(c, hand[0], hand[1], f.deg, f.len, f.glint ?? -1); fist(c, hand[0], hand[1]) }
  if (f.shards) shards(c, f.shards)
}

// ---------------------------------------------------------------- the moves
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0],
    hand: [34, 20 + uy], elbow: [32, 22 + uy],
    deg: -68, len: 11, glint: [-1, 0, 3, 6, 9, -1, -1, -1][i],
  }
})
const GAIT = [[4, 0], [3, 0], [1, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i]
  return {
    ux: 0, uy, hy: 0, near: GAIT[i], far: GAIT[(i + 4) % 8],
    hand: [34, 20 + uy], elbow: [32, 22 + uy],
    deg: -68, len: 11,
  }
})
const ATTACK = [
  { ux: -1, uy: 0, near: [2, 0], far: [-2, 0], hand: [28, 7], elbow: [33, 13], deg: -150, len: 11, swordBehind: true, helmOverArm: true, hi: true },
  { ux: 0, uy: 0, near: [3, 0], far: [-3, 0], hand: [35, 13], elbow: [34, 17], deg: -62, len: 10, smear: [-150, -65, 5], smearMax: 16, hi: true,
    shards: [[8, 12, "d"], [11, 5, "s"], [15, 3, "d"], [6, 17, "s"]] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [37, 22], elbow: [35, 21], deg: 18, len: 9, smear: [-75, 36, 8], smearMax: 15, low: true, sx: -2,
    shards: [[40, 7, "d"], [43, 12, "s"], [39, 4, "s"], [42, 29, "d"]] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [38, 26], elbow: [35, 23], deg: 50, len: 8, low: true, sx: -3,
    shards: [[43, 21, "d"], [41, 31, "s"], [44, 26, "s"], [38, 35, "d"]] },
  { ux: 0, uy: 0, near: [2, 0], far: [-2, 0], hand: [37, 25], elbow: [34, 23], deg: 8, len: 8, low: true, sx: -2,
    shards: [[42, 31, "s"], [43, 24, "d"]] },
  { ux: 0, uy: 0, near: [1, 0], far: [-1, 0], hand: [35, 22], elbow: [32, 22], deg: -45, len: 11, low: true, sx: -1,
    shards: [[41, 28, "s"]] },
]
const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
const fig = (list) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, list[c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(IDLE))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(WALK))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(ATTACK))
anim("knight_d", { ...BOX, frames: 22, fps: 10 }, fig(ALL))
