const families = [
  [['sword', 'footman', 'swordbearer', 'wraith'], ['sword swing', 'sword slash', 'blade', 'sword attack', 'swish']],
  [['sentinel', 'praetorian'], ['sword swing', 'shield', 'block', 'sword slash', 'steel']],
  [['templar', 'seraph'], ['sword swing', 'holy', 'chime', 'sword slash', 'heal']],
  [['axe', 'twinaxes'], ['axe throw', 'axe', 'swish', 'blade']],
  [['glaive', 'blades', 'scythe'], ['blade', 'swish', 'swing', 'sword']],
  [['daggers'], ['dagger', 'knife swish', 'knife slice', 'knife', 'swish']],
  [['bow', 'crossbow', 'marksman', 'boltguard', 'trailblazer'], ['bow shot', 'crossbow', 'arrow flight', 'arrow fly', 'bow draw', 'arrow']],
  [['fireball', 'steamvent'], ['fireball', 'fire spell', 'flame', 'burn', 'steam']],
  [['flask'], ['explosive flask', 'glass', 'potion', 'fireball', 'shatter', 'flame']],
  [['lightning', 'chain', 'arcane', 'stormglaive'], ['lightning', 'electric', 'zap', 'spark', 'shock']],
  [['frost', 'runestone'], ['ice nova', 'freeze', 'frost', 'crystal', 'stone']],
  [['arcanist'], ['crystal chime', 'chime', 'orb', 'magic', 'bell']],
  [['aura', 'smite', 'lantern', 'hallowedaegis'], ['holy', 'heal', 'chime', 'bell', 'spell']],
  [['starfall'], ['crystal chime', 'crystal', 'chime', 'orb', 'magic']],
  [['thorns', 'roots', 'thornkeeper', 'spores', 'briarroad'], ['plant', 'twig', 'branch', 'wood snap', 'wood']],
  [['raise', 'gravebinder'], ['skeleton', 'bone', 'ghost', 'dark', 'curse']],
  [['hex', 'hollow', 'leech', 'miasma'], ['curse', 'ghost', 'poison', 'dark', 'chain']],
  [['wisps', 'gale', 'maelstrom'], ['wind gust', 'whoosh', 'wind', 'gust', 'swish']],
  [['bell', 'stampede'], ['church bell', 'bell strike', 'bell', 'toll', 'metal chain']],
  [['hook'], ['chain', 'clank', 'hook', 'metal']],
  [['caltrops'], ['metal clank', 'caltrop', 'metal hit', 'stone', 'metal']],
  [['pqc', 'goodcopper'], ['coin spin', 'coins', 'coin', 'metal clank', 'metal']],
  [['merchantwhip'], ['whip', 'swish', 'snap', 'crack']],
];

export function recommendedSounds(weapon, entries) {
  const family = weapon.id.replace(/_.*/, '').replace(/\d+$/, '');
  const words = families.find(([ids]) => ids.includes(family))?.[1] || ['weapon'];
  const scored = [];
  for (const entry of entries) {
    const title = entry.title.toLowerCase().replace(/[-_]/g, ' '), tags = entry.tags.join(' ').toLowerCase();
    let score = 0;
    for (const [i, word] of words.entries()) {
      const weight = words.length - i;
      if (title.includes(word)) score += weight * 4;
      if (tags.includes(word)) score += weight;
    }
    if (score > 0) scored.push({ score: score - (entry.duration > 2.5 ? 2 : 0), entry });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  // Show different takes before numbered variations of a single sound.
  const seen = new Set(), distinct = [], variations = [];
  for (const { entry } of scored) {
    const family = entry.title.replace(/\d+/g, '').trim().toLowerCase();
    (seen.has(family) ? variations : distinct).push(entry);
    seen.add(family);
  }
  return distinct.concat(variations).slice(0, 40);
}
