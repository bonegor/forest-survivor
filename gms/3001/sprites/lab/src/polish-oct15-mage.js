// Hero polish, 15 October 2026: four standing proposals for the mage (Eldrin, fireballs), drawn to sit
// beside the plumed knight: a warm dark ink contour drawn into the sprite, hard colour clusters, short
// ramps, light from the upper left. Each faces right in a 48x48 cell with the feet on y=39.
// Every hat is built the same way, so it sits on the head: the brim, the band and the cone's base are
// centred on the skull's centre column (x=24); the brim's front edge dips over the brow; hair or face
// meets the brim's underside with no gap; and the row just under the brim is in its shadow.
// Review notes: polish-oct15-mage-review.md.
import { makeBuf, hexPack } from '../../../../../public/js/engine/pixels.js';

// A version is a palette and either one grid (rows at x, y) or parts ([x, y, rows]) painted in
// order, back to front; '.' leaves what is under it.
export function compose(v) {
  const grid = Array.from({ length: 48 }, () => Array(48).fill('.'));
  const parts = v.rows ? [[v.x, v.y, v.rows]] : v.parts;
  for (const [x, y, rows] of parts) rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    if (!v.pal[ch]) throw new Error(`${v.id}: unknown colour "${ch}" at ${x + i},${y + j}`);
    if (x + i < 0 || x + i > 47 || y + j < 0 || y + j > 47) throw new Error(`${v.id}: pixel outside the cell at ${x + i},${y + j}`);
    grid[y + j][x + i] = ch;
  }));
  return grid;
}

function paint(v) {
  const buf = makeBuf(48, 48), grid = compose(v);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (grid[y][x] !== '.') buf.d[y * 48 + x] = hexPack(v.pal[grid[y][x]]);
  return buf;
}

// The fireball's own orange, amber and yellow (public/js/art/palette.js: o y Y), a white-hot core and a
// dark ember rim.
const FIRE = { r: '#8e1f19', f: '#f77622', F: '#feae34', y: '#fee761', h: '#fff6d0' };

const A = {
  id: 'polish-a',
  x: 8, y: 2,
  pal: {
    o: '#1d1424',
    1: '#242a66', 2: '#2f45a0', 3: '#3d6bd6', 4: '#64a0f0', 5: '#a8d8ff',
    g: '#8a5a24', G: '#d39a35', Y: '#ffe08a',
    ...FIRE,
    s: '#94503f', S: '#d88e66', T: '#f6c49d',
    w: '#7a7896', x: '#c4c6d8', X: '#f4f4fa',
    d: '#3f261e', D: '#6e4430', k: '#a06a43',
  },
  rows: [
    '..........................oooo....',
    '..........ooo............oyFFFo...',
    '..........o43oo.........oFyFFffo..',
    '...........o433oo.......oFFFFffo..',
    '............o4332o......oYFffrgo..',
    '.............o4332o......oGGggo...',
    '.............o44332o......oGgo....',
    '.............o54332o......oDdo....',
    '............o5433321o.....oDdo....',
    '............o5433321o.....oDdo....',
    '..........oooYYGGGggooo...oDdo....',
    '.........o5444433333222o..oDdo....',
    '...r......o32222222111o...oDdo....',
    '..rfr.r....oowwxxsxxoo....oDdo....',
    '..rFfrfr....oxwSoxoSo.....oDdo....',
    '.rfyFfFr....oxsTTSSSSo....oDdo....',
    '.rFhyFfr....oXxXXXXXxo....oDdo....',
    '.rFhhyFr..oooXXXXXxxwooo..oDdo....',
    '..ryhyr.oo43oXXXXxxwwo32o.oDdo....',
    '..oSTSoo4443oXXXxxxwo332o.oDdo....',
    '..osSsoG43o2oXXxxxwo2321oooDdo....',
    '...ooooG33o2oXxxxwo22321GGSTTSo...',
    '.....o3332o22oXxxwo22221GgSSSso...',
    '.....o2221o222oXxwo22211ggsSsso...',
    '......o11o32222oXwo22111oooDdo....',
    '.......ooo432222owo2111o..oDdo....',
    '........oDDddddddoGYgdo...oDdo....',
    '.......o4433243322G5g1o...oDdo....',
    '.......o4433243322G5g1o...oDdo....',
    '......o4433324332G55g1o...oDdo....',
    '......o4433324332G55g11o..oDdo....',
    '.....o44333324332G55g11o..oDdo....',
    '.....o4433332432G555g11o..oDdo....',
    '....o44333332432G555g11o..oDdo....',
    '...o444333332432G555g11o..oDdo....',
    '..oYYYGGGGGGGGGGG555gggo..oDdo....',
    '...ooooooodDkooooooDkDddo.oDdo....',
    '.........ooooo....ooooooo..oo.....',
  ],
  glow: ['#8e1f19', '#f77622', '#feae34', '#fee761', '#fff6d0'],
  name: 'Mage · Grand Archmage',
  description: 'The classic Eldrin rebuilt: brim, band and cone all centred on the skull, the brim dipping over the brow onto white hair and throwing a shadow on stern V-brows, a long beard hanging from the chin, an ember orb in a gold cup and a white-hot fireball in his raised hand.',
};

