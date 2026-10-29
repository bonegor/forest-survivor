# Spark Rush — fifteen-minute arrangement

156 BPM, D Dorian, exactly 585 bars / 900 seconds. The original approved
Spark Rush hook, offbeat bass figure, chord stabs and four-on-the-floor beat
return through eighteen developing chapters. New bass answers, low pedal
passages, sparse rhythmic bridges and two large rises connect those returns.

`voices.py` preserves the approved short version's oscillator, envelope,
percussion and filtering recipes. `mix_recipe.py` preserves its peak shaping
and instrument gains. `render_stems.py` renders one stem at a time so the
fifteen-minute arrangement does not retain all five tracks in memory.

```powershell
python tools/music/handmade-fight/spark-rush-long/render.py
```

The full command creates a fresh run, renders the calibrated stems, streams
the master, and checks the actual MP3 for exact duration and true peak. Finished
MP3, WAV and MIDI copies are saved in Music Studio's long battle music folder.

To export the score or render only the stems:

```powershell
python tools/music/handmade-fight/spark-rush-long/song.py output/spark-long-score
python tools/music/handmade-fight/spark-rush-long/render_stems.py --output tools/music/out/spark-rush-long/run-v1
```

The output's `mix-config.json` describes the calibrated stems. Final mastering
should stream them through the long-form finishing helper with `glue=False`,
then verify the encoded MP3's exact 900-second decoded duration and true peak.
No neural generation, GUI operation or global sound changes are involved.
