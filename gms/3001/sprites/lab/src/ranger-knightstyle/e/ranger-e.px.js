// Lyra the Ranger, "Knight style E (Hooded Pokémon)": built on Style B (the sweeping cape, the lean, the
// slim build, the release burst, every edge a dark tone of its own material, no black outline), with
// her ranger's hood up (its pointed tail flowing with the cape) and drawn a bit toward a Gen 4-5
// Pokémon trainer sprite: a rounder, larger head, a big bright eye, clean 3-4 tone colour blocks.
// 88 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-23 (release on 21),
// attackWalk 24-87 (attack pose k over walk step j at 24 + 8k + j). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build ranger-e.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/ranger_e.png <sheet>   (adds the glow rows)
pal({
  // forest green (hood, cape, tunic): blue-black edge, shadow, base, light, highlight
  A: "#0c2b2c", B: "#145a3e", C: "#1f8c4a", D: "#47bf55", E: "#a2ea6c",
  // linen (the tunic and sleeves under the green)
  c: "#6e4f4c", d: "#c4a693", e: "#efdcc0", i: "#fff8ea",
  // silver hair: violet shadow, cool-pink light
  U: "#3d3566", h: "#857cb5", H: "#c4bde6", j: "#f6f2ff",
  // skin
  K: "#8c3f48", f: "#e0876c", F: "#fcc39e", p: "#ffe7d0", r: "#f59a8c",
  // leather and bow wood
  L: "#331820", m: "#6b3428", N: "#a35a2e", o: "#dc9550",
  // the warm accent: amber to gold
  Z: "#7a2a10", y: "#e07a1e", Y: "#ffbf36", Q: "#fff3a8",
  // eye, string, arrowhead glow, white
  x: "#1c2350", X: "#28c2a6", s: "#efe5d2", g: "#b6ffdc", W: "#ffffff", w: "#efe9f7", v: "#b9acd8",
})
ramps("UhHj", "KfFp", "ABCDE", "LmNo", "ZyYQ", "vwW", "cdei")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those
// with a 4-neighbour outside the part) step darker along their own ramp. So nothing has a black
// line: the silhouette and every part laid over another are edged in their own darkest tones.
const RAMP = ["UhHj", "KfFp", "ABCDE", "LmNo", "ZyYQ", "vwW", "cdei"]
const darker = (k, n) => {
  for (const c of RAMP) { const i = c.indexOf(k); if (i >= 0) return c[Math.max(0, i - n)] }
  return k
}
class Part {
  constructor() { this.m = new Map() }
  px(x, y, k) { if (k && k !== ".") this.m.set(Math.round(x) + "," + Math.round(y), k); return this }
  get(x, y) { return this.m.get(x + "," + y) }
  grid(x0, y0, str) {
    str.split("\n").map((r) => r.trim()).filter((r) => r).forEach((r, j) => [...r].forEach((k, i) => this.px(x0 + i, y0 + j, k)))
    return this
  }
  // A round limb from a to b, radius ra to rb, lit from above-left: `ramp` dark to light.
  limb(a, b, ra, rb, ramp, light = [-0.45, -1]) {
    const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L
    const x0 = Math.floor(Math.min(a[0] - ra, b[0] - rb)) - 1, x1 = Math.ceil(Math.max(a[0] + ra, b[0] + rb)) + 1
    const y0 = Math.floor(Math.min(a[1] - ra, b[1] - rb)) - 1, y1 = Math.ceil(Math.max(a[1] + ra, b[1] + rb)) + 1
    const dx = b[0] - a[0], dy = b[1] - a[1], dd = dx * dx + dy * dy || 1
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / dd))
      const cx = a[0] + dx * t, cy = a[1] + dy * t, r = ra + (rb - ra) * t
      const ox = x - cx, oy = y - cy, d = Math.hypot(ox, oy)
      if (d > r + 0.2) continue
      const n = d < 0.01 ? 0 : (ox * -lx + oy * -ly) / d   // 1 facing the light
      const v = 0.5 + 0.62 * n * Math.sqrt(Math.min(1, d / Math.max(r, 0.5))) + 0.08
      const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
      this.px(x, y, ramp[q])
    }
    return this
  }
  // A flowing mass along a polyline (a cape's fall, the hood's tail): radius rs[i] at pts[i], lit
  // from `light`, darker toward its end (`fade`), with a fold highlight where `streak(T, s)` holds
  // (T 0..1 along it, s -1..1 across it, + on its left going down the line).
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, streak = null, lift = 0.08 } = {}) {
    const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L
    const seg = [], len = [0]
    for (let i = 0; i < pts.length - 1; i++) { seg.push([pts[i], pts[i + 1], rs[i], rs[i + 1]]); len.push(len[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])) }
    const total = len[len.length - 1] || 1, R = Math.max(...rs) + 1
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys) - R); y <= Math.ceil(Math.max(...ys) + R); y++)
      for (let x = Math.floor(Math.min(...xs) - R); x <= Math.ceil(Math.max(...xs) + R); x++) {
        let best = null
        seg.forEach(([a, b, ra, rb], i) => {
          const dx = b[0] - a[0], dy = b[1] - a[1], dd = dx * dx + dy * dy || 1
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / dd))
          const cx = a[0] + dx * t, cy = a[1] + dy * t, r = ra + (rb - ra) * t
          const ox = x - cx, oy = y - cy, d = Math.hypot(ox, oy)
          const m = d - r
          if (!best || m < best.m) best = { m, d, r, ox, oy, T: (len[i] + t * Math.sqrt(dd)) / total, s: (dx * oy - dy * ox) / Math.sqrt(dd) / Math.max(r, 0.5) }
        })
        if (best.m > 0.2) continue
        const n = best.d < 0.01 ? 0 : (best.ox * -lx + best.oy * -ly) / best.d
        let v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (streak && streak(best.T, -best.s) && q < ramp.length - 1) q++
        this.px(x, y, ramp[q])
      }
    return this
  }
}
// Lay a part on the frame. edge: steps darker for its boundary; open: a test (x, y, nx, ny) for
// boundary sides left light (a lit top meeting another part of the same body).
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KfFpr".includes(k) ? Math.min(edge, 1) : edge) : k)   // skin softens by one step only
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The hooded head, 13x10 at (17, 14) at rest, painted in its final tones (the hood's edge is its
// own darkest green): the hood's dome lit from the upper left, its brim over the forehead, a silver
// fringe and a lock framing the face, the face in 3/4 to the right with a big bright eye.
const HEAD = `
  ...ABBBBBA...
  .AABCDDEEDAA.
  ABCCDDDDDDDCA
  ABCCDCBBBBBBA
  ABCCCHjjjHjjH
  ABCCBHHjxxFxp
  ABCCBHFFWXFXp
  ABCCBhfrXXFFF
  .ABCBhfFFFFfF
  ..ABAA.fFFFf.`
// The long elf ear, poking out through a slit in the hood's side and laid back.
const EAR = [[1, 4, "p"], [2, 4, "F"], [2, 5, "f"], [3, 5, "F"], [4, 5, "F"], [3, 6, "f"], [4, 6, "f"]]
function head(F, x0, y0, ear = true) {
  lay(F, new Part().grid(x0, y0, HEAD), 0)
  if (ear) for (const [x, y, k] of EAR) F.set(x0 + x + "," + (y0 + y), k)
}

// The tunic, 10x8 at (18, 23) at rest: chest, a leather belt with a gold buckle, the skirt.
const TORSO = `
  ...deed...
  ..deiied..
  ..deiieed.
  ..ddeeedd.
  ..cdeeedc.
  ..mNNNYQ..
  ..deeeeed.`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 2, (x, y, dx, dy) => dy > 0)
}

