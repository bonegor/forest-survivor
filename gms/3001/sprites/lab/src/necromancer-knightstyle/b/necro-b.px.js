// Morvath the Necromancer, "Knight style B (Grave lord)": a gaunt hooded lord of the dead in the plumed
// Knight's style. A deep black-violet hood with a crown of bone tines, the skull face inside lit from
// below by the soul-gem at his throat, a bone-spined mantle and a long tattered cloak that streams
// like the Knight's cape, a tapering robe, and a bone-and-iron scythe staff with soulfire on its head.
// Dark main material, green soulfire as the one accent, bone-white highlights. No black outline:
// every edge is a dark tone of its own material; hue-shifted ramps (cool violet shadows, warm lights).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the burst on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build necro-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/necro_b.png <sheet>   (adds the glow rows)
pal({
  // black-violet cloth (the main material): blue-black shadows, dusty mauve light
  0: "#0b0710", 1: "#140d1e", 2: "#1f142e", 3: "#2c1d40", 4: "#3c2753", 5: "#52366a", 6: "#6c4c82", 7: "#8d6a9a", 8: "#b896b4",
  // its half-tones, for the round shading of the robe, cloak and sleeve
  v: "#251836", w: "#342248", x: "#47305f", y: "#5f4276", z: "#7c5b8e", Y: "#a380a7",
  // bone: purple shadows, warm ivory light
  a: "#24182a", b: "#3d2a40", c: "#5e4558", d: "#826a77", e: "#a8958f", f: "#cbbca8", g: "#e6dbc2", h: "#fff6e0",
  // bone lit from below by soulfire
  i: "#557a5a", j: "#9dc489", k: "#d6f2b8",
  // green soulfire (the one accent)
  A: "#061a17", B: "#0b3324", C: "#12552c", D: "#1e7e34", E: "#35a83a", F: "#6bd94a", G: "#adff7a", H: "#ecffd2",
  // the staff's black wood
  l: "#160b10", m: "#261419", n: "#3b2022", o: "#54302d", p: "#714638",
  // the scythe's iron: violet-grey back, pale edge
  q: "#1a1a2c", r: "#2f3150", s: "#535879", t: "#9298b8", u: "#dfe2f2",
})
ramps("012v3w4x5y6z7Y8", "abcdefgh", "aijk", "ABCDEFGH", "lmnop", "qrstu")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those with
// a 4-neighbour outside the part) step darker along their own ramp, so every edge is a dark tone
// of its own material. COARSE: each material's main steps (what an edge darkens by); FINE: the
// half-tones between them, which round shading runs along.
const COARSE = ["02468", "acegh", "aijk", "ACEGH", "lnp", "qsu"]
const FINE = ["012v3w4x5y6z7Y8", "abcdefgh", "aijk", "ABCDEFGH", "lmnop", "qrstu"]
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
const SOFT = "abcdefghijkABCDEFGH"   // bone and fire edges soften by one step only
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
  // A flowing mass along a polyline (the cloak's fall): radius rs[i] at pts[i], lit from `light`,
  // darker toward its end (`fade`), strand highlights where `streak(T, s)` holds, and pixels left
  // out where `cut(T, s)` holds (the tattered strips). T 0..1 along it, s -1..1 across it.
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, streak = null, lift = 0.08, cut = null } = {}) {
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
        if (cut && cut(best.T, -best.s)) continue
        const n = best.d < 0.01 ? 0 : (best.ox * -lx + best.oy * -ly) / best.d
        let v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (streak && streak(best.T, -best.s) && q < ramp.length - 1) q++
        this.px(x, y, ramp[q])
      }
    return this
  }
  // A filled polygon (pixel centres inside), one key or a function of (x, y).
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
// Lay a part on the frame; edge: steps darker for its boundary; open(x, y, dx, dy): sides left light.
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, SOFT.includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 40) c.px(x, y, k) } }
const set = (F, x, y, k) => F.set(Math.round(x) + "," + Math.round(y), k)
const R = Math.round

