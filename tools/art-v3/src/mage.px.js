// Eldrin V3: a travelling battle-sorcerer. Fitted cowl, readable face, shorter beard,
// raised shoulder mantle and split robe. Wrists and shins now join their endpoints;
// head and shoulders share a breath clock. The accepted fire attack is retained.
// Native 48x48; 8 idle + 8 walk + 6 attack frames, anchorY 40.
// Rebuild: node tools/art-v3/bake.mjs mage tools/art-v3/src/mage.px.js mage_a2
pal({
  // the robe and hat, the main material: violet-black shadows, royal blue, cyan-white light
  0: "#21163e", 1: "#281c52", 2: "#2b2468", 3: "#282f78", 4: "#2a4293", 5: "#2b59ae", 6: "#3074c6",
  7: "#3f92d9", 8: "#5fb1e8", 9: "#93d0f2", q: "#c9ecf7",
  // white hair and beard: purple-grey shadows, warm pink-white light
  U: "#221a35", V: "#342b4b", u: "#463c61", h: "#63587e", i: "#7f749b", H: "#9d91b2", I: "#bbaec8",
  J: "#d5c8d9", j: "#efe2ea", W: "#fff7f2",
  // skin
  K: "#4a1d2a", k: "#6f333a", f: "#94494a", r: "#b56a5b", F: "#d68a6c", P: "#e7aa88", p: "#f8c9a4",
  // the staff's wood and the belt: violet-brown shadows, ochre light
  L: "#1e0e16", l: "#2e161a", M: "#3e1e1e", m: "#542b22", N: "#6a3726", n: "#84492c", O: "#9e5a32", R: "#b97946", o: "#d4985a",
  // gold (hat band, buckle, the claw on the staff)
  Z: "#4a1306", z: "#8f2d0c", t: "#b44714", y: "#d6611a", T: "#e68629", Y: "#f5aa38", Q: "#ffe390",
  // fire (all of it glows): ember red to white-hot
  c: "#a8200f", C: "#dc4316", e: "#ff6f22", E: "#ffa02e", g: "#ffd457", G: "#fff4c2",
  // eye
  x: "#1d1433",
})
ramps("0123456789q", "UVuhiHIJjW", "KkfrFPp", "LlMmNnORo", "ZztyTYQ", "cCeEgG")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; laid on the frame, its boundary pixels (a 4-neighbour outside
// the part) step darker along their own ramp, so nothing has a black line: the silhouette and every
// part laid over another are edged in their own darkest tones. Coarse ramps give the edge steps.
const COARSE = ["02468q", "UuiIjW", "KfFp", "LMNOo", "ZzyYQ", "cCeEgG"]
const FINE = ["0123456789q", "UVuhiHIJjW", "KkfrFPp", "LlMmNnORo", "ZztyTYQ", "cCeEgG"]
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
      const n = d < 0.01 ? 0 : (ox * -lx + oy * -ly) / d
      const v = 0.5 + 0.62 * n * Math.sqrt(Math.min(1, d / Math.max(r, 0.5))) + 0.08
      const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
      this.px(x, y, ramp[q])
    }
    return this
  }
  // A flowing mass along a polyline (a hat's tip, a beard, a sleeve): radius rs[i] at pts[i], lit
  // from `light`, darker toward its end (`fade`), with strand highlights where `streak(T, s)` holds.
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
  // A filled polygon (pixel centres inside); k a key or (x, y) => key.
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
// Lay a part on the frame. edge: steps darker for its boundary; open: a test (x, y, dx, dy) for
// boundary sides left light (where it runs on into another part of the same cloth).
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KkfrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
const TAU = Math.PI * 2

