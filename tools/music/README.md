# Menu music: compose, build, render

Guitar loops for the title screen and menus. Each tune is written as data, built into MIDI, then
rendered into a seamless Ogg Vorbis loop in a few flavours for the audition page
(unlisted; it reads `public/audio/music/menu/candidates.json`).

```
node tools/music/build-midi.mjs [id...]      # songs/<id>.mjs -> out/<id>.mid + out/songs.json
node tools/music/render.mjs [id...]          # out/<id>.mid -> public/audio/music/menu/<id>-<renderer>.ogg
     [--only=sf,sf-steel,ks] [--guitar=<id>,...] [--keep-wav] [--q=5] [--max-kb=2560]
     [--replace] [--no-nylon-comp]
node tools/music/render.mjs --test           # the whole pipeline on a built-in test tune, into out/test/
node tools/music/render.mjs menu-v2 menu-v3 --excerpt=20 [--guitar=listen]
                                             # "Guitar sounds": menu/guitars/<id>-<guitar>.ogg + guitars.json
```

- `songs/<id>.mjs`: one tune each (see `song.mjs` for the format and helpers). Its `render` block
  steers the mix: `leadOverRhythmDb`, and `reverb` as text such as `"small hall, ~20% wet, 1.6 s"`.
- `build-midi.mjs`, `midi.mjs`, `song.mjs`: validation and the MIDI writer.
- `render.mjs` and `render/`: the renderer.
  - `sf`: FluidSynth with the MuseScore General SoundFont, the song's own guitars. `sf-steel`: the
    same with every guitar on Steel (GM 25), skipped when they already are.
  - `ks`: `render/pluck.mjs`, a Karplus-Strong plucked-string synth (no samples): string loops
    tuned to a fraction of a cent, decay set per note, pick position, two polarisations, six
    strings in standard tuning, body resonances.
  - `render/mix.mjs`: one dry stem per guitar, balanced by BS.1770 loudness to the song's
    `leadOverRhythmDb`, sent (by each track's CC91) to a stereo hall with the song's decay and wet
    level. `x% wet` means wet : dry = x : (100 - x) in level.
  - Loops: each stem is exactly `bars` long. FluidSynth renders 4 s past the end and the overhang
    is added onto the start. The synth renders the song in its steady state (three copies, the
    second kept, the third proving it repeats bit for bit). The hall runs round the loop twice.
  - Mastering (`render/master.mjs`): static gain to -16 LUFS, then a loop-aware look-ahead limiter
    (true peak at most -1.5 dBTP, measured by ffmpeg after encoding). The limiter takes at most 3 dB
    off a peak. A sparse, peaky tune stays quieter instead, and its candidate's `gain` (used by
    the game, capped at 1 on the audition page) makes up the difference. Then Ogg Vorbis at q5
    (`--q`), a step lower while the file is over `--max-kb`.
  - `candidates.json`: the files just made replace their namesakes, the rest stay while their files
    do; with `--replace` the songs rendered keep only this run's renderers (other files stay on
    disk, unlisted). Ordered by songs.json, then renderer.
  - Nylon compensation: MuseScore General's nylon (bank 0, program 24) gets quieter up the neck
    at equal velocity (about -4 dB from B3, -8 dB at D5, -10 dB from E5). Wherever it plays (`sf`
    on a nylon track, `ms-nylon`), notes above B3 (59) are sent 0.6 velocity a semitone harder,
    up to 127. A song turns it off with `render: { nylonComp: false }` (relax-s2, compensated by
    hand), or sets its own velocity per semitone with a number there; `--no-nylon-comp` turns it
    off for a run. FluidSynth's velocity curve makes +10 velocity only about +2 dB: on relax-s1
    the notes from D#5 up come out about 1.8 dB louder (dry), 1.7 dB louder against the thumb
    after mastering.
  - Checks for every file: loudness and true peak before and after, exact sample count, the seam
    (sample step and curvature across it against the file's own distribution, before and after
    encoding), RMS per 2 s window and channel, note onsets against the MIDI, octave bands. The
    MIDI is checked for guitar range, more than six notes at once, re-struck notes, and notes
    still held when the loop restarts. Full numbers go to `out/render/report.json`.
  - Brightness and attack (`render/timbre.mjs`), for every render, of the dry lead and rhythm
    stems and of the mix: spectral centroid, share of energy above 3 kHz, and over the first
    30 ms of each note its share above 3 kHz, its crest (peak over RMS) and how far it stands
    over the 270 ms after it, plus the delay from note-on to the attack. "Clanky" is a hard,
    bright attack: a high attack share above 3 kHz and a high crest.

