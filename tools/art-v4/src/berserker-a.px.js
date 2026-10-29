// Berserker A: Red Fang — lean topknot raider, short beard and planted stance.
// Derived from the retained V3; full connected legs and the original 22-pose timing.
pal({
  // wolf pelt: grey-brown, purple-black shadows, warm cream light
  0: "#1c1420", 1: "#2e2230", 2: "#45363f", 3: "#5e4d50", 4: "#7a6862", 5: "#978575", 6: "#b3a28c", 7: "#cfbfa5", 8: "#ebdfc6",
  // leather and haft wood: violet-brown shadows, ochre light (the main material)
  L: "#26121a", l: "#3a1b1e", M: "#532823", m: "#6c3828", N: "#874c30", n: "#a16239", O: "#ba7b45", R: "#d19858", o: "#e6b874",
  // skin, sun-browned: violet-red shadows, peach light
  K: "#3f1a28", k: "#66303a", f: "#8f4a48", r: "#b4695a", F: "#d38b6c", P: "#e8ad8a", p: "#f7cfa9",
  // the red beard (the accent): wine-black to flame
  A: "#2c0610", a: "#540c12", B: "#861a14", b: "#b42e16", C: "#db4f1c", c: "#f27a2c", D: "#ffad55",
  // axe steel: indigo shadows, pink-white light
  s: "#24183a", S: "#3d3157", t: "#5c5279", T: "#827aa0", u: "#b0a2c0", U: "#d8c8da", v: "#f7eef2",
  // gold, eye, the swoosh
  g: "#6b3a0c", G: "#b8761e", h: "#f0c050", x: "#1b0f1f", e: "#f4e8e0", w: "#c9b6d6", W: "#ffffff",
})
ramps("012345678", "LlMmNnORo", "KkfrFPp", "AaBbCcD", "sStTuUv", "gGh", "wW")

// ------------------------------------------------------------------ the compositor (as Ranger C's)
// Each part paints into its own map; laid on the frame, its boundary pixels step darker along their
// own ramp, so the silhouette and every overlap are edged in the material's own darkest tones.
const COARSE = ["02468", "LMNOo", "KfFp", "ABCD", "sTUv", "gGh", "wW"]
const FINE = ["012345678", "LlMmNnORo", "KkfrFPp", "AaBbCcD", "sStTuUv", "gGh", "wW"]
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
  // a round limb from a to b, radius ra to rb, lit from above-left
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
  // a flowing mass along a polyline (cape lobe, tail), darker toward its end, strand highlights
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
function lay(F, part, edge = 2, open = null) {
  for (const [key, k] of part.m) {
    const [x, y] = key.split(",").map(Number)
    let out = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (part.m.has(x + dx + "," + (y + dy))) continue
      if (open && open(x, y, dx, dy, k)) continue
      out = true
    }
    F.set(key, out ? darker(k, "KkfrFPp".includes(k) ? Math.min(edge, 1) : edge) : k)
  }
}
// nothing below the soles' row: an axe reaching the ground bites into it
const flush = (c, F) => { for (const [key, k] of F) { const [x, y] = key.split(",").map(Number); if (x >= 0 && y >= 0 && x < 48 && y <= 39) c.px(x, y, k) } }
const add = (p, d) => [p[0] + d[0], p[1] + d[1]]
const R2 = (p) => p.map(Math.round)

// ------------------------------------------------------------------ the parts
// The head, 14 wide from x0: the wolf's head worn as a hood (ears up, the snout over his brow, two
// fangs), the pelt falling behind his cheek; under it a brow in shadow, a pale fierce eye, a nose, and
// the red beard over his chest, braided to a point through a gold ring.
const HEAD = `
  ....aBa....
  ....BCa....
  ...aBba....
  ..aBBbaa...
  ..afrrFk...
  ..akxFxPk..
  ..afFPpFr..
  ..aBCFFCb..
  ...aBCbba..
  ...aBgba...
  ....aaa....`
