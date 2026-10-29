"""Render short instrument cells once, repeat them, then master four 15-minute grooves.

python render.py --slugs steel-tread --output-root PATH
Without --slugs all four pieces render. Nothing plays through the speakers.
"""
import argparse
import copy
import hashlib
import json
import math
import os
import runpy
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
PACK = HERE.parent
MUSIC = PACK.parent
SR = 44100
FRAMES = 900 * SR
SLUGS = ('steel-tread', 'bootheel-loop', 'neon-motor', 'breakbeat-circuit')
FLAGS = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name == 'nt' else 0
REPEATS = 4


def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf8', newline='\n')


def command(args, log, env):
    with log.open('w', encoding='utf8') as stream:
        subprocess.run([str(x) for x in args], stdout=stream, stderr=subprocess.STDOUT,
                       env=env, check=True, creationflags=FLAGS)


def level(audio):
    return 10 * math.log10(max(float(np.mean(audio.astype(np.float64) ** 2)), 1e-20))


def variant_at(spec, bar):
    return next(p['variant'] for p in reversed(spec['plan']) if p['bar'] <= bar)


def shape_percussion(spec, track, head, cycle):
    """Round electronic drum transients before the full-mix limiter reacts to them."""
    before = float(np.max(np.abs(cycle)))
    enabled = track['role'] == 'drums' and any(
        word in spec['genre'].lower() for word in ('electronic', 'break', 'broken'))
    if not enabled or before <= 10 ** (-4 / 20):
        return head, cycle, dict(applied=False)
    def rounded(audio):
        up = signal.resample_poly(audio, 4, 1, axis=1)
        soft = .5 * np.tanh(up / .5)
        return signal.resample_poly(soft, 1, 4, axis=1)[:, :audio.shape[1]].astype(np.float32)
    head, cycle = rounded(head), rounded(cycle)
    makeup = 10 ** ((track['target_db'] - level(cycle)) / 20)
    head *= np.float32(makeup)
    cycle *= np.float32(makeup)
    return head, cycle, dict(applied=True, method='4x oversampled tanh at -6 dBFS, RMS matched',
                             original_peak_db=round(20 * math.log10(before), 3),
                             makeup_db=round(20 * math.log10(makeup), 3))


