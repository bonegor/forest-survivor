# Necromancer polish · 15 October 2026

Review of the necromancer in the game now and the two standing studies of 14 October, then five
new standing versions with what each changes and why.

Source: `polish-oct15-necromancer.js` (ids `polish-a` to `polish-e`, collection *Hero polish ·
October 15*). Coordinates below are (x, y) in the 48×48 cell, with the feet on row 39 and the
ground line at 40.

## In short

- **The current sprite's weirdness is structural, not cosmetic.** In order of impact:
  - a box for a skull
  - a red-and-white grimoire held at shoulder height that reads as a slice of cake
  - a staff with no hand on it
  - a bone panel that reads as a grey trouser leg
  - a comb for a hem
  - the cultist enemy's exact reds for a robe
  - more glowing red than green
- **The 14 October studies fixed the colours but not the shapes.** The Grave Regent's face juts out of its hood like a snout, and its pauldrons and tome are pillow-shaded lumps. The Ossuary King is 30% bone and reads as one of the skeleton minions.
- **Five new versions, each a different read:**
  - **A Gravecaller**: hooded lich-priest, violet.
  - **B Bone Tyrant**: horned death lord, plate and ribcage, wine cape.
  - **C Grave Warden**: plague-doctor gravekeeper with a soul lantern, teal.
  - **D Soulflame**: burning-skull lich, navy and gold.
  - **E Blood Lich Reforged**: the current design with every flaw fixed.
- **All five pass the checks.** Every one reports `ground: ok`, `strayPixels: 0`, `semiTransparent: 0`, `glowMissing: []` and a dark outline of 96–100%. All are 29–31 × 37–38 px with 17–22 colours.

## How this was reviewed

- **Rendered with the preview tool:**
  - every version, facing right and left, at 10× on a grid
  - the board, at 4× and 1× beside the knight
  - in game at 3× on the forest floor
- **Checked with scratch tools of my own:**
  - grids in each version's own palette letters
  - lists of isolated single pixels and of fill pixels touching the outside
  - shares of bright and dark pixels
  - a 3× line-up of all five both ways
  - a deep-shadow render where only the glow colours stay lit
- **Compared against the cast:** every hero in the game now, and the monsters a necromancer could be mistaken for.
- **Iterated in rounds:** each version went through at least four review-and-fix rounds, with the mirrored view checked each time. The last round was a pixel-by-pixel pass for doubled ink, tangents and stray clusters.

## The bar: the plumed knight

