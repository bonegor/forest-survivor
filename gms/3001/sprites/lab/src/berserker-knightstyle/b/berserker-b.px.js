// Ulfric the Berserker, "Knight style B (Raider)": a Norse raider in the plumed Knight's style. Bare
// head, long red hair and a braided red beard that whip as the Knight's plume does, blue-grey war
// paint across the eyes and arms, a heavy fur cape streaming behind, iron-banded leather, twin bearded
// axes, a savage forward lean. No black outline: every edge a dark tone of its own material,
// hue-shifted ramps (cool purple shadows, warm light).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the chop lands on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build berserker-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/berserker_b.png <sheet>
pal({
  // fur (cape, mantle, boot wraps): purple-black shadows, warm sand light
  0: "#17111d", 1: "#251b2b", 2: "#362838", 3: "#574350", 4: "#735a5c", 5: "#907466", 6: "#ae9074", 7: "#caad88", 8: "#e5cea4",
  // leather (jerkin, trousers, boots, hafts): violet-brown shadows, ochre light
  L: "#1c0e17", l: "#2d151d", M: "#4a2427", m: "#6a372c", N: "#895033", n: "#a5683d", O: "#c0824b", o: "#daa263",
  // iron (bands, axe heads): purple-grey shadows, pink-white light
  U: "#1d1729", V: "#2c2540", u: "#403856", h: "#5a516f", i: "#776e8c", H: "#968dab", I: "#b8afc7", J: "#d9d0e0", j: "#f6eff3",
  // skin
  K: "#3b1822", k: "#5a2830", f: "#7f3d3c", r: "#b2614e", F: "#d3825e", P: "#eaa47b", p: "#f9c89f",
  // the accent: red hair and beard, oxblood to flame
  Z: "#2e0709", z: "#530f0f", t: "#7e1c12", y: "#a92e15", T: "#cf481a", Y: "#ec6a23", Q: "#fb9438", q: "#ffc56b",
  // blue-grey war paint
  A: "#1e2742", B: "#344869", C: "#52709a", D: "#7d9ac0",
  // eye, the chop's swoosh
  w: "#f4e9e3", x: "#2a0d1c", W: "#ffffff", v: "#efe0ee", s: "#c9b5d6",
})
ramps("012345678", "LlMmNnOo", "UVuhiHIJj", "KkfrFPp", "ZztyTYQq", "ABCD", "svW")