// ------------------------------------------------------------------ the parts
// The head, 11x6 at (19, 16) at rest, under the hat's brim: long white hair at the back, the face
// turned a little toward the viewer (3/4 to the right, as Ranger B's), in the brim's shade at the top.
// Row by row (x 19-29): the forehead in the brim's shade, a pixel wider than A's; two bushy white brows
// (near 3 px, far 2 px) with the bridge of the nose between them; the near eye (x 25) and the far eye
// (x 27), one pixel each, the nose's lightest skin between them, the near temple a step darker (r) and
// a pixel of far cheek past the far eye; the big nose under the far eye, its tip a pixel proud of the
// face; its shadow under the tip, and the moustache spreading both ways from it into the beard.
// V3: a clear brow, two recessed eyes, a single nose and connected moustache.
const HEAD = `
  .hIJJffff..
  hIJjJPJjP.
  hIJFxxPxp.
  .IJFrPPpPp
  .IJjJFPrJ.
  ..IJjWJj..`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD), 2, (x, y, dx, dy) => dy > 0 || (dy < 0 && y === y0))
}

// The long white hair falling down his back from under the hat.
function hair(F, pts) {
  const P = new Part()
  P.strand(pts, [1.5, 1.3, 0.5], "hiHIJj", { light: [-0.5, -1], fade: 0.3, lift: 0.1,
    streak: (T, s) => T > 0.15 && T < 0.7 && Math.abs(s - 0.3) < 0.3 })
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

// The beard: a long white strand from the chin over the chest, its tip swinging.
function beard(F, pts) {
  const P = new Part()
  P.strand(pts, [2.4, 2.3, 1.8, 1.0, 0.45], "HIJjWW", { light: [-0.5, -1], fade: 0.15, lift: 0.16,
    streak: (T, s) => (T > 0.1 && T < 0.75 && Math.abs(s - 0.4) < 0.18) || (T > 0.3 && T < 0.85 && Math.abs(s + 0.3) < 0.16) })
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

// The hat: a tall cone of the robe's blue, its point flopping back (a strand along `cone`), a gold band
// round its foot, and the wide brim over the brow, lit on top, in shade beneath.
const BLUE = "0123456789q"
const BRIM = `
  ..678998765..
  4568999887653
  .12344433221.`
function hat(F, x0, y0, cone) {
  // V3's travelling sorcerer wears a fitted pointed cowl. Its open face and
  // uninterrupted side panels replace the wide brim that bisected the old face.
  lay(F, new Part().grid(x0, y0 - 4, `
    .....4565.....
    ...5678765....
    ..567898765...
    .56789987654..
    .67898887654..
    5678865433543.
    56875.....543.
    5687.......43.
    4567.......43.
    .3456.....43..
    ..3456...43...
    ...3456543....`), 1)
}

// The robe: one cloth from the shoulders to the hem, tapering in at the waist and flaring to the
// hem, its back edge rippling and trailing like a cape. Shaded as a cylinder lit from the upper left,
// with folds running down from the belt and the pale lining showing along the front opening.
function robe(F, o) {
  const { ux, by, back, amp, ph, front, lift } = o
  const BACK = [[19.8, 21.5], [19, 24], [19.3, 27.5], [18.4, 30.5], [16.8, 33.4], [14.8, 35.6], [12.8, 37]]
  const backEdge = BACK.map(([x, y], i) => {
    const w = Math.pow(i / (BACK.length - 1), 1.3)
    return [x + ux - back * w * 1.3 + amp * Math.sin(ph - i * 1.1) * w * 0.8, y + (i === BACK.length - 1 ? 0 : by) - lift * w]
  })
  const pts = [[22 + ux, 20.6 + by], [25.5 + ux, 20.6 + by], [27.8 + ux, 21.6 + by], [29 + ux, 24 + by], [28.6 + ux, 28 + by],
    [29.4 + ux + front * 0.5, 33], [30.8 + ux + front, 37.9], [22, 38.1], ...backEdge.reverse()]
  const P = new Part().poly(pts, "5")
  const rows = new Map()
  for (const key of P.m.keys()) { const [x, y] = key.split(",").map(Number); const r = rows.get(y) || [99, -99]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]) }
  const waist = 28 + by
  for (const key of [...P.m.keys()]) {
    const [x, y] = key.split(",").map(Number)
    const [xl, xr] = rows.get(y), u = xr > xl ? (x - xl) / (xr - xl) : 0.5
    let v = 0.36 + 0.5 * Math.max(0, Math.cos((u - 0.3) * Math.PI * 0.95))
    if (y < waist) v += 0.06 * (waist - y) / 7
    if (y > waist + 1) v += 0.14 * Math.sin((u * 3.1 + 0.2 + (ph || 0) * 0.04) * TAU) * Math.min(1, (y - waist - 1) / 4) - 0.012 * (y - waist)
    let k = BLUE[Math.max(1, Math.min(8, Math.round(v * 10)))]
    if (y > waist + 1 && x >= xr - 1 && x <= xr) k = x === xr ? "7" : "9"   // the pale lining at the opening
    if (y > waist + 1 && x === xr - 2) k = "3"                               // the shadow of the front edge
    // A short opening reveals the connected legs on passing poses.
    if (y >= 34 && x >= 23 + ux && x <= 25 + ux && y >= 34 + Math.abs(x - 24 - ux)) { P.m.delete(key); continue }
    P.m.set(key, k)
  }
  lay(F, P, 2)
  // the belt: a leather cord round the waist with a gold knot at the front
  const [bl, br] = rows.get(waist) || [20, 28]
  for (let x = bl; x <= br; x++) F.set(x + "," + waist, x <= bl ? "M" : x < bl + 3 ? "N" : x < br - 3 ? "O" : "N")
  F.set(br - 3 + "," + waist, "Y"); F.set(br - 2 + "," + waist, "Q"); F.set(br - 3 + "," + (waist + 1), "y"); F.set(br - 3 + "," + (waist + 2), "t")
}

