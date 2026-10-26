// Lyra the Ranger, "Knight style F (C refined)": Style C (the hood, its flowing tail, the cape, the
// slim build, the big release) redrawn closer to the plumed Knight's rendering: long hue-shifted ramps
// (cloth shadows to blue-teal and indigo, lights to warm yellow-green; leather from violet-brown to
// ochre), every silhouette edge in its material's darkest shade, 1 px detail on the bow, the clasp,
// the arrow and the face, a forward lean, a hood tail and cape that overlap and change the outline
// frame to frame, and a bright release crescent and streak as big as the Knight's swoosh.
// 88 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-23 (release on 21),
// attackWalk 24-87 (attack pose k over walk step j at 24 + 8k + j). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build ranger-f.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/ranger_f.png <sheet>   (adds the glow rows)
pal({
  // the cloak (hood, mantle, cape), the main material: indigo-black, blue-teal shadows, moss, warm yellow-green light
  0: "#0b0c1d", 1: "#0f1729", 2: "#112436", 3: "#13333c", 4: "#174340", 5: "#1d5444", 6: "#256747", 7: "#317b48",
  8: "#449048", 9: "#63a54c", "!": "#8ebd56", "?": "#c2d870",
  // the tunic and trousers: a lighter, warmer leaf green, teal shadows to lime-cream light
  A: "#101a22", B: "#15292b", C: "#1c3b2f", D: "#264f32", E: "#336436", F: "#447a38", G: "#5b903a",
  H: "#78a640", I: "#9bbd4c", J: "#c0d462", K: "#e4ec90",
  // leather and bow wood: violet-brown shadows, ochre light
  L: "#150a17", M: "#23101d", N: "#331621", O: "#451e24", P: "#592926", Q: "#6f3629", R: "#88462d",
  S: "#a05933", T: "#ba713d", U: "#d28f50", V: "#eab670",
  // silver hair: purple-grey shadows, pink-white light
  a: "#221a35", b: "#342b4b", c: "#463c61", d: "#63587e", e: "#7f749b", f: "#9d91b2", g: "#bbaec8", h: "#d5c8d9", i: "#efe2ea",
  // skin
  k: "#4a1d2a", l: "#6f333a", m: "#94494a", n: "#b56a5b", o: "#d68a6c", p: "#e7aa88", q: "#f8c9a4",
  // the warm accent: amber to gold
  s: "#3c1007", t: "#6e2208", u: "#9c3a0e", v: "#c45a16", w: "#e07e22", x: "#f4a636", y: "#ffd468", z: "#fff2b0",
  // eye, string, glow, the release's whites and lilacs
  Y: "#14203f", X: "#3fcf9a", r: "#f0e4ee", Z: "#e3d8c6", j: "#b6ffdc", W: "#ffffff", "+": "#c3b3d8", "=": "#8a7aae",
})
ramps("0123456789!?", "ABCDEFGHIJK", "LMNOPQRSTUV", "abcdefghi", "klmnopq", "stuvwxyz", "=+rW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp, so a part over another is edged in
// its own dark tones. Last, every pixel on the figure's silhouette drops to the darkest shades of its
// material (as the Knight's steel is edged in #2c1e3f and his cape in #230000), except the fine
// effects (bow, string, arrow, release, eye), which keep their own values.
const RAMP = ["0123456789!?", "ABCDEFGHIJK", "LMNOPQRSTUV", "abcdefghi", "klmnopq", "stuvwxyz"]
const STEP = [2, 2, 2, 2, 1, 1]
const find = (k) => { for (let r = 0; r < RAMP.length; r++) { const i = RAMP[r].indexOf(k); if (i >= 0) return [r, i] } return null }
const darker = (k, n) => { const f = find(k); if (!f) return k; const [r, i] = f; return RAMP[r][Math.max(0, i - Math.round(n * STEP[r]))] }
const lighter = (k, n) => { const f = find(k); if (!f) return k; const [r, i] = f; return RAMP[r][Math.min(RAMP[r].length - 1, i + n)] }
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
  // A flowing mass along a polyline (a hood's tail, a cape's fall): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`). fold(T, s) adds or takes ramp steps (T 0..1 along it,
  // s -1..1 across it): the folds that ripple down the cloth.
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, fold = null, lift = 0.08 } = {}) {
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
        const v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (fold) q = Math.max(0, Math.min(ramp.length - 1, q + fold(best.T, -best.s)))
        this.px(x, y, ramp[q])
      }
    return this
  }
}
// Lay a part on the frame. edge: ramp steps darker for its boundary; open: a test (x, y, dx, dy) for
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
    F.set(key, out ? darker(k, edge) : k)
  }
}
// The silhouette: pixels touching the empty air take their material's darkest shades (skin and gold
// soften by fewer steps; the fine effects in FX keep theirs).
function silhouette(F, FX) {
  // first close pinholes: an empty pixel with 3 or 4 filled neighbours takes the darker of them
  for (let pass = 0; pass < 2; pass++) {
    const add = []
    const xs = [...F.keys()].map((k) => k.split(",").map(Number))
    const seen = new Set()
    for (const [x0, y0] of xs) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = x0 + dx, y = y0 + dy, key = x + "," + y
      if (F.has(key) || seen.has(key)) continue
      seen.add(key)
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => F.get(x + a + "," + (y + b))).filter((k) => k && find(k))
      if (nb.length >= 3) add.push([key, nb.sort((a, b) => find(a)[1] - find(b)[1])[0]])
    }
    for (const [key, k] of add) F.set(key, k)
  }
  const out = new Map(F)
  for (const [key, k] of F) {
    if (FX.has(key)) continue
    const [x, y] = key.split(",").map(Number)
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !F.has(x + dx + "," + (y + dy)))) continue
    const f = find(k); if (!f) continue
    const [r, i] = f, R = RAMP[r]
    if (r === 4) continue                                      // skin keeps its softer edge
    else if (r === 5) out.set(key, R[Math.max(0, i - 3)])     // gold
    else out.set(key, R[i >= R.length * 0.55 ? 1 : 0])         // cloth, leather, hair: the two darkest
  }
  for (const [key, k] of out) F.set(key, k)
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The head under the hood, 11x10 at (18, 14) at rest: the hood up over the crown, lit from the upper
// left, a warm yellow-green sheen on the crown, the brim's lit top overhanging the brow, a bright rim
// down the edge of the opening and a deep indigo shadow inside it, a silver fringe, and the face in 3/4
// to the right: a navy lid over a white and a teal iris, a nose a pixel proud, the mouth, the chin.
const HEAD = `
  ....5788...
  ..479!!86..
  .479!??!75.
  3689!!!9864
  47899987!?6
  6799!1ghhf.
  5789!0eqYY.
  4678!0dprXo
  3567!0coopq
  245780bmnl.`
