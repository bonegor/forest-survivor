"""Validate short groove cells and export expanded native/portable scores.

JSON keeps Shreddage keyswitches for the native renderer. The companion MIDI
uses explicit General MIDI instruments and removes those articulation notes.
The score is expanded from the cells; it does not invent a through-composed
melody. A tiny final-beat tempo correction removes integer-MIDI-tempo drift
so an integral-bar fifteen-minute score ends at exactly 900 seconds.
"""
import json
import math
import os
import struct
import sys
from fractions import Fraction
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import Song, SHREDDAGE_KS, safe_name

SR = 44100
PPQ = 480


def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _shreddage(track):
    sound = str(track.get('source_sound', track['sound'])).lower()
    return bool(track.get('keyswitches')) or 'metal' in sound or 'clean' in sound or any(
        event[4] is not None for events in track['variants'].values() for event in events)


def arrangement_audit(spec):
    """Measure actual one-bar note/rhythm repetitions, ignoring renamed cells or velocities."""
    def bar_signature(bar, pitched_only):
        variant = next(p['variant'] for p in reversed(spec['plan']) if p['bar'] <= bar)
        local = (bar % 2) * 16
        result = []
        for track in spec['tracks']:
            if bar < track['enter'] or (pitched_only and track['role'] == 'drums'):
                continue
            notes = []
            for pos, length, pitches, _, art in track['variants'][variant]:
                if pos >= local + 16 or pos + length <= local:
                    continue
                pitches = [pitches] if isinstance(pitches, int) else sorted(pitches)
                notes.append((round(pos - local, 6), round(length, 6), tuple(pitches), art))
            if notes:
                result.append((track['name'], tuple(sorted(notes))))
        return tuple(result)
    def longest(pitched_only):
        start = max(t['enter'] for t in spec['tracks']) if pitched_only else 0
        previous, run, maximum = None, 0, 0
        for bar in range(start, spec['bars']):
            signature = bar_signature(bar, pitched_only)
            run = run + 1 if signature == previous else 1
            maximum = max(maximum, run)
            previous = signature
        return maximum
    ends = [p['bar'] for p in spec['plan'][1:]] + [spec['bars']]
    holds = [end - p['bar'] for p, end in zip(spec['plan'], ends)]
    return dict(max_planned_hold_bars=max(holds),
                max_identical_audible_bar_run=longest(False),
                max_identical_pitched_bar_run=longest(True),
                plan_holds=sorted(set(holds)), planned_segments=len(holds))


def validate_spec(spec, full_length=True):
    """Check the repeating arrangement contract; return the unchanged spec."""
    assert spec['pattern_bars'] == 2, 'Only two-bar cells are supported'
    bars, bpm = spec['bars'], spec['bpm']
    assert isinstance(bars, int) and bars > 0 and bars % 2 == 0, 'Even positive bar count required'
    assert _number(bpm) and bpm > 0
    seconds = Fraction(bars * 240) / Fraction(str(bpm))
    if full_length:
        assert seconds == 900, ('Expected exactly 900 seconds', float(seconds))
    cycle_frames = Fraction(SR * 2 * 240) / Fraction(str(bpm))
    assert cycle_frames.denominator == 1, ('Cell must contain an integral sample count', cycle_frames)
    plan = spec['plan']
    assert plan and plan[0]['bar'] == 0
    starts = [phase['bar'] for phase in plan]
    assert starts == sorted(set(starts)), 'Plan starts must be unique and ordered'
    assert all(isinstance(b, int) and 0 <= b < bars and b % 2 == 0 for b in starts)
    variants = {phase['variant'] for phase in plan}
    tracks = spec['tracks']
    assert tracks and len({t['name'] for t in tracks}) == len(tracks), 'Unique tracks required'
    for track in tracks:
        assert isinstance(track['enter'], int) and 0 <= track['enter'] < bars and track['enter'] % 2 == 0
        assert variants <= track['variants'].keys(), (track['name'], 'missing variant')
        lo, hi = track['range']
        assert 0 <= lo <= hi <= 127
        if _shreddage(track):
            lo, hi = max(lo, 40), min(hi, 76)
        elif 'acoustic' in str(track.get('source_sound', track['sound'])).lower():
            lo, hi = max(lo, 40), min(hi, 84)
        for events in track['variants'].values():
            assert events, (track['name'], 'empty cell')
            for event in events:
                assert len(event) == 5
                pos, length, notes, velocity, art = event
                assert _number(pos) and _number(length) and 0 <= pos < 32 and length > 0
                assert pos + length <= 32 + 1e-9, (track['name'], event)
                assert isinstance(velocity, int) and 1 <= velocity <= 127
                assert art in (None, 'sus', 'mute', 'choke')
                pitches = [notes] if isinstance(notes, int) else notes
                assert isinstance(pitches, (list, tuple)) and pitches
                assert all(isinstance(p, int) and lo <= p <= hi for p in pitches), (track['name'], pitches, lo, hi)
    # Full arrangements begin with these two unchanging percussion layers.
    # Native cell-only exports can contain a single bass/guitar track.
    for track in tracks[:2]:
        if track['role'] == 'drums' and spec.get('arrangement') != 'cycled':
            cells = list(track['variants'].values())
            assert all(cell == cells[0] for cell in cells[1:]), (track['name'], 'drum bed changes')
    if full_length and spec.get('arrangement') == 'cycled':
        audit = arrangement_audit(spec)
        assert set(audit['plan_holds']) <= {2, 4}, audit
        assert audit['max_identical_audible_bar_run'] <= 4, audit
        assert audit['max_identical_pitched_bar_run'] <= 4, audit
    return spec


