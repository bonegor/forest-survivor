# Round-two balance implementation and evidence — 14 November 2026

The implementation demonstrated all 22 heroes winning Normal with the historical full-Armory benchmark preset on seed 2109, using real terrain and ordinary damage/input. All 22 lost both zero-Armory calibration matrices. An earlier tactical prototype also won all 22 on seed 1411 before production tuning. These demonstrate roster viability under that preset, not guaranteed wins on every seed: the final Necromancer policy loses 1411, and Ea’s 1412 win requires the alternate autopilot strategy. The production fixes target a demonstrated Trailblazer defect and weak evolution payoff, with no universal health or difficulty adjustment.

**Independent audit correction (15 November):** the no-profile headless preset used for every matrix in this report retained a legacy +2 rerolls and +2 banishes. It therefore granted seven of each at maximum Armory, versus five in a current real maximum-Armory profile, and two instead of zero in the no-Armory calibration. It also intentionally opens all content and six slots. Driver spent the supplied resources normally, but the old benchmark supplies were too generous. The extra two have now been removed and covered by a resource-parity regression. The original JSON evidence is preserved; corrected-resource holdout results and independent bug fixes are recorded separately in `hero-round2-playthrough-2026-11-14.md`. The earlier 22/22 claim must not be treated as a current-profile win guarantee.

## What changed

- Trailblazer now plants the actual short tripline after a point-blank impact. Previously every impact under 12 pixels discarded the tripline, deleting its crowd-control mechanic when enemies closed in. The wire still follows the actual arrow path, respects stone, hits each other body once, retains seven-contact and three-live-line caps, and excludes bosses/lords from trip damage.
- All twelve recruit evolutions receive stronger damage/cadence and selected reach/target-count improvements. Their original behavior, creature hit caps, boss restrictions, crypt releases, wall guards and non-repeated hits remain intact. Starter values are unchanged. No hero movement speed or HP, enemy stats, spawn rate or difficulty setting changed.
- Ea-nāṣir: Medium Quality Copper base damage 11→16, High Quality Copper 32→40, Lion’s Lash 36→48. Whip→Might+chest→Phoenix→rank-8 Medium Copper+chest remains the route. Cursed copper and its challenge remain unchanged.
- The opt-in `tactician` strategy checks visible terrain, individual bodies, missiles and telegraphs at 10 Hz while Game advances at 60 Hz; it faces directional weapons near their visible cooldown release and collects XP/chests. Its collision forecast is limited to the 48 nearest bodies within 80 pixels. It reads only BotView and supplies ordinary movement/ultimate input.
- The opt-in `tactical` pick policy includes all 22 heroes, reserves evolution-partner relic slots and spends only owned rerolls/banishes through the actual Game operations. It plans three shared support weapons per hero: five total for the two-starter Ea/Necromancer kits, four for other heroes. The original four-total target accidentally left two-starter heroes one support short. It also reads the real relic-slot cap for profile runs. The old build policy now has recruit/Ea shared-weapon preferences. No extra cards, resources, stats or wins are injected.
- `tools/bots.mjs --each` now prints completed games immediately, making long 60-Hz batches observable.

## Complete survival matrices

Every listed attempt reached death or victory, with Normal (`easy` internally), Darkwood/forest, Survival, 60 Hz, 18-minute cap, real terrain and no buffs/god mode. Profiles are disposable in memory. “Best old 2109” means the better of the two explicitly recorded autopilot/build and gems/build attempts; it is not a claimed win rate. The 1411 tactical matrix preceded recruit/copper tuning and used the earlier 180-pixel collision query; the final strategy bounds that query for runtime. The 2109 table uses the final run for each hero: the full matrix followed recruit/tripline tuning, then Ea and Necromancer were rerun after the private-stock and two-starter policy corrections. Initial 2109 results remain in their original JSON. These are not a controlled estimate of damage tuning alone: strategy/build corrections are explicitly separated from the isolated DPS comparisons below.

Original autopilot 1411: 4/22 wins. Best of old strategies 2109: 11/22. Tactical 1411 before tuning: 22/22. Tactical 2109 initially: 21/22; after the two-starter correction: 22/22.

