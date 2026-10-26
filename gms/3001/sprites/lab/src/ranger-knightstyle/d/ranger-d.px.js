// Lyra the Ranger, "Knight style D (Pokemon)": Style B shifted a bit toward a Gen 4-5 Pokemon trainer
// sprite: a rounder head with a big bright eye, flat 3-4 tone colour blocks, every edge the darkest
// tone of its own material (no black), the cape and ponytail still flowing.
// 88 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-23 (release on 21),
// attackWalk 24-87 (attack pose k over walk step j at 24 + 8k + j). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build ranger-d.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/ranger_d.png <sheet>   (adds the glow rows)
pal({
  // silver hair, lavender: a deep violet edge, then shadow, base, light
  U: "#3b3668", h: "#8681b8", I: "#cbc9ea", j: "#f8f7ff",
  // skin: a warm brown edge, shadow, base, light (the nose); r the mouth and blush
  K: "#a8503f", F: "#ee9f7c", p: "#ffd5b2", P: "#fff1e0", r: "#f2826e",
  // green: the cape's and trousers' darks to the tunic's bright light
  A: "#0d3a2a", B: "#17683d", C: "#25984c", D: "#40c256", E: "#97ea70",
  // leather and bow wood
  L: "#3e1b16", M: "#7f3d1f", N: "#bb672c", O: "#eba653",
  // the warm accent, gold
  Z: "#83340a", y: "#ec8510", Y: "#ffcb3c", Q: "#fff4ae",
  // eye (lid, iris), string, arrowhead glow, white, the streak's tints
  x: "#1d2456", X: "#20c6a6", s: "#e6e0f6", g: "#b6ffdc", W: "#ffffff", w: "#e6e2ff", v: "#a59fdc",
})
ramps("UhIj", "KFpP", "ABCDE", "LMNO", "ZyYQ", "vwW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those
// with a 4-neighbour outside the part) step down their own ramp. So nothing has a black line: the
// silhouette and every part laid over another are edged in the darkest tone of their own material.
// "Pokemon" cleanness: each material has only 3-4 flat tones plus that edge tone.
const RAMPS = ["UhIj", "KFpP", "ABCDE", "LMNO", "ZyYQ", "vwW"]
const darker = (k, n) => {
  for (const r of RAMPS) {
    const i = r.indexOf(k)
    if (i >= 0) return r[Math.max(0, i - n)]
  }
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
  // A flowing mass along a polyline (a ponytail, a cape's fall): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`), with strand highlights where `streak(T, s)` holds
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
  // A filled polygon (pixel centres inside), one key.
  poly(pts, k) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j]
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (inside) this.px(x, y, typeof k === "function" ? k(x, y) : k)
      }
    return this
  }
}
// Lay a part on the frame. Its boundary pixels facing empty space (the silhouette) take the darkest
// tone of their ramp; those facing a part already laid (behind it) step down `inner` tones only, so
// the inside of the figure stays clean. open: a test (x, y, dx, dy) for sides left light.
function lay(F, part, inner = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = x + dx + "," + (y + dy)
      if (part.m.has(nk)) continue
      if (open && open(x, y, dx, dy)) continue
      out = Math.max(out, F.has(nk) ? 1 : 2)
    }
    F.set(key, out === 2 ? darker(k, 9) : out === 1 ? darker(k, inner) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The head, 12x11 at (17, 13) at rest: a touch bigger and rounder than B's, the silver hair swept
// back off the face under a short fringe, so the face reads: a big eye (a dark lid over a white
// glint and a dark pupil, teal iris under), the far eye on the face's edge, the nose the lightest
// skin, a small smile. The long ear lies back over the hair.
const HEAD = `
  ....hIIIh...
  ..hIIjjIIIh.
  .hIIjjIIIIIh
  hIIIjIIIIIIh
  hhIIIIhIIpIh
  hIhhhFxxppxp
  hIhhhFWxppXp
  hhIhFpXXpPpP
  hhhIhFpprppp
  .hhhIFFpppp.
  ..hhh.FFp...`
// The ear: a clean wedge laid back over the hair, lit along its top, its underside in the skin's edge.
const EAR = [[-1, 2, "F"], [0, 2, "p"], [0, 3, "p"], [1, 3, "P"], [2, 3, "p"],
  [1, 4, "F"], [2, 4, "p"], [3, 4, "P"], [4, 4, "p"], [2, 5, "K"], [3, 5, "F"], [4, 5, "p"], [5, 5, "p"],
  [3, 6, "K"], [4, 6, "F"], [5, 6, "F"], [4, 7, "K"]]
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD))
  for (const [x, y, k] of EAR) F.set(x0 + x + "," + (y0 + y), k)   // drawn after, edged by hand
}

