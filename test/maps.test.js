// The Survival maps (data/maps.js), the owner's (28 October 2026): "we basically need a few more
// maps ... the desert map ... a frozen, you know, snowy map ... sort of like a bright flower,
// colorful map ... a dark, hellish, essentially dark, hellish, demonic map", opening one after
// another, "and they should be like that in terms of difficulty too, make a few new sprites for the
// monsters, sure and you can also sometimes reuse sprites in different maps, but do not alter their
// health by too much". Each map's night is the Darkwood's on its own ground, from its own roster:
// every kind it sends known, drawn and paced, its events told in their own words and clear of its
// bosses, each boss once and fighting with a night boss's kit; the Darkwood's is the night as it
// always was, by reference; every new kind is the Darkwood kind it stands for in all but its looks;
// each map at least as hard as the one before it; and a night on a map sends that map's monsters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { MAPS, MAP_LADDER, FIRST_MAP, mapFor } from '../public/js/data/maps.js';
import { POCKETS, EVENTS, LAST_STAND, SURVIVAL_BOSSES, SWARM_BATCH, kindsBy, batchEvents, monsterHp } from '../public/js/data/waves.js';
import { ENEMIES, STANDS_FOR } from '../public/js/data/enemies.js';
import { PROGRESS } from '../public/js/shared/progress.js';
import { PACE_OF } from '../public/js/game/enemies.js';
import { BOSS_AI } from '../public/js/game/bosses.js';
import { JOLT, runMore } from '../public/js/game/spawner.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { SHOT_NOUN } from '../public/js/game/names.js';
import { eventWords } from '../public/js/game/events.js';
import { wicked } from '../public/js/game/effects.js';
import { PC } from '../public/js/game/particles.js';
import { BIOMES } from '../public/js/game/biomes.js';
import { MAP_BOSS_ART } from '../public/js/art/bosses-maps.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// What the code tells apart, read from it: the deaths Game.deathFx gives a burst, a decal and a sound
// of their own (any other only a bare 'die'), and the blasts a boss can strike with (effects.js
// EXPLO's styles; any other is drawn as fire).
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const between = (text, from, to) => {
  const i = text.indexOf(from);
  return text.slice(i, text.indexOf(to, i));
};
const DEATHS = new Set([...between(source('../public/js/game/game.js'), '  deathFx(', '  breakProp(').matchAll(/case '(\w+)':/g)].map((m) => m[1]));
const BLASTS = new Set([...between(source('../public/js/game/effects.js'), 'const EXPLO = {', '\n};').matchAll(/^ {2}(\w+): \{/gm)].map((m) => m[1]));

// The night bosses' kits as they are written in game/bosses.js: what each throws, calls up and says
// where a boss fighting with it has none of his own (def.bolt, def.summon, def.lines).
const KIT_BOLT = { boneking: 'bone', butcher: null, lich: 'skullbolt', demonlord: 'firebolt' };
const KIT_SUMMON = { boneking: 'skeleton', butcher: null, lich: 'ghost', demonlord: 'imp' };
const KIT_LINES = { boneking: ['summon'], butcher: ['enrage', 'dash'], lich: ['summon'], demonlord: ['rage', 'meteor'] };

// What a boss calls up on a map: his own summons, else his kit's, as the map's own kind where it
// has one in its place (data/maps.js summons, Game.summonRing).
function calledUp(map, id) {
  const def = ENEMIES[id], kind = def.summon ?? KIT_SUMMON[def.kit ?? id];
  return kind && (map.summons?.[kind] ?? kind);
}

// Every kind a map's night can send: its pockets', its events', its fallback, what its bosses call
// up, and what its slimes split into.
function ownKinds(map) {
  const out = new Set([...kindsBy(Infinity, map.pockets), ...map.events.map((e) => e.enemy), map.fallback]);
  for (const b of map.bosses) if (calledUp(map, b.id)) out.add(calledUp(map, b.id));
  for (const k of [...out]) if (ENEMIES[k]?.split) out.add(ENEMIES[k].split);
  return out;
}

// A shot kind's look (game/projectiles.js SHOT_LOOK: an EnemyShot of a kind without one throws),
// its sprite and its name in the results (names.js SHOT_NOUN).
function shotOk(kind, what) {
  let s = null;
  assert.doesNotThrow(() => (s = new EnemyShot(null, 0, 0, 0, 1, 1, kind)), `${what}: ${kind} has a look`);
  assert.ok(SPR[s.look.sprite], `${what}: ${kind} is drawn (${s.look.sprite})`);
  assert.ok(SHOT_NOUN[kind], `${what}: ${kind} has a name`);
  return s.look;
}

test('the code tells the deaths and blasts apart (what the rules below read)', () => {
  for (const d of ['blood', 'bones', 'goo', 'ecto', 'ash', 'dark', 'gold']) assert.ok(DEATHS.has(d), d);
  for (const b of ['fire', 'frost', 'holy', 'dark', 'blood']) assert.ok(BLASTS.has(b), b);
});

test('the Darkwood is the night as it always was, by reference, and a run without a map is spent there', () => {
  const f = MAPS.forest;
  assert.equal(f.pockets, POCKETS);
  assert.equal(f.events, EVENTS);
  assert.equal(f.lastStand, LAST_STAND);
  assert.equal(f.bosses, SURVIVAL_BOSSES.s15);
  assert.deepEqual(f.foe, { hp: 1, dmg: 1, horde: 1, xp: 1 });
  assert.equal(f.music, 'forest');
  assert.equal(f.look, 'forest');
  assert.equal(f.seed, 1);
  assert.equal(f.fallback, 'skeleton');
  assert.equal(f.side, 'dark');
  assert.ok(!f.summons, 'its bosses call up their own');
  // The tests, the bots and the tools build a Game without a map; Ranked and the Dungeon Run keep to
  // the Darkwood whatever they are given.
  assert.equal(mapFor('s15'), f);
  assert.equal(mapFor('s15', 'nowhere'), f);
  for (const name of ['constructor', '__proto__', 'toString']) assert.equal(mapFor('s15', name), f, name);
  assert.equal(mapFor('ranked', 'hell'), f);
  assert.equal(mapFor('dungeon', 'desert'), f);
  assert.equal(mapFor('s15', 'hell'), MAPS.hell);
  game((g) => assert.equal(g.map, f));
  game((g) => assert.equal(g.map, f), { mode: 'ranked', map: 'hell' });
});

test('each map at least as hard as the one before it, its monsters\' health within a fifth of the Darkwood\'s', () => {
  assert.deepEqual(MAP_LADDER.map((m) => m.id), PROGRESS.mapLadder);
  assert.equal(FIRST_MAP, 'desert');
  assert.deepEqual(new Set(PROGRESS.mapLadder), new Set(Object.keys(MAPS)), 'every map is on the ladder');
  for (const m of MAP_LADDER) {
    for (const k of ['hp', 'dmg', 'horde', 'xp']) assert.ok(m.foe[k] > 0, `${m.id}: foe ${k}`);
    assert.ok(m.foe.hp >= 0.8 && m.foe.hp <= 1.2, `${m.id}: health x${m.foe.hp} (the owner's "do not alter their health by too much")`);
  }
  for (let i = 1; i < MAP_LADDER.length; i++) {
    const a = MAP_LADDER[i - 1], b = MAP_LADDER[i];
    for (const k of ['hp', 'dmg', 'horde']) assert.ok(b.foe[k] >= a.foe[k], `${b.id}'s ${k} at least ${a.id}'s`);
    assert.ok(b.foe.xp <= a.foe.xp, `${b.id}'s experience no more than ${a.id}'s`);
  }
});

test('every new kind is the Darkwood kind it stands for in all but its looks: its health above all', () => {
  // A kind's own: what it is called and looks like, how it dies, and a boss's own attacks.
  const OWN = new Set(['name', 'title', 'sprite', 'death', 'color', 'split', 'shot', 'scale', 'kit', 'bolt', 'summon', 'blast', 'lines', 'sparks']);
  for (const [id, kind] of Object.entries(STANDS_FOR)) {
    const def = ENEMIES[id], base = ENEMIES[kind];
    assert.ok(def && base, `${id} stands for ${kind}`);
    assert.equal(def.hp, base.hp, `${id}: the ${kind}'s health`);
    for (const k of new Set([...Object.keys(base), ...Object.keys(def)])) if (!OWN.has(k)) assert.deepEqual(def[k], base[k], `${id}: its ${k} is the ${kind}'s`);
    assert.deepEqual(Object.keys(def).slice(0, Object.keys(base).length), Object.keys(base), `${id}: its template's keys first, in their order`);
    assert.equal(def.sprite, id);
    assert.ok(SPR[id], `${id} is drawn`);
    assert.notEqual(def.name, base.name, `${id}: a name of its own`);
    assert.ok(DEATHS.has(def.death), `${id}: dies its own way (${def.death})`);
    assert.equal(wicked({ def }), wicked({ def: base }), `${id}: as wicked as the ${kind} (the Witch Hunter's bane)`);
    // Its shot, the kind's but of its own look; its split, into its own slimelets.
    if (base.shot) assert.deepEqual({ ...def.shot, kind: base.shot.kind }, base.shot, `${id}: the ${kind}'s shot`);
    else assert.equal(def.shot, undefined);
    // Its look is all its shot has of its own: it breaks on a wall where the kind's does (the Thorn
    // Witch's thorn on a crypt's wall, as the Cultist's bolt; only the Thorn Queen's flies through,
    // a kind of its own, as the Lich's skulls do).
    if (def.shot) assert.equal(!!shotOk(def.shot.kind, id).through, !!shotOk(base.shot.kind, kind).through, `${id}: its ${def.shot.kind} breaks on a wall where the ${kind}'s ${base.shot.kind} does`);
    if (base.split) assert.equal(STANDS_FOR[def.split], base.split, `${id} splits into its own ${base.split}`);
    else assert.equal(def.split, undefined);
    if (def.boss) {
      // A boss fights with the attacks of the night boss he stands for, drawn 57 px tall as the
      // Butcher and the Lich are.
      assert.equal(def.kit, kind, `${id} fights as the ${kind}`);
      assert.ok(Math.abs(def.scale * MAP_BOSS_ART[id].frames[0].length - 57) < 1e-9, `${id}: 57 px tall`);
    } else {
      assert.equal(def.scale, base.scale, `${id}: the ${kind}'s size`);
      assert.equal(PACE_OF[id], PACE_OF[kind], `${id} walks as the ${kind}`);
    }
  }
});

test('every kind a map sends is known, drawn and paced, and its events are told in their own words', () => {
  const GENERIC = ['You are being surrounded!', 'A swarm is coming!', 'A pack on the hunt!'];
  for (const [id, map] of Object.entries(MAPS)) {
    for (const k of ownKinds(map)) {
      const d = ENEMIES[k];
      assert.ok(d && !d.boss && !d.prop, `${id}: ${k} is one of the horde`);
      assert.ok(SPR[d.sprite], `${id}: ${k} is drawn (${d.sprite})`);
      assert.ok(PACE_OF[k], `${id}: ${k} walks in a class (game/enemies.js PACE_OF)`);
      assert.ok(DEATHS.has(d.death), `${id}: ${k} dies its own way (${d.death})`);
      if (d.shot) shotOk(d.shot.kind, `${id}: ${k}`);
    }
    for (const ev of map.events) {
      const d = ENEMIES[ev.enemy];
      const [title, sub] = eventWords(ev, '', map.side);
      assert.ok(!GENERIC.includes(title), `${id}: the ${ev.type} of ${ev.enemy} in its own words (events.js WORDS)`);
      assert.ok(!(title + sub).includes('{side}'), `${id}: ${title} ${sub}`);
      // Swarms of flyers or the swift, packs of chargers or of those that come together, rings of
      // any that walk at him but the shooters and the small fry.
      if (ev.type === 'swarm') assert.ok(d.fly || JOLT.pace.includes(PACE_OF[ev.enemy]), `${id}: a swarm of ${ev.enemy}`);
      if (ev.type === 'pack') assert.ok(d.charge || d.group > 1, `${id}: a pack of ${ev.enemy}`);
      if (ev.type === 'ring') assert.ok(!d.shot && !d.fry, `${id}: a ring of ${ev.enemy}`);
    }
  }
});

test('each map\'s night has the Darkwood\'s shape: its minutes and events, its last stand, a jolt and a champion in every pocket, few casters', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    assert.deepEqual(map.pockets.map((p) => p.minutes), POCKETS.map((p) => p.minutes), `${id}: the Darkwood's minutes`);
    const shape = (list) => list.map(({ at, type, count }) => [at, type, count]);
    assert.deepEqual(shape(map.events), shape(EVENTS), `${id}: the Darkwood's events, at its times and counts`);
    assert.equal(map.lastStand, LAST_STAND);
    for (const p of map.pockets) {
      const kinds = Object.keys(p.spawn), all = Object.values(p.spawn).reduce((s, w) => s + w, 0), at = `${id} ${p.minutes.join('-')}`;
      for (const k of kinds) assert.ok(ENEMIES[k] && p.spawn[k] > 0, `${at}: ${k}`);
      // A jolt is of the swift and quick that don't shoot (Spawner.jolt); a champion never of the
      // small fry (Spawner.spawnElite), the first at 1:35.
      assert.ok(kinds.some((k) => !ENEMIES[k].shot && JOLT.pace.includes(PACE_OF[k])), `${at}: a kind a jolt can be`);
      if (p.minutes[0] >= 1) assert.ok(kinds.some((k) => !ENEMIES[k].fry), `${at}: a kind a champion can be`);
      // The Cultist's place, whoever takes it, one monster in twenty at most (cultist.test.js).
      if (p.minutes[0] < 15) {
        const casters = kinds.filter((k) => ENEMIES[k].shot).reduce((s, k) => s + p.spawn[k], 0);
        assert.ok(casters / all <= 1 / 20, `${at}: casters ${((casters / all) * 100).toFixed(1)}%`);
      }
    }
    const fb = ENEMIES[map.fallback];
    assert.ok(fb && !fb.fry && !fb.boss && PACE_OF[map.fallback], `${id}: its fallback (${map.fallback}) can be a champion`);
    assert.ok(kindsBy(Infinity, map.pockets).includes(map.fallback), `${id}: its fallback is one of its own`);
    for (const [from, to] of Object.entries(map.summons ?? {})) {
      assert.equal(STANDS_FOR[to], from, `${id}: ${to} in the place of the ${from}`);
      assert.ok(kindsBy(Infinity, map.pockets).includes(to), `${id}: ${to} is one of its own`);
    }
  }
});

