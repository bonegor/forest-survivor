// Enemy archetypes at "Medium". hp/dmg/spd are scaled by difficulty and time.
// spd is in world pixels per second; r is the collision radius; scale, if given, is how much
// bigger than its sprite it is drawn (r is given at that size).
// Three marks a kind may carry, so the new maps' kinds (below) keep the Darkwood's rules without a
// list of ids each (28 October 2026): fry, the small fry never sent as a champion (Spawner.spawnElite;
// it was a list of bats, slimelets and rats); group, how many of it come together at one point of the
// steady horde (Spawner.update; it was the Goblin's id, his three); wicked, the casters the Witch
// Hunter's bolts seek out first (game/effects.js wicked; it was the Cultist's id).

// Crypt lords keep the archer's readable wind-up, but take longer to defeat and enter a
// three-arrow second phase. These multipliers apply only to crypt lords, not other casters.
export const CRYPT_LORD = { health: 2, damage: 1.25, enrageAt: 0.5, cooldown: 0.75, spread: 0.2, arrows: 3 };

export const ENEMIES = {
  bat: { name: 'Cave Bat', sprite: 'bat', hp: 5, spd: 50, dmg: 3, r: 4, xp: 1, ai: 'flyer', mass: 0.6, anim: 9, death: 'dark', fly: true, fry: true },
  rat: { name: 'Plague Rat', sprite: 'rat', hp: 2.5, spd: 44, dmg: 3, r: 4, xp: 1, ai: 'walker', mass: 0.6, anim: 8, death: 'blood', fry: true },
  slime: { name: 'Bog Slime', sprite: 'slime', hp: 13, spd: 30, dmg: 4, r: 5, xp: 2, ai: 'hopper', mass: 1, anim: 3, death: 'goo', split: 'slimelet', splitN: 2 },
  slimelet: { name: 'Slimelet', sprite: 'slimelet', hp: 5, spd: 40, dmg: 2, r: 3, xp: 1, ai: 'hopper', mass: 0.5, anim: 4, death: 'goo', fry: true },
  skeleton: { name: 'Skeleton', sprite: 'skeleton', hp: 16, spd: 33, dmg: 5, r: 5, xp: 2, ai: 'walker', mass: 1, anim: 5, death: 'bones', rise: true },
  zombie: { name: 'Ghoul', sprite: 'zombie', hp: 28, spd: 23, dmg: 7, r: 5, xp: 3, ai: 'walker', mass: 1.4, anim: 3.5, death: 'blood', rise: true },
  wolf: {
    name: 'Dire Wolf', sprite: 'wolf', hp: 20, spd: 56, dmg: 6, r: 6, xp: 3, ai: 'charger', mass: 1.2, anim: 9, death: 'blood',
    charge: { range: 85, spd: 165, wind: 0.45, dur: 0.42, cd: 3.4 },
  },
  goblin: { name: 'Goblin', sprite: 'goblin', hp: 12, spd: 45, dmg: 4, r: 4, xp: 1, ai: 'walker', mass: 0.8, anim: 7, death: 'blood', group: 3 },
  spider: { name: 'Widow Spider', sprite: 'spider', hp: 22, spd: 54, dmg: 7, r: 6, xp: 3, ai: 'skitter', mass: 1, anim: 10, death: 'dark' },
  ghost: { name: 'Wraith', sprite: 'ghost', hp: 26, spd: 35, dmg: 9, r: 5, xp: 4, ai: 'phaser', mass: 0.7, anim: 3, death: 'ecto', alpha: 0.78, kbRes: 0.5 },
  // The red-robed caster: few (weight 1 in the night's pockets), big, and slow.
  cultist: {
    name: 'Cultist', sprite: 'cultist', hp: 32, spd: 27, slower: 0.1, dmg: 6, r: 7.5, scale: 1.5, xp: 5, ai: 'caster', mass: 1, anim: 3, death: 'dark',
    shot: { range: 125, cd: 3.2, spd: 61.2, dmg: 10, kind: 'darkbolt', wind: 0.55 }, wicked: true,
  },
  orc: {
    name: 'Orc Brute', sprite: 'orc', hp: 85, spd: 30, dmg: 14, r: 7, xp: 10, ai: 'charger', mass: 3, anim: 4, death: 'blood', kbRes: 0.6,
    charge: { range: 95, spd: 150, wind: 0.6, dur: 0.5, cd: 4.5 },
  },
  imp: { name: 'Imp', sprite: 'imp', hp: 30, spd: 60, dmg: 8, r: 4, xp: 4, ai: 'flyer', mass: 0.7, anim: 8, death: 'ash', fly: true },
  hellhound: {
    name: 'Hellhound', sprite: 'hellhound', hp: 52, spd: 62, dmg: 10, r: 6, xp: 7, ai: 'charger', mass: 1.6, anim: 10, death: 'ash',
    charge: { range: 110, spd: 200, wind: 0.4, dur: 0.45, cd: 3 },
  },
  ogre: { name: 'Cyclops Ogre', sprite: 'ogre', hp: 300, spd: 24, dmg: 20, r: 10, xp: 30, ai: 'walker', mass: 8, anim: 3, death: 'blood', kbRes: 0.9 },
  deathknight: { name: 'Death Knight', sprite: 'deathknight', hp: 190, spd: 40, dmg: 15, r: 6, xp: 22, ai: 'walker', mass: 4, anim: 4, death: 'dark', kbRes: 0.8 },
  // Each of a crypt's lords (Spawner.spawnLord), boss-sized: it keeps its distance and shoots.
  // The archetype's base health is 600. spawnLord applies CRYPT_LORD.health before difficulty
  // and map scaling: 1,440 in the Darkwood on Elite, about fourteen strikes of a fully grown
  // sword; Normal and Veteran keep their 70% health reduction.
  skeletonarcher: {
    name: 'Skeleton Archer', sprite: 'skeletonarcher', hp: 600, spd: 34, dmg: 8, r: 8, xp: 60, ai: 'caster', mass: 30, anim: 4, death: 'bones', kbRes: 0.95,
    shot: { range: 175, cd: 1.7, spd: 170, dmg: 8, kind: 'arrow', wind: 0.5 },
  },
  // It runs and strolls at a share of the hero's own pace (game/enemies.js THIEF), not at spd.
  // kbRes 1: no blow shoves him; he only runs and strolls at his own pace (22 October 2026).
  thief: { name: 'Gilded Thief', sprite: 'thief', hp: 140, spd: 50, dmg: 0, r: 6, xp: 12, ai: 'flee', mass: 1, anim: 9, death: 'gold', kbRes: 1, noTarget: false },

  // Breakable props are enemies that never move and never hurt you.
  barrel: { name: 'Barrel', sprite: 'barrel', hp: 6, spd: 0, dmg: 0, r: 5, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99 },
  crate: { name: 'Crate', sprite: 'crate', hp: 6, spd: 0, dmg: 0, r: 5, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99 },
  urn: { name: 'Urn', sprite: 'urn', hp: 4, spd: 0, dmg: 0, r: 4, xp: 0, ai: 'static', prop: true, death: 'clay', mass: 99 },
  lantern: { name: 'Lantern', sprite: 'lantern', hp: 4, spd: 0, dmg: 0, r: 3, xp: 0, ai: 'static', prop: true, death: 'wood', mass: 99, light: 'warm' },

  // Bosses.
  // Twice the 30 he walked at (the owner's, 21 October 2026: "Bone King needs to be faster").
  boneking: {
    name: 'King Ossarian', title: 'The Bone King', sprite: 'boneking', hp: 4000, spd: 60, dmg: 16, r: 12, xp: 120, ai: 'boss',
    mass: 40, anim: 3, death: 'bones', kbRes: 0.97, boss: true, color: '#feae34',
  },
  // The owner's (27 October 2026): "the butcher as big as boneking". The King stands 57 px tall as
  // drawn, the Butcher's art 26: drawn at 57/26 of it. His touch (r) is the King's already.
  butcher: {
    name: 'Grimgut', title: 'The Butcher', sprite: 'butcher', hp: 6500, spd: 36, dmg: 20, r: 12, scale: 57 / 26, xp: 160, ai: 'boss',
    mass: 40, anim: 3.5, death: 'blood', kbRes: 0.97, boss: true, color: '#e43b44',
  },
  // The owner's (20 October 2026): "Make the lich king bigger by 50%": drawn at 1.5 times his
  // sprite, r 15 for 10. Then (27 October 2026) "make it as big as bone king": the King stands 57
  // px tall as drawn, the Lich's art 25, so drawn at 57/25 of it. His r stays 15, more than the
  // King's 12; weapons strike him wherever he is drawn anyway (hitbox.js).
  lich: {
    name: 'Malgrath', title: 'The Lich', sprite: 'lich', hp: 4200, spd: 26, dmg: 14, r: 15, scale: 57 / 25, xp: 220, ai: 'boss',
    mass: 40, anim: 2, death: 'ecto', kbRes: 0.98, boss: true, color: '#9ee562', fly: true,
  },
  demonlord: {
    name: 'Azgaroth', title: 'Lord of Cinders', sprite: 'demonlord', hp: 6500, spd: 33, dmg: 24, r: 16, xp: 400, ai: 'boss',
    mass: 60, anim: 2.5, death: 'ash', kbRes: 0.99, boss: true, color: '#f77622',
  },
};

