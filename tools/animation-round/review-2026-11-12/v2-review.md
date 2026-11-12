# Restrained v2 motion review

The user rejected v1's leg movement as excessive. V1 is retained as an immutable comparison under `tools/animation-round/variants/v1/`; v2 is a separate proposal. The earlier review established connectivity, complete equipment, source chronology and state selection, but overstated the quality of the resulting motion. Those checks did not adequately challenge leg proportions and the impression at gameplay speed.

## Diagnosis and directions to the drawing pair

The grounded v1 rig sends both ankles along a shared horizontal track while its leg roots remain 2.5–6.5 native pixels apart. At crossed extremes, the hip-to-ankle distance exceeds the rig's inferred source leg length by 27–78%. The knee solver silently scales both segment lengths. These roots were placed at the tops of visible thighs rather than consistently under the actual pelvis, so the ratio diagnoses a rig/attachment problem rather than measuring a character's true anatomy. Footman, Praetorian, Paladin and Knight are the strongest diagnostic cases. Correct the hidden pelvis attachment and meaningful source lengths, use modest near/far track offsets, and keep the visible approved upper silhouette intact.

| Grounded hero | Maximum v1 hip-to-ankle span / inferred source leg length |
| --- | ---: |
| Knight | 1.57 |
| Ranger | 1.45 |
| Berserker | 1.45 |
| Witch Hunter | 1.27 |
| Footman | 1.78 |
| Marksman | 1.43 |
| Templar | 1.30 |
| Trailblazer | 1.50 |
| Praetorian | 1.63 |
| Boltguard | 1.32 |
| Swordbearer | 1.41 |
| Paladin | 1.60 |
| Seraph | 1.51 |

The reviewer directed the grounded artist to correct those attachments, avoid repeated length changes, keep the returning foot around 0.7–1.1 native pixels above the floor, reduce knee deflection and boot roll, and check the transition from rest as well as support → passing → contact. Shorter reach alone is insufficient.

The six robed walkers were directed toward low foot clearance, quiet hems and a stable upper body. An initial 0.30–0.34-second proposal was returned for a less rapid 0.37–0.40-second comparison: with unchanged travel speed and half-cycle support, decreasing stride necessarily increases the number of steps per second. A mathematically planted foot can still look like hurried shuffling. The revised candidate must be judged at its actual clock. Shadow and Wraith retain their existing floating travel, without introducing legs or changing their accepted identity.

## Review method and limits

Use real Game captures at native cadence, retaining the existing camera, ground, player acceleration, lighting and sprite selector. Compare the same timed right, mirrored-left, diagonal, stop/restart and moving-crypt scenes. Inspect contact continuity, restrained knee/boot arcs, silhouette stability, and whether the foot's backwards sweep agrees with the passing ground. Complete source frames expose details that timed footage can skip; connectivity tests remain only a regression guard.

The current game has two side-facing travel cycles, driven by total movement distance. Diagonal travel can preserve ground-distance cadence and a coherent pose, but those same side-facing frames cannot lock a planted foot in both world axes. This v2 proposal stays within that existing facing model rather than claiming new directional foot locking.

## Final reviewer-directed iterations

The first grounded v2 candidate repaired the pelvis attachment and reduced foot clearance, knee excursion and boot roll. At gameplay timing, Footman, Paladin and Praetorian still read as hurried shuffling. The reviewer returned those three for a slightly longer, slower step while retaining the low arc and corrected anatomy. Final cycle durations are 0.403323 seconds for Footman and Paladin and 0.410399 seconds for Praetorian. Their reach remains about 18–20% below v1. The other ten grounded candidates were retained.

Mage and Arcanist initially had hem movement below the nearest-neighbour rounding threshold, leaving their visible robes almost static despite alternating feet. The reviewer requested one bounded hem revision: amplitude 0.78 and lift 0.72, anchored at the waist, without changing the feet, clock, staff or upper body. The final native capture shows the hem exchange. Changes remain within source rows 51–54 at the hem; the other four robed candidates were retained.

## Final per-hero judgments

These are judgments of a restrained comparison proposal. The user has not accepted v2 as the replacement for v1. The revised walkers read as compact jogs at the existing game speed, with about 4.8–5.9 steps per second. They should not be described as a slow natural stroll or as perfect animation.

