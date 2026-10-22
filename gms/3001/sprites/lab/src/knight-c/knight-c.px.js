// Knight C, the Ember Knight, for Forest Survivor: a hot-headed young knight forged in a volcano.
// Crimson plate and blackened brass with glowing orange seams, a rounded sallet whose crest is a
// living flame, a big glowing eye-slit, a scorched half-cape, no shield, one broad flamberge whose
// edge glows ember-orange. 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
// What glows (emissive: Q a A F) is used ONLY for flame, seams, eye, blade edge, sparks and the smear.
// Build: node <pxl>/bin/pxl.js build knight-c.px.js, then tools (make-sheet.mjs) lay the glow rows.
pal({
  k: "#181425",                                                          // ink (the cast's outline)
  R: "#46112a", r: "#8a2133", C: "#d03a3a", c: "#f2653f", h: "#ffb07a",   // crimson plate
  u: "#241422", U: "#5c2f33", j: "#99602e", J: "#dd9c3e", H: "#ffdb8a",   // blackened brass
  Q: "#d9391a", a: "#ff6a1a", A: "#ffa83a", F: "#ffe58c",                  // fire: GLOWS
  m: "#2c1d36", M: "#4f3150", N: "#82504f",                                // scorched cape
  L: "#4b2c24", l: "#7a4a31",                                              // leather: grip, straps
  v: "#322a33", V: "#5f5159", W: "#9a8b90",                                // the blade's dark iron
})
ramps("kRrCch", "kuUjJH", "kmMN", "kLl", "kvVW", "kQaAF")

const PART = { outline: "k", pivot: [0, 0] }

// ---------------------------------------------------------------- parts (grids, fill at 0,0)
// The sallet, 11x10, 3/4 facing right. A brass crest socket on top (the flame rises from it), a
// rounded crimson dome lit from above and a little to the front, a brass brow band, the big
// glowing eye-slit (A F A over an a), cheek guards in brass and the sallet's tail flaring at the
// back (left).
sprite("_helm", PART, `
  ...UjJjU...
  ..UjJHJjjU.
  .UjJHHJJjjU
  UUjjJJJJJjj
  UjjjjJJJJJH
  UuUuuaAuaAu
  UuUuuuFuuFu
  .UjUuuuuUUu
  ..UjjJjjUu.
  ...uUjjuu..`)

// The torso, 11x11: crimson breastplate with a glowing seam cracked down it, a brass gorget and
// belt with a glowing buckle, then the tassets (skirt plates) with a hot edge.
sprite("_torso", PART, `
  ..uUJJUu..
  .RrCchccr.
  RrCChhcccr
  RrCCcAaccr
  RrCcaFacCr
  RrCCcaCcCr
  RrCCCcaCCr
  uUjJFFJjUu
  RrCcCaCcCr
  .rCCr.rCr.`)

// The near arm at rest, 8x10: a round crimson pauldron with a brass rim and a hot seam, the
// arm down past a brass couter, the vambrace and a brass gauntlet.
sprite("_arm", PART, `
  ..uJJju.
  .rCchhcr
  rCChhccC
  RrCcaccr
  .uUjJUu.
  ..RrCr..
  ..RrCc..
  ..uUjJ..
  ...uUJj`)

// The sabaton, toes to the right: crimson top, brass toecap, dark sole.
sprite("_foot", PART, `
  rCcJ.
  uuUjH`)

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "RrCc", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
// A leg from the hip, its ankle dx along and lifted by `lift`; `far` is the darker far leg.
// Crimson greave, a blackened-brass knee cop.
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "RrC" : "rCch"
  const ax = hx + dx, ay = 35 - lift
  let kx = (hx + ax) / 2, ky = 32
  const paint = (part) => {
    if (lift > 0) {
      kx = hx + Math.max(dx, 0) + 1; ky = 32 - lift
      limb(c, hx, hy, 1.5, kx, ky, 1.3, ramp, part)
      limb(c, kx, ky, 1.3, ax, ay, 1.1, ramp, part)
    } else limb(c, hx, hy, 1.5, ax, ay, 1.2, ramp, part)
  }
  paint("ink")
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { r: "R", C: "r", c: "r", J: "j", H: "J", j: "U", U: "u" } } : {})
  paint("fill")
  const kxr = Math.round(kx), kyr = Math.round(ky)
  // brass knee cop: a 2x2 round cop, lit top-left, shaded bottom-right
  c.px(kxr, kyr, far ? "J" : "H"); c.px(kxr + 1, kyr, far ? "j" : "J")
  c.px(kxr, kyr + 1, far ? "U" : "j"); c.px(kxr + 1, kyr + 1, far ? "u" : "U")
}