test('each map brings three bosses at the Darkwood\'s times, none twice, each with a night boss\'s kit, and no event within 30 s of them', () => {
  const gap = (SWARM_BATCH.gap * 1.4) / 60; // a batch's swarms apart, in phase, on the 15-minute night
  for (const [id, map] of Object.entries(MAPS)) {
    assert.deepEqual(map.bosses.map((b) => b.at), SURVIVAL_BOSSES.s15.map((b) => b.at), `${id}: at 4:30, 9:00 and 13:00`);
    assert.equal(new Set(map.bosses.map((b) => b.id)).size, map.bosses.length, `${id}: no boss twice (the HUD's skulls go gold by his id)`);
    for (const b of map.bosses) {
      const def = ENEMIES[b.id], kit = def?.kit ?? b.id, at = `${id}: ${b.id}`;
      assert.ok(def?.boss, `${at} is a boss`);
      assert.equal(typeof BOSS_AI[kit], 'function', `${at} fights with the ${kit}'s attacks`);
      assert.ok(SPR[def.sprite], `${at} is drawn`);
      assert.ok(def.title && def.color, `${at}: his title and colour`);
      assert.ok(DEATHS.has(def.death), `${at} dies his own way (${def.death})`);
      for (const k of Object.keys(def.lines ?? {})) assert.ok(KIT_LINES[kit].includes(k), `${at} says his ${k} where the ${kit} speaks`);
      if (def.blast) assert.ok(BLASTS.has(def.blast), `${at}: his blast (${def.blast})`);
      for (const c of def.sparks ?? '') assert.ok(PC[c] !== undefined, `${at}: his sparks' ${c} is a palette key`);
      const bolt = def.bolt ?? KIT_BOLT[kit];
      if (bolt) {
        const look = shotOk(bolt, at);
        // Thrown as the Lich throws his skulls, floating over the walls: through them.
        if (kit === 'lich') assert.ok(look.through, `${at}: his ${bolt} flies through walls`);
      }
      const called = calledUp(map, b.id);
      if (called) assert.ok(kindsBy(Infinity, map.pockets).includes(called), `${at} calls up ${called}, one of its own`);
    }
    // Every event, every swarm of a batch as big as one comes (data/waves.js batchEvents), the last
    // stand too: 30 s or more from each boss's arrival (events.test.js, for the Darkwood).
    for (const e of batchEvents(() => SWARM_BATCH.max, gap, [...map.events, map.lastStand]).filter((x) => x.at <= 21)) {
      for (const b of map.bosses) {
        const secs = (e.at / 1.4) * 60;
        assert.ok(Math.abs(secs - b.at) >= 30 - 1e-9, `${id}: ${e.type} of ${e.enemy} at ${secs.toFixed(0)} s, ${b.id} at ${b.at} s`);
      }
    }
  }
});

