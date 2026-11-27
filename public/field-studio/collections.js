export function collectionForLink(query, proposals, crystals) {
  const set = query.get('set');
  if (set === 'first' || set === 'new') return set;
  if (set === null) {
    const index = proposals.findIndex(option => option.id === query.get('look'));
    if (index !== -1) return index < 4 ? 'first' : 'new';
  }
  return crystals ? 'new' : 'first';
}

export function collectionOptions(proposals, set) {
  return set === 'first' ? proposals.slice(0, 4) : proposals.slice(4, 8);
}