// ------------------------------------------------------------------ the parts
// The hooded head, 12x12 at (x0, y0): the hood lit from the upper left, its front rim catching the
// light, a deep shadow inside, and in it the skull in 3/4 to the right, its brow in shadow, two
// green eyes, and the cheekbones, teeth and jaw lit from below by the soul-gem at the throat.
const HEAD = `
  ....45665...
  ..45677765..
  .4567877665.
  .45678776656
  345677542114
  34566541deed
  23455431bGdG
  23445431jD1D
  23444431jkjk
  .2344432k1k1
  .2344332jkj.
  ..23433321..`
function head(F, x0, y0) {
  // the hood's lower back runs on into the mantle without an edge
  lay(F, new Part().grid(x0, y0, HEAD), 2, (x, y, dx, dy) => dy > 0 && x - x0 < 7)
}
// The crown: a circlet of bone around the hood with three tines, the tallest at the front, and the
// green soul-gem at the brow (`gem` its key: it flares on the cast).
function crown(F, x0, y0, gem) {
  const P = new Part().grid(x0 + 2, y0 - 2, `
    .....h..
    ..g..gg.
    ..fe.fe.
    dfgghggf`)
  lay(F, P, 1)
  set(F, x0 + 8, y0 + 1, gem)
}

// The robe: a gaunt, tapering column from the shoulders to a tattered hem that swings; round
// shading lit from the upper left, three folds running down it.
function robe(F, ux, by, hb, hf, sway) {
  const pts = [[24 + ux, 20 + by], [29 + ux, 20 + by], [30.5 + ux, 25 + by], [29 + ux, 30 + by], [hf, 37.5]]
  const n = Math.max(2, Math.round((hf - hb) / 2))
  for (let i = 1; i < n; i++) pts.push([hf + ((hb - hf) * i) / n + (i % 2 ? sway * 0.5 : 0), i % 2 ? 39 : 37.5])
  pts.push([hb + sway, 38.5], [hb + sway * 0.4, 37], [21 + ux, 30 + by], [21.5 + ux, 24 + by])
  const P = new Part().poly(pts, "4")
  const rows = new Map()
  for (const key of P.m.keys()) {
    const [x, y] = key.split(",").map(Number)
    const r = rows.get(y) || [99, -99]
    rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)])
  }
  for (const key of [...P.m.keys()]) {
    const [x, y] = key.split(",").map(Number)
    const [L, Rr] = rows.get(y), w = Math.max(1, Rr - L), u = (x - L) / w
    let v = 0.66 - 0.85 * Math.abs(u - 0.42)
    if (y > 35) v -= 0.08 * (y - 35)
    for (const f of [0.55, 0.8]) {
      const d = (u - f) * w
      if (Math.abs(d) < 0.5) v -= 0.2
      else if (d > -1.5 && d < -0.5 && y > 29 + by) v += 0.08
    }
    P.px(x, y, CL[Math.max(1, Math.min(11, Math.round(v * 14)))])
  }
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

const CL = "012v3w4x5y6z7Y8"   // the cloth, dark to light, with its half-tones

// A bony foot under the hem: a dark wrapping and bone toes, the ankle at (ax, 38 - lift).
function foot(F, ax, lift, far) {
  const P = new Part(), y = 39 - lift
  P.px(ax - 1, y - 1, far ? "2" : "3"); P.px(ax, y - 1, far ? "2" : "4")
  for (let x = ax - 1; x <= ax + 1; x++) P.px(x, y, far ? "1" : "3")
  P.px(ax + 2, y, far ? "c" : "e"); P.px(ax + 3, y, far ? "b" : "d")
  lay(F, P, 1)
}

