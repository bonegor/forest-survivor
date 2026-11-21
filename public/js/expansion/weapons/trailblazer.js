export const TRAILBLAZER_WEAPON = 'trailblazer_wayline';

export default {
  id: TRAILBLAZER_WEAPON,
  weapon: {
    name: 'Wayline Bow', icon: 'i_trailblazer_wayline', kind: TRAILBLAZER_WEAPON,
    desc: 'An arrow pins a tripline along its flight. Other foes that touch it take damage and slow.',
    base: { dmg: 129, cd: 0.92, amount: 1, area: 1, speed: 1, dur: 1.25, kb: 0.65, slow: 0.2 },
    levels: [
      { dmg: 13, text: 'Damage {+13}.' },
      { dur: 0.25, text: 'Tripline lasts {0.25s} longer.' },
      { amount: 1, text: 'Trips {+1} foe per line.' },
      { dmg: 20, text: 'Damage {+20}.' },
      { cd: -0.14, text: 'Fires {0.14s} faster.' },
      { amount: 1, area: 0.15, text: 'Trips {+1} foe. Tripline reach and width {+15%}.' },
      { dmg: 26, text: 'Damage {+26}.' },
    ],
    evo: { into: 'trailblazer_runewire', with: 'duration' },
  },
  evolution: {
    name: 'Runewire', icon: 'i_trailblazer_runewire', kind: TRAILBLAZER_WEAPON, evolved: true,
    desc: 'A stronger arrow leaves a wider, longer tripline that deals more damage and slows harder.',
    base: { dmg: 297, cd: 0.62, amount: 5, area: 1.42, speed: 1.14, dur: 2.1, kb: 0.8, slow: 0.28 },
  },
};
