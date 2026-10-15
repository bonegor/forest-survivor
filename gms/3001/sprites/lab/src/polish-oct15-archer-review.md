# Ranger polish · 15 October 2026

The ranger (class `archer`, Lyra) is reviewed against the knight, then redrawn as four standing
proposals in `polish-oct15-archer.js`. All four face right in a 48×48 cell, stand on row 39
(anchorY 40) and draw their own 1-px contour.

I studied every sprite with `gms/3001/tools/polish-preview.mjs`: the board at 4× and 1×, both
facing directions, the 3× forest-floor view, and 10× to 24× close-ups with per-pixel dumps.

## 1. Review: the ranger in the game now (`ranger-verdant.js`, idle frame)

Measured: 26×32 visible, 22 colours, 86% dark edge, no strays.

**Anatomy and proportions**
- The face is a 3–4 px strip in profile: two skin columns and a nose pixel sticking out past the
  eye. A dark red-brown "curl" line (`j`) runs down the cheek, and the jaw is in the
  shadow tones `j`/`s`. Together they read as stubble or a sideburn, so the hero reads as an
  older man, not Lyra.
- The head is small next to the body; the knight's head is a third of his height, hers about a
  quarter.
- Both forearms point forward at chest height (`PPPPPPP` across x 28–34). It is neither a
  resting pose nor a draw, and the straight bar reads as a plank or a rifle.

**Silhouette**
- Five things stick out in different directions: three arrow "claws" up and back, a brown
  quiver plank as tall as the head, a green cloak strip hanging off the back like a tail or leaf,
  the horizontal arm and the D-bow. Nothing leads the eye; at 1× it is a brown smudge with a stick
  bundle.

**How parts attach**
- **Hood:** the green cap ends at the brow in a dark band. It never wraps the cheek or chin, so it
  reads as a beanie or helmet, not a hood.
- **Bow:** the bowstring (`r`, pale) runs vertically through the forearm, so the arm looks
  pierced. The grip is a single skin pixel.
- **Quiver:** the quiver is drawn with a 5-px dark brush and a 3-px core, a diagonal plank from
  shoulder to head height. The fletchings have no rim, so they float.
- **Cloak:** it starts behind the quiver, so it is attached to nothing.
- **Arms and legs:** round steel shoulder pads and steel knee pads sit on top of the joints
  rather than being part of them.

**Readability (1× and 3×)**
- At 3× the brightest things are the pale fletchings and steel pads, not the face. The green is
  only on the cap and the cloak strip, and it nearly matches the floor's value.

**Light**
- The cap is lit from the upper left, but the cloak's light lines run down its middle. The quiver
  is lit on its inner side, and the two legs are lit on opposite sides.

**Outline**
- Limbs and the quiver are drawn with a 4–5 px dark brush, giving 2-px dark borders and dark
  pixels scattered inside the torso and legs. The figure looks dirty rather than crisp.

**Clusters**
- The torso is noisy with single pixels of four browns. Wide Bresenham lines leave doubled stair
  steps on the quiver and limbs. The steel pads are pillow-shaded balls of four tones with a white
  dot.

