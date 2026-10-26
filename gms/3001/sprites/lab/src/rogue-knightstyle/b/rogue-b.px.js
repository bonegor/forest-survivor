// Kael the Shadow, "Knight style B (Wraith)": a hooded shadow assassin whose cloak and scarf tatter
// into wisps that trail and dissolve (the plumed Knight's cape and plume, as smoke). He walks on slim
// legs; a pale mask in the hood, one cold glow (moon-lilac) on the eye and the dagger edges.
// No black outline: every edge a dark tone of its own material, hue-shifted ramps.
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the blades leave on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build rogue-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/rogue_b.png <sheet>   (adds the glow rows)
pal({
  // slate (body cloth, leather, gloves): blue-violet shadows, warm mauve light
  A: "#0d0b17", a: "#151221", B: "#1d192b", b: "#26213a", C: "#312a49", c: "#3f3659", D: "#51466c", d: "#675a82",
  E: "#81739a", G: "#9e8fb0", e: "#bfb0c6", h: "#463e63", i: "#5c4f76", j: "#76678c",
  // shadow violet (hood, cloak, scarf): indigo-black shadows, magenta-pink light
  0: "#0f0920", 1: "#170d32", 2: "#211145", 3: "#2d1758", 4: "#3b1e6d", 5: "#4e2785", 6: "#66339c", 7: "#8245b0",
  8: "#a161c3", 9: "#c48ad4", p: "#311a64", q: "#43227c", r: "#5a2d8f", t: "#763ea6", u: "#9654b8",
  // the cloak's inner lobe, in the shadow: a bluer indigo
  x: "#16143a", y: "#1f1d52", z: "#2c2a6a",
  // the mask: pale bone, cool shadow
  M: "#3c3552", m: "#5d5774", N: "#8b88a3", n: "#b6b6cb", O: "#dcdce9",
  // steel of the blades
  S: "#4a4868", s: "#7c7ea0", T: "#b2b8d2",
  // the cold glow: eye, blade edges, the throw's streak (only w and W glow at night)
  v: "#6c66d8", w: "#a9b2ff", W: "#e6f0ff",
})
ramps("AaBbCchDidjEGe", "0123p4q5r6t7u89", "0xyz", "MmNnO", "SsT", "vwW")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp: no black line anywhere.
const COARSE = ["ABCDEe", "02468", "0yz", "MNO", "SsT"]
const FINE = ["AaBbCchDidjEGe", "0123p4q5r6t7u89", "0xyz", "MmNnO", "SsT"]
const darker = (k, n) => {
  for (let r = 0; r < FINE.length; r++) {
    const i = FINE[r].indexOf(k)
    if (i < 0) continue
    const c = COARSE[r], below = [...c].filter((ch) => FINE[r].indexOf(ch) <= i).length - 1
    const at = c.includes(k) ? below : below + 0.5
    return c[Math.max(0, Math.ceil(at - n))]
  }
  return k   // the glow keys never darken
}
const fleck = (x, y, n) => { const s = Math.sin(x * 12.9898 + y * 78.233 + n * 37.719) * 43758.5453; return s - Math.floor(s) }
class Part {
  constructor() { this.m = new Map() }
  px(x, y, k) { if (k && k !== ".") this.m.set(Math.round(x) + "," + Math.round(y), k); return this }
  del(x, y) { this.m.delete(x + "," + y) }
  grid(x0, y0, str) {
    str.split("\n").map((r) => r.trim()).filter((r) => r).forEach((r, j) => [...r].forEach((k, i) => this.px(x0 + i, y0 + j, k)))
    return this
  }
  // A round limb from a to b, radius ra to rb, lit from the upper left: `ramp` dark to light.
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
  // A flowing mass along a polyline (a cloak's fall, a scarf's tail): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`), fold highlights where `streak(T, s)` holds, and pixels
  // dropped where `keep(T, s, x, y)` fails (T 0..1 along it, s -1..1 across it).
  strand(pts, rs, ramp, { light = [-0.6, -1], fade = 0.3, streak = null, lift = 0.08, keep = null } = {}) {
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
        if (keep && !keep(best.T, -best.s, x, y)) continue
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
// boundary sides left light (where the part runs on into another without an edge).
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy)) continue
      out = true
    }
    F.set(key, out ? darker(k, "MmNnO".includes(k) ? Math.min(edge, 1) : edge) : k)   // the mask softens by one step only
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }

