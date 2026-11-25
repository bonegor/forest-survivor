import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import baseline from '../tools/animation-round/baseline/index.js';
import {unpack} from '../tools/animation-round/build.mjs';
import {buildRobedWalk,robedFoot,ROBED_WALK,ROBED_WALK_V2} from '../tools/animation-round/robed-walk.mjs';
import {HEROES} from '../public/js/data/heroes.js';
import {moveFor} from '../public/js/data/difficulty.js';
import {BASE_SPEED} from '../public/js/game/player.js';

const v1Pixels={
  mage:'d85ef5f4ed2f45843546e916437bc9eb09e4aa4f932af97f1cd2d32519902369',
  necromancer:'6cacba5f867bc7e2661f83f851413b4a708f04c2801de15ab30fabe547de4eeb',
  druid:'91487368b6d379f292d3d4697be1284f90877d409ba27f2f77fa9d413de57df9',
  thornkeeper:'02c07a2f18cb6b85a2b379a7df979b5fda487d3a379b6b82217cf7f7e211bc4c',
  gravebinder:'b0442594600e9913cc9d1304e91d06ca598d5db18d57a2e461d16c8dee32b6d0',
  arcanist:'d7066759758b2e84b61782a35fb890f83a9866e0b96dbe3e28f818cbf767d7f5',
  rogue:'0583786faf2704397f9c5af8ab974adb6ee31529401073d95f712f7c45064fbe',
  wraith:'5cce24fc22a4de8324a8d867ac10609fd5a5f34429614600bf628367ae7d041b',
};
const hash=frames=>createHash('sha256').update(Buffer.concat(frames.map(f=>Buffer.from(f.d.buffer)))).digest('hex');
function gait(id,version){
  const source=baseline[id];
  return buildRobedWalk(id,source.palette,unpack(source,source.frames[0]),unpack(source,source.frames[source.walk[0]]),version?{version}:undefined);
}

test('opt-in robed v2 preserves every default v1 pixel and leaves spectral motion unchanged',()=>{
  for(const [id,expected]of Object.entries(v1Pixels)){
    const old=gait(id),explicit=gait(id,'v1');
    assert.equal(hash([...old.frames,...old.lowerFrames]),expected,`${id}: archived v1 output changed`);
    assert.equal(hash([...explicit.frames,...explicit.lowerFrames]),expected,`${id}: explicit v1 changed`);
    assert.equal(old.fps,ROBED_WALK[id].frames/ROBED_WALK[id].cycleSeconds);
    if(ROBED_WALK[id].float)assert.deepEqual(gait(id,'v2'),old,`${id}: no-foot hover must not change in v2`);
  }
});

test('restrained robed steps shorten reach without changing planted world speed',()=>{
  assert.equal(Object.keys(ROBED_WALK_V2).length,6);
  for(const [id,rig]of Object.entries(ROBED_WALK_V2)){
    const old=ROBED_WALK[id],speed=BASE_SPEED*Math.max(.6,Math.min(1.6,moveFor('s15','easy')*(HEROES[id].stats.speed||1)));
    assert.ok(rig.cycleSeconds<old.cycleSeconds);
    assert.ok(2/rig.cycleSeconds<=5.5,`${id}: shortening the stride must not create a frantic cadence`);
    assert.ok(rig.lift<=1&&rig.lift<old.lift*.45);
    assert.ok(rig.roll<=.03);
    for(let phase=.01;phase<.48;phase+=.03){
      const a=robedFoot(phase,rig),b=robedFoot(phase+.01,rig);
      assert.equal(a.lift,0);assert.equal(b.lift,0);
      assert.ok(Math.abs((a.x-b.x)/(.01*rig.cycleSeconds)-speed)<1e-8,`${id}: planted sole slides`);
    }
    for(const boundary of [0,.5,1]){
      const a=robedFoot(boundary-1e-7,rig),b=robedFoot(boundary+1e-7,rig);
      assert.ok(Math.hypot(a.x-b.x,a.lift-b.lift)<1e-4,`${id}: contact or loop seam jumps`);
    }
    assert.ok(robedFoot(0,rig).x<robedFoot(0,old).x);
    assert.equal(gait(id,'v2').fps,rig.frames/rig.cycleSeconds);
  }
});

test('all restrained native phases keep connected feet, source colours and complete staff-free lower layers',()=>{
  const failures=[];
  for(const id of Object.keys(ROBED_WALK_V2)){
    const result=gait(id,'v2'),palette=new Set(baseline[id].palette);
    assert.equal(new Set(result.frames.map(f=>hash([f]))).size,16,`${id}: repeated poses`);
    assert.ok(result.lowerFrames.every(f=>f.staffFree),`${id}: staff removal must happen before boots are layered`);
    for(const [phase,frame]of result.frames.entries()){
      const {w,h,d}=frame,seen=new Uint8Array(d.length),parts=[];
      for(const color of d)assert.ok(palette.has(color),`${id}: colour changed`);
      for(let start=0;start<d.length;start++){
        if(seen[start]||(d[start]>>>24)<128)continue;
        const todo=[start];let pixels=0,top=h;seen[start]=1;
        while(todo.length){
          const p=todo.pop(),x=p%w,y=Math.floor(p/w);pixels++;top=Math.min(top,y);
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const xx=x+dx,yy=y+dy,q=yy*w+xx;
            if(xx<0||xx>=w||yy<0||yy>=h||seen[q]||(d[q]>>>24)<128)continue;
            seen[q]=1;todo.push(q);
          }
        }
        parts.push({pixels,top});
      }
      parts.sort((a,b)=>b.pixels-a.pixels);
      const detached=parts.slice(1).filter(p=>p.pixels>=3&&p.top>=46);
      if(detached.length)failures.push({id,phase,detached});
    }
  }
  assert.deepEqual(failures,[],'visible lower anatomy must connect throughout the complete cycle');
});
