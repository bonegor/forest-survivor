// Kael the Shadow, "Knight style A (Assassin)": a hooded human assassin in near-black purple leathers,
// cowl up, a plum scarf wound round his throat and up over his face as a mask, its two long tattered
// tails trailing behind him as the plumed Knight's plume and cape do; twin daggers with 1 px bright
// edges, a glowing violet eye. No black outline: every edge is a dark tone of its own material, and the
// ramps are hue-shifted (blue-black shadows, lavender lights).
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the blades leave on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build rogue-a.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/rogue_a.png <sheet>   (adds the glow rows)
pal({
  // leathers (the main material): blue-black shadows to cool lavender lights
  0: "#0a0a1a", 1: "#12112a", 2: "#1b1838", 3: "#252048", 4: "#312a5a", 5: "#40356c", 6: "#534480", 7: "#6c5797", 8: "#8b70ad", 9: "#ae94c6",
  // the scarf and mask (the accent cloth): deep plum to orchid
  a: "#160818", b: "#250b2c", c: "#380f42", d: "#4f1559", e: "#681c72", f: "#85288c", g: "#a33aa5", h: "#c05cbc",
  // the little skin round the eye: cool and pale
  K: "#3d2638", k: "#6e4a5c", F: "#a7798a", p: "#d3a9b0",
  // steel: violet-grey to a near-white edge
  S: "#24223a", T: "#46445f", t: "#6f6c90", U: "#a4a2c4", W: "#eceaff",
  // the violet glow: the eye, the pommel gems, the streaks
  v: "#6d3fd0", w: "#9d6cff", x: "#c9a6ff", y: "#f0e4ff",
  // the cowl: a cooler, indigo-violet cloth than the leathers, so the head reads apart from the body
  A: "#0d0b1f", B: "#15132f", C: "#1e1b42", D: "#282554", E: "#333066", G: "#423e7a", H: "#55508f", I: "#6e68a6", J: "#8f88bf", O: "#b4acd6",
  // boots and gloves: a warmer, plum-brown leather
  L: "#170c1c", l: "#25132b", M: "#351c3a", m: "#48274b", N: "#5e355d", n: "#7a4872",
})
ramps("0123456789", "abcdefgh", "KkFp", "STtUW", "vwxy", "LlMmNn", "ABCDEGHIJO")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp, so the silhouette and every part laid
// over another are edged in their own darker tones, never in black.
const COARSE = ["02468", "aceg", "KkFp", "STUW", "vwxy", "LlMmNn", "ACEHJ"]
const FINE = ["0123456789", "abcdefgh", "KkFp", "STtUW", "vwxy", "LlMmNn", "ABCDEGHIJO"]
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
  // A round limb from a to b, radius ra to rb, lit from `light`: `ramp` dark to light.
  limb(a, b, ra, rb, ramp, light = [-0.4, -1]) {
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
  // A flowing mass along a polyline (a scarf tail, a coat tail): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`), with fold highlights where `streak(T, s)` holds (T 0..1
  // along it, s -1..1 across it) and torn notches where `torn(T, s)` holds.
  strand(pts, rs, ramp, { light = [-0.5, -1], fade = 0.3, streak = null, lift = 0.08, torn = null } = {}) {
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
        if (torn && torn(best.T, -best.s)) continue
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
    F.set(key, out ? darker(k, "KkFp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]

// ------------------------------------------------------------------ the parts
// The cowl, 12x11 at (16, 12) at rest, its peak leaning back and its back draping onto the shoulders: lit from the upper left, its front rim catching the light round
// the opening; deep shadow inside, one row of pale skin with the glowing violet eye, and the scarf
// wound up over the nose and mouth as a mask (plum keys), running down into the neck wrap.
const HEAD = `
  ..4567......
  .36789987...
  .357899987..
  .3567898876.
  .3567871Kk7.
  .356755kwy7.
  .246543defgf
  2345543cdefe
  2345443cded.
  12344332bcd.
  .1233222bbc.`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD.replace(/[0-9]/g, (d) => "ABCDEGHIJO"[d])), 2, (x, y, dx, dy) => dy > 0)
  F.set(x0 + 8 + "," + (y0 + 5), "w"); F.set(x0 + 9 + "," + (y0 + 5), "y")   // the eye stays lit
}

// The jerkin, 8x9 at (19, 22) at rest: a dark strap with a steel stud across the chest, a belt with a
// steel buckle, the short coat skirt below it.
const TORSO = `
  ..5676..
  .567875.
  .5678725
  .4678t64
  .467275.
  ..5t664.
  .12UT21.
  .345654.
  23456543`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 2, (x, y, dx, dy) => dy < 0)
}

