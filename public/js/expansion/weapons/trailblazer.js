export const TRAILBLAZER_WEAPON = 'trailblazer_wayline';

export default {
  id: TRAILBLAZER_WEAPON,
  weapon: {
    name: 'Wayline Bow', icon: 'i_bow', kind: TRAILBLAZER_WEAPON,
    desc: 'An arrow pins a tripline along its flight. Other foes that touch it take damage and slow.',
    base: { dmg: 39, cd: 0.92, amount: 1, area: 1, speed: 1, dur: 1.25, kb: 0.65, slow: 0.2 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { dur: 0.25, text: 'Tripline lasts {0.25s} longer.' },
      { amount: 1, text: 'Trips {+1} foe per line.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { cd: -0.14, text: 'Fires {0.14s} faster.' },
      { amount: 1, area: 0.15, text: 'Trips {+1} foe. Tripline reach and width {+15%}.' },
      { dmg: 8, text: 'Damage {+8}.' },
    ],
    evo: { into: 'trailblazer_runewire', with: 'duration' },
  },
  evolution: {
    name: 'Runewire', icon: 'i_stormstring', kind: TRAILBLAZER_WEAPON, evolved: true,
    desc: 'A stronger arrow leaves a wider, longer tripline that deals more damage and slows harder.',
    base: { dmg: 67, cd: 0.7, amount: 4, area: 1.32, speed: 1.14, dur: 1.75, kb: 0.8, slow: 0.28 },
  },
};
