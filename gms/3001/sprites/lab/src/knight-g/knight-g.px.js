// Knight G, the Moon Knight, for Forest Survivor: a slim night-sky paladin in deep violet and
// moon-silver plate. A sleek helm with a crescent-moon crest (a star in its mouth) and a narrow
// glowing visor, a long midnight-blue cloak scattered with twinkling stars, a small crescent
// buckler on the raised off-hand, and a slim curved moon-steel sabre with a pale glow.
// 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build knight-g.px.js, then finish.mjs makes the sheet with glow rows.
pal({
  k: "#181425",                                                          // ink (the cast's outline)
  n: "#1a1548", b: "#3a3592", s: "#7f7ce0", p: "#b9c2f8", S: "#e4ecff", w: "#ffffff",  // violet plate, moon-silver trim
  c: "#a8d8ff",                                                          // cool moonlight rim on plate
  N: "#101a48", m: "#1f3380", M: "#3556b4", q: "#6b8ee4",                // midnight cloak
  V: "#34226e", v: "#5a3da3", u: "#8a6cd2",                              // violet lining and under-suit
  L: "#221a38", l: "#453960",                                            // dark leather, belt
  d: "#7f90d8",                                                          // a star between twinkles
  g: "#a6e6ff", y: "#fff1b8", z: "#5f9aee", h: "#f4fdff",                // GLOW: visor/blade, stars, trail, core
})
ramps("knbspSw", "kNmMq", "kVvu", "kLl", "kzgh")

const PART = { outline: "k", pivot: [0, 0] }

// ---------------------------------------------------------------- parts (grids, fill at 0,0)
// The helm, 9x10, 3/4 facing right: a barrel helm, a flat crown, straight sides, a glowing visor
// slit (g) cut to the front edge. Shaded as a cylinder: a cool rim on the far edge, a dark core
// shadow behind it, then a vertical highlight band (w) toward the lit front, falling off a little
// at the edge. A dark brow band over the slit, two vents below it.
sprite("_helm", PART, `
  .bspSwSp.
  cbspSwSps
  cbspSSSps
  nbbbnnnnn
  nbbbkgggg
  nbsspbbbb
  nbspSwSps
  nbspSwSps
  nbspSwnps
  .nbspSSp.`)

// The crescent crest, 5x6: a silver moon standing on the crown of the helm, horns forward, its
// inner edge glowing (g). A star floats in its mouth (drawn in code).
sprite("_crest", PART, `
  ..wSg
  .wSg.
  wSg..
  wSg..
  .wSg.
  ..wSg`)

// The torso, 10x11: slim back plate in shade, the breastplate with its lit edge and a small
// glowing crescent sigil, a belt with a silver buckle, then a short skirt of lames.
sprite("_torso", PART, `
  ..nbpSSSSpsb
  .cnbmMMqqMmb
  .nbsmMMqgMmb
  .nbsmMMgMMmb
  .nbsmMMgMMmb
  .nbbmMMgMMmn
  .nnbmMMqgMnb
  ..LlllSwllLb
  ..nbSMmqMSnb
  ..nbSMmMMSnb
  ..nnbMmMMnn.`)

// The near pauldron, 7x5: a crescent of plate with a lit horn.
sprite("_pauldron", PART, `
  ..cSwS.
  .cSpSws
  cSpsssb
  sSsbbn.
  .bn....`)

// The crescent buckler strapped to the sword forearm, 5x6: a fat moon, horns forward.
sprite("_buckler", PART, `
  .wSS.
  wSpSb
  wSpb.
  wSpb.
  wSpSb
  .wSS.`)

// The sabaton, toes to the right: a lit top, a dark sole.
sprite("_foot", PART, `
  bspSS.
  nbbssS`)

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "nbsS", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "nbs" : "bspSw"
  const ax = hx + dx, ay = 35 - lift
  let kx = (hx + ax) / 2, ky = 32
  const paint = (part) => {
    if (lift > 0) {
      kx = hx + Math.max(dx, 0) + 1; ky = 32 - lift
      limb(c, hx, hy, 1.3, kx, ky, 1.1, ramp, part)
      limb(c, kx, ky, 1.1, ax, ay, 0.9, ramp, part)
    } else limb(c, hx, hy, 1.4, ax, ay, 1.0, ramp, part)
  }
  paint("ink")
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { w: "s", S: "s", s: "b", b: "n" } } : {})
  paint("fill")
  const kxr = Math.round(kx), kyr = Math.round(ky)
  c.px(kxr, kyr, far ? "s" : "w")
  c.px(kxr, kyr + 1, far ? "n" : "b")
}

