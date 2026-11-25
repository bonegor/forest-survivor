# Forest Survivor — revised casino-style reward presentation review

Reviewed: 17 October 2026\
Baseline: `forest-survivor`, commit `0bdb0c6`\
Companion: [Gameplay review](gameplay-review.md)

## Assessment

The game already has uncertain loot, equipment rarity, evolutions and meaningful progression rewards. Its largest presentation problem is that rewards can be credited before they are revealed, while overlapping screens freeze the effects intended to celebrate them.

Make the reward sequence coherent, distinguish exceptional rewards from routine ones, and show what progress enables next. These changes are supported more strongly than adding larger multipliers, longer reveals or more flashes.

This consolidates and revises `casino-opus.md` and `casino-fable.md` from 16 October. It retains their useful observations, corrects outdated claims, and removes duplicate recommendations. Their numeric ratings are subjective impressions without a shared rubric; they are not measured retention scores.

The comparison used source inspection, live menu/chest/fury/victory checks in an isolated debug save, and targeted runtime reproductions. The 55 relevant existing tests passed. Controlled reward states establish presentation behaviour, not normal reward frequency or the effect on player retention.

## Confirmed findings

### Rewards appear before the chest reveals them

`ChestOverlay` calls `rollChest()` in its constructor. That immediately applies evolutions, upgrades and gold. In the live check, Excalibur and the new gold total were already visible in the HUD while the chest remained closed and no reward had been revealed.

The review's core observation is correct. The suspense is undermined by the interface announcing the result ahead of the reveal.

### Celebration effects freeze behind reward screens

An evolution sets `whiteFlash` to 0.5. Its fade is updated by `Game.update()`, which the screen does not call while an overlay is open. In a controlled check, the flash was still 0.5 after four seconds of chest presentation, leaving a grey wash under the reveal.

A level-up also interrupted an active slow-motion celebration immediately. Its slow-motion and flash values remained unchanged through another second of overlay rendering. This confirms the concern about reward screens cutting across a kill celebration.

### Results rush the gold tally

For ordinary totals, the current increment is approximately `total × dt × 1.5`, completing the tally in about two-thirds of a second. The original timing criticism is supported by the implementation. Very small totals can complete even faster.

### Reward hierarchy is only partly expressed

The chest already shakes, opens, emits rays and coins, and displays an EVOLUTION banner. However, evolutions are listed first, ordinary entries use uniform reveal spacing, and several important rewards reuse sounds. The opportunity is to improve ordering and recognition, rather than assuming no celebration exists.

## Corrections and qualifications

| Earlier claim or proposal | Revised finding |
| --- | --- |
| A win looks the same as a death. | Victory already has dawn lighting, a different heading, colours and music. The shared results structure can still make it feel less distinctive than it should. |
| Combo never breaks. | It already has a two-second expiry. Dense automatic kills make it practically continuous late in a run. |
| Pickups and gear have no reward lighting. | Pickups already glow, and rarer gear casts coloured light. Improve distinction and visibility before adding duplicate effects. |
| The fury orb's percentage must be wrong. | The percentage and fill follow the fury value. A claim that 88% resembles 55% is a contrast/readability judgement, not a reproduced calculation defect. |
| Signal every chest as 1, 3 or 5 rewards. | Use the actual rolled entry count. Evolution consumes reward budget differently; a boss evolution chest can display two or four entries. |
| Send players directly back into another run. | The current design deliberately provides one route back to camp. Improve the next decision there rather than restoring the removed Try Again path. |
| More reward effects will improve retention. | This is a hypothesis. Test recognition, interruption cost and replay interest. |

## Reward hierarchy

| Event | Presentation target |
| --- | --- |
| Ordinary damage, gems and coins | Immediate, brief and readable. No modal interruption. |
| Routine level-up | A quick choice with clear consequences. Preserve fast selection and ALWAYS. |
| Champion, chest or notable gear | A recognisable cue and a short reward sequence. |
| Evolution, Legendary gear or genuine personal best | Distinct identity, a stronger sound and a brief optional ceremony. |
| Dawn or final dungeon victory | A clear ending that gives the accomplishment room to land. |

Routine events must remain lightweight as their frequency increases. Players should be able to skip repeated presentation without losing or rerolling a reward.

## Priority 1 — repair reward sequencing

### 1. Coordinate celebrations and overlays

Use a presentation timer for flashes, rays and other effects that need to finish while gameplay is paused. Coordinate boss/lord death, level-up, chest and gear screens so a newly earned choice does not trap a flash or bury the kill moment.

Do not delay a choice by leaving the player exposed to unavoidable damage. Keep the current protection of paused decisions while allowing visual effects to finish.

Acceptance:
- A boss or lord celebration remains readable when the kill also grants a level.
- Flashes fade normally while an overlay is open.
- Several queued rewards resolve predictably and can be skipped or collected once each.
- Input held during combat cannot accidentally select a reward.

### 2. Align the chest reveal with the HUD

Roll the reward once. Either stage its application or temporarily display the pre-reward HUD until the reveal catches up. The implementation must preserve the rolled outcome and award everything exactly once.

Reveal ordinary rewards before the evolution in presentation order. Preserve any application dependencies separately: sorting the display must not change the reward calculation. Use the actual entry count and actual presence of an evolution for any light, sound or anticipation cue.

Acceptance:
- A closed chest does not show its new weapon or credited gold in the HUD.
- The strongest reward is recognisable and receives the final emphasis.
- Skip, Collect and rapid input cannot duplicate or change rewards.
- The final HUD, inventory and accounting agree with the reveal.

