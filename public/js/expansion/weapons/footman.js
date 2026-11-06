const id = 'footman_linebreaker';

export default {
  id,
  weapon: {
    name: 'Linebreaker', icon: 'i_sword', kind: id, directional: true,
    desc: 'Cut into the first foe ahead. The impact staggers it and sends a shock through the rank behind it.',
    base: { dmg: 42, cd: 1.08, area: 1, amount: 1, kb: 0.95, dur: 0.3 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { amount: 1, text: 'Shock can hit {1} more foe.' },
      { area: 0.14, text: 'Cut and shock reach {+14%}.' },
      { cd: -0.12, text: 'Cuts {faster}.' },
      { dmg: 6, text: 'Damage {+6}.' },
      { amount: 1, area: 0.14, text: 'Shock can hit {1} more foe. Cut and shock reach {+14%}.' },
      { dmg: 8, dur: 0.08, text: 'Damage {+8}. Lead foe staggers {longer}.' },
    ],
    evo: { into: 'footman_iron_advance', with: 'armor' },
  },
  evolution: {
    name: 'Iron Advance', icon: 'i_sword', kind: id, evolved: true, directional: true,
    desc: 'An unyielding cut drives a wider, stronger shock through more of the ranks behind the lead foe.',
    base: { dmg: 72, cd: 0.82, area: 1.43, amount: 4, kb: 1.22, dur: 0.48 },
  },
};
