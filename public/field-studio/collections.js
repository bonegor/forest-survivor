export function collectionForLink(query, proposals, crystals) {
  const set = query.get('set');
  if (!crystals && set === 'refined') return set;
  if (set === 'first' || set === 'new') return set;
  if (set === null) {
    if (!crystals && query.get('look') === 'refined') return 'refined';
    const index = proposals.findIndex(option => option.id === query.get('look'));
    if (index !== -1) return index < 4 ? 'first' : 'new';
  }
  return crystals ? 'new' : 'refined';
}

export function collectionOptions(proposals, set) {
  if (set === 'refined') return proposals.filter(option => option.id === 'refined');
  return set === 'first' ? proposals.slice(0, 4) : proposals.slice(4, 8);
}
