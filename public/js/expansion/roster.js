// Reviewer design ids stay alongside the save ids so the accepted art is reproducible.
export const LEGACY_DESIGNS = {
  knight: 'heroes7-sentinel',
  archer: 'heroes7-hunter',
  mage: 'heroes7-apprentice',
  rogue: 'heroes7-assassin',
  necromancer: 'heroes7-lich',
  paladin: 'heroes7-guardian-upg',
  druid: 'heroes7-druid',
  berserker: 'heroes5-berserker',
  witchhunter: 'heroes7-crossbowman',
};

// Each recruit's threshold belongs to the preceding hero's run. The order is append-only
// because hero ids are stored as bit positions in profiles.
export const RECRUITS = [
  { id: 'footman', design: 'heroes5-footman', minutes: 5, name: 'Garran', title: 'Footman',
    color: '#8b9bb4', stats: { maxHp: 92, armor: 1 }, perk: 'Drilled Guard: +1 armor', ultimate: 'knight' },
  { id: 'marksman', design: 'heroes5-marksman', minutes: 4, name: 'Isolde', title: 'Marksman',
    color: '#c28569', stats: { maxHp: 76, projSpeed: 1.1 }, perk: 'True Aim: +10% projectile speed', ultimate: 'archer' },
  { id: 'templar', design: 'heroes5-paladin', minutes: 5, name: 'Edric', title: 'Templar',
    color: '#fee761', stats: { maxHp: 84, healMul: 1.2 }, perk: 'Oathkeeper: healing ×1.2', ultimate: 'paladin' },
  { id: 'trailblazer', design: 'heroes5-hunter', minutes: 5, name: 'Sylva', short: 'Trail', title: 'Trailblazer',
    color: '#63c74d', stats: { maxHp: 74, speed: 1.12 }, perk: 'Wayfarer: +12% movement speed', ultimate: 'archer' },
  { id: 'thornkeeper', design: 'heroes5-druid', minutes: 6, name: 'Rowan', short: 'Thorn', title: 'Thornkeeper',
    color: '#9ee562', stats: { maxHp: 92, area: 1.1 }, perk: 'Bramblecraft: +10% area', ultimate: 'druid' },
  { id: 'wraith', design: 'heroes5-assassin', minutes: 6, name: 'Vesper', title: 'Wraith', floating: true,
    color: '#8f5bb0', stats: { maxHp: 62, speed: 1.1, crit: 0.06 }, perk: 'Phantom Edge: +10% speed and +6% crit', ultimate: 'rogue' },
  { id: 'gravebinder', design: 'heroes5-lich', minutes: 7, name: 'Nerezza', short: 'Binder', title: 'Gravebinder',
    color: '#7ac89d', stats: { maxHp: 76, summonDur: 1.15 }, perk: 'Gravecraft: summons last 15% longer', ultimate: 'necromancer' },
  { id: 'arcanist', design: 'heroes5-mage', minutes: 7, name: 'Solas', short: 'Arcane', title: 'Arcanist',
    color: '#b55088', stats: { maxHp: 80, cooldown: 0.92 }, perk: 'Quick Study: cooldowns −8%', ultimate: 'mage' },
  { id: 'praetorian', design: 'heroes6-praetorian', minutes: 8, name: 'Cassian', short: 'Praetor', title: 'Praetorian',
    color: '#c0cbdc', stats: { maxHp: 100, armor: 1, speed: 0.95 }, perk: 'Heavy Plate: +1 armor, −5% speed', ultimate: 'knight' },
  { id: 'seraph', design: 'heroes6-angel', minutes: 8, name: 'Aurelia', title: 'Seraph',
    color: '#f4b95e', stats: { maxHp: 88, regen: 0.25 }, perk: 'Celestial Grace: regenerates 0.25 health per second', ultimate: 'paladin' },
  { id: 'boltguard', design: 'heroes6-crossbowman', minutes: 9, name: 'Bran', short: 'Bolt', title: 'Boltguard',
    color: '#6c91bf', stats: { maxHp: 86, bane: 0.15 }, perk: 'Siege Training: +15% damage to champions, lords and bosses', ultimate: 'archer' },
  { id: 'swordbearer', design: 'heroes7-knecht', minutes: 10, name: 'Leopold', short: 'Bearer', title: 'Swordbearer',
    color: '#da825a', stats: { maxHp: 82, might: 1.08 }, perk: 'Masterwork Steel: +8% damage', ultimate: 'knight' },
];

export const APPROVED_DESIGNS = { ...LEGACY_DESIGNS, ...Object.fromEntries(RECRUITS.map(h => [h.id, h.design])) };
