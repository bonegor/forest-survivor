// Bramwyn the Druid, "Knight style B (Forest spirit)": a lean, feral druid wrapped in a moss-green
// cloak of leaves that flutters and sheds leaves as the plumed Knight's cape flows, a deer-skull mask
// with branching antlers over his bearded face, and a gnarled living-wood staff cradling a glowing
// gold seed (the one accent). No black outline: every edge a dark tone of its own material, ramps
// hue-shifted (cool teal/violet shadows, warm yellow/cream lights).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the staff strikes the ground on
// 19 and roots and green-gold light burst up). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build druid-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/druid_b.png <sheet>   (adds the glow rows)
pal({
  // the cloak of leaves and the robe (the main material): teal-black shadows, yellow-green lights
  0: "#0a1519", 1: "#0e2024", 2: "#122c2b", 3: "#173b30", 4: "#1d4b34", 5: "#2b6639", 6: "#3f8040", 7: "#619d40",
  8: "#8fbd4a", 9: "#bcd862", "@": "#e3ef9c",
  // bone (the deer skull, the antlers) and the ash beard: violet-grey shadows, warm cream lights
  U: "#241a33", V: "#382c48", u: "#50425f", h: "#6c5f78", i: "#8a7d90", H: "#a99ca7", I: "#c6b9b8", J: "#e0d4c8", j: "#f4ecdc",
  // living wood (staff, roots) and the leg wraps: violet-brown shadows, ochre light
  L: "#1d0f15", l: "#2d171a", M: "#3f201e", m: "#552c23", N: "#6b3a29", n: "#84502f", O: "#9c6538", R: "#b67f46",
  // skin
  K: "#4a1d2a", k: "#6f333a", f: "#94494a", r: "#b56a5b", F: "#d68a6c", P: "#e7aa88",
  // the accent: the seed's gold (y and darker do not glow; Y Q W g G glow at night)
  Z: "#4e1a08", z: "#93380c", t: "#c25f14", y: "#e8901f", Y: "#ffc93c", Q: "#fff19a", W: "#ffffff",
  g: "#e2f77a", G: "#a8e05c",
})
ramps("0123456789@", "UVuhiHIJj", "LlMmNnOR", "KkfrFP", "ZztyYQW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; laid on the frame, its boundary pixels (a 4-neighbour outside
// the part) step darker along their own ramp, so every edge is a dark tone of its own material.
const COARSE = ["02468@", "UuiIj", "LMNOR", "KfFP", "ZzyYW"]
const FINE = ["0123456789@", "UVuhiHIJj", "LlMmNnOR", "KkfrFP", "ZztyYQW"]
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
const step = (k, n) => {   // n fine steps along the material's ramp (+ lighter)
  for (const r of FINE) { const i = r.indexOf(k); if (i >= 0) return r[Math.max(0, Math.min(r.length - 1, i + n))] }
  return k
}
class Part {
  constructor() { this.m = new Map() }
  px(x, y, k) { if (k && k !== ".") this.m.set(Math.round(x) + "," + Math.round(y), k); return this }
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
      const n = d < 0.01 ? 0 : (ox * -lx + oy * -ly) / d
      const v = 0.5 + 0.62 * n * Math.sqrt(Math.min(1, d / Math.max(r, 0.5))) + 0.08
      const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
      this.px(x, y, ramp[q])
    }
    return this
  }
  // A flowing mass along a polyline (the cloak, the beard, a root), radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`). `jag` cuts the rim into leaf points (period, depth);
  // `tex(a, b)` (a px along, b px across) steps the tone for the leaves' scales.
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, lift = 0.08, jag = null, tex = null } = {}) {
    const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L
    const seg = [], len = [0]
    for (let i = 0; i < pts.length - 1; i++) { seg.push([pts[i], pts[i + 1], rs[i], rs[i + 1]]); len.push(len[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])) }
    const total = len[len.length - 1] || 1, R = Math.max(...rs) + 2
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
          if (!best || m < best.m) best = { m, d, r, ox, oy, A: len[i] + t * Math.sqrt(dd), s: (dx * oy - dy * ox) / Math.sqrt(dd) }
        })
        let lim = 0.2
        if (jag) { const [per, dep] = jag, w = ((best.A + (best.s > 0 ? per / 2 : 0)) % per) / per; lim -= dep * Math.abs(w - 0.5) * 2 - dep * 0.3 }
        if (best.m > lim) continue
        const T = best.A / total
        const n = best.d < 0.01 ? 0 : (best.ox * -lx + best.oy * -ly) / best.d
        let v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (tex) q = Math.max(0, Math.min(ramp.length - 1, q + tex(best.A, best.s)))
        this.px(x, y, ramp[q])
      }
    return this
  }
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
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KkfrFP".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const put = (F, x, y, k) => F.set(Math.round(x) + "," + Math.round(y), k)
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
// The leaves' scales: rows of overlapping leaves along the cloth, each lit on its upper lip and
// shadowed under its tip.
const LEAF = (a, b) => {
  const row = Math.floor(a / 3), w = (a - row * 3) / 3, u = (((b + (row % 2) * 1.5) % 3) + 3) % 3
  if (w < 0.34 && u > 0.6 && u < 2.2) return 1
  if (w > 0.7 && (u < 0.7 || u > 2.3)) return -1
  return 0
}