function head(F,x0,y0) {
  // Thick neck overlaps both the jaw and shoulder mantle in every pose.
  lay(F,new Part().limb([x0+6,y0+8],[x0+6,y0+12],1.8,2.1,"frFPPp"),0);
  lay(F,new Part().grid(x0+1,y0+1,HEAD),0);
}
// The torso: a leather jerkin, a strap across the chest with a gold stud, a belt with a gold buckle.
function torso(F,ox,oy) {
  const P=new Part();
  P.limb([24+ox,22+oy],[24+ox,27+oy],4.8,3.9,"krFPPp",[-0.6,-1]);
  for(const key of [...P.m.keys()]){const [x,y]=key.split(',').map(Number);if(y<20+oy||y>29+oy)P.m.delete(key)}
  // Pectoral shadow and crossed harness separate chest from the shoulder pelt.
  for(let x=20;x<=28;x++)P.px(x+ox,24+oy,x===24?'f':'r');
  for(let i=0;i<8;i++){
    P.px(20+ox+i,21+oy+i,'M');P.px(19+ox+i,21+oy+i,'l');
    P.px(28+ox-i,21+oy+i,'N');
  }
  for(let x=20;x<=28;x++){P.px(x+ox,28+oy,'M');P.px(x+ox,29+oy,'l')}
  P.grid(24+ox,28+oy,'Ghg\ngGg');lay(F,P,1);
}
// The kilt: leather strips below the belt, their hems kicking with the stride (kick: px per strip).
function kilt(F, ox, oy, kick = [0, 0, 0, 0, 0, 0]) {
  const P = new Part()
  for (let s = 0; s < 5; s++) {
    const x0 = 19 + ox + s * 2, len = 2 + (s % 2) + (kick[s] || 0)
    for (let j = 0; j < len; j++) {
      const x = x0 + Math.round(j * (s - 2.5) * 0.15)
      P.px(x, 30 + oy + j, j === 0 ? "R" : s % 2 ? "n" : "O")
      P.px(x + 1, 30 + oy + j, j === 0 ? "O" : s % 2 ? "N" : "n")
    }
  }
  lay(F, P, 2, (x, y, dx, dy) => dy < 0)
}

// A leg: leather trousers, a fur wrap round the shin, a leather boot, toes right.
function leg(F, hip, knee, ankle, far) {
  const P = new Part()
  P.limb(hip, knee, 1.7, 1.4, far ? "MmNn" : "mNnOR")
  P.limb(knee, ankle, 1.4, 1.25, far ? "3456" : "45678")
  // the thongs binding the wrap
  const kx = knee[0], ky = knee[1], ax = ankle[0], ay = ankle[1]
  for (const t of [0.35, 0.75]) P.px(kx + (ax - kx) * t + 0.5, ky + (ay - ky) * t, far ? "l" : "M")
  const fx = Math.round(ax), fy = Math.round(ay)
  for (let x = fx - 1; x <= fx + 2; x++) P.px(x, fy + 1, far ? "M" : "N")
  for (let x = fx - 1; x <= fx + 2; x++) P.px(x, fy + 2, far ? "l" : "M")
  lay(F, P, 2)
}

// An arm: a big bare shoulder and upper arm, a leather bracer on the forearm, the fist.
function arm(F, sh, el, hand, far) {
  const P = new Part()
  P.limb(sh, sh, 2.2, 2.2, far ? "kfrFP" : "rFPPp")
  P.limb(sh, el, 2.1, 1.8, far ? "kfrFP" : "rFPPp")
  const w = [el[0] + (hand[0] - el[0]) * 0.35, el[1] + (hand[1] - el[1]) * 0.35]
  P.limb(el, w, 1.9, 1.8, far ? "kfr" : "rFPp")
  P.limb(w, hand, 1.8, 1.6, far ? "lMmN" : "MmNnOR")
  P.limb(hand, hand, 1.5, 1.5, far ? "kfr" : "frFP")
  lay(F, P, 2)
}

// The fur mantle over the shoulders: the pelt's forelegs wrapped round them, a ragged hem.
function mantle(F, ox, oy) {
  const P = new Part()
  P.strand([[17 + ox, 22 + oy], [21 + ox, 20 + oy], [26 + ox, 20.5 + oy], [29 + ox, 21.5 + oy]], [1.5, 2.0, 1.8, 1.3], "2345678", { light: [-0.5, -1], fade: 0.05, lift: 0.1 })
  // the ragged hem: tufts hanging a pixel under it
  for (const x of [18, 20, 26, 28]) P.px(x + ox, 23 + oy + (x % 3 === 0 ? 1 : 0), "3")
  lay(F, P, 2, (x, y, dx, dy) => dy < 0 && x < 22 + ox)
}

