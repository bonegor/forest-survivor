// Player profile persistence.
//
// Preferred: the Node server keeps the profile in an encrypted, HttpOnly
// cookie and exposes /api/*. If the game is served from static hosting (no
// API), it falls back to the browser's own storage with the same rules (saveBox).
// Either way, a save that exists but can't be read is flagged in
// store.unreadable so the title screen can offer a fresh start.
// Settings always live in the browser's storage too. A run is never saved: progress
// is kept only when it ends (death, Quit Run, or victory), through submitRun.
// A release build (build.js RELEASE, the itch.io zip) is static hosting only: it never asks for
// the server.
//
// The debug address (?DEBUG_FLAG, an unlisted token; an unlisted folder forwards there) opens every hero and mode, in a save of its
// own (in the browser even where the server is), so nothing played there touches the real one.
// Never in a release.

import * as P from '../shared/profile.js';
import { DEBUG_FLAG } from './debugflag.js';
import { RELEASE } from './build.js';
import { DEFAULT_COMBAT_MUSIC, normalizeCombatMusic } from './combat-music.js';
import { partitionRunSpoils, settledSpoils, validRunId } from '../shared/spoils.js';

export const DEBUG = !RELEASE && !!globalThis.location && new URLSearchParams(globalThis.location.search).has(DEBUG_FLAG);
const LOCAL_PROFILE = DEBUG ? 'fs_dprofile' : 'fs_lprofile';
const RUN_OUTBOX = DEBUG ? 'fs_dspoils' : 'fs_spoils';
let queuedProfileWrite = Promise.resolve();

export function withProfileLock(callback) {
  if (globalThis.navigator?.locks) return navigator.locks.request(LOCAL_PROFILE, callback);
  const result = queuedProfileWrite.then(callback);
  queuedProfileWrite = result.catch(() => {});
  return result;
}
// The game once kept a run to pick up again in these (the server's own, fs_run, it deletes
// itself); one a player still has is deleted when the game loads, so nothing lingers.
const STALE_RUNS = ['fs_lrun', 'fs_drun'];

// Every hero in, and as if each had survived the night and beaten the Dungeon: every mode open
// to every hero (shared/profile.js canPlay); every weapon, relic and ultimate and every Survival map
// open, and the Armory's weapon and relic slots full (P.openEverything).
export function unlockEverything(p) {
  p.heroes = [...P.HERO_ORDER];
  for (const h of P.HERO_ORDER) p.feats[h] = (p.feats[h] || 0) | P.FEAT.survivalHard | P.FEAT.dungeon;
  P.openEverything(p);
  return p;
}
const SETTINGS = 'fs_settings';
const MAX_AGE = 60 * 60 * 24 * 400;

function readCookie(name) {
  if (!globalThis.document) return null;
  const m = document.cookie?.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : null;
}

