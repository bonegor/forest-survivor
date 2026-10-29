"""Neon Motor v2: related two-bar motifs in changing sixteen-bar phrases.

The previous constant groove becomes statement, answer, departure and
turnaround cells. Cells last two or four bars, then a recognisable variant
takes over. Tones, tempo, length and additive entrance match version one.
"""
from copy import deepcopy
STYLE = 'neon'


def event(pos, length, pitch, velocity):
    return [pos, length, pitch, velocity, None]


def drum_cell(motif):
    result = []
    if STYLE == 'neon':
        for bar in (0, 16):
            result += [event(bar+p, .8, 36, 115 if p in (0, 8) else 108) for p in (0, 4, 8, 12)]
            result += [event(bar+p, .9, 38, 103) for p in (4, 12)]
            for p in (2, 6, 10, 14):
                if motif == 'D' and p == 2:
                    continue
                voice = 46 if motif == 'B' and p == 6 else 42
                result.append(event(bar+p, .8, voice, 79 if p in (2, 10) else 69))
            result += [event(bar+p, .55, 42, 49) for p in (0, 8)]
            if motif == 'C':
                result += [event(bar+p, .45, 42, 51) for p in (3, 11)]
            elif motif == 'D':
                result.append(event(bar+11, .45, 42, 53))
        if motif == 'D':
            result += [event(29, .55, 38, 59), event(31, .55, 38, 72)]
    else:
        kicks = {'A': (0, 6, 10, 16, 22, 27), 'B': (0, 6, 11, 16, 22, 26),
                 'C': (0, 7, 10, 16, 23, 27), 'D': (0, 6, 10, 16, 22, 26)}[motif]
        result += [event(p, .75, 36, 116 if p in (0, 16) else 102) for p in kicks]
        result += [event(p, .9, 38, 112 if p in (12, 28) else 105) for p in (4, 12, 20, 28)]
        ghosts = (6.5, 15, 23, 31) if motif == 'D' else (7, 15, 23, 31)
        result += [event(p, .5, 38, 43 if p in (7, 23) else 52) for p in ghosts]
        for p in range(0, 32, 2):
            voice = 46 if motif == 'B' and p in (6, 22) else 42
            result.append(event(p, .65, voice, 76 if p % 8 == 2 else 59))
        pickups = {'A': (9, 25), 'B': (11, 27), 'C': (3, 19), 'D': (11, 25)}[motif]
        result += [event(p, .5, 42, 43) for p in pickups]
        if motif == 'D':
            result += [event(29, .45, 38, 61), event(30.5, .45, 38, 73)]
    return result


if STYLE == 'neon':
    EXTRA = [event(p, .7, 36, 83 if p % 16 == 6 else 74) for p in (6, 14, 22, 30)]
    BASS_RHYTHMS = {
        'A': [(0, 1.8, 0), (2, 1.55, 0), (6, 1.55, 0), (10, 1.55, 0),
              (14, 1.55, 7), (18, 1.55, 0), (22, 1.55, 0), (26, 1.55, 0), (30, 1.55, 7)],
        'B': [(0, 2.3, 0), (3, 1.1, 7), (6, 1.5, 0), (10, 1.5, 0), (14, 1.4, 7),
              (16, 2.3, 0), (20, 1.5, 7), (23, 1.2, 0), (26, 1.5, 0), (30, 1.5, 0)],
        'C': [(1, 2.3, 0), (6, 1.5, 7), (9, 2.3, 0), (14, 1.5, 0),
              (17, 2.3, 0), (22, 1.5, 7), (25, 2.3, 12), (30, 1.5, 0)],
        'D': [(0, 3., 0), (6, 1.4, 7), (10, 1.5, 0), (14, 1.5, 0),
              (16, 3., 0), (22, 1.4, 7), (26, 1.2, 12), (28, 1.2, 7), (30, 1.7, 0)],
    }
    STAB_POS = {'A': (2, 6, 10, 14, 18, 22, 26, 30), 'B': (0, 6, 12, 16, 22, 28),
                'C': (2, 8, 10, 18, 24, 26), 'D': (0, 6, 10, 16, 22, 28)}
    PULSE_POS = {'A': (0, 6, 12, 16, 22, 28), 'B': (2, 8, 14, 18, 24, 30),
                 'C': (0, 3, 10, 16, 19, 26), 'D': (2, 6, 12, 18, 24, 28, 30)}
    PULSE_NOTES = {'A': (57, 60, 57, 60, 57, 60), 'B': (60, 57, 57, 60, 60, 57),
                   'C': (57, 57, 60, 60, 57, 60), 'D': (60, 57, 60, 60, 57, 57, 57)}
    HARMONIES = {'Am': (33, ([57, 60, 64], [60, 64, 69], [57, 60, 64], [52, 57, 60])),
                 'F': (29, ([53, 57, 60], [57, 60, 65], [53, 57, 60], [48, 53, 57]))}
    title, slug, genre = 'Neon Motor - 15 minute electronic groove', 'neon-motor', 'electronic club'
    bpm, bars, root_key = 128, 480, 'A minor / F major colour'
    bass_name, chord_name, pulse_name = 'Motor Bass', 'Offbeat Chords', 'Two Note Pulse'
    bass_high, chord_pan, pulse_high = 3600, -.12, 6200
    home, colour = 'Am', 'F'
