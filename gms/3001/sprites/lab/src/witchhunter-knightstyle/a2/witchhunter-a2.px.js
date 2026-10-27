// Mercy Crane the Witch Hunter, "Knight style A (both eyes)": Style A (../a/witchhunter-a.px.js) with her
// head turned a little toward the viewer, so both eyes show under the brim. Everything else is A's: a
// faithful redraw of her look in the plumed Knight's style. A wide-brimmed grey hat with a red band and
// a brass buckle, brown hair falling to her shoulders, a long grey-blue frock coat whose tails flap
// behind her as the Knight's cape does, tall leather boots and a silver crossbow. No black outline:
// every edge a dark tone of its own material, hue-shifted ramps (cool violet shadows, warm pink lights).
// Changed from A: only the FACE grid (the face turned to Ranger B's 3/4, both eyes showing).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the bolt leaves on 19, attack
// index 3). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build witchhunter-a2.px.js --out <scratch> --only witchhunter_a2, then
//        node make-sheet.mjs <scratch>/anims/witchhunter_a2.png <sheet>   (adds the glow rows)
pal({
  // the coat (main material): grey-blue, violet-navy shadows, warm grey-pink light
  0: "#16142b", 1: "#201f3b", 2: "#2b2f4d", 3: "#384360", 4: "#4a5674", 5: "#5d6b88", 6: "#75829d", 7: "#909cb2", 8: "#afb6c8", 9: "#d4d1dc",
  // the hat's felt: a warmer, more neutral grey than the coat
  A: "#1b1524", B: "#282031", C: "#362d41", D: "#463c52", E: "#594f66", F: "#6f657c", G: "#8a8096", H: "#aca1b5",
  // brown hair: plum-brown shadows, ochre light
  a: "#22110f", b: "#3a1a14", c: "#56271a", d: "#733922", e: "#924f2b", f: "#b06a39", g: "#c98b52",
  // skin
  h: "#4a1d2a", i: "#6f333a", j: "#94494a", k: "#b56a5b", l: "#d68a6c", m: "#e7aa88", n: "#f8c9a4",
  // the accent: the hat band's deep red
  I: "#2b0612", J: "#510b17", K: "#7c141b", L: "#a8221f", M: "#cf3e27", N: "#ef6a3e",
  // brass buckles
  O: "#4a250c", P: "#8a5418", Q: "#c98d2c", R: "#f3cf68",
  // silver: the crossbow's prod and fittings, the bolts, the linen collar; Z white
  S: "#2a2539", T: "#433e58", U: "#645e7c", V: "#8a84a0", W: "#b0aac2", X: "#d3cddd", Y: "#eee7f0", Z: "#ffffff",
  // leather and walnut: boots, belt, gloves, the stock
  o: "#1f0f15", p: "#30171a", q: "#46221f", r: "#5f3025", s: "#7a432e", t: "#955a39", u: "#b0744a",
  // the eye; the silver bolt's glowing head
  v: "#1a1430", x: "#dff6ff",
})
ramps("0123456789", "ABCDEFGH", "abcdefg", "hijklmn", "IJKLMN", "OPQR", "STUVWXYZ", "opqrstu")

// ------------------------------------------------------------------ a small compositor
// (the Ranger C compositor) Each part paints into its own map; laid on the frame, its boundary pixels
// step darker along their own ramp, so nothing has a black line: the silhouette and every part laid
// over another are edged in their own darkest tones.
const COARSE = ["02468", "ACEG", "aceg", "hjln", "IKM", "OQR", "SUWYZ", "oqsu"]
const FINE = ["0123456789", "ABCDEFGH", "abcdefg", "hijklmn", "IJKLMN", "OPQR", "STUVWXYZ", "opqrstu"]
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
  // A flowing mass along a polyline (hair, a coat's tails): radius rs[i] at pts[i], lit from `light`,
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
        let v = 0.5 + 0.6 * n * Math.sqrt(Math.min(1, best.d / Math.max(best.r, 0.5))) + lift - fade * best.T
        let q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
        if (streak && streak(best.T, -best.s) && q < ramp.length - 1) q++
        this.px(x, y, ramp[q])
      }
    return this
  }
}
// Lay a part on the frame: its boundary steps `edge` darker; open(x, y, dx, dy) leaves a side light.
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "hijklmn".includes(k) ? Math.min(edge, 1) : edge) : k)   // skin softens by one step only
  }
}
// Lay a hand-toned grid as it is (its edges are drawn in by hand).
const put = (F, x0, y0, str) => str.split("\n").map((r) => r.trim()).filter((r) => r)
  .forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") F.set(Math.round(x0 + i) + "," + Math.round(y0 + j), k) }))
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The hat, 18x6 at (14, 12) at rest: a round crown lit from the upper left, the red band with its brass
// buckle at the front, the wide brim: its back edge turned up, its lit top, its dark underside drooping
// a pixel at the front.
const HAT = `
  .......BCDCB......
  ......BEGHFC......
  ......BFHGFDB.....
  ......CEGFEDB.....
  ......JLMLPQJ.....
  ..CEGHHHGGGFFEDC..
  BDFEDCCCCCCCCCDCBA`
