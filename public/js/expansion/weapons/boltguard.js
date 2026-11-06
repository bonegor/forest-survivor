export const BOLTGUARD_WEAPON = 'boltguard_ratchet';

export default {
  id: BOLTGUARD_WEAPON,
  weapon: {
    name: 'Ratchet Crossbow', icon: 'i_crossbow', kind: BOLTGUARD_WEAPON,
    desc: 'Piercing ordinary foes cranks the bolt, adding 12% damage to later impacts. Stops on a strong foe.',
    base: { dmg: 40, cd: 1.1, area: 1, speed: 1, dur: 1, pierce: 2, kb: 0.7, crank: 0.12, crankCap: 0.36 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { pierce: 1, text: 'Pierce {+1} foe.' },
      { speed: 0.15, text: 'Bolts fly {+15%} faster.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { crank: 0.03, crankCap: 0.09, text: 'Crank {+15%} per pierce, up to {+45%}.' },
      { cd: -0.12, pierce: 1, text: 'Reload {0.12s} faster; pierce {+1} foe.' },
      { dmg: 8, text: 'Damage {+8}.' },
    ],
    evo: { into: 'boltguard_bastion_crank', with: 'hunter' },
  },
  evolution: {
    name: 'Bastion Crank', icon: 'i_purifier', kind: BOLTGUARD_WEAPON, evolved: true,
    desc: 'The heavy bolt cranks 18% per ordinary foe, up to 54%. Extra projectiles add penetration, up to eight impacts.',
    base: { dmg: 69, cd: 0.86, area: 1.16, speed: 1.28, dur: 1.1, pierce: 5, kb: 0.85, crank: 0.18, crankCap: 0.54 },
  },
};