| Hero | Final review judgment |
| --- | --- |
| Knight | Corrected hidden hip and low boot return remove the conspicuous long-leg swing. Retain the proposed compact jog; cadence remains brisk. |
| Ranger (`archer`) | Narrower alternating support and restrained knee arc remain coherent through diagonal travel. The existing side-facing diagonal limitation still applies. |
| Berserker | Low clearance and a stable upper silhouette reduce flailing. Native action can briefly override ordinary walking during the existing dash; that is not a gait seam. |
| Witch Hunter | Low returning boot and restrained knee keep the coat/equipment silhouette readable. Retain as proposed. |
| Footman | Final slower revision is less hurried. Corrected pelvis and both moving thighs avoid the previous stretched legs and stationary thigh stump; moving crypt thrust remains joined. |
| Marksman | Mirrored native cycle preserves equipment and a small, regular foot exchange. Retain as proposed; still a quick travel cadence. |
| Templar | Corrected attachment and restrained step remain readable under the hanging garment, including diagonal travel. Retain as proposed. |
| Trailblazer | Mirrored cycle and moving crypt attack retain the bow and two low stepping legs without the previous erasure seam. Retain as proposed. |
| Praetorian | Final slower revision reduces the hurried shuffle. Heavy silhouette stays steady without the earlier sharp body jab; retain as proposed. |
| Boltguard | Mirrored cycle has a compact support-to-return exchange and stable equipment. Retain as proposed. |
| Swordbearer | Short, low boot exchange preserves the weapon/leg separation. Retain as proposed. |
| Paladin | Final slower revision reads calmer under the large upper silhouette. Moving crypt attack retains the garment and coherent legs. Retain as proposed. |
| Seraph | Low steps remain readable under the cape; moving crypt attack preserves garment and equipment. Retain as proposed. |
| Mage | Final hem revision is visible in native travel and restart. Staff and torso remain stable. The long robe still hides much of the foot exchange, so the walk is intentionally subtle. |
| Necromancer | Low boot exchange and quiet robe remain coherent in mirrored travel. Dark colours make the leg alternation less prominent than the visible-leg heroes. |
| Druid | Low alternating boots are clear, without the former high knee/boot throw. Retain the 0.37-second proposal; it is still a compact jog. |
| Thornkeeper | Low boot exchange remains coherent through diagonal travel; foliage and equipment stay stable. Retain as proposed. |
| Gravebinder | Greaves alternate without breaking away from the robe, and the staff-layer repair remains intact. Retain as proposed. |
| Arcanist | Final hem exchange is visible in mirrored native travel. Moving crypt attack returns cleanly to the low travel cycle; long robe coverage still limits visible leg mechanics. |
| Shadow (`rogue`) | Unchanged floating control. V1/v2 animation pixels and timing match; only revision metadata differs. No new walking claim. |
| Wraith | Unchanged floating control. V1/v2 animation pixels and timing match; only revision metadata differs. No new walking claim. |

No additional material motion defect was found in the final reviewed candidates that requires another redraw before presenting this comparison. That is a bounded review result, not an assertion that all aesthetic preferences are settled. The shorter reach, lower clearance and corrected attachment are visible improvements over the rejected v1 movement. The remaining quick cadence, robe occlusion and two-facing diagonal approximation are explicit limits of this proposal.

## Evidence and scope

All paths below are relative to the repository root. Final authoritative Game captures contain 450 samples per changed hero at 30 fps, using the real Game simulation: right, left, diagonal, stop, restart, slow travel, moving field combat, crypt idle, and moving manual crypt attack. Across 19 changed heroes that is 8,550 samples, with zero recorded sprite clipping. Source chronology supplies all 16 poses plus return-to-zero; timed Game sampling alone can skip a source pose. Review combined complete source cycles for every changed hero with chronological native travel sequences across the roster and targeted mirrored, diagonal, stop/restart and moving crypt sequences. Connectivity and matrix tests cover additional combinations but do not substitute for visual judgment.

| Evidence | Authoritative folder |
| --- | --- |
| Preserved v1 sheets | `tools/animation-round/variants/v1/` |
| Proposed v2 sheets | `tools/animation-round/variants/v2/` |
| Matched v1 baseline: Footman, Praetorian, Paladin, Druid, Mage | `output/animation-round/2026-11-12-v1-step-review/` |
| Final ten grounded heroes excluding Footman, Praetorian, Paladin | `output/animation-round/2026-11-12-v2-grounded-game/` |
| Final Footman, Praetorian, Paladin; supersedes their first capture | `output/animation-round/2026-11-12-v2-heavy-final/` |
| Final Necromancer, Druid, Thornkeeper, Gravebinder | `output/animation-round/2026-11-12-v2-robed-game/` |
| Final Mage, Arcanist; supersedes their first capture | `output/animation-round/2026-11-12-v2-robed-final/` |
| Grounded source cycles and revised heavy-trio measurements | `output/animation-round/grounded-v2/candidate2/` |
| Four retained robed source cycles | `output/animation-round/2026-11-12-robed-v2-r2/` |
| Final Mage/Arcanist source cycles and changed-pixel bounds | `output/animation-round/2026-11-12-robed-v2-r3/` |

For the final two heroes, the reviewer inspected Mage's full native right-travel and restart sequences and Arcanist's full mirrored travel and moving-crypt-attack sequence after the hem revision, alongside their complete revised source cycles. No upper-body drift, broken staff, new isolated foot, or abrupt return to travel was observed. These are the final captures, not the earlier near-static-hem candidates.

Matched elapsed-time comparison clips are `output/animation-round/2026-11-12-v2-heavy-comparison/{footman,praetorian,paladin}-v1-v2.gif`, `output/animation-round/2026-11-12-v2-robed-comparison/druid-v1-v2.gif`, and `output/animation-round/2026-11-12-v2-robed-final-comparison/mage-v1-v2.gif`. Each retains 378 samples over 12.6 seconds across the common movement scenes. Labels distinguish preserved v1 from proposed v2; scene cuts are not cycle seams. PNG samples are the authoritative colour/alpha source, while GIF delays use cumulative rounding to preserve elapsed time.

`measure-stance.mjs` cross-checks each sampled source ankle target against actual player travel. Typical horizontal support-target variation is about 0.7–1.5 native pixels from pose quantisation, not zero. This is target tracking rather than visual sole detection, and it makes no claim of perfect ground locking. `package-v2-comparison.py` records timing and source hashes beside the comparison clips so future reviews can reproduce the same evidence.
