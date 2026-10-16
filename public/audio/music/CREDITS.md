# Music credits

`tracks.json` says which file plays for which piece of the game. To swap a track, replace its file or point the entry at another one; an entry can also be `{ "file": "...", "gain": 2 }` to play it louder or softer. The files are the only music: a piece with no file is silent.

## Original: the menu-music candidates (`menu/`)

The guitar loops in `menu/` were composed for the game (`tools/music/songs/`, as MIDI) and rendered
by `tools/music/render.mjs`. The `*-sf*.ogg` renders play the MIT-licensed **MuseScore_General**
SoundFont, whose notices travel with them: FluidR3 by Frank Wen (c) 2000-02; FluidR3Mono by
Michael Cowgill (c) 2014-17; MuseScore_General adaptation by S. Christian Collins (c) 2018-19;
MIT licence, https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/. The `*-ks.ogg`
renders are a plucked-string synthesizer and contain no samples. `menu/candidates.json` lists them
for the audition page (unlisted).

The guitar-sound excerpts in `menu/guitars/` (20 seconds of two tunes through every guitar, for
choosing a sound; `menu/guitars/guitars.json` says which font each one plays) carry samples of
these fonts besides MuseScore_General:

- GeneralUser GS v2.0.3 by S. Christian Collins (c) 1997-2025, https://www.schristiancollins.com/generaluser, GeneralUser GS License v2.0 (free use in music, private or commercial).
- Spanish Classical Guitar (2019-06-18), recorded by Roberto (roberto@zenvoid.org) for the FreePats project, https://freepats.zenvoid.org/Guitar/acoustic-guitar.html, CC0 1.0.
- FSBS Electric Guitar Clean #2 (Jazz) (2026-08-07), FreePats project, https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html, CC0 1.0.
- Concert Harp (2020-07-02), FreePats project, from the Versilian Community Sample Library by Versilian Studios LLC, https://freepats.zenvoid.org/OrchestralStrings/harp.html, CC0 1.0.
- Ukulele (2026-08-11), recorded by Mateusz Dąbrowski for the FreePats project, https://freepats.zenvoid.org/GuitarFamily/ukulele.html, CC0 1.0.

CC0 asks for nothing; the credit is given gladly. Full renders of the tunes play only MuseScore_General or the synthesizer.

## Required

- **dungeon-inferno.ogg** (Dungeon Run, floor 3): "The King of Hell", produced by Julie Damsgaard / Spring Spring / Spring Enterprises, https://spring-enterprises.neocities.org. Licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://opengameart.org/content/the-king-of-hell-final-boss-theme

## Public domain (CC0; credit not required, but given gladly)

| File | Plays for | Track | Artist | Source |
| --- | --- | --- | --- | --- |
| title.mp3 | title screen | 8-bit - Truth | HydroGene | https://opengameart.org/content/8-bit-truth |
| forest.mp3 | the Darkwood | 8-bit MonsterVania #2 | HydroGene | https://opengameart.org/content/8-bit-monstervania-2-0 |
| crypt.mp3 | crypts | 8-bit - Infinite Darkness | HydroGene | https://opengameart.org/content/8-bit-infinite-darkness |
| boss.mp3 | boss fights | 8-bit Danger!! Strong Boss | HydroGene | https://opengameart.org/content/8-bit-danger-strong-boss |
| victory.mp3 | dawn / victory | Victory | celestialghost8 | https://opengameart.org/content/victory |
| gameover.mp3 | death | No Hope (You died), retro version | Cleyton Kauffman, https://soundcloud.com/cleytonkauffman (asks to be credited) | https://opengameart.org/content/game-over-theme |
| dungeon-crypt.mp3 | Dungeon Run, floor 1 | JRPG - End Dungeon | HydroGene | https://opengameart.org/content/jrpg-end-dungeon |
| dungeon-catacombs.ogg | Dungeon Run, floor 2 | Haunting Chiptune Loop [Void Estate], haunted arcade version | Zane Little Music | https://opengameart.org/content/haunting-chiptune-loop-void-estate |

All CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/
