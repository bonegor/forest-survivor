// Developer panel: an HTML overlay for editing the save file and bending the
// current run. Loaded on demand (` key, or ?dev in the URL). On a server it
// only works in developer mode (npm run dev, or DEV_KEY + login); the server
// checks every edit, so shipping this file to players unlocks nothing.

import * as P from '../shared/profile.js';
import { HEROES } from '../data/heroes.js';
import { WEAPONS, BASE_WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS } from '../data/passives.js';
import { DIFFICULTY, MODES } from '../data/difficulty.js';
import { fmtTime } from '../engine/util.js';
import { xpFor } from '../game/player.js';
import { goalText } from '../ui/ladder.js';

const BOSSES = ['boneking', 'butcher', 'lich', 'demonlord'];
const FEATS = [['survivalHard', 'Hard night'], ['dungeon', 'Dungeon'], ['dungeonHard', 'Dungeon (Hard)']];

const CSS = `
#fs-dev { position: fixed; top: 0; right: 0; bottom: 0; width: min(460px, 100vw); z-index: 10; display: none; flex-direction: column;
  background: rgba(16, 12, 24, 0.97); color: #c0cbdc; font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace; border-left: 2px solid #feae34;
  box-shadow: -8px 0 24px rgba(0,0,0,.5); user-select: text; -webkit-user-select: text; touch-action: auto; }
#fs-dev.open { display: flex; }
#fs-dev header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #241b2c; border-bottom: 1px solid #3a4466; }
#fs-dev header b { color: #fee761; letter-spacing: 2px; }
#fs-dev header .st { flex: 1; color: #8b9bb4; font-size: 11px; }
#fs-dev nav { display: flex; border-bottom: 1px solid #3a4466; }
#fs-dev nav button { flex: 1; border: 0; border-radius: 0; background: transparent; padding: 7px; }
#fs-dev nav button.on { background: #3a4466; color: #fee761; }
#fs-dev .body { flex: 1; overflow-y: auto; padding: 10px; -webkit-overflow-scrolling: touch; }
#fs-dev h3 { margin: 14px 0 6px; color: #feae34; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
#fs-dev h3:first-child { margin-top: 0; }
#fs-dev button { font: inherit; color: #ffffff; background: #3a4466; border: 1px solid #5a6988; border-radius: 3px; padding: 4px 8px; cursor: pointer; }
#fs-dev button:hover { background: #5a6988; }
#fs-dev button.go { background: #be4a2f; border-color: #feae34; }
#fs-dev button.go:hover { background: #e43b44; }
#fs-dev button:disabled { opacity: .4; cursor: default; }
#fs-dev input, #fs-dev select, #fs-dev textarea { font: inherit; color: #ffffff; background: #0d0b14; border: 1px solid #3a4466; border-radius: 3px; padding: 3px 5px; }
#fs-dev input[type=number] { width: 72px; }
#fs-dev input[type=checkbox] { width: 16px; height: 16px; accent-color: #feae34; }
#fs-dev textarea { width: 100%; box-sizing: border-box; min-height: 140px; resize: vertical; font-size: 11px; }
#fs-dev table { border-collapse: collapse; width: 100%; }
#fs-dev th { color: #8b9bb4; font-weight: normal; font-size: 10px; text-align: center; padding: 2px; }
#fs-dev td { padding: 2px; text-align: center; }
#fs-dev td:first-child, #fs-dev th:first-child { text-align: left; }
#fs-dev .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0; }
#fs-dev .grid { display: grid; grid-template-columns: 1fr auto; gap: 3px 10px; align-items: center; }
#fs-dev .note { color: #8b9bb4; font-size: 11px; }
#fs-dev .warn { color: #f6757a; }
#fs-dev .ok { color: #63c74d; }
#fs-dev .live { background: #0d0b14; border: 1px solid #3a4466; padding: 6px; border-radius: 3px; white-space: pre-wrap; }
#fs-dev footer { display: flex; gap: 6px; padding: 8px 10px; border-top: 1px solid #3a4466; background: #241b2c; }
#fs-dev footer .msg { flex: 1; align-self: center; font-size: 11px; }
#fs-dev-btn { position: fixed; top: 6px; right: 6px; z-index: 9; font: bold 11px ui-monospace, monospace; color: #3e2731;
  background: #feae34; border: 0; border-radius: 3px; padding: 4px 7px; opacity: .85; cursor: pointer; touch-action: manipulation; }
`;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'class') e.className = v;
    else if (k in e && k !== 'list') e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : String(kid));
  return e;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const parseTime = (s) => {
  const t = String(s).trim();
  if (/^\d+:\d{1,2}$/.test(t)) {
    const [m, sec] = t.split(':').map(Number);
    return m * 60 + sec;
  }
  return Math.max(0, Math.floor(Number(t)) || 0);
};

