// Lyra the Ranger, "Knight style B": drawn to sit beside the plumed Knight (no black outline, every
// edge a dark tone of its own material, hue-shifted ramps, a cape and a ponytail that flow).
// 88 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-23 (release on 21),
// attackWalk 24-87 (attack pose k over walk step j at 24 + 8k + j). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build ranger-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/ranger_b.png <sheet>   (adds the glow rows)
pal({
  // silver hair: purple-grey shadows, warm pink light
  U: "#221a35", V: "#342b4b", u: "#463c61", h: "#63587e", i: "#7f749b", H: "#9d91b2", I: "#bbaec8", J: "#d5c8d9", j: "#efe2ea",
  // skin
  K: "#4a1d2a", k: "#6f333a", f: "#94494a", r: "#b56a5b", F: "#d68a6c", P: "#e7aa88", p: "#f8c9a4",
  // forest green (the main material): blue-black shadows, yellow-green light
  A: "#0a1a20", a: "#0e2725", B: "#11332a", b: "#184931", C: "#1e5f37", c: "#29793d", D: "#339242", d: "#50a94a",
  E: "#6dbf51", G: "#98d566", e: "#c2ea7a",
  // leather and bow wood: violet-brown shadows, ochre light
  L: "#1e0e16", l: "#2e161a", M: "#3e1e1e", m: "#542b22", N: "#6a3726", n: "#84492c", O: "#9e5a32", R: "#b97946", o: "#d4985a",
  // the warm accent: amber to gold
  Z: "#4a1306", z: "#8f2d0c", t: "#b44714", y: "#d6611a", T: "#e68629", Y: "#f5aa38", Q: "#ffe390",
  // eye, string, arrowhead glow, white
  x: "#14203f", X: "#3fcf9a", s: "#e3d8c6", g: "#b6ffdc", W: "#ffffff", w: "#f0e4ee", v: "#b9a9cc",
})
ramps("UVuhiHIJj", "KkfrFPp", "AaBbCcDdEGe", "LlMmNnORo", "ZztyTYQ", "vwW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those
// with a 4-neighbour outside the part) step darker along their own ramp. So nothing has a black
// line: the silhouette and every part laid over another are edged in their own darkest tones.
// Each material has a coarse ramp (its main tones, the steps an edge darkens by) and a fine one
// with the half-tones between them, which the round shading of limbs, cape and tail runs along.
const COARSE = ["Uuiij", "KfFp", "ABCDEe", "LMNOo", "ZzyYQ", "vwW"]
const FINE = ["UVuhiHIJj", "KkfrFPp", "AaBbCcDdEGe", "LlMmNnORo", "ZztyTYQ", "vwW"]
const darker = (k, n) => {
  for (let r = 0; r < FINE.length; r++) {
    const i = FINE[r].indexOf(k)
    if (i < 0) continue
    const c = COARSE[r], below = [...c].filter((ch) => FINE[r].indexOf(ch) <= i).length - 1
    const at = c.includes(k) ? below : below + 0.5
    return c[Math.max(0, Math.ceil(at - n))]
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
// Lay a part on the frame. edge: steps darker for its boundary; open: a test (x, y, nx, ny) for
// boundary sides left light (a lit top meeting another part of the same body).
function lay(F, part, edge = 3, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KkfrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)   // skin softens by one step only
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The head, 10x10 at (18, 13) at rest: silver hair drawn back from a parted fringe, the long ear
// laid back over it, the face in 3/4 to the right (lid over a teal iris, the white toward the ear,
// the far eye on the face's edge, the nose the lightest skin).
const HEAD = `
  ...uiiu...
  ..uIjjIIu.
  .uIjjIIjIu
  .uIIIjIIIu
  uiiiiIIpIp
  Uuiuuuxxpx
  uUuuuFwXpX
  UuuufFFppp
  .UuuufFppf
  ..UuuUfFf.`
// The long elf ear, laid back over the hair and out past it: lit along its top, shaded under.
const EAR = [[-1, 2, "F"], [-1, 3, "r"], [0, 3, "p"], [0, 4, "r"], [1, 4, "p"], [1, 5, "r"], [2, 5, "P"], [2, 6, "f"], [3, 6, "F"], [4, 6, "F"], [3, 7, "k"], [4, 7, "f"]]
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD), 2)
  for (const [x, y, k] of EAR) F.set(x0 + x + "," + (y0 + y), k)
}

// The tunic, 10x9 at (18, 23) at rest: chest, a leather belt with a gold buckle, the skirt.
const TORSO = `
  ....DEFf..
  ...DEeeED.
  ..DEeeeEE.
  ..CDEeeED.
  ..CDEEEDC.
  ..MNOOYQN.
  ..CDEeEDC.
  .CDEEDEEDC`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 2)
}

// A leg: hip, knee, ankle; green trousers, a leather boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.7, 1.35, far ? "BbCc" : "DdEG")
  P.limb(knee, ankle, 1.35, 1.15, far ? "MmNn" : "NnOR")
  // the boot's cuff at the knee
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 1, far ? "N" : "O"); P.px(kx, ky + 1, far ? "O" : "o"); P.px(kx + 1, ky + 1, far ? "N" : "O")
  // the foot: forward of the ankle on the sole rows
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "N" : "O")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "M" : "N")
  lay(F, P, 2)
}

