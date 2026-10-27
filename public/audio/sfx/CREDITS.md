# Sound-effect credits

Every other sound effect is synthesised in `js/engine/audio.js`. These few are recordings, for the
Darkwood's weather (`js/game/weather.js`): its thunder, its rain, and the hero's steps on wet
ground. All are CC0 1.0 (public domain, https://creativecommons.org/publicdomain/zero/1.0/); CC0
asks for nothing, and the credit is given gladly. All came by way of the free-game-sfx collection
(https://github.com/JanTheLynx/free-game-sfx, commit 913892f).

- **thunder-1.ogg … thunder-6.ogg**: Stendhal's weather sounds `thunder-04`, `thunder-01`, `thunder-02`, `thunder-03`, `thunder-06` and `thunder-08` (in that order), by the Stendhal team (https://stendhalgame.org/) from CC0 Freesound recordings, released CC0 (Stendhal's LICENSE-audio.txt). Changes: mixed to mono, leading silence trimmed, the tail faded, loudness levelled to about -18 LUFS (peaks held at -1 dBFS), Ogg Vorbis 44.1 kHz.
- **rain.ogg**: Stendhal's `rain_heavy`, by the Stendhal team, CC0 as above. Changes: made loop-ready (the last 2 s faded under the start), loudness levelled to about -20 LUFS, Ogg Vorbis 44.1 kHz stereo.
- **step-wet-1.ogg … step-wet-6.ogg**: the two steps in each of `mud-steps-03`, `mud-steps-04` and `mud-steps-05` from the Fantasy Accessory SFX library by Jan Schupke ("Vehicle"), https://opengameart.org/content/fantasy-accessory-sfx-library, CC0. Changes: each step cut to its own 0.38 s file, mixed to mono, faded out, peaks levelled to -3 dBFS, Ogg Vorbis 44.1 kHz.
