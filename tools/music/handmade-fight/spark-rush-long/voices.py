"""The approved Spark Rush oscillators and percussion, shared by the long arrangement."""
from pathlib import Path
import math,os,sys
import numpy as np
from scipy import signal
from song import S
SKILL=Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0,str(SKILL/'scripts'))
from common import rms_db

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
