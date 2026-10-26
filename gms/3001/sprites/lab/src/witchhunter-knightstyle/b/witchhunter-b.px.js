// Mercy Crane the Witch Hunter, "Knight style B (Inquisitor)": a grim inquisitor in a tall-crowned hat
// and a dark slate long coat whose split tails stream behind her as the Knight's cape does, a crimson
// scarf whose long ends fly out like his plume (the one strong accent, with the hat band), silver
// buckles and a heavy ornate silver crossbow. No black outline: every edge a dark tone of its own
// material; hue-shifted ramps (purple shadows, warm light).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the bolt leaves on 19, attack
// index 3, the game's default). Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build witchhunter-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/witchhunter_b.png <sheet>   (adds the glow rows)
pal({
  // the coat and hat (main material): violet-black shadows, a cool slate body, warm grey light
  0: "#161221", 1: "#211b30", 2: "#2d2741", 3: "#3a3553", 4: "#4a4766", 5: "#5d5c7c", 6: "#747593", 7: "#9190ab", 8: "#bcb3c6",
  // crimson (the one strong accent): near-black wine to a warm coral light
  Z: "#2a0410", z: "#4a0716", y: "#6e0b1c", t: "#961322", T: "#be1d2b", Y: "#e0383a", Q: "#ff7a5c",
  // silver (crossbow, buckles, bolts): purple-grey shadows, pink-white light
  a: "#251f38", b: "#403a5a", c: "#67628a", d: "#9894b2", e: "#c6c2d8", f: "#ece6f2", W: "#ffffff",
  // skin
  K: "#4a1d2a", k: "#6f333a", F: "#b56a5b", r: "#94494a", P: "#d68a6c", p: "#e7aa88",
  // brown hair
  U: "#22101a", V: "#3a1a1c", h: "#57281f", i: "#763a26", I: "#955430", J: "#b06f3c",
  // leather (gloves, boots) and walnut (the stock)
  L: "#170d16", l: "#24131c", M: "#331b22", m: "#45242a", N: "#5a3030", n: "#713e37", O: "#8c5242",
  // eye, bowstring, the glowing bolt head
  x: "#141a33", s: "#d8ccd2", g: "#dff6ff",
})
ramps("012345678", "ZzytTYQ", "abcdefW", "KkrFPp", "UVhiIJ", "LlMmNnO")

// ------------------------------------------------------------------ a small compositor
// (the Ranger C compositor) Each part paints into its own map; laid on the frame, its boundary pixels
// step darker along their own ramp, so nothing has a black line: every part is edged in its own
// darkest tones. COARSE holds the steps an edge darkens by, FINE the half-tones between them.
const COARSE = ["02468", "ZytYQ", "abdfW", "KrPp", "UhIJ", "LMNO"]
const FINE = ["012345678", "ZzytTYQ", "abcdefW", "KkrFPp", "UVhiIJ", "LlMmNnO"]
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
  px(x, y, k) { if (k && k !== "." && k !== " ") this.m.set(Math.round(x) + "," + Math.round(y), k); return this }
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
  // A flowing mass along a polyline (a scarf end, a coat tail): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`), folds catching the light where `streak(T, s)` holds.
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
// Lay a part on the frame; edge: coarse steps darker for its boundary; open(x, y, dx, dy): sides left light.
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KkrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The head, 13x11 at (18, 12) at rest: a tall capotain crown (lit on its back, in shade toward the
// front), a crimson band with a silver buckle, a wide brim dipping at the front over the eyes; under
// it a small grim face in profile (the eye in the brim's shadow, the nose a pixel proud), brown hair
// tied back at the nape.
const HEAD = `
  ....56776.....
  ...4678765....
  ...4678654....
  ...4677543....
  ...zTYTtfd....
  .256788776543.
  ..2VhhkrrrK322
  ...VhIPpxpP...
  ...UhiPppPPF..
  ...UViFPpPk...
  ....UVrFPr....`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD), 2)
}

