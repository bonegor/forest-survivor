// Dame Seraphine the Paladin, "Knight style C (barrel helm), both eyes": style C with the head turned a little toward
// the viewer (both eyes in the opening). A crusader-knight woman in a flat-topped cylindrical barrel helm (gold band, a swept wing crest, face showing)
// set apart from the shoulders by a dark gorget, polished silver plate, a long gold-lined white cape
// streaming like the plumed Knight's, and a warhammer haloed in gold light. Gold is the one strong
// accent; white-hot sparks on the smite. No black outline: every edge a dark tone of its own material, hue-shifted ramps.
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the hammer lands on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build paladin-c2.px.js --out <scratch> --only paladin_c2, then
//        node make-sheet.mjs <scratch>/anims/paladin_c2.png <sheet>   (adds the glow rows)
pal({
  // polished silver plate: purple-grey shadows, warm pink light, a white glint
  U: "#1c1530", V: "#2a2040", u: "#3d3257", h: "#54486e", i: "#6e6489", H: "#8d82a4", I: "#ada3bf", J: "#cdc3d6", j: "#ebe1e9",
  // its half-steps, for the round shading of limbs and the hammer's head
  m: "#7d7397", n: "#9e93b2", o: "#bdb3cb", s: "#dcd2e0",
  // the white cape and tabard: lavender-blue shadows, warm ivory light
  0: "#2a2546", 1: "#3c3762", 2: "#56527f", 3: "#77749e", 4: "#9d9bbd", 5: "#c3c0d8", 6: "#e0dde9", 7: "#f4f0f0", 8: "#fffbf3",
  a: "#b1aecc", b: "#d2cfe1", c: "#eae6ed",
  // skin
  K: "#4a1d2a", k: "#6f333a", f: "#94494a", r: "#b56a5b", F: "#d68a6c", P: "#e7aa88", p: "#f8c9a4",
  // the one accent: deep saturated gold, ember-brown shadows to pale light
  Z: "#2e0b08", z: "#561806", t: "#842c06", y: "#b2500a", T: "#d87d12", Y: "#f0ad22", Q: "#ffd650", q: "#fff0a0",
  d: "#c46710", e: "#e69a1a", l: "#f8c43a",
  // the hammer's haft: violet-brown wood
  L: "#1e0e18", M: "#3e1e22", N: "#64352a", O: "#8e5534",
  // eye
  x: "#1a1f42", X: "#4f8fd8",
  // GLOW (the night rows): holy light, pale gold halo, white-hot core
  g: "#ffe48a", G: "#fff6cf", W: "#fffef6",
})
ramps("UVuhimHnIoJsj", "01234a5b6c78", "KkfrFPp", "ZztydTeYlQq", "LMNO", "gGW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp, so nothing has a black line: the
// silhouette and every part laid over another are edged in their own darkest tones.
const COARSE = ["Vuij", "0258", "KfFp", "ZtTQ", "LMNO", "gGW"]
const FINE = ["UVuhimHnIoJsj", "01234a5b6c78", "KkfrFPp", "ZztydTeYlQq", "LMNO", "gGW"]
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
      this.px(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))])
    }
    return this
  }
  // A flowing mass along a polyline (the cape's fall): radius rs[i] at pts[i], lit from `light`,
  // darker toward its end (`fade`), with fold highlights where `streak(T, s)` holds.
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
        const v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (streak && streak(best.T, -best.s) && q < ramp.length - 1) q++
        this.px(x, y, ramp[q])
      }
    return this
  }
}
// Lay a part on the frame. edge: steps darker for its boundary; open: a test (x, y, dx, dy) for
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
    F.set(key, out ? darker(k, "KkfrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const set = (F, x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 1 && y >= 1 && x < 47 && y < 47) F.set(x + "," + y, k) }
// Laying the frame down, the outer silhouette steps one shade darker again (not the light effects),
// so the figure's outer edge is the deepest tone of each material, as on the plumed Knight.
const flush = (c, F) => {
  for (const [key, k] of F) {
    const [x, y] = key.split(",").map(Number)
    const rim = !"gGWqQlYeT".includes(k) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !F.has(x + dx + "," + (y + dy)))
    c.px(x, y, rim ? darker(k, "KkfrFPp".includes(k) ? 0 : 1) : k)
  }
}

// ------------------------------------------------------------------ the parts
// The barrel helm, 8x9 at (20, 12) at rest: a short upright cylinder of silver plate with a flat
// top. Its outer ring is painted in its final edge tones (the frame's flush darkens the silhouette
// once more), so the corners stay square. The flat top is one light tone over a dark seam; the side
// is shaded as a cylinder (a light band toward the upper-left light, falling off to the dark front);
// a gold band runs right across it at the brow; the face looks out of a small opening at the front
// (turned a little toward the viewer: near lash and eye, a pixel of light skin, far lash and eye, the
// cheek at the edge); a dark lower rim under the chin.
const HELM = `
  .VuuuuV.
  VjsssoJu
  VimHHmiV
  VIjJInHu
  zQlYeTdz
  VIjixPxp
  VIjiXpXP
  VIjIiFPr
  .VuhhuV.`
// The gorget under it: a dark steel neck (narrower than the helm, the shoulders dipping in under it)
// flaring to a collar on the shoulders, 6 wide at (x0 + 1, y0 + 9).
const GORGET = `
  .VhiV.
  VuhiHu`
// The wing on the helm's side: three silver feathers swept up and back, lit along their tops.
const WING = `
  ...jjj..
  .jJJjjj.
  jJIJJjj.
  .hHIJjJj
  jhhHIJjJ
  .hhhHIJJ`
// Paint a grid as it is (no edge stepping): the helm's ring already holds its edge tones.
const paint = (F, x0, y0, str) => str.split("\n").map((r) => r.trim()).filter((r) => r)
  .forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") set(F, x0 + i, y0 + j, k) }))
function helm(F, x0, y0, wingLift = 0) {
  paint(F, x0 + 1, y0 + 9, GORGET)
  lay(F, new Part().grid(x0 - 5, y0 - 2 - wingLift, WING), 1)
  paint(F, x0, y0, HELM)
}

// The torso, 10x8 at (18, 22) at rest: the gorget (under the helm's collar), the polished breastplate (a gold cross on it),
// a narrow waist, the gold belt, then the white tabard's skirt with its gold hem.
const TORSO = `
  ....uhIJh..
  ..hi678Jhh.
  .hiH6Y87IH.
  .hi5YQY7HhI
  ..h56Y76hh.
  ..zyTYQQYt.
  ..h567876i.
  ..h456776h.
  ...45676...
  ...34565...
  ....yTYy...`
function torso(F, x0, y0) { lay(F, new Part().grid(x0, y0, TORSO), 2) }

// The near pauldron, 5x4: a round silver plate over the shoulder, gold-edged at its rim.
const PAULDRON = `
  .IJj.
  hIJjJ
  iHIJI
  TYQYT`
function pauldron(F, x, y) { lay(F, new Part().grid(x - 2, y - 2, PAULDRON), 1) }

// A leg: hip, knee, ankle; silver greaves, the sabaton forward of the ankle.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 2.0, 1.55, far ? "himH" : "imHnIoJsj")
  P.limb(knee, ankle, 1.55, 1.3, far ? "himH" : "imHnIoJsj")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx, ky, far ? "H" : "j"); P.px(kx + 1, ky, far ? "i" : "J")   // the knee cop's glint
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "h" : "I")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "u" : "H")
  lay(F, P, 2)
}

