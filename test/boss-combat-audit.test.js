import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
import {Telegraph,Explosion} from '../public/js/game/effects.js';
import {ENEMIES} from '../public/js/data/enemies.js';

const ids=['butcher','lich','pharaoh','frostgiant','thornqueen','pitlord'];
const game=()=>{const g=new Game({hero:'knight',mode:'s15',crypts:false,meta:metaBonuses(defaultProfile()),settings:{numbers:false}});g.spawner.update=()=>{};g.player.weapons=[];g.player.devGod=true;return g;};
for(const id of ids)test(`${id}: every pose and facing remains hittable throughout hit flash and squash`,()=>{
 const g=game(),e=g.spawnEnemy(id,100,100,{instant:true,always:true}),ctx=document.createElement('canvas').getContext('2d');e.shake=0;
 for(const[flash,squash]of[[0,0],[.1,0],[0,1],[.1,1]])for(let i=0;i<e.spr.frames.length;i++)for(const face of[-1,1]){
  e.frameIndex=()=>i;e.face=face;e.flash=flash;e.squash=squash;e.draw(ctx,g.cam);
  const f=e.spr.frames[i],b=f.box,S=g.cam.S,[X,Y,w,h]=e._rect,body=e.body(),sx=w/S/f.w,sy=h/S/f.h;
  const actual=[X/S+g.cam.x+(face<0?f.w-b[2]:b[0])*sx,Y/S+g.cam.y+b[1]*sy,X/S+g.cam.x+(face<0?f.w-b[0]:b[2])*sx,Y/S+g.cam.y+b[3]*sy];
  assert.ok(body[0]<=actual[0]+1e-8&&body[1]<=actual[1]+1e-8&&body[2]+1e-8>=actual[2]&&body[3]+1e-8>=actual[3],`${id} frame${i} facing${face} flash${flash} squash${squash}: drawn ${actual}, body ${body}`);
 }
});
test('every monster remains inside the broad-phase reach during its actual draw deformations',()=>{
 const g=game(),ctx=document.createElement('canvas').getContext('2d');
 for(const id of Object.keys(ENEMIES)){
  const e=g.spawnEnemy(id,100,100,{instant:true,always:true});e.shake=0;e.wob=0;
  const states=e.def.ai==='hopper'?[[0,0,.08],[.1,0,.08],[0,1,.5],[.1,1,.5]]:[[0,0,.08],[.1,0,.08]];
  for(const[flash,squash,life]of states)for(let i=0;i<e.spr.frames.length;i++){
   e.frameIndex=()=>i;e.flash=flash;e.squash=squash;e.life=life;e.draw(ctx,g.cam);
   const f=e.spr.frames[i],b=f.box,S=g.cam.S,[X,Y,w,h]=e._rect;
   for(const x of[b[0],b[2]])for(const y of[b[1],b[3]]){
    const dx=X/S+g.cam.x+x*w/S/f.w-e.x,dy=Y/S+g.cam.y+y*h/S/f.h-e.y;
    assert.ok(Math.hypot(dx,dy)<=e.reach+1e-8,`${id} frame${i}: visible body escapes candidate reach`);
   }
  }
  if(id==='cultist'||id==='ogre')assert.ok(e.reach<=32,id+' stays in the local grid query');
 }
});
for(const[id,pose,delay]of[['butcher','slam',.85],['frostgiant','slam',.85],['pharaoh','nova',1],['pitlord','nova',1]]){
 test(`${id}: Frost Rune slows movement without delaying its warned impact`,()=>{
  const g=game(),p=g.player,e=g.spawnEnemy(id,p.x+30,p.y,{instant:true,always:true});e.aware=true;e.cdT=pose==='nova'?0:100;e.cd2=pose==='slam'?0:100;e.cd3=100;
  e.ai(e,0);const tel=g.effects.find(f=>f instanceof Telegraph);assert.ok(tel);g.freezeAll(3);assert.equal(e.freezeT,0);assert.equal(e.slowF,.6);
  for(let f=0;f<Math.ceil(delay*60)-1;f++)g.update(1/60);
  assert.ok(g.effects.includes(tel),'warning persists before release');
  for(let f=0;f<2;f++)g.update(1/60);
  assert.ok(!g.effects.includes(tel));assert.ok(g.effects.some(f=>f instanceof Explosion),'real impact still lands on its warned clock');
 });
 test(`${id}: killing and recycling a telegraphing boss cancels its old attack and pose`,()=>{
  const g=game(),p=g.player,e=g.spawnEnemy(id,p.x+30,p.y,{instant:true,always:true});e.aware=true;e.cdT=pose==='nova'?0:100;e.cd2=pose==='slam'?0:100;e.cd3=100;e.ai(e,0);
  const tel=g.effects.find(f=>f instanceof Telegraph),oldId=e.id;assert.ok(tel);g.killEnemy(e);g.update(1/60);
  const fresh=g.spawnEnemy('zombie',p.x+300,p.y,{instant:true,always:true});assert.equal(fresh,e);assert.notEqual(fresh.id,oldId);assert.equal(fresh.pose,null);assert.equal(fresh.drawScale,fresh.scale/(fresh.spr.hires||1));
  g.effects.length=0;g.effects.push(tel);g.hitStop=0;g.slowMo=0;
  for(let f=0;f<90;f++)g.update(1/60);
  assert.ok(!g.effects.includes(tel));assert.equal(g.eshots.length,0);assert.equal(g.effects.filter(f=>f instanceof Explosion).length,0,'old impact never fires from reused body');
 });
}
