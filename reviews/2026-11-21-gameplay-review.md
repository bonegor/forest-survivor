# Gameplay review · 21 November 2026

This is a review of the source in the working tree (main at 352d812, plus the uncommitted work). Nothing was played or simulated. Under the standing rule, no bots, headless runs or tests were run.

Numbers come from the code. Those I worked out from its constants are marked (calc).

Proposals have ids G1–G12, so you can approve them by id. Onboarding, loot and identification, and threat visibility were covered by the reviews of 16 and 27 October and the two of 7 November. This one doesn't repeat them.

## Verdict

Forest Survivor already has more content than most survivors-likes ship with:

- 22 heroes and 23 shared weapons (12 in the first circle, 11 in the second circle)
- 25 relics
- five maps, each with its own movement rules
- crypts, the Dungeon Run, Ranked, and gear

What it doesn't have yet is what the genre's best games are remembered for:

- builds whose parts multiply each other
- boss fights players remember by name
- a reason to play run 200 differently from run 20

The evidence:

- **Damage types only colour the numbers** (`game/game.js:1193`). No foe resists anything or is weak to anything.
- **A foe has only one damage-over-time slot.** Burn, poison and bleed overwrite each other, and the strongest wins (`game/enemies.js:587`).
- **Statuses don't pay off.** About a dozen sources slow, stun, root, freeze or frighten foes. Only one thing cashes that in: Frozen Heart's shards deal ×1.5 to a frozen foe (`game.js:1161`). Brand (Smite, Beacon) and Hex are the only other effects that reach across weapons.
- **Most relics are plain stats.** About 15 of the 25 are stat lines like +10% damage, +1 armor or −7% cooldown. Ten relics evolve nothing.
- **10 boss names share 5 fighting kits** (`data/enemies.js:165-177`). The Pharaoh and the Pit Lord fight as the Bone King, the Frost Giant as the Butcher, and the Thorn Queen as the Lich. On Elite the night's bosses carry roughly 65k–188k health (calc).
- **22 heroes share 10 ultimates.** Each of the 12 recruits' perks is one small stat, such as +1 armor or +10% area.
- **Runs barely vary.**
  - Every run gets a fresh random seed (`game.js:238`).
  - The only run modifiers are Nightmare, Cursed Skulls and the copper curse.
  - There are no heat levels, no daily run and no shared seed.
- **Gold found in a run can't be spent** until the run ends.
- **The Armory runs out.** Maxing it costs 66,530 gold over 98 ranks (calc). After that, the only long-term goals are Ranked times and gear.

**Recommendation: stop adding breadth** (heroes, maps, shared weapons) and spend the next stretch on depth, starting with G1–G5. Each of them multiplies the content that already exists instead of adding to the pile.

## What already plays at the top of the genre (keep)

- **Crypts.** The clock stops, the hero strikes by hand, packs sleep, named lords wait, and the exit is always free. I know of no other survivors-like with this change of pace. G8 builds on it.
- **Maps that change how you move.** Quicksand, ice slides, gusts and the duststorm each pose their own movement problem. The Fae Thread stands out: it is a movement verb that rewards drawing loops through the horde, and few games in the genre have a map mechanic this good.
- **Chest and evolution ceremony.** This includes the director that keeps celebrations from stepping on each other.
- **Ea-nāṣir.** A meme merchant whose curse turns into a hero unlock is the kind of story players retell. The game could use more of this voice.
- **Your standing rules.** Signatures are unique, there are no rip-offs, levels give nothing, and damage never shoves the hero. These rules keep the game honest, and every proposal below keeps them.

---

## The big bets

### G1 · Reactions: statuses other weapons cash in

**The problem.** Statuses are set all over the game, but almost nothing reads them. So a build is a list of independent damage sources, and choosing cards comes down to picking the biggest number.

**The proposal: four reactions, each set up by some weapons and cashed in by others.**

