# Review: paladin/v1, Dame Seraphine

I used the rubric, anchors and measures of `../BASELINE.md` and `../remaster-v5/REVIEW.md`. The shipped five scored 8.5 SHIP.

**Evidence:**
- `review.mjs paladin/v1` (the board and its JSON).
- `shot.mjs paladin/v1`, at the default zoom and at `--zoom=closer`. The stage now wears her sprite, with no errors.
- Gridded zooms of every frame and per-frame pixel dumps.
- Team lineups at 1x and 3x with the remaster-v5 five, by day and at night.
- The icons, built and outlined by the engine, at 1x, 2x and 8x.

Coordinates are (x, y) in the 48x48 frame.

## Scores

| Align | Silhouette | Team | Anim | Craft | Palette | Appeal | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|
| 9 | 7 | 9 | 8 | 7 | 9 | 7 | **8.0** (8.00) | CHANGES |

**What works:**
- **Alignment:** her feet sit on row 39 in all 22 frames. Idle drift is 0.55 px and walk drift 1.85 px.
- **Height:** 35 px, in line with the team's staves. The helm top is 29 px above the feet row.
- **Light and night:** 43% of her pixels are bright (above luma 150), the most on the team, and she's 67% clear of the night grass by `measure.mjs`.
- **Colours:** 22, with pearl lights and lilac shadows, which is a real hue shift.
- **Team:** the ivory and gold is a sixth hue, and she can't be mistaken for the Knight.
- **Attack:** it meets the budget.
  - Raise (f16) and cock back (f17) are the anticipation.
  - The crescent smear is f18 and the blow and burst are f19.
  - The pillar thins on f20 and she recovers on f21.

**What holds her back:**
- **Pose:** she stands passive.
- **Craft:** the cape and the attack's torso are noisy. Her islandShare is 0.119, the highest on the team.
- **Walk:** her two passing frames differ by only 28 px (team minimum 52). In f10 and f14 the lifted foot hides under the flap.

## Must-fix

1. **The hammer reads as a sign or a staff, not a warhammer. This is the silhouette and appeal fix.**
   - In idle and walk (f0–15), the haft runs straight up at x 34–35, rows 12–35.
   - That makes her the team's third hero with a vertical pole held on the right, after the sorcerer and the necromancer.
   - The head (x 31–38, rows 6–11) is a flat pale block of B/D with one gold stripe.
   - **To change:**
     - Tilt the haft 20–30° out, with the head forward and up, or rest it on her shoulder.
     - Give the head weight: about 10 px across, a darker underside and back face (G/R in place of D), and a distinct striking face.
     - Keep a 1-px gap between the head and the helm. They touch at (29–31, 11–12) in f0 and f3.
2. **The cape is speckled and the near side is banded.**
   - The gold hem breaks into steps and specks: f3 (12,28), (12,29), (15–17,29), (13–14,30), and the same pattern in the walk frames.
   - Lone G fold pixels sit on the cream: f0 (15,24) and (16,25); f3 (16,28) and (14,29).
   - Columns x 17–20, rows 23–26, are parallel B / D / G / R stripes, so the near arm never reads.
   - **To change:**
     - Make the hem one continuous 1-px gold line and drop the fold specks.
     - Shape the near arm and gauntlet as one form against the cape.
3. **The arms in the attack are noise.**
   - f16, x 14–31, rows 21–26: the raised arms over the chest are a jumble of single B / D / G / R pixels.
   - f19–20, x 24–31, rows 24–27: the arms reaching forward are four stacked 1-px bands (B, D, G, R).
   - **To change:** redraw them as two clean arm shapes with 2-px clusters, and keep the sun visible where it can be.

## Icons

**i_smite:** good. It reads as a hammer under light at 1x and 2x, and its weight sits well among the shipped icons.

**i_judgement:** two problems.
- Its header comment promises "three pillars coming down", but only the centre pillar is drawn.
- The scattered single-pixel Y rays get outlined one by one and read as speckle, like a dandelion, at 1x.
- Draw the three pillars instead of the loose rays (not a must-fix).

**brand:** fine. It's a clean gold diamond-sun and matches the sun on her tabard. A second frame for a twinkle would be optional polish.

**Minor:**
- The z white (#f4f4e4) sits 4.1 RGB from the tabard's 9 (#f6f1e6), a near-duplicate pair.
- The smallest idle transition is 28 px (team: 37 or more).
- In the lab stage, before `defs.js` was updated at 22:37, the HUD showed Consecration's icon for Smite. That was timing, not the art.

VERDICT: CHANGES