// ------------------------------------------------------------------ the parts
// The hooded head, 11x10 at (18, 12) at rest: a deep cowl lit from the upper left, its peak swept
// back, the brim overhanging the face; in its shadow one glowing eye over a pale mask (nose and cheek).
const HEAD = `
  ...45665....
  .34678876...
  .245788876..
  .2345677765.
  23456665554.
  23455411NnO.
  234554MwWMn.
  234544MNnnO.
  .23443MNnm..
  ..2332.Mm...`
function head(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, HEAD), 1, (x, y, dx, dy) => dy > 0)
}

// The body: a slim slate tunic, 8x9 at (19, 22) at rest, a violet sash at the waist.
const TORSO = `
  ...cDdc.
  ..cDEdDc
  .bcDEGDc
  .bcDdaDc
  .bCdaDcb
  .34a654.
  .bCcDcB.
  bCcDcBa.`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 1)
}

// A leg: hip, knee, ankle; slate trousers, a wrapped soft boot, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.5, 1.2, far ? "aBbCc" : "chDidjEG")
  P.limb(knee, ankle, 1.2, 1.0, far ? "aBbC" : "CchDid")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  // a wrap band below the knee
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 1, far ? "2" : "4"); P.px(kx, ky + 1, far ? "3" : "5")
  for (let x = ax - 1; x <= ax + 1; x++) P.px(x, ay + 1, far ? "B" : "c")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "a" : "C")
  lay(F, P, 1)
}

// An arm: shoulder, elbow, hand. A slate sleeve, a violet wrapped forearm, a dark glove.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.4, 1.15, far ? "aBbC" : "bCchDid")
  P.limb(el, hand, 1.1, 0.95, far ? "12p" : "3p4q5r6t7")
  P.limb(hand, hand, 1.1, 1.1, far ? "aB" : "BbCc")
  lay(F, P, 1)
}

// A dagger in a hand at (hx, hy), its blade along angle `a` (radians, 0 = right, -pi/2 = up): a
// violet grip and guard, a steel blade with a glowing edge and point.
function dagger(F, hx, hy, a, len = 6, far = false) {
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux   // along, across
  const at = (t, o) => [Math.round(hx + ux * t + px * o), Math.round(hy + uy * t + py * o)]
  const set = ([x, y], k) => F.set(x + "," + y, k)
  set(at(-1.6, 0), far ? "3" : "6")                          // pommel
  set(at(1.2, -1.2), far ? "3" : "5"); set(at(1.2, 1.2), far ? "2" : "4")   // the guard
  for (let t = 2; t <= len; t++) {
    set(at(t, 0), t === len ? (far ? "T" : "W") : far ? "s" : "T")
    if (t < len - 1) set(at(t, -0.7), far ? "v" : "w")   // the edge toward the light
    if (t < len - 2) set(at(t, 0.7), "S")
  }
  if (!far) set(at(len + 1, 0), "w")
}

// A flying dagger with its streak: the blade at the front (x1, y) pointing right, the streak trailing
// back to x0, thin and dim at its tail, bright and wide behind the blade.
function thrown(F, x0, x1, y, wide = 1) {
  const set = (x, yy, k) => { if (x >= 0 && x < 48) F.set(x + "," + yy, k) }
  for (let x = x0; x <= x1 - 5; x++) {
    const t = (x - x0) / Math.max(1, x1 - 5 - x0)
    set(x, y, t < 0.15 ? "v" : t < 0.4 ? "w" : "W")
    if (wide && t > 0.3) set(x, y - 1, t > 0.6 ? "W" : t > 0.45 ? "w" : "v")
    if (wide > 1 && t > 0.5) set(x, y + 1, t > 0.8 ? "w" : "v")
    if (wide > 1 && t > 0.8) set(x, y - 2, "v")
  }
  // the dagger, flat in flight: a violet grip, a steel blade with a glowing edge, a white point
  set(x1 - 5, y, "4"); set(x1 - 4, y, "6")
  for (let x = x1 - 3; x < x1; x++) { set(x, y, "T"); if (x < x1 - 1) set(x, y - 1, "w") }
  set(x1, y, "W")
}