// A leg: hip, knee, ankle; dark green trousers, a leather boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.6, 1.3, far ? "LL" : "Lm")
  P.limb(knee, ankle, 1.3, 1.15, far ? "mm" : "mNo")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 1, far ? "m" : "N"); P.px(kx, ky + 1, far ? "N" : "o"); P.px(kx + 1, ky + 1, far ? "m" : "N")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "m" : "N")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "m" : "N")
  lay(F, P, 2)
}

// An arm: shoulder, elbow, hand. A green sleeve to the elbow, a leather bracer, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.5, 1.3, far ? "BB" : "CDE")
  P.limb(el, hand, 1.2, 1.0, far ? "mm" : "mNo")
  P.limb(hand, hand, 1.1, 1.1, far ? "ff" : "fFp")
  lay(F, P, 2)
}

// The hood's mantle over the shoulders (the hood comes down into it and the cape hangs from it),
// in front of the tunic, with a gold clasp at the throat.
function mantle(F, ox, oy) {
  const P = new Part().grid(18 + ox, 22 + oy, `
    ..CDDD...
    .CDDEDDYQ
    BCDDDDCCy
    .BBCCB...`)
  lay(F, P, 2)
}

// The cape: two flowing lobes from the shoulders, the outer lit, the inner in shade.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.9, 2.2, 2.2, 1.7, 1.0, 0.3], "ABB", { light: [-0.5, -1], fade: 0.3, lift: 0.05 })
  P.strand(spine, [2.0, 2.5, 2.6, 2.2, 1.4, 0.4], "BCCD", { light: [-0.5, -1], fade: 0.35, lift: 0.1,
    streak: (T, s) => T > 0.2 && T < 0.6 && Math.abs(s - 0.4) < 0.22 })
  lay(F, P, 2)
}

