// The Darkwood's landmarks (darkwood.js lays them out): gothic props, cursed trees and the stone
// circle's monument, cut from free packs by tools/bake-art.mjs (tools/art/landmarks.mjs, credited
// in public/assets/art/CREDITS.md). The gallows and the gibbet are timber drawn here, in the
// game's own browns, with the pack's noose and cage hung from them.

import LM from '../../assets/art/landmarks.js';
import { bakedDef, bakedBuffers } from './baked.js';
import { makeBuf, blit } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { HELL_ARCH } from './flora-hell.js';

// A sprite's flames (bright reds) glow unlit at night: the def's glow colours.
const flames = (data) => data.palette.filter((c) => {
  const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
  return c >>> 24 && r > 200 && g < 110 && b < 110;
});
const lit = (name, more = {}) => bakedDef(LM[name], { glow: flames(LM[name]), ...more });

// Timber, lit from the top left like the rest of the art: a post or a beam w x h at (x, y).
function timber(buf, x, y, w, h, upright) {
  const pal = packedPalette(), tones = [pal.B, pal.b, pal.m];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const u = upright ? i / (w - 1) : j / (h - 1);
      let t = u < 0.3 ? 0 : u < 0.75 ? 1 : 2;
      if (t < 2 && ((x + i) * 7 + (y + j) * 13) % 11 === 0) t++; // grain
      const X = x + i, Y = y + j;
      if (X >= 0 && Y >= 0 && X < buf.w && Y < buf.h) buf.d[Y * buf.w + X] = tones[t];
    }
  }
}
// A diagonal brace, two pixels thick, from (x0, y0) to (x1, y1).
function brace(buf, x0, y0, x1, y1) {
  const pal = packedPalette(), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) {
    const X = Math.round(x0 + ((x1 - x0) * k) / n), Y = Math.round(y0 + ((y1 - y0) * k) / n);
    buf.d[Y * buf.w + X] = pal.B;
    buf.d[(Y + 1) * buf.w + X] = pal.b;
  }
}
// The gallows: two posts and a beam, a noose from its middle, a block of a step under it.
const GALLOWS = { w: 46, h: 50, posts: [4, 41] };
function gallows() {
  const { w, h } = GALLOWS, buf = makeBuf(w, h), pal = packedPalette();
  for (const x of GALLOWS.posts) timber(buf, x - 2, 3, 4, h - 3, true);
  timber(buf, 0, 2, w, 4, false);
  brace(buf, 6, 16, 14, 6);
  brace(buf, 38, 16, 31, 6);
  const [noose] = bakedBuffers(LM.lm_noose);
  blit(buf, noose, Math.round(w / 2 - noose.w / 2), 6);
  timber(buf, w / 2 - 5, h - 5, 10, 5, false); // the block
  buf.d[(h - 5) * w + w / 2 - 5] = pal.t;
  return buf;
}
// The gibbet: a post with an arm, the cage hanging from its end and a bare chain nearer the post.
const GIBBET = { w: 50, h: 68, post: 5 };
function gibbet() {
  const { w, h } = GIBBET, buf = makeBuf(w, h);
  timber(buf, GIBBET.post - 2, 2, 5, h - 2, true);
  timber(buf, 1, 3, 44, 4, false);
  brace(buf, 8, 22, 20, 7);
  const [chain] = bakedBuffers(LM.lm_chain2);
  blit(buf, chain, 22 - (chain.w >> 1), 7);
  const [cage] = bakedBuffers(LM.lm_cage);
  blit(buf, cage, 34 - (cage.w >> 1), 7);
  return buf;
}

export const LANDMARK_ART = {
  lm_gallows: { gen: () => [gallows()] },
  lm_gibbet: { gen: () => [gibbet()] },
  lm_candelabra: lit('lm_candelabra'),
  lm_pike: bakedDef(LM.lm_pike),
  lm_pikeblood: bakedDef(LM.lm_pikeblood),
  lm_pikehead: bakedDef(LM.lm_pikehead),
  lm_skullpost: bakedDef(LM.lm_skullpost),
  lm_skullpost2: bakedDef(LM.lm_skullpost2),
  lm_candle: lit('lm_candle'),
  lm_candle2: lit('lm_candle2'),
  lm_swordstone: bakedDef(LM.lm_swordstone),
  lm_gargoyle: bakedDef(LM.lm_gargoyle),
  lm_gargoyle2: bakedDef(LM.lm_gargoyle2),
  lm_rockpile: bakedDef(LM.lm_rockpile),
  lm_blood: bakedDef(LM.lm_blood),
  lm_skulltree: bakedDef(LM.lm_skulltree),
  lm_skulltree2: bakedDef(LM.lm_skulltree2),
  lm_driedtree: bakedDef(LM.lm_driedtree),
  lm_monument: bakedDef(LM.lm_monument),
};

// What of them stops the hero (forest.js): squat ellipses as the trees' trunks, [dx, dy, half
// width] from the prop's foot. The horde walks through, as through everything.
const half = (o) => o.w / 2;
export const LANDMARK_SOLIDS = {
  lm_gallows: GALLOWS.posts.map((x) => [x - half(GALLOWS), -1, 2.5]),
  lm_gibbet: [[GIBBET.post - half(GIBBET) + 0.5, -1, 3]],
  lm_candelabra: [[0, -1, 2.5]],
  lm_pike: [[0, -1, 1.5]],
  lm_pikeblood: [[0, -1, 1.5]],
  lm_pikehead: [[0, -1, 1.5]],
  lm_swordstone: [[0, -3, 9]],
  lm_gargoyle: [[0, -4, 13]],
  lm_gargoyle2: [[0, -4, 13]],
  lm_rockpile: [[0, -3, 9]],
  lm_skulltree: [[0, -2, 7]],
  lm_skulltree2: [[0, -2, 6]],
  lm_driedtree: [[0, -2, 4]],
  lm_monument: [[0, -14, 11]],
  // The Bloomvale's hay fields (29 October 2026, art/flora-meadow.js): a round bale and two square ones
  // stop the hero as a rock does, the scarecrow only at its post.
  bloom_hay1: [[0, 0, 6]],
  bloom_hay2: [[0, 0, 7]],
  bloom_scarecrow: [[0, 0, 2]],
  // The Abyss's ruins (art/flora-hell.js, 29 October 2026): a wall end along its foot (all of it, as
  // its lowest course always stands), the arch at its two piers (its opening walked through), the seal
  // stone, a walkway's iron post. The pillars and the stake stop the hero at their trunks
  // (biomes/hell.js trunks); the fallen drum, low as a rock, doesn't.
  hell_wall1: [-9, -3, 3, 9].map((dx) => [dx, -3, 4]),
  hell_wall2: [-16, -8, 0, 8, 16].map((dx) => [dx, -3, 4.5]),
  hell_arch: HELL_ARCH.piers.map(([a, b]) => [(a + b + 1) / 2 - HELL_ARCH.w / 2, -2, 5.5]),
  hell_seal: [[0, -2, 5]],
  hell_post_iron: [[0, -1, 3]],
};
// Tall ones fade, as the trees do, while the hero walks behind them; the Abyss's pillars and arch too
// (29 October 2026), in whatever slot they stand, and a pillar stops him at its trunk there.
export const LANDMARK_TALL = new Set(['lm_gallows', 'lm_gibbet', 'lm_skulltree', 'lm_skulltree2', 'lm_driedtree',
  'hell_pillar1', 'hell_pillar2', 'hell_pillar3', 'hell_arch']);
