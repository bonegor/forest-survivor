"""Create only the march's two instrument states in a new local render folder.

The person's sounds.json and captured guitar states are read without modification.
No downloads, neural models, or plugin windows are used.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--studio', type=Path, required=True)
    parser.add_argument('--source-studio', type=Path,
                        default=Path.home()/'Music/MusicStudio')
    args = parser.parse_args()
    studio, original = args.studio.resolve(), args.source_studio.resolve()
    if studio.exists():
        parser.error(f'Refusing to replace an existing studio: {studio}')
    cfg = json.loads((original / 'sounds.json').read_text())
    for sound in cfg['sounds'].values():
        for entry in (sound, sound.get('fx', {})):
            if entry.get('state') and not Path(entry['state']).is_absolute():
                entry['state'] = str(original / entry['state'])
    definitions = {
        'battle_strings': (
            'si_strings', r'C:\Program Files\Cakewalk\VstPlugins\SI-String Section\SI-String Section.dll',
            {'Master Attack': .015, 'Master Release': .12, 'Master Reverb': .08,
             'Violins Volume': .65, 'Cellos Volume': .65, 'Basses Volume': .22,
             'Violins Pan': .60, 'Cellos Pan': .40},
            {'locut_hz': 140, 'hishelf_hz': 4000, 'hishelf_db': -2}),
        'battle_keys': (
            'si_keys', r'C:\Program Files\Cakewalk\VstPlugins\SI-Electric Piano\SI-Electric Piano.dll',
            {'Master Tone': .65, 'Master Drive': .12, 'Drive Enable': 1},
            {'locut_hz': 180}),
    }
    for _, path, _, _ in definitions.values():
        if not Path(path).is_file():
            parser.error(f'Required installed instrument not found: {path}')
    skill = Path(os.environ.get('MUSIC_STUDIO_SKILL',
                                Path.home()/'.agents/skills/music-studio'))
    sys.path.insert(0, str(skill / 'scripts'))
    from common import hard_exit
    import dawdreamer as daw
    studio.mkdir(parents=True)
    for sound, (plugin, path, controls, tone) in definitions.items():
        state = studio / (sound + '.state')
        engine = daw.RenderEngine(44100, 512)
        proc = engine.make_plugin_processor(sound, path)
        time.sleep(2)
        indexes = {p['name']: p['index'] for p in proc.get_parameters_description()}
        for name, value in controls.items():
            if name not in indexes:
                raise RuntimeError(f'{sound}: missing instrument control {name!r}')
            proc.set_parameter(indexes[name], value)
        proc.save_state(str(state))
        cfg['plugins'][plugin] = dict(path=path, warmup_s=3)
        cfg['sounds'][sound] = dict(plugin=plugin, state=str(state), gain_db=0,
            kind='strings' if 'strings' in sound else 'keys', tone=tone)
        print('Prepared', sound, flush=True)
    (studio / 'sounds.json').write_text(json.dumps(cfg, indent=2) + '\n')
    (studio / 'controls.json').write_text(json.dumps(
        {key: value[2] for key, value in definitions.items()}, indent=2) + '\n')
    print('Isolated march instruments:', studio, flush=True)
    hard_exit(0)


if __name__ == '__main__':
    main()