// An arm: shoulder, elbow, hand; a silver vambrace, a gauntlet.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.7, 1.4, far ? "himH" : "imHnIoJsj")
  P.limb(el, hand, 1.4, 1.2, far ? "himH" : "imHnIoJsj")
  P.limb(hand, hand, 1.15, 1.15, far ? "iH" : "HIJ")
  lay(F, P, 2)
}

// The cape: two flowing lobes from the shoulders. The outer lobe is the white cloth lit from above;
// the inner lobe (nearer the legs) shows the gold lining in shade. Folds are strand highlights.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.9, 2.3, 2.4, 2.0, 1.2, 0.4], "ztydTeY", { light: [-0.5, -1], fade: 0.35, lift: 0.05,
    streak: (T, s) => T > 0.25 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [2.4, 3.0, 3.2, 2.9, 2.0, 0.6], "34a5b6c78", { light: [-0.5, -1], fade: 0.25, lift: 0.18,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  // the cape hangs from the shoulder line: nothing of it rises past it beside the neck
  for (const key of [...P.m.keys()]) if (+key.split(",")[1] < spine[0][1] - 1) P.m.delete(key)
  lay(F, P, 2)
}

// The veil: white linen falling from under the helm's nape and streaming behind, lit on its top.
function veil(F, pts) {
  const P = new Part()
  P.strand(pts, [1.3, 1.6, 1.4, 0.9, 0.4], "5b6c7888", { light: [-0.5, -1], fade: 0.25, lift: 0.1,
    streak: (T, s) => T > 0.2 && T < 0.7 && Math.abs(s - 0.3) < 0.25 })
  lay(F, P, 2)
}

