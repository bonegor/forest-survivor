// Native repair of the selected Hunter's downsampled head. The old face was
// only a soft, unbroken skin patch. Keep her auburn hair and green leather, but
// draw a distinct brow, visible eye, nose, cheek and chin in coarse clusters.
// Every pose is registered from its own original skull, before animation and
// moving-attack composition. No upper-body scaling or gait changes.
const HEAD = [
  '....kkkkkk....',
  '..kkhbooobhk..',
  '.khboobbboohk.',
  '.hboobbbbhhhk.',
  'khbbbhjstTThk.',
  'hbbbhjshhhTtk.',
  'hbbbhjstweTtk.',
  'hbbbhjssTTTtTk',
  '.hbbhhjssttkk.',
  '.hbbbhhjsjk...',
  '..hbbhhjsk....',
  '...hhkgggk....',
];
const RGB = {
  k: [35, 15, 26], h: [104, 33, 30], b: [161, 62, 30], o: [218, 105, 52],
  j: [143, 76, 61], s: [193, 112, 86], t: [251, 176, 135], T: [253, 198, 152],
  w: [255, 240, 199], e: [35, 25, 34], g: [70, 85, 45],
};

export function rangerClarity(frame, palette) {
  const d = frame.d.slice(), solid = palette.filter(c => c >>> 24 >= 240);
  const nearest = rgb => solid.reduce((best, c) => {
    const score = q => rgb.reduce((sum, v, i) => sum + (v - (q >>> (i * 8) & 255)) ** 2, 0);
    return score(c) < score(best) ? c : best;
  }, solid[0]);
  const colors = Object.fromEntries(Object.entries(RGB).map(([key, rgb]) => [key, nearest(rgb)]));
  let skull = null;
  for (let y = 22; y <= 34 && !skull; y++) {
    const xs = [];
    for (let x = 32; x <= 46; x++) {
      const c = d[y * frame.w + x], r = c & 255, g = c >>> 8 & 255;
      if (c >>> 24 >= 200 && r > 45 && r > g * 1.6) xs.push(x);
    }
    if (xs.length >= 5) skull = { x: Math.round(xs.reduce((n, x) => n + x, 0) / xs.length) - 7, y: y - 2 };
  }
  if (!skull) throw Error('Ranger head registration missing');
  // Clear only the old skull/face. Rear hair below/behind it remains original,
  // as do the collar, shoulders, hands, bow and every lower-body pixel.
  for (let y = skull.y; y < skull.y + HEAD.length; y++) for (let x = skull.x; x < skull.x + 14; x++) d[y * frame.w + x] = 0;
  HEAD.forEach((row, yy) => [...row].forEach((key, xx) => {
    if (key !== '.') d[(skull.y + yy) * frame.w + skull.x + xx] = colors[key];
  }));
  return { ...frame, d };
}
