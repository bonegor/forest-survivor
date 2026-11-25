# Independent motion review — 12 November 2026

The exact pre-edit production sheets were copied to the ignored `before-sheets/` folder before drawing began. Native Game captures, source-pose contact sheets and loop returns are under `output/animation-round/2026-11-12-before/`. All 21 selected heroes use 80×64 canvases anchored at y56. The old five-hero art reference is historical; the production roster is `public/assets/heroes-approved/`.

This review is paired with the grounded drawing agent for Knight, Ranger, Berserker, Witch Hunter, Footman, Marksman, Templar, Trailblazer, Praetorian, Boltguard, Swordbearer, Paladin and Seraph; and with the robed/floating drawing agent for Sorcerer, Shadow, Necromancer, Druid, Thornkeeper, Wraith, Gravebinder and Arcanist. Paladin and Seraph moved to the articulated armour workflow because their knees and greaves are visible.

## Baseline findings

Every chronological source gait and its last-to-first transition was inspected on a fixed light background at 4× native scale. The native Game capture also covers idle, right travel, mirrored left travel and diagonal travel. These findings are not an assertion that single contact sheets establish real-time cadence.

| Hero | Whole-cycle defect and revision direction |
| --- | --- |
| Knight | The newer sixteen poses bunch the legs through phases 0–5 and 11–15, then open sharply through 6–10. Distribute the planted sweep and returning knee more evenly; retain the approved helmet, shield and low sword. |
| Ranger | Boots nearly overlap in phases 1/2, then jump to a stretched return in 3; 7→0 snaps wide. Restore connected passing/reach phases; preserve bow and hair identity. |
| Sorcerer | Feet shuffle beneath an almost stationary robe while the flame is more active than the gait. Add hidden-leg weight and hem follow-through; keep the full staff and hand focus. |
| Shadow | Four travelling poses switch cloth silhouette coarsely, especially 3→0. Author a continuous travelling wave around a stable hood, eye and dagger, with a visible flight gap. |
| Necromancer | Narrow boot positions repeat in 1/2 and 5/6; straight hanging robe reads as sliding. Alternate body support and robe drape while preserving book and hands. |
| Paladin | Near-duplicate contacts precede isolated high-knee poses, with an abrupt 7→0 opening. Rebuild chronological knee/ankle motion while preserving sword and shield. |
| Druid | Robe and long staff hide boot changes, but the heel crosses abruptly through 1→2→3. Keep the complete foreground staff while adding robe weight and connected feet. |
| Berserker | One high-knee pose per half-cycle and an isolated long stride create a kicking rhythm. Add whole-leg intermediates and strong support; retain both axe grips. |
| Witch Hunter | Repeated narrow contacts lead to one deep knee bend; the coat barely follows the hips. Add continuous foot return and delayed coat motion around the held crossbow. |
| Footman | Wide contact, two bunched poses, then a deep bend recur in each half-cycle. Rebuild support/passing/reach while protecting the low sword and reconstructed greaves. |
| Marksman | Cramped supports at 1/2 and 5/6 precede high returns at 3/7. Improve phase distribution and coat follow-through; preserve supported crossbow and hair. |
| Templar | The tabard hides the same uneven leg timing. Maintain visible front/rear greave separation and a connected tabard through a complete stride. |
| Trailblazer | Boot flicker at 2/3 and 6/7, plus a wide 7→0 snap. Protect the bow shaft beside the ankle while allowing the cape to lag the hip. |
| Thornkeeper | The floor-level staff is stable but boots switch underneath it; 7→0 opens abruptly and foliage moves more than body weight. Rebuild support and return with intact staff ownership. |
| Wraith | Vertical hover is readable, but the rear cloak is stiff and the 7→0 bottom hem drops sharply. Use continuous trailing cloth with phase lag; no stepping. |
| Gravebinder | Hidden feet and nearly rigid robe lack alternating support; the lower silhouette hops through 2/3 and 6/7. Add coherent hem/hip weight while preserving the staff grip. |
| Arcanist | Hat and flame carry most of the movement while toes shuffle only a few pixels. Establish convincing lower-body transfer beneath the robe before adding more hat motion. |
| Praetorian | Wide/bunched/deep-bend sequencing repeats with insufficient intermediate geometry. Preserve the full sword and shield while articulating a grounded heavy stride. |
| Seraph | Near-closing legs repeat before one high knee, with a nearly rigid cape. Add leg intermediates and cape lag without changing sword/shield registration. |
| Boltguard | Narrow repeated support and isolated high return read as a small shuffle. Add coherent planted sweep and coat follow-through; keep the heavy crossbow supported. |
| Swordbearer | Shares the armoured wide/bunched/deep-bend sequence. Improve whole-leg chronology and weight; preserve the low blade and broad armour silhouette. |

