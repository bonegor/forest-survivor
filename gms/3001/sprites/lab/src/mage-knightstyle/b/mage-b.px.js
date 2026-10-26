// Eldrin the Sorcerer, "Knight style B (Battle mage)": a leaner, more heroic battle-sorcerer drawn in
// the plumed Knight's spirit. An old wizard with a white beard in a deep-indigo battle coat, a wide,
// rakish swept-back hat with a brass band, a crimson scarf whose two long ends stream behind him the
// way the Knight's plume and cape do, his staff (crowned with a fire orb) carried slanted over his
// shoulder, and a flame held out in his casting hand. The fire is the one strong accent: one ramp from
// near-black red (the scarf's shadows) up to yellow-white (the flame's core).
// No black outline: every edge is a dark tone of its own material, hue-shifted ramps.
// 22 frames of 48x48 facing right: idle 0-7, walk 8-15, attack 16-21 (the throw on 19).
// Soles on row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build mage-b.px.js --out <scratch>, then
//        node make-sheet.mjs <scratch>/anims/mage_b.png <sheet>   (adds the glow rows)
pal({
  // the coat (main material): deep indigo, blue-black shadows, lavender light
  0: "#0e0b1d", 1: "#17132d", 2: "#221d40", 3: "#2e2855", 4: "#3c356a", 5: "#4d4681", 6: "#625c99", 7: "#7f78b3", 8: "#a99ecc",
  // the accent: one ramp from the scarf's near-black red to the flame's white core
  Q: "#22030a", R: "#430710", S: "#6c0f13", T: "#961b15", U: "#bf3216", P: "#de4a2c", V: "#e5561b", W: "#f88323", X: "#ffb03c", Y: "#ffdc72", Z: "#fff7d2",
  // white hair and beard: purple-grey shadows, warm pink-white light
  h: "#3a3050", i: "#5c5174", j: "#877c9e", k: "#b3a8c2", l: "#d9d0de", m: "#f7eff0",
  // skin
  n: "#4a1d2a", o: "#7c3c3f", p: "#a95c52", q: "#d0896b", r: "#efb68f",
  // staff wood and boots: violet-brown shadows, ochre light
  a: "#1c0e17", c: "#341a1d", d: "#51301f", e: "#724626", f: "#93613a", g: "#b8844f",
  // brass (hat band, buckle, the orb's claws)
  x: "#4f2f12", y: "#9c6a22", z: "#e2b552",
  // the eye's glint
  E: "#141a38", K: "#bfe6ff",
})
ramps("012345678", "QRSTUPVWXYZ", "hijklm", "nopqr", "acdefg", "xyz")

// ------------------------------------------------------------------ a small compositor
// Each part paints into its own map; when it is laid on the frame, its boundary pixels (those with a
// 4-neighbour outside the part) step darker along their own ramp, so nothing has a black line: the
// silhouette and every part laid over another are edged in their own darkest tones.
const COARSE = ["02468", "QSUWY", "hjlm", "npr", "aceg", "xyz"]
const FINE = ["012345678", "QRSTUPVWXYZ", "hijklm", "nopqr", "acdefg", "xyz"]
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
  // a grid; shift(row j) moves a row sideways (a sway that grows toward a free end)
  grid(x0, y0, str, shift = null) {
    str.split("\n").map((r) => r.trim()).filter((r) => r).forEach((r, j) => [...r].forEach((k, i) => this.px(x0 + i + (shift ? shift(j) : 0), y0 + j, k)))
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
  // A flowing mass along a polyline (a scarf's end, a coat's tail): radius rs[i] at pts[i], lit from
  // `light`, darker toward its end (`fade`), with fold highlights where `streak(T, s)` holds.
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
    F.set(key, out ? darker(k, "nopqr".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y < 48) c.px(x, y, k) } }
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
const TAU = Math.PI * 2