// The fur cape: two lobes of pelt from the shoulders, the outer lit, the inner (nearer the legs) in
// shade, the light fur at the tips; and the wolf's tail swinging under them.
function cape(F, spine, spine2) {
  const P = new Part()
  P.strand(spine2, [2.0, 2.4, 2.4, 2.0, 1.3, 0.5], "lMmNn", { light: [-0.5, -1], fade: 0.3, lift: 0.0,
    streak: (T, s) => T > 0.3 && T < 0.85 && Math.abs(s - 0.2) < 0.25 })
  P.strand(spine, [1.8, 2.1, 2.1, 1.7, 1.0, 0.4], "1234567", { light: [-0.5, -1], fade: 0.4, lift: 0.05,
    streak: (T, s) => (T > 0.15 && T < 0.55 && Math.abs(s - 0.45) < 0.2) || (T > 0.5 && T < 0.9 && Math.abs(s + 0.2) < 0.2) })
  lay(F, P, 2)
}
function tail(F, pts) {
  const P = new Part()
  P.strand(pts, [1.3, 1.7, 1.9, 1.7, 1.2, 0.5], "234567", { light: [-0.5, -1], fade: 0.1, lift: 0.05,
    streak: (T, s) => T > 0.2 && T < 0.7 && Math.abs(s - 0.4) < 0.25 })
  // the pale tip
  const n = pts.length - 1, tip = pts[n], pre = pts[n - 1]
  P.px(tip[0], tip[1], "8"); P.px((tip[0] + pre[0]) / 2, (tip[1] + pre[1]) / 2, "7")
  lay(F, P, 2)
}

// A bearded axe in the hand at angle a (degrees, clockwise from pointing right), its haft `len` px
// on from the fist, the bit on side `side` (+1: the side it chops toward). Ash haft, steel head with
// its 1 px bright edge; the face lit from above.
function axe(F, hand, a, len = 9, side = 1, gleam = false) {
  const rad = (a * Math.PI) / 180, d = [Math.cos(rad), Math.sin(rad)], n = [-d[1] * side, d[0] * side]
  const P = new Part()
  const butt = add(hand, [-d[0] * 2.5, -d[1] * 2.5]), top = add(hand, [d[0] * len, d[1] * len])
  P.limb(butt, top, 0.85, 0.85, "mNOR", [-0.4, -1])
  // the head in its own frame: u along the haft (0 at the fist), v across toward the bit
  const L = len, head = new Part(), edgeKeys = new Set()
  const cx = hand[0] + d[0] * (L - 2), cy = hand[1] + d[1] * (L - 2)
  for (let y = Math.floor(cy - 8); y <= Math.ceil(cy + 8); y++) for (let x = Math.floor(cx - 8); x <= Math.ceil(cx + 8); x++) {
    const px = x - hand[0], py = y - hand[1]
    const u = px * d[0] + py * d[1], v = px * n[0] + py * n[1]
    let inside = false, isEdge = false
    if (v >= -2 && v < 0.5) inside = u >= L - 2.8 && u <= L + 0.4          // the poll and the eye round the haft
    else if (v >= 0.5 && v < 2.2) inside = u >= L - 3.0 && u <= L + 0.3      // the cheek
    else if (v >= 2.2) {
      const lo = L - 3.0 - (v - 2.2) * 1.2, hi = L + 0.3 + (v - 2.2) * 0.45  // the beard sweeps toward the fist
      const vEdge = 5.0 - 0.02 * (u - (L - 2.6)) ** 2
      inside = u >= lo && u <= hi && v <= vEdge
      isEdge = inside && v > vEdge - 1.05
    }
    if (!inside) continue
    // the face: darker by the haft, lighter toward the bit, a step lighter on its upper half
    let q = v < 0.5 ? 0 : v < 2.4 ? 1 : v < 4 ? 2 : 3
    if (y < cy - 0.5) q++
    head.px(x, y, isEdge ? (gleam ? "W" : "v") : "tTuUUv"[Math.min(5, q)])
    if (isEdge) edgeKeys.add(x + "," + y)
  }
  lay(F, P, 2)
  lay(F, head, 2, (x, y, dx, dy) => edgeKeys.has(x + "," + y))
}

// The chop's swoosh: a crescent along the circle round (cx, cy) radius r from angle a0 to a1,
// thickening toward a1 (where the axe is), white in its heart, lavender at its rim.
function swoosh(F, cx, cy, r, a0, a1, thick, stage = 1) {
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 48 && y >= 0 && y <= 39) F.set(x + "," + y, k) }
  const steps = Math.ceil(Math.abs(a1 - a0) * r / 25)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180
    if (stage === 2 && (t < 0.45 || (t > 0.62 && t < 0.72) || (t > 0.82 && t < 0.88))) continue
    const w = stage === 2 ? Math.max(0.6, thick * 0.35 * t) : 0.8 + thick * Math.pow(t, 1.4)
    for (let k = 0; k <= w; k += 0.5) {
      const rr = r - k, key = stage === 2 ? (k < 0.6 ? "w" : "e") : t < 0.25 ? "w" : k < 0.6 ? "e" : k > w - 0.6 ? "w" : "W"
      set(cx + rr * Math.cos(a), cy + rr * Math.sin(a), key)
    }
  }
}