// The flame crest: tongues rising from the socket at (bx, by), streaming back (left) by `lean`,
// flickering with phase p. Q on the edges, then a, A, and F in the hot heart.
const TONGUES = [
  { dx: -1, h: 8, w: 4, lean: -3.5, ph: 0 },
  { dx: -3, h: 6, w: 3, lean: -4.5, ph: 2.1 },
  { dx: 1, h: 6, w: 3, lean: -2.0, ph: 4.0 },
  { dx: -5, h: 4, w: 2, lean: -3.5, ph: 1.0 },
]
function flame(c, bx, by, p, lean = 0, boost = 0) {
  for (const t of TONGUES) {
    const h = Math.max(3, Math.round(t.h + boost + Math.sin(p + t.ph) * 1.6))
    const sway = Math.sin(p * 1 + t.ph * 1.7) * 1.1
    for (let r = 0; r < h; r++) {
      const f = r / h
      const wr = Math.max(1, Math.round(t.w * (1 - f * 0.85)))
      const cx = Math.round(bx + t.dx + (t.lean + lean) * Math.pow(f, 1.3) + sway * f)
      const x0 = cx - Math.floor(wr / 2), y = by - r
      for (let i = 0; i < wr; i++) {
        const edge = i === 0 || i === wr - 1
        let k = f < 0.28 ? "F" : f < 0.55 ? "A" : f < 0.82 ? "a" : "Q"
        if (edge && wr > 1) k = k === "F" ? "A" : k === "A" ? "a" : "Q"
        if (r === h - 1) k = "Q"
        c.px(x0 + i, y, k)
      }
    }
  }
}
// Sparks rising off the crest: [x, y, key] picked by the frame.
function sparks(c, list) { for (const [x, y, k] of list) c.px(x, y, k) }

