import { Game } from '../js/game/game.js';
import { defaultProfile, metaBonuses } from '../js/shared/profile.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../js/data/weapons.js';
import { input } from '../js/engine/input.js';

export const PREVIEW_SECONDS = 8;
export const PREVIEW_WEAPONS = [
  ['axe', 'knight'], ['sword', 'knight'], ['bow', 'archer'], ['daggers', 'rogue'],
  ['fireball', 'mage'], ['lightning', 'mage'], ['blades', 'knight'], ['flask', 'knight'],
  ['frost', 'mage'], ['glaive', 'archer'], ['scythe', 'necromancer'], ['twinaxes', 'berserker'],
  ['crossbow', 'witchhunter'], ['thorns', 'druid'], ['goodcopper', 'eanasir'],
].map(([id, hero]) => ({ id, hero, name: WEAPONS[id].name }));

// A disposable, ordinary Game. Weapon.update owns its cadence and volley size;
// the lab never reconstructs combat from the weapon's description or writes a save.
export function makeWeaponPreview(id, level, { headless = false } = {}) {
  const choice = PREVIEW_WEAPONS.find(w => w.id === id) || PREVIEW_WEAPONS[0];
  const g = new Game({ hero: choice.hero, mode: 's15', map: 'forest', diff: 'easy',
    meta: metaBonuses(defaultProfile()), settings: { numbers: false, softFlash: true, weather: false },
    crypts: false, headless });
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
  const w = g.addWeapon(choice.id);
  w.level = level === MAX_WEAPON_LEVEL ? MAX_WEAPON_LEVEL : 1;
  w.recompute();
  for (const [x, y] of [[30, 0], [80, -30], [85, 32], [-65, 20], [-45, -50]]) {
    const e = g.spawnEnemy('skeleton', p.x + x, p.y + y, { instant: true, aware: true, always: true });
    e.hp = e.maxHp = 1e8;
    e.update = () => {}; // Stationary practice targets; hit/collision remain real.
  }
  input.bot = { x: 0, y: 0 };
  g.syncCam(); g.snapCam();
  return { game: g, weapon: w };
}
