from pathlib import Path
import json,base64,sys
from PIL import Image,ImageDraw,ImageFont
root=Path('tools/out/hero-redesign');folder=root/f'pass{sys.argv[1] if len(sys.argv)>1 else 1}';font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
ids=['archer','mage','rogue','necromancer','paladin','druid','berserker','witchhunter']
roster=Image.new('RGB',(4*260,2*285),'#242b33');rd=ImageDraw.Draw(roster)
for no,id in enumerate(ids):
 a=json.loads((folder/'assets'/f'{id}.js').read_text().removeprefix('export default ').rstrip(';\n'));pal=a['palette']
 def frame(i):
  im=Image.new('RGBA',(52,52));im.putdata([((pal[v]&255),(pal[v]>>8)&255,(pal[v]>>16)&255,(pal[v]>>24)&255) for v in base64.b64decode(a['frames'][i])]);return im
 im=frame(0).resize((260,260),Image.Resampling.NEAREST);x=no%4*260;y=no//4*285;roster.paste(im,(x,y+25),im);rd.text((x+10,y+2),id,font=font,fill='#dfd1ad')
 poses=Image.new('RGB',(8*156,2*180),'#242b33');d=ImageDraw.Draw(poses)
 for n,i in enumerate(list(range(8,16))+list(range(16,22))):
  im=frame(i).resize((156,156),Image.Resampling.NEAREST);x=n%8*156;y=n//8*180;poses.paste(im,(x,y+20),im);d.text((x+5,y+2),f'{id} frame {i}',fill='#dfd1ad')
 poses.save(folder/f'{id}-poses.png')
roster.save(folder/'roster-native.png')
