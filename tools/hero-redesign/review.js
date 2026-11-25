import {buildSprites,buildSprite,SPR} from '/js/engine/sprites.js';
import {sheet,pose} from '/js/art/hero-sheets.js';
import {Game} from '/js/game/game.js';
import {HEROES} from '/js/data/heroes.js';
import {defaultProfile,metaBonuses} from '/js/shared/profile.js';
import {input} from '/js/engine/input.js';
import {view} from '/js/engine/view.js';
import {mulberry32} from '/js/engine/util.js';
import {HeroShowcase} from '/js/ui/hero-showcase.js';

const concepts={
 archer:['Copperleaf huntress','Copper ponytail, exposed elven ears, teal leather and a new recurved bow.'],
 mage:['Storm oracle','Swept white hair, cobalt robes, an ivory collar and an outstretched lightning spell.'],
 rogue:['Pale eclipse','A long bone mask, teal cowl, crescent blade and sweeping spectral tail.'],
 necromancer:['Carrion prophet','A stooped feather-cloaked occultist with wine robes and a clearly perched crow.'],
 paladin:['Solar bastion','A golden cathedral helm, radiant halo, ivory tabard and two-handed warhammer.'],
 druid:['Briar hermit','A shaggy moss hood, long pale beard, rough robes and a forked living staff.'],
 berserker:['Bloodcrest','A broad bare-chested warrior with red topknot, blue warpaint and twin axes.'],
 witchhunter:['Crimson inquisitor','A crimson hood, ivory half-mask, plated leather and a two-handed crossbow.'],
};
const ids=Object.keys(concepts),$=id=>document.getElementById(id);
buildSprites();
const original={},proposal={};
for(const id of ids){
  const first=(await import(`/out/pass3/assets/${id}.js`)).default,firstDef=sheet(first);
  original[id]=[buildSprite(id,firstDef),buildSprite(id+'_pose',pose(firstDef))];
  const data=(await import(`/out/pass4/assets/${id}.js`)).default,def=sheet(data);
  proposal[id]=[buildSprite(id,def),buildSprite(id+'_pose',pose(def))];
  $('hero').add(new Option(HEROES[id].title,id));
}
const ui=document.createElement('canvas');ui.width=480;ui.height=300;
Object.assign(view,{canvas:$('world0'),ctx:$('world0').getContext('2d'),ui,uctx:ui.getContext('2d'),S:2,W:480,H:300,pxW:960,pxH:600,zoom:.8});
const worlds=[0,1].map(i=>$('world'+i)),contexts=worlds.map(c=>c.getContext('2d'));
const crops=[0,1].map(i=>$('crop'+i)),cropContexts=crops.map(c=>c.getContext('2d'));
const selections=[0,1].map(i=>$('selection'+i).getContext('2d'));
for(const ctx of [...contexts,...cropContexts,...selections,view.uctx])ctx.imageSmoothingEnabled=false;
let games=[],shows=[],action='tour',active='',tourTime=0,paused=false,capturing=false;
const phases=[['idle',1.6],['right',1.6],['left',1.6],['diagonal',1.6],['attack-right',1.2],['attack-left',1.2],['attack-walk',1.6]];
const duration=phases.reduce((n,p)=>n+p[1],0);
const png=c=>c.toDataURL('image/png');
function withLook(v,fn){
  const id=$('hero').value,look=(v?proposal:original)[id];
  SPR[id]=look[0];SPR[id+'_pose']=look[1];
  try{return fn();}finally{[SPR[id],SPR[id+'_pose']]=original[id];}
}
function clearInput(){input.held.clear();input.justDown.clear();input.virtual.clear();input.bot={x:0,y:0};}
function reset(){
  clearInput();tourTime=0;active='';
  const id=$('hero').value,setting=$('setting').value,profile=defaultProfile(),settings={numbers:false,softFlash:true,skins:{}};
  games=[0,1].map(v=>withLook(v,()=>{
    const savedRandom=Math.random;Math.random=mulberry32(29471);
    const g=new Game({hero:id,mode:'s15',map:setting==='day'?'desert':'forest',diff:'easy',settings,meta:metaBonuses(profile),crypts:false});
    Math.random=savedRandom;g.spawner.update=()=>{};g.hints=null;g.player.devGod=true;g.banners.length=0;
    if(setting==='crypt'){
      g.enterCrypt({key:'2,3',depth:1,x:g.player.x,y:g.player.y});
      for(let i=0;i<180&&g.state!=='play';i++)g.update(1/60);
      g.enemies.length=0;g.world.entrance=null;g.world.exit=null;g.banners.length=0;
    }
    g.syncCam();g.snapCam();return g;
  }));
  shows=[0,1].map(v=>withLook(v,()=>new HeroShowcase(id,profile,settings)));
  $('v2-title').textContent=`New design - ${concepts[id][0]}`;$('concept').textContent=concepts[id][1];
  begin(action==='tour'?'idle':action);draw();
}
function begin(phase){
  clearInput();active=phase;
  games.forEach((g,v)=>withLook(v,()=>{
    const p=g.player;g.enemies.length=0;g.projectiles.length=0;g.minions.length=0;p.heroAttack=null;p.strikeAt=null;
    if(g.inCrypt){p.x=g.world.start.x;p.y=g.world.start.y;p.vx=p.vy=0;g.snapCam();}
    for(const w of p.weapons){w.cd=phase.startsWith('attack')?0:1000;w.queue=0;}
    if(phase.startsWith('attack')){
      p.face=phase==='attack-left'?-1:1;p.aim=p.face<0?Math.PI:0;
      for(const dy of [-8,8]){
        const e=g.spawnEnemy('skeleton',p.x+p.face*34,p.y+dy,{instant:true,always:true,hpMul:1000,xpMul:0});
        if(e)e.speed=0;
      }
    }
  }));
}
function tick(){
  if(action==='tour'){
    let t=tourTime%duration,phase=phases.at(-1)[0];
    for(const [name,len]of phases){if(t<len){phase=name;break;}t-=len;}
    if(phase!==active)begin(phase);tourTime+=1/60;
  }
  const moving={right:[1,0],left:[-1,0],diagonal:[Math.SQRT1_2,-Math.SQRT1_2],'attack-walk':[1,0]};
  const [x,y]=moving[active]??[0,0];input.bot={x,y};
  if(active.startsWith('attack')&&games[0].inCrypt)input.held.add('KeyX');else input.held.delete('KeyX');
  games.forEach((g,v)=>withLook(v,()=>{g.update(1/60);shows[v].update(1/60);}));input.endFrame();
}
function draw(){
  const records=games.map((g,v)=>withLook(v,()=>{
    const ctx=contexts[v];view.ctx=ctx;view.canvas=worlds[v];g.draw(ctx);
    view.uctx.clearRect(0,0,480,300);g.hud.draw(view.uctx,480,300,g.clock,1/60);ctx.drawImage(ui,0,0,960,600);
    const r=g.player._rect,cc=cropContexts[v];cc.clearRect(0,0,128,128);
    cc.drawImage(worlds[v],Math.round(r[0]+r[2]/2-64),Math.round(r[1]+r[3]/2-64),128,128,0,0,128,128);
    selections[v].clearRect(0,0,128,180);shows[v].draw(selections[v],{x:0,y:0,w:128,h:180},false,g.settings);
    const index=SPR[g.player.id].frames.indexOf(r[4]);
    return {hero:g.player.id,frame:index,face:g.player.face,x:g.player.x,y:g.player.y,moving:g.player.moving};
  }));
  if(!capturing)$('status').textContent=`${HEROES[$('hero').value].title}  -  ${active}  -  ${paused?'paused':'playing'}`;
  return records;
}
async function save(name,data){const r=await fetch('/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})});if(!r.ok)throw Error(await r.text());}
async function capture(repair=false){
  if(capturing)return;capturing=true;
  const controls=[...document.querySelectorAll('button,select')];controls.forEach(c=>c.disabled=true);
  const pair=document.createElement('canvas');pair.width=256;pair.height=128;const pc=pair.getContext('2d');
  const take=repair?(await (await fetch('/out/captures/latest.json')).json()).take:new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
  try{
    for(const id of ids)for(const setting of ['day','crypt']){
      if(repair){
        const old=await (await fetch(`/out/captures/${take}/${id}/${setting}/coverage.json`)).json();
        if(old.samples===312 && old.records.at(-1).t>10.3 && old.records.every(r=>r.variants[1].frame<proposal[id][0].frames.length))continue;
      }
      $('hero').value=id;$('setting').value=setting;action='idle';reset();const records=[];let sample=0;
      for(const [phase,seconds]of phases){
        begin(phase);
        for(let f=0;f<Math.round(seconds*60);f++){
          tick();if(f%2)continue;const info=draw();records.push({phase,t:games[0].clock,variants:info});
          pc.drawImage(crops[0],0,0);pc.drawImage(crops[1],128,0);
          await save(`${take}/${id}/${setting}/frames/${String(sample++).padStart(4,'0')}.png`,png(pair));
          if(phase==='idle'&&f===0){await save(`${take}/${id}/${setting}/selection.png`,png($('selection1')));await save(`${take}/${id}/${setting}/world.png`,png(worlds[1]));}
          if(f%30===0){$('status').textContent=`Capturing ${HEROES[id].title}  -  ${setting}  -  ${phase}`;await new Promise(requestAnimationFrame);}
        }
      }
      await save(`${take}/${id}/${setting}/coverage.json`,JSON.stringify({id,setting,samples:sample,fps:30,records}));
    }
    await save('latest.json',JSON.stringify({take,ids}));$('status').textContent=`Complete: eight comparisons recorded in daylight and crypts. Take ${take}.`;
  }catch(e){$('status').textContent=e.stack;throw e;}
  finally{capturing=false;paused=true;$('pause').textContent='Resume';controls.forEach(c=>c.disabled=false);}
}
function restart(){paused=false;$('pause').textContent='Pause';reset();}
$('hero').onchange=$('setting').onchange=restart;
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>{paused=false;$('pause').textContent='Pause';action=b.dataset.action;document.querySelectorAll('[data-action]').forEach(x=>x.classList.toggle('active',x===b));if(action==='tour')reset();else begin(action);};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};
$('reset').onclick=reset;$('capture').onclick=()=>capture();$('repair').onclick=()=>capture(true);
for(const id of ids){
  const tile=document.createElement('button');tile.className='tile';
  tile.innerHTML=`<strong>${HEROES[id].title}</strong><br><span>${concepts[id][0]}</span>`;
  tile.onclick=()=>{$('hero').value=id;restart();};$('gallery').append(tile);
}
let last=performance.now(),acc=0;
function loop(now){if(!paused&&!capturing){acc+=Math.min(.1,(now-last)/1000);while(acc>=1/60){tick();acc-=1/60;}draw();}last=now;requestAnimationFrame(loop);}
reset();requestAnimationFrame(loop);
