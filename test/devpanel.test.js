// The developer panel at the debug address, and what it does to a run. The user: "in debug, I need
// to be able to edit the time of the game (so I change the time and the relevant monsters spawn)
// and the weapons and upgrades that I can add or remove freely" (16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);

// A page just big enough for the panel: elements that keep their children, attributes,
// listeners and classes, and canvases whose 2D calls do nothing (as tools/headless.mjs's, which
// keeps this document); cookies in a jar.
const noop = () => {};
const STUB = {
  createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  createPattern: () => null,
  measureText: () => ({ width: 0 }),
};
class Elem {
  constructor(tag) {
    Object.assign(this, { tagName: tag.toUpperCase(), nodeType: 1, kids: [], attrs: {}, style: {}, on: {}, text: '' });
    Object.assign(this, { className: '', id: '', title: '', type: '', value: '', checked: false, disabled: false, scrollTop: 0, width: 1, height: 1 });
    const classes = () => this.className.split(' ').filter(Boolean);
    this.classList = {
      contains: (c) => classes().includes(c),
      toggle: (c, on = !classes().includes(c)) => {
        this.className = [...classes().filter((x) => x !== c), ...(on ? [c] : [])].join(' ');
      },
    };
  }
  get textContent() {
    return this.text + this.kids.map((k) => (typeof k === 'string' ? k : k.textContent)).join('');
  }
  set textContent(v) {
    this.text = String(v);
    this.kids = [];
  }
  append(...kids) {
    this.kids.push(...kids);
  }
  addEventListener(ev, fn) {
    (this.on[ev] ||= []).push(fn);
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  focus() {}
  click() {
    return Promise.all((this.on.click || []).map((fn) => fn({})));
  }
  getContext() {
    return (this.ctx ??= new Proxy({ ...STUB }, { get: (t, k) => (k in t ? t[k] : noop) }));
  }
}
const jar = new Map();
globalThis.document = {
  head: new Elem('head'),
  body: new Elem('body'),
  createElement: (tag) => new Elem(tag),
  getElementById: () => null,
  get cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  },
  set cookie(s) {
    const pair = s.split(';')[0], i = pair.indexOf('=');
    if (/Max-Age=0\b/.test(s)) jar.delete(pair.slice(0, i));
    else jar.set(pair.slice(0, i), pair.slice(i + 1));
  },
};
const find = (n, ok) => {
  if (typeof n === 'string') return null;
  if (ok(n)) return n;
  for (const k of n.kids) {
    const f = find(k, ok);
    if (f) return f;
  }
  return null;
};
const button = (n, label) => find(n, (x) => x.tagName === 'BUTTON' && x.textContent === label);

// The published game at the debug address: no game server, and not this machine.
const { DEBUG_FLAG } = await mod('public/js/engine/debugflag.js');
globalThis.location = { search: '?' + DEBUG_FLAG, hostname: 'gamevibe.si', protocol: 'https:' };
await mod('tools/headless.mjs');
const P = await mod('public/js/shared/profile.js');
const own = P.encodeState(P.packProfile({ ...P.defaultProfile(), gold: 40 }));
jar.set('fs_lprofile', own);
const { store, DEBUG } = await mod('public/js/engine/storage.js');
const { createDevPanel } = await mod('public/js/dev/panel.js');
const { Game } = await mod('public/js/game/game.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const W = await mod('public/js/data/waves.js');
const { RANKS } = P;

// A hero who can't die, standing still, unarmed unless a test arms him.
function game(o = {}, seed = 3) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  input.bot = { x: 0, y: 0 };
  const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
  g.player.devGod = true;
  return { g, p: g.player, done: () => ((Math.random = oldRandom), (input.bot = oldBot)) };
}
const run = (g, seconds) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
};
const bossesUp = (g) => g.enemies.filter((e) => e.boss && !e.dead).map((e) => e.type);

