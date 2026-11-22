import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { APPROVED_HERO_ART } from '../public/js/art/approved-heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { snapAlpha } from '../public/js/engine/pixels.js';
import { releaseFiles } from '../tools/build-itch.mjs';
import approved from '../public/assets/heroes-approved/index.js';
import { APPROVED_DESIGNS } from '../public/js/expansion/roster.js';

test('registered hero art contains one look and matching pose per hero', () => {
  const models = Object.keys(HEROES);
  assert.deepEqual(Object.keys(HERO_ART).sort(), models.flatMap(id => [id, id+'_pose']).sort());
  for (const h of Object.values(HEROES)) {
    assert.equal(h.sprite,h.id); assert.equal(h.pose,h.id+'_pose'); assert.equal(h.skins,undefined);
    for (const saved of [undefined,'original','refined','v3','v4a','v4b','hooded','removed']) {
      assert.equal(heroLook(h.id,{[h.id]:saved}),h,h.id+': old settings cannot restore a discarded sprite');
    }
  }
});

test('packed sheets reconstruct the native art underlying every registered sprite', () => {
  for (const [id, data] of Object.entries(approved)) {
    assert.equal(data.design, APPROVED_DESIGNS[id]);
    assert.match(data.sha256, /^[a-f0-9]{64}$/);
    const spr = SPR[id];
    assert.equal(spr.frames.length,data.frames.length,id);
    // Trail wears her hood over this native sheet. The hood art test checks
    // the final silhouette, registration and weapon pixels of every pose.
    const frames = id === 'trailblazer' ? APPROVED_HERO_ART[id].gen() : spr.frames.map(frame => frame.buf);
    for (const [index,[x,y,w,h,encoded]] of data.frames.entries()) {
      const bytes=Buffer.from(encoded,'base64'), expected=new Uint32Array(data.w*data.h);
      assert.equal(bytes.length, w * h * data.indexBytes);
      for (let p = 0; p < w * h; p++) {
        const color = bytes.readUIntLE(p * data.indexBytes, data.indexBytes);
        expected[(y + Math.floor(p / w)) * data.w + x + p % w] = data.palette[color];
      }
      // The game snaps a sheet's near-clear dust to clear and its near-solid body to solid (snapAlpha).
      assert.deepEqual(frames[index].d,id === 'trailblazer' ? expected : snapAlpha({ d: expected }).d,`${id}: approved frame ${index}`);
    }
  }
});

test('discarded sprite files, loaders and selection controls are absent from the shipped game', () => {
  assert.deepEqual(readdirSync(new URL('../public/assets/heroes-approved/',import.meta.url)).sort(), ['index.js', ...Object.keys(approved).map(id=>id+'.js')].sort());
  assert.ok(!Object.values(approved).some(data => data.design === 'heroes7-brute'));
  for(const path of ['assets/heroes-v3','assets/heroes-v4','assets/knight-plumed/data.js','js/art/hero-review.js','js/art/hero-skins.js','js/art/hero-v3.js','97sjbk94u6md/heroes']) {
    assert.equal(existsSync(new URL('../public/'+path,import.meta.url)),false,path);
    assert.ok(!releaseFiles().some(f=>f===path||f.startsWith(path+'/')),path+': absent from release');
  }
  assert.doesNotMatch(readFileSync(new URL('../public/js/ui/hero-selection.js',import.meta.url),'utf8'),/stepper\([^\n]*'look'/);
});
