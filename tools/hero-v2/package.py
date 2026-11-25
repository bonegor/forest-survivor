from pathlib import Path
import json, shutil, subprocess, sys, html
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tools/out/hero-v2'
latest=json.loads((OUT/'captures/latest.json').read_text())
TAKE=OUT/'captures'/latest['take']
labels={'archer':'Ranger','mage':'Sorcerer','rogue':'Shadow','necromancer':'Necromancer','paladin':'Paladin','druid':'Druid','berserker':'Berserker'}
notes={'archer':'Woodland hood, open face and leather armor.','mage':'Starred hat and gold-embroidered mantle.','rogue':'Connected cowl and spectral eyes; still floats.','necromancer':'Jade-black vestments and ivory rib armor.','paladin':'Heavy plate and a gold sun aura.','druid':'New oak armor, leaf mantle and seed staff.','berserker':'New wolf fur, broad torso and heavy twin axes.'}
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
helper=Path.home()/'.codex/skills/forest-survivor-art/scripts/capture-gif.py'
summary=[]
roster=Image.new('RGB',(1024,4*320+70),'#141b1e');rd=ImageDraw.Draw(roster)
rd.text((24,12),'HERO V2 PROPOSALS  /  CURRENT LEFT · V2 RIGHT',font=font,fill='#eee3c1')
for n,id in enumerate(latest['ids']):
    for setting in ['day','crypt']:
        folder=TAKE/id/setting;coverage=json.loads((folder/'coverage.json').read_text());records=coverage['records']
        assert len(records)==312,(id,setting,len(records))
        # Keep every third 30 FPS frame, preserving 10.4 seconds at exact 100 ms intervals.
        sampled=folder/'gif-frames';sampled.mkdir(exist_ok=True)
        paths=sorted((folder/'frames').glob('*.png'))
        for i,p in enumerate(paths[::3]):shutil.copyfile(p,sampled/f'{i:04}.png')
        subprocess.run([sys.executable,str(helper),'--frames',str(sampled),'--out',str(OUT/f'{id}-{setting}.gif'),'--duration','100','--scale','2'],check=True,capture_output=True)
        # Full observed pose coverage per action, in chronological order (including loop restart).
        chosen=[]
        for phase in dict.fromkeys(r['phase'] for r in records):
            seen=set();prev=None;phase_indexes=[i for i,r in enumerate(records) if r['phase']==phase]
            for i in phase_indexes:
                f=records[i]['variants'][1]['frame']
                if f not in seen:chosen.append(i);seen.add(f)
                elif prev is not None and f<prev and phase in ['right','left']:
                    chosen.append(i);break
                prev=f
            chosen.append(phase_indexes[-1])
        sheet=Image.new('RGB',(768,((len(chosen)+2)//3)*150),'#141b1e');d=ImageDraw.Draw(sheet)
        for j,i in enumerate(chosen):
            x=(j%3)*256;y=(j//3)*150
            d.text((x+3,y+2),f"{records[i]['phase']} #{records[i]['variants'][1]['frame']}",fill='#e6dab6')
            sheet.paste(Image.open(paths[i]).convert('RGB'),(x,y+20))
        sheet.save(OUT/f'{id}-{setting}-poses.png')
        walks={r['variants'][1]['frame'] for r in records if r['phase'] in ['right','left']}
        summary.append({'hero':id,'setting':setting,'samples':len(records),'walkFrames':sorted(walks),'attackFrames':sorted({r['variants'][1]['frame'] for r in records if r['phase'].startswith('attack')}),'facing':sorted({r['variants'][1]['face'] for r in records})})
    x=(n%2)*512;y=70+(n//2)*320
    rd.text((x+18,y),labels[id],font=font,fill='#f2dfa1')
    rd.text((x+18,y+29),'CURRENT',font=small,fill='#a9b9b4');rd.text((x+274,y+29),'V2',font=small,fill='#b3d99b')
    im=Image.open(TAKE/id/'day/frames/0000.png').convert('RGB').resize((512,256),Image.Resampling.NEAREST)
    roster.paste(im,(x,y+55))
roster.save(OUT/'roster.png')
(OUT/'coverage-summary.json').write_text(json.dumps(summary,indent=2))
cards=[]
for id in latest['ids']:
    cards.append(f'''<article><h2>{labels[id]}</h2><p>{notes[id]}</p><div class="labels"><span>Current</span><span>V2 proposal</span></div><img loading="lazy" src="{id}-day.gif" width="512" height="256" alt="{labels[id]} current and V2 moving in the actual game"><details><summary>Crypt lighting and pose evidence</summary><img loading="lazy" src="{id}-crypt.gif" width="512" height="256" alt="{labels[id]} crypt movement"><p><a href="{id}-day-poses.png">Daylight pose sequence</a> · <a href="{id}-crypt-poses.png">Crypt pose sequence</a> · <a href="captures/{latest['take']}/{id}/day/world.png">Full game view</a></p></details></article>''')
(OUT/'review.html').write_text('''<!doctype html><html><meta charset="utf-8"><title>Hero V2 · recorded comparisons</title><style>body{margin:0;background:#141b1e;color:#dce2d8;font:16px/1.5 system-ui}main{max-width:1100px;margin:40px auto;padding:0 24px}h1,h2{color:#eedba5}h1{font:42px Georgia}a{color:#b3d99b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:24px}article{border:1px solid #35413e;border-radius:12px;padding:18px;background:#1b2526}article img{width:100%;height:auto;image-rendering:pixelated}.labels{display:grid;grid-template-columns:1fr 1fr;color:#adc2b5;font-size:13px;margin-bottom:8px}summary{cursor:pointer;padding:12px 0}p{color:#b5c2bd}</style><main><h1>Seven heroes. V2 in motion.</h1><p>Current designs on the left; V2 proposals on the right. Knight and Witch Hunter are unchanged.</p><p><a href="/">Open interactive game comparison →</a></p><p>Each recording shows idle, right, left, diagonal, attacks in both directions and moving attacks. These are continuous captures from the game; the jump at the end restarts the demonstration.</p><div class="grid">'''+''.join(cards)+'</div></main></html>',encoding='utf8')
print(json.dumps(summary,indent=2))
