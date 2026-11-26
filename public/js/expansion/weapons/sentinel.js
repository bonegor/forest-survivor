const id = 'sentinel_watchblade';

export default {
  id,
  weapon: {
    name: 'Watchblade', icon: 'i_sentinel_watchblade', kind: id, directional: true,
    desc: 'Cut foes in front of you. After two cuts connect, bash a wider line with your shield, staggering ordinary foes.',
    base: { dmg: 130, cd: 0.9, amount: 2, area: 1, kb: 0.8, dur: 0.4 },
    levels: [
      { dmg: 18, text: 'Damage {+18}.' },
      { amount: 1, text: 'Cut {1} more foe.' },
      { area: 0.12, text: 'Reach {+12%}.' },
      { cd: -0.12, text: 'Strike {faster}.' },
      { dur: 0.16, dmg: 18, text: 'Stagger lasts {0.16s} longer. Damage {+18}.' },
      { amount: 1, area: 0.12, text: 'Hit {1} more foe. Reach {+12%}.' },
      { dmg: 28, text: 'Damage {+28}.' },
    ],
    evo: { into: 'sentinel_last_bastion', with: 'armor' },
  },
  evolution: {
    name: 'Last Bastion', icon: 'i_sentinel_last_bastion', kind: id, directional: true, evolved: true,
    desc: 'Each successful cut readies a shield bash. The shield hits a wider line and holds ordinary foes longer.',
    base: { dmg: 305, cd: 0.65, amount: 6, area: 1.45, kb: 1.1, dur: 0.75 },
  },
};
