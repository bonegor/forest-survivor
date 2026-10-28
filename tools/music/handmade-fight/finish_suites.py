"""Stream-mix, master and verify both full-length suites with bounded memory.

Usage: python finish_suites.py PATH_TO_RUN
Only local listening copies are produced. Shutdown is never part of this script.
"""
import argparse, hashlib, json, math, os, re, shutil, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.io import wavfile

SR = 44100
FRAMES = 900*SR
COMP = 'acompressor=threshold=0.1258925:ratio=2:attack=50:release=150:makeup=1:knee=1:link=average:detection=rms'
FLAGS = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name=='nt' else 0

def ff(command,log):
    with log.open('w',encoding='utf8') as stream:
        subprocess.run(['ffmpeg','-nostdin','-hide_banner','-nostats','-loglevel','info']+command,
                       stdout=stream,stderr=subprocess.STDOUT,check=True,creationflags=FLAGS)

def meter(log):
    summary = log.read_text(encoding='utf8',errors='replace').rsplit('Summary:',1)[-1]
    result = {}
    for key,pattern in [('lufs',r'\bI:\s*(-?\d+(?:\.\d+)?)\s+LUFS'),
                        ('true_peak_db',r'\bPeak:\s*(-?\d+(?:\.\d+)?)\s+dBFS')]:
        found = re.search(pattern,summary)
        if not found: raise ValueError('Meter summary missing '+key+': '+str(log))
        result[key] = float(found.group(1))
    return result

def mix_stream(folder,cfg,song):
    tracks = []
    stats = {}
    for track in song['tracks']:
        filename = re.sub(r'[^\w\- ()]+','',track['name']).strip()+'.wav'
        rate,audio = wavfile.read(folder/'export/stems'/filename,mmap=True)
        assert rate==SR and audio.ndim==2 and audio.shape[1]==2
        assert abs(audio.shape[0]-FRAMES)<1024, (filename,audio.shape)
        gain = float(cfg['sounds'][track['sound']].get('gain_db',0))+float(song['mix'].get(track['name'],0))
        tracks.append((track['name'],audio,np.float32(10**(gain/20))))
        stats[track['name']] = dict(gain_db=gain,sum_squares=0.,peak=0.)
    raw = folder/'mix.f32'
    raw_version = 2
    while raw.exists():
        raw = folder/f'mix-v{raw_version}.f32'
        raw_version += 1
    activity = []
    with raw.open('wb') as stream:
        for begin in range(0,FRAMES,SR):
            end = min(FRAMES,begin+SR)
            mix = np.zeros((end-begin,2),dtype=np.float32)
            for name,audio,gain in tracks:
                block = np.asarray(audio[begin:end],dtype=np.float32)*gain
                assert np.isfinite(block).all(), name
                mix[:len(block)] += block
                stats[name]['sum_squares'] += float(np.sum(block.astype(np.float64)**2))
                stats[name]['peak'] = max(stats[name]['peak'],float(np.max(np.abs(block))))
            assert np.isfinite(mix).all()
            activity.append(float(np.sqrt(np.mean(mix.astype(np.float64)**2))))
            stream.write(mix.astype('<f4').tobytes())
    for name,item in stats.items():
        item['rms_db'] = round(10*math.log10(max(item.pop('sum_squares')/(FRAMES*2),1e-20)),2)
        item['peak_db'] = round(20*math.log10(max(item.pop('peak'),1e-12)),2)
        assert item['rms_db'] > -65, (name,item)
    activity = np.asarray(activity)
    active = float(np.mean(activity>max(1e-5,float(activity.max())*.015)))
    assert active>.98 and activity[0]>.001, 'Unexpected silence in fighting pulse'
    return raw,stats,round(active,4)

def verify_mp3(path,log):
    command = ['ffmpeg','-nostdin','-hide_banner','-nostats','-loglevel','info','-i',str(path),
               '-af','ebur128=peak=true:framelog=verbose','-c:a','pcm_f32le','-f','f32le','pipe:1']
    total = 0
    with log.open('w',encoding='utf8') as errors:
        proc = subprocess.Popen(command,stdout=subprocess.PIPE,stderr=errors,creationflags=FLAGS)
        while True:
            chunk = proc.stdout.read(1024*1024)
            if not chunk: break
            assert len(chunk)%4==0 and np.isfinite(np.frombuffer(chunk,dtype='<f4')).all()
            total += len(chunk)
        proc.stdout.close()
        assert proc.wait()==0
    assert total == FRAMES*2*4, f'Decoded duration mismatch: {total}'
    report = meter(log)
    assert report['true_peak_db']<-.5 and -15<report['lufs']<-11, report
    return report

