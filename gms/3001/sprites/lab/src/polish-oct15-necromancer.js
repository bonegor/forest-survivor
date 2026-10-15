// Hero polish, 15 October 2026: five standing proposals for Morvath, the necromancer, drawn to
// match the plumed knight (warm dark ink, hard colour clusters, short hue-shifted ramps, light from
// the upper left). Each is a single 48x48 frame facing right, feet on row 39 (anchorY 40), with
// its own 1 px dark contour (outline: false). The review that led to them, and what each one
// changes, is in polish-oct15-necromancer-review.md beside this file.
//
// Every version is hand-placed rows of palette letters, stamped back to front. Each palette is a
// named object below (also exported as PALETTES, with the draw functions as DRAW, so a tool can
// redraw a version in tuned colours: DRAW['polish-a']({ ...PALETTES['polish-a'], 3: '#...' })).
// Shared letters: o ink; a b c d bone, dark to light; f g h i soul fire, dark to white-hot (h and
// i glow); w x wood or leather. Digits are each version's main cloth or metal ramp, 1 darkest;
// the other letters (brass, gold, wine, charcoal, iron) are listed above each palette.
import { makeBuf, hexPack } from '../../../../../public/js/engine/pixels.js';

// A 48x48 buffer and a stamp: rows(x, y, ['..ab', ...]) puts each letter's colour, '.' is clear.
function canvas(PAL) {
  const buf = makeBuf(48, 48);
  const pal = Object.fromEntries(Object.entries(PAL).map(([k, c]) => [k, hexPack(c)]));
  const put = (x, y, c) => {
    if (c === '.') return;
    if (x < 0 || x >= 48 || y < 0 || y >= 48) throw new Error(`pixel outside the cell at ${x},${y}`);
    if (!(c in pal)) throw new Error(`unknown colour ${c} at ${x},${y}`);
    buf.d[y * 48 + x] = pal[c];
  };
  const rows = (x, y, list) => list.forEach((r, j) => [...r].forEach((c, i) => put(x + i, y + j, c)));
  return { buf, put, rows };
}

// A · Gravecaller: violet cloth 1-6, bone, soul fire, dark wood.
const A = {
  o: '#191420',
  1: '#2a1b45', 2: '#3c2860', 3: '#573687', 4: '#7650ad', 5: '#ad86df', 6: '#d9bdf9',
  f: '#1b4a3b', g: '#3d9150', h: '#9ee562', i: '#effcc4',
  a: '#4f444b', b: '#8e8278', c: '#c8bb9b', d: '#ece3c7',
  w: '#2e2222', x: '#553a31', y: '#80583f',
};

