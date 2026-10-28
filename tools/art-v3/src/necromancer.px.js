// Morvath V3: hooded bone hierophant. Rebuilt skull/cowl, cervical connection,
// sculpted bone shoulders and a skull-topped staff. Upper arms exist in every pose.
// Native 48x48; 8 idle + 8 walk + 6 attack frames, original soulfire/timing retained.
// Rebuild: node tools/art-v3/bake.mjs necromancer tools/art-v3/src/necromancer.px.js necromancer_a
pal({
  // the robe (main material): purple-navy, blue-black shadows, pink-violet lights
  0: "#120d24", 1: "#19132f", 2: "#191532", 3: "#221c44", 4: "#2c2457", 5: "#382d6a", 6: "#47397e", 7: "#5b4892", 8: "#755aa3", 9: "#9a78b6", h: "#bf96c6",
  // the mantle and collar: a deeper, bluer navy
  A: "#0e1026", B: "#121731", C: "#121838", D: "#1a224b", E: "#232e60", F: "#2f3d76", G: "#43538e", i: "#6274a8",
  // bone: purple shadows, warm ivory light
  H: "#2a1d35", I: "#47344f", J: "#6c5a6f", K: "#958491", L: "#bdaea6", M: "#dccdb9", N: "#f3e9d2",
  // gold trim and crown: red-brown shadows, pale yellow light
  O: "#3a1a12", P: "#6b3414", Q: "#a1561b", R: "#cf8a2b", S: "#eebd4c", T: "#fff0a6",
  // the staff's dark wood
  U: "#170c14", V: "#28141b", W: "#3d2021", X: "#56302a", Y: "#734634", Z: "#9a6a48",
  // green soulfire (d-g glow at night)
  a: "#0d2a22", b: "#174f30", c: "#24803b", d: "#46b947", e: "#86e65a", f: "#c4ff92", g: "#f0ffe2",
})
ramps("0123456789h", "ABCDEFGi", "HIJKLMN", "OPQRST", "UVWXYZ", "abcdefg")

// ------------------------------------------------------------------ a small compositor (as Ranger C)
// Each part paints into its own map; laid on the frame, its boundary pixels step darker along their own
// ramp, so every silhouette and overlap is edged in its own darkest tones, never in black.
const COARSE = ["02468h", "ACEGi", "HJLN", "OQST", "UWYZ", "acdg"]
const FINE = ["0123456789h", "ABCDEFGi", "HIJKLMN", "OPQRST", "UVWXYZ", "abcdefg"]
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
  // A flowing mass along a polyline (the mantle's fall), lit from `light`, darker toward its end,
  // strand highlights where `streak(T, s)` holds, and torn away where `cut(T, s)` holds (rags).
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
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]

// ------------------------------------------------------------------ the parts
// A hand-drawn grid laid as is (its own edges already in the dark tones of their materials).
function put(F, x0, y0, str) {
  str.split(/\n/).map((r) => r.trim()).filter((r) => r).forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") F.set(x0 + i + "," + (y0 + j), k) }))
}

// The crowned skull in profile to the right, 10 wide, at (20, 10) at rest. The crown: a gold band
// round the brow with the soul gem at its middle, a tall centre spire and a shorter point either
// side, lit faces on the left. The skull under it: the cranium lit from the upper left, a deep socket
// at the front with the one green eye, the cheekbone, the nasal notch, two rows of teeth, the jaw.
const CROWN = `
  ...45654...
  ..5678765..
  .567887654.
  45678876543
  4563...3453
  453.....353
  453.....353
  343.....343
  .343...343.
  ..3433343..`
// The skull in 3/4 to the right: the cranium lit from the upper left, the near socket (two pixels)
// and the far one at the front, a green ember in each, the nose hole between the cheekbones, the
// teeth, the narrow jaw.
const SKULL = `
  .KLMML.
  JLMNNML
  KLHHMHH
  JLeHLeJ
  .KJHJK.
  .JMLMK.
  ..JKJ..`
function head(F, x0, y0, gem, eye) {
  // V3: fitted hood around a sculpted skull, replacing the detached crown block.
  put(F, x0 - 1, y0 + 1, CROWN)
  put(F, x0 + 2, y0 + 4, SKULL)
  put(F, x0 + 4, y0 + 10, `JKJ
    KLM
    JKJ`)
  F.set(x0 + 4 + "," + (y0 + 7), eye)
  F.set(x0 + 7 + "," + (y0 + 7), eye)
}

