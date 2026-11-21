export const MARKSMAN_WEAPON = 'marksman_splitpin';

export default {
  id: MARKSMAN_WEAPON,
  weapon: {
    name: 'Splitpin Crossbow', icon: 'i_marksman_splitpin', kind: MARKSMAN_WEAPON,
    desc: 'A heavy bolt stops on impact and sheds two piercing splinters across its path.',
    base: { dmg: 102, cd: 1.08, amount: 1, area: 1, speed: 1, pierce: 1, kb: 0.8 },
    levels: [
      { dmg: 13, text: 'Damage {+13}.' },
      { area: 0.15, text: 'Splinter travel {+15%}.' },
      { amount: 1, text: '{+2} splinters.' },
      { dmg: 17, text: 'Damage {+17}.' },
      { cd: -0.15, text: 'Reload {0.15s} faster.' },
      { pierce: 1, speed: 0.2, text: 'Splinters pierce {+1} foe; all shots fly {+20%} faster.' },
      { dmg: 23, text: 'Damage {+23}.' },
    ],
    evo: { into: 'marksman_splinterline', with: 'projspeed' },
  },
  evolution: {
    name: 'Splinterline', icon: 'i_marksman_splinterline', kind: MARKSMAN_WEAPON, evolved: true,
    desc: 'Releases six piercing splinters in a wider pattern. Echo adds pairs, up to eight splinters.',
    base: { dmg: 264, cd: 0.72, amount: 3, area: 1.35, speed: 1.25, pierce: 3, kb: 1 },
  },
};