- **Size and proportion:** 21×30 visible. The helmet is 10 of the 30 rows, a compact heroic chibi.
- **Ink:** warm near-black (about #0e080e to #170503). The plume is sel-outlined in a dark red (#510200).
- **Ramps:** short and hue-shifted:
  - steel #54496c → #9085a3 → #e2ccd9 → #ffffff, purple in the shadows and pinkish in the lights
  - scarlet #510200 → #900200 → #e81f00 → #ff5b00
- **Light:** from the upper left. Clusters are broad and flat, with almost no dithering.
- **Values:** 16% of its pixels are above luma 150 and 42% below 50.

## What the rest of the cast already owns

| Look | Who owns it |
|---|---|
| White bones with acid-green #9ee562 eyes | The necromancer's own raised skeletons (`minion`) |
| White bones with red eyes | The skeleton enemy |
| A red hooded robe in R #a22633 / r #e43b44 | The cultist enemy |
| Violet robe, crowned skull, high collar, green-tipped staff | The lich boss |
| Gold-crowned skull, violet cape, armour | The Bone King boss |
| Dark horned armour, cyan eyes | The death knight (and the Legion recolour) |
| Violet-black hooded wraith | The rogue (Eclipse Wraith) |
| Scarlet and steel | The knight |
| Royal blue | The mage |

Four rules follow for any necromancer:
- No body made mostly of bone (he would read as his own minion).
- No red hood (cultist).
- No crowned skull in violet (the lich boss and the Bone King).
- Dark horned armour needs bone and colour to tell it from the death knight.

His class colour is #9ee562 (`heroes.js`), so soul-fire green should be the glow.

## Review: the necromancer in the game now (Remaster V3 · Blood Lich)

Measured on idle frame 0: visible 28×37 (x 11–38, y 3–39), 17 colours, 100% dark outline. 27% of its pixels are above luma 150.

### Anatomy and proportions
- **The skull is a box.** Rows 12–17 have straight vertical sides: x 20 on the left, x 28–29 on the right. That makes a 9–10 px rectangle with a flat brow line. The teeth on row 18 (x 22–25) are the only taper, so at 3× it reads as a mask or a little robot head, not a skull.
- **The head is as wide as the shoulders.** No neck shows. Row 20 is a 7 px ink bar (x 21–27) where the neck should be, so the head sits like a lid on the shoulder line.
- **There are no legs or feet.** The robe simply stops in the comb hem (see below).

### Silhouette
- **The silhouette is a "T".** A 2 px pole runs the full height on the left (x 12–15, rows 3–39). A 7 px block juts out on the right at shoulder height (the book, x 30–37, rows 19–26).
- **The staff head is a 5 px cup with two 1 px horn ticks** (x 11–17, rows 3–7) and a 2 px green bar for eyes, (13,6)–(14,6). At 1× and 3× it reads as a tuning fork or a candle, not a skull.

### How the parts attach
- **Crown to head:** the crown spikes are three single bone pixels at x 21, 24 and 27, separated by ink (rows 8–9). They read as a picket fence balanced on the skull. Nothing holds the crown on: there is no hood, hair or band behind it.
- **Cowl:** the cowl exists only behind the skull, as a dark '1'/'3' strip at x 17–20 on rows 11–19. It reads as a ponytail, not a hood.
- **Staff in hand:** no hand holds the staff. The back pauldron touches it at (15,21), so the staff seems to float beside him.
- **Book in hand:** the book is held at the height of the pauldrons with no forearm. The only arm pixels are two bone fingers under it at (34–35,26), so it reads as a third, bulky pauldron.
- **The book itself:** white pages with crimson stripes (x 31–32 and 35–36, row 23), a tan gutter, a crimson cover and a pink-red flame on top (x 32–35, rows 17–20). It reads as a slice of layer cake with a cherry.
- **Robe to body:** the bone front panel (x 25–31, rows 28–38) is separated from the skirt by its own shading. At 3× it reads as a grey trouser leg with three red plasters (the runes at (29,36) and (28–30,37)).

### Readability at 1× and at game scale
- **By day he reads as "red robe with a pale head and a stick".** The class only reads from the skull.
- **At night the read is mostly red.** In game, 12 pixels glow (emissive `lix`): only 4 are the class green (the two eyes and the staff's two). The other 8 are #f6757a pink and #ff0044 red, and #ff0044 is the palette's "hot red, glowing eyes", the monsters' colour. So at night his brightest marks are runes on his hem in monster red.

### Light
- **Mostly consistent from the upper left.** The skull, the pauldrons and the robe's lit columns are all on the left.
- **The book is the exception:** its tan 'd' sits in the middle of the pages, not on a lit side.

### Outline
- **One clean ink colour (#181425) and no gaps.**
- **The weakness is internal ink:** the 7 px collar bar on row 20, and the crown's ink teeth.
- **The comb hem.** The bottom outline on row 39 is broken into 2 px pieces with 2 px gaps (x 13–16, 19–20, 23–24, 27–28, 31–32), and row 38 alternates 2 px of cloth with 2 px of ink. At 3× it reads as a fringe, or as a row of tiny feet.

### Clusters
- **Pinstripe banding in the skirt.** Row 30 runs 5 2 5 1 at x 18–21, and row 31 runs 2 5 1 2 at x 19–22: 1 px vertical stripes of the crimson ramp.
- **The light mass is spread out:** 186 bright pixels, 27% of the sprite. A 2 px light column runs the full height of the staff, plus the skull, the pauldrons, the belt, the bone panel and the book. Nothing is left for the eye to land on.

### Colour ramps and value
- **The robe is the palette's R #a22633 and r #e43b44.** Those are the cultist enemy's two reds exactly, and the same scarlet family as the knight.
- **The ramp has no dark crimson.** It jumps from #a22633 straight to the near-black #3e2731 and #2a1f2d.

### Next to the knight
- **He is 33% wider (28 vs 21) and 7 px taller.**
- **He shares the knight's colour identity** (red and white) instead of answering it.

## Review: 14 October study · Grave Regent

Visible 27×33 (x 13–39, y 7–39), 19 colours, 86% dark outline, 25% bright.

### Anatomy and attachment
- **The face juts out of the hood like a snout.** The hood covers only the back and the top (x 18–22, rows 8–12). The pale face runs from x 22 to x 28 and down to a jutting chin at (24–26,19). At 3× it reads as a long pale muzzle, more goblin or horse than skull.
- **The eyes are too low and too faint.** They sit on row 16, low in the face, at (23,16) and (26,16). They're #b3db95, only about 36 luma above the bone #a4a595 and desaturated, so they barely read.
- **The pauldrons float.** Each one has its own full outline (back x 15–22, front x 27–33, rows 20–24) with an ink collar between them on row 21 (x 21–25). They read as two snowballs held at shoulder height.
- **The tome is another cake.** It's a white dome of pages (x 13–20, rows 28–31) on a crimson base, held at the hip like a bowl or a bun.
- **The legs read as trousers and greaves.** Below the gold belt, the split robe shows two crimson columns with ink between (rows 30–36). Steel boots follow (#414052, #737589, rows 36–38). That's a monk or squire, not a necromancer.

### Silhouette, outline and readability
- **The silhouette has no clear shape.** It's a round mauve hood, two white balls, a white bowl and a thin line. At 1× it's a brown blob with white dots.
- **The staff is 1 px of light with ink on only one side.** Rows 18–33 have no left-hand outline, so the left edge is light pixels against the background. That's most of why the outline is 86% dark.
- **The staff's head is a lumpy bone blob** (x 33–39, rows 11–16) with a single green pixel at (35,14). The flame's left side (x 35–36, rows 7–9) has no ink.

### Light and clusters
- **Pillow shading everywhere.** The face is lit at its centre ('i' at x 24–25, rows 13–14) and darker all round. The pauldrons and the tome have their brightest pixel mid-mass, not on the upper-left plane.

### Colour, value and the knight
- **Mauve, dull bone and dull crimson all sit in the middle values.** The darkest cloth (#302936, luma 45) is only 14 luma above the ink, so the robe merges with the outline into one dark mass.
- **Next to the knight** it looks muddy and small-headed.

## Review: 14 October study · Ossuary King

Visible 29×34 (x 12–40, y 6–39), 16 colours, 87% dark outline, 30% bright, the brightest of everything reviewed.

### Silhouette and identity
- **He reads as a skeleton, and so as his own minion.** Bone is 161 of its 598 pixels (30% of all its pixels are above luma 150): the crown, a 9×10 skull, two-pronged pauldrons, a ribbed cuirass, the back hand and the staff. The crown and skull stack into one 13-row bone column (rows 6–18), like a candle or a totem.
- **The pauldron spikes look like raised hands.** Each pauldron ends in two 1 px prongs with ink between them (row 19: x 14 and 19 behind, x 30 and 34 in front). At 3× they read as fingers or rabbit ears. Together with the three crown points, the top half is a cluster of spikes.

### Anatomy
- **The eyes are outside the sockets.** The sockets are ink at (23,14) and (26,14), but the green eye pixels are a row lower and outside them, at (22,15) and (27,15).
- **It's a long, smiling face.** The eyes sit 60% of the way down the head. With the jaw it reads friendly rather than menacing.

### Outline and clusters
- **The shaft splits.** On rows 16–17 it becomes two parallel 1 px lines (x 35 and 37).
- **The outline breaks.** At (34,33) a transparent pixel separates the shaft from its own right-hand ink.
- **The green flame inside the hook has no ink on its left** (38,12).
- **The back hand's green fire is a round lime** (x 13–18, rows 24–28) with nothing around it.

### Colour, value and the knight
- **Bone, green and steel together read as "skeleton enemy in a green skirt".**
- **The light mass is the whole figure,** so there's no focal point. Next to the knight he's the brightest thing on the board, for the wrong reason.

## The five proposals

All five share the knight's craft:
- a warm near-black ink drawn by hand as a 1 px contour (`outline: false`)
- flat clusters with no dithering
- 3–6 tone hue-shifted ramps, lit from the upper left
- one bone ramp, mauve shadow #4d4048 → warm ivory #efe6ca
- one soul-fire ramp, teal #1b4a3b → #3d9150 → class green #9ee562 → white-hot #effcc4. Only #9ee562 and #effcc4 are in `glow`.

Each version keeps bone to sharp accents and the face, keeps the glow at the head and the weapon, and stands on row 39.

### A · Gravecaller (polish-a): a hooded lich-priest

30×38, 18 colours, 100% dark outline, 8% bright, 14 glow pixels.

- **Look.** A violet hood with a swept-back peak and a forward brim. The face is lost in shadow except two green eyes, whose light catches the cheekbones in dark green (#1b4a3b), and a glint of bone jaw. A ragged mantle over the shoulders. A cloak trails behind him, its green lining turned out at the tears. A bell sleeve reaches to a bone hand on a dark wood staff, crowned by a skull with green pupils and a soul flame rising out of it. A belted robe has one deep fold, and the slit's green lining opens over the front boot.
- **What it fixes:**
  - The face is a dark hole with eyes, not a box.
  - The hood is the head, so nothing floats on top.
  - The hand closes round the staff.
  - There's no book to misread.
  - The hem is one clean line.
  - The glow is green and sits at the face and the staff top: a triangle the eye follows.
- **Rounds:**
  1. A box robe and an ear-like hood.
  2. A bell robe and the forward brim.
  3. A peaked hood and bone pauldrons, which read as bread rolls and stole focus from the face.
  4. The pauldrons became a ragged violet mantle, plus the fold, the boot, the trailing cloak, the bell sleeve and brighter highlights.
  5. The pixel pass removed doubled ink where the sleeve and the cloak met the robe, and stopped the boot short of the staff. Width went from 31 to 30.
- **Caveats:**
  - Violet is the lich boss's and the rogue's family. The hood, not a crowned skull, keeps the silhouette distinct from the boss.
  - The fewest bright pixels after C. He reads on hue (violet on green grass) more than on value.

### B · Bone Tyrant (polish-b): a bone-armoured death lord

30×37, 19 colours, 99% dark outline, 12% bright, 6 glow pixels.

- **Look:**
  - two bone horns curving up off a lilac-black iron helm, over a skull face with green eyes deep in the sockets
  - an iron back pauldron with two bone spikes; the front one left plain
  - a ribcage cuirass (a sternum and three ribs a side) and a belt of bone plaques
  - a wine cape and tabard over armoured legs in a wide stance like the knight's
  - a staff whose two bone prongs cradle a green soul orb
- **What it fixes:**
  - Bone appears only as sharp accents on dark plate, so he is the master of the skeletons, not one of them.
  - The spikes are single, tapered and attached.
  - The cape and stance give him the knight's build.
  - The steel is a darker relative of the knight's lilac steel, so they sit together as a pair.
- **Rounds:**
  1. Rows assembled one pixel off.
  2. Rebuilt from parts. The single horn read as a floppy hat tip.
  3. Bone horns swept back read as rabbit ears, and bone dome pauldrons as bread.
  4. Spiked iron pauldrons, upward horns, a lighter steel ramp, the ribcage and lit greaves.
  5. The pixel pass: the near horn was lit on its right at the root, against the light; the far horn's ink touched the staff's prong; both spikes doubled ink against the helm and the jaw (the front spike went); the fist's top edge now covers the shaft.
- **Caveats:**
  - Horns on dark armour echo the death knight enemy. The bone face, horns and ribs and the wine cape are what separate them.
  - Only 6 glow pixels: he is the least "magical" by night.

### C · Grave Warden (polish-c): a plague-doctor gravekeeper

31×37, 22 colours, 100% dark outline, 6% bright, 9 glow pixels.

- **Look:**
  - a black wide-brimmed hat with a brass buckle
  - a black feathered capelet
  - between them, a bird-skull mask with a green lens and a beak curving down
  - a teal coat fitted at a belt with a brass buckle and a bone skull charm, bone buttons down the opening, tails flaring behind with a fold, two boots in a stance
  - a rounded crook from which hangs a brass lantern of soul fire
- **What it fixes:**
  - Nothing in the silhouette is shared with any monster.
  - The dark hat and capelet frame the bone mask, the plague doctor's classic value read.
  - The lantern is a focal glow at the top of the weapon.
  - The staff is held in a gloved hand at the hip.
- **Rounds:**
  1. A slate coat, with the feet one row below the ground line.
  2. A teal coat on the ground line and the skull charm.
  3. Flared tails, a fold, and the charcoal hat and capelet.
  4. Buttons and highlights.
  5. The pixel pass: the brim's ink touched the crook; the beak's last ink pixel overwrote the shaft, breaking it; the lantern shared the shaft's ink column (the hook was widened); the squared hook read as a street lamp and is now rounded.
- **Caveats:**
  - The lowest bright share (6%): he relies on the mask and the lantern.
  - At 31 px he is the widest, at the top of the allowed range.
  - It's the furthest from "dark sorcerer in robes", so it's the most distinctive pick and the riskiest.

### D · Soulflame (polish-d): a lich whose skull burns

29×38, 17 colours, 96% dark outline, 15% bright, 35 glow pixels.

- **Look.** A bare skull, its crown engulfed in green soul fire. Three tongues stream back like the knight's plume, white-hot at the root. Midnight-navy robes, a mantle with a gold clasp and a gold-trimmed hem, a belt of vertebrae, a gold-edged front flap running down to a gold hem, bone feet, and a sickle-headed staff in a bone hand.
- **What it fixes:**
  - The skull is the right size (9 px) and shaped, with cheekbones, teeth and a chin, so it isn't a box.
  - The focal glow is unmistakable, reads at 1×, and is the only version that glows strongly by itself at night.
  - The robe is grounded on bone feet, not a comb.
- **Rounds:**
  1. A bobblehead skull, a flame like broccoli, a black block robe that floated one row above the ground.
  2. A smaller skull, flame tongues, a ribbed V-chest and bone feet.
  3. Navy, the fire engulfing the crown (no ink line between the fire and the skull), the diagonal gold edge in place of a vertical "zipper", a gold hem.
  4. A clean gold-trimmed mantle; the rib V was dropped because it didn't read at 3×.
  5. The pixel pass: the mantle's ink touched the staff for five rows (the staff moved out a pixel); two holes in the hem's bottom outline were closed.
- **Caveats:**
  - Navy sits in the mage's blue family, though it is far darker and greyer than his royal blue.
  - The fire's dark-green sel-out makes it read a touch "leafy" at 10×; at game scale it reads as fire.

### E · Blood Lich Reforged (polish-e): the current design, fixed

30×37, 19 colours, 100% dark outline, 11% bright, 10 glow pixels.

- **Look:**
  - a rounded skull in three-quarter view (sockets, cheekbones, a narrowing jaw) under a black iron crown with three spikes and a green soul gem
  - the cowl draped down behind the head and over the shoulders
  - blood-wine robes with one fold and a bone belt, above two boots
  - the staff gripped by a visible back hand, topped by a small horned skull with dark sockets so it doesn't compete with the head
  - an open grimoire at the waist with a gutter and lines of text, green soul fire rising from it
- **What it fixes:**
  - Each item on the current-sprite list above, one by one.
  - The robe is deeper and purpler than both the knight's scarlet and the cultist's R/r reds.
  - All the glow is the class green.
- **Rounds:**
  1. Broken geometry.
  2. A front-facing bobblehead skull and a book like a plate.
  3. The 3/4 skull, a fold, and the ruled book.
  4. A smaller staff skull, because two equal skulls side by side competed.
  5. The pixel pass: the staff hugged the body for most of its height (moved out a pixel); the back hand floated a pixel away from the robe (the sleeve now reaches it).
- **Caveats:**
  - A crowned skull is still the Bone King's and the lich boss's motif; the iron crown, wine robe and book are the difference.
  - Warm red is the knight's side of the wheel.

A sixth direction was tried and dropped: a living, pale, white-haired sorcerer. At game scale the face read as a mask and the hair as a wig, below the bar the other five reach.

## Measurements

| | visible | colours | dark outline | luma > 150 | luma < 50 | glowing px |
|---|---|---|---|---|---|---|
| knight (style) | 21×30 | 63 | 82% | 16% | 42% | – |
| in the game now | 28×37 | 17 | 100% | 27% | 43% | 12 (4 green, 8 red or pink) |
| Oct 14 · Grave Regent | 27×33 | 19 | 86% | 25% | 45% | 8 (pale green) |
| Oct 14 · Ossuary King | 29×34 | 16 | 87% | 30% | 41% | 14 (pale green) |
| A · Gravecaller | 30×38 | 18 | 100% | 8% | 40% | 14 |
| B · Bone Tyrant | 30×37 | 19 | 99% | 12% | 48% | 6 |
| C · Grave Warden | 31×37 | 22 | 100% | 6% | 50% | 9 |
| D · Soulflame | 29×38 | 17 | 96% | 15% | 51% | 35 |
| E · Blood Lich Reforged | 30×37 | 19 | 100% | 11% | 56% | 10 |

For all five the preview tool reports `ground: "ok"`, `strayPixels: 0`, `semiTransparent: 0` and `glowMissing: []`. All five also build with the game's `buildSprite`.

## Notes for picking and tuning

- **These are standing frames only.** The game's sheet has 8 idle, 8 walk and 6 attack frames. Whichever is picked still needs those drawn before it can replace Remaster V3 without losing animation.
- **Colours can be tuned by palette.** Each version's palette is a named object (exported as `PALETTES`, the draw functions as `DRAW`), so a version can be redrawn in tuned colours without touching the pixel rows. In every version:
  - the digits are its main cloth or metal ramp
  - a–d are bone
  - f–i are soul fire
  - w–y are wood or leather
- **The glow needs a palette key before baking.** The game marks glowing colours by `palette.js` letters. #9ee562 is `l` there, but the white-hot core #effcc4 has no key yet. Either add one or move the core to an existing light key.
- **On value:**
  - A and C carry fewer bright pixels than the knight (8% and 6% against 16%) and lean on hue and silhouette.
  - B, D and E are closer.
  - Lifting each ramp's top one or two tones is the quickest way to brighten any of them.
- **On colour family:**
  - C (teal) is the only one with no neighbour in the cast.
  - A's violet borders the lich boss and the rogue.
  - D's navy borders the mage.
  - E's wine borders the knight, and the cultist less so.
  - B's lilac steel is the knight's own family by design.
