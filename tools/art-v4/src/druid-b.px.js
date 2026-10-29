// Review B: derived from the retained ORIGINAL druid source.
// Bramwyn the Druid, "Knight style A (both eyes)": Style A (../a/druid-a.px.js) with his face turned a
// little toward the viewer, so both eyes show. Everything else is A's: a faithful redraw of the Druid
// (the antlered hood, the grey beard, brown robes under a rust mantle, the green leaf skirt, the staff
// with its glowing seed) in the plumed Knight's style. No black outline: every edge a dark tone of its
// own material, hue-shifted ramps (purple-brown shadows, warm ochre lights). The rust mantle's back
// drape and the leaf skirt ripple and trail as the Knight's cape and plume do.
// Changed from A: the FACE grid (the face in the 3/4 Ranger B uses), and on walk frame 11 the staff's
// top a pixel further forward, so its knot does not cover the far eye.
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the staff strikes the ground on
// 19 and roots and green-gold light burst up). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build druid-a2.px.js --out <scratch> --only druid_a2, then
//        node make-sheet.mjs <scratch>/anims/druid_a2.png <sheet>   (adds the glow rows)
pal({
  // robe brown (the main material): purple-black shadows, warm ochre light
  0: "#1c0e1e", 1: "#2b1527", 2: "#3d1e2c", 3: "#522a30", 4: "#6c3a35", 5: "#894e3a", 6: "#a66940", 7: "#c3874c", 8: "#dcaa66",
  // rust mantle: wine-dark shadows to burnt orange
  q: "#2e0e17", w: "#4d1719", e: "#6e2418", r: "#90341a", t: "#b0481c", y: "#cb6525", u: "#e08a3a",
  // leaf green (the skirt, shoots): teal-black to yellow-green
  A: "#0e1f1f", B: "#14322b", C: "#1d4b30", D: "#2c6634", E: "#47833a", F: "#7cb048", G: "#b4d468",
  // ivory: antlers and the ash-grey beard, purple-grey shadows to warm cream
  H: "#3e2a3c", I: "#66505e", J: "#8e7a7e", K: "#b6a49c", L: "#d9cab8", M: "#f3e9d6",
  // skin
  S: "#4c1e2b", T: "#7c3b3c", U: "#a65d4d", V: "#cc8264", W: "#e8a986",
  // the seed's light: amber to white-gold (l m n glow), and the green-gold burst (o p glow)
  j: "#6e3f12", k: "#c2801c", l: "#f0bb36", m: "#ffe27a", n: "#fff8d6", o: "#9ee05a", p: "#d6ff8a",
  // eye
  x: "#1b1430",
})
ramps("012345678", "qwertyu", "ABCDEFG", "HIJKLM", "STUVW", "jklmn")

// ------------------------------------------------------------------ a small compositor (Ranger C's)
// Each part paints into its own map; when it is laid on the frame, its boundary pixels step darker
// along their own ramp, so there is no black line: every edge is its own material's dark tone.
const COARSE = ["02468", "qetu", "ACEG", "HJLM", "SUW", "jlmn"]
const FINE = ["012345678", "qwertyu", "ABCDEFG", "HIJKLM", "STUVW", "jklmn"]
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
function lay(F, part, edge = 3, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "STUVW".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 40) c.px(x, y, k) } }
const put = (F, x, y, k) => F.set(Math.round(x) + "," + Math.round(y), k)
const gridTo = (F, x0, y0, str) => str.split("\n").map((r) => r.trim()).filter((r) => r).forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") put(F, x0 + i, y0 + j, k) }))

// ------------------------------------------------------------------ the parts
// The antlers: two pale tines-and-beams rising from the hood in a V, lit on their upper-left faces.
// Drawn straight onto the frame (they are 1-2 px thin, every pixel would be an edge).
const ANTLERS = `
.L..........M...
.K..L.....L.L..M
.JK.K......LK.L.
..JKJ.......LKK.
...JK......LK...
....JK....LK....
.....JJ..KK.....
......J.JK......`
function antlers(F, x0, y0) { gridTo(F, x0, y0, ANTLERS) }

