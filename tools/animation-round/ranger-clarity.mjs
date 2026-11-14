// Preserve the selected Hunter's native 3/4 head, hair and modest proportions.
// Tighten the original auburn clusters, then describe a face inside its existing
// silhouette. The earlier replacement enlarged the skull and removed its jaw.
const FACE = [
  '....',
  '.hk.',
  '...t',
  '..sj',
  '.stj',
];
const RGB = {
  k: [80, 67, 42], h: [124, 62, 40], j: [151, 88, 64],
  s: [198, 132, 95], t: [245, 180, 131],
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
  // Existing contour and moving locks remain intact. Collapse near-equal tones
  // only in the crown: no black rectangular border or new opaque outer pixels.
  const hair = [[57,23,30],[104,34,31],[157,57,32],[194,80,37],[231,119,55]].map(nearest);
  for (let y=skull.y+2;y<skull.y+7;y++) for(let x=skull.x+1;x<skull.x+13;x++) {
    const p=y*frame.w+x,c=d[p],r=c&255,g=c>>>8&255,b=c>>>16&255;
    if(c>>>24<200||r<40||r<g*1.5||g>b*2.4)continue;
    d[p]=hair.reduce((a,q)=>Math.abs((q&255)-r)<Math.abs((a&255)-r)?q:a,hair[0]);
  }
  FACE.forEach((row, yy) => [...row].forEach((key, xx) => {
    if (key !== '.') d[(skull.y+6+yy)*frame.w+skull.x+7+xx]=colors[key];
  }));
  return { ...frame, d };
}
