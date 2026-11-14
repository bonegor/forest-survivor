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
import { heavyHeroClarity } from '../tools/animation-round/heavy-hero-clarity.mjs';
import originalPaladin from '../tools/hero-polish-review/before/paladin.js';
import { readPng } from '../tools/png.mjs';
import { reduceSource } from '../tools/animation-round/source-detail.mjs';
const preserved = { paladin: originalPaladin };

test('all articulated heroes retain their source identity and complete registered gait in the packed game',()=>{
  assert.equal(Object.keys(GROUNDED_MODELS).length,13);
  for(const [id,model] of Object.entries(GROUNDED_MODELS)) {
    const data=approved[id],base=baseline[id],retouched=id==='paladin',density=data.hires||1,W=80*density;
    const standing=unpack(retouched?preserved[id]:data,(retouched?preserved[id]:data).frames[0]);
    const gait=buildGroundedWalk(id,base.palette,standing,{density}),palette=new Set(base.palette);
    assert.equal(data.walk.length,16,id+' visits all authored phases');
    assert.equal(gait.lowerFrames.length,16);
    assert.ok(Math.abs(data.walk.length/data.walkFps-model.motion.cycleSeconds)<1e-12);
    const source=new URL('../tools/animation-round/baseline/grounded-models/'+model.source,import.meta.url);
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),model.sha256,id+' source remains reproducible');
    if(density===2){
      const original=readPng(source);
      assert.deepEqual(standing.d,reduceSource(original,[0,0,original.w,original.h],model.pivot,model.scale).d,id+' complete original model, including proportional face and anatomy, survives the source export');
      assert.equal(data.sourceModelSha256,model.sha256);
      assert.equal(data.w/density,80);assert.equal(data.h/density,64);assert.equal(data.anchorY/density,56);
    }
    for(let i=0;i<16;i++) {
      const frame=gait.frames[i],pose=gait.poses[i];
      assert.deepEqual(heavyHeroClarity(frame,id).d,unpack(data,data.frames[data.walk[i]]).d,id+' packed gait with requested face/torso art '+i);
      // Native upper armour/face never undergoes skeletal resampling.
      for(let y=12*density;y<40*density;y++)for(let x=12*density;x<68*density;x++)
        assert.equal(frame.d[(y+pose.bob*density)*W+x],standing.d[y*W+x],id+' upper identity '+i);
      if(density===1)for(const color of frame.d)assert.ok(palette.has(color),id+' retains the source palette');
      assert.ok(pose.legs.some(l=>l.support),id+' always has a grounded support');
      assert.ok(pose.legs.every(l=>l.hip.concat(l.knee,l.ankle).every(Number.isFinite)),id+' connected finite joints');
      for(let y=56*density;y<64*density;y++)for(let x=0;x<W;x++)assert.equal(gait.lowerFrames[i].d[y*W+x],0,id+' no foot below the registered floor');
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