// The high standing collar behind the skull: a stiff fan of the mantle's cloth, its rim gold.
function collar(F, x0, y0, flare) {
  put(F, x0, y0, `
    R....
    SR...
    QFEE.
    PFFED
    .EFED
    .DEED`)
  if (flare) { F.set(x0 - 1 + "," + (y0 - 1), "S"); F.set(x0 + "," + y0, "S") }
}

// The capelet over the shoulders, navy, lit on its top, its lower edge trimmed in gold, a gold clasp at
// the throat.
function cowl(F, ox, oy) {
  put(F, 17 + ox, 20 + oy, `
    ..KL....LK....
    .KLMK..KMLK...
    KLMNLKKLNMLK..
    JKLMMJJMMLKJ..
    .IJKKddKKJI...
    ..CDEEDDC.....
    ...CDDC.......`)
}

// The robe: chest, belt and skirt as one shaded cloth, an A-line from narrow shoulders, its back hem
// swept by `back`, its front by `kick`, its lower part swaying by `sway`; the hem is ragged, the rags
// riding with the cloth. Lit from the upper left; folds fan down from the belt; a gold trim runs down
// the front opening.
function robe(F, r) {
  const { by, ux, back, kick, sway, ph } = r
  const top = 23 + by, waist = 29 + by
  const L = (y) => y <= waist ? 20.5 + ux : 20.5 + ux - (y - waist) / (38.5 - waist) * (2.5 + back) + sway * ((y - waist) / 9) ** 1.6
  const R = (y) => y <= waist ? 27.5 + ux : 27.5 + ux + (y - waist) / (38.5 - waist) * (1.5 + kick) + sway * 0.6 * ((y - waist) / 9) ** 1.6
  const P = new Part()
  for (let y = top; y <= 39; y++) {
    const l = L(y), rr = R(y)
    for (let x = Math.round(l); x <= Math.round(rr); x++) {
      const u = (x - l) / Math.max(1, rr - l)
      // the hem: higher at the front (the feet show), ragged at the back
      const shift = Math.round(sway * 0.8 - back * 0.5)
      const rag = [0, 1, 2, 0, 1, 3, 1, 0, 2, 1, 0, 2][((x - shift) % 12 + 12) % 12]
      const hem = u > 0.62 ? 37 - (r.hemUp || 0) * (u > 0.8 ? 1 : 0.5) : 38 - (u < 0.55 ? rag : 0)
      if (y > hem) continue
      let v = 0.92 - 0.78 * u
      if (u < 0.1) v -= 0.12                                   // the round turns away at the back
      if (y > waist) v += 0.13 * Math.sin(u * 15 + ph + (y - waist) * 0.12) * Math.min(1, (y - waist) / 4)   // folds
      if (y < 26 + by) v -= 0.08
      if (y >= hem - 1 && u < 0.55) v -= 0.1                   // the torn edge in shadow
      const ramp = "23456789h"
      const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))
      P.px(x, y, ramp[q])
    }
  }
  lay(F, P, 2)
  // the gold trim down the front opening, from the belt to the hem
  for (let y = waist + 1; y <= 37; y++) {
    const l = L(y), rr = R(y), x = Math.round(l + (rr - l) * 0.74)
    F.set(x + "," + y, y % 3 === 0 ? "S" : "R"); F.set(x + 1 + "," + y, "3")
  }
  // the belt: a dark sash with a gold buckle
  for (let x = Math.round(L(waist)); x <= Math.round(R(waist)); x++) F.set(x + "," + waist, x === Math.round(R(waist)) - 2 ? "S" : x === Math.round(R(waist)) - 1 ? "Q" : "2")
}