// ------------------------------------------------------------------ the parts
// The head, 14x10 at (18, 12) at rest: the hood of leaves over the back of the head, the deer skull
// worn over brow and nose (its snout pointing forward, a gold eye glinting in the socket), the cheek
// below it, and the top of the beard. Keys 0-9 are the hood, bone keys the skull and beard.
const HEAD = `
  ...45678IJI...
  ..45678HJjjI..
  .34567HJjjjJI.
  .3456hJVUjjJJJ
  .2345hIUYIJJIu
  .2345kFuhihhV.
  .1234kFPfuhu..
  .0124uhiHHh...
  ..012uhHIHu...
  ...01.uhHh....`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD), 2, (x, y, dx, dy) => dy > 0 && y - y0 >= 6)
  put(F, x0 + 8, y0 + 4, "Y"); put(F, x0 + 8, y0 + 3, "U"); put(F, x0 + 7, y0 + 4, "V")   // the eye keeps its glint
}

// An antler: a tapering beam from the crown (points relative to the base) with tapering tines;
// the near one in lit bone, the far one in shade.
function antler(F, bx, by, beam, tines, far) {
  const P = new Part(), ramp = far ? "VuhiHI" : "uhiHIJj", o = (p) => [bx + p[0], by + p[1]]
  P.strand(beam.map(o), beam.map((_, i) => 1.3 - (0.85 * i) / (beam.length - 1)), ramp, { light: [-0.7, -1], fade: -0.25, lift: 0.1 })
  for (const [from, to] of tines) P.strand([o(beam[from]), o(to)], [0.7, 0.35], ramp, { light: [-0.7, -1], fade: -0.3, lift: 0.1 })
  lay(F, P, 1)
}

// The robe under the cloak: a lean chest in deep green, a bark belt with a gold-knotted cord.
function torso(F, x, y) {
  const P = new Part()
  P.limb([x + 5.5, y + 2], [x + 5, y + 6.5], 3.2, 2.9, "123456")
  lay(F, P, 1)
  for (let i = 1; i <= 8; i++) put(F, x + i, y + 7, i === 6 ? "R" : i % 3 === 0 ? "m" : "N")
  put(F, x + 6, y + 8, "n")
}

// The skirt of leaves: overlapping points flaring from the belt, swinging back by `sw`.
function skirt(F, x, y, sw) {
  const P = new Part()
  P.poly([[x + 1, y], [x + 9, y], [x + 10.5 + sw * 0.3, y + 3.6], [x - 0.5 + sw, y + 3.6]], (px, py) => {
    const a = py - y, k = 7 - Math.floor(a * 0.7) - (px < x + 3 + sw * 0.5 ? 2 : 0)
    return String(Math.max(2, Math.min(8, k + LEAF(a * 1.5 + 1, px))))
  })
  // the hem cut into leaf points
  for (let px = x - 1 + sw; px <= x + 11; px++) if ((px + 7) % 3 === 0) P.px(px, y + 4.4, (px < x + 4 ? "3" : "5"))
  lay(F, P, 2, (px, py, dx, dy) => dy < 0)
}

