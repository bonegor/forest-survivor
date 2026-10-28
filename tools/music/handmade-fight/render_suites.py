"""Render the two fifteen-minute scores with the same instruments as Clockwork Charge.

python tools/music/handmade-fight/render_suites.py --render-only
python tools/music/handmade-fight/finish_suites.py PATH_TO_RUN

Each run has separate sources, instruments, stems and finished files. No neural inference.
"""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = HERE.parent/'out/clockwork-suite'
KINDS = ('clockwork-long','lantern-guard')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render-only',action='store_true')
    args = parser.parse_args()
    skill = Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
    original_studio = Path(os.environ.get('MUSIC_STUDIO_HOME',Path.home()/'Music/MusicStudio'))
    OUT.mkdir(parents=True,exist_ok=True)
    v = 1
    while (OUT/f'run-v{v}').exists(): v += 1
    run = OUT/f'run-v{v}'
    run.mkdir()
    for name in ('render_suites.py','setup_local.py'):
        shutil.copy2(HERE/name,run/name)
    env = dict(os.environ,MUSIC_STUDIO_SKILL=str(skill))
    flags = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name=='nt' else 0
    subprocess.run([sys.executable,str(run/'setup_local.py'),'--studio',str(run/'studio'),
                    '--source-studio',str(original_studio)],env=env,check=True,creationflags=flags)
    env['MUSIC_STUDIO_HOME'] = str(run/'studio')
    (OUT/'latest-run.json').write_text(json.dumps(dict(run=str(run)),indent=2)+'\n')
    request = dict(kinds=KINDS,seconds=900,sample_rate=44100,studio=str(run/'studio'))
    (run/'request.json').write_text(json.dumps(request,indent=2)+'\n')
    print('FIFTEEN-MINUTE RUN',run,flush=True)
    for kind in KINDS:
        folder = run/kind
        folder.mkdir()
        shutil.copy2(HERE/kind/'song.py',folder/'song.py')
        export = folder/'export'
        subprocess.run([sys.executable,str(folder/'song.py'),str(export)],env=env,check=True,creationflags=flags)
        song = json.loads((export/'song.json').read_text())
        assert abs(song['length_sec']-900)<.01 and len(song['tracks'])==4
        print('RENDERING',kind,flush=True)
        with (folder/'render.log').open('w',encoding='utf8') as stream:
            subprocess.run([sys.executable,str(skill/'scripts/render.py'),str(export)],env=env,
                stdout=stream,stderr=subprocess.STDOUT,check=True,creationflags=flags)
        print('STEMS READY',kind,flush=True)
    (run/'render-complete.json').write_text(json.dumps(dict(kinds=KINDS,complete=True),indent=2)+'\n')
    print('ALL STEMS READY',run,flush=True)
    if not args.render_only:
        subprocess.run([sys.executable,str(HERE/'finish_suites.py'),str(run)],env=env,check=True,creationflags=flags)

if __name__=='__main__':
    main()
