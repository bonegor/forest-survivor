// Dame Seraphine the Paladin, "Knight style D (squared hood) (both eyes)": a copy of Style D
// (../d/paladin-d.px.js) with only the face changed, turned a little toward the viewer so both eyes
// show (27 October 2026). Style D is Style A (../a/paladin-a.px.js) with a reworked head. Her hood is now a squared coif, a short upright cylinder with a flat crown and
// straight sides framing a small face, set off from the shoulders by a dark steel gorget neck; the
// veil falls from behind the hood. Body, hammer, veil, colours and animation are Style A's.
// No black outline: every edge a dark tone of its own material; hue-shifted ramps (cool blue-violet
// shadows, warm cream light).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the hammer lands on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build paladin-d2.px.js --out <scratch> --only paladin_d2, then
//        node make-sheet.mjs <scratch>/anims/paladin_d2.png <sheet>   (adds the glow rows)
pal({
  // steel (silver plate): blue-violet shadows, warm cream light
  A: "#1d1730", B: "#2c2543", C: "#3d3858", D: "#524e6e", E: "#6a6887", F: "#8483a0", G: "#a09fb9", H: "#bdbccf", I: "#d9d6e1", J: "#f4efe9",
  // white cloth (veil, tabard, cape): mauve shadows, cream light
  0: "#2b2136", 1: "#3f3349", 2: "#574a62", 3: "#73657c", 4: "#908298", 5: "#ada0b2", 6: "#c8bcc8", 7: "#ded4d8", 8: "#eee7e2", 9: "#fbf7ee",
  // gold trim (the one accent)
  t: "#3d1c10", u: "#6e3816", v: "#a3601e", w: "#d0922e", x: "#ecc256", y: "#fde89a",
  // skin
  k: "#4a1d2a", l: "#7a3a3e", m: "#b06a5c", n: "#d89074", o: "#f2bc98",
  // the hammer's haft: leather-wrapped ash, violet-brown shadows
  p: "#22131c", q: "#3b2128", r: "#5c3530", s: "#7d4f3c", h: "#a3714c",
  // holy light (glows): amber to white-gold
  Z: "#f2a93b", Y: "#ffd45e", X: "#fff0a6", W: "#fffde8",
  // the eye
  e: "#1b2346", b: "#4f8fd6",
})
ramps("ABCDEFGHIJ", "0123456789", "tuvwxy", "klmno", "pqrsh", "ZYXW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp, so every edge is a dark tone of
// its own material. COARSE holds the steps an edge darkens by, FINE the half-tones between them.
const COARSE = ["ACEGIJ", "02468", "tuwy", "klno", "prh", "ZYXW", "eb"]
const FINE = ["ABCDEFGHIJ", "0123456789", "tuvwxy", "klmno", "pqrsh", "ZYXW", "eb"]
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
      const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
      this.px(x, y, ramp[q])
    }
    return this
  }
  // A flowing mass along a polyline (veil, cape): radius rs[i] at pts[i], lit from `light`, darker
  // toward its end (`fade`), fold highlights where `streak(T, s)` holds.
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
// Lay a part on the frame. edge: steps darker for its boundary; open: a test (x, y, dx, dy) for
// boundary sides left light.
function lay(F, part, edge = 3, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "klmno".includes(k) ? Math.min(edge, 1) : edge) : k)   // skin softens by one step only
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
const put = (F, x, y, k) => F.set(Math.round(x) + "," + Math.round(y), k)

// ------------------------------------------------------------------ the parts
// The head, a squared hood (a coif) 8 wide and 9 tall at (19, 12) at rest, plus the far cheek: a short
// upright cylinder of white cloth. Its flat crown is a bright band of its own under a dark top rim;
// a gold circlet with the holy gem runs straight round it; below that the side is shaded as a
// cylinder (a light band toward the upper-left light, darker toward the face), the opening's lining
// frames a small face looking right, turned a little toward the viewer (near cheek, near eye,
// the lit bridge of the nose, far eye, a pixel of cheek past it at x 27), and the wimple squares it off under the chin. Drawn by hand,
// edges included: every edge a dark cloth tone, corners cut by 1 px.
const HEAD = `
  .233332..
  17999873.
  twxxwvXu.
  1793nonm.
  1893nene.
  1893obobm
  1784nnmm.
  16876554.
  .122111..`