// A leg: hip, knee, ankle; bark-brown wraps, a dark wrapped foot pointing right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.6, 1.3, far ? "lMmN" : "mNnOR")
  P.limb(knee, ankle, 1.3, 1.05, far ? "lMmN" : "mNnOR")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  // the wrapping's bands
  for (const tt of [0.35, 0.7]) { const px = knee[0] + (ankle[0] - knee[0]) * tt, py = knee[1] + (ankle[1] - knee[1]) * tt; P.px(px - 0.6, py, far ? "l" : "N") }
  for (let x = ax - 1; x <= ax + 1; x++) P.px(x, ay + 1, far ? "m" : "n")
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 2, far ? "M" : "N")
  lay(F, P, 2)
}

// An arm: a leaf sleeve to the elbow, a sinewy forearm with a bark bracer, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.5, 1.2, far ? "123" : "345678")
  const w = [el[0] + (hand[0] - el[0]) * 0.55, el[1] + (hand[1] - el[1]) * 0.55]
  P.limb(el, w, 1.05, 1.0, far ? "kf" : "kfrF")
  P.limb(w, hand, 1.0, 0.95, far ? "lM" : "MmNn")
  P.limb(hand, hand, 1.1, 1.1, far ? "kf" : "kfrFP")
  lay(F, P, 2)
}

// The leaf mantle: over the shoulders from the hood, its lower rim cut into leaf points.
function mantle(F, x, y, fl) {
  const P = new Part().grid(x, y, `
    ..5678.....
    .4567898...
    34567899@7.
    .3456788976
    ..3456.6.5.`)
  if (fl) P.px(x + 1, y + 4, "3")
  lay(F, P, 2, (px, py, dx, dy) => dy < 0)
}

// The beard: an ash strand from the chin down over the chest, swaying.
function beard(F, pts) {
  const P = new Part()
  P.strand(pts, [1.7, 1.5, 1.1, 0.4], "VuhiHI", { light: [-0.5, -1], fade: 0.35, lift: 0.1 })
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// The cloak of leaves: two lobes from the shoulders, the outer lit, the inner in shade; its rim cut
// into leaf points and its cloth in leaf scales.
function cloak(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [2.0, 2.4, 2.5, 2.2, 1.6, 0.6], "123456", { light: [-0.5, -1], fade: 0.25, lift: 0.0, jag: [3, 1.1], tex: LEAF })
  P.strand(spine, [2.1, 2.7, 3.0, 2.8, 2.1, 0.9], "12346789", { light: [-0.5, -1], fade: 0.42, lift: 0.04, jag: [3, 1.3], tex: LEAF })
  lay(F, P, 2)
}

// A shed leaf: three pixels, its tip turning as it tumbles.
function leaf(F, x, y, turn, tone) {
  const lt = ["8", "7", "9"][tone % 3], dk = ["5", "4", "6"][tone % 3]
  const shapes = [[[0, 0, lt], [1, 0, dk], [-1, 0, dk]], [[0, 0, lt], [1, -1, dk]], [[0, 0, lt], [0, 1, dk]], [[0, 0, lt], [1, 1, dk], [-1, -1, dk]]]
  for (const [dx, dy, k] of shapes[turn % 4]) put(F, x + dx, y + dy, k)
}