const B = {
  id: 'polish-b',
  pal: {
    o: '#1a1016',
    1: '#2b1a17', 2: '#4f2e23', 3: '#7d4c30', 4: '#ad7445',
    a: '#3d0f20', b: '#6e1c30', c: '#a2303c', e: '#d2564a',
    v: '#3d3c50', m: '#6f7089', n: '#aaacc2', N: '#e8e8f0',
    s: '#8e4a3c', S: '#cf8660', T: '#f0b98f',
    w: '#3f353c', x: '#6e6370', X: '#a59aa5',
    ...FIRE,
    G: '#d39a35',
  },
  parts: [
    // War staff, planted behind him: iron-shod shaft, a steel crown with an ember gem.
    [9, 10, Array(29).fill('o32o')],
    [10, 39, ['oo']],
    [8, 5, ['.o..o.', 'oNoono', 'onyFmo', 'onFfvo', '.onmo.']],
    // Coat: broad torso, belt, a skirt split at the front.
    [15, 18, [
      '..oooooooooooo..',
      '.oeeccccccccbbo.',
      'oeecccccccbbbbao',
      'oecccccccbbbbaao',
      'oecccccbbbbbbaao',
      'oeccccbbbbbbbaao',
      '.oeccccbbbbbbao.',
      '.oeccccbbbbbbao.',
      '.oecccbbbbbbbao.',
    ]],
    [16, 27, ['o222222G22222o']],
    [15, 28, ['oeccccbbbao']], [26, 28, ['xwbao']],
    [15, 29, ['oeccbbbbaao']], [26, 29, ['xwao']],
    [14, 30, ['oecccbbbbao']], [25, 30, ['oxxwo']],
    [14, 31, ['oeccbbbbaao']], [26, 31, ['oxxwo']],
    [14, 32, ['oecbbbbaao']], [26, 32, ['oxxwo']],
    [14, 33, ['oooooooooo']], [26, 33, ['oxwwo']],
    // Legs in a wide stance: dark breeches, heavy boots, toes forward.
    [17, 34, ['oxxwo']], [26, 34, ['oxxwo']],
    [17, 35, ['o432o']], [26, 35, ['o432o']],
    [17, 36, ['o332o']], [26, 36, ['o332o']],
    [16, 37, ['o4322o']], [26, 37, ['o3322o']],
    [15, 38, ['o43321o']], [26, 38, ['o43321o']],
    [16, 39, ['oooooo']], [27, 39, ['oooooo']],
    // A leather baldric across the chest, under the beard, with a steel buckle.
    [17, 19, ['32']], [18, 20, ['32']], [19, 21, ['32']], [20, 22, ['nN']], [21, 23, ['mn']],
    [22, 24, ['32']], [23, 25, ['32']], [24, 26, ['32']],
    // Back hand grips the staff; the sleeve meets the coat.
    [8, 21, ['.....ooo', 'oSTTSGcc', 'oSSSsGbc', 'osSssGbb', '.....ooo']],
    // Steel pauldron on the front shoulder.
    [25, 17, ['..oooo..', '.oNnnmo.', 'oNnnmmvo', 'onnmmvvo', 'ommmvvvo', '.oooooo.']],
    // Head: the face in the brim's shadow, a short grizzled beard.
    [21, 14, ['wwsssss']],
    [20, 15, ['oxwSoSoSo']],
    [20, 16, ['oxsTSSSSSo']],
    [20, 17, ['oXxwxXxwo']],
    [21, 18, ['oXwxwxo']],
    [22, 19, ['oxwxo']],
    [23, 20, ['oxo']],
    // Hat: dark leather, worn low; the top folds over and hangs forward.
    [23, 4, ['oooo']],
    [22, 5, ['o4332oo']],
    [22, 6, ['o432211o']],
    [22, 7, ['o432oo11o']],
    [21, 8, ['o4432o.o1o']],
    [21, 9, ['o43322o.o']],
    [20, 10, ['o4433321o']],
    [18, 11, ['oooecNnbbaooo']],
    [17, 12, ['o4444433333222o']],
    [18, 13, ['o32222222111o']],
    [19, 14, ['oo']],
    [28, 14, ['oo']],
    // Front arm: the bracer and an open palm holding the fireball forward.
    [33, 21, ['oSTTSo']],
    [26, 22, ['obccbnNnSSSso']],
    [26, 23, ['obbbamnmoooo']],
    [27, 24, ['oaaoooo']],
    [28, 25, ['oo']],
    // Fireball.
    [32, 13, [
      '...r...',
      '..rfrr.',
      '.rfFFfr',
      'rfFyyFr',
      'rFyhhyr',
      'rFyhhyr',
      '.rFyyFr',
      '..rFFr.',
    ]],
  ],
  glow: ['#8e1f19', '#f77622', '#feae34', '#fee761', '#fff6d0'],
  name: 'Mage · Battlemage',
  description: "A grizzled war-wizard: a battered leather hat worn low, its brim centred and its tip folded forward, a crimson coat with a baldric, a steel pauldron and bracer, a fireball held forward on an open palm and an iron-crowned staff planted behind, in a wide stride like the knight's.",
};

