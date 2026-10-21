// The real game, headless, for bots: Node and no browser. Canvases are dummies
// whose 2D calls do nothing, audio never starts (it waits for a user gesture),
// and Math.random is seeded for each game, so a seed always replays the same
// game. The camera is 600×338 art pixels, as on a 1080p screen: the HUD's
// 480×270 at the world zoom of 0.8.
//   import { playGame } from './headless.mjs';
//   playGame({ bot: 'kite', hero: 'knight', mode: 's15', seed: 1 })

const noop = () => {};
const gradient = { addColorStop: noop };
const STUB = {
  createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  createPattern: () => null,
  measureText: () => ({ width: 0 }),
};
// Anything else on the context is a no-op; properties set on it stick.
const context = () => new Proxy({ ...STUB }, { get: (t, k) => (k in t ? t[k] : noop) });
globalThis.document ??= {
  createElement: () => {
    let ctx = null;
    return { width: 1, height: 1, getContext: () => (ctx ??= context()) };
  },
};

// Imported only now, so the game modules find the stubs in place.
const { buildSprites } = await import('../public/js/engine/sprites.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
const { Game } = await import('../public/js/game/game.js');
const { Driver } = await import('../public/js/bots/driver.js');
const { HEROES } = await import('../public/js/data/heroes.js');
const { MODES } = await import('../public/js/data/difficulty.js');
const P = await import('../public/js/shared/profile.js');
const { BUFFS } = await import('./buffs.mjs');

buildSprites();

// Plays one game until it ends or `max` seconds of game time pass, and
// returns how it went. bot: a spec ('circle:r=60') or a strategy object;
// armory: Armory ranks, e.g. { might: 5, armor: 3 }; diff: 'medium' (Normal) or 'hard' (Veteran);
// nightmare: twice the monsters (data/difficulty.js NIGHTMARE; never in Ranked);
// buff: a test buff in percent on top of the Armory, e.g. { damage: 10, life: 20, regen: 50, xp: 25, speed: 5 }.
export function playGame(o = {}) {
  const { hero = 'knight', mode = 's15', diff = 'hard', nightmare = false, bot = 'autopilot', params, label, pick = 'build', seed = 1, hz = 60, max = 3600, armory = {}, buff = {}, crypts = false } = o;
  if (!HEROES[hero]) throw new Error(`Unknown hero "${hero}" (${Object.keys(HEROES).join(', ')})`);
  if (!MODES[mode]) throw new Error(`Unknown mode "${mode}" (${Object.keys(MODES).join(', ')})`);
  const random = Math.random;
  Math.random = mulberry32(seed);
  try {
    const meta = P.metaBonuses(P.sanitizeProfile({ up: armory })); // ranks clamped like a real save
    for (const [k, pct] of Object.entries(buff)) {
      const [key] = BUFFS[k], x = 1 + pct / 100;
      meta[key] = (meta[key] ?? 1) * x;
    }
    const g = new Game({ hero, mode, diff, nightmare, meta, settings: {}, crypts, headless: true });
    const d = new Driver(g, { bot, params, label, pick, hz, rng: mulberry32(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995) });
    const t0 = performance.now();
    d.run(max);
    const s = d.summary();
    // What the run banks, as the server would pay it (shared/profile.js): the gold picked up,
    // clamped to what a run that long could make, times the difficulty's rate, plus a win's bonus.
    const run = P.sanitizeRun({ mode, diff: g.diffId, nightmare: g.nightmare, hero, victory: s.outcome === 'win', time: g.time, realTime: g.clock, gold: g.gold, kills: g.kills, level: s.level, floor: g.floor });
    const pay = P.runReward(run);
    return { bot: d.bot.name, pick: d.pickName, hero, mode, diff: g.diffId, nightmare: g.nightmare, seed, ...s, banked: pay.total, winBonus: pay.bonus, ms: Math.round(performance.now() - t0) };
  } finally {
    Math.random = random;
  }
}