// ------------------------------------------------------------------ the compositor (as Ranger C's)
// Each part paints into its own map; laid on the frame, its boundary pixels step darker along their
// own ramp, so every silhouette and overlap is edged in its own darkest tones, never a black line.
const COARSE = ["02468", "LMNOo", "UuiIj", "KfFp", "ZtTYq", "ABCD", "svW"]
const FINE = ["012345678", "LlMmNnOo", "UVuhiHIJj", "KkfrFPp", "ZztyTYQq", "ABCD", "svW"]
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
  // A flowing mass along a polyline (hair, a cape's fall): radius rs[i] at pts[i], lit from `light`,
  // darker toward its end (`fade`), strand highlights where `streak(T, s)` holds, and a ragged edge
  // where `rag(x, y, T, edge)` says to leave a pixel out.
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, streak = null, lift = 0.08, rag = null } = {}) {
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
        if (rag && rag(x, y, best.T, best.m > -0.9)) continue
        const n = best.d < 0.01 ? 0 : (best.ox * -lx + best.oy * -ly) / best.d
        let v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (streak && streak(best.T, -best.s, x, y) && q < ramp.length - 1) q++
        this.px(x, y, ramp[q])
      }
    return this
  }
}
function lay(F, part, edge = 2, open = null, keep = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    if (keep && keep(x, y, k)) out = false
    F.set(key, out ? darker(k, "KkfrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y <= 39) c.px(x, y, k) } }   // the ground hides what bites below the soles
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
const fhash = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n) }

// ------------------------------------------------------------------ the parts
// The head, 10x10 at (22, 12) at rest, 3/4 to the right: red hair swept back off a bare brow, a band
// of blue war paint across the eye (one pale eye pixel glaring out of it), a nose a pixel proud of the
// face, the ear in the hair, a red moustache over the beard's root.
const HEAD = `
  ..zyyTy...
  .ztyTYYTt.
  ztyTYQYrFr.
  ztyTTyrFPF.
  ztTyfrBCDC.
  zyTtkfAwxPp
  zyTtfrFFPF.
  .ztzkfrFFrf
  ..zt.zyTTYy
  .....ztyTy.`
function head(F, x0, y0, hairKeys) {
  lay(F, new Part().grid(x0, y0, HEAD), 2, (x, y, dx, dy) => hairKeys.has(x + dx + "," + (y + dy)) || (dy > 0 && x - x0 < 9))
}

// The jerkin, 12x10 at (16, 21) at rest: brown leather over a broad chest, an iron band across it,
// an iron belt with a bright buckle, and the leather tassets over the hips. Lit from the upper left.
const TORSO = `
  ..mNnnnNNm..
  .MNnOooOnNNm
  .MNnOoOnnNNm
  .MuhiHihhuuM
  ..MNnOnnNNm.
  ..MNnnnNNm..
  ..lMNnNNMl..
  ..uhiIJihu..
  ..MmNnNnmM..
  .LMmNmMmNmL.`
function torso(F, x0, y0) { lay(F, new Part().grid(x0, y0, TORSO), 2) }

// A leg: hip, knee, ankle; leather trousers, a fur-wrapped boot from the knee, a leather foot.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 2.0, 1.6, far ? "MmNn" : "mNnOo")
  P.limb(knee, ankle, 1.7, 1.4, far ? "3456" : "345678")
  // the binding across the wrap
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 2, far ? "M" : "N"); P.px(kx, ky + 1, far ? "M" : "N"); P.px(kx + 1, ky, far ? "l" : "M")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "M" : "N")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "l" : "M")
  lay(F, P, 2)
}

// A bare arm: shoulder, elbow, hand. Big skin limbs with a band of war paint round the upper arm, a
// leather bracer with an iron ring, a skin fist.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 2.3, 1.8, far ? "kfr" : "kfrFPp")
  // the paint band: pixels of the upper arm about halfway down it turn blue-grey
  const dx = el[0] - sh[0], dy = el[1] - sh[1], dd = dx * dx + dy * dy || 1
  for (const [key, k] of [...P.m]) {
    const [x, y] = key.split(",").map(Number)
    const t = ((x - sh[0]) * dx + (y - sh[1]) * dy) / dd
    if (t > 0.42 && t < 0.42 + 1.6 / Math.sqrt(dd)) P.m.set(key, far ? "A" : { k: "A", f: "A", r: "B", F: "B", P: "C", p: "D" }[k] || "B")
  }
  const w = [el[0] + (hand[0] - el[0]) * 0.35, el[1] + (hand[1] - el[1]) * 0.35]
  P.limb(el, w, 1.7, 1.6, far ? "kf" : "kfrFP")
  P.limb(w, hand, 1.6, 1.4, far ? "lM" : "MmNnO")
  const wx = (w[0] + hand[0]) / 2, wy = (w[1] + hand[1]) / 2
  P.limb([wx, wy], [wx, wy], 0.9, 0.9, far ? "uh" : "hiI")
  P.limb(hand, hand, 1.5, 1.5, far ? "fr" : "frFP")
  lay(F, P, 2)
}