// Stamp a hand-drawn grid on the frame as it is ("." leaves the pixel).
const handGrid = (F, x0, y0, str) => str.split("\n").map((r) => r.trim()).filter((r) => r).forEach((r, j) =>
  [...r].forEach((k, i) => { if (k !== ".") put(F, x0 + i, y0 + j, k) }))
const head = (F, x0, y0) => handGrid(F, x0, y0, HEAD)

// The neck: a short gorget of dark steel under the hood, narrower than the head, so the head stands
// on it as its own shape; it moves with the head and runs down into the breastplate's collar.
const NECK = `
  ..CFEB
  ..BEDA`
const neck = (F, x0, y0) => handGrid(F, x0, y0, NECK)

// The torso, 10x8 at (18, 23) at rest: steel gorget and breastplate, the white tabard down the front
// edged in gold with a gold sun, a gold belt, the steel faulds at the hips.
const TORSO = `
  ....DFE...
  ...CFHHF..
  .CE7x98HGD
  .DFxYx9IHE
  .DE7x98HGD
  .CE6898GFC
  .uvwxyyxwu
  .CEF6789FC`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 2)
}

// The tabard's skirt: a white flap hanging in front of the legs from the belt, its gold hem, swinging
// with the stride (`sw`).
function skirt(F, x0, y0, sw) {
  const P = new Part()
  const rows = [[3, 7], [3, 7], [3 + Math.min(0, sw), 7 + Math.max(0, sw)], [3 + Math.min(0, sw), 7 + Math.max(0, sw)]]
  rows.forEach(([a, b], j) => {
    for (let x = a; x <= b; x++) {
      const t = (x - a) / Math.max(1, b - a)
      P.px(x0 + x, y0 + j, j === 3 ? (t < 0.3 ? "w" : t < 0.7 ? "x" : "y") : t < 0.25 ? "6" : t < 0.6 ? "8" : "9")
    }
  })
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// A leg in steel: thigh, greave, a sabaton forward.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.7, 1.35, far ? "BCDE" : "DEFGH")
  P.limb(knee, ankle, 1.35, 1.15, far ? "BCDE" : "DEFGHI")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx, ky, far ? "E" : "I"); P.px(kx + 1, ky, far ? "D" : "G")   // the knee cop catching light
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "C" : "F")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "B" : "D")
  lay(F, P, 2)
}

// An arm in plate: a round pauldron at the shoulder, the vambrace, a steel gauntlet.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.6, 1.4, far ? "BCD" : "DEFGHI")
  P.limb(el, hand, 1.4, 1.15, far ? "BCD" : "DEFGHI")
  P.limb(el, el, 1.5, 1.5, far ? "BCDE" : "EFGHIJ")   // the couter
  P.limb(hand, hand, 1.3, 1.3, far ? "CDE" : "EFGHI")
  if (!far) P.limb([sh[0] - 0.3, sh[1] - 0.3], [sh[0] + 0.4, sh[1] + 0.5], 2.1, 1.8, "DEFGHIJ")   // the pauldron
  lay(F, P, 2)
}

