"""Clockwork Charge: original drum-led neoclassical action march.

160 BPM, 4/4; A minor with relative-major lifts and an E-major dominant.
84 bars (126 seconds before the short instrument tail). Four real instruments:
SI drums, SI bass, string section and electric piano. No neural generation.
"""
import os
import sys
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import Song, BASS_RANGE, drum, fill

S = Song('Clockwork Charge', bpm=160, seed=8828, target_lufs=-13)
ST = S.add_track('Clockwork Strings', 'battle_strings', role='rhythm', prange=(45, 76))
KY = S.add_track('Piano Hook', 'battle_keys', role='keys', prange=(45, 76))
BS = S.add_track('Deep Bass', 'bass', role='bass', prange=BASS_RANGE)
DR = S.add_track('March Drums', 'drums', role='drums')
S.mix = {ST: 1.0, KY: -1.5, BS: 1.0, DR: 0.0}
S.master['tail_sec'] = 2.2

# Inversions keep most inner voices in place while bass roots establish harmony.
CHORDS = {
    'Am': ([57, 60, 64], 33), 'F': ([57, 60, 65], 29),
    'Dm': ([57, 62, 65], 38), 'E': ([56, 59, 64], 28),
    'G': ([55, 59, 62], 31), 'C': ([55, 60, 64], 36),
    'Bm7b5': ([57, 59, 62, 65], 35), 'A': ([57, 61, 64], 33),
}

# Four-bar question and four-bar answer: chord tones occupy the strong beats;
# scalar neighbours occur on weaker eighths and resolve inside each phrase.
A_CHANGES = ['Am', 'F', 'Dm', 'E', 'Am', 'G', 'F', 'E']
A_HOOK = [
    [(0, 2, 64), (2, 2, 64), (4, 3, 69), (7, 1, 67), (8, 4, 64), (12, 2, 60), (14, 2, 62)],
    [(0, 3, 65), (3, 1, 64), (4, 4, 60), (8, 2, 57), (10, 2, 60), (12, 4, 65)],
    [(0, 2, 65), (2, 2, 64), (4, 4, 62), (8, 3, 69), (11, 1, 67), (12, 4, 65)],
    [(0, 4, 64), (4, 2, 62), (6, 2, 59), (8, 4, 68), (12, 2, 71), (14, 2, 68)],
    [(0, 2, 69), (2, 2, 67), (4, 4, 64), (8, 2, 60), (10, 2, 62), (12, 4, 64)],
    [(0, 4, 67), (4, 2, 65), (6, 2, 64), (8, 4, 62), (12, 2, 59), (14, 2, 62)],
    [(0, 4, 65), (4, 2, 64), (6, 2, 62), (8, 4, 60), (12, 4, 57)],
    [(0, 4, 59), (4, 4, 64), (8, 2, 68), (10, 2, 71), (12, 3, 68)],
]
B_CHANGES = ['C', 'G', 'Am', 'F', 'C', 'Dm', 'F', 'E']
B_HOOK = [
    [(0, 4, 67), (4, 2, 67), (6, 2, 69), (8, 4, 72), (12, 2, 71), (14, 2, 69)],
    [(0, 4, 71), (4, 2, 69), (6, 2, 67), (8, 6, 62), (14, 2, 67)],
    [(0, 2, 69), (2, 2, 71), (4, 4, 72), (8, 4, 76), (12, 2, 74), (14, 2, 72)],
    [(0, 4, 72), (4, 4, 69), (8, 4, 65), (12, 2, 64), (14, 2, 65)],
    [(0, 4, 67), (4, 2, 64), (6, 2, 67), (8, 4, 72), (12, 4, 67)],
    [(0, 4, 69), (4, 2, 67), (6, 2, 65), (8, 4, 62), (12, 4, 65)],
    [(0, 4, 69), (4, 2, 67), (6, 2, 65), (8, 4, 60), (12, 4, 65)],
    [(0, 4, 64), (4, 2, 62), (6, 2, 59), (8, 4, 68), (12, 4, 71)],
]

