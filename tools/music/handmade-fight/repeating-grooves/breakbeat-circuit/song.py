"""Breakbeat Circuit: an original repeating drum-and-bass groove.

The two-bar, GM-scored broken beat is never replaced or interrupted. An
additional low kick, short bass pedal, clipped chord and two-note counter
pulse enter in that order. E minor/C major switch only after 128 bars.
There are no sampled breaks, fills, scale runs, solos or bespoke sections.
"""


def event(pos, length, pitch, velocity):
    return [pos, length, pitch, velocity, None]


drums = []
for p in (0, 6, 10, 16, 22, 27):
    drums.append(event(p, .75, 36, 116 if p in (0, 16) else 102))
for p in (4, 12, 20, 28):
    drums.append(event(p, .9, 38, 112 if p in (12, 28) else 105))
for p in (7, 15, 23, 31):
    drums.append(event(p, .55, 38, 43 if p in (7, 23) else 52))
for p in range(0, 32, 2):
    drums.append(event(p, .65, 42, 76 if p % 8 == 2 else 59))
# A fixed pair of quiet, tight sixteenth hats makes the cell feel broken
# without adding variation on successive repeats.
for p in (9, 25):
    drums.append(event(p, .5, 42, 43))

extra = [event(p, .65, 36, 88 if p in (14, 30) else 76)
         for p in (3, 14, 18, 30)]


def bass(root):
    rhythm = [(0, 2.7, 0), (3, 1.2, 0), (6, 1.6, 7), (8, 2.5, 12),
              (11, 1.2, 0), (14, 1.5, 0), (16, 2.7, 0), (20, 1.2, 7),
              (22, 2.2, 12), (26, 1.5, 0), (29, 2., 0)]
    return [event(p, length, root+offset, 108 if p in (0, 16) else 96)
            for p, length, offset in rhythm]


def stabs(notes):
    return [event(p, .9 if p in (6, 22) else 1.3, notes,
                  89 if p in (6, 22) else 78)
            for p in (2, 6, 14, 18, 22, 30)]


# Low, fixed E/G common tones over Em and C. The listener follows the drum
# rhythm and bass, with no high solo instrument sitting above the groove.
pulse = [event(p, .75, 52 if i % 2 == 0 else 55, 84 if i % 3 == 0 else 74)
         for i, p in enumerate((0, 3, 8, 16, 19, 24))]

SPEC = {
    'title': 'Breakbeat Circuit - 15 minute broken-beat groove',
    'slug': 'breakbeat-circuit', 'genre': 'drum and bass / broken beat',
    'bpm': 168, 'bars': 630, 'pattern_bars': 2,
    'key': 'E minor / C major colour',
    'plan': [
        {'bar': 0, 'variant': 'A'},
        {'bar': 128, 'variant': 'B'},
        {'bar': 256, 'variant': 'A'},
        {'bar': 384, 'variant': 'B'},
        {'bar': 512, 'variant': 'A'},
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
        {'name': 'Circuit Bass', 'sound': 'local_spring_bass', 'role': 'bass',
         'enter': 4, 'target_db': -22., 'range': [28, 55],
         'lowcut_hz': 30, 'highcut_hz': 3800,
         'variants': {'A': bass(28), 'B': bass(36)}},
        {'name': 'Clipped Chords', 'sound': 'local_pulse_chords', 'role': 'keys',
         'enter': 6, 'target_db': -26., 'range': [48, 76], 'pan': -.15,
         'lowcut_hz': 190, 'highcut_hz': 6500,
         'variants': {'A': stabs([52, 55, 59]), 'B': stabs([48, 52, 55])}},
        {'name': 'Counter Pulse', 'sound': 'local_pluck_hook', 'role': 'rhythm',
         'enter': 8, 'target_db': -28., 'range': [48, 76], 'pan': .18,
         'lowcut_hz': 210, 'highcut_hz': 6100,
         'variants': {'A': pulse, 'B': pulse}},
    ],
}