## Guitars (`--guitar=<id>`, `render/guitars.mjs`)

`--guitar=a,b` renders the songs on those guitars into `<id>-<guitar>.ogg`, listed in
`candidates.json` with the guitar's label as the renderer (alone it replaces the default
`sf,sf-steel,ks`; with `--only` both are made). `listen` is the listening set, `all` every
guitar. A guitar names a voice for the lead (the track with role `lead`) and one for every other
guitar track: a SoundFont preset (font, bank, program; the bank goes out as CC0 with CC32 = 0,
which FluidSynth's GS mode reads as the bank) or a plucked-synth preset. Tracks on other
instruments keep their own voice on MuseScore General. `setPrograms` in `render/smf.mjs` writes
the bank and program per channel. A part can also carry `gainDb` (a trim on its stem) and `range`
(its playable keys; notes outside are reported).

`--excerpt=20` renders, instead of loops, the first whole bars nearest 20 s of each song (menu-v2:
bars 0-9, 19.6 s; menu-v3: bars 0-7, 19.2 s), lets them ring 3 s with the last 2.5 s faded, masters
them like the loops (-16 LUFS, true peak under -1.5 dBTP), encodes them at q4 into
`public/audio/music/menu/guitars/` and lists them with their numbers and credits in
`guitars.json` there. The audition page's "Guitar sounds" section plays them.

| id | lead / rhythm | font |
| --- | --- | --- |
| `sf`, `sf-steel`, `ks` | the first three renderers, unchanged | MuseScore General / none |
| `ms-nylon` `ms-steel` `ms-jazz` `ms-clean` | GM 24 / 25 / 26 / 27 on both | MuseScore General |
| `ms-12string` `ms-ukulele` `ms-mandolin` | banks 8:25; 8:24 (its nylon samples, filtered); 16:25 (its other steel set, filtered) | MuseScore General |
| `ms-harp` | GM 46 | MuseScore General |
| `gu-nylon` `gu-steel` `gu-jazz` `gu-clean` `gu-harp` | GM 24 / 25 / 26 / 27 / 46 on both | GeneralUser GS |
| `gu-12string` | bank 8:25 | GeneralUser GS |
| `fp-classical` `fp-jazz` `fp-harp` | the font's one preset on both | FreePats (below) |
| `fp-ukulele` | ukulele lead (its notes run Bb3-C6 only; B2 and C3 are a body tap and a chuck), classical rhythm | FreePats |
| `ks-warm` | synth `NYLON_WARM`: a softer, rounder pluck picked further from the bridge, a longer ring, more body | none |
| `ks-steel-soft` | synth `STEEL_SOFT`: steel without the pick click, a softer pluck | none |

All but `sf` and `sf-steel` are in the listening set. GeneralUser (`gu-*`) is for the listening set
only (`auditionOnly`: its author cannot vouch for the origin of every sample), so render.mjs
refuses it without `--excerpt`. The FreePats FSS steel-string (GPL-3.0+ with a sample exception)
was tried and dropped for its licence.
MuseScore General's other guitar-family presets reuse these sample sets (Hawaiian is the jazz
guitar with vibrato, Funk and Palm Muted are muted clean, Overdrive and Distortion are electric);
GeneralUser's Ukulele is one pitched nylon sample. FluidR3_GM.sf2 was not fetched: MuseScore
General is built from it, guitars included.

The FreePats Spanish classical guitar's samples keep 0-34 ms of near-silence before the pluck,
different per note, which plays as loose timing. It is played from a copy whose sample starts are
moved to the attack (`render/sf2trim.mjs`; only the sample headers change), kept as
`bin/sf/cache/fp-classical-trimmed.sf2` and remade when the font is newer.

## Toolchain (not in the repository: `tools/music/bin/` and `tools/music/out/` are ignored)

| Tool | From | Licence |
| --- | --- | --- |
| FluidSynth 2.6.1 | GitHub release `v2.6.1`, the `win10-x64` zip, unpacked to `tools/music/bin/fluidsynth/` (`fluidsynth.exe` and its DLLs) | LGPL-2.1 |
| MuseScore_General.sf3 | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/ (with `MuseScore_General_License.md`) into `tools/music/bin/` | MIT |
| ffmpeg (libvorbis) | `winget install Gyan.FFmpeg` | GPL-3 build, used as a tool only |

Override the paths with the environment variables `FLUIDSYNTH`, `SOUNDFONT` and `FFMPEG` (ffmpeg
defaults to the winget install, else `ffmpeg` on the PATH). Node 18 or later; no npm packages.