test('the panel opens at the debug address on a published host, its DEV button showing', async () => {
  assert.equal(DEBUG, true);
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('the debug game asks no server');
  try {
    await store.init();
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal((await store.devStatus()).enabled, false, 'the plain rule, unchanged, says no on a published host');
  const panel = createDevPanel({ store, screen: null });
  const box = find(document.body, (n) => n.id === 'fs-dev');
  assert.ok(find(document.body, (n) => n.id === 'fs-dev-btn'), 'the DEV button, for a phone');
  await panel.toggle(true);
  assert.ok(box.classList.contains('open'));
  assert.doesNotMatch(box.textContent, /Developer mode is off|Log in/);
  assert.match(box.textContent, /debug save/);
  // An edit goes through the same rules, into the debug game's own cookie alone.
  await button(box, 'Max Armory').click();
  assert.equal(store.profile.up.might, P.UPGRADES.find((u) => u.id === 'might').max);
  assert.ok(jar.has('fs_dprofile'));
  assert.equal(jar.get('fs_lprofile'), own, 'the player\'s own save is untouched');
  await panel.toggle(false);
});

test('setTime: the horde comes from the new minute\'s pocket, and bosses keep their own times, forward and back', () => {
  const { g, p, done } = game();
  try {
    p.weapons.length = 0;
    const unbroken = (to) => {
      const clock = g.clock;
      g.setTime(to);
      assert.ok(Math.abs(g.clock - clock) < 1e-9, 'the game\'s own clock runs on unbroken');
    };
    unbroken(7.5 * 60);
    assert.equal(g.time, 450);
    assert.ok(Math.abs(W.minuteOf(g.phase) - 7.5) < 1e-9);
    const pocket = Object.keys(W.pocketAt(7.5).spawn);
    for (let i = 0; i < 60; i++) assert.ok(pocket.includes(g.spawner.pickType(g.phase)), 'a monster of minute 7');
    assert.equal(g.spawner.bossIdx, 1, 'the Bone King (4:30) is past, the Butcher (9:00) to come');
    assert.equal(W.EVENTS[g.spawner.eventIdx].at > g.phase && W.EVENTS[g.spawner.eventIdx - 1].at <= g.phase, true, 'swarms past are done');
    run(g, 1);
    assert.deepEqual(bossesUp(g), [], 'no boss on the jump');
    const types = new Set(g.enemies.filter((e) => !e.prop).map((e) => e.type));
    assert.ok(types.size && [...types].every((t) => pocket.includes(t) || t === 'slimelet'), [...types].join());
    // The next boss at his own time.
    g.setTime(9 * 60 - 0.5);
    run(g, 1.5);
    assert.deepEqual(bossesUp(g), ['butcher']);
    assert.equal(g.spawner.bossIdx, 2);
    // Back to minute 1: the bosses to come are armed again, and the night's first swarm.
    unbroken(60);
    assert.equal(g.spawner.bossIdx, 0);
    assert.equal(g.spawner.eventIdx, 0);
    // A jump to a boss's very second counts it as past; never below zero.
    g.setTime(4.5 * 60);
    assert.equal(g.spawner.bossIdx, 1);
    g.setTime(-30);
    assert.equal(g.time, 0);
  } finally {
    done();
  }
});

test('setTime in Ranked and on a Dungeon floor', () => {
  let { g, p, done } = game({ mode: 'ranked', rankedBest: 400 });
  try {
    p.weapons.length = 0;
    g.setTime(10 * 60);
    assert.equal(g.spawner.bossIdx, 2, 'two lords past: the third comes at 13:30');
    assert.equal(g.rankIdx, RANKS.findLastIndex(([min]) => min <= 10));
    assert.equal(g.bestBeaten, true);
    g.setTime(100);
    assert.equal(g.spawner.bossIdx, 0);
    assert.equal(g.rankIdx, 0);
    assert.equal(g.bestBeaten, false);
  } finally {
    done();
  }
  ({ g, p, done } = game({ mode: 'dungeon' }));
  try {
    p.weapons.length = 0;
    const f = W.FLOORS[0];
    g.setTime(120);
    assert.equal(g.floorTime, 120);
    assert.ok(Math.abs(g.phase - (f.phase0 + 2 * f.rate)) < 1e-9, 'the floor\'s clock moves as far');
    g.setTime(0);
    assert.equal(g.floorTime, 0);
    assert.equal(W.EVENTS[g.spawner.eventIdx].at >= f.phase0 + 1.5, true, 'a floor\'s first minutes stay calm');
  } finally {
    done();
  }
});

test('removeWeapon frees the channel, puts out what the weapon has about, and never takes the last', () => {
  const { g, p, done } = game();
  try {
    const sword = p.weapons[0];
    const blades = g.addWeapon('blades'), aura = g.addWeapon('aura'), flask = g.addWeapon('flask');
    g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true, hpMul: 1e6 });
    run(g, 1.5);
    const of = (w) => g.effects.filter((fx) => fx.w === w);
    assert.ok(of(blades).length && of(aura).length && of(flask).length, 'blades, an aura and a pool about');
    for (const w of [blades, aura, flask]) assert.ok(g.removeWeapon(w.id), w.id);
    assert.deepEqual(p.weapons, [sword]);
    for (const w of [blades, aura, flask]) assert.ok(g.freeSrc.includes(w.src), `${w.id}'s channel is free again`);
    assert.ok(of(blades).every((fx) => fx.dead) && of(aura).every((fx) => fx.dead), 'the orbit and the aura go out');
    run(g, 0.6);
    assert.equal(of(blades).length + of(aura).length + of(flask).length, 0, 'the pools fade out at once');
    assert.equal(g.projectiles.filter((s) => s.w === flask).length, 0);
    // His own, too; but the last stays.
    g.addWeapon('axe');
    assert.ok(g.removeWeapon('sword'));
    assert.equal(g.mainWeapon(), null);
    assert.equal(g.removeWeapon('axe'), false);
    assert.equal(p.weapons.length, 1);
    assert.equal(g.removeWeapon('bow'), false, 'one he doesn\'t hold');
    run(g, 0.5); // and the run goes on without his own
  } finally {
    done();
  }
});

