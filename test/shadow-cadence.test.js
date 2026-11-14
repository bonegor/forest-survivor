import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {SPR} from '../public/js/engine/sprites.js';
import {input} from '../public/js/engine/input.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
import {moveFor} from '../public/js/data/difficulty.js';
import {heroAttackPose,strikeClip} from '../public/js/game/hero-animation.js';
import {ROBED_WALK} from '../tools/animation-round/robed-walk.mjs';
import baseline from '../tools/animation-round/baseline/rogue.js';

// The speed request applies to art clocks. The original 0.92 second travelling
// float and 16/7 second idle now take half as long, while damage stays immediate.
for(const moving of [false,true]) test(`Shadow's real ${moving?'travel':'idle'} cycle is twice as fast`,()=>{
  const previous=input.bot;
  try {
    input.bot={x:moving?1:0,y:0};
    const g=new Game({hero:'rogue',mode:'s15',meta:metaBonuses(defaultProfile()),settings:{},crypts:false,move:moveFor('s15','easy')});
    g.world.collide=()=>{};g.spawner.update=()=>{};
    const p=g.player,spr=SPR.rogue,seen=new Set(),wraps=[];
    let last=-1;
    for(let n=0;n<3*240;n++) {
      p.update(1/240);g.placePlayer(g.cam);
      const phase=(moving?spr.walk:spr.idle).indexOf(spr.frames.indexOf(p._rect[4]));
      seen.add(phase);if(last>phase)wraps.push(n/240);last=phase;
    }
    assert.equal(seen.size,16,'all authored poses still play');
    const expected=moving?ROBED_WALK.rogue.cycleSeconds/2:16/7/2;
    assert.ok(wraps.length>=2);
    assert.ok(Math.abs(wraps[1]-wraps[0]-expected)<1/120,`${wraps[1]-wraps[0]}s instead of ${expected}s`);
    assert.equal(p.hero.stats.speed,1.2,'hero movement speed remains unchanged');
  }finally{input.bot=previous;}
});
test('Shadow crypt recovery runs twice as fast without moving the instant dagger impact',()=>{
  const spr=SPR.rogue,clip=strikeClip(spr);
  assert.equal(spr.attackFps,baseline.attackFps*2);
  assert.equal(clip.delay,0);
  const p={strikeAt:1,strikeAng:0,walking:false,face:1};
  const g={inCrypt:{},player:p,clock:1};
  assert.equal(heroAttackPose(g,spr,0).frame,spr.frames[spr.attack[clip.hit]]);
  g.clock=1+(spr.attack.length-clip.hit)/spr.attackFps;
  assert.equal(heroAttackPose(g,spr,0),null,'recovery is complete at the doubled cadence');
});
