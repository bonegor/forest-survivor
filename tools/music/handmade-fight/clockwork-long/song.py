"""Clockwork Charge: fifteen-minute neoclassical combat arrangement.

160 BPM, 4/4; A minor with relative-major lifts and an E-major dominant.
600 bars (900 seconds). Four real instruments:
SI drums, SI bass, string section and electric piano. No neural generation.
"""
import os
import sys
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import Song, BASS_RANGE, drum, fill

S = Song('Clockwork Charge - 15 minute version', bpm=160, seed=8828, target_lufs=-13)
ST = S.add_track('Clockwork Strings', 'battle_strings', role='rhythm', prange=(45, 76))
KY = S.add_track('Piano Hook', 'battle_keys', role='keys', prange=(45, 76))
BS = S.add_track('Deep Bass', 'bass', role='bass', prange=BASS_RANGE)
DR = S.add_track('March Drums', 'drums', role='drums')
S.mix = {ST: 1.0, KY: -1.5, BS: 1.0, DR: 0.0}
S.master['tail_sec'] = 0.0

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


# New episodes develop the original A/B themes without restarting the short song.
C_CHANGES = ['Am', 'Am', 'F', 'G', 'Dm', 'Am', 'Bm7b5', 'E']
C_HOOK = [
    [(0, 3, 64), (3, 1, 67), (4, 2, 69), (6, 2, 72), (8, 4, 69), (12, 2, 64)],
    [(0, 2, 60), (2, 2, 64), (4, 4, 69), (8, 2, 67), (10, 2, 64), (12, 3, 60)],
    [(0, 3, 65), (3, 1, 67), (4, 4, 69), (8, 3, 72), (11, 1, 69), (12, 2, 65)],
    [(0, 4, 67), (4, 2, 69), (6, 2, 71), (8, 4, 74), (12, 2, 71)],
    [(0, 2, 69), (2, 2, 65), (4, 4, 62), (8, 2, 64), (10, 2, 65), (12, 3, 69)],
    [(0, 3, 72), (3, 1, 71), (4, 4, 69), (8, 2, 67), (10, 2, 64), (12, 2, 60)],
    [(0, 2, 65), (2, 2, 69), (4, 4, 71), (8, 2, 74), (10, 2, 72), (12, 3, 71)],
    [(0, 4, 68), (4, 2, 71), (6, 2, 76), (8, 4, 71), (12, 2, 68), (14, 2, 64)],
]
D_CHANGES = ['Dm', 'G', 'C', 'Am', 'F', 'Dm', 'E', 'E']
D_HOOK = [
    [(0, 4, 69), (4, 2, 67), (6, 2, 65), (8, 4, 62), (12, 2, 65), (14, 2, 69)],
    [(0, 3, 71), (3, 1, 69), (4, 4, 67), (8, 2, 62), (10, 2, 64), (12, 4, 67)],
    [(0, 4, 72), (4, 2, 71), (6, 2, 69), (8, 4, 67), (12, 4, 64)],
    [(0, 2, 69), (2, 2, 72), (4, 4, 76), (8, 2, 74), (10, 2, 72), (12, 4, 69)],
    [(0, 4, 69), (4, 2, 67), (6, 2, 65), (8, 4, 60), (12, 4, 65)],
    [(0, 2, 65), (2, 2, 69), (4, 4, 74), (8, 2, 72), (10, 2, 69), (12, 4, 65)],
    [(0, 4, 68), (4, 2, 66), (6, 2, 64), (8, 4, 59), (12, 2, 64), (14, 2, 68)],
    [(0, 4, 71), (4, 2, 69), (6, 2, 68), (8, 4, 64), (12, 3, 68)],
]

THEMES = {'A': (A_CHANGES, A_HOOK), 'B': (B_CHANGES, B_HOOK),
          'C': (C_CHANGES, C_HOOK), 'D': (D_CHANGES, D_HOOK)}
SEQUENCE = ['Dm', 'G', 'C', 'F', 'Dm', 'Bm7b5', 'E', 'E']

