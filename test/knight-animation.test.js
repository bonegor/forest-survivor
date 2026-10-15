import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {SPR} from '../public/js/engine/sprites.js';
import {input} from '../public/js/engine/input.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
const context={globalAlpha:1,drawImage(){}};
function game(){return new Game({hero:'knight',mode:'s15',meta:metaBonuses(defaultProfile()),settings:{}});}
function shown(g){g.drawPlayer(context,g.cam);return SPR.knight.frames.indexOf(g.player._rect[4]);}

test('the real player clock visits the complete plumed walk at its imported cadence',()=>{
  const g=game(),p=g.player,old=input.bot;
  try{
    input.bot={x:1,y:0};
    for(let i=0;i<60;i++)p.update(1/60);
    p.anim=0;
    const visited=new Set(),wraps=[];let last=shown(g);
    for(let i=1;i<=120;i++){
      p.update(1/60);const f=shown(g);visited.add(f);
      if(f<last)wraps.push(i/60);last=f;
    }
    assert.deepEqual([...visited].sort((a,b)=>a-b),SPR.knight.walk);
    assert.ok(wraps.length>=2,'must complete two full walk cycles in two seconds');
    const expected = SPR.knight.walk.length / (7 * p.speedMul * 1.4 * SPR.knight.motionRate);
    assert.ok(Math.abs(wraps[1]-wraps[0]-expected)<1/30,'preserve the selected preview cadence');
  }finally{input.bot=old;}
});

test('a swing keeps the hero walking or standing: no attack poses, no lunge',()=>{
  const g=game(),p=g.player,old=input.bot;
  try{
    const still=shown(g),at=g.player._rect.slice(0,2);
    p.swing(0);
    for(let i=0;i<8;i++){
      g.time+=.05;p.swingT=Math.max(0,.14-i*.05);
      assert.ok(!SPR.knight.attack.includes(shown(g)),'attack poses are never shown');
      assert.deepEqual(g.player._rect.slice(0,2),at,'the hero does not lunge at the swing');
    }
    assert.equal(shown(g),still);
    input.bot={x:1,y:0};
    for(let i=0;i<30;i++){p.update(1/60);p.swing(0);assert.ok(SPR.knight.walk.includes(shown(g)),'walking through a swing shows the walk');}
    assert.equal(p.swingAng,0,'the swing still keeps the actual damage direction');
  }finally{input.bot=old;}
});

test('idle breath comes from the authored poses and keeps the foot anchor stable',()=>{
  const g=game(),p=g.player,ys=[];
  for(const anim of [0,1.6,3.2,4.8]){
    p.anim=anim;shown(g);ys.push(g.player._rect[1]);
  }
  assert.equal(new Set(ys).size,1,'do not add the renderer bob on top of the authored idle');
  assert.equal(SPR.knight.anchorY,47,'transparent slash padding must not float the boots above ground');
});