// A set of coloured pixels, ringed with ink, then painted.
function blob(c, pts, ink = true) {
  if (ink) for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy))) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) c.px(x, y, k)
}
function fillPoly(poly) {
  const out = []
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const px = x + 0.5, py = y + 0.5
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    if (inside) out.push([x, y])
  }
  return out
}

// The cloak: a long midnight cape from the shoulders, streaming back in a swallowtail whose
// hem is lined in violet. `lean` is how far it streams behind him, `wave` ripples the hem, `tw`
// picks which stars burn. The cloak is drawn behind everything.
const STARS = [[-4, 4, 0], [-7, 7, 1], [-5, 10, 2], [-9, 11, 3], [-6, 14, 4], [-3, 8, 5], [-8, 15, 2], [-3, 13, 3]]   // [dx, dy from the neck, phase]
function cloak(c, ux, uy, lean, wave, tw) {
  const x = 22 + ux, y = 17 + uy
  const poly = [
    [x - 4, y], [x + 4, y],
    [x + 5, y + 11], [x + 1, y + 16],
    [x - 3 - lean * 0.3, y + 18 + wave * 0.4],               // inner tail
    [x - 6 - lean * 0.5, y + 15],                            // notch
    [x - 10 - lean * 0.8, y + 18 - wave * 0.4],              // outer tail
    [x - 11 - lean * 0.8, y + 14],
    [x - 9 - lean * 0.5, y + 8],
    [x - 6, y + 3],
  ]
  const cells = fillPoly(poly)
  const set = new Set(cells.map(([px, py]) => px + "," + py))
  const pts = new Map()
  for (const [px, py] of cells) {
    const t = (py - y) / 18
    let k = "m"
    if (!set.has(px - 1 + "," + py) || !set.has(px - 2 + "," + py)) k = "N"          // the trailing edge in shade
    else if (px > x - 4 && t < 0.55) k = "M"                                         // lit near the shoulders
    if (!set.has(px + "," + (py + 1))) k = "v"                                       // the lining's hem
    else if (!set.has(px + "," + (py + 2)) && t > 0.45) k = "V"
    pts.set(px + "," + py, [px, py, k])
  }
  // folds: two dark creases running down and out
  for (const [fx, fy, len] of [[x - 4, y + 4, 11], [x - 7, y + 8, 7]]) for (let i = 0; i < len; i++) {
    const cell = pts.get(Math.round(fx - (lean * 0.25 * i) / len - i * 0.18) + "," + (fy + i))
    if (cell && cell[2] !== "v" && cell[2] !== "V") cell[2] = "N"
  }
  for (const [dx, dy, ph] of STARS) {
    const sx = Math.round(x + dx - (lean * 0.7 * dy) / 18), sy = y + dy
    const cell = pts.get(sx + "," + sy)
    if (!cell || cell[2] === "v" || cell[2] === "V") continue
    const on = (tw + ph) % 6
    cell[2] = on <= 1 ? "y" : on === 5 || on === 2 ? "d" : "q"
  }
  blob(c, pts)
}

