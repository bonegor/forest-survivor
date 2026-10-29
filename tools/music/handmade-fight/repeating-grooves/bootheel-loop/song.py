"""Bootheel Loop v2: country call/answer cells, changing after two or four bars.

The familiar boom-chuck A returns between B's acoustic gaps, C's clean
guitar replies and D's banjo/bass turnaround. Eight-bar D/G/A harmony spans
sit beneath rotating 16-bar phrase orders. Each variation changes its first
bar. The sound palette and fifteen-minute length stay as in song_v1.py.
"""
from copy import deepcopy
import json


def event(pos, length, notes, velocity, art=None):
    return [pos, length, notes, velocity, art]


HARMONY = {
    'D': dict(bass=(38, 33), guitar=[50, 57, 62, 66],
              chop=[57, 62, 66], roll=[62, 69, 74, 66, 69, 74, 66, 69]),
    'G': dict(bass=(31, 38), guitar=[43, 50, 55, 59, 62, 67],
              chop=[55, 59, 62], roll=[55, 62, 67, 59, 62, 67, 59, 62]),
    'A': dict(bass=(33, 28), guitar=[45, 52, 57, 61, 64],
              chop=[57, 61, 64], roll=[57, 64, 69, 61, 64, 69, 61, 64]),
}


def drums(motif):
    cell = []
    for bar in (0, 16):
        cell += [event(bar+p, .6, 36, 110) for p in (0, 8)]
        cell += [event(bar+p, .6, 38, 104) for p in (4, 12)]
        cell += [event(bar+p, .45, 37 if motif == 'D' else 38, 38) for p in (6, 14)]
        hats = range(0, 16, 2) if motif != 'C' else (0, 4, 6, 8, 12, 14)
        for p in hats:
            cell.append(event(bar+p, .5, 46 if motif == 'B' and p == 14 else 42,
                              75 if p % 4 == 0 else 58))
        if motif == 'B':
            cell.append(event(bar+10, .4, 38, 36))
    if motif == 'D':
        cell += [event(29, .4, 38, 49), event(31, .4, 38, 60)]
    return sorted(cell, key=lambda e: (e[0], e[2]))


LOW_KICK = [event(bar+p, .6, 36, 86 if p == 6 else 77)
            for bar in (0, 16) for p in (6, 14)]


def bass_cell(harmony, motif):
    root, fifth = harmony['bass']
    if motif == 'A':
        pattern = [(0, 3.2, root), (4, 3.2, fifth), (8, 3.2, root), (12, 3.2, fifth)]
    elif motif == 'B':
        pattern = [(0, 3.2, root), (4, 3.2, fifth), (8, 3.2, root),
                   (12, 1.4, fifth), (14, 1.6, root)]
    elif motif == 'C':
        pattern = [(0, 3.2, root), (4, 3.2, fifth), (8, 3.2, root+12), (12, 3.2, fifth)]
    else:
        pattern = [(0, 3.2, root), (4, 3.2, fifth), (8, 3.2, root),
                   (12, 1.4, root+4), (14, 1.6, root)]
    return [event(bar+p, ln, note, 108 if p in (0, 8) else 99)
            for bar in (0, 16) for p, ln, note in pattern]


def acoustic_cell(harmony, motif):
    notes = harmony['guitar']
    regular = motif in ('A', 'C')
    cell = []
    for bar in (0, 16):
        cell += [event(bar, 2.7, notes[0], 98), event(bar+8, 2.7, notes[1], 93)]
        for pos in (4, 12):
            cell += [event(bar+pos+k*.17, 2.45-k*.12, pitch, 94-k*3)
                     for k, pitch in enumerate(notes)]
        upstrokes = (6, 14) if regular else (14,) if bar == 0 else (6,)
        for pos in upstrokes:
            upper = list(reversed(notes[-3:]))
            cell += [event(bar+pos+k*.15, 1.10-k*.08, pitch, 63-k*3)
                     for k, pitch in enumerate(upper)]
    return cell


def chop_cell(harmony, motif):
    regular = motif in ('A', 'B')
    return [event(bar+p, 1.15, harmony['chop'], 89 if p in (2, 10) else 80, 'mute')
            for bar in (0, 16)
            for p in ((2, 6, 10, 14) if regular else (2, 10) if bar == 0 else (6, 14))]


def banjo_cell(harmony, motif):
    roll = harmony['roll']
    if motif == 'A':
        pattern = [(j*2, 1.5, pitch) for j, pitch in enumerate(roll)]
    elif motif == 'B':
        pattern = [(j*2, 1.5, roll[k]) for j, k in enumerate((0, 3, 1, 2, 0, 3, 1, 2))]
    elif motif == 'C':
        pattern = [(p, 1.5, roll[k]) for p, k in zip((2, 6, 10, 14), (0, 3, 1, 2))]
    else:
        pattern = [(0, 2.5, roll[0]), (4, 2.5, roll[1]), (8, 2.5, roll[0]),
                   (12, 1.4, roll[3]), (14, 1.5, roll[0])]
    return [event(bar+p, ln, note, 85 if p == 0 else 77)
            for bar in (0, 16) for p, ln, note in pattern]