// ------------------------------------------------------------------ the figure
function ulfric(c, f) {
  const F = new Map()
  const ux = f.ux || 0, by = f.by || 0
  const U = (p) => add(p, [ux, by])
  cape(F, f.cape.map(U), f.cape2.map(U))
  // No hanging tail across the ankle silhouettes.
  const fa = f.farArm, na = f.nearArm
  axe(F, U(fa.hand), fa.a, fa.len || 9, fa.side || 1)
  arm(F, U(fa.sh), U(fa.el), U(fa.hand), true)
  leg(F, ...f.legs.far.map(p => [p[0]+ux,p[1]]), true)
  leg(F, ...f.legs.near.map(p => [p[0]+ux,p[1]]), false)
  kilt(F, ux, by, f.kick)
  torso(F, ux, by)
  if (!f.armFront) arm(F, U(na.sh), U(na.el), U(na.hand), false)
  mantle(F, ux, by)
  if (f.swoosh) for (const s of f.swoosh) swoosh(F, ...s)   // under the head: the arc runs on behind it
  head(F, 18 + ux + (f.hx || 0), 9 + by)
  if (f.armFront) arm(F, U(na.sh), U(na.el), U(na.hand), false)
  axe(F, U(na.hand), na.a, na.len || 9, na.side || 1, f.gleam)
  // chips of earth thrown up where the axes bite
  if (f.chips) for (const [x, y, k] of f.chips) F.set(x + "," + y, k)
  // the near fist closes over the haft
  const h = R2(U(na.hand)); F.set(h[0] + "," + h[1], "F"); F.set(h[0] + "," + (h[1] - 1), "P"); F.set(h[0] - 1 + "," + h[1], "r")
  flush(c, F)
}

// ------------------------------------------------------------------ poses
const TAU = Math.PI * 2
const capeAt = (ph, amp, back = 0) => {
  const base = [[20, 19], [18, 21], [16.5, 23], [15.5, 25], [15, 27], [14, 28]]
  return base.map(([x, y], i) => {
    const w = i / (base.length - 1)
    return [x - back * w * 1.2 + amp * Math.sin(ph - i * 1.1) * w * 0.6, y - back * w * 0.45 + amp * Math.sin(ph - i * 1.1 + 1.2) * w * 0.7]
  })
}
const capeIn = (ph, amp, back = 0) => capeAt(ph - 0.9, amp * 0.8, back * 0.7).map(([x, y], i) => [x + 2.5 + i * 0.5, y + 0.3])
const TAIL0 = [[18, 30], [16, 32], [14, 33.5], [12, 34.5], [10, 35], [8.5, 34.5]]
const tailAt = (ph, amp, back = 0, lift = 0) => TAIL0.map(([x, y], i) => {
  const w = Math.pow(i / (TAIL0.length - 1), 1.3)
  return [x - back * w + amp * 0.4 * Math.sin(ph - i * 0.9) * w, y - lift * w + amp * Math.sin(ph - i * 0.9) * w]
})

function legAt(hx, dx, lift, by) {
  const hip = [hx, 30 + by], ankle = [hx + dx, 37 - lift]
  const knee = lift > 0 ? [hx + dx * 0.45 + 1, 34 - lift * 0.55 + by * 0.4] : [hx + dx * 0.45, 34 + by * 0.4]
  return [hip, knee, ankle]
}
const STAND = (by = 0) => ({ far: legAt(22, -2, 0, by), near: legAt(25, 2, 0, by) })

// Arms at rest: the axes held up and out, ready: the near one forward, the far one back.
const REST = (sw = 0, hb = 0) => ({
  farArm: { sh: [19, 23], el: [16 + sw * 0.5, 26], hand: [14 + sw, 29 + hb], a: -112 - sw * 3, side: -1 },
  nearArm: { sh: [30, 22], el: [33 - sw * 0.5, 26], hand: [35 - sw, 29 + hb], a: -68 + sw * 3 },
})

// Idle: a heavy breath (chest up a pixel f3-5, the head a frame later), the cape rippling, the tail
// swinging a beat behind it.
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = [0, 0, 0, -1, -1, -1, 0, 0][i], hy = [0, 0, 0, 0, -1, -1, -1, 0][i] - by, ph = (i / 8) * TAU
  return {
    by, hy, ...REST(0, [0, 0, 0, 0, 1, 1, 1, 0][i]), legs: STAND(0),
    cape: capeAt(ph, 1.5, 1.5 + Math.sin(ph) * 2), cape2: capeIn(ph, 1.5, 1.5 + Math.sin(ph - 0.9) * 2),
    tail: tailAt(ph - 1.4, 1.6, 0.5 + Math.sin(ph - 1.6)),
  }
})