def _vlq(value):
    assert value >= 0
    data = [value & 127]
    while value >> 7:
        value >>= 7
        data.insert(0, (value & 127) | 128)
    return bytes(data)


def _meta(kind, payload):
    return b'\xff' + bytes([kind]) + _vlq(len(payload)) + payload


def _timing(bpm, seconds):
    ticks = round(seconds * bpm / 60 * PPQ)
    tempo = round(60000000 / bpm)
    change_tick = max(0, ticks - PPQ)
    # An integer-bar score has an integer number of quarter notes. Altering
    # only its final beat by a few microseconds makes the MIDI duration exact.
    last_ticks = ticks - change_tick
    last_tempo = round((round(seconds * 1000000) * PPQ - change_tick * tempo) / last_ticks)
    assert ticks > 0 and 0 < last_tempo < 16777216
    return ticks, tempo, change_tick, last_tempo


def _tempo_events(bpm, seconds):
    end, tempo, change_tick, last_tempo = _timing(bpm, seconds)
    events = [(0, -30, _meta(0x51, tempo.to_bytes(3, 'big'))),
              (0, -29, _meta(0x58, bytes([4, 2, 24, 8])))]
    if last_tempo != tempo:
        events.append((change_tick, -30, _meta(0x51, last_tempo.to_bytes(3, 'big'))))
    return end, events


def _chunk(events, end_tick):
    events = list(events) + [(end_tick, 100, b'\xff\x2f\x00')]
    data, previous = bytearray(), 0
    for tick, _, message in sorted(events, key=lambda event: (event[0], event[1])):
        data.extend(_vlq(tick - previous))
        data.extend(message)
        previous = tick
    return b'MTrk' + struct.pack('>I', len(data)) + data


def _part_events(track_json, bpm, program, seconds, channel):
    assert isinstance(channel, int) and 0 <= channel <= 15
    assert isinstance(program, int) and 0 <= program <= 127
    end_tick = _timing(bpm, seconds)[0]
    cc = 0xb0 | channel
    events = [(0, -20, _meta(3, track_json.get('name', 'Instrument').encode('utf8'))),
              (0, -10, bytes([cc, 0, 0])), (0, -9, bytes([cc, 32, 0])),
              (0, -8, bytes([0xc0 | channel, program])),
              (0, -7, bytes([cc, 7, 100])), (0, -6, bytes([cc, 10, 64]))]
    for start, duration, pitch, velocity, keyswitch in track_json['notes']:
        if keyswitch or start >= seconds:
            continue
        on = max(0, min(end_tick - 1, round(start * bpm / 60 * PPQ)))
        off = min(end_tick, max(on + 1, round(min(seconds, start + duration) * bpm / 60 * PPQ)))
        events.append((on, 20, bytes([0x90 | channel, int(pitch), int(velocity)])))
        events.append((off, 10, bytes([0x80 | channel, int(pitch), 0])))
    return events


