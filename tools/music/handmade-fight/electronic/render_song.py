"""Render Spark Rush: one real drum plugin plus deliberately electronic synths.

No GUI, neural codec, downloads, or shared sound changes. Run after the parent's render slot is free.
    python render_song.py --render
Default exports the arrangement only. Every real render gets its own run-vN folder.
"""
from pathlib import Path
import argparse,json,math,os,shutil,subprocess,sys,time
import numpy as np
from scipy import signal
HERE=Path(__file__).resolve().parent
SKILL=Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0,str(SKILL/'scripts'))
from common import load_config,read_wav,write_wav_float,write_wav24,write_mp3,rms_db,lufs,true_peak,master,hard_exit
from song import S
from mix_recipe import revise_stem

SR=44100

def envelope(count,held,kind):
    t=np.arange(count,dtype=np.float64)/SR
    attack=.003 if kind=='bass' else .002
    release=.07 if kind=='bass' else .10
    env=np.minimum(1,t/attack)
    if kind=='bass': env*=.63+.37*np.exp(-t*22)
    elif kind=='chord': env*=.18+.82*np.exp(-t*12)
    else: env*=.09+.91*np.exp(-t*16)
    mask=t>held
    env[mask]*=np.maximum(0,1-(t[mask]-held)/release)**2
    return env

def tone(pitch,held,kind,variant=0):
    count=int((held+(.07 if kind=='bass' else .10))*SR)
    t=np.arange(count,dtype=np.float64)/SR
    f=440*2**((pitch-69)/12)
    out=np.zeros(count,dtype=np.float64)
    # Bandlimited additive saw body. Harmonics decay faster than the fundamental;
    # this produces a definite plucked attack rather than a breathy sine lead.
    if kind=='bass':
        for h in range(1,13):
            out+=np.sin(2*np.pi*f*h*t+.17*h)/(h**1.25)*np.exp(-t*(h-1)*3.5)
        out=np.tanh(out*1.6)*.65+.30*np.sin(2*np.pi*f*t)
    else:
        for cents,weight in ((-6,.30),(0,.44),(6,.30)):
            freq=f*2**(cents/1200)
            for h in range(1,11):
                if freq*h>SR*.44: break
                out+=weight*np.sin(2*np.pi*freq*h*t+.21*h+variant*.13)/h*np.exp(-t*(h-1)*(4 if kind=='hook' else 5))
        out=np.tanh(out*1.35)
    return (out*envelope(count,held,kind)).astype(np.float32)

def synth_track(track,total,kind):
    audio=np.zeros((2,total),np.float32)
    cache={}
    for i,(start,duration,pitch,velocity,ks) in enumerate(track['notes']):
        if ks: continue
        held=round(duration,3)
        key=(pitch,held,kind)
        if key not in cache: cache[key]=tone(pitch,held,kind,pitch%3)
        note=cache[key]*(velocity/127)**1.3
        onset=int(start*SR); size=min(len(note),total-onset)
        if size<=0: continue
        # Bass is mono/center. Chords have modest note-dependent placement.
        pan=0 if kind=='bass' else ((pitch%5)-2)*(.11 if kind=='chord' else .04)
        audio[0,onset:onset+size]+=note[:size]*math.sqrt((1-pan)/2)
        audio[1,onset:onset+size]+=note[:size]*math.sqrt((1+pan)/2)
    if kind!='bass':
        dry=audio.copy()
        delay=int(SR*60/S.bpm*.75)
        for k,gain in ((1,.14),(2,.06)):
            if delay*k<total:
                audio[:,delay*k:]+=dry[::-1,:total-delay*k]*gain
        # Keep the midrange attack, tame high saw harmonics, leave bass its own space.
        audio=signal.sosfilt(signal.butter(2,[210,6700 if kind=='hook' else 5200],btype='bandpass',fs=SR,output='sos'),audio,axis=1).astype(np.float32)
    else:
        audio=signal.sosfilt(signal.butter(2,28,btype='highpass',fs=SR,output='sos'),audio,axis=1).astype(np.float32)
    return audio

def punch_track(track,total):
    audio=np.zeros((2,total),np.float32)
    rng=np.random.default_rng(546)
    t=np.arange(int(.38*SR))/SR
    phase=2*np.pi*(48*t+(100-48)*.018*(1-np.exp(-t/.018)))
    kick=np.sin(phase)*np.exp(-t*12)+.05*rng.standard_normal(len(t))*np.exp(-t*160)
    kick*=np.minimum(1,t/.0007)
    t2=np.arange(int(.22*SR))/SR
    noise=rng.standard_normal(len(t2))
    noise=signal.sosfilt(signal.butter(2,[850,7500],btype='bandpass',fs=SR,output='sos'),noise)
    clap_env=sum(np.exp(-np.maximum(0,t2-d)*65)*(t2>=d) for d in (0,.011,.024))
    clap=noise*clap_env*.25
    for start,_,pitch,velocity,ks in track['notes']:
        note=kick if pitch==36 else clap
        onset=int(start*SR); n=min(len(note),total-onset)
        audio[:,onset:onset+n]+=note[:n].astype(np.float32)*(velocity/127)**1.4*.707
    return audio

