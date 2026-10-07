// Enemy archetypes at "Medium". hp/dmg/spd are scaled by difficulty and time.
// spd is in world pixels per second; r is the collision radius.

export const ENEMIES = {
  bat: { name: 'Cave Bat', sprite: 'bat', hp: 5, spd: 50, dmg: 4, r: 4, xp: 1, ai: 'flyer', mass: 0.6, anim: 9, death: 'dark', fly: true },
  rat: { name: 'Plague Rat', sprite: 'rat', hp: 7, spd: 44, dmg: 4, r: 4, xp: 1, ai: 'walker', mass: 0.6, anim: 8, death: 'blood' },
  slime: { name: 'Bog Slime', sprite: 'slime', hp: 13, spd: 30, dmg: 5, r: 5, xp: 2, ai: 'hopper', mass: 1, anim: 3, death: 'goo', split: 'slimelet', splitN: 2 },
  slimelet: { name: 'Slimelet', sprite: 'slimelet', hp: 5, spd: 40, dmg: 3, r: 3, xp: 1, ai: 'hopper', mass: 0.5, anim: 4, death: 'goo' },
  skeleton: { name: 'Skeleton', sprite: 'skeleton', hp: 16, spd: 33, dmg: 6, r: 5, xp: 2, ai: 'walker', mass: 1, anim: 5, death: 'bones', rise: true },
  zombie: { name: 'Ghoul', sprite: 'zombie', hp: 28, spd: 23, dmg: 8, r: 5, xp: 3, ai: 'walker', mass: 1.4, anim: 3.5, death: 'blood', rise: true },
  wolf: {
    name: 'Dire Wolf', sprite: 'wolf', hp: 20, spd: 56, dmg: 7, r: 6, xp: 3, ai: 'charger', mass: 1.2, anim: 9, death: 'blood',
    charge: { range: 85, spd: 165, wind: 0.45, dur: 0.42, cd: 3.4 },
  },
  goblin: { name: 'Goblin', sprite: 'goblin', hp: 12, spd: 45, dmg: 5, r: 4, xp: 1, ai: 'walker', mass: 0.8, anim: 7, death: 'blood', pack: 4 },
  spider: { name: 'Widow Spider', sprite: 'spider', hp: 22, spd: 54, dmg: 7, r: 6, xp: 3, ai: 'skitter', mass: 1, anim: 10, death: 'dark' },
  ghost: { name: 'Wraith', sprite: 'ghost', hp: 26, spd: 35, dmg: 9, r: 5, xp: 4, ai: 'phaser', mass: 0.7, anim: 3, death: 'ecto', alpha: 0.78, kbRes: 0.5 },
  cultist: {
    name: 'Cultist', sprite: 'cultist', hp: 32, spd: 30, dmg: 6, r: 5, xp: 5, ai: 'caster', mass: 1, anim: 3, death: 'dark',
    shot: { range: 125, cd: 3.2, spd: 72, dmg: 10, kind: 'darkbolt', wind: 0.55 },
  },
  orc: {
    name: 'Orc Brute', sprite: 'orc', hp: 85, spd: 30, dmg: 14, r: 7, xp: 10, ai: 'charger', mass: 3, anim: 4, death: 'blood', kbRes: 0.6,
    charge: { range: 95, spd: 150, wind: 0.6, dur: 0.5, cd: 4.5 },
  },
  imp: { name: 'Imp', sprite: 'imp', hp: 30, spd: 60, dmg: 9, r: 4, xp: 4, ai: 'flyer', mass: 0.7, anim: 8, death: 'ash', fly: true },
  hellhound: {
    name: 'Hellhound', sprite: 'hellhound', hp: 52, spd: 62, dmg: 12, r: 6, xp: 7, ai: 'charger', mass: 1.6, anim: 10, death: 'ash',
    charge: { range: 110, spd: 200, wind: 0.4, dur: 0.45, cd: 3 },
  },
  ogre: { name: 'Cyclops Ogre', sprite: 'ogre', hp: 300, spd: 24, dmg: 24, r: 10, xp: 30, ai: 'walker', mass: 8, anim: 3, death: 'blood', kbRes: 0.9 },
  deathknight: { name: 'Death Knight', sprite: 'deathknight', hp: 190, spd: 40, dmg: 18, r: 6, xp: 22, ai: 'walker', mass: 4, anim: 4, death: 'dark', kbRes: 0.8 },
  thief: { name: 'Gilded Thief', sprite: 'thief', hp: 140, spd: 64, dmg: 0, r: 6, xp: 12, ai: 'flee', mass: 1, anim: 9, death: 'gold', kbRes: 0.3, noTarget: false },

  // Breakable props are enemies that never move and never hurt you.
  barrel: { name: 'Barrel', sprite: 'barrel', hp: 6, spd: 0, dmg: 0, r: 5, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99 },
  crate: { name: 'Crate', sprite: 'crate', hp: 6, spd: 0, dmg: 0, r: 5, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99 },
  urn: { name: 'Urn', sprite: 'urn', hp: 4, spd: 0, dmg: 0, r: 4, xp: 0, ai: 'static', prop: true, death: 'clay', mass: 99 },
  lantern: { name: 'Lantern', sprite: 'lantern', hp: 4, spd: 0, dmg: 0, r: 3, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99, light: 'warm' },

  // Bosses.
  boneking: {
    name: 'King Ossarian', title: 'The Bone King', sprite: 'boneking', hp: 1600, spd: 30, dmg: 16, r: 12, xp: 120, ai: 'boss',
    mass: 40, anim: 3, death: 'bones', kbRes: 0.97, boss: true, color: '#feae34',
  },
  butcher: {
    name: 'Grimgut', title: 'The Butcher', sprite: 'butcher', hp: 2800, spd: 36, dmg: 20, r: 12, xp: 160, ai: 'boss',
    mass: 40, anim: 3.5, death: 'blood', kbRes: 0.97, boss: true, color: '#e43b44',
  },
  lich: {
    name: 'Malgrath', title: 'The Lich', sprite: 'lich', hp: 3600, spd: 26, dmg: 14, r: 10, xp: 220, ai: 'boss',
    mass: 40, anim: 2, death: 'ecto', kbRes: 0.98, boss: true, color: '#9ee562', fly: true,
  },
  demonlord: {
    name: 'Azgaroth', title: 'Lord of Cinders', sprite: 'demonlord', hp: 6500, spd: 33, dmg: 24, r: 16, xp: 400, ai: 'boss',
    mass: 60, anim: 2.5, death: 'ash', kbRes: 0.99, boss: true, color: '#f77622',
  },
};

// Champion name generator (Diablo-style uniques).
export const CHAMPION_PREFIX = ['Grim', 'Rot', 'Blood', 'Bone', 'Gore', 'Ash', 'Dread', 'Plague', 'Night', 'Skull', 'Doom', 'Venom', 'Hate', 'Gloom', 'Black'];
export const CHAMPION_SUFFIX = ['fang', 'maw', 'claw', 'hide', 'rot', 'gut', 'thorn', 'bane', 'spine', 'eye', 'grin', 'wing', 'scar'];
export const CHAMPION_TITLE = ['the Cursed', 'the Hungry', 'the Unclean', 'the Wretched', 'the Vile', 'the Mad', 'the Ravenous', 'the Defiler', 'the Hollow'];
export const CHAMPION_MODS = [
  { id: 'swift', name: 'Swift', color: '#2ce8f5' },
  { id: 'brutal', name: 'Brutal', color: '#e43b44' },
  { id: 'stone', name: 'Stoneskin', color: '#c0cbdc' },
  { id: 'vampiric', name: 'Vampiric', color: '#b55088' },
];
