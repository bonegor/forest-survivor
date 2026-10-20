// Weapons. `base` holds level-1 stats; `levels[i]` is what level i+2 adds.
// Stats: dmg, cd (seconds), amount, area (x), speed (x), dur (s; eternal: lasts for good),
// pierce, kb (knockback), plus a few kind-specific extras.
//
// Each hero class has a signature weapon of its own (the Necromancer two), no other hero's to
// find; every other weapon is shared by all (`unique`, SHARED_WEAPONS in data/heroes.js). Below,
// each class's signature comes first in its section, then shared weapons. An evolution is better
// than its weapon at level 8 on every stat it has (test/signature-weapons.test.js).

export const MAX_WEAPON_LEVEL = 8;
// How many weapons and how many relics a hero carries at most (Game.upgradePool, the HUD's slots).
export const MAX_WEAPONS = 6, MAX_RELICS = 6;

// A weapon's stats at a level: its base, and what each level up to it adds (an evolution has no
// levels; its base is all there is). Stats it doesn't have start from `from` (Weapon.recompute's
// defaults), or are left out.
export function statsAt(def, level, from = {}) {
  const s = { ...from, ...def.base };
  if (def.evolved) return s;
  for (const lv of def.levels.slice(0, level - 1)) {
    for (const [k, v] of Object.entries(lv)) if (k !== 'text') s[k] = (s[k] || 0) + v;
  }
  return s;
}

// The sprites the newer weapons throw (art/items.js): each name here is the one place to swap.
export const WEAPON_SPRITES = {
  shadowblade: 'shadowblade', // Shadow Blade and Shadowstrike, spun as they fly
  caltrop: 'caltrop', // a scatter of Caltrops in the air, and each one on the ground
  // The four of 20 October 2026 (until their art is in, art/fallbacks.js stands in for it):
  brand: 'brand', // Smite's sigil over a branded foe (7x7)
  root: 'root', // a root of Snaring Roots bursting up, 4 frames rising to withering (10x14)
  silverbolt: 'silverbolt', // the Silver Crossbow's bolt, pointing right (11x3)
};

// How long a foe Smite or Judgement struck stays Branded, in seconds (Enemy.brandT).
export const BRAND_TIME = 3;

