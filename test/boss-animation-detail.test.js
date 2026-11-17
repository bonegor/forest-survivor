import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
import {SPR} from '../public/js/engine/sprites.js';
const specs={butcher:[26,31.6923076923],lich:[25,27.22],pharaoh:[28,27.4642857143],frostgiant:[28,33.5714285714],thornqueen:[28,29.5],pitlord:[28,33.5714285714]};
function game(){const g=new Game({hero:'knight',mode:'s15',meta:metaBonuses(defaultProfile()),settings:{numbers:false}});g.spawner.update=()=>{};g.enemies=[];g.player.weapons=[];g.player.devGod=true;return g;}
test('detailed boss source density preserves original AI scales, ground footprints and body height',()=>{
 const g=game();for(const[id,[height,radius]]of Object.entries(specs)){const e=g.spawnEnemy(id,100,100,{instant:true,always:true});assert.equal(e.scale,57/height,id+' AI scale');assert.equal(e.drawScale,.5,id+' source density');assert.equal(e.h,57,id+' world height');assert.ok(Math.abs(e.hr-radius)<1e-8,id+' original ground footprint');const fr=e.spr.frames[e.spr.idle[0]],box=fr.box;assert.ok(Math.abs((box[3]-box[1])*.5-57)<=1,id+' actual standing silhouette height');}
});
test('all authored boss poses retain native detail and complete silhouettes within their canvases',()=>{
 for(const id of Object.keys(specs)){const s=SPR[id];assert.ok(s.idle.length>=8&&s.walk.length>=12,id+' complete cycles');for(const f of s.frames){const b=f.box;assert.ok(b[2]>b[0]&&b[3]>b[1],id+' nonempty frame');assert.ok(b[0]>0&&b[1]>0&&b[2]<f.w&&b[3]<f.h,id+' no clipped equipment');}assert.ok(s.frames.length>=80,id+' authored attack poses');}
});
test('both facing hitboxes contain the actual detailed boss draw, including moving equipment',()=>{
 const g=game(),ctx=document.createElement('canvas').getContext('2d');for(const id of Object.keys(specs)){const e=g.spawnEnemy(id,100,100,{instant:true,always:true});e.spawnT=0;e.sleeping=true;for(const face of[-1,1]){e.face=face;e.draw(ctx,g.cam);const f=e.spr.frames[e.frameIndex()],b=f.box,S=g.cam.S,[X,Y,w,h]=e._rect,body=e.body();const left=X/S+g.cam.x+(face<0?f.w-b[2]:b[0])*e.drawScale,right=X/S+g.cam.x+(face<0?f.w-b[0]:b[2])*e.drawScale,top=Y/S+g.cam.y+b[1]*e.drawScale,bottom=Y/S+g.cam.y+b[3]*e.drawScale;assert.ok(body[0]<=left&&body[2]>=right&&body[1]<=top&&body[3]>=bottom,id+' facing '+face);}}
});
test('both Bone King sweeps and blade tips fit in the expanded art', () => {
  const original = SPR.boneking;
  const floating = SPR.boneking_floating;
  const legged = SPR.boneking_legs;
  const padX = (floating.w - original.w) / 2;
  const padY = floating.h - original.h - (floating.below - original.below);
  assert.equal(padX, 12);
  assert.equal(padY, 12);
  assert.ok(floating.frames[0].box[0] < original.frames[0].box[0] + padX, 'larger shield extends past the old hand');
  for (const art of [floating, legged]) {
    assert.deepEqual([art.w, art.h, art.below], [floating.w, floating.h, floating.below]);
    for (const [i, frame] of art.frames.entries()) {
      const [x0, y0, x1, y1] = frame.box;
      assert.ok(x0 > 0 && y0 > 0 && x1 < frame.w && y1 < frame.h, `pose ${i} has clearance around the outline`);
    }
    for (const i of [20, 21]) {
      const previous = original.frames[i].box;
      const repaired = art.frames[i].box;
      assert.ok(repaired[2] > previous[2] + padX && repaired[3] > previous[3] + padY, `pose ${i} restores the sword tip`);
    }
    assert.ok(art.frames[20].box[1] < original.frames[20].box[1] + padY, 'the swing trail curls past the old top crop');
  }
  for (const i of [20, 21]) {
    assert.deepEqual(legged.frames[i].box.slice(1), floating.frames[i].box.slice(1), `same sword extents for pose ${i}`);
  }
});

