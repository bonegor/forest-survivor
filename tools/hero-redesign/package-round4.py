from pathlib import Path
import json, shutil, subprocess, sys, html
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tools/out/hero-redesign'
manifest=OUT/'pass4/capture-take.json'
latest=json.loads((manifest if manifest.exists() else OUT/'captures/latest.json').read_text())
TAKE=OUT/'captures'/latest['take']
labels={'archer':'Ranger','mage':'Sorcerer','rogue':'Shadow','necromancer':'Necromancer','paladin':'Paladin','druid':'Druid','berserker':'Berserker','witchhunter':'Witch Hunter'}
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
helper=Path.home()/'.codex/skills/forest-survivor-art/scripts/capture-gif.py'
summary=[]
roster=Image.new('RGB',(1024,4*320+70),'#141b1e');rd=ImageDraw.Draw(roster)
rd.text((24,12),'NEW DESIGN / ROUND 3 LEFT - NEW DESIGN RIGHT',font=font,fill='#eee3c1')
for n,id in enumerate(latest['ids']):
    data=json.loads((OUT/f'pass4/assets/{id}.js').read_text().removeprefix('export default ').rstrip(';\n'))
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
        subprocess.run([sys.executable,str(helper),'--frames',str(sampled),'--out',str(OUT/f'round4-{id}-{setting}.gif'),'--duration','100','--scale','1'],check=True,capture_output=True)
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
        sheet.save(OUT/f'round4-{id}-{setting}-poses.png')
        summary.append({'hero':id,'setting':setting,'samples':len(records),'walkFrames':sorted(walk),'facing':sorted({r['variants'][1]['face'] for r in records})})
    x=(n%2)*512;y=70+(n//2)*320
    rd.text((x+18,y),labels[id],font=font,fill='#f2dfa1');rd.text((x+18,y+29),'ROUND 3',font=small,fill='#a9b9b4');rd.text((x+274,y+29),'NEW DESIGN',font=small,fill='#b3d99b')
    im=Image.open(TAKE/id/'day/frames/0000.png').convert('RGB').resize((512,256),Image.Resampling.NEAREST);roster.paste(im,(x,y+55))
roster.save(OUT/'round4-both.png');(OUT/'round4-coverage.json').write_text(json.dumps(summary,indent=2))

notes={
 'archer':'Copper ponytail and exposed elven ears, teal fitted leather and an elegant recurved bow.',
 'mage':'Swept white hair, cobalt robes and ivory collar, a new ritual staff and an outstretched lightning spell.',
 'rogue':'A long bone mask inside a deep teal cowl, a crescent blade and broad sweeping spectral tail.',
 'necromancer':'A stooped occultist in black feathers and wine robes, with a perched crow and new bone staff.',
 'paladin':'A golden cathedral sentinel with closed helm, radiant halo, ivory tabard and two-handed warhammer.',
 'druid':'A hunched forest hermit with shaggy moss hood, pale beard, tattered robe and giant forked branch staff.',
 'berserker':'A broad savage with red topknot, blue warpaint, red wraps and two short axes.',
 'witchhunter':'A crimson hood and ivory half-mask, asymmetric plated leather and a large two-handed crossbow.',
}
cards=[]
for id in latest['ids']:
    cards.append(f'''<article><h2>{labels[id]}</h2><p>{notes[id]}</p><div class="labels"><span>Round 3</span><span>New design</span></div><img loading="lazy" src="round4-{id}-day.gif" width="512" height="256" alt="{labels[id]} previous and new round in the real game"><details><summary>Crypt lighting and full pose sequences</summary><img loading="lazy" src="round4-{id}-crypt.gif" width="512" height="256" alt="{labels[id]} crypt comparison"><p><a href="round4-{id}-day-poses.png">Daylight poses</a> · <a href="round4-{id}-crypt-poses.png">Crypt poses</a> · <a href="captures/{latest['take']}/{id}/day/world.png">Full game view</a></p></details></article>''')
(OUT/'round4.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hero sprites - New design</title><style>body{margin:0;background:#141b1e;color:#dce2d8;font:16px/1.5 system-ui}main{max-width:1120px;margin:40px auto;padding:0 24px}h1,h2{color:#eedba5}h1{font:42px Georgia}a{color:#b3d99b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:24px}article{border:1px solid #35413e;border-radius:12px;padding:18px;background:#1b2526}article img{width:100%;height:auto;image-rendering:pixelated}.labels{display:grid;grid-template-columns:1fr 1fr;color:#adc2b5;font-size:13px;margin-bottom:8px}summary{cursor:pointer;padding:12px 0}p{color:#b5c2bd}.intro{max-width:850px}</style><main><h1>Eight entirely new designs.</h1><div class="intro"><p>Round 3 on the left, completely new characters on the right. Witch Hunter keeps the crossbow; Knight stays unchanged. Ranger retains exposed elf hair and Necromancer keeps the crow.</p><p><a href="/">Interactive game comparison →</a> · <a href="round4-both.png">All eight at a glance</a> · <a href="round3.html">Earlier iterations and review</a></p><p>Captured in the actual game: idle, movement in both directions, diagonal travel, attacks and moving attacks. The jump at the end restarts the demonstration. These are staged proposals.</p></div><div class="grid">'''+''.join(cards)+'</div></main></html>',encoding='utf-8')
(OUT/'pass4/capture-take.json').write_text(json.dumps(latest),encoding='utf-8')
print('Packaged new roster: eight heroes, two lighting settings, complete walk/float pose coverage.')