// The cloak: a long tattered fall from the shoulders, two lobes; its hem breaks into tongues (T past
// 0.6) that thin and dissolve into drifting motes. `seed` makes the dissolve flicker frame to frame.
function cloak(F, spine, spine2, seed, motes = 3) {
  const P = new Part()
  const tongues = (n, ph) => (T, s, x, y) => {
    if (T < 0.55) return true
    const w = Math.cos((s + ph) * Math.PI * n)          // tongues across the hem
    if (w < (T - 0.55) * 2.6 - 0.35) return false
    if (T > 0.78 && fleck(x, y, seed) < (T - 0.78) * 3) return false   // the tips dissolve
    return true
  }
  P.strand(spine2, [1.8, 2.3, 2.6, 2.6, 2.4, 2.0, 1.2], "xyz3p", { light: [-0.5, -1], fade: 0.25, lift: 0.0, keep: tongues(1.5, 0.3) })
  P.strand(spine, [2.0, 2.8, 3.2, 3.3, 3.1, 2.5, 1.4], "123p4q5r6t7u8", { light: [-0.5, -1], fade: 0.45, lift: 0.12, keep: tongues(2, 0),
    streak: (T, s) => (T > 0.12 && T < 0.5 && Math.abs(s - 0.4) < 0.18) || (T > 0.35 && T < 0.7 && Math.abs(s + 0.25) < 0.16) })
  for (const key of [...P.m.keys()]) {
    const [x, y] = key.split(",").map(Number)
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => P.m.has(x + dx + "," + (y + dy)))) P.m.delete(key)
  }
  lay(F, P, 1)
  wisps(F, spine, seed, motes)
  wisps(F, spine2, seed + 7, motes - 1)
}

// Motes: detached flecks of the cloth drifting off past a strand's tip, lighter as they go (smoke).
function wisps(F, pts, seed, n) {
  const a = pts[pts.length - 2], b = pts[pts.length - 1]
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1
  for (let i = 0; i < n; i++) {
    const d = 1.5 + i * 1.8 + ((seed * 0.37 + i * 0.5) % 1) * 1.2
    const side = Math.sin(seed * 1.7 + i * 2.3) * (0.8 + i * 0.6)
    const x = Math.round(b[0] + (dx / L) * d - (dy / L) * side), y = Math.round(b[1] + (dy / L) * d + (dx / L) * side)
    if (y > 37) continue
    F.set(x + "," + y, ["4", "5", "6"][Math.min(2, i)])
    if (i === 0) F.set(x + 1 + "," + y, "3")
  }
}

// The scarf: wound round the neck over the chin, its two long tails streaming back from the nape (the
// plume's part); they ripple, overlap, and fray into wisps at the ends.
function scarfTails(F, t1, t2, seed) {
  const P = new Part()
  const fray = (T, s, x, y) => !(T > 0.72 && fleck(x, y, seed + 3) < (T - 0.72) * 3.2)
  P.strand(t2, [1.1, 1.1, 1.0, 0.9, 0.8, 0.6, 0.3], "23p4q5", { light: [-0.4, -1], fade: 0.3, lift: 0.05, keep: fray })
  P.strand(t1, [1.3, 1.4, 1.3, 1.2, 1.0, 0.8, 0.4], "3p4q5r6t7u89", { light: [-0.4, -1], fade: 0.4, lift: 0.18, keep: fray,
    streak: (T, s) => T > 0.1 && T < 0.55 && Math.abs(s - 0.45) < 0.25 })
  lay(F, P, 2)
  wisps(F, t1, seed + 11, 2)
}
function scarfWrap(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, `
    ...45677..
    ..3456788.
    .234567876
    .123456654
    ..1234543.
    ..1.23.2..`), 2, (x, y, dx, dy) => dy < 0)
}

// The attack's swing: a pale-violet crescent (stage 1, the throw), a spin ring around him (stage 2).
function slash(F, cx, cy, stage) {
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 48 && y >= 0 && y < 48) F.set(x + "," + y, k) }
  if (stage === 1) {
    // the arms' swoosh: a crescent from behind the shoulder over to the front, thin and dim at its
    // tail, thick and white at its leading end (where the blades are)
    const a0 = -2.75, a1 = -0.3, R = 13
    for (let y = cy - R - 1; y <= cy + 4; y++) for (let x = cx - R - 1; x <= cx + R + 1; x++) {
      const ox = x - cx, oy = y - cy, r = Math.hypot(ox, oy), a = Math.atan2(oy, ox)
      if (a < a0 || a > a1) continue
      const t = (a - a0) / (a1 - a0), th = 0.6 + 3.2 * t * t
      if (r > R + 0.3 || r < R - th) continue
      const depth = (R - r) / th
      set(x, y, t < 0.3 ? "v" : depth < 0.45 && t > 0.5 ? "W" : t > 0.55 ? "w" : "v")
    }
  } else if (stage === 3) {
    // the swoosh a frame on: only its front end left, thinning out
    const a0 = -0.9, a1 = -0.3, R = 13
    for (let a = a0; a <= a1; a += 0.03) {
      const t = (a - a0) / (a1 - a0)
      if (t < 0.5 && Math.floor(t * 14) % 2) continue
      set(cx + Math.cos(a) * R, cy + Math.sin(a) * R, t > 0.7 ? "w" : "v")
      if (t > 0.65) set(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1), "v")
    }
  } else if (stage === 2) {
    // a flat spin ring round the waist, its front bright, its back dim and broken
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const x = cx + Math.cos(a) * 12, y = cy + Math.sin(a) * 3.2
      const front = Math.sin(a) > 0
      if (!front && Math.floor(a * 6) % 2) continue
      set(x, y, front ? (Math.cos(a) > 0 ? "W" : "w") : "v")
    }
  }
}