// A boot under the hem: its toe forward, on the sole rows (lifted by `lift`).
function boot(F, x, lift, far) {
  const P = new Part(), y = 38 - lift
  P.grid(x - 1, y, far ? "mNO.\nlMNNm" : "NORn.\nMNOOn")
  lay(F, P, 1)
}

// A bell sleeve from the shoulder through the elbow to the wrist, its cuff hanging below the forearm
// and swaying (`droop`), and the hand.
function arm(F, sh, el, hand, far, droop = 0) {
  const P = new Part()
  const blue = far ? "123456" : "3456789"
  const wr = [el[0] + (hand[0] - el[0]) * 0.72, el[1] + (hand[1] - el[1]) * 0.72]
  P.limb(sh, el, 1.7, 1.6, blue)
  P.limb(el, wr, 1.6, 2.1, blue)
  P.strand([wr, add(wr, [-0.6 + droop * 0.3, 1.8]), add(wr, [-1.6 + droop, 3.3])], [2.0, 1.4, 0.5], blue, { fade: 0.35, lift: 0 })
  lay(F, P, 2)
  // The cuff used to stop at 72% of the forearm, leaving an isolated hand.
  const S = new Part().limb(wr, hand, 0.9, 1.1, far ? "fFP" : "frFPp").limb(hand, hand, 1.1, 1.1, far ? "fFP" : "frFPp")
  lay(F, S, 1)
}

