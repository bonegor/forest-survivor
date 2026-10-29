# Handmade fight music auditions

Three original instrumental arrangements for testing Forest Survivor's combat
music. Each starts with a beat, develops contrasting sections, and returns to a
recognisable hook. These are local auditions; this folder does not change the
live game's music or publish anything.

The approved Spark Rush v1, Clockwork Charge v2 and Rally Run heavy-guitars v1
MP3s are preserved in `public/audio/music/handmade/`, with exact-copy hashes and
credits. The active game playlist is configured separately.

| Source | Tempo / harmony | Drum and bass foundation | Instruments / approximate length |
| --- | --- | --- | --- |
| `rock/song.py` — Rally Run | 168 BPM, D major; I–V–vi–IV, IV–V lifts | Full-time kick/snare backbeat, eighth-note hats/ride, root/fifth bass | Crunchy rhythm guitars and a lower octave guitar hook; 2:11 plus tail |
| `metal/song.py` — Rally Run, heavy guitars | Same notes, 168 BPM and D major | Same drum and bass performance as Rally Run | Both guitar parts through the Fire Seeker metal amp at gain 7, with matched cabinet; 2:13 including tail |
| `electronic/song.py` — Spark Rush | 156 BPM, D Dorian | Four-on-the-floor kick, snare/clap, live hats and syncopated synth bass | Pulsing chords and a short plucked synth hook; about 2:04 |
| `march/song.py` — Clockwork Charge | 160 BPM, A minor with relative-major lifts and an E-major dominant | Kick, snare and floor-tom figures with root/fifth bass | Short string strokes and an electric-piano melody; 2:06 plus tail |

All melodies and arrangements are original. There is no flute or whistle part.
The march uses classical harmony and phrase structure without copying a
classical recording or melody. The electronic instruments use lightweight
oscillators; the acoustic instrument parts use the installed plugins. No neural
codec, model inference, or downloads are involved.

## Render locally

From the repository root, using the configured Python installation:

```powershell
python tools/music/handmade-fight/build.py
python tools/music/handmade-fight/build.py rock
python tools/music/handmade-fight/build.py metal
python tools/music/handmade-fight/build.py march electronic
```

Each invocation snapshots the selected source files into a fresh
`tools/music/out/handmade-fight/run-vN/` folder. That output location is ignored by
Git. Existing runs and finished audio are preserved. Rock, metal and march use the
Music Studio skill's normal export, instrument rendering, measurement and mix
pipeline. Electronic calls its own `render_song.py --render` and retains its
stems and measurements in a nested `electronic/run-vN/` folder.

`metal` selects the separate heavy-guitar Rally Run variation. The default still
builds the original three arrangements. Its `setup_amp.py` copies the existing
metal rhythm preset into the run's isolated studio and sets Fire Seeker gain to
7; the person's captured amp settings remain unchanged. Both guitar tracks are
double tracked through this amp. Drum and bass notes, guitar notes, tempo and
song sections match the rock source.

Finished WAV/MP3 files for rock and march are in each track's `export/out/`;
electronic's WAV/MP3 files are in its nested render folder. MIDI and note JSON
are exported alongside each arrangement. The checked-in `scores/` files are
editable snapshots of the current source arrangements, not audio recordings.

The helper copies the person's existing sound configuration, referencing guitar
captures by absolute path. The march creates new string and piano plugin
states, and metal creates a separate high-gain amp state, inside the run's own
studio folders. Local `Finished/` copies also remain in
the run, so another fresh render cannot replace earlier finished tracks.

## Local prerequisites

- Python with `numpy`, `scipy`, `dawdreamer` and `lameenc`; `ffmpeg` available for
  the electronic encoded-audio check.
- The `music-studio` skill, normally at
  `%USERPROFILE%/.agents/skills/music-studio`, and an existing configured studio
  at `%USERPROFILE%/Music/MusicStudio`.
- SI-Drum Kit and SI-Bass Guitar for the rock and march; SI-String Section and
  SI-Electric Piano for the march.
- Kontakt with the captured Shreddage guitar and Guitar Rig rhythm amp for the
  rock arrangement, and the captured `metal_rhythm` Fire Seeker amp for the metal
  variant. Captures remain on this machine and are not committed.