// The mantle's long tattered fall from the shoulders: two lobes, the outer lit, the inner in shade,
// rags torn into its lower end.
function mantle(F, spine, spine2, tear) {
  const rag = (T, s) => T > 0.72 && ((Math.floor((s + 1) * 2.6 + tear) % 2 === 0 && T > 0.8) || T > 0.97)
  const P = new Part()
  P.strand(spine2, [1.8, 2.3, 2.5, 2.3, 1.8, 1.2], "BCDE", { light: [-0.5, -1], fade: 0.3, lift: 0.05, cut: rag })
  P.strand(spine, [1.7, 2.2, 2.4, 2.2, 1.7, 1.0], "BCDEFGi", { light: [-0.5, -1], fade: 0.35, lift: 0.12, cut: rag,
    streak: (T, s) => (T > 0.15 && T < 0.6 && Math.abs(s - 0.45) < 0.2) || (T > 0.45 && T < 0.85 && Math.abs(s + 0.25) < 0.18) })
  lay(F, P, 2)
}

// A foot: the bare bones of a foot under the hem, toes right, on the soles row; lifted `lift` px.
function foot(F, x, lift, far) {
  const y = 39 - lift
  put(F, x - 1, y - 1, far ? `
    IJK..
    HIJIJ` : `
    JKL..
    IJLKM`)
}

// The near arm: a wide sleeve from the shoulder, its bell hanging under the forearm, a gold cuff,
// a bony hand round the staff.
function arm(F, sh, el, wr, hang = 3, up = false) {
  const P = new Part()
  // The upper arm must exist in every pose, not only the raised cast.
  P.limb(sh, el, 1.8, 1.6, "456789h")
  P.limb(el, wr, 1.5, 2.0, "456789h")
  // the bell of the sleeve hanging under the wrist, its end ragged
  P.poly([[el[0], el[1] + 0.5], [wr[0] + 1.5, wr[1] + 0.5], [wr[0] + 1, wr[1] + hang], [wr[0] - 1, wr[1] + hang + 1], [el[0] + 0.5, el[1] + 2]], (x, y) => (x + y) % 2 ? "3" : "4")
  lay(F, P, 2)
  const wx = Math.round(wr[0]), wy = Math.round(wr[1])
  F.set(wx + 1 + "," + (wy - 1), "R"); F.set(wx + 1 + "," + wy, "S"); F.set(wx + 1 + "," + (wy + 1), "Q")   // the cuff
}
function hand(F, x, y) {
  x = Math.round(x); y = Math.round(y)
  put(F, x - 1, y - 1, `
    KM.
    JLM
    .KL`)
}

// The crooked staff: a gnarled dark shaft through the hand at `grip`, its top bending forward into a
// hook that holds the soulfire. `tilt` leans it (radians, + forward at the top). Returns the
// soulfire's place (inside the hook).
const STAFF = [[1, 14], [0.6, 3], [0, 1], [0, -2], [1, -5], [1, -10], [1, -12], [1, -14], [1, -15]]
const STAFF_FIRE = [1, -16.5]
function staff(F, grip, tilt = 0) {
  const ca = Math.cos(tilt), sa = Math.sin(tilt)
  const T = ([x, y]) => [grip[0] + x * ca - y * sa, grip[1] + x * sa + y * ca]
  const pts = STAFF.map(T)
  const HOOK = 7   // segments from here on are the hook
  const shaft = new Map(), hook = new Map()
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
    for (let j = 0; j <= n; j++) {
      const x = Math.round(a[0] + ((b[0] - a[0]) * j) / n), y = Math.round(a[1] + ((b[1] - a[1]) * j) / n)
      if (y > 39) continue
      ;(i >= HOOK ? hook : shaft).set(x + "," + y, i)
    }
  }
  // the shaft, two pixels wide: lit on the left, dark on the right, a lighter grain here and there
  for (const [key, i] of shaft) {
    const [x, y] = key.split(",").map(Number)
    F.set(key, (y + i) % 5 === 0 ? "Z" : "Y")
    if (!shaft.has(x + 1 + "," + y)) F.set(x + 1 + "," + y, y % 4 === 0 ? "X" : "W")
  }
  // the hook: lit on its top, dark beneath
  for (const [key] of hook) {
    const [x, y] = key.split(",").map(Number)
    F.set(key, hook.has(x + "," + (y - 1)) ? "X" : "Z")
    if (!hook.has(x + "," + (y + 1)) && !shaft.has(x + "," + (y + 1))) F.set(x + "," + (y + 1), "V")
  }
  // two knots where it kinks
  for (const t of [2, 5]) { const p = pts[t].map(Math.round); F.set(p[0] - 1 + "," + p[1], "X"); F.set(p[0] + "," + p[1], "Z"); F.set(p[0] + 1 + "," + p[1], "V") }
  // the hook's barbed tip
  const tip = pts[pts.length - 1].map(Math.round)
  F.set(tip[0] + "," + (tip[1] + 1), "W")
  // A bone skull sockets onto the shaft; its jaw stays joined as the staff tilts.
  const skull = T([1, -13]).map(Math.round)
  put(F, skull[0] - 3, skull[1] - 3, `
    .KLMK.
    KLMNML
    LHHeHL
    KJHHLK
    .KMLK.
    ..JK..`)
  return T(STAFF_FIRE)
}

