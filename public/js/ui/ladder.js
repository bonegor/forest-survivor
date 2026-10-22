// Wording for the unlock ladder: what to do next, why something is locked,
// and what a finished run just opened up. The rules themselves live in
// shared/profile.js.

import { HEROES } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { HERO_ORDER, FEAT, hasFeat, modeUnlocked, progressList } from '../shared/profile.js';
import { PROGRESS } from '../shared/progress.js';
import { SPR } from '../engine/sprites.js';
import { fmtTime, fmtNum } from '../engine/util.js';
import { heroCrop } from './scenes.js';
import { padlock } from './ui.js';

const title = (id) => `the ${HEROES[id].title}`;
const prevHero = (id) => HERO_ORDER[HERO_ORDER.indexOf(id) - 1];

// One line describing the player's next goal (see nextGoal()).
export function goalText(goal) {
  if (!goal) return 'Every trial is open. Climb the Ranked ladder!';
  switch (goal.type) {
    case 'survive':
      return `Survive ${goal.minutes} minutes with ${title(goal.hero)} to unlock ${title(goal.unlocks)}`;
    case 'survivalHard':
      return goal.unlocks === 'dungeon'
        ? `Survive 15 minutes with ${title(goal.hero)} to open the Dungeon`
        : `Survive 15 minutes with ${title(goal.hero)} to unlock ${title(goal.unlocks)}`;
    case 'dungeon':
      return goal.unlocks === 'ranked'
        ? `Beat the Dungeon with ${title(goal.hero)} to unlock Ranked`
        : `Beat the Dungeon with ${title(goal.hero)} to bring ${title(goal.unlocks)} into it`;
    default:
      return '';
  }
}

// Why a hero can't enter a mode yet (short enough for a mode card).
export function lockReason(p, mode, hero) {
  if (mode === 'dungeon') {
    if (!modeUnlocked(p, 'dungeon')) return 'Survive the night with the Necromancer';
    return `Beat the Dungeon with ${title(prevHero(hero))}`;
  }
  if (mode === 'ranked') return 'Beat the Dungeon with the Necromancer';
  return '';
}

// Announcements for keys returned in reward.unlocks.
export function unlockText(key) {
  const [kind, id] = key.split(':');
  if (kind === 'hero') return `${cap(title(id))} is unlocked!`;
  if (kind === 'dungeon') return `${cap(title(id))} may now enter the Dungeon!`;
  if (key === 'mode:dungeon') return 'The Dungeon is open, starting with the Knight!';
  if (key === 'mode:ranked') return 'Ranked unlocked: the endless night awaits!';
  return '';
}

// Achievement stars for a hero: [label, colour, earned].
export function featStars(p, hero) {
  return [
    ['Night survived', '#fee761', hasFeat(p, hero, FEAT.survivalHard)],
    ['Dungeon', '#9ee562', hasFeat(p, hero, FEAT.dungeon)],
  ];
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ------------------------------------------------------------ the codex --
// The weapons, relics and ultimates a profile has opened or has yet to (shared/profile.js
// progressList, shared/progress.js), as the Codex and the results screen show them.

// What an entry is called: the weapon's or relic's name, the hero's ultimate's.
export function codexName(e) {
  if (e.hidden) return '???';
  if (e.type === 'weapon') return WEAPONS[e.id]?.name || e.id;
  if (e.type === 'relic') return PASSIVES[e.id]?.name || e.id;
  return HEROES[e.id]?.ultName || e.id;
}

// How far the records have come toward a lock still shut, in its own measure ('2:14 best',
// '412 slain'); '' where there is nothing to tell. An ultimate's is his Ranked best, the only time
// kept for each hero, so none is told until there is one.
export function codexRecord(e) {
  if (e.open || e.start) return '';
  const lock = e.type === 'ult' ? { need: 'time', at: PROGRESS.ultTime } : PROGRESS.locks.find((l) => l.type === e.type && l.id === e.id);
  if (!lock) return '';
  const v = Math.floor(e.progress * lock.at + 1e-6);
  if (e.type === 'ult' && !v) return '';
  switch (lock.need) {
    case 'time': return `${fmtTime(v)} best`;
    case 'kills': return `${fmtNum(v)} slain`;
    case 'level': return `level ${v} best`;
    case 'gold': return `${fmtNum(v)} best`;
    case 'bosses': return `${v} best`;
    case 'wins': return `${v} won`;
    case 'deaths': return `${v} fallen`;
    default: return '';
  }
}

// An entry's 16 x 16 icon at (x, y): the weapon's or relic's, or for an ultimate the hero himself
// from the shoulders up. Shut: a ghost of it under a padlock.
export function codexIcon(ctx, e, x, y, shut = !e.open) {
  if (e.hidden) return; // one of the second circle, not yet to be seen
  if (shut) ctx.globalAlpha = 0.28;
  if (e.type === 'ult') {
    const spr = SPR[HEROES[e.id]?.sprite];
    if (spr) {
      const crop = heroCrop(spr), fr = crop.list[0];
      const sx = Math.max(0, Math.round(crop.x + crop.w / 2 - 8)), sy = Math.max(0, crop.y - 1);
      const w = Math.min(16, fr.w - sx), h = Math.min(16, fr.h - sy);
      ctx.drawImage(fr.c, sx, sy, w, h, x + Math.floor((16 - w) / 2), y, w, h);
    }
  } else {
    const icon = (e.type === 'weapon' ? WEAPONS : PASSIVES)[e.id]?.icon;
    if (SPR[icon]) ctx.drawImage(SPR[icon].frames[0].c, x, y);
  }
  ctx.globalAlpha = 1;
  if (shut) padlock(ctx, x + 8, y + 8, 1, '#5a6988', '#8b9bb4');
}

// The Codex's entries for this profile: every weapon and relic, and the ultimates of the heroes
// it has (a hero still to come shows his in time). Those of CODEX_SOON come right after the ones
// open from the start: Consecration first on the weapons' second line (the owner's, 22 October
// 2026), whatever its place in the lock table (whose order the saves' bits keep).
export const CODEX_SOON = ['aura'];
export function codexEntries(p) {
  const all = progressList(p).filter((e) => e.type !== 'ult' || p.heroes?.includes(e.id));
  const soon = all.filter((e) => !e.start && CODEX_SOON.includes(e.id));
  const rest = all.filter((e) => !soon.includes(e));
  for (const e of soon) {
    const at = rest.findLastIndex((x) => x.type === e.type && x.start) + 1;
    rest.splice(at, 0, e);
  }
  return rest;
}

// The n locks nearest to opening, the furthest along first.
export const nearestLocks = (p, n = 2) => codexEntries(p).filter((e) => !e.open).sort((a, b) => b.progress - a.progress).slice(0, n);
