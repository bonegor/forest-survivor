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

export const store = {
  mode: 'local',
  profile: P.defaultProfile(),
  checkpoint: null,
  lastReward: null,
  unreadable: null, // { profile, run } when a save exists but can't be read

  async init() {
    try {
      const data = await api('state');
      if (!data.server) throw new Error('not our server');
      this.mode = 'server';
      this.profile = P.sanitizeProfile(data.profile);
      this.checkpoint = data.checkpoint ? P.sanitizeCheckpoint(data.checkpoint) : null;
      this.unreadable = data.unreadable && (data.unreadable.profile || data.unreadable.run) ? { profile: !!data.unreadable.profile, run: !!data.unreadable.run } : null;
    } catch {
      this.mode = 'local';
      const rawProfile = readCookie(LOCAL_PROFILE), rawRun = readCookie(LOCAL_RUN);
      const profile = rawProfile ? P.decodeState(rawProfile) : null;
      const run = rawRun ? P.decodeState(rawRun) : null;
      this.profile = P.sanitizeProfile(profile);
      this.checkpoint = P.sanitizeCheckpoint(run);
      const bad = { profile: !!rawProfile && !profile, run: !!rawRun && !run };
      this.unreadable = bad.profile || bad.run ? bad : null;
    }
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
    writeCookie(LOCAL_PROFILE, P.encodeState(this.profile));
  },

  async submitRun(run) {
    if (this.mode === 'server') {
      try {
        const data = await api('run', run);
        this.profile = P.sanitizeProfile(data.profile);
        this.checkpoint = null;
        this.lastReward = data.reward;
        return data.reward;
      } catch {
        /* fall through to a local estimate so the screen still shows something */
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

  async saveCheckpoint(cp) {
    const clean = P.sanitizeCheckpoint(cp);
    this.checkpoint = clean;
    if (this.mode === 'server') {
      try {
        await api('checkpoint', { checkpoint: clean });
        return;
      } catch {
        /* ignore: keep the in-memory copy */
      }
    }
    writeCookie(LOCAL_RUN, clean ? P.encodeState(clean) : null);
  },

  async clearCheckpoint() {
    this.checkpoint = null;
    if (this.mode === 'server') {
      try {
        await api('checkpoint', { checkpoint: null });
        return;
      } catch {
        /* ignore */
      }
    }
    writeCookie(LOCAL_RUN, null);
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

  async unlock(hero) {
    if (this.mode === 'server') {
      const data = await api('unlock', { hero }).catch((e) => e.data || {});
      if (data.profile) this.profile = P.sanitizeProfile(data.profile);
      return !data.error;
    }
    const r = P.unlockHero(this.profile, hero);
    if (r.ok) {
      this.profile = r.profile;
      this.saveLocal();
    }
    return r.ok;
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
