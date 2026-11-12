import test from 'node:test';
import assert from 'node:assert/strict';
import frozen from '../tools/animation-round/variants/v1/index.js';
import baseline from '../tools/animation-round/baseline/index.js';
import {unpack} from '../tools/animation-round/build.mjs';
import {buildGroundedWalk,GROUNDED_MODELS} from '../tools/animation-round/grounded-walk.mjs';

test('requesting a grounded v2 proposal never changes the preserved v1 or shared models',()=>{
  const before=JSON.stringify(GROUNDED_MODELS);
  for(const id of Object.keys(GROUNDED_MODELS)) {
    const data=frozen[id],standing=unpack(data,data.frames[0]),palette=baseline[id].palette;
    const original=buildGroundedWalk(id,palette,standing);
    buildGroundedWalk(id,palette,standing,{version:'v2'});
    const after=buildGroundedWalk(id,palette,standing,{version:'v1'});
    for(let i=0;i<16;i++) {
      assert.deepEqual(original.frames[i].d,unpack(data,data.frames[data.walk[i]]).d,id+' default remains frozen v1');
      assert.deepEqual(after.frames[i].d,original.frames[i].d,id+' v2 cannot mutate later v1 draws');
      assert.deepEqual(after.lowerFrames[i].d,original.lowerFrames[i].d,id+' v1 attack layers remain unchanged');
    }
  }
  assert.equal(JSON.stringify(GROUNDED_MODELS),before);
});

test('v2 uses shorter lower steps attached to a real pelvis without rubber-legged extension',()=>{
  for(const [id,base] of Object.entries(GROUNDED_MODELS)) {
    const data=frozen[id],standing=unpack(data,data.frames[0]);
    const gait=buildGroundedWalk(id,baseline[id].palette,standing,{version:'v2'}),m=gait.motion;
    const reduction=1-m.reach/base.motion.reach;
    // The motion reviewer allowed the heavy trio a slightly longer step to
    // remove hurried shuffling while preserving planted-foot ground speed.
    const heavy=['footman','paladin','praetorian'].includes(id);
    assert.ok(reduction>=(heavy?.17:.25)&&reduction<=.35,id+' materially shorter reach');
    assert.ok(m.lift<=base.motion.lift*.45,id+' low returning boot');
    assert.ok(m.roll<=.04,id+' restrained toe roll');
    assert.ok(Math.abs(2*m.reach/(m.support*m.cycleSeconds)-base.motion.groundSpeed)<1e-10,id+' no slower sliding treadmill');
    assert.ok(m.cycleSeconds>=.33&&m.cycleSeconds<=(heavy?.42:.38),id+' compact actual cadence');
    for(let i=0;i<16;i++) {
      const pose=gait.poses[i],frame=gait.frames[i];
      assert.ok(pose.legs.some(l=>l.support),id+' has an actual planted foot');
      for(const l of pose.legs) {
        assert.ok(l.extension<=1.12,id+' source leg length respected');
        const dx=l.ankle[0]-l.hip[0],dy=l.ankle[1]-l.hip[1];
        const deviation=Math.abs((l.knee[0]-l.hip[0])*dy-(l.knee[1]-l.hip[1])*dx)/Math.hypot(dx,dy);
        assert.ok(deviation<=m.kneeLimit+1e-9,id+' knee does not fly sideways');
      }
      for(let y=12;y<40;y++)for(let x=12;x<68;x++)assert.equal(frame.d[y*80+x],standing.d[y*80+x],id+' original upper body preserved');
      for(let y=56;y<64;y++)for(let x=0;x<80;x++)assert.equal(gait.lowerFrames[i].d[y*80+x],0,id+' boot stays above ground plane');
    }
  }
});
