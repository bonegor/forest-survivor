"""Dusty Trail Stampede: original fifteen-minute country combat instrumental.

144 BPM, 4/4, 540 bars = exactly 900 seconds. An alternating-bass two-step
supports acoustic boom-chuck strums, clean electric answers and five-string
banjo rolls. Four written themes visit D major, D mixolydian and B minor;
the band trades lead roles instead of repeating a short mastered recording.
"""
import os
import sys
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import Song, drum, SHREDDAGE_KS, SHREDDAGE_RANGE

S = Song('Dusty Trail Stampede - fifteen minute version', bpm=144, seed=291044, target_lufs=-13)
S.master.update(tail_sec=0, glue=True, limiter_oversample=4)
AC = S.add_track('Acoustic Rhythm', 'acoustic', role='acoustic', prange=(40, 84))
EL = S.add_track('Twang Guitar', 'clean_gtr', role='lead',
                 keyswitches=SHREDDAGE_KS, prange=SHREDDAGE_RANGE)
BJ = S.add_track('Banjo', 'country_banjo', role='lead', prange=(50, 86))
PN = S.add_track('Piano', 'country_piano', role='keys', prange=(45, 88))
BS = S.add_track('Bass', 'bass', role='bass', prange=(28, 55))
DR = S.add_track('Drums', 'drums', role='drums')
S.mix = {AC: 0, EL: -4, BJ: -4, PN: -5, BS: 1, DR: -1}

# Bass root, playable guitar shape, close piano/banjo voicing. Open chord
# shapes give the acoustic a recognisable strummed country accompaniment.
CHORDS = {
    'D': (38, [50, 57, 62, 66], [62, 66, 69]),
    'G': (31, [43, 50, 55, 59, 62, 67], [59, 62, 67]),
    'A7': (33, [45, 52, 55, 61, 64], [61, 64, 67]),
    'C': (36, [48, 52, 55, 60, 64], [60, 64, 67]),
    'Bm': (35, [47, 54, 59, 62, 66], [59, 62, 66]),
    'E7': (28, [40, 47, 50, 56, 59, 64], [56, 59, 62]),
}
A_CHANGES = ['D', 'D', 'G', 'G', 'D', 'A7', 'G', 'D']
B_CHANGES = ['G', 'D', 'A7', 'D', 'G', 'D', 'A7', 'D']
C_CHANGES = ['D', 'C', 'G', 'D', 'D', 'G', 'A7', 'D']
D_CHANGES = ['Bm', 'G', 'D', 'A7', 'Bm', 'G', 'E7', 'A7']