def render_cell(spec, track, variant, directory, cfg, skill, binaries, env,
                audio_override=None, provenance_override=None):
    """Four repetitions let the sampled strings/effects reach a cyclic state."""
    from pattern_score import export_score, write_part_midi
    from loop_voices import render_builtin
    directory.mkdir(exist_ok=True)
    loop_seconds = spec['pattern_bars'] * 240 / spec['bpm']
    count = round(loop_seconds * SR)
    cell_track = copy.deepcopy(track)
    cell_track['enter'] = 0
    cell_track['variants'] = {'A': track['variants'][variant]}
    cell_spec = dict(spec, bars=spec['pattern_bars'] * REPEATS,
                     plan=[dict(bar=0, variant='A')], tracks=[cell_track])
    # This export is a short playable score, not a synthetic stand-in for native sounds.
    song = export_score(cell_spec, directory / 'export')
    cell_json = song['tracks'][0]
    sound_name = track['sound']
    frames = count * REPEATS
    if audio_override is not None:
        audio = np.asarray(audio_override, dtype=np.float32).copy()
        provenance = provenance_override
    elif sound_name.startswith('local_'):
        audio = render_builtin(cell_json, sound_name, frames, spec['bpm'], SR)
        provenance = 'Original deterministic synthesis'
    elif sound_name == 'country_banjo':
        fluid = binaries / 'fluidsynth/fluidsynth.exe'
        font = binaries / 'MuseScore_General.sf3'
        assert fluid.is_file() and font.is_file(), 'Set MUSIC_BIN to the installed tools/music/bin folder'
        midi = directory / 'banjo.mid'
        write_part_midi(cell_json, spec['bpm'], 105, midi, loop_seconds * REPEATS)
        raw = directory / 'raw.wav'
        command([fluid, '-ni', '-F', raw, '-T', 'wav', '-O', 'float', '-r', SR,
                 '-g', '.6', '-R', '0', '-C', '0', font, midi], directory / 'render.log', env)
        rate, data = wavfile.read(raw)
        assert rate == SR
        audio = data[:frames].T.astype(np.float32)
        provenance = 'MuseScore General 0.2 / FluidR3 Banjo 0:105, MIT'
    else:
        local_cfg = copy.deepcopy(cfg)
        if 'double' in track:
            local_cfg['sounds'][sound_name]['double'] = track['double']
        studio = directory / 'studio'
        studio.mkdir()
        dump(studio / 'sounds.json', local_cfg)
        local_env = dict(env, MUSIC_STUDIO_HOME=str(studio))
        command([sys.executable, skill / 'scripts/render.py', directory / 'export'],
                directory / 'render.log', local_env)
        raw = next((directory / 'export/stems').glob('*.wav'))
        rate, data = wavfile.read(raw)
        assert rate == SR
        audio = data[:frames].T.astype(np.float32)
        provenance = cfg['plugins'][cfg['sounds'][sound_name]['plugin']]['label']
        if cfg['sounds'][sound_name].get('fx'):
            provenance += ' -> ' + cfg['plugins'][cfg['sounds'][sound_name]['fx']['plugin']]['label']
    assert audio.shape[0] == 2 and abs(audio.shape[1] - frames) < 1024
    if audio.shape[1] < frames:
        audio = np.pad(audio, ((0, 0), (0, frames - audio.shape[1])))
    audio = audio[:, :frames]
    assert audio.shape == (2, frames) and np.isfinite(audio).all()
    # Filter the continuous four-cycle recording before extracting the central cycle.
    low = track.get('lowcut_hz', 32 if track['role'] in ('bass', 'drums') else 100)
    high = track.get('highcut_hz', 9500 if track['role'] == 'drums' else 6800)
    for cutoff, kind in ((low, 'highpass'), (high, 'lowpass')):
        if cutoff:
            audio = signal.sosfilt(signal.butter(2, cutoff, btype=kind, fs=SR, output='sos'),
                                   audio, axis=1).astype(np.float32)
    pan = float(track.get('pan', 0))
    assert -1 <= pan <= 1
    audio *= np.array([math.sqrt(1 - pan), math.sqrt(1 + pan)], dtype=np.float32)[:, None]
    head = audio[:, :count].copy()
    cycle = audio[:, count * 2:count * 3].copy()
    before = level(cycle)
    assert before > -70, (track['name'], variant, before)
    gain = float(track['target_db']) - before
    assert -40 < gain < 40, (track['name'], gain)
    scale = np.float32(10 ** (gain / 20))
    head *= scale
    cycle *= scale
    head, cycle, transient_control = shape_percussion(spec, track, head, cycle)
    assert np.isfinite(cycle).all() and abs(level(cycle) - track['target_db']) < .01
    wavfile.write(directory / 'loop.wav', SR, cycle.T)
    wavfile.write(directory / 'entry.wav', SR, head.T)
    details = dict(variant=variant, frames=count, seconds=loop_seconds, raw_rms_db=round(before, 3),
                   gain_db=round(gain, 3), loop_rms_db=round(level(cycle), 3),
                   peak_db=round(20 * math.log10(max(float(np.max(np.abs(cycle))), 1e-12)), 3),
                   loop_sha256=hashlib.sha256(cycle.T.astype('<f4').tobytes()).hexdigest(),
                   source=provenance, notes_per_cell=len(track['variants'][variant]),
                   transient_control=transient_control)
    dump(directory / 'cell-report.json', details)
    return head, cycle, details


def render_native_cells(spec, track, variants, directories, atlas, cfg, skill, binaries, env):
    """Batch the short patterns through one instrument load, with silent guards between them."""
    from pattern_score import export_score
    atlas.mkdir()
    count = round(spec['pattern_bars'] * 240 / spec['bpm'] * SR)
    seconds = count / SR
    songs = []
    for variant, directory in zip(variants, directories):
        directory.mkdir()
        cell_track = copy.deepcopy(track)
        cell_track.update(enter=0, variants={'A': track['variants'][variant]})
        cell_spec = dict(spec, bars=spec['pattern_bars'] * REPEATS,
                         plan=[dict(bar=0, variant='A')], tracks=[cell_track])
        songs.append(export_score(cell_spec, directory / 'export'))
    combined = copy.deepcopy(songs[0])
    combined['tracks'][0]['notes'] = []
    for index, song in enumerate(songs):
        offset = (index * (REPEATS + 1) + 1) * seconds
        combined['tracks'][0]['notes'].extend([
            [note[0] + offset, *note[1:]] for note in song['tracks'][0]['notes']])
    combined['tracks'][0]['n_notes'] = sum(not n[4] for n in combined['tracks'][0]['notes'])
    combined['length_sec'] = len(variants) * (REPEATS + 1) * seconds
    combined['sections'] = []
    export = atlas / 'export'
    export.mkdir()
    dump(export / 'song.json', combined)
    local_cfg = copy.deepcopy(cfg)
    if 'double' in track:
        local_cfg['sounds'][track['sound']]['double'] = track['double']
    studio = atlas / 'studio'
    studio.mkdir()
    dump(studio / 'sounds.json', local_cfg)
    command([sys.executable, skill / 'scripts/render.py', export], atlas / 'render.log',
            dict(env, MUSIC_STUDIO_HOME=str(studio)))
    raw = next((export / 'stems').glob('*.wav'))
    rate, data = wavfile.read(raw, mmap=True)
    assert rate == SR and data.ndim == 2 and data.shape[1] == 2
    sound = cfg['sounds'][track['sound']]
    provenance = cfg['plugins'][sound['plugin']]['label']
    if sound.get('fx'):
        provenance += ' -> ' + cfg['plugins'][sound['fx']['plugin']]['label']
    result = {}
    for index, (variant, directory) in enumerate(zip(variants, directories)):
        begin = (index * (REPEATS + 1) + 1) * count
        audio = data[begin:begin + REPEATS * count].T
        result[variant] = render_cell(spec, track, variant, directory, cfg, skill, binaries, env,
                                      audio_override=audio, provenance_override=provenance)
    return result