const EYE = [[8, 6, "Y"], [9, 6, "Y"], [8, 7, "r"], [9, 7, "X"]]   // kept over a string drawn across the face
const hoodPart = (x0, y0) => new Part().grid(x0, y0, HEAD)
function head(F, x0, y0, tailKeys) {
  // the hood's lower back runs on into the mantle, and its crown into its tail, without an edge
  lay(F, new Part().grid(x0, y0, HEAD), 1, (x, y, dx, dy) => (dy > 0 && x - x0 < 6) || tailKeys.has(x + dx + "," + (y + dy)))
}

// The tunic, 10x8 at (18, 23) at rest, its chest a pixel forward of its hem (the lean): lit chest,
// a leather belt with a gold buckle, the skirt's hem in folds.
const TORSO = `
  ....GIH...
  ...FIJJH..
  ..EHJKJIF.
  ..EGJKJHE.
  ..DFHIHFD.
  ..NPRRzwP.
  ..EGIJHFE.
  .DFHJGIHED`
function torso(F, x0, y0) { lay(F, new Part().grid(x0, y0, TORSO), 1) }

// A leg: hip, knee, ankle; green trousers, a leather boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.6, 1.3, far ? "BCDE" : "EFGHIJ")
  P.limb(knee, ankle, 1.3, 1.1, far ? "NOPQ" : "PQRSTU")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])   // the boot's turned-down cuff
  P.px(kx - 1, ky + 1, far ? "Q" : "S"); P.px(kx, ky + 1, far ? "R" : "U"); P.px(kx + 1, ky + 1, far ? "P" : "R")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])   // the foot, forward of the ankle on the sole rows
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "P" : x === ax ? "T" : "R")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "N" : "P")
  lay(F, P, 1)
}