// The flamberge: its hand at (hx, hy), pointing `deg` (clockwise from right), `len` px of blade.
// A broad cleaver of dark iron, the edge facing up the swing glows in a wave (the flame blade's
// kinks), a brass guard with a quillon curling toward the blade, a leather grip, a brass pommel.
function sword(c, hx, hy, deg, len = 13, pulse = 0) {
  const u = [Math.cos(deg * R), Math.sin(deg * R)]
  const n = [-u[1], u[0]]
  const up = n[1] <= 0 ? n : [-n[0], -n[1]]       // the normal that points up-screen: the glowing edge's side
  const P = (r, o = 0) => [Math.round(hx + u[0] * r + up[0] * o), Math.round(hy + u[1] * r + up[1] * o)]
  const pts = new Map()
  const put = (x, y, k) => pts.set(x + "," + y, [x, y, k])
  const seg = (a, b, k) => {
    const m = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
    for (let i = 0; i <= m; i++) put(Math.round(a[0] + ((b[0] - a[0]) * i) / (m || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (m || 1)), k)
  }
  seg(P(-3), P(-1), "l")                           // grip
  put(...P(-4), "J")                               // pommel
  // blade: a broad double-edged flamberge. A two-px core of dark iron (a shaded flat and a lit
  // one), a thin ember edge behind, a bright edge in front that bulges out in the flame blade's
  // kinks. The tip is a glowing point.
  for (let r = 2; r <= len; r++) {
    const left = len - r              // px to the tip
    const bulge = Math.sin(r * 1.3) > 0.35 && left > 2
    if (left > 2) {
      put(...P(r, -1), "a"); put(...P(r, 0), "V"); put(...P(r, 1), "v"); put(...P(r, 2), "a")
      put(...P(r, 3), (r + pulse * 2) % 8 === 0 ? "F" : "A")
      if (bulge) put(...P(r, 4), "a")
    } else if (left === 2) { put(...P(r, 0), "V"); put(...P(r, 1), "v"); put(...P(r, 2), "a"); put(...P(r, 3), "A") }
    else if (left === 1) { put(...P(r, 0), "V"); put(...P(r, 1), "A"); put(...P(r, 2), "A") }
    else put(...P(r, 1), "A")
  }
  put(...P(len + 1, 1), "F")
  seg(P(0, -3), P(0, 4), "J")                      // guard
  put(...P(1, 4), "H"); put(...P(1, -3), "j")       // the quillons curl toward the blade
  put(...P(0, 5), "j")
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) c.px(x, y, k)
}
// A gauntlet closed round the grip: brass, knuckles lit.
function fist(c, x, y) {
  c.rect(x - 2, y - 1, 5, 3, "k"); c.rect(x - 1, y - 2, 3, 5, "k")
  c.rect(x - 1, y - 1, 3, 3, "j")
  c.px(x - 1, y - 1, "J"); c.px(x, y - 1, "H"); c.px(x + 1, y - 1, "J")
  c.px(x - 1, y + 1, "u"); c.px(x, y + 1, "U"); c.px(x + 1, y + 1, "U")
}
// The near arm in action: pauldron, upper arm, couter, vambrace, gauntlet.
function armIn(c, sh, elbow, hand) {
  limb(c, sh[0], sh[1] + 1, 1.8, elbow[0], elbow[1], 1.6, "RrCch")
  limb(c, elbow[0], elbow[1], 1.6, hand[0], hand[1], 1.4, "RrCch")
  { const cx = Math.round(elbow[0] + (hand[0] - elbow[0]) * 0.62), cy = Math.round(elbow[1] + (hand[1] - elbow[1]) * 0.62)
    c.px(cx, cy, "J"); c.px(cx + 1, cy, "j"); c.px(cx, cy + 1, "j") }       // a brass bracer above the fist
  c.px(Math.round(elbow[0]), Math.round(elbow[1]), "H")   // the couter's highlight
  c.stamp("_pauldron", sh[0] - 3, sh[1] - 2)
}
sprite("_pauldron", PART, `
  .rCchc.
  rCChhcC
  RrCaccr
  uUjJjUu`)

// The scorched half-cape: hangs from the shoulders behind, ragged at the hem, burnt through with
// embers at its edge. `sway` (px) swings its hem; `lift` kicks it out (walk and cut).
function cape(c, ux, uy, sway, lift) {
  const x0 = 13 + ux, x1 = 20 + ux
  const cols = []
  for (let x = x0; x <= x1; x++) {
    const t = (x1 - x) / (x1 - x0)                   // 1 at the far (back) edge, 0 at the neck
    const top = Math.round(19 + uy + t * 3)           // the shoulder line slopes down toward the back
    const hem = Math.round(28 + uy - lift * 2 + t * 4 + (hash(x, 3) > 0.55 ? 1 : 0) + sway * t * 1.3)
    cols.push([x, top, hem])
  }
  const shape = new Map()
  for (const [x, top, hem] of cols) for (let y = top; y <= hem; y++) shape.set(x + "," + y, [x, y])
  for (const [x, y] of shape.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!shape.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, top, hem] of cols) {
    for (let y = top; y <= hem; y++) {
      const t = (x1 - x) / (x1 - x0)
      let k = t > 0.75 ? "m" : t > 0.35 ? "M" : "N"
      if ((x + (y >> 1)) % 3 === 0 && y > top + 2 && y < hem - 1) k = k === "N" ? "M" : "m"   // a fold
      c.px(x, y, k)
    }
    if (hash(x, 9) > 0.4) c.px(x, hem, "Q")            // burnt hem: embers in the cloth's edge
    if (hash(x, 5) > 0.7) c.px(x, hem - 1, "a")
  }
}

