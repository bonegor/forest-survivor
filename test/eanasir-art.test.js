import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import '../tools/headless.mjs';
import data from '../public/assets/heroes-authored/eanasir.js';
import {COPPER_ART} from '../public/js/art/eanasir.js';
import {COPPER_ART as beforeCopper,EANASIR_HERO_ART as beforeHero} from '../tools/hero-round2-review/before/eanasir-source.js';
import {buildSprites,SPR} from '../public/js/engine/sprites.js';
import {readPng} from '../tools/png.mjs';
import {reduceSource} from '../tools/animation-round/source-detail.mjs';
import {unpack} from '../tools/animation-round/build.mjs';

test('merchant standing identity is the literal retained statue source model, with unchanged world geometry',()=>{
 const file=new URL('../tools/eanasir-source/model.png',import.meta.url),model=readPng(file);
 assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),data.sourceSha256);
 assert.deepEqual(unpack(data,data.frames[data.idle[0]]).d,reduceSource(model,[0,0,model.w,model.h],[548,1340],44/1331).d);
 buildSprites();const spr=SPR.eanasir;
 assert.equal(spr.hires,2);assert.equal(spr.w/spr.hires,80);assert.equal(spr.h/spr.hires,64);
 assert.equal(spr.anchorY/spr.hires,56);assert.deepEqual(spr.body.map(n=>n/spr.hires),[25,44]);
 assert.equal(spr.below/spr.hires,7);assert.equal(SPR.eanasir_pose.hires,2);
 assert.deepEqual(COPPER_ART,beforeCopper,'all copper discs, weapon and evolution icons remain byte-for-byte definitions');
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
  for(let y=74;y<=78;y++)for(let x=86;x<=90;x++){
   const c=d[y*w+x];if(c>>>24>=128&&(c&255)>(c>>>16&255))hand++;
  }
  assert.ok(hand>=10,'a substantial warm hand/handle surrounds logical44,38 in frame '+i);
 }
});