// The staff: gnarled living wood from its foot to its top, a knot and a leafy twig along it, a
// cradle of twigs at the top holding the seed. glow: 0 calm, 1 bright, 2 blazing, 3 a star.
function staff(F, foot, top, glow) {
  const dx = top[0] - foot[0], dy = top[1] - foot[1], L = Math.hypot(dx, dy), d = [dx / L, dy / L], nrm = [-d[1], d[0]]
  const at = (a, b) => [top[0] + d[0] * a + nrm[0] * b, top[1] + d[1] * a + nrm[1] * b]   // a along past the top, b to its right
  const P = new Part()
  const wob = (t) => Math.sin(t * 13) * 0.35
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, p = [foot[0] + dx * t + nrm[0] * wob(t), foot[1] + dy * t + nrm[1] * wob(t)]
    P.limb(p, p, 0.95, 0.95, "MmNnOR", [-1, -0.4])
  }
  lay(F, P, 1)
  // knots and a leafy twig
  for (const [t, s] of [[0.32, -1], [0.58, 1]]) { const p = [foot[0] + dx * t + nrm[0] * s, foot[1] + dy * t + nrm[1] * s]; put(F, ...p, "m") }
  const tw = [foot[0] + dx * 0.66, foot[1] + dy * 0.66]
  put(F, tw[0] + nrm[0] * 1.6 - d[0], tw[1] + nrm[1] * 1.6 - d[1], "N"); put(F, tw[0] + nrm[0] * 2.4 - d[0] * 2, tw[1] + nrm[1] * 2.4 - d[1] * 2, "7"); put(F, tw[0] + nrm[0] * 3.2 - d[0] * 2, tw[1] + nrm[1] * 3.2 - d[1] * 2, "5")
  // the cradle: two twigs curling up round the seed, leaf buds at their tips
  const twig = (pts, k) => { for (let i = 0; i < pts.length - 1; i++) { const a = at(...pts[i]), b = at(...pts[i + 1]), n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let j = 0; j <= n; j++) put(F, a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n, k) } }
  twig([[0, 0], [1.2, -1.8], [3.0, -2.2], [4.6, -1.2]], "M")
  twig([[0, 0], [1.0, 1.8], [2.8, 2.4], [4.2, 1.8]], "N")
  put(F, ...at(5.2, -0.9), "8"); put(F, ...at(4.8, 2.3), "7"); put(F, ...at(5.4, 1.6), "9")
  // the seed
  const c = at(2.4, 0.2)
  const cx = Math.round(c[0]), cy = Math.round(c[1])
  for (const [ox, oy, k] of [[0, -1, "Y"], [-1, 0, "Y"], [1, 0, "y"], [0, 1, "t"], [0, 0, glow ? "W" : "Q"], [-1, -1, glow ? "Q" : "Y"], [1, 1, "z"]]) put(F, cx + ox, cy + oy, k)
  if (glow >= 1) for (const [ox, oy] of [[0, -2], [-2, 0], [2, 0], [0, 2]]) put(F, cx + ox, cy + oy, "Y")
  if (glow >= 2) for (const [ox, oy] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) put(F, cx + ox, cy + oy, "g")
  if (glow >= 3) for (const [ox, oy, k] of [[0, -3, "Q"], [0, -4, "Y"], [-3, 0, "Q"], [-4, 0, "Y"], [3, 0, "Q"], [4, 0, "Y"], [0, 3, "Q"], [0, 4, "Y"]]) put(F, cx + ox, cy + oy, k)
  return [cx, cy]
}

