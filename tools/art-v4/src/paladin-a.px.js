// Paladin A: Iron Vow — squared greathelm, angled visor, restrained crown light.
// Derived from the retained V3 rig; all 22 poses and gameplay timings preserved.
pal({
  // steel plate: purple-grey shadows, warm pink light
  U: "#1b1430", V: "#2a1f42", u: "#3c3158", h: "#53476f", i: "#6c628a", m: "#7c7298", H: "#8c82a5",
  n: "#9d93b3", I: "#aea4c1", o: "#bfb5cf", J: "#cfc5db", s: "#ded4e3", j: "#efe5ec",
  // deep crimson cloth (tabard, cape, the shield's cross): purple-black shadows, warm coral light
  0: "#1e0716", 1: "#370b20", 2: "#560f28", 3: "#76152e", 4: "#961d33", 5: "#b22b38", 6: "#c94540", 7: "#dc6a52",
  // gold, the one metal accent: ember-brown shadows to pale light
  Z: "#2e0b08", z: "#561806", t: "#842c06", y: "#b2500a", d: "#c46710", T: "#d87d12", e: "#e69a1a",
  Y: "#f0ad22", l: "#f8c43a", Q: "#ffd650", q: "#fff0a0",
  // skin
  K: "#4a1d2a", k: "#6f333a", f: "#94494a", r: "#b56a5b", F: "#d68a6c", P: "#e7aa88", p: "#f8c9a4",
  // chestnut hair, and the same ramp for the leather (belt, grip)
  A: "#1f0b16", B: "#3b1620", C: "#5c2527", D: "#7e3a2d", E: "#a2563a", w: "#c4774b",
  // eyes: dark lash, blue iris
  x: "#1a1f42", X: "#4f8fd8",
  // GLOW (the night rows): holy light, pale gold, white-hot
  g: "#ffe48a", G: "#fff6cf", W: "#fffef6",
})
ramps("UVuhimHnIoJsj", "01234567", "KkfrFPp", "ZztydTeYlQq", "ABCDEw", "gGW")

