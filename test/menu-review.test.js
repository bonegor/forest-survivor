import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { UI } from '../public/js/ui/ui.js';
import { input } from '../public/js/engine/input.js';
import { CodexScreen, ArmoryScreen, RecordsScreen, ModeScreen, menuEntries, upgradeEffect } from '../public/js/ui/screens.js';
import { codexSummary, evolutionRecipe } from '../public/js/ui/menu-copy.js';
import { defaultProfile, openEverything, HERO_ORDER } from '../public/js/shared/profile.js';
const ctx = document.createElement('canvas').getContext('2d');
function app(profile = defaultProfile()) {
  return { ui: new UI(), scene: { draw() {} }, store: { profile }, settings: {}, choice: { hero: 'knight', mode: 's15', diff: 'easy' }, go() {} };
}
function draw(screen, a, W = 480, H = 270) {
  screen.draw(ctx, W, H, 0.3);
  a.ui.lockT = 0;
  input.justDown.clear();input.mouse.clicked = false;input.mouse.moved = false;input.mouse.wheel = 0;
}
function activate(screen, a, id) { a.ui.focusId = id;input.justDown.add('Enter');draw(screen, a); }

test('Codex: browsing never changes the weapon pool; Enter on an open weapon switches it, nothing else; Escape goes back onto CODEX', async () => {
  const a = app({ ...defaultProfile(), kills: 10 });const calls = [];a.store.setHome = async (id, on) => { calls.push([id, on]);return true; };
  let went = null;a.go = (name, params) => { went = [name, params]; };
  const s = new CodexScreen();s.enter(a);draw(s,a);
  a.ui.focusId = 'cx_weapon_axe';draw(s,a);assert.equal(s.shown,'cx_weapon_axe','the panel tells of the tile in focus');assert.equal(calls.length,0);
  activate(s,a,'cx_weapon_axe');await Promise.resolve();assert.deepEqual(calls,[['axe',true]],'one press, one switch');
  activate(s,a,'cx_feature_exclusions');await Promise.resolve();assert.equal(calls.length,1,'nothing to switch on another tile');
  input.justDown.add('Escape');s.draw(ctx,480,270,0.3);input.justDown.clear();
  assert.deepEqual(went,['title',{ focus: 'codex' }]);
});

test('Armory inspection does not buy; affordable purchase is explicit and single', async () => {
  const a = app();a.store.profile.gold=100;let calls=0;a.store.buy=async()=>{calls++;return true;};
  const s=new ArmoryScreen();s.enter(a);draw(s,a);activate(s,a,'u_might');
  assert.ok(s.dialog);assert.equal(calls,0);draw(s,a);activate(s,a,'detail_buy');
  await Promise.resolve();assert.equal(calls,1);
});

test('unaffordable upgrades remain inspectable but cannot be purchased', () => {
  const a=app(),s=new ArmoryScreen();s.enter(a);draw(s,a);activate(s,a,'u_echo');draw(s,a);
  assert.ok(a.ui.items.find(i=>i.id==='detail_buy').disabled);
});

test('mouse hover does not change mode or saved difficulty', () => {
  const p=openEverything(defaultProfile());p.heroes=[...HERO_ORDER];p.feats.necromancer=3;
  const a=app(p),s=new ModeScreen();s.enter(a);draw(s,a);
  for(const id of ['m_dungeon','d_hard']) {
    const it=a.ui.items.find(i=>i.id===id);input.mouse.x=it.x+3;input.mouse.y=it.y+3;input.mouse.moved=true;draw(s,a);
    draw(s,a);assert.equal(a.choice.mode,'s15');assert.equal(a.choice.diff,'easy');
  }
});

test('all nine ranked records remain accessible on short and narrow screens', () => {
  for(const [W,H] of [[480,270],[640,360],[390,844],[293,633]]) {
    const a=app(),s=new RecordsScreen();s.enter(a);s.tab='ranked';draw(s,a,W,H);
    const rows=a.ui.items.filter(i=>i.id.startsWith('record_'));assert.equal(rows.length,9);
    for(const r of rows) assert.ok(r.y>=54 && r.y+r.h<H-20);
  }
});

test('mystery weapons share one discovery card and unlocked copy describes effects', () => {
  const entries=menuEntries(defaultProfile()),hidden=entries.filter(e=>e.hidden);
  assert.equal(hidden.length,1);assert.ok(hidden[0].hiddenCount>1);
  assert.equal(codexSummary(entries.find(e=>e.id==='axe')),'Arcing axes');
  assert.match(evolutionRecipe(entries.find(e=>e.id==='axe')),/Level 8.*Giant.*Whirlwind/);
  assert.equal(upgradeEffect({up:{might:2}},'might'),'+10%');
  assert.equal(upgradeEffect({up:{arsenal:1}},'arsenal'),'4');
});
