// Hero polish, 15 October 2026: the ranger (Lyra). Standing studies, facing right in a 48x48 cell,
// feet on row 39 (anchorY 40), every pixel opaque or clear, each drawing its own 1-px contour.
import { makeBuf, hexPack } from '../../../../../public/js/engine/pixels.js';

// Paints a list of parts, back to front. A part is [x, y, rows]; '.' and ' ' are clear.
function paint(pal, parts) {
  const buf = makeBuf(48, 48);
  const P = Object.fromEntries(Object.entries(pal).map(([k, c]) => [k, hexPack(c)]));
  for (const [x0, y0, rows] of parts) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === '.' || ch === ' ') return;
      if (!(ch in P)) throw new Error(`unknown colour "${ch}"`);
      const x = x0 + i, y = y0 + j;
      if (x < 0 || y < 0 || x >= 48 || y >= 48) throw new Error('pixel outside the cell');
      buf.d[y * 48 + x] = P[ch];
    }));
  }
  return buf;
}

// ---- A: the classic hooded ranger, done right ---------------------------------------------------
const A_PAL = {
  o: '#1d1a20',
  a: '#22402b', b: '#3a6a2e', c: '#6a9c34', d: '#a9cf4b',
  A: '#2b1a19', B: '#56301f', C: '#8a5131',
  t: '#eaa680', u: '#fcd6b0', i: '#2f7a6a', m: '#c25a5a',
  h: '#3a2426', j: '#6b3e2b', k: '#a5683b', l: '#d8a364',
  q: '#ecc65a', z: '#e9e4d2', R: '#bd3438',
};
function greenhood() {
  return paint(A_PAL, [
    // Back quiver: three fletchings over the shoulder; the tube runs down behind the capelet.
    [12, 9, [
      '.o.o.o....',
      'ozoRozo...',
      'ozoRozo...',
      'ozoRozo...',
      '.oqqqqo...',
      '..ojkkjo..',
      '..ojkkjo..',
      '...ojkkjo.',
      '...ojkkjo.',
      '....ojkkjo',
      '.....ooooo',
    ]],
    // Back leg, set back for a wider stance: brown legging, tall boot.
    [16, 30, [
      '...ohho',
      '...ohjo',
      '..ohjo.',
      '..ojkjo',
      '..ohjjo',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjjo',
      '.oooooo',
    ]],
    // Torso: leather jerkin, belt and buckle, green tunic skirt.
    [19, 22, [
      'ojkkkkjo..',
      'ojklkhjo..',
      'ojkkhkjho.',
      'ohjhjjho..',
      '.ohhqhho..',
      'obcccbbo..',
      'obccdcbbo.',
      'obcccbbabo',
      '.ooboooaoo',
    ]],
    // Front leg.
    [24, 30, [
      '.ohjo..',
      '.ohjo..',
      '.ohjo..',
      '.okllo.',
      '.ojkko.',
      '.ojkko.',
      '.ojkko.',
      '.ojkko.',
      '.ojkkko',
      '.oooooo',
    ]],
    // Bow, drawn before the arm so the string passes behind it: a smooth arc, gold nocks.
    [31, 18, [
      '..o.....',
      '.oqo....',
      '.olo....',
      '.ooloo..',
      '.o.olo..',
      '.o.olo..',
      '.o..olo.',
      '.o..olo.',
      '.o..oko.',
      '.o...oko',
      '.o...oko',
      '.o...oko',
      '.o..oko.',
      '.o..oko.',
      '.o..ojo.',
      '.o.oko..',
      '.o.oko..',
      '.ookoo..',
      '.oko....',
      '.oqo....',
      '..o.....',
    ]],
    // Forearm from under the capelet: bare skin, leather bracer, wrist at the grip.
    [27, 24, [
      'otto....',
      'ottto...',
      '.ojkko..',
      '..ojklo.',
      '...ottto',
      '....oooo',
    ]],
    // Hooded capelet over the shoulders, dagged into two points.
    [16, 19, [
      '................',
      '.ooo.........oo.',
      'obccboooooooocco',
      'obcbbbbbbbbbbbbo',
      'oabbbbabbbbbbbao',
      '.oabbaooooabbao.',
      '..oaao....oaao..',
      '...oo......oo...',
    ]],
    // The hood: a peak at the back, a lit rim round the face, a dark inside and a dark fringe.
    [18, 7, [
      '.oo...........',
      'oddoo.........',
      'odcddooo......',
      'odcccdddoo....',
      'occcccccccoo..',
      'occcccccccccoo',
      'occccdddddddco',
      'occcdaaaaaadoo',
      'obcdaAAAuuuuo.',
      'obcdaAuouuouo.',
      'obcdaAuiuuito.',
      'obbcdAtuuuuto.',
      '.obcdattttmo..',
      '.obbcdatttoo..',
      '..obbcddddo...',
      '...oooooooo...',
    ]],
    // A dark braid slips out of the hood and over the shoulder, tied in gold.
    [23, 19, [
      'oAo...',
      'oBCo..',
      '.oCBo.',
      '.oBAo.',
      '..oqo.',
      '..oCo.',
      '...o..',
    ]],
    // The hand wraps the grip.
    [34, 27, ['ouuuo', 'tttto', '.ooo.']],
  ]);
}