// The staff: a long straight wooden staff from its foot (x, 39) to its head (x + tilt, top), lit on
// its left, a gold claw holding the glowing fire orb at its top.
function staff(F, x, top, tilt, orbPh) {
  const n = 39 - top
  for (let i = 0; i <= n; i++) {
    const y = 39 - i, sx = Math.round(x + (tilt * i) / n)
    F.set(sx + "," + y, i < 2 ? "N" : y < top + 6 ? "R" : "O"); F.set(sx + 1 + "," + y, i < 2 ? "M" : "m")
  }
  const tx = Math.round(x + tilt)
  for (const [dx, dy, k] of [[-1, -1, "z"], [2, -1, "Z"], [-1, -2, "y"], [2, -2, "t"], [-1, -3, "T"], [2, -3, "y"], [0, 0, "Y"], [1, 0, "y"]]) F.set(tx + dx + "," + (top + dy), k)
  const ORB = orbPh % 2 === 0 ? ["eEEe", "EgGg", "EGGE", "eEgC"] : ["eEgE", "EGGE", "EgGg", "CEEe"]
  ORB.forEach((r, j) => [...r].forEach((k, i) => F.set(tx - 1 + i + "," + (top - 6 + j), k)))
  F.set(tx + "," + (top - 7), orbPh % 3 === 1 ? "e" : "E"); if (orbPh % 3 !== 2) F.set(tx + 1 + "," + (top - 7), "e")
  if (orbPh % 4 === 1) F.set(tx + 1 + "," + (top - 8), "C")
  if (orbPh % 4 === 3) F.set(tx + "," + (top - 9), "c")
}

// A flame held over the palm (bx, by): a teardrop of fire `s` big, its tongues flickering at phase
// t and leaning back by `lean` (moving), white-hot at its heart, ember red at its tips.
function handFlame(F, bx, by, s, t, lean = 0, sparks = 0) {
  const H = 6.5 * s, W = 2.2 * s
  for (let y = Math.floor(by - H - 1); y <= Math.ceil(by + 1); y++) for (let x = Math.floor(bx - W - 4); x <= Math.ceil(bx + W + 2); x++) {
    const v = (by + 0.5 - y) / H
    if (v < -0.12 || v > 1) continue
    const cx = bx - lean * v * v * 3 + 0.7 * Math.sin(t * TAU + v * 5) * v * s
    const w = W * (v < 0.3 ? 0.75 + v : Math.pow(1 - (v - 0.3) / 0.7, 0.8) * 1.05) + 0.35 * Math.sin(t * TAU * 2 + v * 9) * v
    const d = Math.abs(x - cx) / Math.max(w, 0.3)
    if (d > 1) continue
    const heat = 1 - Math.max(d * 0.95, v * 1.05 - 0.1)
    const k = heat > 0.62 ? "G" : heat > 0.45 ? "g" : heat > 0.28 ? "E" : heat > 0.12 ? "e" : v > 0.75 ? "c" : "C"
    F.set(x + "," + y, k)
  }
  // embers rising off it
  for (let i = 0; i < sparks; i++) {
    const a = t * TAU + i * 2.4, r = 2 + ((i * 3 + Math.round(t * 8)) % 4)
    const sx = Math.round(bx - lean * 2 + Math.sin(a) * (W + 1.5)), sy = Math.round(by - H - r + i)
    F.set(sx + "," + sy, i % 2 ? "g" : "E")
  }
}

// A ball of fire (a thrown fireball) at (x, y), radius R, its tail streaming back to the left.
function fireball(F, x, y, R, tail = 6) {
  for (let yy = Math.floor(y - R - 2); yy <= Math.ceil(y + R + 2); yy++) for (let xx = Math.floor(x - R - tail - 1); xx <= Math.ceil(x + R + 1); xx++) {
    let d = Math.hypot(xx - x, yy - y) / R
    if (xx < x) { const tt = (x - xx) / (R + tail); const half = R * (1 - tt) * (1 - 0.3 * Math.sin(tt * 9 + yy)); if (Math.abs(yy - y) <= half) d = Math.min(d, 0.55 + tt * 0.6) }
    if (d > 1.05) continue
    const k = d < 0.4 ? "G" : d < 0.62 ? "g" : d < 0.8 ? "E" : d < 0.95 ? "e" : "C"
    if (xx < 48) F.set(xx + "," + yy, k)
  }
}