// The warhammer, gripped at `hand`, pointing at angle `a` (radians, 0 = right, + = down): a violet-
// brown haft with a gold grip ring and pommel, a silver head across its end with gold bands, and a
// halo of holy light around the head (`halo` 0 none, 1-3 pulsing).
function hammer(F, hand, a, len = 9, halo = 0, back = 2) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  // the haft: a dark line behind a lighter one
  for (let s = -back; s <= len; s += 0.5) {
    const x = hand[0] + dx * s, y = hand[1] + dy * s
    set(F, x - nx * 0.5, y - ny * 0.5, "N")
    set(F, x + nx * 0.5, y + ny * 0.5, "M")
  }
  const pom = [hand[0] - dx * back, hand[1] - dy * back]
  set(F, pom[0], pom[1], "Y"); set(F, pom[0] - dx, pom[1] - dy, "t")
  // the head: a block across the haft's end, `len` + 1 .. + 4 along it, 6 across
  const P = new Part(), c = [hand[0] + dx * (len + 2.5), hand[1] + dy * (len + 2.5)]
  for (let y = Math.floor(c[1] - 5); y <= Math.ceil(c[1] + 5); y++) for (let x = Math.floor(c[0] - 5); x <= Math.ceil(c[0] + 5); x++) {
    const ox = x - c[0], oy = y - c[1], al = ox * dx + oy * dy, ac = ox * nx + oy * ny
    if (Math.abs(al) > 2.5 || Math.abs(ac) > 4.6) continue
    // lit from the upper left in screen space, banded in gold across its middle and at the faces
    const lit = -(ox * 0.45 + oy) / 4
    let k = "imHnIoJsjj"[Math.max(0, Math.min(9, Math.floor(5 + lit * 6)))]
    if (Math.abs(ac) > 3.7) k = lit > -0.1 ? "Q" : "T"
    else if (Math.abs(ac) < 0.6) k = lit > 0 ? "Q" : "Y"
    P.px(x, y, k)
  }
  lay(F, P, 1)
  if (halo) {
    // the halo: holy light clinging to the head's rim (shifting with `halo`), two motes circling it
    for (const key of P.m.keys()) {
      const [x, y] = key.split(",").map(Number)
      for (const [ex, ey] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const q = (x + ex) + "," + (y + ey)
        if (P.m.has(q) || F.get(q) && !"gGW".includes(F.get(q))) continue
        if (ey < 0 && (x + halo) % 3 !== 0) set(F, x + ex, y + ey, "g")
      }
    }
    for (const ph of [0]) {
      const th = halo * 1.3 + ph, mx = Math.round(c[0] + Math.cos(th) * 5.5), my = Math.round(c[1] + Math.sin(th) * 4.5)
      if (my <= 39) { set(F, mx, my, "W"); set(F, mx - 1, my, "g"); set(F, mx + 1, my, "g"); if (my > 1) set(F, mx, my - 1, "g"); if (my < 39) set(F, mx, my + 1, "g") }
    }
  }
  return c
}