# Each eight-bar tune has a question and a cadential answer. Chord tones
# carry downbeats; passing notes resolve into the following strong beat.
A = [
    [(0, 2, 62), (2, 2, 66), (4, 3, 69), (8, 2, 66), (10, 2, 64), (12, 3, 62)],
    [(0, 3, 66), (4, 2, 64), (6, 2, 62), (8, 3, 57), (12, 2, 59), (14, 2, 62)],
    [(0, 3, 67), (4, 2, 69), (6, 2, 71), (8, 4, 67), (12, 3, 62)],
    [(0, 2, 59), (2, 2, 62), (4, 3, 67), (8, 2, 69), (10, 2, 67), (12, 3, 62)],
    [(0, 2, 66), (2, 2, 69), (4, 3, 74), (8, 2, 73), (10, 2, 71), (12, 3, 69)],
    [(0, 3, 73), (4, 2, 71), (6, 2, 69), (8, 3, 67), (12, 2, 64), (14, 2, 61)],
    [(0, 3, 62), (4, 2, 67), (6, 2, 69), (8, 3, 71), (12, 2, 69), (14, 2, 67)],
    [(0, 3, 66), (4, 2, 64), (6, 2, 62), (8, 6, 62)],
]
B = [
    [(0, 4, 71), (4, 2, 69), (6, 2, 67), (8, 3, 62), (12, 2, 67), (14, 2, 69)],
    [(0, 4, 74), (4, 2, 73), (6, 2, 71), (8, 3, 69), (12, 3, 66)],
    [(0, 3, 73), (4, 2, 71), (6, 2, 69), (8, 2, 67), (10, 2, 64), (12, 3, 61)],
    [(0, 3, 62), (4, 2, 66), (6, 2, 69), (8, 5, 74)],
    [(0, 3, 71), (4, 2, 74), (6, 2, 71), (8, 3, 67), (12, 2, 69), (14, 2, 71)],
    [(0, 4, 69), (4, 2, 66), (6, 2, 64), (8, 4, 62), (12, 2, 66), (14, 2, 69)],
    [(0, 3, 67), (4, 2, 64), (6, 2, 61), (8, 2, 57), (10, 2, 61), (12, 2, 64), (14, 2, 67)],
    [(0, 4, 66), (4, 2, 64), (6, 2, 62), (8, 6, 62)],
]
C = [
    [(0, 2, 62), (3, 1, 64), (4, 2, 66), (6, 2, 69), (8, 3, 74), (12, 3, 69)],
    [(0, 2, 72), (2, 2, 71), (4, 3, 67), (8, 2, 64), (10, 2, 62), (12, 3, 60)],
    [(0, 3, 59), (4, 2, 62), (6, 2, 67), (8, 3, 71), (12, 3, 67)],
    [(0, 2, 66), (2, 2, 64), (4, 3, 62), (8, 2, 57), (10, 2, 59), (12, 3, 62)],
    [(0, 2, 69), (2, 2, 74), (4, 3, 69), (8, 2, 66), (10, 2, 64), (12, 3, 62)],
    [(0, 3, 67), (4, 2, 69), (6, 2, 71), (8, 2, 74), (10, 2, 71), (12, 3, 67)],
    [(0, 2, 69), (2, 2, 67), (4, 3, 64), (8, 2, 61), (10, 2, 64), (12, 3, 67)],
    [(0, 3, 66), (4, 2, 64), (6, 2, 62), (8, 6, 62)],
]
D = [
    [(0, 3, 66), (4, 2, 69), (6, 2, 71), (8, 4, 74), (12, 3, 71)],
    [(0, 3, 71), (4, 2, 69), (6, 2, 67), (8, 4, 62), (12, 3, 59)],
    [(0, 3, 62), (4, 2, 66), (6, 2, 69), (8, 4, 74), (12, 3, 69)],
    [(0, 3, 73), (4, 2, 71), (6, 2, 69), (8, 4, 67), (12, 3, 64)],
    [(0, 2, 71), (2, 2, 69), (4, 3, 66), (8, 2, 62), (10, 2, 66), (12, 3, 71)],
    [(0, 2, 67), (2, 2, 69), (4, 3, 71), (8, 2, 74), (10, 2, 71), (12, 3, 67)],
    [(0, 3, 68), (4, 2, 66), (6, 2, 64), (8, 3, 62), (12, 2, 59), (14, 2, 56)],
    [(0, 3, 57), (4, 2, 61), (6, 2, 64), (8, 4, 67), (12, 3, 73)],
]
THEMES = {'A': (A_CHANGES, A), 'B': (B_CHANGES, B), 'C': (C_CHANGES, C), 'D': (D_CHANGES, D)}


def play(track, bar, pos, length, pitches, vel, gate=.85, hum=2.5, art=None):
    S.play(track, bar, pos, length, pitches, int(vel), gate=gate,
           hum_ms=hum, vel_jitter=3, art=art)


def strum(bar, pos, chord, vel, up=False, length=2.7):
    notes = list(CHORDS[chord][1])
    if up:
        notes = list(reversed(notes[1:]))
    for k, pitch in enumerate(notes):
        # 17 ms between strings, with lower downstrokes and lighter upstrokes.
        play(AC, bar, pos+k*.16, length-k*.1, pitch, vel-k*2, gate=.93)