function writeCookie(name, value) {
  if (!globalThis.document) return;
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : '';
  if (value == null) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  else document.cookie = `${name}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
}

const COOKIE_PART = 3700, MAX_COOKIE_PARTS = 3;
const partsHeader = /^parts-([01])-([23])$/;
const partName = (name, bank, i) => `${name}_${bank}_${i}`;

function readCookieSave(name) {
  const head = readCookie(name), parts = head?.match(partsHeader);
  if (!parts) return head;
  const values = Array.from({ length: Number(parts[2]) }, (_, i) => readCookie(partName(name, parts[1], i)));
  return values.every(Boolean) ? values.join('') : head; // an incomplete save is reported as unreadable
}

function writeCookieSave(name, value) {
  const old = readCookie(name)?.match(partsHeader);
  if (value == null || value.length <= COOKIE_PART) writeCookie(name, value);
  else {
    const count = Math.ceil(value.length / COOKIE_PART);
    if (count > MAX_COOKIE_PARTS) return;
    const bank = old?.[1] === '1' ? '0' : '1';
    for (let i = 0; i < count; i++) {
      const key = partName(name, bank, i), part = value.slice(i * COOKIE_PART, (i + 1) * COOKIE_PART);
      writeCookie(key, part);
      if (readCookie(key) !== part) return;
    }
    const header = `parts-${bank}-${count}`;
    writeCookie(name, header);
    if (readCookie(name) !== header) return;
  }
  if (old && readCookie(name) !== old[0]) {
    for (let i = 0; i < Number(old[2]); i++) writeCookie(partName(name, old[1], i), null);
  }
}

// The save without the server, and the settings: in localStorage where the browser lets the page
// use it, else in a cookie as before. On itch.io the game plays in a frame of another site's
// (itch.zone inside itch.io), where browsers block or partition such a frame's cookies, and a save
// kept in one could be gone on the next visit; localStorage keeps. A save or settings still in a
// cookie from before move across the first time they are read.
function browserStore() {
  try {
    const s = globalThis.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null; // storage switched off for the site: reading it throws
  }
}

export const saveBox = {
  read(name) {
    const s = browserStore();
    if (s) {
      try {
        const v = s.getItem(name);
        if (v != null) return v;
      } catch {}
    }
    const c = readCookieSave(name);
    if (c != null && s) {
      try {
        s.setItem(name, c);
        writeCookieSave(name, null);
      } catch {} // full, or refused: it stays in its cookie
    }
    return c;
  },
  write(name, value) {
    const s = browserStore();
    if (s) {
      try {
        if (value == null) s.removeItem(name);
        else s.setItem(name, value);
        if (value == null && readCookie(name) != null) writeCookieSave(name, null);
        return;
      } catch {}
    }
    writeCookieSave(name, value);
  },
};

// What this browser has been shown (the review's C5, 28 October 2026), for the NEW marks: the Codex
// entries looked at (codex) and the milestones' weapons and relics a level-up has offered (offered),
// as keys (ui/ladder.js seenKey, ui/gamescreen.js offerKey). A convenience, never the save:
// localStorage only, no cookie, and where the browser keeps nothing (a private window, storage off)
// there are no marks at all, rather than marks that never go. Its first fill (start) is all a save
// has open then, so only what opens from there on is marked.
const SEEN = DEBUG ? 'fs_dseen' : 'fs_seen';
export const seenBox = {
  // { codex: Set, offered: Set }, or null: no localStorage, or nothing kept in it yet.
  read() {
    const s = browserStore();
    if (!s) return null;
    try {
      const raw = s.getItem(SEEN), o = raw == null ? null : JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      const set = (a) => new Set(Array.isArray(a) ? a.filter((k) => typeof k === 'string') : []);
      return { codex: set(o.codex), offered: set(o.offered) };
    } catch {
      return null; // refused, or not ours to read
    }
  },
  write(seen) {
    try {
      browserStore()?.setItem(SEEN, JSON.stringify({ codex: [...seen.codex], offered: [...seen.offered] }));
    } catch {} // full, or refused: the marks stay as they were
  },
  // The first fill, once a browser: { codex: [keys], offered: [keys] }.
  start(keys) {
    if (browserStore() && !this.read()) this.write({ codex: new Set(keys.codex), offered: new Set(keys.offered) });
  },
  // Keys added to one list ('codex' or 'offered'); nothing without one.
  add(list, keys) {
    const seen = this.read();
    if (!seen) return;
    const n = seen[list].size;
    for (const k of keys) seen[list].add(k);
    if (seen[list].size > n) this.write(seen);
  },
  clear() {
    try {
      browserStore()?.removeItem(SEEN);
    } catch {}
  },
};

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
const unsavedRun = (error, down = false) => ({ collected: 0, bonus: 0, total: 0, multiplier: 1, unsaved: true, down, error });

function savedReport() {
  const raw = saveBox.read(RUN_OUTBOX);
  const run = raw && P.decodeState(raw);
  return validRunId(run?.runId) && Number.isSafeInteger(run.runFrom) && run.runFrom >= 0 ? run : null;
}
// The game opened on this machine (localhost, 127.x.x.x, [::1]), not as a published site.
export const onThisMachine = (host = globalThis.location?.hostname || '') =>
  /^(?:(?:[^.]+\.)*localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(host);

export const store = {
  mode: 'local',
  profile: P.defaultProfile(),
  lastReward: null,
  unreadable: null, // { profile: true } when a save exists but can't be read
  offline: false, // the game's server can't be reached: nothing can be loaded or saved
  watching: false, // another tab's saving is heard (init)
  kept: true, // this tab's last save is what the browser now holds (saveLocal)
  runOutbox: null,

  waitingReport() {
    return savedReport() || this.runOutbox;
  },

  clearReport(id) {
    if (this.runOutbox?.runId === id) this.runOutbox = null;
    if (savedReport()?.runId === id) saveBox.write(RUN_OUTBOX, null);
  },

  get pendingRun() {
    const run = this.waitingReport();
    return run && (this.profile.lastRun?.id !== run.runId || this.profile.lastRun?.from !== run.runFrom) ? run : null;
  },

  get pendingReveal() {
    const receipt = this.profile.lastRun;
    if (!receipt?.pending) return null;
    if (receipt.truncated) {
      const run = this.waitingReport();
      if (run?.runId === receipt.id && run.runFrom === receipt.from) {
        const spoils = run.sealedGear
          ? partitionRunSpoils(run.spoils, run.found).history
          : settledSpoils(run.spoils, run.found, this.profile.gear[receipt.hero]);
        if (spoils) return { ...receipt, spoils, truncated: false };
      }
    }
    return receipt;
  },

  async resumeRun() {
    const report = this.pendingRun;
    return report ? this.submitRun(report) : null;
  },

  async init() {
    for (const name of STALE_RUNS) if (readCookie(name) != null) writeCookie(name, null);
    for (let attempt = 0; !DEBUG && !RELEASE; attempt++) {
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
    // Static hosting: the save is the browser's (saveBox).
    this.mode = 'local';
    this.offline = false;
    const rawProfile = saveBox.read(LOCAL_PROFILE);
    const profile = rawProfile ? P.decodeState(rawProfile) : null;
    this.profile = P.sanitizeProfile(profile);
    if (DEBUG) unlockEverything(this.profile);
    this.unreadable = rawProfile && !profile ? { profile: true } : null;
    // Another tab saving: read at once; started afresh there, afresh here too.
    if (!this.watching) {
      this.watching = true;
      globalThis.addEventListener?.('storage', (e) => {
        if (this.mode !== 'local' || e.key !== LOCAL_PROFILE) return;
        if (e.newValue != null) return this.reload();
        this.profile = P.defaultProfile();
        if (DEBUG) unlockEverything(this.profile);
      });
    }
    return this;
  },

  // Accept the loss of an unreadable save: wipe it and carry on.
  async startFresh() {
    const bad = this.unreadable;
    this.unreadable = null;
    if (bad) await this.reset();
  },

  // Read back, as a write can fail and leave an older save to be read (a full localStorage, as on
  // itch.io, where every game shares one: saveBox.write falls back to a cookie that read() never
  // reaches while the older copy is there).
  saveLocal() {
    const raw = P.encodeState(P.packProfile(this.profile));
    saveBox.write(LOCAL_PROFILE, raw);
    this.kept = saveBox.read(LOCAL_PROFILE) === raw;
  },

  // The browser's save as another tab of the game may have left it (local mode). Every change starts
  // from it, and another tab's saving is read at once (init), so two tabs never write over each
  // other's gold, unlocks, gear or purchases (27 October 2026). A save that is gone or can't be read
  // leaves the profile in hand (a browser that keeps nothing still keeps the session's progress),
  // and so does one this tab could not write over (saveLocal kept): the older save would undo the
  // runs and purchases since.
  reload() {
    if (this.mode !== 'local' || !this.kept) return;
    const raw = saveBox.read(LOCAL_PROFILE);
    const profile = raw ? P.decodeState(raw) : null;
    if (!profile) return;
    this.profile = P.sanitizeProfile(profile);
    if (DEBUG) unlockEverything(this.profile);
  },

  // The run's reward. When the server doesn't take the run nothing changes, and the reward
  // comes back with unsaved set (down: worth trying again) for the results screen to say so.
  async submitRun(run) {
    return withProfileLock(async () => {
      this.reload();
      const modern = validRunId(run?.runId);
      if (modern) {
        const waiting = this.pendingRun;
        if (waiting && waiting.runId !== run.runId) return unsavedRun('Another run is waiting to be saved');
        // Write before making any request. Until the reveal is acknowledged, this also
        // supplies the full gear ledger when a server cookie could only fit its tail.
        this.runOutbox = run;
        saveBox.write(RUN_OUTBOX, P.encodeState(run));
      }
      if (this.mode === 'server') {
        try {
          const data = await api('run', run);
          if (!data.profile || !data.reward || modern && data.profile.lastRun?.id !== run.runId) {
            throw new TypeError('The run receipt was interrupted');
          }
          this.profile = P.sanitizeProfile(data.profile);
          this.lastReward = data.reward;
          if (modern && !this.profile.lastRun?.pending) this.clearReport(run.runId);
          return data.reward;
        } catch (e) {
          const down = serverDown(e);
          if (modern && !down) this.clearReport(run.runId);
          return unsavedRun(e.message, down);
        }
      }
      const r = P.applyRun(this.profile, run);
      if (!r.ok) {
        if (modern) this.clearReport(run.runId);
        return unsavedRun(r.error);
      }
      this.profile = r.profile;
      this.saveLocal();
      this.lastReward = r.reward;
      if (modern && this.kept && !this.profile.lastRun?.pending) this.clearReport(run.runId);
      return this.kept ? r.reward : { ...r.reward, volatile: true };
    });
  },

  async acknowledgeReveal(id) {
    return withProfileLock(async () => {
      this.reload();
      if (this.mode === 'server') {
        const data = await api('spoils', { id });
        if (data.profile?.lastRun?.id !== id || data.profile.lastRun.pending !== false) return false;
        this.profile = P.sanitizeProfile(data.profile);
        this.clearReport(id);
        return true;
      }
      const r = P.acknowledgeReveal(this.profile, id);
      if (!r.ok) return false;
      const previous = this.profile, wasKept = this.kept;
      this.profile = r.profile;
      this.saveLocal();
      if (this.kept) this.clearReport(id);
      else if (wasKept) {
        this.profile = previous;
        this.kept = wasKept;
        return false;
      }
      return true;
    });
  },

  async resolveSpoil(decision) {
    return withProfileLock(async () => {
      this.reload();
      if (this.mode === 'server') {
        try {
          const data = await api('spoils', decision);
          if (data.profile?.lastRun?.id !== decision.id) return { ok: false, error: 'Receipt interrupted. Try again.' };
          this.profile = P.sanitizeProfile(data.profile);
          return { ok: true };
        } catch (error) {
          if (error.data?.profile) this.profile = P.sanitizeProfile(error.data.profile);
          return { ok: false, error: serverDown(error) ? 'Could not save. Try again.' : error.message };
        }
      }
      const r = P.resolveSpoil(this.profile, decision);
      if (!r.ok) return { ok: false, error: r.error };
      const previous = this.profile, wasKept = this.kept;
      this.profile = r.profile;
      this.saveLocal();
      if (wasKept && !this.kept) {
        this.profile = previous;
        this.kept = wasKept;
        return { ok: false, error: 'Could not save. Try again.' };
      }
      return { ok: true };
    });
  },

  async buy(id) {
    return withProfileLock(async () => {
      if (this.mode === 'server') {
        // No answer (a dropped connection, a 5xx) is a failure too, never a purchase.
        const data = await api('buy', { id }).catch((e) => ({ ...e.data, error: e.data?.error || e.message || "The game server can't be reached" }));
        if (data.profile) this.profile = P.sanitizeProfile(data.profile);
        return !data.error;
      }
      this.reload();
      const r = P.buyUpgrade(this.profile, id);
      if (r.ok) {
        this.profile = r.profile;
        this.saveLocal();
      }
      return r.ok;
    });
  },

  async transfer(action) {
    return withProfileLock(async () => {
      if (this.mode === 'server') {
        const data = await api('transfer', action).catch(e => ({ ...e.data, error: e.data?.error || e.message }));
        if (data.profile) this.profile = P.sanitizeProfile(data.profile);
        return { ok: !!data.profile && !data.error, error: data.error || (!data.profile ? 'The transfer response was interrupted' : null), cost: data.cost };
      }
      this.reload();
      const result = P.transferItem(this.profile, action);
      if (!result.ok) return result;
      this.profile = result.profile;
      this.saveLocal();
      return { ...result, kept: this.kept };
    });
  },

  // A shared weapon left at home (on) or taken along again (shared/profile.js setHome).
  async setHome(id, on) {
    return withProfileLock(async () => {
      if (this.mode === 'server') {
        const data = await api('home', { id, on }).catch((e) => ({ ...e.data, error: e.data?.error || e.message || "The game server can't be reached" }));
        if (data.profile) this.profile = P.sanitizeProfile(data.profile);
        return !data.error;
      }
      this.reload();
      const r = P.setHome(this.profile, id, on);
      if (r.ok) {
        this.profile = r.profile;
        this.saveLocal();
      }
      return r.ok;
    });
  },

  // Debug only (the debug flag): upgrades set to any ranks, { id: rank }, at no cost.
  setUpgrades(ranks) {
    if (!DEBUG) return false;
    this.reload();
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
    return withProfileLock(async () => {
      if (this.mode === 'server') {
        const data = await api('refund', {});
        this.profile = P.sanitizeProfile(data.profile);
        return data.refunded;
      }
      this.reload();
      const r = P.refundUpgrades(this.profile);
      this.profile = r.profile;
      this.saveLocal();
      return r.refunded;
    });
  },

  // ------------------------------------------------------ developer mode --
  // On the server these need a developer session (see server.js). With plain
  // static hosting the save is the browser's anyway, so they just work, but
  // only on this machine: the published game has no developer mode, nor has a release.

  async devStatus() {
    if (RELEASE) return { enabled: false, open: false, authed: false, local: true };
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
    seenBox.clear(); // a fresh start's NEW marks start afresh (the title fills them again)
    this.runOutbox = null;
    saveBox.write(RUN_OUTBOX, null);
    if (this.mode === 'server') {
      const data = await api('reset', {});
      this.profile = P.sanitizeProfile(data.profile);
      return;
    }
    this.profile = P.defaultProfile();
    if (DEBUG) unlockEverything(this.profile);
    saveBox.write(LOCAL_PROFILE, null);
    this.kept = saveBox.read(LOCAL_PROFILE) == null;
  },
};

// diff: Normal ('easy'), Veteran ('medium') or Elite ('hard'), and nightmare: its box ticked or not,
// as last chosen on the trial screen.
// skins: each hero's look as chosen on the hero screen (data/heroes.js heroLook), hero -> skin id.
// softFlash: the options' FLASHES: SOFT, white flashes held to FLASH_SOFT and crits in steady gold.
// rankedNote: the trial screen's word that Ranked is always Elite has been said (ModeScreen).
// map: the Survival map last picked on the trial screen (data/maps.js), or the first night's, the
// desert (ui/prologue.js); none until then, when the trial screen shows its default (main.js).
const DEFAULT_SETTINGS = { music: 0.55, sfx: 0.75, combatMusic: DEFAULT_COMBAT_MUSIC, shake: true, numbers: true, weather: true, crt: false, fps: false, diff: 'easy', nightmare: false, skins: {}, softFlash: false, rankedNote: false };

export function loadSettings() {
  try {
    const raw = saveBox.read(SETTINGS);
    const s = raw ? JSON.parse(decodeURIComponent(raw)) : {};
    return { ...DEFAULT_SETTINGS, ...s, combatMusic: normalizeCombatMusic(s?.combatMusic) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  saveBox.write(SETTINGS, encodeURIComponent(JSON.stringify(s)));
}
