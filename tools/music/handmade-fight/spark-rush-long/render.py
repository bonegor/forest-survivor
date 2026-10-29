"""Render and verify the full fifteen-minute Spark Rush using the approved sounds."""
import json, os, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
PACK = HERE.parent
OUT = PACK.parent/'out/spark-rush-long'

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    v = 1
    while (OUT/f'run-v{v}').exists(): v += 1
    run = OUT/f'run-v{v}'
    env = dict(os.environ,OMP_NUM_THREADS='2',OPENBLAS_NUM_THREADS='2')
    flags = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name=='nt' else 0
    print('RUN',run,flush=True)
    (OUT/'latest-run.json').write_text(json.dumps(dict(run=str(run)),indent=2)+'\n')
    with (OUT/f'run-v{v}-render.log').open('w',encoding='utf8') as stream:
        subprocess.run([sys.executable,str(HERE/'render_stems.py'),'--output',str(run)],
                       env=env,stdout=stream,stderr=subprocess.STDOUT,check=True,creationflags=flags)
    cfg = json.loads((run/'mix-config.json').read_text())
    sys.path.insert(0,str(PACK))
    from finish_suites import finish
    report = finish(run,cfg)
    report['style'] = 'Electronic combat; approved Spark Rush voices and peak-shaping recipe'
    (run/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (run/'finished.json').write_text(json.dumps([report],indent=2)+'\n')
    Path(report['mp3']).with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
    print('READY',report['mp3'],flush=True)

if __name__=='__main__':
    main()