else:
    EXTRA = [event(p, .65, 36, 88 if p in (14, 30) else 76) for p in (3, 14, 18, 30)]
    BASS_RHYTHMS = {
        'A': [(0, 2.7, 0), (3, 1.2, 0), (6, 1.6, 7), (8, 2.5, 12), (11, 1.2, 0),
              (14, 1.5, 0), (16, 2.7, 0), (20, 1.2, 7), (22, 2.2, 12), (26, 1.5, 0), (29, 2., 0)],
        'B': [(2, 2., 0), (6, 1.5, 7), (10, 2.3, 0), (14, 1.5, 12),
              (18, 2., 0), (22, 1.5, 7), (26, 2.3, 0), (30, 1.5, 0)],
        'C': [(0, 1.8, 0), (5, 1.5, 7), (8, 1.8, 0), (13, 1.5, 12),
              (16, 1.8, 0), (21, 1.5, 7), (24, 1.8, 0), (29, 1.5, 0)],
        'D': [(0, 3., 0), (6, 1.5, 7), (10, 2., 0), (14, 1.5, 0),
              (16, 3., 0), (22, 1.5, 12), (26, 1.4, 7), (28, 1.4, 0), (30, 1.7, 0)],
    }
    STAB_POS = {'A': (2, 6, 14, 18, 22, 30), 'B': (0, 8, 12, 16, 24, 28),
                'C': (3, 10, 14, 19, 26, 30), 'D': (0, 6, 12, 16, 22, 28)}
    PULSE_POS = {'A': (0, 3, 8, 16, 19, 24), 'B': (2, 6, 11, 18, 22, 27),
                 'C': (0, 6, 10, 16, 22, 26), 'D': (2, 8, 14, 18, 24, 28, 30)}
    PULSE_NOTES = {'A': (52, 55, 52, 55, 52, 55), 'B': (55, 52, 52, 55, 55, 52),
                   'C': (52, 52, 55, 55, 52, 55), 'D': (55, 52, 55, 55, 52, 52, 52)}
    HARMONIES = {'Em': (28, ([52, 55, 59], [55, 59, 64], [52, 55, 59], [52, 59, 64])),
                 'C': (36, ([48, 52, 55], [52, 55, 60], [48, 52, 55], [48, 55, 60]))}
    title, slug, genre = 'Breakbeat Circuit - 15 minute broken-beat groove', 'breakbeat-circuit', 'drum and bass / broken beat'
    bpm, bars, root_key = 168, 630, 'E minor / C major colour'
    bass_name, chord_name, pulse_name = 'Circuit Bass', 'Clipped Chords', 'Counter Pulse'
    bass_high, chord_pan, pulse_high = 3800, -.15, 6100
    home, colour = 'Em', 'C'

# These are deliberate statement/answer/departure/conclusion phrases, not a
# random permutation. D always closes the sixteen-bar phrase.
FAMILIES = (
    (('A', 4), ('B', 2), ('C', 2), ('A', 4), ('B', 2), ('D', 2)),
    (('A', 2), ('C', 2), ('B', 4), ('A', 4), ('C', 2), ('D', 2)),
    (('A', 4), ('C', 2), ('B', 2), ('A', 2), ('B', 4), ('D', 2)),
)