// The tunic, 10x8 at (18, 24) at rest: bright green chest, a leather belt with a gold buckle, the skirt.
const TORSO = `
  ...CDDDC..
  ..CDDEEDC.
  ..CDDEEDD.
  ..CCDDDDC.
  ..MNNNYQN.
  ..CDDDDDC.
  .CDDDCDDDC`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO))
}

// A leg: hip, knee, ankle; dark green trousers, a leather boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.7, 1.35, far ? "BB" : "BCC")
  P.limb(knee, ankle, 1.35, 1.15, far ? "MM" : "MNN")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 1, far ? "M" : "N"); P.px(kx, ky + 1, far ? "N" : "O"); P.px(kx + 1, ky + 1, far ? "M" : "N")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "M" : "N")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "M" : "M")
  lay(F, P)
}

// An arm: shoulder, elbow, hand. A green sleeve to the elbow, a leather bracer, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.6, 1.3, far ? "BB" : "CDDE")
  P.limb(el, hand, 1.2, 1.0, far ? "MM" : "MNNO")
  P.limb(hand, hand, 1.1, 1.1, far ? "FF" : "Fpp")
  lay(F, P)
}

// The cowl over the shoulders (the hood laid back) with a gold clasp, a darker green block.
function cowl(F, ox, oy) {
  const P = new Part().grid(18 + ox, 22 + oy, `
    ..BCC...
    .BCCDC..
    BBCCCCYQ
    .BBCCBy.`)
  lay(F, P, 2, (x, y, dx, dy) => dy > 0)
}

// The cape: two flowing lobes from the shoulders, the outer lit, the inner in shade; one fold.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.9, 2.2, 2.2, 1.7, 1.0, 0.3], "BBB", { light: [-0.5, -1], fade: 0, lift: 0 })
  P.strand(spine, [2.0, 2.5, 2.6, 2.2, 1.4, 0.4], "BCCD", { light: [-0.5, -1], fade: 0.2, lift: 0.1 })
  lay(F, P)
}