// The mantle over the shoulders: dark cloth, a tattered lower edge, the bone spines of a spine
// rising from its back like a ruff.
function mantle(F, ux, by) {
  const P = new Part().grid(20 + ux, 21 + by, `
    ..34566654..
    .345677765..
    23456676654.
    .23445544432
    ..2.33.3.2..`)
  lay(F, P, 2, (x, y, dx, dy) => dy < 0 && y < 23 + by)
}
function spines(F, spine, flare) {
  // a ridge of curved bone spines rising from the mantle's back, along the cloak's line, shrinking
  const P = new Part()
  ;[[0.1, 5.5], [0.9, 4.5], [1.8, 3]].forEach(([t, len], i) => {
    const a = spine[Math.floor(t)], b = spine[Math.min(spine.length - 1, Math.floor(t) + 1)], ft = t - Math.floor(t)
    const x = a[0] + (b[0] - a[0]) * ft, y = a[1] + (b[1] - a[1]) * ft - 1
    P.limb([x, y], [x - len * 0.55 - flare * (1 - i * 0.2), y - len * 0.85], 0.8, 0.2, "cdefg")
  })
  lay(F, P, 1)
}

// The cloak: a long tattered black-violet fall from the shoulders, streaming back, the outer lit,
// the inner (nearer the legs) in shade, its end torn into strips of different lengths.
const TORN = [0.82, 0.97, 0.86, 1.01, 0.9]
const torn = (T, s) => { const b = Math.max(0, Math.min(TORN.length - 1, Math.floor(((s + 1) / 2) * TORN.length))); return T > TORN[b] }
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [2.0, 2.4, 2.6, 2.6, 2.4, 2.2], "12v3w4", { light: [-0.5, -1], fade: 0.3, lift: 0.05, cut: torn,
    streak: (T, s) => T > 0.25 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [2.0, 2.8, 3.2, 3.2, 3.0, 2.6], "12v3w4x5y6z7Y8", { light: [-0.5, -1], fade: 0.4, lift: 0.02, cut: torn,
    streak: (T, s) => (T > 0.12 && T < 0.6 && Math.abs(s - 0.5) < 0.18) || (T > 0.45 && T < 0.85 && Math.abs(s + 0.25) < 0.18) })
  lay(F, P, 2)
  // the spine down the cloak: vertebrae along its line, shrinking toward the end
  const pts = spine, segs = []
  let tot = 0
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push([pts[i], pts[i + 1], tot, l]); tot += l }
  const at = (T) => { const d = T * tot; for (const [a, b, s0, l] of segs) if (d <= s0 + l) { const t = (d - s0) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] } return pts[pts.length - 1] }
  ;[[0.12, 2], [0.27, 2], [0.42, 1], [0.56, 1], [0.69, 0]].forEach(([T, sz]) => {
    const [x, y] = at(T).map(R)
    set(F, x, y - 1, sz > 0 ? "g" : "f"); set(F, x, y, sz > 0 ? "e" : "d")
    if (sz > 1) { set(F, x + 1, y - 1, "f"); set(F, x + 1, y, "c") }
  })
}

// The near arm: a black-violet bell sleeve to a bony hand on the staff.
function sleeve(F, sh, el, hand) {
  const P = new Part()
  P.limb(sh, el, 1.5, 1.6, "2v3w4x5y6z")
  const cuff = [el[0] + (hand[0] - el[0]) * 0.65, el[1] + (hand[1] - el[1]) * 0.65]
  P.limb(el, cuff, 1.7, 2.1, "2v3w4x5y")
  // the cuff's torn hem hanging under the wrist
  P.px(cuff[0] - 1, cuff[1] + 2.4, "2"); P.px(cuff[0] + 0.6, cuff[1] + 2.2, "3")
  lay(F, P, 2)
  const B = new Part()
  B.limb(cuff, hand, 0.6, 0.6, "def")
  lay(F, B, 1)
}
function hand(F, hx, hy) {
  hx = R(hx); hy = R(hy)
  const P = new Part().grid(hx - 1, hy - 1, `
    ef.
    fgf
    dee`)
  lay(F, P, 1)
}