// A swept brown hair mass with one silver temple streak, 12x12 at (17, 12) at rest: brown cloth lit from the upper left, its brim overhanging the
// face, deep shadow inside; its lower back runs on into the mantle.
const HOOD = `
...4565...
..567765..
.56K87654.
456K6543..
456KUTU1..
3451......
2341......
.231......
..21......`
// The face under the brim (5x5 at hood + (7, 5)), turned a little toward the viewer (3/4 to the right,
// as Ranger B's): two bushy grey brows with the bridge of the nose between them; the near eye and the
// far eye, one pixel each, the lightest skin between them and a pixel of far cheek past the far eye;
// the nose's light under the far eye; the moustache over the beard.
const FACE = `
UVKVV
VxWxV
UVVWV
TUVUT
.UTU.`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HOOD), 1, (x, y, dx, dy) => dy > 0)
  // a wreath of leaves where the antlers leave the hood: rust and green, a few pixels
  for (const [ox, oy, k] of [[1, 1, "D"], [2, 0, "F"], [3, -1, "E"], [5, -1, "t"], [6, 0, "y"], [7, 0, "E"], [8, 1, "D"]]) put(F, x0 + ox, y0 + oy, k)
  lay(F, new Part().grid(x0 + 7, y0 + 5, FACE), 1)
}
// A neatly cropped dark beard follows the jaw, leaving the bark gorget visible.
function beard(F, pts) {
  const P = new Part()
  P.strand(pts, [1.6, 1.3, 1, 0.4], "234566", { light: [-0.5, -1], fade: 0.35, lift: 0.22,
    streak: (T, s) => T > 0.2 && T < 0.7 && Math.abs(s - 0.3) < 0.25 })
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// The robe, 12x12 at (18, 22): brown, lit from the upper left, a dark leather belt with an amber seed
// clasp, a fold down the front of the skirt.
const TORSO = `
..5676......
.5678765....
.678L76543..
567LK76543..
456KL65433..
3456654332..
1221l122111.
345667544332
345677543321
2345765443221`
function torso(F, x0, y0) { lay(F, new Part().grid(x0, y0, TORSO), 2) }

// The rust mantle over the shoulders, its hem cut in leaf points.
const CAPELET = `
..6788765..
.678L87654.
567LML76543
.456K65432.
..3422342..`
function capelet(F, x0, y0) { lay(F, new Part().grid(x0, y0, CAPELET), 2, (x, y, dx, dy) => dy < 0) }

// The mantle's back drape: a flowing rust lobe from the shoulders, the inner one in shade.
function drape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.8, 2.1, 2.0, 1.5, 0.8, 0.3], "qwer", { light: [-0.5, -1], fade: 0.3, lift: 0.05 })
  P.strand(spine, [2.0, 2.5, 2.5, 2.0, 1.2, 0.4], "wertyu", { light: [-0.5, -1], fade: 0.35, lift: 0.1,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 2)
}

