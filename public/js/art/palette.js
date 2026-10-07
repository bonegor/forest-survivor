// The master palette (ENDESGA 32 plus a few extras). Sprites are authored as
// strings where each character is one of these keys; '.' is transparent.

import { hexPack } from '../engine/pixels.js';

export const PAL = {
  k: '#181425', // ink / outline
  K: '#262b44',
  n: '#3a4466',
  N: '#5a6988',
  g: '#8b9bb4',
  G: '#c0cbdc',
  w: '#ffffff',
  x: '#ff0044', // hot red (glowing eyes)
  r: '#e43b44',
  R: '#a22633',
  m: '#3e2731',
  b: '#733e39',
  B: '#b86f50',
  d: '#d77643',
  t: '#e4a672',
  T: '#ead4aa',
  s: '#e8b796',
  S: '#c28569',
  O: '#be4a2f',
  o: '#f77622',
  y: '#feae34',
  Y: '#fee761',
  L: '#63c74d',
  e: '#3e8948',
  E: '#265c42',
  v: '#193c3e',
  u: '#124e89',
  U: '#0099db',
  c: '#2ce8f5',
  p: '#68386c',
  P: '#b55088',
  i: '#f6757a',
  // extras
  q: '#3b2346', // deep violet
  j: '#8f5bb0', // lavender
  h: '#2a1f2d', // near-black warm
  a: '#4b3d44', // ash
  A: '#7d6a6a', // ash light
  z: '#f4f4e4', // bone white
  Z: '#a8b5b2', // bone grey
  l: '#9ee562', // acid green
  f: '#ffd6a0', // flame core
  F: '#ff9b3d', // flame
};

export const OUTLINE = hexPack(PAL.k);

let packed = null;
export function packedPalette() {
  if (!packed) {
    packed = {};
    for (const [k, v] of Object.entries(PAL)) packed[k] = hexPack(v);
  }
  return packed;
}