// ------------------------------------------------------------------ fire
// Fire is laid straight on the frame (no edge step): its rim is the deep red of its own ramp.
const HEAT = "TUVWXYZ"
const heatKey = (v) => HEAT[Math.max(0, Math.min(HEAT.length - 1, Math.floor(v * HEAT.length)))]
// A flame standing on (cx, by): h rows tall, w px half-wide at its belly, its tip bending by `lean`
// and licking side to side with phase ph.
function fire(F, cx, by, h, w, ph, lean = 0) {
  for (let j = 0; j < h; j++) {
    const t = j / Math.max(1, h - 1), y = Math.round(by - j)
    const hw = w * Math.pow(1 - t, 0.75) * Math.min(1, (t + 0.3) / 0.5) + 0.35
    const ax = cx + lean * t * t + Math.sin(ph + t * 4.2) * 0.7 * t
    for (let x = Math.floor(ax - hw); x <= Math.ceil(ax + hw); x++) {
      const s = Math.abs(x - ax) / hw
      if (s > 1.05) continue
      const v = 1.02 - Math.max(s * 0.95, t * 0.85) - s * t * 0.3
      F.set(x + "," + y, heatKey(v))
    }
  }
}
// A fireball at (cx, cy), radius r, its fire streaming back by `tail` px.
function fireball(F, cx, cy, r, tail = 0, ph = 0) {
  for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++)
    for (let x = Math.floor(cx - r - tail - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dy = y - cy
      let dx = x - cx
      // behind the ball the radius shrinks along the tail, licking up and down
      let rr = r
      if (dx < 0 && tail > 0) { const u = Math.min(1, -dx / (tail + r)); rr = r * (1 - u * 0.9); dx = 0 }
      const off = dx === 0 && x < cx ? Math.sin(ph + (cx - x) * 0.9) * 0.6 : 0
      const d = Math.hypot(dx, dy - off) / Math.max(rr, 0.4)
      if (d > 1.05) continue
      const front = x >= cx ? 0.12 : -0.18 * Math.min(1, (cx - x) / (tail + 1))
      F.set(x + "," + y, heatKey(1.05 - d * 0.9 + front))
    }
}
// The throw's swoosh: a fiery crescent along an ellipse (centre cx, cy, radii rx, ry) from angle a0 to
// a1 (radians, y down), thickest at its leading end; `broken` breaks it into fading dashes.
function swoosh(F, cx, cy, rx, ry, a0, a1, thick, broken = 0) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (x < 0 || x > 47 || y < 0) continue
      const ex = (x - cx) / rx, ey = (y - cy) / ry, rho = Math.hypot(ex, ey)
      let a = Math.atan2(ey, ex)
      if (a < a0 - 0.3) a += TAU
      if (a < a0 || a > a1) continue
      const u = (a - a0) / (a1 - a0)                     // 0 at its tail, 1 at its head
      const th = thick * (0.3 + 0.7 * u * u)
      const depth = (1 - rho) * Math.min(rx, ry)         // px inside the outer rim
      if (depth < -0.4 || depth > th) continue
      if (broken && Math.sin(u * broken * TAU) < -0.2 + u * 0.4) continue
      const v = 0.1 + u * 0.6 + (1 - depth / Math.max(th, 0.6)) * 0.38 - (broken ? 0.25 : 0)
      F.set(x + "," + y, heatKey(v))
    }
}
const ember = (F, x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 48 && y >= 0) F.set(x + "," + y, k) }

// ------------------------------------------------------------------ the parts
// The head under the hat, 15x15 at (17, 5) at rest: a tall pointed crown swept back, a brass band, a
// wide rakish brim (its front tipped up), the white hair at the back of the head and the face in 3/4
// to the right under the brim's shadow: a white brow over a small dark eye with a glint, a nose a
// pixel proud. The crown's tip sways (`sway`) and lags the body.
const HAT = `
  ..6............
  ..766..........
  ...7765........
  ...77654.......
  ....776543.....
  ...77766543....
  ...zzzyyyyyx.76.
  .46778876655443.
  2234444333322...`
const FACE = `
  .jklooooo.
  .iklpqmmm.
  .ijkpqqEqr
  ..jkoqqqqr
  ..ij.oqq..`
function head(F, x0, y0, sway) {
  const P = new Part()
  // the cone's rows bend back with the sway, more toward its tip
  P.grid(x0, y0, HAT, (j) => (j < 6 ? Math.round(sway * (6 - j) / 5) : 0))
  P.grid(x0 + 4, y0 + 9, FACE)
  lay(F, P, 2, (x, y, dx, dy) => dy > 0 && y >= y0 + 12)
}

