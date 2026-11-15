import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Frame,SPR} from '../public/js/engine/sprites.js';
import {Enemy,FROST} from '../public/js/game/enemies.js';
import {OUTLINE} from '../public/js/art/palette.js';
import {hexPack} from '../public/js/engine/pixels.js';

const bosses=['butcher','lich','pharaoh','frostgiant','thornqueen','pitlord'];
function draw(fr,col,flip=false){
 const calls=[],ctx={globalAlpha:.37,drawImage(...args){calls.push([this.globalAlpha,...args]);}};
 Enemy.prototype.drawRim.call({_rect:[10.3,20.6,29.7,40.2,flip]},ctx,fr,col,.6);
 assert.equal(ctx.globalAlpha,1,'rim pass retains its context reset contract');
 return calls;
}

test('detailed boss poses never allocate or draw empty normal and frozen rim canvases',()=>{
 let checked=0;
 for(const id of bosses)for(const fr of SPR[id].frames){
  const before=fr.variants.size;
  for(const col of ['#e43b44',FROST.rim])for(const flip of [false,true]){
   assert.deepEqual(draw(fr,col,flip),[],`${id}: no invisible rim draw`);
   assert.equal(fr.variants.size,before,`${id}: no empty canvas pair retained`);
  }
  checked++;
 }
 assert.equal(checked,532,'every detailed boss pose is covered');
});

test('outlined bosses retain their normal and frozen rims in both facings',()=>{
 const fr=SPR.boneking.frames[0];
 for(const col of ['#e43b44',FROST.rim])for(const flip of [false,true]){
  const calls=draw(fr,col,flip),pair=fr.variants.get('rim'+col);
  assert.equal(calls.length,1,'visible rim remains');
  assert.deepEqual(calls[0],[.6,pair[flip?1:0],10,21,30,40],'same facing, opacity and rounded placement');
 }
});

test('rim presence follows custom ink metadata instead of a hardcoded outline colour',()=>{
 const custom=hexPack('#123456'),body=hexPack('#abcdef'),col='#fee761';
 const tuned=new Frame({w:2,h:2,d:Uint32Array.of(custom,body,0,0),ink:custom});
 assert.equal(draw(tuned,col).length,1,'recoloured ink still produces a rim');
 assert.equal(draw(tuned,col,true).length,1,'recoloured ink keeps its mirrored rim');
 const absent=new Frame({w:2,h:2,d:Uint32Array.of(OUTLINE,body,0,0),ink:custom});
 assert.deepEqual(draw(absent,col),[],'ordinary dark pixels are not custom ink');
 assert.equal(absent.variants.size,0,'no custom-ink rim is cached when it has no pixels');
});