test('each map\'s foe factors come last, on the Darkwood\'s numbers: its horde, its health, its blows', () => {
  // The same blow on each map (Player.hurt), big enough that his armor takes a share of it, not a
  // point; he stands it whatever it comes to.
  const blow = (map) => game((g, p) => {
    p.devGod = false;
    p.hp = 1e6;
    return p.hurt(10, null, 'a test');
  }, { map });
  const darkwood = blow('forest');
  assert.ok(darkwood > 0);
  for (const [id, map] of Object.entries(MAPS)) {
    game((g) => {
      assert.equal(runMore(g), map.foe.horde, `${id}: the horde x${map.foe.horde}`);
      assert.equal(g.spawner.stats(10).hpMul, monsterHp(10, 's15') * g.diff.hp * map.foe.hp, `${id}: health x${map.foe.hp}`);
    }, { map: id });
    const taken = blow(id);
    assert.ok(Math.abs(taken - darkwood * map.foe.dmg) <= 1.5, `${id}: a blow of ${taken} against the Darkwood's ${darkwood} x${map.foe.dmg}`);
  }
  // The Darkwood's exactly as before the maps: no factor at all.
  game((g) => {
    assert.equal(runMore(g), 1);
    assert.equal(g.spawner.stats(10).hpMul, monsterHp(10, 's15') * g.diff.hp);
  });
});

