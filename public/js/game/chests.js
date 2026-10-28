// Chests by tier (the reward ladder: a champion's < a crypt lord's < a boss's). One sprite, recoloured
// in code: a champion's or a thief's (`elite`) wood and bronze, a lord's iron and silver, a boss's
// gold and half again as big. Each tier has its own glow and light on the ground and its own room
// light, rays and number of shakes on the chest screen. What a chest holds is drawn as before
// (Game.rollChest); this only says how it is shown.

import { SPR } from '../engine/sprites.js';
import { hexPack } from '../engine/pixels.js';
import { PAL } from '../art/palette.js';
import { WEAPONS, MAX_WEAPON_LEVEL, statsAt } from '../data/weapons.js';
import { FILLER_IDS } from '../data/passives.js';

// The chest sprite's own colours (art/items.js) and what each tier paints them.
const OWN = { dark: PAL.b, wood: PAL.B, band: PAL.y, shine: PAL.Y, lock: PAL.o };
export const CHEST_TIERS = {
  elite: {
    look: { dark: '#733e39', wood: '#b86f50', band: '#be4a2f', shine: '#e4a672', lock: '#d77643' },
    scale: 1, glow: '#d77643', light: 'warm', ray: '#feae34', rays: 12, rayW: 8, room: '255,190,110', shakes: 1, gaps: [0.2, 0.35], hold: 2.5,
  },
  lord: {
    look: { dark: '#262b44', wood: '#3a4466', band: '#8b9bb4', shine: '#ffffff', lock: '#c0cbdc' },
    scale: 1, glow: '#c0cbdc', light: 'cold', ray: '#c0f8ff', rays: 14, rayW: 10, room: '170,200,255', shakes: 2, gaps: [0.25, 0.5], hold: 3.5,
  },
  boss: {
    look: { dark: '#be4a2f', wood: '#feae34', band: '#fee761', shine: '#ffffff', lock: '#e43b44' },
    scale: 1.5, glow: '#fee761', light: 'gold', ray: '#fee761', rays: 18, rayW: 14, room: '255,225,120', shakes: 3, gaps: [0.25, 0.5], hold: 3.5,
  },
};
export const tierOf = (kind) => CHEST_TIERS[kind] || CHEST_TIERS.elite;

// A tier's chest frame (0 shut, 1 open), recoloured once and kept.
export function chestFrame(kind, open = false) {
  const tier = tierOf(kind), fr = SPR.chest.frames[open ? 1 : 0];
  return fr.variant('tier-' + kind, (b) => {
    const map = new Map(Object.entries(OWN).map(([k, c]) => [hexPack(c), hexPack(tier.look[k])]));
    return { w: b.w, h: b.h, d: b.d.map((c) => map.get(c) ?? c) };
  });
}

// The tease, always true: as many beams leak from the crack as the chest holds things, one of them
// orange when it holds an evolution.
export function chestTease(items) {
  return { beams: items.length, orange: items.some((it) => it.type === 'evolve') };
}

// The order things are shown in, least first: a filler, a relic a rank up, a weapon a level up, a
// NEW relic, a NEW weapon, an evolution (last). What is drawn, and in what order, doesn't change. A
// later draw of a weapon or relic first drawn NEW in the same chest comes right after it.
const RANK = (it) =>
  it.type === 'evolve' ? 5 : it.type === 'weapon' ? (it.isNew ? 4 : 2) : it.type === 'passive' ? (it.isNew ? 3 : 1) : 0;
export function revealOrder(items) {
  const keyed = items.map((it, i) => {
    const first = items.findIndex((o) => o.isNew && o.type === it.type && o.id === it.id);
    const rank = first >= 0 && first < i ? RANK(items[first]) + 0.5 : RANK(it);
    return { it, rank, i };
  });
  return keyed.sort((a, b) => a.rank - b.rank || a.i - b.i).map((k) => k.it);
}

// The places a chest's things take on its screen, in the order shown (revealOrder): each its own,
// but fillers of one kind (a maxed build's Blessings, heals or purses) share one, whose count
// climbs as each is shown (28 October 2026), so a boss's chest on a full build no longer shows
// five Blessings alike side by side. Each place: the indices in `items` of its things. What is
// drawn, and when each is shown, doesn't change.
export function chestSlots(items) {
  const slots = [], byType = new Map();
  items.forEach((it, i) => {
    const filler = FILLER_IDS.includes(it.type), s = filler ? byType.get(it.type) : null;
    if (s) s.push(i);
    else {
      const ns = [i];
      slots.push(ns);
      if (filler) byType.set(it.type, ns);
    }
  });
  return slots;
}

