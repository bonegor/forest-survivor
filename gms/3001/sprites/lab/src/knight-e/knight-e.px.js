// Knight E, the Black Knight, for Forest Survivor: a brooding little tyrant in jagged obsidian
// plate. A closed helm with two big curved horns and a glowing red visor slit, spiky pauldrons,
// a tattered blood-red cloak that streams behind him, no shield, and a huge jagged greatsword
// carried over the shoulder in idle, its edge a glowing red line. His cut is a heavy overhead
// cleave with a dark-red slash trail.
// 22 frames of 48x48 facing right, one row: idle 0-7, walk 8-15, attack 16-21.
// Drawn in a 46x46 canvas laid at (1, 1) of the 48x48 frame (canvas x,y = sheet x-1,y-1).
// The soles stand on canvas row 37, so the ink under them is sheet row 39 (anchorY 40).
// Build: node <pxl>/bin/pxl.js build knight-e.px.js, then make-sheet.mjs adds the glow rows.
pal({
  k: "#181425",                                                         // ink (the cast's outline)
  a: "#2e2a48", b: "#4a4572", c: "#7a75ad", d: "#b9b6e0", e: "#eeeefc",   // obsidian and gunmetal
  f: "#3a0e1c", g: "#6c1526", h: "#a02130", i: "#d03c3c",                // blood-red cloth
  L: "#3b2220", l: "#6a4132",                                           // leather
  T: "#b81f2d", t: "#e8554f",                                           // the slash trail
  r: "#8d98e0",                                                         // cool rim light
  X: "#ff2e35", Y: "#ff5a3c", Z: "#b3162a",                             // glow: edge, hot core, dim
})
ramps("kabcde", "kfghi", "kLl")

const PART = { outline: "k", pivot: [0, 0] }
// A grid from rows, checked to be rectangular.
function grid(rows) {
  const w = rows[0].length
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`grid row ${i} is ${r.length} wide, row 0 is ${w}: ${r}`) })
  return rows.join("\n")
}

// ---------------------------------------------------------------- parts (grids, fill at 0,0)
// The helm, 11x10, in 3/4 facing right: a faceted dome lit from the top, a lowered brow that
// points at the front, the visor slit with two slanted red eyes, and an angular chin guard.
sprite("_helm", PART, grid([
  "..arcdddcb..",
  ".arcddeddcb.",
  "abrcddddcccb",
  "abbcdcdcccbb",
  "abbbbcddddde",
  "aabbbbkkkkkk",
  "aabbbbkkkkkk",
  "abbbbcbdbcbb",
  "aabbbbcdcbb.",
  ".aabbbbbbb..",
]))
// The horns: curved out and up, tips leaning in. The near one on the helm's back-left corner
// (placed at helm - 4, - 5), the far one smaller on the front-right (placed at helm + 8, - 4).
sprite("_hornN", PART, grid([
  "dc.....",
  "ccb....",
  ".ccb...",
  ".bccb..",
  "..bbccc",
  "..bbbcc",
]))
sprite("_hornF", PART, grid([
  ".....ed",
  "....dcb",
  "...dccb",
  ".dcccb.",
  ".ccbb..",
]))

// The torso, 12x11: obsidian back plate in shade, a ribbed breastplate, a red sash with a
// buckle, then a skirt of two black faulds with a red cloth panel between them.
sprite("_torso", PART, grid([
  "..abbcccbb..",
  ".abbcdddcbbb",
  "arbbcddcbbbb",
  "arbbcbcbbcba",
  "abrbbbcbbcba",
  "abrbbcbbbbba",
  "aabbbbbbbbaa",
  ".ghhgihhihg.",
  "abbhhghhhbba",
  "abbhghhghbba",
  ".abbhhihbba.",
]))

// The sabaton, toes to the right: pointed, lit top, dark sole.
sprite("_foot", PART, grid([
  "bcde.",
  "abbcdd",
].map((r) => r.padEnd(6, "."))))

// The near spiky pauldron, 9x6: two spikes on top, three lames.
sprite("_pauldron", PART, grid([
  "d.......d..",
  "cd.....dc..",
  ".cccbbbccc.",
  "ccdcbbcbbbb",
  "cbbbbbbbbbb",
  ".abbbbbbbba",
  "..aabbbbaa.",
]))

