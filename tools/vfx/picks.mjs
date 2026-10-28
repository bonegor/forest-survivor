// What tools/vfx/bake.mjs bakes from Sprite Fusion's effects (tools/vfx/src), and how: the scout's
// eight picks (28 October 2026), each as the sprites a weapon of ours will play. The owner's words:
// "see what of their effects we can use for weapons and bake it in with our approach". Nothing here
// changes a blow: a sprite only shows one (its size chosen by the reach it stands for).
//
// A sprite: { name, src (tools/vfx/src/<src>.mjs), px (their art pixel in "screen" units: their
// motion and placement shrink by 2/px, shapes drawn in art pixels keep their size), opts (the
// effect's own, x = y = 0 being the sprite's origin), box (the art they are drawn into: w, h and its
// top left ox, oy, which also clips what flies past it: nothing may reach its edge, cut flat there,
// so it is wide enough or fades its edges (fadeEdge); bake.mjs warns of any, and trims the frames
// to the art, so room to spare costs nothing), the frames: from effect time t0, n frames
// at fps of ours, speed effect seconds a second of ours (1), or an explicit list `times`; step (the
// update step, 1/60 as their spawn rates are written for; an effect that spawns only on events may
// take less), seeds (one set of frames each, played as variants), glow ('frames': its light baked
// into glow frames at half size; 'none': dropped), glowK (that light's strength, bake.mjs GLOW_K
// unless given), fadeTop (the top N px of the box dissolved in a Bayer pattern, so a column that
// runs to the box's edge ends in pixels, not a flat cut), fadeEdge (the same on all four sides, the
// last N px: a spray flying on past the box dissolves there, its box N px wider than the art kept
// whole; 28 October 2026, the silver's sparks and the ult's motes ended on a rectangle), keep
// (palette keys: every other colour left out after the snap, as their trails that fade by
// darkening snap to near-black streaks; the critic's two, 28 October 2026), em (palette keys drawn
// unlit at night), loop,
// mirror (may be drawn mirrored for variety), additive (drawn whole in the glow pass: light itself),
// centre (the frames cut round the origin, so it sits in their middle: one turned about its
// centre), for (what it is for, in the credits) }.
// Colours are given as palette keys (art/palette.js): pal('wX') the packed colours in order,
// hexes('wX') the same as '#rrggbb' strings (the effects that take those), one('b') a single one.

export const pal = (keys) => ({ $pal: keys, as: 'packed' });
export const hexes = (keys) => ({ $pal: keys, as: 'hex' });
export const one = (key) => ({ $pal: key, as: 'one' });

const SLASH_ARC = Math.PI / 4; // weapons.js SWORD_ARC
// The angles KINDS.sword.shoot swings at, right of him: straight out, and the extra blades' 0.55
// below and above it. The left ones are baked at their own angles (π − a, SIDES), not mirrored: a
// mirrored cut would sweep the other way round, and ours sweep clockwise on both sides (the
// critic's, 28 October 2026).
const SWING = { 0: 0, dn: 0.55, up: -0.55 };
const SIDES = { r: (a) => a, l: (a) => Math.PI - a };
// The reaches a cut is baked at (effects.js CUT_REACH, the same lists): the Longsword's 30 at area
// 1 and up, Excalibur's 46 (its area 1.55) and up, each about a fifth past the last. The game draws
// the nearest, or, past them, its own cut at the true reach (the owner's, 22 October 2026: "if I
// hit a monster it doesn't always hit even if the animation implies a hit").
export const CUT_REACH = { slash: [30, 38, 46, 56], holy: [46, 56, 68, 82], whirl: [46, 56, 66, 80], chop: [32, 38, 44, 50, 56, 66] };