// The beard: from the moustache under the nose down over the chest to a point; its lower rows sway.
const BEARD = `
  .jklmmmml
  .iklmlmlk
  ..jkmlklj
  ..iklmlk.
  ...jlkj..
  ...jlkj..
  ...ikj...
  ....j....`
function beard(F, x0, y0, sway) {
  const P = new Part().grid(x0, y0, BEARD, (j) => (j > 2 ? Math.round(sway * (j - 2) / 5) : 0))
  P.px(x0 + 7, y0 + 1, "o")   // the mouth's shadow in the moustache
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// The coat's upper body, 10x10 at (19, 20): shoulders sloping from the neck, lit from the upper left,
// a leather belt with a brass buckle at row 28.
const TORSO = `
  ..5667654.
  .56788765.
  4678877654
  4577876544
  .46777543.
  .4567653..
  .3566543..
  .3456543..
  .cdeezyd..
  .3456543..`
function torso(F, x0, y0) {
  lay(F, new Part().grid(x0, y0, TORSO), 2)
}
// The coat's skirt over the thighs: a front panel from the belt to above the knee, split at the front,
// its hem swinging (`sw`) with the stride.
function skirt(F, x0, y0, sw) {
  const P = new Part()
  const pts = [[x0, y0], [x0 + 7, y0], [x0 + 8 + sw, y0 + 4], [x0 + 6 + sw, y0 + 5.5], [x0 + 4, y0 + 4.5], [x0 + 1 - sw * 0.5, y0 + 6], [x0 - 1.5 - sw * 0.5, y0 + 5]]
  P.poly(pts, (x, y) => {
    const u = (x - x0) / 8, v = (y - y0) / 6
    if (Math.abs(x - (x0 + 4 + sw * 0.5 * v)) < 0.6 && v > 0.3) return "2"   // the split
    return "3456654"[Math.max(0, Math.min(6, Math.round(u * 6 - v * 1.5 + 1)))]
  })
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

// The coat's long back tail, a flowing mass from the hip, streaming and rippling behind him.
function coatTail(F, spine) {
  const P = new Part()
  P.strand(spine, [2.6, 3.0, 3.0, 2.4, 1.5, 0.5], "2345678", { light: [-0.5, -1], fade: 0.4, lift: 0.05,
    streak: (T, s) => (T > 0.15 && T < 0.6 && Math.abs(s - 0.4) < 0.22) || (T > 0.45 && T < 0.85 && Math.abs(s + 0.25) < 0.2) })
  lay(F, P, 2)
}

// The crimson scarf: a wrap at the throat (behind the beard) and two long ends streaming behind,
// lit on their upper sides, darker toward their tips, a fold catching the light.
function scarf(F, end1, end2) {
  const P = new Part()
  P.strand(end2, [1.4, 1.5, 1.4, 1.1, 0.5], "RSTU", { light: [-0.4, -1], fade: 0.35, lift: 0.0,
    streak: (T, s) => T > 0.2 && T < 0.7 && Math.abs(s - 0.3) < 0.3 })
  P.strand(end1, [1.8, 2.1, 2.1, 1.9, 1.5, 1.0, 0.5], "RSTUP", { light: [-0.4, -1], fade: 0.3, lift: 0.12,
    streak: (T, s) => T > 0.1 && T < 0.65 && Math.abs(s - 0.35) < 0.25 })
  lay(F, P, 1)
}
function wrap(F, x0, y0) {
  const P = new Part().grid(x0, y0, `
    .STUUT.
    RSTUUUT
    .RSTTS.`)
  lay(F, P, 1, (x, y, dx, dy) => dy < 0)
}

// A leg: hip, knee, ankle; charcoal-indigo breeches, a leather boot from the knee, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.6, 1.3, far ? "1223" : "23445")
  P.limb(knee, ankle, 1.3, 1.1, far ? "acdd" : "cdefg")
  const kx = Math.round(knee[0]), ky = Math.round(knee[1])
  P.px(kx - 1, ky + 1, far ? "d" : "e"); P.px(kx, ky + 1, far ? "e" : "g"); P.px(kx + 1, ky + 1, far ? "d" : "e")
  const ax = Math.round(ankle[0]), ay = Math.round(ankle[1])
  for (let x = ax - 1; x <= ax + 2; x++) P.px(x, ay + 1, far ? "d" : "e")
  for (let x = ax - 1; x <= ax + 3; x++) P.px(x, ay + 2, far ? "c" : "d")
  lay(F, P, 2)
}

// An arm: shoulder, elbow, hand. An indigo sleeve, a crimson cuff, a skin hand.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, el, 1.6, 1.4, far ? "23345" : "345678")
  const w = [el[0] + (hand[0] - el[0]) * 0.75, el[1] + (hand[1] - el[1]) * 0.75]
  P.limb(el, w, 1.35, 1.25, far ? "2345" : "345677")
  P.limb(w, w, 1.2, 1.2, "STU")
  P.limb(hand, hand, 1.05, 1.05, "opqr")
  lay(F, P, 2)
}

