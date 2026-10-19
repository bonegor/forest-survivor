// The ultimate as a moment. Real seconds.
//   launch: the press spends the fury at once (it can't be doubled); the world stops for `stop` (the
//   hero and the HUD go on), the screen dims round a light on him and a cut-in slides across with his
//   menu pose and the ultimate's name; at `stop` the ultimate itself begins; the cut-in is gone by `dur`.
//   live: "×37" beside the orb counts the ultimate's own kills while it lasts (Army of the Dead: while
//   its knights stand).
//   receipt: as it ends, one line in the banner style for RECEIPT s, "WHIRLWIND · 143 slain · 12.4K
//   damage", BEST when it beats the run's best ultimate (by kills, then damage).
//   comet: a fury orb picked up flies from the hero to the HUD orb in COMET s; the orb's fill rises as
//   it lands (the fury is his at once).
export const ULT_LAUNCH = { stop: 0.2, dur: 0.6, slideIn: 0.15, slideOut: 0.45 };
export const RECEIPT = 1.5;
export const COMET = 0.4;

// 12 400 → "12.4K", 980 → "980".
export function compact(n) {
  n = Math.round(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
}

// Whether a blow (Game.hitEnemy's options) is the ultimate's own: Whirlwind, Arrow Storm, Cataclysm's
// meteors and the Army's knights (o.ult), Shadow Dance's blades (o.noFury).
export const ultBlow = (o) => !!(o && (o.ult || o.noFury));
