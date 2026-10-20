# Review: Witch Hunter (Mercy Crane), v1

The rubric and measures are those of `../BASELINE.md` and `../remaster-v5/REVIEW.md`, where the shipped five score 8.5. Coordinates are (x, y) in the 48x48 frame; the feet row is 39.

| Align | Silhouette | Team | Anim | Craft | Palette | Appeal | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|
| 9 | 8 | 8 | 7 | 8 | 7 | 6 | **7.5** (7.57) | ALMOST |

**The build is sound.**
- Her feet are on row 39 in all 22 frames.
- The outline is 100%, with 18 colours and an islandShare of 0.099.
- Night clear is 40.0–44.2% on every frame and bright is 22–23%.
- The hat brim and the crossbow's "T" give her her own silhouette.

**The margin to keep:** the night bar has only about 11 px to spare on f0.

## Must-fix

1. **She reads as a man with a white beard, a pilgrim.**
   - **The cause:** the collar sits directly under a jaw of the same width:
     - collar: z at x 19–27, rows 20–22
     - jaw: x 23–28, row 19
     - Three white bolt tips hang under the collar, at (22,21), (24,22) and (26,24), each with a G pixel below it.
   - **The fix:**
     - Add a neck row of S at (24–26, 20) and start the collar on row 21.
     - Split the collar into two tabs with a '3' notch at x 23–24.
     - Move the bolts lower on the strap (rows 25–29) as G/g heads, not white.
     - Taper the jaw on row 19 to x 24–27.
     - Add a lip pixel at (27,18).
     - Move the emissive w to the hat buckle at (24,10).
2. **The braid never shows, and nothing says "woman."**
   - **The cause:** it's drawn behind the coat. It's hidden in all 8 idle frames and pops in only on walk f9, f10, f13 and f14 and on the recoil f19.
   - **The fix:** draw it over the coat's back, inside the rim: x 19–21, rows 19–26, in a/A. Sway it 1 px a frame after the breath. That also gives the idle its missing motion.
3. **The animation sits below the team's floor.**
   - **The idle holds:**
     - f7→f0 differs by 1 px and f4→f5 by 8. The shipped five never change less than 37 px.
     - Idle upper change is 0.18; theirs is 0.21–0.28.
     - Stagger the coat tails, braid, brim droop and glint so every transition changes 35 px or more.
   - **The release frame (f18) is the attack's weakest change:**
     - It differs from f17 by 108 px; the shipped five's impact frames change 268–653.
     - Its three short parallel streaks at x 38–42, rows 18–23, read as a fork.
     - Make it a 3x3 star at the prod, with a w→G→g streak 10–12 px long along row 21 and the side streaks fanned out.

## Should-fix

- **The hat reads grey:** darken the crown to '3', keeping the '1' rim, and drop it 1 row so she's 34 tall.
- **The crossbow reads as a diamond:** draw the string in g and shorten the prod to ±4.
- **`i_crossbow` reads as a boxed X, not a crossbow,** though it's clearly unlike the Hunting Bow:
  - Redraw it with a long stock from (0,13) to about (9,4).
  - Lay the prod across the front third.
  - Make the string a shallow V to a nut at about (6,7).
- **`i_purifier`:** make its flames tapered tongues, not white blocks.
- **`silverbolt`:** it's fine as it is.

VERDICT: CHANGES