| Hero | Old auto 1411 | Best old 2109 | Tactical 1411 before tuning | Tactical 2109 after tuning | No Armory 1411 / 2109 |
| --- | --- | --- | --- | --- | --- |
| Knight | Dead 9:16 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:21 / Dead 1:46 |
| Ranger | Dead 9:05 | Win 15:24 | Win 15:00 | Win 15:00 | Dead 4:49 / Dead 5:53 |
| Sorcerer | Win 15:00 | Win 15:12 | Win 15:00 | Win 15:00 | Dead 6:26 / Dead 1:21 |
| Shadow | Win 15:00 | Dead 9:51 | Win 15:00 | Win 15:00 | Dead 5:55 / Dead 1:38 |
| Necromancer | Dead 5:35 | Win 15:46 | Win 15:00 | Win 15:00 | Dead 1:58 / Dead 1:19 |
| Paladin | Dead 7:55 | Dead 13:00 | Win 15:00 | Win 15:00 | Dead 1:33 / Dead 2:13 |
| Druid | Dead 11:09 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:37 / Dead 1:45 |
| Berserker | Dead 13:41 | Dead 12:00 | Win 15:00 | Win 15:00 | Dead 2:21 / Dead 1:36 |
| Witch Hunter | Win 15:00 | Dead 12:40 | Win 15:00 | Win 15:00 | Dead 3:36 / Dead 2:23 |
| Copper Merchant | Dead 4:40 | Dead 14:16 | Win 17:01 | Win 15:00 | Dead 1:20 / Dead 1:25 |
| Footman | Dead 10:10 | Dead 5:46 | Win 15:00 | Win 15:00 | Dead 1:43 / Dead 1:03 |
| Marksman | Dead 4:23 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:30 / Dead 1:16 |
| Templar | Dead 6:25 | Win 15:22 | Win 15:00 | Win 15:00 | Dead 1:30 / Dead 1:24 |
| Trailblazer | Dead 4:41 | Dead 5:37 | Win 15:00 | Win 15:00 | Dead 1:16 / Dead 1:41 |
| Thornkeeper | Dead 4:29 | Dead 10:20 | Win 15:00 | Win 15:00 | Dead 1:16 / Dead 1:25 |
| Wraith | Dead 4:51 | Dead 9:24 | Win 15:00 | Win 16:33 | Dead 1:16 / Dead 1:15 |
| Gravebinder | Dead 3:29 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:12 / Dead 0:53 |
| Arcanist | Dead 4:41 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:12 / Dead 1:20 |
| Praetorian | Dead 8:57 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:02 / Dead 1:37 |
| Seraph | Win 15:00 | Dead 5:42 | Win 15:00 | Win 15:00 | Dead 1:39 / Dead 1:25 |
| Boltguard | Dead 3:41 | Win 15:00 | Win 15:00 | Win 15:00 | Dead 1:15 / Dead 1:15 |
| Swordbearer | Dead 5:52 | Dead 6:09 | Win 15:00 | Win 15:00 | Dead 1:34 / Dead 1:19 |

Failures are retained in the table and JSON. Strong differences between strategies and seeds are expected in a random build game; the best-bot objective is not a guarantee that every policy wins every seed. A later independent playthrough review owns final holdout certification.

The initial 2109 tactical Necromancer attempt died at 10:29 with only two preferred shared supports. With the same seed and final three-support policy it wins at 15:00. The final policy recheck on seed 1411: Copper Merchant: Win 15:00; Necromancer: Dead 12:18. The four final-policy zero-Armory Ea/Necromancer attempts on 1411/1412 all died. No health/stat compensation was applied to Necromancer.

Necromancer’s final 1411 alternates also failed: gems: Dead 9:18; autopilot: Dead 9:13. Its initial prototype win remains recorded, but this sample does not establish a final-policy win on every seed. The independent holdout reviewer should keep this build-sensitive case visible.

### Final Ea-nāṣir stock reruns

| Seed | Strategy / policy version | Armory | Result | Final weapons |
| --- | --- | --- | --- | --- |
| 1411 | tactician, initial support target | Maximum | Win 15:00 | lionslash:8, highcopper:8, thunderstorm:8, aegis:8, abyss:8, doom:8 |
| 1412 | tactician, initial support target | Maximum | Dead 12:29 | lionslash:8, highcopper:8, aegis:8, sanctuary:8, wisps:8, frost:8 |
| 1412 | gems, initial support target | Maximum | Dead 11:53 | lionslash:8, highcopper:8, sanctuary:8, aegis:8, stormlash:8, frost:8 |
| 1412 | autopilot, initial support target | Maximum | Win 15:39 | lionslash:8, highcopper:8, aegis:8, thunderstorm:8, doom:8, razorfield:8 |
| 2109 | tactician, initial support target | Maximum | Win 15:00 | lionslash:8, highcopper:8, whirlwind:8, aegis:8, briarheart:8, runestorm:8 |
| 1411 | tactician, final support target | Maximum | Win 15:00 | lionslash:8, highcopper:8, thunderstorm:8, aegis:8, sanctuary:8, whirlwind:8 |
| 2109 | tactician, final support target | Maximum | Win 15:00 | lionslash:8, highcopper:8, whirlwind:8, aegis:8, sanctuary:8, doom:8 |
| 1412 | tactician, final support target | Maximum | Dead 13:28 | lionslash:8, highcopper:8, aegis:8, sanctuary:8, whirlwind:8, abyss:8 |
| 1412 | autopilot, final support target | Maximum | Win 15:50 | lionslash:8, highcopper:8, aegis:8, thunderstorm:8, whirlwind:8, razorfield:8 |
| 1411 | tactician, final | None | Dead 1:20 | merchantwhip:3, goodcopper:4 |
| 1412 | tactician, final | None | Dead 1:22 | merchantwhip:3, goodcopper:4, blades:1 |