function gravecaller(PAL = A) {
  const p = canvas(PAL), { rows } = p;
  // Staff shaft, planted ahead of the front foot.
  rows(33, 13, Array(26).fill('oxwo'));
  rows(34, 39, ['oo']);
  // Cloak trailing behind from under the mantle, torn at the back, its green lining turned out.
  rows(9, 19, [
    '...o444',
    '..o5444',
    '..o4433',
    '.o44333',
    '.o43333',
    '.o43322',
    '.o43322',
    'o433222',
    'o433222',
    'o433222',
    'o433222',
    'o433222',
    'o432221',
    'og32211',
    'ofo32o.',
    'oo.oo..',
  ]);
  // Robe: a belted waist, the skirt flaring to the hem with one deep fold, the slit's green
  // lining opening over the front boot.
  rows(12, 21, [
    '....o43332222221o',
    '....o43332222221o',
    '....o43332222221o',
    '....o43332222221o',
    '....oyyyyxxdcxxxo',
    '...o4333332222221o',
    '...o4333321322221o',
    '...o4333321323f21o',
    '...o4333321323f21o',
    '..o43333213223gf2o',
    '..o43333213223gf2o',
    '..o43333213223gf21o',
    '..o43332132223gf21o',
    '.o433332132223gf21o',
    '.o4333321322223ggf2o',
    '.o4333213222223ggf2o',
    'o43333213222223ggf2o',
    'o32111111111111o432o.',
    'oooooooooooooooooooo.',
  ]);
  // Mantle over the shoulders, lit on the back shoulder.
  rows(12, 17, [
    '...o54433333333222o.',
    '..o5544333333332221o',
    '.o55544333333322221o',
    '.o45443333333222211o',
    '.o44433333322222111o',
    '.o3433322222221111o.',
    '.o32oooooooooooooo..',
    '..oo................',
  ]);
  // Hood: a peak swept back, a forward brim, the face in shadow; green eyes light the cheekbones.
  rows(16, 6, [
    '....oo.........',
    '...o65o........',
    '..o5654o.......',
    '..o55644o......',
    '.o5555443oo....',
    '.o455444433oo..',
    'o445444333334o.',
    'o3444332111125o',
    'o3443321oooooo.',
    'o3343221ohioho.',
    'o2332211offofo.',
    'o2222111obco...',
    '.o22111ooo.....',
  ]);
  // Front arm: a bell sleeve drooping under the forearm, a bone hand round the shaft.
  rows(28, 22, [
    'ooooo.ooo.',
    'o5443ocdco',
    'o4332obcbo',
    '.o221ooooo',
    '.o211o....',
    '..211o....',
    '..ooo.....',
  ]);
  // Staff head: soul flame rising out of a skull.
  rows(30, 2, [
    '....f....',
    '...fhf...',
    '...fihf..',
    '..fhiif..',
    '..fhihf..',
    '.oddddco.',
    'oddcccbbo',
    'ocohcohao',
    'oboobooao',
    '.ocbobao.',
    '..ocdco..',
  ]);
  return p.buf;
}

// B · Bone Tyrant: lilac-black plate 1-5, wine cloth r s t u, bone, soul fire, wood.
const B = {
  o: '#1a1018',
  1: '#1e1d24', 2: '#37343f', 3: '#4f4b59', 4: '#726d7e', 5: '#a9a3b4',
  r: '#3d1426', s: '#5e1d35', t: '#84284a', u: '#a83d5c',
  a: '#4d4048', b: '#8f8077', c: '#cbbc9c', d: '#efe6ca',
  f: '#1b4a3b', g: '#3d9150', h: '#9ee562', i: '#effcc4',
  w: '#2e2222', x: '#553a31', y: '#80583f',
};

