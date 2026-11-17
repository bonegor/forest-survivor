import originalBosses from '../../public/assets/art/bosses.js';
import { PAL } from '../../public/js/art/palette.js';
import { hexPack } from '../../public/js/engine/pixels.js';
import { padding, padFrame, repairSweep } from './boneking-shield.mjs';

// [near ankle x, lift, far ankle x, lift], in the baked sprite's facing-right grid.
// During contact each ankle travels back under the torso. On return the bent knee
// carries the boot forward, clearing the planted sole at the passing pose.
const walk = [
  [45, 0, 29, 1], [40, 0, 32, 4], [35, 0, 40, 6], [30, 0, 46, 3],
  [29, 1, 46, 0], [32, 4, 41, 0], [40, 6, 36, 0], [46, 3, 31, 0],
];
const stance = [
  [43, 0, 34, 0], [43, 0, 34, 0], [43, 0, 33, 0], [44, 0, 33, 0],
  [44, 0, 33, 0], // summon
  [44, 0, 32, 0], [46, 0, 32, 0], [45, 0, 33, 0], // volley
  [43, 0, 34, 0], [44, 0, 33, 0], [44, 0, 33, 0], [44, 0, 33, 0],
  [45, 0, 32, 0], [45, 0, 32, 0], [47, 0, 34, 0], // nova and recoil
];

const NEAR = { ink: '#20182c', bone: PAL.C, boneLight: PAL.z, steel: PAL.N, steelLight: PAL.g, gilt: PAL.D, boot: PAL.n };
const FAR = { ink: '#20182c', bone: PAL.H, boneLight: PAL.C, steel: PAL.K, steelLight: PAL.N, gilt: PAL.H, boot: PAL.K };
const FLASH = { ink: PAL.T, bone: PAL.z, boneLight: PAL.w, steel: PAL.z, steelLight: PAL.w, gilt: PAL.Y, boot: PAL.T };

function torsoOffset(pose, w) {
  let eyeX = Infinity;
  let eyeY = Infinity;
  for (let i = 0; i < pose.length; i++) {
    if (pose[i] !== 10 && pose[i] !== 11) continue;
    eyeX = Math.min(eyeX, i % w);
    eyeY = Math.min(eyeY, Math.floor(i / w));
  }
  return [eyeX - 38, eyeY - 23];
}

function alphaBounds(pixels, palette, w) {
  let minX = w;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (!(palette[pixels[i]] >>> 24)) continue;
    const x = i % w;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, Math.floor(i / w));
  }
  return { minX, maxX, maxY };
}

const lerp = (a, b, t) => a + (b - a) * t;

function paintLeg(row, colors, hipX, hipY, ankleX, soleY, lift, near) {
  const ankleY = soleY - 2;
  const kneeY = Math.floor((hipY + ankleY) / 2);
  const kneeX = Math.round(lerp(hipX, ankleX, .5) + (lift ? 3 : .5));

  // Stepped upper femur with a heavy knee cap over the pinned lower leg.
  for (let y = hipY; y <= kneeY + 1; y++) {
    const x = Math.round(lerp(hipX, kneeX, (y - hipY) / (kneeY + 1 - hipY)));
    const width = near ? 7 : 6;
    row(x - 3, y, width, colors.ink);
    row(x - 2, y, width - 2, colors.bone);
    row(x - 2, y, near ? 2 : 1, colors.boneLight);
  }
  for (let y = kneeY; y <= ankleY; y++) {
    const x = Math.round(lerp(kneeX, ankleX, (y - kneeY) / (ankleY - kneeY)));
    const knee = y <= kneeY + 1;
    const width = knee ? 7 : near ? 6 : 5;
    row(x - 3, y, width, colors.ink);
    row(x - 2, y, width - 2, colors.steel);
    row(x - 2, y, knee ? 2 : 1, colors.steelLight);
  }
  row(kneeX, kneeY + 1, near ? 2 : 1, colors.gilt);

  // Squared forward toe with a hard sole. Raised feet keep the same boot size.
  row(ankleX - 2, soleY - 2, 5, colors.ink);
  row(ankleX - 1, soleY - 2, 3, colors.boot);
  row(ankleX - 2, soleY - 1, near ? 7 : 6, colors.ink);
  row(ankleX - 1, soleY - 1, near ? 5 : 4, colors.boot);
  row(ankleX + 1, soleY - 1, near ? 3 : 2, colors.steelLight);
  row(ankleX - 1, soleY, near ? 7 : 6, colors.ink);
}