// A bearded axe gripped at g, its haft pointing at angle `ang` (degrees, screen), the head L px up the
// haft, the blade on the side the swing leads (or the other with `flip`). Wood haft, iron head with a
// bright cutting edge that is never darkened.
function axe(F, g, ang, { L = 9, flip = false, far = false } = {}) {
  const a = (ang * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], v = flip ? [u[1], -u[0]] : [-u[1], u[0]]
  const H = new Part()
  for (let s = -2.5; s <= L + 0.8; s += 0.2) H.px(g[0] + u[0] * s, g[1] + u[1] * s, s < -1.5 ? (far ? "u" : "i") : far ? "M" : s > L - 4 ? "N" : "n")
  lay(F, H, 1)
  const poly = [[L + 1.4, -1.2], [L + 1.4, 1.4], [L + 2.8, 3.2], [L + 3.0, 5.0], [L + 1.2, 6.0], [L - 1.5, 6.1], [L - 4.6, 5.4], [L - 3.6, 4.0], [L - 1.6, 2.2], [L - 0.8, 1.0], [L - 0.8, -1.2]]
  const inside = (su, sv) => {
    let ins = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > sv) !== (yj > sv) && su < ((xj - xi) * (sv - yi)) / (yj - yi) + xi) ins = !ins
    }
    return ins
  }
  const P = new Part(), edgeOf = new Map()
  const c = [g[0] + u[0] * L + v[0] * 2, g[1] + u[1] * L + v[1] * 2]
  for (let y = Math.floor(c[1] - 7); y <= c[1] + 7; y++) for (let x = Math.floor(c[0] - 7); x <= c[0] + 7; x++) {
    const rx = x - g[0], ry = y - g[1], su = rx * u[0] + ry * u[1], sv = rx * v[0] + ry * v[1]
    if (!inside(su, sv)) continue
    let k
    if (sv > 4.9) k = far ? "I" : "j"
    else if (sv > 3.9) k = far ? "H" : su > L - 1 ? "J" : "I"
    else if (sv > 1.5) k = far ? "i" : su > L ? "I" : "H"
    else k = far ? "h" : "i"
    P.px(x, y, k); edgeOf.set(x + "," + y, sv > 3.9)
  }
  lay(F, P, 1, null, (x, y) => edgeOf.get(x + "," + y))
}

// The fur cape: a heavy pelt from the shoulders streaming behind, the near side lit, tufts along its
// ragged hem, and a darker inner fold following a beat behind.
function cape(F, spine, spine2) {
  const P = new Part()
  const rag = (x, y, T, edge) => edge && T > 0.7 && fhash(x, y) < 0.4
  P.strand(spine2, [2.4, 3.0, 3.2, 3.0, 2.2, 0.8], "12345", { light: [-0.5, -1], fade: 0.3, lift: 0.0, rag })
  P.strand(spine, [2.6, 3.4, 3.8, 3.6, 2.8, 1.2], "2345678", { light: [-0.5, -1], fade: 0.4, lift: 0.08, rag,
    streak: (T, s) => (T > 0.15 && T < 0.6 && Math.abs(s - 0.4) < 0.18) || (T > 0.45 && T < 0.9 && Math.abs(s + 0.25) < 0.18) })
  lay(F, P, 2)
}

// The fur mantle: a thick roll of pelt over both shoulders, joining the cape.
function mantle(F, ox, oy) {
  const P = new Part()
  P.strand([[17.5 + ox, 21.5 + oy], [21 + ox, 20.5 + oy], [25 + ox, 21 + oy], [28 + ox, 22 + oy]], [1.9, 2.1, 2.0, 1.5], "234678",
    { light: [-0.4, -1], fade: 0.1, lift: 0.1 })
  lay(F, P, 2, (x, y, dx, dy) => dy < 0 && x > 21 + ox)
}