// The veil's shaded underside: one lobe in shade behind the veil, between it and the legs.
function cape(F, spine2) {
  const P = new Part()
  P.strand(spine2, [1.8, 2.2, 2.3, 2.0, 1.4, 0.5], "123456", { light: [-0.5, -1], fade: 0.3, lift: 0.05,
    streak: (T, s) => T > 0.25 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  lay(F, P, 2)
}

// The veil's long fall from behind the hood: a broad strand of white cloth, lit on its upper side. Its
// root, tucked behind the hood at (hx, hy), lies in the head's shadow (two steps darker beside the
// lower hood, one step by the neck), so the hood's square back corner stands clear of it.
function veil(F, pts, rs, hx, hy) {
  const P = new Part()
  P.strand(pts, rs, "3456789", { light: [-0.5, -1], fade: 0.3, lift: 0.14,
    streak: (T, s) => (T > 0.2 && T < 0.6 && Math.abs(s - 0.4) < 0.2) || (T > 0.45 && T < 0.9 && Math.abs(s + 0.25) < 0.18) })
  const steps = "23456789"
  for (const [key, k] of P.m) {
    const [x, y] = key.split(",").map(Number)
    if (x < hx - 3 || x > hx + 2) continue
    const n = y >= hy + 6 && y <= hy + 9 ? 2 : y >= hy + 10 && y <= hy + 11 ? 1 : 0
    if (n) P.m.set(key, steps[Math.max(0, steps.indexOf(k) - n)])
  }
  lay(F, P, 3)
}

// The warhammer, held at `grip`, pointing at angle `ang` (radians, 0 right, -PI/2 up) from the grip to
// its head `up` px away, the haft running `down` px past the grip to a gold butt cap. The head: a
// striking face on the side the swing leads with (+90 degrees from the haft), a gold-banded socket and
// a short back spike. Near upright, the head is kept square to the frame (no jaggies).
function hammer(F, grip, ang, up = 11, down = 9, glintAt = null) {
  let d = [Math.cos(ang), Math.sin(ang)]
  const hc = [grip[0] + d[0] * up, grip[1] + d[1] * up], butt = [grip[0] - d[0] * down, grip[1] - d[1] * down]
  // the haft
  const H = new Part()
  H.limb(butt, [grip[0] + d[0] * (up - 1), grip[1] + d[1] * (up - 1)], 0.95, 0.95, "qrsh")
  H.limb(butt, butt, 0.9, 0.9, "uwx")   // the butt cap
  const band = [grip[0] + d[0] * (up - 3), grip[1] + d[1] * (up - 3)]
  H.limb(band, band, 0.8, 0.8, "uwx")   // the gold collar under the head
  lay(F, H, 1)
  // the head
  if (Math.abs(ang + Math.PI / 2) < 0.26) d = [0, -1]
  else if (Math.abs(ang - Math.PI / 2) < 0.26) d = [0, 1]
  else if (Math.abs(ang) < 0.26) d = [1, 0]
  const n = [-d[1], d[0]]   // the face side
  const cx = Math.round(hc[0]), cy = Math.round(hc[1])
  const P = new Part()
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    const ox = x - hc[0], oy = y - hc[1]
    const u = ox * d[0] + oy * d[1], v = ox * n[0] + oy * n[1]
    let inside = false, key
    if (v >= -0.9 && v <= 4.4 && Math.abs(u) <= 2.4) inside = true                       // the face block
    else if (v < -0.9 && v >= -4.2 && Math.abs(u) <= 1.6 * (1 + (v + 0.9) / 3.6) + 0.35) inside = true   // the back spike
    if (!inside) continue
    const lit = -(ox * 0.45 + oy) / 2.4   // lit from above-left
    let q = Math.round(6 + lit * 2.2)
    if (v > 3.3) q += 2                                         // the polished striking face
    if (Math.abs(u) > 1.6 && v > -0.9) q -= 1                   // the bevelled sides
    key = "ABCDEFGHIJ"[Math.max(1, Math.min(9, q))]
    if (v >= -0.4 && v <= 0.6 && Math.abs(u) <= 2.3) key = lit > 0 ? "x" : lit > -0.6 ? "w" : "v"   // gold band round the socket
    P.px(x, y, key)
  }
  lay(F, P, 1)
  if (glintAt != null) {   // a glint travelling along the head
    const gx = hc[0] + n[0] * glintAt - d[0] * 1.5, gy = hc[1] + n[1] * glintAt - d[1] * 1.5
    put(F, gx, gy, "J")
  }
  return { hc, d, n }
}

// ------------------------------------------------------------------ holy light (the smite)
const spark = (F, x, y, big) => {
  put(F, x, y, "W")
  if (big) { put(F, x - 1, y, "Y"); put(F, x + 1, y, "Y"); put(F, x, y - 1, "X"); put(F, x, y + 1, "Y") }
}
// The swing's arc: a crescent round (cx, cy) of radius r from angle a0 to a1 (the leading end at a1),
// thickest at the lead: white core, gold rims.
function lightArc(F, cx, cy, r, a0, a1, thick) {
  const N = Math.ceil(Math.abs(a1 - a0) * r * 2)
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = a0 + (a1 - a0) * t
    const w = thick * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) ** 1.5 * (t > 0.92 ? 1 - (t - 0.92) * 6 : 1)
    for (let j = -1; j <= Math.ceil(w); j++) {
      const rr = r - j, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
      const k = j < 0 ? "Z" : j >= w - 0.5 ? (t > 0.5 ? "Y" : "Z") : j >= w - 1.5 ? "X" : "W"
      if (j < 0 && t < 0.4) continue
      put(F, x, y, k)
    }
  }
}
// The smite at (ix, iy): stage 1 the blow (a flash, rays, a pillar of light to the sky, a ground
// flare), 2 the pillar thinning and sparks rising, 3 the last motes.
function smite(F, ix, iy, stage) {
  if (stage === 1) {
    for (let y = 3; y <= iy; y++) {   // the pillar
      const t = (iy - y) / (iy - 3)
      put(F, ix, y, "W"); put(F, ix - 1, y, t > 0.85 ? "Y" : "X"); put(F, ix + 1, y, t > 0.85 ? "Y" : "X")
      if (t < 0.75) { put(F, ix - 2, y, "Y"); put(F, ix + 2, y, "Y") }
      if (t < 0.35) { put(F, ix - 3, y, "Z"); put(F, ix + 3, y, "Z") }
    }
    for (let x = ix - 8; x <= Math.min(47, ix + 8); x++) {   // the ground flare
      const a = Math.abs(x - ix)
      put(F, x, iy, a < 4 ? "W" : a < 6 ? "X" : "Y")
      if (a < 6) put(F, x, iy - 1, a < 3 ? "W" : "X")
      if (a < 3) put(F, x, iy - 2, "X")
    }
    for (const [dx, dy, L] of [[-1, -1, 5], [1, -1, 5], [-1, -0.45, 6], [1, -0.45, 6]]) {   // rays
      for (let i = 3; i <= L; i++) put(F, ix + dx * i, iy - 1 + dy * i, i < L - 1 ? "X" : "Y")
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(F, ix + dx, iy - 2 + dy, "W")
  } else if (stage === 2) {
    for (let y = 6; y <= iy; y++) {
      const t = (iy - y) / (iy - 6)
      if (t > 0.6 && (y % 3 === 0)) continue   // breaking up at the top
      put(F, ix, y, t > 0.7 ? "Y" : "X")
      if (t < 0.5) { put(F, ix - 1, y, "Y"); put(F, ix + 1, y, "Y") }
    }
    for (let x = ix - 6; x <= Math.min(47, ix + 6); x++) { const a = Math.abs(x - ix); if (a !== 2) put(F, x, iy, a < 3 ? "X" : "Z") }
    for (const [x, y, b] of [[ix - 5, iy - 6, 1], [ix + 4, iy - 9, 0], [ix + 6, iy - 4, 0], [ix - 3, iy - 12, 0], [ix + 2, iy - 15, 1]]) spark(F, x, y, b)
  } else if (stage === 3) {
    for (const [x, y, b] of [[ix - 4, iy - 10, 0], [ix + 5, iy - 13, 0], [ix + 1, iy - 20, 0], [ix - 6, iy - 3, 0]]) spark(F, x, y, b)
    for (let y = 12; y <= iy; y += 4) put(F, ix, y, "Z")
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function seraphine(c, f) {
  const F = new Map()
  const ux = f.ux || 0
  const U = (p) => add(p, [ux, f.by || 0])
  const fa = f.farArm
  if (f.hammerBack) hammer(F, U(f.hammer.grip), f.hammer.ang, f.hammer.up, f.hammer.down, f.hammer.glint)
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  cape(F, f.cape2.map(U))
  const hy = f.by + (f.hy || 0)
  veil(F, f.veil.map((p) => add(p, [ux, hy])), [2.2, 2.7, 2.7, 2.6, 2.6, 2.2, 1.1], 19 + ux, 12 + hy)
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 22 + f.by)
  skirt(F, 18 + ux, 30 + f.by, f.sw || 0)
  if (f.armsBack) arm(F, U(f.nearArm.sh), U(f.nearArm.el), U(f.nearArm.hand), false)
  neck(F, 19 + ux, 21 + hy)
  head(F, 19 + ux, 12 + hy)
  if (f.smite && f.smite[2] < 3) smite(F, f.smite[0] + ux, f.smite[1], f.smite[2])
  let hm = null
  if (!f.hammerBack) hm = hammer(F, U(f.hammer.grip), f.hammer.ang, f.hammer.up, f.hammer.down, f.hammer.glint)
  const na = f.nearArm
  if (!f.armsBack) arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.gemFlash) put(F, 19 + ux + 6, 12 + hy + 2, "W")
  if (f.gather) {   // light gathering round the raised hammer
    const h = f.gather
    for (const [dx, dy, b] of h.pts) spark(F, h.c[0] + ux + dx, h.c[1] + f.by + dy, b)
  }
  if (f.arc) lightArc(F, ...f.arc)
  if (f.smite && f.smite[2] === 3) smite(F, f.smite[0] + ux, f.smite[1], f.smite[2])
  if (f.smite && f.smite[2] === 1) for (let dx = -2; dx <= 2; dx++) put(F, f.smite[0] + ux - 3 + dx, f.smite[1], Math.abs(dx) < 2 ? "W" : "X")   // the flash where the face strikes
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The veil's fall from behind the hood down her back, relative to the head (its root tucked behind the
// hood; from the third point on, Style A's path).
const VEIL0 = [[20.0, 16.5], [18.6, 19.2], [16.4, 21.5], [15.5, 24.5], [14.4, 27.5], [13.1, 30.5], [11.6, 33.5]]
const veilAt = (ph, amp, back = 0, lift = 0) => VEIL0.map(([x, y], i) => {
  const w = Math.pow(i / (VEIL0.length - 1), 1.3)
  return [x - back * w + amp * Math.sin(ph - i * 0.8) * w, y - lift * w + amp * 0.5 * Math.cos(ph - i * 0.8) * w]
})
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 24], [18.5, 27], [17, 29], [15.6, 31], [14.4, 33], [13.4, 34.5]]
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