## Review requirements for revised art

Review every new phase and the return to phase zero, at native scale and enlarged on contrasting grounds. Check hip→knee→ankle connections, alternating support, recovery clearance, equipment grips and complete shafts/blades. Preserve each loop's intended elapsed time when its pose count changes. Retain explicit floating motion for Shadow/Wraith. Verify the actual Game clock in both facings and diagonally, idle/stop/restart and manual crypt attacks. Test the complete attack-by-gait combinations separately: passing a connectivity scan does not prove a sword or staff has retained its length.

## Revised source review

All 21 revised source cycles passed independent chronological review: sixteen authored poses per hero, including the last-to-first transition. The grounded drawing went through several iterations before approval. The first submitted version exposed missing shin/boot joins in Templar, Seraph and Swordbearer; stale original leg-outline fragments remained in the holy heroes; synthetic shin caps extended under several soles; and Praetorian's compression was a one-frame jab. Those defects were returned to the drawing agent with exact pose numbers, pixel coordinates and enlarged contrasting-background evidence.

The final grounded source keeps newly exposed knees and shins opaque underneath translucent foreground edges, removes original leg ownership before articulating replacements, supplies coherent boots, retains a consistent sole line, and spreads compression across several adjacent phases. Every final grounded pose was re-inspected. Praetorian's last-to-first pixel change fell from 593 to 58 after its bob correction; that diagnostic corroborates the visibly cleaner transition but is not the criterion for aesthetic approval.

The six robed walkers preserve rigid equipment and layered hems while the source-owned feet travel behind the garment. Detailed 8× inspection confirmed that Gravebinder's thin bone greave remains attached and that Druid/Thornkeeper's calf tops remain under their garments. A neutral detached Thornkeeper export speck was removed. Shadow and Wraith now use sixteen coherent travel phases with stable faces/equipment, continuous cloth waves and an actual hover gap; they have no stepping sequence.

The independent PNG diagnostic examined all 336 final gait poses: sixteen unique images per hero, no detached lower component of three or more pixels at alpha 128, and complete registered canvases. Source contacts and detailed inspections, rather than this numeric check alone, establish the approval. Evidence is in `output/animation-round/grounded-drawing/v6/` and `output/animation-round/2026-11-12-robed-candidate/`. Grounded timings were subsequently calibrated to the actual per-hero default speed without changing pose geometry.

## Runtime composition review

Native Game captures of the eight robed/spectral heroes cover idle, right/left/diagonal movement, nearby field combat, crypt idle, and manual crypt attacks. Source and gameplay walks remain coherent, preserve equipment grips, and use the actual distance-driven animation clock. Automatic weapon effects remain visible without replacing the hero's idle/walk art on the field.

The first integration exposed a separate Gravebinder moving-attack defect: a broad resting-staff mask cut through the new gait's boot. The repair removes the resting staff from its source-owned layer before drawing feet and filters stationary-foot fringes out of the active staff mask. All 96 Gravebinder attack/gait combinations were inspected after repair; the complete staff and connected boot survive. The six robed heroes were recaptured in `output/animation-round/2026-11-12-robed-crypt-final/`, and every complete moving-left attack/recovery/gait sequence was inspected. Those final crypt clips supersede the earlier robed crypt footage. The original world locomotion and spectral attacks remain authoritative in `output/animation-round/2026-11-12-robed-game/`.

The grounded integration additionally revealed that a legs-only lower layer could shorten capes, coats and tabards below the composition seam. This was reported separately from the disconnected Footman/Trailblazer regression because connectivity tests cannot detect missing cloth. Source-owned garment layers now preserve those lengths while excluding resting weapons. Trailblazer no longer applies an old-bow eraser to its clean lower layer. Footman's moving thrust initially gained a connected far thigh but retained a cropped original near thigh above the seam, producing a third-leg stump. Independent silhouette review rejected that result despite passing connectivity tests. The final repair removes the explicit old-thigh ownership and connects both attack-pelvis anchors into the travelling hips. All 128 Footman attack/gait combinations and the enlarged three-way source/attack/composite comparison were inspected after this correction.

Final grounded matrix review covers every hero through its complete attack chronology, sampling both gait halves and checking complete weapons, grips, garments and recovery. The thirteen final native moving-left crypt sequences were then inspected chronologically through attack, recovery and continuing gait. The final Footman recapture supersedes its earlier take. Each hero's complete native field walk sequence was also inspected, including loop returns; additional mirrored and diagonal sequences corroborate the source registration. No remaining visible defect was found in this scope.

## Final per-hero verdict

All rows passed source-cycle and native Game sequence review. This records specific visual judgments rather than substituting the passing regression suite for art review.

