const id = 'templar_votive_edge';

export default {
  id,
  weapon: {
    name: 'Votive Edge', icon: 'i_templar_votive_edge', kind: id, directional: true,
    desc: 'Carve a ward that cuts and slows foes. Step onto its gold seal to recover 30% of a swing.',
    base: { dmg: 95, cd: 1.2, area: 1, amount: 1, dur: 0.88, slow: 0.16 },
    levels: [
      { dmg: 10, text: 'Damage {+10}.' },
      { area: 0.14, text: 'Ward reach and width {+14%}.' },
      { amount: 1, text: 'Ward can cut {1} more foe.' },
      { cd: -0.1, text: 'Carve wards {faster}.' },
      { dmg: 15, dur: 0.12, text: 'Damage {+15}. Wards last {+0.12s}.' },
      { area: 0.14, amount: 1, text: 'Ward reach and width {+14%}. {+1} foe per ward.' },
      { dmg: 18, slow: 0.06, text: 'Damage {+18}. Ordinary foes are slowed {more}.' },
    ],
    evo: { into: 'templar_hallowed_boundary', with: 'area' },
  },
  evolution: {
    name: 'Hallowed Boundary', icon: 'i_templar_hallowed_boundary', kind: id, directional: true, evolved: true,
    desc: 'A wider ward cuts more foes and lasts longer. Step onto its gold seal to recover 45% of a swing.',
    base: { dmg: 250, cd: 0.78, area: 1.52, amount: 6, dur: 1.3, slow: 0.3 },
  },
};
