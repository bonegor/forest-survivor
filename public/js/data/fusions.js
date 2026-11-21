// Fusions (G2 of the 21 November 2026 gameplay review; the owner's "one by one, work them"): two
// evolved weapons of a recipe, both held, become one at a chest (Game.fusable, instead of an
// evolution that chest would make), freeing a slot. The fused weapon is both of them still (its
// parts, Weapon.parts), each striking FUSION.dmg as hard and each blow carrying its partner's mark
// (infuse, Game.hitEnemy), so they feed the reactions (data/reactions.js): Steamvent's frost burns and
// its fire freezes. Its rank (an Overcharge) is its parts'. Each is in data/weapons.js WEAPONS too
// (fusion: true, evolved, so no pool offers it), drawn with an icon of its own (art/icons/fusions.js).
export const FUSION = { dmg: 1.25, freeze: 0.2, freezeT: 1.2, burn: 0.2, bleed: 0.2, dot: 3, stun: 0.3, root: 0.5, slow: 0.4, slowT: 1, fear: 1 };

// The mark each evolution's blows leave, carried by its partner's in a fusion.
export const MARK = {
  frozenheart: 'freeze', hellfire: 'burn', thunderstorm: 'stun', razorfield: 'bleed', briarheart: 'root',
  tempest: 'slow', knell: 'fear', kraken: 'bleed', sanctuary: 'slow',
};
const MARK_WORD = { freeze: 'freezes', burn: 'burns', stun: 'stuns', bleed: 'cuts deep', root: 'roots', slow: 'slows', fear: 'frightens' };

const fusion = (name, icon, of, desc) => ({
  name, icon, kind: 'fusion', evolved: true, fusion: true, of, desc,
  base: { dmg: 0, cd: 1, area: 1 },
});

export const FUSION_WEAPONS = {
  steamvent: fusion('Steamvent', 'i_steamvent', ['frozenheart', 'hellfire'], 'Frozen Heart and Hellfire as one: the frost burns, the fire freezes, and the frozen scald.'),
  stormglaive: fusion('Stormglaive', 'i_stormglaive', ['thunderstorm', 'lodestar'], 'Thunderstorm and Lodestar as one: the circling glaive stuns what it cuts.'),
  briarroad: fusion('Briar Road', 'i_briarroad', ['razorfield', 'briarheart'], 'Razor Field and Briarheart as one: the spikes root, the thorns cut deep.'),
  maelstrom: fusion('Maelstrom', 'i_maelstrom', ['tempest', 'abyss'], 'Tempest and Abyss as one: the pit slows what it drags, the gale hurls it in.'),
  stampede: fusion('Stampede', 'i_stampede', ['knell', 'kraken'], 'Death Knell and Kraken Chains as one: the chains frighten, the fleeing bleed.'),
  hallowedaegis: fusion('Hallowed Aegis', 'i_hallowedaegis', ['aegis', 'sanctuary'], 'Aegis and Sanctuary as one: the blades slow the wicked they cut.'),
};
export const FUSION_IDS = Object.keys(FUSION_WEAPONS);

// The fusion two weapons (their ids) make, or null.
export function fusionOf(a, b) {
  for (const id of FUSION_IDS) {
    const [x, y] = FUSION_WEAPONS[id].of;
    if ((x === a && y === b) || (x === b && y === a)) return id;
  }
  return null;
}

// What a part's blows carry: its partner's mark (null for none).
export const infuseOf = (partnerId) => MARK[partnerId] || null;

// The chest screen's lines for a fusion (game/chests.js evolveLines): its parents, and what each now does.
export function fusionLines(id, names) {
  const [a, b] = FUSION_WEAPONS[id].of, out = [`${names[a]} + ${names[b]}`, `Each strikes ${Math.round((FUSION.dmg - 1) * 100)}% harder`];
  const ma = MARK[a], mb = MARK[b];
  const told = [mb && `${names[a]} ${MARK_WORD[mb]}`, ma && `${names[b]} ${MARK_WORD[ma]}`].filter(Boolean);
  if (told.length) out.push(told.join(', '));
  return out;
}