// ------------------------------------------------------------------ a small compositor
// (Part / limb / strand / lay after Ranger C's.) Each part paints into its own map; when it is laid on
// the frame its boundary pixels step darker along their own ramp, so nothing has a black line.
const RAMPS = ["UVuhimHnIoJsj", "01234567", "KkfrFPp", "ZztydTeYlQq", "ABCDEw"]
const STEP = [3, 2, 1, 2, 1]
const darker = (k, n) => {
  for (let r = 0; r < RAMPS.length; r++) {
    const i = RAMPS[r].indexOf(k)
    if (i >= 0) return RAMPS[r][Math.max(0, i - n * STEP[r])]
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
  // A flowing mass along a polyline: radius rs[i] at pts[i], lit from `light`, darker toward its end
  // (`fade`), with fold highlights where `streak(T, s)` holds.
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
function lay(F, part, edge = 1, open = null) {
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
const set = (F, x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 48 && y < 40) F.set(x + "," + y, k) }
// The frame's outer silhouette steps one shade darker again (not skin, eyes or the light), so the
// figure's outer edge is the deepest tone of each material, as on the plumed Knight. Effects (E) go on
// top, untouched.
const KEEP = new Set()   // pixels whose tone is drawn as meant (the helm's lit top), not darkened on the rim
const flush = (c, F, E) => {
  for (const [key, k] of F) {
    const [x, y] = key.split(",").map(Number)
    const rim = !KEEP.has(key) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !F.has(x + dx + "," + (y + dy)))
    c.px(x, y, rim && !"KkfrFPpxX".includes(k) ? darker(k, 1) : k)
  }
  for (const [key, k] of E) { const [x, y] = key.split(",").map(Number); c.px(x, y, k) }
}

// ------------------------------------------------------------------ the parts
// Broad rounded crown, one recessed eye slit, cheek planes and tapered jaw.
// The collar is drawn under the jaw, three rows deep, directly into the chest.
const HELM = `
  ..hHHHhu..
  .hnIIIHhu.
  .hnHIIHhu.
  .hUUhUUUh.
  .hiHInHhu.
  .hiIHnHhu.
  ..hiInHhu.
  ..uhHHhu..
  ...uhhu...
  ...hiih...`
function head(F, x0, y0) {
  const P = new Part().grid(x0, y0, HELM)
  lay(F, P, 0)
  lay(F, new Part().grid(x0 + 2, y0 + 8, "uhIiu\nhiJIih\n.hIih."), 0)
  // The crown follows the same rim shading as the rest of the plate.
}
// The hair's short tail, tied at the nape: a few strands swinging behind.
function hairTail(F, pts) {
  const P = new Part()
  P.strand(pts, [1.3, 1.1, 0.7, 0.3], "BCDEw", { light: [-0.4, -1], fade: 0.3, lift: 0.1 })
  P.px(Math.round(pts[0][0]), Math.round(pts[0][1]), "t")   // the gold tie
  lay(F, P, 1)
}

// The torso, 11x10 at (17, 19) at rest: the neck, a steel gorget, the crimson tabard with its gold
// cross over the breastplate, a narrow waist, the leather belt with a gold buckle.
const TORSO = `
  ...uhiIhu..
  ..hIJIIHhhh
  .hIJnIIHIih
  .hI45YQY4ih
  ..i455Y43ih
  ..h45YT43h.
  ...344Y33..
  ...uIIHhu..
  ...BDQTCB..
  ...uIHHhu..`
function torso(F, x0, y0) { lay(F, new Part().grid(x0, y0, TORSO), 1) }

// The tabard's front skirt: a crimson panel from the belt to above the knees, its hem swaying by `sw`
// (px at the bottom), gold-hemmed.
function skirt(F, x0, y0, sw = 0, len = 4) {
  const P = new Part()
  for (let j = 0; j < len; j++) {
    const t = j / (len - 1), off = sw * t * t
    const a = x0 - Math.floor(t * 1.2) + off, b = x0 + 5 + Math.floor(t * 1.0) + off
    for (let x = Math.round(a); x <= Math.round(b); x++) {
      const u = (x - a) / Math.max(1, b - a)
      let k = u < 0.2 ? "3" : u < 0.55 ? "5" : u < 0.8 ? "4" : "3"
      if (j > len - 3 && k === "5") k = "4"
      if (j === len - 1) k = u < 0.3 ? "y" : u < 0.7 ? "T" : "y"
      // Split tabard hem exposes the separate supporting and returning legs.
      if (!(j > 1 && Math.abs(x - (a + b) / 2) < 0.7)) P.px(x, y0 + j, k)
    }
  }
  lay(F, P, 1)
}

// A pauldron: a big round steel plate over the shoulder, gold-rimmed at its lower edge.
const PAULDRON = `
  ..hIIH..
  .hIJIIh.
  .hInHHhu
  hiHHhhu.
  .tyTYyt.`
const PAULDRON_FAR = `
  .hiHh
  hiHIi
  tyTdt`
function pauldron(F, x, y, far) { lay(F, new Part().grid(x, y, far ? PAULDRON_FAR : PAULDRON), 1) }

// A leg: hip, knee, ankle; steel cuisse and greave, a knee cop glint, the sabaton forward of the ankle.
function leg(F, hip, knee, ankle, far) {
  const P = new Part(), R = far ? "uhimH" : "imHnIoJsj"
  P.limb(hip, knee, 1.9, 1.5, R)
  P.limb(knee, ankle, 1.5, 1.3, R)
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx, ky, far ? "H" : "j"); P.px(kx + 1, ky, far ? "i" : "J")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "h" : "I")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "u" : "H")
  lay(F, P, 1)
}

// An arm: shoulder, elbow, hand; a steel vambrace and a gauntlet.
function arm(F, sh, el, hand, far) {
  const P = new Part(), R = far ? "uhimH" : "imHnIoJsj"
  P.limb(sh, el, 1.6, 1.35, R)
  P.limb(el, hand, 1.35, 1.2, R)
  P.limb(hand, hand, 1.2, 1.2, far ? "hiH" : "HIJ")
  lay(F, P, 1)
}