function boneTyrant(PAL = B) {
  const p = canvas(PAL), { rows } = p;
  // Wine cape behind, its lit edge on the left, a torn hem.
  rows(11, 19, [
    '.....ooo',
    '....ouuso',
    '...outtsso',
    '...outtsso',
    '..outtssso',
    '..outtssso',
    '..outtssso',
    '..outtssro',
    '.outtssrro',
    '.outtssrro',
    '.outtssrro',
    '.outtssrro',
    '.outtssrro',
    'outtssrrro',
    'outtssrrro',
    'outtssrrro',
    'outssrrrro',
    'ousorrrrro',
    'oso.orrrro',
    'oo...ooooo',
  ]);
  // Staff shaft.
  rows(35, 11, Array(28).fill('oxwo'));
  rows(36, 39, ['oo']);
  // Greaves, a wide stance; lit on the left of each leg, knee plates catching the light.
  rows(17, 29, [
    '.o43o.....o54o',
    '.o43o.....o54o',
    '.o43o.....o53o',
    '.o43o.....o53o',
    '.o43o.....o43o',
    '.o32o.....o43o',
    'o5443o...o5543o',
    'o4332o...o4332o',
    '.o43o.....o53o.',
    'o4332o...o54333o',
    'oooooo...ooooooo',
  ]);
  // Wine tabard from the belt, tapering between the legs.
  rows(19, 28, [
    'ouuttssro',
    'ouuttssro',
    'outtssrro',
    '.outtsro.',
    '.outtsro.',
    '..otsro..',
    '..otsro..',
    '...oro...',
    '....o....',
  ]);
  // Ribcage cuirass: a sternum and three ribs a side over a dark tunic, a belt of bone plaques.
  rows(17, 18, [
    '..oooooooooo.',
    '.o443dc33221o',
    '.o4ddcdcbb21o',
    '.o33oodcoo21o',
    '.o4ddcdcbba1o',
    '.o33oodcoo21o',
    '.o3ccbdcba21o',
    '.o3332cb2221o',
    '.o3322222211o',
    'odcddcccbbbbao',
    'oooooooooooooo',
  ]);
  // Back pauldron: an iron shell with bone spikes.
  rows(11, 14, [
    '..o......',
    '.odo.o...',
    '.ocoodo..',
    '.obooco..',
    'o455444o.',
    'o4443332o',
    'o3333222o',
    '.o22221o.',
    '..ooooo..',
  ]);
  // Head: an iron helm over a skull face, green eyes deep in the sockets.
  rows(19, 8, [
    '...ooooo....',
    '..o45543o...',
    '.o455443o...',
    '.o44443333o.',
    'o3443ooooooo',
    'o3333odddcbo',
    'o2333ooodooo',
    'o2333ohocoho',
    'o2222odcocbo',
    '.o222ococobo',
    '..oooooobbbo',
    '.......ooo..',
  ]);
  // Two bone horns curving up off the sides of the helm.
  rows(15, 3, [
    '..o...',
    '.odo..',
    'oddo..',
    'odco..',
    'odcbo.',
    '.odcbo',
    '..ocbo',
    '...oo.',
  ]);
  rows(26, 4, [
    '....o.',
    '...odo',
    '...oco',
    '..ocbo',
    '.ocbo.',
    '.bbo..',
    '.o....',
  ]);
  // Front pauldron: the same iron shell, left plain so it stays clear of the jaw and the staff.
  rows(25, 17, [
    '..oooo..',
    '.o5544o.',
    'o544332o',
    'o433222o',
    '.o2221o.',
    '..oooo..',
  ]);
  // Front arm in an iron vambrace, a bone fist on the staff.
  rows(28, 22, [
    'o44o......',
    'o433o.....',
    '.o4332oooo',
    '.o33322ocdo',
    '..o3221obco',
    '...ooooooo.',
  ]);
  // Staff head: two bone prongs cradling a green soul orb.
  rows(33, 3, [
    '.o....o.',
    'odo..odo',
    'oco..oco',
    'ocoffobo',
    'ocfhifbo',
    'ocfhhfbo',
    '.ocffco.',
    '..ocbo..',
  ]);
  return p.buf;
}

// C · Grave Warden: teal coat 1-5, charcoal hat and capelet j k l m n, bone, soul fire,
// leather w x, brass y z.
const C = {
  o: '#16131b',
  1: '#152826', 2: '#22403c', 3: '#2f5751', 4: '#41766e', 5: '#6fa498',
  a: '#4d4048', b: '#8f8077', c: '#cbbc9c', d: '#efe6ca',
  f: '#1b4a3b', g: '#3d9150', h: '#9ee562', i: '#effcc4',
  w: '#2e2222', x: '#553a31', y: '#7a5a2e', z: '#c09a4e',
  j: '#1c1a21', k: '#2e2a35', l: '#433e4c', m: '#5e5767', n: '#8d859a',
};

