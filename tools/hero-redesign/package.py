from pathlib import Path
import json, shutil, subprocess, sys, html
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tools/out/hero-redesign'
manifest=OUT/'pass2/capture-take.json'
latest=json.loads((manifest if manifest.exists() else OUT/'captures/latest.json').read_text())
TAKE=OUT/'captures'/latest['take']
labels={'archer':'Ranger','mage':'Sorcerer','rogue':'Shadow','necromancer':'Necromancer','paladin':'Paladin','druid':'Druid','berserker':'Berserker','witchhunter':'Witch Hunter'}
feedback=json.loads((ROOT/'tools/hero-redesign/review/feedback.json').read_text(encoding='utf-8-sig'))
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
helper=Path.home()/'.codex/skills/forest-survivor-art/scripts/capture-gif.py'
summary=[]
roster=Image.new('RGB',(1024,4*320+70),'#141b1e');rd=ImageDraw.Draw(roster)
rd.text((24,12),'NEW HEROES / FIRST GENERATION LEFT · REVIEW FIXUPS RIGHT',font=font,fill='#eee3c1')
for n,id in enumerate(latest['ids']):
    data=json.loads((OUT/f'pass2/assets/{id}.js').read_text().removeprefix('export default ').rstrip(';\n'))
    for setting in ['day','crypt']:
        folder=TAKE/id/setting;coverage=json.loads((folder/'coverage.json').read_text());records=coverage['records']
        assert len(records)==312,(id,setting,len(records))
        assert abs(records[-1]['t']-10.383333333)<.002,(id,setting,'interrupted recording')
        assert all(r['variants'][1]['hero']==id for r in records),(id,'wrong hero')
        walk={r['variants'][1]['frame'] for r in records if r['phase'] in ['right','left']}
        assert set(data['walk'])<=walk,(id,setting,'missing walk/float pose')
        assert all(0<=r['variants'][1]['frame']<len(data['frames']) for r in records)
        sampled=folder/'gif-frames';sampled.mkdir(exist_ok=True)
        paths=sorted((folder/'frames').glob('*.png'))
        for i,p in enumerate(paths[::3]):shutil.copyfile(p,sampled/f'{i:04}.png')
        subprocess.run([sys.executable,str(helper),'--frames',str(sampled),'--out',str(OUT/f'{id}-{setting}.gif'),'--duration','100','--scale','2'],check=True,capture_output=True)
        chosen=[]
        for phase in dict.fromkeys(r['phase'] for r in records):
            seen=set();prev=None;phase_indexes=[i for i,r in enumerate(records) if r['phase']==phase]
            for i in phase_indexes:
                f=records[i]['variants'][1]['frame']
                if f not in seen:chosen.append(i);seen.add(f)
                elif prev is not None and f<prev and phase in ['right','left']:chosen.append(i);break
                prev=f
            chosen.append(phase_indexes[-1])
        sheet=Image.new('RGB',(768,((len(chosen)+2)//3)*150),'#141b1e');d=ImageDraw.Draw(sheet)
        for j,i in enumerate(chosen):
            x=(j%3)*256;y=(j//3)*150;d.text((x+3,y+2),f"{records[i]['phase']} #{records[i]['variants'][1]['frame']}",fill='#e6dab6');sheet.paste(Image.open(paths[i]).convert('RGB'),(x,y+20))
        sheet.save(OUT/f'{id}-{setting}-poses.png')
        summary.append({'hero':id,'setting':setting,'samples':len(records),'walkFrames':sorted(walk),'facing':sorted({r['variants'][1]['face'] for r in records})})
    x=(n%2)*512;y=70+(n//2)*320
    rd.text((x+18,y),labels[id],font=font,fill='#f2dfa1');rd.text((x+18,y+29),'FIRST GENERATION',font=small,fill='#a9b9b4');rd.text((x+274,y+29),'AFTER REVIEW',font=small,fill='#b3d99b')
    im=Image.open(TAKE/id/'day/frames/0000.png').convert('RGB').resize((512,256),Image.Resampling.NEAREST);roster.paste(im,(x,y+55))
roster.save(OUT/'both-iterations.png');(OUT/'coverage-summary.json').write_text(json.dumps(summary,indent=2))
cards=[]
for id in latest['ids']:
    f=feedback.get(id,feedback.get('heroes',{}).get(id,{}));assessment=html.escape(f.get('assessment',''));fix=html.escape(f.get('fix',''))
    cards.append(f'''<article><h2>{labels[id]}</h2><div class="labels"><span>01 · First generation</span><span>02 · After review</span></div><img loading="lazy" src="{id}-day.gif" width="512" height="256" alt="{labels[id]} generation and review fixup moving in the actual game"><div class="critique"><strong>Reviewer’s take</strong><p>{assessment}</p><strong>Requested fix</strong><p>{fix}</p></div><details><summary>Crypt lighting and pose evidence</summary><img loading="lazy" src="{id}-crypt.gif" width="512" height="256" alt="{labels[id]} crypt movement"><p><a href="{id}-day-poses.png">Daylight pose sequence</a> · <a href="{id}-crypt-poses.png">Crypt pose sequence</a> · <a href="captures/{latest['take']}/{id}/day/world.png">Full game view</a></p></details></article>''')
skill='https://github.com/ProkStudio/skills/blob/de1d5f60c10a142f45aca7d07aabb2eed8887e17/skills/game/2d/pixel-art-fundamentals/SKILL.md'
(OUT/'review.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eight new heroes · generation and review</title><style>body{margin:0;background:#141b1e;color:#dce2d8;font:16px/1.5 system-ui}main{max-width:1120px;margin:40px auto;padding:0 24px}h1,h2{color:#eedba5}h1{font:42px Georgia}a{color:#b3d99b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:24px}article{border:1px solid #35413e;border-radius:12px;padding:18px;background:#1b2526}article img{width:100%;height:auto;image-rendering:pixelated}.labels{display:grid;grid-template-columns:1fr 1fr;color:#adc2b5;font-size:13px;margin-bottom:8px}summary{cursor:pointer;padding:12px 0}p{color:#b5c2bd}.critique{font-size:14px;padding:14px;border-left:2px solid #93804b;margin:14px 0}.critique p{margin:5px 0 12px}.intro{max-width:850px}.steps{color:#c6ad73;font-size:13px;letter-spacing:.08em}</style><main><div class="steps">01 GENERATION → 02 INDEPENDENT CRITIQUE → 03 ONE FIXUP PASS</div><h1>Eight entirely new heroes.</h1><div class="intro"><p>The first generation is on the left, the review fixup on the right. Knight stays as approved. Ranger is an elf with exposed hair; Necromancer carries a crow.</p><p>All eight models were drawn from scratch in the game’s native pixel style and palette. These are staged proposals, with movement, diagonal travel, attacks and moving attacks captured in the actual game.</p><p><a href="/">Interactive game comparison →</a> · <a href="both-iterations.png">Both iterations at a glance</a></p><p>The independent reviewer consulted the vetted <a href="'''+skill+'''">Pixel Art Fundamentals skill</a>. Their first-pass criticism is included with each class. The loop jump resets the full demonstration; it is not a walk-cycle seam.</p></div><div class="grid">'''+''.join(cards)+'</div></main></html>',encoding='utf8')
print(f'Packaged {len(latest["ids"])} pairs across daylight and crypts; complete walk/float pose coverage.')