// The hood's tail: a pointed liripipe from the back of the hood, flowing like a plume, gold tip.
function hoodTail(F, pts, rs) {
  const P = new Part()
  P.strand(pts, rs, "BCDD", { light: [-0.5, -1], fade: 0.35, lift: 0.15 })
  lay(F, P, 2)
}

// The longbow, held at its grip (gx, gy), its limbs bending back by `bend` px, the string to
// (sx, sy) (the draw hand) or straight. Wood dark on the back, light on the belly; gold tips.
function bow(F, gx, gy, bend, sx = null, sy = null, up = 9, down = 8, buzz = 0) {
  gx = Math.round(gx); gy = Math.round(gy)
  const pts = []
  for (let t = -up; t <= down; t++) {
    const u = t / (t < 0 ? up : down)
    pts.push([Math.round(gx - bend * u * u), gy + t])
  }
  for (const [x, y] of pts) { F.set(x + 1 + "," + y, "m"); F.set(x + "," + y, "N") }
  for (const [x, y] of pts.slice(1, 4)) F.set(x + "," + y, "o")
  for (const [x, y] of pts) if (Math.abs(y - gy) <= 1) { F.set(x + "," + y, "y"); F.set(x + 1 + "," + y, "Z") }
  F.set(pts[up][0] + 1 + "," + pts[up][1], "g")   // the moonstone set in the grip
  const top = pts[0], bot = pts[pts.length - 1]
  F.set(top[0] + "," + top[1], "Y"); F.set(bot[0] + "," + bot[1], "Y")
  const str = (a, b) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 1; i < n; i++) F.set(Math.round(a[0] + ((b[0] - a[0]) * i) / n) + "," + Math.round(a[1] + ((b[1] - a[1]) * i) / n), "s")
  }
  if (sx != null) { sx = Math.round(sx); sy = Math.round(sy); str([top[0] - 1, top[1]], [sx, sy]); str([sx, sy], [bot[0] - 1, bot[1]]) }
  else if (buzz) { const mx = top[0] - 1 - buzz, my = gy; str([top[0] - 1, top[1]], [mx, my]); str([mx, my], [bot[0] - 1, bot[1]]) }
  else str([top[0] - 1, top[1]], [bot[0] - 1, bot[1]])
}

// An arrow nocked at (x0, y), its head at x1: fletching in the accent, a birch shaft, a glowing tip.
function arrow(F, x0, x1, y, glint) {
  for (let x = x0 + 1; x < x1; x++) F.set(x + "," + y, "o")
  F.set(x0 + "," + y, "y"); F.set(x0 + 1 + "," + (y - 1), "Y"); F.set(x0 + 1 + "," + (y + 1), "y"); F.set(x0 + 2 + "," + (y - 1), "y")
  F.set(x1 + "," + y, "g"); F.set(x1 - 1 + "," + (y - 1), "w"); F.set(x1 - 1 + "," + (y + 1), "v")
  if (glint) { F.set(x1 + "," + y, "W"); F.set(x1 + 1 + "," + y, "g") }
}

