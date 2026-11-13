import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import baseline from '../tools/animation-round/baseline/index.js';
import approved from '../public/assets/heroes-approved/index.js';
import {unpack} from '../tools/animation-round/build.mjs';
import {buildRobedWalk,robedFoot,ROBED_WALK} from '../tools/animation-round/robed-walk.mjs';
import {HEROES} from '../public/js/data/heroes.js';
import {moveFor} from '../public/js/data/difficulty.js';
import {BASE_SPEED} from '../public/js/game/player.js';

const directory=new URL('../tools/animation-round/baseline/robed-walk/',import.meta.url);
const sources=JSON.parse(readFileSync(new URL('models.json',directory),'utf8'));
const gait=id=>buildRobedWalk(id,baseline[id].palette,unpack(approved[id],approved[id].frames[0]),unpack(baseline[id],baseline[id].frames[baseline[id].walk[0]]));

test('robed source ownership is retained locally and all three layers match provenance',()=>{
  assert.equal(Object.keys(sources).length,6);
  for(const [id,model]of Object.entries(sources)){
    assert.match(model.originalSourceSha256,/^[a-f0-9]{64}$/);
    assert.equal(model.layers.length,3,`${id}: foreground and both complete legs`);
    for(const layer of model.layers){
      assert.equal(createHash('sha256').update(readFileSync(new URL(layer.file,directory))).digest('hex'),layer.sha256,`${id}: source ownership changed`);
    }
  }
});

test('robed support soles match gameplay distance and return continuously through the seam',()=>{
  for(const [id,rig]of Object.entries(ROBED_WALK)){
    if(rig.float)continue;
    const speed=BASE_SPEED*Math.max(.6,Math.min(1.6,moveFor('s15','easy')*(HEROES[id].stats.speed||1)));
    const a=robedFoot(.1,rig),b=robedFoot(.2,rig);
    assert.equal(a.lift,0);assert.equal(b.lift,0);
    assert.ok(Math.abs((a.x-b.x)/(.1*rig.cycleSeconds)-speed)<1e-8,`${id}: planted feet must not skate`);
    for(const phase of [.55,.65,.75,.85,.95])assert.ok(robedFoot(phase,rig).lift>0,`${id}: return clears the ground`);
    for(const phase of [0,.5,1]){
      const before=robedFoot(phase-1e-7,rig),after=robedFoot(phase+1e-7,rig);
      assert.ok(Math.hypot(before.x-after.x,before.lift-after.lift)<1e-4,`${id}: contact or wrap jumps`);
    }
    assert.equal(approved[id].walk.length,rig.frames);
    assert.ok(Math.abs(approved[id].walk.length/approved[id].walkFps-rig.cycleSeconds)<1e-12,`${id}: packed clock changed the cycle`);
  }
});

test('every robed or spectral cycle preserves native palette, bounds and distinct poses',()=>{
  for(const [id,rig]of Object.entries(ROBED_WALK)){
    const result=gait(id),palette=new Set(baseline[id].palette);
    assert.equal(result.frames.length,16);
    assert.equal(new Set(result.frames.map(f=>createHash('sha256').update(Buffer.from(f.d.buffer)).digest('hex'))).size,16,`${id}: repeated frames cannot substitute for intermediate poses`);
    for(const frame of result.frames){
      assert.equal(frame.w,80);assert.equal(frame.h,64);
      for(let y=0;y<64;y++)for(let x=0;x<80;x++){
        const color=frame.d[y*80+x];assert.ok(palette.has(color),`${id}: unapproved colour or opacity`);
        if(!x||!y||x===79||y===63)assert.equal(color,0,`${id}: clipped at native boundary`);
        // Ground anchor is y56: even the lowest hem leaves row55 visibly clear.
        if(rig.float&&y>=55)assert.ok((color>>>24)<128,`${id}: visible hovering cloth must stay clear of the ground`);
      }
    }
    if(!rig.float)assert.ok(result.lowerFrames.every(f=>f.staffFree),`${id}: new feet must compose after source staff removal`);
  }
});

test('robed walking leaves the approved face and head rigid through controlled weight transfer',()=>{
  const boxes={mage:[33,23,46,35],necromancer:[34,26,46,37],druid:[34,27,44,36],thornkeeper:[32,27,43,38],gravebinder:[34,25,45,36],arcanist:[32,20,46,34]};
  for(const [id,[x0,y0,x1,y1]]of Object.entries(boxes)){
    const standing=unpack(approved[id],approved[id].frames[0]),result=gait(id);
    for(let i=0;i<result.frames.length;i++){
      const bob=result.poses[i].bob;assert.ok(bob===0||bob===-1);
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const color=standing.d[y*80+x];if(color>>>24>=128)assert.equal(result.frames[i].d[(y+bob)*80+x],color,`${id}: changing face at phase ${i}`);
      }
    }
  }
});