// The staff from its foot to its head: dark wood, lit along its upper side, a brass collar, the claws
// and the fire orb at its head.
function staff(F, foot, top) {
  const n = Math.ceil(Math.max(Math.abs(top[0] - foot[0]), Math.abs(top[1] - foot[1])))
  const ux = (top[0] - foot[0]) / n, uy = (top[1] - foot[1]) / n
  for (let i = 0; i <= n; i++) {
    const x = Math.round(foot[0] + ux * i), y = Math.round(foot[1] + uy * i)
    const end = i < 1 || i > n - 1
    F.set(x + "," + y, end ? "d" : i % 6 === 3 ? "f" : "e"); F.set(x + 1 + "," + y, end ? "c" : "d")
    if (!F.has(x + 2 + "," + y)) F.set(x + 2 + "," + y, "a")
  }
  // the brass collar under the head, the claws holding the orb
  const cx = Math.round(top[0] - ux * 1.5), cy = Math.round(top[1] - uy * 1.5)
  F.set(cx + "," + cy, "z"); F.set(cx + 1 + "," + cy, "y"); F.set(cx + 2 + "," + cy, "x")
  const hx = Math.round(top[0]), hy = Math.round(top[1])
  F.set(hx - 1 + "," + hy, "y"); F.set(hx + 2 + "," + hy, "x")
  F.set(hx - 1 + "," + (hy - 1), "x"); F.set(hx + 2 + "," + (hy - 1), "x")
}
function orb(F, top, ph, big = 0) {
  fireball(F, top[0] + 0.5, top[1] - 2.5, 2.1 + big, 0, ph)
  // a tongue licking up off the orb
  fire(F, top[0] + 0.5, top[1] - 4.5, 3 + big, 0.8, ph, -0.8)
}

// ------------------------------------------------------------------ the figure
function eldrin(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])        // the upper body's offset (lean, bob)
  const H = (p) => add(p, [ux + (f.hx || 0), by + (f.hy || 0)])
  scarf(F, f.scarf1.map(U), f.scarf2.map(U))
  coatTail(F, f.coat.map((p, i) => add(p, [ux * (1 - i / 5), by])))
  const fa = f.farArm
  if (f.flame && f.flame.behind) fire(F, ...U(f.flame.at), f.flame.h, f.flame.w, f.flame.ph, f.flame.lean)
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  leg(F, ...f.legs.far, true)
  leg(F, ...f.legs.near, false)
  skirt(F, 19 + Math.round(ux * 0.5), 29 + by, f.sw || 0)
  torso(F, 19 + ux, 20 + by)
  wrap(F, ...H([21, 19]))
  head(F, ...H([17, 5]), f.hat || 0)
  beard(F, ...H([21, 18]), f.beard || 0)
  if (f.staff) {
    staff(F, U(f.staff[0]), U(f.staff[1]))
  }
  const na = f.nearArm
  arm(F, U(na.sh), U(na.el), U(na.hand), false)
  if (f.staff) orb(F, U(f.staff[1]), f.ph || 0, f.orbBig || 0)
  if (f.flame && !f.flame.behind) fire(F, ...U(f.flame.at), f.flame.h, f.flame.w, f.flame.ph, f.flame.lean)
  if (f.arc) swoosh(F, ...f.arc)
  if (f.ball) fireball(F, ...U(f.ball.at), f.ball.r, f.ball.tail || 0, f.ph || 0)
  if (f.burst) {   // the flash at the palm as the fire leaves it
    const [bx, by2] = U(f.burst).map(Math.round)
    ember(F, bx, by2, "Z")
    for (const [dx, dy, k] of [[1, 0, "Y"], [-1, 0, "Y"], [0, -1, "Y"], [0, 1, "Y"], [0, -2, "X"], [0, 2, "X"], [-2, 0, "W"], [1, -1, "X"], [1, 1, "X"], [-1, -1, "W"], [-1, 1, "W"]]) ember(F, bx + dx, by2 + dy, k)
  }
  for (const [x, y, k] of f.embers || []) ember(F, x, y, k)
  flush(c, F)
}

