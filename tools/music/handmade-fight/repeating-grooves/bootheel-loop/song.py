"""Bootheel Loop: a country rhythm stack, not a lead-melody arrangement.

Two-bar cells repeat unchanged. The complete band arrives one layer every
two bars; long tonic stretches are interrupted only by occasional G or A
chord blocks. At 144 BPM, 540 bars last exactly fifteen minutes.
"""

from copy import deepcopy


def event(pos, length, pitch, velocity, art=None):
    return [pos, length, pitch, velocity, art]


# Every variant shares this identical two-bar drummer. The soft offbeat snare
# taps make a train rhythm under the backbeat, without a stream of fills.
DRUMS = []
LOW_KICK = []
for bar in (0, 16):
    DRUMS += [event(bar + p, .6, 36, 110) for p in (0, 8)]
    DRUMS += [event(bar + p, .6, 38, 104) for p in (4, 12)]
    DRUMS += [event(bar + p, .45, 38, 38) for p in (6, 14)]
    DRUMS += [event(bar + p, .5, 42, 75 if p % 4 == 0 else 58)
              for p in range(0, 16, 2)]
    LOW_KICK += [event(bar + p, .6, 36, 86 if p == 6 else 77)
                 for p in (6, 14)]

HARMONY = {
    'A': dict(chord='D', bass=(38, 33), guitar=[50, 57, 62, 66],
              chop=[57, 62, 66], roll=[62, 69, 74, 66, 69, 74, 66, 69]),
    'B': dict(chord='G', bass=(31, 38), guitar=[43, 50, 55, 59, 62, 67],
              chop=[55, 59, 62], roll=[55, 62, 67, 59, 62, 67, 59, 62]),
    'C': dict(chord='A', bass=(33, 28), guitar=[45, 52, 57, 61, 64],
              chop=[57, 61, 64], roll=[57, 64, 69, 61, 64, 69, 61, 64]),
}


def bass_cell(harmony):
    root, fifth = harmony['bass']
    return [event(bar+p, 3.2, root if p in (0, 8) else fifth,
                  108 if p in (0, 8) else 99)
            for bar in (0, 16) for p in (0, 4, 8, 12)]


def acoustic_cell(harmony):
    notes = harmony['guitar']
    cell = []
    for bar in (0, 16):
        cell += [event(bar, 2.7, notes[0], 98),
                 event(bar+8, 2.7, notes[1], 93)]
        for pos in (4, 12):
            # Roughly 18 ms between strings: a physical strum, not a pad.
            cell += [event(bar+pos+k*.17, 2.45-k*.12, pitch, 94-k*3)
                     for k, pitch in enumerate(notes)]
        for pos in (6, 14):
            upper = list(reversed(notes[-3:]))
            cell += [event(bar+pos+k*.15, 1.10-k*.08, pitch, 63-k*3)
                     for k, pitch in enumerate(upper)]
    return cell


def chop_cell(harmony):
    # One fixed major-chord shape on the eighth-note offbeats. Palm-muted
    # clean strings supply chicken-pick punctuation, never a solo line.
    return [event(bar+p, 1.15, harmony['chop'],
                  89 if p in (2, 10) else 80, 'mute')
            for bar in (0, 16) for p in (2, 6, 10, 14)]


def banjo_cell(harmony):
    return [event(bar+j*2, 1.5, pitch, 85 if j == 0 else 77)
            for bar in (0, 16) for j, pitch in enumerate(harmony['roll'])]


def track(name, sound, role, enter, level, pitch_range, cells, **tone):
    return dict(name=name, sound=sound, role=role, enter=enter,
                target_db=level, range=pitch_range, variants=cells, **tone)


def variants(builder):
    return {name: builder(chord) for name, chord in HARMONY.items()}


SPEC = dict(
    title='Bootheel Loop - 15 minute country groove',
    slug='bootheel-loop', genre='country', bpm=144, bars=540,
    pattern_bars=2, key='D major',
    plan=[
        dict(bar=0, variant='A'),
        dict(bar=128, variant='B'),
        dict(bar=192, variant='A'),
        dict(bar=320, variant='C'),
        dict(bar=384, variant='A'),
        dict(bar=480, variant='B'),
        dict(bar=512, variant='C'),
        dict(bar=528, variant='A'),
    ],
    tracks=[
        track('Drum Bed', 'drums', 'drums', 0, -18., [0, 127],
              {v: deepcopy(DRUMS) for v in HARMONY}, lowcut_hz=36, highcut_hz=14500),
        track('Low Kick', 'drums', 'drums', 2, -27., [0, 127],
              {v: deepcopy(LOW_KICK) for v in HARMONY}, lowcut_hz=38, highcut_hz=1700),
        track('Alternating Bass', 'bass', 'bass', 4, -23., [28, 55],
              variants(bass_cell), lowcut_hz=33, highcut_hz=4000),
        track('Acoustic Chuck', 'acoustic', 'acoustic', 6, -23., [40, 84],
              variants(acoustic_cell), pan=-.15, lowcut_hz=115, highcut_hz=7500),
        track('Twang Chop', 'clean_gtr', 'rhythm', 8, -26., [40, 76],
              variants(chop_cell), double=False, pan=.18,
              lowcut_hz=190, highcut_hz=6200),
        track('Banjo Roll', 'country_banjo', 'rhythm', 10, -29., [50, 84],
              variants(banjo_cell), pan=.26, lowcut_hz=230, highcut_hz=6800),
    ],
)


def validate():
    assert SPEC['bars'] * 4 * 60 / SPEC['bpm'] == 900
    assert SPEC['plan'][0] == {'bar': 0, 'variant': 'A'}
    assert all(p['bar'] % 2 == 0 for p in SPEC['plan'])
    assert all(0 <= p['bar'] < SPEC['bars'] for p in SPEC['plan'])
    assert [p['bar'] for p in SPEC['plan']] == sorted(p['bar'] for p in SPEC['plan'])
    for part in SPEC['tracks']:
        assert part['enter'] % 2 == 0
        assert set(part['variants']) == set(HARMONY)
        lo, hi = part['range']
        for cell in part['variants'].values():
            assert cell
            for pos, length, notes, velocity, art in cell:
                assert 0 <= pos < 32 and 0 < length and pos+length <= 32
                assert 1 <= velocity <= 127
                assert art in (None, 'sus', 'mute', 'choke')
                pitches = notes if isinstance(notes, list) else [notes]
                assert all(lo <= pitch <= hi for pitch in pitches)
    for part in SPEC['tracks'][:2]:
        assert part['variants']['A'] == part['variants']['B'] == part['variants']['C']


validate()

if __name__ == '__main__':
    print('Bootheel Loop: 540 bars, 144 BPM, 900 seconds; all cells validated.')
