"""Package native Game captures; preserve recorded frame timing and hard pixels."""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse,json,subprocess,sys

p=argparse.ArgumentParser()
p.add_argument('root',type=Path)
p.add_argument('--ids',nargs='*')
p.add_argument('--helper',type=Path)
a=p.parse_args()
coverage=json.loads((a.root/'coverage.json').read_text())
ids=a.ids or list(coverage['heroes'])
ready=[hero for hero in ids if 'world' in coverage['heroes'][hero]]
for hero in ready:
    folder=a.root/f'{hero}-world'
    fps=coverage['heroes'][hero]['world']['fps']
    out=a.root/f'{hero}-game.gif'
    if a.helper:
        subprocess.run([sys.executable,str(a.helper),'--frames',str(folder),'--out',str(out),'--duration',str(round(1000/fps))],check=True)
    frames=[Image.open(path).convert('RGB') for path in sorted(folder.glob('*.png'))]
    # GIF uses centiseconds. Distribute rounding to keep the complete take's duration.
    durations=[(round((i+1)*100/fps)-round(i*100/fps))*10 for i in range(len(frames))]
    frames[0].save(out,save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=False)
    samples=json.loads((folder/'samples.json').read_text())
    tiles=[]
    for im,sample in zip(frames,samples):
        x,y,w,h=sample['rect']
        # Each crop keeps the real scene around the hero and native registration.
        im=im.crop((x-8,y-10,x+w+8,y+h+10)).resize(((w+16)*3,(h+20)*3),Image.Resampling.NEAREST)
        tile=Image.new('RGB',(im.width,im.height+24),'#17202a')
        tile.paste(im,(0,24));draw=ImageDraw.Draw(tile)
        draw.text((6,6),f"{hero} / {sample['phase']}",fill='#e7dfc7')
        tiles.append(tile)
    tiles[0].save(a.root/f'{hero}-detail.gif',save_all=True,append_images=tiles[1:],duration=durations,loop=0,optimize=False)
    print(f'{hero}: {len(frames)} frames, {sum(durations)}ms')
if ready:
    fps=coverage['heroes'][ready[0]]['world']['fps']
    count=min(coverage['heroes'][hero]['world']['frames'] for hero in ready)
    metas={hero:json.loads((a.root/f'{hero}-world'/'samples.json').read_text()) for hero in ready}
    columns=min(7,len(ready));rows=(len(ready)+columns-1)//columns
    frames=[]
    for n in range(count):
        canvas=Image.new('RGB',(192*columns,192*rows),'#17202a');draw=ImageDraw.Draw(canvas)
        for k,hero in enumerate(ready):
            im=Image.open(a.root/f'{hero}-world'/f'{n:04d}.png').convert('RGB')
            x,y,w,h=metas[hero][n]['rect']
            im=im.crop((x-8,y-16,x+w+8,y+h+16)).resize((192,192),Image.Resampling.NEAREST)
            col=k%columns*192;row=k//columns*192
            canvas.paste(im,(col,row));draw.rectangle((col,row,col+192,row+17),fill='#17202a')
            draw.text((col+4,row+3),hero,fill='#e7dfc7')
        frames.append(canvas)
    durations=[(round((i+1)*100/fps)-round(i*100/fps))*10 for i in range(count)]
    frames[0].save(a.root/'roster-game.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=False)
    print('roster-game.gif')
