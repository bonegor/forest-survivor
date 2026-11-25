import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import v1 from '../tools/animation-round/variants/v1/index.js';
import v2 from '../tools/animation-round/variants/v2/index.js';
import approved from '../public/assets/heroes-approved/index.js';
import originalBerserker from '../tools/berserker-vikings/prior-accepted-berserker.js';
import { rebuild, unpack } from '../tools/animation-round/build.mjs';

test('the V1 snapshot stays immutable and its roster adaptations preserve their clip mappings', () => {
  const directory = new URL('../tools/animation-round/variants/v1/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(Object.keys(v1).length, 21);
  for (const [file, expected] of Object.entries(manifest.files)) {
    assert.equal(hash(readFileSync(new URL(file, directory))), expected, `immutable V1 ${file}`);
    if (['archer.js','berserker.js'].includes(file)) {
      const id=file.slice(0,-3),current=id==='berserker'?originalBerserker:approved[id],original=v1[id];
      assert.equal(current.clarityRevision,id==='archer'?'trailblazer-head-2026-11-18':'native-style-match-2026-11-15');
      assert.equal(current.hires,1);
      for(const key of ['w','h','anchorY'])assert.equal(current[key]/current.hires,original[key],`${id} retains logical ${key}`);
      for(const key of ['idle','walk','idleFps','attack','attackFps','attackRelease','attackWalk','manualDelay'])assert.deepEqual(current[key],original[key],`${id} retains ${key}`);
      assert.equal(current.walkFps,original.walkFps);
      assert.notDeepEqual(current.frames,original.frames,`${id} uses the native game-palette adaptation`);
    } else if (file === 'trailblazer.js') {
      const current = approved.trailblazer, original = v1.trailblazer;
      for (const key of Object.keys(original).filter(key => key !== 'frames' && key !== 'palette'))
        assert.deepEqual(current[key], original[key], 'Trail preserves '+key);
      for (const [i,tile] of original.frames.entries()) {
        const before = unpack(original,tile), after = unpack(current,current.frames[i]);
        let changed = 0;
        for (let p = 0; p < before.d.length; p++) if (before.d[p] !== after.d[p]) {
          const x = p % before.w, y = Math.floor(p / before.w);
          assert.ok(x >= 37 && x <= 41 && y >= 32 && y <= 35, 'only the eye area changes in pose '+i);
          changed++;
        }
        assert.ok(changed >= 2, 'both irises colored in pose '+i);
      }
    } else if (file === 'wraith.js') {
      const current = approved.wraith, original = v1.wraith;
      assert.equal(current.gradeRevision, 'wraith-idle-grade-2026-11-22');
      for (const key of Object.keys(original).filter(key => key !== 'frames' && key !== 'palette'))
        assert.deepEqual(current[key], original[key], 'Wraith regrade preserves ' + key);
      for (const index of original.idle)
        assert.deepEqual(unpack(current, current.frames[index]).d, unpack(original, original.frames[index]).d);
    } else if (['paladin.js', 'rogue.js'].includes(file)) {
      const id = file.slice(0, -3), current = approved[id], original = v1[id];
      for (const key of ['w', 'h', 'anchorY', 'idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'manualDelay'])
        assert.deepEqual(current[key], original[key], `${id} retains ${key}`);
      for (const key of ['walkFps', 'idleFps', 'attackFps']) assert.equal(current[key], original[key] * (id === 'rogue' ? 2 : 1), `${id} requested ${key}`);
      for (let i = 0; i < current.frames.length; i++) {
        const after = unpack(current, current.frames[i]), before = unpack(original, original.frames[i]);
        const from = id === 'rogue' ? 0 : 46 * after.w;
        assert.deepEqual(after.d.slice(from), before.d.slice(from), `${id} preserved ${id === 'rogue' ? 'all pixels' : 'lower body'} ${i}`);
      }
      if (id !== 'rogue') assert.notDeepEqual(current.frames, original.frames, `${id} art really changed`);
    } else assert.equal(hash(readFileSync(new URL(`../public/assets/heroes-approved/${file}`, import.meta.url))), expected, `production ${file}`);
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

test('rebuilding V2 reproduces every reviewed sheet and the roster index', t => {
  const temporary = mkdtempSync(join(tmpdir(), 'forest-animation-v2-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const outputDir = join(temporary, 'sheets');
  rebuild({ version: 'v2', outputDir, generatedDir: join(temporary, 'inspection') });

  const reviewed = new URL('../tools/animation-round/variants/v2/', import.meta.url);
  const files = readdirSync(reviewed).sort();
  assert.deepEqual(readdirSync(outputDir).sort(), files);
  for (const file of files)
    assert.ok(readFileSync(join(outputDir, file)).equals(readFileSync(new URL(file, reviewed))), file);
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
