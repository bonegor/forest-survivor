import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import approved from '../public/assets/heroes-approved/knight.js';
import baseline from '../tools/animation-round/baseline/knight.js';
import { unpack } from '../tools/animation-round/build.mjs';
import { buildGroundedWalk, groundedFoot, GROUNDED_MODELS } from '../tools/animation-round/grounded-walk.mjs';

const standing=unpack(approved,approved.frames[0]);
const gait=buildGroundedWalk('knight',baseline.palette,standing);
const motion=GROUNDED_MODELS.knight.motion;

test('Knight travel keeps the approved native face, helmet and torso through every weight shift',()=>{
  const palette=new Set(baseline.palette);
  assert.equal(gait.frames.length,16);
  assert.equal(approved.walk.length,16);
  for(let i=0;i<gait.frames.length;i++) {
    const frame=gait.frames[i],bob=Math.round(gait.poses[i].bob);
    assert.ok(bob===0||bob===1,'the torso shifts by at most one native pixel');
    for(let y=15;y<44;y++)for(let x=15;x<65;x++)
      assert.equal(frame.d[(y+bob)*80+x],standing.d[y*80+x],`upper-body texture changed at gait ${i}, ${x}/${y}`);
    for(const color of frame.d)assert.ok(palette.has(color),'travel must preserve the approved colour/alpha palette');
    assert.deepEqual(frame.d,unpack(approved,approved.frames[approved.walk[i]]).d,'packed travel must reproduce the retained rig');
  }
  assert.equal(approved.attackWalk.length,approved.attack.length);
  assert.ok(approved.attackWalk.every(row=>row.length===16),'combat must retain every gait phase');
});

test('Knight feet alternate planted backward support and a continuous lifted return',()=>{
  const {support,cycleSeconds,reach}=motion;
  const knightFoot=phase=>groundedFoot(phase,motion);
  let last=knightFoot(0).x,maxLift=0;
  for(let i=1;i<100;i++) {
    const foot=knightFoot(i/100*support);
    assert.equal(foot.lift,0,'the planted sole must stay level');
    assert.ok(foot.x<last,'the planted sole must sweep backwards under the body');
    last=foot.x;
  }
  last=knightFoot(support).x;
  for(let i=1;i<100;i++) {
    const phase=support+(1-support)*i/100,foot=knightFoot(phase);
    assert.ok(foot.lift>0,'the returning boot must clear the floor');
    assert.ok(foot.x>last,'the returning boot must move forward');
    maxLift=Math.max(maxLift,foot.lift);last=foot.x;
  }
  assert.ok(maxLift>=2&&maxLift<=4,'the return lifts a boot without throwing it above the knee');
  for(const phase of [0,support,1]) {
    const before=knightFoot(phase-1e-7),after=knightFoot(phase+1e-7);
    assert.ok(Math.hypot(before.x-after.x,before.lift-after.lift)<1e-4,'contact, lift-off and loop boundaries must remain continuous');
  }
  assert.notEqual(knightFoot(.1).support,knightFoot(.6).support,'the feet must exchange support roles');
  const supportSpeed=2*reach/(support*cycleSeconds);
  assert.ok(supportSpeed>60&&supportSpeed<66,'support sweep should match the normal Knight movement speed');
  assert.ok(Math.abs(approved.walk.length/approved.walkFps-cycleSeconds)<1e-12,'extra poses must preserve the intended full-cycle duration');
});

test('Knight model provenance is self-contained and matches the retained approved source',()=>{
  const file=new URL('../tools/animation-round/baseline/grounded-models/knight.png',import.meta.url);
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),'46dff0775110d6761258aca4e862f1f0a93af3af35c83952f161ed3cdc6a755b');
});
