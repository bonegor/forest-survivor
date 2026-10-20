# Review: berserker/v1 (Ulfric)

Scored with the rubric and strictness of `../BASELINE.md` and `../remaster-v5/REVIEW.md`, where the shipped five scored 8.5 SHIP. Coordinates are (x, y) in the 48x48 frame.

| Hero | Align | Silhouette | Team | Anim | Craft | Palette | Appeal | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **berserker/v1** | 9 | 7 | 7 | 8 | 7 | 7 | 7 | **7.5** (7.43) | **CHANGES** |

**Strengths to keep in v2:**
- Feet on row 39 in every idle and walk frame.
- Night clear 72%, the best on the team.
- The 8-frame idle and the 6-frame leap-and-chop.
- `i_twinaxes` is clearly distinct from `i_axe`.

## Must-fix (top 3)

1. **He leaves the frame and is far too wide.**
   - He's 44–46 px wide idle and 39–48 px walking; the rest of the team is 26–37.
   - Colour is cut at the frame edge on f11 (47,22–23), f12 (47,22–25), f13 (47,23–24), f18 (47,9–10) and f19 (47,15–27).
   - Raise the axes into a V: idle `nearAng` about −115° and `farAng` about −70°, with the fists 2–3 px higher.
   - Target: a box ≤ 40 px, with nothing on x 0–1, x 46–47 or row 0.
2. **The wolf doesn't read, and the axes float.**
   - The ears are one row high at (23–24,7) and (27–29,7). Make them 3-row triangles with a gap.
   - The snout on rows 11–13 out to x 34 reads as a cap's brim, with an ink blob at (33–36,11–14). Shorten it, droop it, and give it a real nose.
   - The fangs at (26,14) and (30,14) sit over the eyes at (26,15) and (29,15). Move them to the snout's edge.
   - Give the axes wooden hafts, at least 4 px between fist and head (now 2–3 px of grey F/h at (9–11,23–26)), with a red grip.
3. **The body melts into the crossroads dirt.**
   - The skin shadow S #b8714f and the lit leather L #ad6d42 are 17.5 RGB apart. Separate them by value: no skin key within 30 RGB of a leather key.
   - Paint the woad as stripes across the chest and face. Today it's two 3-px armbands.
   - Also: `i_bloodstorm` reads as a "⊘" sign at 1x. Break its ring into two crescents.

VERDICT: CHANGES
