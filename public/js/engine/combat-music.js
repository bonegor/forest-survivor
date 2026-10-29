// The full-length combat recordings offered before a run. Settings store only these IDs.
export const COMBAT_MUSIC = Object.freeze([
  Object.freeze({ id: 'clockwork-charge', name: 'Clockwork Charge', piece: 'combat-clockwork-charge', file: 'combat/clockwork-charge-15m.mp3', seconds: 900 }),
  Object.freeze({ id: 'lantern-guard', name: 'Lantern Guard', piece: 'combat-lantern-guard', file: 'combat/lantern-guard-v2-15m.mp3', seconds: 900 }),
  Object.freeze({ id: 'spark-rush', name: 'Spark Rush', piece: 'combat-spark-rush', file: 'combat/spark-rush-15m.mp3', seconds: 900 }),
]);

export const DEFAULT_COMBAT_MUSIC = 'clockwork-charge';

export function normalizeCombatMusic(id) {
  return COMBAT_MUSIC.some((track) => track.id === id) ? id : DEFAULT_COMBAT_MUSIC;
}

export function combatMusicPiece(id) {
  return COMBAT_MUSIC.find((track) => track.id === normalizeCombatMusic(id)).piece;
}

export function isCombatMusicCue(name) {
  return name === 'forest' || name === 'crypt' || name === 'boss' ||
    (typeof name === 'string' && name.startsWith('dungeon-')) ||
    COMBAT_MUSIC.some((track) => track.piece === name);
}