// At rest: the hammer upright in her near hand, its head beside her shoulder; the far arm at her side.
const UP = -Math.PI / 2
const REST = (sw = 0, tilt = 0, glint = null) => ({
  farArm: { sh: [20, 25], el: [19 + sw * 0.5, 28], hand: [19 + sw, 31] },
  nearArm: { sh: [26, 25], el: [27.5, 28.5], hand: [30, 31] },
  hammer: { grip: [31, 31], ang: UP + 0.2 + tilt, up: 10, down: 6, glint },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the veil and cape
// rippling behind; a glint runs over the hammer's face, the circlet's gem flashes.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, 0, [null, null, 1, 2.5, 4, null, null, null][i]), legs: STAND(by), gemFlash: i === 6 || i === 7,
    cape: capeAt(ph, 1.6, 1.5 + Math.sin(ph) * 2.2), cape2: capeIn(ph, 1.6, 1.5 + Math.sin(ph - 0.9) * 2.2),
    veil: veilAt(ph - 0.8, 1.8, 0.6 + Math.sin(ph - 1.6) * 1.8, Math.max(0, Math.sin(ph - 1.6)) * 0.8),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, hy: 0, ux: 1, ...REST(sw, [0.08, 0.04, 0, -0.04, -0.08, -0.04, 0, 0.04][i]), legs: walkLegs(i), ph, sw: Math.sign(GAIT[i][0]),
    cape: capeAt(ph, 1.4, 4), cape2: capeIn(ph, 1.4, 4),
    veil: veilAt(ph, 1.0, 2.5, 1),
  }
})