test('the Bone King style can switch mid-sweep without changing the hit bounds, pose or anchors', () => {
  const g = game();
  const king = g.spawnEnemy('boneking', 100, 100, { instant: true, always: true });
  const ctx = document.createElement('canvas').getContext('2d');
  const original = SPR.boneking;
  const floating = SPR.boneking_floating;
  const legged = SPR.boneking_legs;
  for (const field of ['idle', 'walk', 'poses', 'poseFps', 'motionRate', 'body', 'hires']) {
    for (const art of [floating, legged]) assert.deepEqual(art[field], original[field], field);
  }
  for (const [i, frame] of legged.frames.entries()) {
    if (i === 20 || i === 21) continue;
    const pad = (legged.w - original.w) / 2;
    const [x0, y0, x1, y1] = frame.box;
    const [left, top, right, bottom] = original.frames[i].box;
    assert.ok(x0 >= left + pad && y0 >= top + pad && x1 <= right + pad && y1 <= bottom + pad, `pose ${i} fits the encounter hitbox`);
  }
  Object.assign(king, { pose: 'volley', state: 'cast', poseAt: 0, life: .16, brandT: 1 });
  let mark;
  const samePosition = (actual, expected) => actual.every((value, i) => Math.abs(value - expected[i]) < 1e-8);
  king.drawBrand = (_ctx, _cam, x, y, w) => { mark = [x + w / 2, y]; };
  for (const face of [1, -1]) {
    king.face = face;
    const pose = king.frameIndex();
    assert.equal(pose, 20);
    g.settings.boneKingLegs = false;
    king.draw(ctx, g.cam);
    assert.equal(king._img, floating.frames[pose].get(face < 0));
    const bounds = [...king.body()];
    const drawRect = [...king._rect];
    const geometry = [king.hr, king.reach];
    king.drawEmissive(ctx, g.cam);
    const markAt = mark;
    g.settings.boneKingLegs = true;
    king.draw(ctx, g.cam);
    assert.equal(king._img, legged.frames[pose].get(face < 0));
    assert.deepEqual(king._rect, drawRect, 'both looks draw at the same position and size');
    king.drawEmissive(ctx, g.cam);
    assert.ok(samePosition(mark, markAt), 'the mark stays anchored');
    assert.deepEqual(king.body(), bounds);
    assert.deepEqual([king.hr, king.reach], geometry);
    assert.equal(king.frameIndex(), pose);
  }
  const skeleton = g.spawnEnemy('skeleton', 100, 100, { instant: true, always: true });
  assert.equal(skeleton.drawSprite, SPR.skeleton);
});
test('slam and nova impact poses meet the existing real AI telegraph release',()=>{
 for(const[id,pose,release]of[['butcher','slam',.85],['frostgiant','slam',.85],['pharaoh','nova',1],['pitlord','nova',1]]){
  const g=game(),p=g.player,e=g.spawnEnemy(id,p.x+30,p.y,{instant:true,always:true});e.spawnT=0;e.aware=true;e.cdT=pose==='nova'?0:100;e.cd2=pose==='slam'?0:100;e.cd3=100;e.ai(e,0);assert.equal(e.pose,pose);const warning=g.effects.find(f=>f.constructor.name==='Telegraph');assert.ok(warning,id+' existing AI warning');e.life=e.poseAt+release;const phase=e.spr.poses[pose].indexOf(e.frameIndex());assert.ok(phase>=17&&phase<=19,id+' release frame '+phase);e.life=e.poseAt+release+.24;assert.notEqual(e.frameIndex(),e.spr.poses[pose][18],id+' recovers from impact');
 }
});
