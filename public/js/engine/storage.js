// Player profile persistence.
//
// Preferred: the Node server keeps the profile in an encrypted, HttpOnly
// cookie and exposes /api/*. If the game is served from static hosting (no
// API), it falls back to a plain client-side cookie with the same rules.
// Either way, a save that exists but can't be read is flagged in
// store.unreadable so the title screen can offer a fresh start.
// Settings always live in a small client cookie.

import * as P from '../shared/profile.js';

const LOCAL_PROFILE = 'fs_lprofile';
const LOCAL_RUN = 'fs_lrun';
const SETTINGS = 'fs_settings';
const MAX_AGE = 60 * 60 * 24 * 400;

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : null;
}

function writeCookie(name, value) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
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
  checkpoint: null,
  lastReward: null,
  unreadable: null, // { profile, run } when a save exists but can't be read
  offline: false, // the game's server can't be reached: nothing can be loaded or saved

  async init() {
    for (let attempt = 0; ; attempt++) {
      try {
        const data = await api('state');
        if (!data.server) throw new Error('not our server');
        this.mode = 'server';
        this.offline = false;
        this.profile = P.sanitizeProfile(data.profile);
        this.checkpoint = data.checkpoint ? P.sanitizeCheckpoint(data.checkpoint) : null;
        this.unreadable = data.unreadable && (data.unreadable.profile || data.unreadable.run) ? { profile: !!data.unreadable.profile, run: !!data.unreadable.run } : null;
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
    const rawProfile = readCookie(LOCAL_PROFILE), rawRun = readCookie(LOCAL_RUN);
    const profile = rawProfile ? P.decodeState(rawProfile) : null;
    const run = rawRun ? P.decodeState(rawRun) : null;
    this.profile = P.sanitizeProfile(profile);
    this.checkpoint = P.sanitizeCheckpoint(run);
    const bad = { profile: !!rawProfile && !profile, run: !!rawRun && !run };
    this.unreadable = bad.profile || bad.run ? bad : null;
    return this;
  },

  // Accept the loss of an unreadable save: wipe what can't be read and carry on.
  async startFresh() {
    const bad = this.unreadable;
    this.unreadable = null;
    if (!bad) return;
    if (bad.profile) await this.reset();
    else if (bad.run) await this.clearCheckpoint();
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
        this.checkpoint = null;
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
      this.checkpoint = null;
      writeCookie(LOCAL_RUN, null);
      this.lastReward = r.reward;
      return r.reward;
    }
    return { collected: 0, bonus: 0, total: 0, multiplier: 1 };
  },

  // Saves the run; false when the server didn't take it (the copy in memory is kept).
  async saveCheckpoint(cp) {
    const clean = P.sanitizeCheckpoint(cp);
    this.checkpoint = clean;
    if (this.mode === 'server') {
      try {
        await api('checkpoint', { checkpoint: clean });
        return true;
      } catch {
        return false;
      }
    }
    writeCookie(LOCAL_RUN, clean ? P.encodeState(clean) : null);
    return true;
  },

  async clearCheckpoint() {
    this.checkpoint = null;
    if (this.mode === 'server') {
      try {
        await api('checkpoint', { checkpoint: null });
        return true;
      } catch {
        return false;
      }
    }
    writeCookie(LOCAL_RUN, null);
    return true;
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
      this.checkpoint = null;
      return;
    }
    this.profile = P.defaultProfile();
    this.checkpoint = null;
    writeCookie(LOCAL_PROFILE, null);
    writeCookie(LOCAL_RUN, null);
  },
};

const DEFAULT_SETTINGS = { music: 0.55, sfx: 0.75, shake: true, numbers: true, crt: false, fps: false };

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
