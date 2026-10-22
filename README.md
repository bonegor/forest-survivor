# Forest Survivor

A medieval, Diablo-flavoured survivors-like for the browser. Pick a hero, auto-attack your way through ever-growing hordes, level up into evolved weapons, **survive the night** in the Darkwood, **delve three dungeon floors** to slay the Lord of Cinders, and finally see how long you last in the **endless Ranked night**.

Everything is hand-made in code: pixel-art sprites authored as palette strings, procedurally painted trees and dungeon tiles, a dynamic light map and synthesized sound effects. The menus' frames, buttons and title font are the exception: Foozle's Lucifer RPG UI and Kenney's Fantasy UI Borders (both CC0) and the Pixtura12 and Jacquard blackletters by eishiya and Sarah Cadigan-Fried (SIL OFL), baked into `public/assets/ui/` by `tools/bake-ui.mjs` and `tools/bake-fonts.mjs` (credits in `public/assets/ui/CREDITS.md`). Music: Alexandr Zhelanov's "Decision" (CC BY 3.0) on the menus; for the night, a 17-minute loop of driving rock and metal by Askyel, Ian Alex Mac, Gundatsch and Muldjord (CC BY / BY-SA); Lincoln Domina's "Hunting Grounds" (CC BY-SA 3.0) in the crypts; Juhani Junkala's CC0 "Epic Boss Battle" for the bosses; 0 A.D.'s "You Are Victorious!" and "Dried Tears" (Wildfire Games, CC BY-SA 3.0) at dawn and at death; the Dungeon Run keeps NES-style chiptune from OpenGameArt (mostly HydroGene's CC0 loops). Credits in `public/audio/music/CREDITS.md` and on the Options screen. The files listed in `public/audio/music/tracks.json` play: title, forest, crypt, boss, victory, game over and a piece per Dungeon Run floor. Loops cross over between two players so the seam never gaps. These files are the only music: a piece without one is silent. There are no dependencies.

## Run it

```bash
npm start          # http://localhost:3000
npm run dev        # same, with developer mode open and auto-restart
npm test           # everything in test/
npm run bots       # bots play-test the game headlessly (see Bot play-testing)
```

Requires Node 18+ (the tests, Node 21+). Set `PORT` to change the port.

## Publish it on GitHub Pages

Every push to `main` that changes `public/` publishes the game once `npm test` passes (`.github/workflows/pages.yml`). Only `public/` goes out: not the server, the tools or the Sprite Lab.

One-time setup, in the repository's **Settings → Pages**:

