import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {SPR} from '../public/js/engine/sprites.js';
import {input} from '../public/js/engine/input.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
import {bounds,flipX} from '../public/js/engine/pixels.js';

const context={globalAlpha:1,drawImage(){}};
const shown=g=>{g.drawPlayer(context,g.cam);return {index:SPR.archer.frames.indexOf(g.player._rect[4]),flip:g.player._rect[5]};};
function run(fn){
  const previous=input.bot;
  try{
    input.bot={x:0,y:0};
    const g=new Game({hero:'archer',mode:'s15',meta:metaBonuses(defaultProfile()),settings:{},crypts:false});
    g.spawner.update=()=>{};g.player.devGod=true;
    fn(g,g.player,g.player.weapons[0]);
  }finally{input.bot=previous;}
}

test('ranger sheets share a foot anchor with no clipped pixels or broken mirrors',()=>{
  const spr=SPR.archer;
  assert.equal(spr.frames.length,88,'idle, walk, shots and the shots on the move');
  for(const [i,fr] of spr.frames.entries()){
    const f=fr.buf;
    assert.deepEqual([f.w,f.h],[48,48]);
    const b=bounds(f);
    assert.ok(b.x0>0&&b.y0>0&&b.x1<=47&&b.y1<47,`pose ${i} has transparent safety padding`);
    assert.equal(b.y1,spr.anchorY-1,`pose ${i}: a supporting boot stays on the ground`);
    assert.deepEqual(flipX(flipX(f)).d,f.d);
  }
});

test('the ranger is Silverleaf as picked: her moonstone glows, her bow keeps its timing',()=>{
  const spr=SPR.archer;
  assert.deepEqual([spr.idle.length,spr.walk.length,spr.attack.length,spr.attackRelease,spr.attackFps],[8,8,8,5,14]);
  assert.deepEqual(spr.attackWalk.map(r=>r.length),[8,8,8,8,8,8,8,8]);
  assert.ok(spr.frames.every(f=>f.em),'the moonstone glows in every frame');
});

test('the real ranger movement clock plays all eight phases at 12 fps',()=>run((g,p,w)=>{
  w.cd=1000;input.bot={x:1,y:0};
  for(let i=0;i<60;i++)p.update(1/60);
  p.anim=0;const visited=new Set(),wraps=[];let previous=shown(g).index;
  for(let i=1;i<=120;i++){
    p.update(1/60);const f=shown(g).index;visited.add(f);
    if(f<previous)wraps.push(i/60);previous=f;
  }
  assert.deepEqual([...visited].sort((a,b)=>a-b),SPR.archer.walk);
  assert.ok(Math.abs(wraps[1]-wraps[0]-8/12)<1/30);
}));

for(const face of [-1,1])test(`bow wind-up and release follow the real projectile facing ${face}`,()=>run((g,p,w)=>{
  p.aim=face===1?0:Math.PI;p.face=face;w.cd=.35;
  const poses=new Set();let fired=false;
  for(let i=0;i<65;i++){
    const before=g.projectiles.length;g.update(1/60);
    const s=shown(g);poses.add(s.index);assert.equal(s.flip,face<0);
    if(g.projectiles.length>before&&!fired){
      fired=true;
      assert.equal(s.index,SPR.archer.attack[SPR.archer.attackRelease]);
      assert.ok(g.clock>=.35-1/60&&g.clock<=.35+1/60,'art must not delay the existing shot');
      assert.ok(Math.cos(g.projectiles[0].ang)*face>0,'arrow follows the selected facing');
    }
  }
  assert.ok(fired);
  for(const index of SPR.archer.attack)assert.ok(poses.has(index),`missing shooting pose ${index}`);
}));

test('walking while shooting keeps its leg cycle, and a rear target cannot flip it',()=>run((g,p,w)=>{
  input.bot={x:1,y:0};
  for(let i=0;i<40;i++)p.update(1/60);
  p.aim=0;p.bowShot={at:g.clock,ang:0};
  const first=shown(g).index;
  assert.ok(SPR.archer.attackWalk[5].includes(first));
  p.anim+=1/(1.4*SPR.archer.motionRate);
  const next=shown(g).index;
  assert.ok(SPR.archer.attackWalk[5].includes(next));assert.notEqual(first,next);
  const foe=g.spawnEnemy('slime',p.x-40,p.y,{instant:true,hpMul:10});foe.dormant=true;
  g.grid.rebuild(g.enemies,p.x,p.y);w.cd=0;w.update(0);
  assert.equal(p.face,1);assert.equal(shown(g).flip,false);
  assert.ok(SPR.archer.walk.includes(shown(g).index));
  assert.ok(Math.cos(g.projectiles.at(-1).ang)<0,'rear projectile retains its real direction');
}));

test('standing, no arrow turns the ranger, not even one at a foe behind him',()=>run((g,p,w)=>{
  w.levelUp();assert.equal(w.s.amount,2);
  p.update(1/60);assert.equal(p.moving,false);assert.equal(p.face,1);
  for(const dx of [-40,60]){const foe=g.spawnEnemy('slime',p.x+dx,p.y,{instant:true,hpMul:10});foe.dormant=true;}
  g.grid.rebuild(g.enemies,p.x,p.y);w.cd=0;w.update(0);
  assert.ok(Math.cos(g.projectiles.at(-1).ang)<0,'the first arrow flies at the nearer foe, behind him');
  assert.equal(p.face,1,'without turning him');
  assert.equal(shown(g).flip,false);
  assert.ok(!SPR.archer.attack.includes(shown(g).index),'and shows no forward shot');
  w.update(.07);
  assert.ok(Math.cos(g.projectiles.at(-1).ang)>0,'the second arrow flies at the foe ahead');
  assert.equal(p.face,1);assert.equal(shown(g).flip,false);
}));

test('standing with nothing to shoot, a wild arrow never turns the ranger',()=>run((g,p,w)=>{
  p.update(1/60);p.aim=-Math.PI/2;p.face=1; // he last walked straight up
  const flips=new Set();
  for(let i=0;i<20*60;i++){g.update(1/60);flips.add(shown(g).flip);}
  assert.ok(w.volley>=15,`the bow kept shooting (${w.volley} volleys)`);
  assert.deepEqual([...flips],[false]);
}));
