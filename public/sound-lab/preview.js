import { Game } from '../js/game/game.js';
import { defaultProfile, metaBonuses } from '../js/shared/profile.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../js/data/weapons.js';
import { HEROES } from '../js/data/heroes.js';
import { input } from '../js/engine/input.js';

export const PREVIEW_SECONDS = 8;
const owners = new Map(Object.values(HEROES).flatMap(hero => hero.unique.map(id => [id, hero])));
export const PREVIEW_WEAPONS = Object.entries(WEAPONS).filter(([, def]) => !def.evolved || def.fusion)
  .map(([id, def]) => {
    const owner = owners.get(id);
    const group = def.fusion ? 'Fusions' : def.copperSlot ? 'Cursed copper' : owner ? 'Hero signatures' : 'Shared weapons';
    return { id, name: def.name + (def.copperSlot ? ` · slot ${def.copperSlot}` : ''),
      group, hero: owner?.id || 'knight', owner: owner?.title,
      forms: def.fusion ? [id] : (def.evo?.random || [def.evo?.into]).filter(form => WEAPONS[form]) };
  }).sort((a, b) => a.name.localeCompare(b.name));

// A disposable, ordinary Game. Weapon.update owns its cadence and volley size;
// the lab never reconstructs combat from the weapon's description or writes a save.
export function makeWeaponPreview(id, level, { headless = false } = {}) {
  const choice = PREVIEW_WEAPONS.find(w => w.id === id);
  if (!choice) throw new Error('Unknown preview weapon.');
  const g = new Game({ hero: choice.hero, mode: 's15', map: 'forest', diff: 'easy',
    meta: metaBonuses(defaultProfile()), settings: { numbers: false, softFlash: true, weather: false },
    crypts: false, headless, seed: 9537 });
  g.spawner.update = () => {};
  g.spawnProp = () => null;
  g.weather = null;
  g.banners.length = 0;
  g.enemies.length = g.pickups.length = g.effects.length = 0;
  const p = g.player;
  p.weapons.length = 0;
  p.devGod = true;
  p.ultLocked = true;
  p.addXp = () => {};
  p.aim = 0;
  const def = WEAPONS[id];
  let w;
  if (def.fusion) {
    const [a, b] = def.of.map(part => g.addWeapon(part));
    w = g.fuse(a, b, id);
  } else {
    const form = typeof level === 'string' && choice.forms.includes(level) ? level : id;
    w = g.addWeapon(form, level === MAX_WEAPON_LEVEL ? MAX_WEAPON_LEVEL : 1);
    w.baseId = id;
  }
  for (const [x, y] of [[19, 0], [30, 0], [80, -30], [85, 32], [-65, 20], [-45, -50], [5, 15], [-28, 14], [13, -36], [47, 0], [0, 48], [0, -63]]) {
    const e = g.spawnEnemy('skeleton', p.x + x, p.y + y, { instant: true, aware: true, always: true });
    e.hp = e.maxHp = 1e8;
    e.update = () => {}; // Stationary practice targets; hit/collision remain real.
    // The spores only burst under a foe's feet. One volunteer walks onto each planting.
    if (w.def.kind === 'spores' && x === 19) e.update = dt => {
      const cap = g.effects.find(effect => effect.shroomOf === w);
      if (!cap) return;
      const dx = cap.x - e.x, dy = cap.y - e.y;
      const step = Math.min(1, dt * 70 / Math.max(1, Math.hypot(dx, dy)));
      e.x += dx * step;
      e.y += dy * step;
    };
  }
  input.bot = { x: 0, y: 0 };
  g.syncCam(); g.snapCam();
  return { game: g, weapon: w };
}