// ------------------------------------------------------------------ the figure
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
function kael(c, f) {
  const F = new Map()
  const ux = f.ux || 0
  const U = (p) => add(p, [ux, f.by || 0])
  const fa = f.farArm, na = f.nearArm
  // far arm behind everything (the cloak hangs over it)
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  if (fa.dagger) dagger(F, ...U(fa.hand), fa.dagger, 5, true)
  cloak(F, f.cloak.map(U), f.cloak2.map(U), f.seed, f.motes ?? 3)
  scarfTails(F, f.scarf.map(U), f.scarf2.map(U), f.seed)
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  torso(F, 19 + ux, 22 + f.by)
  head(F, 17 + ux + (f.hx || 0), 12 + f.by + (f.hy || 0))
  scarfWrap(F, 18 + ux + (f.hx || 0), 20 + f.by + (f.hy || 0))
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (na.dagger != null) dagger(F, ...U(na.hand), na.dagger, 6, false)
  if (f.slash) slash(F, f.slash[0] + ux, f.slash[1] + f.by, f.slash[2])
  for (const t of f.thrown || []) thrown(F, t[0], t[1], t[2], t[3] ?? 1)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
// The cloak's line from the back of the shoulders: it falls back and down; `back` streams it out
// behind him, the ripple runs down it at phase ph.
const CLOAK0 = [[21, 23], [19, 26], [17.5, 28.5], [16, 31], [14.5, 33.5], [13, 35.5], [11.5, 37]]
const cloakAt = (ph, amp, back = 0, lift = 0) => CLOAK0.map(([x, y], i) => {
  const w = i / (CLOAK0.length - 1)
  return [x - back * w * 1.3 + amp * Math.sin(ph - i * 1.0) * w * 0.7, y - (back * 0.45 + lift) * w + amp * Math.sin(ph - i * 1.0 + 1.3) * w * 0.8]
})
const cloakIn = (ph, amp, back = 0, lift = 0) => cloakAt(ph - 1.0, amp * 0.8, back * 0.75, lift * 0.7).map(([x, y], i) => [x + 2.2 + i * 0.35, y + 0.4])
// The scarf tails from the nape: they stream back and a little up, rippling (a wave runs to the tip).
const SCARF0 = [[21, 20.5], [18.5, 20], [16, 20.5], [13.5, 21.5], [11, 21.5], [8.5, 20.5], [6.5, 19]]
const scarfAt = (ph, amp, back = 0, lift = 0) => SCARF0.map(([x, y], i) => {
  const w = Math.pow(i / (SCARF0.length - 1), 1.2)
  return [x - back * w + amp * 0.4 * Math.sin(ph - i * 0.9) * w, y - lift * w + amp * Math.sin(ph - i * 0.9) * w]
})
const scarfLow = (ph, amp, back = 0, lift = 0) => scarfAt(ph - 1.4, amp, back * 0.8, lift * 0.6).map(([x, y], i) => [x + i * 0.25, y + 1.2 + i * 0.55])

// Legs: hips at (22, 30) far and (25, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.8, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(22, -4, 0, by), near: legAt(25, 3, 0, by) })

// Arms at rest: the near hand low and forward, its dagger angled forward and up; the far hand back
// with its dagger pointing down behind him. `sw` swings them on the walk.
const REST_ARMS = (sw = 0) => ({
  farArm: { sh: [21, 24], el: [19 - sw * 0.5, 27], hand: [18 - sw, 29], dagger: 1.9 },
  nearArm: { sh: [25, 24], el: [26 + sw * 0.3, 27], hand: [29 + sw * 0.6, 28], dagger: -0.55 },
})

// Idle: a slow breath (chest down a pixel on 3-5, the head a frame later); the cloak ripples and
// lifts, the scarf tails sway a beat behind it, flecks drift off the hems.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST_ARMS(), legs: STAND(by), seed: i,
    cloak: cloakAt(ph, 1.5, 1.5 + Math.sin(ph) * 2.2), cloak2: cloakIn(ph, 1.5, 1.5 + Math.sin(ph - 1) * 2.2),
    scarf: scarfAt(ph - 0.8, 1.3, Math.sin(ph - 1.4) * 1.4), scarf2: scarfLow(ph - 0.8, 1.3, Math.sin(ph - 1.4) * 1.4),
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(22, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(25, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, hy: 0, ux: 1, ...REST_ARMS(sw), legs: walkLegs(i), seed: 10 + i,
    cloak: cloakAt(ph, 1.3, 4.5, 1), cloak2: cloakIn(ph, 1.3, 4.5, 1),
    scarf: scarfAt(ph, 1.0, 2.5, 1), scarf2: scarfLow(ph, 1.0, 2.5, 1),
  }
})