def foundation(bar, chord, mode, variation, next_chord, ending=False):
    root, shape, triad = CHORDS[chord]
    sparse = mode == 'break'
    high = mode in ('chorus', 'reel', 'final')
    # Root/fifth oom-pah, with occasional stepwise approaches at the end of
    # eight-bar phrases. The bass avoids duplicating every banjo eighth.
    bassline = [(0, root), (4, root+7), (8, root), (12, root+7)]
    if high and variation % 4 == 3:
        bassline = [(0, root), (4, root+7), (8, root+12), (12, root+7)]
    if variation % 8 == 7:
        approach = CHORDS[next_chord][0]
        approach = approach+12 if approach < root-5 else approach
        bassline = [(0, root), (4, root+7), (8, root), (12, approach-2), (14, approach-1)]
    for p, n in bassline:
        play(BS, bar, p, 3.25 if p < 12 else 1.75, n, 110 if p in (0, 8) else 101, gate=.9)
    # Acoustic boom-chuck remains alive through the quieter lead exchanges.
    for p, note in ((0, shape[0]), (8, shape[1])):
        play(AC, bar, p, 2.9, note, 96 if not sparse else 85)
    strum(bar, 4, chord, 101 if high else 92)
    strum(bar, 12, chord, 99 if high else 91)
    if mode != 'break':
        strum(bar, 6, chord, 66, up=True, length=1.45)
        if high or variation % 4 == 2:
            strum(bar, 14, chord, 71 if high else 63, up=True, length=1.4)
    # Honky-tonk keyboard comping: rootless triads avoid crowding the bass.
    for p in ((6, 14) if not sparse else (14,)):
        play(PN, bar, p, 1.6, triad, 78 if high else 67, gate=.82)
    if mode in ('piano', 'duel'):
        for p, n in zip((0, 2, 8, 10), (triad[0], triad[1], triad[2], triad[1])):
            play(PN, bar, p, 1.7, n, 92, gate=.83)
    # Kick on one/three, crisp backbeat and ghost snare: a moving train beat.
    for p in (0, 8):
        drum(S, DR, bar, p, 'kick', 119 if high else 111, 1)
    if high and variation % 2 == 1:
        drum(S, DR, bar, 10, 'kick', 81, 1)
    for p in (4, 12):
        drum(S, DR, bar, p, 'snare', 114 if high else 105, 1.5)
    for p in (2, 6, 10, 14):
        drum(S, DR, bar, p, 'snare', (55 if p in (6, 14) else 44) if not sparse else 37, 2)
    for p in range(0, 16, 2):
        drum(S, DR, bar, p, 'chh' if p != 14 or not high else 'ohh', 76 if p % 4 == 0 else 61, 1.5)
    if variation % 8 == 0:
        drum(S, DR, bar, 0, 'crash', 99 if high else 85, 0)
    if variation % 8 == 7 or ending:
        # Remove only the final ghost notes so the fill has breathing space.
        S.remove(DR, bar, 13.5, 16, pitches=[38])
        for j, p in enumerate((13.5, 14, 15)):
            drum(S, DR, bar, p, ('snare', 'tom_hi', 'tom_mid')[j], 86+j*7, 1)


def banjo_roll(bar, chord, mode, variation, lead_active):
    _, _, triad = CHORDS[chord]
    # A chord-specific thumb/index/middle roll. High drone is the fifth of
    # the current chord rather than a fixed note clashing through B minor/E7.
    root = CHORDS[chord][0]+24
    fifth = root+7
    while fifth > 81:
        fifth -= 12
    tones = [root, triad[1]+12, triad[2], fifth, triad[0]+12, triad[2], triad[1]+12, fifth]
    order = (0, 1, 2, 3, 1, 2, 4, 3) if variation % 2 == 0 else (0, 2, 1, 3, 2, 4, 1, 3)
    if mode in ('banjo', 'reel'):
        positions = range(0, 16, 2)
        velocity = 100
    elif mode == 'break':
        positions = (2, 6, 10, 14)
        velocity = 82
    elif lead_active:
        positions = (10, 12, 14) if variation % 2 else (2, 6)
        velocity = 66
    else:
        positions = range(0, 16, 2)
        velocity = 85
    for j, p in enumerate(positions):
        note = tones[order[j % 8]]
        play(BJ, bar, p, 1.7, note, velocity + (5 if j % 4 == 0 else -5), gate=.88, hum=2)


