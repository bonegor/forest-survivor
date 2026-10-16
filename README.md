# Forest Survivor

A medieval, Diablo-flavoured survivors-like for the browser. Pick a hero, auto-attack your way through ever-growing hordes, level up into evolved weapons, **survive the night** in the Darkwood, **delve three dungeon floors** to slay the Lord of Cinders, and finally see how long you last in the **endless Ranked night**.

Everything is hand-made in code: pixel-art sprites authored as palette strings, procedurally painted trees and dungeon tiles, a dynamic light map and synthesized sound effects. Music is dark NES-style chiptune from OpenGameArt (mostly HydroGene's CC0 loops; credits in `public/audio/music/CREDITS.md`), played from the files listed in `public/audio/music/tracks.json`: title, forest, crypt, boss, victory, game over and a piece per Dungeon Run floor. Loops cross over between two players so the seam never gaps. These files are the only music: a piece without one is silent. There are no dependencies.

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
- **Developer mode is off.** The panel opens only on this machine (localhost). The debug address (below) works there, though.
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

Weapons fire automatically, except in the crypts (below). Collect soul gems to level up; every level offers a choice of new weapons (only the hero's own, below), weapon upgrades or relics. Each level also makes the hero a little stronger, without limit: +0.5% damage a level, health growing 0.5% on itself a level (×1.48 by level 80, ×4.4 by 300), and a point of armor every 20 levels (`levelBonus` in `public/js/game/player.js`). The level-up screen shows what the levels have given so far. When fewer upgrades are left than a level-up offers (none, once the whole build is maxed), a stacking **Blessing of Valor** (+might, +health), a heal and gold fill the rest.

**Quit Run** in the pause menu ends the run there and then, and you keep the gold you found. There is no saving a run to come back to: **Continue** on the title screen only appears when the game was closed mid-run, and picks it up from its last autosave.

### Heroes

| Hero | Unlock | Starts with | Perk | Ultimate |
| --- | --- | --- | --- | --- |
| Sir Aldric, Knight | — | Longsword | +2 armor, +180% health, +7% speed, slow regeneration | Whirlwind |
| Lyra, Ranger | 5 minutes survived with the Knight | Hunting Bow | +crit, +speed | Arrow Storm |
| Eldrin, Sorcerer | 5 minutes survived with the Ranger | Fireball | −cooldowns, +area, +XP | Cataclysm |
| Kael, Shadow | 5 minutes survived with the Sorcerer | Shadow Blade | +crit, +speed, +luck | Shadow Dance |
| Morvath, Necromancer | 5 minutes survived with the Shadow | Raise Dead (skeleton minions) and Miasma | minions last 30% longer, +10% XP | Army of the Dead |

### Modes

- **Survival — 15 minutes.** Endless forest, night falls darker, bosses arrive on a schedule. Survive until dawn to win.

The Darkwood (Survival and Ranked) is one endless forest, the same in every run. You start on a crossroads with four roads out to the four corners; each runs about 30 seconds of walking, mostly straight with the odd bend, to another crossroads with a wayside shrine, and on from there in every direction. The four roads out of any crossroads lead to four different shrines. Groves, meadows, pine and cursed woods, and landmarks down footpaths (stone circles, ruins, graveyards, woodcutters' camps) fill the woods between. Nothing is stored: every patch of forest is worked out from a fixed seed as you reach it (`public/js/game/darkwood.js`; `node tools/mapgen/endless.mjs` draws previews of it).

Every second crossroads has a **crypt** beside its shrine, so whichever way you walk there is one about a minute from the start and another every minute after. Walk up its steps and the night's clock stops: dawn comes no closer, the horde neither grows nor follows, and Ranked doesn't count the time. Down there each hero has their own weapon alone (the Knight his sword, the Ranger her bow, the Sorcerer his fireball, the Shadow his Shadow Blade, the Necromancer his Raise Dead, not his Miasma, or what it evolved into), and it fires only when you strike (X or Shift): at the nearest foe in its reach, the blade landing or the shot leaving on the sprite's blow frame; held, it strikes each time the weapon is ready. The others wait outside. Inside, a handful of rooms hold sleeping packs of the night's foes (as strong as the minute you went in), and a named lord waits in the last, a short walk from the stairs. Those stairs are barred while the lord lives: once in, you leave past it, or by falling, which wakes you by the door outside with the crypt shut to you for good. The lord drops a piece of **gear** (nothing it drops lands in a wall), and the wall breaks open on a way up at least five tiles' walk from you (the nearest such stretch of wall): moonlight runs along the shortest walk there (A*, worked out again as you move), on the map too, and the stairs you came down open as well. Out either way, the crypt is sealed for the rest of the run. Whatever lies about when you climb out (gems, gold, gear) comes with you.
- **Dungeon Run — 3 floors.** Each floor's guardian sleeps behind a seal until you've slain enough foes and spent long enough on the floor. Kill it, take the stairs, and defeat the Demon Lord on floor 3. Your build carries over between floors.
- **Ranked — endless.** No dawn. The night keeps getting deadlier, the four lords return in rotation every 4½ minutes, and past the half-hour a blood moon rises. Your score is how long you last, kept as a personal best per hero with a rank title (Peasant, Squire, Knight, Champion, Paladin, Warlord, Hero at 30 minutes, Legend at 40, Mythic at 50, Immortal at an hour).

There are **two difficulties**, chosen on the trial screen and remembered with the settings (`public/js/data/difficulty.js`):
- **Veteran:** the old Hard, with about 45% more monsters that each have about 93% more health and deal about 2.3× the damage. It pays gold at the old Hard rate (×1.5).
- **Normal:** Veteran with every blow the hero takes halved, after his armor, from monsters, their shots and the bosses alike. A third as many of the monsters that shoot or lunge come (Cultists, Dire Wolves, Orc Brutes, Hellhounds), in the steady horde, the packs and the crypts; other kinds take their place, so the horde is as big. It pays gold at the old Medium rate (×1).

Ranked is always Veteran, since it keeps one best time per hero. A night survived on either counts on the unlock ladder.

Monsters pass through one another, through props and through the trees: the only thing they can't do is stand inside the hero. Dungeon walls stop them all but Wraiths, bats and imps. On a Dungeon Run floor the horde hunts the hero from anywhere, round the walls by the shortest walk. In a crypt a monster doesn't know where the hero is until it has seen him (ten tiles, as far as he sees, with no wall between) or been struck. Until then it strolls about, or sleeps with its pack; from then on it follows him round corners. What is sent at him (a ring, a swarm, a pack, a boss's summons), the bosses and the thief always know where he is.

The whole game runs **10% faster than real time** (`GAME_SPEED` in `public/js/data/difficulty.js`): the clock, the hero, the monsters, everything in a run, though not the menus. The 15-minute night passes in about 13⅔ minutes.

### The unlock ladder

1. You start with the **Knight** and **15-minute Survival** only.
2. Last **5 minutes** on the clock with a hero to unlock the next hero, free. A banner says so at 5:00, and the hero is yours when the run ends, whether you win, fall or quit.
3. Surviving the night with the **Necromancer** opens the **Dungeon**, for the Knight only at first.
4. **Beat the Dungeon** with a hero to bring the next hero into it.
5. Beat the Dungeon **with the Necromancer** to unlock **Ranked**, open to every hero.

The hero screen always shows your next goal, stars mark what each hero has conquered (night survived, Dungeon beaten), and the results screen announces anything a run unlocks.

### Things to find

- **Soul gems** (XP) from every monster, and now and then a coin or a **fury orb**, nothing more (champions, Gilded Thieves, crypt lords and bosses leave more); **gold**, **potions** and **elixirs** in what you break
- **Scroll of Gathering** pulls in every gem; the **Holy Relic** purges the screen and the **Frost Rune** freezes it (bosses, crypt lords and champions only take a heavy blow or slow down). All three lie only in what you break. **Fury orbs** charge your ultimate; they lie in what you break too
- **Champions** with randomly generated names and affixes, and **Gilded Thieves** that flee with treasure
- **Treasure chests** from champions and bosses. A max-level weapon plus its paired relic **evolves** when you open a chest
- **Gear** from the lords of the crypts: helm, armor, gloves, boots, amulet and ring, each Common (1 stat), Uncommon (2), Rare (3), Epic (3, stronger) or Legendary (4 and a power: +1 projectile, +40% crit damage, a revive, or +20% health and +2 armor; each power counts once, however many pieces worn carry it). Later in the night and farther from the start the odds get better. Picking a piece up shows it beside everything worn, with what it would change; wear it (the piece it replaces is sold) or sell it, and sell anything worn while you're there. **Each hero keeps their own gear from run to run**; heroes don't share it (`public/js/shared/items.js`)
- **Shrines** of Fury, Haste, Fortune, Wisdom and Protection
- Breakable barrels, crates, urns and lanterns

### Weapons and evolutions

Every weapon belongs to one hero. Each has four: the one he starts with (the Necromancer starts with two) and the rest, which only his own level-ups offer; no hero ever sees another's. Relics are shared by all, and a hero's four weapons each evolve with a different one. An evolution is better than its weapon at level 8 in every way (`test/rosters.test.js` checks every stat). Each hero's `roster` and `start` are in `public/js/data/heroes.js`, the weapons in `public/js/data/weapons.js`.

| Hero | Weapon | + Relic | Evolves into |
| --- | --- | --- | --- |
| Knight | Longsword *(starts)* | Gauntlets of Might | Excalibur |
| | Throwing Axe | Giant's Belt | Whirlwind |
| | Guardian Blades | Plate Armor | Aegis |
| | Consecration | Troll Blood | Sanctuary |
| Ranger | Hunting Bow *(starts)*: arrows fly straight the way she faces | Eagle Feather | Stormstring |
| | Moonglaive | Lodestone | Lodestar |
| | Bramble | Plate Armor | Briarheart |
| | Will-o'-Wisps | Lucky Clover | Fae Lanterns |
| Sorcerer | Fireball *(starts)* | Spellbook | Meteor Storm |
| | Chain Lightning | Echo Rune | Thunderstorm |
| | Frost Nova | Vitality Amulet | Frozen Heart |
| | Arcane Ray: an instant ray through every foe in its line | Giant's Belt | Prismatic Ray: it splits on the first foe it strikes |
| Shadow | Shadow Blade *(starts)*: spinning blades at the nearest foe, through all in their path | Swift Boots | Shadowstrike |
| | Firebomb Flask | Hourglass | Hellfire |
| | Caltrops: spikes thrown behind him, that cut and slow what follows | Lucky Clover | Razor Field |
| | Shadow Clone: a shade of Kael that hunts for a while | Spellbook | Twin Shadows: two that never fade, throwing blades |
| Necromancer | Raise Dead *(starts)* | Scholar's Crown | Legion of the Damned |
| | Miasma *(starts)*: a poison cloud about him, and a trail of it from his steps | Troll Blood | Pestilence: what dies in it bursts into poison |
| | Bone Spear | Eagle Feather | Spine Lance |
| | Grasping Dead: bony hands claw up in a line and grip hard | Hourglass | Hands of the Grave |

A run saved before the rosters keeps the weapons it had, and they still level up. The newer weapons draw borrowed icons and sprites until their own are drawn (`tools/handoff-art.md`).

## Saving: everything lives in cookies

The server keeps **no database**. The only thing it writes to disk is its cookie key (`.data/cookie-secret`, or set `COOKIE_SECRET`).

| Cookie | Holds | Set by |
| --- | --- | --- |
| `fs_profile` | gold, wins per mode and difficulty (Normal counts as the old Medium, Veteran as Hard), records, Armory ranks, unlocked heroes, each hero's achievements (night survived, Dungeon beaten), Ranked personal bests, the gear each hero wears | server, encrypted (AES-256-GCM), HttpOnly |
| `fs_run` | a run to pick up again if the game is closed mid-run: hero, build, level, floor, time, gear worn, crypts cleared, shrines used, bosses still fighting (Survival and Ranked autosave every minute, the Dungeon at each floor; cleared the moment the hero falls) | server, encrypted (AES-256-GCM), HttpOnly |
| `fs_settings` | volume, screen shake, damage numbers, CRT, FPS | browser |

The profile and run cookies are a few hundred bytes, and at most about 2.5 KB: the profile with every hero in six legendaries (it keeps gear packed small, as a few numbers per piece), the run with six legendaries worn and dozens of crypts cleared. The server keeps a run's gear only if every piece is one the rules could have rolled, and no more of it is new than the run found crypts' lords. They are encrypted with a key derived from the server secret, so players can neither read nor edit them, and each is bound to its cookie name so one can't stand in for the other. Cookies written before encryption (signed, readable JSON) are accepted once and re-issued encrypted.

If a save exists but can't be decrypted (damaged, tampered with, or written under a different server key), the game says so on the title screen and offers a fresh start. A broken saved run only clears the run; gold, wins and the Armory stay. The old cookie is left untouched until the player accepts, so restoring the right key brings it back.

**When deploying, set `COOKIE_SECRET` to a long random value and keep it stable.** If the key changes, for example because `.data/` isn't persisted between deploys, every existing save becomes unreadable at once.

Run reports are clamped server-side: gold is capped by run length (at most two hours for the 15-minute night with its crypts), gear by how many crypts' lords the run could have reached, a victory only counts if the run lasted long enough to be one, and a run in a mode the hero hasn't unlocked yet is refused. The game runs in the browser, though, so these are bounds, not proof: the cookies can't be forged, but a hand-made run report within the bounds is still paid. The unlock ladder lives in `public/js/shared/profile.js`, shared by the server and the browser.

If the game is served as plain static files (no `/api`), it falls back to plain client-side cookies with the same rules (they can't be meaningfully encrypted without a server, since the key would ship in the page). An unreadable one gets the same fresh-start prompt. A game server that is there but not answering (no connection, or a 5xx) is not mistaken for static hosting: the title screen says it can't be reached and offers to try again. A run the server doesn't take is never faked either: the results screen says its gold isn't saved and offers to save again.

### API

| Method | Path | Body | Effect |
| --- | --- | --- | --- |
| GET | `/api/state` | — | profile + saved run, plus `unreadable: { profile, run }` when a save can't be decrypted |
| POST | `/api/run` | `{ mode, hero, victory, time, gold, kills, level, floor }` | pay out gold, record wins, achievements and Ranked bests, clear saved run; the reward lists anything newly unlocked |
| POST | `/api/checkpoint` | `{ checkpoint }` or `{ checkpoint: null }` | save / clear a run |
| POST | `/api/buy` | `{ id }` | buy an Armory rank |
| POST | `/api/refund` | — | refund all Armory ranks |
| POST | `/api/reset` | — | wipe progress |
| GET | `/api/dev` | — | developer mode status: `{ enabled, open, authed }` |
| POST | `/api/dev/login` | `{ key }` | start a 12-hour developer session (with `DEV_KEY`) |
| POST | `/api/dev/logout` | — | end the developer session |
| POST | `/api/dev/profile` | `{ profile }` | replace the whole profile (developer session only; still sanitized) |

POSTs must be `application/json`. Cookies are `SameSite=Lax`, and `Secure` behind HTTPS (including `X-Forwarded-Proto`).

## Developer mode

A panel for editing your save and bending a run, for testing. Press **`** (backtick) in the game, or add `?dev` to the URL to get a small **DEV** button (handy on a phone).

| Start the server with | Who can use the panel |
| --- | --- |
| `npm run dev` | anyone who can reach the server, no key. It listens on this machine only (set `HOST=0.0.0.0` to test from a phone on your network) and restarts on file changes |
| `DEV_KEY=<long secret> npm start` | whoever logs in with that key; the session lasts 12 hours |
| `npm start` | nobody: the panel doesn't open |

The server checks every edit, so shipping the panel's code to players unlocks nothing. With plain static hosting the save is a client cookie anyway, so the panel works there without a key, but only on this machine (localhost): on the published game it doesn't open.

- **Save file:** presets for each rung of the ladder (fresh start, Survival ladder done, Dungeon open to all, unlock everything, +10 000 gold, max/clear Armory); gold, owned heroes, every hero's achievements and Ranked best, victories, Armory ranks, records; delete the saved run; and a raw JSON editor for anything else.
- **This run:** live status; invincibility; freeze the game; +1 level (choose a card) or +10 levels (cards picked for you); full heal and fury; max or evolve all weapons; give any weapon or relic; open a chest; kill all foes; skip or set the clock; spawn any boss; next dungeon floor; win or die now. Results still go through the normal rules, so a developer win records wins and unlocks like a real one.

### The debug address

`/debug` (it forwards to `/?debug`) opens the game with every hero and every mode unlocked, on GitHub Pages too. Each hero shows as having survived the night and beaten the Dungeon, which is what unlocks them. In the Armory every upgrade is free: each press adds a rank, and past the last it goes back to none; **MAX ALL** and **CLEAR ALL** set them all. It keeps a save of its own (the `fs_dprofile` and `fs_drun` cookies, never the server's), so whatever is played or set there leaves the player's own progress alone (`public/js/engine/storage.js`).

## Meta-progression (the Armory)

Gold from runs buys permanent ranks: Might, Armor, Vitality, Recovery, Haste, Reach, Swiftness, Magnetism, Fortune, Wisdom, Greed, Insight (rerolls), Endurance (effect duration), Velocity (projectile speed), Echo (+1 projectile for every weapon) and Second Wind (up to two revives). Ranks can be refunded at any time. Each rank of Armor is a point of armor.

A point of **armor**, wherever it comes from (the Armory, the Knight's own two, the Plate Armor relic, gear), takes a tenth off what is left of each blow, or 1 damage if that is more. So every point adds a little less: one takes 10%, five 41%, ten 65%. All of it together never stops more than 95% of a blow, and a blow always does at least 1 (`armored` in `public/js/game/player.js`).

The 15-minute night was tuned, on what is now Veteran, so a fresh profile can't win it and a full Armory can: with the Knight, the gem-collecting bot died in 33 of 35 seeded games without the Armory and won all 35 with every rank (`node tools/bots.mjs --bot=gems --runs=35 --armory=none` and `--armory=max`; add `--diff=normal` for Normal). That was before armor took a tenth of a blow a point, which makes the Knight and any armored build sturdier; it hasn't been measured again since. What spawns when is a table of minute pockets in `public/js/data/waves.js`.

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

### Development tools

```bash
node tools/preview.mjs knight bat --scale=8      # render sprites to tools/out/sheet.png
node tools/play.mjs smoke                        # headless screenshots (needs the server running)
node tools/play.mjs sim --hero=archer --mode=s15 --secs=900   # bot plays a run, logs progress
node tools/play.mjs ui                           # screenshot every menu and overlay
node tools/balance.mjs --hero=knight --configs=s15:medium,s15:hard --runs=2   # bot balance report (Normal, Veteran)
node tools/watch.mjs --mode=s15 --from=0 --to=600 --every=60                # gameplay screenshots over a run
node tools/bots.mjs --bot=idle,circle,kite --runs=10                         # bots compared headlessly, no server needed
```

In the browser console, `__fs.sim(seconds)` fast-forwards the current run with the autopilot bot, and `__fs.sim(60, { bot: 'kite' })` with any other strategy.

## Bot play-testing

Scripted bots play the real game in Node, with no browser or server: draw calls go to a dummy canvas and `Math.random` is seeded per game, so a seed always replays the same game, many times faster than real time. Compare strategies, heroes and modes over many runs:

```bash
npm run bots                                    # every strategy · Knight · 15-minute night · 3 runs
node tools/bots.mjs --bot=idle,circle,kite --hero=knight --mode=s15 --runs=10 --seed=1
node tools/bots.mjs --bot=kite:r=40,kite:r=60 --hero=all --max=10:00 --each
node tools/bots.mjs --bot=gems --pick=all --armory=max --json=tools/out/gems.json
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

All of them press the ultimate when it is ready unless given `ult=0`. When a bot doesn't choose its own level-up cards, `--pick` does: `first`, `random`, `weapons`, `relics`, or `build` (the default: grow weapons, add the rest of the hero's four, the ones that clear the horde round him first, then the relics that evolve them, then useful relics). None of the strategies aims, so a weapon that flies only where the hero faces (the Hunting Bow) fares badly with any of them: they walk away from foes, or stand.

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
