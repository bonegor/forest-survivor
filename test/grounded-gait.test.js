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
import { fitPaladinFace } from '../tools/animation-round/paladin-trail-face.mjs';
import { fitPaladinArms } from '../tools/animation-round/paladin-arms.mjs';
import originalPaladin from '../tools/hero-polish-review/before/paladin.js';
import { readPng } from '../tools/png.mjs';
import { reduceSource } from '../tools/animation-round/source-detail.mjs';
import { nativeRanger } from '../tools/animation-round/ranger-native.mjs';
import { nativeBerserker } from '../tools/animation-round/berserker-native.mjs';
import { trailWalkPalette } from '../tools/animation-round/trailblazer-eyes.mjs';
import { packedPalette } from '../public/js/art/palette.js';
const preserved = { paladin: originalPaladin };
const paladinWeapon = JSON.parse(readFileSync(new URL('../tools/animation-round/baseline/equipment-masks.json', import.meta.url))).paladin.mask;
const nativeTreatments = { archer: nativeRanger, berserker: nativeBerserker };

test('all articulated heroes retain their source identity and complete registered gait in the packed game',()=>{
  assert.equal(Object.keys(GROUNDED_MODELS).length,13);
  for(const [id,model] of Object.entries(GROUNDED_MODELS)) {
    const data=approved[id],base=baseline[id],retouched=id==='paladin',native=nativeTreatments[id],density=native?2:data.hires||1,W=80*density;
    const source=new URL('../tools/animation-round/baseline/grounded-models/'+model.source,import.meta.url);
    const original=native?readPng(source):null;
    const standing=native?reduceSource(original,[0,0,original.w,original.h],model.pivot,model.scale):unpack(retouched?preserved[id]:data,(retouched?preserved[id]:data).frames[0]);
    const sourcePalette=id==='trailblazer'?trailWalkPalette(base.palette,standing):base.palette;
    const gait=buildGroundedWalk(id,sourcePalette,standing,{density}),palette=new Set(native?[0,...Object.values(packedPalette())]:sourcePalette);
    if(id==='archer')for(const color of baseline.trailblazer.palette)palette.add(color);
    assert.equal(data.walk.length,16,id+' visits all authored phases');
    assert.equal(gait.lowerFrames.length,16);
    assert.ok(Math.abs(data.walk.length/data.walkFps-model.motion.cycleSeconds)<1e-12);
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),model.sha256,id+' source remains reproducible');
    if(native){
      assert.equal(data.hires,1);
      assert.equal(data.clarityRevision,id==='archer'?'trailblazer-head-2026-11-18':'native-style-match-2026-11-15');
      assert.deepEqual(unpack(data,data.frames[0]).d,native(standing).d,id+' retained model is reproducibly adapted to native pixels');
      assert.equal(data.sourceModelSha256,model.sha256);
      assert.equal(data.w,80);assert.equal(data.h,64);assert.equal(data.anchorY,56);
    }
    for(let i=0;i<16;i++) {
      const frame=gait.frames[i],pose=gait.poses[i];
      const expected=native?native(frame):id==='paladin'?fitPaladinFace(fitPaladinArms(frame,-1,paladinWeapon)):frame,packed=unpack(data,data.frames[data.walk[i]]);
      assert.deepEqual(expected.d,packed.d,id+' packed gait with requested face/torso art '+i);
      // Native upper armour/face never undergoes skeletal resampling.
      for(let y=12*density;y<40*density;y++)for(let x=12*density;x<68*density;x++)
        assert.equal(frame.d[(y+pose.bob*density)*W+x],standing.d[y*W+x],id+' upper identity '+i);
      if(density===1||native)for(const color of (native?packed:frame).d)assert.ok(palette.has(color),id+' retains the intended palette');
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
