// Native Canvas evidence from the production Game, Player, sprite builder and HUD.
// Usage: CANVAS_MODULE=/path/to/@napi-rs/canvas node tools/animation-round/capture-review.mjs baseline [hero ...]
// REVIEW_OUT can choose a fresh take folder; --contacts skips timed world captures.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites, SPR, buildSprite } = await import('../../public/js/engine/sprites.js');
const { Game } = await import('../../public/js/game/game.js');
const { HEROES } = await import('../../public/js/data/heroes.js');
const { defaultProfile, metaBonuses } = await import('../../public/js/shared/profile.js');
const { input } = await import('../../public/js/engine/input.js');
const { view } = await import('../../public/js/engine/view.js');
const { mulberry32 } = await import('../../public/js/engine/util.js');
const { KNIGHT_PLUMED } = await import('../../public/js/art/knight-plumed.js');
buildSprites();
const args = process.argv.slice(2), tag = args.shift() || 'review';
const contactsOnly = args.includes('--contacts');
const requested = args.filter(a => !a.startsWith('--'));
const ids = requested.length ? requested : Object.keys(HEROES);
const root = resolve(process.env.REVIEW_OUT || `output/animation-round/${tag}`);
mkdirSync(root, { recursive: true });
const hash = b => createHash('sha256').update(Buffer.from(b.d.buffer, b.d.byteOffset, b.d.byteLength)).digest('hex');
const report = { tag, nativeRenderer: 'Game/Player/Camera/lighting/HUD', heroes: {} };
function canvas(w, h) { const c = createCanvas(w, h); c.getContext('2d').imageSmoothingEnabled = false; return c; }
function label(ctx, text, x, y) { ctx.fillStyle = '#e7dfc7'; ctx.font = '13px sans-serif'; ctx.fillText(text, x, y); }
function contacts(id, spr) {
  const motions = ['idle','walk','attack'];
  const rows = motions.reduce((n, m) => n + Math.ceil((spr[m].length + 1) / 8), 0);
  const c = canvas(1280, 32 + rows * 150), ctx = c.getContext('2d');
  ctx.fillStyle = '#17202a'; ctx.fillRect(0, 0, c.width, c.height);
  label(ctx, `${HEROES[id]?.title || id} — ${tag} — chronological poses, last tile returns to first`, 10, 20);
  let row = 0;
  const motionData = {};
  for (const motion of motions) {
    const list = [...spr[motion],spr[motion][0]];
    for (let n = 0; n < list.length; n++) {
      const frame = spr.frames[list[n]], x = n % 8 * 160, y = 32 + (row + Math.floor(n / 8)) * 150;
      ctx.fillStyle = (n % 8) % 2 ? '#18232d' : '#1d2a35'; ctx.fillRect(x,y,160,150);
      label(ctx, `${motion} ${n === list.length-1 ? '↻0' : n} / ${list[n]}`, x+7,y+16);
      ctx.drawImage(frame.c, x + (160-frame.w*2)/2, y+21, frame.w*2,frame.h*2);
      ctx.fillStyle = '#62717b'; ctx.fillRect(x+3,y+21+spr.anchorY*2,154,1);
    }
    const frames = spr[motion].map(i=>spr.frames[i].buf);
    motionData[motion] = { frames:spr[motion].length, unique:new Set(frames.map(hash)).size,
      edgePixels:frames.map(b=>{let n=0;for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)if((x===0||y===0||x===b.w-1||y===b.h-1)&&(b.d[y*b.w+x]>>>24))n++;return n;}),
      consecutiveChangedPixels:frames.map((b,n)=>b.d.reduce((sum,p,i)=>sum+(p!==frames[(n+1)%frames.length].d[i]),0)) };
    row += Math.ceil(list.length/8);
  }
  writeFileSync(join(root,`${id}-poses.png`),c.toBuffer('image/png'));
  if(spr.attackWalk){
    const aw=canvas(160*spr.walk.length,32+150*spr.attack.length),ac=aw.getContext('2d');
    ac.fillStyle='#17202a';ac.fillRect(0,0,aw.width,aw.height);
    label(ac,`${HEROES[id]?.title || id} / each attack phase down, complete gait across`,8,20);
    for(let k=0;k<spr.attack.length;k++)for(let j=0;j<spr.walk.length;j++){
      const fr=spr.frames[spr.attackWalk[k][j]],x=j*160,y=32+k*150;
      ac.fillStyle=j%2?'#18232d':'#1d2a35';ac.fillRect(x,y,160,150);
      label(ac,`attack ${k} / gait ${j}`,x+6,y+16);
      ac.drawImage(fr.c,x+(160-fr.w*2)/2,y+21,fr.w*2,fr.h*2);
      ac.fillStyle='#62717b';ac.fillRect(x+3,y+21+spr.anchorY*2,154,1);
    }
    writeFileSync(join(root,`${id}-moving-attacks.png`),aw.toBuffer('image/png'));
  }
  return { dimensions:[spr.w,spr.h],anchorY:spr.anchorY,idleFps:spr.idleRate*1.6,attackFps:spr.attackFps,attackRelease:spr.attackRelease,motionRate:spr.motionRate,floating:spr.floating,attackWalk:!!spr.attackWalk,frameFingerprint:createHash('sha256').update(spr.frames.map(fr=>hash(fr.buf)).join('')).digest('hex'),motions:motionData };
}
for (const id of ids) report.heroes[id] = contacts(id,SPR[HEROES[id].sprite]);
contacts('plumed-reference',buildSprite('plumed-reference',KNIGHT_PLUMED));
const over=canvas(280*7,180*Math.ceil(ids.length/7)),oc=over.getContext('2d');
oc.fillStyle='#17202a';oc.fillRect(0,0,over.width,over.height);
ids.forEach((id,n)=>{const spr=SPR[id],fr=spr.frames[spr.idle[0]],x=n%7*280,y=Math.floor(n/7)*180;label(oc,HEROES[id].title,x+8,y+18);oc.drawImage(fr.c,x+(280-fr.w*2)/2,y+30,fr.w*2,fr.h*2);});
writeFileSync(join(root,'roster.png'),over.toBuffer('image/png'));
writeFileSync(join(root,'coverage.json'),JSON.stringify(report,null,2));
if(contactsOnly) process.exit(0);
const W=480,H=300,HZ=60,FPS=Number(process.env.REVIEW_FPS || 20),STRIDE=HZ/FPS;
if(!Number.isInteger(STRIDE))throw Error('REVIEW_FPS must divide 60');
const world=canvas(W,H),ctx=world.getContext('2d'),ui=canvas(W,H),uctx=ui.getContext('2d');
Object.assign(view,{canvas:world,ctx,ui,uctx,S:1,W,H,pxW:W,pxH:H,zoom:1});
const phases=[{name:'idle-right',seconds:2.4,x:0,y:0,face:1},{name:'walk-right',seconds:1.6,x:1,y:0,face:1},{name:'walk-left',seconds:1.6,x:-1,y:0,face:-1},{name:'walk-diagonal',seconds:1.6,x:Math.SQRT1_2,y:-Math.SQRT1_2,face:1},{name:'field-attack-right',seconds:1.6,x:0,y:0,face:1,combat:true},{name:'field-attack-moving',seconds:1.6,x:1,y:0,face:1,combat:true},{name:'field-attack-left',seconds:1.6,x:0,y:0,face:-1,combat:true},{name:'crypt-attack-right',seconds:1.4,x:0,y:0,face:1,combat:true,manual:true},{name:'crypt-attack-moving-left',seconds:1.4,x:-1,y:0,face:-1,combat:true,manual:true}];
const profile=defaultProfile(),beforeProfile=JSON.stringify(profile),random=Math.random,bot=input.bot;
try {
for(const id of ids){
  Math.random=mulberry32(29471);
  const g=new Game({hero:id,mode:'s15',map:'forest',diff:'easy',meta:metaBonuses(profile),settings:{numbers:false,softFlash:true},crypts:false});
  g.spawner.update=()=>{};g.player.devGod=true;g.banners.length=0;g.syncCam();g.cam.x=g.player.x-W/2;g.cam.y=g.player.y-8-H/2;
  const spr=SPR[g.player.hero.sprite],dir=join(root,`${id}-world`);mkdirSync(dir,{recursive:true});
  const seen={},samples=[],poseCounts={},sheet=canvas(W*4,H*3),sc=sheet.getContext('2d');
  let sample=0,clipped=0,stage=0;
  for(const phase of phases){
    if(phase.manual&&!g.inCrypt){
      input.bot={x:0,y:0};
      g.enterCrypt({key:'0,0',depth:1,x:g.player.x,y:g.player.y-40});
      for(let wait=0;wait<180&&(!g.inCrypt||g.state!=='play');wait++)g.update(1/HZ);
      if(!g.inCrypt||g.state!=='play')throw Error(`${id}: crypt entrance did not complete`);
      for(const enemy of g.enemies)enemy.dormant=true;
      g.player.invuln=0;g.banners.length=0;
    }
    g.player.face=phase.face;g.player.aim=phase.face<0?Math.PI:0;
    input.bot={x:phase.x,y:phase.y};
    let target=null;
    if(phase.combat){
      // Each scene has a single live target. A surviving target from the previous
      // facing would correctly suppress a forward pose for a shot aimed behind.
      for(const enemy of g.enemies)enemy.dead=true;
      // A necromancer that already has the maximum summons correctly declines to
      // cast. Clear only the disposable review summons so this scene can show one.
      if(id==='necromancer')g.minions.length=0;
      target=g.spawnEnemy('skeleton',g.player.x+phase.face*30,g.player.y,{instant:true,always:true,hpMul:10000,xpMul:0});target.speed=0;
      for(const w of g.player.weapons)w.cd=0;
    }
    const frames=phase.seconds*HZ;
    for(let n=0;n<frames;n++){
      if(target){target.x=g.player.x+phase.face*30;target.y=g.player.y;}
      if(phase.manual&&n===1){g.mainWeapon().cd=0;if(!g.strike())throw Error(`${id}: manual strike failed`);}
      g.update(1/HZ);g.placePlayer(g.cam);
      const idx=spr.frames.indexOf(g.player._rect[4]);(seen[phase.name]??=new Set()).add(idx);poseCounts[idx]=(poseCounts[idx]||0)+1;
      if(n%STRIDE)continue;
      g.draw(ctx);uctx.clearRect(0,0,W,H);g.hud.draw(uctx,W,H,g.clock,1/FPS);ctx.drawImage(ui,0,0);
      const rect=g.player._rect;
      if(rect[0]<0||rect[1]<0||rect[0]+rect[2]>W||rect[1]+rect[3]>H)clipped++;
      writeFileSync(join(dir,`${String(sample).padStart(4,'0')}.png`),world.toBuffer('image/png'));
      samples.push({frame:sample,time:g.clock,phase:phase.name,spriteFrame:idx,face:g.player.face,rect:rect.slice(0,4),attack:!!g.player.heroAttack});sample++;
      if(n===Math.floor(frames/2/STRIDE)*STRIDE)sc.drawImage(world,stage%4*W,Math.floor(stage/4)*H);
    }
    const framesSeen=seen[phase.name];
    if(phase.name==='idle-right'){
      if([...framesSeen].some(index=>!spr.idle.includes(index)))throw Error(`${id}: an attack interrupted the quiet idle phase`);
      if(!spr.idle.every(index=>framesSeen.has(index)))throw Error(`${id}: incomplete idle loop capture`);
    }
    if(phase.name.startsWith('walk-')){
      if([...framesSeen].some(index=>!spr.walk.includes(index)))throw Error(`${id}: an attack interrupted the quiet walking phase`);
      if(!spr.walk.every(index=>framesSeen.has(index)))throw Error(`${id}: incomplete ${phase.name} loop capture`);
    }
    if(phase.combat){
      const attacking=new Set(phase.x&&spr.attackWalk?spr.attackWalk.flat():spr.attack);
      if(![...framesSeen].some(index=>attacking.has(index)))throw Error(`${id}: ${phase.name} never displayed an attack`);
    }
    stage++;
  }
  const data={frames:sample,fps:FPS,clipped,damage:g.stats.damage,seen:Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,[...v]])),poseCounts};
  report.heroes[id].world=data;
  writeFileSync(join(dir,'samples.json'),JSON.stringify(samples));
  writeFileSync(join(root,`${id}-world-contact.png`),sheet.toBuffer('image/png'));
  writeFileSync(join(root,'coverage.json'),JSON.stringify(report,null,2));
  console.log(`${id}: ${sample} frames, ${clipped} clipped, ${Math.round(g.stats.damage)} damage, field attack frames ${[...new Set([...seen['field-attack-right'],...seen['field-attack-left']])].filter(n=>spr.attack.includes(n)).join(',')}`);
}
} finally {Math.random=random;input.bot=bot;}
if(JSON.stringify(profile)!==beforeProfile)throw Error('Capture changed its in-memory review profile');
console.log(root);
