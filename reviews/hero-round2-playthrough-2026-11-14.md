# Round-two independent playthrough and bug audit — 14–15 November 2026

Status: final corrected-resource holdout, alternate strategies, controlled scenes and confirmed-bug verification are complete.

## Method and independence

This second review uses actual production `Game` updates at 60 Hz. Full survival attempts use Normal (`easy` internally), Darkwood, maximum Armory, ordinary collision/damage, real terrain, no external buffs, and an 18-minute cap. Four worker threads are the maximum simulation pool. All state is disposable in memory; no user profile or save service is touched.

The holdout seed is **15011**, independent of the implementation agent's 1411, 1412 and 2109 evidence. This is one seeded policy evaluation, not a human win rate. A loss is preserved; alternate existing policies are additional attempts, not replacements for failed rows. The full runs include naturally selected support weapons, level-ups, actual chest evolution and ultimate input. They are not signature-only damage benchmarks.

The separate 88 controlled scenes cover all 22 heroes × starter/evolved × field/crypt, eight seconds each. They use an immortal observer, stationary high-HP targets and a deliberately unobstructed test arena to isolate hits, real attack release and draw behavior. Both movement directions and stationary/manual attack periods are exercised. These are mechanic/render segments, not survival wins. There are native Canvas contact sheets for every hero, including final Ranger/Berserker density and the final statue-based Ea-nasir model.

## Confirmed defects and repairs

1. **Pending crypt attacks crossed worlds.** A Mage manual strike scheduled for clock 0.3167 survived an immediate stairs or faint exit. At clock 0.55 it released a forest fireball despite its gesture being cleared and its cooldown still at 0.888. Paladin's direct effect also retained its old target. `Game.clearTransient()` now clears pending `handAt`, `handTarget` and queued volleys while preserving the cooldown already paid. Four exit regressions failed before; all six cases pass after, including entering with a pending field volley and a valid moving release that stays within one crypt. Ordinary movement still permits the release; same-world revivals are unaffected.

2. **A pending manual target could become another spawn.** Druid's wind-up retained a raw enemy object. Killing it, sweeping the pool, and reusing that body 300 pixels away made the eventual Burrow chase the new spawn despite a 170-pixel targeting reach. The weapon now captures the original spawn ID at strike time and discards a dead/recycled identity before release; release, evolution and world transition clear that identity. Two genuine pooled-body reproductions failed before; both pass after, along with a live moving-target control. The target is not locked to an obsolete coordinate while its original creature remains alive.

3. **Visible hit-flash bodies could be missed.** `Enemy.draw()` widened a hit-flashing body by 12%, while `Enemy.body()` retained the unexpanded shape. The six detailed boss models exposed 2.66–4.40 world pixels of visible equipment outside the targetable box; squash had the same mismatch. A shared render-scale calculation now drives both drawing and collision. The spatial-query reach bounds actual paired scale extrema; only hopper AI needs squash/hop extrema. This preserves the ordinary Ogre/Cultist local-grid classification. All six per-boss every-frame/both-facing/normal/flash/squash/combined regressions failed before and pass after. A separate test checks every frame of all 76 monster types against the broad-phase reach during their real deformation states. Actual AI scale, ground-contact radius and authored density remain unchanged.

4. **Historical bot resources exceeded current real profiles.** The no-profile headless preset added two old free rerolls and banishes on top of Armory. Maximum Armory therefore supplied seven of each, while a real fully upgraded profile supplies five; the no-Armory preset supplied two instead of zero. The legacy additions are removed and a regression compares both presets directly to real profile bonuses. Six slots and all content remain intentionally available in unrestricted benchmark mode; maximum Armory can obtain those normally. The old balance report now explicitly labels its resource caveat, and old evidence is retained.