// The soulfire in the hook: a small green flame that licks upward and flickers (`n` its phase,
// `size` 0..2).
function soulfire(F, p, n, size = 1) {
  const x = Math.round(p[0]), y = Math.round(p[1])
  const flick = [0, 1, 0, -1][n % 4]
  const shapes = [
    // small: a core and a tongue
    [[0, 0, "f"], [1, 0, "e"], [0, -1, "e"], [1, -1, "d"], [0, 1, "d"], [1, 1, "c"], [-1, 0, "d"], [flick > 0 ? 1 : 0, -2, "d"], [0, -3 + (n % 2), "c"]],
    // bigger
    [[0, 0, "g"], [1, 0, "f"], [0, -1, "f"], [1, -1, "e"], [-1, 0, "e"], [-1, -1, "d"], [0, 1, "e"], [1, 1, "d"], [-1, 1, "c"], [2, 0, "d"], [2, -1, "c"],
      [0, -2, "e"], [1, -2, "d"], [flick, -3, "d"], [flick, -4, "c"], [flick + (n % 2), -5, "b"]],
  ]
  for (const [dx, dy, k] of shapes[Math.min(1, size)]) F.set(x + dx + "," + (y + dy), k)
}

// The cast's soul light at the staff head. stage 0 kindling (motes drawn in), 1 gathering (an orb,
// motes close), 2 the orb at its fullest, 3 the burst (a big flare: core, rays, a ring), 4 the ring
// breaking into sparks, 5 embers.
function soulLight(F, p, stage) {
  const cx = p[0], cy = p[1]
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 48 && y >= 0 && y < 48) F.set(x + "," + y, k) }
  const disc = (r, k) => { for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r * r + 0.3) set(cx + x, cy + y, k) }
  const motes = (r, n, rot, k) => { for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, k) } }
  if (stage === 0) { disc(1.2, "d"); set(cx, cy, "f"); motes(6.5, 5, 0.3, "c"); motes(5, 3, 1.4, "d") }
  if (stage === 1) { disc(2.2, "c"); disc(1.6, "d"); disc(1, "e"); set(cx, cy, "g"); motes(4.6, 6, 0.9, "d"); motes(6.5, 4, 0.1, "c") }
  if (stage === 2) { disc(3.2, "b"); disc(2.6, "d"); disc(1.8, "e"); disc(1, "f"); set(cx, cy, "g"); motes(4.2, 8, 0.4, "e"); set(cx, cy - 5, "d"); set(cx - 1, cy - 6, "c") }
  if (stage === 3) {
    // the halo, the ring, then four long rays and four short ones, the white-hot core over them
    for (let i = 0; i < 56; i++) { const a = (i / 56) * Math.PI * 2; if (i % 7 !== 3) set(cx + Math.cos(a) * 8.5, cy + Math.sin(a) * 8, "d") }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, long = i % 2 === 0, len = long ? 14 : 8
      for (let t = 3; t <= len; t += 0.5) set(cx + Math.cos(a) * t, cy + Math.sin(a) * t, t < len * 0.55 ? "f" : t < len * 0.8 ? "e" : "d")
    }
    disc(5.5, "c"); disc(4.6, "d"); disc(3.5, "e"); disc(2.3, "f"); disc(1.2, "g")
  }
  if (stage === 4) {
    // the ring flies apart into ten sparks, each a bright head and a dim tail toward the centre
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3, r = 10 + (i % 2); set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, "e"); set(cx + Math.cos(a) * (r - 1.4), cy + Math.sin(a) * (r - 1.4) * 0.9, "c") }
    disc(2.4, "c"); disc(1.6, "d"); disc(1, "e"); set(cx, cy, "f")
  }
  if (stage === 5) {
    for (const [dx, dy, k] of [[-3, -5, "d"], [2, -7, "c"], [5, -3, "d"], [-5, -1, "c"], [3, 3, "c"], [-1, -9, "c"]]) set(cx + dx, cy + dy, k)
    disc(1, "d"); set(cx, cy, "e")
  }
}