def foundation(bar, chord, *, lift=False, sparse=False, turn=False):
    voices, root = CHORDS[chord]
    # String strokes alternate roots/fifths with inner-voice answers rather than
    # following the piano melody in constant parallel motion.
    low_root = root + 12
    if low_root < 45:
        low_root += 12
    pulse = [(0, [low_root, voices[0]]), (4, voices[1:]),
             (8, [low_root+7, voices[0]]), (12, voices[1:])]
    if sparse:
        pulse = [(0, [low_root, voices[0]]), (8, voices)]
    for p, notes in pulse:
        S.play(ST, bar, p, 3.6 if not sparse else 6, notes,
               91 if p in (0, 8) else 80, gate=.86, hum_ms=2)
    if lift:
        for p in (2, 6, 10, 14):
            S.play(ST, bar, p, 1.4, voices[-1], 70, gate=.8, hum_ms=2)
    # Low bass anchors the kick. One-bar root/fifth/octave figures provide motion
    # without competing with the tune; last eighth prepares the next downbeat.
    pattern = [root, root, root+7, root, root+12, root, root+7, root]
    if turn:
        pattern[-1] = root+7
    for j, pitch in enumerate(pattern):
        if sparse and j in (1, 3, 5, 7):
            continue
        S.play(BS, bar, j*2, 1.85 if not sparse else 3.5, pitch,
               108 if j in (0, 4) else 96, gate=.9, hum_ms=2)
    # A soft two-note keyboard answer sits below the hook during the lift.
    if lift:
        lower = lambda m: m-12 if m-12 >= 45 else m
        S.play(KY, bar, 6, 1.6, [lower(voices[0]), lower(voices[1])], 66, hum_ms=2)
        S.play(KY, bar, 14, 1.6, [lower(voices[1]), lower(voices[-1])], 64, hum_ms=2)


def hook(bar, phrase, *, varied=False, strong=False):
    for i, (p, length, pitch) in enumerate(phrase):
        # Repeat the recognisable phrase but change its answer on the return.
        if varied and p == 14 and pitch not in (68, 71):
            natural_minor = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76]
            pitch = max((m for m in natural_minor if m < pitch), default=57)
        S.play(KY, bar, p, length, pitch, (105 if strong else 98) - (4 if i % 2 else 0),
               gate=.86, hum_ms=2)


sections = [
    (0, 4, 'immediate march'), (4, 12, 'A - clockwork hook'),
    (12, 20, 'A - answering variation'), (20, 28, 'B - major lift'),
    (28, 36, 'A - return'), (36, 44, 'rhythmic counterpoint'),
    (44, 52, 'circle build'), (52, 60, 'B - full lift'),
    (60, 68, 'B - answering lift'), (68, 76, 'A - final charge'),
    (76, 80, 'cadential run'), (80, 84, 'major final cadence'),
]
for a, b, name in sections:
    S.section(a, b, name)

for b, chord in enumerate(['Am', 'F', 'Dm', 'E']):
    foundation(b, chord)
    # Announce the rhythmic motif immediately rather than spending an intro waiting.
    hook(b, A_HOOK[b], strong=b == 0)

for start, changes, phrases, varied, lift in [
    (4, A_CHANGES, A_HOOK, False, False),
    (12, A_CHANGES, A_HOOK, True, False),
    (20, B_CHANGES, B_HOOK, False, True),
    (28, A_CHANGES, A_HOOK, True, False),
    (52, B_CHANGES, B_HOOK, False, True),
    (60, B_CHANGES, B_HOOK, True, True),
    (68, A_CHANGES, A_HOOK, False, True),
]:
    for j, (chord, phrase) in enumerate(zip(changes, phrases)):
        foundation(start+j, chord, lift=lift, turn=j % 4 == 3)
        hook(start+j, phrase, varied=varied, strong=lift)

