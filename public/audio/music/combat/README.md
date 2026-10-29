# Fifteen-minute combat music

The game offers these three original pieces before a run. Clockwork Charge is
the default. All three files are exact copies of the user-approved listening
versions; they have not been re-encoded. `manifest.json` records the selected
version names, measured levels, source scores and SHA-256 hashes.

| File | Selected listening version | Tempo | Length |
| --- | --- | --- | --- |
| `clockwork-charge-15m.mp3` | Clockwork Charge - 15 minute version v1.mp3 | 160 BPM | 15:00 |
| `lantern-guard-v2-15m.mp3` | Lantern Guard - fifteen minute journey v2.mp3 | 160 BPM | 15:00 |
| `spark-rush-15m.mp3` | Spark Rush - fifteen minute version v1.mp3 | 156 BPM | 15:00 |

The selected file streams during combat and loops natively. The files contain
MP3 timing metadata, and each approved version decodes to exactly 39,690,000
stereo frames at 44.1 kHz. The short final fades remain part of the recordings.

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

Instrument and plugin binaries are not distributed in this folder. The prior
soundtracks and their credits remain elsewhere in `audio/music/`.