// ------------------------------------------------------------------ poses
// The scarf's two ends from the throat, streaming back; each point swings by amp at phase ph, more
// toward its tip; `back` streams it out level (walking), `lift` throws it up.
const SC1 = [[21, 20], [18.5, 20.5], [16, 21.5], [13.5, 22.5], [11, 24], [9, 25.5], [7.5, 27]]
const SC2 = [[21, 21.5], [18.5, 22.5], [16, 24], [13.5, 25.5], [11.5, 27]]
const sway = (base, ph, amp, back = 0, lift = 0) => base.map(([x, y], i) => {
  const w = Math.pow(i / (base.length - 1), 1.3)
  return [x - back * w + amp * 0.4 * Math.sin(ph - i * 0.9) * w, y - lift * w + amp * Math.sin(ph - i * 0.9 + 1.1) * w]
})
// The coat's tail from the hip down and back.
const COAT = [[20, 28], [18.5, 30.5], [17, 32.5], [15.5, 34.5], [14, 36], [12.5, 37]]
const coatAt = (ph, amp, back = 0) => COAT.map(([x, y], i) => {
  const w = i / (COAT.length - 1)
  return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.5, y - back * w * 0.5 + amp * 0.7 * Math.sin(ph - i * 1.1 + 1.2) * w]
})

// Legs: hips at (21, 30) far and (24, 30) near; an ankle dx from its hip and lifted by `lift`.
function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + Math.max(dx, 0) + 1, 34 - lift + by * 0.5] : [hx + dx * 0.5 + 0.5, 34 + by * 0.5]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(21, -4, 0, by), near: legAt(24, 3, 0, by) })

// At rest: the casting (far) arm held out in front, the flame on its palm; the near hand at the hip
// grips the staff, which slants up over the back shoulder to its fire orb.
const REST = (sw = 0) => ({
  farArm: { sh: [25, 22], el: [28, 25], hand: [31, 24 + sw * 0.5] },
  nearArm: { sh: [21, 22], el: [20.5, 26], hand: [22.5, 28.5] },
  staff: [[26, 36], [12, 11]],
})

// Idle: a slow breath (the chest sinks a pixel on f3-5, the head a frame later), the scarf's ends
// rippling, the coat tail lifting, the hat's tip a beat behind, the flame flickering.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ux: 1, ph, ...REST(), legs: STAND(by), sw: 0,
    scarf1: sway(SC1, ph, 1.6, 1 + Math.sin(ph) * 1.5), scarf2: sway(SC2, ph - 0.8, 1.3, 0.5 + Math.sin(ph - 0.8) * 1.2),
    coat: coatAt(ph, 1.2, 1 + Math.sin(ph - 0.5) * 1.2),
    hat: [0, 0, 0, -1, -1, -1, 0, 0][i], beard: [0, 0, 0, -1, -1, 0, 0, 0][i],
    flame: { at: [31, 22], h: [6, 7, 6, 5, 6, 7, 7, 6][i], w: 1.7, ph: ph * 2, lean: [0, -1, 0, 1, 0, -1, 1, 0][i] * 0.6 },
  }
})

// Walk: per leg [dx, lift] by phase, the far leg half a cycle on; the body low on the contacts.
const GAIT = [[4, 0], [2, 0], [0, 0], [-2, 0], [-4, 1], [-3, 3], [0, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const walkLegs = (i) => ({ far: legAt(21, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], BOB[i]), near: legAt(24, GAIT[i][0], GAIT[i][1], BOB[i]) })
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [1, 1, 0, -1, -1, -1, 0, 1][i]
  const r = REST(sw)
  return {
    by, hy: 0, ux: 2, ph, ...r, legs: walkLegs(i), sw,
    staff: [[26, 36 - BOB[i]], [12 + [0, 0, 1, 1, 0, 0, -1, -1][i] * 0, 11]],
    scarf1: sway(SC1, ph, 1.2, 4, 2), scarf2: sway(SC2, ph - 0.8, 1.0, 3.5, 2),
    coat: coatAt(ph, 1.2, 3.5),
    beard: -1, hat: -1,
    flame: { at: [31, 22 + sw * 0.5], h: 6, w: 1.6, ph: ph, lean: -2 },
  }
})