// The hair: one long red mass from the crown, whipping back as the Knight's plume does, and a thin
// braid parting from it halfway, an iron bead at its end, flicking a beat behind.
function hair(F, pts, braid) {
  const P = new Part()
  P.strand(braid, [0.9, 0.8, 0.7, 0.5], "ztyTY", { light: [-0.3, -1], fade: 0.2, lift: 0.05, streak: (T) => Math.floor(T * 9) % 2 === 0 })
  const e = braid[braid.length - 1]
  P.px(e[0], e[1] + 1, "I"); P.px(e[0], e[1] + 2, "h")
  P.strand(pts, [2.0, 2.0, 1.8, 1.5, 1.2, 0.9, 0.4], "ztyTYQq", { light: [-0.3, -1], fade: 0.3, lift: 0.0,
    streak: (T, s) => (T > 0.05 && T < 0.3 && Math.abs(s - 0.4) < 0.25) || (T > 0.4 && T < 0.85 && Math.abs(s + 0.3) < 0.18) })
  lay(F, P, 2)
  return new Set(P.m.keys())
}
// The beard: a braid from the chin down over the chest, an iron bead near its tip.
function beard(F, pts) {
  const P = new Part()
  P.strand(pts, [1.6, 1.4, 1.0, 0.5], "ztyTYQ", { light: [-0.5, -1], fade: 0.25, lift: 0.1,
    streak: (T, s) => T > 0.2 && Math.abs(s - 0.2) < 0.3 })
  const b = pts[2]
  P.px(b[0], b[1], "I"); P.px(b[0], b[1] + 1, "h")
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// The chop's swoosh: a crescent round (cx, cy) from angle a0 (its tail) to a1 (its head, where the
// axe is), widening toward the head: white at the outside, lilac inside. Stops at the ground.
function swoosh(F, cx, cy, R, a0, a1, thick, { inner = false, broken = false } = {}) {
  for (let y = 0; y <= 39; y++) for (let x = 0; x < 48; x++) {
    let a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI
    while (a < a0) a += 360
    if (a > a1) continue
    const t = (a - a0) / (a1 - a0), th = 0.6 + thick * Math.pow(t, 1.3), d = Math.hypot(x - cx, y - cy)
    if (d > R + 0.5 || d < R + 0.5 - th) continue
    if (broken && (t < 0.35 || (t > 0.55 && t < 0.62) || fhash(x, y) < 0.25)) continue
    const f = (R + 0.5 - d) / th
    F.set(x + "," + y, inner ? (f < 0.5 ? "v" : "s") : t < 0.2 ? "s" : f < 0.45 ? "W" : f < 0.8 ? "v" : "s")
  }
}
// Chips and sparks thrown up where the axes bite (stage 1 tight, 2 scattered).
function chips(F, x0, stage) {
  const pts = stage === 1
    ? [[0, 0, "q"], [1, -1, "W"], [-1, -1, "Q"], [2, -2, "q"], [-2, -3, "Q"], [3, -1, "v"], [1, -3, "q"], [4, -3, "Y"], [-3, -1, "s"]]
    : [[-3, -5, "Q"], [3, -5, "q"], [5, -3, "Y"], [-1, -6, "Y"], [6, -1, "s"], [-4, -2, "s"], [1, -1, "5"], [2, -1, "6"], [-1, -1, "5"], [0, -1, "6"], [3, -1, "5"]]
  for (const [dx, dy, k] of pts) { const x = x0 + dx, y = 39 + dy; if (x >= 0 && x < 48) F.set(x + "," + y, k) }
}

// ------------------------------------------------------------------ the figure
function ulfric(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  cape(F, f.cape.map(U), f.cape2.map(U))
  if (f.swoosh) for (const s of f.swoosh) swoosh(F, ...U([s[0], s[1]]), ...s.slice(2))
  const fa = f.farArm
  axe(F, U(fa.hand), fa.ang, { flip: fa.flip, far: true })
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 16 + ux, 21 + by)
  mantle(F, ux, by)
  const na = f.nearArm
  const hairKeys = hair(F, f.hair.map(U), f.braid.map(U))
  if (na.behind) arm(F, U(na.sh), U(na.el), U(na.hand), false)   // raised overhead: the arm passes behind the head
  head(F, 22 + ux + (f.hx || 0), 12 + by + (f.hy || 0), hairKeys)
  beard(F, f.beard.map(U))
  if (!na.behind) arm(F, U(na.sh), U(na.el), U(na.hand), false)
  axe(F, U(na.hand), na.ang, { flip: na.flip })
  // the fist closes over the haft
  { const h = U(na.hand).map(Math.round); const P = new Part(); P.limb(h, [h[0] + 0.3, h[1] - 0.3], 1.3, 1.3, "frFP"); lay(F, P, 1) }
  if (f.chips) chips(F, f.chips[0] + ux, f.chips[1])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The hair's line from the crown: up and back off the head, then down his back; it sways and
// streams back (`back`) more toward its tip, the root tied.
const HAIR0 = [[24, 14.5], [21, 15], [18.5, 16.5], [16.5, 19], [15, 22], [13.5, 25], [12, 27.5]]
const hairAt = (ph, amp, back = 0, lift = 0) => HAIR0.map(([x, y], i) => {
  const w = Math.pow(i / (HAIR0.length - 1), 1.3)
  return [x - back * w + amp * Math.sin(ph - i * 0.8) * w, y - lift * w + amp * 0.6 * Math.cos(ph - i * 0.8) * w]
})
// The cape's line from the shoulder, falling back and down; `back` streams it out behind.
// The braid parts from the mass at its third point and hangs lower, swinging a beat later.
const braidAt = (ph, amp, back = 0, lift = 0) => {
  const r = hairAt(ph - 1.2, amp * 1.3, back * 0.8, lift * 0.6)[2]
  return [r, [r[0] - 1.2 - back * 0.3 + amp * 0.4 * Math.sin(ph - 1.8), r[1] + 3.2 - lift * 0.4], [r[0] - 2 - back * 0.6 + amp * 0.8 * Math.sin(ph - 2.4), r[1] + 6.3 - lift * 0.8], [r[0] - 2.4 - back + amp * Math.sin(ph - 3), r[1] + 9.2 - lift]]
}
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 22], [17.5, 25], [15, 28], [13, 31], [11.5, 34], [10.5, 36.5]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.3 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.55 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.5, y + 0.3])
const beardAt = (sw, back = 0) => [[30, 20.5], [30.5 + sw * 0.3 - back * 0.3, 22.5], [30.5 + sw * 0.7 - back * 0.7, 24.5], [30 + sw - back, 26]]