// ---- B: hood down, a copper ponytail streaming back -------------------------------------------
const B_PAL = {
  o: '#1f1922',
  a: '#1c3a31', b: '#2b6142', c: '#4a9046', d: '#8cc254',
  A: '#561c1f', B: '#9e351f', C: '#dc6428', D: '#f9a54d',
  s: '#b0644f', t: '#e8a07a', u: '#fcd5b0', i: '#24405a', m: '#c2565a',
  h: '#3c2328', j: '#6b3c2c', k: '#a5643a', l: '#d99d61',
  g: '#9a7430', q: '#f0cd6c', z: '#f3eee3', R: '#c23b3b',
};
function copperTail() {
  return paint(B_PAL, [
    // Hip quiver hanging from the belt at the back; two red-and-white fletchings at the mouth.
    [12, 22, [
      '.o..o....',
      'ozoozo...',
      'ozRozRo..',
      'ozRozRo..',
      '.oggggo..',
      '..okkjko.',
      '..okkjko.',
      '...okjho.',
      '...okjho.',
      '....okho.',
      '....ooo..',
    ]],
    // Back leg, set back for a wider stance: dark green legging, boot with a turned cuff.
    [16, 30, [
      '...oaao',
      '...oaao',
      '..oaao.',
      '..oaao.',
      '..ojkjo',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjjo',
      '.oooooo',
    ]],
    // Torso: leather jerkin, a narrow waist, gold buckle, leather skirt.
    [19, 22, [
      'ojkkkkjo..',
      'ojkllkjo..',
      'ojkllkjho.',
      '.ojkkjho..',
      '.ohhqhho..',
      'ojlkkjho..',
      'ojlkkjjho.',
      'ojkkjjhjho',
      '.oojoooho.',
    ]],
    // Front leg, a step forward.
    [24, 30, [
      '.oabo..',
      '.oabo..',
      '.oabo..',
      '.oabo..',
      '.okllo.',
      '.ojkko.',
      '.ojkko.',
      '.ojkko.',
      '.ojkkko',
      '.oooooo',
    ]],
    // Bow, drawn before the arm so the string passes behind it: a smooth arc, gold nocks.
    [31, 18, [
      '..o.....',
      '.oqo....',
      '.olo....',
      '.ooloo..',
      '.o.olo..',
      '.o.olo..',
      '.o..olo.',
      '.o..olo.',
      '.o..oko.',
      '.o...oko',
      '.o...oko',
      '.o...oko',
      '.o..oko.',
      '.o..oko.',
      '.o..ojo.',
      '.o.oko..',
      '.o.oko..',
      '.ookoo..',
      '.oko....',
      '.oqo....',
      '..o.....',
    ]],
    // Bow arm: a short green sleeve, bare forearm, leather bracer, wrist at the grip.
    [26, 22, [
      'occo.....',
      'otto.....',
      'ottso....',
      '.ottso...',
      '..ojkko..',
      '...ojklo.',
      '....ottto',
      '.....oooo',
    ]],
    // Capelet over the shoulders, a gold clasp at the throat, two leaf points at the hem.
    [16, 18, [
      '...oo..........',
      '..ocdo.........',
      '.ocddcoooooooo.',
      'ocddccccccccqco',
      'ocdcccccccbbgbo',
      'obccccbbbbbbbbo',
      '.obbbbbo.obbbo.',
      '..obbbo...obo..',
      '...ooo.....o...',
    ]],
    // Ponytail: gathered by a green ribbon at the crown, it falls behind the head to a point.
    [13, 8, [
      '.....ooo',
      '....oDdd',
      '...oDCcc',
      '..oDCCB.',
      '.oDCCBB.',
      '.oCCBBB.',
      'oDCBBB..',
      'oCCBBA..',
      'oCBBAA..',
      'oCBAo...',
      'oBBAo...',
      '.oBAo...',
      '.oAo....',
      '..o.....',
    ]],
    // Head: copper hair, a side-swept fringe, a 3/4 face with two eyes.
    [19, 8, [
      '...ooooo....',
      '..oDDCCCoo..',
      '.oDDCCCCCCo.',
      'oDDCCCCCCCCo',
      'oDCCCCCCCBCo',
      'oCCCCCBCBuBo',
      'oBCCCBuuuuuo',
      'oBCCBuouuouo',
      'oBBCBuiuuito',
      'oABBAtuuuto.',
      '.oABAsttmo..',
      '..oooosso...',
    ]],
    // The hand wraps the grip.
    [34, 27, ['ouuuo', 'tttto', '.ooo.']],
  ]);
}