// The head under the brim, at (14, 18): brown hair at the back, the face turned a little toward the
// viewer (3/4 to the right, as Ranger B's) in the brim's shadow at the top. Row by row (x 18-27): the
// forehead in the brim's shade (as A's); the near eye (x 23) and the far eye (x 25), one dark pixel
// each, the bridge of the nose in light skin between them, the near temple a step lighter (k) and a
// pixel of far cheek past the far eye; the nose a pixel proud of the face (as A's); the mouth moved in
// a pixel from the profile's edge, the far side of the chin past it; the chin (as A's).
const FACE = `
  ....bdeedjkkj.
  ....bdedkvmvl.
  ....bcedjlmmmk
  ....bcdcjklik.
  .....bcbijkj..`
function head(F, x0, y0, hatDy = 0) {
  put(F, x0, y0 + 6, FACE)
  put(F, x0, y0 - 1 + hatDy, HAT)
}

// Brown hair falling from under the hat down her back to the shoulder blades.
function hair(F, pts) {
  const P = new Part()
  P.strand(pts, [1.7, 1.6, 1.3, 0.6], "bcdefg", { light: [-0.5, -1], fade: 0.3, lift: 0.1,
    streak: (T, s) => T > 0.15 && T < 0.7 && Math.abs(s - 0.3) < 0.25 })
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

// The coat's body, 10x10 at (19, 23) at rest: shoulders, the chest lit on the left, a row of silver
// buttons down the front edge, the belt with its brass buckle, the skirt flaring over the hips.
const TORSO = `
  ...67887..
  ..5789975.
  ..578986W.
  ..4678764.
  ..467876W.
  ..3567653.
  ..prssPQq.
  ..3456653.
  .34567654.
  .2345543..`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 1)
  // the white falling-band collar at the throat, its two tabs over the chest
  put(F, x0 + 4, y0, `
    XYW
    .XW`)
}

// A leg: hip, knee, ankle; charcoal breeches, a tall leather boot with a turned-down cuff at the knee.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.7, 1.35, far ? "2345" : "34567")
  P.limb(knee, ankle, 1.35, 1.15, far ? "opqr" : "pqrst")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky, far ? "r" : "s"); P.px(kx, ky, far ? "s" : "u"); P.px(kx + 1, ky, far ? "r" : "t")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "q" : "r")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "p" : "q")
  lay(F, P, 2)
}

// An arm: a grey-blue sleeve to the elbow and on, a pale turned-back cuff, a leather glove.
function upperArm(F, sh, el, far) {
  const P = new Part(); P.limb(sh, el, 1.6, 1.35, far ? "2345" : "456789"); lay(F, P, 2)
}
function foreArm(F, el, hand, far) {
  const P = new Part(), w = [el[0] + (hand[0] - el[0]) * 0.72, el[1] + (hand[1] - el[1]) * 0.72]
  P.limb(el, w, 1.3, 1.2, far ? "2345" : "4567")
  P.limb(w, w, 1.15, 1.15, far ? "UVW" : "VWXY")
  P.limb(hand, hand, 0.95, 0.95, far ? "pqr" : "qrst")
  lay(F, P, 2)
}