// Attack (12 fps, the throw on the 4th): the casting hand pulls back and up as the fire gathers into a
// ball over his head, the body coils back; then he lunges and hurls it forward in a blazing arc, the
// scarf and coat whipped back; the fire breaks into embers and he recovers.
const ATK = [
  // k0 gather: the hand draws in to the chest, the flame swells
  { ux: 0, farArm: { sh: [25, 22], el: [28, 24], hand: [30, 19] }, flame: { at: [30, 17], h: 9, w: 2.3, ph: 1, lean: -1 }, hat: 0,
    embers: [[33, 11, "W"], [27, 12, "V"]] },
  // k1 wind-up: the hand rises in front of the brim, the fire balls up
  { ux: -1, farArm: { sh: [25, 22], el: [30, 19], hand: [32, 14] }, ball: { at: [33, 10], r: 2.6 }, flame: { at: [33, 7], h: 4, w: 1.4, ph: 2, lean: -1 }, hat: 1,
    embers: [[37, 7, "X"], [29, 5, "W"], [38, 13, "V"]] },
  // k2 coiled: leaning back, the hand high, the ball at its biggest
  { ux: -2, farArm: { sh: [25, 22], el: [31, 18], hand: [34, 12] }, ball: { at: [35, 7], r: 3.4 }, flame: { at: [35, 3], h: 3, w: 1.6, ph: 3, lean: -1 }, hat: 1,
    embers: [[40, 4, "Y"], [30, 2, "W"], [41, 11, "V"], [31, 9, "V"]] },
  // k3 THROW: the lunge, the arm thrust out, the ball hurled forward at the head of a blazing arc
  { ux: 2, by: 1, farArm: { sh: [25, 22], el: [30, 22], hand: [35, 21] },
    ball: { at: [40, 21], r: 3.3, tail: 3 }, arc: [23, 29.5, 20, 23, -1.32, -0.38, 6.5], burst: [36, 22], hat: -1, beard: -1,
    embers: [[47, 17, "X"], [46, 28, "W"], [40, 15, "V"], [37, 27, "V"]] },
  // k4 follow-through: the arc breaking into embers, the ball leaving the frame
  { ux: 2, by: 1, farArm: { sh: [25, 22], el: [30, 23], hand: [34, 25] },
    ball: { at: [43, 21], r: 2.7, tail: 9 }, arc: [23, 29.5, 20, 23, -1.2, -0.45, 3.5, 2.5], hat: -1, beard: -1,
    embers: [[41, 13, "W"], [44, 30, "V"], [37, 10, "U"], [39, 29, "U"], [45, 16, "V"]] },
  // k5 recover: the hand back to the front, a small flame rekindling
  { ux: 1, farArm: { sh: [25, 22], el: [28, 25], hand: [31, 24] }, flame: { at: [31, 22], h: 4, w: 1.2, ph: 4, lean: 0 }, hat: 0,
    embers: [[42, 15, "U"], [45, 27, "T"]] },
]
const ATTACK = ATK.map((u, k) => {
  const ph = (k / 6) * TAU
  const back = [1, 1.5, 1, 5, 4, 2][k], lift = [0, 0, 0, 3, 2, 0][k]
  return {
    by: 0, hy: 0, ph, ...REST(), legs: k === 3 || k === 4 ? { far: legAt(21, -5, 0, 1), near: legAt(24, 4, 0, 1) } : STAND(0),
    staff: [[26, 36], [12, 11]], orbBig: 0,
    scarf1: sway(SC1, ph, 1.2, back, lift), scarf2: sway(SC2, ph - 0.8, 1.0, back * 0.8, lift),
    coat: coatAt(ph, 1.0, back * 0.6), sw: 0,
    ...u,
  }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => eldrin(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => eldrin(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => eldrin(c, ATTACK[c.frame]))
anim("mage_b", { ...BOX, frames: 22, fps: 10 }, (c) => eldrin(c, ALL[c.frame]))
