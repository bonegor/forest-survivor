// Knight B for Forest Survivor: a knight-errant in blued steel. A flat-topped great helm with a
// T-visor, a top ridge and angular cheek plates, a gold ("or") tabard with a navy chevron, a navy
// kite shield with the gold chevron and a brass boss slung on his back, a broad longsword in guard.
// 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build knight-b.px.js, then copy anims/knight_b.png to the sheet.
pal({
  k: "#181425",                                                        // ink (the cast's outline)
  n: "#1f2840", b: "#33466e", s: "#52699a", S: "#839fcb", w: "#d3e4f6",  // blued steel
  c: "#8fd3e6",                                                        // cool rim light on steel
  N: "#191d4a", m: "#283785", M: "#3f55b8",                            // navy cloth and enamel
  O: "#7a3b1b", o: "#bd7223", y: "#e9ae3e", Y: "#fde189",              // gold tabard and brass
  L: "#4b2c24", l: "#7a4a31",                                          // leather: belt, grip
  v: "#9fb2c9", W: "#eef4fa",                                          // the blade; the smear
})
ramps("knbsSw", "kNmM", "kOoyY", "kLl", "kvW")

const PART = { outline: "k", pivot: [0, 0] }

// ---------------------------------------------------------------- parts (grids, fill at 0,0)
// The great helm, 10x10, in 3/4 facing right. The flat top catches the light, with a raised
// ridge front to back; the side plate (left) in mid steel with a cool rim on its back edge and a
// rivet; the bright vertical where side turns to face; the face plate with a brass brow, the
// eye slit and the breath slit (the T), breath holes, and the cheek plates cut in at an angle.
sprite("_helm", PART, `
  .cSSwwSs.
  cSSSwwSSs
  cbssSwSSs
  bbssSyyyo
  nbssSkkkk
  nbssSwSks
  nbssSwSks
  nbbsSwSkb
  .nbbsSSsb
  ..nnbbbn.`)

// The torso, 12x11: the back plate in shade with a rim, the gold tabard with folds and its navy
// chevron, the near side under the arm, a belt with a brass buckle (it dips at the front), then
// the skirt: the tabard's front panel in folds between steel faulds.
sprite("_torso", PART, `
  ..nbsSSSsb..
  cnbOyYYyyosb
  nnbOyMyYyosb
  nnbOMNMyyosb
  nnbMNyNMyosb
  nnbNyYyNoonb
  nnbOoyYyyonb
  .LLLllLLyoLL
  nbsOyYoyYOsb
  nbnOyYoyYOnb
  .nbOoYOyoO..`)

// The kite shield on his back, 9x14: a steel rim lit on its top, the navy enamel darker to the
// left, the gold chevron, a brass boss.
sprite("_shield", PART, `
  .cSSwSSs.
  cSMMMMMmS
  sMMMMMMms
  sMmMyMmms
  smMyoyMms
  smyoMoyms
  syoMmMoys
  .omMSMmo.
  .snmwmms.
  ..snmmb..
  ..snNmb..
  ...snb...
  ...sNb...
  ....b....`)

// The near arm at rest (idle and walk), 8x11: the pauldron in three lames, the arm down past
// the couter, the vambrace forward, the gauntlet closed on the grip.
sprite("_arm", PART, `
  .cSwwS..
  cSSSwSs.
  sSSSSSsb
  nbbbbbbn
  .bsSSsb.
  ..bsSb..
  ..bSwSb.
  ..nbsSSs
  ...nbSws`)

// The sabaton, toes to the right: a lit top, a dark sole.
sprite("_foot", PART, `
  bsSw.
  nbbsS`)

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "nbsS", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
// A leg from the hip, its ankle dx along and lifted by `lift`; `far` is the darker far leg.
// The knee carries a cop with a highlight; the greave a spec line.
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "nbs" : "bsSw"
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
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { w: "s", S: "s", s: "b", b: "n" } } : {})
  paint("fill")
  // knee cop: a lit pixel on its front, a dark one under it
  const kxr = Math.round(kx), kyr = Math.round(ky)
  c.px(kxr, kyr, far ? "s" : "w")
  c.px(kxr, kyr + 1, far ? "n" : "b")
}
// The longsword: its hand at (hx, hy), pointing `deg` (clockwise from right), `len` px of blade.
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
  seg(P(-3), P(-1), "l")                           // grip
  put(...P(-3), "y")                               // pommel
  put(...P(-4), "o")
  seg(P(2), P(len), "v")                           // blade, its lit edge toward the light
  seg(P(2, ...up), P(len - 1, ...up), "W")
  seg(P(2, -up[0], -up[1]), P(len - 2, -up[0], -up[1]), "s")   // the broad blade's shaded flat
  put(...P(2), "s")                                // the ricasso's fuller in shade by the guard
  if (glint >= 0) put(...P(3 + glint, ...up), "w")
  const g = P(1), n = [-u[1], u[0]]                // the cross-guard, square to the blade
  seg([g[0] - n[0] * 2.6, g[1] - n[1] * 2.6], [g[0] + n[0] * 2.6, g[1] + n[1] * 2.6], "o")
  put(g[0] - Math.round(n[0] * 2.6), g[1] - Math.round(n[1] * 2.6), "y")
  put(g[0], g[1], "y")
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) c.px(x, y, k)
}
// A gauntlet closed round the grip: knuckles lit, the fingers' underside dark.
function fist(c, x, y) {
  c.rect(x - 2, y - 1, 5, 3, "k"); c.rect(x - 1, y - 2, 3, 5, "k")
  c.rect(x - 1, y - 1, 3, 3, "s")
  c.px(x - 1, y - 1, "S"); c.px(x, y - 1, "w"); c.px(x + 1, y - 1, "S")
  c.px(x - 1, y + 1, "n"); c.px(x, y + 1, "b"); c.px(x + 1, y + 1, "b")
}
// The near arm in action: pauldron, upper arm, couter, vambrace, gauntlet.
function armIn(c, sh, elbow, hand) {
  limb(c, sh[0], sh[1] + 1, 1.5, elbow[0], elbow[1], 1.3, "nbsSw")
  limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "nbsSw")
  c.px(Math.round(elbow[0]), Math.round(elbow[1]), "w")   // the couter's highlight
  c.stamp("_pauldron", sh[0] - 2, sh[1] - 1)
}
sprite("_pauldron", PART, `
  .cSwS.
  cSSwSs
  sSSSsb
  nbbbbn`)

