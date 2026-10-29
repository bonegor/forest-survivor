"""Render Spark Rush's long score one stem at a time, without full-song mastering.

python render_stems.py --output NEW_OUTPUT_FOLDER

The output contains export/stems, an isolated mix-config.json and source copies.
No plugins are rendered until this command is explicitly run.
"""
from pathlib import Path
import argparse,gc,json,os,shutil,sys
import numpy as np
HERE=Path(__file__).resolve().parent
SKILL=Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0,str(SKILL/'scripts'))
from common import HOME,load_config,write_wav_float,rms_db,hard_exit
from song import S
from voices import synth_track,punch_track,set_level
from mix_recipe import revise_stem
SR=44100
FRAMES=900*SR

def run():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    folder=args.output.resolve()
    if folder.exists():parser.error('Use a fresh output folder to preserve previous renders')
    folder.mkdir(parents=True)
    for source in HERE.glob('*.py'):shutil.copy2(source,folder/source.name)
    song=S.export(str(folder/'export'))
    assert song['length_sec']==900 and len(song['tracks'])==5
    cfg=load_config()
    cfg['sample_rate']=SR
    for sound in cfg['sounds'].values():
        for entry in (sound,sound.get('fx',{})):
            if entry.get('state') and not Path(entry['state']).is_absolute():
                entry['state']=str(Path(HOME)/entry['state'])
    for tr in song['tracks']:
        if tr['sound']!='drums':
            cfg['sounds'][tr['sound']]=dict(plugin='external_synth',kind='synth',gain_db=0,state='')
    (folder/'mix-config.json').write_text(json.dumps(cfg,indent=2)+'\n')
    studio=folder/'studio'
    studio.mkdir()
    (studio/'sounds.json').write_text(json.dumps(cfg,indent=2)+'\n')
    stems=folder/'export/stems'
    stems.mkdir()
    targets={'Live drums':-17.,'Club punch':-18.2,'Spring bass':-22.5,'Pulse chords':-26.,'Pluck hook':-28.}
    report=[]
    from render import render_plugin
    for track in song['tracks']:
        name=track['name']
        print('RENDERING',name,flush=True)
        if name=='Live drums':audio=render_plugin(track,'drums',cfg,900,S.bpm,print)
        elif name=='Club punch':audio=punch_track(track,FRAMES)
        else:audio=synth_track(track,FRAMES,{'Spring bass':'bass','Pulse chords':'chord','Pluck hook':'hook'}[name])
        if audio.shape[1]<FRAMES:audio=np.pad(audio,((0,0),(0,FRAMES-audio.shape[1])))
        audio=audio[:,:FRAMES]
        assert np.isfinite(audio).all() and rms_db(audio)>-75,name
        audio=set_level(audio,targets[name])
        if name in ('Spring bass','Pulse chords','Pluck hook'):
            amount=.36 if name=='Spring bass' else .49
            for start in range(0,FRAMES,SR):
                end=min(FRAMES,start+SR)
                phase=(np.arange(start,end)/SR)%(60/S.bpm)
                audio[:,start:end]*=1-amount*np.exp(-phase/.055)
        audio=revise_stem(name,audio,SR)
        assert np.isfinite(audio).all()
        write_wav_float(str(stems/(name+'.wav')),SR,audio)
        record=dict(name=name,rms_db=round(rms_db(audio),2),peak_db=round(20*np.log10(max(float(np.max(np.abs(audio))),1e-12)),2),samples=audio.shape[1])
        report.append(record)
        print('SAVED',json.dumps(record),flush=True)
        del audio
        gc.collect()
    (folder/'stems-report.json').write_text(json.dumps(dict(title=song['title'],seconds=900,samples=FRAMES,glue=False,stems=report),indent=2)+'\n')
    print('ALL STEMS READY',folder,flush=True)
    hard_exit(0)

if __name__=='__main__':run()