// Walk: a heavy, planted stride, the body low on the contacts; the axes swing against the legs.
const GAIT = [[3, 0], [1.5, 0], [0, 0], [-1.5, 0], [-3, 1], [-2, 2], [0, 3], [2, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const by = BOB[i], ph = (i / 8) * TAU * 2, sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    by, ux: 1, ...REST(sw), kick: [0, i % 4 < 2 ? 1 : 0, 0, i % 4 >= 2 ? 1 : 0, 0, 0],
    legs: { far: legAt(22, GAIT[(i + 4) % 8][0] - 1, GAIT[(i + 4) % 8][1], by), near: legAt(25, GAIT[i][0], GAIT[i][1], by) },
    cape: capeAt(ph, 1.3, 4), cape2: capeIn(ph, 1.3, 4), tail: tailAt(ph, 1.2, 3, 1),
  }
})

// Attack (12 fps): gather, both axes up overhead, cocked back behind the head, the chop on 19 with a
// wide swoosh, the follow-through low, recovery.
const ATK = [
  { by: 1, ux: -1, farArm: { sh: [19, 23], el: [16, 24], hand: [19, 20], a: -125, side: 1 }, nearArm: { sh: [29, 23], el: [31, 22], hand: [31, 18], a: -110 }, back: 1 },   // A2: the near fist 2 px forward (A: [29, 18]) so the haft clears the turned face
  { by: 0, ux: -1, hy: 1, farArm: { sh: [19, 22], el: [17, 15], hand: [22, 9], a: -128 }, nearArm: { sh: [29, 22], el: [32, 15], hand: [27, 9], a: -122 }, back: 0.5 },
  { by: 0, ux: -2, hy: 1, hx: -1, farArm: { sh: [19, 22], el: [16, 15], hand: [20, 11], a: -152 }, nearArm: { sh: [29, 22], el: [32, 14], hand: [25, 9], a: -178 }, back: 0, kick: [1, 1, 0, 0, 0, 0] },
  { by: 2, ux: 2, hx: 1, farArm: { sh: [19, 23], el: [26, 27], hand: [31, 31], a: 35 }, nearArm: { sh: [29, 23], el: [33, 27], hand: [35, 30], a: 45 }, back: 5, kick: [2, 1, 1, 0, 0, 0],
    swoosh: [[27, 26, 17, -105, 50, 5.5, 1], [26, 27, 12, -70, 40, 2.6, 1]], gleam: true, chips: [[44, 37, "O"], [45, 35, "n"], [43, 34, "R"]] },
  { by: 2, ux: 2, hx: 1, farArm: { sh: [19, 23], el: [26, 28], hand: [31, 32], a: 55 }, nearArm: { sh: [29, 23], el: [33, 28], hand: [35, 32], a: 62 }, back: 4, kick: [1, 1, 0, 0, 0, 0],
    swoosh: [[27, 26, 17, -105, 55, 5.5, 2]], chips: [[38, 35, "n"], [40, 33, "O"], [43, 34, "N"], [42, 31, "R"], [45, 36, "n"], [36, 33, "7"]] },
  { by: 1, ux: 1, farArm: { sh: [19, 23], el: [17, 27], hand: [18, 30], a: -60, side: 1 }, nearArm: { sh: [29, 23], el: [32, 27], hand: [34, 29], a: -40 }, back: 2.5 },
]
const ATTACK = ATK.map((k, i) => {
  const ph = (i / 6) * TAU
  const legs = i === 3 || i === 4
    ? { far: legAt(20, -5, 0, k.by), near: legAt(27, 5, 0, k.by) }
    : { far: legAt(21, -3, 0, k.by), near: legAt(26, 3, 0, k.by) }
  return { ...k, legs, cape: capeAt(ph, 1.2, k.back), cape2: capeIn(ph, 1.2, k.back), tail: tailAt(ph, 1.2, k.back * 0.6, k.back * 0.3) }
})

const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
anim("idle", { ...BOX, frames: 8, fps: 6 }, (c) => ulfric(c, IDLE[c.frame]))
anim("walk", { ...BOX, frames: 8, fps: 10 }, (c) => ulfric(c, WALK[c.frame]))
anim("attack", { ...BOX, frames: 6, fps: 12 }, (c) => ulfric(c, ATTACK[c.frame]))
anim("berserker_a", { ...BOX, frames: 22, fps: 10 }, (c) => ulfric(c, ALL[c.frame]))