**Colour and value**
- Torso, quiver, legs and boots are all mid browns of about the same value (`m` #624337,
  `n` #996748), so the parts merge. The class colour, green, is a minority.

**Next to the knight**
- The knight is compact (21×30), bright and chunky, with one red accent. The ranger is wider,
  spindlier and muddier, with no accent. She looks like she comes from a different game.

## 2. Review: Thornwarden (`standing-oct14.js`, `ranger()`)

Measured: 25×30 visible, 20 colours, **75% dark edge, 2 stray pixels**.

**Anatomy and proportions**
- The deep cowl leaves a face of about 4 skin pixels behind a full row of outline across the
  brow. The face reads gaunt or shadowed, with no female cue at all; it could be any hooded
  figure.
- The legs are two parallel 3-px columns with steel knee caps, so they read as stilts. The torso
  is a long sack under narrow shoulders.

**Silhouette**
- The two arrows are white "Y" forks (`zo`/`zxo`) above a 1-px brown line. They read as bunny ears,
  antlers or a pitchfork.
- The cloak is one flat triangle down the back.

**How parts attach**
- **Bow and hand:** the hand spans from the string (x 33) to the limb (x 37), so she holds the
  bow by the string. The string is a solid two-tone gold line, `g`, as heavy as the limb, while
  the limb is a 1-px dark line dotted with light pixels. The bow reads as a stick with a beaded arc
  beside it.
- **Quiver:** almost invisible, so the arrows seem stuck into her back.
- **Arm:** the front arm is a grey steel stick from a steel pauldron, which looks robotic. There
  is no rear arm.

**Readability**
- At 3× it reads as "green hooded figure", generic and dim. At 1× the dotted bow nearly vanishes.

**Light**
- The hood and cloak are lit from the upper left, but the jerkin is lit in the centre (pillow
  shading). One bright pixel sits alone on the cloak's lower corner.

**Outline**
- The bow highlights, the string and the fletchings sit on the edge, giving 75% dark edge against
  the knight's 82%.
- The two gold bow nocks touch the bow only diagonally: those are the 2 stray pixels.

**Clusters**
- The torso mixes seven tones (`h j k l g q f`) in a mottled pattern. The gold strap and buckle
  read as yellow stains.
- The bow arc steps unevenly (2-2-3), and its dotted highlight is a textbook beaded line.

**Colour and value**
- The cloak greens and the jerkin browns sit at nearly the same value, so they blend into one dark
  mass. Grey steel bits are scattered on the shoulder, bracer and both knees.

**Next to the knight**
- Similar size, but dark and quiet. It has nothing like the knight's single bright accent.

## 3. What the knight does that the ranger did not

1. **A big head with a face that has two readable eyes.** The head is about a third of the
   height.
2. **One flowing shape and one accent colour.** The plume is red; everything else supports it.
3. **Alternating value blocks:** red plume, steel helmet, red scarf, steel body, white sash, steel
   legs. Parts separate by value, not only by outline.
4. **Chunky shapes:** a 1-px warm-dark contour, short 3–5 tone ramps and light from the upper
   left. There are no 1-px light lines on the silhouette.
5. **A wide, grounded stance**, with a clear gap between the legs.

Every proposal below is built on these five rules.

## 4. The proposals

| id | name | concept | visible | colours | dark edge | glow |
|---|---|---|---|---|---|---|
| polish-a | Ranger · Greenhood | classic pointed hood, braid, back quiver | 27×33 | 19 | 100% | — |
| polish-b | Ranger · Copper Tail | hood down, copper ponytail as her "plume" | 27×32 | 22 | 100% | — |
| polish-c | Ranger · Mossmantle | crimson-lined deep hood, long mossy cloak | 28×33 | 21 | 100% | — |
| polish-d | Ranger · Silverleaf | elven huntress, silver hair, moonstone bow | 27×32 | 24 | 100% | `#8ff0dd` |

All four report `ground: "ok"`, `semiTransparent: 0`, `strayPixels: 0` and `glowMissing: []`.

### Shared fixes, in all four

- **A real 3/4 face:** two 1×2 eyes (lash pixel over a coloured iris), a one-pixel mouth between
  them and soft cheeks. There is no protruding nose and no dark jaw line. Each has its own iris
  colour: teal, blue, amber and jade.
- **The bow is redrawn as a smooth arc.** Runs of 2-1-2-3-3-3-2-1-2 pixels replace the
  hexagonal bracket of 45° steps and one long vertical. It is 3 px wide (contour, wood, contour),
  lit on the upper limb, with gold nocks. The string is dark, so no light pixel sits on the
  silhouette.
- **The bow is held properly.**
  - The hand wraps the limb at its middle, the grip, not the string.
  - The bow is drawn before the arm, so the string passes behind the bracer instead of slicing
    it.
  - Two tangents are gone: the top nock touched the cheek (bow lowered 1 px), and the string sat
    on the shoulder's contour (bow moved 1 px out). There is now clean negative space between body
    and string.
- **The bow arm:** shoulder, bare forearm and leather bracer, lowered to the grip. It is a resting
  hold that turns naturally into a draw.
- **A wider stance:** the back leg is set back by 2 px down its length, like the knight's planted
  stance.
- **Clean surfaces:** no steel pads, no scattered gold spots, no single-pixel noise inside shapes.

### polish-a · Ranger · Greenhood

**Pitch:** the classic Robin-Hood ranger, made iconic: a bright pointed hood whose lit rim frames
the face.

**What changed and why**
- **Hood:** it wraps the whole face. A light `d` rim runs round the opening, with a dark `a`
  inside and a dark fringe, so the face sits in a frame instead of under a cap. The top is a clean
  2:1 slope rising to a peak at the back. My first peak stuck up like a single cat ear.
- **Braid:** it grows out of the dark side lock, crosses the shoulder and ends in a gold tie,
  always on the capelet. On the dark jerkin it disappeared; running down the chest it read as a
  necktie.
- **Capelet:** one step darker than the hood, dagged into two broad points. Four small points
  made a choppy outline-and-leather pattern along the hem.
- **Colour order:** bright hood, dark capelet, leather jerkin, green skirt, brown legs. This
  replaces my first draft's green-from-head-to-knee "snowman".
- **Quiver:** three red-and-white fletchings sit on a gold rim, with the tube running behind the
  capelet. The fletchings are a single outlined cluster, not loose claws.

**Rounds:** dome hood → lit rim and visible quiver → sloped peak and darker capelet → cheek
banding removed, braid shortened, two-point hem, nape sliver closed, tangents fixed.

### polish-b · Ranger · Copper Tail

**Pitch:** the spirited one. Hood down, with a copper ponytail tied in green that falls down her
back as her plume.

**What changed and why**
- **Ponytail:** it does the knight's plume job: one warm flowing shape behind the head,
  complementary to the green. My first ponytail floated as a second lobe, then read as a crescent.
  It is now gathered by a green ribbon at the crown and hugs the head. It parts from the neck below
  the jaw, is shaded darker than the crown so the two hair masses separate, and meets the head in a
  single seam (it was a 2-px dark seam).
- **Colour order, as on the knight:** copper hair, green capelet with gold clasp, leather jerkin
  and skirt, dark green leggings, brown boots. This answers the old "all mid-brown" problem
  directly.
- **Hip quiver:** it hangs from the back of the belt with red-and-white fletching, clear of the
  ponytail, so the two never tangle.
- **Boots:** narrowed to the knight's 4–5 px. My draft's tan boots read as cones.

**Rounds:** floating lobe → crown-tied tail and green ribbon → capelet shortened, colour order →
seam thinned, tangents fixed, stance.

### polish-c · Ranger · Mossmantle

**Pitch:** the serious, heroic warden. A deep olive hood lined in crimson frames her face, and a
long mossy cloak hangs behind.

**What changed and why**
- **Crimson lining:** it is the single accent, echoing the knight's red scarf. A bright `S` rim
  sits over a dark `R` lining around the face opening, then shows again down the cloak's inner
  edge, at the hem corner and as a grip wrap on the bow.
- **Gold clasp** at the throat.
- **Face:** the face shows fully, unlike Thornwarden's slit, with a dark lock framing the cheek
  and amber eyes. The first brown iris vanished into the contour.
- **Cloak:** it is thrown back so the front stays clean. My first draft draped it over the chest
  as a red "X". It hangs from the hood's back contour as one shape. Diagonal fold ridges replace a
  rim light that had turned it into a flat leaf or slab.
- **Quiver:** two arrows with grey goose fletching, as solid two-tone vanes. Three single vanes
  repeated Thornwarden's comb or fork.
- **Removed:** a steel pauldron I tried, which read as a steel ball under the chin, and a lone
  highlight pixel.

**Rounds:** red X on the chest → cloak thrown back → hood row fixed, cloak joined, drape → lone
pixel, mouth placement, iris, fletching, grip wrap, dome highlight, side lock.

### polish-d · Ranger · Silverleaf

**Pitch:** the elven huntress: silver hair, a long pointed ear, a teal leaf mantle and a pale
birch bow whose moonstone glows at night.

**What changed and why**
- **Silhouette:** a cool, light shape, the only one of the four that reads from a distance on the
  dark floor through value rather than hue. The ear breaks the head silhouette upward and back,
  like the plume does, and no other hero in the cast has it.
- **Hair:**
  - It flows straight out of the head with no seam; with a seam it read as a separate blade.
  - It is shaded light-to-dark in clusters. My draft used single-pixel strands of alternating
    tone, which reads as dither, not the knight's hard clusters.
  - It ends at the shoulder blades, clear of the hip quiver.
- **Moonstone:** 2 px above the hand. It is the only colour listed in `glow`, so it lights up
  unlit at night as her signature. On the first draft it was hidden under the hand.

**Rounds:** a wolf-pelt hood came first. At 3× it read as a grey helmet with cat ears or a
duck-bill brim, so I replaced it. Then: elf with a slab of hair → tapered lock, ear moved, stone
moved → seam removed, clusters, lock shortened.

## 5. Notes and concerns

- **These are standing frames only.** The game ranger has 88 frames (idle, walk, shoot and
  walk-while-shooting). Whichever is picked still needs those animations.
  - All four share the same arm, hand, bow and legs as separate parts, which keeps that work
    contained.
  - The lowered bow hold lifts into a horizontal draw.
- **The menu portrait clashes.** `public/img/archer-scene.png` and `archer-figure.png` show a
  stern man in an olive hood. Any of these Lyras will clash with it. Mossmantle (polish-c), in
  olive, is the closest to it.
- **Size:** with the bow, the four measure 27–28 × 32–33 px, close to the current ranger (26×32)
  and a little larger than the knight (21×30). Mossmantle is at the 28-px width limit.
- **Greenhood's lime hood** is the most "Link-like" of the four.
- **Silverleaf makes Lyra an elf.** That may not fit the lore.
- **For recolouring:** the module also exports `PALETTES` (one per id) beside the default list.
  Every key in each palette is used, and no two keys share a colour.