// The scarf's wrap round the throat, 9x3 at (18, 21).
function wrap(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, `
    ..bcdeed.
    .bdeffgfd
    .abcddc..`), 1)
}

// The scarf's two tails from the back of the neck: tapering strands of plum cloth, a fold catching the
// light along each, darker toward the frayed ends (torn notches near the tips).
function scarf(F, t1, t2) {
  const P = new Part()
  P.strand(t2, [1.5, 1.5, 1.2, 0.8, 0.3], "abcdef", { fade: 0.35, lift: 0.05,
    torn: (T, s) => T > 0.8 && Math.abs(s) < 0.3 })
  P.strand(t1, [1.9, 2.0, 1.9, 1.6, 1.1, 0.4], "bcdefgh", { fade: 0.3, lift: 0.1,
    streak: (T, s) => T > 0.1 && T < 0.6 && Math.abs(s - 0.4) < 0.25,
    torn: (T, s) => T > 0.78 && Math.abs(s + 0.1) < 0.28 })
  lay(F, P, 2)
}

// The coat's split tails behind the legs, in the leathers.
function coat(F, pts) {
  const P = new Part()
  P.strand(pts, [1.9, 1.8, 1.3, 0.5], "123456", { fade: 0.3, lift: 0.05,
    torn: (T, s) => T > 0.7 && Math.abs(s) < 0.25 })
  lay(F, P, 2)
}

// A leg: hip, knee, ankle; close-fitting leathers, a wrapped boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.5, 1.2, far ? "2345" : "345678")
  P.limb(knee, ankle, 1.2, 1.05, far ? "LlMm" : "lMmNn")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx, ky + 1, far ? "T" : "t")   // the boot's steel knee buckle
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "M" : "m")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "l" : "M")
  lay(F, P, far ? 2 : 1)
}

// An arm: shoulder, elbow, hand. A leather sleeve, a wrapped bracer, a gloved fist.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.4, 1.15, far ? "2345" : "456789")
  P.limb(el, hand, 1.1, 0.95, far ? "1234" : "345678")
  P.limb(hand, hand, 1.05, 1.05, far ? "lMm" : "MmNn")
  lay(F, P, far ? 2 : 1)
}

// A dagger in a fist at `hand`, pointing at angle `ang` (radians, 0 = right, + = down): a violet gem
// pommel and a wrapped grip behind the fist, a steel guard, a blade `len` px long whose upper side is
// a 1 px bright edge.
function dagger(F, hand, ang, len = 6, far = false, thrown = false) {
  const dx = Math.cos(ang), dy = Math.sin(ang)
  let nx = -dy, ny = dx; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny }   // the upper side
  const at = (s, o = 0, k) => F.set(Math.round(hand[0] + dx * s + nx * o) + "," + Math.round(hand[1] + dy * s + ny * o), k)
  at(-2, 0, far ? "v" : "w")                     // pommel gem
  if (thrown) { at(-1, 0, "3"); at(0, 0, "4"); at(1, 0, "3") }   // the grip, no fist round it
  at(1.2, 0.9, far ? "T" : "t"); at(1.2, -0.9, far ? "S" : "T")   // guard
  for (let i = 0; i < len; i++) {
    const s = 2 + i
    at(s, 0, far ? "t" : (i < len - 1 ? "t" : "U"))
    if (i < len - 1) at(s, 0.9, far ? "U" : "W")  // the bright edge
  }
  at(1 + len, 0, far ? "U" : "W")                 // the point
}

