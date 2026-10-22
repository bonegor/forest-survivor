// Player profile persistence.
//
// Preferred: the Node server keeps the profile in an encrypted, HttpOnly
// cookie and exposes /api/*. If the game is served from static hosting (no
// API), it falls back to a plain client-side cookie with the same rules.
// Either way, a save that exists but can't be read is flagged in
// store.unreadable so the title screen can offer a fresh start.
// Settings always live in a small client cookie. A run is never saved: progress
// is kept only when it ends (death, Quit Run, or victory), through submitRun.
//
// The debug address (?DEBUG_FLAG, an unlisted token; an unlisted folder forwards there) opens every hero and mode, in a save of its
// own (a client cookie even where the server is), so nothing played there touches the real one.

import * as P from '../shared/profile.js';
import { DEBUG_FLAG } from './debugflag.js';

export const DEBUG = !!globalThis.location && new URLSearchParams(globalThis.location.search).has(DEBUG_FLAG);
const LOCAL_PROFILE = DEBUG ? 'fs_dprofile' : 'fs_lprofile';
// The game once kept a run to pick up again in these (the server's own, fs_run, it deletes
// itself); one a player still has is deleted when the game loads, so nothing lingers.
const STALE_RUNS = ['fs_lrun', 'fs_drun'];

// Every hero in, and as if each had survived the night and beaten the Dungeon: every mode open
// to every hero (shared/profile.js canPlay); every weapon, relic and ultimate open, and the
// Armory's weapon and relic slots full (P.openEverything).
export function unlockEverything(p) {
  p.heroes = [...P.HERO_ORDER];
  for (const h of P.HERO_ORDER) p.feats[h] = (p.feats[h] || 0) | P.FEAT.survivalHard | P.FEAT.dungeon;
  P.openEverything(p);
  return p;
}
const SETTINGS = 'fs_settings';
const MAX_AGE = 60 * 60 * 24 * 400;

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : null;
}