| Reaction | Set up by | Cashed in by | Effect |
| --- | --- | --- | --- |
| **Shatter** (Frozen Heart's rule, extended) | Frost Nova, Rimeheart, gusts, Frost Rune | any heavy blow: sword, axes, Smite, crossbows | +50% on a frozen foe, which bursts into shards on death |
| **Combust** | Miasma, Puffcap Spores | any fire: Fireball, Firebomb, Ember Heart, Lantern | the poison is used up in one burst: its remaining damage ×1.5, radius 30 |
| **Exposed** | stun, root, slow: Lightning, Roots, Bramble, Caltrops | crits | +25% crit chance against the held foe |
| **Hemorrhage** | bleed: Grappling Hook, Kraken | a crit | the bleed's remaining damage lands at once |

**Separate slots.** Burn, poison and bleed should each get a slot of their own, so that Ember Heart no longer wipes out Miasma.

**Also needed:**
- A one-word line on each card ("sets Frozen", "cashes Frozen") and in the Codex.
- A tiny status pip over affected foes.

Bosses are never frozen today, so Shatter never applies to them. That rule stays.

**Cost: medium.**
- The work is in `hitEnemy`, `addDot`, the Enemy status fields, card text and Codex lines.
- Balance:
  - **Option A:** reactions sit outside the weapon bands.
  - **Option B:** `tools/dps.mjs` re-measures the bands. That is a measurement, so I'd ask you first.

**Why first.** G1 turns 23 shared weapons and 25 relics into combinations rather than a list, without adding a single new item.

### G2 · Fusions: two weapons become one

**The proposal.**
- When two shared weapons are both at level 8, a chest can fuse them into one weapon, which frees a slot.
- Recipes stay hidden, like evolution relics, until the fusion has been made once. The profile already records evolutions made, so it can record fusions the same way.

**First set of six:**
- Frost Nova + Firebomb Flask → **Steamvent**: pools that freeze, then scald. It sets up both Shatter and Combust.
- Lightning Strike + Moonglaive → **Stormglaive**: the glaive carries a bolt to each foe it passes.
- Caltrops + Bramble → **Briar Road**: thorns that root along your trail.
- Gale Horn + Grave Hollow → **Maelstrom**: the horn blows the horde into the pit.
- Banshee Bell + Caltrops → **Stampede**: fleeing foes run over the spikes.
- Guardian Blades + Will-o'-Wisps → **Lantern Ward**: the orbiting blades shed wisps when they strike.

**Signature fusions.** Each hero would also get one: the evolved signature plus one named shared evolution makes a third form only that hero has. Two examples:
- Excalibur + Sanctuary → **Oathblade**
- Stormstring + Thunderstorm → **Skyfall**

This is the cheapest way to give the 12 recruits an identity beyond their shared ultimate.

**Rule check.** Each fusion has to be checked against your no-rip-off rule before it's built.

**Cost: medium to high.** Each fusion is a weapon: data, behaviour, effects, and a sound you'd pick by ear. A sensible start is the six shared fusions plus the nine original heroes' signature fusions.

### G3 · Bosses with mechanics of their own

**Today's bosses:**

| Boss | Attacks |
| --- | --- |
| Bone King | nova, summons, sweep in phase two |
| Butcher | charge, slam |
| Lich | bolt rings, blink, Wraiths |
| Demon Lord | three phases |

The four map bosses reuse these kits. A fight is mostly a health pool with two or three moves to dodge, and dawn burns away whoever is still standing.

**Proposal: give each map's final boss one mechanic built on that map's rule,** so the fight tests what the map taught:

- **Neferkhet (Sunscorch)** calls in the duststorm. He opens quicksand rings round the hero, which the hero must wade out of. His Mummies wrap the hero and slow him.
- **Hrimgar (Frostfell)** stamps the ground into ice sheets. His charge cracks the ice, and the slide becomes the way to dodge it.
- **Sylvaine (Bloomvale)** grows thorn hedges that cut the Fae Thread. A loop closed round her stuns her for two seconds. Today no boss ever sleeps under the Thread, and a stun is not sleep, but this one needs your say.
- **Belzakor (Abyss)** cracks the plates. A fault glows, then falls into lava or void, and the arena shrinks.
- **The Bone King, the Butcher and the Lich** each get one new move in phase two.

**A boss trophy.** A boss kill would also offer one of three boss boons: rule-changing relics, see G7. These come on top of the chest. This is the Hades boon moment: a boss fight that changes the rest of the run.

Once bosses have more to dodge, their Elite health could come down, so a fight is 45–75 s of dodging rather than a damage race. That needs measuring, so I'd ask first.

**Cost: high.** It needs AI code and telegraph art for every boss. It also has the highest "people remember it" payoff of anything here.

### G4 · Oaths: a heat ladder for after the Armory

These work like Hades' Pact or Balatro's stakes.

**How they work.**
- The player picks oaths on the trial screen.
- Each oath adds 1–3 weight and raises the gold paid.
- Records keep the highest weight won for each hero and each map. The stars already exist to show it.

**Ten to start:**

| Oath | Effect |
| --- | --- |
| Iron | no armor from any source |
| Glass | max health halved |
| Few Hands | one weapon slot fewer |
| Long Night | 20 minutes |
| Hunted | champions come twice as often |
| Restless Dead | skeletons rise once more |
| Wrath of Kings | bosses start in phase two |
| Famine | no potions in boxes |
| Silence | no ultimate |
| Pitch Dark | night light 30% lower |

Nightmare becomes one of the oaths and keeps its id.

**Why.** Once the Armory is full, the only goal left is a Ranked time. Oaths give every map and every hero a ladder to climb, built from content that already exists.

**Cost: medium.** Save room is the catch. The worst-case cookie has about 2 characters spare, so the best weight per hero and map needs room made first, or those bests live only in localStorage.

### G5 · The Daily Night

**What it is.**
- One run a day from the date's seed, with the hero, map and one or two oaths fixed for everyone.
- One counted attempt per day.
- A result line to paste: `Forest Survivor · 21 Nov · Sunscorch · Shadow · 12:41 · 3 bosses`.
- No server is needed: the pasted lines in Discord or itch comments act as the leaderboard.

**Why.** It is the cheapest community feature in the genre, and streamers and Discord servers run on shared seeds.

**Cost: low to medium.**
- The seed today is `Math.random` (`game.js:238`).
- The headless harness already seeds the dice, so the mechanism exists.
- The seeded-dice discipline applies to any change in update code.

---

## Sharpening the run

### G6 · Gold you can spend tonight

**The proposal.** A merchant camp stands at some of the shrines. It sells a reroll, a heal, a weapon rank or a relic rank, and its prices rise through the night.

**The choice it creates.** Gold spent there is not banked, so the player must choose between surviving now and saving for the Armory. Brotato is built on this decision. An "honest" cousin of Ea-nāṣir could give the camp its voice.

**Cost: medium.** It needs one screen, and that screen can reuse the card code.

### G7 · Relics that bend the rules

**The proposal.** Add a third kind of relic, built on trade-offs. These are found only as boss trophies (G3) and at crypt altars (G8), never on level-ups. The plain stat relics stay as the base, and these become the spice.

| Relic | Effect |
| --- | --- |
| Glass Heart | +40% damage, −30% max health |
| Hollow Crown | weapons stop at level 6, but every weapon fires +1 projectile |
| Wolf's Oath | +25% speed, armor counts half |
| Bloodpact | potions heal nothing, and kills heal 0.2% |
| Moonlit Edge | crits deal ×3, crit chance halved |
| Miser's Ring | gold pickups also fill fury |
| Lantern of Truth | shrines last 60 s, but every other shrine is gone |

### G8 · Crypts that pay into this run

**The problem.** Today a crypt gives:
- gold
- chests, which only level what the hero already holds
- gear, which waits until the run ends

So the detour mostly pays the account.

**The proposal.**
- **An altar room in each crypt**, behind the last lord or opened by a lever. The player picks one of three:
  - a rule relic (G7)
  - a weapon rank
  - a curse in exchange for power, for example one more Cursed Skull for a guaranteed evolution
- **A few new room types** to break the rhythm of sleeping packs:
  - a trapped corridor of spike plates, with tells
  - a sealed vault, opened by a lever elsewhere
  - an elite gauntlet: a timed fight for a gold chest

**What stays.** The clock still stops, the exit is still free, falling still means fainting rather than death, and gear stays free of luck.

### G9 · Overcharge past level 8 (answers open question D8)

**The proposal.** Once a weapon is evolved or maxed, level-ups can offer Overcharge on it:
- +8% damage and a slightly bigger effect per rank
- ranks have no cap, but each gives less than the one before

Blessings stay as fillers, and ALWAYS still works.

**Why.** Late levels then grow the weapons the player chose, which reads as a power fantasy. Today the same moment reads as "Blessing ×17".

### G10 · Monsters that make you move differently

**Today's horde.**
- One shooter, the Cultist, at weight 1 of about 30 per pocket.
- Three chargers: wolf, orc and hellhound.
- Every other kind walks, flies, hops or zigzags, and differs only in speed and health.
- On Elite, a ring can hold about 1,490 monsters.

**The proposal: four "pressure" kinds,** each a few percent of spawns, each with a clear tell:

- **Bloaters** burst on death into a slow poison pool. That punishes standing in melee and rewards kiting. On Veteran a third as many come, as for shooters.
- **Shield-bearers** block from the front, so you have to flank or pierce them. That gives Arcane Ray, the crossbows and the axes a job.
- **Shamans** speed up and heal the foes around them. They are a priority target that lights up Lightning Strike's "toughest foe" and the Witch Hunter's bonus.
- **Gem-eaters** (a Ghoul variant) run for gems on the ground and grow. Killing one returns what it ate, doubled. That adds urgency without a timer. The doubled return counts as a new horde drop, so it is your call.

Map variants come through `STANDS_FOR` as usual. They still follow the rules: no hero shove, and Normal and Veteran get only a third as many shooters and chargers.

---

## Heroes

### G11 · Hero trials, talents and a branching roster

**Trials and talents.**
- Each hero gets three trials that teach the signature. Two examples:
  - Footman: stagger 300 lead foes in one run.
  - Trailblazer: 200 kills by triplines.
- Each trial unlocks one of three talents, and the player picks one talent at hero select.
- A talent changes how the signature plays. Two examples:
  - Knight: a swing that hits five or more foes gives +2 armor for 1 s.
  - Ranger: arrows pierce one more foe for every 100 px they fly, and the bow still fires straight.

**Recruit perks.** Replace "+1 armor" perks with ones that touch the signature.

**The ladder.** Today it is one line: 20 heroes, each opened by 4–10 minutes with the hero before. Branch it: the Knight opens three heroes, and each original hero opens its two recruits. A new player then gets a choice early, instead of 20 padlocks.

Hero save bits are append-only (436b5e9), and branching changes only the conditions, not the bits.

---

## Learning from a run

### G12 · Run history and a real death recap

**Today.** At death the player sees the top three damage sources and one of three fixed tips (`ui/gamescreen.js:1746`).

**The proposal.**
- **Run history.** Keep the last 20 runs: hero, map, oaths, time, build icons and killer.
- **Death recap.** Show:
  - the killer's portrait
  - the last 5 s of damage by source (`player.js` already splits it into `fromMobs`, `fromShots` and `fromBoss`)
  - a build card that can be saved as an image and shared

---

## Not recommended

- **More heroes or maps before G1–G5.** 22 heroes and five maps are enough for a 1.0.
- **A general dash or dodge key.** Moving is the game's identity. Terrain, the Fae Thread and the Berserker's leap already give movement verbs. Give movement more reasons instead (G3, G10).
- **More raw health to make it harder.** Monster health already runs from 1× to 13× over a night (`data/waves.js:90`), on top of difficulty. Difficulty should come from oaths (G4) and new kinds (G10).
- **A kill counter again.** You removed it on 28 October, and the reason still holds.

## Smaller things noticed

- **Unwarned jolts** (`game/spawner.js:80`). Every 30–90 s, about 46 swift foes come from ahead on Elite (6 × 7.74, calc). This is intended (27 October). A faint rustle at the screen edge would keep the surprise and remove the cheap hit. Your call.
- **Stale comment.** `game.js:231` says Nightmare is Veteran-only, but it is Elite-only (`data/difficulty.js:142`).
- **Two names for one boss.** The Dungeon's description says "Demon Lord" (`difficulty.js:159`), but the victory banner says "Lord of Cinders" (`game.js:2384`).

## Suggested order

1. **G1 + G9:** one pass through `hitEnemy` and the level-up pool. The cost is small for the payoff.
2. **G4 + G5:** replay value, built mostly from existing content.
3. **G3 + G7:** bosses and their trophies. This is the big art cost.
4. **The rest as follow-ups:** G2, G8, G10, G11, G6, G12.
