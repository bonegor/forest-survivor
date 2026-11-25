# Forest Survivor — revised gameplay review

Reviewed: 17 October 2026\
Baseline: `forest-survivor`, commit `0bdb0c6`\
Companion: [Casino-style reward presentation review](casino-review.md)

## Assessment

The strongest opportunities are clearer decisions, more visible progression, and better reasons to explore. The forest, optional crypts, signature weapons and permanent equipment already give the game a useful identity. Improve how players understand and use those systems before adding another layer of rewards or mandatory progression.

This revises the 16 October gameplay draft against the current implementation. It distinguishes confirmed behaviour from design proposals. The earlier draft's bot outcomes and earnings are historical observations, not a current balance baseline.

The comparison included source inspection and live checks of menus, a controlled evolution chest, the fury-ready indicator and victory results. Those controlled states verify interface behaviour; they do not establish normal run difficulty or player retention. The 55 targeted existing tests covering fury, signature weapons, automatic filler choices, bosses and the HUD passed.

## Current rules to preserve

- Normal and Veteran exist; Nightmare is an optional horde modifier. Ranked uses Veteran without Nightmare.
- Each hero has exclusive signature weapons. Shared weapons and relics provide build variety around them.
- Every level increases damage and health, with exponential health growth and armor milestones. Levelling is deliberately uncapped.
- Once a build is complete, ALWAYS can automatically take filler rewards without opening another choice screen.
- Crypt combat deliberately switches every hero to manual attacks with their main weapon.
- Permanent gear belongs to each hero. Crypt rewards and gear rarity are deliberately independent of luck.
- A run cannot be resumed. Progress is saved when it ends. Results provide one route back to camp.

These are established design decisions. A proposal that changes one needs a specific reason and a separate balance experiment.

## Corrections to the original draft

| Original observation | Current finding | Revised conclusion |
| --- | --- | --- |
| The ultimate is always ready because every kill gives 0.75 fury. | Kill-based fury now diminishes with kill rate. Boss, lord and champion damage, wounds and pickups also contribute. | The old explanation is obsolete. Measure all sources before retuning. |
| Everyone eventually uses Excalibur. | Longsword and its evolution are exclusive to the Knight. | That example is no longer possible through ordinary play. Investigate similarity among shared supporting weapons. |
| Bosses have one slam and need phases. | Bone King and Lich already change at half health; Butcher enrages below 30%. They have several attacks, including summons, charges and teleportation. | Review readability, counterplay and fight length rather than adding duplicate mechanics. |
| Combo never breaks. | It already expires after two seconds without a kill. Dense late hordes can refresh it continuously. | The useful criticism is that its late-game meaning becomes weak. |
| Pause and the HUD show conflicting clocks. | They now use the same clock helpers. | Addressed. |
| Victory bonuses need difficulty scaling. | Survival already pays a 300-gold Normal bonus and a 500-gold Veteran bonus. | Addressed. First-time bounties would be an additional system. |
| Pickups lack visibility effects. | Pickups already glow, and rarer gear casts coloured light. | Improve contrast or selected markers where needed rather than duplicating existing effects. |
| Scripted events are unannounced. | Rings announce themselves when they spawn; other events have less explicit signalling. | Advance warnings remain a useful improvement. |
| Ranked cannot end with a full Armory. | Late enemy health already compounds. An observed long run does not establish indefinite survival. | Require fresh, reproducible tests before choosing a new scaling curve. |
| A first minute with nine enemies proves the opening is empty. | The horde fills over time and depends on difficulty and mode. The current opening already has roads, shrines, indicators and early breakables. | Treat opening engagement as a playtest question; record configuration and both clock and real time. |

## Priority 1 — understanding and useful decisions

### 1. Teach the opening in play

Introduce movement, automatic attacks, gems and the ultimate with short, contextual first-run prompts. Explain manual attacks again when entering the first crypt. Use the active input device's controls and allow the prompts to be dismissed.

Success: a new player can explain how to level, use fury and attack underground without visiting Options. The prompts do not cover incoming attacks or repeat every run.

### 2. Explain evolution progress

Show the required relic's name, current weapon level and whether the combination is ready. Include Phoenix Heart's exception. Keep this information accessible on compact screens and in the pause/build view.

Success: a player can identify the missing ingredient and recognise when the next chest can evolve a weapon. Coordinate this with the companion presentation review.

### 3. Expose permanent equipment before a run

Show the selected hero's six gear slots, key bonuses and empty slots on hero selection or an adjacent equipment view. Preserve per-hero ownership and the existing wear/sell comparison.

Success: players understand why two heroes, or two attempts with the same hero, start with different strength.

### 4. Make dungeon seal requirements explicit

The seal combines a kill requirement and time on the floor, with a fallback release. Display the separate requirements and explain which one is still holding the guardian back. The current combined percentage obscures that distinction.

Success: a player who has killed enough enemies understands why the guardian remains sealed. Changing the seal rules is a separate experiment.

### 5. Explain deaths and the next goal

Record the killing enemy or attack and show it on results, with one relevant hint. Add next-unlock progress and useful Armory opportunities. Distinguish quitting from dying. Make the no-resume rule clear before a run.

Success: after a loss, players know what happened, what progress they kept, and one useful change for their next attempt. Save confirmation must remain clear and reliable.

