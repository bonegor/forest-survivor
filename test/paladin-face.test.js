import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import paladin from '../public/assets/heroes-approved/paladin.js';
import trail from '../public/assets/heroes-approved/trailblazer.js';
import original from '../tools/hero-polish-review/before/paladin.js';
import { unpack } from '../tools/animation-round/build.mjs';
import { paladinCrest } from '../tools/animation-round/heavy-hero-clarity.mjs';

test('the Paladin wears Trail’s native face with brown eyes behind her moving sword', () => {
  const sylva = unpack(trail, trail.frames[0]);
  const { paladin: { attackMasks } } = JSON.parse(readFileSync(
    new URL('../tools/animation-round/baseline/equipment-masks.json', import.meta.url), 'utf8'));
  const swords = new Map();
  for (const [step, frame] of paladin.attack.entries()) {
    const mask = new Set(attackMasks[step]);
    for (const i of [frame, ...paladin.attackWalk[step]]) swords.set(i, { step, mask });
  }
  const eyes = new Map([[38, 0x366099], [41, 0x1f3962]]);
  for (const [i, packed] of paladin.frames.entries()) {
    const frame = unpack(paladin, packed);
    const before = unpack(original, original.frames[i]);
    const { x, y } = paladinCrest(before);
    const strike = swords.get(i);
    const sword = strike?.mask;
    // The projected ear, brows, nose and tapered chin follow the donor exactly.
    for (const [sx, sy] of [[39,31],[40,32],[34,33],[38,33],[41,33],[38,34],[41,34],[40,35],[39,36]]) {
      const j = (y + sy - 28) * frame.w + x + sx - 37;
      if (sword?.has(j)) continue;
      const donor = sylva.d[sy * sylva.w + sx];
      const expected = sy === 34 ? ((donor & 0xff000000) | eyes.get(sx)) >>> 0 : donor;
      assert.equal(frame.d[j], expected, `pose ${i}, donor (${sx},${sy})`);
    }
    // The equipment mask also owns the old arm. The seven pixels nearest
    // its shoulder pivot contain the new elbow and fist. Beyond them the
    // original crossguard and blade must survive even as they cross the eyes.
    const pivotX = strike?.step >= 8 && strike.step <= 13 ? 34 : 33;
    for (let j = 0; j < frame.d.length; j++) {
      if (frame.d[j] === before.d[j]) continue;
      const px = j % frame.w, py = Math.floor(j / frame.w), dx = px - x, dy = py - y;
      const face = dx >= -3 && dx <= 5 && dy >= 3 && dy <= 8;
      const swordArm = px >= 26 && px <= 39 && dy >= 4 && dy <= 17;
      const shieldHand = px >= 39 && px <= 45 && dy >= 12 && dy <= 14;
      assert.ok(face || swordArm || shieldHand, 'outside head and arms in pose ' + i);
      if (sword?.has(j)) assert.ok(Math.hypot(px - pivotX, py - 36) < 7, 'sword covered in pose ' + i);
    }
  }
});

test('the resting pauldron sits below the jaw through every breath and footfall', () => {
  for (const i of [...paladin.idle, ...paladin.walk]) {
    const frame = unpack(paladin, paladin.frames[i]);
    const before = unpack(original, original.frames[i]);
    const { y } = paladinCrest(before), at = (x, offset) => (y + offset) * frame.w + x;
    assert.ok(before.d[at(31, 8)] >>> 24 > 128, 'the old pointed rim occupied cheek height');
    assert.equal(frame.d[at(31, 8)] >>> 24, 0, 'space beside the jaw in pose ' + i);
    assert.ok((frame.d[at(34, 10)] & 255) > 220, 'lit steel below the jaw in pose ' + i);
    assert.ok((frame.d[at(30, 14)] & 255) > 180, 'a distinct gauntlet at the waist in pose ' + i);
  }
  const rest = unpack(paladin, paladin.frames[0]);
  for (const i of [paladin.attack[0], paladin.attack.at(-1)]) {
    const guard = unpack(paladin, paladin.frames[i]);
    assert.deepEqual(guard.d, rest.d, 'the grip returns to its unbroken resting pose');
  }
});
