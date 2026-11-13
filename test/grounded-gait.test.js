import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import baseline from '../tools/animation-round/baseline/index.js';
import approved from '../public/assets/heroes-approved/index.js';
import { HEROES } from '../public/js/data/heroes.js';
import { moveFor } from '../public/js/data/difficulty.js';
import { BASE_SPEED } from '../public/js/game/player.js';
import { unpack } from '../tools/animation-round/build.mjs';
import { buildGroundedWalk, groundedFoot, GROUNDED_MODELS } from '../tools/animation-round/grounded-walk.mjs';

test('all articulated heroes retain their source identity and complete registered gait in the packed game',()=>{
  assert.equal(Object.keys(GROUNDED_MODELS).length,13);
  for(const [id,model] of Object.entries(GROUNDED_MODELS)) {
    const data=approved[id],base=baseline[id],standing=unpack(data,data.frames[0]);
    const gait=buildGroundedWalk(id,base.palette,standing),palette=new Set(base.palette);
    assert.equal(data.walk.length,16,id+' visits all authored phases');
    assert.equal(gait.lowerFrames.length,16);
    assert.ok(Math.abs(data.walk.length/data.walkFps-model.motion.cycleSeconds)<1e-12);
    const source=new URL('../tools/animation-round/baseline/grounded-models/'+model.source,import.meta.url);
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),model.sha256,id+' source remains reproducible');
    for(let i=0;i<16;i++) {
      const frame=gait.frames[i],pose=gait.poses[i];
      assert.deepEqual(frame.d,unpack(data,data.frames[data.walk[i]]).d,id+' packed gait '+i);
      // Native upper armour/face never undergoes skeletal resampling.
      for(let y=12;y<40;y++)for(let x=12;x<68;x++)
        assert.equal(frame.d[(y+pose.bob)*80+x],standing.d[y*80+x],id+' upper identity '+i);
      for(const color of frame.d)assert.ok(palette.has(color),id+' retains the source palette');
      assert.ok(pose.legs.some(l=>l.support),id+' always has a grounded support');
      assert.ok(pose.legs.every(l=>l.hip.concat(l.knee,l.ankle).every(Number.isFinite)),id+' connected finite joints');
      for(let y=56;y<64;y++)for(let x=0;x<80;x++)assert.equal(gait.lowerFrames[i].d[y*80+x],0,id+' no foot below the registered floor');
    }
    assert.equal(gait.poses[0].bob,gait.poses[15].bob,id+' no one-frame compression jab at the loop boundary');
    assert.ok(data.attackWalk.every(row=>row.length===16),id+' every attack keeps the full moving gait');
  }
});

test('every support sweep matches gameplay distance and joins a continuous lifted return',()=>{
  for(const [id,{motion}] of Object.entries(GROUNDED_MODELS)) {
    const speed=BASE_SPEED*Math.max(.6,Math.min(1.6,moveFor('s15','easy')*(HEROES[id].stats.speed||1)));
    assert.ok(Math.abs(2*motion.reach/(motion.support*motion.cycleSeconds)-speed)<1e-8,id+' planted sole speed');
    assert.ok(motion.cycleSeconds>.4&&motion.cycleSeconds<.6,id+' legible full-cycle cadence');
    for(let i=0;i<100;i++) {
      const phase=i/100,a=groundedFoot(phase,motion),b=groundedFoot(phase+.5,motion);
      assert.ok(a.support||b.support,id+' no unsupported float phase');
      if(a.support)assert.equal(a.lift,0,id+' planted sole');
      else if(phase>motion.support)assert.ok(a.lift>0,id+' lifted return');
    }
    for(const phase of [0,motion.support,1]) {
      const a=groundedFoot(phase-1e-7,motion),b=groundedFoot(phase+1e-7,motion);
      assert.ok(Math.hypot(a.x-b.x,a.lift-b.lift)<1e-4,id+' continuous foot path');
    }
  }
});