### 6. Warn before a threatening event arrives

Give swarms and packs a short directional warning. Rings can receive an advance cue rather than only the announcement at spawn. Keep the information readable amid existing boss, crypt and reward banners.

Success: an attentive player can react before contact. Warning duration must be judged in real time at the game's current 1.32× pace.

## Priority 2 — focused gameplay experiments

### 7. Test fragile heroes' openings

Compare every hero on Normal with no, modest and full permanent upgrades. Use multiple seeds, movement strategies and human playtests. Measure survival checkpoints, first useful upgrade, first evolution, damage sources and recovery opportunities. Record gear and crypt use.

The Knight can remain forgiving. Other classes should offer understandable strengths and counterplay when unlocked. Historical bot win rates alone are insufficient grounds for a broad buff.

### 8. Add one functional landmark

Prototype a graveyard encounter or stone-circle challenge with a clear risk and reward. Give the player a reason to leave the road, and communicate completion. Prefer a reward that fits the encounter; guaranteed persistent gear from scenery would change the crypt economy.

Success: players deliberately choose the encounter and can explain why they took the detour. Expand only after the first prototype works.

### 9. Prototype a signature mastery branch

Start with one hero and two mutually exclusive upgrades that change tactics, such as piercing versus ricocheting arrows. Extend the existing signature rather than adding many weapons at once.

Success: both choices create viable, recognisably different runs. Preserve a useful role for shared weapons.

### 10. Measure remaining choice interruptions

ALWAYS already removes completed-build filler screens. Count meaningful choices and interruption time before changing XP. If early or middle runs still stop too often, prototype batching decisions while retaining the existing stat-level progression.

Do not simultaneously halve levels and double every upgrade: projectile counts, evolution thresholds, armor milestones and exponential health do not scale as one interchangeable number.

### 11. Give dungeon floors a distinct encounter or objective

Test one floor-specific objective or environmental mechanic. Do not start by halving visibility; threat readability has already needed improvement. A between-floor shop is a larger economy proposal because it spends gold that would otherwise fund permanent upgrades.

Success: players describe a meaningful difference between floors beyond their appearance and enemy strength.

### 12. Recheck progression economics

The Armory's full purchase cost is currently 55,630 gold. Measure current earnings across wins, losses, classes, difficulties and crypt use before changing prices. First-time bounties could provide understandable milestones, but recurring rewards need limits to prevent repetitive farming.

Success: the first few permanent purchases arrive at a satisfying pace, and trying another class does not feel like wasting progression.

## Proposals to defer or redesign

| Proposal | Concern | Better first step |
| --- | --- | --- |
| Combo multiplies XP and gold. | More XP grants more damage, exponential health and armor, which can sustain the combo further. It changes balance substantially. | Improve the display's meaning; test a modest capped reward separately, initially without XP. |
| Combo becomes a no-hit streak. | This rewards different classes and builds than a kill streak and can make incidental damage frustrating. | Compare prototypes and state the rule clearly. |
| Every champion gives full fury and an 8–12-second lull. | Repeated downtime may slow the run; full fury overrides the new charge economy. Boss slow motion already exists. | Protect existing boss celebrations first; test shorter relief where it improves pacing. |
| Shrines recharge every four minutes. | An endless forest may become an optimal safe farming circuit. | Establish whether revisiting old crossroads is desirable before adding timers. |
| Thieves take 10% of earned gold. | An optional chase becomes a punishment and can make a missed encounter feel unfair. | Add a visible escape cue and clearer treasure reward first. |
| A potion pocket uses F. | F currently toggles fullscreen. Storage, touch and gamepad interaction would also need design. | Treat a pocket as a separate feature with an explicit input plan. |
| Ranked should forcibly end around 35–50 minutes. | The target is unsupported by current evidence and interacts with intentionally uncapped growth. | Test late runs with fixed configurations and identify actual failure or stalemate conditions. |
| Add set bonuses and several new legendary powers immediately. | Several interacting systems would obscure whether existing gear choices work. | Make current equipment visible, then test one distinctive power. |
| Daily seeds and an attract mode. | These add scope before the core decisions and reward feedback are clear. A reproducible daily run also requires controlled gameplay randomness. | Revisit after the higher-priority work. |

## Validation and delivery order

1. Coordinate reward sequencing fixes with the companion review.
2. Deliver onboarding, evolution progress, equipment visibility, seal clarity and death explanations.
3. Establish a current balance and economy baseline.
4. Prototype one landmark and one mastery branch independently.
5. Evaluate dungeon differentiation and any combo or progression changes separately.

For each experiment, change one major variable, record the configuration, and observe whether players understand their decisions and want another run. Avoid treating a larger counter or a longer animation as proof of better replay appeal.

## Implementation references

- [Heroes and signature weapon pools](../public/js/data/heroes.js)
- [Player progression and fury](../public/js/game/player.js)
- [Run rules, choices, combo and crypt transitions](../public/js/game/game.js)
- [Boss attacks and phases](../public/js/game/bosses.js)
- [Spawner and event announcements](../public/js/game/spawner.js)
- [Dungeon seals and encounters](../public/js/game/dungeon.js)
- [Menus and hero selection](../public/js/ui/screens.js)
- [Overlays and results](../public/js/ui/gamescreen.js)
- [Profile rewards and Armory](../public/js/shared/profile.js)