// One frame. f: { ux, uy (upper body offset), hy (helm extra), near/far legs [dx, lift],
// hand [x, y], elbow [x, y], farHand [x, y], deg, len, smear, ph (flame phase), lean, boost,
// pulse (blade-edge phase), sparks, swordBehind, helmOverArm, rest }
const SH = [28, 20]                                // near shoulder (at rest)
const FSH = [19, 21]                               // far shoulder
function figure(c, f) {
  const ux = f.ux, uy = f.uy
  const hand = f.hand, elbow = f.elbow
  const sh = [SH[0] + ux, SH[1] + uy]
  const hx = 19 + ux, hy = 9 + uy + (f.hy || 0)
  cape(c, ux, uy, f.sway || 0, f.lift || 0)
  // the far arm: fist on the hip, the elbow cocked out behind (the swagger)
  limb(c, FSH[0] + ux, FSH[1] + uy, 1.4, f.farElbow[0], f.farElbow[1] + uy, 1.3, "RrC")
  limb(c, f.farElbow[0], f.farElbow[1] + uy, 1.3, f.farHand[0], f.farHand[1] + uy, 1.2, "RrC")
  leg(c, 20, 27, f.far[0], f.far[1], true)
  leg(c, 25, 27, f.near[0], f.near[1], false)
  c.stamp("_torso", 19 + ux, 19 + uy)
  if (f.smear) {
    const [from, to, inner, key] = f.smear
    const tx = hand[0] + Math.cos(f.deg * R) * f.len, ty = hand[1] + Math.sin(f.deg * R) * f.len
    const r = Math.min(f.smearMax || 19, Math.round(Math.hypot(tx - sh[0], ty - sh[1])))
    c.arc(sh[0], sh[1], r + 1, from - 4, to, "Q", { inner: r - inner - 1, taper: true })
    c.arc(sh[0], sh[1], r, from, to, key || "a", { inner: r - inner, taper: true })
    c.arc(sh[0], sh[1], r - 1, from + (to - from) * 0.35, to, "A", { inner: Math.max(0, r - inner + 1), taper: true })
    c.arc(sh[0], sh[1], r - 2, from + (to - from) * 0.7, to, "F", { inner: Math.max(0, r - inner + 3), taper: true })
  }
  if (f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len, f.pulse || 0)
  if (f.helmOverArm) armIn(c, sh, elbow, hand)
  c.stamp("_helm", hx, hy)
  flame(c, hx + 6, hy, f.ph, f.lean || 0, f.boost || 0)
  if (f.swordFront) sword(c, hand[0], hand[1], f.deg, f.len, f.pulse || 0)
  if (f.helmOverArm) { limb(c, elbow[0], elbow[1], 1.3, hand[0], hand[1], 1.2, "RrCch"); c.px(elbow[0], elbow[1], "J"); fist(c, hand[0], hand[1]) }
  else if (f.rest) { sword(c, hand[0], hand[1], f.deg, f.len, f.pulse || 0); armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1]) }
  else {
    if (!f.swordBehind) sword(c, hand[0], hand[1], f.deg, f.len, f.pulse || 0)
    armIn(c, sh, elbow, hand); fist(c, hand[0], hand[1])
  }
  if (f.sparks) sparks(c, f.sparks)
}