// The strike's effects. streaks: the seed's light trailing above it as it is driven down, and dust
// lines by the staff's foot. burst: at (x, 39), stage 1 the blast (a dome of light, the ground
// ring, rays, the roots breaking out), 2 the roots at full height and the dome breaking up, 3 the
// roots sinking and motes drifting up.
function streaks(F, seed, fx, fy) {
  const [sx, sy] = seed
  for (let y = sy - 2; y >= sy - 12 && y >= 0; y--) { const t = (sy - 2 - y) / 10; put(F, sx, y, t < 0.3 ? "W" : t < 0.6 ? "Q" : "g"); if (t < 0.7) put(F, sx - 1, y, t < 0.35 ? "Q" : "g") }
  for (const [ox, len] of [[-3, 6], [3, 5], [-5, 3]]) for (let i = 0; i < len; i++) put(F, sx + ox, sy - 3 - i * 1 - Math.abs(ox), i < 2 ? "g" : "G")
  // the staff's blur: light lines down both sides of it, and ahead of its foot
  for (const [ox, y0, y1] of [[-2, sy + 4, fy - 2], [2, sy + 6, fy - 4]]) for (let y = y0; y <= y1; y += 1) if ((y + ox) % 5 !== 0) put(F, fx + ox + (sx - fx) * (fy - y) / Math.max(1, fy - sy), y, "G")
  for (let y = fy + 1; y <= Math.min(fy + 4, 39); y++) put(F, fx, y, y < fy + 3 ? "g" : "G")
}
function root(F, x, h, lean, curl, ramp = "MmNnOR") {
  const P = new Part(), pts = [], rs = []
  for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([x + lean * t + curl * t * t * t + Math.sin(t * Math.PI * 1.6 + x) * 0.9, 39.5 - h * t]); rs.push(1.3 - 1.0 * t) }
  P.strand(pts, rs, ramp, { light: [-0.7, -1], fade: -0.3, lift: 0.0 })
  lay(F, P, 1)
  return pts[pts.length - 1].map(Math.round)
}
function dome(F, x, r, keep) {
  for (let a = 0; a <= 180; a += 2) {
    const t = (a * Math.PI) / 180, px = x + Math.cos(t) * r * 1.25, py = 39 - Math.sin(t) * r
    if (keep && !keep(a)) continue
    const k = a > 55 && a < 125 ? "Q" : a > 25 && a < 155 ? "g" : "G"
    if (py <= 39) put(F, px, py, k)
  }
}
function burst(F, x, stage) {
  const g = (px, py, k) => { if (py <= 39) put(F, px, py, k) }
  if (stage === 1) {
    dome(F, x, 9); dome(F, x, 8, (a) => a > 20 && a < 160)
    for (let dy = 0; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) { const e = (dx / 6) ** 2 + (dy / 4.5) ** 2; if (e <= 1) g(x + dx, 39 - dy, e < 0.35 ? "W" : e < 0.7 ? "Q" : "g") }
    for (let dx = -16; dx <= 12; dx++) {
      const ad = Math.abs(dx), k = ad < 3 ? "W" : ad < 6 ? "Q" : ad < 10 ? "g" : "G"
      g(x + dx, 39, k); if (ad < 12) g(x + dx, 38, ad < 4 ? "Q" : ad < 8 ? "g" : "G")
      if (ad < 7) g(x + dx, 37, ad < 2 ? "W" : ad < 4 ? "Q" : "g")
    }
    for (const [ang, len] of [[-90, 15], [-64, 12], [-116, 12], [-42, 9], [-138, 9], [-77, 8], [-103, 8], [-25, 6], [-155, 6]]) {
      const a = (ang * Math.PI) / 180
      for (let r = 2; r <= len; r++) g(x + Math.cos(a) * r * 1.1, 38 + Math.sin(a) * r, r < len * 0.35 ? "W" : r < len * 0.6 ? "Q" : r < len * 0.85 ? "g" : "G")
    }
    root(F, x - 8, 6, -1.5, -1.8); root(F, x + 7, 6, 1.5, 2)
    for (const [ox, oy, k] of [[-10, 28, "Y"], [9, 27, "Y"], [-4, 21, "Q"], [5, 22, "Y"], [12, 33, "g"], [-13, 33, "g"]]) g(x + ox, oy, k)
  } else if (stage === 2) {
    dome(F, x, 12, (a) => Math.floor(a / 12) % 2 === 0)
    for (let dx = -17; dx <= 12; dx++) { const ad = Math.abs(dx); if (ad > 2 && (ad % 4) !== 0) g(x + dx, 39, ad < 9 ? "g" : "G") }
    const tips = [root(F, x - 9, 9, -2.5, -2.5), root(F, x - 4, 13, -0.5, -3.5), root(F, x + 3, 11, 1.5, 3), root(F, x + 8, 8, 2.5, 2.5), root(F, x - 13, 5, -1.5, -1.5)]
    for (const [tx, ty] of tips) { put(F, tx, ty - 1, "8"); put(F, tx + 1, ty - 1, "9"); put(F, tx - 1, ty, "7") }
    for (const [ox, oy, k] of [[-11, 25, "Y"], [10, 24, "g"], [-1, 20, "Y"], [6, 21, "Q"], [13, 30, "G"], [-15, 30, "g"], [1, 28, "Q"]]) g(x + ox, oy, k)
  } else if (stage === 3) {
    root(F, x - 9, 4, -1.5, -1.2); root(F, x - 4, 6, -0.5, -2); root(F, x + 3, 5, 1.5, 1.5)
    for (const [ox, oy, k] of [[-12, 21, "G"], [11, 19, "G"], [-2, 15, "g"], [7, 17, "Y"], [2, 23, "G"], [-7, 18, "g"]]) g(x + ox, oy, k)
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function bramwyn(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0, hx = ux + (f.hx || 0), hy = by + (f.hy || 0)
  const U = (p) => add(p, [ux, by])
  const H = (p) => add(p, [hx, hy])
  // behind him: far antler, far arm, the cloak, shed leaves
  antler(F, 25 + hx, 12.5 + hy, [[0, 0], [-1.5, -3], [-3.5, -5.5], [-5, -8.5]], [[1, [-0.5, -7]], [2, [-7.5, -6.5]]], true)
  arm(F, U(f.farArm.sh), U(f.farArm.el), U(f.farArm.hand), true)
  cloak(F, f.cloak.map(U), f.cloak2.map(U))
  for (const l of f.leaves || []) leaf(F, ...l)
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 21 + by)
  skirt(F, 18 + ux, 29 + by, f.sw || 0)
  head(F, 18 + hx, 12 + hy)
  antler(F, 27.5 + hx, 12.5 + hy, [[0, 0], [1, -3], [0.5, -6], [-1.5, -9]], [[1, [4.5, -5]], [2, [3, -9]]], false)
  mantle(F, 16 + ux, 20 + by, f.fl)
  beard(F, f.beard.map(H))
  // the staff, then the near arm's hand gripping it
  const seed = staff(F, add(f.staff.foot, [ux, 0]), U(f.staff.top), f.glow || 0)   // the foot stays on the ground
  arm(F, U(f.nearArm.sh), U(f.nearArm.el), U(f.nearArm.hand), false)
  if (f.fx) f.fx(F, ux, by, seed)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The cloak's line from the shoulder: falling back and down; `back` streams it out behind him, the
// ripple runs down it at phase ph, `lift` raises its tail.
const cloakAt = (ph, amp, back = 0, lift = 0) => {
  const base = [[20, 23], [18, 26], [16, 29], [14, 31.5], [12, 34], [10.5, 36]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.3 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - (back * 0.45 + lift) * w + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const cloakIn = (ph, amp, back = 0, lift = 0) => cloakAt(ph - 0.9, amp * 0.8, back * 0.7, lift * 0.7).map(([x, y], i) => [x + 2 + i * 0.5, y + 0.6])
// The beard, from the chin; `sw` sways its tip.
const beardAt = (sw, back = 0) => [[24.5, 20], [25 - back * 0.3, 22], [25 + sw * 0.5 - back * 0.7, 24], [25 + sw - back, 26]]

// Legs: hips at (21, 31) far and (25, 31) near; an ankle dx from its hip, lifted by `lift`.
function legAt(hx, dx, lift, by, crouch = 0) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1.5, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.8 + crouch, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0, w = 0, cr = 0) => ({ far: legAt(21, -5 - w, 0, by, cr), near: legAt(25, 3 + w, 0, by, cr) })

const REST = (sx = 0, sy = 0) => ({
  farArm: { sh: [20, 24], el: [18, 27], hand: [17, 30] },
  nearArm: { sh: [25, 24], el: [27.5 + sx * 0.4, 28.5 + sy * 0.3], hand: [31.5 + sx, 25.5 + sy] },
  staff: { foot: [33.5 + sx, 38.6], top: [32.5 + sx, 8.5 + sy] },
})

// Idle: a slow breath (chest sinks on f3-5, the head a frame later), the cloak rippling out behind
// in the wind, a leaf torn off its tip drifting away, the seed pulsing.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  const p = i / 8
  return {
    by, hy, ...REST(0, 0), legs: STAND(by), sw: Math.round(Math.sin(ph) * 0.8),
    cloak: cloakAt(ph, 1.6, 2.5 + Math.sin(ph) * 2.5), cloak2: cloakIn(ph, 1.6, 2.5 + Math.sin(ph - 0.9) * 2.5),
    beard: beardAt(Math.sin(ph - 1.5) * 0.9), glow: i === 2 || i === 3 ? 1 : 0, fl: i % 4 < 2,
    leaves: [[Math.round(10 - p * 9), Math.round(35 - p * 6 + Math.sin(p * TAU * 2) * 1.5), i, 0], [Math.round(13 - ((p + 0.5) % 1) * 11), Math.round(30 + ((p + 0.5) % 1) * 4 - Math.sin(p * TAU) * 1.5), i + 2, 1]],
  }
})

// Walk: a low, prowling stride; per leg [dx, lift] by phase, the far leg half a cycle on; the
// staff swings with the near hand; the cloak streams back and sheds a trail of leaves.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i], p = i / 8
  return {
    by, hy: 0, ux: 1, hx: 1, legs: walkLegs(i), sw: -1,
    farArm: { sh: [20, 24], el: [18 + sw * 0.4, 27], hand: [17 + sw, 30] },
    nearArm: { sh: [25, 24], el: [27 - sw * 0.4, 28], hand: [31 - sw, 27] },
    staff: { foot: [35 - sw * 1.5, 38.6 - (sw < 0 ? 1 : 0)], top: [31 - sw * 0.5, 9] },
    cloak: cloakAt(ph, 1.4, 5, 0.5), cloak2: cloakIn(ph, 1.4, 5, 0.5),
    beard: beardAt(0, 1.2 + Math.sin(ph) * 0.4), glow: 0, fl: i % 2 === 0,
    leaves: [0, 1, 2].map((j) => { const q = (p + j / 3) % 1; return [Math.round(9 - q * 9), Math.round(28 + q * 6 + Math.sin((q + j) * TAU) * 1.2), i + j, j] }),
  }
})

