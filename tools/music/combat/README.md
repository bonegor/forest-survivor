# Thorns and Iron

Original dark-fantasy combat score for Forest Survivor, 28 October 2026.

| Cue | Tempo | Bars | Intended use |
| --- | --- | --- | --- |
| Thorn Hunt | 176 | 64 | Fast forest pursuit; galloping metal rhythm and folk whistle |
| Bone Procession | 168 | 64 | Crypt combat; angular E Phrygian riffs and guitar responses |
| Crown of Cinders | 192 | 64 | Boss combat; harmonic-minor guitar and double kicks |
| Oath at the Gate | 144 | 32 | Martial title/camp theme; plucked guitar and whistle |
| Embers and Iron | 112 | 16 | Short, restrained aftermath theme with low toms |

Combat form, in one-based bars: pursuit 1–8, rally 9–16, charge 17–24,
answer 25–32, siege 33–40, rally return 41–48, charge return 49–56,
turnaround 57–64. The drums play from the first bar; eight-bar fills link the sections.
Open chord refrains alternate with muted low-E pedal riffs. The final phrase turns
back to the opening instead of fading out. No vocals, count-ins or imported melodies.

## Source and rebuilding

`compose.py` contains every note and arrangement. `scores/` contains portable MIDI and
JSON exports, including notes, instrument names, gains, sections and exact loop lengths.
`report.json` measures the actual decoded files shipped in `public/audio/music/`.

Requires Python 3.12, numpy, scipy, dawdreamer, lameenc, ffmpeg with libvorbis, and the
locally installed Music Studio skill. Set `MUSIC_STUDIO_SKILL` to its directory if it is
not at `~/.agents/skills/music-studio`. Set `MUSIC_STUDIO_HOME` to the configured studio
if it is not at `~/Music/MusicStudio`. The installed guitar, bass and drum instruments
and captured guitar/amp states must already be available. Plugin states are read-only.

```powershell
python tools/music/combat/build.py                 # all five cues
python tools/music/combat/build.py thorn-hunt      # one cue
python tools/music/combat/build.py --mix-only      # reuse stems after mix changes
```

Intermediate stems, private local config, versioned full-resolution WAVs and MP3 previews
are kept in ignored `tools/music/out/combat/`. The finished Ogg files and editable scores
are written only after each cue passes checks. Old full-resolution masters are preserved.

Each song is rendered beyond its last bar. Release tails are wrapped into its opening;
a 3 ms endpoint correction removes discontinuities without dropping a beat. Mastering
targets -16 LUFS (-17 for aftermath), with a circular look-ahead envelope and a -2 dBTP
pre-encode ceiling. The encoded Ogg is decoded again to check exact sample count,
true peak below -1 dBTP, absence of silent seconds, and seam step against normal sample
differences. Matching levels leave combat effects audible through the existing music bus.

Checks establish technical playback quality, not musical taste. Levels and balance were
measured; the renders have not been listened to by the assistant.