// The loose: a white streak from the bow out of the frame, thick at its front (stage 1), then
// breaking up into dashes (stage 2).
function swoosh(F, x0, y, stage) {
  const set = (x, yy, k) => { if (x < 48) F.set(x + "," + yy, k) }
  if (stage === 1) {
    for (let x = x0; x < 48; x++) {
      const t = (x - x0) / (47 - x0)
      set(x, y, t < 0.1 ? "w" : "W")
      if (t > 0.2) set(x, y - 1, t > 0.5 ? "W" : "w")
      if (t > 0.35) set(x, y + 1, t > 0.7 ? "W" : "v")
      if (t > 0.65) { set(x, y - 2, "v"); if (t > 0.8) set(x, y + 2, "v") }
    }
    set(47, y, "g"); set(46, y, "g")
    for (let dy = -7; dy <= 7; dy++) {
      const x = x0 - 1 + Math.round(6 * (1 - (dy / 7.5) ** 2)), ad = Math.abs(dy)
      set(x, y + dy, ad > 5 ? "v" : ad > 3 ? "w" : "W")
      if (ad <= 4) set(x - 1, y + dy, ad > 2 ? "v" : "w")
    }
  } else if (stage === 2) {
    for (const [a, b] of [[x0 + 4, x0 + 6], [x0 + 9, x0 + 12]]) for (let x = a; x <= b; x++) set(x, y, x === a ? "v" : "w")
    for (let x = x0 + 14; x < 48; x++) { set(x, y, "W"); if (x > x0 + 17) set(x, y - 1, "v") }
    for (let x = x0 + 9; x <= x0 + 11; x++) set(x, y - 4, "v")
    for (let x = x0 + 11; x <= x0 + 12; x++) set(x, y + 4, "v")
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function lyra(c, f) {
  const F = new Map()
  const ux = f.ux || 0
  const U = (p) => add(p, [ux, f.by || 0])     // the upper body's offset (lean, bob)
  const fa = f.farArm
  if (!fa.front) arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)   // at rest the far arm hangs behind the cape
  cape(F, f.cape.map(U), f.cape2.map(U))
  hoodTail(F, f.tail.map(U), [2.0, 1.8, 1.5, 1.2, 0.9, 0.5, 0.2])
  if (fa.front) {   // the draw arm: the upper arm and elbow out behind her, the forearm behind her head
    const P = new Part(); P.limb(U(fa.sh), U(fa.el), 1.5, 1.3, "CDE"); P.limb(U(fa.el), U(fa.hand), 1.1, 0.9, "mNo"); lay(F, P, 2)
  }
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 23 + f.by)
  mantle(F, ux, f.by)
  const na = f.nearArm, b = f.bow
  const drawBow = () => {
    bow(F, ...U([b.gx, b.gy]), b.bend, ...(b.s ? U(b.s) : [null, null]), b.up || 9, b.down || 8, b.buzz || 0)
    if (f.arrow) { const [x0, x1, y] = f.arrow; arrow(F, x0 + ux, x1 + ux, y + f.by, f.glint) }
  }
  // At the draw the string and the arrow run to her far cheek, behind her face: only the elbow
  // out behind, the string's V and the arrow in front of her face show.
  if (f.behind) drawBow()
  head(F, 17 + ux, 14 + f.by + (f.hy || 0))
  if (fa.front && fa.hand[0] < 22) {   // the open draw hand flung back past the hood
    const P = new Part(); P.limb(U(fa.hand), U(fa.hand), 1.1, 1.1, "fFp"); lay(F, P, 1)
  }
  if (!f.behind) drawBow()
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.swoosh) swoosh(F, f.swoosh[0] + ux, f.swoosh[1] + f.by, f.swoosh[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The hood's tail at rest: from the back of the hood, back and down over the cape.
const TAIL0 = [[18.5, 16], [16.5, 17], [15.5, 19], [15, 21.5], [14.5, 24], [13.5, 27], [12.5, 30]]
const tailAt = (ph, amp, back = 0, lift = 0) => TAIL0.map(([x, y], i) => {
  const w = Math.pow(i / (TAIL0.length - 1), 1.4)
  return [x - back * w + amp * Math.sin(ph - i * 0.8) * w, y - lift * w + amp * 0.5 * Math.cos(ph - i * 0.8) * w]
})
// The cape's line from the shoulder: it falls back and down; `back` streams it out level behind
// her (walking), the ripple runs down it at phase ph.
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 24], [18, 27], [16.5, 29], [15, 31], [13.5, 33], [12, 34]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.5 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.4, y + 0.5])

// Legs: hips at (21, 30) far and (25, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -5, 0, by), near: legAt(25, 3, 0, by) })

const REST_ARMS = (sw = 0, bx = 0) => ({
  farArm: { sh: [20, 25], el: [19 + sw * 0.5, 28], hand: [19 + sw, 31] },
  nearArm: { sh: [25, 25], el: [28 + bx * 0.5, 27], hand: [31 + bx, 28] },
  bow: { gx: 33 + bx, gy: 28, bend: 2, up: 8, down: 7 },
})

