// The difficulty clock runs in "phase minutes" (0-30): the 15-minute night
// advances 1.4 phases per minute; Ranked keeps going past 30 with the late
// mix; dungeon floors map their own clocks onto this scale.

// What may spawn when. Each pocket is a stretch of the night in minutes of the
// 15-minute Survival clock, with the monsters that can turn up in it and how
// often, as relative weights. Ranked runs on the same clock and carries on into
// the pockets past minute 15; a dungeon floor's clock maps onto it through
// minuteOf. Timed swarms, rings and packs come on top (EVENTS below).
export const POCKETS = [
  { minutes: [0, 1], spawn: { rat: 6, bat: 4 } },
  { minutes: [1, 2], spawn: { rat: 5, bat: 5, slime: 3 } },
  { minutes: [2, 3], spawn: { rat: 4, bat: 3, slime: 3, skeleton: 5 } },
  { minutes: [3, 4], spawn: { bat: 1, slime: 3, skeleton: 6, zombie: 4 } },
  { minutes: [4, 5], spawn: { bat: 1, slime: 2, skeleton: 6, zombie: 4, wolf: 3 } },
  { minutes: [5, 6], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5 } },
  { minutes: [6, 7], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5, spider: 3 } },
  { minutes: [7, 8], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3 } },
  { minutes: [8, 9], spawn: { bat: 1, skeleton: 4, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 2 } },
  { minutes: [9, 10], spawn: { bat: 1, skeleton: 1.5, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, deathknight: 1 } },
  { minutes: [10, 11], spawn: { bat: 1, skeleton: 1.5, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, deathknight: 2 } },
  { minutes: [11, 12], spawn: { bat: 1, skeleton: 1.5, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 2, ogre: 1 } },
  { minutes: [12, 13.5], spawn: { bat: 1, skeleton: 1.5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 3, ogre: 1.5 } },
  { minutes: [13.5, 15], spawn: { bat: 1, skeleton: 1.5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 3, ogre: 2 } },
  // Only Ranked gets past dawn.
  { minutes: [15, 19], spawn: { bat: 1, skeleton: 1.5, ghost: 3, cultist: 1, orc: 2, imp: 4, hellhound: 3, deathknight: 2, ogre: 1.1 } },
  { minutes: [19, Infinity], spawn: { bat: 1, skeleton: 1.5, cultist: 1, orc: 2, imp: 4, hellhound: 3, deathknight: 2, ogre: 1.1 } },
];

// The minute of the night a phase stands for: 1.4 phases a minute up to
// minute 15 (phase 21), then Ranked's 0.9 a minute.
export const minuteOf = (phase) => (phase <= 21 ? phase / 1.4 : 15 + (phase - 21) / 0.9);
export const pocketAt = (minute) => POCKETS.find((p) => minute >= p.minutes[0] && minute < p.minutes[1]) || POCKETS[POCKETS.length - 1];

// The steady horde comes at a rate, the owner's (26 October 2026): "not looking at how many monsters
// are alive ... alive monsters are just alive and for the player to deal with and should not affect
// new monster generation". It used to keep a number of foes standing (22 + 13 a phase, 10 more a
// phase past 8, at most 480, times the difficulty's spawn), sending more whenever the hero thinned
// them: what came was what he killed. Now hordeRate monsters a second come (before the difficulty,
// the minute's growth and the waves: Spawner.rate) whatever stands, the old numbers spread over
// HORDE_RATE.turn seconds: about what a decent hero cut through of the old standing horde, the walk
// in from the screen's edge included. Over the night's first `settle` minutes it eases down from
// `early`, the hero still weak (at 0:00 a level-1 hero kills a few a second). Late in the night
// what the difficulty asks bends under `knee` a second (times the minute's growth, Spawner.rate),
// so Veteran and Elite stay about what a strong hero can cut through rather than past anything
// he could; past dawn Ranked keeps growing (the cap of 2,500 standing, HORDE_CAP, is the hardware's,
// below).
// (Without the old 480 at most: nothing here counts what stands.)
// At the start of the night and of each Dungeon Run floor `head` seconds' worth come at once, so
// dusk is never empty (30: at dusk as many as used to stand then, 12 on Normal, 96 on Veteran,
// 184 on Elite), `headLate` seconds' worth on a floor that starts later in the night (a Dungeon
// Run's second and third, whose rate is already high: 30 seconds of it would be the cap at once);
// what comes a frame is `perFrame` spawn points at most (a Goblin brings three),
// and what can't come (at the cap, nowhere to stand) isn't owed: no more than `carry` seconds'
// worth wait at a time, so a stall never pours out all at once. The steady horde stops `room`
// short of the cap (HORDE_CAP.most), what it would send then simply not coming: a wave on Elite
// can fill the cap in seconds, and a swarm, ring or pack must still find room (they come in the
// place of foes off the screen, and the steady horde's stand just past its edge). Unless fewer than
// `thin` stand on the screen: then the cap is full of foes out of sight (a ring's or a swarm's on
// their way back), the screen empty for as long as they take, and the steady horde comes all the
// same, each in the place of the farthest off the screen (the owner's of 27 October 2026, "it looks
// like I am without monsters" at 10:00 on an Elite Nightmare).
export const HORDE_RATE = { turn: 20, early: 30, settle: 4, knee: 100, head: 30, headLate: 8, carry: 1, perFrame: 6, room: 200, thin: 150 };
export function hordeRate(phase) {
  const R = HORDE_RATE, m = minuteOf(phase);
  const turn = R.turn + (R.early - R.turn) * Math.max(0, 1 - m / R.settle);
  return (22 + phase * 13 + Math.max(0, phase - 8) * 10) / turn;
}