// What a spawn asks for, without spawning it (difficulty.test.js asks); the game's own again after.
function asks(g, fn) {
  const got = [];
  g.spawnEnemy = (type, x, y, o = {}) => (got.push({ type, ...o }), null);
  try {
    fn();
  } finally {
    delete g.spawnEnemy;
  }
  return got;
}

// How the monsters come on a map, each as it is asked for (difficulty.test.js healths holds the
// Darkwood's to the difficulty): the health of the steady horde, an event's pack, a champion
// (Stoneskin aside), the thief, a boss's summons, a slime's slimelets, a boss (the map's first) and
// a crypt's lord; the experience the steady horde and the pack pay; and the blow a Holy Relic deals
// the strong (Game.holyNova), on a crypt's lord.
function comes(id) {
  return game((g, p) => {
    const s = g.spawner;
    const steady = asks(g, () => {
      s.acc = 0;
      s.owed = 3;
      s.update(1 / 60);
    }).find((o) => o.steady);
    const pack = asks(g, () => s.fire({ type: 'pack', enemy: 'goblin', count: 5 }, 10))[0];
    const elite = asks(g, () => s.spawnElite(10))[0];
    const slime = g.spawnEnemy('slime', p.x + 60, p.y, { instant: true });
    const hp = {
      horde: steady.hpMul,
      pack: pack.hpMul,
      champion: elite.hpMul / (elite.mod.id === 'stone' ? 1.4 : 1),
      thief: asks(g, () => s.spawnThief(10))[0].hpMul,
      summons: asks(g, () => g.summonRing('skeleton', 1, 40))[0].hpMul,
      slimelets: asks(g, () => g.killEnemy(slime))[0].hpMul,
      boss: asks(g, () => g.spawnBoss(MAPS[id].bosses[0].id, p.x + 80, p.y, { sleeping: true }))[0].hpMul,
      lord: asks(g, () => s.spawnLord(p.x - 80, p.y))[0].hpMul,
    };
    for (const e of g.enemies) e.dead = true;
    const lord = s.spawnLord(p.x + 40, p.y);
    let holy = 0;
    g.hitEnemy = (e, dmg) => {
      if (e === lord) holy = dmg;
      return 0;
    };
    g.holyNova();
    return { hp, xp: { horde: steady.xpMul, pack: pack.xpMul }, holy };
  }, { map: id });
}

