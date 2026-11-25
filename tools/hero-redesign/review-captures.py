from pathlib import Path
import json,sys
from PIL import Image,ImageDraw,ImageFont
root=Path('tools/out/hero-redesign');take=sys.argv[1] if len(sys.argv)>1 else json.loads((root/'captures/latest.json').read_text())['take'];folder=root/'captures'/take
ids=['archer','mage','rogue','necromancer','paladin','druid','berserker','witchhunter'];font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
# Native game captures, with both live renderings shown unaltered except integer enlargement.
for setting in ['day','crypt']:
 roster=Image.new('RGB',(1024,4*300+42),'#171e23');d=ImageDraw.Draw(roster);d.text((18,8),f'FIRST PASS / current left, new right / {setting}',font=font,fill='#e5d7b0')
 for row,id in enumerate(ids):
  f=folder/id/setting/'frames/0000.png'
  if not f.exists():continue
  x=row%2*512;y=42+row//2*300;d.text((x+16,y+6),id,font=font,fill='#e5d7b0');roster.paste(Image.open(f).convert('RGB').resize((512,256),Image.Resampling.NEAREST),(x,y+35))
 roster.save(root/f'pass1/game-{setting}-roster.png')
 for id in ids:
  f=folder/id/setting;c=f/'coverage.json'
  if not c.exists():continue
  records=json.loads(c.read_text())['records'];chosen=[]
  for phase in dict.fromkeys(r['phase'] for r in records):
   seen=set()
   for i,r in enumerate(records):
    if r['phase']!=phase:continue
    frame=r['variants'][1]['frame']
    if frame not in seen:chosen.append(i);seen.add(frame)
  out=Image.new('RGB',(768,((len(chosen)+2)//3)*150),'#171e23');draw=ImageDraw.Draw(out)
  for n,i in enumerate(chosen):
   x=n%3*256;y=n//3*150;draw.text((x+3,y+3),f"{records[i]['phase']} frame {records[i]['variants'][1]['frame']}",fill='#e5d7b0');out.paste(Image.open(f/'frames'/f'{i:04}.png').convert('RGB'),(x,y+20))
  out.save(root/f'pass1/{id}-{setting}-game-poses.png')
print(take)
