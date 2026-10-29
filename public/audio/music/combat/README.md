# Fifteen-minute combat music

The game offers these eight original pieces in its music selectors. Clockwork Charge is
the default. The files are exact copies of their published listening
versions; they have not been re-encoded. `manifest.json` records the selected
version names, measured levels, source scores and SHA-256 hashes.

| File | Selected listening version | Tempo | Length |
| --- | --- | --- | --- |
| `clockwork-charge-15m.mp3` | Clockwork Charge - 15 minute version v1.mp3 | 160 BPM | 15:00 |
| `lantern-guard-v2-15m.mp3` | Lantern Guard - fifteen minute journey v2.mp3 | 160 BPM | 15:00 |
| `spark-rush-15m.mp3` | Spark Rush - fifteen minute version v1.mp3 | 156 BPM | 15:00 |
| `dusty-trail-stampede-15m.mp3` | Dusty Trail Stampede - fifteen minute version v1.mp3 (country) | 144 BPM | 15:00 |
| `steel-tread-v2-15m.mp3` | Steel Tread - 15 minute metal groove v2.mp3 | 160 BPM | 15:00 |
| `bootheel-loop-v2-15m.mp3` | Bootheel Loop - 15 minute country groove v2.mp3 | 144 BPM | 15:00 |
| `neon-motor-v2-15m.mp3` | Neon Motor - 15 minute electronic groove v2.mp3 | 128 BPM | 15:00 |
| `breakbeat-circuit-v2-15m.mp3` | Breakbeat Circuit - 15 minute broken-beat groove v2.mp3 | 168 BPM | 15:00 |

The selected file streams during combat and loops natively. The files contain
MP3 timing metadata, and each version decodes to exactly 39,690,000
stereo frames at 44.1 kHz. The short final fades remain part of the recordings.

Music can be chosen before a run, in Options, or from Pause during a run.
Browsing plays separate ten-second clips from 7:25 to 7:35, centred on each
recording's midpoint. These clips have short boundary fades and the same
instrument credits as their full recordings. `previews/manifest.json` records
their source hashes, exact decoded lengths and measured levels. Previewing
does not require loading an entire fifteen-minute recording.

## Credits and editable sources

All melodies, arrangements and performances are original and programmed for
Forest Survivor. The compositions and MIDI scores are in
[`tools/music/handmade-fight`](../../../../tools/music/handmade-fight/README.md).

- **Clockwork Charge:** Cakewalk SI-String Section, SI-Electric Piano,
  SI-Bass Guitar and SI-Drum Kit.
- **Lantern Guard v2:** FreePats ConcertHarp-20200702, assembled by Roberto
  from the CC0 Versilian Community Sample Library, with Cakewalk SI-String
  Section, SI-Bass Guitar and SI-Drum Kit. Harp performer: K. Smith. Sources:
  https://freepats.zenvoid.org/ and https://vis.versilstudios.com/vcsl.html.
  Sample licence: https://creativecommons.org/publicdomain/zero/1.0/.
- **Spark Rush:** original programmed synth bass, chords, plucked lead,
  electronic kick and clap, with Cakewalk SI-Drum Kit.
- **Dusty Trail Stampede:** a driving country arrangement with Ample Guitar M
  Lite acoustic guitar, Shreddage 3 Stratus FREE electric guitar through a
  Guitar Rig 7 Player clean amp, Cakewalk SI-Bass Guitar and SI-Drum Kit, and
  MuseScore_General banjo and piano. MuseScore_General notices: FluidR3 by
  Frank Wen (c) 2000-02; FluidR3Mono by Michael Cowgill (c) 2014-17;
  adaptation by S. Christian Collins (c) 2018-19, MIT licence:
  https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/.
- **Steel Tread v2:** original two/four-bar metal riff variations, with two
  distinct Shreddage 3 Stratus FREE guitar parts through Guitar Rig 7 Player
  heavy amps, Cakewalk SI-Bass Guitar and SI-Drum Kit.
- **Bootheel Loop v2:** original country patterns, with Ample Guitar M Lite
  acoustic strums, Shreddage clean electric guitar, Cakewalk bass/drums and
  MuseScore_General banjo (bank 0, program 105). The MuseScore_General MIT
  notices above apply to this recording too.
- **Neon Motor v2** and **Breakbeat Circuit v2:** original programmed synth
  bass, chord stabs, counter-pulses and electronic percussion, with Cakewalk
  SI-Drum Kit. Breakbeat Circuit's drum patterns are original MIDI, not a
  sampled recording of another musician's drum break.

The four v2 groove scores and their independent arrangement review are in
`tools/music/handmade-fight/repeating-grooves/`. Their related patterns change
every two or four bars; the corresponding MIDI files end in `-v2.mid`.

Instrument and plugin binaries are not distributed in this folder. The prior
soundtracks and their credits remain elsewhere in `audio/music/`.