// One frame. f: { ux, uy (upper body offset), hy (helm extra), near/far legs [dx, lift],
// hand [x, y], elbow [x, y], deg, len, smear [from, to, inner] | null, armOver, glint }
const SH = [28, 19]                                // near shoulder (at rest)
const FSH = [19, 20]                               // far shoulder
function figure(c, f) {
  const ux = f.ux, uy = f.uy
  const hand = f.hand, elbow = f.elbow
  const sh = [SH[0] + ux, SH[1] + uy]
  // behind: the shield, the far arm, the legs
  c.stamp("_shield", 9 + ux, 16 + uy)
  limb(c, FSH[0] + ux, FSH[1] + uy, 1.3, f.farHand[0], f.farHand[1], 1.1, "knbs")
  leg(c, 20, 28, f.far[0], f.far[1], true)
  leg(c, 25, 28, f.near[0], f.near[1], false)
  c.stamp("_torso", 18 + ux, 18 + uy)
  if (f.smear) {
    const [from, to, inner, key] = f.smear
    const tx = hand[0] + Math.cos(f.deg * R) * f.len, ty = hand[1] + Math.sin(f.deg * R) * f.len
    const r = Math.min(f.smearMax || 19, Math.round(Math.hypot(tx - sh[0], ty - sh[1])))
    c.arc(sh[0], sh[1], r + 1, from - 4, to, "k", { inner: r - inner - 1, taper: true })
    c.arc(sh[0], sh[1], r, from, to, key || "W", { inner: r - inner, taper: true })
    c.arc(sh[0], sh[1], r - inner + 1, from + (to - from) * 0.5, to, "v")
  }
  if (f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len)
  if (f.helmOverArm) armIn(c, sh, elbow, hand)        // the wind-up: the helm in front of the upper arm
  c.stamp("_helm", 20 + ux, 8 + uy + (f.hy || 0))
  if (f.helmOverArm) { limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "nbsSw"); c.px(elbow[0], elbow[1], "w"); fist(c, hand[0], hand[1]) }
  else if (f.rest) { c.stamp("_arm", 26 + ux, 18 + uy); sword(c, hand[0], hand[1], f.deg, f.len, f.glint ?? -1); fist(c, hand[0], hand[1]) }
  else {
    if (!f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len, f.glint ?? -1)
    armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1])
  }
}

// ---------------------------------------------------------------- the moves
// Idle: a slow breath; the chest, arms and sword sink a pixel on f3-5, the helm a frame later
// (f4-6); a glint runs up the blade on f1-4.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0],
    hand: [33, 27 + uy], elbow: [30, 25 + uy], farHand: [18, 26 + uy],
    rest: true, deg: -45, len: 12, glint: [-1, 0, 3, 6, 9, -1, -1, -1][i],
  }
})
// Walk: per leg [dx, lift] by phase; the far leg half a cycle on.
const GAIT = [[3, 0], [2, 0], [1, 0], [-2, 0], [-3, 1], [-2, 2], [0, 2], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i], sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    ux: 0, uy, hy: 0, near: GAIT[i], far: GAIT[(i + 4) % 8],
    hand: [33, 27 + uy], elbow: [30, 25 + uy], farHand: [18 + sw, 26 + uy],
    rest: true, deg: -45, len: 12,
  }
})
// Attack (13 fps): wind-up overhead, the cut over the top and down in front, follow-through
// low, recover, back toward guard.
const ATTACK = [
  { ux: -1, uy: 0, near: [2, 0], far: [-2, 0], hand: [28, 7], elbow: [33, 13], farHand: [17, 25], deg: -150, len: 11, swordBehind: true, helmOverArm: true },
  { ux: 0, uy: 0, near: [3, 0], far: [-3, 0], hand: [33, 12], elbow: [32, 16], farHand: [18, 25], deg: -60, len: 11, smear: [-150, -65, 5], smearMax: 16 },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [35, 21], elbow: [32, 20], farHand: [19, 26], deg: 15, len: 9, smear: [-75, 30, 8] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [33, 28], elbow: [32, 23], farHand: [19, 26], deg: 60, len: 10 },
  { ux: 0, uy: 0, near: [2, 0], far: [-2, 0], hand: [33, 27], elbow: [31, 24], farHand: [18, 26], deg: 5, len: 11 },
  { ux: 0, uy: 0, near: [1, 0], far: [-1, 0], hand: [32, 26], elbow: [30, 24], farHand: [18, 26], deg: -30, len: 12 },
]
const ALL = [...IDLE, ...WALK, ...ATTACK]
// Every piece carries its own 1 px ink, so the frame takes no outline of its own.
const BOX = { w: 48, h: 48 }
const fig = (list) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, list[c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(IDLE))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(WALK))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(ATTACK))
anim("knight_b", { ...BOX, frames: 22, fps: 10 }, fig(ALL))
