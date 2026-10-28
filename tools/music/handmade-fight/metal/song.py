"""Rally Run — heavy-guitar variant, 168 BPM, D major.

92 bars. Full beat immediately; no flute, whistle, high solo, or neural renderer.
Theory: I–V–vi–IV family, IV–V lifts, relative-minor bridge, and a V–I finish.
The octave hook uses chord tones on strong beats and short diatonic passing notes.
"""
import os
import sys
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import *

S = Song('Rally Run - heavy guitars', bpm=168, seed=20261028, target_lufs=-13)
RG = S.add_track('Rhythm Guitar', 'rally_heavy', 'rhythm',
                 keyswitches=SHREDDAGE_KS, prange=SHREDDAGE_RANGE)
# Both parts use the Fire Seeker metal amp, high gain, with matched cabinet.
HK = S.add_track('Octave Hook', 'rally_heavy', 'lead',
                 keyswitches=SHREDDAGE_KS, prange=SHREDDAGE_RANGE)
BS = S.add_track('Driving Bass', 'bass', 'bass', prange=BASS_RANGE)
DR = S.add_track('Drum Kit', 'drums', 'drums')
# Match the guitar recordings to the original Rally Run's levels after the amp change.
S.mix = {RG: 1.9, HK: -1.4, BS: 2.5, DR: 2.0}
S.master['tail_sec'] = 2.0

FORM = [
    (0, 4, 'opening hook'), (4, 20, 'driving groove'),
    (20, 28, 'rising lift'), (28, 44, 'anthem hook'),
    (44, 52, 'rhythmic bridge'), (52, 68, 'driving groove 2'),
    (68, 76, 'rising lift 2'), (76, 88, 'final anthem'),
    (88, 92, 'cadence'),
]
for start, end, label in FORM:
    S.section(start, end, label)

GROOVE = ['D', 'D', 'G', 'A', 'B', 'G', 'D', 'A']
LIFT = ['G', 'G', 'A', 'A', 'B', 'G', 'A', 'A']
HOOK = ['D', 'A', 'B', 'G', 'D', 'A', 'G', 'A']
BRIDGE = ['B', 'B', 'G', 'G', 'D', 'D', 'A', 'A']
MELODY = [
    [(0, 3, 62), (3, 1, 64), (4, 4, 66), (8, 3, 69), (11, 1, 66), (12, 2, 64)],
    [(0, 4, 61), (4, 2, 64), (6, 2, 66), (8, 6, 69)],
    [(0, 3, 62), (3, 1, 64), (4, 4, 66), (8, 3, 71), (11, 1, 69), (12, 2, 66)],
    [(0, 6, 67), (6, 2, 66), (8, 4, 62)],
    [(0, 3, 66), (3, 1, 67), (4, 4, 69), (8, 3, 66), (11, 1, 64), (12, 2, 62)],
    [(0, 4, 64), (4, 4, 61), (8, 2, 64), (10, 2, 66), (12, 2, 69)],
    [(0, 4, 67), (4, 4, 62), (8, 4, 59), (12, 2, 62)],
    [(0, 6, 64), (6, 2, 62), (8, 4, 61), (12, 2, 57)],
]


def bass_bar(bar, chord, next_chord, bridge=False):
    root = BASS[chord]
    # Eighth-note engine, root and fifth, with the next root approached weakly.
    notes = [root, root, root+7, root, root, root+12, root+7, root]
    if bar % 4 == 3:
        target = BASS[next_chord]
        candidates = scale_notes('D', 'major', 28, 55)
        notes[-1] = min(candidates, key=lambda m: abs(m-target)+(.1 if m == target else 0))
    for i, pitch in enumerate(notes):
        S.play(BS, bar, i*2, 1.9, pitch,
               108 if i % 2 == 0 else 97, gate=.88, hum_ms=2)