const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST_ARMS(), legs: STAND(by),
    cape: capeAt(ph, 1.6, 2 + Math.sin(ph) * 2.4), cape2: capeIn(ph, 1.6, 2 + Math.sin(ph - 0.9) * 2.4),
    tail: tailAt(ph, 1.5, 0.8),
  }
})

const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, hy: 0, ux: 1, ...REST_ARMS(sw, -Math.round(sw / 2)), legs: walkLegs(i), ph,
    cape: capeAt(ph, 1.4, 4), cape2: capeIn(ph, 1.4, 4),
    tail: tailAt(ph, 1.2, 3, 1.5),
  }
})

const SHOT_Y = 22
const AIM = { sh: [25, 25], el: [29, 24], hand: [32, 22] }   // the bow arm held out level
const ATTACK_UP = [
  // k0 lift: the bow comes up and forward, the draw hand to the string with the arrow
  { farArm: { sh: [20, 25], el: [20, 28], hand: [27, 27], front: true }, nearArm: { sh: [25, 25], el: [28, 27], hand: [31, 26] }, bow: { gx: 32, gy: 26, bend: 2 }, arrow: [26, 34, 26] },
  // k1 nock: the bow arm up, the arrow on the string at the cheek's height
  { farArm: { sh: [20, 25], el: [19, 24], hand: [28, 22], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 2, s: [29, SHOT_Y] }, arrow: [29, 37, SHOT_Y], behind: true },
  // k2 draw: the string halfway back, the elbow rising behind
  { ux: -1, farArm: { sh: [20, 25], el: [16, 22], hand: [27, 22], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 3, s: [27, SHOT_Y] }, arrow: [27, 36, SHOT_Y], behind: true },
  // k3 full draw: the hand anchored at the chin, the forearm hidden behind the head, the elbow out behind
  { ux: -1, farArm: { sh: [20, 25], el: [14, 21], hand: [25, 22], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 4, s: [25, SHOT_Y] }, arrow: [25, 35, SHOT_Y], behind: true },
  // k4 hold: the tip glints
  { ux: -1, farArm: { sh: [20, 25], el: [14, 21], hand: [25, 22], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 4, s: [25, SHOT_Y] }, arrow: [25, 35, SHOT_Y], glint: true, behind: true },
  // k5 loose: the string snaps forward past straight, the hand flies back open, the streak
  { ux: -1, farArm: { sh: [20, 25], el: [15, 22], hand: [13, 19], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 2, buzz: -1 }, swoosh: [34, SHOT_Y, 1] },
  // k6 follow-through: the bow still up, the string buzzing, the streak breaking up
  { ux: 0, farArm: { sh: [20, 25], el: [16, 24], hand: [14, 21], front: true }, nearArm: AIM, bow: { gx: 33, gy: SHOT_Y, bend: 2, buzz: 1 }, swoosh: [34, SHOT_Y, 2] },
  // k7 lower: the bow comes down
  { farArm: { sh: [20, 25], el: [19, 28], hand: [20, 30] }, nearArm: { sh: [25, 25], el: [27, 28], hand: [30, 28] }, bow: { gx: 32, gy: 28, bend: 2 } },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 8) * TAU
  const back = [1.5, 1.5, 1, 0.8, 0.8, 5, 3.5, 2][k], lift = [0, 0, 0, 0, 0, 2, 1, 0][k]
  return {
    by: 0, hy: 0, ...u, legs: STAND(0),
    cape: capeAt(ph, 1.2, back), cape2: capeIn(ph, 1.2, back), tail: tailAt(ph, 1.0, 0.8 + back * 0.7, lift * 1.5),
  }
})
const ATTACK_WALK = []
for (let k = 0; k < 8; k++) for (let j = 0; j < 8; j++) {
  const w = WALK[j], kick = [0, 0, -0.5, -1, -1, 2.5, 1.5, 0][k], lift = [0, 0, 0, 0, 0, 2, 1, 0][k]
  ATTACK_WALK.push({ ...ATTACK[k], by: w.by, legs: w.legs, cape: capeAt(w.ph, 1.4, 4 + kick), cape2: capeIn(w.ph, 1.4, 4 + kick), tail: tailAt(w.ph, 1.2, 3 + kick * 0.6, 1.5 + lift) })
}

const ALL = [...IDLE, ...WALK, ...ATTACK, ...ATTACK_WALK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => lyra(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => lyra(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 8, fps: 14 }, (c) => lyra(c, ATTACK[c.frame]))
anim("ranger_e", { ...BOX, frames: 88, fps: 10 }, (c) => lyra(c, ALL[c.frame]))