The first complete legacy-resource holdout won 19/22; Marksman, Trailblazer and Arcanist lost. Its JSON is `holdout-legacy-resources-15011.json`. A corrected-resource attempt was interrupted while tightening the new conservative broad-phase bound; its partial log is explicitly named `holdout-aborted-wide-reach-15011.log` and is not counted as a full matrix. The final results below use the corrected resources and final bound together, so they do not isolate the effect of resource correction from collision correctness.

## Bot legitimacy

Source inspection covered `tools/headless.mjs`, `Driver`, `BotView`, `tactician` and `tactical`. Tactician reads the view's terrain, nearby bodies, shots, telegraphs and pickups and returns normalized movement plus an ultimate request. It does not change HP, position, cooldowns, spawns or weapon damage. Driver calls the ordinary Game update, actual card application, chest roll, equip/sell and finish operations. Tactical spends owned rerolls/banishes and reserves slots for missing evolution partners. It does not create cards or resources. The harness seeds RNG and unlocks benchmark content; the corrected maximum Armory bonuses are sanitized through the same profile code as a save. There is no gear loadout or external test buff in the holdout.

The driver sweeps remaining loot only after the game reaches the cleared state. This can change the final banked reward versus a player who voluntarily leaves pickups, but cannot rescue survival before dawn. Full simulations use headless rendering; the controlled native scenes validate the render path separately. Bots are not a human playtest and do not model reaction latency, unfamiliarity with weapon descriptions or controller handling.

## Final holdout results

The final corrected-resource matrix completed **19 wins and 3 deaths in 22 full attempts**, totaling **321.08 simulated minutes**. There were no crashes or incomplete runs. All wins reached 15:00.

| Hero | Tactician, seed 15011 | Starter/evolved field + crypt scenes | Isolated crate starter/evolved |
| --- | --- | --- | --- |
| Knight | Win 15:00 | 4/4 | 2/2 |
| Ranger | Win 15:00 | 4/4 | 2/2 |
| Sorcerer | Win 15:00 | 4/4 | 2/2 |
| Shadow | Died 12:19 (deathknight) | 4/4 | 2/2 |
| Necromancer | Win 15:00 | 4/4 | 2/2 |
| Paladin | Win 15:00 | 4/4 | 2/2 |
| Druid | Win 15:00 | 4/4 | 2/2 |
| Berserker | Win 15:00 | 4/4 | 2/2 |
| Witch Hunter | Win 15:00 | 4/4 | 2/2 |
| Copper Merchant | Died 13:14 (deathknight) | 4/4 | 2/2 |
| Footman | Win 15:00 | 4/4 | 2/2 |
| Marksman | Died 10:29 (orc) | 4/4 | 2/2 |
| Templar | Win 15:00 | 4/4 | 2/2 |
| Trailblazer | Win 15:00 | 4/4 | 2/2 |
| Thornkeeper | Win 15:00 | 4/4 | 2/2 |
| Wraith | Win 15:00 | 4/4 | 2/2 |
| Gravebinder | Win 15:00 | 4/4 | 2/2 |
| Arcanist | Win 15:00 | 4/4 | 2/2 |
| Praetorian | Win 15:00 | 4/4 | 2/2 |
| Seraph | Win 15:00 | 4/4 | 2/2 |
| Boltguard | Win 15:00 | 4/4 | 2/2 |
| Swordbearer | Win 15:00 | 4/4 | 2/2 |

The same three failed heroes also received existing autopilot/tactical and gems/tactical attempts, with the same seed and resources. These six attempts are additional evidence, not replacements for the primary losses.

| Hero | Autopilot/tactical | Gems/tactical |
| --- | --- | --- |
| Shadow | Died 12:23 (ogre) | Win 15:00 |
| Copper Merchant | Died 10:15 (deathknight) | Win 15:00 |
| Marksman | Died 9:59 (elite orc) | Win 15:00 |

