"""Short-cell versions of Spark Rush's approved electronic instruments.

Only the notes supplied by the score are rendered. This module has no song,
tempo, studio or full-length-song dependency and performs no normalisation.
The caller repeats the rendered cells and balances the resulting stems.
"""
import math

import numpy as np
from scipy import signal


SOUNDS = {
    'local_spring_bass': 'bass',
    'local_pulse_chords': 'chord',
    'local_pluck_hook': 'hook',
}


def _envelope(count, held, kind, sr):
    t = np.arange(count, dtype=np.float64) / sr
    attack = .003 if kind == 'bass' else .002
    release = .07 if kind == 'bass' else .10
    env = np.minimum(1., t / attack)
    if kind == 'bass':
        env *= .63 + .37 * np.exp(-t * 22)
    elif kind == 'chord':
        env *= .18 + .82 * np.exp(-t * 12)
    else:
        env *= .09 + .91 * np.exp(-t * 16)
    mask = t > held
    env[mask] *= np.maximum(0., 1 - (t[mask] - held) / release) ** 2
    return env


def _tone(pitch, held, kind, sr):
    count = max(1, int(math.ceil((held + (.07 if kind == 'bass' else .10)) * sr)))
    t = np.arange(count, dtype=np.float64) / sr
    fundamental = 440 * 2 ** ((pitch - 69) / 12)
    out = np.zeros(count, dtype=np.float64)
    if kind == 'bass':
        for harmonic in range(1, 13):
            if fundamental * harmonic >= sr * .44:
                break
            out += (np.sin(2 * np.pi * fundamental * harmonic * t + .17 * harmonic)
                    / harmonic ** 1.25 * np.exp(-t * (harmonic - 1) * 3.5))
        # A rounded, fat low fundamental underneath the plucked harmonics.
        out = np.tanh(out * 1.6) * .65 + .30 * np.sin(2 * np.pi * fundamental * t)
    else:
        # Three narrowly detuned harmonic bodies give a string-like attack.
        # The higher partials die fastest: this never becomes a breathy sine lead.
        for cents, weight in ((-6, .30), (0, .44), (6, .30)):
            frequency = fundamental * 2 ** (cents / 1200)
            for harmonic in range(1, 11):
                if frequency * harmonic >= sr * .44:
                    break
                out += (weight * np.sin(2 * np.pi * frequency * harmonic * t
                                       + .21 * harmonic + (pitch % 3) * .13)
                        / harmonic * np.exp(-t * (harmonic - 1) * (4 if kind == 'hook' else 5)))
        out = np.tanh(out * 1.35)
    return (out * _envelope(count, held, kind, sr)).astype(np.float32)


def _add(audio, note, onset, velocity, pan, sr):
    start = int(round(onset * sr))
    skip = max(0, -start)
    start = max(0, start)
    size = min(len(note) - skip, audio.shape[1] - start)
    if size <= 0:
        return
    played = note[skip:skip + size] * (velocity / 127) ** 1.3
    audio[0, start:start + size] += played * math.sqrt((1 - pan) / 2)
    audio[1, start:start + size] += played * math.sqrt((1 + pan) / 2)


def _synth(track, kind, frames, bpm, sr):
    audio = np.zeros((2, frames), dtype=np.float32)
    cache = {}
    for start, duration, pitch, velocity, keyswitch in track['notes']:
        if keyswitch:
            continue
        held = round(float(duration), 4)
        key = (int(pitch), held)
        if key not in cache:
            cache[key] = _tone(int(pitch), held, kind, sr)
        pan = 0 if kind == 'bass' else ((int(pitch) % 5) - 2) * (.11 if kind == 'chord' else .04)
        _add(audio, cache[key], float(start), int(velocity), pan, sr)
    if kind != 'bass':
        dry = audio.copy()
        delay = int(round(sr * 60 / bpm * .75))
        for repeat, gain in ((1, .08), (2, .025)):
            shift = delay * repeat
            if 0 < shift < frames:
                audio[:, shift:] += dry[::-1, :frames - shift] * gain
        cutoff = min(6700 if kind == 'hook' else 5200, sr * .44)
        sos = signal.butter(2, [210, cutoff], btype='bandpass', fs=sr, output='sos')
    else:
        sos = signal.butter(2, 28, btype='highpass', fs=sr, output='sos')
    return signal.sosfilt(sos, audio, axis=1).astype(np.float32)


def _punch(track, frames, sr):
    audio = np.zeros((2, frames), dtype=np.float32)
    rng = np.random.default_rng(546)
    t = np.arange(int(.38 * sr), dtype=np.float64) / sr
    phase = 2 * np.pi * (48 * t + (100 - 48) * .018 * (1 - np.exp(-t / .018)))
    kick = (np.sin(phase) * np.exp(-t * 12)
            + .05 * rng.standard_normal(len(t)) * np.exp(-t * 160))
    kick *= np.minimum(1, t / .0007)
    t = np.arange(int(.22 * sr), dtype=np.float64) / sr
    noise = rng.standard_normal(len(t))
    noise = signal.sosfilt(signal.butter(2, [850, min(7500, sr * .44)],
                                          btype='bandpass', fs=sr, output='sos'), noise)
    clap_env = sum(np.exp(-np.maximum(0, t - offset) * 65) * (t >= offset)
                   for offset in (0, .011, .024))
    voices = {36: kick.astype(np.float32), 39: (noise * clap_env * .25).astype(np.float32)}
    for start, _, pitch, velocity, keyswitch in track['notes']:
        if keyswitch:
            continue
        if pitch not in voices:
            raise ValueError('local_club_punch accepts MIDI kick 36 and clap 39 only')
        # The exponent matches Spark Rush's slightly firmer percussion accents.
        scaled_velocity = 127 * (int(velocity) / 127) ** (1.4 / 1.3)
        _add(audio, voices[pitch], float(start), scaled_velocity, 0, sr)
    return audio


def render_builtin(track_json, sound, frames, bpm, sr=44100):
    """Return finite stereo float32 audio for an exported short-cell track.

    Notes are (start_seconds, duration_seconds, pitch, velocity, is_keyswitch).
    No notes, patterns, levels or tempo changes are generated by this function.
    """
    frames, sr = int(frames), int(sr)
    if frames <= 0 or sr < 8000 or not math.isfinite(bpm) or bpm <= 0:
        raise ValueError('positive frames/BPM and a sample rate of at least 8 kHz are required')
    if sound == 'local_club_punch':
        audio = _punch(track_json, frames, sr)
    elif sound in SOUNDS:
        audio = _synth(track_json, SOUNDS[sound], frames, float(bpm), sr)
    else:
        raise ValueError('unsupported loop voice: ' + str(sound))
    assert audio.shape == (2, frames) and audio.dtype == np.float32
    assert np.isfinite(audio).all()
    return audio
