const id = 'wraith_aftercut';

export default {
  id,
  weapon: {
    name: 'Aftercut Blade', icon: 'i_shadowblade', kind: id, directional: true,
    desc: 'Cut ahead and leave a shade behind. Your next cut also strikes from the shade’s position. Each foe takes only one hit per cast.',
    base: { dmg: 41, cd: 1.02, area: 1, amount: 1, dur: 1.6, kb: 0.9, echo: 0.56 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { area: 0.14, text: 'Cut reach {+14%}.' },
      { amount: 1, text: 'Both cuts can hit {1} more foe.' },
      { cd: -0.1, text: 'Cut {faster}.' },
      { dmg: 6, dur: 0.2, text: 'Damage {+6}. Shades last {+0.2s}.' },
      { area: 0.12, echo: 0.08, text: 'Cut reach {+12%}. Shade damage {+8% of blade damage}.' },
      { dmg: 7, amount: 1, text: 'Damage {+7}. Both cuts can hit {1} more foe.' },
    ],
    evo: { into: 'wraith_echo_of_the_veil', with: 'movespeed' },
  },
  evolution: {
    name: 'Echo of the Veil', icon: 'i_shadowstrike', kind: id, directional: true, evolved: true,
    desc: 'A longer blade leaves a stronger shade. Each foe can still take only one hit per cast.',
    base: { dmg: 72, cd: 0.79, area: 1.42, amount: 4, dur: 2.1, kb: 1.05, echo: 0.75 },
  },
};
