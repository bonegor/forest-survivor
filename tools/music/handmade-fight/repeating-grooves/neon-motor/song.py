"""Neon Motor: an original, deliberately repetitive club groove.

Two bars are the entire musical unit. The same drum and extra-kick cells
continue for fifteen minutes. Layers enter every two bars, then Am/F colour
changes only after 128 bars. There is no lead tune, solo or melodic build.
"""


def event(pos, length, pitch, velocity):
    return [pos, length, pitch, velocity, None]


drums = []
for bar in (0, 16):
    for p in (0, 4, 8, 12):
        drums.append(event(bar+p, .8, 36, 115 if p in (0, 8) else 108))
    for p in (4, 12):
        drums.append(event(bar+p, .9, 38, 103))
    for p in (2, 6, 10, 14):
        drums.append(event(bar+p, .8, 42, 79 if p in (2, 10) else 69))
    for p in (0, 8):
        drums.append(event(bar+p, .55, 42, 49))

# These pickups sit between the four main kicks, rather than doubling them.
extra = [event(p, .7, 36, 83 if p % 16 == 6 else 74) for p in (6, 14, 22, 30)]


def bass(root):
    return [event(p, 1.55 if p != 0 else 1.8,
                  root+7 if p in (14, 30) else root, 102 if p % 8 == 2 else 94)
            for p in (0, 2, 6, 10, 14, 18, 22, 26, 30)]


def chords(notes):
    return [event(p, 1.15, notes, 88 if p % 8 == 2 else 78)
            for p in (2, 6, 10, 14, 18, 22, 26, 30)]


# Exactly two pitches, common tones of both harmonies; this is a rhythmic
# counter-layer, not a melody moving through the scale.
pulse = [event(p, .9, 57 if i % 2 == 0 else 60, 83 if i % 3 == 0 else 73)
         for i, p in enumerate((0, 6, 12, 16, 22, 28))]

SPEC = {
    'title': 'Neon Motor - 15 minute electronic groove',
    'slug': 'neon-motor', 'genre': 'electronic club', 'bpm': 128,
    'bars': 480, 'pattern_bars': 2, 'key': 'A minor / F major colour',
    'plan': [
        {'bar': 0, 'variant': 'A'},
        {'bar': 128, 'variant': 'B'},
        {'bar': 256, 'variant': 'A'},
        {'bar': 384, 'variant': 'B'},
    ],
    'tracks': [
        {'name': 'Drum Bed', 'sound': 'drums', 'role': 'drums',
         'enter': 0, 'target_db': -18., 'range': [36, 46],
         'lowcut_hz': 32, 'highcut_hz': 12000,
         'variants': {'A': drums, 'B': drums}},
        {'name': 'Extra Kick', 'sound': 'local_club_punch', 'role': 'drums',
         'enter': 2, 'target_db': -24., 'range': [36, 39],
         'lowcut_hz': 35, 'highcut_hz': 7500,
         'variants': {'A': extra, 'B': extra}},
        {'name': 'Motor Bass', 'sound': 'local_spring_bass', 'role': 'bass',
         'enter': 4, 'target_db': -22., 'range': [28, 55],
         'lowcut_hz': 30, 'highcut_hz': 3600,
         'variants': {'A': bass(33), 'B': bass(29)}},
        {'name': 'Offbeat Chords', 'sound': 'local_pulse_chords', 'role': 'keys',
         'enter': 6, 'target_db': -26., 'range': [48, 76], 'pan': -.12,
         'lowcut_hz': 190, 'highcut_hz': 6500,
         'variants': {'A': chords([57, 60, 64]), 'B': chords([53, 57, 60])}},
        {'name': 'Two Note Pulse', 'sound': 'local_pluck_hook', 'role': 'rhythm',
         'enter': 8, 'target_db': -28., 'range': [48, 76], 'pan': .18,
         'lowcut_hz': 210, 'highcut_hz': 6200,
         'variants': {'A': pulse, 'B': pulse}},
    ],
}
