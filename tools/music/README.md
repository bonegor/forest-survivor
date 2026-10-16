# Menu music: compose, build, render

Guitar loops for the title screen and menus. Each tune is written as data, built into MIDI, then
rendered into a seamless Ogg Vorbis loop in a few flavours for the audition page
(`public/debug/music/`, which reads `public/audio/music/menu/candidates.json`).

```
node tools/music/build-midi.mjs [id...]      # songs/<id>.mjs -> out/<id>.mid + out/songs.json
node tools/music/render.mjs [id...]          # out/<id>.mid -> public/audio/music/menu/<id>-<renderer>.ogg
     [--only=sf,sf-steel,ks] [--keep-wav] [--q=5]
node tools/music/render.mjs --test           # the whole pipeline on a built-in test tune, into out/test/
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
    the game, capped at 1 on the audition page) makes up the difference. Then Ogg Vorbis at q5.
  - Checks for every file: loudness and true peak before and after, exact sample count, the seam
    (sample step and curvature across it against the file's own distribution, before and after
    encoding), RMS per 2 s window and channel, note onsets against the MIDI, octave bands. The
    MIDI is checked for guitar range, more than six notes at once, re-struck notes, and notes
    still held when the loop restarts. Full numbers go to `out/render/report.json`.

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