function graveWarden(PAL = C) {
  const p = canvas(PAL), { rows } = p;
  // Crook and lantern pole, planted ahead of the front foot.
  rows(34, 8, Array(31).fill('oxwo'));
  rows(35, 39, ['oo']);
  // Long coat: fitted at the belt (a brass buckle and a skull charm), the tails flaring behind
  // with one fold, open at the front down to the hem; two boots in a stance.
  rows(13, 21, [
    '...o44333322221o....',
    '...o44333322221o....',
    '...o44333322221o....',
    '...o44333322221o....',
    '...oxyxxxzyxxxxo....',
    '..o544333321cdc1o...',
    '..o544333321oco1o...',
    '..o544333321bcb1o...',
    '..o5443333213221o...',
    '.o54433333c132221o..',
    '.o544333332132221o..',
    '.o544233332132221o..',
    '.o54233333c132221o..',
    'o54423333321322221o.',
    'o54233333321322221o.',
    'o54233333321322221o.',
    'o3322222211o221111o.',
    '...owwxo...owxxxyo..',
    '...ooooo...ooooooo..',
  ]);
  // Black feathered capelet over the shoulders, and a high collar.
  rows(14, 15, [
    '.....ollllo.....',
    '...oomllllkoo...',
    '..ommnmlllkkkjo.',
    '.omnnmmlllkkkkjo',
    'ommnmmlllkkkkjjo',
    'ommmllllkkkkkjo.',
    'ollolllokkkjojo.',
    'oo.ooo.oooo.oo..',
  ]);
  // Front arm and gloved hand on the pole.
  rows(27, 21, [
    'o33o.......',
    'o432oo.....',
    '.o4321oo...',
    '.o322111xxo',
    '..oo11oxwxo',
    '....oo.ooo.',
  ]);
  // Bird-skull mask under the brim, a green lens, the beak curving down.
  rows(19, 9, [
    'ojjjjjjjjo......',
    'ojkkkcdcco......',
    'ojkcddoocdoo....',
    'ojkcdohioccdoo..',
    'ojkcddooccccdo..',
    'ojjkcddccbbbbo..',
    '.ojjcbbbaoooo...',
    '..ojabaao.......',
    '...oooo.........',
  ]);
  // Black wide-brimmed hat with a brass buckle.
  rows(14, 3, [
    '......oooooooo.....',
    '.....ommnnmlllo....',
    '.....omnnmmllko....',
    '.....ommnmllkko....',
    '.....ojyzjjjjjo....',
    '.oooomnnmmmllllooo..',
    'omnnmmmmmllllllkko.',
    'ollkkkkkjjjjjjjjo..',
    '.ooooooo.....ooo...',
  ]);
  // Crook top and the hanging lantern of soul fire.
  rows(33, 3, [
    '...oooo....',
    '..oxyyyo...',
    '.oxooooxo..',
    '.oxo...oxo.',
    '.oxo....o..',
    '.......oyo.',
    '......oyzyo',
    '......ohiho',
    '......ohiho',
    '......oghgo',
    '......oyzyo',
    '.......ooo.',
  ]);
  return p.buf;
}

// D · Soulflame: midnight-navy cloth 1-5, bone, soul fire, wood, gold y z.
const D = {
  o: '#120f17',
  1: '#151827', 2: '#20253a', 3: '#2e3653', 4: '#465275', 5: '#6a789f',
  a: '#4d4048', b: '#8f8077', c: '#cbbc9c', d: '#efe6ca',
  f: '#1b4a3b', g: '#3d9150', h: '#9ee562', i: '#effcc4',
  w: '#2e2222', x: '#553a31', y: '#8c6a2f', z: '#d1a548',
};

function soulflame(PAL = D) {
  const p = canvas(PAL), { rows } = p;
  // Staff shaft.
  rows(33, 7, Array(32).fill('oxwo'));
  rows(34, 39, ['oo']);
  // Robe: a belt of vertebrae, the front flap's gold edge running down to a gold hem, bone feet
  // beneath.
  rows(13, 20, [
    '....o433322221o....',
    '....o433322221o....',
    '....o433322221o....',
    '....o433322221o....',
    '....o433322221o....',
    '....occbccbccbo....',
    '...o433332z2211o...',
    '...o433332z2211o...',
    '...o4333322z211o...',
    '...o4333322z211o...',
    '..o44333322z2111o..',
    '..o443333222z111o..',
    '..o443333222z111o..',
    '.o4433333222z1111o.',
    '.o4433333222z1111o.',
    '.o44333332222z111o.',
    '.o44333332222z111o.',
    'oyzyyzyyyyzyyyzyyyo',
    '.oooobcoooobccdooo.',
    '....oooo..oooooo...',
  ]);
  // Mantle over the shoulders, a gold clasp at the throat and a gold-trimmed hem.
  rows(13, 16, [
    '......oooooo......',
    '....oo433322oo....',
    '..oo4543332221oo..',
    '.o4554333zy222211o',
    'o44543333yy2222111o',
    'o44433333322222211o',
    'oyzyyzyyzyyzyyzyyyo',
    '.ooooooooooooooooo.',
  ]);
  // Front arm, a bone hand on the staff.
  rows(26, 21, [
    'o33o......',
    'o4322o....',
    '.o432221oo',
    '..o32221obo',
    '...ooooocdo',
    '.......obco',
    '........oo.',
  ]);
  // Skull, lit from the top left, green eyes in the sockets.
  rows(20, 10, [
    '..ooooo..',
    '.oddddco.',
    'oddddccbo',
    'ocdoocooo',
    'occohcoho',
    'obcccocbo',
    '.obododo.',
    '..obcbco.',
    '...oooo..',
  ]);
  // Soul fire engulfing the crown: three tongues leaning back, white-hot at the root.
  rows(14, 2, [
    '..f...........',
    '..fg.....f....',
    '...fg....fg...',
    '...fhg...fhg..',
    '...fhgf.fghg.f',
    '....fhgfghihfgf',
    '....fhihhiihghgf',
    '.....fhiiiihhgf',
    '.....fghiiiihgf',
    '......fghhhhgf.',
  ]);
  // Sickle head on the staff.
  rows(32, 2, [
    '...ooo....',
    '..ocdcoo..',
    '.oxocddco.',
    '.oxo.oocdo',
    '.oxo...odo',
    '.........o',
  ]);
  return p.buf;
}