// The sabre: its hand at (hx, hy), the blade running `deg` (clockwise from right) and curving
// forward by `bend` degrees over `len` px: a 2 px moon-steel blade with a glowing edge, a silver
// crescent guard and a violet grip.
function sabre(c, hx, hy, deg, len = 13, bend = 22, glint = -1) {
  const pts = new Map()
  const put = (x, y, k) => pts.set(x + "," + y, [x, y, k])
  const a0 = deg * R
  put(Math.round(hx - Math.cos(a0) * 2), Math.round(hy - Math.sin(a0) * 2), "u")
  put(Math.round(hx - Math.cos(a0)), Math.round(hy - Math.sin(a0)), "V")
  // the centre line, walked in quarter pixels so the curve steps cleanly
  let x = hx, y = hy, a = a0
  const line = []
  const seen = new Set()
  for (let i = 0; i < (len + 3) * 4; i++) {
    const s = i / 4
    a = (deg + bend * (Math.max(0, s - 3) / len) ** 1.4) * R
    x += Math.cos(a) / 4; y += Math.sin(a) / 4
    const key = Math.round(x) + "," + Math.round(y)
    if (!seen.has(key)) { seen.add(key); line.push([Math.round(x), Math.round(y), a, s]) }
  }
  // the lit edge lies on one side all along, so the blade never forks where it bends
  const edge = Math.abs(Math.sin(a0)) >= Math.abs(Math.cos(a0)) ? [-1, 0] : [0, -1]
  line.forEach(([px, py, ang, s], i) => {
    if (s < 2) return
    const t = s / (len + 3)
    const tip = t > 0.92
    if (t < 0.78) put(px + edge[0], py + edge[1], i === glint ? "h" : "g")   // the glowing lit edge
    put(px, py, tip ? "h" : t > 0.78 ? "g" : "S")
  })
  // the guard: a small silver bow across the root
  const g = line.find(([, , , s]) => s >= 2) || line[0]
  const gn = [-Math.sin(g[2]), Math.cos(g[2])]
  for (const s of [-2, -1, 0, 1, 2]) put(Math.round(g[0] + gn[0] * s * 0.9), Math.round(g[1] + gn[1] * s * 0.9), s === 0 ? "w" : "s")
  blob(c, pts)
}
// A gauntlet closed round the grip.
function fist(c, x, y, far = false) {
  c.rect(x - 1, y - 1, 3, 3, "k")
  c.rect(x - 1, y - 1, 2, 2, far ? "b" : "s")
  if (!far) { c.px(x - 1, y - 1, "S"); c.px(x, y - 1, "w"); c.px(x - 1, y, "b"); c.px(x, y, "s"); c.px(x + 1, y, "n") }
  else { c.px(x - 1, y - 1, "s"); c.px(x, y - 1, "s") }
}
function armNear(c, sh, elbow, hand, buckler = true) {
  limb(c, sh[0], sh[1] + 1, 1.3, elbow[0], elbow[1], 1.1, "bspSw")
  limb(c, elbow[0], elbow[1], 1.1, hand[0], hand[1], 1.1, "bspSw")
  c.px(Math.round(elbow[0]), Math.round(elbow[1]), "w")
  if (buckler) c.stamp("_buckler", Math.round((elbow[0] + hand[0]) / 2) - 2, Math.round((elbow[1] + hand[1]) / 2) - 3)
}
// The moon trail of a cut: a tapered ring about the shoulder in glow tones, with sparkles.
function trail(c, cx, cy, r, from, to, thick) {
  c.arc(cx, cy, r, from, to, "z", { inner: r - thick, taper: true })
  c.arc(cx, cy, r - 1, from + (to - from) * 0.25, to, "g", { inner: r - thick + 1, taper: true })
  c.arc(cx, cy, r - 2, from + (to - from) * 0.55, to, "h", { inner: r - thick + 2, taper: true })
}
function sparkle(c, x, y, big) {
  c.px(x, y, "h")
  c.px(x - 1, y, "y"); c.px(x + 1, y, "y"); c.px(x, y - 1, "y"); c.px(x, y + 1, "y")
  if (big) { c.px(x - 2, y, "g"); c.px(x + 2, y, "g"); c.px(x, y - 2, "g"); c.px(x, y + 2, "g") }
}

// One frame. f: { ux, uy (upper body), hy (helm extra), near/far legs [dx, lift], hand, elbow,
// farElbow, farHand, deg, len, bend, lean, wave, tw, trail [r, from, to, thick] | null, sparks }
const SH = [28, 19]
const FSH = [20, 18]
function figure(c, f) {
  const ux = f.ux, uy = f.uy, hy = f.hy || 0
  const sh = [SH[0] + ux, SH[1] + uy]
  cloak(c, ux, uy, f.lean, f.wave, f.tw)
  // the off-hand, resting behind in the cloak
  { // the off arm akimbo: the elbow juts out behind, the hand rests on the hip behind the belt
    const ex = 15 + ux + (f.farSwing || 0), ey = 24 + uy
    limb(c, FSH[0] + ux - 1, FSH[1] + uy + 2, 1.2, ex, ey, 1.1, "nbsp")
    limb(c, ex, ey, 1.1, 20 + ux, 27 + uy, 1.1, "nbsp")
    c.px(ex, ey, "p")
  }
  c.stamp("_pauldron", FSH[0] + ux - 4, FSH[1] + uy - 1, { swap: { w: "s", S: "s", p: "b", s: "b", b: "n", c: "b" } })
  leg(c, 21, 27, f.far[0], f.far[1], true)
  leg(c, 25, 27, f.near[0], f.near[1], false)
  c.stamp("_torso", 17 + ux, 17 + uy)
  if (f.trail) { const [r, from, to, th] = f.trail; trail(c, sh[0], sh[1], r, from, to, th) }
  if (f.armFirst) armNear(c, sh, f.elbow, f.hand, f.buckler)    // the wind-up: the helm in front of the raised arm
  { // the star in the crescent mouth twinkles with the cloak
    const sx = 25 + ux, sy = 8 + uy + hy, on = f.tw % 4
    c.px(sx, sy, on < 2 ? "y" : "d")
    if (on === 0) { c.px(sx - 1, sy, "d"); c.px(sx + 1, sy, "d"); c.px(sx, sy - 1, "d"); c.px(sx, sy + 1, "d") }
  }
  c.stamp("_helm", 20 + ux, 10 + uy + hy)
  c.stamp("_crest", 18 + ux, 6 + uy + hy)    // the crest is mounted on the crown, in front of it
  if (!f.armFirst) armNear(c, sh, f.elbow, f.hand, f.buckler)
  sabre(c, f.hand[0], f.hand[1], f.deg, f.len, f.bend, f.glint ?? -1)
  fist(c, f.hand[0], f.hand[1])
  c.stamp("_pauldron", sh[0] - 3, sh[1] - 1)
  if (f.sparks) for (const [x, y, big] of f.sparks) sparkle(c, x, y, big)
}

