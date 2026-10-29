# Repeating combat grooves

Four original, fifteen-minute listening examples built from short rhythmic
patterns. Their compositions are editable `SPEC` dictionaries in each
folder's `song.py`.

| Folder | Piece | Tempo | Length | Main layers |
| --- | --- | --- | --- | --- |
| `steel-tread/` | Steel Tread | 160 BPM | 600 bars / 15:00 | Metal drums, extra kick, bass, two distinct distorted guitar parts |
| `bootheel-loop/` | Bootheel Loop | 144 BPM | 540 bars / 15:00 | Country train beat, light extra kick, alternating bass, acoustic strums, clean guitar chops, banjo |
| `neon-motor/` | Neon Motor | 128 BPM | 480 bars / 15:00 | Club beat, extra kick, synth bass and repeating electronic layers |
| `breakbeat-circuit/` | Breakbeat Circuit | 168 BPM | 630 bars / 15:00 | Broken beat, extra kick, synth bass and repeating electronic layers |

## The arrangement rule

The drum bed has one two-bar pattern, repeated throughout the piece. A
complementary bass-drum part enters at bar 2, bass at bar 4, the first
instrument at bar 6 and the second at bar 8. Country adds its quiet banjo
roll at bar 10. Bar numbers start at zero.

The complete groove then stays in place for long stretches. Occasional
variant changes move the pitched parts together to another chord or pedal
tone. The main drums and additional kick retain exactly the same source
pattern through those changes. There are no solo melodies or frequent
one-off fills; the rhythm and accumulated layers are the music.

The renderer plays short cells through the instruments and reuses that
rendered audio to assemble the full length. Repeated cells retain the
instrument's ringing tails at their joins. This avoids rendering fifteen
minutes of native guitar processing for every repeated part.

## Render locally

Use the installed music-studio skill, its Python dependencies and captured
instrument/amp states. The existing FluidSynth and MuseScore General
installation is described in `tools/music/README.md`.

```powershell
python tools/music/handmade-fight/repeating-grooves/render.py --output-root tools/music/out/repeating-grooves

# Select individual examples; omission renders all four.
python tools/music/handmade-fight/repeating-grooves/render.py --slugs steel-tread bootheel-loop --output-root tools/music/out/repeating-grooves
```

`MUSIC_BIN` can point to the existing directory containing
`fluidsynth/fluidsynth.exe` and `MuseScore_General.sf3`. `MUSIC_STUDIO_SKILL`
and `MUSIC_STUDIO_HOME` can override the skill and captured studio locations.
This is useful in a Git worktree, since the local binaries and captures are
not copied into a checkout.

Each render uses a new output run and preserves earlier listening versions.
The renderer prints the MP3 and report paths. Reports record duration,
levels, peaks and the source arrangement; they are measurements rather
than an auditory assessment.

Electronic drum transients are rounded with oversampled soft saturation
before mastering, keeping their peaks from pushing the rest of the groove
down. The two-bar repetition and the layer entry times stay intact.
`render-report.json` records the finished listening versions, hashes and
measurements; the portable MIDI scores are in `../scores/repeating-*.mid`.

## Edit a pattern

`SPEC` contains tempo, total bars, a two-bar cell length, an ordered variant
plan and the instrument tracks. A track declares its entry bar, sound,
playable MIDI range, mix level and cells named `A`, `B` or `C`.

An event is:

```python
[position, length, pitch_or_chord, velocity, articulation]
# Two repeated E power chords, for example:
[0, 1.7, [40, 47], 112, 'mute']
[8, 1.7, [40, 47], 112, 'mute']
```

Positions and lengths use sixteenth notes: one beat is 4, one bar is 16,
and a two-bar cell spans 0–32. Chords are lists of MIDI notes. Fractional
positions let acoustic strums spread across the strings. Native guitar
articulations use `mute` or `sus`; ordinary sampled/synth notes use `None`.
Keep notes inside the declared playable range and cell boundary. Add
harmonic changes to the sparse `plan`, rather than writing out a new lead
line for every bar. Changing one cell changes all its repetitions.

## Instruments and provenance

All notes, riffs, drum patterns and synth voices are original. Metal uses
Shreddage 3 Stratus FREE through the installed Guitar Rig 7 Player heavy
amp. Country uses Ample Guitar M Lite acoustic guitar and Shreddage through
a clean amp. Bass and native drum parts use Cakewalk SI-Bass Guitar and
SI-Drum Kit. Electronic examples use local original synth voices.

The country banjo uses MuseScore General's bank 0, program 105 through
FluidSynth. MuseScore General notices: FluidR3 by Frank Wen (c) 2000–02;
FluidR3Mono by Michael Cowgill (c) 2014–17; adaptation by S. Christian Collins
(c) 2018–19. MIT licence and source:
https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/.

There are no flute parts or neural audio codecs in this workflow. Plugin
binaries, SoundFonts and private captured states are kept outside the
versioned composition sources.
