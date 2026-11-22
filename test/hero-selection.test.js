import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { HeroScreen, heroSelectionLayout } from '../public/js/ui/hero-selection.js';
import { HeroShowcase, showcaseAction } from '../public/js/ui/hero-showcase.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { input } from '../public/js/engine/input.js';
import { view } from '../public/js/engine/view.js';
import { UI } from '../public/js/ui/ui.js';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { defaultProfile } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');

function openRoster(heroes = ['knight'], selected = heroes[0]) {
  const profile = defaultProfile();
  profile.heroes = [...heroes];
  const app = { ui: new UI(), store: { profile }, settings: {}, choice: { hero: selected }, scene: { draw() {} } };
  const screen = new HeroScreen();
  screen.enter(app);
  return { screen, ui: app.ui };
}

const rosterRows = ui => ui.items.filter(item => item.id.startsWith('h_'));

test('the scrollable roster stays on the left and the preview, stats and footer fit the screen', () => {
  for (const [W, H] of [[640,360], [480,270], [844,390], [320,240], [293,633], [390,844]]) {
    const layout = heroSelectionLayout(W, H);
    const { roster, stage, info, play } = layout;
    for (const box of [roster, stage, info, play]) {
      assert.ok(box.x >= 0 && box.y >= 0 && box.w > 0 && box.h > 0);
      assert.ok(box.x + box.w <= W && box.y + box.h <= H, `${W} × ${H}`);
    }
    assert.ok(roster.x + roster.w <= stage.x);
    assert.ok(roster.x + roster.w <= info.x);
    assert.ok(stage.y + stage.h <= info.y);
    assert.ok(info.y + info.h <= play.y);
  }
});

test('a fresh roster shows Knight above the next recruit and a sparse save keeps its earned heroes', () => {
  for (const heroes of [['knight'], ['knight', 'eanasir']]) {
    const { screen, ui } = openRoster(heroes);
    screen.draw(ctx, 640, 360, .3);
    const rows = rosterRows(ui);
    assert.deepEqual(rows.map(row => row.id), [...heroes, 'archer'].map(id => 'h_' + id));
    for (let i = 1; i < rows.length; i++) {
      assert.equal(rows[i].x, rows[0].x);
      assert.ok(rows[i].y >= rows[i - 1].y + rows[i - 1].h);
    }
    ui.focusId = 'h_archer';
    screen.draw(ctx, 640, 360, .01);
    assert.equal(screen.preview.game.player.id, 'archer');
    assert.equal(ui.items.find(item => item.id === 'hero_continue').disabled, true);
  }
});

test('the wheel reveals the end of a full roster and Up and Down follow the selected row across pages', () => {
  const { screen, ui } = openRoster(HERO_ORDER);
  const draw = () => { screen.draw(ctx, 480, 270, .1); input.endFrame(); };
  const previousMouse = { ...input.mouse };
  try {
    input.mouse.x = input.mouse.y = -1;
    draw();
    const firstRows = rosterRows(ui);
    assert.ok(firstRows.length > 1 && firstRows.length < HERO_ORDER.length);
    const roster = screen.layout.roster;
    input.mouse.x = roster.x + roster.w / 2;
    input.mouse.y = roster.y + roster.h / 2;
    for (let i = 0; i < HERO_ORDER.length * 2; i++) {
      input.mouse.wheel = 1;
      draw();
      assert.equal(screen.preview.game.player.id, 'knight', 'browsing later rows keeps the selected preview');
    }
    assert.equal(rosterRows(ui).at(-1).id, 'h_' + HERO_ORDER.at(-1));
    for (let i = 0; i < HERO_ORDER.length * 2; i++) {
      input.mouse.wheel = -1;
      draw();
    }
    assert.equal(rosterRows(ui)[0].id, 'h_knight');

    input.mouse.x = input.mouse.y = -1;
    ui.focusId = 'h_knight';
    for (const [key, heroes] of [['ArrowDown', HERO_ORDER.slice(1)], ['ArrowUp', HERO_ORDER.slice(0, -1).reverse()]]) {
      for (const hero of heroes) {
        input.justDown.add(key);
        draw();
        draw();
        assert.equal(ui.focusId, 'h_' + hero, hero);
        assert.equal(screen.preview.game.player.id, hero);
        assert.ok(rosterRows(ui).some(row => row.id === ui.focusId), 'the focused row is visible');
      }
    }
  } finally {
    input.endFrame();
    Object.assign(input.mouse, previousMouse);
  }
});

test('the merchant can be previewed when his special unlock is the last remaining one', () => {
  const earned = HERO_ORDER.filter(id => id !== 'eanasir');
  const { screen, ui } = openRoster(earned, earned.at(-1));
  const draw = () => { screen.draw(ctx, 480, 270, .3); input.endFrame(); };
  draw();
  assert.equal(ui.focusId, 'h_' + earned.at(-1));
  input.justDown.add('ArrowDown');
  draw();
  draw();
  assert.equal(ui.focusId, 'h_eanasir');
  assert.equal(screen.preview.game.player.id, 'eanasir');
  assert.equal(ui.items.find(item => item.id === 'hero_continue').disabled, true);
});

test('the showcase draws the selected hero one menu pixel per art pixel on phone and desktop displays', () => {
  const { S, zoom } = view;
  try {
    for (const [uiScale, worldZoom] of [[1, .8], [2, .8], [4, .8]]) {
      Object.assign(view, { S: uiScale, zoom: worldZoom });
      const preview = new HeroShowcase('knight', defaultProfile(), {});
      preview.update(.1);
      preview.draw(ctx, { x: 20, y: 20, w: 240, h: 160 }, false, {});
      const [, , menuW, menuH] = preview.game.player._rect;
      preview.game.cam = {};
      preview.game.syncCam();
      preview.game.placePlayer({ ...preview.game.cam, x: 0, y: 0 });
      const [, , fieldW, fieldH] = preview.game.player._rect;
      // Whole menu pixels (heroMenuScale 1), so none of the art is dropped: the field draws the
      // same art at the camera's scale.
      const camS = preview.game.cam.S;
      assert.ok(Math.abs(menuW * camS - fieldW) <= camS);
      assert.ok(Math.abs(menuH * camS - fieldH) <= camS);
    }
  } finally {
    Object.assign(view, { S, zoom });
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
      const [x,y,,,art,flip]=p._rect,b=bounds(art.buf),S=preview.geometry.scale/(spr.hires||1);
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

test('the roster shows each archer in her current look with an old Ranger hood preference', () => {
  const profile = defaultProfile();
  profile.heroes.push('archer', 'trailblazer');
  const app = {
    ui: new UI(), store: { profile }, settings: { skins: { archer: 'hooded' } },
    choice: { hero: 'archer' }, scene: { draw() {} },
  };
  const screen = new HeroScreen();
  screen.enter(app);
  for (const id of ['archer', 'trailblazer']) {
    app.ui.focusId = 'h_' + id;
    screen.draw(ctx, 480, 270, 0.3);
    assert.equal(screen.preview.game.player.hero.sprite, id);
    assert.ok(!app.ui.items.some(item => item.id === 'ranger_hood'));
    input.endFrame();
  }
});
