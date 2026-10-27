# Sound-effect credits

Every other sound effect is synthesised in `js/engine/audio.js`. These are recordings: the
Darkwood's weather (`js/game/weather.js`), its thunder, its rain and the hero's steps on wet ground,
and the weapons' blows. Each file's licence is given with it:

- **CC0 1.0** (public domain, https://creativecommons.org/publicdomain/zero/1.0/) and **public
  domain** files ask for nothing; the credit is given gladly.
- **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/) asks for the credit below.
- **CC BY-SA 3.0** (https://creativecommons.org/licenses/by-sa/3.0/) and **CC BY-SA 4.0**
  (https://creativecommons.org/licenses/by-sa/4.0/) ask for the credit below, and our trimmed
  copies of those files are shared under the same licence as their source.

## The weather

All CC0, by way of the free-game-sfx collection (https://github.com/JanTheLynx/free-game-sfx, commit 913892f).

- **thunder-1.ogg … thunder-6.ogg**: Stendhal's weather sounds `thunder-04`, `thunder-01`, `thunder-02`, `thunder-03`, `thunder-06` and `thunder-08` (in that order), by the Stendhal team (https://stendhalgame.org/) from CC0 Freesound recordings, released CC0 (Stendhal's LICENSE-audio.txt). Changes: mixed to mono, leading silence trimmed, the tail faded, loudness levelled to about -18 LUFS (peaks held at -1 dBFS), Ogg Vorbis 44.1 kHz.
- **rain.ogg**: Stendhal's `rain_heavy`, by the Stendhal team, CC0 as above. Changes: made loop-ready (the last 2 s faded under the start), loudness levelled to about -20 LUFS, Ogg Vorbis 44.1 kHz stereo.
- **step-wet-1.ogg … step-wet-6.ogg**: the two steps in each of `mud-steps-03`, `mud-steps-04` and `mud-steps-05` from the Fantasy Accessory SFX library by Jan Schupke ("Vehicle"), https://opengameart.org/content/fantasy-accessory-sfx-library, CC0. Changes: each step cut to its own 0.38 s file, mixed to mono, faded out, peaks levelled to -3 dBFS, Ogg Vorbis 44.1 kHz.

## The weapons

Every weapon file was changed the same way: mixed to mono, leading silence trimmed, a 45 Hz
high-pass, cut short with a faded tail, and levelled so all of them peak at the same short-term
loudness (peaks held at -1 dBFS), Ogg Vorbis 44.1 kHz.

- **sword-slash.ogg** (CC0): two CC0 sounds by Ben "artisticdude", mixed: the swing `edgar/swing` from his Battle Sound Effects (https://opengameart.org/content/battle-sound-effects), as shipped with The Legend of Edgar (http://www.parallelrealities.co.uk/games/edgar/), and `sword-unsheathe3` from his RPG Sound Pack (https://opengameart.org/content/rpg-sound-pack), by way of the free-game-sfx collection. The steel ring starts 30 ms into the swing, 4 dB under it.
- **hit.ogg** (CC BY-SA 3.0): `attack/impact/fleshimp_11` from 0 A.D., © 2009 Wildfire Games (https://play0ad.com/).
- **crit.ogg** (CC BY-SA 3.0): `sound/seq/sword-hit` from UFO: Alien Invasion, by Christian "Crystan" Hoffmann (UFO:AI Team, http://sourceforge.net/projects/ufoai/).
- **bow.ogg** (CC BY-SA 3.0): `soundfx/powers/shoot` from Flare: Empyrean Campaign (https://github.com/flareteam/flare-game), by qubodup (Iwan Gabovitch).
- **axe-throw.ogg** (CC BY-SA 3.0): `commondata/sounds/axe_thrower_attack3` from MegaGlest (https://megaglest.org/), © 2001-2008 the Glest Team, 2008-2017 the MegaGlest Team.
- **dagger.ogg** (CC BY-SA 3.0): `Sounds/WeaponSwingHigh` from Ardentryst (http://jordan.trudgett.com/), whose sounds are credited together to Kendra Pietruszewski, Amy Dunwoodie, www.digifishmusic.com and Freesound.org users (Anton, acclivity, adcbicycle, aust, Connum, decembered, Erdie, ERH, FreqMan, Halion, HerbertBoland, inchadney, laurent, Leady, luffy, martian, redjim, reinsamba, Robinhood76, sagetyrtle, Stickinthemud, themfish, Wolfsinger, zebraphone).
- **fireball.ogg** (CC BY-SA 3.0): `soundfx/powers/fireball` from Flare: Empyrean Campaign, by its fantasycore foley artists Brandon Morris, Justin Jacobs and rubberduck.
- **frost.ogg** (CC BY-SA 3.0): `soundfx/powers/freeze` from Flare: Empyrean Campaign, by the same artists.
- **explosion.ogg** (public domain): `sounds/explosion medium` from Endless Sky (https://github.com/endless-sky/endless-sky), made from public-domain Freesound recordings.
- **lightning.ogg** (CC BY-SA 4.0): `sounds/storm` from HyperRogue (https://www.roguetemple.com/z/hyper/), © 2014 Brett Cornwall (the Hydra Slayer sounds).
- **flask.ogg** (CC BY 3.0): `Sound.ocg/Fire.ocg/BlastLiquid3alt` from OpenClonk (https://www.openclonk.org/), by K-Pone.
- **blades.ogg** (CC0): `swish_3` from Ogrebane's battle sounds for Summoning Wars (released under a choice of licences including public domain, which is the one used), by way of the free-game-sfx collection.
- **scythe.ogg** (public domain): `audio/toon/swish` from M.A.R.S. (https://github.com/thelaui/M.A.R.S.), whose toon sounds are all public domain.
- **wood-snap.ogg** (CC0): `wood-twigs-break-01` from the Fantasy Accessory SFX library by Jan Schupke ("Vehicle"), https://opengameart.org/content/fantasy-accessory-sfx-library, by way of the free-game-sfx collection.