Build evidence explains the losses as unresolved survival risks, not weapon crashes. Shadow reached six evolved weapons but ended without Armor or Vitality, taking 953 of 1,177 incoming damage from body contact. Ea reached both Lion's Lash and High Quality Copper and had Armor/Vitality/Regen; it still took 2,027 of 2,248 damage from bodies. Its missing final Phoenix is consistent with the Heart having been spent after enabling copper evolution, not an unavailable evolution gate. Marksman reached its signature evolution and three evolved supports, but Starfall and Aura remained rank-eight base forms; it had no Regen or Vitality and took 652 of 902 damage from bodies. These observations point to build/route exposure and support evolution timing; they do not isolate inherent hero strength. No stats were changed in response to these losses.

## Controlled combat and interface evidence

- **88/88 combat scenes:** all deal damage, all state/health/position values stay finite, no scene unexpectedly exits play, and every crypt scene breaks all four close crates. Some field scenes deliberately retain boxes while valid creatures occupy a weapon's target priority; isolated crate access is checked independently.
- **44 isolated field cases:** all 22 starter and evolved signature kits open a nearby crate without requiring a creature. Twelve explicit wall fallback guards, signature prop-budget checks, copper visibility checks and creature-first priority checks pass. Gravebinder's ordinary crow reaches a prop without gaining soul fuel.
- Manual release, moving release, visible-versus-blocked target acquisition and Ea's two-stage route are covered by focused real Game regressions. Whip + Might + chest yields Lion's Lash; only then does Phoenix become available, including on a locked progression profile; Phoenix + rank-eight Medium Quality Copper + chest yields High Quality Copper (not for sale).
- All 22 hero selection views render with enabled continue controls and without mutating the input profile. Ea is also captured at 480×270 and 293×633, before and after detail-panel scrolling. Long descriptions require the existing scroll controls at small sizes.
- Boss checks cover all six replacements' body scale, ground footprint and complete silhouette bounds; four telegraphed slam/nova kits retain warned impact timing under Frost Rune slow, and death plus pooled-body reuse cancels their old impact and pose. The existing Bone King telegraph test remains covered. The independent graphics reviewer owns full-cycle aesthetic approval for every sprite; one contact sheet is not a proof of animation quality.

## Progression, reward and save audit

A separate child audit inspected entry/exit/faint, preserved outside boss identities, paused survival time, transient attack state, chest evolution order, pending levels/chests, ultimate/revive handling, result/camp transitions and save outbox retry. It confirmed the transition and pooled-target defects above; both are fixed. Lost run and sale responses retry without duplicate payouts; reveal and overflow-selection state survive reload; static local fallback and another-tab purchase cases pass. The test server uses disposable profiles and intentionally truncated local responses, not a production save. Details and evidence are in `output/hero-round2-2026-11-14/playthrough/transitions-audit.md`.

## Validation and evidence

- New boss combat audit: **15/15** after final reach tightening, covering six every-pose draw/body cases, one all-monster broad-phase case, four slow/timing cases and four death/pooling cases. Before fix: six draw/body cases failed.
- Boss detail + previous telegraph + bot resource/runtime batch: **28/28** before the final additional all-monster test; the final density/detail and boss audit were rerun after tightening. Counts overlap and are not additive.
- Final signature/object/wall/copper/Whip/Ea/manual-release batch: **120/120**.
- Child progression/crypt/chest/Phoenix/results/storage batch: **55/55**; final transition/pooling regressions: **9/9**; latest pooling/cave/Gravebinder/Arcanist/Whip batch: **35/35**; earlier transition/cave/Ea checks: **29/29**; save/retry/static-hosting checks: **23/23**. These overlap other test batches.
- `controlled-results.json`, `controlled.log`, and `*-combat.png`: all 88 controlled scenes.
- `menu-results.json` and `*-menu-*.png`: current selection layouts.
- `boss-body-stretch.png`: native actual enemy drawing with collision rectangles, both facings and all four stretch states.
- `hitbox-before.tap`, `boss-bot-after.tap`, `boss-final-reach-all-monsters.tap`, `final-weapon-validation.tap`, `transitions-before.txt`, `transitions-after.txt`: before/after and focused verification.

## Limits and remaining risks