## Evolution payoff measured independently of survival wins

The real-Game DPS harness used two deterministic spawn seeds, eight seconds warm-up plus twelve measured seconds per case, four distributions (120 replenished ghouls, 36 tough ghouls, 40 undying bodies around the hero, one undying moving champion), and rank 1/rank 8/evolution. It disables XP/ultimate/pickups and neutralizes hero multipliers; its immortal observer measures damage pressure and is **not** a survival attempt. The fixed stop/go path is deliberately shared and does not aim every directional hit at a champion, so low single-target figures for front cuts are path-dependent, not proof of a targeting failure. Wall DPS compares raw output with no overkill and shows evolution growth without equating different roles.

| Recruit signature | Old rank-8 wall DPS | Old evolved wall DPS | New rank-8 wall DPS | New evolved wall DPS | New evolution/rank-8 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Linebreaker | 139 | 299 | 139 | 493 | 3.56× |
| Splitpin Crossbow | 277 | 544 | 277 | 832 | 3.00× |
| Votive Edge | 338 | 447 | 338 | 1017 | 3.01× |
| Wayline Bow | 76 | 101 | 314 | 844 | 2.69× |
| Briar Compass | 597 | 926 | 597 | 1441 | 2.42× |
| Aftercut Blade | 398 | 744 | 398 | 1308 | 3.29× |
| Carrion Tithe | 158 | 242 | 158 | 581 | 3.68× |
| Meridian Pendulum | 359 | 649 | 359 | 1101 | 3.06× |
| Shieldward Blade | 161 | 277 | 161 | 778 | 4.83× |
| Sunwing Edge | 249 | 344 | 249 | 700 | 2.82× |
| Ratchet Crossbow | 368 | 648 | 368 | 1045 | 2.84× |
| Marchsteel Greatsword | 126 | 184 | 126 | 425 | 3.39× |

Trailblazer’s rank-8 improvement is the close-wire repair; the other eleven rank-8 signatures are unchanged. Originals remain substantially stronger at unrestricted dense area clearing (for example Excalibur ≈8,166 and Meteor Storm ≈7,148 wall DPS), while recruit attacks retain restricted lanes, arcs and contact budgets. The tuning makes evolution matter without turning every signature into the same unlimited area attack.

| Private stock | Old rank-8 / evolved wall DPS | New rank-8 / evolved wall DPS | New evolved champion DPS |
| --- | ---: | ---: | ---: |
| merchantwhip | 435 / 835 | 435 / 1112 | 60 |
| goodcopper | 60 / 600 | 74 / 750 | 150 |

The high-quality stock retains a large payoff because it is behind two chest evolutions and the Phoenix gate; the earlier Whip evolution now gains 2.56× wall DPS over rank 8. All 24 unique starter weapons across 22 heroes (Necromancer and Ea have two apiece) have rank-1/rank-8/evolved horde, tough, wall and champion results in the DPS artifacts.

## Validation and artifacts

- Ten bot tests passed: deterministic replay, every strategy/policy, map/profile behavior, death reporting, CLI, resource-limited redraws, evolution-slot reservation, equal shared-support plans for two-starter heroes and terrain steering.
- Forty-three recruit/strategy mechanic tests passed across the twelve signatures, including the new point-blank wire case. Two former literal-damage expectations were changed to assert the current weapon damage and unchanged 1.54 crank / 0.48 shard ratios.
- 110 copper, Whip, progression, isolated object, creature-priority and wall tests passed after final private-stock values.
- Before source copies: `output/hero-round2-2026-11-14/balance/baseline/`.
- Complete survival results: `baseline-max-2109.json`, `tactical-max-1411-before.json`, `tactical-max-2109-after.json`, `tactical-none-1411-before.json`, `tactical-none-2109-after.json`, and `eanasir-{max,none}-1411-1412-after.json` in that directory.
- Final two-starter checks: `two-starter-{1411,2109}-final.json`, `two-starter-none-final.json`, `necro-1411-alternates-final.json`, `eanasir-max-1412-final.json`, and `eanasir-auto-1412-final.json` retain both wins and failures after the last policy correction.
- DPS: `dps-before/`, `dps-before-extra/`, `dps-after/`, `dps-originals/`, `dps-copper-after/` contain the raw per-seed scenarios and Markdown tables.
- Reproduce a final matrix with `node tools/bots.mjs --bot=tactician --pick=tactical --hero=all --armory=max --diff=normal --map=forest --runs=1 --seed=2109 --max=18:00 --jobs=4 --each --json=...`; replace Armory with `none` for progression baseline. Use a different seed for independent holdout.