// The coat's tails: two lobes falling from the back of the waist, the outer lit, the inner (nearer the
// legs) in shade, flapping out behind her as the Knight's cape does. Folds are highlights along the fall.
function tails(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.8, 2.2, 2.3, 2.0, 1.3, 0.4], "1234", { light: [-0.5, -1], fade: 0.3, lift: 0.05,
    streak: (T, s) => T > 0.25 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [2.0, 2.6, 2.8, 2.5, 1.7, 0.5], "2345678", { light: [-0.5, -1], fade: 0.35, lift: 0.1,
    streak: (T, s) => (T > 0.12 && T < 0.5 && Math.abs(s - 0.45) < 0.2) || (T > 0.45 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 2)
}

// The silver crossbow. (gx, gy) is the grip at the top of the stock; ang turns it (negative: nose up).
// u runs forward along the stock, v down across it. string: "spanned" (to the nut), "loose" (snapped
// straight), or [u, v] (held by the hand while spanning). bolt: laid on the rail; glint: its head flares.
function xbowPt(b, u, v) {
  const c = Math.cos(b.ang), s = Math.sin(b.ang)
  return [b.gx + u * c - v * s, b.gy + u * s + v * c]
}
function crossbow(F, b) {
  const set = (u, v, k) => { const [x, y] = xbowPt(b, u, v); F.set(Math.round(x) + "," + Math.round(y), k) }
  const line = (u0, v0, u1, v1, k) => { const n = Math.ceil(Math.max(Math.abs(u1 - u0), Math.abs(v1 - v0)) * 2) || 1; for (let i = 0; i <= n; i++) set(u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, k) }
  // the prod: a steel arc across the nose, its tips swept back (drawn behind the stock)
  const bend = b.string === "loose" ? 0.8 : 2
  const prodU = (v) => 7 - bend * (v / 5) ** 2
  const tipU = prodU(5)
  for (let v = -5; v <= 5; v += 0.5) { set(prodU(v) + 1, v, Math.abs(v) < 1.5 ? "U" : "T"); }
  for (let v = -5; v <= 5; v += 0.5) set(prodU(v), v, Math.abs(v) > 3.5 ? "W" : v < -1 ? "Y" : "X")
  set(tipU - 0.6, -5.5, "V"); set(tipU - 0.6, 5.5, "U")   // the recurved tips
  // the string
  if (b.string === "spanned") { line(tipU - 1, -5, 1, -0.5, "V"); line(1, 0.5, tipU - 1, 5, "U") }
  else if (b.string === "loose") line(tipU - 0.4, -5, tipU - 0.4, 5, b.snap ? "Z" : "W")
  else { const [hu, hv] = b.string; line(tipU - 1, -5, hu, hv, "V"); line(hu, hv, tipU - 1, 5, "U") }
  // the stock: walnut, lit along its top, a deeper butt, a silver lock plate, the trigger
  line(-6, 0, 8, 0, "t"); line(-6, 1, 7, 1, "r"); line(-6, 2, -3, 2, "q"); set(-7, 1, "p"); set(-7, 2, "o"); set(-7, 0, "q")
  line(-6, 0, -3, 0, "u"); set(8, 1, "q"); set(9, 0, "r")
  set(-1, 0, "W"); set(0, 0, "X"); set(-1, 1, "U"); set(0, 1, "V"); set(1, 2, "T"); set(1, 3, "U")
  set(7, 0, "W"); set(7, 1, "U")   // the steel fitting where the prod sits
  // the bolt on the rail: pale fletching, a silver shaft, the glowing head
  if (b.bolt) {
    line(1, -1, 9, -1, "X"); set(0, -1, "V"); set(1, -2, "X"); set(0, -2, "W")
    set(10, -1, "Y"); set(11, -1, "x"); set(10, -2, "W"); set(10, 0, "V")
    if (b.glint) { set(11, -1, "Z"); set(12, -1, "x"); set(11, -2, "x"); set(11, 0, "x") }
  }
}

// The shot: a silver streak from the nose out of the frame, thick at its head where the bolt flies
// (stage 1, with a white flash bursting at the prod), then breaking into dashes and sparks (stage 2).
function shot(F, x0, y, stage) {
  const set = (x, yy, k) => { if (x < 48 && x >= 0) F.set(x + "," + yy, k) }
  if (stage === 1) {
    for (let x = x0; x < 48; x++) {
      const t = (x - x0) / (47 - x0)
      set(x, y, "Z")
      set(x, y - 1, t > 0.3 ? "Z" : "Y")
      set(x, y + 1, t > 0.4 ? "Y" : "X")
      if (t > 0.2) set(x, y - 2, t > 0.55 ? "Y" : "W")
      if (t > 0.35) set(x, y + 2, t > 0.7 ? "X" : "W")
      if (t > 0.6) set(x, y - 3, t > 0.85 ? "X" : "V")
    }
    // speed lines above and below the streak
    for (let x = x0 + 4; x < 48; x += 1) { if ((x - x0) % 7 < 4) set(x, y - 5, "W"); if ((x - x0 + 3) % 8 < 4) set(x, y + 4, "V") }
    // the bolt itself at the streak's head
    set(47, y, "x"); set(46, y, "x"); set(45, y, "Z"); set(46, y - 1, "x"); set(46, y + 1, "x")
    // the flash at the prod: a burst of short rays
    for (const [dx, dy, k] of [[0, -1, "Z"], [0, 1, "Z"], [-1, 0, "Y"], [1, -1, "Z"], [1, 1, "Z"], [0, -2, "Y"], [0, 2, "Y"], [0, -3, "X"], [0, 3, "X"], [0, -4, "W"], [0, 4, "W"],
      [0, -5, "V"], [0, 5, "V"], [-1, -2, "X"], [-1, 2, "X"], [2, -2, "Y"], [2, 2, "Y"], [3, -3, "X"], [3, 3, "X"], [4, -4, "W"], [4, 4, "W"],
      [-2, -2, "W"], [-2, 2, "W"], [-3, -3, "V"], [-3, 3, "V"], [1, 0, "Z"], [0, 0, "Z"], [-1, -1, "Y"], [-1, 1, "Y"]]) set(x0 + dx, y + dy, k)
  } else if (stage === 2) {
    for (const [a, b2] of [[x0 + 3, x0 + 5], [x0 + 8, x0 + 11]]) for (let x = a; x <= b2; x++) set(x, y, x === a ? "W" : "X")
    for (let x = x0 + 13; x < 48; x++) { set(x, y, x > 44 ? "Y" : "X"); if (x > x0 + 16) set(x, y - 1, "W") }
    for (const [dx, dy, k] of [[1, -3, "W"], [2, -4, "V"], [1, 3, "W"], [2, 4, "V"], [5, -3, "W"], [6, 3, "V"], [-1, -2, "V"], [-1, 2, "V"]]) set(x0 + dx, y + dy, k)
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function mercy(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0, hy = f.hy || 0
  const U = (p) => add(p, [ux, by])     // the upper body's offset (lean, bob)
  const b = { ...f.bow, gx: f.bow.gx + ux, gy: f.bow.gy + by }
  const hand = (u, v) => xbowPt(b, u, v)
  const nearHand = f.nearHand ? U(f.nearHand) : hand(-1.2, 1.6)
  const farHand = f.farHand ? U(f.farHand) : hand(3.2, 1.6)
  upperArm(F, U([21, 24.5]), U(f.farEl), true)
  tails(F, f.tails.map(U), f.tails2.map(U))
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 19 + ux, 23 + by)
  hair(F, [[19, 18], [18.6, 21], [18.4, 23.5], [18 + (f.hairSway || 0), 25.5]].map((p) => add(p, [ux, by + hy])))
  head(F, 14 + ux, 12 + by + hy, f.hatDy || 0)
  foreArm(F, U(f.farEl), farHand, true)
  crossbow(F, b)
  upperArm(F, U([25, 24.5]), U(f.nearEl), false)
  foreArm(F, U(f.nearEl), nearHand, false)
  if (f.shot) shot(F, f.shot[0] + ux, f.shot[1] + by, f.shot[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The tails' line from the back of the waist: falling back and down; `back` streams them out behind
// her, `lift` raises the tips, the ripple runs down them at phase ph.
const tailAt = (ph, amp, back = 0, lift = 0) => {
  const base = [[21, 28], [19.5, 30.5], [18, 32.5], [16.8, 34.5], [15.8, 36.3], [15, 37.5]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - (back * 0.45 + lift) * w + amp * Math.sin(ph - i * 1.1 + 1.2) * w * 0.7]
  })
}
const tailIn = (ph, amp, back = 0, lift = 0) => tailAt(ph - 0.9, amp * 0.8, back * 0.7, lift * 0.7).map(([x, y], i) => [x + 2 + i * 0.35, y + 0.3])

// Legs: hips at (21, 31) far and (25, 31) near; an ankle dx from its hip, lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 31 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34.5 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34.5 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -4, 0, by), near: legAt(25, 3, 0, by) })

// At rest the crossbow is held level at the hip, nose a touch down, both hands on it.
const REST = (dx = 0, dy = 0, da = 0) => ({ bow: { gx: 26 + dx, gy: 29 + dy, ang: 0.1 + da, string: "spanned", bolt: true }, nearEl: [24.5, 28], farEl: [21.5, 28.5] })

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the coat's tails
// rippling out behind and the hair swaying a beat behind them.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, 0, [0, 0, 0, 0, 0.03, 0.03, 0.03, 0][i]), legs: STAND(by),
    tails: tailAt(ph, 1.4, 1.5 + Math.sin(ph) * 1.8), tails2: tailIn(ph, 1.4, 1.5 + Math.sin(ph - 0.9) * 1.8),
    hairSway: Math.sin(ph - 1.6) * 0.8,
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2
  return {
    by, hy: 0, ux: 1, ...REST(0, 0, [0, 0.03, 0, -0.03, 0, 0.03, 0, -0.03][i]), legs: walkLegs(i),
    tails: tailAt(ph, 1.3, 4, 1), tails2: tailIn(ph, 1.3, 4, 1), hairSway: -1.2 + Math.sin(ph) * 0.5,
  }
})

// Attack (12 fps): raise, aim, hold (the bolt's head glints), loose on index 3 (the silver streak, the
// flash, the recoil kicking the nose up and her back), follow through, reload (span the string).
const AIM = { gx: 27, gy: 23, ang: 0, string: "spanned", bolt: true }
const ATTACK_UP = [
  // k0 raise: the crossbow comes up from the hip, nose high
  { bow: { gx: 27, gy: 27, ang: -0.25, string: "spanned", bolt: true }, nearEl: [24, 28], farEl: [22, 28.5] },
  // k1 aim: at the shoulder, level, her head down to the stock
  { ux: 1, hy: 1, bow: AIM, nearEl: [24, 27.5], farEl: [23, 27.5] },
  // k2 hold: leaning in, a breath held, the bolt's head glints
  { ux: 1, hy: 1, by: 1, bow: { ...AIM, glint: true }, nearEl: [24, 27.5], farEl: [23, 27.5] },
  // k3 loose: the bolt is gone in a silver streak, the prod snaps, the recoil kicks the nose up and
  // rocks her back, her hat jolts
  { ux: -1, hy: 0, hatDy: -1, bow: { gx: 27, gy: 23, ang: -0.2, string: "loose", snap: true }, nearEl: [23.5, 27.5], farEl: [22.5, 27.5], shot: [34, 21, 1] },
  // k4 follow-through: the nose settles, the streak breaks up
  { ux: 0, bow: { gx: 27, gy: 23.5, ang: -0.08, string: "loose" }, nearEl: [24, 27.5], farEl: [23, 27.5], shot: [35, 22, 2] },
  // k5 reload: the nose down, her near hand drawing the string back to the nut
  { bow: { gx: 26, gy: 28, ang: 0.45, string: [2.5, -0.8] }, nearEl: [23, 27], nearHand: [27, 26.5], farEl: [22, 29] },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 6) * TAU
  const back = [1.5, 1, 0.8, 5, 3.5, 2][k], lift = [0, 0, 0, 2.5, 1.2, 0][k]   // gathered on the aim, flung back by the recoil
  return {
    by: 0, hy: 0, ...u, legs: STAND(u.by || 0),
    tails: tailAt(ph, 1.1, back, lift), tails2: tailIn(ph, 1.1, back, lift), hairSway: [-0.3, 0, 0, -1.5, -1, 0][k],
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => mercy(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => mercy(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => mercy(c, ATTACK[c.frame]))
anim("witchhunter_a2", { ...BOX, frames: 22, fps: 10 }, (c) => mercy(c, ALL[c.frame]))
