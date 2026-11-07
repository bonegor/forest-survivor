// A crypt lord in the same 31 x 30 native canvas as the Skeleton Archer.
// All poses share one skull, robe and staff; the bone feet step beneath the hem.
const W = 31, H = 30;

function stamp(rows, x, y, art) {
  art.forEach((line, j) => [...line].forEach((c, i) => {
    if (c !== '.' && x + i >= 0 && x + i < W && y + j >= 0 && y + j < H) rows[y + j][x + i] = c;
  }));
}

function pose(phase = -1, casting = false) {
  const rows = Array.from({ length: H }, () => Array(W).fill('.'));
  // The hood is broad at the shoulders but open around the bone face. No crown:
  // the warm, hooded mage must not be mistaken for the green-crowned Lich.
  stamp(rows, 5, 1, [
    '......qqqq......',
    '....qpppppqq....',
    '...qpjjppppqq...',
    '..qpjpppppppqq..',
    '.qpjppkkkkpppqq.',
    '.qpjpkkkkkkppqq.',
    'qpjpkkkkkkkkpqq.',
    'qpjpkkkkkkkkpqq.',
    'qpjpkkkkkkkkpqq.',
    '.qppkkkkkkkkpqq.',
    '.qpppkkkkkkppqq.',
    '..qppppkkppppqq.',
    '..qpppppppppqq..',
  ]);
  stamp(rows, 10, 5, [
    '.zzzzzzzZ.',
    'zzzzzzzzZZ',
    'zzkkkzkkkZ',
    'zzkykzkykZ',
    'zZkkkZkkkZ',
    '.zzzzkzzZZ',
    '.ZznznznZ.',
    '..ZzzzzZ..',
    '...ZZZZ...',
  ]);
  // Layered charcoal robe, narrow violet edging and a muted bronze clasp.
  stamp(rows, 5, 13, [
    '...qqKZZZZKqq...',
    '..qpKnKZZKnKpq..',
    '.qpKnKnKKKnKnpq.',
    'qpKnKnnKKnnKnpqq',
    'qpKnKnnKKnnKnpqq',
    'qpKnKnnKKnnKnpqq',
    '.qKnKnnKKnnKnpq.',
    '.qKnKnyyyKnKnpq.',
    '.qKnKnnByKnKnpq.',
    'qKnKnnKqKKnnKnpq',
    'qKnKnnKqKKnnKnpq',
    'qKnKnnKqqKnnKnpq',
    'qKnnnKqqqKnnKnpq',
    'qKKKKqq.qqKKKKpq',
  ]);
  // One continuous wooden shaft; the visible bone fingers cross it at the grip.
  stamp(rows, 25, 5, ['yB', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb', 'Bb']);
  stamp(rows, 19, 15, ['zZ......', 'zZzzzzZ.', '.ZZZZZzb', '......Bb']);
  if (!casting) stamp(rows, 7, 16, ['zZ', 'zZ', 'zZ', 'zZ', '.Z']);
  // Bone boots never detach from the robe. Alternate support, passing and reach.
  const feet = [
    ['...zZ.....zZ...', '...zZ.....zZ...', '..zzzZ...zzzZ..'],
    ['..zZ.......zZ..', '..zZ.......zZ..', '.zzzZ.....zzzZ.'],
    ['...zZ.....zZ...', '....zZ...zZ....', '....zzzZ.zzzZ..'],
    ['....zZ...zZ....', '.....zZ.zZ.....', '....zzzZzzzZ...'],
    ['....zZ...zZ....', '...zZ.....zZ...', '..zzzZ...zzzZ..'],
  ];
  stamp(rows, 7, 27, feet[phase < 0 ? 0 : phase + 1]);
  // The ember stays small while walking. Casting opens a bony palm and fans
  // the staff flame outward, readable even during the shortened wind-up.
  stamp(rows, casting ? 21 : 23, casting ? 0 : 1, casting ? [
    '...o..o..',
    '..oy.o...',
    '.oyYyoo..',
    'oyYffYyo.',
    '.yYffYyo.',
    '..yYYyo..',
    '...yy....',
  ] : [
    '..o....',
    '.oyo...',
    '.yYyo..',
    'oyfYyo.',
    '.yYyo..',
    '..y....',
  ]);
  // The free left arm bends at its own elbow and crosses the chest toward the
  // open palm. The separate right forearm remains attached to the staff grip.
  if (casting) stamp(rows, 7, 11, [
    '.............z.z...',
    '............zzzzz..',
    '...........zzZZZ...',
    '.........zzZZ......',
    'zZ.....zzZZ........',
    'zZ...zzZZ..........',
    '.zZzzZZ............',
    '..ZZZZ.............',
  ]);
  return rows.map(row => row.join(''));
}

export const SKELETON_MAGE_ART = {
  emissive: 'yYfox',
  idle: [0],
  walk: [1, 2, 3, 4],
  motionRate: 2, // Four poses retain the Archer's two-pose full-cycle duration.
  attack: [5],
  body: [18, 27],
  frames: [pose(), pose(0), pose(1), pose(2), pose(3), pose(-1, true)],
};