// ---- C: a long olive cloak with a crimson lining ----------------------------------------------
const C_PAL = {
  o: '#1b1a1e',
  a: '#262d1c', b: '#3f4a26', c: '#626f36', d: '#8f9a4f',
  R: '#7a1f2a', S: '#b8343a',
  A: '#3a1e1a',
  s: '#b46d58', t: '#eaa680', u: '#fcd6b0', i: '#a8742a', m: '#c25a5a',
  h: '#2e2226', j: '#55372c', k: '#87583a', l: '#b9875a',
  g: '#9c7a2e', q: '#efcd68', z: '#e8e4d8', y: '#9a968c',
};
function mossmantle() {
  return paint(C_PAL, [
    // Long cloak thrown back: it falls from the shoulders to the calves, its crimson lining
    // showing down the inner edge.
    [12, 16, [
      '.....ooooo.',
      '....oddccSo',
      '....odccbSo',
      '....odccbSo',
      '...odccbbSo',
      '...ooccbaRo',
      '...occbcaRo',
      '..odcbbcaRo',
      '..occbcbaRo',
      '..ocbbcbaRo',
      '.occbcbaaRo',
      '.ocbbcbaRo.',
      'occbcbaaRo.',
      'ocbbcbaRo..',
      'ocbcbaaRo..',
      'obbcbaRo...',
      'obcbaRo....',
      'oobaRRo....',
      '..oooo.....',
    ]],
    // Quiver on the back: two arrows with grey goose fletchings over the shoulder.
    [11, 9, [
      '.oo.oo....',
      'ozyozyo...',
      'ozyozyo...',
      'ozyozyo...',
      '.oggggo...',
      '..ojkkjo..',
      '..ojkkjo..',
      '...ojkkjo.',
      '...ojkkjo.',
      '....ojkkjo',
      '....ojkkjo',
      '.....ojkko',
      '......oooo',
    ]],
    // Back leg, set back for a wider stance.
    [16, 30, [
      '...ohho',
      '...ohjo',
      '..ohjo.',
      '..ojkjo',
      '..ohjjo',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjo.',
      '.ohjjjo',
      '.oooooo',
    ]],
    // Dark leather jerkin, belt with a gold buckle, leather tassets.
    [20, 21, [
      'ojkkkjo..',
      'ojkllkjo.',
      'ojkllkjo.',
      'ohjkkjho.',
      '.ohjjho..',
      '.ohgqgo..',
      'ojkkkjho.',
      'ojklkjhho',
      'ojkkjhjho',
      '.oojoooho',
    ]],
    // Front leg.
    [24, 30, [
      '.ohjo..',
      '.ohjo..',
      '.ohjo..',
      '.okllo.',
      '.ojkko.',
      '.ojkko.',
      '.ojkko.',
      '.ojkko.',
      '.ojkkko',
      '.oooooo',
    ]],
    // Bow, drawn before the arm: dark wood, a crimson grip wrap above the hand, gold nocks.
    [31, 18, [
      '..o.....',
      '.oqo....',
      '.olo....',
      '.ooloo..',
      '.o.olo..',
      '.o.olo..',
      '.o..olo.',
      '.o..oSo.',
      '.o..oRo.',
      '.o...oko',
      '.o...oko',
      '.o...oko',
      '.o..oko.',
      '.o..oko.',
      '.o..ojo.',
      '.o.oko..',
      '.o.oko..',
      '.ookoo..',
      '.oko....',
      '.oqo....',
      '..o.....',
    ]],
    // Bow arm: leather sleeve, bracer, wrist at the grip.
    [27, 23, [
      'ocbo....',
      'otto....',
      'ottso...',
      '.ojkko..',
      '..ojklo.',
      '...ottto',
      '....oooo',
    ]],
    // Deep hood with a crimson rim; the face lit inside it; a gold clasp at the throat.
    [17, 7, [
      '....ooooo......',
      '..oodddccoo....',
      '.oddddcccccoo..',
      'oddddcccccccco.',
      'oddccccccccccco',
      'occccccccccccco',
      'occcccSSSSSSSco',
      'occccSRaaaaaaSo',
      'obcccSRAAAuuuuo',
      'obcccSRAuouuouo',
      'obcccSRAuiuuito',
      'obbccSRAtuuuuto',
      '.obbcSRAsttmto.',
      '.obbbcSRsstoo..',
      '..obbbcSRqqo...',
      '...ooobbbgqo...',
      '......ooooo....',
    ]],
    // The hand wraps the grip.
    [34, 27, ['ouuuo', 'tttto', '.ooo.']],
  ]);
}