// The new Survival maps' monsters (data/maps.js). The owner's (28 October 2026): "make a few new
// sprites for the monsters, sure and you can also sometimes reuse sprites in different maps, but do
// not alter their health by too much". Each takes a Darkwood kind's place on its map (STANDS_FOR) and
// is that kind in all but its looks: its health, damage, speed, size, experience, weight, gait, way of
// fighting and marks (fry, group, wicked) are the kind's own, copied here, so a kind retuned is
// retuned on every map. Its name, its sprite (its own id: art/monsters-maps.js, the bosses'
// art/bosses-maps.js) and how it dies are its own (Game.deathFx: sand, ice and sap are theirs); a
// slime's recolour splits into its own slimelets, and a caster's shot is its own (game/projectiles.js
// SHOT_LOOK). The four new bosses each fight with a night boss's attacks (kit: game/bosses.js BOSS_AI)
// at his numbers, with their own shot (bolt), summons, blast (a game/effects.js style), words (lines,
// as the kit says them) and particle colours (sparks, palette keys), and stand as tall as the Butcher
// and the Lich (57 px: 57 over the height of their art, 28 rows each). A map's harder or
// gentler night is in who comes when (data/maps.js pockets) and its foe factors, never here.
// [id, the Darkwood kind it stands for, what is its own]
const MAP_KINDS = [
  // The Sunscorch (desert).
  ['scarab', 'rat', { name: 'Carrion Scarab', death: 'goo' }],
  ['vulture', 'bat', { name: 'Carrion Vulture', death: 'blood' }],
  ['mummy', 'zombie', { name: 'Mummy', death: 'sand' }],
  ['scorpion', 'spider', { name: 'Dune Scorpion', death: 'goo' }],
  ['sandgolem', 'ogre', { name: 'Sand Golem', death: 'sand' }],
  ['anubite', 'deathknight', { name: 'Anubite Guard', death: 'sand' }],
  ['sandslime', 'slime', { name: 'Quicksand Ooze', death: 'sand', split: 'sandslimelet' }],
  ['sandslimelet', 'slimelet', { name: 'Ooze Droplet', death: 'sand' }],
  ['jackal', 'wolf', { name: 'Dune Jackal' }],
  ['dustwraith', 'ghost', { name: 'Dust Wraith', death: 'sand' }],
  // The Frostfell (frozen).
  ['snowowl', 'bat', { name: 'Rime Owl', death: 'ice' }],
  ['frostwisp', 'ghost', { name: 'Frost Wisp' }],
  ['frostwitch', 'cultist', { name: 'Frost Witch', death: 'ice', shot: { ...ENEMIES.cultist.shot, kind: 'iceshard' } }],
  ['yeti', 'orc', { name: 'Yeti' }],
  ['icetroll', 'ogre', { name: 'Frost Troll', death: 'ice' }],
  ['lemming', 'rat', { name: 'Frost Lemming' }],
  ['frostslime', 'slime', { name: 'Frost Slime', death: 'ice', split: 'frostslimelet' }],
  ['frostslimelet', 'slimelet', { name: 'Frost Slimelet', death: 'ice' }],
  ['frostbitten', 'zombie', { name: 'Frostbitten', death: 'ice' }],
  ['icewidow', 'spider', { name: 'Ice Widow', death: 'ice' }],
  ['iceimp', 'imp', { name: 'Ice Imp', death: 'ice' }],
  ['frosthound', 'hellhound', { name: 'Winter Hound', death: 'ice' }],
  ['rimeknight', 'deathknight', { name: 'Rime Knight', death: 'ice' }],
  // The Bloomvale (meadow).
  ['bee', 'bat', { name: 'Giant Bee', death: 'sap' }],
  ['rabbit', 'rat', { name: 'Killer Rabbit' }],
  ['myconid', 'skeleton', { name: 'Myconid', death: 'sap' }],
  ['flytrap', 'zombie', { name: 'Snapjaw', death: 'sap' }],
  ['mantis', 'wolf', { name: 'Orchid Mantis', death: 'goo' }],
  ['pixie', 'ghost', { name: 'Pixie' }],
  ['boar', 'orc', { name: 'Thornback Boar' }],
  ['treant', 'ogre', { name: 'Blossom Treant', death: 'sap' }],
  ['petalslime', 'slime', { name: 'Petal Slime', death: 'sap', split: 'petalslimelet' }],
  ['petalslimelet', 'slimelet', { name: 'Petal Slimelet', death: 'sap' }],
  ['thornwitch', 'cultist', { name: 'Thorn Witch', death: 'sap', shot: { ...ENEMIES.cultist.shot, kind: 'thornbolt' } }],
  ['thornknight', 'deathknight', { name: 'Thorn Knight', death: 'sap' }],
  // The Abyss (hell).
  ['flameskull', 'bat', { name: 'Flameskull', death: 'ash' }],
  ['fiend', 'goblin', { name: 'Fiendling', death: 'ash' }],
  ['demonbrute', 'orc', { name: 'Horned Brute' }],
  ['lavagolem', 'ogre', { name: 'Magma Golem', death: 'ash' }],
  ['cinderrat', 'rat', { name: 'Cinder Rat', death: 'ash' }],
  ['magmaslime', 'slime', { name: 'Magma Slime', death: 'ash', split: 'magmaslimelet' }],
  ['magmaslimelet', 'slimelet', { name: 'Magma Slimelet', death: 'ash' }],
  ['damned', 'zombie', { name: 'The Damned' }],
  ['hellwraith', 'ghost', { name: 'Tormented Soul', death: 'ash' }],
  // Their bosses (data/maps.js bosses): the last of the night on the Sunscorch, the Frostfell and the
  // Bloomvale; in the Abyss its second, before Azgaroth.
  ['pharaoh', 'boneking', {
    name: 'Neferkhet', title: 'The Undying Pharaoh', scale: 57 / 28, death: 'sand', color: '#fee761', kit: 'boneking', bolt: 'firebolt', summon: 'mummy', blast: 'holy',
    lines: { summon: ['RISE FROM THE SANDS!', 'KNEEL BEFORE YOUR PHARAOH!', 'MY TOMB IS YOUR GRAVE!'] },
  }],
  ['frostgiant', 'butcher', {
    name: 'Hrimgar', title: 'The Frost Giant', scale: 57 / 28, death: 'ice', color: '#2ce8f5', kit: 'butcher', blast: 'frost', sparks: 'wGX',
    lines: { enrage: 'NOW YOU FREEZE!', dash: ['CRUSH!', 'NOWHERE TO RUN!', 'FALL BEFORE WINTER!'] },
  }],
  ['thornqueen', 'lich', {
    name: 'Sylvaine', title: 'The Thorn Queen', scale: 57 / 28, death: 'sap', color: '#b55088', kit: 'lich', bolt: 'queenthorn', summon: 'pixie', sparks: 'iPYL',
    lines: { summon: ['BLOOM, MY CHILDREN!', 'THE THORNS REMEMBER YOU.', 'SLEEP AMONG MY ROSES.'] },
  }],
  ['pitlord', 'boneking', {
    name: 'Belzakor', title: 'The Pit Lord', scale: 57 / 28, death: 'ash', color: '#be4a2f', kit: 'boneking', bolt: 'firebolt', summon: 'fiend', blast: 'fire',
    lines: { summon: ['TO ME, MY LEGION!', 'KNEEL BEFORE THE PIT!', 'THE ABYSS HUNGERS!'] },
  }],
];
// Each of them -> the Darkwood kind it stands for: whose place on its map it takes and whose numbers
// it has (test/maps.test.js holds every one to its health).
export const STANDS_FOR = {};
for (const [id, kind, own] of MAP_KINDS) {
  ENEMIES[id] = { ...ENEMIES[kind], sprite: id, ...own };
  STANDS_FOR[id] = kind;
}

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