// Attack (12 fps, the strike on index 3): he sinks and grips the staff in both hands, heaves it up
// high (the seed blazing), drives it down (streaks of light behind the seed), the strike (the foot of
// the staff hits the ground ahead, a dome of green-gold light and roots burst up), the roots at full
// height with motes rising, then he straightens as they sink.
const SX = 37
const ATTACK_UP = [
  // k0 gather
  { by: 1, ux: -1, hx: -1, nearArm: { sh: [25, 24], el: [28, 27], hand: [31, 25] }, farArm: { sh: [21, 24], el: [25, 28], hand: [31, 28] },
    staff: { foot: [33.5, 37.6], top: [31.5, 7] }, glow: 1, back: 2, lift: 0, cr: 0, w: 0 },
  // k1 heave it up
  { by: -1, ux: -1, hx: -2, nearArm: { sh: [25, 23], el: [29, 20], hand: [32, 17] }, farArm: { sh: [21, 23], el: [26, 24], hand: [32.5, 22] },
    staff: { foot: [34.5, 29], top: [32, 4.5] }, glow: 2, back: 1, lift: 2, cr: 0, w: 0 },
  // k2 drive it down
  { by: 1, ux: 1, hx: 1, nearArm: { sh: [25, 24], el: [30, 24], hand: [34, 22] }, farArm: { sh: [21, 24], el: [27, 27], hand: [34.5, 26] },
    staff: { foot: [36.5, 33], top: [35, 5] }, glow: 2, back: 4, lift: 3, cr: 1, w: 1,
    fx: (F, ux, by, seed) => streaks(F, seed, 36.5 + ux, 33) },
  // k3 STRIKE
  { by: 2, ux: 1, hx: 2, nearArm: { sh: [25, 24], el: [30, 25], hand: [35, 24] }, farArm: { sh: [21, 24], el: [27, 28], hand: [35.5, 28] },
    staff: { foot: [SX - 1, 38.6], top: [SX - 2.5, 8.5] }, glow: 3, back: 6.5, lift: 6, cr: 1.5, w: 1,
    fx: (F) => burst(F, SX, 1) },
  // k4 the roots at full height
  { by: 1, ux: 1, hx: 1, nearArm: { sh: [25, 24], el: [30, 26], hand: [35, 25] }, farArm: { sh: [21, 24], el: [27, 28], hand: [35.5, 29] },
    staff: { foot: [SX - 1, 38.6], top: [SX - 2.5, 9] }, glow: 2, back: 4.5, lift: 4, cr: 1, w: 1,
    fx: (F) => burst(F, SX, 2) },
  // k5 recover
  { by: 0, ux: 0, hx: 0, nearArm: { sh: [25, 24], el: [28, 28], hand: [32.5, 27] }, farArm: { sh: [20, 24], el: [18, 27], hand: [17, 30] },
    staff: { foot: [35, 38.6], top: [33, 9] }, glow: 1, back: 2.5, lift: 1, cr: 0, w: 0,
    fx: (F) => burst(F, SX, 3) },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 6) * TAU
  return {
    ...u, legs: STAND(u.by, u.w, u.cr), sw: -Math.round(u.back / 3),
    cloak: cloakAt(ph, 1.2, u.back, u.lift), cloak2: cloakIn(ph, 1.2, u.back, u.lift),
    beard: beardAt(0, u.back * 0.4), fl: k % 2 === 0,
    leaves: k >= 3 ? [[12 - k, 24 - k * 2, k, 0], [7 - k, 30 - k, k + 1, 1], [15 - k * 2, 19 - k, k + 2, 2]] : [[10 - k, 33 - k, k, 0]],
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => bramwyn(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => bramwyn(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => bramwyn(c, ATTACK[c.frame]))
anim("druid_b", { ...BOX, frames: 22, fps: 10 }, (c) => bramwyn(c, ALL[c.frame]))