# Chapters follow a long arc. Individual eight-bar phrases change register,
# accompaniment and their answer; there are no repeated final chords between them.
FORM = [
    (0, 8, 'Opening clockwork', 'A', 'march', .98),
    (8, 40, 'First charge', 'A', 'march', 1.00),
    (40, 56, 'Clockwork answer', 'A', 'answer', .97),
    (56, 80, 'Sunlit ramparts', 'B', 'lift', 1.03),
    (80, 96, 'Turning gears', 'sequence', 'running', .98),
    (96, 128, 'Clockwork rally', 'A', 'charge', 1.03),
    (128, 144, 'Moving shadows', 'bridge', 'bridge', .93),
    (144, 176, 'New pursuit', 'C', 'running', 1.00),
    (176, 208, 'Major banner', 'B', 'lift', 1.04),
    (208, 224, 'Circle climb', 'sequence', 'running', 1.00),
    (224, 256, 'Rally in motion', 'A', 'charge', 1.04),
    (256, 272, 'Drum and counterpoint', 'bridge', 'bridge', .94),
    (272, 304, 'Pursuit developed', 'C', 'answer', 1.01),
    (304, 336, 'The bright trio', 'D', 'lift', 1.03),
    (336, 352, 'Winding ascent', 'sequence', 'running', .99),
    (352, 384, 'Homeward charge', 'A', 'march', 1.01),
    (384, 416, 'Open gates', 'B', 'charge', 1.05),
    (416, 432, 'Low gear bridge', 'bridge', 'bridge', .93),
    (432, 464, 'Pursuit returns', 'C', 'running', 1.02),
    (464, 496, 'Trio answer', 'D', 'answer', 1.02),
    (496, 512, 'Final winding', 'sequence', 'build', 1.01),
    (512, 544, 'Clockwork triumphant', 'A', 'charge', 1.06),
    (544, 576, 'Grand major rally', 'B', 'lift', 1.06),
    (576, 592, 'Last charge', 'A', 'charge', 1.05),
    (592, 600, 'Final cadence', 'coda', 'coda', 1.03),
]


def running_foundation(bar, chord, *, lift=False, cycle=0):
    """Interlocking bowed eighths over the established root/fifth bass engine."""
    voices, root = CHORDS[chord]
    register = [m-12 if m >= 65 and cycle % 2 else m for m in voices]
    contour = [0, 1, 2, 1, 0, 2, 1, 2]
    for j, k in enumerate(contour):
        notes = register[k % len(register)]
        if j in (0, 4):
            notes = [notes, root+24 if root+12 < 45 else root+12]
        S.play(ST, bar, j*2, 1.65, notes, 88 if j in (0, 4) else 77,
               gate=.82, hum_ms=2)
    pattern = [root, root, root+7, root, root+12, root, root+7, root]
    for j, pitch in enumerate(pattern):
        S.play(BS, bar, j*2, 1.85, pitch, 108 if j in (0, 4) else 96,
               gate=.9, hum_ms=2)
    if lift:
        S.play(KY, bar, 14, 1.6, voices[:2], 65, gate=.8, hum_ms=2)


def theme_phrase(bar, phrase, cycle, style, chord):
    # Leave the familiar hooks literal on their first statement and grand return.
    if cycle % 4 == 2 and style in ('answer', 'march'):
        phrase = [(p, length, pitch-12) for p, length, pitch in phrase]
    elif cycle % 4 == 3:
        # A new final answer resolves to the next tonic instead of looping a stop.
        phrase = list(phrase)
        if bar % 8 == 7 and chord == 'E':
            phrase = [(p, min(length, 2) if p == 12 else length, pitch)
                      for p, length, pitch in phrase if p < 14]
            phrase.append((14, 2, 64))
    hook(bar, phrase, varied=cycle % 4 == 1,
         strong=style in ('lift', 'charge', 'build'))