// The staff: a black-wood shaft from the foot (bx, by) to the head (tx, ty), bone rings bound on
// it, a small horned skull at the head with the soulfire on it, and the scythe blade curving
// forward and down from the skull, its inner edge pale.
function staff(F, bx, by, tx, ty) {
  const n = Math.max(Math.abs(by - ty), 1)
  for (let i = 0; i <= n; i++) {
    const x = R(tx + ((bx - tx) * i) / n), y = R(ty + ((by - ty) * i) / n)
    set(F, x, y, i < 2 ? "o" : "p"); set(F, x + 1, y, i > n - 3 ? "l" : "m")
    if (i > 2 && i % 7 === 3) { set(F, x, y, "f"); set(F, x + 1, y, "d") }
  }
  // the scythe blade, forward from the skull: the iron back on top, the pale edge underneath
  tx = R(tx); ty = R(ty)
  lay(F, new Part().grid(tx + 2, ty - 2, `
    .rrsss.....
    rssttttss..
    rtuuhuutts.
    ......uuts.
    ........ut.
    .........u.`), 1)
  // the skull at the head
  const S = new Part().grid(tx - 1, ty - 2, `
    c.c.
    efgd
    eGfG
    dfed
    .ec.`)
  lay(F, S, 1)
}

// Soulfire: a flame of height h with its root at (x, y), flickering by `ph`; brighter at its core.
function soulflame(F, x, y, h, w, ph) {
  for (let j = 0; j < h; j++) {
    const t = j / h, half = w * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.9)) * (1 - t * 0.85)
    const cx = x + Math.sin(ph + t * 3) * t * 1.2
    for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
      const a = Math.abs(dx) / Math.max(half, 0.5)
      if (a > 1.05) continue
      const v = (1 - a) * (1 - t * 0.7)
      set(F, cx + dx, y - j, v > 0.6 ? "H" : v > 0.38 ? "G" : v > 0.18 ? "F" : t > 0.7 ? "D" : "E")
    }
  }
}
// The cast's motes: green sparks drawn in toward (x, y) from radius r.
function motes(F, x, y, r, n, ph) {
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * Math.PI * 2, rr = r * (0.75 + 0.25 * Math.sin(i * 2.3))
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9
    set(F, px, py, i % 3 ? "F" : "G")
    if (i % 2) set(F, px - Math.cos(a), py - Math.sin(a), "D")
  }
}
// The burst: a ring and rays of soulfire out from (x, y), with a white-green core (stage 1), or the
// ring broken and fading with the rays gone to sparks (stage 2).
function burst(F, x, y, stage) {
  if (stage === 1) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2, long = a % 2 === 0, L = long ? (a % 4 === 0 ? 10 : 8) : 5
      for (let r = 2; r <= L; r++) set(F, x + Math.cos(ang) * r, y + Math.sin(ang) * r, r < L * 0.45 ? "H" : r < L * 0.75 ? "G" : "F")
    }
    for (let a = 0; a < 48; a++) { const ang = (a / 48) * Math.PI * 2; set(F, x + Math.cos(ang) * 6.5, y + Math.sin(ang) * 6.5, a % 4 === 0 ? "H" : "G") }
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) set(F, x + dx, y + dy, dx * dx + dy * dy <= 2 ? "H" : "G")
  } else {
    for (let a = 0; a < 40; a++) {
      if (a % 5 === 2 || a % 7 === 0) continue
      const ang = (a / 40) * Math.PI * 2; set(F, x + Math.cos(ang) * 9, y + Math.sin(ang) * 8.5, a % 3 ? "E" : "F")
    }
    for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2 + 0.2; set(F, x + Math.cos(ang) * 11, y + Math.sin(ang) * 10, "G") }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(F, x + dx, y + dy, dx || dy ? "F" : "G")
  }
}
// The dead answer: soulfire tongues out of the ground in front of him and a bony hand clawing up.
function graveFire(F, stage) {
  if (stage === 1) {
    soulflame(F, 36, 39, 7, 2.2, 0.5); soulflame(F, 45, 39, 9, 2.4, 2.1)
    const P = new Part().grid(39, 31, `
      f.g..
      e.f.g
      efgff
      .fge.
      .ef..
      .de..
      .cd..`)
    lay(F, P, 1)
  } else if (stage === 2) {
    soulflame(F, 36, 39, 4, 1.6, 1.5); soulflame(F, 45, 39, 5, 1.8, 3)
    set(F, 37, 32, "F"); set(F, 43, 29, "G"); set(F, 40, 27, "F"); set(F, 46, 32, "E")
    const P = new Part().grid(39, 33, `
      f.g..
      efgff
      .fge.
      .ef..
      .de..`)
    lay(F, P, 1)
  } else if (stage === 3) {
    set(F, 42, 36, "E"); set(F, 44, 33, "F"); set(F, 39, 35, "E")
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function morvath(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  cape(F, f.cape.map(U), f.cape2.map(U))
  spines(F, f.cape.map(U), f.flare || 0)
  foot(F, f.feet[0][0], f.feet[0][1], true)
  robe(F, ux, by, f.hem[0], f.hem[1], f.sway || 0)
  foot(F, f.feet[1][0], f.feet[1][1], false)
  // a belt of bone beads at the waist
  for (let x = 21; x <= 29; x++) set(F, x + ux, 29 + by, x % 2 ? "2" : x === 26 ? "f" : "d")
  mantle(F, ux, by)
  head(F, 21 + ux + (f.hx || 0), 11 + by + (f.hy || 0))
  crown(F, 21 + ux + (f.hx || 0), 11 + by + (f.hy || 0), f.gem || "G")
  // the soul-gem clasp at the throat that lights his jaw from below
  const cx = 28 + ux, cy = 23 + by
  set(F, cx, cy, f.gem === "H" ? "H" : "G"); set(F, cx + 1, cy, "F"); set(F, cx, cy + 1, "E"); set(F, cx + 1, cy + 1, "D")
  const s = f.staff, a = f.arm, g = s[4] ?? 0.6
  const grip = [s[2] + (s[0] - s[2]) * g, s[3] + (s[1] - s[3]) * g]
  sleeve(F, U(a.sh), U(a.el), grip)
  staff(F, s[0], s[1], s[2], s[3])
  hand(F, ...grip)
  if (f.fire) soulflame(F, s[2] + 0.5, s[3] - 3, f.fire[0], f.fire[1], f.fire[2])
  if (f.orb) for (let dy = -f.orb; dy <= f.orb; dy++) for (let dx = -f.orb; dx <= f.orb; dx++) {
    const d = dx * dx + dy * dy
    if (d <= f.orb * f.orb + 1) set(F, s[2] + 0.5 + dx, s[3] - 3 + dy, d <= 1 ? "H" : "G")
  }
  if (f.motes) motes(F, s[2] + 0.5, s[3] - 4, ...f.motes)
  if (f.burst) burst(F, R(s[2] + 0.5), R(s[3] - 4), f.burst)
  if (f.grave) graveFire(F, f.grave)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The cloak's line from the shoulder, falling back and down; `back` streams it out behind him, a
// ripple runs down it at phase ph.
const capeAt = (ph, amp, back = 0) => {
  const base = [[21, 23], [19, 26], [17, 29], [15.5, 32], [14, 35], [12.5, 37.5]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.25 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.45 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2.5 + i * 0.45, y])

// The staff held upright in the near hand, its foot on the ground ahead of him.
const REST = (dx = 0, sbob = 0, lift = 0) => ({
  arm: { sh: [27, 24], el: [29 + dx * 0.4, 28] },
  staff: [36 + dx * 1.3, 39 - lift + sbob, 34 + dx * 0.8, 9 - lift + sbob, 0.6],
})

// Idle: a slow breath (the body sinks a pixel on f3-5, the head a frame later), the cloak rippling
// out behind him, the hem swaying, the soulfire flickering on the staff.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, 0), feet: [[21, 0], [26, 0]], hem: [19, 31], sway: Math.sin(ph - 1) * 1.2,
    cape: capeAt(ph, 1.6, 1.5 + Math.sin(ph) * 2.2), cape2: capeIn(ph, 1.6, 1.5 + Math.sin(ph - 0.9) * 2.2),
    fire: [4 + (i % 4 === 1 ? 1 : 0), 1.3, ph * 2], gem: i === 2 || i === 3 ? "H" : "G",
  }
})

