"""Steel Tread: five additive layers, two-bar cells, fifteen minutes.

The drummer repeats the same cell throughout. A second kick part enters at
bar 2, bass at 4, low distorted chugs at 6, upper distorted stabs at 8.
Only the pitched centre changes, at long 96-128-bar boundaries. There is
no lead melody, scale run, solo, drum fill, or bespoke through-composed form.
Native guitar timbres come from the captured Shreddage/metal_rhythm amp.
"""

from copy import deepcopy


def hit(position, length, pitch, velocity, articulation=None):
    return [position, length, pitch, velocity, articulation]


# One and three on the kick; two and four on the snare. Eighth-note hats
# anchor a recognisable, unchanging 4/4 pocket rather than a wash of crashes.
DRUMS = []
for bar in (0, 16):
    DRUMS += [hit(bar + p, 1.0, 36, 116) for p in (0, 8)]
    DRUMS += [hit(bar + p, 1.0, 38, 115) for p in (4, 12)]
    DRUMS += [hit(bar + p, .8, 42, 84 if p % 4 == 0 else 68)
              for p in range(0, 16, 2)]

# These kicks land BETWEEN the first drummer's kicks. No duplicated
# downbeat transient: the quieter extra foot completes the driving pattern.
EXTRA_KICK = [hit(p, .9, 36, 99 if p % 8 == 6 else 91)
              for p in (3, 6, 10, 14, 19, 22, 26, 30)]


def bass_cell(root):
    """A repeated root/fifth pedal, locked to the heavy chugs."""
    return [hit(p, 1.55, root + (7 if p in (14, 30) else 0),
                110 if p % 8 == 0 else 101)
            for p in range(0, 32, 2)]


def low_guitar(root):
    """A single palm-muted power chord, identical on every eighth note."""
    return [hit(p, 1.5, [root, root + 7], 114 if p % 8 == 0 else 104, 'mute')
            for p in range(0, 32, 2)]


def upper_guitar(root):
    """Four offbeat chords, a counter-rhythm rather than a solo."""
    # Three sustained octave/fifth stabs and one compact minor-third/fifth
    # voicing state E minor / A minor without adding a tune above the riff.
    return [hit(3, 3.0, [root + 12, root + 19], 103, 'sus'),
            hit(11, 3.0, [root + 12, root + 19], 100, 'sus'),
            hit(19, 3.0, [root + 15, root + 19], 101, 'sus'),
            hit(27, 3.0, [root + 12, root + 19], 104, 'sus')]


SPEC = {
    'title': 'Steel Tread - 15 minute metal groove',
    'slug': 'steel-tread',
    'genre': 'heavy metal',
    'bpm': 160,
    'bars': 600,
    'pattern_bars': 2,
    'key': 'E minor',
    'plan': [
        {'bar': 0, 'variant': 'A'},
        {'bar': 128, 'variant': 'B'},
        {'bar': 256, 'variant': 'A'},
        {'bar': 384, 'variant': 'B'},
        {'bar': 480, 'variant': 'A'},
    ],
    'tracks': [
        {
            'name': 'Drum Bed', 'sound': 'drums', 'role': 'drums',
            'enter': 0, 'target_db': -18, 'range': [0, 127],
            'lowcut_hz': 30, 'highcut_hz': 14500,
            'variants': {'A': deepcopy(DRUMS), 'B': deepcopy(DRUMS)},
        },
        {
            'name': 'Extra Kick', 'sound': 'drums', 'role': 'drums',
            'enter': 2, 'target_db': -24, 'range': [0, 127],
            'lowcut_hz': 35, 'highcut_hz': 6500,
            'variants': {'A': deepcopy(EXTRA_KICK), 'B': deepcopy(EXTRA_KICK)},
        },
        {
            'name': 'Bass', 'sound': 'bass', 'role': 'bass',
            'enter': 4, 'target_db': -23, 'range': [28, 55],
            'lowcut_hz': 32, 'highcut_hz': 4000,
            'variants': {'A': bass_cell(28), 'B': bass_cell(33)},
        },
        {
            'name': 'Guitar One', 'sound': 'metal_rhythm', 'role': 'rhythm',
            'enter': 6, 'target_db': -22, 'range': [40, 76],
            'double': True, 'lowcut_hz': 90, 'highcut_hz': 7200,
            'variants': {'A': low_guitar(40), 'B': low_guitar(45)},
        },
        {
            'name': 'Guitar Two', 'sound': 'metal_rhythm', 'role': 'rhythm',
            'enter': 8, 'target_db': -25, 'range': [40, 76],
            'double': False, 'pan': .18,
            'lowcut_hz': 150, 'highcut_hz': 7600,
            'variants': {'A': upper_guitar(40), 'B': upper_guitar(45)},
        },
    ],
}


def validate():
    assert SPEC['bars'] * 4 * 60 / SPEC['bpm'] == 900
    assert [t['enter'] for t in SPEC['tracks']] == [0, 2, 4, 6, 8]
    assert SPEC['tracks'][0]['variants']['A'] == SPEC['tracks'][0]['variants']['B']
    assert SPEC['tracks'][1]['variants']['A'] == SPEC['tracks'][1]['variants']['B']
    assert {e[0] for e in DRUMS if e[2] == 36}.isdisjoint(e[0] for e in EXTRA_KICK)
    for i, phase in enumerate(SPEC['plan']):
        end = SPEC['plan'][i + 1]['bar'] if i + 1 < len(SPEC['plan']) else SPEC['bars']
        assert phase['bar'] % 2 == 0 and 96 <= end - phase['bar'] <= 160
    for track in SPEC['tracks']:
        for variant, events in track['variants'].items():
            assert variant in ('A', 'B') and events
            for pos, length, pitches, velocity, art in events:
                assert 0 <= pos < 32 and length > 0 and pos + length <= 32
                assert 1 <= velocity <= 127 and art in (None, 'mute', 'sus')
                for pitch in [pitches] if isinstance(pitches, int) else pitches:
                    assert track['range'][0] <= pitch <= track['range'][1], (track['name'], pitch)
    return True


validate()

if __name__ == '__main__':
    import json
    print(json.dumps(SPEC, indent=2))
