// The audio ladder: a stinger of its own for each beat, every one limited, and the music ducked
// under the biggest beats. The boss's stir, a lord's waking, the heartbeat, the three event
// warnings and the last stand's (27 October 2026) and the ultimate's launch are sounds of their own too,
// and so is a combo's new tier (28 October 2026), synthesised, never ducking the music.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { soundNames, limited, DUCK, DUCKED } from '../public/js/engine/audio.js';

const STINGERS = ['levelup', 'chest', 'evolve', 'epic', 'legendary', 'bossslain', 'lordslain', 'record', 'milestone', 'revive', 'unlock'];
const BEATS = ['rumble', 'lordsting', 'heartbeat', 'warnswarm', 'warnring', 'warnpack', 'warnstand'];

test('each beat has a stinger of its own, and each is limited', () => {
  const names = soundNames();
  for (const s of [...STINGERS, ...BEATS]) {
    assert.ok(names.includes(s), `${s} is a sound`);
    assert.ok(limited(s), `${s} has its LIMITS`);
  }
  assert.ok(names.includes('ult'), 'the ultimate has its launch');
  // The seal's crack and the banish, apart from the blows and the frost weapon's recording.
  for (const s of ['thaw', 'banish']) assert.ok(names.includes(s) && limited(s), s);
  // A rare box find's chime, the rarest's sting, a chest landing and a chest's coins landing on
  // the gold counter (28 October 2026).
  for (const s of ['find', 'treasure', 'chestland', 'coinland']) assert.ok(names.includes(s) && limited(s), s);
  assert.ok(names.includes('combo') && limited('combo'), "a combo's new tier has its sting");
  // A step of the results' gold formula stamped in (the review's C11, 28 October 2026).
  assert.ok(names.includes('stamp') && limited('stamp'), "the results' gold has its stamp");
});

test('the music ducks about 8 dB for about 1.2 s under every T4 and T5 stinger', () => {
  assert.equal(DUCK.db, -8);
  assert.ok(DUCK.secs >= 1 && DUCK.secs <= 1.5);
  for (const s of ['evolve', 'epic', 'legendary', 'bossslain', 'revive', 'record', 'unlock']) assert.ok(DUCKED.has(s), s);
  for (const s of ['levelup', 'chest', 'coin', 'milestone', 'find', 'treasure', 'chestland', 'coinland', 'combo', 'stamp', ...BEATS]) assert.ok(!DUCKED.has(s), `${s} is no jackpot`);
});
