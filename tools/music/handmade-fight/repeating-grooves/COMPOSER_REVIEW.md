# Composer's arrangement review

This is an AI score-and-arrangement review, based on the programmed notes and
music-theory teaching sources. It is not a listening assessment. The user's
description is interpreted as bars of 4/4: four quarter-note beats per bar.

## What the request describes

The useful idea is **repetition with variation**: establish a small motive,
repeat it long enough to recognize it, answer or alter it, then bring it back.
A bar is the counting unit; a motive is a short recognizable figure; a phrase
groups figures into a larger musical thought.

Open Music Theory's sentence model introduces a two-bar idea, repeats it, then
develops a continuation. This provides a relevant example of a 2 + 2 + 4 shape,
rather than an instruction that every genre must use that form.
[The sentence — Open Music Theory](https://openmusictheory.github.io/sentence.html).

For popular music, Hughes and Lavengood describe four-bar phrases and the
relationship between a statement, its response, a departure and a conclusion.
That makes a good starting point for returning riffs that still move forward.
[Melody and Phrasing — Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/melody-and-phrasing/).

Ableton's introduction to arranging explains how small patterns can combine
into sections of four, eight or sixteen bars.
[Play with song structures — Ableton Learning Music](https://learningmusic.ableton.com/song-structure/song-structure.html).

The specific rules below are an application to this game's instrumental
music, inferred from those principles and the user's feedback. They are not
universal composition rules.

## Review of version 1

The tones and simple layers serve the brief. Each piece has a coherent bass
and chord relationship, a clear rhythmic foundation and a recognizable
two-bar unit. The problem is arrangement scale: the full unit often repeats
for several minutes before its only contrast, a change of pitch centre.

| Piece | Longest planned v1 hold | At its tempo | Main missing contrast |
| --- | ---: | ---: | --- |
| Steel Tread | 128 bars | 3:12 | Both guitars repeat their same rhythm and voicing until the E/A change. |
| Bootheel Loop | 128 bars | 3:33 | Strums, chops and roll all retain their same rhythmic ordering. |
| Neon Motor | 128 bars | 4:00 | Bass, offbeat chords and counter-pulse have no short answer pattern. |
| Breakbeat Circuit | 128 bars | 3:03 | The broken beat is lively within its cell but does not develop across cells. |

Changing the chord alone is not the only solution. The same harmony can
support a second rhythmic placement, a shorter answer, a changed ending or a
different chord inversion. These give recognizable contrast without turning
the piece into an elaborate solo.

## Version 2 arrangement recommendation

Keep the existing instruments, tempos and fifteen-minute lengths. Retain the
additive opening so the parts remain easy to follow. After the opening, give
each groove a small family of related two-bar cells.

A practical sixteen-bar example is:

| Bars | Material | Function |
| --- | --- | --- |
| 1–4 | A, A | Establish the main two-bar figure. |
| 5–6 | B | Answer A with a different rhythmic placement or short pitch figure. |
| 7–8 | C | Small departure, or a shorter version of the main figure. |
| 9–12 | A, A | Recognizable return. |
| 13–14 | B | Bring back the answer. |
| 15–16 | D | Turnaround that leads into the next phrase. |

Other two/four-bar orderings can rotate through the same family. An occasional
alternative eight- or sixteen-bar family prevents the entire fifteen minutes
from becoming one endlessly repeated larger block. Choices should have a
reason—statement, answer, departure or return—rather than random shuffling.

The four-bar maximum concerns an unchanged **audible musical pattern**. It
does not require every instrument to change at once. A steady kick and
backbeat can anchor the music while a bass or guitar figure answers itself.
Subtle hat or ghost-note changes can reinforce phrase boundaries. Save the
larger turnaround for an eight- or sixteen-bar boundary.

### Apply the idea by genre

- **Steel Tread:** A is the low muted chug. B changes the chug's gaps and the
  second guitar's power-chord placements. C uses a short root/fifth or
  root/third answer. D opens the last chord or makes a compact pickup into E.
  The two distorted guitars keep distinct jobs, and the bass supports the
  same harmonic centre.
- **Bootheel Loop:** A is the boom-chuck with the quiet roll. B changes the
  clean-guitar response and swaps a bass root/fifth ordering. C changes the
  strum's upstroke or banjo roll order. D makes a brief V-to-I return. Keep the
  two-step pulse recognizable and the D/G/A harmony coordinated.
- **Neon Motor:** A is the offbeat chord figure. B shifts a stab or leaves a
  gap that the low two-note pulse answers. C fragments the bass rhythm. D is
  a short pickup into the home figure. The four-on-the-floor kick stays
  dependable; the harmony can last longer than any one rhythmic pattern.
- **Breakbeat Circuit:** A states the broken-beat groove. B alters a ghost
  snare or kick pickup and moves the bass answer. C exchanges the clipped
  chord and counter-pulse spaces. D makes a short turnaround. Keep the main
  backbeat and bass pulse clear through the changes.

## Acceptance checks for the revised scores

1. Every planned cell block lasts two or four bars; the final remainder can
   be two bars. Total duration remains 900 seconds at the original tempo.
2. Compare the actual note events, not variant names. A renamed identical
   cell does not count as a pattern change. Ignore velocity-only differences
   when judging substantive rhythmic or motivic contrast.
3. Once pitched instruments enter, at least one audible pitched part changes
   its rhythm, pitches, duration or articulation within every four-bar span.
   Drum accents alone should not disguise an unchanged instrumental stack.
4. Check both one-bar and two-bar event signatures. Four A bars followed by a
   B whose first bar is still A can accidentally create five identical bars.
   The first bar of the response should change when the preceding hold has
   already reached four bars.
5. Related material must return. Each piece needs recognizable A material,
   short answers and phrase-level turnarounds; merely cycling unrelated
   cells is not sufficient.
6. Strong-beat bass notes and guitar/chord voicings must agree. Passing or
   pickup notes should have a local destination. Changes of chord and changes
   of rhythmic cell are separate decisions.
7. Inspect the opening and final partial phrase as well as the central
   modules. The opening should establish the beat; the ending should retain
   a clear homeward resolution rather than stop mid-answer.
8. Validate rendered duration, finite samples, loop joins and encoded peaks.
   These technical checks cannot establish musical quality; listening
   feedback remains necessary.

## Revised-score audit

All four revision-2 specifications passed the source review. Their plans
contain only two- and four-bar segments, each still totals 900 seconds, and
the original tempo, instrument palette and additive entries are preserved.
The original specifications remain in each folder's `song_v1.py`.

The following measurements compare actual note events rather than names.
Velocity-only differences are ignored. The pitched comparison excludes
drums and begins once all intended layers have entered.

| Piece | Planned segments | Largest planned hold | Longest identical audible bar run | Longest identical pitched bar run | Final variant |
| --- | ---: | ---: | ---: | ---: | --- |
| Steel Tread | 225 | 4 bars | 4 bars | 4 bars | E_D |
| Bootheel Loop | 203 | 4 bars | 4 bars | 4 bars | D_D |
| Neon Motor | 180 | 4 bars | 2 bars | 1 bar | Am_D |
| Breakbeat Circuit | 237 | 4 bars | 1 bar | 1 bar | Em_D |

The lower one-bar figures in the electronic pieces do not mean a new idea is
introduced every bar. Their two-bar cells have different first and second
halves, and those complete cells can repeat for a four-bar block.

### Musical findings

- **Steel Tread:** The familiar A chug returns among syncopated B answers,
  more open C hits and a D turnaround. The guitars have six distinct cells
  each, with complementary jobs; this is not merely eight labels for one
  recording. E/A minor power chords and the bass roots/fifths agree. The
  final E_D places the bass and last guitar power chord on E.
- **Bootheel Loop:** The acoustic and clean-guitar gaps trade places, while
  bass and banjo alter their figure. Each guitar has six distinct cells;
  bass and banjo each have twelve. The major thirds, roots and fifths agree
  in D/G/A. A final G–A–D span returns to D in the bass and banjo, providing
  a local IV–V–I conclusion.
- **Neon Motor:** Each bass and chord layer has eight distinct cells, and
  the counter-pulse has four. Inversions preserve the Am/F harmony while
  changed gaps and onset placements produce answers. The low A/C pulse
  uses common chord tones. The final Am_D returns A in bass and pulse.
- **Breakbeat Circuit:** Four drum patterns preserve the main backbeat but
  move pickups and ghost notes. Bass, stabs and counter-pulse change their
  own rhythmic placements, rather than relying on the drummer alone. E/G
  counter tones work over Em/C; the final Em_D returns E in the bass and
  counter-pulse.

The stable extra kick remains a useful anchor in every version. The other
drum material has four genuinely different cells, with clear small changes
in the first bar. Related sixteen-bar phrase orders rotate, and A returns
between their answers and departures. Harmony moves at an eight- or
sixteen-bar scale, independently of the shorter rhythmic changes.

No blocking composition issue was found in the revision-2 scores. The
rendered recordings still require the level, duration and join checks, and
the user remains the listener who can judge whether the resulting musical
changes feel right.
