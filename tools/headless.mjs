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
const { MAPS } = await import('../public/js/data/maps.js');
const P = await import('../public/js/shared/profile.js');
const { BUFFS } = await import('./buffs.mjs');

buildSprites();

// Plays one game until it ends or `max` seconds of game time pass, and
// returns how it went. bot: a spec ('circle:r=60') or a strategy object;
// armory: Armory ranks, e.g. { might: 5, armor: 3 }; diff: 'easy' (Normal), 'medium' (Veteran) or 'hard' (Elite);
// nightmare: three times the monsters (data/difficulty.js NIGHTMARE; never in Ranked);
// buff: a test buff in percent on top of the Armory, e.g. { damage: 10, life: 20, regen: 50, xp: 25, speed: 5 };
// slots, relics: fewer weapon and relic slots than the game's six (or than the profile's);
// map: a Survival map id. With a profile, defaults to its newest unlocked map (a fresh save's
// desert); without one, the forest as before. Explicit locked or unknown maps are rejected.
// profile: play as this save (shared/profile.js): its Armory (armory is then ignored), its weapon
// and relic slots, its rerolls and banishes, and only the weapons, relics and ultimate it has
// opened (openFor). Without one, everything is open, with six slots of each and the two free
// rerolls and banishes every run had before progression (21 October 2026), as the bots always played.
// The result's `report` is the run as the game would report it, for P.applyRun.
export function playGame(o = {}) {
  const { hero = 'knight', mode = 's15', map, diff = 'hard', nightmare = false, bot = 'autopilot', params, label, pick = 'build', seed = 1, hz = 60, max = 3600, armory = {}, buff = {}, slots, relics, crypts = false, profile = null } = o;
  if (!HEROES[hero]) throw new Error(`Unknown hero "${hero}" (${Object.keys(HEROES).join(', ')})`);
  if (!MODES[mode]) throw new Error(`Unknown mode "${mode}" (${Object.keys(MODES).join(', ')})`);
  if (map !== undefined && !Object.hasOwn(MAPS, map)) throw new Error(`Unknown map "${map}" (${Object.keys(MAPS).join(', ')})`);
  const random = Math.random;
  Math.random = mulberry32(seed);
  try {
    const prof = profile && P.sanitizeProfile(profile);
    let chosenMap;
    if (mode === 's15') chosenMap = map ?? (prof ? P.PROGRESS.mapLadder.filter(id => P.mapOpen(prof, id)).at(-1) : 'forest');
    if (prof && chosenMap && !P.mapOpen(prof, chosenMap)) throw new Error(`Map "${chosenMap}" is locked for this profile`);
    const meta = P.metaBonuses(prof || P.sanitizeProfile({ up: armory })); // ranks clamped like a real save
    if (!prof) Object.assign(meta, { weaponSlots: 6, relicSlots: 6, reroll: meta.reroll + 2, banish: meta.banish + 2 });
    const open = prof ? P.openFor(prof, hero) : null;
    for (const [k, pct] of Object.entries(buff)) {
      const [key] = BUFFS[k], x = 1 + pct / 100;
      meta[key] = (meta[key] ?? 1) * x;
    }
    const g = new Game({ hero, mode, map: chosenMap, diff, nightmare, meta, open, gear: prof?.gear[hero], settings: {}, crypts, headless: true, maxWeapons: slots, maxRelics: relics });
    const d = new Driver(g, { bot, params, label, pick, hz, rng: mulberry32(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995) });
    const t0 = performance.now();
    d.run(max);
    const s = d.summary();
    // What the run banks, as the server would pay it (shared/profile.js): the gold picked up,
    // clamped to what a run that long could make, times the difficulty's rate, plus the wage for its
    // time and a win's bonus.
    const report = g.runReport();
    const applied = prof && P.applyRun(prof, report);
    if (applied && !applied.ok) throw new Error(`Run report refused: ${applied.error}`);
    const pay = applied ? applied.reward : P.runReward(P.sanitizeRun(report));
    return { bot: d.bot.name, pick: d.pickName, hero, mode, map: report.map, diff: g.diffId, nightmare: g.nightmare, seed, ...s, banked: pay.total, winBonus: pay.bonus, wage: pay.wage, report, ms: Math.round(performance.now() - t0) };
  } finally {
    Math.random = random;
  }
}