No manual end-to-end human campaign, controller hardware or audio audition is claimed. Holdout coverage is one Darkwood seed on Normal at maximum Armory; other maps, difficulties and fresh-save onboarding do not inherit a survival pass. The older no-Armory matrices all lost even with the historical extra resources, so fresh-save pacing remains a separate design risk. The repository's historical ambition that every fully upgraded hero can win now has an observed example for every hero in this corrected-resource holdout, across the explicitly recorded policies. It is not a guarantee across seeds or builds. No arbitrary health, damage or difficulty buffs were added to force this review's outcomes.

The three alternate gem-collection wins reached levels 122, 131 and 139 versus 84, 95 and 63 in their failed primary attempts. Each ended with a materially stronger developed support build. This makes XP collection, survival routing and support-evolution timing the actionable remaining playtest concern, especially for a player learning a signature. The bot comparison does not isolate which factor is causal; a future human onboarding pass should watch whether players understand that development path and whether fresh-profile failure feels fair.

## Independent signoff

The scoped gameplay/bug review passes: all confirmed defects found here are repaired with failing-before/passing-after evidence; all 22 heroes pass the final controlled mechanics checks; and every hero has an observed Normal maximum-Armory victory on the holdout using one of the recorded existing policies. The primary policy remains **19/22**, with all three failures winning only under `gems/tactical`; all three `autopilot/tactical` follow-ups still failed. The 28 completed corrected-resource attempts total **398.72 simulated minutes**. No unresolved confirmed gameplay defect remains from this audit. Root-owned browser, clean staged full-suite, packaging and graphics signoff are separate integration evidence, to be appended after their completion.

## Root integration verification — 15 November 2026

- The exact staged code was exported into an isolated checkout, excluding unrelated local Electron/demo and animation-experiment work. All **1,189 tests passed**, with zero skips or failures (231.54 seconds). After testing, all 1,597 exported repository files matched their staged Git blobs. Log: `output/hero-round2-2026-11-14/clean-staged-suite.log`; integrity record: `snapshot-integrity.json` in the same directory.
- All nine changed production assets (Ranger, Berserker, Ea-nasir and six bosses) rebuilt byte-for-byte using only the staged repository sources. Evidence: `clean-rebuild.json`. The final static release contained 301 files, 263.1 MB, with all 204 module imports resolved.
- Desktop Chromium verification passed all 22 heroes at S1, S2.4 and S3.2, eight field/crypt scenes for each of the three revised heroes, paired keyboard movement and manual strikes. Each boss completed its 30-second tour in both facings. Every one of the 532 authored boss frames was visited (88/84/94/88/84/94), with no browser errors. Evidence: `preview/browser-review.json` and current screenshots.
- The browser run exposed and repaired a review-tool-only startup defect: its first RAF timestamp could precede initialization's `performance.now()`, producing a negative simulation step. The boss review now clamps that step to zero, as the production loop already did. The optional boss capture tool also now resolves the installed Canvas package or its documented environment override instead of a machine-specific default path.
- The first broad suite exposed two stale source-pixel assertions; portrait checks now use logical density, and crypt lords retain their established 32/27-world-pixel bodies independently of the Lich's padded source canvas. A third failure was investigated rather than treated as a gameplay defect: a 786-XP gem was collected within 1.9 seconds, and XP reconciled exactly (44,127 dropped = 44,055 collected + 72 remaining). The arbitrary 300-XP richness limit was replaced by assertions on each real fold: retire the distant owner, transfer all XP to the current drop, and use the correct visible tier. The existing cap and conservation checks remain. No gem gameplay change was made.
- Independent packaging inspection found no missing relative imports; retained Ranger/Berserker atlas hashes matched; every boss delta record and pose reference decoded correctly. The six boss runtime files total 8.09 MB raw / 4.65 MB gzip. Their full pixel buffers plus eager normal/mirrored canvases reserve roughly 262 MiB before tint variants. Desktop rendering was checked; constrained-device memory and mobile performance were not benchmarked.
