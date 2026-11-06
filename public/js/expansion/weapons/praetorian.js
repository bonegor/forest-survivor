const id = 'praetorian_shieldward_blade';

export default {
  id,
  weapon: {
    name: 'Shieldward Blade', icon: 'i_sword', kind: id, directional: true,
    desc: 'Cut a narrow front rank, then briefly guard against incoming shots. A block empowers your next cut.',
    base: { dmg: 43, cd: 0.98, area: 1, amount: 1, kb: 0.85, dur: 0.20, guard: 1, reprisal: 0.28 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { dur: 0.05, text: 'Guard lasts {0.05s} longer.' },
      { area: 0.13, text: 'Cut and guard area {+13%}.' },
      { cd: -0.14, text: 'Cuts {faster}.' },
      { amount: 1, guard: 1, text: 'Cut {one more foe} and block {one more shot}.' },
      { dmg: 7, text: 'Damage {+7}.' },
      { dmg: 6, area: 0.12, reprisal: 0.08, text: 'Damage {+6}, area {+12%}, and a stronger reprisal.' },
    ],
    evo: { into: 'praetorian_aegis_reprisal', with: 'vitality' },
  },
  evolution: {
    name: 'Aegis Reprisal', icon: 'i_armor', kind: id, directional: true, evolved: true,
    desc: 'A stronger cut covers more of the front rank. Your shield holds longer, blocks a third shot and empowers a fiercer reprisal.',
    base: { dmg: 72, cd: 0.74, area: 1.42, amount: 3, kb: 1.1, dur: 0.31, guard: 3, reprisal: 0.44 },
  },
};