export default function boneKingLegs(data) {
  const { w, h } = data;
  const stride = w + 2 * padding;
  const source = originalBosses.boneking.frames.map(frame => Buffer.from(frame, 'base64'));
  const cloak = source[0];
  const carryIndex = data.walk[0];
  const carry = Buffer.from(data.frames[carryIndex], 'base64');
  const [, carryY] = torsoOffset(source[carryIndex], w);
  const palette = [...data.palette];
  const indices = new Map(palette.map((color, index) => [color, index]));
  function ink(hex) {
    const color = hexPack(hex);
    if (!indices.has(color)) {
      indices.set(color, palette.length);
      palette.push(color);
    }
    return indices.get(color);
  }

  const frames = data.frames.map((frame, index) => {
    const pixels = Buffer.from(frame, 'base64');
    const flash = index === 26;
    const [dx, dy] = flash ? [0, -2] : torsoOffset(source[index], w);
    const { minX, maxX, maxY } = alphaBounds(pixels, data.palette, w);
    const ground = Math.min(maxY, 64);
    const isTravel = index >= 7 && index <= 14;
    const [nearX, nearLift, farX, farLift] = isTravel ? walk[index - 7] : stance[Math.max(0, index - 14)];

    // Carry the diagonal sword and its entire gripping forearm together. Clear
    // the old drawing across those rows, including its lower crossguard, while
    // keeping the moving shield side and matching the torso's existing bob.
    const swordSide = 45;
    if (isTravel) {
      for (let y = 18; y <= 64; y++) {
        const from = (y + carryY) * w;
        pixels.set(carry.subarray(from + swordSide, from + w), (y + dy) * w + swordSide);
      }
    }

    // Erase only the original trailing cloak. The original sword or discharge
    // can extend into the same rows and always keeps its own source pixels.
    for (let y = 53; y <= 64; y++) {
      for (let x = 33; x <= 45; x++) {
        const base = cloak[y * w + x];
        const i = (y + dy) * w + x + dx;
        const pose = isTravel && x >= swordSide ? source[carryIndex][(y + carryY) * w + x] : source[index][i];
        if (base && (flash ? pose >= 20 : pose === base)) pixels[i] = 0;
      }
    }

    const legs = new Uint8Array(w * h);
    const row = (x, y, width, hex) => {
      const left = Math.max(minX, x);
      const right = Math.min(maxX + 1, x + width);
      if (left < right && y <= maxY) legs.fill(ink(hex), y * w + left, y * w + right);
    };
    const hipY = 50 + dy;
    paintLeg(row, flash ? FLASH : FAR, 36 + dx, hipY, farX, ground - farLift, farLift, false);
    paintLeg(row, flash ? FLASH : NEAR, 42 + dx, hipY, nearX, ground - nearLift, nearLift, true);

    // A short fauld ties the legs into the shield and gives a clear central gap.
    row(33 + dx, 52 + dy, 12, flash ? PAL.z : '#20182c');
    row(35 + dx, 53 + dy, 9, flash ? PAL.w : PAL.N);
    row(36 + dx, 54 + dy, 7, flash ? PAL.z : PAL.K);
    row(38 + dx, 54 + dy, 3, flash ? PAL.Y : PAL.D);
    for (let i = 0; i < legs.length; i++) if (!pixels[i] && legs[i]) pixels[i] = legs[i];

    const padded = padFrame(pixels, w, h, stride);
    repairSweep(padded, stride, index);
    return padded.toString('base64');
  });
  return { ...data, w: stride, h: h + 2 * padding, below: data.below + padding, palette, frames };
}