// ------------------------------------------------------------------ effects
// The throw (attack index 3): the arms cross as they whip out, so the two daggers fly apart, one down
// and one up, point first, each at the head of a sharp pale-violet streak from the hand; the streaks
// cross in an X before the chest. The streak is a thin crescent, thickest and brightest near its head.
// Stage 2 (the spin): the daggers are gone and the streaks break up into dashes.
function throwStreaks(F, throws, stage) {
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 48 && y >= 0 && y < 48) F.set(x + "," + y, k) }
  for (const [[hx, hy], [tx, ty], bow, maxW] of throws) {
    const L = Math.hypot(tx - hx, ty - hy), dx = (tx - hx) / L, dy = (ty - hy) / L, nx = -dy, ny = dx
    const ex = tx - dx * 7, ey = ty - dy * 7          // the streak ends at the thrown dagger's pommel
    const cx = (hx + ex) / 2 + nx * bow, cy = (hy + ey) / 2 + ny * bow
    const P = (t) => [(1 - t) * (1 - t) * hx + 2 * t * (1 - t) * cx + t * t * ex, (1 - t) * (1 - t) * hy + 2 * t * (1 - t) * cy + t * t * ey]
    for (let t = 0.04; t <= 1; t += 0.01) {
      const [x, y] = P(t)
      if (stage === 1) {
        const w = maxW * (0.25 + 0.75 * t) * (t > 0.9 ? 1 - (t - 0.9) * 5 : 1)
        for (let d = -w; d <= w + 0.01; d += 0.5) {
          const q = Math.abs(d) / Math.max(w, 0.01)
          let k = q < 0.4 ? "y" : q < 0.75 ? "x" : "w"
          if (t < 0.3) k = q < 0.5 ? "x" : "w"
          if (t < 0.12) k = "v"
          set(x + nx * d, y + ny * d, k)
        }
      } else if ((t > 0.45 && t < 0.56) || (t > 0.68 && t < 0.86) || t > 0.94) set(x, y, t > 0.7 ? "x" : "w")
    }
    if (stage === 1) dagger(F, [ex + dx * 2, ey + dy * 2], Math.atan2(dy, dx), 4, false, true)
  }
}
// The whip (attack index 2): a thin motion arc over the head, from behind the shoulder to the hands.
function whipArc(F, cx, cy, r, a0, a1, thick) {
  for (let a = a0; a <= a1; a += 0.02) {
    const u = (a - a0) / (a1 - a0), w = Math.sin(u * Math.PI * 0.85 + 0.15) * thick
    for (let d = 0; d <= w; d += 0.5) {
      const x = Math.round(cx + Math.cos(a) * (r - d)), y = Math.round(cy + Math.sin(a) * (r - d))
      if (x < 0 || x >= 48 || y < 0 || y >= 48) continue
      F.set(x + "," + y, d < 0.6 ? (u > 0.5 ? "y" : "x") : u > 0.4 ? "x" : "w")
    }
  }
}
// The spin back (attack index 4): rings of violet motion round the waist and shoulders, bright where
// they pass in front of him (and lead the turn, to the right), dim where they pass behind.
function spinRing(F, cx, cy) {
  for (const [ry, rx, oy] of [[3, 12, 0], [2, 9, -6]]) for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + oy + Math.sin(a) * ry), front = Math.sin(a) > 0
    if (x < 0 || x >= 48) continue
    if (front) F.set(x + "," + y, Math.cos(a) > 0.3 ? "y" : Math.cos(a) > -0.4 ? "x" : "w")
    else if (!F.has(x + "," + y) && Math.cos(a) > -0.5) F.set(x + "," + y, "v")
  }
}