// ---------------------------------------------------------------- the moves
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0], lean: [0, 0, 1, 1, 1, 0, 0, 0][i], wave: [0, 0, 1, 1, 1, 0, 0, 0][i], tw: i,
    hand: [33, 24 + uy], elbow: [29, 24 + uy], farElbow: [17, 23 + uy], farHand: [17, 26 + uy],
    deg: -55, len: 11, bend: 28, glint: [-1, 0, 3, 6, 9, -1, -1, -1][i],
  }
})
const GAIT = [[3, 0], [2, 0], [1, 0], [-2, 0], [-3, 1], [-2, 3], [1, 3], [3, 1]]
const BOB = [1, 1, 0, 0, 1, 1, 0, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i], sw = [-2, -1, 0, 1, 2, 1, 0, -1][i]
  return {
    ux: 0, uy, hy: 0, near: GAIT[i], far: GAIT[(i + 4) % 8], lean: 2 + (i % 4 < 2 ? 1 : 0), wave: [1, 2, 1, 0, 1, 2, 1, 0][i], tw: i + 2,
    hand: [33, 24 + uy], elbow: [29, 24 + uy], farElbow: [17, 23 + uy], farHand: [17 + sw, 26 + uy],
    deg: -55, len: 11, bend: 28,
  }
})
const ATTACK = [
  { ux: -1, uy: 0, near: [2, 0], far: [-2, 0], lean: 0, wave: 0, tw: 1, hand: [12, 17], elbow: [20, 22], farElbow: [16, 23], farHand: [16, 26], deg: -112, len: 11, bend: -14, buckler: false },
  { ux: 0, uy: 0, near: [3, 0], far: [-3, 0], lean: 2, wave: 1, tw: 2, hand: [32, 13], elbow: [31, 17], farElbow: [16, 23], farHand: [16, 26], deg: -72, len: 10, bend: 28, trail: [17, -178, -92, 5], buckler: false },
  { ux: 1, uy: 1, near: [5, 0], far: [-4, 0], lean: 5, wave: 2, tw: 3, hand: [32, 21], elbow: [29, 22], farElbow: [16, 23], farHand: [16, 26], deg: 5, len: 9, bend: 22, trail: [14, -128, 10, 6], sparks: [[40, 26, true], [37, 32, false], [32, 34, false]] },
  { ux: 1, uy: 1, near: [5, 0], far: [-4, 0], lean: 5, wave: 1, tw: 4, hand: [33, 26], elbow: [29, 24], farElbow: [16, 23], farHand: [16, 26], deg: 50, len: 10, bend: 18, sparks: [[40, 33, false], [38, 14, true], [41, 20, false], [43, 27, false]] },
  { ux: 0, uy: 0, near: [2, 0], far: [-2, 0], lean: 3, wave: 1, tw: 5, hand: [33, 24], elbow: [29, 23], farElbow: [17, 23], farHand: [17, 26], deg: 0, len: 8, bend: 22, sparks: [[39, 21, false]] },
  { ux: 0, uy: 0, near: [1, 0], far: [-1, 0], lean: 1, wave: 0, tw: 0, hand: [33, 24], elbow: [28, 23], farElbow: [17, 23], farHand: [17, 26], deg: -40, len: 9, bend: 28 },
]
const ALL = [...IDLE, ...WALK, ...ATTACK]
const BOX = { w: 48, h: 48 }
const fig = (list) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, list[c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(IDLE))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(WALK))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(ATTACK))
anim("knight_g", { ...BOX, frames: 22, fps: 10 }, fig(ALL))