// Extra health multiplier as the night goes on.
// Past phase 30 (only Ranked gets there) it also compounds, so every night ends.
export function hpScale(phase) {
  return (1 + phase * 0.08 + Math.max(0, phase - 9) * 0.2 + Math.max(0, phase - 16) * 0.3) * Math.pow(1.06, Math.max(0, phase - 30));
}

// Survival's night hardens much faster from minute 6.5 (phase 9) on: a hero
// without the Armory hits a wall of health it can't cut through, one with all
// of it gets to dawn. Tuned with the gem-collecting bot (tools/bots.mjs
// --bot=gems --armory=none|max). Ranked follows it to dawn (rankedHpScale); the dungeon keeps hpScale.
export function nightHpScale(phase) {
  return 1 + phase * 0.08 + Math.max(0, phase - 9) * 0.8 + Math.max(0, phase - 16) * 1;
}

// Ranked's night is Survival's until dawn (phase 21), then it grows on from Survival's dawn at the
// old hpScale's rate, compounding past 30, as Game.dmgScale does past dawn (the 27 October 2026
// review, D10: its monsters had x6.58 health at 15:00 against Survival's x17.28, and reached that
// only about minute 29).
export function rankedHpScale(phase) {
  return phase <= 21 ? nightHpScale(phase) : (nightHpScale(21) * hpScale(phase)) / hpScale(21);
}

// Monster health multiplier for a mode at a phase.
export const monsterHp = (phase, mode) => (mode === 's15' ? nightHpScale(phase) : mode === 'ranked' ? rankedHpScale(phase) : hpScale(phase));

// Timed events (phase minutes).
// Off the night bosses' arrivals (the 27 October 2026 review, D14; the horde still comes at its
// rate under them, the owner's of 26 October 2026, and the late horde from 9:00): the imp batch
// from 9:39, on the Butcher's heels, to 10:30 (14.7: a batch of five is in by 10:58, before the
// goblin raid's warning); the Wraith ring from 12:51, nine seconds before the Lich, to 12:00. The
// last imp batch from 14:39 to 14:17 (20), so the whole batch is in by 14:50 and none is lost to
// dawn (D15).
export const EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'bat', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'skeleton', count: 26 },
  { at: 7, type: 'swarm', enemy: 'bat', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'wolf', count: 8 },
  { at: 11, type: 'ring', enemy: 'zombie', count: 34 },
  { at: 14.7, type: 'swarm', enemy: 'imp', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'goblin', count: 18 },
  { at: 16.8, type: 'ring', enemy: 'ghost', count: 40 },
  { at: 20, type: 'swarm', enemy: 'imp', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'hellhound', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'deathknight', count: 22 },
  { at: 27, type: 'swarm', enemy: 'imp', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'skeleton', count: 60 },
];

// The night's last stand (the 27 October 2026 review, D15: after 11:00 the night brought nothing
// new), Survival's only (Spawner.events), at 14:00: a ring of every kind the night has brought by
// then (kindsBy), its count before the difficulty as a ring's, and `champions` champions together,
// told like any event in its own words and sting (events.js, audio.js warnstand).
export const LAST_STAND = { at: 19.6, type: 'stand', enemy: 'all', count: 36, champions: 3 };

// Every kind of monster the night's pockets have brought by a minute of it, in the order they came.
export function kindsBy(minute) {
  const out = [];
  for (const p of POCKETS) if (p.minutes[0] < minute) for (const k of Object.keys(p.spawn)) if (!out.includes(k)) out.push(k);
  return out;
}

// The same kinds, each with its weight in the latest of those pockets that sent it: how much of the
// last stand's ring is of it (Spawner.fire). An even share each made the Cultist a fifteenth of the
// ring, against a twenty-fourth of the horde round it, some 95 of them closing in at once on Elite
// (27 October 2026; Cultists are few, big and slow, the owner's): by the night's own weights it is
// as few as anywhere, the least weighed of the kinds.
export function kindWeightsBy(minute) {
  const w = {};
  for (const p of POCKETS) if (p.minutes[0] < minute) Object.assign(w, p.spawn);
  return kindsBy(minute).map((k) => [k, w[k]]);
}

