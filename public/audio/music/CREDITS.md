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

## Found recordings: menu-music candidates (`menu/found/`)

Recordings by other musicians, listed in `menu/candidates.json` for the audition page. Every file
here has been changed from the original: converted to Ogg Vorbis (44.1 kHz stereo, quality 4),
silence trimmed from the ends, and loudness normalised to about -16 LUFS integrated with at most
3 dB of peak limiting (the three quietest sit lower and carry a playback gain instead). "Loop-ready"
means the last few seconds of the closing ring-out were faded and moved under the start, so the
file repeats without a gap. The changes are ours; the musicians do not endorse this game.

- **menu/found/romance-anonimo.ogg**: "Romance Anónimo" (the anonymous 19th-century Spanish Romance), performed by Jim Greeninger. Source: https://commons.wikimedia.org/wiki/File:Romance_An%C3%B3nimo_(Jeux_interdits).ogg (from Musopen, https://musopen.org/music/570/francisco-tarrega/romance-de-juegos-prohibidos/). CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/; credit given gladly. Changed: cut before the closing applause with a 0.5 s fade, plus the changes above.
- **menu/found/pachelbel-sarabande.ogg**: "Sarabande" from Johann Pachelbel's Suite in F-sharp minor, P. 439, arranged for guitar and performed by Bert Alink. Source: https://commons.wikimedia.org/wiki/File:Pachelbel_-_Suite_in_F-sharp_minor,_P._439_-_IV._Sarabande_(Guitar).ogg (also IMSLP #463136, https://imslp.org/wiki/Suite_in_F-sharp_minor,_P.439_(Pachelbel,_Johann)). Licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Changed: resampled from 48 kHz, made loop-ready, plus the changes above.
- **menu/found/ravel-menuet.ogg**: "Mouvement de menuet" from Maurice Ravel's Sonatine, M. 40, transcribed for two guitars and performed by the Tomasi-Musso Guitar Duo (Davide Giovanni Tomasi and Marco Musso; audio by Drew Henderson). Source: https://commons.wikimedia.org/wiki/File:Ravel%27s_Sonatine,_M._40_-_II._Mouvement_de_menuet_(2_guitars)_-_Tomasi-Musso_Guitar_Duo.ogg, from https://www.youtube.com/watch?v=hgY96JUV4lY. Licensed CC BY 3.0, https://creativecommons.org/licenses/by/3.0/. Changed: resampled from 48 kHz, made loop-ready, plus the changes above.
- **menu/found/breezy-may.ogg**: "Breezy May (Acoustic)" by Axletree. Source: https://freemusicarchive.org/music/Axletree/Sunset_EP/Breezy_May_Acoustic (the file as mirrored at https://commons.wikimedia.org/wiki/File:02_-_Breezy_May_Acoustic.ogg). Licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Changed: 5 s of silence cut from the start, made loop-ready, plus the changes above.
- **menu/found/through-the-leaves.ogg**: “Through the Leaves” by Matthew C. Wright (www.matthewcwright.com). Listen: https://matthewcwright.com/16g0d. License: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Source: https://freemusicarchive.org/music/matthew-c-wright/dreamy-royalty-free-acoustic-guitar-sweater-weather/pretty-royalty-free-guitar-through-the-leaves/. Changed: room noise cut from both ends, made loop-ready, plus the changes above.
- **menu/found/the-bard.ogg**: "The Bard" by Pyerye, posted on OpenGameArt by Alundra. Source: https://opengameart.org/content/the-bard. Licensed CC BY 3.0, https://creativecommons.org/licenses/by/3.0/. Changed: made loop-ready, plus the changes above.

The compositions by Pachelbel and Ravel, and the anonymous Romance, are in the public domain. The arrangements and recordings are under the licences above.