def finish(folder,cfg):
    song = json.loads((folder/'export/song.json').read_text())
    assert abs(song['length_sec']-900)<.01
    raw,stats,activity = mix_stream(folder,cfg,song)
    raw_args = ['-f','f32le','-ar',str(SR),'-ac','2','-i',str(raw)]
    out = folder/'out'
    out.mkdir(exist_ok=True)
    title = re.sub(r'[^\w\- ()]+','',song['title']).strip()
    v = 1
    while (out/f'{title} v{v}.wav').exists(): v += 1
    base = out/f'{title} v{v}'
    print('METERING',song['title'],flush=True)
    first_log = folder/f'pre-master-v{v}.log'
    ff(raw_args+['-af',COMP+',ebur128=peak=true:framelog=verbose','-f','null',os.devnull],first_log)
    before = meter(first_log)
    gain = -13-before['lufs']
    # Leave 3 dB sample headroom for short cymbal transients after MP3 encoding.
    # The actual encoded true peak is checked independently below.
    filters = (COMP+f',volume={gain:.3f}dB,alimiter=limit=0.707946:attack=5:release=80:level=false:latency=true'
               ',afade=t=in:st=0:d=0.01,afade=t=out:st=898.5:d=1.5'
               f',apad=whole_len={FRAMES},atrim=end_sample={FRAMES}')
    print('MASTERING',song['title'],flush=True)
    ff(raw_args+['-af',filters,'-ar',str(SR),'-c:a','pcm_s24le',str(base.with_suffix('.wav'))],folder/f'master-v{v}.log')
    with wave.open(str(base.with_suffix('.wav')),'rb') as wav:
        assert wav.getnframes()==FRAMES and wav.getframerate()==SR and wav.getnchannels()==2
    ff(['-i',str(base.with_suffix('.wav')),'-c:a','libmp3lame','-b:a','256k','-write_xing','1',
        '-metadata','title='+song['title'],'-metadata','artist=Forest Survivor',str(base.with_suffix('.mp3'))],folder/f'encode-v{v}.log')
    print('VERIFYING',song['title'],flush=True)
    measured = verify_mp3(base.with_suffix('.mp3'),folder/f'encoded-check-v{v}.log')
    dest = Path.home()/'Music/MusicStudio/Finished/Forest Survivor - long battle music'
    dest.mkdir(parents=True,exist_ok=True)
    dv = 1
    while (dest/f'{title} v{dv}.mp3').exists(): dv += 1
    final = dest/f'{title} v{dv}'
    for ext in ('wav','mp3'):
        shutil.copy2(base.with_suffix('.'+ext),final.with_suffix('.'+ext))
    midi = next((folder/'export').glob('*.mid'))
    shutil.copy2(midi,final.with_suffix('.mid'))
    report = dict(title=song['title'],seconds=900,samples=FRAMES,sample_rate=SR,bpm=song['bpm'],
        pre_master=before,master_gain_db=round(gain,3),encoded=measured,active_fraction=activity,
        stems=stats,sections=song['sections'],source=str(folder/'song.py'),
        mp3=str(final.with_suffix('.mp3')),wav=str(final.with_suffix('.wav')),midi=str(final.with_suffix('.mid')),
        mp3_sha256=hashlib.sha256(base.with_suffix('.mp3').read_bytes()).hexdigest(),
        listening_status='Levels and balance measured, not listened to.')
    (folder/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    final.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
    print('FINISHED',report['mp3'],json.dumps(measured),flush=True)
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run',type=Path)
    parser.add_argument('--kind',choices=('clockwork-long','lantern-guard'))
    args = parser.parse_args()
    run = args.run.resolve()
    cfg = json.loads((run/'studio/sounds.json').read_text())
    reports = []
    for kind in ([args.kind] if args.kind else ['clockwork-long','lantern-guard']):
        reports.append(finish(run/kind,cfg))
    (run/('finished-'+args.kind+'.json' if args.kind else 'finished.json')).write_text(json.dumps(reports,indent=2)+'\n')

if __name__=='__main__':
    main()