1. **Source:** GitHub Actions. Then push, or run **Publish the game** from the Actions tab.
2. **Custom domain:** enter it, and add records at the domain's DNS:
   - a subdomain such as `play.example.com`: a `CNAME` to `bonegor.github.io`
   - the bare `example.com`: `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and `www` as a `CNAME` to `bonegor.github.io`.
3. **Enforce HTTPS** once GitHub has issued the certificate.
4. **Verify the domain** in your account's own Settings → Pages, so no one else can attach it to their site.

There's no game server on Pages (its `/api` calls get a 404), so:

- **The save is a plain browser cookie** (see Saving). A player can read and edit their own with the browser's tools. That reaches no one else, since players share nothing.
- **Developer mode is off.** The panel opens only on this machine (localhost). The debug address (below) works there, though, and its developer panel with it, on the debug game's own save.
- **The page carries the server's content security policy** in a meta tag, all of it but `frame-ancestors`, which a meta tag can't set.
- **Saves belong to the domain.** A move to another domain, or to a game server, starts every player afresh.

## How to play

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | left stick / d-pad | drag anywhere |
| Ultimate (when the fury orb is full) | Space / E / Q | X / triggers | tap the fury orb |
| Strike (in crypts) | X / Shift | LB / RB | tap a second finger |
| Pause | Esc / P | Start | ⏸ button |
| Dungeon or crypt map | Tab / M | Back | — |
| Pick a level-up card | 1–4, arrows + Enter, click | d-pad + A | tap |
| Reroll level-up | R | Y | button |
| Banish a level-up card | B (the card in focus), or BANISH then the card | left-stick press (arms it, again cancels), then A on the card | hold the card, or BANISH then tap it |
| Always take this filler (build maxed) | Shift + 1–3, or tick ALWAYS under the card | d-pad down to ALWAYS + A | tap ALWAYS |

Weapons fire automatically, except in the crypts (below). Collect soul gems to level up; every level offers a choice of new weapons (the hero's own signature and those shared by all, below), weapon upgrades or relics. Each level also makes the hero a little stronger, without limit: +1% damage a level, health growing 1% on itself a level (×2.2 by level 80, ×19.6 by 300), and a point of armor every 10 levels (`levelBonus` in `public/js/game/player.js`). The level-up screen shows what the levels have given so far. It pops up mid-fight, so for its first 0.75 s its cards stand greyed: the focus moves (arrows, a pad, the mouse, a click or tap, a card's number) but nothing is taken, and a press then is dropped, never kept for later; Space, the ultimate's key, never takes a card. Each card says NEW WEAPON or NEW RELIC, or the level it brings, with pips for the levels so far. Each run has two **rerolls** and two **banishes** (more from the Armory): REROLL draws all new cards; BANISH takes the card in focus off the screen and its weapon or relic out of the run for good, never offered again on a level-up or in a chest (one the hero already holds stays, at the level it has), and a card drawn anew takes its place. A filler can't be banished, and no level can be skipped. When fewer upgrades are left than a level-up offers, three fillers fill the rest: a stacking **Blessing of Valor** (+5% might, +2% health), **Roast Chicken** (heals 35%) and a **Purse of Gold** that grows with the night and your greed (30 gold at dusk, 72 at minute 10, counted with the gold you find). Once the whole build is maxed a level-up shows just those three (never a copy for a fourth card, and no reroll or banish to spend), and each has an **ALWAYS** toggle under it (or Shift + its number): take a card with ALWAYS ticked and every level-up for the rest of the run takes it with no screen and no pause, a line over the hero saying what it gave ("Blessing ×17", "+35% health", "+41 gold"). The pause menu shows the choice ("Level-ups: always Gold") with **ASK AGAIN** to undo it; it lasts the run, not between runs. Chests draw from the same upgrades as the level-up cards, but only levels of the weapons and relics you already have: a chest never gives anything new while one of them can still grow, and only once all are at their top does it draw a new weapon or relic (while a slot is free), so it never comes back with gold alone while anything is left to grow; with the build maxed, each of its draws is your ALWAYS choice, else a Blessing.

The **fury orb** (bottom right) fills toward the ultimate, which fires only when it is full and empties it (`FURY` in `public/js/game/player.js`). Kills fill it, each worth less the faster you are killing: a lone kill 0.75%, half that at 40 kills a minute, so the horde gives no more than about 30% a minute however many fall. Blows on a boss, a crypt lord or a champion fill it by the share of its health they take (a boss's whole health is a full orb, a lord's 60%, a champion's 30%; the ultimate's own blows give nothing), and killing one adds 35%, 25% or 8%. Your own wounds fill it too, a quarter of your health lost a fifth of the orb. And a **fury orb** gives 40%. So it comes from fighting the big ones, from trouble and from what you break, not from the horde alone.

**Quit Run** in the pause menu ends the run there and then, and you keep the gold you found. A run is never saved to come back to: progress (gold, wins, records, unlocks, the gear worn) is saved only when the run ends, by death, by Quit Run, or by victory and back to the menu. Close the game mid-run and that run is gone, with nothing of it kept.

### Heroes

| Hero | Unlock | Starts with | Perk | Ultimate |
| --- | --- | --- | --- | --- |
| Sir Aldric, Knight | — | Longsword | +2 armor, +180% health, +7% speed, slow regeneration | Whirlwind |
| Lyra, Ranger | 5 minutes survived with the Knight | Hunting Bow | +20% damage and attack speed, +50% health, +crit, +speed | Arrow Storm |
| Eldrin, Sorcerer | 5 minutes survived with the Ranger | Fireball | −cooldowns, +area, +XP | Cataclysm |
| Kael, Shadow | 5 minutes survived with the Sorcerer | Shadow Blade | +crit, +speed, +luck | Shadow Dance |
| Morvath, Necromancer | 5 minutes survived with the Shadow | Raise Dead (skeleton minions) and Miasma | minions last 30% longer, +10% XP | Army of the Dead |

### Modes

- **Survival — 15 minutes.** Endless forest, night falls darker, bosses arrive on a schedule. Survive until dawn to win.

The Darkwood (Survival and Ranked) is one endless forest, the same in every run. You start on a crossroads with four roads out to the four corners; each runs about 30 seconds of walking, mostly straight with the odd bend, to another crossroads with a wayside shrine, and on from there in every direction. The four roads out of any crossroads lead to four different shrines. Groves, meadows, pine and cursed woods, and landmarks down footpaths (stone circles, ruins, graveyards, woodcutters' camps) fill the woods between. Nothing is stored: every patch of forest is worked out from a fixed seed as you reach it (`public/js/game/darkwood.js`; `node tools/mapgen/endless.mjs` draws previews of it).

Every second crossroads has a **crypt** beside its shrine, so whichever way you walk there is one about a minute from the start and another every minute after. Walk up its steps and the night's clock stops: dawn comes no closer, the horde neither grows nor follows, and Ranked doesn't count the time. Down there each hero has their own weapon alone (the Knight his sword, the Ranger her bow, the Sorcerer his fireball, the Shadow his Shadow Blade, the Necromancer his Raise Dead, not his Miasma, or what it evolved into), and it fires only when you strike (X or Shift): at the nearest foe in its reach, the blade landing or the shot leaving on the sprite's blow frame; held, it strikes each time the weapon is ready. The others wait outside. Inside, about ten rooms hold sleeping packs of the night's foes (as strong as the minute you went in), and two to four named lords sleep in rooms of their own, each in the middle of a smaller pack, its guard, that wakes with it: two lords in the night's first five minutes, three from minute 5, four from minute 10, and one more (four at most) in a crypt three rings or more from the start (`cryptLords` in `public/js/game/dungeon.js`). One sleeps in the room the longest walk from the stairs, the others as far from the stairs and from one another as the crypt allows. The stairs you came down always lead back up: walk up them whenever you like, its lords alive or not. Each lord drops coins and gold and, rolled for each lord alike, a piece of **gear** and a champion's chest (half the time), the gear alone (a quarter) or the chest alone (a quarter), side by side, nothing of it in a wall (`LORD_DROPS` in `public/js/shared/items.js`). When the last one falls the wall breaks open on a way up at least five tiles' walk from you (the nearest such stretch of wall): moonlight runs along the shortest walk there (A*, worked out again as you move), on the map too. However you leave, up the stairs, through the hole, or by falling, which wakes you by the door outside, the crypt is sealed for the rest of the run, and it counts as cleared only once its last lord has fallen. Whatever lies about when you climb out (gems, gold, chests, gear) comes with you. Each chamber has a row or two of boxes along its walls (2 to 10), not the many of a Dungeon Run floor.
- **Dungeon Run — 3 floors.** Each floor's guardian sleeps behind a seal until you've slain enough foes and spent long enough on the floor. Kill it, take the stairs, and defeat the Demon Lord on floor 3. Your build carries over between floors.
- **Ranked — endless.** No dawn. The night keeps getting deadlier, the four lords return in rotation every 4½ minutes, and past the half-hour a blood moon rises. Your score is how long you last, kept as a personal best per hero with a rank title (Peasant, Squire, Knight, Champion, Paladin, Warlord, Hero at 30 minutes, Legend at 40, Mythic at 50, Immortal at an hour).

The horde walks in **four classes of speed** (`hordePace` in `public/js/game/enemies.js`), the same on both difficulties: swift (bats, rats, imps, Hellhounds) at a Knight's own pace with no upgrades, 74.7 px/s; quick (Dire Wolves, spiders, Goblins, slimelets) a tenth slower; steady (Skeletons, Wraiths, Death Knights, slimes) two tenths; slow (Ghouls, Ogres, Orc Brutes, Cultists a tenth slower still) three tenths. Bosses, crypt lords and the Gilded Thief keep their own.

There are **two difficulties**, chosen on the trial screen and remembered with the settings (`public/js/data/difficulty.js`):
- **Veteran:** the old Hard, with about 3.9× as many monsters (four times the 45% more it had, 20 October 2026, then two thirds of that, 21 October) that each have about 2.3× the health and deal about 2.8× the damage. It pays gold at the old Hard rate (×1.5).
- **Normal:** Veteran with every monster at 70% less health (champions, bosses and the crypts' lords too), and every blow the hero takes halved, after his armor, from monsters, their shots and the bosses alike. A third as many of the monsters that shoot or lunge come (Cultists, Dire Wolves, Orc Brutes, Hellhounds), in the steady horde, the packs and the crypts; other kinds take their place. Its horde is half Veteran's (a third of what both sent before, 21 October 2026), in the steady horde and the swarms, rings and packs alike. For the last six minutes of the night, from 9:00, 30% more of the same monsters come, in the steady horde and the swarms, rings and packs alike; on a Dungeon Run, whose floors' clocks map onto the same night, from about 3½ minutes into the second floor and all through the third, and on the first too for anyone who lingers there about 11 minutes. It pays gold at the old Medium rate (×1).

Ranked is always Veteran, since it keeps one best time per hero. A night survived on either counts on the unlock ladder.

**Nightmare** is a box beside the two, ticked or not on the trial screen and remembered with the settings like the difficulty (off at first). A Veteran modifier (its box is shut on Normal), it sends three times as many monsters (twice before 21 October 2026), each class of the horde walking about 21% faster (the swiftest 5% past a Knight with every rank of Swiftness), in the steady horde and the timed swarms, rings and packs alike, in Survival and on a Dungeon Run; each monster is as strong as ever, and the crypts' sleeping packs, champions, thieves, bosses and their summons come as they would (`NIGHTMARE` in `public/js/data/difficulty.js`, `hordeMore` in `public/js/game/spawner.js`). No more than 900 monsters stand at once all the same, and a Nightmare's horde asks for more than that late in the night (on Normal from 9:00, on Veteran from about 10:30), though how many stand depends on how fast the hero kills: with the Knight's autopilot it was some 900 on a Veteran Nightmare from 11:00, under 700 on a Normal one. (Those were measured before the horde was doubled twice on both difficulties, 20 October 2026; it meets the cap much sooner now.) Past 900 a new monster comes in the place of the farthest that stands well off the screen, which simply vanishes, never seen (no drops, no kill, no XP), so the horde the player sees keeps coming; see the cap below. It pays its gold ×1.5 on top of the difficulty's (×1.5 on Normal, ×2.25 on Veteran), kept modest (more monsters bring in a little more gold of their own: with the Knight on Normal the gem-collecting bot found 2047 gold in a Nightmare night against 1906); its victory bonus is the difficulty's, and a win counts as one on its difficulty. The HUD says NIGHTMARE beside the clock, and the results screen after the mode. Ranked keeps one best time per hero, so it is never a Nightmare: on its trial card the box isn't shown.

Monsters pass through props and through the trees, and ease apart from one another (`public/js/game/crowd.js`): a crowd spreads round the hero rather than piling onto one spot, though a press of them still squeezes together. They can't stand inside the hero, and those against him ease him off them, softly (never as fast as he walks, so he can always walk out; a boss or a lord never moves him). Dungeon walls stop them all but Wraiths, bats and imps. On a Dungeon Run floor the horde hunts the hero from anywhere, round the walls by the shortest walk. In a crypt a monster doesn't know where the hero is until it has seen him (ten tiles, as far as he sees, with no wall between) or been struck. Until then it strolls about, or sleeps with its pack; from then on it follows him round corners. What is sent at him (a ring, a swarm, a pack, a boss's summons), the bosses and the thief always know where he is.

**Swarms come in batches**: each of the night's swarms is a run of 2 to 5 (rolled each night), each three times the size it was, 7 seconds apart, and each told by its own warning about 2 seconds before it, saying which of the run it is ("2 of 4"). A swarm comes as a loose stream, 170 px across and up to 70 px deep (`SWARM_SPREAD`). On the Endless Night a swarm that comes back comes as a whole run too (`SWARM_BATCH`, `batchEvents` in `public/js/data/waves.js`).

**The cap**: no more than 900 monsters stand at once, props aside (boxes don't count, and still come at the cap). Past that, a new one comes only in the place of the one farthest from the hero, if it stands 0.6 of a screen diagonal off or more (413 world px on a 1080p screen: past every corner of the screen and past anywhere the horde comes in). It simply vanishes, never seen: it doesn't die, drops nothing and counts for no kill or XP. If none stands that far, the new one doesn't come, as before. The steady horde makes room for 20 a frame at most, so a burst can't churn it. What is sent at the hero (a ring, a swarm, a pack, a champion, the thief, a boss's summons) comes in full, each in the place of the farthest foe anywhere off the screen. Bosses, crypt lords, champions, the thief, a boss's summons and the crypts' sleeping packs are never the ones that make room (`HORDE_CAP` in `public/js/data/waves.js`, `Game.recycleFar`). The forest already moves stragglers back to the screen's edge once they are more than 0.85 of its width away across or down (`Forest.tooFar`), so in the headless nights measured none ever stood a full diagonal off.

The clock keeps **real time**: the 15-minute night takes 15 minutes, and the 5:00 that brings in the next hero five. What runs faster is how the hero and the monsters walk: **about 52% faster** than they were drawn to on Veteran (`GAME_SPEED` in `public/js/data/difficulty.js`), and on Normal 20% less than that (`moveFor`), the monsters' speed classes kept in step with the hero's. The bots walk at the same speeds, so they play the game as people do.

### The unlock ladder

1. You start with the **Knight** and **15-minute Survival** only. The Knight has seven looks, chosen with **LOOK** under his panel on the hero screen and remembered with the settings: his own plumed knight, **Knight B** (a knight-errant in blued steel), the **Ember** knight (a living flame crest), the **Frost Warden** (winged helm, wolf-fur mantle), the **Black Knight** (horned, red-eyed), the **Thorn Knight** (antlers and a leaf blade) and the **Moon Knight** (a crescent crest and a starry cloak). Each was drawn with claude-pxl (MIT) by an artist subagent and refined by a reviewer (`gms/3001/sprites/lab/src/knight-<b..g>/`, baked by `tools/bake-heroes.mjs`).
2. Last **5 minutes** on the clock with a hero to unlock the next hero, free. A banner says so at 5:00, and the hero is yours when the run ends, whether you win, fall or quit.
3. Surviving the night with the **Necromancer** opens the **Dungeon**, for the Knight only at first.
4. **Beat the Dungeon** with a hero to bring the next hero into it.
5. Beat the Dungeon **with the Necromancer** to unlock **Ranked**, open to every hero.

The hero screen always shows your next goal, stars mark what each hero has conquered (night survived, Dungeon beaten), and the results screen announces anything a run unlocks.

### Things to find

- **Soul gems** (XP) from every monster, and now and then a coin or a **fury orb** (rarer the faster you kill, but never gone), nothing more (champions, Gilded Thieves, crypt lords and bosses leave more); **gold**, **potions** and **elixirs** in what you break
- **Scroll of Gathering** pulls in every gem; the **Holy Relic** purges the screen and the **Frost Rune** freezes it (bosses, crypt lords and champions only take a heavy blow or slow down). All three lie only in what you break. **Fury orbs** charge your ultimate; they lie in what you break too
- **Champions** with randomly generated names and affixes, and **Gilded Thieves** that flee with treasure
- **Treasure chests** from champions, bosses and three crypt lords in four. A max-level weapon plus its paired relic **evolves** when you open a chest; the rest of a chest is upgrades drawn like level-up cards (above), and gold. Luck makes a champion's or a boss's chest hold more, never a crypt lord's
- **Gear** from three crypt lords in four, every lord rolled alike (so up to four pieces a crypt): helm, armor, gloves, boots, amulet and ring, each Common (1 stat), Uncommon (2), Rare (3), Epic (3, stronger) or Legendary (4 and a power: +1 projectile, +40% crit damage, a revive, or +20% health and +2 armor; each power counts once, however many pieces worn carry it). Later in the night and farther from the start the odds get better, and nothing else changes them: **luck plays no part in what a crypt's lords leave**, not the gear's rarity, nor whether a lord leaves gear, a chest or both, nor what its chest holds, nor its gold; that is plain chance (`test/crypts.test.js`). Picking a piece up shows it beside everything worn, with what it would change; wear it (the piece it replaces is sold) or sell it, and sell anything worn while you're there. **Each hero keeps their own gear from run to run**; heroes don't share it (`public/js/shared/items.js`)
- **Shrines** of Fury, Haste, Fortune, Wisdom and Protection
- **Power-ups**, only in what you break (never dropped by the horde), luck making them likelier: a **Wild Mushroom** (10 s of double damage and 30% more speed), a **Ward Bubble** (5 s untouchable), a **Mirror Shard** (10 s of +1 projectile for every weapon), each 1 in 100; a **Treasure Map** (a chest a screen or so away, which the edge arrow points to; in a dungeon or crypt, a pile of gold) and a **Cursed Skull** (touch it and the rest of the run brings 25% more monsters and 50% more gold, up to three), each 1 in 200 (`POWER_UPS`, `PROP_LOOT` in `public/js/game/game.js`)
- Breakable barrels, crates, urns and lanterns, 2 to 5 to a site: in the forest a site every 5 to 9 seconds ahead of you (about 45 props standing at most), in a dungeon or crypt one row along a wall of each room, about three boxes a chamber (`PROP_SITES` in `public/js/data/waves.js`). The hero's weapons break them, and so do the Necromancer's skeletons and death knights: a blow one strikes at a foe breaks any box in its swing as well. They never go for a box instead of a monster, and walk through one as through anything but a wall (`Minion.attack` in `public/js/game/minions.js`). Half of them hold nothing; each of the rest holds one thing, which pops out a moment after the box breaks, hops about two steps to the side of the way the hero walks and waits there to be walked over (the pickup magnet leaves it be; `PROP_DROP`, `PROP_HOLD`): a third of them a potion, a third a fury orb, a tenth a Scroll of Gathering, and the rest gold, now and then an elixir or a Frost Rune and, half as often, a Holy Relic (`PROP_LOOT` in `public/js/game/game.js`). Luck makes the scrolls, elixirs, runes and relics likelier

### Weapons and evolutions

Each hero has a **signature weapon** no other hero can find (the Necromancer has two, and starts with both); every other weapon is **shared by all**, offered to any hero on his level-ups. Relics are shared by all too. A weapon at level 8 with its relic evolves when a chest is opened, into something better than it in every way (`test/signature-weapons.test.js` checks every stat). One relic is unlike the rest: the **Phoenix Heart** (bought once in the Armory for 1,500 gold, for sale once the Knight has evolved his Longsword, and then found by every hero; +1 revive, and while it is held **any** weapon at level 8 evolves at a chest, its own relic or not) is offered only once the hero's own signature weapon has evolved; when he falls it is the revive spent first and it is gone (a Second Wind from the Armory or a legendary waits for the next fall), its relic slot free, and it can be offered again 5 levels later. Each time it can be offered it is on the next two level-ups for certain (a reroll keeps it among the new cards), and after that only by chance; a chest draws it only by chance (`test/phoenix.test.js`). Each hero's `unique` and `start` are in `public/js/data/heroes.js` (with `SHARED_WEAPONS` and `weaponsFor`), the weapons in `public/js/data/weapons.js`. An unlisted reference page (on the owner's link list) shows them all, with every level's card and each evolution.

**Signature weapons**

| Hero | Weapon | + Relic | Evolves into |
| --- | --- | --- | --- |
| Knight | Longsword *(starts)* | Gauntlets of Might | Excalibur |
| Ranger | Hunting Bow *(starts)*: arrows fly straight the way she faces | Eagle Feather | Stormstring |
| Sorcerer | Fireball *(starts)* | Spellbook | Meteor Storm |
| Shadow | Shadow Blade *(starts)*: spinning blades at the nearest foe, through all in their path | Swift Boots | Shadowstrike |
| Necromancer | Raise Dead *(starts; his weapon in the crypts)* | Scholar's Crown | Legion of the Damned |
| Necromancer | Miasma *(starts)*: a poison cloud about him, and a trail of it from his steps | Troll Blood | Pestilence: what dies in it bursts into poison |

**Shared by all**

| Weapon | + Relic | Evolves into |
| --- | --- | --- |
| Throwing Axe | Giant's Belt | Whirlwind |
| Guardian Blades | Plate Armor | Aegis |
| Consecration | Troll Blood | Sanctuary |
| Moonglaive | Lodestone | Lodestar |
| Bramble | Plate Armor | Briarheart |
| Will-o'-Wisps | Lucky Clover | Fae Lanterns |
| Lightning Strike: a bolt from the sky on the toughest foe near, a splash that stuns | Echo Rune | Thunderstorm: a storm of strikes |
| Chain Lightning: sparks leap from the hero and arc foe to foe; opens once Lightning Strike has evolved | Spellbook | Storm Lash: each chain forks in two |
| Frost Nova | Vitality Amulet | Frozen Heart |
| Arcane Ray: an instant ray through every foe in its line | Giant's Belt | Prismatic Ray: it splits on the first foe it strikes |
| Firebomb Flask | Hourglass | Hellfire |
| Caltrops: spikes thrown behind the hero, that cut and slow what follows | Lucky Clover | Razor Field |

**Relics of 22 October 2026**, each opened by a milestone (`public/js/shared/progress.js`), five ranks each (`public/js/data/passives.js`): **Hunter's Mark** (+8% damage to bosses, crypt lords and champions), **Berserker's Torc** (up to +10% damage, the lower the hero's health), **Thornmail** (a monster that strikes him takes 8 back), **Shadow Cloak** (4% to dodge a blow), **Ember Heart** (5% of hits set the foe burning), **Ram's Horn** (+15% knockback, on monsters only), **Vampire Fang** (0.4% of the damage dealt heals him, at most 1.2% of his health a second) and **Rimeheart** (struck, he freezes the foes about him for a moment, every 7 s at most; bosses, lords and champions only slow).

**The second circle** (hidden in the Codex until a night is won; each then opens by its own deed)

| Weapon | Opened by | + Relic | Evolves into |
| --- | --- | --- | --- |
| Gale Horn: a gust ahead blows the horde back (never a boss, an elite or the hero); a foe blown into another hurts both | the night won | Swift Boots | Tempest: all round, and slowed |
| Lighthouse Lantern: a beam sweeps slowly round, burning, and lights the ground | surviving 12:00 | Spellbook | Beacon: two beams, and lit foes take a quarter more |
| Banshee Bell: a toll that sends the horde fleeing (bosses and elites stand) | 3 bosses in a run | Vitality Amulet | Death Knell: the fleeing leave cutting echoes |
| Grappling Hook: a hook at the farthest foe that cuts its line twice and makes it bleed; it drags nothing | 25,000 foes in all | Plate Armor | Kraken Chains |
| Starfall: stars fall on foes in sight | 1,500 gold in a run | Echo Rune | Comet Shower |
| Runestone: a stone that bounces off the screen's edges, piercing | a night won on Veteran | Eagle Feather | Runestorm: three, each splitting on its first bounce |
| Leech Chains: chains drain the nearest foes and mend the hero a little | level 50 | Troll Blood | Blood Tether |
| Grave Hollow: a pit in the thick of the horde draws it in, then caves in | a Dungeon Run won | Lodestone | Abyss: and drags in the gems |
| Puffcap Spores: mushrooms where foes fall; their spores confuse what treads on them | 3 nights won | Lucky Clover | Fairy Ring |
| Reaper's Scythe: a slow, wide reaper's sweep all round, far past a sword's reach; it reaps foes under 15% health | 60,000 foes in all | Scholar's Crown | Harvest Moon |
| Hex Hourglass: curses the toughest; when it ends they take a share of all they suffered again | a night won with 3 heroes | Hourglass | Doom |

**Weapons a new player has**: five, the hero's own and the Throwing Axe, Guardian Blades, Moonglaive and Caltrops; Frost Nova opens at 1:00 survived, Consecration once the hero has fallen 10 times (a run quit or won is no fall), and the rest of the shared ones by milestones (`public/js/shared/progress.js`). Any shared weapon open can be **left at home** in the Codex (press its tile): it is never offered in a run until taken along again.

## Saving: everything lives in cookies

The server keeps **no database**. The only thing it writes to disk is its cookie key (`.data/cookie-secret`, or set `COOKIE_SECRET`).

| Cookie | Holds | Set by |
| --- | --- | --- |
| `fs_profile` | gold, wins per mode and difficulty (Normal counts as the old Medium, Veteran as Hard), records, Armory ranks, unlocked heroes, each hero's achievements (night survived, Dungeon beaten), Ranked personal bests, the gear each hero wears | server, encrypted (AES-256-GCM), HttpOnly |
| `fs_settings` | volume, screen shake, damage numbers, CRT, FPS, and the difficulty and Nightmare box last chosen | browser |

There is no cookie for a run: nothing of a run is saved while it lasts, only its results when it ends (above). A run cookie left by an older version of the game (`fs_run`, or `fs_lrun` / `fs_drun` with static hosting) is deleted when the game loads.

The profile cookie is a few hundred bytes, and at most about 2.5 KB, with every hero in six legendaries (it keeps gear packed small, as a few numbers per piece; `MAX_STATE` in `public/js/shared/profile.js` is the most the game reads back). The server keeps a run's gear only if every piece is one the rules could have rolled, and no more of it is new than the run found: a piece at most from each crypt lord it slew, and so at most four for every crypt it could have reached (`MAX_LORDS` in `public/js/shared/items.js`). It is encrypted with a key derived from the server secret, so players can neither read nor edit it, and bound to its cookie name so no other cookie (a developer session) can stand in for it. Cookies written before encryption (signed, readable JSON) are accepted once and re-issued encrypted.

If the save exists but can't be decrypted (damaged, tampered with, or written under a different server key), the game says so on the title screen and offers a fresh start. The old cookie is left untouched until the player accepts, so restoring the right key brings it back.

**When deploying, set `COOKIE_SECRET` to a long random value and keep it stable.** If the key changes, for example because `.data/` isn't persisted between deploys, every existing save becomes unreadable at once.

Run reports are clamped server-side: gold is capped by run length (at most two hours for the 15-minute night with its crypts), gear by how many crypt lords the run could have reached (four to a crypt, a crypt every 45 seconds of its time and the one by the start), a victory only counts if the run lasted long enough to be one, a run that doesn't say it was played on Veteran is paid as Normal, one that doesn't say it was a Nightmare (or says so in Ranked) is paid as none, and a run in a mode the hero hasn't unlocked yet is refused. The game runs in the browser, though, so these are bounds, not proof: the cookies can't be forged, but a hand-made run report within the bounds is still paid. The unlock ladder lives in `public/js/shared/profile.js`, shared by the server and the browser.

If the game is served as plain static files (no `/api`), it falls back to plain client-side cookies with the same rules (they can't be meaningfully encrypted without a server, since the key would ship in the page). An unreadable one gets the same fresh-start prompt. A game server that is there but not answering (no connection, or a 5xx) is not mistaken for static hosting: the title screen says it can't be reached and offers to try again. A run the server doesn't take is never faked either: the results screen says its gold isn't saved and offers to save again.

### API

| Method | Path | Body | Effect |
| --- | --- | --- | --- |
| GET | `/api/state` | — | the profile, plus `unreadable: { profile: true }` when the save can't be decrypted; deletes a run cookie left from an older version |
| POST | `/api/run` | `{ mode, diff, nightmare, hero, victory, time, gold, kills, level, floor }` | a run has ended: pay out gold, record wins, achievements and Ranked bests; the reward lists anything newly unlocked |
| POST | `/api/buy` | `{ id }` | buy an Armory rank |
| POST | `/api/refund` | — | refund all Armory ranks |
| POST | `/api/reset` | — | wipe progress |
| GET | `/api/dev` | — | developer mode status: `{ enabled, open, authed }` |
| POST | `/api/dev/login` | `{ key }` | start a 12-hour developer session (with `DEV_KEY`) |
| POST | `/api/dev/logout` | — | end the developer session |
| POST | `/api/dev/profile` | `{ profile }` | replace the whole profile (developer session only; still sanitized) |

POSTs must be `application/json`, and a JSON object (anything else is a 400). Any other path under `/api/` is a 404. Cookies are `SameSite=Lax`, and `Secure` behind HTTPS (including `X-Forwarded-Proto`).

## Developer mode

A panel for editing your save and bending a run, for testing. Press **`** (backtick) in the game, or add `?dev` to the URL to get a small **DEV** button (handy on a phone). At the debug address (below) the panel opens wherever the game is served, GitHub Pages too, and the **DEV** button is there from the start.