def write_part_midi(track_json, bpm, program, path, seconds, channel=0):
    """Write one explicit-bank/program part, omitting native keyswitches."""
    end, tempo_events = _tempo_events(bpm, seconds)
    events = tempo_events + _part_events(track_json, bpm, program, seconds, channel)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ) + _chunk(events, end))
    return path


def _program(track, genre):
    if 'gm_program' in track:
        return int(track['gm_program'])
    sound = str(track.get('source_sound', track['sound'])).lower()
    name = track['name'].lower()
    if track['role'] == 'drums': return 0
    if 'banjo' in sound or 'banjo' in name: return 105
    if 'acoustic' in sound or 'acoustic' in name: return 25
    if 'clean' in sound or 'twang' in name: return 27
    if 'metal' in sound or ('guitar' in name and 'metal' in genre.lower()): return 30
    if 'spring_bass' in sound: return 38
    if track['role'] == 'bass': return 33
    if 'piano' in sound or 'piano' in name: return 0
    if 'pluck' in sound or 'pulse' in name: return 80
    return 81


def export_score(spec, directory, *, full_length=None):
    """Expand a SPEC into native song.json and a portable GM MIDI; return JSON.

    The two-argument form accepts either the full 900-second arrangement or
    an at-most-16-bar cell-render score. Set full_length explicitly to override.
    """
    if full_length is None:
        full_length = spec['bars'] > 16
    validate_spec(spec, full_length=full_length)
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    bpm, bars = spec['bpm'], spec['bars']
    seconds = bars * 240 / bpm
    song = Song(spec['title'], bpm=bpm, seed=spec.get('seed', 1), target_lufs=-13)
    genre = spec.get('genre', '').lower()
    song.master.update(tail_sec=0, glue=not any(s in genre for s in ('electronic', 'break', 'drum and bass')),
                       limiter_oversample=4)
    channel = 0
    for track in spec['tracks']:
        is_drum = track['role'] == 'drums'
        while channel == 9:
            channel += 1
        keyswitches = track.get('keyswitches')
        keyswitches = keyswitches if isinstance(keyswitches, dict) else SHREDDAGE_KS if _shreddage(track) else None
        song.add_track(track['name'], track['sound'], role=track['role'],
                       channel=9 if is_drum else channel, keyswitches=keyswitches, prange=track['range'])
        if not is_drum:
            channel += 1
        song.mix[track['name']] = 0
    phase = 0
    for cell_bar in range(0, bars, 2):
        while phase + 1 < len(spec['plan']) and spec['plan'][phase + 1]['bar'] <= cell_bar:
            phase += 1
        variant = spec['plan'][phase]['variant']
        for track in spec['tracks']:
            if cell_bar < track['enter']:
                continue
            for pos, length, pitches, velocity, art in track['variants'][variant]:
                song.play(track['name'], cell_bar + int(pos // 16), pos % 16, length, pitches,
                          velocity, art=art, gate=1, hum_ms=0, vel_jitter=0)
    boundaries = sorted({0, bars} | {t['enter'] for t in spec['tracks']} | {p['bar'] for p in spec['plan']})
    for start, end in zip(boundaries, boundaries[1:]):
        variant = next(p['variant'] for p in reversed(spec['plan']) if p['bar'] <= start)
        active = ', '.join(t['name'] for t in spec['tracks'] if t['enter'] <= start)
        song.section(start, end, variant + ': ' + active)
    result = song.export(str(directory))
    result['length_sec'] = seconds
    for section in result['sections']:
        section['start_sec'] = round(section['start_bar'] * 240 / bpm, 9)
        section['end_sec'] = round(section['end_bar'] * 240 / bpm, 9)
    (directory / 'song.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8', newline='\n')
    end, tempo_events = _tempo_events(bpm, seconds)
    conductor = [(0, -40, _meta(3, spec['title'].encode('utf8')))] + tempo_events
    chunks = [_chunk(conductor, end)]
    for track_spec, track_json in zip(spec['tracks'], result['tracks']):
        chunks.append(_chunk(_part_events(track_json, bpm, _program(track_spec, genre), seconds,
                                          track_json['channel']), end))
    midi = directory / (safe_name(spec['title']) + '.mid')
    midi.write_bytes(b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), PPQ) + b''.join(chunks))
    return result