// The far shoulder's pauldron peeking out behind the back, darker: 6x6.
sprite("_pauldronF", PART, grid([
  "..c...",
  ".cbc..",
  "cbbbb.",
  "bbabbb",
  ".aabbb",
  "..aab.",
]))

// ---------------------------------------------------------------- the cloak
// A tattered cloak as a generated grid with its own ink: hung from the shoulders, its edge
// streaming back by `stream`, its hem cut into long and short tatters that ripple with phase.
const CW = 24, CH = 19, CX = 2, CY = 19            // grid size and its canvas origin
function cloakGrid(stream, phase, lift) {
  const g = Array.from({ length: CH }, () => Array(CW).fill("."))
  const HEM = 35 - CY + lift
  const teeth = [3, 0, 5, 1, 4, 0, 3, 1, 5, 2]         // tatter lengths left to right
  for (let y = 0; y < CH; y++) {
    const t = y / (CH - 1)
    const wave = Math.sin(phase + t * 3.2) * (0.8 + stream * 0.2) * t
    const left = Math.round(15 - 12.5 * Math.pow(t, 1.05) - stream * Math.pow(t, 1.4) + wave)
    const right = 20 - Math.round(1.5 * t)
    for (let x = left; x <= right; x++) {
      const col = x - left
      const cut = teeth[(col + Math.floor(phase * 1.3 + 2)) % teeth.length]
      if (y > HEM - cut + (x < left + 3 ? 0 : 0)) continue
      g[y][x] = "g"
    }
  }
  // shade: folds running down toward the back, a dark back edge, a light top
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (g[y][x] === ".") continue
    let left = x
    while (left > 0 && g[y][left - 1] !== ".") left--
    const s = x * 1.0 + y * 0.55 + Math.sin(phase + y * 0.35) * 1.3
    const band = ((Math.floor(s) % 6) + 6) % 6
    let k = ["h", "g", "h", "h", "g", "h"][band]
    if (x - left < 1) k = "f"
    if (y < 3 && k === "g") k = "h"
    if (band === 2 && y % 3 === 1 && y > 4) k = "i"
    g[y][x] = k
  }
  return grid(g.map((r) => r.join("")))
}