// An arm: shoulder, elbow, hand. A green sleeve to the elbow, a leather bracer, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.5, 1.25, far ? "BCD" : "DEFGHI")
  P.limb(el, hand, 1.15, 1.0, far ? "NO" : "OPQRST")
  P.limb(hand, hand, 1.1, 1.1, far ? "mn" : "mnopq")
  lay(F, P, 1)
}

// The mantle: the hood's shoulder cape over the tunic.
function cowl(F, ox, oy) {
  const P = new Part().grid(17 + ox, 22 + oy, `
    .5789....
    5789!8...
    4689!96..
    .356875..`)
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// The gold clasp at the throat: a small leaf-shaped brooch with a highlight pixel and a dark rim.
function clasp(F, cx, cy) {
  F.set(cx + "," + (cy - 1), "w"); F.set(cx - 1 + "," + cy, "v"); F.set(cx + "," + cy, "z"); F.set(cx + 1 + "," + cy, "x")
  F.set(cx + "," + (cy + 1), "u"); F.set(cx + 1 + "," + (cy + 1), "t")
}

// The cape: two flowing lobes from the shoulders, the outer lit, the inner (nearer the legs) in
// shade. Folds ripple down both at phase ph: a lit crest and a shadowed trough travelling to the hem.
function capeOuter(F, spine, ph) {
  const P = new Part()
  P.strand(spine, [2.0, 2.5, 2.7, 2.5, 1.9, 1.1, 0.3], "123456789!", { light: [-0.5, -1], fade: 0.38, lift: 0.18,
    fold: (T, s) => { const w = Math.sin(T * 8.5 - ph + s * 1.4); return T < 0.12 ? 0 : w > 0.62 ? 2 : w < -0.7 ? -2 : 0 } })
  lay(F, P, 1)
}
function capeInner(F, spine, ph) {
  const P = new Part()
  P.strand(spine, [1.6, 1.9, 1.9, 1.5, 1.0, 0.3], "1234567", { light: [-0.5, -1], fade: 0.3, lift: 0.08,
    fold: (T, s) => { const w = Math.sin(T * 7 - ph - 1.2 + s); return T < 0.2 ? 0 : w > 0.7 ? 1 : w < -0.7 ? -1 : 0 } })
  lay(F, P, 1)
}

// The hood's long tail (a liripipe) from the back of the crown: a tapering strand of the hood's
// cloth, lit on its upper side, darker toward its point, a fold catching the light along it.
function tail(F, pts, rs, ph, hood) {
  const P = new Part()
  P.strand(pts.slice(0, 2), rs.slice(0, 2), "678", { fade: 0 })   // the root, hidden under the hood
  P.strand(pts, rs, "2345678!?", { light: [-0.5, -1], fade: 0.42, lift: 0.14,
    fold: (T, s) => (T > 0.08 && T < 0.75 && Math.abs(s - 0.35 - 0.15 * Math.sin(ph)) < 0.2 ? 1 : 0) })
  lay(F, P, 1, (x, y, dx, dy) => hood.m.has(x + dx + "," + (y + dy)))
  return new Set(P.m.keys())
}

// A lock of silver hair escaping the hood by the cheek and falling over the mantle.
function lock(F, pts) {
  const P = new Part()
  P.strand(pts, [0.6, 0.6, 0.4], "cdefgh", { light: [-0.5, -1], fade: 0.25, lift: 0.25 })
  lay(F, P, 0.5)
}

// The longbow, held at its grip (gx, gy), its limbs bending back by `bend` px, the string to (sx, sy)
// (the draw hand) or straight. Wood dark on the back, ochre on the belly with a lit stretch near each
// tip, a wrapped grip with gold bands, gold-capped nocks, the moonstone glowing in the grip.
function bow(F, FX, gx, gy, bend, sx = null, sy = null, up = 9, down = 8, buzz = 0) {
  gx = Math.round(gx); gy = Math.round(gy)
  const set = (x, y, k) => { F.set(x + "," + y, k); FX.add(x + "," + y) }
  const pts = []
  for (let t = -up; t <= down; t++) {
    const u = t / (t < 0 ? up : down)
    pts.push([Math.round(gx - bend * u * u), gy + t])
  }
  pts.forEach(([x, y], i) => {
    const t = (y - gy) / (y < gy ? up : down)   // -1 top .. 1 bottom
    set(x + 1, y, Math.abs(t) > 0.75 ? "N" : "O")                                   // the back
    set(x, y, t < -0.55 ? "U" : t < -0.2 ? "T" : t < 0.3 ? "S" : t < 0.7 ? "R" : "Q")   // the belly, lit toward the top
  })
  set(pts[2][0], pts[2][1], "V")
  for (const [x, y] of pts) if (Math.abs(y - gy) <= 1) { set(x, y, "P"); set(x + 1, y, "M") }   // the leather wrap
  for (const [x, y] of pts) if (Math.abs(y - gy) === 2) { set(x, y, "x"); set(x + 1, y, "u") }  // gold bands
  set(pts[up][0] + 1, pts[up][1], "j")   // the moonstone
  const top = pts[0], bot = pts[pts.length - 1]
  set(top[0], top[1], "y"); set(top[0] + 1, top[1], "v"); set(top[0], top[1] - 1, "w")   // nock caps
  set(bot[0], bot[1], "x"); set(bot[0] + 1, bot[1], "u"); set(bot[0], bot[1] + 1, "v")
  const str = (a, b) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 1; i < n; i++) set(Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n), "Z")
  }
  if (sx != null) { sx = Math.round(sx); sy = Math.round(sy); str([top[0] - 1, top[1]], [sx, sy]); str([sx, sy], [bot[0] - 1, bot[1]]) }
  else if (buzz) { const mx = top[0] - 1 - buzz, my = gy; str([top[0] - 1, top[1]], [mx, my]); str([mx, my], [bot[0] - 1, bot[1]]) }
  else str([top[0] - 1, top[1]], [bot[0] - 1, bot[1]])
}