// How a chest's screen runs, in seconds (real time): shake sets, the lid, the things one by one
// with the gaps growing from the tier's first to its last (gaps), then its gold counted. Within the
// tier's hold (the reward ladder's: a champion's 2.5 s, a lord's or a boss's 3.5 s), before an
// evolution's ceremony.
export const CHEST_TIME = { set: 0.26, setGap: 0.05, lid: 0.2, toGold: 0.3, gold: 0.45 };
export function chestTimeline(kind, n) {
  const T = CHEST_TIME, tier = tierOf(kind), [first, last] = tier.gaps, open = tier.shakes * (T.set + T.setGap);
  const at = [];
  let t = open + T.lid;
  for (let i = 0; i < n; i++) {
    at.push(t);
    if (i < n - 1) t += n > 2 ? first + ((last - first) * i) / (n - 2) : first;
  }
  const gold = n ? t + T.toGold : t;
  return { open, at, gold, end: gold + T.gold };
}

// An evolution's ceremony on the chest screen (T4, ≤2 s, then the chest's gold): the old icon
// trembles and cracks for `crack` s, one flash (≤0.6) of `flash` s, then the new icon with rays in
// its colour, its name and what changed, until `dur`.
export const CEREMONY = { crack: 0.6, flash: 0.25, dur: 2 };

// The weapon an evolution grew from (its id).
export const evolvedFrom = (id) => Object.keys(WEAPONS).find((k) => WEAPONS[k].evo?.into === id) || null;

// What an evolution changed, at the weapon's top level: up to three lines, its damage first.
const DELTA = [
  ['dmg', 'Damage', (v) => Math.round(v)],
  ['amount', null, (v) => Math.round(v)], // named by what the weapon throws (COUNT_NOUN)
  ['area', 'Area', (v) => `${Math.round(v * 100)}%`],
  ['cd', 'Cooldown', (v) => `${v.toFixed(2)} s`],
];
const COUNT_NOUN = { sword: 'Slashes', bow: 'Arrows', axe: 'Axes', blades: 'Blades', daggers: 'Blades', fireball: 'Fireballs', meteor: 'Meteors', glaive: 'Glaives', wisp: 'Wisps', flask: 'Flasks', summon: 'Skeletons', lightning: 'Bolts', chain: 'Chains',caltrops: 'Caltrops', hook: 'Hooks', thorns: 'Thorns', spiral: 'Axes', lantern: 'Beams', runestone: 'Stones', starfall: 'Stars', leech: 'Chains', spores: 'Mushrooms', hex: 'Curses' };
export function evolveLines(fromId, toId) {
  const a = statsAt(WEAPONS[fromId], MAX_WEAPON_LEVEL), b = statsAt(WEAPONS[toId], MAX_WEAPON_LEVEL);
  const out = [];
  for (const [k, name, fmt] of DELTA) {
    if (a[k] === undefined || b[k] === undefined || Math.abs(a[k] - b[k]) < 1e-9) continue;
    out.push(`${name || COUNT_NOUN[WEAPONS[toId].kind] || 'Count'} ${fmt(a[k])} → ${fmt(b[k])}`);
    if (out.length === 3) break;
  }
  return out;
}

// The colour an icon shows most (its most common bright, saturated pixel): an evolution's rays.
const ICON_COLOR = new Map();
export function iconColor(icon) {
  if (ICON_COLOR.has(icon)) return ICON_COLOR.get(icon);
  const count = new Map();
  for (const c of SPR[icon].frames[0].buf.d) {
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    if (c >>> 24 < 200 || Math.max(r, g, b) < 110 || Math.max(r, g, b) - Math.min(r, g, b) < 60) continue;
    count.set(c, (count.get(c) || 0) + 1);
  }
  let best = 0xff61e7fe, n = 0; // #fee761 if nothing bright
  for (const [c, k] of count) if (k > n) (best = c), (n = k);
  const hex = '#' + [best & 255, (best >>> 8) & 255, (best >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
  ICON_COLOR.set(icon, hex);
  return hex;
}
