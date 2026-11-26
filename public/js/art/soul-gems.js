import { buildSprite } from '../engine/sprites.js';

// Master-palette ramps, dark edge through shade, body, light and reflection.
const ramps = ['K u U c X', 'E e L l z', 'm R r i z', 'O o y Y f']
  .map(ramp => ramp.split(' '));

// A * reflects white on the blink frame. A + catches the same light on the
// neighbouring facet. Only the lit planes bypass the night lighting.
export function buildGemArt(rows, rank) {
  const [d, s, m, l, h] = ramps[rank];
  const colours = { d, s, m, l, h, w: 'w', '.': '.' };
  const frames = [false, true].map(blink => rows.map(row => [...row].map(key => {
    if (key === '*') return blink ? 'w' : h;
    if (key === '+') return blink ? h : l;
    return colours[key];
  }).join('')));
  return buildSprite('gem' + (rank + 1), { frames, emissive: m + l + h + 'w' });
}

// Natural quartz grows in separate spires. Dark seams keep the overlapping
// points legible when the local halo brightens their faces.
const cluster = [
  [
    '.....h...',
    '....*lm..',
    '.h..hms..',
    '.ll.lms..',
    '.+mslmss.',
    '..hmmssd.',
    '..lmhmss.',
    '...smsd..',
    '....sd...',
  ],
  [
    '....*.....',
    '...hll....',
    '...lms..h.',
    '.h.lms.hl.',
    '.hmlms.ls.',
    '.+msmshms.',
    '..mmlmlms.',
    '..hlmmsssd',
    '...msmsdd.',
    '....ssd...',
  ],
  [
    '.....h.....',
    '....*lm....',
    '....hms..h.',
    '.h..lms.hl.',
    '.hl.lms.ls.',
    '.+mslmslms.',
    'h.msmlmmss.',
    '.hlmhmsmsdd',
    '..mlmmmsdd.',
    '...mssmsd..',
    '....ssdd...',
  ],
  [
    '.....h.....',
    '....*lm....',
    '....hms..h.',
    '.h..lms.hm.',
    '.hl.lms.ls.',
    '.lmshmslms.',
    'h.lmlmslmsh',
    'hl+mllmmshs',
    '.hmmmsmlmsd',
    '..lmhmmsdd.',
    '...msmssd..',
    '....ssdd...',
  ],
];

export const DEFAULT_GEM_FAMILY = 'cluster';
const sprites = [];
export function defaultGem(rank) {
  return sprites[rank] ??= buildGemArt(cluster[rank], rank);
}