export function createDevPanel(app) {
  const store = app.store;
  document.head.append(el('style', { textContent: CSS }));
  const root = el('div', { id: 'fs-dev', 'data-dev': '' });
  const fab = el('button', { id: 'fs-dev-btn', textContent: 'DEV', title: 'Developer panel (`)', on: { click: () => panel.toggle() } });
  document.body.append(root, fab);

  let tab = 'save';
  let status = null;
  let draft = clone(store.profile);
  let dirty = false;
  let liveTimer = null;
  const msg = el('span', { class: 'msg' });
  const say = (text, cls = 'ok') => {
    msg.className = 'msg ' + cls;
    msg.textContent = text;
  };
  const game = () => app.screen && app.screen.game;

  // -------------------------------------------------------------- layout --

  const stLabel = el('span', { class: 'st' });
  const body = el('div', { class: 'body' });
  const navBtns = {
    save: el('button', { textContent: 'Save file', on: { click: () => show('save') } }),
    run: el('button', { textContent: 'This run', on: { click: () => show('run') } }),
  };
  const saveBtn = el('button', { class: 'go', textContent: 'Save changes', on: { click: () => commit() } });
  const discardBtn = el('button', { textContent: 'Discard', on: { click: () => { draft = clone(store.profile); dirty = false; render(); say('Changes discarded', 'note'); } } });
  const footer = el('footer', {}, msg, discardBtn, saveBtn);
  root.append(
    el('header', {}, el('b', { textContent: 'DEVELOPER' }), stLabel, el('button', { textContent: '✕', title: 'Close (`)', on: { click: () => panel.toggle(false) } })),
    el('nav', {}, navBtns.save, navBtns.run),
    body,
    footer,
  );

  function show(t) {
    tab = t;
    render();
  }

  async function refreshStatus() {
    status = await store.devStatus();
    const where = status.local ? 'offline save (client cookie)' : status.open ? 'server, open dev mode' : 'server, key login';
    stLabel.textContent = status.authed ? where : status.enabled ? 'login required' : 'off';
  }

  async function commit() {
    try {
      await store.devSaveProfile(draft);
      draft = clone(store.profile);
      dirty = false;
      render();
      say('Saved');
    } catch (e) {
      say(e.message || 'Save failed', 'warn');
    }
  }

  const touch = () => {
    dirty = true;
    say('Unsaved changes', 'note');
  };

  // --------------------------------------------------------------- login --

  function renderLogin() {
    if (!status.enabled) {
      body.append(
        el('h3', { textContent: 'Developer mode is off' }),
        el('p', { class: 'note', textContent: 'This server does not allow save editing. Run it locally with "npm run dev", or start it with DEV_KEY=<secret> and log in here with that key.' }),
      );
      return;
    }
    const key = el('input', { type: 'password', placeholder: 'DEV_KEY', autocomplete: 'off' });
    const login = async () => {
      try {
        await store.devLogin(key.value);
        await refreshStatus();
        render();
        say('Logged in for 12 hours');
      } catch (e) {
        say(e.message || 'Login failed', 'warn');
      }
    };
    key.addEventListener('keydown', (e) => e.key === 'Enter' && login());
    body.append(
      el('h3', { textContent: 'Log in' }),
      el('p', { class: 'note', textContent: 'Enter the key the server was started with (DEV_KEY).' }),
      el('div', { class: 'row' }, key, el('button', { class: 'go', textContent: 'Log in', on: { click: login } })),
    );
    setTimeout(() => key.focus(), 0);
  }

  // ----------------------------------------------------------- save file --

  function preset(name, fn) {
    return el('button', {
      textContent: name,
      on: {
        click: async () => {
          fn(draft);
          dirty = true;
          await commit();
          say(`Applied: ${name}`);
        },
      },
    });
  }

  const allHeroes = (d) => { d.heroes = [...P.HERO_ORDER]; };
  const feat = (d, heroes, bits) => { for (const h of heroes) d.feats[h] = (d.feats[h] || 0) | bits; };

  function num(get, set, { min = 0, max = 1e9, width } = {}) {
    const i = el('input', { type: 'number', min, max, value: get() });
    if (width) i.style.width = width;
    i.addEventListener('input', () => {
      set(Math.min(max, Math.max(min, Math.floor(Number(i.value) || 0))));
      touch();
    });
    return i;
  }

  function check(get, set, disabled = false) {
    const c = el('input', { type: 'checkbox', checked: get(), disabled });
    c.addEventListener('change', () => {
      set(c.checked);
      touch();
    });
    return c;
  }

  function renderSave() {
    const d = draft;
    // Presets for every rung of the ladder.
    body.append(
      el('h3', { textContent: 'Presets' }),
      el('div', { class: 'row' },
        preset('Fresh start', (x) => Object.assign(x, P.defaultProfile())),
        preset('Survival ladder done', (x) => { allHeroes(x); feat(x, P.HERO_ORDER, P.FEAT.survivalHard); }),
        preset('Dungeon open to all', (x) => { allHeroes(x); feat(x, P.HERO_ORDER, P.FEAT.survivalHard); feat(x, P.HERO_ORDER.slice(0, -1), P.FEAT.dungeon); }),
        preset('Unlock everything', (x) => { allHeroes(x); feat(x, P.HERO_ORDER, 7); }),
        preset('+10 000 gold', (x) => { x.gold += 10000; }),
        preset('Max Armory', (x) => { for (const u of P.UPGRADES) x.up[u.id] = u.max; }),
        preset('Clear Armory', (x) => { x.up = {}; }),
      ),
    );

    // What the ladder currently says.
    const goal = P.nextGoal(d);
    const open = P.MODES.filter((m) => P.modeUnlocked(d, m)).map((m) => MODES[m].name).join(', ');
    body.append(el('p', { class: 'note' }, `Open trials: ${open}. Next goal: ${goalText(goal)}`));

    body.append(el('h3', { textContent: 'Gold' }), el('div', { class: 'row' }, num(() => d.gold, (v) => { d.gold = v; }, { width: '120px' })));

    // Heroes and their achievements.
    const head = el('tr', {}, el('th', { textContent: 'Hero' }), el('th', { textContent: 'Owned' }), FEATS.map(([, label]) => el('th', { textContent: label })), el('th', { textContent: 'Ranked best' }));
    const rows = P.HERO_ORDER.map((h) => {
      const best = el('input', { value: d.ranked[h] ? fmtTime(d.ranked[h]) : '', placeholder: 'mm:ss', size: 6 });
      best.style.width = '58px';
      best.addEventListener('input', () => {
        const t = parseTime(best.value);
        if (t) d.ranked[h] = t;
        else delete d.ranked[h];
        touch();
      });
      return el('tr', {},
        el('td', { textContent: HEROES[h].title }),
        el('td', {}, check(() => d.heroes.includes(h), (on) => { d.heroes = on ? [...new Set([...d.heroes, h])] : d.heroes.filter((x) => x !== h); }, h === 'knight')),
        FEATS.map(([k]) => el('td', {}, check(() => P.hasFeat(d, h, P.FEAT[k]), (on) => {
          const f = (d.feats[h] || 0) & ~P.FEAT[k];
          d.feats[h] = on ? f | P.FEAT[k] : f;
          if (!d.feats[h]) delete d.feats[h];
        }))),
        el('td', {}, best),
      );
    });
    body.append(el('h3', { textContent: 'Heroes and achievements' }), el('table', {}, head, rows));

    // Wins.
    body.append(el('h3', { textContent: 'Victories' }), el('table', {},
      el('tr', {}, el('th', { textContent: 'Trial' }), P.DIFFICULTIES.map((x) => el('th', { textContent: DIFFICULTY[x].name }))),
      P.WIN_MODES.map((m) => el('tr', {}, el('td', { textContent: `${MODES[m].name} ${MODES[m].sub}` }), [0, 1, 2].map((i) => el('td', {}, num(() => d.wins[m][i], (v) => { d.wins[m][i] = v; }, { width: '60px' }))))),
    ));

    // Armory.
    body.append(el('h3', { textContent: 'Armory ranks' }), el('div', { class: 'grid' },
      P.UPGRADES.map((u) => [el('span', { textContent: `${u.name} (max ${u.max})` }), num(() => d.up[u.id] || 0, (v) => { if (v) d.up[u.id] = v; else delete d.up[u.id]; }, { max: u.max, width: '60px' })]),
    ));

    // Records.
    body.append(el('h3', { textContent: 'Records' }), el('div', { class: 'grid' },
      el('span', { textContent: 'Runs played' }), num(() => d.runs, (v) => { d.runs = v; }),
      el('span', { textContent: 'Monsters slain' }), num(() => d.kills, (v) => { d.kills = v; }),
      el('span', { textContent: 'Most kills in a run' }), num(() => d.best.kills, (v) => { d.best.kills = v; }),
      el('span', { textContent: 'Highest level' }), num(() => d.best.level, (v) => { d.best.level = v; }, { max: 999 }),
      el('span', { textContent: 'Longest 15-min night (s)' }), num(() => d.best.s15, (v) => { d.best.s15 = v; }, { max: 960 }),
      el('span', { textContent: 'Deepest floor (4 = conquered)' }), num(() => d.best.dungeon, (v) => { d.best.dungeon = v; }, { max: 4 }),
    ));

    // Saved run.
    const cp = store.checkpoint;
    body.append(el('h3', { textContent: 'Saved run' }), el('div', { class: 'row' },
      el('span', { class: 'note', textContent: cp ? `${HEROES[cp.hero]?.title || cp.hero} · ${MODES[cp.mode]?.name || cp.mode} · ${DIFFICULTY[cp.diff]?.name || cp.diff} · ${cp.mode === 'dungeon' ? 'floor ' + cp.floor : fmtTime(cp.time)} · L${cp.level}` : 'None' }),
      cp && el('button', { textContent: 'Delete saved run', on: { click: async () => { await store.clearCheckpoint(); render(); say('Saved run deleted'); } } }),
    ));

    // Raw JSON for anything the form doesn't cover.
    const raw = el('textarea', { spellcheck: false, value: JSON.stringify(d, null, 1) });
    body.append(
      el('h3', { textContent: 'Raw profile JSON' }),
      raw,
      el('div', { class: 'row' },
        el('button', {
          textContent: 'Apply JSON',
          on: {
            click: async () => {
              try {
                draft = JSON.parse(raw.value);
              } catch (e) {
                say('Invalid JSON: ' + e.message, 'warn');
                return;
              }
              dirty = true;
              await commit();
            },
          },
        }),
        el('span', { class: 'note', textContent: 'Everything is sanitized and clamped on save.' }),
      ),
    );

    if (status && status.authed && !status.open && !status.local) {
      body.append(el('h3', { textContent: 'Session' }), el('button', { textContent: 'Log out', on: { click: async () => { await store.devLogout(); await refreshStatus(); render(); say('Logged out', 'note'); } } }));
    }
  }

  // ------------------------------------------------------------ this run --

  const act = (label, fn, cls) => el('button', { textContent: label, class: cls || '', on: { click: () => { const g = game(); if (!g) return; const r = fn(g, g.player); say(typeof r === 'string' ? r : label, 'ok'); } } });

  // One level through the normal level-up screen.
  function levelUp(p) {
    p.xp = p.xpNext;
    p.addXp(0);
    return 'Level up: pick a card';
  }

  // Many levels at once, taking the first card offered each time.
  function levelUpAuto(g, p, n) {
    for (let i = 0; i < n; i++) {
      p.level++;
      p.xpNext = xpFor(p.level);
      const ch = g.levelChoices(g.choiceCount());
      if (ch.length) g.applyChoice(ch[0]);
    }
    p.xp = 0;
    return `+${n} levels, cards picked automatically`;
  }

  // Ending or leaving a run only makes sense while it is actually playing.
  const busy = (g) => (g.state === 'play' ? null : g.state === 'levelup' || g.state === 'chest' ? 'Finish the level-up or chest screen first' : `Not now (${g.state})`);

  function renderRun() {
    const g = game();
    if (!g) {
      body.append(el('h3', { textContent: 'No run in progress' }), el('p', { class: 'note', textContent: 'Start a run and come back here: these tools act on the live game.' }));
      return;
    }
    const live = el('div', { class: 'live' });
    const tick = () => {
      const p = g.player;
      live.textContent = `${MODES[g.mode].name} · ${DIFFICULTY[g.diffId]?.name || g.diffId}${g.mode === 'dungeon' ? ` · floor ${g.floor}` : ''}\n` +
        `time ${fmtTime(g.time)} · phase ${g.phase.toFixed(1)} · state ${g.state}\n` +
        `L${p.level} · HP ${Math.ceil(p.hp)}/${p.maxHp} · fury ${Math.floor(p.fury)} · blessings ${p.blessings}\n` +
        `${g.enemies.filter((e) => !e.dead).length} foes · ${g.kills} kills · ${g.gold} gold${g.boss && !g.boss.dead ? ` · boss ${g.boss.def.name} ${Math.ceil(g.boss.hp)}` : ''}`;
    };
    tick();
    clearInterval(liveTimer);
    liveTimer = setInterval(() => (root.classList.contains('open') && tab === 'run' ? tick() : null), 300);

    const pick = (opts) => el('select', {}, opts.map(([v, t]) => el('option', { value: v, textContent: t })));
    const wSel = pick(BASE_WEAPONS.concat(Object.keys(WEAPONS).filter((id) => WEAPONS[id].exclusive)).filter((id, i, a) => a.indexOf(id) === i).map((id) => [id, WEAPONS[id].name]));
    const rSel = pick(PASSIVE_IDS.map((id) => [id, PASSIVES[id].name]));
    const bSel = pick(BOSSES.map((id) => [id, id]));
    const tIn = el('input', { value: fmtTime(g.time), size: 6 });
    tIn.style.width = '60px';

    body.append(
      el('h3', { textContent: 'Status' }), live,
      el('h3', { textContent: 'Switches' }),
      el('div', { class: 'row' },
        el('label', {}, check(() => !!g.player.devGod, (on) => { g.player.devGod = on; say(on ? 'Invincible' : 'Mortal again'); }), ' Invincible'),
        el('label', {}, check(() => !!app.devHold, (on) => { app.devHold = on; say(on ? 'Game frozen' : 'Game running'); }), ' Freeze the game'),
      ),
      el('h3', { textContent: 'Hero' }),
      el('div', { class: 'row' },
        act('+1 level (choose)', (g2, p) => levelUp(p)),
        act('+10 levels (auto)', (g2, p) => levelUpAuto(g2, p, 10)),
        act('Full heal', (g2, p) => { p.hp = p.maxHp; }),
        act('Full fury', (g2, p) => { p.fury = 100; }),
        act('Max all weapons', (g2, p) => { for (const w of p.weapons) while (w.level < MAX_WEAPON_LEVEL) w.levelUp(); }),
        act('Evolve all', (g2, p) => { let n = 0; for (const w of p.weapons) if (w.def.evo) { w.level = MAX_WEAPON_LEVEL; w.evolve(); n++; } return `${n} evolved`; }),
        act('Open a chest', (g2) => { g2.chestQueue.push('boss'); }),
      ),
      el('div', { class: 'row' }, wSel, act('Give weapon', (g2, p) => {
        const id = wSel.value;
        if (g2.ownsWeapon(id)) return 'Already owned';
        if (p.weapons.length >= 6) return 'All six slots are full';
        g2.addWeapon(id);
        return `Gave ${WEAPONS[id].name}`;
      })),
      el('div', { class: 'row' }, rSel, act('Give relic', (g2, p) => {
        const id = rSel.value, r = p.passives.get(id) || 0;
        if (r >= PASSIVES[id].max) return 'Already at max rank';
        p.passives.set(id, r + 1);
        p.recompute();
        return `${PASSIVES[id].name} rank ${r + 1}`;
      })),
      el('h3', { textContent: 'World' }),
      el('div', { class: 'row' },
        act('Kill all foes', (g2) => { let n = 0; for (const e of [...g2.enemies]) if (!e.dead && !e.prop && !e.sealed) { g2.hitEnemy(e, 1e12, {}); n++; } return `${n} slain`; }),
        act('+1 minute', (g2) => skip(g2, 60)),
        act('+5 minutes', (g2) => skip(g2, 300)),
        g.mode === 'dungeon' && act('Next floor', (g2) => {
          if (g2.floor >= 3) return 'Already on the last floor';
          if (busy(g2)) return busy(g2);
          app.devHold = false;
          g2.descend();
          return 'Descending';
        }),
      ),
      el('div', { class: 'row' }, tIn, act('Set time', (g2) => skip(g2, parseTime(tIn.value) - g2.time))),
      el('div', { class: 'row' }, bSel, act('Spawn boss', (g2, p) => {
        const pt = g2.world.spawnPoint(g2, 30) || { x: p.x + 90, y: p.y };
        g2.spawnBoss(bSel.value, pt.x, pt.y);
        return `Summoned ${bSel.value}`;
      })),
      el('h3', { textContent: 'End the run' }),
      el('div', { class: 'row' },
        g.mode !== 'ranked' && act('Win now', (g2) => {
          if (busy(g2)) return busy(g2);
          if (g2.mode === 's15') g2.time = g2.duration;
          else {
            g2.time = Math.max(g2.time, 4 * 60 + 1); // the server ignores impossibly quick wins
            g2.victory('dungeon');
          }
          app.devHold = false;
          return 'Victory';
        }, 'go'),
        act('Die now', (g2, p) => {
          if (busy(g2)) return busy(g2);
          p.devGod = false;
          p.revivals = 0;
          p.invuln = 0;
          app.devHold = false;
          p.hurt(1e9);
          return 'Fallen';
        }, 'go'),
      ),
      el('p', { class: 'note', textContent: 'Results still go through the normal rules: wins, unlocks and Ranked bests are recorded as if earned.' }),
    );
  }

  function skip(g, s) {
    g.time = Math.max(0, g.time + s);
    if (g.mode === 'dungeon') g.floorTime = Math.max(0, g.floorTime + s);
    return `Time ${fmtTime(g.time)}`;
  }

  // --------------------------------------------------------------- render --

  function render() {
    body.textContent = '';
    for (const [k, b] of Object.entries(navBtns)) b.classList.toggle('on', k === tab);
    const authed = status && status.authed;
    footer.style.display = authed ? '' : 'none';
    saveBtn.style.display = discardBtn.style.display = tab === 'save' ? '' : 'none';
    if (!status) return;
    if (!authed) return renderLogin();
    if (tab === 'save') renderSave();
    else renderRun();
  }

  const panel = {
    async toggle(force) {
      const open = force ?? !root.classList.contains('open');
      root.classList.toggle('open', open);
      if (open) {
        await refreshStatus();
        if (!dirty) draft = clone(store.profile);
        if (game() && tab === 'save' && !dirty) tab = 'run';
        render();
      } else {
        clearInterval(liveTimer);
        app.devHold = false; // never leave the game frozen behind a closed panel
        document.getElementById('game')?.focus();
      }
    },
  };
  return panel;
}
