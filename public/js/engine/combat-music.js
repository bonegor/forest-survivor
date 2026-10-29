// Combat recordings and short midpoint previews for the music menus. Settings store only these IDs.
export const COMBAT_MUSIC = Object.freeze([
  Object.freeze({"id": "clockwork-charge", "name": "Clockwork Charge", "genre": "Orchestral", "piece": "combat-clockwork-charge", "file": "combat/clockwork-charge-15m.mp3", "seconds": 900, "preview": "combat/previews/clockwork-charge-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "lantern-guard", "name": "Lantern Guard", "genre": "Harp", "piece": "combat-lantern-guard", "file": "combat/lantern-guard-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/lantern-guard-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "spark-rush", "name": "Spark Rush", "genre": "Electronic", "piece": "combat-spark-rush", "file": "combat/spark-rush-15m.mp3", "seconds": 900, "preview": "combat/previews/spark-rush-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "dusty-trail-stampede", "name": "Dusty Trail Stampede", "genre": "Country", "piece": "combat-dusty-trail-stampede", "file": "combat/dusty-trail-stampede-15m.mp3", "seconds": 900, "preview": "combat/previews/dusty-trail-stampede-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "steel-tread", "name": "Steel Tread", "genre": "Metal", "piece": "combat-steel-tread", "file": "combat/steel-tread-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/steel-tread-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "bootheel-loop", "name": "Bootheel Loop", "genre": "Country", "piece": "combat-bootheel-loop", "file": "combat/bootheel-loop-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/bootheel-loop-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "neon-motor", "name": "Neon Motor", "genre": "Electronic", "piece": "combat-neon-motor", "file": "combat/neon-motor-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/neon-motor-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "breakbeat-circuit", "name": "Breakbeat Circuit", "genre": "Breakbeat", "piece": "combat-breakbeat-circuit", "file": "combat/breakbeat-circuit-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/breakbeat-circuit-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
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