// The smite: a broad crescent of gold-white light swept from overhead down to the hammer's landing,
// a pillar of light striking down where it lands, rays bursting from the impact. stage 1 = the hit,
// stage 2 = the pillar and the sparks fading.
function smite(F, cx, cy, R, a0, a1, hit, stage, at = hit) {
  if (stage === 1) {
    for (let t = 0; t <= 1; t += 0.006) {
      const a = a0 + (a1 - a0) * t, w = 0.6 + 3.8 * t * t
      for (let r = R - w; r <= R + 1.2; r += 0.4) {
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        if (y > 39) continue
        const edge = r > R + 0.2
        set(F, x, y, t < 0.2 ? "Y" : t < 0.4 ? (edge ? "q" : "Q") : edge ? "W" : r < R - w + 0.8 ? "g" : "G")
      }
    }
    // the pillar of light falling on the foe
    for (let y = 1; y <= 39; y++) {
      const wob = y % 7 === 0 ? 1 : 0
      set(F, hit[0], y, "W"); set(F, hit[0] - 1, y, y > 6 ? "G" : "g"); set(F, hit[0] + 1, y, y > 6 ? "G" : "g")
      if (y > 14 + wob * 3) { set(F, hit[0] - 2, y, "g"); set(F, hit[0] + 2, y, "g") }
    }
    // the flash where the hammer lands: a white-hot core, rays bursting up and out, a shock along the ground
    for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x / 1.25, y)
      if (d <= 4.2 && at[1] + y <= 39) set(F, at[0] + x, at[1] + y, d < 2.2 ? "W" : d < 3.4 ? "G" : "g")
    }
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI, L = k % 2 ? 7 : 10
      for (let s = 4; s <= L; s += 0.6) set(F, at[0] + Math.cos(a) * s * 1.3, at[1] + Math.sin(a) * s, s < L * 0.7 ? "G" : "Q")
    }
    for (let x = at[0] - 11; x <= hit[0] + 4; x++) set(F, x, 39, Math.abs(x - at[0]) < 5 ? "W" : Math.abs(x - at[0]) < 8 ? "G" : "Q")
  } else {
    // the pillar thins and breaks up; white-hot sparks fly
    for (let y = 2; y <= 39; y++) if (y % 5 !== 2) { set(F, hit[0], y, y > 30 ? "W" : "G"); if (y > 24) set(F, hit[0] + (y % 2 ? 1 : -1), y, "g") }
    const sparks = [[-6, -6], [-9, -2], [-4, -10], [5, -8], [8, -4], [10, -1], [2, -13], [-11, -7], [7, -12]]
    sparks.forEach(([sx, sy], i) => { set(F, hit[0] + sx, hit[1] + sy, i % 3 ? "G" : "W"); if (i % 2) set(F, hit[0] + sx - Math.sign(sx), hit[1] + sy + 1, "Q") })
    for (let x = hit[0] - 6; x <= hit[0] + 6; x++) if (x % 2) set(F, x, 39, "Q")
    // the crescent's tail fading
    for (let t = 0.7; t <= 1; t += 0.01) {
      const a = a0 + (a1 - a0) * t, x = cx + Math.cos(a) * (R + 0.5), y = cy + Math.sin(a) * (R + 0.5)
      if (y <= 38 && Math.round(t * 100) % 4) set(F, x, y, "Y")
    }
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function seraphine(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  const fa = f.farArm
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  cape(F, f.cape.map(U), f.cape2.map(U))
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 17 + ux, 22 + by)
  veil(F, f.veil.map(U))
  if (f.behind) hammer(F, U(f.ham.hand), f.ham.a, f.ham.len, f.ham.halo)
  helm(F, 20 + ux, 12 + by + (f.hy || 0), f.wl || 0)
  const na = f.nearArm
  if (f.smear) {
    // the swing's smear: a band of gold light following the head's path over the top
    const sh = U([26, 24]), h = U(f.ham.hand), L = f.ham.len + 2.5
    const hc = [h[0] + Math.cos(f.ham.a) * L, h[1] + Math.sin(f.ham.a) * L]
    const R = Math.hypot(hc[0] - sh[0], hc[1] - sh[1]), a1 = Math.atan2(hc[1] - sh[1], hc[0] - sh[0]), a0 = -2.6
    for (let t = 0; t <= 1; t += 0.01) {
      const a = a0 + (a1 - a0) * t, w = 0.5 + 2.8 * t
      for (let r = R - w; r <= R + 1; r += 0.5) set(F, sh[0] + Math.cos(a) * r, sh[1] + Math.sin(a) * r, t < 0.35 ? "T" : r > R ? "G" : t < 0.7 ? "Y" : "Q")
    }
  }
  if (!f.behind) hammer(F, U(f.ham.hand), f.ham.a, f.ham.len, f.ham.halo)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (fa.grip) { const P = new Part(); P.limb(U(fa.hand), U(fa.hand), 1.1, 1.1, "uhi"); lay(F, P, 1) }
  pauldron(F, ...U([26, 24]).map(Math.round))
  if (f.smite) {
    const h = U(f.ham.hand), L = f.ham.len + 2.5
    smite(F, ...f.smite, [Math.round(h[0] + Math.cos(f.ham.a) * L), Math.round(h[1] + Math.sin(f.ham.a) * L)])
    hammer(F, U(f.ham.hand), f.ham.a, f.ham.len, 0) }
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The cape's line from the shoulder: it falls back and down; `back` streams it out behind her
// (walking), the ripple runs down it at phase ph.
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 23], [18, 26], [16.5, 29], [15, 31.5], [13.5, 34], [12, 36]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.25 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.55 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
// The veil from the nape: it falls and streams back with `back`, rippling at phase ph.
const veilAt = (ph, amp, back = 0, hy = 0) => [[21, 18], [18.5, 19.5], [16.5, 22], [15, 24.5], [13.5, 26.5]].map(([x, y], i) => {
  const w = i / 4
  return [x - back * w + amp * Math.sin(ph - i * 0.9) * w * 0.5, y + hy * (1 - w) - back * w * 0.6 + amp * Math.sin(ph - i * 0.9 + 1.3) * w]
})
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.45, y + 0.3])