Use `--skill PATH` and `--studio PATH` when those locations differ. The march's
SI plugin paths are specified in `setup_local.py`; update them if the installed
instruments are elsewhere. No audio or binary plugin states belong in this
source folder.

Targets are around -13 LUFS, with peak and activity measurements saved by the
rendering pipeline. Measurements establish signal levels and technical checks;
they do not establish musical quality or suitability. I measured levels and
balance; I did not listen. The user's listening feedback is the final check.

## Fifteen-minute compositions

`clockwork-long/song.py` develops Clockwork Charge into 600 bars at 160 BPM,
preserving its original hooks across 25 chapters with new pursuit themes,
builds, bridges and varied returns. `lantern-guard/song.py` is a new composition
using the same instruments, with D-minor/F-major themes and 18 developing
chapters between its introduction and final cadence. Both finish at 15:00.

```powershell
python tools/music/handmade-fight/render_suites.py
```

The command snapshots both scores and creates the same isolated string and
keyboard sounds used for the approved Clockwork mix. It renders four stems per
piece in a new `tools/music/out/clockwork-suite/run-vN/` folder. The finishing
stage streams the mix in small blocks, applies restrained compression and
peak limiting, and targets approximately -13 LUFS. It decodes each final MP3 to
check finite samples, exactly 39,690,000 stereo frames at 44.1 kHz, measured
true peak and loudness. A brief final fade stays inside the 900-second duration.

To separate instrument rendering from mixing:

```powershell
python tools/music/handmade-fight/render_suites.py --render-only
python tools/music/handmade-fight/finish_suites.py tools/music/out/clockwork-suite/run-v1
```

Finished MP3/WAV files and editable MIDI copies are saved in the person's Music
Studio `Finished/Forest Survivor - long battle music/` folder. The new long
audio files remain listening versions until selected for the game. These
scripts perform music work only; they do not schedule system shutdown.

## Further listening versions

`lantern-guard-v2/` keeps the fifteen-minute length but replaces the keyboard
with a sampled concert harp. Three new themes, sustained string answers,
syncopated bass figures and changing section lengths give it a separate
musical identity. The original Lantern Guard remains in `lantern-guard/`.

`spark-rush-long/` expands the approved electronic cue to 585 bars at 156 BPM,
exactly fifteen minutes. The original hook and sounds return through new
answer phrases, pedal passages, bass variations and two larger builds.

```powershell
python tools/music/handmade-fight/lantern-guard-v2/render.py
python tools/music/handmade-fight/spark-rush-long/render.py
```

Each command uses a new output run and saves a checked MP3, WAV and MIDI in the
long battle music listening folder. The concert-harp source and CC0 credits
are documented in `lantern-guard-v2/DIFFERENCES.md`; the electronic voice and
peak-shaping recipes are preserved in `spark-rush-long/`. The electronic mix
sets `master.glue=False` to preserve the punch of its already-shaped drums.

`dusty-trail/` adds Dusty Trail Stampede, an original 540-bar country piece at
144 BPM, exactly fifteen minutes. An alternating bass and train beat support
acoustic rhythm guitar, clean electric guitar, banjo and piano, with developing
themes and contrasting sections. Its editable composition is `song.py`;
the rendered recording is offered alongside the other combat selections.

`repeating-grooves/` follows the drum-first, additive pattern brief: four
fifteen-minute listening versions in metal, country, electronic and breakbeat
styles. Revision 2 swaps related patterns after two or four bars, grouping
returning statements, answers and turnarounds into recognizable sixteen-bar
phrases. A steady rhythmic backbone supports varied drum accents and changing
bass, guitar or synth figures. The additive layers, instrument palette,
tempos and fifteen-minute lengths remain.

The [arrangement README](repeating-grooves/README.md) explains the editable
patterns and the shared render command. Native cells are rendered in batches
with silent guards and one plugin load per track, then reused according to the
phrase plan. The [composer review](repeating-grooves/COMPOSER_REVIEW.md) links
the educational sources and records the actual-note repetition audit.

Each piece's `song_v1.py`, `repeating-grooves/render-report-v1.json`, original
portable MIDI and v1 listening MP3 remain preserved. New recordings receive
incrementing version names. `repeating-grooves/render-report.json` records the
current listening versions and measurements; revision-2 portable MIDI files
are `scores/repeating-*-v2.mid`.