// The leaf skirt from the belt to the knee: overlapping leaves in rows, each lit on its upper left,
// the hem in leaf points that ripple (phase ph) and the back edge trailing by `trail`.
function skirt(F, x0, y0, ph, trail) {
  const P = new Part()
  const top = y0, bot = y0 + 3
  for (let y = top; y <= bot + 1; y++) {
    const r = y - top
    const back = x0 - Math.round(r * 0.3 + trail * (r / 4))
    const front = x0 + 10 + Math.round(r * 0.3)
    for (let x = back; x <= front; x++) {
      // the hem: leaf points every 3 px, rippling
      const hem = bot + ((x + Math.round(Math.sin(ph + x * 0.7) * 1.2)) % 3 === 0 ? 1 : 0) + (Math.sin(ph + x * 0.45) > 0.6 ? 1 : 0)
      if (y > hem) continue
      // leaf scales: rows of 2, staggered by row; tone by place in the leaf and across the skirt
      const row = Math.floor(r / 2), lx = ((x + row * 2) % 4 + 4) % 4, ly = r % 2
      let v = 3 + (lx === 0 ? 2 : lx === 1 ? 1 : lx === 3 ? -1 : 0) + (ly === 0 ? 0 : -1)
      v += x < x0 + 4 ? 0 : x > x0 + 8 ? -1 : 0
      v -= r > 2 ? 1 : 0
      P.px(x, y, "ABCDEFG"[Math.max(0, Math.min(6, v))])
    }
  }
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// A leg: hip, knee, ankle; brown wraps, a bark-dark boot, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.9, 1.5, far ? "2345" : "345678")
  P.limb(knee, ankle, 1.5, 1.3, far ? "2345" : "345678")
  // the linen wraps: a light band every other row on the shin
  const kx = knee[0], ky = knee[1], ax0 = ankle[0], ay0 = ankle[1]
  for (let t = 0.25; t < 0.9; t += 0.3) { const x = Math.round(kx + (ax0 - kx) * t), y = Math.round(ky + (ay0 - ky) * t); P.px(x - 1, y, far ? "3" : "6"); P.px(x, y, far ? "4" : "7") }
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  P.px(ax - 1, ay, far ? "1" : "2"); P.px(ax, ay, far ? "2" : "3"); P.px(ax + 1, ay, far ? "1" : "2")
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "1" : x === ax ? "4" : "3")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "0" : "2")
  lay(F, P, 2)
}

// An arm: shoulder, elbow, hand. A brown sleeve, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.8, 1.5, far ? "1234" : "345678")
  P.limb(el, hand, 1.5, 1.3, far ? "1234" : "345678")
  P.limb(hand, hand, 1.2, 1.2, far ? "TU" : "TUVW")
  lay(F, P, 2)
}

// The staff, from its foot to its top (`blaze` 0..2 how brightly the seed burns): gnarled wood with
// two knots, a claw of wood at the top holding the glowing seed, a green shoot off the claw.
function staff(F, foot, top, blaze = 0) {
  const dx = top[0] - foot[0], dy = top[1] - foot[1], L = Math.hypot(dx, dy)
  // the shaft, 2 px: the lit side ochre-brown with a few glints along the grain, the shade side
  // purple-brown; it wavers a pixel (gnarled) and has two knots on its lit side
  const n = Math.ceil(Math.abs(dy) > Math.abs(dx) ? Math.abs(dy) : Math.abs(dx))
  for (let i = 0; i <= n; i++) {
    const t = i / n, wob = Math.round(Math.sin(t * 9.0) * 0.45)
    const x = Math.round(foot[0] + dx * t) + wob, y = Math.round(foot[1] + dy * t)
    put(F, x, y, i % 7 === 3 ? "6" : t > 0.9 ? "4" : "5"); put(F, x + 1, y, t < 0.08 ? "1" : "2")
  }
  for (const t of [0.38, 0.68]) { const x = Math.round(foot[0] + dx * t), y = Math.round(foot[1] + dy * t); put(F, x - 1, y, "4"); put(F, x - 1, y + 1, "2"); put(F, x, y - 1, "6") }
  // the claw and the seed, drawn relative to the top, turned with the staff
  const ang = 0   // the claw stays upright: turned, its 1 px prongs break up
  const ca = Math.cos(ang), sa = Math.sin(ang)
  const at = (ox, oy, k) => put(F, top[0] + ox * ca - oy * sa, top[1] + ox * sa + oy * ca, k)
  const CLAW = [
    "...n...",
    ".5.m.3.",
    "45lmk23",
    ".4lml2.",
    "..4kk3.",
    "...53..",
  ]
  CLAW.forEach((row, j) => [...row].forEach((k, i) => { if (k !== ".") at(i - 3, j - 5, k) }))
  at(-3, -3, "F"); at(-4, -4, "G"); at(-4, -3, "E")   // a shoot off the claw
  if (blaze >= 1) for (const [ox, oy, k] of [[0, -7, "m"], [0, -8, "l"], [-3, -4.5, "m"], [3, -4.5, "m"], [-4, -4.5, "l"], [4, -4.5, "l"], [0, -1, "l"]]) at(ox, oy, k)
  if (blaze >= 2) for (const [ox, oy, k] of [[0, -9, "m"], [0, -10, "n"], [-5, -4.5, "m"], [5, -4.5, "m"], [-6, -4.5, "n"], [6, -4.5, "n"], [-2, -7, "l"], [2, -7, "l"], [-2, -2, "l"], [2, -2, "l"], [-3, -8, "o"], [3, -8, "o"]]) at(ox, oy, k)
}

