// Weapons. `base` holds level-1 stats; `levels[i]` is what level i+2 adds.
// Stats: dmg, cd (seconds), amount, area (x), speed (x), dur (s), pierce,
// kb (knockback), plus a few kind-specific extras.
//
// Every weapon belongs to one hero class: each hero's `roster` (data/heroes.js) lists the four
// he can find, the one (or two) he starts with among them. An evolution is better than its
// weapon at level 8 on every stat it has (test/rosters.test.js).

export const MAX_WEAPON_LEVEL = 8;

// Placeholder art for the newer weapons, until the art pair delivers sprites of their own
// (tools/handoff-art.md): each name here is the one place to swap.
export const WEAPON_SPRITES = {
  shadowblade: 'dagger', // Shadow Blade and Shadowstrike, spun as they fly
  bonespear: 'bone', // Bone Spear and Spine Lance, drawn at 1.25x
  caltrop: 'dagger', // a scatter of Caltrops in the air
  clone: 'rogue', // Shadow Clone: Kael's own sprite, drawn dark and half-seen
};

export const WEAPONS = {
  // ------------------------------------------------------------ the Knight
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

  // ------------------------------------------------------------ the Ranger
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

  // ---------------------------------------------------------- the Sorcerer
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
    icon: 'i_lightning', // placeholder (tools/handoff-art.md)
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

  // ------------------------------------------------------------ the Shadow
  daggers: {
    name: 'Shadow Blade',
    icon: 'i_daggers',
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
    icon: 'i_frost', // placeholder (tools/handoff-art.md)
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
  clone: {
    name: 'Shadow Clone',
    icon: 'i_daggers', // placeholder (tools/handoff-art.md)
    kind: 'clone',
    desc: 'Your shadow steps out to hunt, striking where foes are weakest.',
    base: { dmg: 12, cd: 8, amount: 1, dur: 6, speed: 1, kb: 0.3 },
    levels: [
      { dur: 2, text: 'Clone lingers {+2s}.' },
      { dmg: 5, text: 'Damage {+5}.' },
      { cd: -1.5, text: 'Summoned {faster}.' },
      { amount: 1, text: 'A {second} clone.' },
      { dmg: 6, speed: 0.2, text: 'Damage {+6}, moves {+20%} faster.' },
      { dur: 2, cd: -1, text: 'Lingers {+2s}, summoned faster.' },
      { dmg: 8, text: 'Damage {+8}.' },
    ],
    evo: { into: 'twinshadows', with: 'cooldown' },
  },

  // ------------------------------------------------------- the Necromancer
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
    icon: 'i_aura', // placeholder (tools/handoff-art.md)
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
  bonespear: {
    name: 'Bone Spear',
    icon: 'i_bow', // placeholder (tools/handoff-art.md)
    kind: 'bonespear',
    desc: 'A spear of bone flies at the nearest foe, through all in its way.',
    base: { dmg: 14, cd: 1.5, amount: 1, speed: 1, pierce: 3, kb: 0.8 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { amount: 1, text: '{+1} spear.' },
      { pierce: 1, text: 'Pierce {+1}.' },
      { dmg: 6, speed: 0.15, text: 'Damage {+6}, flies {+15%} faster.' },
      { amount: 1, text: '{+1} spear.' },
      { pierce: 2, cd: -0.2, text: 'Pierce {+2}, hurled faster.' },
      { dmg: 8, text: 'Damage {+8}.' },
    ],
    evo: { into: 'spinelance', with: 'projspeed' },
  },
  grasp: {
    name: 'Grasping Dead',
    icon: 'i_thorns', // placeholder (tools/handoff-art.md)
    kind: 'grasp',
    desc: 'Skeletal hands claw up from the ground in a line, holding fast all they seize.',
    base: { dmg: 13, cd: 2.4, amount: 1, area: 1, len: 7, slow: 0.5, kb: 0.2 },
    levels: [
      { amount: 1, text: '{+1} line of hands.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { len: 3, text: 'Hands reach {farther}.' },
      { area: 0.2, slow: 0.1, text: 'Area {+20%}, grip harder.' },
      { amount: 1, dmg: 5, text: '{+1} line, damage {+5}.' },
      { cd: -0.4, text: 'Erupts {faster}.' },
      { len: 3, dmg: 8, text: 'Reach {farther}, damage {+8}.' },
    ],
    evo: { into: 'gravehands', with: 'duration' },
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
    base: { dmg: 24, cd: 0.1, amount: 6, area: 1.35, speed: 1.6, dur: 999, kb: 1.6, tick: 0.35, block: 1 },
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
    desc: 'Iron thorns erupt in every direction and pin foes in place.',
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
    icon: 'i_thunderstorm', // placeholder (tools/handoff-art.md)
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
    icon: 'i_frozenheart', // placeholder (tools/handoff-art.md)
    kind: 'caltrops',
    evolved: true,
    desc: 'A wide field of razors bleeds the slowed horde; its crits cut deeper.',
    base: { dmg: 24, cd: 1.5, amount: 4, area: 1.5, dur: 6, tick: 0.35, slow: 0.6, kb: 0, critDmg: 0.75 },
  },
  // Two shadows that never fade: as many as at level 8, but for good (dur 999), each throwing
  // Shadowstrike's spinning blades all round.
  twinshadows: {
    name: 'Twin Shadows',
    icon: 'i_shadowstrike', // placeholder (tools/handoff-art.md)
    kind: 'clone',
    evolved: true,
    desc: 'Two shadows fight beside you for good, blades flying from them all round.',
    base: { dmg: 36, cd: 2, amount: 2, dur: 999, speed: 1.5, kb: 0.5, blades: 1 },
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
    icon: 'i_sanctuary', // placeholder (tools/handoff-art.md)
    kind: 'miasma',
    evolved: true,
    desc: 'A great plague cloud; foes dying in it burst into poison of their own.',
    base: { dmg: 11, area: 1.6, tick: 0.3, kb: 0, dur: 4, dot: 11, plague: 1 },
  },
  spinelance: {
    name: 'Spine Lance',
    icon: 'i_stormstring', // placeholder (tools/handoff-art.md)
    kind: 'bonespear',
    evolved: true,
    desc: 'Lances of spine fly faster and run through everything.',
    base: { dmg: 40, cd: 1.1, amount: 4, speed: 1.45, pierce: 99, kb: 1.1 },
  },
  gravehands: {
    name: 'Hands of the Grave',
    icon: 'i_briarheart', // placeholder (tools/handoff-art.md)
    kind: 'grasp',
    evolved: true,
    desc: 'The dead reach up in every direction and pin foes where they stand.',
    base: { dmg: 38, cd: 1.7, amount: 6, area: 1.35, len: 14, slow: 0.8, kb: 0.3, ring: 1, pin: 0.6 },
  },
};
