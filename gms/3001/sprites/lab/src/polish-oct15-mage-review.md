# Mage polish · 15 October 2026 · review

Four standing proposals live in `polish-oct15-mage.js` (`polish-a` to `polish-d`). This file reviews
the mage in the game now and last night's Ember Archmage, explains why both hats look "weirdly on
there", and then describes each proposal and what it fixes.

Coordinates are in the 48×48 cell. x grows to the right (the facing direction), y grows downwards,
and the feet stand on y=39. A sprite's "skull centre" is the middle of its head between its outlines.

---

## The short answer: why the hat floats

Both existing mages draw the hat around a different centre than the head:

| | brim (widest row) | brim centre | head / face under it | head centre | brim overhang back / front |
|---|---|---|---|---|---|
| In the game now (Remaster V3) | x=15..30 | 22.5 | x=21..29 (skin 22..28) | 25 | **6 px / 1 px** |
| Oct 14 Ember Archmage | x=17..30 | 23.5 | x=21..28 (skin 24..27) | 24.5 (skin 25.5) | **4 px / 2 px** |

Four things together make the eye read "a hat placed near a head" rather than "a hat on a head":

1. **The hat is centred behind the head.** The brim, band and cone are drawn 1 to 2.5 px behind the
   skull, so the back of the brim sticks out far and the front barely clears the face.
2. **Nothing holds up the back of the brim.** Under the back overhang there is a flat run of ink over
   empty air: 4 px at x=17..20 on y=15 in the current sprite, and 4 px at x=18..21 on y=16 in the
   study. No hair, ear or skull meets it.
3. **There is no shadow under the brim.** The first row under it is bright: white brows and light skin
   in the current sprite, light skin (`#d99b75`, `#f4c99a`) in the study. Without a shadow the brim
   reads as a flat cut-out stacked above the face, not something with depth that touches it.
4. **The head and the hat don't share a view.** The current face is drawn front-on (two eyes and two
   V-brows mirrored about x=24.5), while its cone leans back in profile. The study's cone has a vertical
   front edge and a sloped back edge, then its tip bends forward, so the hat's outline is an S that
   wobbles over a head drawn as a 6-px strip.

I measured all 22 frames of the current sheet (idle, walk, attack). The offset is the same everywhere:
the brim's centre stays 2 to 3 px behind the face. It comes from how the head is drawn, not from any
one frame.

---

## 1. The mage in the game now: Remaster V3 · Sorcerer (32×37, 21 colours)

**Hat-to-head fit.** See above. In detail:
- The cone's axis leans back. Its base row is centred on x=23, its middle on x=22..23 and the tip
  on x=20..21, which is 4.5 px behind the face. The hat and the head point in different directions.
- The band (y=12) mixes three yellows and oranges (`#fee761`, `#feae34`, `#d77643`) in 9 px. That's
  noisy right at the joint that should read most clearly.
- The brim's underside (y=14) is a straight 12-px navy bar, so there is no curve to suggest that it
  goes round the head.

**Face and beard.** The face is front-on, with symmetric white V-brows and eyes at x=23 and x=26.
That's readable and stern, but it contradicts the 3/4 body and the profile hat. The beard is long, white
and clear, and is the strongest part of the sprite. It starts at the cheeks (x=21..23 on y=18), so the
face is only 4 rows tall.

**Anatomy and proportions.** The hat is 12 rows, the face 4 and the body 21. The robe is a 20-px-wide
trapezoid (x=12..31), so the figure is bottom-heavy and bulky next to the knight's compact 21×30.

**Silhouette.** Strong: the tall hat, the staff with its crystal and the robe triangle. The free hand is
lost against the sleeve.

**Hands, staff and fire.** The staff carries an **ice crystal** (`#2ce8f5`, `#c8f4ec`, white) and is
set to glow. That's the wrong element for a fireball hero, and it is the biggest, brightest thing on
the sprite. The fire is a 3×3 orange spark on the far-left hand, so there is no fire focal point. The
staff hand is a 2×3 skin patch that reads fine at 3×.

