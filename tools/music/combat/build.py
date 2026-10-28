"""Render, check and master the combat score using the local Music Studio setup.

Usage: python build.py [slug ...] [--mix-only]
Outputs/stems/config stay in ignored tools/music/out/combat. Only Oggs ship.
"""
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import shutil

from compose import PIECES, SKILL

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'tools/music/out/combat'
DEST = ROOT / 'public/audio/music'
OUT.mkdir(parents=True, exist_ok=True)
# Use the captured sounds read-only; keep all working files inside the repository.
studio = Path(os.environ.get('MUSIC_STUDIO_HOME', Path.home()/'Music/MusicStudio'))
cfg = json.loads((studio/'sounds.json').read_text())
for sound in cfg['sounds'].values():
    for entry in (sound, sound.get('fx', {})):
        if entry.get('state') and not Path(entry['state']).is_absolute():
            entry['state'] = str(studio/entry['state'])
(OUT/'sounds.json').write_text(json.dumps(cfg,indent=2))
os.environ['MUSIC_STUDIO_HOME'] = str(OUT)
os.environ['MUSIC_STUDIO_SKILL'] = str(SKILL)
sys.path.insert(0,str(SKILL/'scripts'))
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from common import read_wav, write_wav24, write_mp3, lufs, true_peak
from mix import load_stems, track_gains, mixdown

def run(*args):
    subprocess.run([str(a) for a in args],check=True)

def master_loop(audio, sr, seconds, target=-16):
    n=round(seconds*sr)
    loop=audio[:,:n].copy()
    tail=audio[:,n:]
    count=min(n,tail.shape[1])
    if count:
        tail=tail[:,:count].copy()
        fade=min(count,round(.25*sr))
        tail[:,-fade:]*=np.linspace(1,0,fade)
        loop[:,:count]+=tail
    # Match the endpoint over 3 ms; no silence or rhythmic crossfade at the downbeat.
    seam=round(.003*sr)
    loop[:,-seam:]+=(loop[:,0]-loop[:,-1])[:,None]*np.linspace(0,1,seam)
    loop*=10**((target-lufs(loop,sr))/20)
    ceiling=10**(-2/20)
    need=np.minimum(1,ceiling/np.maximum(np.max(np.abs(loop),axis=0),1e-9))
    gain=minimum_filter1d(need,size=round(.01*sr)|1,mode='wrap')
    gain=np.minimum(gain,uniform_filter1d(gain,size=round(.08*sr)|1,mode='wrap'))
    loop*=gain
    peak=true_peak(loop)
    if peak>ceiling: loop*=ceiling/peak
    return loop, {'lufs':round(lufs(loop,sr),2),'true_peak_db':round(20*np.log10(true_peak(loop)),2),
                  'limiting_db':round(float(-20*np.log10(gain.min())),2)}

slugs=[a for a in sys.argv[1:] if not a.startswith('--')] or list(PIECES)
run(sys.executable,Path(__file__).with_name('compose.py'),OUT,*slugs)
reports={}
report_file=Path(__file__).with_name('report.json')
if report_file.exists(): reports=json.loads(report_file.read_text())
for slug in slugs:
    folder=OUT/slug
    if '--mix-only' not in sys.argv:
        run(sys.executable,SKILL/'scripts/render.py',folder)
    checked=subprocess.run([sys.executable,str(SKILL/'scripts/check.py'),str(folder)],capture_output=True,text=True)
    (folder/'check.txt').write_text(checked.stdout+checked.stderr)
    print(checked.stdout,flush=True)
    if checked.returncode: raise RuntimeError(f'{slug}: stem checks failed')
    song=json.loads((folder/'song.json').read_text())
    sr,stems=load_stems(str(folder),song)
    audio=mixdown(stems,track_gains(song,cfg))
    loop,levels=master_loop(audio,sr,song['loop_seconds'],-17 if slug=='embers-and-iron' else -16)
    # Version the full-resolution master; keep a stable, atomically replaced game export.
    v=1
    while (folder/f'master-v{v}.wav').exists(): v+=1
    wav=folder/f'master-v{v}.wav'
    write_wav24(str(wav),sr,loop)
    encoded=folder/f'{slug}-v{v}.ogg'
    run('ffmpeg','-v','error','-nostdin','-i',wav,'-c:a','libvorbis','-q:a','5',
        '-metadata',f'title={song["title"]}','-metadata','album=Forest Survivor - Thorns and Iron',encoded)
    # Decode the actual shipped codec to verify sample count, peaks, and seam.
    decoded=folder/f'decoded-v{v}.wav'
    run('ffmpeg','-v','error','-nostdin','-i',encoded,'-c:a','pcm_f32le',decoded)
    dsr,x=read_wav(str(decoded))
    assert dsr==sr and x.shape[1]==loop.shape[1], 'codec changed loop length'
    peak_db=20*np.log10(true_peak(x))
    assert peak_db <= -1.0, f'encoded peak too high: {peak_db}'
    windows=[float(np.sqrt(np.mean(x[:,i:i+sr]**2))) for i in range(0,x.shape[1]-sr,sr)]
    assert min(windows)>1e-4,'silent second in loop'
    step=float(np.max(np.abs(x[:,0]-x[:,-1])))
    ordinary=float(np.quantile(np.abs(np.diff(x,axis=1)),.999))
    assert step<max(.015,ordinary*2),'discontinuous encoded loop seam'
    reports[slug]=dict(title=song['title'],bpm=song['bpm'],bars=song['loop_bars'],
        seconds=round(x.shape[1]/sr,6),samples=x.shape[1],sample_rate=sr,bytes=encoded.stat().st_size,
        master=levels,encoded_lufs=round(lufs(x,sr),2),encoded_true_peak_db=round(float(peak_db),2),
        seam_step=round(step,6),ordinary_step_p999=round(ordinary,6),silent_seconds=0)
    temp=DEST/f'{slug}.ogg.tmp'
    shutil.copyfile(encoded,temp)
    temp.replace(DEST/f'{slug}.ogg')
    report_file.write_text(json.dumps(reports,indent=2)+'\n')
    # Portable, editable note data and MIDI accompany the composition source.
    notes=Path(__file__).with_name('scores')
    notes.mkdir(exist_ok=True)
    score = re.sub(r'\[\s+([0-9eE+.,\s-]+)\s+\]',
                   lambda m: '[' + ' '.join(m[1].split()) + ']', json.dumps(song, indent=2))
    (notes/f'{slug}.json').write_text(score+'\n')
    for midi in folder.glob('*.mid'): shutil.copyfile(midi,notes/f'{slug}.mid')
    preview=loop[:,:min(loop.shape[1],25*sr)].copy()
    preview[:,-sr:]*=np.linspace(1,0,sr)
    write_mp3(str(folder/'preview.mp3'),sr,preview,title=song['title'])
    print(f'FINISHED {slug}: {reports[slug]}',flush=True)