// Attack (13 fps, the blow on the 4th): wind-up (hammer back and down), heave it overhead (light
// gathers), bring it over the top in a blazing arc, SMITE (the head lands in front of her, a flash, a
// pillar of light), the pillar thins, recover.
const IMPACT = [40, 38]
const ATTACK_UP = [
  // k0 wind-up: she sinks, the hammer drawn back low behind her in both hands
  { ux: -1, by: 1, farArm: { sh: [20, 25], el: [23, 28], hand: [27, 28] }, nearArm: { sh: [26, 25], el: [27, 29], hand: [30, 27] },
    hammer: { grip: [30, 28], ang: -Math.PI * 0.38, up: 11, down: 6 },
    gather: { c: [33, 17], pts: [[-2, -5, 0], [5, -2, 1]] } },
  // k1 heave: up over her head, the head hanging back, light gathering round it
  { ux: -1, by: -1, farArm: { sh: [20, 25], el: [17, 20], hand: [20, 15] }, nearArm: { sh: [26, 25], el: [25.5, 18], hand: [21, 15] },
    hammer: { grip: [20, 15], ang: -Math.PI * 0.78, up: 10, down: 5 }, hammerBack: true, armsBack: true,
    gather: { c: [12, 9], pts: [[-4, -3, 1], [4, -5, 0], [-3, 4, 0], [5, 2, 1]] } },
  // k2 over the top: the hammer up and forward, the arc blazing behind it
  { ux: 1, by: 0, farArm: { sh: [20, 25], el: [23, 20], hand: [29, 17] }, nearArm: { sh: [26, 25], el: [29, 21], hand: [31, 17] },
    hammer: { grip: [30, 17], ang: -Math.PI * 0.2, up: 10, down: 5 },
    arc: [25, 25, 18, -Math.PI * 0.95, -Math.PI * 0.17, 3] },
  // k3 SMITE: the head lands in front of her, flash, pillar
  { ux: 1, by: 1, farArm: { sh: [20, 25], el: [25, 27], hand: [30, 29] }, nearArm: { sh: [26, 25], el: [29, 27], hand: [32, 29] },
    hammer: { grip: [31, 29], ang: Math.PI * 0.2, up: 9, down: 5 },
    arc: [25, 26, 16, -Math.PI * 0.6, Math.PI * 0.18, 3], smite: [...IMPACT, 1] },
  // k4 the pillar thins, sparks rise
  { ux: 1, by: 1, farArm: { sh: [20, 25], el: [25, 27], hand: [30, 29] }, nearArm: { sh: [26, 25], el: [29, 27], hand: [32, 29] },
    hammer: { grip: [31, 29], ang: Math.PI * 0.2, up: 9, down: 5 }, smite: [...IMPACT, 2] },
  // k5 recover: the hammer lifted back upright
  { ux: 0, by: 0, farArm: { sh: [20, 25], el: [21, 28], hand: [24, 30] }, nearArm: { sh: [26, 25], el: [27, 28], hand: [31, 29] },
    hammer: { grip: [32, 29], ang: -Math.PI * 0.4, up: 11, down: 7 }, smite: [...IMPACT, 3] },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 6) * TAU
  const back = [2, 1, 4, 6, 4.5, 3][k], lift = [0, -1, 1, 3, 2, 1][k]
  return {
    hy: 0, ...u, legs: STAND(u.by || 0),
    cape: capeAt(ph, 1.2, back), cape2: capeIn(ph, 1.2, back), veil: veilAt(ph, 0.8, 0.5 + back * 0.9, lift * 1.5),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => seraphine(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => seraphine(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 13 }, (c) => seraphine(c, ATTACK[c.frame]))
anim("paladin_d2", { ...BOX, frames: 22, fps: 10 }, (c) => seraphine(c, ALL[c.frame]))