**Readability.** At 3× and 1× it reads best of the references, thanks to the saturated azure robe and
the white beard.

**Light.** Mostly from the upper left (the lit left edge of the cone, the beard shaded on its right).
But the lightest robe panel (`#7fd0f5`) is the front panel on the shadow side, so it competes with the
beard.

**Outline.** Clean: 100% ink (`#181425`), no strays.

**Clusters.** The robe skirt is shaded in parallel 1–3 px vertical stripes of `#0099db`, `#1f6fbf` and
`#124e89` (for example y=30: `666 22 44 22`). They read as banding rather than folds.

**Colour.** Bright ENDESGA blues. Lively, but cooler and more saturated than the knight's muted
purple-grey steel.

**Next to the knight.** 50% wider and 7 px taller, which makes it the bulkiest hero.

## 2. The Oct 14 study: Ember Archmage (29×35, 24 colours)

**Hat-to-head fit.** It was meant to fix the hat, and it does narrow the brim, but:
- The brim is still centred 1 px behind the skull and 2 px behind the visible skin. It overhangs 4 px
  at the back and 2 px in front.
- The cone is a right triangle with a vertical front edge (x=27..28 for y=6..12) and a sloped back
  edge. The tip then bends forward (x=25..27 on y=5). This S-shaped outline makes the hat look
  balanced on the head rather than worn.
- The head is only 8 px wide with its outline, narrower than the 10-px band above it. A big hat sits
  on a thin sliver of face.
- The hair and beard use the **steel ramp of the pauldrons** (`#414052`, `#737589`, `#adb4c3`,
  `#e3e5df`). The back of the head merges with the shoulder armour, so the eye finds only the skin
  strip (x=24..27), which sits forward of the hat.
- There is no shadow under the brim, and there is a 4-px flat ink shelf under its back (y=16).

**Face and beard.** One eye at (25,18) and a nose on the edge: a 3/4 face, which is right. But the
"beard" hangs down the *back* of the face (x=22..24), so it reads as long grey hair rather than a beard
on the chin. The face is the narrowest of any hero.

**Anatomy and proportions.** Broad steel shoulders on a narrow head. The free arm is a thin diagonal.

**Silhouette.** Clean but timid. The hat is the only strong shape, and the staff's pale crystal
(`#b6d4db`) and the 5×6 flame are small.

**Hands, staff and fire.** The staff hand and the flame hand are both small. The staff is thin and
pale, and its crystal is grey-blue, not fire.

**Readability.** At 3× the desaturated navy (`#232b48`..`#739bbd`) sits close in value to the forest
floor, so it reads dim and grey next to the current sprite.

**Light.** Consistent, from the upper left.

**Outline.** 88% dark edge pixels.

**Clusters.** Fine, apart from the 6-px face strip, which mixes four grey steel tones.

**Colour.** Muted and close to the knight's steel family. That suits the style, but the figure loses
its punch.

**Next to the knight.** The right size and mood, but with no focal point.

---

## 3. How every proposal builds its hat

All four hats follow the same construction. That construction is the fix.

1. **Centred on the skull.** The skull spans x=20..28 with its outline, so its centre is x=24. The brim's
   widest row, the band and the cone's base are all symmetric about x=24, giving equal overhang in
   front and behind. You can check it in `heads.png` in my preview folder, where a magenta line marks
   x=24.
2. **The brim wraps the head.** The brim is an ellipse seen slightly from above. Its widest row comes
   first (the ends), and the row below is 2 px narrower: that is the front edge, dipping over the brow.
   Read together, the two rows look like a dish curving round the head, not a flat plate.
3. **Something solid under it.** Hair, a face or a dark face meets the brim's underside directly: white
   hair in A, grizzled hair in B, swept-back red hair that fills the back overhang in C, and the
   shadowed face in D. No ink shelf hangs over air.
