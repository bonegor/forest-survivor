"""Steel Tread v2: short metal ideas alternate inside returning 16-bar phrases.

A is the familiar eighth-note chug. B answers in a 3-3-2 rhythm, C opens
space with longer power chords and D turns the bass/counter-guitar home.
Each idea lasts two or four bars; it changes from its FIRST bar. E-minor
and A-minor pedal spans keep the harmony simple. The original is song_v1.py.
"""
from copy import deepcopy
import json


def hit(pos, length, notes, velocity, art=None):
    return [pos, length, notes, velocity, art]


def drums(motif):
    cell = []
    for bar in (0, 16):
        cell += [hit(bar+p, 1, 36, 116) for p in (0, 8)]
        cell += [hit(bar+p, 1, 38, 115) for p in (4, 12)]
        hats = range(0, 16, 2) if motif != 'C' else (0, 2, 4, 8, 10, 12)
        for p in hats:
            open_hat = (motif == 'B' and p == 14) or (motif == 'D' and p in (6, 14))
            cell.append(hit(bar+p, .8, 46 if open_hat else 42, 84 if p % 4 == 0 else 68))
        if motif == 'B':
            cell.append(hit(bar+10, .6, 38, 48))
        if motif == 'C':
            cell.append(hit(bar+14, .7, 51, 73))
    if motif == 'D':
        # A two-note pickup closes the phrase, not a full rolling fill.
        cell += [hit(29, .6, 38, 61), hit(31, .6, 38, 72)]
    return sorted(cell, key=lambda e: (e[0], e[2]))


EXTRA_KICK = [hit(p, .9, 36, 99 if p % 8 == 6 else 91)
              for p in (3, 6, 10, 14, 19, 22, 26, 30)]


def bass(root, motif):
    if motif == 'A':
        return [hit(p, 1.55, root+(7 if p in (14, 30) else 0),
                    110 if p % 8 == 0 else 101) for p in range(0, 32, 2)]
    if motif == 'B':
        return [hit(bar+p, 1.5, root+(7 if p == 14 else 0),
                    109 if p in (0, 8) else 101)
                for bar in (0, 16) for p in (0, 3, 6, 8, 11, 14)]
    if motif == 'C':
        return [hit(bar+p, ln, root+offset, 107 if p in (0, 8) else 99)
                for bar in (0, 16)
                for p, ln, offset in ((0, 3, 0), (4, 3, 7), (8, 3, 12), (12, 1.4, 7), (14, 1.5, 0))]
    return [hit(bar+p, ln, root+offset, 110 if p == 0 else 101)
            for bar in (0, 16)
            for p, ln, offset in ((0, 3, 0), (4, 3, 7), (8, 3, 0), (12, 1.4, 7), (14, 1.5, 0))]


def guitar_one(root, motif):
    shape = [root, root+7]
    if motif == 'A':
        return [hit(p, 1.5, shape, 114 if p % 8 == 0 else 104, 'mute')
                for p in range(0, 32, 2)]
    if motif in ('B', 'D'):
        return [hit(bar+p, 1.4, shape, 114 if p in (0, 8) else 104, 'mute')
                for bar in (0, 16) for p in (0, 3, 6, 8, 11, 14)]
    return [hit(bar+p, ln, [root, root+7, root+12] if p in (0, 8) else shape,
                110 if p in (0, 8) else 102, 'sus' if p in (0, 8) else 'mute')
            for bar in (0, 16) for p, ln in ((0, 3.0), (6, 1.4), (8, 3.0), (14, 1.4))]


def guitar_two(root, motif):
    if motif in ('A', 'C'):
        return [hit(3, 3, [root+12, root+19], 103, 'sus'),
                hit(11, 3, [root+12, root+19], 100, 'sus'),
                hit(19, 3, [root+15, root+19], 101, 'sus'),
                hit(27, 3, [root+12, root+19], 104, 'sus')]
    if motif == 'B':
        return [hit(bar+p, 3, [root+12, root+19] if p == 4 else [root+15, root+19],
                    102 if p == 4 else 99, 'sus')
                for bar in (0, 16) for p in (4, 12)]
    return [hit(0, 5, [root+7, root+12, root+15], 101, 'sus'),
            hit(8, 4, [root+12, root+19], 101, 'sus'),
            hit(18, 3, [root+15, root+19], 99, 'sus'),
            hit(26, 5, [root+12, root+19], 103, 'sus')]


