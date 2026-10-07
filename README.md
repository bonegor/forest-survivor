# Forest Survivor

A medieval, Diablo-flavoured survivors-like for the browser. Pick a hero, auto-attack your way through ever-growing hordes, level up into evolved weapons, and either **survive the night** in the Darkwood or **delve three dungeon floors** to slay the Lord of Cinders.

Everything is hand-made in code: pixel-art sprites authored as palette strings, procedurally painted trees and dungeon tiles, a dynamic light map, synthesized sound effects and a chiptune score. There are no image or audio files and no dependencies.

## Run it

```bash
npm start          # http://localhost:3000
npm test           # profile + server tests
```

Requires Node 18+. Set `PORT` to change the port.

## How to play

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | left stick / d-pad | drag anywhere |
| Ultimate (when the fury orb is full) | Space / E / Q | X / triggers | tap the fury orb |
| Pause | Esc / P | Start | ⏸ button |
| Dungeon map | Tab / M | Back | — |
| Pick a level-up card | 1–4, arrows + Enter, click | d-pad + A | tap |
| Reroll level-up | R | Y | button |

Weapons fire automatically. Collect soul gems to level up; every level offers a choice of new weapons, weapon upgrades or relics. Once the whole build is maxed, level-ups offer a stacking **Blessing of Valor** (+might, +health), a heal, or gold.

### Heroes

| Hero | Unlock | Starts with | Perk | Ultimate |
| --- | --- | --- | --- | --- |
| Sir Aldric, Knight | — | Longsword | +2 armor, +40% health, slow regeneration | Whirlwind |
| Lyra, Ranger | 500 gold | Hunting Bow | +crit, +speed | Arrow Storm |
| Eldrin, Sorcerer | 1 500 gold | Fireball | −cooldowns, +area, +XP | Cataclysm |
| Kael, Shadow | 4 500 gold | Throwing Daggers | +crit, +speed, +luck | Shadow Dance |
| Morvath, Necromancer | 13 500 gold | Raise Dead (skeleton minions) | minions last 30% longer, +10% XP | Army of the Dead |

The Knight is the starting hero. The others unlock in order, and each costs three times the one before.

### Modes

- **Survival — 15 or 30 minutes.** Endless forest, night falls darker, bosses arrive on a schedule. Survive until dawn to win.
- **Dungeon Run — 3 floors.** Each floor's guardian sleeps behind a seal until you've slain enough foes. Kill it, take the stairs, and defeat the Demon Lord on floor 3. Your build carries over between floors.

Both modes have **Easy / Medium / Hard**. Easy is a forgiving first night; Medium pushes back and expects a decent build (Armory ranks help); Hard is for legends. Harder runs pay more gold.

### Things to find

- **Soul gems** (XP), **gold**, **potions**, **elixirs**
- **Scroll of Gathering** pulls in every gem; the **Holy Relic** purges the screen; the **Frost Rune** freezes everything; **fury orbs** charge your ultimate
- **Champions** with randomly generated names and affixes, and **Gilded Thieves** that flee with treasure
- **Treasure chests** from champions and bosses. A max-level weapon plus its paired relic **evolves** when you open a chest
- **Shrines** of Fury, Haste, Fortune, Wisdom and Protection
- Breakable barrels, crates, urns and lanterns

### Weapons and evolutions

| Weapon | + Relic | Evolves into |
| --- | --- | --- |
| Longsword | Gauntlets of Might | Excalibur |
| Hunting Bow | Eagle Feather | Stormstring |
| Fireball | Spellbook | Meteor Storm |
| Throwing Axe | Giant's Belt | Whirlwind |
| Firebomb Flask | Hourglass | Hellfire |
| Guardian Blades | Plate Armor | Aegis |
| Consecration | Troll Blood | Sanctuary |
| Chain Lightning | Echo Rune | Thunderstorm |
| Throwing Daggers | Swift Boots | Shadowstrike |
| Frost Nova | Vitality Amulet | Frozen Heart |
| Raise Dead *(Necromancer only)* | Scholar's Crown | Legion of the Damned |