4. **A cast shadow.** The first row under the brim uses the darker tones: hair shadow, skin shadow and
   brows in shade. In D the whole face is in shadow.
5. **The cone grows from the band.** The band is 9 px wide, centred on x=24, and the cone narrows up
   from it. Any bend (back in A, folded forward in B, crumpled back in D) only starts in the top
   third, so the base still reads as centred. C's cone is straight and symmetric.
6. **One view.** The face is 3/4, facing right. The eyes sit right of the skull's centre and the nose
   breaks the outline in front, while the brim's top surface shows that we look down slightly. Hat and
   head share one camera.

All four also share the rest of the knight's rules: a drawn-in ink contour, hard clusters, short
hue-shifted ramps (shadows lean purple, lights lean warm or cyan), light from the upper left, and a
single brightest focal point. That focal point is the fire, drawn in the game's own fireball orange,
amber and yellow (`#f77622`, `#feae34`, `#fee761`) with a white-hot core (`#fff6d0`) and a dark ember
rim (`#8e1f19`).

---

## 4. The proposals

### polish-a · Mage · Grand Archmage (31×38, 23 colours)
*The classic Eldrin, rebuilt.*
- **Hat:** a royal-blue cone in a 5-tone ramp from `#242a66` to `#a8d8ff`, lit on its left edge, its
  tip bending back. The gold band runs x=20..28. The brim's widest row (y=13, x=17..31) is followed by
  a front edge (y=14, x=18..30) that dips over the brow. White hair meets the brim at the back, and the
  shadow row (y=15) carries grey V-brows. I compared this brim against the flat one in an A/B test, and
  the dipped brim reads clearly more "on the head".
- **Face and beard:** stern V-brows whose inner ends meet between the eyes, a 3/4 face, the nose
  breaking the contour, and a long beard hanging from the chin to a point at the belt, lit on the left.
- **Fire:** a 7×7 fireball with a white-hot core in the near hand at chest height. It is the brightest
  thing on the sprite.
- **Staff:** the ice crystal is gone. An ember orb sits in a gold cup, with one highlight and no white
  core, so it stays secondary to the hand fire. A real 4×3 fist wraps the shaft between a gold cuff and
  the wood.
- **Robe:** a lit back panel with a pleat, an inner robe in the lightest blue between gold edges, a gold
  hem, and a back hem that trails out behind him. The figure leans into the direction he faces instead
  of standing as a box.

### polish-b · Mage · Battlemage (31×36, 25 colours)
*A grizzled war-wizard, the knight's brother-in-arms.*
- **Hat:** dark leather worn low, with the same centred, dipped brim (y=12 widest at x=17..31, y=13
  front edge). It has a crimson band with a 2-px steel buckle. The cone's body is centred, and only
  its top folds over and hangs forward, so it reads as a battered, lived-in hat with a clean seat.
- **Face:** square and grizzled, with eyes in the brim's shadow and a short salt-and-pepper beard.
- **Fire:** the attack direction made visible: a 7×8 fireball held forward on an open palm at the end of
  a readable arm (crimson sleeve, steel bracer, hand).
- **Staff:** planted behind him in the near hand: an iron-shod shaft and a steel crown holding an ember
  gem.
- **Body:** a crimson coat lit on the back and shadowed in front, a steel pauldron in the knight's
  steel family, a leather baldric with a steel buckle across the chest, and a belt with a gold buckle.
  The coat splits over dark breeches and heavy boots in a wide stride. He is the only proposal that
  shows legs and a stance the way the knight does.
- **Round fixes:** I lifted all the ramps after the value check showed it sinking into the forest floor.
  I also moved the staff back 1 px so the coat no longer doubles its outline, and I redrew the front
  arm, which had been a knot of ink.