// The swing's swoosh: a bright arc the seed draws as the staff is driven down, thick at its head.
function swoosh(F, cx, cy, r, a0, a1) {
  const n = Math.ceil(Math.abs(a1 - a0) * r * 2)
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t
    const w = t < 0.2 ? 1 : t < 0.5 ? 2 : t < 0.8 ? 3 : 4   // thickening toward the seed
    for (let k = 0; k < w; k++) {
      const rr = r - k + 1
      const tone = k === 0 ? (t < 0.3 ? "k" : "l") : k === w - 1 ? (t < 0.5 ? "l" : "m") : t < 0.4 ? "m" : "n"
      put(F, cx + Math.sin(a) * rr, cy - Math.cos(a) * rr, tone)
    }
  }
}

// Roots bursting from the ground at gx: curling brown roots of height h (stage 0..1 how risen), each
// lit by the burst on its upper side, a leaf at each tip.
function roots(F, gx, scale, lit) {
  const P = new Part()
  const ROOTS = [[-4, 6, -2], [1, 10, 1.5], [5, 8, 3], [8.5, 5, 2]]
  const tips = []
  for (const [ox, h, curl] of ROOTS) {
    const hh = h * scale
    if (hh < 1) continue
    const b = [gx + ox, 39.5], m = [gx + ox + curl * 0.3, 39.5 - hh * 0.6], t = [gx + ox + curl, 39.5 - hh]
    P.limb(b, m, 1.6, 1.1, "234567")
    P.limb(m, t, 1.1, 0.6, "234567")
    tips.push(t)
  }
  lay(F, P, 1)
  for (const [x, y] of tips) { put(F, x, y - 1, "F"); put(F, x + 1, y - 1, "G"); if (lit) put(F, x, y, "l") }
}

