"""Render the handmade auditions in a fresh, ignored workspace.

Usage: python tools/music/handmade-fight/build.py [rock|march|electronic|metal ...]
The default builds all three. No audio is installed into the game or published.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'out/handmade-fight'
KINDS = ('rock', 'march', 'electronic', 'metal')
DEFAULT_KINDS = ('rock', 'march', 'electronic')


def fresh_run():
    OUT.mkdir(parents=True, exist_ok=True)
    version = 1
    while True:
        folder = OUT / f'run-v{version}'
        try:
            folder.mkdir()
            return folder
        except FileExistsError:
            version += 1


def local_config(source_studio, destination):
    """Keep captured instruments read-only and keep Finished copies in this run."""
    cfg = json.loads((source_studio / 'sounds.json').read_text())
    for sound in cfg['sounds'].values():
        for entry in (sound, sound.get('fx', {})):
            if entry.get('state') and not Path(entry['state']).is_absolute():
                entry['state'] = str(source_studio / entry['state'])
    destination.mkdir()
    (destination / 'sounds.json').write_text(json.dumps(cfg, indent=2) + '\n')


def run(command, env):
    print('Running:', ' '.join(str(part) for part in command), flush=True)
    subprocess.run([str(part) for part in command], env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kinds', nargs='*', metavar='KIND',
                        help='rock, march, electronic, or metal (default: original three)')
    parser.add_argument('--skill', type=Path,
                        default=Path(os.environ.get('MUSIC_STUDIO_SKILL',
                                                     Path.home()/'.agents/skills/music-studio')))
    parser.add_argument('--studio', type=Path,
                        default=Path(os.environ.get('MUSIC_STUDIO_HOME',
                                                     Path.home()/'Music/MusicStudio')))
    args = parser.parse_args()
    kinds = list(dict.fromkeys(args.kinds or DEFAULT_KINDS))
    if any(kind not in KINDS for kind in kinds):
        parser.error('Kinds must be rock, march, electronic, or metal')
    skill, studio = args.skill.resolve(), args.studio.resolve()
    if not (skill / 'scripts/make.py').is_file():
        parser.error(f'Music Studio skill not found: {skill}')
    if not (studio / 'sounds.json').is_file():
        parser.error(f'Configured local instruments not found: {studio}')
    for kind in kinds:
        required = ['song.py'] + (['render_song.py', 'mix_recipe.py'] if kind == 'electronic' else ['setup_amp.py'] if kind == 'metal' else [])
        for name in required:
            if not (HERE / kind / name).is_file():
                parser.error(f'Missing source: {HERE / kind / name}')

    workspace = fresh_run()
    shutil.copy2(__file__, workspace / 'build-source.py')
    shutil.copy2(HERE / 'setup_local.py', workspace / 'setup_local.py')
    for kind in kinds:
        destination = workspace / kind
        destination.mkdir()
        for source in sorted((HERE / kind).glob('*.py')):
            shutil.copy2(source, destination / source.name)
    # A read-only configuration copy prevents the skill's Finished/v1 output
    # from replacing any earlier track in the person's main studio folder.
    if any(kind != 'march' for kind in kinds):
        local_config(studio, workspace / 'base-studio')
    env = dict(os.environ, MUSIC_STUDIO_SKILL=str(skill))
    (workspace / 'build-request.json').write_text(json.dumps(
        dict(kinds=kinds, skill=str(skill), captured_instruments=str(studio)), indent=2) + '\n')
    print('New render folder:', workspace, flush=True)
    for kind in kinds:
        current = workspace / kind
        if kind == 'march':
            local_studio = current / 'studio'
            run([sys.executable, workspace / 'setup_local.py', '--studio', local_studio,
                 '--source-studio', studio], env)
        else:
            local_studio = workspace / 'base-studio'
        track_env = dict(env, MUSIC_STUDIO_HOME=str(local_studio))
        if kind == 'metal':
            run([sys.executable, current / 'setup_amp.py'], track_env)
        if kind == 'electronic':
            run([sys.executable, current / 'render_song.py', '--render'], track_env)
        else:
            run([sys.executable, skill / 'scripts/make.py', current / 'song.py'], track_env)
    print('Finished audition render:', workspace, flush=True)


if __name__ == '__main__':
    main()
