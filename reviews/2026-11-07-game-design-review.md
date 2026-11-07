# Forest Survivor game design review

Reviewed 7 November 2026. This assessment covers the current working tree, including the new crypt animation rules, unidentified equipment, eight equipment slots, identification costs and post-match inventory. It is independent of the older October reviews.

## Overall assessment

Forest Survivor has a strong central identity: a vulnerable medieval hero survives an increasingly crowded battlefield, assembles a build, takes optional trips into dangerous crypts and returns with permanent progress. Its best feature is the contrast between large-scale automatic combat and small, manually fought crypt encounters. The maps also contain real mechanical differences, rather than relying entirely on different colors and enemy names.

The game now has enough content. The most valuable next work is making its decisions understandable and dependable. A player should be able to explain why they were hit, what a card changes, why a crypt is worth entering and what they can do with a rare find. Inventory restrictions currently undermine the last of those promises. Progression and starting-build variance need measured attention before adding more heroes, rarity tiers or permanent power.

The highest priorities are:

1. Preserve ownership of loot decisions: a full stash and the twelve-item post-run limit currently remove choices precisely when a valuable find matters most.
2. Validate the first few ordinary Survival runs separately from established-account balance. Small deterministic samples show very different outcomes across strategies and seeds.
3. Explain identification and gold skill grants accurately. Common-item identification currently buys no combat benefit, and some legendary grants do much more than their short description suggests.
4. Teach the field-to-crypt combat transition through play, while preserving the requested idle/walk animation rule outside crypts.
5. Protect threat visibility as builds and celebrations grow more elaborate.

“High priority” below means a direct decision restriction or a major risk to the main loop. “Medium priority” means comprehension, pacing or differentiation that deserves focused validation. Confidence describes the implementation evidence; the effect on real players still needs playtesting.

## Evidence and limits

Paths under `output/` identify local verification artifacts excluded from Git; they are recorded for traceability and are not repository links.

This review combines source inspection, current controlled browser captures and ten seeded headless Survival runs through the production `Game`, `Player`, weapons, enemies and bot driver at 60 Hz. It does not use human retention measurements or claim that a bot predicts novice skill. The simulations use Normal difficulty on the Sunscorch, disable crypt visits and use the existing `build` card policy. Fresh-profile simulations start directly in ordinary Survival and exclude prologue earnings. Fully upgraded samples also open all content, so their difference from fresh samples cannot isolate Armory power alone.

The current browser evidence includes title, fresh and unlocked hero selection, trial selection, prologue, chest/evolution presentation, pause, Armory, Codex, records, options, crypt map, Dungeon and Ranked entry, portrait layouts and the new item flow. Controlled invulnerability scenes establish layout and behavior, not difficulty. Audio routing was inspected, but the soundtrack and sound mix were not auditioned for this review. The parent task's full test run reported 901 of 902 tests passing, with a pre-existing Footman portrait-brief failure; that result is supporting engineering context, not evidence that the game is balanced or enjoyable.

Local verification artifacts: seeded samples (`output/game-design-review-2026-11-07/samples.json`), loot edge-case reproductions (`output/game-design-review-2026-11-07/edge-cases.json`), browser scene observations (`output/review-2026-11-07/observations.json`) and animation coverage (`output/crypt-loot-review/motion.json`).

## What should be preserved