// The burst where the staff strikes (gx, 39): a fan of green-gold rays, a white-gold core, a ring of
// light along the ground; stage 2 has it break into rising sparks.
function burst(F, gx, stage) {
  const gy = 38
  if (stage === 1) {
    // a dome of light rising from the blow, its rim broken where the rays pass
    for (let d = -84; d <= 84; d += 2) {
      const a = (d * Math.PI) / 180, R = 12.5
      const x = gx + Math.sin(a) * R, y = gy + 1 - Math.cos(a) * R * 0.85
      put(F, x, y, Math.abs(d) < 40 ? "p" : "o")
      if (Math.abs(d) < 60) put(F, gx + Math.sin(a) * (R - 1), gy + 1 - Math.cos(a) * (R - 1) * 0.85, Math.abs(d) < 30 ? "m" : "p")
    }
    const RAYS = [[-80, 9], [-55, 10], [-30, 15], [-8, 16], [16, 15], [42, 11], [70, 9]]
    for (const [deg, len] of RAYS) {
      const a = (deg * Math.PI) / 180
      for (let i = 2; i <= len; i++) {
        const t = i / len
        put(F, gx + Math.sin(a) * i, gy - Math.cos(a) * i, t < 0.35 ? "n" : t < 0.7 ? "m" : t < 0.9 ? "p" : "o")
      }
    }
    for (let dx = -11; dx <= 11; dx++) {   // the ground ring
      const ad = Math.abs(dx)
      put(F, gx + dx, 39, ad < 3 ? "n" : ad < 7 ? "m" : ad < 10 ? "p" : "o")
      if (ad < 8) put(F, gx + dx, 38, ad < 3 ? "n" : ad < 5 ? "m" : "p")
    }
    for (let dx = -2; dx <= 2; dx++) for (let dy = -3; dy <= 0; dy++) if (Math.abs(dx) + Math.abs(dy) <= 3) put(F, gx + dx, gy + dy, "n")
  } else if (stage === 2) {
    for (let dx = -13; dx <= 13; dx++) { const ad = Math.abs(dx); if (ad > 6 && ad % 3 !== 0) put(F, gx + dx, 39, ad < 10 ? "p" : "o") }
    const SPARKS = [[-6, -9, "m"], [-3, -14, "p"], [1, -11, "n"], [4, -16, "o"], [7, -10, "m"], [-9, -5, "o"], [10, -6, "p"], [0, -18, "o"], [-5, -13, "o"], [5, -7, "p"]]
    for (const [ox, oy, k] of SPARKS) put(F, gx + ox, gy + oy, k)
  } else if (stage === 3) {
    for (const [ox, oy, k] of [[-4, -17, "o"], [3, -20, "p"], [6, -14, "o"], [-7, -11, "o"]]) put(F, gx + ox, gy + oy, k)
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function bramwyn(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0, hy = f.hy || 0
  const U = (p) => add(p, [ux, by])
  const H = (p) => add(p, [ux + (f.hx || 0), by + hy])
  arm(F, U(f.farArm.sh), U(f.farArm.el), U(f.farArm.hand), true)
  drape(F, f.drape.map(U), f.drape2.map(U))
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 18 + ux, 22 + by)
  skirt(F, 18 + ux, 30 + by, f.ph, f.trail)
  if (f.roots) roots(F, f.roots[0], f.roots[1], f.roots[2])
  if (f.staff.behind) staff(F, U(f.staff.foot), U(f.staff.top), f.staff.blaze || 0)
  antlers(F, ...H([14, 6]))
  head(F, ...H([18, 13]))
  capelet(F, ux + 17, by + 21)
  beard(F, f.beard.map(H))
  if (f.swoosh) swoosh(F, ...f.swoosh)
  if (!f.staff.behind) staff(F, U(f.staff.foot), U(f.staff.top), f.staff.blaze || 0)
  arm(F, U(f.nearArm.sh), U(f.nearArm.el), U(f.nearArm.hand), false)
  if (f.burst) burst(F, f.burst[0], f.burst[1])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
const BEARD0 = [[27.6,22.7],[27.5,23.2],[27.4,23.8],[27.2,24.2]]
const beardAt = (sway, back = 0) => BEARD0.map(([x, y], i) => [x - back * (i / 3) + sway * (i / 3), y])
// The drape's line from the shoulder: falls back and down; `back` streams it out behind (walking),
// the ripple runs down it at phase ph.
const drapeAt = (ph, amp, back = 0) => {
  const base = [[20, 23], [17.5, 26], [16, 28.5], [14.5, 31], [13.5, 33], [12.5, 34.5]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.5 + amp * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const drapeIn = (ph, amp, back = 0) => drapeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.4, y + 0.5])

function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34.5 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34.5 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -4, 0, by), near: legAt(26, 3, 0, by) })

// At rest: the staff planted upright before him in the near hand, the far arm hanging behind.
const REST = (sw = 0, rock = 0, bx = 0) => ({
  farArm: { sh: [20, 24], el: [19 + sw * 0.5, 28], hand: [19.5 + sw, 31] },
  nearArm: { sh: [26, 24], el: [27.5 + bx * 0.5, 29], hand: [32 + bx, 26.5] },
  staff: { foot: [33 + bx, 39], top: [33 + bx + rock, 10] },
})

const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  const rock = [0, 0, 1, 1, 1, 0, 0, 0][i]
  return {
    by, hy, ux: 1, hx: 1, ph, trail: 1 + Math.sin(ph - 0.6) * 1, ...REST(0, rock),
    drape: drapeAt(ph, 1.6, 1.5 + Math.sin(ph) * 2.2), drape2: drapeIn(ph, 1.6, 1.5 + Math.sin(ph - 0.9) * 2.2),
    beard: beardAt(Math.sin(ph - 1.2) * 0.8), legs: STAND(by),
  }
})
// Idle frame 0 rests the staff's bottom on row 39; the hand rises with the breath.
IDLE.forEach((f) => { f.staff = { ...f.staff, foot: [f.staff.foot[0], 39 - f.by] } })