def arrangement():
    result = []
    phrase_count, tail = divmod(bars, 16)
    harmony_cycle = (home, home, colour, home, home, colour, colour, home)
    for phrase in range(phrase_count):
        # Return home for the final full phrase(s), rather than cutting off
        # the fifteen-minute recording on its contrasting harmony.
        harmony = home if phrase >= phrase_count-(2 if not tail else 1) else harmony_cycle[phrase % 8]
        bar = phrase*16
        for motif, length in FAMILIES[phrase % len(FAMILIES)]:
            result.append({'bar': bar, 'variant': harmony+'_'+motif})
            bar += length
    if tail:
        assert tail == 6
        for motif in ('A', 'B', 'D'):
            result.append({'bar': bar, 'variant': home+'_'+motif})
            bar += 2
    assert bar == bars
    return result


keys = [h+'_'+m for h in HARMONIES for m in 'ABCD']
drums, extras, basses, stabs, pulses = {}, {}, {}, {}, {}
for harmony, (root, voicings) in HARMONIES.items():
    for j, motif in enumerate('ABCD'):
        key = harmony+'_'+motif
        drums[key], extras[key] = drum_cell(motif), deepcopy(EXTRA)
        basses[key] = [event(p, length, root+offset,
                            (102 if STYLE == 'neon' else 108) if p in (0, 16) else (94 if STYLE == 'neon' else 96))
                       for p, length, offset in BASS_RHYTHMS[motif]]
        stabs[key] = [event(p, (1.15 if motif != 'D' else 1.45) if STYLE == 'neon' else (.9 if i % 2 == 0 else 1.3),
                           voicings[j], (88 if STYLE == 'neon' else 89) if i % 2 == 0 else 78)
                      for i, p in enumerate(STAB_POS[motif])]
        pulses[key] = [event(p, .9 if STYLE == 'neon' else .75, pitch,
                            (83 if STYLE == 'neon' else 84) if i % 3 == 0 else (73 if STYLE == 'neon' else 74))
                       for i, (p, pitch) in enumerate(zip(PULSE_POS[motif], PULSE_NOTES[motif]))]

SPEC = {
    'title': title, 'slug': slug, 'genre': genre, 'bpm': bpm, 'bars': bars, 'pattern_bars': 2,
    'key': root_key, 'arrangement': 'cycled', 'revision': 2, 'phrase_bars': 16,
    'max_pattern_hold_bars': 4, 'plan': arrangement(),
    'tracks': [
        {'name': 'Drum Bed', 'sound': 'drums', 'role': 'drums', 'enter': 0,
         'target_db': -18., 'range': [36, 46], 'lowcut_hz': 32, 'highcut_hz': 12000, 'variants': drums},
        {'name': 'Extra Kick', 'sound': 'local_club_punch', 'role': 'drums', 'enter': 2,
         'target_db': -24., 'range': [36, 39], 'lowcut_hz': 35, 'highcut_hz': 7500, 'variants': extras},
        {'name': bass_name, 'sound': 'local_spring_bass', 'role': 'bass', 'enter': 4,
         'target_db': -22., 'range': [28, 55], 'lowcut_hz': 30, 'highcut_hz': bass_high, 'variants': basses},
        {'name': chord_name, 'sound': 'local_pulse_chords', 'role': 'keys', 'enter': 6,
         'target_db': -26., 'range': [48, 76], 'pan': chord_pan, 'lowcut_hz': 190, 'highcut_hz': 6500, 'variants': stabs},
        {'name': pulse_name, 'sound': 'local_pluck_hook', 'role': 'rhythm', 'enter': 8,
         'target_db': -28., 'range': [48, 76], 'pan': .18, 'lowcut_hz': 210, 'highcut_hz': pulse_high, 'variants': pulses},
    ],
}


def validate():
    assert bars*240/bpm == 900
    assert [t['enter'] for t in SPEC['tracks']] == [0, 2, 4, 6, 8]
    for i, phase in enumerate(SPEC['plan']):
        end = SPEC['plan'][i+1]['bar'] if i+1 < len(SPEC['plan']) else bars
        assert end-phase['bar'] in (2, 4)
    for track in SPEC['tracks']:
        assert set(track['variants']) == set(keys)
        for cell in track['variants'].values():
            for pos, length, pitches, velocity, art in cell:
                assert 0 <= pos < 32 and 0 < length <= 32-pos
                assert 1 <= velocity <= 127 and art is None
                for pitch in [pitches] if isinstance(pitches, int) else pitches:
                    assert track['range'][0] <= pitch <= track['range'][1]
    return True


validate()
