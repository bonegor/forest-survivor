const id = 'arcanist_meridian_pendulum';

export default {
  id,
  weapon: {
    name: 'Meridian Pendulum', icon: 'i_arcane', kind: id,
    desc: 'Swing a crystal along a narrow arc at a foe’s distance. It cuts each body once and reverses direction each cast.',
    base: { dmg: 42, cd: 1.1, area: 1, speed: 1, amount: 1, sweep: 0.68 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { area: 0.12, text: 'The arc’s cutting edge widens {12%}.' },
      { amount: 1, text: 'Each sweep can cut {1} more foe.' },
      { cd: -0.1, text: 'Cast {faster}.' },
      { dmg: 6, sweep: 0.08, text: 'Damage {+6}. The crystal swings farther.' },
      { amount: 1, speed: 0.12, text: '{+1} foe per sweep. The crystal swings {faster}.' },
      { dmg: 7, area: 0.12, text: 'Damage {+7}. The arc’s cutting edge widens {12%}.' },
    ],
    evo: { into: 'arcanist_astral_meridian', with: 'projspeed' },
  },
  evolution: {
    name: 'Astral Meridian', icon: 'i_prismatic', kind: id, evolved: true,
    desc: 'An astral crystal sweeps a wider arc, cutting more foes on its way across.',
    base: { dmg: 72, cd: 0.88, area: 1.4, speed: 1.28, amount: 5, sweep: 0.92 },
  },
};