// One cut of the Longsword (steel) or Excalibur (holy), reach R world px about his chest, centred
// on angle c: 8 frames at 40 a second, the 0.16 s cut (Slash's SLASH_DUR) and a short spark fade.
// The critic's fixes (28 October 2026): 0.8 of the reach wide, so the fan runs in to about a fifth
// of it from his chest, as the hit sector does; the arc starts 0.35 rad earlier, so the crescent's
// thick part (at 0.73 of the arc) sits on the swing's centre c, its lead edge still ending at
// c + π/8; 3 sparks, not 5; the left cuts in a box of their own, left of the origin.
function cut(name, R, c, ramp, sparkRamp, em, forWhat, left) {
  return {
    name, src: 'slash', px: 4, for: forWhat,
    opts: { radius: R * 4, width: R * 0.8 * 4, squash: 0.85, tilt: 0, facing: 1, from: c - SLASH_ARC / 2 - 0.35, to: c + SLASH_ARC / 2, sweep: 0.05, hold: 0.02, trail: 0.09, sparks: 3, ramp: pal(ramp), sparkRamp: pal(sparkRamp) },
    box: left ? { w: R + 72, h: 2 * R + 72, ox: -(R + 56), oy: -(R + 36) } : { w: R + 72, h: 2 * R + 72, ox: -16, oy: -(R + 36) },
    t0: 1 / 40, fps: 40, n: 8, step: 1 / 120, glow: 'none', em,
  };
}
// A cut's six sprites at reach R: straight out, down and up, right (vfx_<kind>_<R>_<swing>) and
// left (..._l).
const cuts = (kind, R, ramp, sparkRamp, em, forWhat) =>
  Object.entries(SWING).flatMap(([k, a]) => Object.entries(SIDES).map(([s, side]) => cut(`vfx_${kind}_${R}_${k}${s === 'l' ? '_l' : ''}`, R, side(a), ramp, sparkRamp, em, forWhat, s === 'l')));

// One chop of the Twin Axes, Bloodstorm and Red Frenzy: a cut nearly all the way round (6 rad,
// as Chop's slashFrame), from angle a0, in 0.2 s (Chop.dur). The critic's (28 October 2026): a
// ramp with no near-black (its dot trail drew a black ring round him: now a dark red one), a
// slower sweep so the first frame doesn't hold 80% of the arc, a little wider.
function chop(name, R, a0) {
  return {
    name, src: 'slash', px: 4, for: 'Twin Axes, Bloodstorm, Red Frenzy (Chop)', mirror: true,
    opts: { radius: R * 4, width: R * 0.375 * 4, squash: 0.85, tilt: 0, facing: 1, from: a0, to: a0 + 6, sweep: 0.1, hold: 0.03, trail: 0.07, sparks: 5, ramp: pal('wiirRRm'), sparkRamp: pal('wir') },
    box: { w: 2 * R + 64, h: 2 * R + 64, ox: -(R + 32), oy: -(R + 32) }, t0: 1 / 40, fps: 40, n: 8, step: 1 / 120, glow: 'none', em: 'wi',
  };
}

// The Whirlwind's blade: one long cut held whole (arc 2.6, as Whirl draws), turned at play time.
// Steel, not the saturated blue it was first baked in (the critic's, 28 October 2026), a little
// wider.
function whirl(name, R) {
  return {
    name, src: 'slash', px: 4, for: 'Whirlwind, the Knight\'s ultimate (Whirl)', centre: true,
    opts: { radius: R * 4, width: R * 0.4 * 4, squash: 1, tilt: 0, facing: 1, from: -1.3, to: 1.3, sweep: 0.05, hold: 0.1, trail: 0.09, sparks: 0, ramp: pal('wXGMgNn'), sparkRamp: pal('wXGg') },
    box: { w: 2 * R + 24, h: 2 * R + 24, ox: -(R + 12), oy: -(R + 12) }, times: [0.09], fps: 1, step: 1 / 120, glow: 'none', em: 'wX',
  };
}

// A lightning impact of reach `size` (their ring reaches 38·size art px): n frames at 30 a second,
// ending before the tail's crawling arcs and dotted ring (the critic's, 28 October 2026: a
// Thunderstorm stacks many), its glow calmer (glowK 0.45).
function zap(name, size, box, n, seeds, forWhat) {
  return {
    name, src: 'lightning', px: 5, for: forWhat, mirror: true, seeds,
    opts: { kind: 'impact', size, sparks: 16, smoke: false, colors: pal('wXcUunK') },
    box: { w: 2 * box, h: 2 * box + 4, ox: -box, oy: -box }, t0: 1 / 60, fps: 30, n, glow: 'frames', glowK: 0.45, em: 'wXc',
  };
}

// The silver of the Purifier: a hit's star, shards and ring, pointing right (mirrored for a bolt
// flying left). n frames at 60 a second: the star lives on the first two. All of the silver unlit
// (the critic's, 28 October 2026: lit by the night's map, its cooling ring turned a dark violet).
// Its spark spray flies on far past the hit (80 px): it dissolves over the box's last 8 px, the box
// 8 px wider each way than the w by h first kept whole.
function silver(name, size, w, h, n, forWhat) {
  const W = w + 16, H = h + 16;
  return {
    name, src: 'impact', px: 2, for: forWhat,
    opts: { kind: 'hit', angle: 0, size, ramp: pal('wXGgNn') },
    box: { w: W, h: H, ox: -Math.round(w * 0.4) - 8, oy: -Math.round(h / 2) - 8 }, t0: 1 / 60, fps: 60, n, fadeEdge: 8, glow: 'none', em: 'wXGg',
  };
}