// The dead answering the call: green soul-tongues bursting from the ground ahead of him (stage 3),
// then rising as wisps (4) and fading (5).
function graveFire(F, stage) {
  const set = (x, y, k) => { if (x >= 0 && x < 48 && y >= 0 && y < 48) F.set(x + "," + y, k) }
  // a tongue of soulfire: rows from the bottom, [dx from the centre, key]
  const FLAME = [
    [[-1, "c"], [0, "f"], [1, "e"], [2, "c"]],
    [[-1, "d"], [0, "f"], [1, "e"]],
    [[0, "e"], [1, "d"]],
    [[0, "d"]],
    [[1, "c"]],
  ]
  const WISP = [[[0, "d"], [1, "c"]], [[0, "e"]], [[0, "d"]], [[-1, "c"]]]
  const spots = [[37, 5, 0], [41, 4, 1], [45, 5, 0]]
  for (const [x, h, o] of spots) {
    if (stage === 3) FLAME.slice(0, h).forEach((row, j) => row.forEach(([dx, k]) => set(x + dx, 39 - j, k)))
    if (stage === 4) { WISP.forEach((row, j) => row.forEach(([dx, k]) => set(x + dx + o, 35 - o - j, k))); set(x, 39, "c"); set(x + 1, 39, "d") }
    if (stage === 5) { set(x + o, 30 - o, "c"); set(x + o, 29 - o, "d") }
  }
}

// ------------------------------------------------------------------ the figure
function morvath(c, f) {
  const F = new Map()
  const by = f.by - 2, ux = f.ux || 0, U = (p) => add(p, [ux, by])   // the upper body stands 2 px above the poses' rows
  mantle(F, f.mantle.map(U), f.mantle2.map(U), f.tear || 0)
  foot(F, f.feet.far[0], f.feet.far[1], true)
  foot(F, f.feet.near[0], f.feet.near[1], false)
  robe(F, { by, ux, back: f.back, kick: f.kick, sway: f.sway, ph: f.ph || 0, hemUp: f.hemUp || 0 })
  if (!f.up) arm(F, U([26, 24]), U(f.el), U(f.wr), f.hang ?? 3)
  cowl(F, ux, by)
  head(F, 20 + ux, 10 + by, f.gem || "d", f.eye || "e")
  const fire = staff(F, U(f.grip), f.tilt || 0)
  if (f.up) arm(F, U([26, 24]), U(f.el), U(f.wr), f.hang ?? 3, true)
  hand(F, ...U(f.grip))
  if (f.cast != null) soulLight(F, fire, f.cast)
  else soulfire(F, fire, f.n || 0, f.fire ?? 0)
  if (f.grave != null) graveFire(F, f.grave)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The mantle's line from the shoulder: it falls back and down to near the hem; `back` streams it out
// behind him, `lift` raises its end, the ripple runs down it at phase ph.
const mantleAt = (ph, amp, back = 0, lift = 0) => {
  const base = [[21, 23], [19.5, 26.5], [18, 30], [16.5, 33.5], [15, 36.5], [14, 39]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - (back * 0.45 + lift) * w + amp * 0.5 * Math.sin(ph - i * 1.1 + 1.2) * w]
  })
}
const mantleIn = (ph, amp, back = 0, lift = 0) => mantleAt(ph - 0.9, amp * 0.8, back * 0.7, lift * 0.7).map(([x, y], i) => [x + 1.5 + i * 0.4, y + 0.3])

const REST = { grip: [33, 28], el: [28, 27.5], wr: [31, 28] }

// Idle: a slow breath (the body sinks a pixel on f3-5, the head a frame later), the mantle rippling
// out behind and its rags fluttering, the hem swaying a beat behind, the soulfire flickering, the gem
// pulsing.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST, n: i, fire: i % 4 === 1 ? 1 : 0, gem: ["d", "d", "e", "f", "e", "d", "c", "c"][i], tear: i % 2,
    feet: { far: [22, 0], near: [28, 0] }, back: 1 + Math.sin(ph - 1.5) * 0.8, kick: 0, sway: Math.sin(ph - 1.2) * 1.2, ph,
    mantle: mantleAt(ph, 1.4, 1.5 + Math.sin(ph) * 2), mantle2: mantleIn(ph, 1.4, 1.5 + Math.sin(ph - 0.9) * 2),
  }
})

