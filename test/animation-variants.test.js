import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import v1 from '../tools/animation-round/variants/v1/index.js';
import v2 from '../tools/animation-round/variants/v2/index.js';
import { unpack } from '../tools/animation-round/build.mjs';

test('the preserved V1 snapshot and current production remain byte-identical', () => {
  const directory = new URL('../tools/animation-round/variants/v1/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(Object.keys(v1).length, 21);
  for (const [file, expected] of Object.entries(manifest.files)) {
    assert.equal(hash(readFileSync(new URL(file, directory))), expected, `immutable V1 ${file}`);
    assert.equal(hash(readFileSync(new URL(`../public/assets/heroes-approved/${file}`, import.meta.url))), expected, `production ${file}`);
  }
});

test('V2 changes walking and its moving composites while retaining idle, attack timing and identity', () => {
  assert.deepEqual(Object.keys(v2), Object.keys(v1));
  for (const [id, original] of Object.entries(v1)) {
    const proposed = v2[id];
    for (const key of ['w','h','anchorY','idleFps','attackFps','attackRelease','manualDelay','floating'])
      assert.deepEqual(proposed[key], original[key], `${id}: ${key}`);
    for (const clip of ['idle', 'attack', ...(original.floating ? ['walk'] : [])]) {
      assert.equal(proposed[clip].length, original[clip].length);
      for (let i=0;i<original[clip].length;i++)
        assert.deepEqual(unpack(proposed, proposed.frames[proposed[clip][i]]).d,
          unpack(original, original.frames[original[clip][i]]).d, `${id}: unchanged ${clip} ${i}`);
    }
    if (!original.floating) {
      assert.equal(proposed.walk.length, 16);
      assert.ok(proposed.attackWalk.every(row => row.length === 16), `${id}: all moving strike phases`);
      assert.notDeepEqual(proposed.walk.map(i=>proposed.frames[i]), original.walk.map(i=>original.frames[i]), `${id}: real new poses`);
    }
  }
});

test('every V2 walk and combined strike keeps substantive lower anatomy attached', () => {
  const failures=[];
  for (const [id,data] of Object.entries(v2)) {
    if(data.floating)continue;
    for(const index of [...data.walk,...data.attackWalk.flat()]) {
      const {w,h,d}=unpack(data,data.frames[index]), seen=new Uint8Array(d.length),parts=[];
      for(let start=0;start<d.length;start++) {
        if(seen[start]||d[start]>>>24<128)continue;
        const queue=[start];seen[start]=1;let top=h;
        for(let i=0;i<queue.length;i++) {
          const p=queue[i],x=p%w,y=Math.floor(p/w);top=Math.min(top,y);
          for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++) {
            const q=yy*w+xx;if(seen[q]||d[q]>>>24<128)continue;seen[q]=1;queue.push(q);
          }
        }
        parts.push({pixels:queue.length,top});
      }
      parts.sort((a,b)=>b.pixels-a.pixels);
      const detached=parts.slice(1).filter(p=>p.pixels>=3&&p.top>=data.anchorY-10);
      if(detached.length)failures.push({id,index,detached});
    }
  }
  assert.deepEqual(failures,[], 'review all newly exposed knees, greaves, boots and equipment');
});