// ---------------------------------------------------------------- the moves
const TAU = Math.PI * 2
// Idle: a smouldering swagger. A slow breath (the chest sinks a pixel on f3-5, the helm a frame
// later), the flame guttering through the whole loop, the sword hanging low and forward with its
// edge pulsing, two sparks floating up off the crest.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  const sp = []
  // spark 1 rises 8 frames (x drifts), spark 2 half a cycle behind
  const s1 = i, s2 = (i + 4) % 8
  const sx = (n, ph) => 26 + Math.round(Math.sin(ph * 0.9 + n) * 2)
  sp.push([sx(0, s1) - 2, 5 - Math.floor(s1 * 0.5), s1 < 3 ? "A" : s1 < 6 ? "a" : "Q"])
  sp.push([sx(2, s2) + 1, 5 - Math.floor(s2 * 0.5), s2 < 3 ? "A" : s2 < 6 ? "a" : "Q"])
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0],
    hand: [32, 28 + uy], elbow: [30, 26 + uy], farHand: [20, 28], farElbow: [16, 26],
    rest: true, deg: 28, len: 12, ph: (i / 8) * TAU, pulse: i, sparks: sp,
  }
})
// Walk: per leg [dx, lift] by phase; the far leg half a cycle on.
const GAIT = [[3, 0], [2, 0], [1, 0], [-2, 0], [-3, 1], [-2, 2], [0, 2], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i], sw = [-1, 0, 1, 1, 0, -1, -2, -2][i]
  return {
    ux: 0, uy, hy: 0, near: GAIT[i], far: GAIT[(i + 4) % 8],
    hand: [32, 28 + uy], elbow: [30, 26 + uy], farHand: [20, 28], farElbow: [16, 26],
    rest: true, deg: 28 - [0, 0, 1, 2, 0, 0, 1, 2][i] * 3, len: 12, ph: (i / 8) * TAU * 2, pulse: i, sway: sw, lean: -1, lift: [0, 0, 0, 0, 0, 1, 1, 0][i],
    sparks: [[24 - i % 4, 6 - (i % 4), i % 2 ? "a" : "A"]],
  }
})
// Attack (13 fps): a flaring wind-up behind the shoulder, the cut over the top in a blazing arc,
// follow-through low in a gout of sparks, recover.
const ATTACK = [
  { ux: -1, uy: 0, near: [2, 0], far: [-2, 0], hand: [32, 12], elbow: [34, 17], farHand: [17, 26], farElbow: [15, 25], deg: -82, len: 9, ph: 0.5, boost: -1, lean: -4, sway: -2, lift: 0, pulse: 1 },
  { ux: 0, uy: 0, near: [3, 0], far: [-3, 0], hand: [34, 15], elbow: [33, 18], farHand: [18, 26], farElbow: [15, 25], deg: -35, len: 11, smear: [-105, -38, 8], smearMax: 16, ph: 2.5, boost: 0, lean: -5, sway: 3, lift: 1, pulse: 2 },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [33, 22], elbow: [32, 21], farHand: [19, 26], farElbow: [16, 26], deg: 12, len: 10, smear: [-75, 30, 8], smearMax: 15, ph: 4.2, boost: 3, lean: -4, sway: 4, lift: 1, pulse: 3, sparks: [[44, 27, "A"], [43, 31, "a"], [41, 33, "F"]] },
  { ux: 1, uy: 1, near: [4, 0], far: [-3, 0], hand: [33, 28], elbow: [32, 24], farHand: [19, 27], farElbow: [16, 26], deg: 52, len: 10, ph: 5.5, boost: 1, lean: -3, sway: 2, lift: 0, pulse: 4, sparks: [[42, 34, "a"], [37, 36, "A"], [40, 30, "Q"]] },
  { ux: 0, uy: 0, near: [2, 0], far: [-2, 0], hand: [32, 28], elbow: [30, 25], farHand: [19, 27], farElbow: [16, 26], deg: 28, len: 11, rest: true, ph: 0.2, boost: 0, lean: -1, sway: 1, lift: 0, pulse: 5 },
  { ux: 0, uy: 0, near: [1, 0], far: [-1, 0], hand: [32, 28], elbow: [30, 26], farHand: [20, 28], farElbow: [16, 26], deg: 28, len: 11, rest: true, ph: 1.4, boost: 0, lean: 0, sway: 0, lift: 0, pulse: 6 },
]
const ALL = [...IDLE, ...WALK, ...ATTACK]
// Every piece carries its own 1 px ink, so the frame takes no outline of its own.
const BOX = { w: 48, h: 48 }
const fig = (list) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, list[c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(IDLE))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(WALK))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(ATTACK))
anim("knight_c", { ...BOX, frames: 22, fps: 10 }, fig(ALL))
