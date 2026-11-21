const id = 'praetorian_shieldward_blade';

export default {
  id,
  weapon: {
    name: 'Shieldward Blade', icon: 'i_praetorian_shieldward_blade', kind: id, directional: true,
    desc: 'Slash a short, narrow lane in front of you, breaking boxes in its path. Face the target to connect. Incoming shots briefly charge your next cut; they are not blocked.',
    base: { dmg: 206, cd: 0.98, area: 1, amount: 1, kb: 0.85, dur: 0.20, guard: 1, reprisal: 0.28 },
    levels: [
      { dmg: 24, text: 'Damage {+24}.' },
      { dur: 0.05, text: 'Guard lasts {0.05s} longer.' },
      { area: 0.13, text: 'Cut and guard area {+13%}.' },
      { cd: -0.14, text: 'Cuts {faster}.' },
      { amount: 1, guard: 1, text: 'Cut {one more foe} and sense {one more incoming shot}.' },
      { dmg: 34, text: 'Damage {+34}.' },
      { dmg: 29, area: 0.12, reprisal: 0.08, text: 'Damage {+29}, area {+12%}, and a stronger reprisal.' },
    ],
    evo: { into: 'praetorian_aegis_reprisal', with: 'vitality' },
  },
  evolution: {
    name: 'Aegis Reprisal', icon: 'i_praetorian_aegis_reprisal', kind: id, directional: true, evolved: true,
    desc: 'A longer, stronger slash cuts more foes and boxes in front. The brief guard senses three incoming shots and charges a fiercer next cut; it does not block damage.',
    base: { dmg: 538, cd: 0.64, area: 1.55, amount: 5, kb: 1.1, dur: 0.31, guard: 3, reprisal: 0.44 },
  },
};