// The coat's upper body, 9x8 at (20, 22) at rest: the shoulders and chest of the slate coat, leaning
// forward (the chest a pixel ahead of the waist), a silver-buckled strap across it, the belt with its
// silver buckle.
const TORSO = `
  ...566765.
  ..4578876N
  .4678876e5
  .4678N654.
  .467N7654.
  .35N6543..
  .MNnOfeN..
  .3566543..`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 1, (x, y, dx, dy) => dy > 0)
}

// The front of the coat's skirt, from the belt to the knees, its front edge kicked by the stride.
function skirt(F, x0, y0, kick) {
  // an A-line: the back edge falls straight, the front edge swings with the stride; a fold runs down
  // from the belt's back, lit on its back face and in shade on its front face
  const P = new Part().poly([[x0 + 0.5, y0], [x0 + 7, y0], [x0 + 7.6 + kick, y0 + 5.4], [x0 + 3 + kick * 0.3, y0 + 6.4], [x0 - 0.8, y0 + 5.6]],
    (x, y) => { const u = x - x0 - (y - y0) * 0.25; return u < 1.2 ? "6" : u < 2.4 ? "7" : u < 3.4 ? "4" : u < 5.4 ? "5" : "4" })
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// A leg: hip, knee, ankle; dark breeches to the knee, a tall black-leather boot with a silver buckle.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.6, 1.3, far ? "1233" : "345567")
  P.limb(knee, ankle, 1.35, 1.15, far ? "lMmN" : "MmNnOO")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky, far ? "m" : "N"); P.px(kx, ky, far ? "N" : "n"); P.px(kx + 1, ky, far ? "m" : "N")   // the boot's cuff
  if (!far) P.px(kx, ky + 2, "d")   // a buckle on the near boot
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "M" : "m")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "l" : "M")
  lay(F, P, 1)
}

// An arm: shoulder, elbow, hand; a slate sleeve, a silver cuff, a black glove.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.5, 1.25, far ? "2345" : "4567788")
  P.limb(el, hand, 1.2, 1.05, far ? "2345" : "456778")
  P.limb(hand, hand, 1.05, 1.05, far ? "lMm" : "MmNn")
  lay(F, P, 1)
}