## Priority 2 — communicate progress and exceptional rewards

### 3. Show evolution readiness

Mark a weapon when its evolution requirements are met, and distinguish a chest that can supply an evolution. Highlight a choice that completes a recipe. Use names and completion states, including Phoenix Heart, rather than unfamiliar icons alone.

These cues describe build readiness. They must not imply that ordinary NEW cards have a loot rarity they do not possess.

### 4. Improve results and the return to camp

Show genuine new records, progress toward the next unlock and useful affordable upgrades. Extend the tally enough to read it, with a clear final total and a skip action. Preserve honest save status: a successful-looking tally must not hide an unconfirmed or failed save.

Give victory a distinct finishing beat. The victory jingle currently starts at dawn and the results constructor requests title music after the five-second dawn sequence; check the actual track transition and allow an appropriate musical ending.

Returning to camp should make the next useful choice obvious. An affordability badge is more informative than simply making every counter animate.

Acceptance:
- Players can explain what they earned and what it enables.
- A personal-best badge reflects a real comparison with the previous record.
- Tally animation does not delay interaction unnecessarily or obscure save failure.
- Victory remains clearly distinguishable from death and voluntary quitting.

### 5. Give major rewards distinct audio identities

Prioritise separate cues for evolution, Legendary equipment, personal best and fury becoming ready. Use rising notes where a sequence genuinely rises in significance. Keep ordinary pickup sounds short and controlled under heavy combat.

Epic and Legendary gear should not depend on the same sound alone for recognition. A modest music dip may help important cues, but it needs testing with the actual tracks and volume settings.

Acceptance:
- Important rewards are identifiable without watching the HUD.
- Ready sounds fire once per transition rather than every frame at full fury.
- Sound density and loudness remain comfortable in a late-game horde.

### 6. Improve fury and ultimate feedback

Full fury already has a flashing control prompt and the ultimate name. Add a clearer near-full visual state and a short ready cue. Test contrast before changing the fill geometry.

A concise post-ultimate summary could show kills or damage attributable to that ultimate. This requires accurate attribution, especially for Army of the Dead minions that outlast the casting state. Do not label total run damage as ultimate damage.

Prefer a readable launch cue over an obligatory full-screen cut-in or long freeze. Preserve threat visibility and provide reduced-flash behaviour.

### 7. Make gear rarity and persistent ownership visible

Improve the distinction between rare drops with restrained lighting, sound and comparison frames. The existing rarity glow is a starting point. Carry equipment visibility into hero selection so a good drop remains meaningful after the run ends.

Preserve plain-chance crypt loot and the rule that luck does not affect its drops or rarity. Presentation must not suggest otherwise.

### 8. Reduce late-game visual competition

Normal damage, critical hits, boss hits, gems, player damage and important pickups should have different visual importance. Existing damage-number merging and the damage-number toggle already help; evaluate them under heavy load before adding more effects.

Test a reduced-number setting, stronger important-hit hierarchy and limited markers for nearby useful pickups. Keep the hero, enemy attacks and safe movement space readable.

## Proposals that require gameplay approval

These are balance changes, even when described as presentation:

- Combo multipliers for XP or gold.
- A combo that breaks on damage rather than elapsed time.
- Combo milestone coin showers that create spendable currency.
- Additional fury, full heals or loot attached to a celebration.
- Thieves subtracting earned gold.
- New legendary powers, set bonuses or mastery rewards.

The existing combo already expires but often remains active in dense combat. Improve what the counter communicates first. Any mechanical reward should be tested independently, with particular care around XP: levels already grant damage, exponential health and armor.

## Lower-priority experiments

- A collection showing genuinely discovered evolutions and equipment.
- A concise crypt-clear receipt using actual lords defeated and loot found.
- A visible thief escape cue and an accurate message about treasure that escaped.
- Milestone banners with a low frequency and meaningful reason to appear.
- Subtle HUD gold feedback and a clearly distinguished new-record indicator.
- Attract mode only after higher-priority feedback is complete, with reliable cleanup and no surprise active run.

Face-down flips on every routine level-up, several simultaneous hums, repeated full-screen flashes and mandatory long reveals should not be the default solution. They can make frequent actions slower and important information harder to see.

## Validation and delivery order

1. Repair frozen effects and reward/HUD sequencing.
2. Add evolution readiness and clear recipe completion cues.
3. Improve results, save visibility and next goals.
4. Add distinct major-reward sounds and the fury-ready cue.
5. Improve equipment visibility and late-game visual hierarchy.
6. Test collection, receipts and other optional presentation features.

Test ordinary and evolution chests, all supported entry counts, gear rarities, multiple queued rewards, manual input, touch, compact layouts, reduced effects and skipping. Include a boss kill that also earns a level-up and a victory with pending rewards.

In short playtests, observe whether players recognise their reward, understand why it matters, notice when an evolution or ultimate is ready, and find the next action. Replay appeal remains a question for players; a larger counter or longer reveal is not evidence by itself.

## Implementation references

- [Chest, level-up, gear and result overlays](../public/js/ui/gamescreen.js)
- [Reward rolls, celebrations and ultimates](../public/js/game/game.js)
- [Fury rules](../public/js/game/player.js)
- [HUD orbs, combo and markers](../public/js/game/hud.js)
- [Pickup lighting and collection](../public/js/game/pickups.js)
- [Damage-number hierarchy and merging](../public/js/game/numbers.js)
- [Sounds and music transitions](../public/js/engine/audio.js)
- [Gear rarity and plain-chance loot](../public/js/shared/items.js)
- [Menus and hero selection](../public/js/ui/screens.js)