FluidSynth notes: `-F out.wav -O float -T wav` writes 32-bit float WAV, so nothing clips;
`-o synth.dynamic-sample-loading=1` loads only the samples used (5 s instead of 13 s a render, the
same audio); its own reverb and chorus are off, because the mixer adds the hall.

Renders made with the SoundFont carry its samples. Its licence (MIT) asks that these notices go
with derivative works, so credit them wherever an `sf` render ships: FluidR3 by Frank Wen
(c) 2000-02; FluidR3Mono by Michael Cowgill (c) 2014-17; MuseScore_General adaptation by
S. Christian Collins (c) 2018-19; MIT licence. The `ks` renders contain no samples.

### SoundFonts for `--guitar` (`tools/music/bin/sf/<name>/`, one folder each, not in the repository)

| Folder | Font | From | Licence | Download |
| --- | --- | --- | --- | --- |
| `generaluser-gs/` | GeneralUser GS v2.0.3, S. Christian Collins | `GeneralUser-GS.sf2` and `documentation/LICENSE.txt` from https://github.com/mrbumpy409/GeneralUser-GS (project page https://www.schristiancollins.com/generaluser) | GeneralUser GS License v2.0: free use for music, private or commercial, and in software; asks not to hot-link its downloads | 32.3 MB |
| `freepats-spanish-classical/` | Spanish Classical Guitar 2019-06-18, Roberto (roberto@zenvoid.org), FreePats | https://freepats.zenvoid.org/Guitar/acoustic-guitar.html, `SpanishClassicalGuitar-SF2-20190618.7z`, unpacked | CC0 1.0 | 10.0 MB (19.8 MB unpacked) |
| `freepats-fsbs-jazz/` | FSBS Electric Guitar Clean #2 (Jazz), bridge, small, 2026-08-07, FreePats | https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html, `EGuitarFSBS-jazz-bridge-small-SF2-20260807.7z` | CC0 1.0 | 5.2 MB (7.8 MB) |
| `freepats-concert-harp/` | Concert Harp 2020-07-02, FreePats, from the Versilian Community Sample Library (Versilian Studios LLC) | https://freepats.zenvoid.org/OrchestralStrings/harp.html, `ConcertHarp-SF2-20200702.tar.xz` | CC0 1.0 | 9.5 MB (18.8 MB) |
| `freepats-ukulele/` | Ukulele 2026-08-11, recorded by Mateusz Dąbrowski, FreePats | https://freepats.zenvoid.org/GuitarFamily/ukulele.html, `Ukulele-SF2-20260811.7z` | CC0 1.0 | 1.5 MB (2.7 MB) |

The `.7z` and `.tar.xz` archives unpack with the `tar.exe -xf` that comes with Windows
(libarchive). The exact paths are in `render/guitars.mjs` (`FONTS`).

**Credits for shipped renders.** A render carries the samples of every font it played, so
`public/audio/music/CREDITS.md` must name each one a shipped render uses (`fontsOf(id)` in
`render/guitars.mjs` lists them; `guitars.json` repeats them per guitar):

- MuseScore General (`sf*`, `ms-*`): the MIT notice above, already in CREDITS.md.
- GeneralUser GS (`gu-*`, excerpts only): "GeneralUser GS v2.0.3 by S. Christian Collins (c) 1997-2025,
  https://www.schristiancollins.com/generaluser, GeneralUser GS License v2.0"
- FreePats Spanish classical (`fp-classical`, `fp-ukulele`): "Spanish
  Classical Guitar (2019-06-18), recorded by Roberto (roberto@zenvoid.org) for the FreePats
  project, https://freepats.zenvoid.org/Guitar/acoustic-guitar.html, CC0 1.0"
- FreePats jazz electric (`fp-jazz`): "FSBS Electric Guitar Clean #2 (Jazz) (2026-08-07),
  FreePats project, https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html, CC0 1.0"
- FreePats harp (`fp-harp`): "Concert Harp (2020-07-02), FreePats project, from the Versilian
  Community Sample Library by Versilian Studios LLC,
  https://freepats.zenvoid.org/OrchestralStrings/harp.html, CC0 1.0"
- FreePats ukulele (`fp-ukulele`): "Ukulele (2026-08-11), recorded by Mateusz Dąbrowski for the
  FreePats project, https://freepats.zenvoid.org/GuitarFamily/ukulele.html, CC0 1.0"

CC0 asks for nothing, but the credit is free to give. The excerpts in
`public/audio/music/menu/guitars/` carry samples of all these fonts: if they are published,
CREDITS.md should name them too.