**The movement-first combat identity.** Position, approach direction and pickup routes are meaningful even when attacks fire automatically. The recent change makes that identity visually clearer: field attacks retain idle or walking poses, while manual crypt strikes can play attack animation. Preserve weapon effects and impact feedback so standing idle does not imply that the hero has stopped fighting. [Pose selection](../public/js/game/hero-animation.js#L10), [facing rules](../public/js/game/facing.js#L1).

**Crypts as a change of pace.** The clock stops, only the hero's signature weapon updates manually, rooms limit information, named lords create short goals and exits remain available. Fainting ends that crypt attempt rather than the entire run. This gives the game a distinct expedition rhythm. Preserve those deliberate rules before considering harsher penalties or mandatory crypt progression. [Crypt controls](../public/js/game/game.js#L1479), [crypt failure](../public/js/game/game.js#L1599), [weapon update split](../public/js/game/game.js#L2540).

**Cards, rather than the level number itself, supply power.** Raw level damage and health growth are currently disabled. That is an intentional design choice: players gain strength from selections, blessings, equipment and account upgrades. Do not restore automatic level scaling merely because an older review described it. The implication is that card quality and intelligibility matter especially strongly. [Level constants](../public/js/game/player.js#L26).

**Distinct map interactions.** Quicksand, ice, freezing gusts and Bloomvale's loop-drawing Fae Thread create different movement problems. The bright-to-dark map progression also provides visual relief. Preserve environmental counterplay and readable grace periods; adding raw enemy health is a less interesting way to distinguish maps. [Map progression](../public/js/shared/progress.js#L137), [terrain rules](../public/js/game/player.js#L105), [Fae Thread](../public/js/game/fae.js#L1).

**Concrete celebration and recovery support.** The Excalibur capture shows the evolved weapon, its identity and numerical changes together. Milestone notices wait around competing events; first-run hints count as delivered only after being shown. Armory refunds support experimentation. Post-run receipts and retry protection protect earned progress. These are good foundations for trust and clarity, not merely polish. [Hints](../public/js/game/hints.js#L70), [milestone scheduling](../public/js/game/game.js#L2237), [refunds](../public/js/shared/profile.js#L753).

## First journey and early progression

### The prologue teaches only part of the first ordinary run

**Medium priority; high implementation confidence.** The caravan road uses the real Knight, sword and pickups. It has a distance-based journey designed around forty seconds of travel, sixteen weak rats and directional guidance after inactivity. It intentionally drops no experience, so it does not teach the first card selection. It also has no crypt or ultimate. This is a clear, low-pressure introduction to movement and automatic attacking, but the transition into the ordinary horde introduces several unpracticed systems at once. [Prologue configuration](../public/js/game/prologue.js#L15), [encounters and XP rules](../public/js/game/prologue.js#L148).

Keep the short road. Add one representative decision near its end, or a protected first-level choice shortly after entering Survival. Demonstrate the difference between walking toward an enemy, collecting a gem and choosing an upgrade. A later optional crypt introduction should teach “attack ready, press or hold X/Shift” in a safe entrance space. Extending the mandatory prologue substantially would delay the repeatable game; the aim is one consequential example, not a manual disguised as a level.

### The opening needs a measured agency target

**High priority; measured concern, medium confidence about human impact.** The six fresh-profile simulations all ended in a fall, but varied greatly:

| Strategy and seed | Survival time | Level | Banked gold | Relevant context |
| --- | ---: | ---: | ---: | --- |
| Autopilot 1 | 135.2 s | 11 | 101 | No relics acquired |
| Autopilot 2 | 64.6 s | 6 | 25 | Only the signature sword |
| Autopilot 3 | 61.6 s | 5 | 26 | Sword and one axe |
| Gem seeking 1 | 295.8 s | 28 | 271 | Reached the first boss; two evolutions |
| Gem seeking 2 | 663.7 s | 60 | 1,264 | Defeated two bosses |
| Gem seeking 3 | 61.5 s | 6 | 26 | Only the signature sword |

These are ordinary-run simulations without prologue gold, crypts or a human's judgment. They are not a novice win-rate estimate. They do show that movement strategy and offered-build development can dwarf a simple difficulty label. The existing build policy favors weapon upgrades, which also limits what this sample says about defensive choice quality. [Card policy](../public/js/bots/picks.js#L51).

The four full-Armory, all-content-open samples used Autopilot, seed one and no equipment. Knight, Ranger and Necromancer completed the 900-second night; Sorcerer fell at 852.9 seconds despite defeating all three bosses. This supports testing several account stages and archetypes rather than treating one upgraded Knight win as a universal balance baseline. It does not show that all Sorcerer builds are weaker: the available content pool and chosen build also differ.

The appropriate target is not “everyone wins immediately.” The code explicitly records a deliberate progression-dependent balance direction. Instead, define an early agency target: before a typical first fall, the player should recognize a threat, make several understood choices, earn an affordable useful purchase and know how to improve. Test the current opening against that target. If it fails, experiment with the first card set, defensive teaching or local threat timing before globally weakening every enemy.

### Progression expands both power and decision control

Fresh accounts have three weapon slots, three relic slots, no rerolls and no banishes. Armory purchases add slots and control as well as numerical power; ultimates open after a two-minute record and become available on later runs. Most original recruits require five minutes with the preceding hero, while expansion thresholds vary from four to ten minutes. The fresh roster screen visibly presents twenty locked heroes around one playable Knight. [Progression rules](../public/js/shared/progress.js#L18), [recruitment](../public/js/shared/profile.js#L55), [run-start ultimate lock](../public/js/game/game.js#L379).

**Medium priority.** This is a broad long-term ladder, but its first impression can be deprivation rather than possibility. Promote the next attainable recruit and one immediate goal; retain the full roster as a preview. Explain that a two-minute ultimate unlock belongs to the next run, so a player does not wait for a power that is still unavailable. Consider an early limited reroll experiment if players regularly understand a choice but cannot escape an unwanted opening. The tradeoff is less early randomness; it should be tested independently of damage buffs.

## Combat, builds and the hero roster

### The field and crypt control contracts must stay explicit

**High priority for teaching; high implementation confidence.** The field is automatic, but weapons do not share one targeting rule. The Ranger fires ahead; the sword cares about the front; other attacks seek enemies or create areas. Moving left/right establishes visual facing, and stationary field attacks do not rotate the hero. In crypts, manual attacks can turn a stationary hero toward the selected foe, while moving attacks preserve movement facing. These are coherent rules that can nevertheless feel inconsistent without a short demonstration.

Show the signature weapon's targeting pattern in its preview: front cone, forward projectile, nearest target, area or delayed location. In crypts, communicate ready/cooldown state and the current aim direction near the hero. Teach that holding attack repeats when ready; otherwise players may interpret repeat pressing as the intended skill test. Preserve actual attack direction and damage when improving visuals. [Manual strike selection](../public/js/game/game.js#L1491), [input bindings](../public/js/engine/input.js#L20).

### The roster contains useful mechanical ideas, but requires differentiation tests

All twenty-one heroes have individual signature weapons. The twelve recruits reuse established ultimate families, so their signature pattern must carry much of their identity. This is not evidence that they are clones; the actual weapons include positioning, guards, line traps, delayed strikes and momentum. Test those behaviors, not merely their damage totals. [Original heroes](../public/js/data/heroes.js#L18), [recruits](../public/js/expansion/roster.js#L17), [signature definitions](../public/js/expansion/signatures.js#L1).

| Hero | Design promise to preserve | Specific validation question |
| --- | --- | --- |
| Knight | Front-facing cuts and recovery | Does a new player understand front protection and useful approach angles? |
| Ranger | Forward arrows and fast repositioning | Can players deliberately line up shots while retreating? |
| Sorcerer | Explosive area clearing | Are delayed impact and safe spacing readable under many effects? |
| Shadow | Fast, fragile seeking blades and hovering identity | Is its low health compensated by understandable avoidance tools? |
| Necromancer | Minions plus Miasma in the field | Does losing Miasma in manual crypt combat feel clearly explained? |
| Paladin | Priority smites, sustain and sanctuary | Can players tell which enemy a smite will select? |
| Druid | Roots and environmental positioning | Does its terrain-dependent advantage remain understandable across maps? |
| Berserker | Aggressive leaps and low-health power | Can players distinguish controlled aggression from an involuntary dangerous landing? |
| Witch Hunter | Piercing bolts against strong foes | Is priority-target damage recognizable before reading totals? |
| Footman | Stagger the lead enemy, shock the rank behind | Does arranging a line improve results enough to learn? |
| Marksman | Impact splinters | Are splinter paths distinguishable from the main bolt? |
| Templar | A short damaging ward ahead | Does the ward encourage a different movement rhythm from Knight? |
| Trailblazer | Arrows leave damaging triplines | Can players route enemies across previous shots? |
| Thornkeeper | Inward thorn convergence | Can players anticipate where the convergence becomes strongest? |
| Wraith | Previous-position shade attacks | Is the connection between last position and next attack visible? |
| Gravebinder | Crow siphons weaker enemies into a final strike | Does a crowd around a target read as an opportunity rather than visual noise? |
| Arcanist | Alternating crystal arcs at target distance | Can players influence effective spacing rather than merely watch a projectile? |
| Praetorian | Projectile guard empowers the next cut | Can players recognize a successful block and use its payoff? |
| Seraph | A front cleave with attacks sweeping to the flanks | Does flank coverage change approach choices? |
| Boltguard | Piercing ordinary foes strengthens later impacts | Can players create valuable enemy alignment? |
| Swordbearer | Movement builds momentum for a stronger cut | Is stored/spent momentum visible enough to play around? |

**Medium priority.** Before adding another hero, give each a one-sentence tactical identity, one visual teaching moment and one measurable signature-success event. Reused ultimates are efficient, but repeated ultimate art and descriptions should not make the recruit's unique mechanic disappear in the selection panel.

### Build discovery needs clues without removing mystery

Weapons reach level eight; evolutions require their paired relic or the Phoenix Heart route. Recipes remain unnamed until an earlier run has made that evolution. The interface deliberately says “a relic yet unknown,” while card backs and ready indicators offer partial guidance. With only three starting relic slots, a novice can permanently fill the relevant slot before understanding the relationship. [Evolution knowledge](../public/js/game/game.js#L629), [unknown-recipe UI](../public/js/ui/gamescreen.js#L203).

**Medium priority.** Preserve discovery as a deliberate choice. Test progressive clues: thematic relic categories, an experiment journal or a gentle “leave room for a matching relic” hint. Display a clear distinction between learned ranks and equipment ranks. Evolution requirements use learned progress, so a displayed effective rank alone should not imply readiness. This avoids removing surprise while reducing blind irreversible commitment.

Once the build is complete, automated filler choices are useful pacing relief. Keep the existing “ask again” route. Inspect whether late blessings provide meaningful alternatives or simply prolong a solved build; raw level gains are zero, so the selected filler is the entire marginal benefit of another level.

## Loot, identification and the economy

### Valuable finds can lose their decision screen

**High priority; reproduced.** The post-run ledger retains the first twelve sealed finds and automatically sells later ones at their normal sale price. A direct reproduction placed a legendary item thirteenth: twelve earlier items received decisions, and the legendary became 750 gold without an equip, stash or identification choice. This contradicts the practical expectation created by “decide what to identify, equip and sell,” even though it matches the current explicit limit. [Partition policy](../public/js/shared/spoils.js#L75).

At minimum, disclose the limit before it is reached and preserve exceptional finds preferentially. The stronger solution is a reviewable overflow queue or a compact management screen where the player chooses the retained set. Sorting by rarity would be better than acquisition order, but still should not silently replace the player's build judgment: an enchanted item can be more useful than a particular legendary.

### A full stash can force the wrong disposal

**High priority; reproduced.** With twelve stored items and an occupied equipment slot, a new find cannot be stashed or equipped because replacing gear also requires stash room. The claim screen offers no route to sell a different stored item or replace-and-sell the old worn item. Selling the incoming find is then the available settlement path. The error asks the player to make room, but the relevant management controls are at camp. [Claim restrictions](../public/js/shared/profile.js#L930), [claim actions](../public/js/ui/reward-reels.js#L218).

Add “manage inventory” directly to the claim flow, preserving the pending receipt, or offer an explicit replace-and-sell-old decision. Keep the current protection against accidentally selling replaced gear. Increasing stash capacity alone delays the same problem rather than resolving it.

### Identification needs an explicit value proposition

**High priority for clarity; reproduced.** Modern common equipment has a visible base stat and no hidden affixes. Identifying it consumes gold and raises the lifetime identification counter while leaving its combat bonuses identical; only the unidentified label changes. That makes the first cheapest identification easy to spend on a non-upgrade. [Generation](../public/js/shared/items.js#L188), [identification charge](../public/js/shared/profile.js#L956).

Show “no hidden magic” for ordinary gear and explain any cosmetic identification purpose before charging. Prefer suppressing the paid action for items with nothing to reveal, subject to the intended identification policy. This would retain common base equipment and the requested magical-item pricing progression without teaching players that identification is a misleading upgrade button.

The requested account-wide price ramp is consequential: the next identification costs 250 gold after 24 identifications, 750 after 74 and 1,000 after 99. Item sale prices remain 20 common, 120 enchanted and 750 legendary. Those comparisons do not prove a bad economy, because combat value is different from resale value, but they make late blue-item experimentation progressively expensive. Keep the +10 rule as the current design; measure affordability and identification avoidance before proposing a cap or alternative curve. Display the next price and irreversible counter effect consistently. [Price calculation](../public/js/shared/profile.js#L45), [sale values](../public/js/shared/items.js#L37).

### Gold skill ranks have uneven practical value

**High priority for balance validation; high implementation confidence.** A named weapon grant can create a separate unlearned gear weapon outside ordinary learned weapon slots. An all-weapons grant raises learned, unevolved weapons by one effective rank, capped at eight; its rank advantage can therefore disappear as the run matures. A specific passive can also work without a learned slot. These are markedly different rewards all described through “+1 rank.” A locked or another hero's signature weapon can appear in the grant pool. [Grant pool](../public/js/shared/items.js#L96), [gear weapon creation](../public/js/game/game.js#L492), [rank caps](../public/js/game/weapons.js#L98).

Differentiate “adds an unlearned skill,” “raises a learned skill” and “raises all learned skills.” Explain the cap and what happens on evolution. Test specific grants against all-skill grants at early, complete-build and evolved-build states. Decide explicitly whether class-signature access through legendary equipment is desirable hybridization or an unwanted dilution of hero identity. Do not confuse melee/ranged weapon compatibility with skill-grant compatibility; the former does not constrain every legendary skill.

### The new rarity structure is readable, but changes the reward distribution

Common gray, enchanted blue and bright gold are a clear three-tier hierarchy. Rings and amulets being exclusively magical supports the fantasy. Unidentified base stats work, while hidden magic remains inactive; equipment can be equipped without buying identification. These are strong rules. The measured marginal gold chance rises from 1% at minute zero to approximately 11.1% at minute fifteen at depth one, with blue rising from 46.5% to 77.8%. That is an elevenfold change in gold frequency, not a flat rarity experience. [Odds](../public/js/shared/items.js#L168).

**Medium priority.** Validate exploration timing: waiting for later crypts buys materially better odds, while visiting early can supply XP, gold and next-run equipment. Because new gear waits for post-match management, the player should understand whether the current detour serves survival now or account power later. Jewelry has no ordinary base stat, so an unidentified ring can be equipped while producing no immediate benefit; label that state plainly.

Armory growth, identification and equipment transfers compete for the same currency. Full Armory refunds make experimentation possible; transfer fees of ten times sale value can feel inconsistent beside a shared stash that can move items through camp. Review that route as one coherent ownership system rather than retaining two unrelated transfer philosophies. [Transfer quote](../public/js/shared/profile.js#L586), [camp inventory](../public/js/ui/hero-selection.js#L245).

## Encounters, exploration and modes

**Survival has a useful spine.** Three scheduled bosses at 4:30, 9:00 and 13:00 give a fifteen-minute run recognizable chapters; surviving the clock alone is insufficient without the final boss kill. Keep the HUD's explicit final-boss objective. Between bosses, judge the quality of navigation and build decisions rather than only kills per minute. [Boss timings](../public/js/data/waves.js#L168), [victory condition](../public/js/game/game.js#L2256).

**Crypts add duration without consuming the advertised fifteen minutes. Medium priority.** Their stopped clock is valuable tactical respite, but a run with several crypts can last far longer than its trial subtitle. Show elapsed expedition time alongside the night timer or state “15-minute night plus optional crypts” in mode details. Keep instant re-entry prevention and free exits; they limit repetitive exploitation without demanding a harsher death penalty.

**Dungeon Run must communicate its different rules. Medium priority.** It uses three floors, guardians and a combined kill/time/guardian-damage seal. The guardian can thaw through attacks, and a seven-minute fallback prevents an indefinite wait. Enemies can move through Dungeon walls, while crypt enemies path around them. A player transferring knowledge from crypts may therefore expect cover where none exists. Teach both the seal actions and the wall rule visually near the entrance. The seal's percentage is more useful when players understand its components. [Dungeon rules](../public/js/game/dungeon.js#L287), [seal calculation](../public/js/game/dungeon.js#L1044).

**Ranked is an endless personal challenge.** The UI already explains Elite-only play and personal records, so the old claim that it promises an actual shared leaderboard would be inaccurate. Keep that explanation near the mode selection, not only in records. A later standardized-loadout challenge could isolate mastery from account power, but that would be a distinct mode proposal, not a correction to the current rules. [Ranked explanation](../public/js/ui/screens.js#L405).

**Difficulty combines several axes. Medium priority.** Normal changes speed, enemy pressure and gold; Veteran and Elite change health, damage, population and ranged/charging frequency. Nightmare is an Elite-only population modifier. Describe the practical difference with short tags such as slower movement, fewer dangerous specialists and higher pressure, alongside payout. A sparse horde does not automatically mean a proportionally easier build economy because XP and pickups depend on what gets killed. Balance each axis deliberately. [Difficulty definitions](../public/js/data/difficulty.js#L48).

**Environmental and enemy threats need a consistent priority hierarchy.** The source includes charge preparations, area warnings, gust tells and terrain grace. The current controlled Frostfell capture still shows a central warning competing with bright player spells, pickups and damage numbers near the hero. It establishes a plausible visibility risk, not a measured dodge failure. Make hostile tells, projectile edges and the hero's position survive reduced player-effect intensity. Measure recognition with numbers/weather/shake both on and off. [Charge behavior](../public/js/game/enemies.js#L675), Frostfell example (`output/review-2026-11-07/13-frostfell-5min-controlled.png`).

**Optional risk should look optional. Medium priority.** A Cursed Skull permanently increases this run's horde and gold when collected by proximity. It is not a normal temporary buff, and its risk choice can be accidental during a pickup route. Give it a distinct approach cue and test whether players can explain the exchange before touching it. A confirmation hold is one option; it adds friction, so reserve it for consequential permanent run choices. [Skull effects](../public/js/game/game.js#L1988), [pickup handling](../public/js/game/pickups.js#L256).

## Interface, access and production scope

The pixel-art presentation, readable silhouette previews, directional menu navigation and portrait layout form a coherent product. The observed portrait hero screen retains roster, stage, stats and actions; the new equipment panel remains usable at 390 by 844. Keep those layouts as regression scenes. However, a complete novice sees many systems at once: gear, journey, upgrades, Codex, records, hidden recipes and a long roster. Use progressive emphasis rather than hiding useful functions arbitrarily.

**Medium priority.** Equipment inspection is now a nested text-dialog workflow with three-item pages. That is adequate for a small stash, but increasingly laborious for comparing several heroes and eight slots. Add a compact slot/inventory view with clear identified state, compatibility and an explicit change summary. Because ordinary damage bonuses are global stat contributions rather than a new independently animated sword attack, label their scope accurately. Retain scroll access to every effect; a rare item should not require guessing what was cut off.

Controls already cover keyboard, pad and touch, with contextual prompts. Options include soft/full flashes, screen shake, damage numbers, weather and scanlines. The inspected input definitions use fixed bindings; no remapping workflow was found. **Medium priority:** evaluate remapping, text scaling, shape/text redundancy for rarity and hostile colors, and a stronger low-effects preset. Touch should receive an actual second-finger crypt-combat playtest, not be considered validated because the bindings exist. [Options and controls](../public/js/ui/screens.js#L1103), [bindings](../public/js/engine/input.js#L5).

The eight selectable fifteen-minute combat recordings and separate boss/reward cue infrastructure give music a meaningful presentation role. Test warning audibility under dense combat and preserve mute-independent visual tells. Do not infer mix quality from the available filenames. [Music catalog](../public/js/engine/combat-music.js#L1), [boss arrival sequence](../public/js/game/arrival.js#L1).

No active run is resumable; progress is banked at death, quitting or victory. This is deliberate, and Quit Run gives a controlled way out. Still, optional crypt time makes a browser close or mobile interruption potentially expensive. State the banking rule before a long run and distinguish “end and bank” from browser abandonment. A future suspend feature needs an explicit exploit and persistence design; it should not be promised as a small UI toggle. [Persistence contract](../public/js/engine/storage.js#L1).

Finally, twenty-one signatures, five maps, three modes, permanent equipment, numerous shared weapons and evolving content create a large interaction surface. The test suite is valuable, but passing behavior tests is not an experiential quality gate. Prioritize representative scene captures, clear data definitions and a maintained archetype balance matrix over more isolated content. Fix the missing Footman portrait brief as an integration task; do not treat it as evidence of a broken combat system.

## Prioritized development roadmap

| Horizon | Work | Acceptance criterion | Main tradeoff |
| --- | --- | --- | --- |
| Immediate | Inventory management inside pending loot decisions | A full stash can keep a chosen new item by selling another item, without losing the receipt | More UI state and persistence paths |
| Immediate | Replace acquisition-order overflow disposal | A thirteenth exceptional item cannot disappear into an undisclosed automatic sale | More compact storage or a retained-set decision |
| Immediate | Clarify common identification and exact skill grants | Players can predict what spending gold changes before paying | Slightly more explanatory item text |
| Next focused iteration | First-run agency playtest | Typical testers can name a threat, explain a card and make an intentional next-run purchase | Possible opening card or encounter adjustments |
| Next focused iteration | Field/crypt targeting and cooldown teaching | Players intentionally attack and aim after one crypt entrance | Small teaching encounter and UI work |
| Next focused iteration | Threat visibility preset and encounter capture set | Hostile tells remain recognizable under representative developed builds | Less continuous spectacle for some settings |
| Medium term | Archetype balance matrix across meta stages | Each signature has an observable tactical advantage and no unexplained mode collapse | Fewer new heroes while existing ones are tuned |
| Medium term | Economy and identification lifetime review | Identification remains an understood choice across account ages; prices and sinks match intended play | Requires progression cohorts rather than one tuned run |
| Longer term | Build journal, advanced challenge and optional suspend study | Each feature answers measured demand without obscuring the core loop | Increased scope; defer until current decisions are dependable |

## Validation plan

Recruit a small first-time keyboard group, a returning-player group and separate pad/touch testers. Treat this as directional usability research, not a statistically powered retention study. Give fresh players the prologue and at least two ordinary Survival attempts. Ask for short explanations of what damaged them, why they picked a card and what an Armory purchase changes. Record whether they find the next hero goal, understand when the ultimate unlock applies and enter a crypt intentionally.

For controlled combat, compare melee, forward-ranged, area caster, summoner and positional recruit archetypes. Sample each at fresh, partially upgraded and full Armory states, with and without representative identified equipment. Use common seeds for within-experiment comparisons, then additional seeds to avoid tuning to one card sequence. Separate changes to movement AI, card policy, permanent stats and unlock pool: the existing ten-run sample changes several factors together and cannot establish their individual causes.

For loot, test ordinary/blue/gold finds; a useless duplicate; a class-incompatible stored weapon; a named unlearned skill; a capped all-skills bonus; zero gold; a full stash; thirteen collected items; and interruption/retry during identification. A tester should retain the intended item, understand dormant magic, predict the next price and distinguish sale proceeds from combat value. Test these scenarios with keyboard, pad and touch and at short landscape heights, where comparison cards depend on scrolling.

Useful voluntary telemetry would include time to first understood card, first damage and fall cause, defensive-card availability and selection, boss encounter duration, crypt entry/exit/faint time, ultimate ready-to-use delay, individual signature success events, identification offers and purchases by account age, full-stash rejection frequency, overflow items sold, and end-of-run management duration. Pair numerical events with observation: long decision time can mean satisfying deliberation or confusing controls. Success is a clearer and more intentional game, not simply more actions per session or a higher average kill count.