const C = {
  id: 'polish-c',
  pal: {
    o: '#1c1222',
    a: '#2b1433', b: '#5a2455', c: '#8e3a7e', e: '#b5508a', E: '#e48fb6',
    g: '#8a5a24', G: '#d39a35', Y: '#ffe08a',
    1: '#5c1a1f', 2: '#9c2c2a', 3: '#d4523a',
    s: '#94503f', S: '#d88e66', T: '#f6c49d',
    w: '#232036', x: '#3e3a58',
    d: '#3f261e', D: '#6e4430',
    ...FIRE,
  },
  parts: [
    // Short cape behind him, flaring back; its lit edge and a gold-lined hem.
    [17, 19, ['oo']],
    [16, 20, ['ocb']],
    [15, 21, ['ocba']],
    [15, 22, ['ocaa']],
    [14, 23, ['ocbaa']],
    [14, 24, ['ocaaa']],
    [13, 25, ['ocbaaa']],
    [13, 26, ['ocaaaa']],
    [12, 27, ['ocbaaaa']],
    [12, 28, ['ocaaaaa']],
    [12, 29, ['oYGGgga']],
    [13, 30, ['oooooo']],
    // Legs in a confident stride: dark breeches, sturdy boots.
    [19, 32, ['owxxo']], [25, 32, ['oxxwo']],
    [18, 33, ['owxxo']], [25, 33, ['oxxwo']],
    [17, 34, ['owxxo']], [26, 34, ['oxxwo']],
    [17, 35, ['oDDdo']], [26, 35, ['oDDdo']],
    [17, 36, ['oDDdo']], [26, 36, ['oDDdo']],
    [16, 37, ['oDDddo']], [26, 37, ['oDDDdo']],
    [15, 38, ['oDDDddo']], [26, 38, ['oDDDdo']],
    [16, 39, ['oooooo']], [27, 39, ['ooooo']],
    // Fitted coat: gold-edged lapels into a single placket, a red sash, a short skirt.
    [17, 19, [
      '.oecGoooooGbao',
      'oeccGcccGbbbao',
      'oecccGcGbbbbao',
      'oeccccGbbbbbao',
      '.oecccGbbbbao.',
      '.oeccccGbbbao.',
      '.oeccccGbbbao.',
      '.o22222Y2221o.',
      '.oeccccGbbbao.',
      'oeeccccGbbbbao',
      'oecccccGebbbao',
      'oYGGGGGGYggggo',
      'ooooooooooooo.',
    ]],
    // Front hand on the staff; the staff: dark wood topped by a gold ring round a floating ember.
    [33, 12, Array(27).fill('oDdo')],
    [34, 39, ['oo']],
    [33, 5, ['oooo']],
    [32, 6, ['oYGGgo']],
    [31, 7, ['oYoyFogo']],
    [31, 8, ['oGyhFfgo']],
    [31, 9, ['oGoFfogo']],
    [32, 10, ['oGgggo']],
    [33, 11, ['oGgo']],
    [29, 21, ['aaoo']],
    [28, 22, ['baaba']],
    [28, 23, ['baaaa']],
    [28, 24, ['aabGGSTTSo']],
    [28, 25, ['aabGgSSSso']],
    [28, 26, ['aoaggsSsso']],
    [30, 27, ['ooo']],
    // Back arm raised high, the sleeve falling from the forearm; fire swirls above the palm.
    [11, 13, [
      '..oSTo....',
      '..oSSo....',
      '.oGGGGo...',
      '.oeccbo...',
      'oeeccbbo..',
      'oecccbbo..',
      '.oecbbbo..',
      '..ooobbo..',
      '.....oo...',
    ]],
    [10, 4, [
      '....r....',
      '...rfr.r.',
      '..rfFfrfr',
      '..rFyFFr.',
      '.rfyhyFr.',
      'rfFyhhyFr',
      'rFyhhhyFr',
      '.rFyhyFr.',
      '..orFro..',
    ]],
    // Head: young and fierce, stern brows, red hair swept back from under the brim.
    [20, 14, ['221s1s1s']],
    [18, 15, ['o3221SoSoSo']],
    [17, 16, ['o3o21sTSSSSSo']],
    [17, 17, ['o32o1sSSssSo']],
    [18, 18, ['o211osSSSSo']],
    [23, 19, ['ooooo']],
    // Hat: straight tall cone with a gold flame emblem, a narrower brim.
    [18, 2, [
      '......o......',
      '.....oEo.....',
      '.....oeo.....',
      '....oEeco....',
      '....oecbo....',
      '....oeGbo....',
      '...oEGYgbo...',
      '...oecGcbo...',
      '..oEecccbao..',
      '.ooYGGGGggoo.',
      '.oeeecccbbbo.',
      'oceeccbbbbaao',
      '.o........oo.',
    ]],
  ],
  glow: ['#8e1f19', '#f77622', '#feae34', '#fee761', '#fff6d0'],
  name: 'Mage · Ember Prodigy',
  description: 'A young fire sorcerer: a straight plum hat with a gold flame emblem, seated on swept-back red hair that fills the back of the brim, stern brows in its shadow, a fitted coat with gold lapels, a fireball raised high and a gold-ring ember staff.',
};

