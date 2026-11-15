import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import '../tools/headless.mjs';
import data from '../public/assets/heroes-authored/eanasir.js';
import {COPPER_ART} from '../public/js/art/eanasir.js';
import {COPPER_ART as beforeCopper,EANASIR_HERO_ART as beforeHero} from '../tools/hero-round2-review/before/eanasir-source.js';
import {buildSprites,SPR} from '../public/js/engine/sprites.js';
import {STONE_PALETTE} from '../tools/eanasir-source/native-model.mjs';
import {unpack} from '../tools/animation-round/build.mjs';

test('merchant uses opaque native statue-palette pixels with unchanged world geometry and source provenance',()=>{
 const file=new URL('../tools/eanasir-source/model.png',import.meta.url);
 assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),data.sourceSha256);
 const allowed=new Set([0,...Object.values(STONE_PALETTE)]);
 assert.ok(data.palette.length<=32,'broad restrained ramps rather than filtered source texture');
 for(const c of data.palette){assert.ok(allowed.has(c),'every colour belongs to the restrained statue/equipment palette');assert.ok(c===0||c>>>24===255,'no translucent antialiased edges');}
 for(const tile of data.frames){const f=unpack(data,tile);for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(x===0||y===0||x===f.w-1||y===f.h-1)assert.equal(f.d[y*f.w+x],0,'all poses preserve transparent safety padding');}
 buildSprites();const spr=SPR.eanasir;
 assert.equal(spr.hires,1);assert.equal(spr.w/spr.hires,80);assert.equal(spr.h/spr.hires,64);
 assert.equal(spr.anchorY/spr.hires,56);assert.deepEqual(spr.body.map(n=>n/spr.hires),[25,44]);
 assert.equal(spr.below/spr.hires,7);assert.equal(SPR.eanasir_pose.hires,1);
 assert.deepEqual(COPPER_ART,beforeCopper,'all copper discs, weapon and evolution icons remain byte-for-byte definitions');
});

test('scalp, beard and cylinder use one muted stone ramp while game equipment keeps separate accents',()=>{
 const surfaceKeys=['m','b','B','d','t','T','s','S','C','D','H','z'];
 const stone=new Set(surfaceKeys.map(k=>STONE_PALETTE[k]));
 for(const c of stone){
  const r=c&255,g=c>>>8&255,b=c>>>16&255;
  assert.ok(r>=g&&g>=b&&r-g<=31&&g-b<=30,'stone remains muted warm beige/taupe, not reddish flesh or yellow cloth');
 }
 const material=new Set([0,STONE_PALETTE.k,STONE_PALETTE.eye,STONE_PALETTE.pupil,...stone]);
 for(const index of data.idle){
  const {w,d}=unpack(data,data.frames[index]);
  // These regions avoid the copper disc and leather coil. Broad regions,
  // rather than exact pixels, guard material identity through the idle loop.
  for(const [x0,y0,x1,y1] of [[33,11,45,22],[37,23,42,30],[40,41,42,53]]){
   let visible=0,stonePixels=0;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const c=d[y*w+x];assert.ok(material.has(c),'sculpture regions contain no copper, leather or unrelated material colour');
    if(c>>>24)visible++;if(stone.has(c))stonePixels++;
   }
   assert.ok(visible>0&&stonePixels/visible>.6,'stone planes dominate every sculpture region');
  }
 }
});

test('sixteen merchant phases preserve cadence and every attack keeps the connected travel cycle',()=>{
 const before=beforeHero.eanasir;
 assert.equal(data.idle.length,16);assert.equal(data.walk.length,16);
 assert.equal(data.walk.length/data.motionRate,before.walk.length/before.motionRate);
 assert.ok(Math.abs(data.idle.length/data.idleRate-before.idle.length/before.idleRate)<1e-12);
 for(const key of ['attackFps','attackRelease','manualDelay'])assert.equal(data[key],before[key]);
 assert.equal(data.attack.length,5);assert.equal(data.attackWalk.length,5);
 for(const row of data.attackWalk){assert.equal(row.length,16);assert.equal(new Set(row.map(i=>data.frames[i][4])).size,16);}
});

test('merchant release grips stay at the actual lash origin through every moving release',()=>{
 assert.deepEqual(data.attackGrips[data.attackRelease],[44,38]);
 for(const i of [data.attack[data.attackRelease],...data.attackWalk[data.attackRelease]]){
  const {w,d}=unpack(data,data.frames[i]);let hand=0;
  for(let y=37;y<=39;y++)for(let x=43;x<=45;x++){
   const c=d[y*w+x];if(c>>>24>=128&&(c&255)>(c>>>16&255))hand++;
  }
  assert.ok(hand>=7,'a substantial native hand/handle surrounds logical44,38 in frame '+i);
 }
});