// The kite shield, 7x14 at (x, y) plus its edge: held forward and seen a little angled, so its left
// edge shows as a dark steel band a pixel wide; a dark steel face lit from the upper left (a glint
// sliding down it), a gold rim and a gold cross; a rounded top, straight sides, tapering to a point.
function shield(F, x, y, w = 7, h = 14) {
  const P = new Part(), cx = x + (w - 1) / 2
  const half = (j) => j === 0 ? w / 2 - 1.5 : j < h * 0.42 ? w / 2 : Math.max(0.5, (w / 2) * (1 - (j - h * 0.42) / (h * 0.58)) + 0.35)
  const inside = (xx, j) => j >= 0 && j < h && Math.abs(xx - cx) <= half(j) - 0.01
  for (let j = 0; j < h; j++) for (let xx = x; xx < x + w; xx++) {
    if (!inside(xx, j)) continue
    const rim = !inside(xx - 1, j) || !inside(xx + 1, j) || !inside(xx, j - 1) || !inside(xx, j + 1)
    const u = (xx - x) / (w - 1), v = j / (h - 1)
    let k
    if (rim) k = u + v * 0.8 < 0.5 ? "Q" : u + v * 0.8 < 0.9 ? "Y" : u + v < 1.45 ? "T" : "d"
    else if (xx === Math.round(cx) && j >= 1 && j <= h - 3) k = j < 4 ? "q" : j < 7 ? "Q" : j < 10 ? "Y" : "T"
    else if (j === 4 && Math.abs(xx - cx) <= 2) k = xx < cx ? "Q" : "Y"
    else {
      const lit = 1 - (u * 0.75 + v * 0.85)
      k = "uhimHnI"[Math.max(0, Math.min(6, Math.floor(lit * 7 + 1.2)))]
      if (Math.abs((xx - x) - 1 - j * 0.45) < 0.5 && j > 5 && j < 10 && xx < cx) k = "o"   // a glint on the face
    }
    P.px(xx, y + j, k)
  }
  for (let j = 0; j < h; j++) for (let xx = x; xx < x + w; xx++) if (inside(xx, j)) { P.px(xx - 1, y + j, j < 2 ? "i" : j < 8 ? "h" : "u"); break }
  lay(F, P, 0)
}

// The sword in the near hand at angle `a` (radians, 0 = right, + = down): a straight blade 2 px wide
// (lit edge, shaded edge), a gold crossguard across it, a leather grip and a gold pommel behind the
// hand. `blaze` lights it with holy light (on E: a white-hot blade, a pale-gold halo round it).
function sword(F, E, hand, a, len = 11, blaze = 0) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  const P = new Part(), side = ny < 0 || (ny === 0 && nx < 0) ? 1 : -1   // which side of the blade faces up
  for (let s = 2.2; s <= len; s += 0.25) {
    const cx = hand[0] + dx * s, cy = hand[1] + dy * s
    const tip = s > len - 1.2
    P.px(cx + nx * 0.5 * side, cy + ny * 0.5 * side, tip ? "s" : "j")
    if (!tip) P.px(cx - nx * 0.5 * side, cy - ny * 0.5 * side, s < 3 ? "I" : "n")
  }
  // grip and pommel behind the hand
  for (let s = -2; s <= 0; s += 0.5) P.px(hand[0] + dx * s, hand[1] + dy * s, "C")
  P.px(hand[0] - dx * 2.6, hand[1] - dy * 2.6, "Y")
  // the crossguard
  for (let s = -2; s <= 2; s += 0.5) P.px(hand[0] + dx * 1.8 + nx * s, hand[1] + dy * 1.8 + ny * s, Math.abs(s) < 0.7 ? "Q" : s * side > 0 ? "Y" : "T")
  lay(F, P, 0)
  if (blaze) {
    const B = new Map()
    for (let s = 1.6; s <= len + 0.5; s += 0.25) {
      const cx = hand[0] + dx * s, cy = hand[1] + dy * s
      for (const o of [-0.5, 0.5]) set(B, cx + nx * o, cy + ny * o, s > 2.6 ? "W" : "G")
    }
    for (const [key] of [...B]) {
      const [x, y] = key.split(",").map(Number)
      for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = (x + ex) + "," + (y + ey)
        if (!B.has(q) && ((x + y + blaze) % 3 !== 0 || blaze > 1)) set(E, x + ex, y + ey, "g")
      }
    }
    for (const [key, k] of B) { const [x, y] = key.split(",").map(Number); set(E, x, y, k) }
    // rays off the blade's tip
    const tx = hand[0] + dx * (len + 1), ty = hand[1] + dy * (len + 1)
    if (blaze > 1) for (const [rx, ry] of [[0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1]]) {
      for (let s = 1; s <= (Math.abs(rx) + Math.abs(ry) > 1 ? 2 : 3); s++) set(E, tx + rx * s, ty + ry * s, s === 1 ? "G" : "g")
    }
  }
}