test('removeWeapon lays the raised dead to rest', () => {
  const { g, p, done } = game({ hero: 'necromancer' });
  try {
    const raise = p.weapons.find((w) => w.id === 'raise');
    run(g, 2);
    assert.ok(g.minions.some((m) => m.w === raise));
    assert.ok(g.removeWeapon('raise'));
    run(g, 0.7);
    assert.equal(g.minions.filter((m) => m.w === raise).length, 0);
  } finally {
    done();
  }
});

test('the panel\'s run tab: the clock, and each weapon and relic raised, lowered or taken away', async () => {
  const { g, p, done } = game();
  try {
    const app = { store, screen: { game: g } };
    const panel = createDevPanel(app);
    const box = document.body.kids.filter((n) => n.id === 'fs-dev').pop();
    await panel.toggle(true);
    assert.match(box.textContent, /Weapons 1\/6/);
    const msg = () => find(box, (n) => n.className.startsWith('msg')).textContent;
    const row = (k, id) => find(box, (n) => n.attrs[`data-${k}`] === id);

    // The clock, and what the new minute brings.
    await button(box, '+5 min').click();
    assert.equal(g.time, 300);
    assert.equal(find(box, (n) => n.tagName === 'INPUT' && n.attrs.size === '6').value, '05:00');
    assert.match(box.textContent, /Minute 5 of the night \(pocket 5-6\): Skeleton, Goblin.*Next boss: Grimgut, The Butcher at 09:00/);
    await button(box, '−1 min').click();
    assert.equal(g.time, 240);
    assert.match(box.textContent, /Next boss: King Ossarian, The Bone King at 04:30/);
    const tIn = find(box, (n) => n.tagName === 'INPUT' && n.attrs.size === '6');
    tIn.value = '12:30';
    await button(box, 'Set').click();
    assert.equal(g.time, 750);
    tIn.value = 'soon';
    await button(box, 'Set').click();
    assert.equal(g.time, 750);
    assert.match(msg(), /m:ss/);

    // Weapons: up, down, evolved, taken away; the list follows each.
    g.addWeapon('caltrops');
    await button(row('weapon', 'sword'), '+1').click();
    assert.equal(p.weapons[0].level, 2);
    assert.match(row('weapon', 'sword').textContent, /L2/);
    await button(row('weapon', 'sword'), '−1').click();
    assert.equal(p.weapons[0].level, 1);
    await button(row('weapon', 'caltrops'), 'evolve').click();
    assert.ok(row('weapon', 'razorfield') && !row('weapon', 'caltrops'), 'evolved');
    assert.ok(button(row('weapon', 'razorfield'), '−1').disabled);
    await button(row('weapon', 'sword'), '−1').click();
    assert.deepEqual(p.weapons.map((w) => w.id), ['razorfield'], 'level 1 less is none');
    await button(row('weapon', 'razorfield'), 'remove').click();
    assert.deepEqual(p.weapons.map((w) => w.id), ['razorfield'], 'the last stays');
    assert.match(msg(), /last weapon/);

    // Relics: his stats follow each rank.
    const might = p.might;
    g.addPassive('might', 3);
    await button(box, '−1 min').click(); // any button brings the list up to date
    await button(row('relic', 'might'), '+1').click();
    assert.equal(p.passives.get('might'), 4);
    await button(row('relic', 'might'), '−1').click();
    assert.equal(p.passives.get('might'), 3);
    assert.ok(p.might > might);
    await button(row('relic', 'might'), 'remove').click();
    assert.equal(p.passives.has('might'), false);
    assert.equal(p.might, might, 'recomputed');
    assert.equal(row('relic', 'might'), null);
    g.addPassive('vitality', 1);
    const hp = p.maxHp;
    await button(box, '+1 min').click();
    await button(row('relic', 'vitality'), '−1').click();
    assert.equal(p.passives.has('vitality'), false, 'rank 1 less is none');
    assert.ok(p.maxHp < hp);
    await panel.toggle(false);
  } finally {
    done();
  }
});