// An arm: shoulder, elbow, hand. A green sleeve to the elbow, a leather bracer, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.6, 1.3, far ? "BbC" : "CcDdEG")
  P.limb(el, hand, 1.2, 1.0, far ? "Mm" : "MmNnOR")
  P.limb(hand, hand, 1.1, 1.1, far ? "fr" : "frFPp")
  lay(F, P, 2)
}

// The cowl over the shoulders (the hood laid back, in front of the tunic) with a gold clasp.
function cowl(F, ox, oy) {
  const P = new Part().grid(18 + ox, 22 + oy, `
    ..CDE...
    .CDEeE..
    BCDEEDYQ
    .BCDDCy.`)
  lay(F, P, 2, (x, y, dx, dy) => dy > 0)
}

// The cape: two flowing lobes from the shoulders, the outer lit, the inner (nearer the legs) in
// shade. `spine` is the outer lobe's line from the shoulder to its tip; the inner lobe follows a
// frame behind (`spine2`). Folds are strand highlights along the fall.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.9, 2.2, 2.2, 1.7, 1.0, 0.3], "aBbC", { light: [-0.5, -1], fade: 0.3, lift: 0.05,
    streak: (T, s) => T > 0.25 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [2.0, 2.5, 2.6, 2.2, 1.4, 0.4], "BbCcDdE", { light: [-0.5, -1], fade: 0.35, lift: 0.1,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 2)
}

// The ponytail: a thick strand along pts with radii, lit on its upper side, ending in two locks.
function tail(F, pts, rs) {
  const P = new Part()
  P.strand(pts, rs, "uhiHIJj", { light: [-0.5, -1], fade: 0.22, lift: 0.3,
    streak: (T, s) => (T > 0.08 && T < 0.4 && Math.abs(s - 0.35) < 0.22) || (T > 0.45 && T < 0.7 && Math.abs(s - 0.1) < 0.2) })
  // a second, shorter lock splitting off the end
  const n = pts.length, a = pts[n - 3], b = pts[n - 2]
  P.strand([a, [b[0] + 2, b[1] + 1], [b[0] + 2, b[1] + 3]], [1.1, 0.8, 0.3], "Vuhi", { fade: 0.2, lift: 0.1 })
  lay(F, P, 2)
  // the gold tie at its root
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
  for (const [x, y] of pts) { F.set(x + 1 + "," + y, "M"); F.set(x + "," + y, "O") }
  for (const [x, y] of pts.slice(1, 4)) F.set(x + "," + y, "o")
  for (const [x, y] of pts) if (Math.abs(y - gy) <= 1) { F.set(x + "," + y, "z"); F.set(x + 1 + "," + y, "Z") }
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
  tail(F, f.tail.map(U), [1.5, 2.0, 2.2, 2.0, 1.6, 1.1, 0.5])
  if (fa.front) {   // the draw arm's upper arm, out behind her
    const P = new Part(); P.limb(U(fa.sh), U(fa.el), 1.6, 1.4, "BbCcD"); lay(F, P, 2)
  }
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 23 + f.by)
  cowl(F, ux, f.by)
  if (fa.front) {   // its forearm forward over the cowl, the hand under the chin
    const P = new Part(); P.limb(U(fa.el), U(fa.hand), 1.2, 1.0, "MmNnOR"); P.limb(U(fa.hand), U(fa.hand), 1.1, 1.1, "frFPp"); lay(F, P, 2)
  }
  head(F, 18 + ux, 13 + f.by + (f.hy || 0))
  const na = f.nearArm, b = f.bow
  bow(F, ...U([b.gx, b.gy]), b.bend, ...(b.s ? U(b.s) : [null, null]), b.up || 9, b.down || 8, b.buzz || 0)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.arrow) { const [x0, x1, y] = f.arrow; arrow(F, x0 + ux, x1 + ux, y + f.by, f.glint) }
  if (f.swoosh) swoosh(F, f.swoosh[0] + ux, f.swoosh[1] + f.by, f.swoosh[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
const TAIL0 = [[20, 13], [18, 11.5], [16.5, 13], [16, 16.5], [16, 20.5], [15, 23.5], [14, 26.5]]
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
  { ux: -1, farArm: { sh: [20, 25], el: [15, 22], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y] },
  // k4 hold: the tip glints
  { ux: -1, farArm: { sh: [20, 25], el: [15, 22], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y], glint: true },
  // k5 loose: the string snaps forward past straight, the hand flies back open, the streak
  { ux: -1, farArm: { sh: [20, 25], el: [15, 23], hand: [20, 21], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: -1 }, swoosh: [34, SHOT_Y, 1] },
  // k6 follow-through: the bow still up, the string buzzing, the streak breaking up
  { ux: 0, farArm: { sh: [20, 25], el: [16, 25], hand: [20, 23], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: 1 }, swoosh: [34, SHOT_Y, 2] },
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
anim("ranger_b", { ...BOX, frames: 88, fps: 10 }, (c) => lyra(c, ALL[c.frame]))
