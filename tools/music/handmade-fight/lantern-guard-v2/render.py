"""Render Lantern Guard v2 with a real sampled concert harp, then stream-master it.

python tools/music/handmade-fight/lantern-guard-v2/render.py
Uses installed instruments and an existing CC0 FreePats/VCSL concert harp.
"""
import copy, hashlib, json, os, runpy, shutil, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
HERE = Path(__file__).resolve().parent
PACK = HERE.parent
MUSIC = PACK.parent
OUT = MUSIC/'out/lantern-v2'
SR = 44100
FRAMES = 900*SR
FLAGS = subprocess.BELOW_NORMAL_PRIORITY_CLASS if os.name=='nt' else 0

def command(args,log,env):
    with log.open('w',encoding='utf8') as stream:
        subprocess.run([str(x) for x in args],stdout=stream,stderr=subprocess.STDOUT,
                       env=env,check=True,creationflags=FLAGS)

def main():
    skill = Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
    original = Path(os.environ.get('MUSIC_STUDIO_HOME',Path.home()/'Music/MusicStudio'))
    font = MUSIC/'bin/sf/freepats-concert-harp/ConcertHarp-SF2-20200702/ConcertHarp-20200702.sf2'
    fluid = MUSIC/'bin/fluidsynth/fluidsynth.exe'
    assert font.is_file() and fluid.is_file()
    OUT.mkdir(parents=True,exist_ok=True)
    v = 1
    while (OUT/f'run-v{v}').exists(): v += 1
    run = OUT/f'run-v{v}'; run.mkdir()
    folder = run/'lantern-guard'; folder.mkdir()
    for filename in ('song.py','render.py','DIFFERENCES.md'):
        shutil.copy2(HERE/filename,folder/filename)
    env = dict(os.environ,MUSIC_STUDIO_SKILL=str(skill))
    command([sys.executable,PACK/'setup_local.py','--studio',run/'studio','--source-studio',original],run/'setup.log',env)
    env['MUSIC_STUDIO_HOME'] = str(run/'studio')
    (OUT/'latest-run.json').write_text(json.dumps(dict(run=str(run)),indent=2)+'\n')
    print('RUN',run,flush=True)
    export = folder/'export'
    command([sys.executable,folder/'song.py',export],folder/'export.log',env)
    song = json.loads((export/'song.json').read_text())
    assert song['length_sec']==900 and len(song['tracks'])==4
    harp_track = next(t for t in song['tracks'] if t['sound']=='lantern_harp')
    # Export a separate MIDI part so every note uses the harp font's bank 0 / program 0.
    score = runpy.run_path(str(folder/'song.py'))['S']
    harp_score = copy.deepcopy(score)
    harp_score.tracks = {harp_track['name']:harp_score.tracks[harp_track['name']]}
    harp_score.tracks[harp_track['name']]['channel'] = 0
    midi = folder/'concert-harp.mid'
    harp_score.write_midi(str(midi))
    print('RENDERING concert harp',flush=True)
    raw = folder/'concert-harp-raw.wav'
    command([fluid,'-ni','-F',raw,'-T','wav','-O','float','-r',SR,'-g','.6','-R','0','-C','0',font,midi],folder/'harp-render.log',env)
    stems = export/'stems'; stems.mkdir()
    stem = stems/(harp_track['name']+'.wav')
    # Natural plucked attacks and a quiet dotted-eighth echo give this cue its own timbre.
    filters = (f'highpass=f=140,lowpass=f=6200,aecho=1:0.9:281.25|562.5:0.10|0.04,'
               f'apad=whole_len={FRAMES},atrim=end_sample={FRAMES}')
    command(['ffmpeg','-nostdin','-v','error','-i',raw,'-af',filters,'-ar',SR,'-ac','2','-c:a','pcm_f32le',stem],folder/'harp-tone.log',env)
    rate,audio = wavfile.read(stem,mmap=True)
    assert rate==SR and audio.shape==(FRAMES,2)
    squares = 0.
    for begin in range(0,FRAMES,SR):
        block = np.asarray(audio[begin:begin+SR],dtype=np.float64)
        assert np.isfinite(block).all()
        squares += float(np.sum(block**2))
    rms = 10*np.log10(max(squares/(FRAMES*2),1e-20))
    gain = round(float(np.clip(-22.5-rms,-6,12)),2)
    config = run/'studio/sounds.json'
    cfg = json.loads(config.read_text())
    cfg['sounds']['lantern_harp'] = dict(plugin='external_sf2',kind='harp',gain_db=gain,state='',
        soundfont=str(font),bank=0,program=0)
    config.write_text(json.dumps(cfg,indent=2)+'\n')
    (folder/'harp-instrument.json').write_text(json.dumps(dict(
        instrument='FreePats / VCSL Concert Harp',soundfont=str(font),bank=0,program=0,
        soundfont_sha256=hashlib.sha256(font.read_bytes()).hexdigest(),license='CC0',
        raw_rms_db=round(float(rms),2),mix_gain_db=gain),indent=2)+'\n')
    del audio
    others = ','.join(t['name'] for t in song['tracks'] if t['sound']!='lantern_harp')
    print('RENDERING strings, bass and drums',flush=True)
    command([sys.executable,skill/'scripts/render.py',export,'--tracks',others],folder/'instruments.log',env)
    print('MIXING AND VERIFYING',flush=True)
    sys.path.insert(0,str(PACK))
    from finish_suites import finish
    report = finish(folder,cfg)
    report['revision'] = 2
    report['new_lead_instrument'] = 'Concert harp'
    report['instrument_report'] = str(folder/'harp-instrument.json')
    (folder/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    Path(report['mp3']).with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
    (run/'finished.json').write_text(json.dumps([report],indent=2)+'\n')
    print('READY',report['mp3'],flush=True)

if __name__=='__main__':
    main()