export const WEAPONS = {
  // ------------------------------- the Knight's signature, then shared weapons
  sword: {
    name: 'Longsword',
    icon: 'i_sword',
    kind: 'sword',
    desc: 'Cleaves everything in front of you.',
    base: { dmg: 15, cd: 1, amount: 1, area: 1, kb: 1.3 },
    levels: [
      { amount: 1, text: 'Also slashes {behind} you.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { area: 0.2, text: 'Area {+20%}.' },
      { cd: -0.18, text: 'Swings {faster}.' },
      { dmg: 7, text: 'Damage {+7}.' },
      { amount: 1, area: 0.15, text: '{+1} slash, area {+15%}.' },
      { dmg: 10, text: 'Damage {+10}.' },
    ],
    evo: { into: 'excalibur', with: 'might' },
  },
  axe: {
    name: 'Throwing Axe',
    icon: 'i_axe',
    kind: 'axe',
    desc: 'Heavy axes arc high and crash down.',
    base: { dmg: 22, cd: 1.5, amount: 1, area: 1, pierce: 3, kb: 1 },
    levels: [
      { amount: 1, text: '{+1} axe.' },
      { dmg: 9, text: 'Damage {+9}.' },
      { pierce: 2, area: 0.1, text: 'Pierce {+2}, area {+10%}.' },
      { amount: 1, text: '{+1} axe.' },
      { dmg: 9, text: 'Damage {+9}.' },
      { pierce: 3, area: 0.15, text: 'Pierce {+3}, area {+15%}.' },
      { dmg: 12, cd: -0.2, text: 'Damage {+12}, thrown faster.' },
    ],
    evo: { into: 'whirlwind', with: 'area' },
  },
  blades: {
    name: 'Guardian Blades',
    icon: 'i_blades',
    kind: 'blades',
    desc: 'Spectral swords orbit around you.',
    base: { dmg: 10, cd: 4, amount: 2, area: 1, speed: 1, dur: 3.2, kb: 1.2, tick: 0.45 },
    levels: [
      { amount: 1, text: '{+1} blade.' },
      { speed: 0.25, area: 0.1, text: 'Spin {+25%} faster, area {+10%}.' },
      { dur: 0.6, dmg: 3, text: 'Last {+0.6s} longer, damage {+3}.' },
      { amount: 1, text: '{+1} blade.' },
      { speed: 0.25, area: 0.1, text: 'Spin {+25%} faster, area {+10%}.' },
      { dur: 0.6, dmg: 4, text: 'Last {+0.6s} longer, damage {+4}.' },
      { amount: 1, text: '{+1} blade.' },
    ],
    evo: { into: 'aegis', with: 'armor' },
  },
  aura: {
    name: 'Consecration',
    icon: 'i_aura',
    kind: 'aura',
    desc: 'Holy ground burns foes that come close.',
    base: { dmg: 5, area: 1, tick: 0.5, kb: 0.5 },
    levels: [
      { area: 0.1, dmg: 1, text: 'Area {+10%}, damage {+1}.' },
      { dmg: 2, tick: -0.05, text: 'Damage {+2}, pulses faster.' },
      { area: 0.15, text: 'Area {+15%}.' },
      { dmg: 2, text: 'Damage {+2}.' },
      { area: 0.1, tick: -0.05, text: 'Area {+10%}, pulses faster.' },
      { dmg: 3, text: 'Damage {+3}.' },
      { area: 0.15, dmg: 2, text: 'Area {+15%}, damage {+2}.' },
    ],
    evo: { into: 'sanctuary', with: 'regen' },
  },

  // ------------------------------- the Ranger's signature, then shared weapons
  bow: {
    name: 'Hunting Bow',
    icon: 'i_bow',
    kind: 'bow',
    desc: 'Looses arrows straight ahead.',
    base: { dmg: 11, cd: 0.95, amount: 1, speed: 1, pierce: 1, kb: 0.6 },
    levels: [
      { amount: 1, text: '{+1} arrow.' },
      { dmg: 5, text: 'Damage {+5}.' },
      { pierce: 1, text: 'Arrows pierce {+1} foe.' },
      { amount: 1, text: '{+1} arrow.' },
      { cd: -0.15, text: 'Fires {faster}.' },
      { pierce: 1, dmg: 4, text: 'Pierce {+1}, damage {+4}.' },
      { amount: 1, dmg: 5, text: '{+1} arrow, damage {+5}.' },
    ],
    evo: { into: 'stormstring', with: 'projspeed' },
  },
  glaive: {
    name: 'Moonglaive',
    icon: 'i_glaive',
    kind: 'glaive',
    desc: 'A crescent blade flies out and returns, cutting both ways.',
    base: { dmg: 13, cd: 1.6, amount: 1, area: 1, speed: 1, kb: 0.8 },
    levels: [
      { amount: 1, text: '{+1} glaive.' },
      { dmg: 5, text: 'Damage {+5}.' },
      { speed: 0.2, area: 0.15, text: 'Flies {+20%} farther, area {+15%}.' },
      { amount: 1, text: '{+1} glaive.' },
      { dmg: 6, cd: -0.2, text: 'Damage {+6}, thrown faster.' },
      { area: 0.2, text: 'Area {+20%}.' },
      { amount: 1, dmg: 6, text: '{+1} glaive, damage {+6}.' },
    ],
    evo: { into: 'lodestar', with: 'magnet' },
  },
  thorns: {
    name: 'Bramble',
    icon: 'i_thorns',
    kind: 'thorns',
    desc: 'Thorns burst from the ground in a line, snaring all they pierce.',
    base: { dmg: 14, cd: 2.2, amount: 1, area: 1, len: 7, slow: 0.35, kb: 0.3 },
    levels: [
      { amount: 1, text: '{+1} line of thorns.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { len: 3, text: 'Thorns reach {farther}.' },
      { area: 0.2, slow: 0.1, text: 'Area {+20%}, snares harder.' },
      { amount: 1, dmg: 5, text: '{+1} line, damage {+5}.' },
      { cd: -0.4, text: 'Erupts {faster}.' },
      { len: 3, dmg: 8, text: 'Reach {farther}, damage {+8}.' },
    ],
    evo: { into: 'briarheart', with: 'armor' },
  },
  wisps: {
    name: "Will-o'-Wisps",
    icon: 'i_wisps',
    kind: 'wisp',
    desc: 'Ghostly lights drift out and hunt down foes.',
    base: { dmg: 10, cd: 1.8, amount: 2, speed: 1, pierce: 0, kb: 0.5 },
    levels: [
      { amount: 1, text: '{+1} wisp.' },
      { dmg: 4, text: 'Damage {+4}.' },
      { speed: 0.25, text: 'Wisps fly {+25%} faster.' },
      { amount: 1, text: '{+1} wisp.' },
      { pierce: 1, dmg: 4, text: 'Pass through {+1} foe, damage {+4}.' },
      { cd: -0.3, text: 'Summoned {faster}.' },
      { amount: 2, text: '{+2} wisps.' },
    ],
    evo: { into: 'faelights', with: 'luck' },
  },

  // ----------------------------- the Sorcerer's signature, then shared weapons
  fireball: {
    name: 'Fireball',
    icon: 'i_fireball',
    kind: 'fireball',
    desc: 'Hurls a fireball that explodes on impact.',
    base: { dmg: 17, cd: 1.45, amount: 1, area: 1, speed: 1, kb: 1.4 },
    levels: [
      { dmg: 6, text: 'Damage {+6}.' },
      { amount: 1, text: '{+1} fireball.' },
      { area: 0.25, text: 'Explosion {+25%} larger.' },
      { dmg: 8, text: 'Damage {+8}.' },
      { amount: 1, text: '{+1} fireball.' },
      { cd: -0.25, text: 'Casts {faster}.' },
      { area: 0.25, dmg: 8, text: 'Explosion {+25%}, damage {+8}.' },
    ],
    evo: { into: 'meteor', with: 'cooldown' },
  },
  lightning: {
    name: 'Chain Lightning',
    icon: 'i_lightning',
    kind: 'lightning',
    desc: 'Lightning strikes a foe and arcs onward.',
    base: { dmg: 15, cd: 2, amount: 1, chains: 2, area: 1, kb: 0.4 },
    levels: [
      { chains: 1, text: 'Arcs to {+1} more foe.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { amount: 1, text: '{+1} strike.' },
      { chains: 2, text: 'Arcs to {+2} more foes.' },
      { dmg: 8, text: 'Damage {+8}.' },
      { cd: -0.35, text: 'Strikes {faster}.' },
      { amount: 1, chains: 2, text: '{+1} strike, {+2} arcs.' },
    ],
    evo: { into: 'thunderstorm', with: 'amount' },
  },
  frost: {
    name: 'Frost Nova',
    icon: 'i_frost',
    kind: 'frost',
    desc: 'Ice shards burst outward and chill foes.',
    base: { dmg: 9, cd: 2.6, amount: 6, speed: 1, pierce: 1, slow: 0.45, freeze: 0, kb: 0.5 },
    levels: [
      { amount: 2, text: '{+2} shards.' },
      { dmg: 4, text: 'Damage {+4}.' },
      { pierce: 1, text: 'Pierce {+1}.' },
      { amount: 2, text: '{+2} shards.' },
      { freeze: 0.12, text: '{12%} chance to freeze solid.' },
      { dmg: 5, cd: -0.3, text: 'Damage {+5}, bursts faster.' },
      { amount: 3, freeze: 0.08, text: '{+3} shards, freeze {+8%}.' },
    ],
    evo: { into: 'frozenheart', with: 'vitality' },
  },
  arcane: {
    name: 'Arcane Ray',
    icon: 'i_arcane',
    kind: 'arcane',
    desc: 'A ray of pure force sears through every foe in its line.',
    base: { dmg: 16, cd: 1.8, amount: 1, area: 1, kb: 0.5 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { amount: 1, text: '{+1} ray.' },
      { area: 0.2, text: 'Rays reach {+20%} farther.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { cd: -0.3, text: 'Casts {faster}.' },
      { amount: 1, area: 0.15, text: '{+1} ray, reach {+15%}.' },
      { dmg: 8, cd: -0.15, text: 'Damage {+8}, casts faster.' },
    ],
    evo: { into: 'prismatic', with: 'area' },
  },

  // ------------------------------- the Shadow's signature, then shared weapons
  daggers: {
    name: 'Shadow Blade',
    icon: 'i_shadowblade',
    kind: 'daggers',
    desc: 'Spinning blades seek the nearest foe and cut through all in their path.',
    base: { dmg: 8, cd: 0.6, amount: 1, speed: 1, pierce: 99, kb: 0.4 },
    levels: [
      { amount: 1, text: '{+1} blade.' },
      { dmg: 3, text: 'Damage {+3}.' },
      { speed: 0.2, text: 'Blades fly {+20%} faster and farther.' },
      { amount: 1, text: '{+1} blade.' },
      { dmg: 4, cd: -0.08, text: 'Damage {+4}, thrown faster.' },
      { amount: 1, speed: 0.15, text: '{+1} blade, fly {+15%} faster.' },
      { dmg: 4, cd: -0.1, text: 'Damage {+4}, thrown faster.' },
    ],
    evo: { into: 'shadowstrike', with: 'movespeed' },
  },
  flask: {
    name: 'Firebomb Flask',
    icon: 'i_flask',
    kind: 'flask',
    desc: 'Shatters into a pool of burning oil.',
    base: { dmg: 7, cd: 3, amount: 1, area: 1, dur: 2.5, tick: 0.35 },
    levels: [
      { amount: 1, text: '{+1} flask.' },
      { area: 0.2, text: 'Pools {+20%} larger.' },
      { dur: 0.5, dmg: 2, text: 'Burns {+0.5s} longer, damage {+2}.' },
      { amount: 1, text: '{+1} flask.' },
      { area: 0.2, text: 'Pools {+20%} larger.' },
      { dmg: 3, cd: -0.4, text: 'Damage {+3}, thrown faster.' },
      { amount: 1, dur: 0.5, text: '{+1} flask, burns {+0.5s} longer.' },
    ],
    evo: { into: 'hellfire', with: 'duration' },
  },
  caltrops: {
    name: 'Caltrops',
    icon: 'i_caltrops',
    kind: 'caltrops',
    desc: 'Iron spikes scattered behind you cut and slow whatever follows.',
    base: { dmg: 9, cd: 2.2, amount: 1, area: 1, dur: 4, tick: 0.5, slow: 0.4, kb: 0 },
    levels: [
      { dmg: 3, text: 'Damage {+3}.' },
      { amount: 1, text: '{+1} scatter.' },
      { area: 0.2, text: 'Scatter {+20%} wider.' },
      { dur: 1, slow: 0.05, text: 'Lie {+1s} longer, slow harder.' },
      { amount: 1, dmg: 3, text: '{+1} scatter, damage {+3}.' },
      { cd: -0.4, text: 'Thrown {faster}.' },
      { dmg: 5, tick: -0.1, text: 'Damage {+5}, cut faster.' },
    ],
    evo: { into: 'razorfield', with: 'luck' },
  },

  // -------------------------------------------- the Necromancer's two signatures
  raise: {
    name: 'Raise Dead',
    icon: 'i_raise',
    kind: 'summon',
    desc: 'Skeletons claw out of the earth to fight for you.',
    base: { dmg: 9, cd: 3.4, amount: 1, dur: 7, speed: 1, kb: 0.6 },
    levels: [
      { amount: 1, text: '{+1} skeleton per call.' },
      { dmg: 4, text: 'Damage {+4}.' },
      { dur: 2, text: 'Skeletons last {+2s}.' },
      { amount: 1, text: '{+1} skeleton per call.' },
      { dmg: 5, cd: -0.5, text: 'Damage {+5}, raised faster.' },
      { dur: 2, speed: 0.2, text: 'Last {+2s}, move {+20%} faster.' },
      { amount: 1, dmg: 5, text: '{+1} skeleton, damage {+5}.' },
    ],
    evo: { into: 'legion', with: 'growth' },
  },
  miasma: {
    name: 'Miasma',
    icon: 'i_miasma',
    kind: 'miasma',
    desc: 'A poison cloud hangs about you, and seeps from your steps.',
    // dmg and tick: the cloud's; the trail's pools do three quarters of it, a little faster.
    // dur: how long the trail lingers; dot: poison a second, for a moment after each touch.
    base: { dmg: 4, area: 1, tick: 0.5, kb: 0, dur: 2.5, dot: 2 },
    levels: [
      { area: 0.15, text: 'Cloud {+15%} wider.' },
      { dmg: 2, text: 'Damage {+2}.' },
      { dur: 1, text: 'Trail lingers {+1s} longer.' },
      { tick: -0.08, text: 'Poison ticks {faster}.' },
      { dot: 3, text: 'Poison {+3} damage a second.' },
      { area: 0.15, dmg: 2, text: 'Cloud {+15%} wider, damage {+2}.' },
      { dot: 3, tick: -0.07, text: 'Poison {+3} a second, ticks faster.' },
    ],
    evo: { into: 'pestilence', with: 'regen' },
  },

  // ---------------------------------- the four of 20 October 2026: one signature each
  // The Paladin's. A pillar of light on the mightiest foe in reach (a boss, a crypt's lord, a
  // champion, else the one with the most health), a splash round it; all it burns is Branded for
  // BRAND_TIME s: every blow on it, anyone's, does `brand` more (Game.hitEnemy).
  smite: {
    name: 'Smite',
    icon: 'i_smite',
    kind: 'smite',
    desc: 'A pillar of holy light strikes the mightiest foe near and brands all it burns.',
    base: { dmg: 26, cd: 1.35, amount: 1, area: 1, kb: 0.6, brand: 0.15 },
    levels: [
      { dmg: 8, text: 'Damage {+8}.' },
      { area: 0.25, text: 'Splash {+25%} wider.' },
      { amount: 1, text: '{+1} pillar.' },
      { dmg: 10, text: 'Damage {+10}.' },
      { cd: -0.25, text: 'Strikes {faster}.' },
      { amount: 1, area: 0.2, text: '{+1} pillar, splash {+20%}.' },
      { dmg: 12, text: 'Damage {+12}.' },
    ],
    evo: { into: 'judgement', with: 'vitality' },
  },
  // The Druid's. Not Bramble's line of thorns from the hero, piercing all on its way: a root
  // tunnels unseen under the ground to the nearest foe, striking nothing on its way, and bursts up
  // round it, holding (rooting) every foe in its grip for `hold` s; a boss or a crypt's lord is
  // only slowed. `speed`: how fast it tunnels.
  roots: {
    name: 'Snaring Roots',
    icon: 'i_roots',
    kind: 'roots',
    desc: 'A root tunnels to the nearest foe and bursts up round it, holding fast all it grips.',
    base: { dmg: 16, cd: 1.6, amount: 1, area: 1, hold: 1, speed: 1, kb: 0 },
    levels: [
      { dmg: 6, text: 'Damage {+6}.' },
      { area: 0.2, text: 'Grip {+20%} wider.' },
      { amount: 1, text: '{+1} root.' },
      { hold: 0.3, text: 'Holds {+0.3s} longer.' },
      { dmg: 8, cd: -0.25, text: 'Damage {+8}, grows faster.' },
      { area: 0.2, hold: 0.2, text: 'Grip {+20%}, holds longer.' },
      { dmg: 10, text: 'Damage {+10}.' },
    ],
    evo: { into: 'worldroot', with: 'duration' },
  },
  // The Berserker's. He leaps on a foe ahead of him (a short, quick hop that never crosses a wall
  // or a trunk: weapons.js KINDS.leap) and chops all round where he lands; with no foe ahead in
  // reach he chops round his feet. `amount`: chops a landing.
  twinaxes: {
    name: 'Twin Axes',
    icon: 'i_twinaxes',
    kind: 'leap',
    desc: 'Leaps on a foe ahead and chops all round where he lands.',
    base: { dmg: 22, cd: 1.1, amount: 1, area: 1, kb: 1.2 },
    levels: [
      { dmg: 7, text: 'Damage {+7}.' },
      { area: 0.2, text: 'Chops {+20%} wider.' },
      { cd: -0.15, text: 'Leaps {faster}.' },
      { dmg: 8, text: 'Damage {+8}.' },
      { area: 0.15, text: 'Chops {+15%} wider.' },
      { dmg: 6, cd: -0.15, text: 'Damage {+6}, leaps faster.' },
      { dmg: 10, area: 0.15, text: 'Damage {+10}, chops wider.' },
    ],
    evo: { into: 'bloodstorm', with: 'might' },
  },
  // The Witch Hunter's. Not the Ranger's bow, which looses along her facing, nor the Shadow's
  // blades, which seek the nearest foe and cut through all: a heavy, aimed bolt at the nearest
  // of the wicked in reach (a boss, a lord, a champion, a cultist), else the nearest foe;
  // through `pierce` more, `bane` more on the wicked.
  crossbow: {
    name: 'Silver Crossbow',
    icon: 'i_crossbow',
    kind: 'crossbow',
    desc: 'Heavy silver bolts at the wicked first; they pierce, and bite deeper into the strong.',
    base: { dmg: 26, cd: 1.15, amount: 1, speed: 1, pierce: 2, kb: 1, bane: 0.5 },
    levels: [
      { dmg: 8, text: 'Damage {+8}.' },
      { cd: -0.15, text: 'Reloads {faster}.' },
      { pierce: 1, text: 'Bolts pierce {+1} foe.' },
      { amount: 1, text: '{+1} bolt.' },
      { dmg: 10, text: 'Damage {+10}.' },
      { cd: -0.15, speed: 0.25, text: 'Reloads faster, bolts {+25%} faster.' },
      { dmg: 12, pierce: 1, text: 'Damage {+12}, pierce {+1}.' },
    ],
    evo: { into: 'purifier', with: 'projspeed' },
  },

  // ------------------------------------------------------------- evolutions
  excalibur: {
    name: 'Excalibur',
    icon: 'i_excalibur',
    kind: 'sword',
    evolved: true,
    desc: 'Holy blade. Every swing hurls a wave of light.',
    base: { dmg: 40, cd: 0.8, amount: 4, area: 1.55, kb: 1.8, wave: 1 },
  },
  whirlwind: {
    name: 'Whirlwind',
    icon: 'i_whirlwind',
    kind: 'spiral',
    evolved: true,
    desc: 'A storm of axes spirals out from you.',
    base: { dmg: 56, cd: 1.25, amount: 8, area: 1.4, pierce: 99, kb: 1.4 },
  },
  aegis: {
    name: 'Aegis',
    icon: 'i_aegis',
    kind: 'blades',
    evolved: true,
    desc: 'Eternal guardian blades that shatter enemy missiles.',
    base: { dmg: 24, cd: 0.1, amount: 6, area: 1.35, speed: 1.6, eternal: 1, kb: 1.6, tick: 0.35, block: 1 },
  },
  sanctuary: {
    name: 'Sanctuary',
    icon: 'i_sanctuary',
    kind: 'aura',
    evolved: true,
    desc: 'Sacred ground that heals you and slows the wicked.',
    base: { dmg: 16, area: 1.75, tick: 0.35, kb: 0.9, heal: 1, slow: 0.35 },
  },
  stormstring: {
    name: 'Stormstring',
    icon: 'i_stormstring',
    kind: 'bow',
    evolved: true,
    desc: 'Arrows of wind fly straight and pierce all.',
    base: { dmg: 28, cd: 0.55, amount: 5, speed: 1.5, pierce: 99, kb: 1.2 },
  },
  lodestar: {
    name: 'Lodestar',
    icon: 'i_lodestar',
    kind: 'glaive',
    evolved: true,
    desc: 'Star-glaives sweep out in every direction and drag gems home with them.',
    base: { dmg: 34, cd: 1.3, amount: 6, area: 1.5, speed: 1.25, kb: 1.2, ring: 1, pull: 1 },
  },
  briarheart: {
    name: 'Briarheart',
    icon: 'i_briarheart',
    kind: 'thorns',
    evolved: true,
    desc: 'Iron thorns erupt in every direction and slow all they pierce.',
    base: { dmg: 36, cd: 1.6, amount: 6, area: 1.35, len: 14, slow: 0.75, kb: 0.4, ring: 1 },
  },
  faelights: {
    name: 'Fae Lanterns',
    icon: 'i_faelights',
    kind: 'wisp',
    evolved: true,
    desc: 'Lucky fae lights hunt without rest and strike weak points.',
    base: { dmg: 24, cd: 1.1, amount: 7, speed: 1.4, pierce: 3, kb: 0.8, critBonus: 0.3, fae: 1 },
  },
  meteor: {
    name: 'Meteor Storm',
    icon: 'i_meteor',
    kind: 'meteor',
    evolved: true,
    desc: 'Meteors crash from the sky, leaving burning craters.',
    base: { dmg: 42, cd: 1.1, amount: 4, area: 1.6, speed: 1.2, kb: 2, dur: 2, tick: 0.35 },
  },
  thunderstorm: {
    name: 'Thunderstorm',
    icon: 'i_thunderstorm',
    kind: 'lightning',
    evolved: true,
    desc: 'The sky itself fights for you.',
    base: { dmg: 30, cd: 1.1, amount: 4, chains: 8, area: 1.3, kb: 0.8, blast: 1 },
  },
  frozenheart: {
    name: 'Frozen Heart',
    icon: 'i_frozenheart',
    kind: 'frost',
    evolved: true,
    desc: 'Shards freeze foes solid; the frozen shatter violently.',
    base: { dmg: 20, cd: 1.8, amount: 16, speed: 1.15, pierce: 3, slow: 0.6, freeze: 1, kb: 0.6, shatter: 1 },
  },
  prismatic: {
    name: 'Prismatic Ray',
    icon: 'i_prismatic',
    kind: 'arcane',
    evolved: true,
    desc: 'Rays split on the first foe they strike and leap to the next.',
    base: { dmg: 42, cd: 1.1, amount: 5, area: 1.6, kb: 0.7, split: 1 },
  },
  shadowstrike: {
    name: 'Shadowstrike',
    icon: 'i_shadowstrike',
    kind: 'daggers',
    evolved: true,
    desc: 'Spinning blades fly in every direction, through all, seeking weak points.',
    base: { dmg: 22, cd: 0.32, amount: 8, speed: 1.45, pierce: 99, kb: 0.6, radial: 1, critBonus: 0.25 },
  },
  hellfire: {
    name: 'Hellfire',
    icon: 'i_hellfire',
    kind: 'flask',
    evolved: true,
    desc: 'Blue flames that creep after your foes.',
    base: { dmg: 15, cd: 2.4, amount: 5, area: 1.8, dur: 5, tick: 0.3, creep: 1 },
  },
  razorfield: {
    name: 'Razor Field',
    icon: 'i_razorfield',
    kind: 'caltrops',
    evolved: true,
    desc: 'A wide field of razors bleeds the slowed horde; its crits cut deeper.',
    base: { dmg: 24, cd: 1.5, amount: 4, area: 1.5, dur: 6, tick: 0.35, slow: 0.6, kb: 0, critDmg: 0.75 },
  },
  legion: {
    name: 'Legion of the Damned',
    icon: 'i_legion',
    kind: 'summon',
    evolved: true,
    desc: 'Death knights rise to cleave your foes, bursting in soul-fire as they fall.',
    base: { dmg: 26, cd: 2.6, amount: 5, dur: 12, speed: 1.3, kb: 1, knights: 1, burst: 1 },
  },
  pestilence: {
    name: 'Pestilence',
    icon: 'i_pestilence',
    kind: 'miasma',
    evolved: true,
    desc: 'A great plague cloud; foes dying in it burst into poison of their own.',
    base: { dmg: 11, area: 1.6, tick: 0.3, kb: 0, dur: 4, dot: 11, plague: 1 },
  },
  judgement: {
    name: 'Judgement',
    icon: 'i_judgement',
    kind: 'smite',
    evolved: true,
    desc: 'A volley of pillars on the mightiest foes; their brand burns deeper.',
    base: { dmg: 64, cd: 0.95, amount: 5, area: 1.7, kb: 0.8, brand: 0.25 },
  },
  worldroot: {
    name: 'World Root',
    icon: 'i_worldroot',
    kind: 'roots',
    evolved: true,
    desc: 'Three great roots burst up under the horde and hold it long.',
    base: { dmg: 48, cd: 1.1, amount: 3, area: 1.6, hold: 2.2, speed: 1.3, kb: 0 },
  },
  bloodstorm: {
    name: 'Bloodstorm',
    icon: 'i_bloodstorm',
    kind: 'leap',
    evolved: true,
    desc: 'Every landing chops twice in a wide circle, and each kill heals him a little.',
    base: { dmg: 60, cd: 0.65, amount: 2, area: 1.8, kb: 1.4, heal: 1 },
  },
  purifier: {
    name: 'Purifier',
    icon: 'i_purifier',
    kind: 'crossbow',
    evolved: true,
    desc: 'A burst of three bolts; each bursts in silver light on every foe it strikes.',
    base: { dmg: 62, cd: 0.7, amount: 3, speed: 1.45, pierce: 6, kb: 1.2, bane: 0.75, nova: 1 },
  },
};