// Legs: hips at (21, 30) far and (25, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -4, 0, by), near: legAt(25, 3, 0, by) })

// At rest the hammer hangs from the near hand, its head low and forward by her front foot.
const REST = (sw = 0, hs = 0, halo = 1) => ({
  farArm: { sh: [20, 24], el: [19 + sw * 0.5, 27], hand: [19 + sw, 30] },
  nearArm: { sh: [26, 24], el: [27, 26], hand: [30 + hs, 28] },
  ham: { hand: [30 + hs, 28], a: 0.85 - hs * 0.06, len: 5.5, halo },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the cape rippling
// out behind and the halo pulsing.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, 0, [1, 2, 3, 2, 1, 2, 3, 2][i]), legs: STAND(by),
    cape: capeAt(ph, 1.6, 2.5 + Math.sin(ph) * 2.2), cape2: capeIn(ph, 1.6, 2.5 + Math.sin(ph - 0.9) * 2.2),
    veil: veilAt(ph - 1.2, 1.3, 1 + Math.sin(ph - 1.4) * 1.2, hy),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, ux: 1, ...REST(sw, -Math.round(sw / 2), (i % 3) + 1), legs: walkLegs(i),
    cape: capeAt(ph, 1.4, 5), cape2: capeIn(ph, 1.4, 5), veil: veilAt(ph - 1, 1.0, 3.5),
  }
})