// The throw's swoosh: a broad fiery crescent from behind his head, over the hat to the fireball,
// thickening toward its front, white-hot along its middle (stage 1); then breaking into embers (2).
function fireArc(F, p0, p1, p2, stage) {
  const N = 90
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, cc = t * t
    const x = a * p0[0] + b * p1[0] + cc * p2[0], y = a * p0[1] + b * p1[1] + cc * p2[1]
    const tx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    const L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L
    if (stage === 1) {
      const th = 0.6 + 3.1 * Math.pow(t, 1.15)
      for (let s = -th; s <= th + 0.01; s += 0.5) {
        const r = Math.abs(s) / Math.max(th, 0.5)
        const k = t < 0.12 ? "e" : r < 0.35 ? (t > 0.3 ? "G" : "g") : r < 0.65 ? "g" : r < 0.88 ? "E" : "e"
        const X = Math.round(x + nx * s), Y = Math.round(y + ny * s)
        if (X < 48 && X >= 0 && Y >= 0) F.set(X + "," + Y, k)
      }
    } else if (stage === 2) {
      const seg = Math.floor(t * 9)
      if (t < 0.35 || seg % 2 === 1) continue
      const th = 0.3 + 1.2 * t
      for (let s = -th; s <= th + 0.01; s += 0.5) {
        const X = Math.round(x + nx * s - (1 - t) * 2), Y = Math.round(y + ny * s)
        if (X < 48 && X >= 0 && Y >= 0) F.set(X + "," + Y, Math.abs(s) < th * 0.4 ? "E" : "e")
      }
    }
  }
}

// ------------------------------------------------------------------ the figure
// Back to front: the staff in the far hand and that arm, the hair down his back, the boots, the robe,
// (the throwing arm while it is drawn back behind his head), the beard, the head, the hat, the near
// arm with the flame in its palm, then the fireball and its crescent.
function eldrin(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0, hy = by
  const U = (p) => add(p, [ux, by])
  const st = f.staff
  staff(F, st.x + ux, st.top + by, st.tilt || 0, f.orb || 0)
  const fa = f.farArm, na = f.nearArm
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true, f.droop || 0)
  hair(F, f.hair.map((p) => add(p, [ux, hy])))
  // V3: real shins beneath the split robe, connecting knees to moving boots.
  for (const [side, hip] of [['far', 21], ['near', 26]]) {
    const [x, lift] = f.boots[side], P = new Part()
    P.limb([hip + ux, 29 + by], [x, 34 - lift / 2], 1.7, 1.3, side === 'far' ? '234' : '4567')
    P.limb([x, 34 - lift / 2], [x, 38 - lift], 1.3, 1.1, side === 'far' ? 'LMN' : 'MNO')
    lay(F, P, 1)
  }
  boot(F, ...f.boots.far, true)
  boot(F, ...f.boots.near, false)
  robe(F, { ux, by, ...f.robe })
  // Sculpted shoulder mantle and clasp, visible beneath the shorter beard.
  lay(F, new Part().grid(17 + ux, 21 + by, `
    ..56788765...
    .6789qq87654.
    56789q9876543
    .3456Y765432.
    ..123Q321...`), 1)
  lay(F, new Part().grid(22 + ux, 20 + by, `hIJJH
    hiIHi`), 0)
  if (na.behind) arm(F, U(na.sh), U(na.el), U(na.hand), false, f.droop2 || 0)
  beard(F, f.beard.map((p) => add(p, [ux, hy])))
  head(F, 19 + ux, 16 + hy)
  hat(F, 17 + ux, 13 + hy, f.cone.map((p) => add(p, [ux, hy])))
  if (!na.behind) arm(F, U(na.sh), U(na.el), U(na.hand), false, f.droop2 || 0)
  if (f.flame) handFlame(F, ...U(add(na.hand, [0, -1])), ...f.flame)
  if (f.fx) f.fx(F)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