### polish-c · Mage · Ember Prodigy (29×38, 24 colours)
*A young fire sorcerer. The hero colour `#b55088` is the robe's mid tone.*
- **Hat:** a straight, tall, perfectly symmetric plum cone with a gold flame emblem and a gold band. Its
  brim is narrower (13 px, x=18..30). Swept-back red hair fills the space under the back of the brim
  (x=18..22), so the brim literally rests on hair.
- **Face:** young and beardless, with a dark-red brow pixel above each eye in the brim's shadow, a set
  mouth and the nose in front. An earlier round showed a continuous brow band that read as a bandit
  mask, so I split it.
- **Fire:** raised high in the near hand above a gold cuff. The fire, the hat's tip and the staff's ring
  make a V, an iconic "casting" silhouette.
- **Staff:** dark wood topped by a gold ring round a floating ember. An earlier crescent read as a
  fork, so I replaced it. The fist has a gold cuff.
- **Body:** a fitted coat with gold lapels running into one placket. A first draft read as a gold "X"
  across the chest, which I removed. It has a red sash and a gold hem, a short plum cape with a lit edge
  and gold-lined hem, and dark breeches and boots in a stride.

### polish-d · Mage · Ashen Pyromancer (31×37, 16 colours, the tightest palette)
*A mysterious ash-grey caster, the most iconic at night.*
- **Hat:** a wide slouched brim (19 px at x=15..33, with drooping tips), a crumpled crown bending back
  and a red band. All of it is centred on x=24, and the brim's shadow swallows the face.
- **Face:** the alternative headpiece look. It is a dark slot with two ember eyes, which glow at night,
  above a red scarf wrapped to the nose. The scarf's tail streams back like the knight's plume.
- **Fire:** a flame cupped in the near hand in front of the chest, right under the eyes, as a centred
  focal point. He holds a caged-lantern staff in the far hand, and his ragged hem smoulders.
- **Body:** a long ash coat in the knight's purple-grey steel family, a rope belt, a bell sleeve with a
  lit cuff and a glove wrapped round the staff.
- **Caveat:** he hides Eldrin's face. That is a deliberate mascot read, but the wrong pick if the old
  wizard's face matters.

---

## 5. Checks (polish-preview.mjs, final run)

| id | visible | ground | colours | darkOutline | strayPixels | semiTransparent | glowMissing |
|---|---|---|---|---|---|---|---|
| polish-a | 31×38 | ok | 23 | 100% | 0 | 0 | [] |
| polish-b | 31×36 | ok | 25 | 100% | 0 | 0 | [] |
| polish-c | 29×38 | ok | 24 | 100% | 0 | 0 | [] |
| polish-d | 31×37 | ok | 16 | 100% | 0 | 0 | [] |

I ran a stricter lint of my own as well, using the same thresholds for every version:
- Every fill pixel that touches transparency has ink beside it. The only exceptions are the flames'
  dark ember rims, which are deliberate.
- There are no 2×2 knots of ink.
- No colour is used just once or twice by accident.

Each version went through at least four review-and-fix rounds. Each round looked at the right and left
facings at 4× and 6×, at 1×, 2× and 3× beside the knight, and at a silhouette, a value map and a
night view.

## 6. Tuning colours

Every version's palette is the `pal` object at the top of that version. Shared keys:
- `o` is the ink.
- `r f F y h` are the fire: rim, orange, amber, yellow and core.
- `s S T` are skin.

The `glow` list holds the five fire colours. At night those pixels stay unlit, so the fire, A's orb,
B's gem, C's ring ember, D's eyes, lantern and hem keep their full shape in the dark. Drop `#8e1f19`
from the list if the flames' rims should darken at night.

## 7. Open points

- These are single standing frames. The game's mage has 8 idle, 8 walk and 6 attack frames, so the
  pick still needs animating, or it plays as a held frame like the Oct 14 studies.
- As asked, they keep the current mage's size (29–31 × 36–38). A and C reach 38 px tall, the top of
  the range. All four stand 6–8 px taller than the knight (21×30).
- D shows no face. A, B and C keep a visible face.