def sequence_phrase(bar, chord, i, style):
    voices, _ = CHORDS[chord]
    top = [p+12 if p+12 <= 76 else p for p in voices]
    pitches = [top[0], top[1], top[-1], top[1], top[-1], top[1], top[0], top[-1]]
    # Descending answers alternate with the rising sequence, so the build breathes.
    if (i//8) % 2:
        pitches = pitches[4:] + pitches[:4]
    for j, pitch in enumerate(pitches):
        S.play(KY, bar, j*2, 1.8, pitch, 86+(i % 8)*2, gate=.84, hum_ms=2)


def bridge_phrase(bar, chord, i):
    voices, _ = CHORDS[chord]
    if chord == 'Bm7b5':
        line = [65, 62, 59, 62, 65, 71]
    elif chord == 'E':
        line = [71, 68, 64, 59, 64, 68]
    else:
        top = voices[-1]
        line = [min(76, top+7), voices[1], top, voices[0], voices[1], top]
    if (i//8) % 2:
        line = [p-12 if p-12 >= 45 else p for p in line]
    for p, length, pitch in zip((0, 2, 4, 8, 10, 12), (2, 2, 4, 2, 2, 3), line):
        S.play(KY, bar, p, length, pitch, 91 if p in (0, 8) else 85, gate=.86, hum_ms=2)


def drum_bar(bar, style, i, last_in_section):
    if bar == 599:
        for name, velocity in [('kick', 122), ('snare', 104), ('crash', 112), ('tom_floor', 98)]:
            drum(S, DR, bar, 0, name, velocity, 0)
        return
    lift = style in ('lift', 'charge', 'build', 'coda')
    bridge = style == 'bridge'
    if style == 'charge':
        kicks = (0, 4, 8, 12, 14)
    elif bridge:
        kicks = (0, 8, 10)
    else:
        kicks = (0, 6, 8, 14)
    for p in kicks:
        drum(S, DR, bar, p, 'kick', 118 if p in (0, 8) else 108, 2)
    for p in (4, 12):
        drum(S, DR, bar, p, 'snare', 112 if lift else 107, 2)
    hats = range(0, 16, 2) if style in ('running', 'charge', 'build') else (2, 6, 10, 14)
    for p in hats:
        drum(S, DR, bar, p, 'chh', 72 if p % 4 == 0 else 63, 2)
    toms = (0, 3, 8, 11) if not lift else (2, 6, 10, 14)
    for p in toms:
        drum(S, DR, bar, p, 'tom_floor', 82 if p in (0, 8) else 70, 2)
    if lift:
        for p in (0, 8):
            drum(S, DR, bar, p, 'ride', 82, 2)
    if i % 8 == 0:
        drum(S, DR, bar, 0, 'crash', 106, 2)
    if i % 8 == 7 or last_in_section:
        fill(S, DR, bar, 12, kind='toms' if i % 16 == 15 else 'snare', base_vel=95)
        drum(S, DR, bar, 14, 'kick', 108, 2)
    elif i % 4 == 3:
        drum(S, DR, bar, 15, 'snare', 54, 2)


for start, end, label, theme, style, dynamic in FORM:
    S.section(start, end, label)
    for bar in range(start, end):
        i = bar-start
        counts = {name: len(track['notes']) for name, track in S.tracks.items()}
        if theme in THEMES:
            changes, phrases = THEMES[theme]
            chord = changes[i % 8]
            if style == 'running':
                running_foundation(bar, chord, cycle=i//8)
            else:
                foundation(bar, chord, lift=style in ('lift', 'charge'), turn=i % 4 == 3)
            theme_phrase(bar, phrases[i % 8], i//8, style, chord)
        elif theme == 'sequence':
            chord = SEQUENCE[i % 8]
            running_foundation(bar, chord, lift=style == 'build' or i >= 8, cycle=i//8)
            sequence_phrase(bar, chord, i, style)
        elif theme == 'bridge':
            chord = ['Am', 'Dm', 'G', 'C', 'F', 'Bm7b5', 'E', 'E'][i % 8]
            foundation(bar, chord, sparse=True)
            bridge_phrase(bar, chord, i)
        else:
            chord = ['Dm', 'Am', 'F', 'E', 'F', 'Dm', 'E', 'A'][i]
            if bar < 599:
                foundation(bar, chord, lift=True, turn=i % 4 == 3)
                phrase_index = [2, 0, 6, 7, 6, 2, 7][i]
                hook(bar, A_HOOK[phrase_index], strong=True)
            else:
                # Exactly 600 bars. A ringing Picardy tonic carries the final
                # bar, and the renderer may apply a short fade within that bar.
                S.play(ST, bar, 0, 16, [45, 52, 57, 61, 64], 104, gate=1, hum_ms=0, vel_jitter=0)
                S.play(KY, bar, 0, 16, [57, 61, 64, 69], 110, gate=1, hum_ms=0, vel_jitter=0)
                S.play(BS, bar, 0, 16, 33, 112, gate=1, hum_ms=0, vel_jitter=0)
        drum_bar(bar, style, i, bar == end-1)
        for name, track in S.tracks.items():
            for note in track['notes'][counts[name]:]:
                note[3] = max(1, min(127, round(note[3]*dynamic)))

assert S.length_16 == 9600, S.length_16
assert S.length_16*S.s16 == 900.0

if __name__ == '__main__':
    S.export(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent/'export'))