// The ponytail: a thick strand along pts with radii, lit on its upper side, ending in two locks.
function tail(F, pts, rs) {
  const P = new Part()
  P.strand(pts, rs, "hhIIj", { light: [-0.5, -1], fade: 0.25, lift: 0.15,
    streak: (T, s) => T > 0.05 && T < 0.35 && Math.abs(s - 0.4) < 0.25 })
  const n = pts.length, a = pts[n - 3], b = pts[n - 2]
  P.strand([a, [b[0] + 2, b[1] + 1], [b[0] + 2, b[1] + 3]], [1.1, 0.8, 0.3], "hhI", { fade: 0.2, lift: 0.1 })
  lay(F, P)
  const r = pts[0].map(Math.round)
  F.set(r[0] + "," + r[1], "Y"); F.set(r[0] - 1 + "," + (r[1] + 1), "y")
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
  for (const [x, y] of pts) { F.set(x + 1 + "," + y, "M"); F.set(x + "," + y, "N") }
  for (const [x, y] of pts.slice(1, 4)) F.set(x + "," + y, "O")
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

// An arrow nocked at (x0, y), its head at x1: gold fletching, a light wood shaft, a glowing tip.
function arrow(F, x0, x1, y, glint) {
  for (let x = x0 + 1; x < x1; x++) F.set(x + "," + y, "O")
  F.set(x0 + "," + y, "y"); F.set(x0 + 1 + "," + (y - 1), "Y"); F.set(x0 + 1 + "," + (y + 1), "y"); F.set(x0 + 2 + "," + (y - 1), "Y")
  F.set(x1 + "," + y, "g"); F.set(x1 - 1 + "," + (y - 1), "w"); F.set(x1 - 1 + "," + (y + 1), "v")
  if (glint) { F.set(x1 + "," + y, "W"); F.set(x1 + 1 + "," + y, "g") }
}

// The loose: a white streak from the bow out of the frame, thick at its front (stage 1), then
// breaking up into dashes (stage 2).
function swoosh(F, x0, y, stage) {
  const set = (x, yy, k) => { if (x < 48) F.set(x + "," + yy, k) }
  if (stage === 1) {
    // the streak, widening to the front, with the arrow's glowing tip at its head
    for (let x = x0; x < 48; x++) {
      const t = (x - x0) / (47 - x0)
      set(x, y, t < 0.1 ? "w" : "W")
      if (t > 0.2) set(x, y - 1, t > 0.5 ? "W" : "w")
      if (t > 0.35) set(x, y + 1, t > 0.7 ? "W" : "v")
      if (t > 0.65) { set(x, y - 2, "v"); if (t > 0.8) set(x, y + 2, "v") }
    }
    set(47, y, "g"); set(46, y, "g")
    // the string's snap: a white crescent bowing out in front of the grip
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
  tail(F, f.tail.map(U), [1.4, 1.9, 2.3, 2.3, 2.0, 1.5, 0.6])
  if (fa.front) {   // the draw arm, its elbow out behind her and its forearm passing behind the head
    const P = new Part(); P.limb(U(fa.sh), U(fa.el), 1.6, 1.4, "CDD"); P.limb(U(fa.el), U(fa.hand), 1.3, 1.1, "CCD"); lay(F, P)
  }
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 24 + f.by)
  cowl(F, ux, f.by)
  head(F, 17 + ux, 13 + f.by + (f.hy || 0))
  if (fa.front) {   // the draw hand, in a leather glove, at the jaw
    const P = new Part(); P.limb(U(fa.hand), U(fa.hand), 1.1, 1.1, "MNO"); lay(F, P)
  }
  const na = f.nearArm, b = f.bow
  bow(F, ...U([b.gx, b.gy]), b.bend, ...(b.s ? U(b.s) : [null, null]), b.up || 9, b.down || 8, b.buzz || 0)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.arrow) { const [x0, x1, y] = f.arrow; arrow(F, x0 + ux, x1 + ux, y + f.by, f.glint) }
  if (f.swoosh) swoosh(F, f.swoosh[0] + ux, f.swoosh[1] + f.by, f.swoosh[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
const TAIL0 = [[20, 13], [17.5, 11.6], [15, 12.6], [13.6, 14.5], [12.8, 18], [12, 21.5], [10.5, 24.5]]
// The tail swung: each point i moves back by `back` and sways by `amp` at phase ph, more toward
// the tip (the root stays tied).
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

// The arms and the bow at rest: the bow held upright by her side, a little forward; `sw` swings
// the far arm (walking), `bx` the bow hand.
const REST_ARMS = (sw = 0, bx = 0) => ({
  farArm: { sh: [20, 25], el: [19 + sw * 0.5, 28], hand: [19 + sw, 31] },
  nearArm: { sh: [25, 25], el: [26 + bx * 0.5, 27], hand: [29 + bx, 28] },
  bow: { gx: 31 + bx, gy: 28, bend: 2, up: 8, down: 7 },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the cape rippling
// out behind in the wind and the tail settling.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST_ARMS(), legs: STAND(by),
    cape: capeAt(ph, 1.6, 2 + Math.sin(ph) * 2.4), cape2: capeIn(ph, 1.6, 2 + Math.sin(ph - 0.9) * 2.4),
    tail: tailAt(ph, 1.1, 0.5),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, hy: 0, ux: 1, ...REST_ARMS(sw, -Math.round(sw / 2)), legs: walkLegs(i), ph,
    cape: capeAt(ph, 1.4, 4), cape2: capeIn(ph, 1.4, 4),
    tail: tailAt(ph, 0.9, 2, 1),
  }
})

// Attack (14 fps, release on the 6th): lift the bow, nock, draw, full draw to the chin, hold,
// loose (the string snaps forward, the streak flies), follow through, lower.
const SHOT_Y = 24
const AIM = { sh: [25, 25], el: [29, 25], hand: [32, 24] }   // the bow arm held out level
const ATTACK_UP = [
  // k0 lift: the bow comes up and forward, the draw hand to the string with the arrow
  { farArm: { sh: [20, 25], el: [20, 28], hand: [27, 27], front: true }, nearArm: { sh: [25, 25], el: [28, 27], hand: [31, 27] }, bow: { gx: 32, gy: 27, bend: 2 }, arrow: [26, 33, 27] },
  // k1 nock: the bow arm level, the arrow on the string
  { farArm: { sh: [20, 25], el: [20, 26], hand: [28, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, s: [29, 24] }, arrow: [29, 37, SHOT_Y] },
  // k2 draw: the string halfway back, the elbow rising behind
  { ux: -1, farArm: { sh: [20, 25], el: [18, 23], hand: [27, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 3, s: [27, 24] }, arrow: [27, 36, SHOT_Y] },
  // k3 full draw to the chin, the elbow out behind
  { ux: -1, farArm: { sh: [20, 25], el: [14, 21], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y] },
  // k4 hold: the tip glints
  { ux: -1, farArm: { sh: [20, 25], el: [14, 21], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y], glint: true },
  // k5 loose: the string snaps forward past straight, the hand flies back open, the streak
  { ux: -1, farArm: { sh: [20, 25], el: [17, 24], hand: [14, 22], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: -1 }, swoosh: [34, SHOT_Y, 1] },
  // k6 follow-through: the bow still up, the string buzzing, the streak breaking up
  { ux: 0, farArm: { sh: [20, 25], el: [18, 25], hand: [16, 23], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: 1 }, swoosh: [34, SHOT_Y, 2] },
  // k7 lower: the bow comes down
  { farArm: { sh: [20, 25], el: [19, 28], hand: [20, 30] }, nearArm: { sh: [25, 25], el: [27, 28], hand: [30, 28] }, bow: { gx: 31, gy: 28, bend: 2 } },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 8) * TAU
  const back = [1.5, 1.5, 1, 0.8, 0.8, 5, 3.5, 2][k], lift = [0, 0, 0, 0, 0, 2, 1, 0][k]   // gathered on the draw, flung back by the loose
  return {
    by: 0, hy: 0, ...u, legs: STAND(0),
    cape: capeAt(ph, 1.2, back), cape2: capeIn(ph, 1.2, back), tail: tailAt(ph, 0.8, 0.5 + back * 0.6, lift),
  }
})
// Shooting on the move: attack pose k over walk step j (the legs, bob, cape and tail of the walk).
const ATTACK_WALK = []
for (let k = 0; k < 8; k++) for (let j = 0; j < 8; j++) {
  const w = WALK[j], kick = [0, 0, -0.5, -1, -1, 2.5, 1.5, 0][k], lift = [0, 0, 0, 0, 0, 2, 1, 0][k]   // the loose flings them back
  ATTACK_WALK.push({ ...ATTACK[k], by: w.by, legs: w.legs, cape: capeAt(w.ph, 1.4, 4 + kick), cape2: capeIn(w.ph, 1.4, 4 + kick), tail: tailAt(w.ph, 0.9, 2 + kick * 0.6, 1 + lift) })
}

const ALL = [...IDLE, ...WALK, ...ATTACK, ...ATTACK_WALK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => lyra(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => lyra(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 8, fps: 14 }, (c) => lyra(c, ATTACK[c.frame]))
anim("ranger_d", { ...BOX, frames: 88, fps: 10 }, (c) => lyra(c, ALL[c.frame]))