// E · Blood Lich Reforged: blood-wine cloth 1-5, black iron crown k l m, bone, soul fire, wood.
const E = {
  o: '#1a0f16',
  1: '#2b0f1a', 2: '#401528', 3: '#5c1f37', 4: '#7d2c4a', 5: '#a3405f',
  k: '#25222c', l: '#3f3a48', m: '#6a6275',
  a: '#4d4048', b: '#8f8077', c: '#cbbc9c', d: '#efe6ca',
  f: '#1b4a3b', g: '#3d9150', h: '#9ee562', i: '#effcc4',
  w: '#2e2222', x: '#553a31',
};

function bloodLich(PAL = E) {
  const p = canvas(PAL), { rows } = p;
  // Staff in the back hand, planted behind the heel; a small horned skull on top, its sockets dark.
  rows(10, 9, Array(30).fill('oxwo'));
  rows(11, 39, ['oo']);
  rows(8, 3, [
    '.o....o.',
    'odooooco',
    'odddccbo',
    'ocoocoao',
    'obooboao',
    '.ocbcbo.',
  ]);
  // Robe: blood-wine, a bone belt, one deep fold, the hem clean above two boots.
  rows(15, 19, [
    '...o44333322o...',
    '..o544333322o...',
    '..o544333322o...',
    '..o544333322o...',
    '..o54433332o....',
    '..o54433332o....',
    '..o54433332o....',
    '..ocdcddcbbo....',
    '..o5443332221o..',
    '..o5443332221o..',
    '..o5443321221o..',
    '.o54433321221o..',
    '.o544332132211o.',
    '.o544332132211o.',
    'o5443321322211o.',
    'o5443321322211o.',
    'o54433213222111o',
    'o54432133222111o',
    'o43321111111111o',
    'oooowxooooowxxoo',
    '...oooo...ooooo.',
  ]);
  // Cowl: the hood down, bunched behind the skull and over the shoulders.
  rows(15, 9, [
    '...oo..........',
    '..o43o.........',
    '.o4433o........',
    '.o4432o........',
    'o44332o........',
    'o54322o........',
    'o54321o........',
    'o5432211ooooo..',
    'o54433222222o..',
    'o443333322221o.',
    '.o43333322221o.',
    '..ooooooooooo..',
  ]);
  // Crowned skull in three-quarter view: a black iron crown with three spikes and a soul gem.
  rows(20, 3, [
    '.o..o..o.',
    'omoomoomo',
    'omlomloko',
    'ollhllllo',
    'ooooooooo',
  ]);
  rows(20, 8, [
    'oddddccbo',
    'ocddddcbbo',
    'ocdoocooo.',
    'obcohcoho.',
    'obcccoco..',
    '.obcocoo..',
    '..odcdo...',
    '...ooo....',
  ]);
  // Back hand gripping the staff.
  rows(10, 21, ['ooooooo', 'ocdc443', 'obcb332', 'ooooooo']);
  // Front forearm reaching to the open grimoire.
  rows(26, 19, [
    'o43o...',
    'o433o..',
    '.o332o.',
    '..o321o',
  ]);
  // The grimoire open at the waist, lines on its pages, green soul fire rising out of its gutter.
  rows(30, 16, [
    '..f..',
    '.fhf.',
    '.fihf',
    'fhiif',
    'fghgf',
    '.fgf.',
  ]);
  rows(28, 21, [
    'oo..o..oo',
    'odcoooocdo',
    'ocbcocbcdo',
    'odcdodcdco',
    'o43344334o',
    '.oooooooo.',
  ]);
  return p.buf;
}