// Walk: a gliding stride under the robe (the slippers step out at the front), the body bobbing on the
// contacts, the hem kicked forward by the near leg and trailing behind, the mantle streaming back,
// the staff swung forward with each step.
const GAIT = [[5, 0], [3, 0], [1, 0], [-1, 0], [-3, 1], [-3, 3], [0, 3], [3, 2]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, nf = GAIT[i], ff = GAIT[(i + 4) % 8], sw = Math.sin((i / 8) * TAU)
  return {
    by, hy: 0, ux: 1, n: i, fire: i % 2, gem: "d", tear: i % 2,
    grip: [33 + sw * 1.2, 28 - Math.abs(sw) * 0.6], el: [28, 27.5], wr: [31 + sw * 1.2, 28], tilt: sw * 0.08,
    feet: { near: [27 + nf[0], nf[1]], far: [23 + ff[0], ff[1]] },
    back: 2.5 + Math.max(0, -nf[0]) * 0.3, kick: Math.max(0, nf[0]) * 0.7 + Math.max(0, ff[0]) * 0.5, hemUp: nf[0] >= 3 || ff[0] >= 3 ? 1 : 0,
    sway: -1.2 + Math.sin(ph) * 1, ph, hy: [0, 0, 1, 0, 0, 0, 1, 0][i] * 0,
    mantle: mantleAt(ph, 1.8, 5 + Math.sin(ph) * 0.8, 0.5), mantle2: mantleIn(ph, 1.8, 5 + Math.sin(ph - 0.9) * 0.8, 0.5),
  }
})

// Attack (12 fps, the burst on index 3): dip and draw the staff back as soulfire kindles; raise it
// high, the soul light gathering into an orb; hold it at its fullest; the burst (a big green flare,
// the dead's fire bursting from the ground ahead); the ring breaking into sparks as the wisps rise;
// lower the staff.
const ATTACK_UP = [
  { by: 1, grip: [32, 29], el: [27, 28], wr: [30, 29], tilt: -0.12, cast: 0, back: 1, kick: 0, mb: 1.5, lift: 0 },
  { by: 0, up: true, grip: [34, 24], el: [30, 25.5], wr: [32, 24.5], tilt: 0.05, cast: 1, back: 1.5, kick: 0.5, mb: 2, lift: 0.5, hang: 3 },
  { by: -1, up: true, grip: [35, 23], el: [30, 24.5], wr: [33, 23.5], tilt: 0.1, cast: 2, back: 2, kick: 1, mb: 2.5, lift: 1, hang: 3 },
  { by: -1, up: true, grip: [35, 23], el: [30, 24.5], wr: [33, 23.5], tilt: 0.14, cast: 3, back: 3.5, kick: 1.5, mb: 6, lift: 3, hang: 3, grave: 3, flare: true, gem: "g", eye: "f" },
  { by: 0, up: true, grip: [35, 24], el: [30, 25], wr: [33, 24.5], tilt: 0.1, cast: 4, back: 3, kick: 1, mb: 4.5, lift: 2, hang: 3, grave: 4, gem: "f", eye: "f" },
  { by: 0, grip: [33, 26], el: [28, 27], wr: [31, 27], tilt: 0.03, cast: 5, back: 2, kick: 0.5, mb: 2.5, lift: 0.5, grave: 5 },
]
const ATTACK = ATTACK_UP.map((u, k) => {
  const ph = (k / 6) * TAU
  return {
    hy: 0, ux: 0, gem: "e", tear: k % 2, feet: { far: [21, 0], near: [29, 0] }, sway: -u.back * 0.4, ph, ...u,
    mantle: mantleAt(ph, 1.1, u.mb, u.lift), mantle2: mantleIn(ph, 1.1, u.mb, u.lift),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => morvath(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => morvath(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => morvath(c, ATTACK[c.frame]))
anim("necromancer_a", { ...BOX, frames: 22, fps: 10 }, (c) => morvath(c, ALL[c.frame]))