FORMS = (
    [('A', 4), ('B', 2), ('C', 2), ('A', 4), ('B', 2), ('D', 2)],
    [('A', 2), ('C', 2), ('B', 4), ('A', 2), ('C', 2), ('D', 4)],
    [('A', 4), ('C', 2), ('B', 2), ('A', 4), ('C', 2), ('D', 2)],
    [('A', 2), ('B', 2), ('C', 4), ('A', 2), ('B', 2), ('D', 4)],
)
CHANGES = ('D', 'G', 'D', 'A', 'D', 'G', 'A', 'D')
PLAN = []
for phrase in range(33):
    bar = phrase*16
    for motif, length in FORMS[phrase % len(FORMS)]:
        chord = CHANGES[(bar//8) % len(CHANGES)]
        PLAN.append(dict(bar=bar, variant=chord+'_'+motif))
        bar += length
# The final IV-V-I answer lands in D; every segment is still two/four bars.
for bar, chord, motif in ((528, 'G', 'A'), (532, 'A', 'B'), (534, 'A', 'C'),
                         (536, 'D', 'A'), (538, 'D', 'D')):
    PLAN.append(dict(bar=bar, variant=chord+'_'+motif))

KEYS = [(chord, motif) for chord in HARMONY for motif in 'ABCD']


def variants(builder):
    return {chord+'_'+motif: builder(HARMONY[chord], motif) for chord, motif in KEYS}


def track(name, sound, role, enter, level, pitch_range, cells, **tone):
    return dict(name=name, sound=sound, role=role, enter=enter,
                target_db=level, range=pitch_range, variants=cells, **tone)


SPEC = dict(
    title='Bootheel Loop - 15 minute country groove', slug='bootheel-loop',
    genre='country', bpm=144, bars=540, pattern_bars=2, key='D major',
    arrangement='cycled', revision=2, plan=PLAN,
    tracks=[
        track('Drum Bed', 'drums', 'drums', 0, -18., [0, 127],
              {c+'_'+m: drums(m) for c, m in KEYS}, lowcut_hz=36, highcut_hz=14500),
        track('Low Kick', 'drums', 'drums', 2, -27., [0, 127],
              {c+'_'+m: deepcopy(LOW_KICK) for c, m in KEYS}, lowcut_hz=38, highcut_hz=1700),
        track('Alternating Bass', 'bass', 'bass', 4, -23., [28, 55],
              variants(bass_cell), lowcut_hz=33, highcut_hz=4000),
        track('Acoustic Chuck', 'acoustic', 'acoustic', 6, -23., [40, 84],
              variants(acoustic_cell), pan=-.15, lowcut_hz=115, highcut_hz=7500),
        track('Twang Chop', 'clean_gtr', 'rhythm', 8, -26., [40, 76],
              variants(chop_cell), double=False, pan=.18, lowcut_hz=190, highcut_hz=6200),
        track('Banjo Roll', 'country_banjo', 'rhythm', 10, -29., [50, 84],
              variants(banjo_cell), pan=.26, lowcut_hz=230, highcut_hz=6800),
    ])


def signature(variant, bar_in_cell, pitched_only=False):
    parts = []
    for part in SPEC['tracks']:
        if pitched_only and part['role'] == 'drums':
            continue
        events = [[round(p-bar_in_cell*16, 5), ln, notes, art]
                  for p, ln, notes, vel, art in part['variants'][variant]
                  if bar_in_cell*16 <= p < (bar_in_cell+1)*16]
        parts.append([part['name'], events])
    return json.dumps(parts, sort_keys=True)


def validate():
    assert SPEC['bars']*240/SPEC['bpm'] == 900
    assert [p['enter'] for p in SPEC['tracks']] == [0, 2, 4, 6, 8, 10]
    for i, phase in enumerate(PLAN):
        end = PLAN[i+1]['bar'] if i+1 < len(PLAN) else SPEC['bars']
        assert end-phase['bar'] in (2, 4)
    for part in SPEC['tracks']:
        assert len(part['variants']) == 12
        for cell in part['variants'].values():
            for pos, length, pitches, vel, art in cell:
                assert 0 <= pos < 32 and length > 0 and pos+length <= 32
                assert 1 <= vel <= 127 and art in (None, 'mute', 'sus')
                assert all(part['range'][0] <= pitch <= part['range'][1]
                           for pitch in ([pitches] if isinstance(pitches, int) else pitches))
    for left, right in zip(PLAN, PLAN[1:]):
        assert signature(left['variant'], 0, True) != signature(right['variant'], 0, True)
    return True


validate()
if __name__ == '__main__':
    print('Bootheel Loop v2: 540 bars; ideas change every 2 or 4 bars; 900 seconds.')