// The hat's cone from the band up to its floppy point, which sways (amp, phase) and blows back.
const CONE0 = [[23.4, 12.6], [22.8, 10.5], [22, 8.5], [20.7, 7], [18.8, 6.5], [17, 7.3], [16.2, 8.7]]
const coneAt = (ph, amp, back = 0, lift = 0) => CONE0.map(([x, y], i) => {
  const w = Math.pow(i / (CONE0.length - 1), 1.6)
  return [x - back * w + amp * Math.sin(ph - i * 0.8) * w, y - lift * w + amp * 0.6 * Math.cos(ph - i * 0.8) * w]
})
// The beard from the chin to its tip, and the hair down his back: both swing a beat behind. (The beard's
// root sits under the turned face's mouth, about a pixel further forward than A's.)
const BEARD0 = [[25.6, 21.4], [25.7, 23.0], [25.1, 24.6], [24.4, 26.0], [23.8, 27.0]]
const beardAt = (ph, amp, back = 0) => BEARD0.map(([x, y], i) => {
  const w = Math.pow(i / (BEARD0.length - 1), 1.5)
  return [x - back * w + amp * Math.sin(ph - i * 0.9) * w, y - back * 0.3 * w]
})
const HAIR0 = [[20.6, 17], [19.9, 19.5], [19.4, 22]]
const hairAt = (ph, amp, back = 0) => HAIR0.map(([x, y], i) => {
  const w = i / (HAIR0.length - 1)
  return [x - back * w + amp * Math.sin(ph - i) * w, y - back * 0.4 * w]
})

// At rest: the staff upright in the far hand by his side, the near hand held forward, palm up, with
// the flame over it. `sw` swings the arms (walking).
const REST = (sw = 0) => ({
  farArm: { sh: [20.5, 22.5], el: [18.6 - sw * 0.3, 25.5], hand: [16.8 - sw * 0.5, 27] },
  nearArm: { sh: [26.6, 22.5], el: [28.4 + sw * 0.2, 25.6], hand: [31.6 + sw * 0.4, 26.4] },
  staff: { x: 16 - sw * 0.5, top: 15, tilt: 0 },
})
const STAND = { near: [29, 0], far: [19, 0] }

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the hat's point
// swaying, beard and hair a beat behind, the back hem rippling, the flame flickering.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(), boots: STAND, orb: i, droop: Math.sin(ph - 1) * 0.8, droop2: Math.sin(ph - 1.6) * 0.8,
    robe: { back: 0.6 + Math.sin(ph) * 0.9, amp: 0.9, ph, front: 0, lift: 0 },
    cone: coneAt(ph, 1.2, 0.3 + Math.sin(ph - 1.4) * 0.8),
    beard: beardAt(ph - 1.2, 0.5), hair: hairAt(ph - 0.8, 0.5, 0.3),
    flame: [1.2, i / 8, 0, i % 4 === 1 ? 2 : 0],
  }
})

// Walk: the boots stride under the hem (near and far half a cycle apart), the body bobs, the hem
// swings out at each contact, everything that hangs streams back, the flame trails.
const GAIT = [[3, 0], [1.5, 0], [0, 0], [-1.5, 0], [-3, 0], [-2, 2], [0, 2], [2, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  const n = GAIT[i], fr = GAIT[(i + 4) % 8], r = REST(sw)
  return {
    by, hy: 0, ux: 0, ...r, orb: i + 2, droop: 1.5, droop2: 1.2,
    staff: { ...r.staff, tilt: [1, 1, 0, 0, -1, -1, 0, 0][i] },
    boots: { near: [Math.round(28 + n[0]), n[1]], far: [Math.round(20 + fr[0]), fr[1]] },
    robe: { back: 2.6, amp: 1.1, ph, front: Math.max(0, n[0], fr[0] - 1) * 0.8, lift: 0.6 + 0.4 * Math.sin(ph) },
    cone: coneAt(ph, 0.7, 2.2, 0.4), beard: beardAt(ph, 0.4, 1), hair: hairAt(ph, 0.4, 1.2),
    flame: [1.1, i / 4, 0.8, 0],
  }
})