// The foe factors where the Darkwood's numbers are made, each last (x*1 is x): however a monster
// comes on a map, its health is the Darkwood's times its map's (data/maps.js foe hp, the owner's "do
// not alter their health by too much"), and so is the blow a Holy Relic deals the strong, so it takes
// the same share of them on every map; what its horde pays is the Darkwood's experience times its
// map's (foe xp: more where fewer come).
test('each map\'s health is in every monster however it comes and in a Holy Relic\'s blow, its experience in what its horde pays', () => {
  const near = (a, b, what) => assert.ok(Math.abs(a / b - 1) < 1e-12, `${what}: ${a} against ${b}`);
  const darkwood = comes('forest');
  assert.ok(darkwood.holy > 0, 'the relic struck the lord');
  for (const [id, map] of Object.entries(MAPS)) {
    const got = comes(id);
    for (const [k, v] of Object.entries(darkwood.hp)) near(got.hp[k], v * map.foe.hp, `${id}: the health of the ${k} x${map.foe.hp}`);
    for (const [k, v] of Object.entries(darkwood.xp)) near(got.xp[k], v * map.foe.xp, `${id}: the experience of the ${k} x${map.foe.xp}`);
    near(got.holy, darkwood.holy * map.foe.hp, `${id}: a Holy Relic's blow x${map.foe.hp}`);
  }
});