function writeCookie(name, value) {
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : '';
  if (value == null) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  else document.cookie = `${name}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
}

async function api(path, body) {
  const res = await fetch('/api/' + path, body === undefined
    ? { credentials: 'same-origin', cache: 'no-store' }
    : { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { data, status: res.status });
  return data;
}

// The game's server is there but failing (no answer at all, or a 5xx), as against a
// host with no game API, which answers 404 or with something that isn't ours.
const serverDown = (e) => (e.status ? e.status >= 500 : e instanceof TypeError);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The game opened on this machine (localhost, 127.x.x.x, [::1]), not as a published site.
export const onThisMachine = (host = globalThis.location?.hostname || '') =>
  /^(?:(?:[^.]+\.)*localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(host);

export const store = {
  mode: 'local',
  profile: P.defaultProfile(),
  lastReward: null,
  unreadable: null, // { profile: true } when a save exists but can't be read
  offline: false, // the game's server can't be reached: nothing can be loaded or saved

  async init() {
    for (const name of STALE_RUNS) if (readCookie(name) != null) writeCookie(name, null);
    for (let attempt = 0; !DEBUG; attempt++) {
      try {
        const data = await api('state');
        if (!data.server) throw new Error('not our server');
        this.mode = 'server';
        this.offline = false;
        this.profile = P.sanitizeProfile(data.profile);
        this.unreadable = data.unreadable?.profile ? { profile: true } : null;
        return this;
      } catch (e) {
        if (!serverDown(e)) break;
        // Not the cookie save in its place: progress made there would never reach the server's.
        if (attempt === 2) {
          this.mode = 'server';
          this.offline = true;
          return this;
        }
        await sleep(600 * 2 ** attempt);
      }
    }
    // Static hosting: the save is a plain client cookie.
    this.mode = 'local';
    this.offline = false;
    const rawProfile = readCookie(LOCAL_PROFILE);
    const profile = rawProfile ? P.decodeState(rawProfile) : null;
    this.profile = P.sanitizeProfile(profile);
    if (DEBUG) unlockEverything(this.profile);
    this.unreadable = rawProfile && !profile ? { profile: true } : null;
    return this;
  },

  // Accept the loss of an unreadable save: wipe it and carry on.
  async startFresh() {
    const bad = this.unreadable;
    this.unreadable = null;
    if (bad) await this.reset();
  },

  saveLocal() {
    writeCookie(LOCAL_PROFILE, P.encodeState(P.packProfile(this.profile)));
  },

  // The run's reward. When the server doesn't take the run nothing changes, and the reward
  // comes back with unsaved set (down: worth trying again) for the results screen to say so.
  async submitRun(run) {
    if (this.mode === 'server') {
      try {
        const data = await api('run', run);
        this.profile = P.sanitizeProfile(data.profile);
        this.lastReward = data.reward;
        return data.reward;
      } catch (e) {
        return { collected: 0, bonus: 0, total: 0, multiplier: 1, unsaved: true, down: serverDown(e), error: e.message };
      }
    }
    const r = P.applyRun(this.profile, run);
    if (r.ok) {
      this.profile = r.profile;
      this.saveLocal();
      this.lastReward = r.reward;
      return r.reward;
    }
    return { collected: 0, bonus: 0, total: 0, multiplier: 1 };
  },

  async buy(id) {
    if (this.mode === 'server') {
      const data = await api('buy', { id }).catch((e) => e.data || {});
      if (data.profile) this.profile = P.sanitizeProfile(data.profile);
      return !data.error;
    }
    const r = P.buyUpgrade(this.profile, id);
    if (r.ok) {
      this.profile = r.profile;
      this.saveLocal();
    }
    return r.ok;
  },

  // A shared weapon left at home (on) or taken along again (shared/profile.js setHome).
  async setHome(id, on) {
    if (this.mode === 'server') {
      const data = await api('home', { id, on }).catch((e) => e.data || {});
      if (data.profile) this.profile = P.sanitizeProfile(data.profile);
      return !data.error;
    }
    const r = P.setHome(this.profile, id, on);
    if (r.ok) {
      this.profile = r.profile;
      this.saveLocal();
    }
    return r.ok;
  },

  // Debug only (the debug flag): upgrades set to any ranks, { id: rank }, at no cost.
  setUpgrades(ranks) {
    if (!DEBUG) return false;
    for (const [id, r] of Object.entries(ranks)) {
      const u = P.UPGRADES.find((x) => x.id === id);
      if (!u) continue;
      const rank = Math.max(0, Math.min(u.max, Math.floor(r)));
      if (rank) this.profile.up[id] = rank;
      else delete this.profile.up[id];
    }
    this.saveLocal();
    return true;
  },

  async refund() {
    if (this.mode === 'server') {
      const data = await api('refund', {});
      this.profile = P.sanitizeProfile(data.profile);
      return data.refunded;
    }
    const r = P.refundUpgrades(this.profile);
    this.profile = r.profile;
    this.saveLocal();
    return r.refunded;
  },

  // ------------------------------------------------------ developer mode --
  // On the server these need a developer session (see server.js). With plain
  // static hosting the save is a client cookie anyway, so they just work, but
  // only on this machine: the published game has no developer mode.

  async devStatus() {
    if (this.mode !== 'server') {
      const here = onThisMachine();
      return { enabled: here, open: here, authed: here, local: true };
    }
    try {
      return await api('dev');
    } catch {
      return { enabled: false, open: false, authed: false };
    }
  },

  async devLogin(key) {
    return api('dev/login', { key });
  },

  async devLogout() {
    return api('dev/logout', {});
  },

  // Replace the whole profile with anything (it is still sanitized).
  async devSaveProfile(profile) {
    if (this.mode === 'server') {
      const data = await api('dev/profile', { profile });
      this.profile = P.sanitizeProfile(data.profile);
    } else {
      this.profile = P.sanitizeProfile(profile);
      this.saveLocal();
    }
    return this.profile;
  },

  async reset() {
    if (this.mode === 'server') {
      const data = await api('reset', {});
      this.profile = P.sanitizeProfile(data.profile);
      return;
    }
    this.profile = P.defaultProfile();
    if (DEBUG) unlockEverything(this.profile);
    writeCookie(LOCAL_PROFILE, null);
  },
};

// diff: Normal ('medium') or Veteran ('hard'), and nightmare: its box ticked or not, as last
// chosen on the trial screen.
// skins: each hero's look as chosen on the hero screen (data/heroes.js heroLook), hero -> skin id.
const DEFAULT_SETTINGS = { music: 0.55, sfx: 0.75, shake: true, numbers: true, crt: false, fps: false, diff: 'medium', nightmare: false, skins: {} };

export function loadSettings() {
  try {
    const raw = readCookie(SETTINGS);
    const s = raw ? JSON.parse(decodeURIComponent(raw)) : {};
    return { ...DEFAULT_SETTINGS, ...s };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  writeCookie(SETTINGS, encodeURIComponent(JSON.stringify(s)));
}