// ---- D: an elven huntress, silver hair, a leaf mantle and a moonstone bow -------------------
export const D_PAL = {
  o: '#1c1b24',
  A: '#4b4a66', B: '#8a8bb0', C: '#c6c9e0', D: '#f4f6ff',
  s: '#b87563', t: '#eeb08c', u: '#fde0c0', i: '#2e8a6e', m: '#c96a6a',
  a: '#173b35', b: '#246052', c: '#3f8f6a', d: '#7cc488',
  h: '#2f2630', j: '#5a3c34', k: '#8c6244', l: '#c09466',
  U: '#7a6a52', V: '#b8a684', W: '#e8dcc0', G: '#8ff0dd',
  q: '#e6c25a', z: '#f2f0e6',
};
// Silverleaf's parts, by name, back to front: the animated ranger (src/animated-oct15/archer.js)
// moves them pose by pose.
export const SILVERLEAF = {
  // Hip quiver at the back, white fletchings edged in teal.
  quiver: [12, 22, [
    '.o..o....',
    'ozoozo...',
    'ozcozco..',
    'ozcozco..',
    '.ojjjjo..',
    '..okkjko.',
    '..okkjko.',
    '...okjho.',
    '...okjho.',
    '....okho.',
    '....ooo..',
  ]],
  // Back leg, set back for a wider stance: dark legging, soft boot.
  backLeg: [16, 30, [
    '...ohho',
    '...ohjo',
    '..ohjo.',
    '..ojkjo',
    '..ohjjo',
    '.ohjjo.',
    '.ohjjo.',
    '.ohjjo.',
    '.ohjjjo',
    '.oooooo',
  ]],
  // Leather bodice, belt with a gold buckle, teal tunic skirt split at the front.
  torso: [19, 22, [
    'ojkkkkjo..',
    'ojkllkjo..',
    'ojkllkjho.',
    '.ojkkjho..',
    '.ohhqhho..',
    'obcccbbo..',
    'obcdcbbao.',
    'obccbbaabo',
    '.oobooaoo.',
  ]],
  // Front leg.
  frontLeg: [24, 30, [
    '.ohjo..',
    '.ohjo..',
    '.ohjo..',
    '.okllo.',
    '.ojkko.',
    '.ojkko.',
    '.ojkko.',
    '.ojkko.',
    '.ojkkko',
    '.oooooo',
  ]],
  // Pale birch bow, drawn before the arm, with a moonstone above the grip (it glows at night).
  bow: [31, 18, [
    '..o.....',
    '.oqo....',
    '.oWo....',
    '.ooWoo..',
    '.o.oWo..',
    '.o.oWo..',
    '.o..oGo.',
    '.o..oGo.',
    '.o..oVo.',
    '.o...oVo',
    '.o...oVo',
    '.o...oVo',
    '.o..oVo.',
    '.o..oVo.',
    '.o..oUo.',
    '.o.oVo..',
    '.o.oVo..',
    '.ooVoo..',
    '.oVo....',
    '.oqo....',
    '..o.....',
  ]],
  // Bow arm: sleeve, bare forearm, leather bracer, wrist at the grip.
  bowArm: [27, 23, [
    'ocbo....',
    'otto....',
    'ottso...',
    '.ojkko..',
    '..ojklo.',
    '...ottto',
    '....oooo',
  ]],
  // Teal leaf mantle over the shoulders, a gold leaf brooch at the throat.
  mantle: [16, 18, [
    '...oo..........',
    '..ocdo.........',
    '.ocddcoooooooo.',
    'ocddccccccccqco',
    'ocdcccccccbbqbo',
    'obccccbbbbbbbbo',
    '.obbbbbo.obbbo.',
    '..obbbo...obo..',
    '...ooo.....o...',
  ]],
  // Long silver hair: one lock falls from the back of the head and tapers to a point.
  hair: [14, 10, [
    '....oooo',
    '...oDDCC',
    '..oDCCCB',
    '..oCCCBB',
    '.oDCCBBA',
    '.oCCBBA.',
    '.oCCBBA.',
    '.oCBBAo.',
    'oCCBBAo.',
    'oCBBAo..',
    'oBBAo...',
    '.oAo....',
    '..o.....',
  ]],
  // Head: silver hair parted over the brow, a pointed ear, a 3/4 face with jade eyes.
  head: [19, 8, [
    '...ooooo....',
    '..oDDCCCoo..',
    '.oDDCCCCCCo.',
    'CDDCCCCCCCCo',
    'CDCCCCCCCBCo',
    'CCCCCCBCBuBo',
    'BBCCCBuuuuuo',
    'BBCCBuouuouo',
    'BBBCBuiuuito',
    'BABBAtuuuto.',
    'AoABAsttmo..',
    'o.oooosso...',
  ]],
  // The pointed ear, through the hair.
  ear: [17, 9, [
    'oo....',
    'ouo...',
    '.ouo..',
    '.otuo.',
    '..otuo',
    '..ostto',
    '...oo..',
  ]],
  // The hand wraps the grip.
  hand: [34, 27, ['ouuuo', 'tttto', '.ooo.']],
};
function silverleaf() {
  return paint(D_PAL, Object.values(SILVERLEAF));
}

