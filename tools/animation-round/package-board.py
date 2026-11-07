"""Build a compact all-hero board from real Game captures without retiming any hero."""
from pathlib import Path
from PIL import Image,ImageDraw
import argparse,json
p=argparse.ArgumentParser()
p.add_argument('output',type=Path)
p.add_argument('groups',nargs='+',type=Path)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
heroes={};sources={}
for group in a.groups:
    for hero,data in json.loads((group/'coverage.json').read_text())['heroes'].items():
        if 'world' in data:heroes[hero]=data;sources[hero]=group
order=['knight','archer','mage','rogue','necromancer','paladin','druid','berserker','witchhunter','footman','marksman','templar','trailblazer','thornkeeper','wraith','gravebinder','arcanist','praetorian','seraph','boltguard','swordbearer']
ids=[hero for hero in order if hero in heroes]
fps=heroes[ids[0]]['world']['fps'];wanted=['idle-right','walk-right','crypt-attack-right']
clips={};allmeta={}
for hero in ids:
    folder=sources[hero]/f'{hero}-world'
    meta=json.loads((folder/'samples.json').read_text());allmeta[hero]=meta
    chosen=[sample for phase in wanted for sample in meta if sample['phase']==phase]
    clips[hero]=[]
    for sample in chosen:
        im=Image.open(folder/f"{sample['frame']:04d}.png").convert('RGB')
        x,y,w,h=sample['rect']
        im=im.crop((x-8,y-16,x+w+8,y+h+16)).resize((192,192),Image.Resampling.NEAREST)
        tile=Image.new('RGB',(192,212),'#17202a');tile.paste(im,(0,20));draw=ImageDraw.Draw(tile)
        phase={'idle-right':'idle','walk-right':'walk','crypt-attack-right':'attack'}[sample['phase']]
        draw.text((5,5),f'{hero} / {phase}',fill='#e7dfc7');clips[hero].append(tile)
    indexed=[im.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE) for im in clips[hero]]
    durations=[(round((i+1)*100/fps)-round(i*100/fps))*10 for i in range(len(indexed))]
    indexed[0].save(a.output/f'{hero}-review.gif',save_all=True,append_images=indexed[1:],duration=durations,loop=0,optimize=False)
    print(hero,flush=True)
columns=7;rows=(len(ids)+6)//7;count=min(len(clips[hero]) for hero in ids);boards=[]
for n in range(count):
    board=Image.new('RGB',(columns*192,rows*212),'#17202a')
    for k,hero in enumerate(ids):board.paste(clips[hero][n],(k%columns*192,k//columns*212))
    boards.append(board)
durations=[(round((i+1)*100/fps)-round(i*100/fps))*10 for i in range(count)]
indexed=[im.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE) for im in boards]
indexed[0].save(a.output/'roster-game.gif',save_all=True,append_images=indexed[1:],duration=durations,loop=0,optimize=False)
for title,second in [('idle',1.1),('walk',3.1),('attack',4.2)]:boards[min(count-1,round(second*fps))].save(a.output/f'roster-{title}.png')
json.dump({'nativeRenderer':'Game/Player/Camera/lighting/HUD','displayPhases':wanted,'fps':fps,'frames':count,'durationMs':sum(durations),'heroes':{hero:{**heroes[hero],'sourceCapture':str(sources[hero])} for hero in ids}},(a.output/'coverage.json').open('w'),indent=2)
print(str(a.output/'roster-game.gif'),flush=True)
