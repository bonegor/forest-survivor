// Native Canvas evidence from the production Game, Player, sprite builder and HUD.
// Usage: CANVAS_MODULE=/path/to/@napi-rs/canvas node tools/animation-round/capture-review.mjs baseline [hero ...]
// REVIEW_OUT can choose a fresh take folder; --contacts skips timed world captures.
// --walk-only records 30 fps travel, stop/restart, slow travel and moving combat.
// REVIEW_DIFF selects a real difficulty; REVIEW_PHASES is a comma-separated scene subset.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const { moveFor } = await import('../../public/js/data/difficulty.js');
const { KNIGHT_PLUMED } = await import('../../public/js/art/knight-plumed.js');
buildSprites();
// Stage a proposed sheet in memory without changing the production artwork.
// The movement conversion is the same as approved-heroes.js and the browser review.
if (process.env.REVIEW_SHEETS) {
  for (const [id, hero] of Object.entries(HEROES)) {
    const data = (await import(pathToFileURL(resolve(process.env.REVIEW_SHEETS, `${id}.js`)))).default;
    const manualDelay = SPR[hero.sprite].manualDelay;
    SPR[hero.sprite] = buildSprite(hero.sprite, {
      gen: () => data.frames.map(([x,y,w,h,encoded]) => {
        const raw = Buffer.from(encoded,'base64'), d = new Uint32Array(data.w*data.h), n = data.indexBytes;
        for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++){
          const k=(iy*w+ix)*n;d[(iy+y)*data.w+ix+x]=data.palette[raw[k]|(n===2?raw[k+1]<<8:0)];
        }
        return {w:data.w,h:data.h,d};
      }),
      ...Object.fromEntries(['idle','walk','attack','attackWalk','attackRelease','attackFps','anchorY','floating'].map(k=>[k,data[k]])),
      motionRate:data.walkFps/(9.8*Math.max(.6,Math.min(1.6,moveFor('s15','easy')*(hero.stats.speed||1)))),
      idleRate:data.idleFps/1.6,selfBob:true,outline:false,manualDelay,
    });
  }
}
const args = process.argv.slice(2), tag = args.shift() || 'review';
const contactsOnly = args.includes('--contacts');
const walkOnly = args.includes('--walk-only');
const requested = args.filter(a => !a.startsWith('--'));
const ids = requested.length ? requested : Object.keys(HEROES);
const root = resolve(process.env.REVIEW_OUT || `output/animation-round/${tag}`);
const difficulty = process.env.REVIEW_DIFF || 'easy';
mkdirSync(root, { recursive: true });
const hash = b => createHash('sha256').update(Buffer.from(b.d.buffer, b.d.byteOffset, b.d.byteLength)).digest('hex');
const report = { tag, nativeRenderer: 'Game/Player/Camera/lighting/HUD', sheetSource:process.env.REVIEW_SHEETS||'public/assets/heroes-approved',capture: walkOnly ? 'walk' : 'full', difficulty, heroes: {} };
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
  if(walkOnly)for(const [name,ground] of [['dark','#26313a'],['light','#bdb8a5']]){
    // Fixed native crop and pivot on every tile: enlarged anatomy review must
    // not hide registration jumps by independently centring each source pose.
    const list=[...spr.walk,spr.walk[0]],detail=canvas(768,28+Math.ceil(list.length/4)*216),dc=detail.getContext('2d');
    dc.fillStyle=ground;dc.fillRect(0,0,detail.width,detail.height);
    dc.fillStyle=name==='light'?'#17202a':'#e7dfc7';dc.font='13px sans-serif';
    dc.fillText(`${id}: every native gait pose and loop return, fixed crop at 4x`,8,18);
    list.forEach((index,n)=>{
      const x=n%4*192,y=28+Math.floor(n/4)*216,frame=spr.frames[index];
      dc.drawImage(frame.c,16,12,48,48,x,y,192,192);
      dc.fillStyle=name==='light'?'#6d6a60':'#62717b';dc.fillRect(x+2,y+(spr.anchorY-12)*4,188,1);
      dc.fillStyle=name==='light'?'#17202a':'#e7dfc7';dc.fillText(`${n===list.length-1?'return to 0':`phase ${n}`} / pose ${index}`,x+7,y+208);
    });
    writeFileSync(join(root,`${id}-walk-detail-${name}.png`),detail.toBuffer('image/png'));
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
const W=480,H=300,HZ=60,FPS=Number(process.env.REVIEW_FPS || (walkOnly ? 30 : 20)),STRIDE=HZ/FPS;
if(!Number.isInteger(STRIDE))throw Error('REVIEW_FPS must divide 60');
const world=canvas(W,H),ctx=world.getContext('2d'),ui=canvas(W,H),uctx=ui.getContext('2d');
Object.assign(view,{canvas:world,ctx,ui,uctx,S:1,W,H,pxW:W,pxH:H,zoom:1});
const phases=walkOnly ? [
  {name:'walk-right',seconds:1.8,x:1,y:0,face:1},
  {name:'walk-left',seconds:1.8,x:-1,y:0,face:-1},
  {name:'walk-diagonal',seconds:1.8,x:Math.SQRT1_2,y:-Math.SQRT1_2,face:1},
  {name:'stop',seconds:.6,x:0,y:0,face:1},
  {name:'restart',seconds:1.2,x:1,y:0,face:1},
  {name:'slow-travel',seconds:1.8,x:.2,y:0,face:1},
  {name:'field-attack-moving',seconds:1.8,x:1,y:0,face:1,combat:true},
  {name:'crypt-attack-moving-left',seconds:1.8,x:-1,y:0,face:-1,combat:true,manual:true},
] : [{name:'idle-right',seconds:2.4,x:0,y:0,face:1},{name:'walk-right',seconds:1.6,x:1,y:0,face:1},{name:'walk-left',seconds:1.6,x:-1,y:0,face:-1},{name:'walk-diagonal',seconds:1.6,x:Math.SQRT1_2,y:-Math.SQRT1_2,face:1},{name:'field-attack-right',seconds:1.6,x:0,y:0,face:1,combat:true},{name:'field-attack-moving',seconds:1.6,x:1,y:0,face:1,combat:true},{name:'field-attack-left',seconds:1.6,x:0,y:0,face:-1,combat:true},{name:'crypt-attack-right',seconds:1.4,x:0,y:0,face:1,combat:true,manual:true},{name:'crypt-attack-moving-left',seconds:1.4,x:-1,y:0,face:-1,combat:true,manual:true}];
// Waiting below must breathe too: entering a crypt alone cannot start an attack.
phases.splice(phases.findIndex(phase=>phase.manual),0,{name:'crypt-idle',seconds:2.4,x:0,y:0,face:1,crypt:true});
const requestedPhases=process.env.REVIEW_PHASES?.split(',');
const selectedPhases=requestedPhases?phases.filter(phase=>requestedPhases.includes(phase.name)):phases;
if(!selectedPhases.length||requestedPhases?.some(name=>!phases.some(phase=>phase.name===name)))throw Error('Unknown or empty REVIEW_PHASES');
const profile=defaultProfile(),beforeProfile=JSON.stringify(profile),random=Math.random,bot=input.bot;
try {
for(const id of ids){
  Math.random=mulberry32(29471);
  const g=new Game({hero:id,mode:'s15',map:'forest',diff:difficulty,meta:metaBonuses(profile),settings:{numbers:false,softFlash:true},crypts:false});
  g.spawner.update=()=>{};g.player.devGod=true;g.banners.length=0;g.player.anim=0;g.player.idleAnim=0;g.syncCam();g.cam.x=g.player.x-W/2;g.cam.y=g.player.y-8-H/2;
  const spr=SPR[g.player.hero.sprite],dir=join(root,`${id}-world`);mkdirSync(dir,{recursive:true});
  const seen={},samples=[],poseCounts={},phaseMetrics={},sheet=canvas(W*4,H*3),sc=sheet.getContext('2d');
  let sample=0,clipped=0,stage=0;
  for(const phase of selectedPhases){
    if((phase.manual||phase.crypt)&&!g.inCrypt){
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
    const gaitStart=g.player.anim;let distance=0,walkingTicks=0;
    for(let n=0;n<frames;n++){
      if(target){target.x=g.player.x+phase.face*30;target.y=g.player.y;}
      if(phase.manual&&n===1){g.mainWeapon().cd=0;if(!g.strike())throw Error(`${id}: manual strike failed`);}
      const oldX=g.player.x,oldY=g.player.y;
      g.update(1/HZ);g.placePlayer(g.cam);
      distance+=Math.hypot(g.player.x-oldX,g.player.y-oldY);
      if(g.player.walking??g.player.moving)walkingTicks++;
      const idx=spr.frames.indexOf(g.player._rect[4]);(seen[phase.name]??=new Set()).add(idx);poseCounts[idx]=(poseCounts[idx]||0)+1;
      if(n%STRIDE)continue;
      g.draw(ctx);uctx.clearRect(0,0,W,H);g.hud.draw(uctx,W,H,g.clock,1/FPS);ctx.drawImage(ui,0,0);
      const rect=g.player._rect;
      if(rect[0]<0||rect[1]<0||rect[0]+rect[2]>W||rect[1]+rect[3]>H)clipped++;
      writeFileSync(join(dir,`${String(sample).padStart(4,'0')}.png`),world.toBuffer('image/png'));
      samples.push({frame:sample,time:g.clock,phase:phase.name,spriteFrame:idx,face:g.player.face,rect:rect.slice(0,4),attack:spr.attack.includes(idx)||!!spr.attackWalk?.some(row=>row.includes(idx)),
        x:g.player.x,y:g.player.y,gait:g.player.anim,idle:g.player.idleAnim,walking:g.player.walking,moving:g.player.moving});sample++;
      if(n===Math.floor(frames/2/STRIDE)*STRIDE)sc.drawImage(world,stage%4*W,Math.floor(stage/4)*H);
    }
    phaseMetrics[phase.name]={seconds:phase.seconds,distance,gaitSteps:(g.player.anim-gaitStart)*1.4*spr.motionRate,walkingTicks};
    const framesSeen=seen[phase.name];
    if(phase.name==='idle-right'||phase.name==='crypt-idle'){
      if([...framesSeen].some(index=>!spr.idle.includes(index)))throw Error(`${id}: an attack interrupted the quiet idle phase`);
      if(!spr.idle.every(index=>framesSeen.has(index)))throw Error(`${id}: incomplete idle loop capture`);
    }
    if(phase.name.startsWith('walk-')){
      if([...framesSeen].some(index=>!spr.walk.includes(index)))throw Error(`${id}: an attack interrupted the quiet walking phase`);
      if(!spr.walk.every(index=>framesSeen.has(index)))throw Error(`${id}: incomplete ${phase.name} loop capture`);
    }
    if(phase.combat&&phase.manual){
      const attacking=new Set(phase.x&&spr.attackWalk?spr.attackWalk.flat():spr.attack);
      if(![...framesSeen].some(index=>attacking.has(index)))throw Error(`${id}: ${phase.name} never displayed an attack`);
    }
    if(phase.combat&&!phase.manual){
      const locomotion=new Set([...spr.idle,...spr.walk]);
      if([...framesSeen].some(index=>!locomotion.has(index)))throw Error(`${id}: field combat interrupted idle/walk`);
    }
    stage++;
  }
  const data={frames:sample,fps:FPS,clipped,damage:g.stats.damage,seen:Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,[...v]])),phaseMetrics,poseCounts};
  report.heroes[id].world=data;
  writeFileSync(join(dir,'samples.json'),JSON.stringify(samples));
  writeFileSync(join(root,`${id}-world-contact.png`),sheet.toBuffer('image/png'));
  writeFileSync(join(root,'coverage.json'),JSON.stringify(report,null,2));
  console.log(`${id}: ${sample} frames, ${clipped} clipped, ${Math.round(g.stats.damage)} damage; ${Object.keys(seen).join(', ')}`);
}
} finally {Math.random=random;input.bot=bot;}
if(JSON.stringify(profile)!==beforeProfile)throw Error('Capture changed its in-memory review profile');
console.log(root);