// A falling star's landing: its flare popping in (outBack), a pulse, and fading, in the 0.25 s of
// the Star's tail (8 frames at 32 a second), its satellites and motes twinkling round it. The
// frames are picked out of the effect's 2.5 s life rather than played straight through: the pop,
// the pulse at 0.9 s, then the fade, which the flare's turning (0.7 rad a second, eightfold) lets
// join without a jump. Light itself: drawn in the glow pass. fade: its outer satellites, flying past
// the box, dissolve over its last fade px (fadeEdge), the box that much wider each way.
const LANDING = [0.03, 0.08, 0.15, 0.25, 0.9, 1.97, 2.15, 2.32];
function landing(name, size, warm, box, forWhat, fade = 0) {
  const b = box + fade;
  return {
    name, src: 'sparkle', px: 2, for: forWhat, mirror: true, additive: true,
    opts: { size, flares: 3, warm: hexes(warm), cool: hexes('wGjNpqKk') },
    box: { w: 2 * b, h: 2 * b - 4, ox: -b, oy: -b + 2 }, times: LANDING, fps: 32, glow: 'none', ...(fade ? { fadeEdge: fade } : {}),
  };
}

export const PICKS = [
  // 1. The Longsword's cut (reach 30 at area 1, 38 to 1.35, and on with the hero's own area) and
  // Excalibur's (46 and on): drawn at the nearest reach baked (CUT_REACH).
  ...CUT_REACH.slash.flatMap((R) => cuts('slash', R, 'wXGMgNn', 'wXG', 'wX', 'Longsword (Slash)')),
  ...CUT_REACH.holy.flatMap((R) => cuts('holy', R, 'wfYyFoO', 'wYy', 'wfY', 'Excalibur (Slash, holy)')),
  ...CUT_REACH.whirl.map((R) => whirl(`vfx_whirl_${R}`, R)),

  // 2. Smite and Judgement: a pillar of light slamming down (their holy-light, "a quick smite"),
  // 130 px tall as today's Beam. The critic's (28 October 2026): played from its first frame, the
  // column 80% down on the blow (a one-frame slam), then three frames whole (hold 0.15) and the
  // narrowing; no glow frames (boxy checker where the effect's wide glows were clipped: the column
  // is light itself, em, and g.light('holy') lights the ground); its top dissolved over 28 px, not
  // cut flat at the box's edge; no ring of its own (theirs a side-on ellipse beside our circle).
  {
    name: 'vfx_pillar', src: 'holy-light', px: 3, for: 'Smite, Judgement (Pillar)', mirror: true,
    opts: { ground: 0, width: 7, hold: 0.15, feathers: 0, ringR: 0, glowR: 0.6, stars: 16, spread: 0.35, colors: pal('wzfYydb') },
    box: { w: 80, h: 144, ox: -40, oy: -132 }, t0: 0.48, fps: 25, n: 12, fadeTop: 28, glow: 'none', em: 'wzfY',
  },

  // 3. Lightning Strike's and Thunderstorm's shock, its ring settling at 38·size px: 27 (Lightning
  // Strike, 26·area), 35 (its splash +25%), 45 (Thunderstorm, 26·1.9) and 57 (with the hero's
  // area); the game draws the nearest within its slack, or past them its own (effects.js
  // ZAP_RING: the owner's, 22 October 2026, "if I hit a monster it doesn't always hit even if the
  // animation implies a hit"). And a chain's hop (shorter still: a hop is not a blast).
  zap('vfx_zap', 0.7, 36, 10, [1, 2], 'Lightning Strike, Thunderstorm (shock)'),
  zap('vfx_zap_35', 35 / 38, 48, 10, [1], 'Lightning Strike, Thunderstorm (shock)'),
  zap('vfx_zap_big', 1.2, 52, 10, [1], 'Lightning Strike, Thunderstorm (shock)'),
  zap('vfx_zap_57', 57 / 38, 70, 10, [1], 'Lightning Strike, Thunderstorm (shock)'),
  zap('vfx_zap_tiny', 0.45, 24, 7, [1], 'Chain Lightning, Storm Lash (hops)'),

  // 4. Meteor Storm's and Cataclysm's crash: only its first 0.15 s, an accent over the CC0 firebomb
  // (which stays: its dome is the better body). The critic's (28 October 2026): the baked
  // fireball broke into a string of beads, then a grey smoke tent; its flash disc, double shock
  // ring and spark spray beat our blob. No chunks (cut off mid-air when the sprite ends), no smoke,
  // no scorch and no floor ring (our decal and ring lie on the ground already).
  {
    name: 'vfx_meteor', src: 'explosion', px: 2.6, for: 'Meteor Storm, Cataclysm (impact flash)', mirror: true,
    opts: { ground: 0, size: 1.3, chunks: 0, earth: 0, scorch: 0, floor: false, dust: 0, ramp: pal('wfYyFoORm'), smokeRamp: pal('AQaVk'), surface: one('b') },
    box: { w: 112, h: 136, ox: -56, oy: -88 }, times: [1 / 60, 0.05, 0.083, 0.117], fps: 24, glow: 'frames', glowK: 0.45, em: 'wfY',
  },

  // 5. The Purifier's silver bursts, and a Silver Crossbow bolt's hit (shorter: the stray sparks
  // after its ring are noise at a crossbow's rate of fire).
  silver('vfx_silver', 0.8, 56, 44, 15, 'Purifier, Purge (silver burst)'),
  silver('vfx_silver_small', 0.5, 40, 32, 10, 'Silver Crossbow (bolt hits)'),

  // 6. Starfall's landing (moonlight), Comet Shower's (gold, the evolution grander: the critic's,
  // 28 October 2026, as first baked its arms ran white to pale peach and it read white), and the
  // head of a falling star (6 frames looping at 20 a second, while it falls).
  landing('vfx_star', 11, 'wzGjNpq', 32, 'Starfall (Star landing)', 8),
  landing('vfx_comet', 15, 'wfYyFoO', 36, 'Comet Shower (Star landing)'),
  {
    name: 'vfx_starhead', src: 'sparkle', px: 2, for: 'Starfall, Comet Shower (a falling star\'s head)', additive: true, loop: true,
    opts: { size: 4, flares: 0, warm: hexes('wzGjNpq'), cool: hexes('wGjNpqKk') },
    box: { w: 20, h: 20, ox: -10, oy: -10 }, times: [0.3, 0.45, 0.6, 0.75, 1.0, 1.15], fps: 20, fadeEdge: 2, glow: 'none',
  },

  // 7. Frozen Heart: a frozen foe shatters, the block standing in for its body from the first
  // frame (rise: false) and bursting 0.12 s on. Ended at 0.21 s with the shards still in the air
  // (the critic's, 28 October 2026: from 0.29 s their debris settled on one side-on shelf line at
  // the foot); our ring and sparks carry the fade.
  {
    name: 'vfx_shatter', src: 'ice', px: 2.5, for: 'Frozen Heart (a frozen foe shatters)', mirror: true,
    opts: { kind: 'shatter', ground: 0, size: 0.6, crack: 0, angle: 0, rise: false, burst: 0.12, palette: hexes('wXGcUuKk') },
    box: { w: 96, h: 72, ox: -48, oy: -56 }, t0: 0, fps: 24, n: 6, glow: 'none', em: 'wXc',
  },

  // 8. Every ultimate's start: the release of a charge (white flash, cross flare, rings, a mote
  // spray). The critic's (28 October 2026): from the release itself, so the flash lands on the
  // start (the gathering orb covered the hero after the ult had begun); fewer motes, and their
  // darkened tails dropped (keep), which read as dark scratches on the sand by day. Its motes fly on
  // past 100 px: they dissolve 50-60 px out (fadeEdge), clear of the rings (44 px at their widest).
  {
    name: 'vfx_ult', src: 'energy', px: 3, for: 'every ultimate\'s start (Game.startUlt)',
    opts: { kind: 'charge', charge: 0.2, colors: pal('wiPjpqhk'), ringScale: 0.5, motes: 20 },
    box: { w: 120, h: 120, ox: -60, oy: -60 }, t0: 0.21, fps: 20, n: 10, fadeEdge: 10, keep: 'wiPj', glow: 'frames', glowK: 0.45, em: 'wiP',
  },

  // 1b. The axes' chops, the last to bake (the first left out over the budget).
  ...CUT_REACH.chop.flatMap((R) => [[0, 'r'], [Math.PI / 2, 'd']].map(([a0, k]) => chop(`vfx_chop_${R}_${k}`, R, a0))),
];