const model = (gen) => ({ gen: () => [gen()], idle: [0], walk: [0], anchorY: 40, outline: false, selfBob: true, fitW: 36, fitH: 34 });
const COLLECTION = 'Hero polish · October 15';

export const PALETTES = { 'polish-a': A, 'polish-b': B, 'polish-c': C, 'polish-d': D, 'polish-e': E };
export const DRAW = { 'polish-a': gravecaller, 'polish-b': boneTyrant, 'polish-c': graveWarden, 'polish-d': soulflame, 'polish-e': bloodLich };

export default [
  {
    cls: 'necromancer', id: 'polish-a', name: 'Necromancer · Gravecaller', collection: COLLECTION,
    description: 'A violet hood with a swept-back peak and a forward brim hides the face but for two green eyes and a glint of jaw; a ragged mantle, a cloak trailing behind with its green lining turned out at the tears, and a bell sleeve reaching to a skull staff crowned with soul fire. Fixes the box skull, the floating pauldrons, the cake-like grimoire and the comb hem with one clean silhouette lit from the upper left, its glow kept at the face and the staff.',
    glow: ['#9ee562', '#effcc4'],
    def: model(gravecaller),
  },
  {
    cls: 'necromancer', id: 'polish-b', name: 'Necromancer · Bone Tyrant', collection: COLLECTION,
    description: 'A death lord in lilac-black plate: bone horns off an iron helm over a skull face with green eyes, spiked pauldrons, a ribcage cuirass, a wine cape and tabard over a wide armoured stance, and a staff whose bone prongs cradle a soul orb. Bone appears only as sharp accents on dark armour, so he reads as the master of the skeletons rather than one of them.',
    glow: ['#9ee562', '#effcc4'],
    def: model(boneTyrant),
  },
  {
    cls: 'necromancer', id: 'polish-c', name: 'Necromancer · Grave Warden', collection: COLLECTION,
    description: 'A plague-doctor gravekeeper: a black wide-brimmed hat and feathered capelet frame a bird-skull mask with a green lens, over a teal coat with bone buttons and a skull charm, and a crook from which hangs a lantern of soul fire. The most distinctive silhouette of the set, with the lantern as its focal glow and no shape shared with any monster.',
    glow: ['#9ee562', '#effcc4'],
    def: model(graveWarden),
  },
  {
    cls: 'necromancer', id: 'polish-d', name: 'Necromancer · Soulflame', collection: COLLECTION,
    description: 'A lich whose bare skull burns with green soul fire, three tongues streaming back like the knight’s plume, in midnight-navy robes with a gold-trimmed mantle, a gold-edged front flap and hem, a belt of vertebrae, bone feet and a sickle-headed staff. The fire is the focal point and still reads at 1x, and at night it glows on its own.',
    glow: ['#9ee562', '#effcc4'],
    def: model(soulflame),
  },
  {
    cls: 'necromancer', id: 'polish-e', name: 'Necromancer · Blood Lich Reforged', collection: COLLECTION,
    description: 'The Blood Lich in the game now, with its weirdness fixed: a rounded three-quarter skull under a black iron crown with a soul gem, the cowl draped behind the head, blood-wine robes deeper than the knight’s red, a staff gripped by a visible hand, and an open grimoire whose green fire rises from its gutter. The closest of the five to what ships today.',
    glow: ['#9ee562', '#effcc4'],
    def: model(bloodLich),
  },
];
