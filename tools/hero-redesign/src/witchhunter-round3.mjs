// Round 3 Witch Hunter: two-handed steel crossbow, waxed leather and a
// broad slouch hat. Both hands belong to the crossbow; the blade stays sheathed.
function crossbow(c, p, rear, support, hand) {
  const stage = p.attack;
  const recoil = stage === 3 ? -1 : 0;
  const lift = stage === null ? 1 : [2, 1, 0, 0, 1, 2][stage];
  const y = 25 + p.bob + lift, x = 39 + recoil;
  const drawn = stage === 0 ? 4 : stage === 1 ? 7 : stage === 4 ? 2 : 6;
  // Transverse steel bow: the tips bend back toward its user. The dark
  // silhouette remains one continuous bow around the lighter inside edge.
  const upper = [[x - 3, y - 7], [x + 1, y - 4], [x + 3, y]];
  const lower = [[x + 3, y], [x + 1, y + 4], [x - 3, y + 7]];
  for (const points of [upper, lower]) {
    c.line(points[0], points[1], 'k', 3);
    c.line(points[1], points[2], 'k', 3);
    c.line(points[0], points[1], 'N');
    c.line(points[1], points[2], 'G');
  }
  // The string visibly joins both tips and the latch on the stock.
  const latch = stage === 3 || stage === 4 ? x + 1 : x - drawn;
  c.line([x - 3, y - 7], [latch, y], 'Z');
  c.line([latch, y], [x - 3, y + 7], 'Z');
  // Wooden stock, steel rail and a bronze retaining band. Butt sits at
  // the rear hand, with the support hand under the forestock.
  c.shape([[x - 12, y - 1], [x + 6, y - 1], [x + 6, y + 2], [x - 7, y + 2], [x - 9, y + 5], [x - 12, y + 4]], 'b', 'B');
  c.line([x - 9, y], [x + 5, y], 'g');
  c.line([x - 2, y], [x - 2, y + 2], 'D');
  c.line([x - 9, y + 2], [x - 8, y + 3], 'k');
  if (stage === null || stage < 3 || stage === 5) {
    c.line([x - 8, y - 1], [x + 7, y - 1], 'T');
    c.rows(x + 6, y - 2, 'g.\nGg\ng.');
    c.rows(x - 8, y - 2, 'Z.\n.Z\nZ.');
  } else if (stage === 3) {
    // A departing bolt, never a firearm muzzle flash.
    c.line([x + 6, y - 1], [x + 10, y - 1], 'T');
    c.dot(x + 10, y - 2, 'g');
  }
  hand(c, ...rear, true);
  hand(c, ...support, true);
}

export function drawWitchHunter(c, p, { lower, hand }) {
  const b = p.bob;
  // Tucked storm cape, with a broad dark leather plane rather than blue armor.
  const trail = p.walk === null ? 0 : Math.round(Math.sin(p.phase));
  c.shape([[21, 20 + b], [15, 22 + b], [10 + trail, 36], [15, 38], [20, 33], [24, 27 + b]], 'm', 'b');
  c.poly([[16, 24 + b], [12 + trail, 35], [17, 33], [20, 26 + b]], 'b');
  lower(c, p, { wide: 7, cloth: 'b', metal: 'B' });
  c.rows(15, 18 + b,
    '.....kkkkkkkkkk.....\n' +
    '....kbBBBbbBBBbk....\n' +
    '...kbBBbbTTbbBBbk...\n' +
    '..kbBBbmmTTmmbBBbk..\n' +
    '.kbBBbbmmTRmmbbBBbk.\n' +
    'kbBBbbbmmTRmmbbbBBbk\n' +
    '.kkBbbmmmTRmmmbBkk..\n' +
    '...kbCCCCHHHHHbk....\n' +
    '...kbbmmmTRmmmbk....\n' +
    '..kbbbmmmTRmmmbbk...\n' +
    '.kbbbBmmmTRmmmBbbk..\n' +
    'kbbBBbmmmTRmmmbBBbk.\n' +
    'kbBBbbmmmTRmmmbbBBk.\n' +
    '.kkbbmmmmTRmmmmbbk..\n' +
    '..kkkkkk...kkkkkk...');
  // The collar encloses a visible jaw instead of separating the head.
  c.rows(21, 15 + b, 'kbBk..kBbk\nkBBbSSbBBk\n.kBbTTbBk.\n..kBBBBk..');
  c.rows(22, 10 + b,
    '..kkkkkk..\n' +
    '.kbTTTSbk.\n' +
    '.kTSkTSSbk\n' +
    '.kTTSSSTbk\n' +
    '..kbSbbk..\n' +
    '..kbmbbk..\n' +
    '...kkk....');
  // Wide brim, unbroken front edge, worn highlight and one restrained feather.
  c.rows(17, 4 + b,
    '......kkkkk.....\n' +
    '.....kbBBbkk....\n' +
    '....kbBBbbbkk...\n' +
    '....kbBbbbbmk...\n' +
    '...kbDDCCHbbmk..\n' +
    '...kbDHYHHbbmk..\n' +
    '..kkkkkkkkkkkk..\n' +
    '.kBbbBBbbbbbbbmk\n' +
    'kBBBBbbbbbbbbmmk\n' +
    '.kkkkkkkkkkkkkk.');
  c.line([20, 8 + b], [18, 5 + b], 'R', 2);
  c.dot(18, 4 + b, 'r');
  // A sheathed silver blade hangs from the belt, not from a third hand.
  c.line([20, 31 + b], [14, 40], 'k', 3);
  c.line([20, 31 + b], [14, 40], 'n');
  c.line([18, 31 + b], [21, 33 + b], 'D');
  const stage = p.attack;
  const lift = stage === null ? 1 : [2, 1, 0, 0, 1, 2][stage];
  const recoil = stage === 3 ? -1 : 0;
  const rear = [30 + recoil, 28 + b + lift];
  const support = [37 + recoil, 28 + b + lift];
  // Both complete arms meet visible, separate grips. The rear arm crosses
  // the chest; the front arm supports the heavy steel bow under its rail.
  c.limb([20, 23 + b], [24, 28 + b], rear, 'b', 'B', 3);
  c.limb([31, 22 + b], [34, 26 + b], support, 'b', 'B', 3);
  crossbow(c, p, rear, support, hand);
}
