# Curated music credits

Imported for Forest Survivor on 13 November 2026. These recordings are offered
under **CC0 1.0 Universal** on their creators' linked source pages. Commercial
use and modification are allowed without mandatory attribution; the authors
are credited here with thanks. The official legal text is included in
[`LICENSE-CC0-1.0.txt`](LICENSE-CC0-1.0.txt).

| Recording | Creator | Source and licence evidence |
| --- | --- | --- |
| Boss Battle #2 — Symphonic Metal | nene | [OpenGameArt](https://opengameart.org/content/boss-battle-2-symphonic-metal) |
| Epic Boss Battle | Juhani Junkala / SubspaceAudio | [OpenGameArt](https://opengameart.org/node/55649) |
| Boss Battle #6 Metal, V2 | nene | [OpenGameArt](https://opengameart.org/content/boss-battle-6-metal) |
| Battle Theme A | cynicmusic — [cynicmusic.com](https://cynicmusic.com), [pixelsphere.org](https://pixelsphere.org) | [OpenGameArt](https://opengameart.org/content/battle-theme-a) |
| Fairy Battles | MintoDog | [OpenGameArt](https://opengameart.org/content/fairy-battles) |
| Style of Harp | Umplix | [OpenGameArt](https://opengameart.org/content/style-of-harp) |
| A Small Fire Will Do | Cal McEachern / Trex0n | [OpenGameArt](https://opengameart.org/content/a-small-fire-will-do-calming-loop) |

## Game edits

Combat recordings use stereo Ogg Vorbis at 44.1 kHz and nominal 160 kbps, with
static gain targeting -16 LUFS. Their original musical duration is retained,
apart from the documented loop-seam edits below. They are not expanded into
fifteen-minute files. The browser repeats each complete Ogg natively.

- **Boss Battle #2:** use the actual 26.483-second loop, supplied inside the ZIP
  as `boss_battle_#2_metal_opening.wav`. The creator explicitly warns that the
  two ZIP filenames are reversed. The 39.724-second `loop.wav` is the opening
  and is not used. The actual loop's exact sample length is preserved.
- **Epic Boss Battle** and **Fairy Battles:** preserve the creators' authored
  loop boundaries and exact sample lengths; only gain and encoding change.
- **Boss Battle #6:** uses V2. Remove the trailing near-silence and overlap the
  ending with the opening using a 120 ms equal-power circular crossfade.
- **Battle Theme A:** remove leading/trailing near-silence and overlap its
  closing decay with the opening using a three-second equal-power circular
  crossfade. The edit is 92.710 seconds long.
- **Style of Harp:** static gain targeting -20 LUFS; remove 0.30 seconds of
  leading silence and apply 20 ms entrance / 100 ms exit fades. This is a
  natural full-piece repeat, not a claimed seamless musical loop.
- **A Small Fire Will Do:** static gain targeting -20 LUFS; preserve the
  complete creator-authored 64-second acoustic guitar loop.

The `previews/` files are ten-second midpoint excerpts with short entrance and
exit fades, carrying the same credits and licence as the complete recordings.
They use the processed recordings' gain, not separate loudness normalization.

[`manifest.json`](manifest.json) records combat source/download URLs, source
and output hashes, exact sample counts, measured encoded levels, processing
and preview positions. [`menu-sources.json`](menu-sources.json) records the
equivalent provenance and measurements for both menu recordings. Media was
decoded and measured for technical validation; this does not claim an
auditory listening review.
