// Passive relics. `stat` is added per rank.

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
  amount: { name: 'Echo Rune', icon: 'i_amount', max: 2, desc: 'Weapons fire {+1} extra projectile.', stat: { amount: 1 }, weight: 0.45 },
  growth: { name: "Scholar's Crown", icon: 'i_growth', max: 5, desc: 'Experience {+7%}.', stat: { growth: 0.07 } },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);