FORMS = (
    [('A', 4), ('B', 2), ('C', 2), ('A', 4), ('B', 2), ('D', 2)],
    [('A', 2), ('C', 2), ('B', 4), ('A', 2), ('C', 2), ('D', 4)],
    [('A', 4), ('C', 2), ('B', 2), ('A', 4), ('C', 2), ('D', 2)],
    [('A', 2), ('B', 2), ('C', 4), ('A', 2), ('B', 2), ('D', 4)],
)
CENTRES = ('E', 'E', 'A', 'E', 'E', 'A', 'A', 'E')
PLAN = []
for phrase in range(37):
    bar = phrase*16
    centre = CENTRES[phrase % len(CENTRES)]
    for motif, length in FORMS[phrase % len(FORMS)]:
        PLAN.append(dict(bar=bar, variant=centre+'_'+motif))
        bar += length
for bar, motif in ((592, 'A'), (596, 'C'), (598, 'D')):
    PLAN.append(dict(bar=bar, variant='E_'+motif))

KEYS = [(centre, motif) for centre in ('E', 'A') for motif in 'ABCD']


def variants(builder):
    return {centre+'_'+motif: builder(40 if centre == 'E' else 45, motif)
            for centre, motif in KEYS}


def track(name, sound, role, enter, level, pitch_range, cells, **tone):
    return dict(name=name, sound=sound, role=role, enter=enter, target_db=level,
                range=pitch_range, variants=cells, **tone)


SPEC = dict(
    title='Steel Tread - 15 minute metal groove', slug='steel-tread',
    genre='heavy metal', bpm=160, bars=600, pattern_bars=2, key='E minor',
    arrangement='cycled', revision=2, plan=PLAN,
    tracks=[
        track('Drum Bed', 'drums', 'drums', 0, -18, [0, 127],
              {c+'_'+m: drums(m) for c, m in KEYS}, lowcut_hz=30, highcut_hz=14500),
        track('Extra Kick', 'drums', 'drums', 2, -24, [0, 127],
              {c+'_'+m: deepcopy(EXTRA_KICK) for c, m in KEYS}, lowcut_hz=35, highcut_hz=6500),
        track('Bass', 'bass', 'bass', 4, -23, [28, 55],
              variants(lambda r, m: bass(r-12, m)), lowcut_hz=32, highcut_hz=4000),
        track('Guitar One', 'metal_rhythm', 'rhythm', 6, -22, [40, 76],
              variants(guitar_one), double=True, lowcut_hz=90, highcut_hz=7200),
        track('Guitar Two', 'metal_rhythm', 'rhythm', 8, -25, [40, 76],
              variants(guitar_two), double=False, pan=.18, lowcut_hz=150, highcut_hz=7600),
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
    assert [t['enter'] for t in SPEC['tracks']] == [0, 2, 4, 6, 8]
    for i, phase in enumerate(PLAN):
        end = PLAN[i+1]['bar'] if i+1 < len(PLAN) else SPEC['bars']
        assert end-phase['bar'] in (2, 4)
    for part in SPEC['tracks']:
        for cell in part['variants'].values():
            for pos, length, pitches, vel, art in cell:
                assert 0 <= pos < 32 and length > 0 and pos+length <= 32
                assert 1 <= vel <= 127 and art in (None, 'mute', 'sus')
                assert all(part['range'][0] <= pitch <= part['range'][1]
                           for pitch in ([pitches] if isinstance(pitches, int) else pitches))
    # The new variant changes actual first-bar pitched content, not its label or velocity.
    for left, right in zip(PLAN, PLAN[1:]):
        assert signature(left['variant'], 0, True) != signature(right['variant'], 0, True)
    return True


validate()
if __name__ == '__main__':
    print('Steel Tread v2: 600 bars; ideas change every 2 or 4 bars; 900 seconds.')