// Attack (12 fps, the blades leave on index 3): crouch and cross the blades, cock both arms back
// overhead, whip forward, release (two daggers fly with pale-violet streaks under a crescent), spin
// (a ring round his waist, the cloak swirling), recover to stance.
const LOW = (by) => ({ far: legAt(22, -5, 0, by), near: legAt(25, 4, 0, by) })
const ATTACK_POSES = [
  // k0 crouch, both blades crossed at the chest
  { by: 2, ux: -1, farArm: { sh: [21, 24], el: [23, 28], hand: [26, 25], dagger: -2.2 }, nearArm: { sh: [25, 24], el: [27, 28], hand: [27, 24], dagger: -1.0 },
    cl: [1, 0], sc: [0.5, -1] },
  // k1 wind-up: both arms cocked back at the shoulder, the blades glinting forward, leaning back
  { by: 2, ux: -2, hx: -1, farArm: { sh: [21, 24], el: [17, 24], hand: [14, 21], dagger: -2.5 }, nearArm: { sh: [25, 24], el: [21, 21], hand: [18, 17], dagger: -2.1 },
    cl: [0, 1], sc: [-0.5, 1] },
  // k2 whip: the arms coming forward over the shoulder, the swoosh behind the blades
  { by: 1, ux: 0, farArm: { sh: [21, 24], el: [23, 21], hand: [27, 20], dagger: -0.4 }, nearArm: { sh: [25, 24], el: [28, 21], hand: [32, 21], dagger: -0.15 },
    cl: [3, 1], sc: [2, 1], slash: [25, 26, 1] },
  // k3 release: arms out level and open, the daggers gone, two streaks out of the frame
  { by: 1, ux: 1, farArm: { sh: [21, 24], el: [26, 25], hand: [30, 26] }, nearArm: { sh: [25, 24], el: [29, 23], hand: [33, 22] },
    cl: [6, 2], sc: [4.5, 2.5], thrown: [[29, 47, 22, 2], [27, 45, 27, 2]] },
  // k4 spin back: the arms swept round, a ring round his waist, the streaks gone far
  { by: 1, ux: 0, farArm: { sh: [21, 24], el: [19, 27], hand: [17, 28] }, nearArm: { sh: [25, 24], el: [25, 28], hand: [22, 29] },
    cl: [1.5, 3], sc: [1, 3], slash: [23, 30, 2], thrown: [[42, 48, 22, 0], [40, 46, 27, 0]] },
  // k5 recover: new blades drawn, back to stance
  { by: 0, ux: 0, farArm: { sh: [21, 24], el: [19, 27], hand: [18, 29], dagger: 1.9 }, nearArm: { sh: [25, 24], el: [26, 27], hand: [29, 27], dagger: -0.8 },
    cl: [2.5, 0.5], sc: [1.5, 0] },
]
const ATTACK = ATTACK_POSES.map((p, k) => {
  const ph = (k / 6) * TAU
  return {
    ...p, hy: 0, legs: k < 2 ? LOW(p.by) : STAND(p.by), seed: 30 + k, motes: k === 3 || k === 4 ? 4 : 3,
    cloak: cloakAt(ph, 1.2, p.cl[0], p.cl[1]), cloak2: cloakIn(ph, 1.2, p.cl[0], p.cl[1]),
    scarf: scarfAt(ph, 1.0, p.sc[0], p.sc[1]), scarf2: scarfLow(ph, 1.0, p.sc[0], p.sc[1]),
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => kael(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => kael(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => kael(c, ATTACK[c.frame]))
anim("rogue_b", { ...BOX, frames: 22, fps: 10 }, (c) => kael(c, ALL[c.frame]))
