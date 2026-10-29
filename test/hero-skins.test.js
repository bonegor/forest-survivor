import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { releaseFiles } from '../tools/build-itch.mjs';

const approved = { knight:'knight-plumed/recoloured', archer:'archer-b', mage:'mage-a',
  rogue:'rogue-a', necromancer:'necromancer-a', paladin:'paladin-a', druid:'druid-a',
  berserker:'berserker-a', witchhunter:'witchhunter' };

test('the only registered hero art is the selected roster and its matching poses', () => {
  assert.deepEqual(Object.keys(HERO_ART).sort(), Object.keys(HEROES).flatMap(id => [id, id+'_pose']).sort());
  for (const h of Object.values(HEROES)) {
    assert.equal(h.sprite,h.id); assert.equal(h.pose,h.id+'_pose'); assert.equal(h.skins,undefined);
    for (const saved of [undefined,'original','refined','v3','v4a','v4b','removed']) {
      assert.equal(heroLook(h.id,{[h.id]:saved}),h,h.id+': old settings cannot restore a discarded sprite');
    }
  }
});

test('every shipped frame is pixel-identical to the exact approved sprite', async () => {
  for (const [id, source] of Object.entries(approved)) {
    const path = id==='knight' ? `../public/assets/${source}.js`
      : id==='witchhunter' ? '../tools/art-v4/archive/heroes/witchhunter.js'
      : `../tools/art-v4/archive/heroes-v4/${source}.js`;
    const data=(await import(path)).default, spr=SPR[id];
    assert.equal(spr.frames.length,data.frames.length,id);
    for (const [index,encoded] of data.frames.entries()) {
      const bytes=Buffer.from(encoded,'base64'), expected=new Uint32Array(data.w*data.h);
      for(let p=0;p<expected.length;p++)expected[p]=data.palette[data.indexBytes===2?bytes.readUInt16LE(p*2):bytes[p]];
      assert.deepEqual(spr.frames[index].buf.d,expected,`${id}: approved frame ${index}`);
    }
  }
});

test('discarded sprite files, loaders and selection controls are absent from the shipped game', () => {
  assert.deepEqual(readdirSync(new URL('../public/assets/heroes/',import.meta.url)).sort(),Object.keys(approved).filter(id=>id!=='knight').map(id=>id+'.js').sort());
  for(const path of ['assets/heroes-v3','assets/heroes-v4','assets/knight-plumed/data.js','js/art/hero-review.js','js/art/hero-skins.js','js/art/hero-v3.js','97sjbk94u6md/heroes']) {
    assert.equal(existsSync(new URL('../public/'+path,import.meta.url)),false,path);
    assert.ok(!releaseFiles().some(f=>f===path||f.startsWith(path+'/')),path+': absent from release');
  }
  assert.doesNotMatch(readFileSync(new URL('../public/js/ui/hero-selection.js',import.meta.url),'utf8'),/stepper\([^\n]*'look'/);
});
