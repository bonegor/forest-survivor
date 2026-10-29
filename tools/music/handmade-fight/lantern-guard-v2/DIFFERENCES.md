# Lantern Guard v2

- Concert harp replaces the electric piano as the lead instrument.
- New D-to-A leaping signal and syncopated short-note answer form the main hook.
- A second melody uses longer ascending arches; a third uses lower skipping cells.
- Strings alternate sustained bowing, phrase-end answers and short cross-rhythms,
  instead of repeating the old quarter-note accompaniment underneath every theme.
- Bass uses six-note syncopated figures; drums use a fuller eighth-note timekeeper,
  with toms reserved for answers and fills rather than a constant floor-tom figure.
- Sections alternate 16, 24, 32 and 40 bars, with recurring themes changing texture.
  The full performance remains 160 BPM and exactly 15:00.

All themes and arrangements are original. The prior Lantern Guard source is preserved.

## Render

`python tools/music/handmade-fight/lantern-guard-v2/render.py` creates a fresh
run under the ignored `tools/music/out/lantern-v2/` folder. The completed MP3,
WAV and MIDI are versioned beside the first Lantern Guard in Music Studio's
`Finished/Forest Survivor - long battle music/` folder.

The concert harp uses FreePats ConcertHarp-20200702.sf2, bank 0/program 0,
assembled by Roberto from the CC0 Versilian Community Sample Library.
Performer: K. Smith. Sources: https://freepats.zenvoid.org/ and
https://vis.versilstudios.com/vcsl.html. SoundFont and synthesizer binaries are
installed local dependencies and are not included in the source folder.