// Attack (12 fps), the fireball leaves on the 4th: the fire swells in the palm drawn in low; the arm
// swings up behind his head as it grows; at the top it is a blazing ball; he hurls it overhand in a
// fiery crescent to the right; the ball flies on as the crescent breaks into embers; he recovers.
const ATTACK = [
  // k0 gather: the hand drawn in low to the belt, the fire swelling
  { nearArm: { sh: [26.6, 22.5], el: [28, 25.5], hand: [29.5, 27.5] }, flame: [1.3, 0.1, 0.2, 2], back: 1.2, tilt: 0 },
  // k1 wind-up: lean back, the arm swings up behind the head, the fire a growing ball
  { ux: -1, nearArm: { sh: [26.6, 22.5], el: [23, 19.5], hand: [19.5, 14.5], behind: true }, flame: [1.6, 0.35, 0.6, 3], back: 1.8, tilt: -1 },
  // k2 cocked: the hand high behind the hat, the fire at its biggest
  { ux: -1, hy: -1, nearArm: { sh: [26.6, 22.5], el: [22.5, 17.5], hand: [18, 11.5], behind: true }, flame: [2.0, 0.6, 1.0, 4], back: 2.2, tilt: -1 },
  // k3 THROW: lunge forward, the arm whips over and out, the fireball flies off in a blazing crescent
  { ux: 1, nearArm: { sh: [26.6, 22.5], el: [30.5, 21.2], hand: [34.2, 20.4] }, back: 4.5, lift: 2.5, tilt: 1,
    fx: (F) => { fireArc(F, [13, 10], [25, -4], [40, 19], 1); fireball(F, 41.5, 19.5, 3.6, 4) } },
  // k4 follow-through: the arm out and down, the ball off at the frame's edge, the crescent embers
  { ux: 1, nearArm: { sh: [26.6, 22.5], el: [30, 24], hand: [33.6, 25.6] }, back: 3.5, lift: 1.5, tilt: 1,
    fx: (F) => { fireArc(F, [14, 11], [26, -2], [41, 19], 2); fireball(F, 46, 19.5, 2.8, 7); for (const [x, y, k] of [[36, 13, "E"], [38, 26, "e"], [32, 10, "g"], [40, 14, "e"], [35, 28, "C"]]) F.set(x + "," + y, k) } },
  // k5 recover: the arm comes back, a new small flame catches in the palm
  { nearArm: { sh: [26.6, 22.5], el: [28.4, 25.6], hand: [31.6, 26.4] }, flame: [0.6, 0.2, 0, 1], back: 2, lift: 0.5, tilt: 0,
    fx: (F) => { for (const [x, y, k] of [[43, 17, "e"], [46, 22, "C"], [39, 11, "c"]]) F.set(x + "," + y, k) } },
].map((u, k) => {
  const ph = (k / 6) * TAU, r = REST()
  return {
    by: 0, hy: 0, ...r, ...u, staff: { ...r.staff, tilt: u.tilt }, boots: k === 3 || k === 4 ? { near: [31, 0], far: [18, 0] } : STAND,
    orb: k + 1, droop: 0.3, droop2: -u.back * 0.4,
    robe: { back: u.back, amp: 0.8, ph, front: k === 3 || k === 4 ? 1.5 : 0, lift: u.lift || 0 },
    cone: coneAt(ph, 0.6, u.back * 0.8, (u.lift || 0) * 0.8), beard: beardAt(ph, 0.3, u.back * 0.35), hair: hairAt(ph, 0.3, u.back * 0.4),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => eldrin(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => eldrin(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => eldrin(c, ATTACK[c.frame]))
anim("mage_a2", { ...BOX, frames: 22, fps: 10 }, (c) => eldrin(c, ALL[c.frame]))