| Start the server with | Who can use the panel |
| --- | --- |
| `npm run dev` | anyone who can reach the server, no key. It listens on this machine only (set `HOST=0.0.0.0` to test from a phone on your network) and restarts on file changes |
| `DEV_KEY=<long secret> npm start` | whoever logs in with that key; the session lasts 12 hours |
| `npm start` | nobody: the panel doesn't open |

The server checks every edit, so shipping the panel's code to players unlocks nothing. With plain static hosting the save is a client cookie anyway, so the panel works there without a key, but only on this machine (localhost): on the published game it doesn't open, except at the debug address, whose save is a cookie of its own (`fs_dprofile`): what the panel sets there, through the same checks, touches no player's save.

- **Save file:** presets for each rung of the ladder (fresh start, Survival ladder done, Dungeon open to all, unlock everything, +10 000 gold, max/clear Armory); gold, owned heroes, every hero's achievements and Ranked best, victories, Armory ranks, records; and a raw JSON editor for anything else.
- **This run:** live status; invincibility; freeze the game; +1 level (choose a card) or +10 levels (cards picked for you); full heal and fury; max or evolve all weapons; give any weapon or relic (any class's signature, to any hero); every weapon he holds a level up or down, evolved or taken away (his own too, and a level down from 1 takes it away; only his last weapon stays), and every relic a rank up or down or taken away, his stats following (`Game.removeWeapon`); the clock a minute back or on, five on, or set to any m:ss (`Game.setTime`): the horde comes from that minute's pocket of `public/js/data/waves.js`, timed swarms and bosses whose time has passed count as done and those still to come wait for their own time, backward too (none comes on the jump itself), a Dungeon floor's clock moves as far, and the panel says what the minute brings and which boss is next; open a chest; kill all foes; spawn any boss; next dungeon floor; win or die now. Results still go through the normal rules, so a developer win records wins and unlocks like a real one.

### The debug address

An unlisted address (a random token as a query flag, `DEBUG_FLAG` in `public/js/engine/storage.js`; the owner's link list has it) opens the game with every hero and every mode unlocked, on GitHub Pages too. Each hero shows as having survived the night and beaten the Dungeon, which is what unlocks them. In the Armory every upgrade is free: each press adds a rank, and past the last it goes back to none; **MAX ALL** and **CLEAR ALL** set them all. It keeps a save of its own (the `fs_dprofile` cookie, never the server's), so whatever is played or set there leaves the player's own progress alone (`public/js/engine/storage.js`).

## Meta-progression (the Armory)

Gold from runs buys permanent ranks: Might, Armor, Vitality, Recovery, Haste, Reach, Swiftness, Magnetism, Fortune, Wisdom, Greed, Insight (rerolls), Exile (banishes), Endurance (effect duration), Velocity (projectile speed), Echo (+1 projectile for every weapon) and Second Wind (up to two revives). Ranks can be refunded at any time. Each rank of Armor is a point of armor.

A point of **armor**, wherever it comes from (the Armory, the Knight's own two, the Plate Armor relic, gear), takes a tenth off what is left of each blow, or 1 damage if that is more. So every point adds a little less: one takes 10%, five 41%, ten 65%. All of it together never stops more than 95% of a blow, and a blow always does at least 1 (`armored` in `public/js/game/player.js`).

The 15-minute night was tuned, on what is now Veteran, so a fresh profile can't win it and a full Armory can: with the Knight, the gem-collecting bot died in 33 of 35 seeded games without the Armory and won all 35 with every rank (`node tools/bots.mjs --bot=gems --runs=35 --armory=none` and `--armory=max`; add `--diff=normal` for Normal). That was before armor took a tenth of a blow a point, which makes the Knight and any armored build sturdier, and before the levels' strength was doubled and the breakables tripled (16 October 2026): since then the same bot, without the Armory, has won 4 of 4 seeded nights with the Knight on Veteran (1 of 4 before), and on Normal, now at 70% less monster health, 4 of 4 with the Knight and the Necromancer alike. A Nightmare (`--nightmare`) on Normal didn't stop the Knight on seed 1: he won it too, with 51 735 kills against 34 191 and at level 134 against 108, the doubled horde's gems carrying him further. All of these runs came before the monsters' 20% more health and damage, the horde doubled twice, the slow monsters sped up and the 15% faster game (20 October 2026), which the bot has not measured since. What spawns when is a table of minute pockets in `public/js/data/waves.js`.

## Project layout

```
server.js                  zero-dependency HTTP server + cookie API
public/index.html
public/js/main.js          boot, screens, main loop, debug/sim hooks
public/js/shared/profile.js  profile rules shared by server and browser
public/js/engine/          view scaling, input, bitmap font, pixel buffers,
                           sprites, audio + music, cookie storage
public/js/art/             palette and all sprite data (heroes, monsters,
                           bosses, items, props) + procedural scenery
public/js/data/            heroes, weapons, relics, enemies, waves, difficulty
public/js/game/            game loop, player, enemies, bosses, weapons,
                           projectiles, effects, pickups, particles, lighting,
                           forest + dungeon worlds, HUD
public/js/ui/              UI toolkit, menu screens, in-game overlays
public/js/bots/            play-testing bots: strategies, level-up policies, driver
test/                      node:test suites
tools/                     art preview (PNG) and headless play-test scripts
gms/3001/                  the Sprite Lab: compare sprites and pick what the game uses
```

### Sprite Lab

Every sprite anyone has proposed for the game is in one place: `npm run lab`, then http://localhost:3001 (`gms/3001`). Online, for the repository's owner only: https://lab.gamevibe.si (below).

- **The game** (the lab's front page) is the real game with any sprite in any part. Walk the hero round, bring monsters, line every part up to compare sizes, recolour what a part wears, and pick what the game uses (`picks.json`, in the private repository below).
- **Compare** (`compare.html`) shows every sprite for one hero class or monster part side by side, at the game's scale with their feet on one line. It covers the game's own sprite, every proposal made for it grouped by batch, your recolours and the scouted packs, and you can show them walking, standing or attacking, facing either way. Each card can be tried in the game or made the pick.

The proposals are sheets in `gms/3001/sprites/lab/sheets/`, listed in `gms/3001/sprites/lab/catalog.json` (its `about` field gives the format). A new proposal goes in there as a sheet plus an entry, not as a module in `public/js/art`, which holds only what the game draws.

A pick doesn't change the game by itself: the game is public, so what ships is chosen in code. `node tools/bake-heroes.mjs` packs the picked heroes' sheets (its `BAKE` list) into `public/assets/heroes/`, which `public/js/art/hero-sheets.js` plays with the lab's animation lists and rates; it refuses art whose licence isn't the game's own. The Sorcerer, the Necromancer and the Shadow ship that way (Remaster V3, Remaster V3 and the Eclipse Wraith's tweak 1); the sprites they replaced stay in the lab as "Original" (`src/originals.js`).

The scouted packs, the music scout and the lab's saves (picks and recolours) are in a private repository, `bonegor/forest-survivor-assets`, because several packs forbid redistributing their art. Check it out next to this one, as `forest-survivor-assets`. The lab then serves its files ahead of its own and writes its saves there. It commits and pushes each save, after pulling what was saved elsewhere. Without it, the lab shows the game's own sprites and the proposals, and keeps its saves in `gms/3001`.

**Online, in a codespace.** https://lab.gamevibe.si is a GitHub Pages redirect from `bonegor/gamevibe-lab`. It opens https://codespaces.new/bonegor/forest-survivor?quickstart=1, which resumes your codespace or offers to create one. `.devcontainer/` asks for access to the private repository, checks it out, and runs the lab on port 3001, which only the codespace's owner can open; the lab opens in a new tab. Codespaces are free up to 120 core hours a month (about 60 hours on the 2-core machine) and 15 GB of storage. A codespace stops after 30 minutes idle; that can be raised to 4 hours at github.com/settings/codespaces.

**The sprite tuner.** An unlisted page on the site (the owner's link list has it) shows every hero, monster, boss and minion as the game ships it, built by the game's own code, and tunes its colours online without the codespace: brightness, contrast, saturation, hue, gamma and a lift for the darkest tones, the outline's colour, and a 1 px pale rim outside the outline. The sliders move the sprite's palette colours, never its pixels. Each sprite is shown at 1×, at 4× and in the night's light over the forest, a crypt and the catacombs (the ambient multiplied in as `public/js/game/lighting.js` does, the hero's lamp too if chosen), beside the hero for scale, with the mean luma of its pixels before and after; one set of sliders tunes all the monsters at once. Work in progress stays in the browser. A sprite's look comes out as a code (`FS tune spider lift=40 ink=3a2e4a rim`), or every change as one blob, and `node tools/bake-tune.mjs <file>` bakes them into `public/js/art/tuned.js` as each sprite's palette override and rim, which `public/js/art/defs.js` lays over the art and `spriteBuffers` (`public/js/engine/sprites.js`) draws, in the game and in `tools/preview.mjs`. The art files stay as drawn. `--out=<file>` bakes into another file first, to look with `node tools/preview.mjs spider --tuned=<file>`.

### Development tools

```bash
node tools/preview.mjs knight bat --scale=8      # render sprites to tools/out/sheet.png
node tools/play.mjs smoke                        # headless screenshots (needs the server running)
node tools/play.mjs sim --hero=archer --mode=s15 --secs=900   # bot plays a run, logs progress
node tools/play.mjs ui                           # screenshot every menu and overlay
node tools/balance.mjs --hero=knight --configs=s15:medium,s15:hard --runs=2   # bot balance report (Normal, Veteran)
node tools/watch.mjs --mode=s15 --from=0 --to=600 --every=60                # gameplay screenshots over a run
node tools/bots.mjs --bot=idle,circle,kite --runs=10                         # bots compared headlessly, no server needed
node --expose-gc tools/perf.mjs --detail --sites=20                          # frame cost and garbage at minute 10 (update, drawing, HUD)
```

In the browser console, `__fs.sim(seconds)` fast-forwards the current run with the autopilot bot, and `__fs.sim(60, { bot: 'kite' })` with any other strategy.

## Bot play-testing

Scripted bots play the real game in Node, with no browser or server: draw calls go to a dummy canvas and `Math.random` is seeded per game, so a seed always replays the same game, many times faster than real time. Compare strategies, heroes and modes over many runs:

```bash
npm run bots                                    # every strategy · Knight · 15-minute night · 3 runs
node tools/bots.mjs --bot=idle,circle,kite --hero=knight --mode=s15 --runs=10 --seed=1
node tools/bots.mjs --bot=kite:r=40,kite:r=60 --hero=all --max=10:00 --each
node tools/bots.mjs --bot=gems --pick=all --armory=max --json=tools/out/gems.json
node tools/bots.mjs --bot=gems --nightmare                # Veteran, three times the monsters
node tools/bots.mjs --list                      # strategies, their parameters and the level-up policies
```

Every option takes a comma list (or `all`) and the report gets a row per combination; run *i* of every row plays seed *seed + i*, so rows compare like for like. Games step at a fixed 60 Hz (`--hz`), run on all cores but one (`--jobs`) and stop at `--max` game time (an hour by default). `--each` adds a line per game (build, damage by source, what killed it) and `--json=FILE` keeps every result. For example, `npm run bots -- --runs=5` (30 full nights in about 80 s):

```
bot        won  died  median   mean        range  kills  level  dmg/min  bosses  killed by
idle         0     5   04:47  04:47  04:41-04:55   3231   21.4       65     0.0  boneking 2, bone 2, blast 1
circle       0     5   03:48  05:36  02:58-13:08   4744   27.4       84     0.2  zombie 2, wolf 1, skeleton 1
kite         0     5   09:21  07:56  05:10-10:22   6645   34.8       35     0.6  butcher 3, bone 2
gems         5     0   15:00  15:00        15:00  30278   91.2       18     2.8  -
random       0     5   09:09  07:41  04:42-09:36   6404   37.2       75     0.6  butcher 2, darkbolt 1, boneking 1
autopilot    3     2   15:00  13:55  10:14-15:00  18039   70.0       62     2.0  deathknight 1, spider 1
```

| Strategy (`--bot`) | Plays | Parameters (`name:key=value`) |
| --- | --- | --- |
| `idle` | stands still and lets the weapons work | |
| `circle` | walks a circle around where it started | `r=90`, `dir=1` (-1 turns the other way) |
| `kite` | backs away from foes and missiles within `r`, toward the open side | `r` (30 px for the Knight, whose sword reaches about 35; 60 for the others) |
| `gems` | goes for the best gem or pickup within `reach`, swerving around foes closer than `avoid` | `reach=200`, `avoid=36` |
| `random` | takes a new random heading every `every` seconds | `every=1` |
| `autopilot` | plays like a decent player: circles the horde, dodges missiles and slams, hunts bosses while healthy, loots when calm, finds the dungeon's guardian and stairs | |

All of them press the ultimate when it is ready unless given `ult=0`. When a bot doesn't choose its own level-up cards, `--pick` does: `first`, `random`, `weapons`, `relics`, or `build` (the default: grow weapons, add up to four, the shared ones that suit the hero first, then the relics that evolve them, then useful relics). None of the strategies aims, so a weapon that flies only where the hero faces (the Hunting Bow) fares badly with any of them: they walk away from foes, or stand.

### Writing a strategy

A strategy gets a read-only view of the game every tick and says where to walk; it may also choose level-up cards. Save one as a module and pass its path to `--bot`:

```js
// mybot.mjs:  node tools/bots.mjs --bot=./mybot.mjs:panic=40,gems
export default {
  about: 'Runs from anything within `panic`, else walks to the nearest gem',
  params: { panic: 30 },
  make({ panic }) { // once per game; keep any state in this closure
    return {
      tick(v) {
        const foe = v.nearest(panic);
        if (foe) return { x: -foe.dx, y: -foe.dy, ult: v.me.ultReady };
        const gem = v.pickups(300).find((p) => p.kind === 'gem');
        return gem ? { x: gem.dx, y: gem.dy } : { x: 0, y: 0 };
      },
      pick: (cards) => cards.findIndex((c) => c.type === 'weapon'), // -1 leaves it to --pick
    };
  },
};
```

`tick` returns `{ x, y, ult }`: a heading, whose length (capped at 1) is the share of full speed, and whether to press the ultimate. A bare `(v) => ({ x, y })` function works too. Positions are world pixels, `dx, dy` point from the hero to a thing and `d` is its distance; lists come nearest first.

| View | |
| --- | --- |
| `v.t`, `v.dt`, `v.phase`, `v.kills` | seconds survived, the step length, how far the night's enemy mix has advanced, kills |
| `v.me` | `x, y, hp, maxHp, hpFrac, level, fury, ultReady, speed, magnet, armor, weapons, passives` |
| `v.enemies(r)`, `v.nearest(r)`, `v.boss` | awake foes within `r` (`x, y, dx, dy, d, r, hp, type, boss, elite, dmg, speed, fly`); the boss being fought |
| `v.shots(r)`, `v.hazards(r)` | enemy missiles; telegraphed slams yet to land (`shape`, `r`, `left` seconds) |
| `v.pickups(r)` | gems and loot: `kind`, `value`, `pulled` (already flying in) |
| `v.world` | `dungeon`, `solid(x, y)`, `path(x, y)` (next step of the shortest walkable path), `stairs`, `guardian` |
| `v.rng()` | the bot's own seeded dice |

Level-up cards are `{ type: 'weapon' | 'passive' | 'bless' | 'heal' | 'gold', id, name, level, isNew }`, and `pick` returns the index of one. The built-ins live in `public/js/bots/strategies.js` and `picks.js`; one added there also works in the browser, where `__fs.sim(60, { bot: 'kite' })` lets you watch it play.