def melody(bar, phrase, mode, variation, theme):
    # Soloists exchange eight-bar blocks; the whole band leaves short gaps
    # after cadences. Banjo choruses are written variations of the tune.
    if mode == 'break':
        if variation % 4 != 3:
            return False
        phrase = [(10, 1.5, phrase[-1][2]), (12, 1.5, phrase[0][2]), (14, 1.5, phrase[1][2])]
    elif mode == 'banjo':
        if variation % 8 not in (3, 7):
            return False
        phrase = phrase[-3:]
    elif mode == 'duel':
        if variation % 4 in (0, 1):
            return False
    elif mode == 'piano':
        if variation % 8 < 4:
            for p, ln, n in phrase:
                play(PN, bar, p, ln, n, 102 if p == 0 else 93, gate=.82)
            return False
    use_banjo = mode == 'reel' and (variation // 8) % 2 == 1
    track = BJ if use_banjo else EL
    for j, (p, ln, n) in enumerate(phrase):
        if variation >= 16 and mode not in ('break', 'banjo'):
            # Later returns use lower call phrases and delayed eighth-note
            # answers, preserving the harmony and the tune's cadence.
            if variation % 4 == 0 and j < 2 and n-12 >= 52:
                n -= 12
            if variation % 4 == 2 and p == 4 and ln <= 3:
                p += .5
                ln -= .5
        if mode in ('chorus', 'final') and variation % 8 == 4 and j == 0:
            ln = max(ln, 3)
        play(track, bar, p, ln, n, (105 if mode in ('chorus', 'final') else 98)-(j%2)*6,
             gate=.88, hum=2, art=None if use_banjo else 'sus')
    return not use_banjo


def passage(start, end, mode, theme, label, development=0):
    S.section(start, end, label)
    changes, tune = THEMES[theme]
    for bar in range(start, end):
        j = bar-start
        v = j+development*8
        chord = changes[j % 8]
        # Several returns change texture after sixteen bars; the train
        # pulse continues, while the ear follows a new lead conversation.
        local_mode = 'piano' if mode == 'verse' and j >= 16 and development % 2 else mode
        foundation(bar, chord, local_mode, v, changes[(j+1) % 8], ending=bar == end-1)
        lead = melody(bar, tune[j % 8], local_mode, v, theme)
        banjo_roll(bar, chord, local_mode, v, lead)


passage(0, 8, 'reel', 'A', 'Boots on the trail: full-band rolling start')
PLAN = [
    (8, 40, 'verse', 'A', 'Dusty Trail: electric question, acoustic two-step'),
    (40, 72, 'chorus', 'B', 'Stampede refrain: open country chorus'),
    (72, 104, 'piano', 'A', 'Saloon answer: piano and guitar trade phrases'),
    (104, 136, 'banjo', 'C', 'Five-string switchback: banjo roll feature'),
    (136, 168, 'reel', 'C', 'Red-rock road: mixolydian reel'),
    (168, 200, 'chorus', 'B', 'Wide-horizon refrain'),
    (200, 224, 'break', 'A', 'Train-track pocket: drums, bass and clipped answers'),
    (224, 256, 'verse', 'D', 'Moonlit canyon: relative-minor bridge'),
    (256, 288, 'piano', 'D', 'Canyon chase: honky-tonk and electric exchange'),
    (288, 320, 'chorus', 'B', 'Daybreak return in D major'),
    (320, 352, 'reel', 'C', 'Prairie reel: banjo and guitar swap eight-bar leads'),
    (352, 384, 'banjo', 'A', 'Flatpick crossing: rolling strings and piano chops'),
    (384, 408, 'duel', 'D', 'Drum-and-string relay through the canyon'),
    (408, 440, 'verse', 'A', 'Dusty Trail return with lower electric calls'),
    (440, 472, 'chorus', 'B', 'Stampede refrain with answering banjo'),
    (472, 504, 'reel', 'C', 'Last ridge: full-speed country reel'),
    (504, 536, 'final', 'B', 'Final Stampede: complete band and homeward cadence'),
]
for chapter, (start, end, mode, theme, label) in enumerate(PLAN, 1):
    passage(start, end, mode, theme, label, development=chapter)

S.section(536, 540, 'Four-bar landing in D; the pulse resolves without an early fade')
for j, chord in enumerate(['G', 'D', 'A7']):
    bar = 536+j
    foundation(bar, chord, 'final', j, ['D', 'A7', 'D'][j], ending=j == 2)
    melody(bar, B[[4, 5, 6][j]], 'final', j, 'B')
    banjo_roll(bar, chord, 'final', j, True)
S.play(BS, 539, 0, 16, 38, 111, gate=1, hum_ms=0, vel_jitter=0)
S.play(AC, 539, 0, 15.9, CHORDS['D'][1], 94, gate=1, hum_ms=0, vel_jitter=0)
S.play(EL, 539, 0, 15, 62, 103, art='sus', gate=1, hum_ms=0, vel_jitter=0)
S.play(PN, 539, 0, 15.5, [50, 57, 62, 66], 88, gate=1, hum_ms=0, vel_jitter=0)
S.play(BJ, 539, 0, 14, [62, 66, 69], 85, gate=1, hum_ms=0, vel_jitter=0)
drum(S, DR, 539, 0, 'kick', 123, 0)
drum(S, DR, 539, 0, 'crash', 103, 0)

assert S.length_16 == 8640, S.length_16
assert abs(S.length_16*S.s16-900) < 1e-8
if __name__ == '__main__':
    S.export(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent/'export'))