# The bridge reduces harmony density while keeping kick/snare/bass in motion.
# A two-beat motif moves down the sequence against a contrary rising bass voice.
for j, chord in enumerate(['Am', 'Dm', 'G', 'C', 'F', 'Bm7b5', 'E', 'E']):
    bar = 36+j
    voices, root = CHORDS[chord]
    foundation(bar, chord, sparse=True)
    top = voices[-1]
    neighbour = min(m for m in [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76] if m > top)
    phrase = [(0, 2, top+7 if top+7 <= 76 else top), (2, 2, neighbour),
              (4, 4, top), (8, 2, voices[1]), (10, 2, voices[0]), (12, 3, top)]
    # Use only chord tones for the quick diminished-bar answer.
    if chord == 'Bm7b5':
        phrase = [(0, 2, 65), (2, 2, 62), (4, 4, 59), (8, 2, 62), (10, 2, 65), (12, 3, 71)]
    hook(bar, phrase)

for j, chord in enumerate(['Dm', 'G', 'C', 'F', 'Dm', 'Bm7b5', 'E', 'E']):
    bar = 44+j
    foundation(bar, chord, lift=j >= 4)
    v = CHORDS[chord][0]
    line = [v[0], v[1], v[-1], v[1], v[-1], v[1], v[0], v[-1]]
    for k, pitch in enumerate(line):
        S.play(KY, bar, k*2, 1.8, pitch+12 if pitch+12 <= 76 else pitch,
               83+j*2, gate=.84, hum_ms=2)

for j, chord in enumerate(['Dm', 'Am', 'F', 'E']):
    bar = 76+j
    foundation(bar, chord, lift=True)
    hook(bar, A_HOOK[[2, 0, 6, 7][j]], strong=True)

for j, chord in enumerate(['F', 'Dm', 'E', 'A']):
    bar = 80+j
    if j < 3:
        foundation(bar, chord, lift=True)
        hook(bar, B_HOOK[(j+5) % 8], strong=True)
    else:
        S.play(ST, bar, 0, 16, [45, 52, 57, 61, 64], 104, gate=1, hum_ms=0)
        S.play(KY, bar, 0, 15, [57, 61, 64, 69], 110, gate=.95, hum_ms=0)
        S.play(BS, bar, 0, 15, 33, 112, gate=.95, hum_ms=0)

for bar in range(84):
    if bar == 83:
        drum(S, DR, bar, 0, 'kick', 122)
        drum(S, DR, bar, 0, 'crash', 114)
        drum(S, DR, bar, 0, 'tom_floor', 104)
        continue
    lift = 20 <= bar < 28 or 52 <= bar < 76 or bar >= 80
    bridge = 36 <= bar < 44
    # Kick, snare and floor tom form the foundation; hats are a light timekeeper.
    kicks = (0, 6, 8, 14) if not bridge else (0, 8, 10)
    for p in kicks:
        drum(S, DR, bar, p, 'kick', 118 if p in (0, 8) else 108, 2)
    for p in (4, 12):
        drum(S, DR, bar, p, 'snare', 112 if lift else 107, 2)
    for p in (2, 6, 10, 14):
        drum(S, DR, bar, p, 'chh', 64 if p % 4 else 72, 2)
    for p in (0, 3, 8, 11) if not lift else (2, 6, 10, 14):
        drum(S, DR, bar, p, 'tom_floor', 82 if p in (0, 8) else 70, 2)
    if lift:
        for p in (0, 8):
            drum(S, DR, bar, p, 'ride', 82, 2)
    if bar % 8 == 0 or bar in (4, 20, 28, 36, 44, 52, 68, 80):
        drum(S, DR, bar, 0, 'crash', 106, 2)
    if bar % 4 == 3:
        # Fills occupy only the last beat; the kick on 1 remains the next anchor.
        fill(S, DR, bar, 12, kind='toms' if bar % 8 == 7 else 'snare', base_vel=95)

if __name__ == '__main__':
    S.export(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent/'export'))
