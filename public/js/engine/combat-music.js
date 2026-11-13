// Combat recordings and short midpoint previews for the music menus. Settings store only these IDs.
export const LEGACY_COMBAT_MUSIC = Object.freeze([
  Object.freeze({"id": "clockwork-charge", "name": "Clockwork Charge", "genre": "Orchestral", "piece": "combat-clockwork-charge", "file": "combat/clockwork-charge-15m.mp3", "seconds": 900, "preview": "combat/previews/clockwork-charge-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "lantern-guard", "name": "Lantern Guard", "genre": "Harp", "piece": "combat-lantern-guard", "file": "combat/lantern-guard-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/lantern-guard-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "spark-rush", "name": "Spark Rush", "genre": "Electronic", "piece": "combat-spark-rush", "file": "combat/spark-rush-15m.mp3", "seconds": 900, "preview": "combat/previews/spark-rush-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "dusty-trail-stampede", "name": "Dusty Trail Stampede", "genre": "Country", "piece": "combat-dusty-trail-stampede", "file": "combat/dusty-trail-stampede-15m.mp3", "seconds": 900, "preview": "combat/previews/dusty-trail-stampede-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "steel-tread", "name": "Steel Tread", "genre": "Metal", "piece": "combat-steel-tread", "file": "combat/steel-tread-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/steel-tread-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "bootheel-loop", "name": "Bootheel Loop", "genre": "Country", "piece": "combat-bootheel-loop", "file": "combat/bootheel-loop-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/bootheel-loop-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "neon-motor", "name": "Neon Motor", "genre": "Electronic", "piece": "combat-neon-motor", "file": "combat/neon-motor-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/neon-motor-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
  Object.freeze({"id": "breakbeat-circuit", "name": "Breakbeat Circuit", "genre": "Breakbeat", "piece": "combat-breakbeat-circuit", "file": "combat/breakbeat-circuit-v2-15m.mp3", "seconds": 900, "preview": "combat/previews/breakbeat-circuit-10s.mp3", "previewStart": 445, "previewSeconds": 10}),
]);

// Short, reusable recordings keep the download small; the audio player loops them.
const curated = (id, name, genre, seconds = 0, roles = ['battle', 'boss', 'crypt']) => Object.freeze({
  id, name, genre, roles: Object.freeze(roles), piece: roles.includes('battle') ? 'combat-' + id : 'music-' + id,
  file: `curated/${id}.ogg`, seconds, preview: `curated/previews/${id}-10s.ogg`,
  previewStart: Math.max(0, (seconds - 10) / 2), previewSeconds: 10,
});

export const MUSIC_ROLES = Object.freeze([
  Object.freeze({ id: 'menu', name: 'MENU' }), Object.freeze({ id: 'battle', name: 'BATTLE' }),
  Object.freeze({ id: 'boss', name: 'BOSS' }), Object.freeze({ id: 'crypt', name: 'CRYPT' }),
]);
export const MUSIC_TRACKS = Object.freeze([
  curated('menu-harp', 'Style of Harp', 'Harp', 81.824989, ['menu']),
  curated('menu-guitar', 'A Small Fire Will Do', 'Guitar', 64, ['menu']),
  curated('boss-battle-2', 'Boss Battle #2', 'Symphonic metal', 26.4827664399),
  curated('epic-boss-battle', 'Epic Boss Battle', 'Orchestral', 123.4285941043),
  curated('boss-battle-6', 'Boss Battle #6 Metal', 'Metal', 209.3544444444),
  curated('battle-theme-a', 'Battle Theme A', 'Orchestral', 92.7103401361),
  curated('fairy-battles', 'Fairy Battles', 'Fantasy synth', 97.3333333333),
  ...LEGACY_COMBAT_MUSIC,
]);
export const DEFAULT_MUSIC = Object.freeze({
  menu: 'menu-harp', battle: 'boss-battle-2', boss: 'epic-boss-battle', crypt: 'battle-theme-a',
});
export const musicTracksForRole = (role) => MUSIC_TRACKS.filter(track =>
  (track.roles || ['battle', 'boss', 'crypt']).includes(role));
export const COMBAT_MUSIC = Object.freeze(musicTracksForRole('battle'));
export const DEFAULT_COMBAT_MUSIC = DEFAULT_MUSIC.battle;

export function normalizeMusicTrack(id, role = 'battle') {
  return musicTracksForRole(role).some(track => track.id === id) ? id : DEFAULT_MUSIC[role] || DEFAULT_MUSIC.battle;
}

export function normalizeMusicTracks(value, legacyCombat) {
  const choices = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(MUSIC_ROLES.map(({ id }) => [id,
    normalizeMusicTrack(choices[id] ?? (id === 'battle' ? legacyCombat : undefined), id)]));
}

export function normalizeCombatMusic(id) {
  return normalizeMusicTrack(id, 'battle');
}

export function combatMusicPiece(id) {
  return COMBAT_MUSIC.find((track) => track.id === normalizeCombatMusic(id)).piece;
}

export function isCombatMusicCue(name) {
  return name === 'forest' || name === 'crypt' || name === 'boss' ||
    (typeof name === 'string' && name.startsWith('dungeon-')) ||
    COMBAT_MUSIC.some((track) => track.piece === name);
}

export function musicRoleForCue(name) {
  if (name === 'title') return 'menu';
  if (name === 'forest') return 'battle';
  if (name === 'boss') return 'boss';
  if (name === 'crypt' || (typeof name === 'string' && name.startsWith('dungeon-'))) return 'crypt';
  return null;
}