def set_level(x,target):
    return x*10**((target-rms_db(x))/20)

def run():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render',action='store_true')
    args=parser.parse_args()
    if not args.render:
        S.export(str(HERE/'draft-export'))
        return False
    v=1
    while (HERE/f'run-v{v}').exists():v+=1
    out=HERE/f'run-v{v}';out.mkdir()
    shutil.copy2(HERE/'song.py',out/'song-source.py')
    shutil.copy2(Path(__file__),out/'render-source.py')
    shutil.copy2(HERE/'mix_recipe.py',out/'mix-recipe.py')
    song=S.export(str(out/'export'))
    cfg=load_config();cfg['sample_rate']=SR
    seconds=song['length_sec']+1.5
    total=int(seconds*SR)
    stems=out/'stems';stems.mkdir()
    report=[]
    mix=np.zeros((2,total),np.float32)
    tracks={t['name']:t for t in song['tracks']}
    from render import render_plugin
    print('Rendering real SI-Drum Kit',flush=True)
    live=render_plugin(tracks['Live drums'],'drums',cfg,seconds,S.bpm,print)
    if live.shape[1]<total:live=np.pad(live,((0,0),(0,total-live.shape[1])))
    # Drums carry most of the energy; chords and hook sit behind them.
    jobs=[('Live drums',live[:,:total],-17.0),
          ('Club punch',punch_track(tracks['Club punch'],total),-18.2),
          ('Spring bass',synth_track(tracks['Spring bass'],total,'bass'),-22.5),
          ('Pulse chords',synth_track(tracks['Pulse chords'],total,'chord'),-26.0),
          ('Pluck hook',synth_track(tracks['Pluck hook'],total,'hook'),-28.0)]
    for name,audio,target in jobs:
        assert np.isfinite(audio).all() and rms_db(audio)>-75,name
        audio=set_level(audio,target)
        # Quarter-note ducking keeps the bass/chords clear of the kick attack.
        if name in ('Spring bass','Pulse chords','Pluck hook'):
            phase=(np.arange(total)/SR)%(60/S.bpm)
            amount=.36 if name=='Spring bass' else .49
            audio*=1-amount*np.exp(-phase/.055)
        audio=revise_stem(name,audio,SR)
        write_wav_float(str(stems/(name+'.wav')),SR,audio)
        mix+=audio
        report.append(dict(name=name,rms_db=round(rms_db(audio),2),peak_db=round(20*np.log10(max(float(np.max(np.abs(audio))),1e-12)),2)))
    audio,mrep=master(mix,SR,target_lufs=-13.,tp_ceiling_db=-1.5,glue=False,fade_out_s=1.0)
    assert np.isfinite(audio).all()
    title=f'Spark Rush v{v}'
    write_wav24(str(out/(title+'.wav')),SR,audio)
    assert write_mp3(str(out/(title+'.mp3')),SR,audio,kbps=256,title='Spark Rush')
    checked=out/(title+'-checked.wav')
    subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(out/(title+'.mp3')),
                    '-c:a','pcm_f32le',str(checked)],check=True)
    encoded_sr,encoded=read_wav(str(checked))
    encoded_peak=20*np.log10(true_peak(encoded))
    assert np.isfinite(encoded).all() and encoded_peak<-.2,'Encoded audio clips'
    report=dict(title=title,bpm=S.bpm,key='D Dorian',seconds=round(audio.shape[1]/SR,2),stems=report,master=mrep,
                lufs=round(lufs(audio,SR),2),true_peak_db=round(20*np.log10(true_peak(audio)),2),
                encoded_true_peak_db=round(float(encoded_peak),2),encoded_lufs=round(lufs(encoded,encoded_sr),2),
                source=str(out/'song-source.py'),midi=str(out/'export/Spark Rush.mid'),
                sections=FORM_REPORT(song))
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)
    print('FINISHED',out/(title+'.mp3'),flush=True)
    return True

def FORM_REPORT(song):
    return [{k:v for k,v in sec.items() if k in ('label','start_sec','end_sec')} for sec in song['sections']]

if __name__=='__main__':
    used_plugins=run()
    if used_plugins:hard_exit()