// Walk: a planted, gliding stride under the robe (only the bone toes show), the body low on the
// contacts, the cloak streaming back, the staff swinging with the near arm.
const GAIT = [[3, 0], [1.5, 0], [0, 0], [-1.5, 0], [-3, 0], [-2, 1], [0, 2], [2, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-1, -0.5, 0, 0.5, 1, 0.5, 0, -0.5][i]
  const nf = GAIT[i], ff = GAIT[(i + 4) % 8]
  const near = [26 + nf[0], nf[1]], far = [21 + ff[0], ff[1]]
  return {
    by, ux: 1, hx: 0, ...REST(sw * 2, by, 2), feet: [far, near],
    hem: [Math.min(near[0], far[0]) - 1.5, Math.max(near[0], far[0]) + 4], sway: -1 - Math.sin(ph) * 0.8,
    cape: capeAt(ph, 1.3, 4.5), cape2: capeIn(ph, 1.3, 4.5),
    fire: [4, 1.2, ph * 1.5],
  }
})

// Attack (12 fps, the burst on the 4th): the staff drawn back and down, raised high as the
// soulfire gathers on its head, the burst (a great green flare, the dead answering from the
// ground ahead), the flare fading to sparks, the staff coming down.
const ATTACK = [
  { ux: -1, by: 1, arm: { sh: [27, 24], el: [28, 29] }, staff: [36, 39, 31, 11, 0.6], cape: [0, 1.5], fire: [5, 1.5, 0], motes: [8, 6, 0], gem: "H" },
  { ux: 0, by: 0, hy: -1, arm: { sh: [27, 24], el: [30, 27] }, staff: [31, 36, 36, 14, 0.5], cape: [1, 1], fire: [7, 2.2, 1], orb: 1, motes: [6, 8, 0.6], gem: "H", flare: 0.5 },
  { ux: 1, by: 0, hy: -1, arm: { sh: [27, 24], el: [30, 26] }, staff: [30, 35, 37, 13, 0.5], cape: [2, 1.5], fire: [9, 3, 2], orb: 2, motes: [4, 10, 1.2], gem: "H", flare: 1 },
  { ux: 2, by: 0, hy: -1, arm: { sh: [27, 24], el: [30, 26] }, staff: [30, 35, 37, 13, 0.5], cape: [3, 6], burst: 1, grave: 1, gem: "H", flare: 2 },
  { ux: 2, by: 0, hy: 0, arm: { sh: [27, 24], el: [30, 26] }, staff: [30, 35, 37, 13, 0.5], cape: [4, 4.5], burst: 2, grave: 2, fire: [4, 1.5, 3], gem: "H", flare: 1 },
  { ux: 1, by: 1, arm: { sh: [27, 24], el: [29, 28] }, staff: [36, 39, 34, 10, 0.6], cape: [5, 2.5], fire: [4, 1.3, 4], grave: 3 },
].map((u, k) => {
  const ph = (k / 6) * TAU
  return {
    hem: [19 + (u.ux || 0) * 0.5, 31 + (u.ux || 0) * 0.5], feet: [[21, 0], [26 + (k >= 3 && k <= 4 ? 1 : 0), 0]], sway: [0.5, 0, -0.5, -1.5, -1, 0][k],
    ...u, cape: capeAt(ph, 1.2, u.cape[1]), cape2: capeIn(ph, 1.2, u.cape[1]),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => morvath(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => morvath(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => morvath(c, ATTACK[c.frame]))
anim("necro_b", { ...BOX, frames: 22, fps: 10 }, (c) => morvath(c, ALL[c.frame]))
