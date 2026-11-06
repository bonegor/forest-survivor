import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { releaseFiles } from '../tools/build-itch.mjs';
import approved from '../public/assets/heroes-approved/index.js';
import { APPROVED_DESIGNS } from '../public/js/expansion/roster.js';

test('the only registered hero art is the selected roster and its matching poses', () => {
  assert.deepEqual(Object.keys(HERO_ART).sort(), Object.keys(HEROES).flatMap(id => [id, id+'_pose']).sort());
  for (const h of Object.values(HEROES)) {
    assert.equal(h.sprite,h.id); assert.equal(h.pose,h.id+'_pose'); assert.equal(h.skins,undefined);
    for (const saved of [undefined,'original','refined','v3','v4a','v4b','removed']) {
      assert.equal(heroLook(h.id,{[h.id]:saved}),h,h.id+': old settings cannot restore a discarded sprite');
    }
  }
});

test('every shipped frame reconstructs the registered native pixels and anchor', () => {
  for (const [id, data] of Object.entries(approved)) {
    assert.equal(data.design, APPROVED_DESIGNS[id]);
    assert.match(data.sha256, /^[a-f0-9]{64}$/);
    const spr = SPR[id];
    assert.equal(spr.frames.length,data.frames.length,id);
    for (const [index,[x,y,w,h,encoded]] of data.frames.entries()) {
      const bytes=Buffer.from(encoded,'base64'), expected=new Uint32Array(data.w*data.h);
      assert.equal(bytes.length, w * h * data.indexBytes);
      for (let p = 0; p < w * h; p++) {
        const color = bytes.readUIntLE(p * data.indexBytes, data.indexBytes);
        expected[(y + Math.floor(p / w)) * data.w + x + p % w] = data.palette[color];
      }
      assert.deepEqual(spr.frames[index].buf.d,expected,`${id}: approved frame ${index}`);
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
