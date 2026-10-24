import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { HeroScreen, heroSelectionLayout } from '../public/js/ui/hero-selection.js';
import { HeroShowcase, showcaseAction } from '../public/js/ui/hero-showcase.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { input } from '../public/js/engine/input.js';
import { UI } from '../public/js/ui/ui.js';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { defaultProfile } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');

test('hero stage aligns with roster; stats sit beside it on desktop and below it on portrait screens', () => {
  for (const [W, H] of [[640,360], [480,270], [844,390], [293,633], [390,844]]) {
    const L = heroSelectionLayout(W,H);
    assert.equal(L.stage.x,L.x);
    for (const box of [L.stage,L.info,L.play]) {
      assert.ok(box.x>=0 && box.y>=0 && box.w>0 && box.h>0);
      assert.ok(box.x+box.w<=W && box.y+box.h<=H);
    }
    if (L.stacked) assert.ok(L.info.y>=L.stage.y+L.stage.h);
    else { assert.equal(L.stage.y,L.info.y);assert.ok(L.info.x>=L.stage.x+L.stage.w); }
  }
});

test('every hero cycles through rest, both walking directions and its actual attack poses, without clipping', () => {
  for (const id of HERO_ORDER) {
    const profile=defaultProfile(),before=JSON.stringify(profile);
    const preview=new HeroShowcase(id,profile,{diff:'medium'}),p=preview.game.player,spr=SPR[p.hero.sprite];
    const poses=new Set(),actions=new Set(),faces=new Set();
    const box={x:12,y:75,w:173,h:141};
    for(let frame=0;frame<720;frame++) {
      preview.update(1/60);preview.draw(ctx,box,false,{});
      actions.add(preview.action.kind);faces.add(p.face);
      poses.add(spr.frames.indexOf(p._rect[4]));
      const [x,y,,,art,flip]=p._rect,b=bounds(art.buf),S=preview.geometry.scale;
      const left=flip ? art.w-1-b.x1 : b.x0;
      const right=flip ? art.w-b.x0 : b.x1+1;
      assert.ok(x+left*S>=box.x && x+right*S<=box.x+box.w,`${id}: full width at ${frame}`);
      assert.ok(y+b.y0*S>=box.y && y+(b.y1+1)*S<=box.y+box.h,`${id}: full height at ${frame}`);
    }
    assert.deepEqual([...actions].sort(),['attack','idle','walk']);
    assert.equal(faces.size,2);
    for(const index of spr.walk) assert.ok(poses.has(index),`${id}: walk pose ${index}`);
    for(const index of spr.attack||[]) assert.ok(poses.has(index),`${id}: attack pose ${index}`);
    assert.equal(JSON.stringify(profile),before);
  }
});

test('stats include permanent upgrades and equipped gear and remain inline', () => {
  const profile=defaultProfile();profile.up={vitality:2,might:2,armor:2};
  profile.gear.knight={armor:{slot:'armor',rarity:0,stats:{maxHp:10},power:null,seed:1}};
  const app={ui:new UI(),store:{profile},settings:{},choice:{hero:'knight'},scene:{draw(){}},go(name){this.went=name;}};
  const screen=new HeroScreen();screen.enter(app);screen.draw(ctx,640,360,0.3);
  assert.equal(screen.preview.game.player.maxHp,Math.round(HEROES.knight.stats.maxHp*1.2*1.1));
  assert.equal(screen.preview.game.player.armor,3);
  assert.equal(screen.preview.game.player.might,1.1);
  assert.ok(!app.ui.items.some(i=>i.id==='abilities'));
  assert.ok(app.ui.items.some(i=>i.id==='hero_continue'));
  input.justDown.clear();input.mouse.x=input.mouse.y=-1;
  app.ui.focusId='h_archer';screen.draw(ctx,640,360,0.3);
  assert.ok(app.ui.items.find(i=>i.id==='hero_continue').disabled);
});

test('manual preview attacks are visual only and the loop rests before changing direction', () => {
  const preview=new HeroShowcase('archer',defaultProfile(),{});
  preview.attack();preview.update(.1);assert.equal(preview.action.kind,'attack');
  assert.equal(preview.game.player.weapons.length,0);
  assert.equal(showcaseAction(11.99).kind,'idle');
  assert.equal(showcaseAction(12).kind,'idle');
  assert.equal(showcaseAction(11.99).face,showcaseAction(12).face);
});