// ------------------------------------------------------------------ the figure
function kael(c, f) {
  let F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  const fa = f.farArm, na = f.nearArm
  scarf(F, f.scarf1.map(U), f.scarf2.map(U))
  coat(F, f.coat.map(U))
  const farHand = () => {
    if (f.farDagger != null) dagger(F, U(fa.hand), f.farDagger, 5, true)
    if (f.farDagger != null) { const P = new Part().limb(U(fa.hand), U(fa.hand), 1.05, 1.05, "lMm"); lay(F, P, 1) }
  }
  if (fa.front) {   // the guard: the far arm's upper arm behind, its forearm and fist across the chest
    const P = new Part().limb(U(fa.sh), U(fa.el), 1.4, 1.15, "2345"); lay(F, P, 2)
  } else { arm(F, U(fa.sh), U(fa.el), U(fa.hand), true); farHand() }
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 19 + ux, 22 + by)
  head(F, 16 + ux, 12 + by + (f.hy || 0))
  wrap(F, 18 + ux, 21 + by)
  if (fa.front) { const P = new Part().limb(U(fa.el), U(fa.hand), 1.1, 0.95, "23456"); lay(F, P, 2); farHand() }
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.nearDagger != null) {
    dagger(F, U(na.hand), f.nearDagger, 6, false)
    const P = new Part().limb(U(na.hand), U(na.hand), 1.05, 1.05, "MmNn"); lay(F, P, 1)
  }
  if (f.glint) { const [gx, gy] = f.glint; F.set(gx + "," + gy, "y"); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) F.set(gx + dx + "," + (gy + dy), "x") }
  if (f.flip) { const M = new Map(); for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); M.set(47 - x + "," + y, k) } F = M }
  if (f.arc) whipArc(F, ...f.arc)
  if (f.streaks) throwStreaks(F, f.streaks[0], f.streaks[1])
  if (f.spin) spinRing(F, ...f.spin)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The scarf's long tail from the back of the neck: it falls back and down; `back` streams it out level
// behind (walking), the ripple runs down it at phase ph; `lift` raises its end.
const S1 = [[20, 22], [17, 22.5], [14, 23.5], [11.5, 25.5], [9.5, 28], [8, 31]]
const S2 = [[20, 23], [17.5, 24.5], [15.5, 26.5], [14, 29], [13, 31.5]]
const flow = (base, ph, amp, back, lift = 0) => base.map(([x, y], i) => {
  const w = Math.pow(i / (base.length - 1), 1.2)
  return [x - back * w * 1.3 + amp * 0.4 * Math.sin(ph - i * 1.0) * w, y - (back * 0.55 + lift) * w + amp * Math.sin(ph - i * 1.0 + 1.1) * w]
})
const scarfAt = (ph, amp, back = 0, lift = 0) => ({ scarf1: flow(S1, ph, amp, back, lift), scarf2: flow(S2, ph - 0.9, amp * 0.8, back * 0.8, lift * 0.7) })
const C0 = [[20, 29], [17.5, 31], [15.5, 33], [14, 35]]
const coatAt = (ph, amp, back = 0) => ({ coat: flow(C0, ph - 0.5, amp, back) })

// Legs: hips at (21, 30) far and (24, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0, far = -4, near = 3) => ({ far: legAt(21, far, 0, by), near: legAt(24, near, 0, by) })

// The ready stance: the near dagger low and forward, point up; the far one reversed along the forearm.
// The ready stance: the far fist low behind the hip, its dagger reversed and jutting out behind; the
// near dagger low and forward, point up.
const READY = (sw = 0) => ({
  farArm: { sh: [20, 24], el: [18 + sw * 0.5, 27], hand: [17 + sw, 29] }, farDagger: Math.PI + 0.25,
  nearArm: { sh: [24, 24], el: [26 - sw * 0.3, 27], hand: [30 - sw * 0.5, 29], }, nearDagger: -0.6,
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the scarf rippling out
// behind in the wind, the coat tails a beat behind it, a glint running up the near blade on f2.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...READY(), legs: STAND(by),
    ...scarfAt(ph, 1.6, 1.5 + Math.sin(ph) * 2), ...coatAt(ph, 0.9, 0.5),
    glint: i === 2 ? [34, 25] : null,
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, ux: 1, ...READY(sw), legs: { far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], by), near: legAt(24, GAIT[i][0], GAIT[i][1], by) },
    ...scarfAt(ph, 1.2, 4), ...coatAt(ph, 1.0, 2.5),
  }
})

