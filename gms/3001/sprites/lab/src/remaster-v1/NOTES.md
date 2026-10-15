# Remaster V1: the five heroes as one team

Five new hero sprites written as code, built into the Sprite Lab as `lab:<class>/remaster-v1`
(collection "Remasters"). Build: `node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v1/<class>.js`.

## Shared rules (kit.js)

- 48x48 frames, facing right, `anchorY` 40. Every body stands on rows 10..39: the top of the
  plume, hood, hat tip, hood point or bone crown has its outline on row 10, the soles' outline on
  row 39 in every idle and walk frame. Body centre column x = 24.
- Only vertical motion in idle and walk: a 1-px breath (idle frames 3-5 drop the head and chest one
  row) and a 1-px bob (walk frames 1 and 5, the "down" frames). Staffs, the sword's glint, the
  frost glints and the Shade's fire may rise above row 10.
- Light from the top-left. One 1-px ink outline (#181425) around each silhouette; parts that
  overlap carry their own ink edge on their shadow sides (`inked`), so every inner line is placed
  on purpose. Nothing is inked below row 38, so the outline under the feet is always one row.
- Each frame is drawn into a `Pic` (a grid of palette characters): hand-pixelled patches for the
  rigid parts (helm, hood, hat, faces, torsos, shield, sword arm), and code for what must move
  continuously (capes, robes, tails, fire, bows, staffs, smears).
- Legs (knight, ranger) are one hand-drawn leg in eight walk phases (`LEG.walk`: heel strike,
  weight taken, passing, push, toe-off, lift, swing, reach), drawn with shade symbols and mapped
  to each hero's colours; the far leg runs phase i, the near leg i + 4, a darker ramp behind.
- Frames: idle 0-7, walk 8-15, attack 16-21 for all five. Idle 6 fps (`idleRate` 6/1.6); walk
  10-12 fps (`motionRate` = fps / (9.8 x the hero's speed multiplier)); attack 12-14 fps. The
  attack's blow is on attack frame 3, where the game's crypt strike (`strikeClip`) lands it.
- Palettes are built on the master palette (ENDESGA 32 + extras) with a few in-between shades;
  10-19 colours each. `emissive` lists the glowing master-palette colours for when a sprite is
  wired into the game (the lab ignores it).

## Knight: Sir Aldric

- Design: a T-visored armet under a big red horsehair plume streaming back, a round pauldron, a
  ridged breastplate over steel tassets with a red tabard flap, a red cape, a red heater shield
  with a gold cross held forward on the far arm, and the longsword held low and forward in the
  near hand (blade at 1:3, cleanly stepped). Silver and red read at once, by day and at night.
- Palette (15): steel K n N g G w; red #6e1a2a, R, r, #f2735a; gold d y Y; leather b; ink.
- Idle 0-7: breath (3-5), plume tail and cape hem sway, a star glint twinkles on the blade's tip
  (4-6). Walk 8-15: the shared leg cycle, the sword arm swinging through three hand-drawn swings
  (blade at 1:4, 1:3, 1:2), the cape streaming back and rippling, the plume swaying.
  Attack 16-21: raise, cock the sword behind the helm, over the top (smear), the blow on 19 with a
  lunge and a big crescent smear, follow-through, recover.
- Weak: the sword arm is a fixed pose with three swings, a bit stiff; the raised-sword frames are
  thin; the impact crescent covers the shield. The build warns "attack: bobs 8 px": the overhead
  slash takes the sword above the helm on purpose.

## Ranger: Lyra

- Design: a pointed leaf-green hood framing a face with an auburn fringe, a green cloak, a tan
  leather vest with a belt and gold buckle, dark trousers in tall boots, a recurve longbow (a real
  "D" curve with its string) held forward in the far hand, a quiver with red-and-white fletching
  over the shoulder.
- Palette (19): greens l L e E v; leathers T t B b m h; skin s S, hair d; steel G g, white w,
  red r, gold y; ink.
- Idle 0-7: breath, the cloak's hem ripples. Walk 8-15: the shared leg cycle (12 fps), the cloak
  streaming back, the near arm swinging. Attack 16-21: nock (16), half draw (17), full draw to the
  cheek with the bow flexed (18), hold (19), RELEASE on attack frame 4 = frame 20 (the arrow gone,
  the string straight, the drawing hand flung back), recover (21). `attackRelease: 4`.
- Lab note: the lab's game screen builds lab sprites without `attackRelease`, and the game's bow
  pose (`game/ranger-animation.js`) then picks a NaN frame for any archer with an `attackFps` and
  crashes (`fr.get` of undefined): the earlier `rework-*` archers (attackFps 14) hit the same.
  So the def keeps `attackFps: 0` for the lab (it plays the attack at its 10 fps default) and
  records `gameAttackFps: 13` for the game proper. Shoot-while-walking frames (`attackWalk`) are
  not drawn yet.
- Weak: the face is small; the cloak is a big green shape that hides much of the torso; the drawn
  bow and string make a diamond; at night the greens sink into the forest and the bow, skin and
  fletching carry her.

## Sorcerer: Eldrin, the Frost Archmage

- Design: a tall pointed hat bent back at the tip with a silver band and a wide brim, bushy white
  brows, a long white beard, royal-blue robes shaded in three bands with a fold, a silver-trimmed
  front over a pale inner robe, a dark sash with a silver clasp, a silver hem, bell sleeves, a
  driftwood staff with an ice orb in a crescent claw rising above the hat.
- Palette (16): blues K u #1f6fbf U #7fd0f5; silver/beard w G g N; skin s S; wood B b m;
  ice X c; ink. Emissive: c X.
- Idle 0-7: breath, the robe sways, frost glints wink beside the orb. Walk 8-15: the robe swishes,
  its front corner kicks and a boot toe peeks out under the hem on the stepping frames. Attack
  16-21: lean back and gather frost (16-17), thrust (18), the orb bursts into a frost star on the
  blow (19), fading (20), recover (21).
- Weak: the robe is still a simple A-line; the near arm is a hanging sleeve; the staff is a plain
  shaft; the head sits low under the tall hat.

## Shade: Kael

- Design: a floating wraith with a tall hood hooked forward, a void face with two slanted glowing
  eyes ("\ /"), ragged shoulders, a body tapering into a curling tail whose lowest wisp stays on
  row 38 (outline on 39) in every idle and walk frame, a dagger in each hand, black-violet fire
  streaming off his shoulders and back: black at the root, lilac at the tips, flickering by
  swaying (the tips keep their height, so the top row holds still).
- Palette (10): violets h q p j; lilac #d9a6ff; white w; blades G g N n; ink. Emissive: j.
  `floating: true` (no footstep dust in the lab).
- Idle 0-7: a 1-px float, the fire flickers, the tail ripples. Walk 8-15: a glide: the body sheared
  forward, the tail streaming back, the fire blown back, both blades trailing low. Attack 16-21:
  coil, raise, a downward slash with the near blade (smear), the far blade's rising slash crossing
  it on the blow (19) as the fire flares, follow-through, recover.
- Weak: the fire reads more as a swept, burning mantle than licking flames (it is made of curved
  tongues in code); the daggers are small; the near arm is a thin line where it crosses the body
  in the attack.

## Necromancer: Morvath, the Blood Lich

- Design: a spiked bone crown with a red gem, a gaunt grey skull-like face with sunken sockets,
  burning red eyes and bared teeth under a dark cowl, a ribbed bone collar, a near-black robe
  shaded ash / maroon / black with a fold, a belt of bone plaques, blood-red runes down the front
  panel and along the hem, a skull staff with burning sockets in the near hand, an open grimoire
  with red glyphs held out in the far hand.
- Palette (15): robe h q a A m; runes R r x; bone and face z T Z Q W; pages t; ink. Emissive: x.
- Idle 0-7: breath, the robe sways, the runes and glyphs burn brighter (2-5) and a small blood flame
  rises off the pages (3-4). Walk 8-15: the robe shuffles, the staff moves with the stride.
  Attack 16-21: the staff rises, the grimoire's pages catch fire and burst into a blood flame on
  the blow (19), the fire dies down, recover.
- Weak: the robe is a dark mass; the face reads as a mask; the grimoire is small; at night only
  the bone and the runes read (they are the emissive colours in the game).

## Measurements (build.mjs)

- knight: 30 px tall, 22 frames, 15 colours, outline 100%; ! attack: bobs 8 px (the overhead slash)
- archer: 30 px tall, 22 frames, 19 colours, outline 100%; lines up cleanly
- mage: 37 px tall (the staff's orb; the body is 30), 16 colours; lines up cleanly
- rogue: 31 px tall (the fire; the body is 30), 10 colours; lines up cleanly
- necromancer: 35 px tall (the skull staff; the body is 30), 15 colours; lines up cleanly

Idle drift of the centre of mass: 0.04-0.43 px; walk: 0.28-0.58 px. Island share 9.7-11.9%; no stray
pixels, no frames in pieces.

## Tools

- `review.mjs --team=remaster-v1` lays out 150 px per sprite, but 48-px sprites at 4x need about
  200: the fifth hero (and Morvath in the game's row) is cut off at the right edge. The per-class
  boards show each hero beside the game's five.
