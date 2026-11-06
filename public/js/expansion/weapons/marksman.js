export const MARKSMAN_WEAPON = 'marksman_splitpin';

export default {
  id: MARKSMAN_WEAPON,
  weapon: {
    name: 'Splitpin Crossbow', icon: 'i_crossbow', kind: MARKSMAN_WEAPON,
    desc: 'A heavy bolt stops on impact and sheds two piercing splinters across its path.',
    base: { dmg: 31, cd: 1.08, amount: 1, area: 1, speed: 1, pierce: 1, kb: 0.8 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { area: 0.15, text: 'Splinter travel {+15%}.' },
      { amount: 1, text: '{+2} splinters.' },
      { dmg: 5, text: 'Damage {+5}.' },
      { cd: -0.15, text: 'Reload {0.15s} faster.' },
      { pierce: 1, speed: 0.2, text: 'Splinters pierce {+1} foe; all shots fly {+20%} faster.' },
      { dmg: 7, text: 'Damage {+7}.' },
    ],
    evo: { into: 'marksman_splinterline', with: 'projspeed' },
  },
  evolution: {
    name: 'Splinterline', icon: 'i_purifier', kind: MARKSMAN_WEAPON, evolved: true,
    desc: 'Releases six piercing splinters in a wider pattern. Echo adds pairs, up to eight splinters.',
    base: { dmg: 54, cd: 0.82, amount: 3, area: 1.25, speed: 1.25, pierce: 3, kb: 1 },
  },
};
