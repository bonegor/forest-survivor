# Witch Hunter (Mercy Crane), v1

Source: `witchhunter.js`, with `kit-witchhunter.js` (an unchanged copy of the remaster-v5 kit). Build:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/newheroes-oct20/witchhunter.js`

Build line: **35 px tall · 22 frames (idle 8, walk 8, attack 6) · 18 colours · outline 100% · night 42% · lines up cleanly.**

## Design
- **Hat (the silhouette key):** a capotain. The crown runs rows 6–11 (8 px wide) with a dark band and a 3×2 silver buckle. The brim is 18 px wide on rows 12–13 and droops a pixel at the front, with a lit top edge (rim tone 1).
- **Head:** pale face in the brim's shadow, auburn brows drawn down over one eye, a grim mouth, and auburn hair with a braid down her back that sways.
- **Coat:** a blue-black frock coat in a four-tone slate ramp (1 #9aa5c0 rim, 2 #5d6889 lit plane, 3 #33384f, 4 #212436). The skirt is split at the back into two tails.
- **Collar and kit:** a white falling-band collar, a leather bandolier across the chest with three silver bolts (white tips, emissive), and a belt with a silver buckle.
- **Boots:** thigh-high, oxblood leather (#9a5a44 / #6e3a34), with tan cuffs.
- **Crossbow:** walnut stock, a windlass drum on the butt, and a steel prod with recurved tips. The string is drawn back to the nut in a pale V. A silver bolt with a white broadhead sits on the stock.
- **Lit rim:** a slate rim (tone 1) runs down every top-left edge of the coat, hat and near arm.
- **Ranger contrast:** the hat brim, the horizontal stock with its prod "T" and the blue-black/white/silver palette keep her from reading as Lyra (green hood, diagonal bow).

## Animation
- **Idle:** the crossbow is levelled at the hip. The breath lifts the chest, head and hat on f3–5, and the hands follow a frame later. The coat tails and braid sway, and a glint runs down the bolt's shaft (f0–5).
- **Walk:** the kit's GAIT from one hip column. Feet sit on row 39 in every frame. The crossbow bobs ±2° against the stride, the head dips a frame late, and the tails stream back 1–2 px.
- **Attack** (the attack list's index → absolute frame):
  - 0 (f16): she raises the crossbow.
  - 1 (f17): she aims it at the shoulder, leaning in.
  - **2 (f18): the release.** The bolt is gone, the prod springs flat, the string snaps straight, and a white burst throws three streaks forward.
  - 3 (f19): recoil. The nose kicks up 12°, the body rocks back and the hat slips a pixel.
  - 4 (f20): she lowers the crossbow, nose down, and her near hand turns the windlass crank. The string is half spanned.
  - 5 (f21): spanned, with a new bolt laid on.
- **attackRelease: 2.** attackFps is 12. emissive is `w`: the bolt tips and the glints.

## Measures (my preview script; NOTES-v5 definitions)
- **Night 5+:** f0 42.1%. The worst idle or walk frame is 41.4% (f3 and f5), and the walk runs 41.9–44.2%. The worst attack frame is f20 at 40.0%. Bar: 40%.
- **Bright (luma > 150):** 22.3–23.5% in the idle and walk. The attack's low is f19 at 18.9% (no bolt, recoil). Bar: 20%.
- **islandShare:** 0.098, under the 0.12 warning.

## Weapon art: `public/js/art/hero-witchhunter-items.js`
- **`i_crossbow`:** the crossbow seen from above, turned 45° to point up and right: a walnut stock, a wide steel prod arc (N body, G front edge, g curled tips), a pale string V, a silver bolt and a white broadhead. It doesn't share the Hunting Bow's layout (side view: a brown arc with a horizontal red-banded arrow).
- **`i_purifier`:** the same crossbow with a repeating magazine box on the stock and a white-hot string, wreathed in four tongues of white-silver fire (G/z/w). emissive is `wzG`.
- **`silverbolt`:** 11×3, pointing right. White fletching, a silver shaft, a white broadhead with barbs, and an emissive tip.
- **Render:** the scratchpad script `heroes/witchhunter/items.mjs`. It shows each icon outlined, at 8x and 1x, beside i_bow, i_stormstring and arrow.

## Notes
- **The lab stage can't wear this class.** `stage.js` wears only `HERO_ROLES` (the five classes), so `shot.mjs witchhunter/v1` shows the Knight stand-in.
  - The closer shots were taken with a scratchpad copy of shot.mjs (`heroes/witchhunter/shot-as.mjs`), which plays the Ranger wearing `lab:witchhunter/v1`.
  - So the fight shot fires the Ranger's arrows.
- **`build.mjs` fails if any frame has no emissive pixel**, because keepColors returns null.
  - The bandolier's white bolt tips keep a `w` pixel in every frame.
  - Keep that in mind before removing them.

## Unsure
- **The Purifier's fire** reads as white flame masses at 8x, but at 1x it's mostly "a whiter crossbow".
- **The prod's lower limb at the hip** sits over the front thigh. It reads at 1x in the game, but at 4x it's busy.
- **The face is large and pale under the brim.** It reads as grim at 1x; at zoom it's a touch boyish.