def rhythm_bar(bar, chord, section):
    bright = section in ('opening hook', 'anthem hook', 'final anthem', 'rising lift', 'rising lift 2')
    if section == 'rhythmic bridge':
        # Keep the full-time drummer; guitar makes a 3–3–2 response around it.
        for pos, length in ((0, 2), (3, 2), (6, 2), (8, 2), (11, 2), (14, 2)):
            S.play(RG, bar, pos, length, power(chord, octave=False),
                   111 if pos in (0, 8) else 103, art='mute', hum_ms=2)
    else:
        for i, pos in enumerate(range(0, 16, 2)):
            # The chorus opens the same chords; the verses breathe between hits.
            art = 'sus' if bright or i in (0, 4) else 'mute'
            S.play(RG, bar, pos, 1.85, power(chord, octave=bright),
                   111 if i in (0, 4) else 101, art=art, hum_ms=2, gate=.88)


def octave_hook(bar, phrase_bar, final=False):
    for pos, length, top in MELODY[phrase_bar % 8]:
        if final and phrase_bar % 8 == 7 and pos >= 8:
            top = 61 if pos == 8 else 64
        S.play(HK, bar, pos, length*.92, (top-12, top),
               103 if pos in (0, 8) else 97, art='sus', hum_ms=2, gate=.9)


for start, end, section in FORM[:-1]:
    changes = (HOOK if section in ('opening hook', 'anthem hook', 'final anthem')
               else LIFT if section.startswith('rising lift')
               else BRIDGE if section == 'rhythmic bridge' else GROOVE)
    for bar in range(start, end):
        i = bar-start
        chord, next_chord = changes[i % len(changes)], changes[(i+1) % len(changes)]
        rhythm_bar(bar, chord, section)
        bass_bar(bar, chord, next_chord, section == 'rhythmic bridge')
        if section in ('opening hook', 'anthem hook', 'final anthem'):
            octave_hook(bar, i, final=section == 'final anthem')
        elif section.startswith('rising lift') and i >= 4:
            # A short lower-register answer announces the returning hook.
            for pos, top in ((0, 62 if chord != 'A' else 61), (6, 64), (12, 66 if chord != 'A' else 64)):
                S.play(HK, bar, pos, 2.5, (top-12, top), 96, art='sus', hum_ms=2)
        elif section == 'driving groove 2' and i % 8 >= 6:
            octave_hook(bar, i % 8)

        chorus = section in ('opening hook', 'anthem hook', 'final anthem')
        cymbal = 'ride' if chorus else 'ohh' if section.startswith('rising lift') else 'chh'
        # Snare always on 2 and 4. No half-time interlude.
        kicks = (0, 2, 6, 8, 10, 14) if chorus else (0, 6, 8, 10)
        if section == 'rhythmic bridge':
            kicks = (0, 3, 6, 8, 11, 14)
        beat_rock(S, DR, bar, cymbal=cymbal, kicks=kicks,
                  crash=(i % 4 == 0), cym_vel=(91, 72))
        # Quieter sixteenth pickups provide momentum without a machine-gun wall.
        if bar % 2 == 1 and not chorus:
            for pos in (7, 15):
                drum(S, DR, bar, pos, 'chh', 55, 2)
        if i % 8 == 7 or bar == end-1:
            fill(S, DR, bar, 12, kind='toms' if i % 16 == 15 else 'snare', base_vel=100)
            # Fills retain the kick pulse underneath the moving snare/toms.
            for pos in (12, 14):
                drum(S, DR, bar, pos, 'kick', 111, 2)

# Four-bar cadence: IV–V–I–I, maintaining momentum through the last resolution.
for j, chord in enumerate(['G', 'A', 'D', 'D']):
    bar = 88+j
    if j < 3:
        rhythm_bar(bar, chord, 'final anthem')
        bass_bar(bar, chord, ['A', 'D', 'D'][j])
        beat_rock(S, DR, bar, cymbal='ride', kicks=(0, 6, 8, 14), crash=j in (0, 2))
        if j == 1:
            fill(S, DR, bar, 12, 'toms', base_vel=104)
    else:
        S.play(RG, bar, 0, 16, power('D'), 116, art='sus', hum_ms=0, gate=.99)
        S.play(HK, bar, 0, 16, (50, 62), 102, art='sus', hum_ms=0, gate=.99)
        S.play(BS, bar, 0, 16, BASS['D'], 112, hum_ms=0, gate=.99)
        drum(S, DR, bar, 0, 'kick', 119, 0)
        drum(S, DR, bar, 0, 'crash', 114, 0)

if __name__ == '__main__':
    S.export(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).with_name('export'))