const model = (fn) => {
  const frame = fn();
  return { gen: () => [frame], idle: [0], walk: [0], anchorY: 40, outline: false, selfBob: true, fitW: 36, fitH: 34 };
};
// The palettes, for recolouring and review tools.
export const PALETTES = { 'polish-a': A_PAL, 'polish-b': B_PAL, 'polish-c': C_PAL, 'polish-d': D_PAL };

const COLLECTION = 'Hero polish · October 15';
export default [
  {
    cls: 'archer', id: 'polish-a', name: 'Ranger · Greenhood',
    description: 'The classic hooded ranger, done right: a bright pointed hood whose lit rim frames a clear face, a dark braid, a dagged capelet and red-fletched arrows over the shoulder. Replaces the cap-like hood, hidden face and claw-like arrows with one clean silhouette and a bow held at the grip.',
    collection: COLLECTION, glow: [], def: model(greenhood),
  },
  {
    cls: 'archer', id: 'polish-b', name: 'Ranger · Copper Tail',
    description: 'Hood down: a copper ponytail tied in green falls down her back like the knight\'s plume, over a leaf-cut capelet, leather and dark green leggings. Warm and cool blocks alternate as on the knight, so she reads at a glance instead of as a muddy brown figure.',
    collection: COLLECTION, glow: [], def: model(copperTail),
  },
  {
    cls: 'archer', id: 'polish-c', name: 'Ranger · Mossmantle',
    description: 'A deep olive hood lined in crimson frames her face, with a gold clasp, a long mossy cloak thrown back and a crimson grip on the bow. Fixes Thornwarden\'s hidden face and loose cape: the red lining is the one focal accent, and the cloak hangs from the hood as one shape.',
    collection: COLLECTION, glow: [], def: model(mossmantle),
  },
  {
    cls: 'archer', id: 'polish-d', name: 'Ranger · Silverleaf',
    description: 'An elven huntress: silver hair, a long pointed ear, a teal leaf mantle and a pale birch bow whose moonstone glows at night. A cool, light silhouette that stands out on the dark forest floor, unlike the brown and olive rangers before her.',
    collection: COLLECTION, glow: ['#8ff0dd'], def: model(silverleaf),
  },
];