// An arrow nocked at (x0, y), its head at x1: amber fletching, a birch shaft lit on top, a steel head
// with a glowing tip; `glint` makes the tip flash with a 4-point sparkle.
function arrow(F, FX, x0, x1, y, glint) {
  const set = (x, yy, k) => { if (x < 48) { F.set(x + "," + yy, k); FX.add(x + "," + yy) } }
  for (let x = x0 + 1; x < x1 - 1; x++) set(x, y, x % 3 === 0 ? "T" : "U")
  set(x0, y, "v"); set(x0 + 1, y - 1, "x"); set(x0 + 2, y - 1, "w"); set(x0 + 1, y + 1, "v"); set(x0 + 2, y + 1, "u")
  set(x1 - 1, y, "h"); set(x1, y, "j"); set(x1 - 1, y - 1, "i"); set(x1 - 1, y + 1, "e")
  if (glint) { set(x1, y, "W"); set(x1 + 1, y, "j"); set(x1 + 2, y, "+"); set(x1, y - 2, "+"); set(x1, y + 2, "+"); set(x1 + 1, y - 1, "r"); set(x1 + 1, y + 1, "r") }
}

// The loose. Stage 1: the string's snap, a big white crescent bowing out in front of the grip
// (as tall as the bow), and the arrow's streak, thick and white at its head, flying out of the frame.
// Stage 2: the crescent thins and drifts forward, the streak breaks into dashes.
function swoosh(F, FX, x0, y, stage) {
  const set = (x, yy, k) => { if (x < 48 && x >= 0) { F.set(x + "," + yy, k); FX.add(x + "," + yy) } }
  // a spindle of light along the shot line from xa to 47, half-width up to `hw`, fattest at `peak`
  const spindle = (xa, hw, peak, shift = 0) => {
    for (let x = xa; x < 48; x++) {
      const t = (x - xa) / (47 - xa), h = hw * Math.sin(Math.PI * Math.pow(t, Math.log(0.5) / Math.log(peak)))
      const n = Math.max(0, Math.round(h))
      for (let dy = -n; dy <= n; dy++) {
        const a = n ? Math.abs(dy) / (h + 0.5) : 0
        set(x, y + dy + shift, a < 0.3 ? "W" : a < 0.62 ? "r" : a < 0.85 ? "+" : "=")
      }
    }
  }
  // a crescent bowing forward from x, `half` rows up and down, `bulge` px deep, `thick` px at its
  // middle: the leading edge white, the trailing side fading to lilac (as the Knight's swoosh)
  const crescent = (x, half, bulge, thick, gap = []) => {
    for (let dy = -half; dy <= half; dy++) {
      if (gap.includes(Math.abs(dy))) continue
      const u = dy / (half + 0.5), lead = x + Math.round(bulge * (1 - u * u)), n = Math.max(1, Math.round(thick * (1 - u * u)))
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? (Math.abs(u) > 0.8 ? 0.9 : 0.5) : i / (n - 0.5)
        set(lead - i, y + dy, a < 0.3 ? "W" : a < 0.55 ? "r" : a < 0.8 ? "+" : "=")
      }
    }
  }
  // the swoosh: a long crescent of light along the shot line from xa to the frame's edge, its top
  // edge nearly straight, its belly sagging `sag` px below the line at its fattest (as the Knight's
  // blade arc does); white along the line, fading through pink-white and lilac to its lower rim
  const swooshArc = (xa, rise, sag, peak) => {
    const p = Math.log(0.5) / Math.log(peak)
    for (let x = xa; x < 48; x++) {
      const t = (x - xa) / (47 - xa), s = Math.sin(Math.PI * Math.pow(t, p))
      const top = Math.round(rise * s), bot = Math.round(sag * s)
      for (let dy = -top; dy <= bot; dy++) {
        const a = dy <= 0 ? (top ? -dy / (top + 0.5) : 0) * 0.7 : dy / (bot + 0.5)
        set(x, y + dy, dy === -top && top > 0 ? "r" : a < 0.34 ? "W" : a < 0.6 ? "r" : a < 0.82 ? "+" : "=")
      }
    }
  }
  if (stage === 1) {
    swooshArc(x0 - 8, 1.4, 4.2, 0.6)        // the arrow's wake, 24 px long and 6-7 px deep
    crescent(x0 + 1, 9, 4, 1)                // the string's snap, as tall as the bow
    set(47, y, "j"); set(46, y, "j"); set(47, y - 1, "j"); set(47, y + 1, "j")
  } else if (stage === 2) {
    crescent(x0 + 4, 8, 4, 1, [3, 6])        // thinner, drifted forward and breaking up
    for (const [a, b] of [[x0 + 1, x0 + 3], [x0 + 6, x0 + 8]]) for (let x = a; x <= b; x++) set(x, y, x === a ? "=" : "+")
    swooshArc(x0 + 9, 1, 2.6, 0.6)
    set(47, y, "j")
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function lyra(c, f) {
  const F = new Map(), FX = new Set()
  const ux = f.ux || 0
  const U = (p) => add(p, [ux, f.by || 0])     // the upper body's offset (lean, bob)
  const fa = f.farArm, ph = f.ph || 0
  if (!fa.front) arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)   // at rest the far arm hangs behind the cape
  capeOuter(F, f.cape.map(U), ph)
  const hx = 18 + ux, hy = 14 + f.by + (f.hy || 0)
  const tailKeys = tail(F, f.tail.map(U), [2.6, 2.5, 2.3, 2.1, 1.8, 1.5, 1.1, 0.5], ph, hoodPart(hx, hy))
  if (fa.front) {   // the draw arm's upper arm, out behind her
    const P = new Part(); P.limb(U(fa.sh), U(fa.el), 1.5, 1.35, "CDEFGH"); lay(F, P, 1)
  }
  leg(F, ...f.legs.far, true)
  capeInner(F, f.cape2.map(U), ph)   // the inner lobe falls over the far leg
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 23 + f.by)
  cowl(F, ux, f.by)
  if (fa.front) {   // its forearm forward behind the hood, a green sleeve, the bracer at the wrist, the hand at the chin
    const P = new Part(), e = U(fa.el), h = U(fa.hand), w = [e[0] + (h[0] - e[0]) * 0.7, e[1] + (h[1] - e[1]) * 0.7]
    P.limb(e, w, 1.3, 1.1, "BCDEFGH"); P.limb(w, h, 1.05, 1.0, "OPQRST"); P.limb(h, h, 1.1, 1.1, "mnopq"); lay(F, P, 1)
  }
  head(F, hx, hy, tailKeys)
  lock(F, [[24, 23], [24.5, 25], [25, 27]].map((p) => add(p, [ux, f.by + (f.hy || 0)])))
  const na = f.nearArm, b = f.bow
  bow(F, FX, ...U([b.gx, b.gy]), b.bend, ...(b.s ? U(b.s) : [null, null]), b.up || 9, b.down || 8, b.buzz || 0)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  const cp = U([24, 24]).map(Math.round); clasp(F, cp[0], cp[1])
  for (const [dx, dy, k] of EYE) { F.set(hx + dx + "," + (hy + dy), k); FX.add(hx + dx + "," + (hy + dy)) }
  if (f.arrow) { const [x0, x1, y] = f.arrow; arrow(F, FX, x0 + ux, x1 + ux, y + f.by, f.glint) }
  if (fa.front && f.arrow) { const P = new Part(); P.limb(U(fa.hand), U(fa.hand), 1.1, 1.1, "mnopq"); lay(F, P, 1) }   // the fingers on the nock
  silhouette(F, FX)
  if (f.swoosh) swoosh(F, FX, f.swoosh[0] + ux, f.swoosh[1] + f.by, f.swoosh[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
const TAIL0 = [[22, 16], [20.5, 13], [18.3, 12.6], [16.8, 14.4], [16, 17.4], [15, 20.6], [13.6, 23.8], [12.2, 26.6]]
// The hood's tail swung: each point moves back by `back` and sways by `amp` at phase ph, more toward
// the tip (the root stays tied).
const tailAt = (ph, amp, back = 0, lift = 0) => TAIL0.map(([x, y], i) => {
  const w = Math.pow(i / (TAIL0.length - 1), 1.3)
  return [x - back * w + amp * Math.sin(ph - i * 0.75) * w, y - lift * w + amp * 0.6 * Math.cos(ph - i * 0.75) * w]
})
// The cape's line from the shoulder: it falls back and down; `back` streams it out level behind her
// (walking), the ripple runs down it at phase ph.
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 24], [18, 27], [16.5, 29.5], [15.2, 31.8], [14, 33.8], [13, 35.2], [12.2, 36]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.25 + amp * Math.sin(ph - i * 1.0) * w * 0.7, y - back * w * 0.55 + amp * Math.sin(ph - i * 1.0 + 1.2) * w]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 1.0, amp * 0.8, back * 0.6).slice(0, 6).map(([x, y], i) => [x + 2 + i * 0.35, y + 0.5])