// Legs: hips at (20, 31) far and (25, 31) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 31 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1.5, 34.5 - lift + by * 0.5] : [hx + dx * 0.5 + 0.8, 34.5 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(20, -4, 0, by), near: legAt(25, 4, 0, by) })

// The arms at rest: the near axe held forward and up, its blade low; the far one trailing behind.
const REST_ARMS = (sw = 0, by2 = 0) => ({
  farArm: { sh: [18, 23], el: [15.5 - sw * 0.4, 27 + by2], hand: [14 - sw, 30 + by2], ang: -125 + sw * 6, flip: true },
  nearArm: { sh: [27, 23], el: [30 + sw * 0.4, 27 + by2], hand: [32 + sw, 30 + by2], ang: -72 - sw * 5 },
})

// Idle: a heavy breath (the chest sinks a pixel on f3-5, the head a frame later), the axes rock, the
// cape ripples behind and the hair sways a beat behind it.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  const arms = REST_ARMS(0, [0, 0, 0, 0, 1, 1, 0, 0][i] - by)
  arms.nearArm.ang += Math.round(Math.sin(ph) * 4); arms.farArm.ang -= Math.round(Math.sin(ph) * 4)
  return {
    by, hy, ...arms, legs: STAND(by),
    cape: capeAt(ph, 1.6, 1.5 + Math.sin(ph) * 2.2), cape2: capeIn(ph, 1.6, 1.5 + Math.sin(ph - 0.9) * 2.2),
    hair: hairAt(ph, 1.6, 0.5 + Math.sin(ph - 1.6) * 1.4), braid: braidAt(ph, 1.6, 0.5 + Math.sin(ph - 2.4) * 1.4), beard: beardAt(Math.sin(ph - 2) * 0.8),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[5, 0], [3, 0], [0, 0], [-3, 0], [-5, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(20, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, ux: 1, ...REST_ARMS(sw), legs: walkLegs(i), ph,
    cape: capeAt(ph, 1.4, 4.5), cape2: capeIn(ph, 1.4, 4.5),
    hair: hairAt(ph, 1.0, 3, 1), braid: braidAt(ph, 1.0, 3.5, 1.5), beard: beardAt(0, 1),
  }
})

