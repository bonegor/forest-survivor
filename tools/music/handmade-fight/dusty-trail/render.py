"""Render Dusty Trail Stampede with sampled country instruments, without a DAW.

python tools/music/handmade-fight/dusty-trail/render.py --output-root PATH

Requires the music-studio skill and installed acoustic/clean-guitar/bass/drum
plugins. MUSIC_BIN points to the existing FluidSynth + MuseScore General
installation. Every invocation creates a fresh run; source and earlier audio
are preserved. --stems-only leaves mastering to a subsequent review.
"""
import argparse
import hashlib
import json
import math
import os
import shutil
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
PACK = HERE.parent
MUSIC = PACK.parent
SR = 44100
FRAMES = 900 * SR
FLAGS = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name == 'nt' else 0
EXTERNAL = {'country_banjo': 105, 'country_piano': 0}
TARGETS = {
    'acoustic': (-23., -22.), 'clean_gtr': (-27., -23.5),
    'country_banjo': (-28., -24.), 'country_piano': (-28., -24.5),
    'bass': (-22., -21.), 'drums': (-17., -16.),
}
TONES = {
    'acoustic': 'highpass=f=100,lowpass=f=7600,pan=stereo|c0=0.82*c0|c1=0.62*c1',
    'clean_gtr': 'highpass=f=145,lowpass=f=6300,aecho=1:0.9:90:0.12',
    'country_banjo': 'highpass=f=200,lowpass=f=7000,pan=stereo|c0=0.60*c0|c1=0.84*c1',
    'country_piano': 'highpass=f=160,lowpass=f=6500,pan=stereo|c0=0.68*c0|c1=0.78*c1',
    'bass': 'highpass=f=32,lowpass=f=4800',
    'drums': 'highpass=f=32',
}


def command(args, log, env):
    with log.open('w', encoding='utf8') as stream:
        subprocess.run([str(x) for x in args], stdout=stream,
                       stderr=subprocess.STDOUT, env=env, check=True,
                       creationflags=FLAGS)


def vlq(value):
    data = [value & 127]
    while value >> 7:
        value >>= 7
        data.insert(0, (value & 127) | 128)
    return bytes(data)


def write_part_midi(track, bpm, program, path):
    """Single-channel SMF with explicit bank/program, no articulation keyswitches."""
    ppq = 480
    ticks_per_sec = ppq * bpm / 60
    tempo = round(60000000 / bpm)
    events = [(0, -5, b'\xff\x51\x03' + tempo.to_bytes(3, 'big')),
              (0, -4, b'\xff\x58\x04\x04\x02\x18\x08'),
              (0, -3, b'\xb0\x00\x00'), (0, -3, b'\xb0\x20\x00'),
              (0, -2, bytes([0xc0, program])),
              (0, -1, b'\xb0\x07\x64'), (0, -1, b'\xb0\x0a\x40'),
              (0, -1, b'\xb0\x5b\x00'), (0, -1, b'\xb0\x5d\x00')]
    for start, length, pitch, velocity, keyswitch in track['notes']:
        if keyswitch:
            continue
        on = round(start * ticks_per_sec)
        off = max(on + 1, round(min(900, start + length) * ticks_per_sec))
        events += [(on, 1, bytes([0x90, pitch, velocity])),
                   (off, 0, bytes([0x80, pitch, 0]))]
    events.append((round(900 * ticks_per_sec), 2, b'\xff\x2f\x00'))
    last = 0
    data = bytearray()
    for tick, _, event in sorted(events, key=lambda e: (e[0], e[1])):
        data.extend(vlq(tick - last))
        data.extend(event)
        last = tick
    path.write_bytes(b'MThd' + struct.pack('>IHHH', 6, 0, 1, ppq)
                     + b'MTrk' + struct.pack('>I', len(data)) + data)