const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(26, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  // the staff walks with him: planted on the first step, swung forward on the second
  const st = [[0, 0], [-1, 0], [-2, 0], [-3, 1], [-1, 3], [1, 2], [2, 1], [1, 0]][i]
  // (A2: on the step where the staff swings furthest back, its top leans a pixel further forward,
  // so the shaft's upper knot passes beside the turned face's far eye rather than over it)
  const tip = [0, 0, 0, 1, 0, 0, 0, 0][i]
  const r = REST(sw, 0, 0)
  return {
    by, hy: 0, ux: 1, hx: 1, ph, trail: 3, ...r,
    nearArm: { ...r.nearArm, el: [27.5 + st[0] * 0.5, 29], hand: [32 + st[0], 26.5] },
    staff: { foot: [33 + st[0] - 1, 39 - st[1] - by], top: [33 + st[0] + 1 + tip, 10 - st[1]] },
    drape: drapeAt(ph, 1.3, 4.5), drape2: drapeIn(ph, 1.3, 4.5),
    beard: beardAt(0, 1.2), legs: walkLegs(i),
  }
})

// Attack (12 fps, the blow on the 4th): lift, raise high (the seed blazes), drive down (a bright
// arc), strike (green-gold burst, roots), the roots grow and the light breaks into sparks, recover.
const ATTACK_POSES = [
  { ux: 0, by: 0, nearArm: { sh: [26, 24], el: [28.5, 27.5], hand: [32, 24] }, staff: { foot: [32, 34], top: [32, 6], blaze: 1 }, back: 2 },
  { ux: -1, by: 0, nearArm: { sh: [26, 24], el: [29, 24], hand: [31, 19] }, staff: { foot: [35, 28], top: [23, 6], blaze: 2, behind: true }, back: 1, farUp: true },
  { ux: 1, by: 0, nearArm: { sh: [26, 24], el: [30, 27.5], hand: [34.5, 26] }, staff: { foot: [38, 35], top: [31, 8], blaze: 1 }, back: 4, swoosh: [32, 27, 20, -1.05, 0.0] },
  { ux: 2, by: 1, nearArm: { sh: [26, 24], el: [29.5, 27.5], hand: [33.8, 26] }, staff: { foot: [37, 39], top: [34, 10], blaze: 2 }, back: 5, burst: [37, 1], roots: [38, 0.6, true] },
  { ux: 1, by: 1, nearArm: { sh: [26, 24], el: [30, 28], hand: [34.6, 27] }, staff: { foot: [37, 39], top: [34, 10], blaze: 1 }, back: 3.5, burst: [37, 2], roots: [38, 1, true] },
  { ux: 0, by: 0, nearArm: { sh: [26, 24], el: [28, 27], hand: [32, 27] }, staff: { foot: [33, 39], top: [33, 10] }, back: 2, burst: [37, 3], roots: [38, 0.35, false] },
]
const ATTACK = ATTACK_POSES.map((a, k) => {
  const ph = (k / 6) * TAU
  const r = REST()
  const S = a.ux || 0, B = a.by || 0
  // the staff's coordinates above are absolute, so take the body offset back out of them
  return {
    ...a, ph, trail: 1 + a.back * 0.4, hy: 0,
    farArm: a.farUp ? { sh: [20, 24], el: [22, 21], hand: [27, 18] } : r.farArm,
    staff: { foot: [a.staff.foot[0] - S, a.staff.foot[1] - B], top: [a.staff.top[0] - S, a.staff.top[1] - B], blaze: a.staff.blaze, behind: a.staff.behind },
    drape: drapeAt(ph, 1.2, a.back), drape2: drapeIn(ph, 1.2, a.back),
    beard: beardAt(0, a.back * 0.3), legs: { far: legAt(21, -4, 0, B), near: legAt(26 + (k >= 2 && k <= 4 ? 2 : 0), 3, 0, B) },
    swoosh: a.swoosh, burst: a.burst, roots: a.roots,
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => bramwyn(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => bramwyn(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => bramwyn(c, ATTACK[c.frame]))
anim("review", { ...BOX, frames: 22, fps: 10 }, (c) => bramwyn(c, ALL[c.frame]))