// Attack (12 fps): both axes come up, overhead, over the top, CRASH down on f19 with a wide white
// crescent, bite the ground (chips and dust), recover.
const ATTACK = [
  // k0 wind-up: he rears back, both axes swing up past his shoulders
  { ux: -1, by: 0, farArm: { sh: [18, 23], el: [16, 19], hand: [18, 15], ang: -110 }, nearArm: { sh: [27, 23], el: [28, 19], hand: [27, 15], ang: -95, behind: true },
    capeB: 1, hairB: -1, hairL: 0, beardB: -1 },
  // k1 full raise: the axes high overhead, hanging back behind his head, the chest thrown out
  { ux: -2, by: -1, hx: -1, farArm: { sh: [18, 23], el: [17, 17], hand: [18, 12], ang: -150 }, nearArm: { sh: [27, 23], el: [23, 16], hand: [21, 11], ang: -128, behind: true },
    capeB: 0, hairB: -2, hairL: -1, beardB: -1.5 },
  // k2 over the top: the axes come over, the swing starting
  { ux: 0, by: 0, farArm: { sh: [18, 23], el: [22, 17], hand: [27, 13], ang: -62 }, nearArm: { sh: [27, 23], el: [30, 18], hand: [32, 14], ang: -50 },
    capeB: 2, hairB: 1, hairL: 0, beardB: 0, swoosh: [[25, 23, 13, -215, -100, 2]] },
  // k3 CRASH: lunging forward and down, both axes chopped down in front, the big crescent
  { ux: 2, by: 1, hx: 1, farArm: { sh: [18, 23], el: [25, 25], hand: [31, 27], ang: 48 }, nearArm: { sh: [27, 23], el: [32, 25], hand: [34, 28], ang: 52 },
    capeB: 5, hairB: 4, hairL: 3, beardB: -2, swoosh: [[28, 24, 15, -175, 50, 5.5], [28, 24, 11.5, -125, 42, 1.8, { inner: true }]], chips: [42, 1] },
  // k4 follow-through: the axes bitten into the ground, the crescent breaking up, chips and dust
  { ux: 2, by: 2, hx: 1, farArm: { sh: [18, 23], el: [24, 27], hand: [30, 30], ang: 62 }, nearArm: { sh: [27, 23], el: [31, 27], hand: [33, 31], ang: 66 },
    capeB: 4, hairB: 3, hairL: 2, beardB: -1.5, swoosh: [[28, 24, 15, -120, 55, 3.5, { broken: true }]], chips: [42, 2] },
  // k5 recover: he straightens, the axes come back up to the guard
  { ux: 1, by: 1, farArm: { sh: [18, 23], el: [16.5, 27], hand: [16, 30], ang: -130, flip: true }, nearArm: { sh: [27, 23], el: [30, 27], hand: [32, 29], ang: -40 },
    capeB: 2.5, hairB: 1.5, hairL: 1, beardB: 0 },
].map((u, k) => {
  const ph = (k / 6) * TAU
  const sw = u.swoosh && u.swoosh.map((s) => [...s.slice(0, 6), s[6] || {}])
  return {
    ...u, swoosh: sw, legs: k === 3 || k === 4 ? { far: legAt(20, -5, 0, u.by), near: legAt(25, 6, 0, u.by) } : STAND(Math.max(0, u.by)),
    cape: capeAt(ph, 1.2, u.capeB), cape2: capeIn(ph, 1.2, u.capeB),
    hair: hairAt(ph, 0.8, u.hairB, u.hairL), braid: braidAt(ph, 0.8, u.hairB * 1.2, u.hairL * 1.3), beard: beardAt(0, u.beardB),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => ulfric(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => ulfric(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => ulfric(c, ATTACK[c.frame]))
anim("berserker_b", { ...BOX, frames: 22, fps: 10 }, (c) => ulfric(c, ALL[c.frame]))