// Legs: hips at (21, 30) far and (25, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -5, 0, by), near: legAt(25, 3, 0, by) })

// The arms and the bow at rest: the bow held upright by her side, a little forward; `sw` swings the
// far arm (walking), `bx` the bow hand.
const REST_ARMS = (sw = 0, bx = 0) => ({
  farArm: { sh: [20, 25], el: [19 + sw * 0.5, 28], hand: [19 + sw, 31] },
  nearArm: { sh: [25, 25], el: [26 + bx * 0.5, 27], hand: [30 + bx, 28] },
  bow: { gx: 32 + bx, gy: 28, bend: 2, up: 8, down: 7 },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the cape rippling
// out behind in the wind and the hood's tail swaying a beat behind it.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ph, ...REST_ARMS(), legs: STAND(by),
    cape: capeAt(ph, 2.0, 2.2 + Math.sin(ph) * 2.8), cape2: capeIn(ph, 2.0, 2.2 + Math.sin(ph - 1.0) * 2.8),
    tail: tailAt(ph, 2.2, 0.8 + Math.sin(ph - 1.6) * 1.6),
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
    cape: capeAt(ph, 1.8, 4.5), cape2: capeIn(ph, 1.8, 4.5),
    tail: tailAt(ph, 1.4, 2.6, 1.2),
  }
})

