const id = 'thornkeeper_briar_compass';

export default {
  id,
  weapon: {
    name: 'Briar Compass', icon: 'i_thorns', kind: id,
    desc: 'Send thorns sweeping inward from around a foe. Each body can be struck once per convergence.',
    base: { dmg: 43, cd: 1.07, area: 1, speed: 1, amount: 1, pierce: 1, kb: 0.45 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { area: 0.15, text: 'Convergence radius {+15%}.' },
      { amount: 1, text: '{+1} thorn and {+1} foe per cast.' },
      { cd: -0.11, pierce: 1, text: 'Cast {faster}. {+1} foe per cast.' },
      { dmg: 7, speed: 0.12, text: 'Damage {+7}. Thorns move {12%} faster.' },
      { amount: 1, area: 0.15, text: '{+1} thorn and {+1} foe per cast. Radius {+15%}.' },
      { dmg: 6, pierce: 1, text: 'Damage {+6}. {+1} foe per cast.' },
    ],
    evo: { into: 'thornkeeper_heartwood_convergence', with: 'area' },
  },
  evolution: {
    name: 'Heartwood Convergence', icon: 'i_worldroot', kind: id, evolved: true,
    desc: 'More and stronger thorns converge across a wider clearing.',
    base: { dmg: 72, cd: 0.87, area: 1.45, speed: 1.3, amount: 4, pierce: 4, kb: 0.6 },
  },
};