// Attack (12 fps): crouch and draw both blades back, coil, whip forward, throw (both blades fly with
// pale-violet streaks), spin back round (seen from behind for a frame), recover with fresh blades.
const ATTACK = [
  // k0 crouch, both blades drawn back past the hip
  { by: 2, ux: -1, legs: STAND(2, -6, 4), farArm: { sh: [20, 24], el: [17, 26], hand: [14, 26] }, farDagger: Math.PI + 0.3,
    nearArm: { sh: [24, 24], el: [21, 26], hand: [18, 26] }, nearDagger: Math.PI - 0.4, ...scarfAt(0, 1, 2.5, 1), ...coatAt(0, 0.6, 1.5) },
  // k1 coil: lower, the near blade up behind the head, the far low behind
  { by: 3, ux: -2, legs: STAND(3, -6, 4), farArm: { sh: [20, 24], el: [17, 27], hand: [15, 29] }, farDagger: Math.PI - 0.6,
    nearArm: { sh: [24, 24], el: [21, 21], hand: [18, 18] }, nearDagger: -2.3, ...scarfAt(1, 1, 1.5, -1), ...coatAt(1, 0.6, 1) },
  // k2 uncoil: rising and lunging, both arms whipping forward overhead
  { by: 1, ux: 1, legs: STAND(1, -7, 5), farArm: { sh: [20, 24], el: [23, 21], hand: [26, 20] }, farDagger: -0.9,
    nearArm: { sh: [24, 24], el: [27, 21], hand: [30, 19] }, nearDagger: -0.6, ...scarfAt(2, 1, 3.5, 1), ...coatAt(2, 0.8, 2),
    arc: [24, 25, 13, -2.5, -0.85, 1.5] },
  // k3 throw: arms flung out level, the blades gone, flying point first at the heads of their streaks
  { by: 1, ux: 2, legs: STAND(1, -8, 6), farArm: { sh: [20, 24], el: [25, 25], hand: [29, 27] }, farDagger: null,
    nearArm: { sh: [24, 24], el: [28, 23], hand: [32, 23] }, nearDagger: null, ...scarfAt(3, 1.2, 6, 3), ...coatAt(3, 1, 3.5),
    streaks: [[[[34, 21], [47, 37], -2, 1.15], [[32, 28], [47, 11], 2, 1.15]], 1] },
  // k4 spin: turned away (mirrored), arms out, the scarf whirling round, the streaks breaking up
  { by: 1, ux: 0, flip: true, legs: STAND(1, -5, 4), farArm: { sh: [20, 24], el: [17, 25], hand: [14, 25] }, farDagger: null,
    nearArm: { sh: [24, 24], el: [27, 25], hand: [30, 25] }, nearDagger: null, ...scarfAt(4, 1.4, 5, 2), ...coatAt(4, 1, 3),
    streaks: [[[[34, 21], [47, 37], -2, 1.15], [[32, 28], [47, 11], 2, 1.15]], 2], spin: [24, 28] },
  // k5 recover: back to the stance with fresh blades, a glint on the near one
  { by: 1, ux: 0, legs: STAND(1), ...READY(), ...scarfAt(5, 1.6, 3, 1), ...coatAt(5, 0.9, 1.5), glint: [34, 26] },
]

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => kael(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => kael(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => kael(c, ATTACK[c.frame]))
anim("rogue_a", { ...BOX, frames: 22, fps: 10 }, (c) => kael(c, ALL[c.frame]))