// The cape: a short crimson cape from the shoulders, its outer lobe lit, its inner lobe in shade.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.6, 2.0, 2.2, 1.8, 1.0, 0.4], "0123", { light: [-0.5, -1], fade: 0.3, lift: 0.1 })
  P.strand(spine, [2.2, 2.8, 3.0, 2.7, 1.9, 0.6], "1234567", { light: [-0.5, -1], fade: 0.3, lift: 0.12,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 1)
}

// The smite: a broad crescent of gold-white light from overhead down to the blade's end, a pillar of
// holy light falling on the foe ahead, a flash where it lands. stage 1 = the hit, 2 = breaking up.
function smite(E, cx, cy, R, a0, a1, px, stage) {
  if (stage === 1) {
    for (let t = 0; t <= 1; t += 0.004) {
      const a = a0 + (a1 - a0) * t, w = 0.6 + 4.0 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8 * (0.35 + 0.65 * t)
      for (let r = R - w; r <= R + 1.0; r += 0.35) {
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        if (y > 39) continue
        const edge = r > R + 0.1
        set(E, x, y, t < 0.18 ? "Y" : t < 0.36 ? (edge ? "q" : "Q") : edge ? "W" : r < R - w + 0.9 ? "g" : "G")
      }
    }
    // the pillar of light falling on the foe ahead
    for (let y = 0; y <= 39; y++) {
      set(E, px, y, "W")
      set(E, px - 1, y, y > 5 ? "G" : "g"); set(E, px + 1, y, y > 5 ? "G" : "g")
      if (y > 12 + (y % 5 === 0 ? 2 : 0)) { set(E, px - 2, y, "g"); set(E, px + 2, y, "g") }
    }
    // the flash where it lands, rays bursting up and out, a shock along the ground
    for (let y = -4; y <= 0; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x / 1.3, y)
      if (d <= 4.2) set(E, px + x, 39 + y, d < 2.2 ? "W" : d < 3.4 ? "G" : "g")
    }
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI, L = k % 2 ? 6 : 8
      for (let s = 4.5; s <= L; s += 0.6) set(E, px + Math.cos(a) * s * 1.3, 39 + Math.sin(a) * s, s < L * 0.75 ? "G" : "g")
    }
    for (let x = px - 9; x <= px + 5; x++) set(E, x, 39, Math.abs(x - px) < 4 ? "W" : Math.abs(x - px) < 7 ? "G" : "g")
  } else {
    // the pillar thins and breaks up; white-hot sparks fly from it and from the blade's path
    for (let y = 1; y <= 39; y++) if (y % 6 !== 1 && y % 6 !== 4) { set(E, px, y, y > 28 ? "W" : "G"); if (y > 26) set(E, px + (y % 2 ? 1 : -1), y, "g") }
    const sparks = [[-5, -6], [-8, -2], [-3, -10], [4, -8], [3, -3], [-1, -14], [-10, -8], [2, -17]]
    sparks.forEach(([sx, sy], i) => { set(E, px + sx, 37 + sy, i % 3 ? "G" : "W"); if (i % 2) set(E, px + sx - Math.sign(sx || 1), 38 + sy, "g") })
    for (let x = px - 6; x <= px + 4; x++) if (x % 2) set(E, x, 39, "g")
    // the crescent's tail fading
    for (let t = 0.72; t <= 1; t += 0.01) {
      const a = a0 + (a1 - a0) * t, x = cx + Math.cos(a) * (R + 0.4), y = cy + Math.sin(a) * (R + 0.4)
      if (y <= 38 && Math.round(t * 100) % 4) set(E, x, y, Math.round(t * 100) % 3 ? "Q" : "g")
    }
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function seraphine(c, f) {
  const F = new Map(), E = new Map()
  KEEP.clear()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  const hx = 19 + ux, hy = 10 + by
  cape(F, f.cape.map(U), f.cape2.map(U))
  // Closed sallet: no detached ponytail under the helmet.
  leg(F, ...f.legs.far, true)
  arm(F, U(f.farArm.sh), U(f.farArm.el), U(f.farArm.hand), true)
  leg(F, ...f.legs.near, false)
  torso(F, 17 + ux, 19 + by)
  skirt(F, 21 + ux, 28 + by, f.skirt || 0)
  pauldron(F, 25 + ux, 19 + by, true)
  const sw = f.sword, na = f.nearArm
  if (sw.behind) sword(F, E, U(na.hand), sw.a, sw.len, sw.blaze)
  head(F, hx, hy)
  const sh = f.shield || [0, 0]
  shield(F, 29 + ux + sh[0], 20 + by + sh[1])
  if (f.smear) {
    // the cut's smear: a band of gold following the blade's tip down from overhead
    const o = U([20, 21]), h = U(na.hand), L = sw.len
    const tip = [h[0] + Math.cos(sw.a) * L, h[1] + Math.sin(sw.a) * L]
    const R = Math.hypot(tip[0] - o[0], tip[1] - o[1]), a1 = Math.atan2(tip[1] - o[1], tip[0] - o[0]), a0 = a1 - 1.35
    for (let t = 0; t <= 1; t += 0.01) {
      const a = a0 + (a1 - a0) * t, w = 0.4 + 2.2 * t
      for (let r = R - w; r <= R + 0.6; r += 0.4) {
        const y = o[1] + Math.sin(a) * r
        if (y >= 1) set(E, o[0] + Math.cos(a) * r, y, t < 0.3 ? "T" : r > R ? "G" : t < 0.65 ? "Y" : "g")
      }
    }
  }
  if (!sw.behind) sword(F, E, U(na.hand), sw.a, sw.len, sw.blaze)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  pauldron(F, 16 + ux, 19 + by)
  let over = null
  if (f.smite) {
    // the crescent sweeps from overhead to the blade's tip; the blade and arm stay on top of it
    const o = U([20, 21]), h = U(na.hand), tip = [h[0] + Math.cos(sw.a) * (sw.len + 0.5), h[1] + Math.sin(sw.a) * (sw.len + 0.5)]
    smite(E, o[0], o[1], Math.hypot(tip[0] - o[0], tip[1] - o[1]), -1.95, Math.atan2(tip[1] - o[1], tip[0] - o[0]), f.smite[0], f.smite[1])
    over = new Map()
    sword(over, new Map(), h, sw.a, sw.len, 0)
    arm(over, U(na.sh), U(na.el), U(na.hand), false)
    pauldron(over, 16 + ux, 19 + by)
  }
  flush(c, F, E)
  if (over) for (const [key, k] of over) { const [x, y] = key.split(",").map(Number); c.px(x, y, k) }
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The cape's line from the near shoulder: it falls back and down; `back` streams it out behind her
// (walking), the ripple runs down it at phase ph.
const capeAt = (ph, amp, back = 0) => {
  const base = [[19, 20], [17, 23], [15.5, 26], [14.5, 29], [13.5, 31.5], [12.5, 33.5]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.25 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.5 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.4, y + 0.3])
// The hair's tail from the nape (19.5, 16 at rest), streaming back with `back`.
const tailAt = (ph, amp, back = 0) => [[19.5, 16.5], [18, 17.4], [16.8, 18.4], [15.8, 19.4]].map(([x, y], i) => {
  const w = i / 3
  return [x - back * w * 0.8, y - back * w * 0.5 + amp * Math.sin(ph - i * 0.9) * w]
})

// Legs: hips at (21, 30) far and (24.5, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -3, 0, by), near: legAt(24.5, 3, 0, by) })

// At rest: the near arm hangs at her side with the sword held low, its point trailing back and down
// over the cape; the far arm holds the shield before her.
const REST = (sw = 0) => ({
  farArm: { sh: [26, 21], el: [28, 24], hand: [29, 26] },
  nearArm: { sh: [19, 21], el: [18 + sw * 0.4, 25], hand: [19 + sw, 28.5] },
  // Keep the blade outside the breastplate so it cannot read as a bright arm.
  sword: { a: 2.55 - sw * 0.05, len: 12 },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the shield lifted a
// pixel on the in-breath, the cape, the skirt and the hair's tail rippling.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy: 0, ...REST(0), legs: STAND(by), shield: [0, [0, -1, -1, -1, 0, 0, 0, 0][i]],
    cape: capeAt(ph, 1.5, 2 + Math.sin(ph) * 1.8), cape2: capeIn(ph, 1.5, 2 + Math.sin(ph - 0.9) * 1.8),
    tail: tailAt(ph - 1.2, 0.8, 0.6 + Math.sin(ph - 1.4) * 0.6), skirt: Math.round(Math.sin(ph - 1.8) * 0.8),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(24.5, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-1.5, -1, 0, 1, 1.5, 1, 0, -1][i]
  return {
    by, ux: 1, ...REST(sw), legs: walkLegs(i), shield: [0, 0],
    cape: capeAt(ph, 1.3, 4.5), cape2: capeIn(ph, 1.3, 4.5), tail: tailAt(ph - 1, 0.7, 2), skirt: -1 - (i % 4 === 1 ? 1 : 0),
  }
})

// Attack (13 fps, the smite lands on the 4th): the sword raised high and blazing (16, 17), the cut down
// (18), the smite (19: the crescent, the pillar of light ahead, the flash), follow-through (20), recover.
const ATTACK_POSE = [
  // k0 raise: the sword lifted up and back beside her head, already alight
  { ux: 0, nearArm: { sh: [19, 21], el: [15.5, 18], hand: [17.5, 13.5] }, sword: { a: -1.85, len: 10, blaze: 1, behind: true },
    farArm: { sh: [26, 21], el: [27, 24], hand: [28, 26] }, shield: [0, -1], back: 1 },
  // k1 loaded: high over her head and back, leaning back, blazing
  { ux: -1, nearArm: { sh: [19, 21], el: [15.5, 15.5], hand: [19, 10] }, sword: { a: -2.3, len: 10, blaze: 2, behind: true },
    farArm: { sh: [26, 21], el: [27, 24], hand: [28, 26] }, shield: [0, -1], back: 0 },
  // k2 cut: brought over the top, the blade forward and high, a smear behind it
  { ux: 1, nearArm: { sh: [19, 21], el: [23.5, 19.5], hand: [28, 18.5] }, sword: { a: -0.25, len: 10, blaze: 1 },
    farArm: { sh: [26, 21], el: [26, 24], hand: [27, 26] }, shield: [-1, 0], back: 2, smear: true },
  // k3 SMITE: the blade down before her, the crescent, the pillar of light on the foe ahead
  { ux: 2, by: 1, nearArm: { sh: [19, 21], el: [23.5, 22], hand: [28, 24] }, sword: { a: 0.55, len: 10 },
    farArm: { sh: [26, 21], el: [26, 24], hand: [27, 26] }, shield: [-2, 1], back: 5, smite: [43, 1] },
  // k4 follow-through: the blade further down, the pillar breaking into sparks
  { ux: 2, by: 1, nearArm: { sh: [19, 21], el: [22.5, 24], hand: [27, 27] }, sword: { a: 0.95, len: 10 },
    farArm: { sh: [26, 21], el: [26, 24], hand: [27, 26] }, shield: [-2, 1], back: 4, smite: [43, 2] },
  // k5 recover: back toward the rest
  { ux: 1, nearArm: { sh: [19, 21], el: [18, 25], hand: [20, 28.5] }, sword: { a: 2.1, len: 11 },
    farArm: { sh: [26, 21], el: [27, 24], hand: [28, 26] }, shield: [0, 0], back: 3 },
]
const ATTACK = ATTACK_POSE.map((p, k) => {
  const ph = (k / 6) * TAU, by = p.by || 0
  const legs = k >= 3 ? { far: legAt(21, -5, 0, by), near: legAt(24.5, 5, 0, by) } : k === 2 ? { far: legAt(21, -4, 0, 0), near: legAt(24.5, 4, 1, 0) } : STAND(0)
  return { ...p, by, legs, cape: capeAt(ph, 1.1, p.back), cape2: capeIn(ph, 1.1, p.back), tail: tailAt(ph, 0.8, 0.5 + p.back * 0.4), skirt: k >= 3 ? -1 : 0 }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => seraphine(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => seraphine(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 13 }, (c) => seraphine(c, ATTACK[c.frame]))
anim("paladin_a", { ...BOX, frames: 22, fps: 10 }, (c) => seraphine(c, ALL[c.frame]))