// The owner's (22 October 2026): a swarm "should be 3x bigger ... in jolts of 3 to 5 ... warning
// comes, few seconds later, a swarm. Few seconds later new warning, few seconds later new swarm",
// then "during a swarm batch have this done 2-5 times". Each swarm of EVENTS comes as a batch of
// min..max swarms, each `more` times its count, `gap` game seconds apart, each with its own
// warning (events.js WARN.lead before it) telling which of the batch it is.
export const SWARM_BATCH = { min: 2, max: 5, more: 3, gap: 7 };

// The night's events with every swarm made a batch: size() how many swarms a batch holds (rolled
// once a night), gapPh the phase between two of them.
// Each swarm of the batch knows its place in it (batch, from 0) and the batch's size (of).
export function batchEvents(size, gapPh, list = EVENTS) {
  const out = [];
  for (const ev of list) {
    if (ev.type !== 'swarm') {
      out.push(ev);
      continue;
    }
    const n = size();
    for (let i = 0; i < n; i++) out.push({ ...ev, at: ev.at + i * gapPh, count: ev.count * SWARM_BATCH.more, batch: i, of: n });
  }
  return out;
}

// Survival bosses by real elapsed seconds.
export const SURVIVAL_BOSSES = {
  s15: [
    { at: 4.5 * 60, id: 'boneking' },
    { at: 9 * 60, id: 'butcher' },
    { at: 13 * 60, id: 'lich' },
  ],
};

// Ranked: the four lords return in rotation, one every 4.5 minutes, forever.
export const RANKED_BOSSES = ['boneking', 'butcher', 'lich', 'demonlord'];
export const RANKED_BOSS_EVERY = 270;
// Once the scripted events run out, Ranked keeps drawing from the late ones.
export const RANKED_EVENT_EVERY = 2.5; // phase minutes

// Breakable sites: barrels and crates, urns, or a lantern among barrels and crates. The user's
// "triple the current spawn" and "the box sites have 2-5 boxes" (16 October 2026). In the forest
// a site turns up every `every` seconds (it was 16-26) while fewer than `most` props stand (it was
// 10, at fewer than 2½ to a site); a Dungeon Run floor's room has `room` sites along its walls
// (it was 1-4 single props), a crypt's chamber `crypt`: "drop them back down to like a few per
// chamber" (the user, 16 October 2026; it was `room`'s 3-12, some 150-220 boxes a crypt). Each
// site holds `boxes` of them. What each one holds: game.js PROP_LOOT.
export const PROP_SITES = { every: [16 / 3, 26 / 3], most: 45, room: [1, 1], crypt: [1, 1], boxes: [2, 5] };

// The most monsters that stand at once, props aside (Game.spawnEnemy). Past `most` a new one comes
// only in the place of one that stands well off-screen, which simply vanishes, never seen
// (Game.recycleFar; the owner's "recycle those far away, throw them out ... if they are far
// offscreen it makes sense", 16 October 2026): the farthest from the hero, if it is `far` screen
// diagonals from him or more. 0.6 of one (413 world px on a 1080p screen's 600×338) is beyond any
// corner of the screen and farther than anywhere the horde comes in (Forest.spawnPoint: the
// screen's edge, 374 px at most), yet nearer than where the forest moves its stragglers back in
// (Forest.tooFar, 510 px a side, where the steady horde's stragglers are let go since 26 October
// 2026, Game.relocate), so that in the forest some do stand that far: those a hero on the move
// leaves behind. In 45 s at the cap on a Veteran Nightmare at 11:00, a Knight standing
// still had none past 380 px (nothing recycled, the spawns refused), one kiting about a hundred
// recycled, one running straight on some fourteen hundred. A lower `far` would recycle monsters
// just come in at the screen's edge; past 0.74 the forest's moving them back would always come
// first. (Those counts were measured when the horde kept a number standing, before HORDE_RATE.)
// Boxes don't count and come all the same (Game.spawnProp). The steady horde makes room
// for `perFrame` a frame at most, so a burst can't churn it; what is sent at the hero (a ring, a
// swarm, a pack, a champion, the thief, a boss's summons) comes in full: it may take any foe off
// the screen, `edge` px or more beyond its border (the tallest monster's height), as many as it
// brings.
// `most` was 900 until 27 October 2026, the owner's "the 900 cap, can we safely put that on like, a
// few k instead?": an Elite Nightmare filled it by 8:00 and stood at it for the rest of the night.
export const HORDE_CAP = { most: 2500, far: 0.6, perFrame: 20, edge: 32 };

// Dungeon floors: theme, starting phase and the guardian waiting at the end.
export const FLOORS = [
  { n: 1, name: 'The Crypt', theme: 'crypt', phase0: 0, rate: 1.15, cap: 13, guardian: 'boneking' },
  { n: 2, name: 'The Catacombs', theme: 'catacombs', phase0: 9, rate: 1.05, cap: 22, guardian: 'butcher' },
  { n: 3, name: 'The Infernal Depths', theme: 'inferno', phase0: 17, rate: 1, cap: 30, guardian: 'demonlord' },
];