def stream_stem(spec, track, cells, target, log):
    """Write repeating cells in small blocks; all parts keep their phase on the drum grid."""
    count = round(spec['pattern_bars'] * 240 / spec['bpm'] * SR)
    assert count * (spec['bars'] // spec['pattern_bars']) == FRAMES
    silence = np.zeros((2, count), dtype=np.float32)
    previous = None
    active = False
    with log.open('w', encoding='utf8') as errors:
        proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-f', 'f32le',
                                 '-ar', str(SR), '-ac', '2', '-i', 'pipe:0', '-c:a', 'pcm_f32le', str(target)],
                                stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=errors,
                                creationflags=FLAGS)
        try:
            for bar in range(0, spec['bars'], spec['pattern_bars']):
                if bar < track['enter']:
                    block = silence
                else:
                    head, cycle, _ = cells[variant_at(spec, bar)]
                    block = (cycle if active else head).copy()
                    active = True
                    # Less than one millisecond removes numerical seam discontinuities.
                    # A fixed cycle's final sample is fixed, so steady repeats remain identical.
                    if previous is not None:
                        n = 32
                        a = np.linspace(0, 1, n, dtype=np.float32)[None, :]
                        block[:, :n] = previous[:, None] * (1 - a) + block[:, :n] * a
                previous = block[:, -1].copy()
                proc.stdin.write(block.T.astype('<f4').tobytes())
            proc.stdin.close()
            assert proc.wait() == 0, target
        except BaseException:
            proc.kill()
            proc.wait()
            raise
    rate, data = wavfile.read(target, mmap=True)
    assert rate == SR and data.shape == (FRAMES, 2)
    entry = round(track['enter'] * 240 / spec['bpm'] * SR)
    if entry:
        assert not np.any(data[:entry]), track['name']
    # Check the actual assembled audio against every requested pattern, allowing only its seam.
    first_active = True
    for bar in range(track['enter'], spec['bars'], spec['pattern_bars']):
        head, cycle, _ = cells[variant_at(spec, bar)]
        expected = head if first_active else cycle
        first_active = False
        begin = (bar // spec['pattern_bars']) * count
        assert np.array_equal(data[begin + 32:begin + count], expected[:, 32:].T), (track['name'], bar)
    return dict(frames=FRAMES, enter_bar=track['enter'], enter_seconds=round(entry / SR, 4),
                stable_cell_repetition_verified=True, pattern_sequence_verified=True)


def render_piece(slug, run, cfg, skill, binaries, env):
    from pattern_score import validate_spec, export_score, arrangement_audit
    from finish_suites import finish
    spec = runpy.run_path(str(HERE / slug / 'song.py'))['SPEC']
    validate_spec(spec)
    folder = run / slug
    folder.mkdir()
    shutil.copy2(HERE / slug / 'song.py', folder / 'song.py')
    for helper in ('render.py', 'pattern_score.py', 'loop_voices.py'):
        shutil.copy2(HERE / helper, folder / helper)
    song = export_score(spec, folder / 'export')
    assert song['length_sec'] == 900
    stems = folder / 'export/stems'
    stems.mkdir()
    loop_dir = folder / 'cells'
    loop_dir.mkdir()
    reports = []
    for i, track in enumerate(spec['tracks']):
        print('LAYER', slug, track['name'], 'enters bar', track['enter'], flush=True)
        cells, cache, representatives = {}, {}, {}
        for variant in sorted(track['variants']):
            fingerprint = json.dumps(track['variants'][variant], sort_keys=True)
            representatives.setdefault(fingerprint, variant)
        unique = list(representatives.values())
        if not track['sound'].startswith('local_') and track['sound'] != 'country_banjo':
            print('  BATCH NATIVE CELLS', len(unique), flush=True)
            rendered = render_native_cells(spec, track, unique, [loop_dir / f'{i:02d}-{v}' for v in unique],
                                           loop_dir / f'{i:02d}-atlas', cfg, skill, binaries, env)
            cache = {fp: rendered[v] for fp, v in representatives.items()}
        else:
            for fingerprint, variant in representatives.items():
                print('  RENDER CELL', variant, flush=True)
                cache[fingerprint] = render_cell(spec, track, variant, loop_dir / f'{i:02d}-{variant}',
                                                 cfg, skill, binaries, env)
        for variant in track['variants']:
            cells[variant] = cache[json.dumps(track['variants'][variant], sort_keys=True)]
        destination = stems / (track['name'] + '.wav')
        result = stream_stem(spec, track, cells, destination, folder / f'{i:02d}-stream.log')
        reports.append(dict(name=track['name'], sound=track['sound'], **result,
                            unique_audio_cells=len(cache), cells={v: c[2] for v, c in cells.items()}))
        print('  REPEATED TO 15:00', track['name'], flush=True)
    mix_cfg = dict(sounds={t['sound']: dict(gain_db=0) for t in spec['tracks']})
    dump(folder / 'mix-config.json', mix_cfg)
    audit = arrangement_audit(spec)
    dump(folder / 'loop-report.json', dict(title=spec['title'], design=spec.get('arrangement', 'long-hold'),
                                          pattern_bars=2, plan=spec['plan'], layers=reports, arrangement_audit=audit))
    print('MASTER', slug, flush=True)
    report = finish(folder, mix_cfg)
    report.update(slug=slug, genre=spec['genre'], key=spec['key'], pattern_bars=2,
                  revision=spec.get('revision', 1), arrangement_audit=audit,
                  loop_report=str(folder / 'loop-report.json'))
    dump(folder / 'report.json', report)
    dump(Path(report['mp3']).with_suffix('.json'), report)
    # This short path also provides an inline player in chat without long spaces in filenames.
    listening = HERE.parents[3] / 'output/repeating-grooves'
    listening.mkdir(parents=True, exist_ok=True)
    version = 1
    while (listening / f'{slug}-v{version}.mp3').exists():
        version += 1
    short = listening / f'{slug}-v{version}.mp3'
    shutil.copy2(report['mp3'], short)
    report['chat_mp3'] = str(short)
    dump(folder / 'report.json', report)
    print('READY', json.dumps(dict(slug=slug, mp3=report['mp3'], chat_mp3=str(short), encoded=report['encoded'])), flush=True)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--slugs', nargs='+', choices=SLUGS, default=list(SLUGS))
    parser.add_argument('--output-root', type=Path, default=MUSIC / 'out/repeating-grooves')
    args = parser.parse_args()
    skill = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
    original = Path(os.environ.get('MUSIC_STUDIO_HOME', Path.home() / 'Music/MusicStudio'))
    binaries = Path(os.environ.get('MUSIC_BIN', MUSIC / 'bin'))
    cfg = json.loads((original / 'sounds.json').read_text())
    cfg['sample_rate'] = SR
    for sound in cfg['sounds'].values():
        for entry in (sound, sound.get('fx', {})):
            if entry.get('state') and not Path(entry['state']).is_absolute():
                entry['state'] = str(original / entry['state'])
    args.output_root.mkdir(parents=True, exist_ok=True)
    version = 1
    while (args.output_root / f'run-v{version}').exists():
        version += 1
    run = args.output_root / f'run-v{version}'
    run.mkdir()
    dump(args.output_root / 'latest-run.json', dict(run=str(run)))
    env = dict(os.environ, MUSIC_STUDIO_SKILL=str(skill))
    sys.path.insert(0, str(PACK))
    reports = []
    print('RUN', run, flush=True)
    for slug in args.slugs:
        reports.append(render_piece(slug, run, cfg, skill, binaries, env))
        dump(run / 'finished.json', reports)
    print('ALL GROOVES READY', len(reports), flush=True)


if __name__ == '__main__':
    main()
