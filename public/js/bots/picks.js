// Level-up policies for bots: which card to take when a level-up is offered.
// A bot may pick for itself; otherwise the run's policy decides.
//
//   PICKS.name = { about, pick(cards, view) -> index }
//
// cards: [{ type: 'weapon' | 'passive' | 'bless' | 'haste' | 'reach' | 'heal' | 'gold', id, name,
//           level, isNew, value }]

import { WEAPONS } from '../data/weapons.js';
import { HEROES } from '../data/heroes.js';

// Index of the card with the lowest score (the first one on ties).
function lowest(cards, score) {
  let bi = 0, bs = Infinity;
  cards.forEach((c, i) => {
    const s = score(c);
    if (s < bs) {
      bs = s;
      bi = i;
    }
  });
  return bi;
}

// Relics worth having, best first (the balance harness's order).
const GOOD = ['might', 'area', 'cooldown', 'amount', 'armor', 'vitality', 'regen', 'duration', 'projspeed', 'movespeed'];
// The shared weapons (data/heroes.js SHARED_WEAPONS) each hero's bot takes first, best first:
// what suits him, and clears the horde round him, before the rest (any other comes after).
const WEAPON_PREF = {
  knight: ['aura', 'blades', 'axe', 'thorns'],
  archer: ['glaive', 'wisps', 'thorns', 'lightning'],
  mage: ['lightning', 'arcane', 'frost', 'flask'],
  rogue: ['flask', 'caltrops', 'glaive', 'wisps'],
  necromancer: ['blades', 'lightning', 'wisps', 'axe'],
  paladin: ['aura', 'blades', 'lightning', 'axe'],
  druid: ['thorns', 'wisps', 'frost', 'flask'],
  berserker: ['aura', 'blades', 'axe', 'caltrops'],
  witchhunter: ['glaive', 'lightning', 'arcane', 'wisps'],
  eanasir: ['blades', 'lightning', 'aura', 'axe'],
  footman: ['aura', 'blades', 'axe', 'lightning'],
  marksman: ['lightning', 'glaive', 'blades', 'wisps'],
  templar: ['aura', 'blades', 'lightning', 'axe'],
  trailblazer: ['lightning', 'glaive', 'wisps', 'blades'],
  thornkeeper: ['blades', 'lightning', 'aura', 'axe'],
  wraith: ['aura', 'blades', 'glaive', 'lightning'],
  gravebinder: ['blades', 'lightning', 'aura', 'axe'],
  arcanist: ['lightning', 'arcane', 'blades', 'flask'],
  praetorian: ['aura', 'blades', 'axe', 'lightning'],
  seraph: ['aura', 'blades', 'lightning', 'axe'],
  boltguard: ['lightning', 'glaive', 'blades', 'wisps'],
  swordbearer: ['aura', 'blades', 'axe', 'lightning'],
};
const prefOf = (v, id) => {
  const list = WEAPON_PREF[v.hero] || [], r = list.indexOf(id);
  return (r < 0 ? list.length : r) * 0.01;
};
// Whether a relic evolves a weapon the hero holds.
const evolves = (v, id) => v.me.weapons.some((w) => !w.evolved && WEAPONS[w.id]?.evo?.with === id);

export function tacticalScore(c, v) {
  const held = v.me.weapons, signature = HEROES[v.hero]?.unique || [];
  if (c.type === 'weapon') {
    if (!c.isNew) return signature.includes(c.id) ? .3 - c.level * .02 : .7;
    const rank = (WEAPON_PREF[v.hero] || []).indexOf(c.id);
    // Two-starter kits still need the same three shared support slots as a
    // one-starter hero. Counting only four total quietly denied them a third.
    const target = Math.min(6, 3 + signature.length);
    return rank >= 0 && held.length < target ? 1 + rank * .15 : 16;
  }
  if (c.type === 'passive') {
    if (c.id === 'phoenix') return .15;
    const partner = held.find(w => !w.evolved && WEAPONS[w.id]?.evo?.with === c.id);
    if (c.isNew && partner) return partner.level >= 6 ? .1 : 1.5;
    const good = ['might', 'cooldown', 'area', 'amount', 'armor', 'regen', 'vitality'];
    const i = good.indexOf(c.id);
    const reserved = new Set(held.filter(w => !w.evolved).map(w => WEAPONS[w.id]?.evo?.with).filter(Boolean));
    for (const id of Object.keys(v.me.passives)) reserved.delete(id);
    const spare = (v.me.relicSlots ?? 6) - Object.keys(v.me.passives).length - reserved.size;
    if (c.isNew && spare <= 0) return 18;
    return i < 0 ? 17 : 2 + i * .4 + (c.isNew ? .3 : 0);
  }
  if (c.type === 'heal') return v.me.hpFrac < .55 ? .8 : 25;
  if (c.type === 'bless') return 5;
  if (c.type === 'haste') return 4;
  if (c.type === 'reach') return 6;
  return 26;
}

export const PICKS = {
  tactical: {
    about: 'Builds around each hero, reserves evolution relic slots and uses owned rerolls/banishes to avoid dead-end cards',
    score: tacticalScore,
    pick: (cards, v) => lowest(cards, c => tacticalScore(c, v)),
  },
  first: { about: 'Always the first card', pick: () => 0 },
  random: { about: 'Any card, at random', pick: (cards, v) => Math.floor(v.rng() * cards.length) },
  weapons: { about: 'New weapons, then weapon upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'weapon' ? 2 : c.isNew ? 0 : 1)) },
  relics: { about: 'New relics, then relic upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'passive' ? 2 : c.isNew ? 0 : 1)) },
  build: {
    about: "A sensible build: grow weapons, add up to four (the shared ones that suit the hero first), then the relics that evolve them, then useful relics",
    pick: (cards, v) =>
      lowest(cards, (c) => {
        if (c.type === 'weapon' && !c.isNew) return 0;
        if (c.type === 'weapon' && v.me.weapons.length < 4) return 1 + prefOf(v, c.id);
        if (c.type === 'passive' && c.isNew && evolves(v, c.id)) return 1.9;
        if (c.type === 'passive') {
          const r = GOOD.indexOf(c.id);
          return 2 + (r < 0 ? 20 : r) + (c.isNew ? 0.5 : 0);
        }
        if (c.type === 'heal') return v.me.hp < v.me.maxHp * 0.7 ? 29 : 31;
        return c.type === 'bless' ? 30 : 32;
      }),
  },
};