// ---------------------------------------------------------------- painting
const LIGHT = [0.4, -1]
const R = Math.PI / 180
function limb(c, x0, y0, r0, x1, y1, r1, ramp = "abcd", part = "both") {
  if (part !== "fill") c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  if (part !== "ink") c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
// A leg from the hip, its ankle dx along and lifted by `lift`; `far` is the darker far leg.
function leg(c, hx, hy, dx, lift, far) {
  const ramp = far ? "abbc" : "abcd"
  const ax = hx + dx, ay = 35 - lift
  let kx = (hx + ax) / 2, ky = 32
  const paint = (part) => {
    if (lift > 0) {
      kx = hx + Math.max(dx, 0) + 1; ky = 32 - lift
      limb(c, hx, hy, 1.7, kx, ky, 1.5, ramp, part)
      limb(c, kx, ky, 1.5, ax, ay, 1.3, ramp, part)
    } else limb(c, hx, hy, 1.8, ax, ay, 1.4, ramp, part)
  }
  paint("ink")
  c.stamp("_foot", Math.round(ax) - 1, ay + 1, far ? { swap: { c: "b", d: "c", e: "c", b: "a" } } : {})
  paint("fill")
  // knee: a spike catching light, a dark pixel under it
  const kxr = Math.round(kx), kyr = Math.round(ky)
  c.px(kxr + 1, kyr, far ? "c" : "e")
  c.px(kxr, kyr + 1, far ? "a" : "b")
}
// Horns and eyes (hx, hy: the helm's top-left corner).
function horns(c, hx, hy) {
  c.stamp("_hornF", hx + 6, hy - 3)
}
function hornNear(c, hx, hy) { c.stamp("_hornN", hx - 4, hy - 4) }
function eyes(c, hx, hy, blink) {
  if (blink) return
  c.px(hx + 7, hy + 5, "Z"); c.px(hx + 7, hy + 6, "X"); c.px(hx + 8, hy + 6, "Y")
  c.px(hx + 10, hy + 6, "Y"); c.px(hx + 11, hy + 5, "Z")
}

// The greatsword, drawn as a shape: its hand at (hx, hy), pointing `deg` (clockwise from right),
// `len` px of blade. The blade is broad, its far edge a jagged saw with a glowing red line, its
// spine dark. part: "blade", "hilt" or "all" (the hilt is the grip, the guard and the pommel).
function sword(c, hx, hy, deg, len = 16, part = "all", pulse = 0, clip = null) {
  const u = [Math.cos(deg * R), Math.sin(deg * R)]
  const n = [-u[1], u[0]]                               // toward the edge (the swing's leading side)
  const pts = new Map()
  const put = (x, y, k) => { pts.set(x + "," + y, [x, y, k]) }
  const R0 = 2.5                                        // where the blade starts
  const want = (rr, s) => {
    // is (rr, s) inside the blade?
    if (rr < R0 || rr > len) return null
    const taper = Math.min(1, Math.pow((len - rr) / 8, 0.7))
    const hw = 0.3 + 1.45 * taper + (rr < 5 ? 0.15 : 0)
    const saw = Math.pow(((rr - R0) % 5) / 5, 1.3)                     // grows and drops: the jagged edge
    const he = hw + (rr > 6 && rr < len - 3 ? saw * 1.9 : 0)
    if (s > he || s < -hw) return null
    return { hw, he }
  }
  if (part !== "hilt") {
    const mask = new Map()
    const x0 = Math.floor(hx - 8 - len), x1 = Math.ceil(hx + len + 6)
    for (let y = Math.floor(hy - len - 6); y <= Math.ceil(hy + len + 6); y++) for (let x = x0; x <= x1; x++) {
      const dx = x - hx, dy = y - hy
      const rr = dx * u[0] + dy * u[1], s = dx * n[0] + dy * n[1]
      const w = want(rr, s)
      if (w) mask.set(x + "," + y, { x, y, rr, s, hw: w.hw })
    }
    const nb = (p, sx, sy) => !mask.has(p.x + sx + "," + (p.y + sy))
    const sgn = (v) => (Math.abs(v) > 0.35 ? Math.sign(v) : 0)
    const ex = sgn(n[0]), ey = sgn(n[1])
    for (const p of mask.values()) {
      const edge = (ex && nb(p, ex, 0)) || (ey && nb(p, 0, ey))
      const spine = (ex && nb(p, -ex, 0)) || (ey && nb(p, 0, -ey))
      let k = p.s > 0.2 ? "d" : "c"
      if (spine) k = "b"
      if (edge) k = pulse ? "Z" : "X"                        // the glowing red edge
      else if (!spine && Math.abs(p.s - 0.3) < 0.55 && p.rr > 6 && Math.round(p.rr) % 5 === 0) k = "e"
      put(p.x, p.y, k)
    }
  }
  if (part !== "blade") {
    const P = (r, ox = 0) => [Math.round(hx + u[0] * r + n[0] * ox), Math.round(hy + u[1] * r + n[1] * ox)]
    const seg = (a, b, k) => {
      const m = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
      for (let i = 0; i <= m; i++) put(Math.round(a[0] + ((b[0] - a[0]) * i) / (m || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (m || 1)), k)
    }
    seg(P(-6), P(0), "l")                               // grip, two-handed
    put(...P(-7), "d")                                  // pommel
    put(...P(-8), "c")
    const g = 1.3                                       // the cross-guard, square to the blade, spiked
    seg(P(g, -3.6), P(g, 3.6), "c")
    seg(P(g - 1, -2.6), P(g - 1, 2.6), "b")
    put(...P(g + 1, 3.8), "e"); put(...P(g + 1, -3.8), "c")      // up-curved tips
    put(...P(g, 0), "i"); put(...P(g - 1, 0), "h")      // a red gem in the guard
  }
  const ok = (x) => !clip || clip(x)
  for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!pts.has(x + dx + "," + (y + dy)) && ok(x + dx)) c.px(x + dx, y + dy, "k")
  for (const [x, y, k] of pts.values()) if (ok(x)) c.px(x, y, k)
}
// A gauntlet closed round the grip: knuckles lit, fingers dark; `far` is the darker one.
function fist(c, x, y, far) {
  c.rect(x - 2, y - 1, 5, 3, "k"); c.rect(x - 1, y - 2, 3, 5, "k")
  c.rect(x - 1, y - 1, 3, 3, far ? "a" : "a")
  c.px(x - 1, y - 1, far ? "c" : "d"); c.px(x, y - 1, far ? "d" : "e"); c.px(x + 1, y - 1, far ? "c" : "d")
  c.px(x - 1, y, far ? "a" : "b"); c.px(x + 1, y, far ? "a" : "b")
  c.px(x - 1, y + 1, "g"); c.px(x, y + 1, far ? "g" : "h"); c.px(x + 1, y + 1, "g")
}
// The near arm: pauldron, upper arm, couter spike, vambrace.
function armIn(c, sh, elbow, hand) {
  limb(c, sh[0], sh[1], 1.7, elbow[0], elbow[1], 1.4, "abcd")
  limb(c, elbow[0], elbow[1], 1.4, hand[0], hand[1], 1.3, "abcd")
  c.px(Math.round(elbow[0]) + 1, Math.round(elbow[1]) - 1, "e")
  c.stamp("_pauldron", sh[0] - 3, sh[1] - 3)
}

// One frame. f: { ux, uy (upper body offset), hy (helm extra), near/far legs [dx, lift],
// hand [x, y], elbow [x, y], deg, len, smear [from, to, inner] | null, cloak [stream, phase, lift],
// front (sword before the body), pulse, blink }
const CUT = 30                                    // the carried blade shows in front of the body from here
const SH = [27, 20]                                // near shoulder (at rest)
function figure(c, f) {
  const ux = f.ux, uy = f.uy
  const hand = f.hand, elbow = f.elbow
  const sh = [SH[0] + ux, SH[1] + uy]
  // behind: the cloak, the blade at rest, the legs
  c.stamp("_cloak" + f.i, CX + ux, CY + uy)
  leg(c, 20, 28, f.far[0], f.far[1], true)
  leg(c, 25, 28, f.near[0], f.near[1], false)
  if (!f.front) sword(c, hand[0], hand[1], f.deg, f.len, "blade", f.pulse, (x) => x < CUT)
  c.stamp("_pauldronF", 15 + ux, 19 + uy)
  c.stamp("_torso", 18 + ux, 18 + uy)
  if (f.smear) {
    const [from, to, inner] = f.smear
    const r = f.smearR || 16
    c.arc(sh[0], sh[1], r + 1, from - 4, to, "k", { inner: r - inner - 1, taper: true })
    c.arc(sh[0], sh[1], r, from, to, "T", { inner: r - inner, taper: true })
    c.arc(sh[0], sh[1], r - inner + 1, from + (to - from) * 0.45, to, "g")
    c.arc(sh[0], sh[1], r, from + (to - from) * 0.55, to, "t", { inner: r - 1 })
  }
  const hx = 18 + ux, hy = 9 + uy + (f.hy || 0)
  horns(c, hx, hy)
  hornNear(c, hx, hy)
  c.stamp("_helm", hx, hy)
  eyes(c, hx, hy, f.blink)
  if (f.front) sword(c, hand[0], hand[1], f.deg, f.len, "blade", f.pulse)
  else sword(c, hand[0], hand[1], f.deg, f.len, "blade", f.pulse, (x) => x >= CUT)
  armIn(c, sh, elbow, hand)
  sword(c, hand[0], hand[1], f.deg, f.len, "hilt")
  fist(c, hand[0], hand[1], false)
  const g = [hand[0] - 3.5 * Math.cos(f.deg * R), hand[1] - 3.5 * Math.sin(f.deg * R)]
  fist(c, Math.round(g[0]), Math.round(g[1]), true)
}

// ---------------------------------------------------------------- the moves
// Idle: the greatsword held up before him in two hands, point to the sky; a slow breath (chest,
// arms and sword sink a pixel on f3-5, the helm a frame later); the cloak sways; the edge pulses;
// the eyes blink once.
const READY = -74, LEN = 22
const IDLE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = [0, 0, 0, 1, 1, 1, 0, 0][i], hy = [0, 0, 0, 0, 1, 1, 1, 0][i] - uy
  return {
    ux: 0, uy, hy, near: [1, 0], far: [-1, 0],
    hand: [34, 25 + uy], elbow: [30, 27 + uy], front: true,
    deg: READY + [0, 0, 0, 1, 1, 1, 0, 0][i], len: LEN, cloak: [1.5, i * Math.PI / 4, 0], pulse: i === 3 || i === 4, blink: i === 6,
  }
})
// Walk: per leg [dx, lift] by phase; the far leg half a cycle on. The body bobs 2 px, the sword
// rocks with each step (its point swings as the body drops) and the hands follow it.
const GAIT = [[3, 0], [2, 0], [1, 0], [-2, 0], [-3, 1], [-2, 2], [0, 2], [3, 1]]
const BOB = [1, 2, 1, 0, 1, 2, 1, 0]
const SWAY = [4, 0, -4, 0, 4, 0, -4, 0]
const WALK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const uy = BOB[i]
  return {
    ux: i % 4 === 1 || i % 4 === 2 ? 1 : 0, uy, hy: i % 4 === 2 ? 1 : 0, near: GAIT[i], far: GAIT[(i + 4) % 8],
    hand: [34 + (SWAY[i] > 0 ? 1 : 0), 25 + uy - (SWAY[i] < 0 ? 1 : 0)], elbow: [30, 27 + uy], front: true,
    deg: READY + SWAY[i], len: LEN, cloak: [4 + (i % 4 < 2 ? 0.8 : 0), i * Math.PI / 4 * 2, -uy], pulse: i % 4 === 1,
  }
})
// Attack (13 fps): wind-up back, the cut over the top and down in front, follow-through, recover.
const ATTACK = [
  { ux: -1, uy: 0, hy: 0, near: [2, 0], far: [-2, 0], hand: [31, 19], elbow: [29, 22], deg: -172, len: 29, cloak: [2.5, 0.5, 0] },
  { ux: 0, uy: 0, hy: 0, near: [3, 0], far: [-3, 0], hand: [33, 22], elbow: [31, 24], deg: -80, len: 20, front: true, smear: [-150, -70, 5], cloak: [4, 1.3, 0] },
  { ux: 1, uy: 1, hy: 0, near: [4, 0], far: [-3, 0], hand: [32, 21], elbow: [30, 22], deg: 24, len: 13, front: true, smear: [-80, 40, 8], smearR: 16, cloak: [5, 2, 0] },
  { ux: 1, uy: 1, hy: 0, near: [4, 0], far: [-3, 0], hand: [34, 25], elbow: [31, 24], deg: 64, len: 13, front: true, cloak: [4.5, 2.7, 0] },
  { ux: 0, uy: 0, hy: 0, near: [2, 0], far: [-2, 0], hand: [33, 25], elbow: [30, 24], deg: 8, len: 12, front: true, cloak: [3, 3.4, 0] },
  { ux: 0, uy: 0, hy: 0, near: [1, 0], far: [-1, 0], hand: [34, 24], elbow: [30, 26], deg: -62, len: 21, front: true, cloak: [2, 4, 0] },
]
const ALL = [...IDLE, ...WALK, ...ATTACK].map((f, i) => ({ ...f, i }))
// the cloaks, one per frame
ALL.forEach((f) => sprite("_cloak" + f.i, PART, cloakGrid(f.cloak[0], f.cloak[1], f.cloak[2])))
const BOX = { w: 48, h: 48 }
const fig = (from, n) => layer("figure", { x: 1, y: 1 }, (c) => figure(c, ALL[from + c.frame]))
anim("idle", { ...BOX, frames: 8, fps: 5 }, fig(0, 8))
anim("walk", { ...BOX, frames: 8, fps: 10 }, fig(8, 8))
anim("attack", { ...BOX, frames: 6, fps: 13 }, fig(16, 6))
anim("knight_e", { ...BOX, frames: 22, fps: 10 }, fig(0, 22))