## Saving: everything lives in cookies

The server keeps **no database**. The only thing it writes to disk is its cookie key (`.data/cookie-secret`, or set `COOKIE_SECRET`).

| Cookie | Holds | Set by |
| --- | --- | --- |
| `fs_profile` | gold, wins per mode/difficulty, records, Armory ranks, unlocked heroes | server, encrypted (AES-256-GCM), HttpOnly |
| `fs_run` | a saved run: hero, build, level, floor, time (Save & Quit, dungeon floor checkpoints, survival autosave every minute) | server, encrypted (AES-256-GCM), HttpOnly |
| `fs_settings` | volume, screen shake, damage numbers, CRT, FPS | browser |

The profile and run cookies are a few hundred bytes. They are encrypted with a key derived from the server secret, so players can neither read nor edit them, and each is bound to its cookie name so one can't stand in for the other. Cookies written before encryption (signed, readable JSON) are accepted once and re-issued encrypted.

If a save exists but can't be decrypted (damaged, tampered with, or written under a different server key), the game says so on the title screen and offers a fresh start. A broken saved run only clears the run; gold, wins and the Armory stay. The old cookie is left untouched until the player accepts, so restoring the right key brings it back.

**When deploying, set `COOKIE_SECRET` to a long random value and keep it stable.** If the key changes, for example because `.data/` isn't persisted between deploys, every existing save becomes unreadable at once.

Run reports are clamped server-side: gold is capped by run length, and a victory only counts if the run lasted long enough to be one.

If the game is served as plain static files (no `/api`), it falls back to plain client-side cookies with the same rules (they can't be meaningfully encrypted without a server, since the key would ship in the page). An unreadable one gets the same fresh-start prompt.

### API

| Method | Path | Body | Effect |
| --- | --- | --- | --- |
| GET | `/api/state` | — | profile + saved run, plus `unreadable: { profile, run }` when a save can't be decrypted |
| POST | `/api/run` | `{ mode, diff, hero, victory, time, gold, kills, level, floor }` | pay out gold, record wins, clear saved run |
| POST | `/api/checkpoint` | `{ checkpoint }` or `{ checkpoint: null }` | save / clear a run |
| POST | `/api/buy` | `{ id }` | buy an Armory rank |
| POST | `/api/refund` | — | refund all Armory ranks |
| POST | `/api/unlock` | `{ hero }` | unlock a hero |
| POST | `/api/reset` | — | wipe progress |

POSTs must be `application/json`. Cookies are `SameSite=Lax`, and `Secure` behind HTTPS (including `X-Forwarded-Proto`).

## Meta-progression (the Armory)

Gold from runs buys permanent ranks: Might, Armor, Vitality, Recovery, Haste, Reach, Swiftness, Magnetism, Fortune, Wisdom, Greed, Insight (rerolls) and Second Wind (a revive). Ranks can be refunded at any time. Gold also unlocks the other heroes (see above).

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
test/                      node:test suites
tools/                     art preview (PNG) and headless play-test scripts
```

### Development tools

```bash
node tools/preview.mjs knight bat --scale=8      # render sprites to tools/out/sheet.png
node tools/play.mjs smoke                        # headless screenshots (needs the server running)
node tools/play.mjs sim --hero=archer --mode=s15 --secs=900   # bot plays a run, logs progress
node tools/play.mjs ui                           # screenshot every menu and overlay
node tools/balance.mjs --hero=knight --configs=s15:easy,s15:hard --runs=2   # bot balance report
node tools/watch.mjs --mode=s15 --from=0 --to=600 --every=60                # gameplay screenshots over a run
```

In the browser console, `__fs.sim(seconds)` fast-forwards the current run with the bot.
