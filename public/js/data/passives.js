// Passive relics (`stat` is added per rank), and the level-up's filler cards.

export const PASSIVES = {
  might: { name: 'Gauntlets of Might', icon: 'i_might', max: 5, desc: 'Damage {+10%}.', stat: { might: 0.1 } },
  armor: { name: 'Plate Armor', icon: 'i_armor', max: 5, desc: 'Armor {+1}: shrugs off blows.', stat: { armor: 1 } },
  vitality: { name: 'Vitality Amulet', icon: 'i_vitality', max: 5, desc: 'Max health {+15%}.', stat: { maxHp: 0.15 } },
  regen: { name: 'Troll Blood', icon: 'i_regen', max: 5, desc: 'Recover {0.3} health per second.', stat: { regen: 0.3 } },
  cooldown: { name: 'Spellbook', icon: 'i_cooldown', max: 5, desc: 'Cooldowns {-7%}.', stat: { cooldown: -0.07 } },
  area: { name: "Giant's Belt", icon: 'i_area', max: 5, desc: 'Area {+10%}.', stat: { area: 0.1 } },
  projspeed: { name: 'Eagle Feather', icon: 'i_projspeed', max: 5, desc: 'Projectile speed {+12%}.', stat: { projSpeed: 0.12 } },
  duration: { name: 'Hourglass', icon: 'i_duration', max: 5, desc: 'Effects last {+12%} longer.', stat: { duration: 0.12 } },
  movespeed: { name: 'Swift Boots', icon: 'i_movespeed', max: 5, desc: 'Move speed {+8%}.', stat: { speed: 0.08 } },
  magnet: { name: 'Lodestone', icon: 'i_magnet', max: 5, desc: 'Pickup range {+30%}.', stat: { magnet: 0.3 } },
  luck: { name: 'Lucky Clover', icon: 'i_luck', max: 5, desc: 'Luck {+10%}: crits, drops and chests.', stat: { luck: 0.1, crit: 0.02 } },
  hunter: { name: "Hunter's Mark", icon: 'i_hunter', max: 5, desc: 'Damage to champions, lords and bosses {+8%}.', stat: { bane: 0.08 } },
  torc: { name: "Berserker's Torc", icon: 'i_torc', max: 5, desc: 'Damage up to {+10%}, more the lower your health.', stat: { torc: 0.1 } },
  thornmail: { name: 'Thornmail', icon: 'i_thornmail', max: 5, desc: 'A foe that strikes you takes {8} damage back.', stat: { thorns: 8 } },
  cloak: { name: 'Shadow Cloak', icon: 'i_cloak', max: 5, desc: '{4%} to dodge a blow entirely.', stat: { dodge: 0.04 } },
  ember: { name: 'Ember Heart', icon: 'i_ember', max: 5, desc: 'Hits {+5%} to set foes burning.', stat: { ember: 0.05 } },
  ramhorn: { name: "Ram's Horn", icon: 'i_ramhorn', max: 5, desc: 'Knockback {+15%}.', stat: { knock: 0.15 } },
  fang: { name: 'Vampire Fang', icon: 'i_fang', max: 5, desc: 'Heal {0.4%} of the damage you deal.', stat: { fang: 0.004 } },
  rime: { name: 'Rimeheart', icon: 'i_rime', max: 5, desc: 'Foes close by freeze {1s} (+0.2s a rank) when you are struck; bosses only slow.', stat: { rime: 1 } },
  amount: { name: 'Echo Rune', icon: 'i_amount', max: 2, desc: 'Weapons fire {+1} extra projectile.', stat: { amount: 1 }, weight: 0.45 },
  growth: { name: "Scholar's Crown", icon: 'i_growth', max: 5, desc: 'Experience {+7%}.', stat: { growth: 0.07 } },
  // The owner's: "+1 revive, evolves any weapon. Available once you have evolved your main
  // weapon. If you die it disappears and you CAN get it again at some level up." Offered only
  // once one of the hero's own signature weapons has evolved (afterSignature); while held, any
  // weapon at its top level evolves at a chest, its relic held or not (evolvesAny); it is the
  // revive spent first when he falls, and goes with it, to be offered again `again` levels on
  // (Game.relicOffered, Player.hurt). Each time it may be offered it is on the first `sure`
  // level-up screens for certain, after that only by its weight (Game.sureRelic).
  phoenix: {
    name: 'Phoenix Heart', icon: 'i_revival', // placeholder (tools/handoff-art.md)
    max: 1, desc: 'Rise {once} from death. Any weapon at its peak {evolves}, with or without its relic.',
    stat: { revivals: 1 }, weight: 0.35, evolvesAny: true, afterSignature: true, again: 5, sure: 2,
  },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);

// The cards a level-up falls back on once fewer upgrades are left than it offers
// (Game.levelChoices), in the order they come: a stacking Blessing of Valor, a heal, and a purse
// of gold that grows with the night. name: on the card, and as a bot reads it; short: as the
// pause menu names the one every level-up takes once the player ticked ALWAYS on it
// (Game.autoPick).
export const FILLERS = {
  bless: { name: 'Blessing of Valor', short: 'Blessing of Valor', icon: 'i_might' },
  heal: { name: 'Roast Chicken', short: 'Roast Chicken', icon: 'i_vitality' },
  gold: { name: 'Purse of Gold', short: 'Gold', icon: 'i_greed' },
};
export const FILLER_IDS = Object.keys(FILLERS);