def measure(path):
    sr, audio = wavfile.read(path, mmap=True)
    assert sr == SR and audio.shape == (FRAMES, 2), (path, sr, audio.shape)
    squares, peak = 0., 0.
    windows = []
    for start in range(0, FRAMES, SR):
        block = np.asarray(audio[start:start + SR], dtype=np.float64)
        assert np.isfinite(block).all(), path
        energy = float(np.sum(block * block))
        squares += energy
        peak = max(peak, float(np.max(np.abs(block))))
        windows.append(math.sqrt(energy / block.size))
    rms = 10 * math.log10(max(squares / (FRAMES * 2), 1e-20))
    windows = np.asarray(windows)
    active = windows[windows > max(.00001, windows.max() * .06)]
    assert len(active) and rms > -75, (path, rms)
    active_db = 20 * math.log10(float(np.median(active)))
    return dict(rms_db=round(rms, 3), active_median_db=round(active_db, 3),
                peak_db=round(20 * math.log10(max(peak, 1e-12)), 3),
                active_seconds=len(active), samples=FRAMES)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-root', type=Path, default=MUSIC / 'out/dusty-trail')
    parser.add_argument('--stems-only', action='store_true')
    args = parser.parse_args()
    skill = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
    original = Path(os.environ.get('MUSIC_STUDIO_HOME', Path.home() / 'Music/MusicStudio'))
    binaries = Path(os.environ.get('MUSIC_BIN', MUSIC / 'bin'))
    fluid = binaries / 'fluidsynth/fluidsynth.exe'
    font = binaries / 'MuseScore_General.sf3'
    assert fluid.is_file() and font.is_file(), 'Set MUSIC_BIN to installed FluidSynth/MuseScore General directory'
    cfg = json.loads((original / 'sounds.json').read_text())
    cfg['sample_rate'] = SR
    for sound in cfg['sounds'].values():
        for entry in (sound, sound.get('fx', {})):
            if entry.get('state') and not Path(entry['state']).is_absolute():
                entry['state'] = str(original / entry['state'])
    for sound, program in EXTERNAL.items():
        cfg['sounds'][sound] = dict(plugin='external_sf3', kind='sampled',
                                    gain_db=0, state='', soundfont=str(font),
                                    bank=0, program=program)
    args.output_root.mkdir(parents=True, exist_ok=True)
    version = 1
    while (args.output_root / f'run-v{version}').exists():
        version += 1
    run = args.output_root / f'run-v{version}'
    folder = run / 'dusty-trail'
    folder.mkdir(parents=True)
    for source in HERE.glob('*.py'):
        shutil.copy2(source, folder / source.name)
    studio = run / 'studio'
    studio.mkdir()
    config = studio / 'sounds.json'
    config.write_text(json.dumps(cfg, indent=2) + '\n')
    env = dict(os.environ, MUSIC_STUDIO_HOME=str(studio), MUSIC_STUDIO_SKILL=str(skill))
    (args.output_root / 'latest-run.json').write_text(json.dumps(dict(run=str(run)), indent=2) + '\n')
    print('RUN', run, flush=True)
    export = folder / 'export'
    command([sys.executable, folder / 'song.py', export], folder / 'export.log', env)
    song = json.loads((export / 'song.json').read_text())
    assert song['length_sec'] == 900 and song['bpm'] == 144 and len(song['tracks']) == 6
    stems = export / 'stems'
    stems.mkdir()
    rawdir = export / 'raw-stems'
    rawdir.mkdir()
    reports = []
    for track in song['tracks']:
        name, sound = track['name'], track['sound']
        print('RENDERING', name, flush=True)
        raw = rawdir / (name + '.wav')
        stem = stems / (name + '.wav')
        if sound in EXTERNAL:
            midi = folder / (name + '.mid')
            write_part_midi(track, song['bpm'], EXTERNAL[sound], midi)
            command([fluid, '-ni', '-F', raw, '-T', 'wav', '-O', 'float', '-r', SR,
                     '-g', '.6', '-R', '0', '-C', '0', font, midi], folder / (name + '-render.log'), env)
        else:
            command([sys.executable, skill / 'scripts/render.py', export, '--tracks', name],
                    folder / (name + '-render.log'), env)
            stem.rename(raw)
        filters = TONES[sound] + f',apad=whole_len={FRAMES},atrim=end_sample={FRAMES}'
        command(['ffmpeg', '-nostdin', '-v', 'error', '-i', raw, '-af', filters,
                 '-ar', SR, '-ac', '2', '-c:a', 'pcm_f32le', stem], folder / (name + '-tone.log'), env)
        stats = measure(stem)
        target, active_target = TARGETS[sound]
        # Cap sparse melodic parts by their sounding bars as well as full-song RMS.
        total_gain = min(target - stats['rms_db'], active_target - stats['active_median_db'])
        total_gain = round(float(np.clip(total_gain, -24, 18)), 3)
        cfg['sounds'][sound]['gain_db'] = total_gain - song['mix'].get(name, 0)
        record = dict(name=name, sound=sound, **stats, total_mix_gain_db=total_gain,
                      mixed_rms_db=round(stats['rms_db'] + total_gain, 3))
        reports.append(record)
        config.write_text(json.dumps(cfg, indent=2) + '\n')
        print('SAVED', json.dumps(record), flush=True)
    provenance = dict(soundfont='MuseScore General 0.2 / FluidR3', license='MIT',
                      soundfont_sha256=hashlib.sha256(font.read_bytes()).hexdigest(),
                      external_programs=EXTERNAL, stems=reports)
    (folder / 'stems-report.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print('ALL STEMS READY', folder, flush=True)
    if not args.stems_only:
        sys.path.insert(0, str(PACK))
        from finish_suites import finish
        report = finish(folder, cfg)
        report['instrument_report'] = str(folder / 'stems-report.json')
        (folder / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        Path(report['mp3']).with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
        (run / 'finished.json').write_text(json.dumps([report], indent=2) + '\n')
        print('READY', report['mp3'], flush=True)


if __name__ == '__main__':
    main()