// The coat's split tails: two lobes from the hips, the outer lit, the inner a frame behind and in shade.
function tails(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [1.8, 2.0, 1.9, 1.5, 0.9, 0.3], "12345", { light: [-0.5, -1], fade: 0.3, lift: 0.05,
    streak: (T, s) => T > 0.3 && T < 0.8 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [2.0, 2.4, 2.3, 1.9, 1.2, 0.4], "2345678", { light: [-0.5, -1], fade: 0.35, lift: 0.08,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.85 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 2)
}

// The crimson scarf: wound at the throat with a knot, its two long ends flying back from the nape.
function scarf(F, end1, end2) {
  const P = new Part()
  P.strand(end2, [1.1, 1.2, 1.0, 0.8, 0.4], "zytT", { light: [-0.4, -1], fade: 0.25, lift: 0.05 })
  P.strand(end1, [1.3, 1.4, 1.3, 1.0, 0.7, 0.3], "zytTYQ", { light: [-0.4, -1], fade: 0.3, lift: 0.1,
    streak: (T, s) => T > 0.15 && T < 0.6 && Math.abs(s - 0.4) < 0.25 })
  lay(F, P, 2)
}
function wrap(F, x0, y0) {
  const P = new Part().grid(x0, y0, `
    tTYYTTt.
    ytTTtYTt
    ......yt
    .......z`)
  lay(F, P, 1)
}

// The crossbow, in its own frame: u forward along the stock from the grip at (ox, oy), v down,
// turned by `a` (nose up when > 0). span: how far the string is drawn back (1 spanned, 0 loose);
// bend: how far the prod's limbs bend back; bolt: a bolt laid on; glint: its head flashes.
function crossbow(F, ox, oy, a, { span = 1, bend = 1.6, bolt = true, glint = false } = {}) {
  const ca = Math.cos(a), sa = Math.sin(a)
  const P = (u, v, k) => F.set(Math.round(ox + u * ca + v * sa) + "," + Math.round(oy - u * sa + v * ca), k)
  const line = (u0, u1, v, k) => { for (let u = u0; u <= u1 + 0.01; u += 0.34) P(u, v, typeof k === "function" ? k(u) : k) }
  // the walnut stock under a silver rail, flaring to the butt, silver-mounted
  line(-8, -3, 2, "N"); line(-8, -5, 3, "M")
  line(-8, 7, 1, (u) => (u < -6 ? "n" : u < 0 ? "O" : "n"))
  line(-8, 8, 0, (u) => (u < -6 ? "d" : u < 1 ? "f" : u < 6 ? "e" : "d"))
  for (const v of [0, 1, 2, 3]) P(-8.6, v, v < 2 ? "e" : "c")   // the butt plate
  P(-5, 1, "e"); P(-2, 1, "e"); P(-4, 2, "T")                    // silver inlay and a crimson stone
  line(0, 2, 1, "c"); P(1, 1, "e")                                // the lock plate
  P(0, 2, "b"); P(0.5, 3, "a")                                    // the trigger
  P(8, 0, "f"); P(8, 1, "c"); P(9, 0, "e"); P(9, 1, "b")          // the nose cap
  // the prod: a heavy recurved silver bow standing across the nose, three pixels thick
  for (let v = -4.5; v <= 5.5; v += 0.5) {
    const w = (v - 0.5) / 5, u = 8.5 - bend * w * w, ad = Math.abs(v - 0.5)
    P(u - 1, v, ad > 4 ? "e" : "f"); P(u, v, ad > 4 ? "c" : "d"); if (ad < 4.5) P(u + 1, v, "b")
  }
  const tu = 8.5 - bend - 1
  P(tu, -5, "W"); P(tu, 6, "c")
  // the string from the tips to the nut (spanned) or straight across
  const nu = 1 + (tu - 1) * (1 - span)
  const str = (v0) => { const n = 12; for (let i = 0; i <= n; i++) { const t = i / n; P(tu - 0.6 + (nu - tu + 0.6) * t, v0 + (0 - v0) * t, "s") } }
  str(-4.5); str(5.5)
  if (bolt) {   // a silver bolt on the rail: fletch, shaft, the glowing head
    line(nu, nu + 11, -1, "d"); P(nu, -2, "e"); P(nu + 1, -2, "f")
    P(nu + 12, -1, glint ? "W" : "g"); P(nu + 11, -2, "e"); P(nu + 11, 0, "c")
    if (glint) { P(nu + 13, -1, "g"); P(nu + 12, -2, "g"); P(nu + 12, 0, "g") }
  }
}

// The shot: a bright silver streak from the nose out of the frame, thick at its head, with a white
// flash crescent off the snapping prod (stage 1), then breaking into dashes (stage 2).
function streak(F, x0, y, stage) {
  const set = (x, yy, k) => { if (x < 48 && x >= 0) F.set(x + "," + yy, k) }
  if (stage === 1) {
    for (let x = x0; x < 48; x++) {
      const t = (x - x0) / Math.max(1, 47 - x0)
      set(x, y, t < 0.15 ? "f" : "W")
      if (t > 0.2) set(x, y - 1, t > 0.55 ? "W" : "e")
      if (t > 0.4) set(x, y + 1, t > 0.75 ? "f" : "d")
      if (t > 0.7) set(x, y - 2, "d")
    }
    set(47, y, "g"); set(46, y, "g"); set(47, y - 1, "g")
    for (let dy = -7; dy <= 7; dy++) {   // the flash off the prod
      const x = x0 - 2 + Math.round(4 * (1 - (dy / 7.5) ** 2)), ad = Math.abs(dy)
      set(x, y + dy, ad > 5 ? "d" : ad > 2 ? "e" : "W")
      if (ad <= 4) set(x - 1, y + dy, ad > 2 ? "d" : "f")
    }
    set(x0 - 3, y - 3, "e"); set(x0 - 4, y + 4, "d"); set(x0 + 2, y - 5, "d"); set(x0 + 3, y + 5, "d")   // sparks
  } else if (stage === 2) {
    for (const [p, q] of [[x0 + 3, x0 + 5], [x0 + 8, x0 + 10]]) for (let x = p; x <= q; x++) set(x, y, x === p ? "d" : "e")
    for (let x = x0 + 13; x < 48; x++) { set(x, y, x > 45 ? "g" : "f"); if (x > x0 + 15) set(x, y - 1, "d") }
    set(x0 + 1, y - 4, "d"); set(x0 + 2, y + 4, "c"); set(x0 + 6, y - 3, "c")
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function mercy(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  scarf(F, f.scarf.map(U), f.scarf2.map(U))
  tails(F, f.tails.map(U), f.tails2.map(U))
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  skirt(F, 21 + ux, 29 + by, f.kick || 0)
  torso(F, 20 + ux, 22 + by)
  head(F, 19 + ux + (f.hx || 0), 12 + by + (f.hy || 0))
  wrap(F, 22 + ux + (f.hx || 0), 22 + by + Math.max(0, f.hy || 0))
  const fa = f.farArm, na = f.nearArm, xb = f.xbow
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  const g = U([xb.x, xb.y])
  crossbow(F, g[0], g[1], xb.a, xb)
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (fa.over) { const P = new Part(); P.limb(U(fa.hand), U(fa.hand), 1.05, 1.05, "lMm"); lay(F, P, 1) }   // the far glove over the fore-stock
  if (f.streak) streak(F, f.streak[0] + ux, f.streak[1] + by, f.streak[2])
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The scarf's ends from the nape: they stream back and lift in the wind, the ripple running down them.
const SCARF0 = [[22, 22.5], [20, 22.5], [18, 23], [16.2, 24], [14.6, 25.3], [13.2, 27]]
const scarfAt = (ph, amp, back = 0, lift = 0) => SCARF0.map(([x, y], i) => {
  const w = Math.pow(i / (SCARF0.length - 1), 1.2)
  return [x - back * w + amp * 0.4 * Math.sin(ph - i * 0.9) * w, y - lift * w + amp * Math.sin(ph - i * 0.9 + 0.8) * w]
})
const scarf2At = (ph, amp, back = 0, lift = 0) => scarfAt(ph - 1.1, amp * 0.9, back * 0.8, lift * 0.7).slice(0, 5).map(([x, y], i) => [x + 0.8 + i * 0.2, y + 1.2 + i * 0.5])
// The coat's tails from the hips: they fall back and down; `back` streams them out behind.
const tailsAt = (ph, amp, back = 0) => {
  const base = [[22, 29], [20.5, 31.5], [19, 33.5], [17.5, 35], [16, 36.3], [14.5, 37.2]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.45 + amp * 0.7 * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const tails2At = (ph, amp, back = 0) => tailsAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2 + i * 0.5, y + 0.3])

// Legs: hips at (22, 31) far and (25, 31) near; an ankle dx from its hip, lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 31 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34.5 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34.5 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(22, -4, 0, by), near: legAt(25, 3, 0, by) })

// At rest the crossbow is carried at the hip, nose a little down: the near hand on the grip, the far
// hand under the fore-stock.
const REST = (sw = 0, nod = 0) => ({
  farArm: { sh: [22, 24], el: [24, 28], hand: [32 + sw * 0.3, 29.5 + nod], over: true },
  nearArm: { sh: [25, 24], el: [25 + sw * 0.4, 27.5], hand: [27.5, 29.5 + nod * 0.5] },
  xbow: { x: 27.5, y: 29 + nod * 0.5, a: -0.1 - nod * 0.03 },
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the coat tails and
// the scarf rippling behind in the wind.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, [0, 0, 0, 0, 1, 1, 0, 0][i] * 0), legs: STAND(by),
    tails: tailsAt(ph, 1.5, 1.5 + Math.sin(ph) * 2), tails2: tails2At(ph, 1.5, 1.5 + Math.sin(ph - 0.9) * 2),
    scarf: scarfAt(ph, 1.8, 1 + Math.sin(ph - 1.4) * 1.3, 2 + Math.sin(ph - 0.6) * 1.3), scarf2: scarf2At(ph, 1.8, 1 + Math.sin(ph - 1.4) * 1.3, 2 + Math.sin(ph - 0.6) * 1.3),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(22, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, hy: 0, hx: 1, ux: 1, ...REST(sw * 0.5, 0), legs: walkLegs(i), ph,
    kick: GAIT[i][0] > 1 ? 1 : 0,
    tails: tailsAt(ph, 1.3, 4), tails2: tails2At(ph, 1.3, 4),
    scarf: scarfAt(ph, 1.1, 2.5, 1.5), scarf2: scarf2At(ph, 1.1, 2.5, 1.5),
  }
})

// Attack (12 fps): raise, shoulder and aim, hold (the bolt head glints), loose on index 3 (the bolt
// leaves as a silver streak, the prod snaps, the recoil kicks the nose up and rocks her back), the
// streak breaks up, then she lowers it and spans the string again.
const SHOT_Y = 22
const AIM_ARMS = (dx = 0, dy = 0) => ({
  farArm: { sh: [22, 24], el: [26 + dx, 27 + dy], hand: [32 + dx, 24 + dy], over: true },
  nearArm: { sh: [25, 24], el: [25 + dx, 27 + dy], hand: [28 + dx, 24 + dy] },
})
const ATTACK_UP = [
  // k0 raise: the crossbow swings up from the hip, nose rising
  { ux: 0, hx: 0, farArm: { sh: [22, 24], el: [25, 27], hand: [31, 24], over: true }, nearArm: { sh: [25, 24], el: [25, 28], hand: [27.5, 27] }, xbow: { x: 27.5, y: 26.5, a: 0.38 } },
  // k1 shoulder and aim: the butt in the shoulder, the cheek down to the rail, leaning in
  { ux: 1, hx: 0, hy: 1, ...AIM_ARMS(), xbow: { x: 28, y: 23.5, a: 0 } },
  // k2 hold: the bolt head glints, a pixel further into the lean
  { ux: 1, hx: 1, hy: 1, ...AIM_ARMS(1), xbow: { x: 29, y: 23.5, a: 0, glint: true } },
  // k3 loose: the bolt is gone, the prod snaps flat, the string straight, the recoil kicks the nose up and rocks her back
  { ux: 0, hx: -1, hy: 0, ...AIM_ARMS(-1, -0.5), xbow: { x: 27, y: 23, a: 0.14, span: 0, bend: 0.4, bolt: false }, streak: [37, SHOT_Y, 1] },
  // k4 follow-through: settling, the streak breaking into dashes
  { ux: 0, hx: 0, hy: 1, ...AIM_ARMS(0, 0), xbow: { x: 28, y: 23.5, a: 0.06, span: 0, bend: 0.7, bolt: false }, streak: [38, SHOT_Y, 2] },
  // k5 reload: the nose down at the hip, the far hand hauling the string back to the nut, a new bolt on
  { ux: 0, hx: 0, farArm: { sh: [22, 24], el: [22, 27], hand: [26, 27.5], over: true }, nearArm: { sh: [25, 24], el: [26, 28], hand: [28.5, 29.5] }, xbow: { x: 28.5, y: 29.5, a: -0.32, span: 0.75, bend: 1.3, bolt: false } },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 6) * TAU
  const back = [1.5, 1, 0.8, 4.5, 3, 2][k], lift = [0.5, 0.5, 0.5, 2.5, 1.5, 0.5][k]   // gathered on the aim, flung back by the shot
  return {
    by: 0, hy: 0, ...u, legs: k >= 1 && k <= 4 ? { far: legAt(22, -5, 0, 0), near: legAt(25, 4, 0, 0) } : STAND(0),
    tails: tailsAt(ph, 1.2, back), tails2: tails2At(ph, 1.2, back),
    scarf: scarfAt(ph, 1.3, back * 0.6, lift), scarf2: scarf2At(ph, 1.3, back * 0.6, lift),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => mercy(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => mercy(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => mercy(c, ATTACK[c.frame]))
anim("witchhunter_b", { ...BOX, frames: 22, fps: 10 }, (c) => mercy(c, ALL[c.frame]))