const D = {
  id: 'polish-d',
  pal: {
    o: '#120c10',
    a: '#1f1a22', b: '#383039', c: '#574c58', e: '#7e7280', E: '#a89ca6',
    R: '#561a22', Q: '#8e2a2c', P: '#c0443a',
    d: '#2a1d1a', D: '#4a332a',
    ...FIRE,
  },
  parts: [
    // Scarf tail streaming back from the neck like a pennant.
    [16, 17, ['oooo']],
    [14, 18, ['ooPQQQ']],
    [12, 19, ['ooPQRRo']],
    [11, 20, ['oPQRoo']],
    [11, 21, ['oRRo']],
    [11, 22, ['ooo']],
    // Long ash coat: shoulders under the scarf, a rope belt, a flared skirt, a smouldering ragged hem.
    [17, 19, ['oEeecccbbbbbbao']],
    [16, 20, ['oEeecccccbbbbbao']],
    [16, 21, ['oEeecccccbbbbbao']],
    [16, 22, ['oeeecccccbbbbbao']],
    [16, 23, ['oeecccccbbbbbbao']],
    [16, 24, ['oeecccccbbbbbbao']],
    [16, 25, ['oeecccccbbbbbbao']],
    [16, 26, ['odDDDDDDDDDDDddo']],
    [16, 27, ['oeecccccbbbbbbao']],
    [15, 28, ['oEeecccccbbbbbbaao']],
    [15, 29, ['oeeeccccccbbbbbaao']],
    [15, 30, ['oeeccccccbbbbbbaao']],
    [14, 31, ['oEeeccccccbbbbbbaaao']],
    [14, 32, ['oeeeccccccbbbbbbaaao']],
    [14, 33, ['oeeccccccbbbbbbbaaao']],
    [14, 34, ['oeccfcccccbbbfbbbaao']],
    [14, 35, ['ocfcFcfccbfbFbfbfaao']],
    [14, 36, ['oFrrorFrorfrorFrorro']],
    [14, 37, ['oo.oo.oo.oo.oo.oo.oo']],
    // Boots under the hem.
    [17, 37, ['..oDdo...oDdo..']],
    [17, 38, ['.oDDddo..oDDdo.']],
    [17, 39, ['..ooooo..ooooo.']],
    // Iron staff with a caged lantern of fire.
    [36, 12, Array(27).fill('ocbo')],
    [37, 39, ['oo']],
    [34, 3, [
      '...oo...',
      '..oeco..',
      '.oEecbo.',
      'oeoyFobo',
      'oeyhyFbo',
      'ocFyFfbo',
      'ocoFfoao',
      '.oecbao.',
      '..ocbo..',
    ]],
    // Far arm: a bell sleeve in shadow with a lit cuff; the glove wrapped round the staff.
    [31, 21, ['ao']],
    [31, 22, ['aao']],
    [31, 23, ['aaeo']],
    [30, 24, ['aaaeeoDDDdo']],
    [30, 25, ['aaooooDDddo']],
    [30, 26, ['ao']],
    // Near arm reaches across the body; the gloved palm holds a flame in front of the coat.
    [16, 20, ['oEeeo']],
    [15, 21, ['oEEeeco']],
    [15, 22, ['oEeeeco']],
    [15, 23, ['oEeeccco']],
    [15, 24, ['oeeccccEo']],
    [16, 25, ['oeccccEo']],
    [17, 26, ['ooccooo']],
    [19, 27, ['oo']],
    [25, 19, ['r']],
    [24, 20, ['rfr']],
    [24, 21, ['rFfr']],
    [23, 22, ['rfyFfr']],
    [23, 23, ['rFhyFr']],
    [24, 24, ['ryyr']],
    [23, 25, ['oDDDDo']],
    [23, 26, ['oDDddo']],
    [24, 27, ['oooo']],
    // Head: a dark face in the brim's shadow, two ember eyes, the scarf wrapped to the nose.
    [21, 14, ['aaaaaaa']],
    [20, 15, ['oaaayayao']],
    [20, 16, ['oPQQQQRRo']],
    [19, 17, ['oPQQQRRRRRo']],
    [19, 18, ['QQQRRRRRRRo']],
    // Hat: a wide slouched brim with drooping tips, a crumpled crown bent back, a red band.
    [17, 4, ['ooo']],
    [16, 5, ['oEecoo']],
    [16, 6, ['oeooeco']],
    [17, 7, ['o.oEecoo']],
    [20, 8, ['oEecbo']],
    [20, 9, ['oEeecboo']],
    [20, 10, ['oEeeccbao']],
    [18, 11, ['oooQPQQRRRooo']],
    [16, 12, ['ooEEeeeecccbbbboo']],
    [15, 13, ['oEeeecccccccbbbbbao']],
    [14, 14, ['occoooo']],
    [28, 14, ['oooobao']],
    [15, 15, ['oo']],
    [32, 15, ['oo']],
  ],
  glow: ['#8e1f19', '#f77622', '#feae34', '#fee761', '#fff6d0'],
  name: 'Mage · Ashen Pyromancer',
  description: 'A mysterious ash-grey pyromancer: a wide slouched hat, centred on the head, throws the face into shadow so only two ember eyes show above a red scarf; he cups a flame before his chest, carries a caged-lantern staff, and his hem smoulders.',
};

export const VERSIONS = [A, B, C, D];

export default VERSIONS.map((v) => ({
  cls: 'mage',
  id: v.id,
  name: v.name,
  description: v.description,
  collection: 'Hero polish · October 15',
  glow: v.glow,
  def: { gen: () => [paint(v)], idle: [0], walk: [0], anchorY: 40, outline: false, selfBob: true, fitW: 36, fitH: 34 },
}));