// Attack (14 fps, release on the 6th): lift the bow, nock, draw, full draw to the chin, hold,
// loose (the string snaps forward, the crescent and streak fly), follow through, lower.
const SHOT_Y = 24
const AIM = { sh: [25, 25], el: [29, 25], hand: [32, 24] }   // the bow arm held out level
const ATTACK_UP = [
  // k0 lift: the bow comes up and forward, the draw hand to the string with the arrow
  { farArm: { sh: [20, 25], el: [20, 28], hand: [27, 27], front: true }, nearArm: { sh: [25, 25], el: [28, 27], hand: [31, 27] }, bow: { gx: 32, gy: 27, bend: 2 }, arrow: [26, 33, 27] },
  // k1 nock: the bow arm level, the arrow on the string
  { farArm: { sh: [20, 25], el: [20, 26], hand: [28, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, s: [29, 24] }, arrow: [29, 37, SHOT_Y] },
  // k2 draw: the string halfway back, the elbow rising behind
  { ux: -1, farArm: { sh: [20, 25], el: [16, 22], hand: [27, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 3, s: [27, 24] }, arrow: [27, 36, SHOT_Y] },
  // k3 full draw to the chin, the elbow out behind
  { ux: -1, farArm: { sh: [20, 25], el: [15, 21], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y] },
  // k4 hold: the tip glints
  { ux: -1, farArm: { sh: [20, 25], el: [15, 21], hand: [25, 24], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 4, s: [25, 24] }, arrow: [25, 35, SHOT_Y], glint: true },
  // k5 loose: the string snaps forward past straight, the hand flies back open, the crescent and streak
  { ux: -1, farArm: { sh: [20, 25], el: [15, 23], hand: [20, 21], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: -1 }, swoosh: [33, SHOT_Y, 1] },
  // k6 follow-through: the bow still up, the string buzzing, the release fading
  { ux: 0, farArm: { sh: [20, 25], el: [16, 25], hand: [20, 23], front: true }, nearArm: AIM, bow: { gx: 33, gy: 24, bend: 2, buzz: 1 }, swoosh: [33, SHOT_Y, 2] },
  // k7 lower: the bow comes down
  { farArm: { sh: [20, 25], el: [19, 28], hand: [20, 30] }, nearArm: { sh: [25, 25], el: [27, 28], hand: [31, 28] }, bow: { gx: 32, gy: 28, bend: 2 } },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 8) * TAU
  const back = [1.5, 1.5, 1, 0.6, 0.6, 6, 4, 2.2][k], lift = [0, 0, 0, 0, 0, 3, 1.5, 0][k]   // gathered on the draw, flung back by the loose
  return {
    by: 0, hy: 0, ph, ...u, legs: STAND(0),
    cape: capeAt(ph, 1.4, back), cape2: capeIn(ph, 1.4, back), tail: tailAt(ph, 1.0, 0.6 + back * 0.7, lift),
  }
})
// Shooting on the move: attack pose k over walk step j (the legs, bob, cape and tail of the walk).
const ATTACK_WALK = []
for (let k = 0; k < 8; k++) for (let j = 0; j < 8; j++) {
  const w = WALK[j], kick = [0, 0, -0.5, -1, -1, 2.5, 1.5, 0][k], lift = [0, 0, 0, 0, 0, 2, 1, 0][k]   // the loose flings them back
  ATTACK_WALK.push({ ...ATTACK[k], by: w.by, ph: w.ph, legs: w.legs, cape: capeAt(w.ph, 1.8, 4.5 + kick), cape2: capeIn(w.ph, 1.8, 4.5 + kick), tail: tailAt(w.ph, 1.4, 2.6 + kick * 0.6, 1.2 + lift) })
}

const ALL = [...IDLE, ...WALK, ...ATTACK, ...ATTACK_WALK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => lyra(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => lyra(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 8, fps: 14 }, (c) => lyra(c, ATTACK[c.frame]))
anim("ranger_f", { ...BOX, frames: 88, fps: 10 }, (c) => lyra(c, ALL[c.frame]))