// Attack (13 fps, the hammer lands on the 4th): wind-up (hammer drawn back), loaded overhead, the
// swing over the top, the smite (impact, crescent, pillar, burst), follow-through (sparks), recover.
const ATTACK_POSE = [
  // k0 wind-up: both hands at the hip, the hammer drawn back low behind her
  { ux: -1, farArm: { sh: [20, 24], el: [20, 27], hand: [22, 28], grip: true }, nearArm: { sh: [26, 24], el: [25, 27], hand: [22, 28] },
    ham: { hand: [22, 28], a: 2.7, len: 6, halo: 2 }, back: 1, wl: 0 },
  // k1 loaded: the hammer high over her head, leaning back
  { ux: -1, farArm: { sh: [20, 24], el: [20, 18], hand: [22, 12], grip: true }, nearArm: { sh: [26, 24], el: [28, 18], hand: [22, 12] },
    ham: { hand: [22, 12], a: -2.0, len: 5, halo: 3 }, behind: true, back: 0, wl: 1 },
  // k2 swing: over the top, the head forward and high
  { ux: 1, farArm: { sh: [20, 24], el: [23, 19], hand: [28, 17], grip: true }, nearArm: { sh: [26, 24], el: [28, 20], hand: [28, 17] },
    ham: { hand: [28, 17], a: -0.55, len: 7, halo: 0 }, back: 2, wl: 1,
    smear: true },
  // k3 SMITE: the head lands before her, the crescent, the pillar, the burst
  { ux: 2, by: 1, farArm: { sh: [20, 24], el: [24, 28], hand: [29, 28], grip: true }, nearArm: { sh: [26, 24], el: [28, 27], hand: [30, 29] },
    ham: { hand: [30, 29], a: 0.85, len: 6, halo: 0 }, back: 5, wl: 0, smite: [25, 25, 16, -2.6, 0.75, [42, 37], 1] },
  // k4 follow-through: held down, the sparks fly
  { ux: 2, by: 1, farArm: { sh: [20, 24], el: [24, 28], hand: [29, 28], grip: true }, nearArm: { sh: [26, 24], el: [28, 27], hand: [30, 29] },
    ham: { hand: [30, 29], a: 0.85, len: 6, halo: 1 }, back: 4, wl: 0, smite: [25, 25, 16, -2.6, 0.75, [42, 37], 2] },
  // k5 recover: back toward the rest
  { ux: 1, farArm: { sh: [20, 24], el: [19, 27], hand: [20, 30] }, nearArm: { sh: [26, 24], el: [26, 27], hand: [29, 28] },
    ham: { hand: [29, 28], a: 1.0, len: 6, halo: 1 }, back: 3, wl: 0 },
]
const ATTACK = ATTACK_POSE.map((p, k) => {
  const ph = (k / 6) * TAU, by = p.by || 0
  const legs = k >= 3 ? { far: legAt(21, -5, 0, by), near: legAt(25, 5, 0, by) } : k === 2 ? { far: legAt(21, -4, 0, 0), near: legAt(25, 4, 1, 0) } : STAND(0)
  return { ...p, by, legs, cape: capeAt(ph, 1.2, p.back), cape2: capeIn(ph, 1.2, p.back), veil: veilAt(ph, 1.0, 1 + p.back * 0.7) }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => seraphine(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => seraphine(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 13 }, (c) => seraphine(c, ATTACK[c.frame]))
anim("paladin_c2", { ...BOX, frames: 22, fps: 10 }, (c) => seraphine(c, ALL[c.frame]))