test('a Darkwood boss on another map calls up that map\'s own in the place of his', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    game((g) => {
      const came = [], spawn = g.spawnEnemy.bind(g);
      g.spawnEnemy = (type, ...rest) => {
        came.push(type);
        return spawn(type, ...rest);
      };
      for (const kind of ['skeleton', 'ghost', 'imp']) {
        came.length = 0;
        g.summonRing(kind, 4, 70);
        const want = map.summons?.[kind] ?? kind;
        assert.ok(came.length > 0 && came.every((t) => t === want), `${id}: ${kind} called up as ${want} (${came.join(', ')})`);
      }
    }, { map: id });
  }
});

// Seeded, on each map: dusk (the head start and the first of the steady horde), the first swarm
// (1:47) and the first ring (3:13), each watched from a few seconds before with the field cleared.
test('a night on each map is spent on its ground and sends that map\'s monsters, the Darkwood\'s its own', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    game((g) => {
      assert.equal(g.map, map);
      assert.equal(g.world.look, BIOMES[map.look], `${id}: on its own ground`);
      assert.ok(g.banners.some((b) => b.title === map.name), `${id}: its name over the night`);
      const own = new Set([...ownKinds(map), 'thief']);
      const came = new Set(), spawn = g.spawnEnemy.bind(g);
      g.spawnEnemy = (type, x, y, o) => {
        if (!ENEMIES[type].prop) came.add(type);
        return spawn(type, x, y, o);
      };
      for (const [from, secs] of [[0, 8], [103, 9], [189, 8]]) {
        if (from) g.setTime(from);
        for (const e of g.enemies) if (!e.prop) e.dead = true;
        for (let f = 0; f < secs * 60; f++) g.update(1 / 60);
      }
      for (const t of came) assert.ok(own.has(t), `${id}: a ${t} came, not one of its own`);
      assert.ok(came.size >= 3, `${id}: its night came (${[...came].join(', ')})`);
      if (id !== 'forest') assert.ok([...came].some((t) => STANDS_FOR[t]), `${id}: its own new monsters among them (${[...came].join(', ')})`);
    }, { map: id });
  }
});