| Hero | Final movement and composition verdict |
| --- | --- |
| Knight | Even alternating reach, support and knee return; steady shield/low blade; raised sword and recovery retain a connected moving lower body. |
| Ranger | Clear passing feet and alternating stride, preserved hair/bow silhouette; full bow draw/release remains joined while travelling. |
| Sorcerer | Alternating shoes and modest hem transfer beneath a stable hat/staff; complete staff survives moving casts. |
| Shadow | Continuous travelling hover with trailing cloth and stable eye/dagger; resting hover and attack remain distinct. |
| Necromancer | Connected feet transfer weight beneath the robe without disrupting the book or casting hand. |
| Paladin | Continuous greaves and sole contacts; sword/shield and the entire tabard survive attack and recovery. |
| Druid | Leg return stays behind the robe; foliage and full staff remain registered through walk and moving cast. |
| Berserker | Broader leg chronology replaces isolated kicks; both axe grips remain stable through locomotion and the distinct manual attack. |
| Witch Hunter | Connected passing legs and complete coat; supported crossbow recoil does not remove the coat hem. |
| Footman | Connected armour stride; corrected thrust has exactly two travelling legs, no old-thigh stump and an intact blade/shield. |
| Marksman | Even travelling support with a complete coat and supported crossbow through recoil/recovery. |
| Templar | Clear alternating greaves under the full tabard; previously detached boots remain joined in the final walk and attacks. |
| Trailblazer | Full cape and clean alternating boot return; active bow no longer cuts the moving boot. |
| Thornkeeper | Hem/feet stay coherent under foliage; full staff and calf occlusion remain intact without the detached export speck. |
| Wraith | Continuous cloth-wave travel and clear hover gap; no artificial step or coarse final-to-first drop. |
| Gravebinder | Thin bone greaves remain attached beneath the robe; repaired staff composition preserves feet through every cast phase. |
| Arcanist | Readable foot/hem transfer beneath a stable hat and flame; casting keeps the complete shaft and lower silhouette. |
| Praetorian | Compression holds across neighbouring phases rather than jabbing for one frame; shield, sword, plume and cape remain coherent. |
| Seraph | Clean greaves and complete trailing cape, with no leftover old-leg fragment; diagonal travel and moving sword recovery remain joined. |
| Boltguard | Coherent planted sweep and passing leg, retained coat and two-handed crossbow grip during recoil. |
| Swordbearer | Heavy alternating stride with connected boots, full sword and shield; no missing boot in passing/recovery. |

## Evidence packaging

The baseline contains 3,024 native Game PNGs (144 samples for each of 21 heroes), with zero clipping and complete simulated idle/gait index coverage. Source-phase contacts accompany the 20 fps footage because a timed recording may skip a short source pose.

`package-final-board.py` selects the latest capture for each individual hero/scene. Repaired crypt-only takes therefore replace old crypt clips without discarding already validated field footage. It preserves each source clock, uses only 2× nearest-neighbour native crops, distributes GIF centisecond rounding, and writes per-scene capture provenance. Scene transitions and the recording loop are intentional cuts; they are not gait seams. Native PNGs remain the authoritative colour/alpha evidence.

The final combined board and individual four-scene clips are in `output/animation-round/2026-11-12-final-game/`. Authoritative input selection, in override order:

1. `2026-11-12-robed-game`: eight robed/spectral heroes' field footage and the two spectral heroes' crypt footage.
2. `2026-11-12-robed-crypt-final`: all three crypt scenes for Sorcerer, Necromancer, Druid, Thornkeeper, Gravebinder and Arcanist.
3. `2026-11-12-grounded-field-final`: all seven field scenes for thirteen grounded heroes.
4. `2026-11-12-grounded-crypt-final`: all three crypt scenes for twelve grounded heroes, excluding superseded Footman footage.
5. `2026-11-12-footman-crypt-final`: all three final Footman crypt scenes after the thigh silhouette repair.

Together these select 7,224 native Game samples across ten scenes for 21 heroes, with zero recorded sprite clipping. `evidence-index.json` records the precise input and source fingerprint for each selected scene. The four-scene board presents field idle, walk, crypt idle and manual attack at the captured clock; per-phase GIFs/contact sequences in the source folders also expose mirrored travel, diagonal movement, field combat and moving crypt attacks. The original obsolete crypt takes remain only as repair history.

Review limits: the saved gameplay footage is 20 fps from a 60 Hz simulation; brief poses are therefore validated separately in complete chronological source sheets and attack/gait matrices. GIF palette conversion is for convenient playback, not pixel-colour comparison. The final verdict concerns the existing approved character designs, their revised full locomotion cycles, and their gameplay composition; it does not claim every possible gameplay encounter or equipment effect was visually inspected.
