// The menu-music audition page (index.html): plays the candidates listed in
// audio/music/menu/candidates.json and keeps the pick for the debug game in localStorage.
// "Guitar sounds" plays the short excerpts listed in audio/music/menu/guitars/guitars.json: the
// same opening of a few tunes on each guitar, to compare the sounds.
const DIR = '../audio/music/menu/';
const KEY = 'fs_menu_music';
const list = document.getElementById('list'), now = document.getElementById('now'), vol = document.getElementById('vol');
const guitarsEl = document.getElementById('guitars');
let audio = null, playing = null, cands = [], excerpts = [];

const pick = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const setPick = (c) => { try { c ? localStorage.setItem(KEY, JSON.stringify({ file: c.file, gain: c.gain || 1 })) : localStorage.removeItem(KEY); } catch {} paint(); };

function stop() {
  if (audio) { audio.pause(); audio.src = ''; audio = null; }
  playing = null;
  paint();
}
// A candidate loops; an excerpt plays once. Switching to another guitar's excerpt of the same
// tune starts it where the last one was, for A/B listening.
function play(c) {
  const at = audio && playing && playing.excerpt && c.excerpt && playing.tune === c.tune ? audio.currentTime : 0;
  stop();
  const a = new Audio(DIR + c.file);
  audio = a;
  a.loop = !c.excerpt;
  a.volume = level(c);
  if (c.excerpt) a.addEventListener('ended', () => { if (audio === a) stop(); });
  if (at > 0) a.addEventListener('loadedmetadata', () => { if (at < a.duration - 0.5) a.currentTime = at; }, { once: true });
  a.play().catch(() => { now.textContent = 'Could not play ' + c.file; });
  playing = c;
  paint();
}
// The slider times the candidate's own gain (the quieter tunes carry one), as the game would play it.
const level = (c) => Math.min(1, Number(vol.value) * (c.gain > 0 ? c.gain : 1));
vol.addEventListener('input', () => { if (audio && playing) audio.volume = level(playing); });
document.getElementById('stop').addEventListener('click', stop);
document.getElementById('clear').addEventListener('click', () => setPick(null));
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); stop(); }
  const n = Number(e.key);
  if (n >= 1 && n <= 9 && cands[n - 1]) play(cands[n - 1]);
});

function paint() {
  const inUse = pick();
  now.innerHTML = playing
    ? `Playing <strong>${esc(playing.title)}</strong> · ${esc(playing.renderer)} <span class="size">(${esc(playing.file)})</span>`
    : 'Nothing playing. Keys <kbd>1</kbd>–<kbd>9</kbd> play the first candidates, <kbd>Space</kbd> stops.';
  if (inUse) now.innerHTML += ` &nbsp;·&nbsp; menus play <strong>${esc(inUse.file)}</strong>`;
  for (const el of list.querySelectorAll('.cand')) {
    const c = cands[Number(el.dataset.i)];
    el.classList.toggle('playing', playing === c);
    el.classList.toggle('inuse', !!inUse && inUse.file === c.file);
    el.querySelector('.play').setAttribute('aria-pressed', playing === c ? 'true' : 'false');
    el.querySelector('.use').textContent = inUse && inUse.file === c.file ? 'In the menus' : 'Use in menus';
  }
  for (const b of guitarsEl.querySelectorAll('.gplay')) {
    const x = excerpts[Number(b.dataset.x)];
    b.setAttribute('aria-pressed', playing === x ? 'true' : 'false');
  }
  for (const row of guitarsEl.querySelectorAll('.grow')) row.classList.toggle('playing', !!playing && playing.excerpt && playing.guitar === row.dataset.id);
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');

fetch(DIR + 'candidates.json', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : { candidates: [] }))
  .then((m) => {
    cands = (m && m.candidates) || [];
    if (!cands.length) { list.innerHTML = '<div class="empty">No candidates yet: tools/music/render.mjs writes them to audio/music/menu/.</div>'; return; }
    // One panel per tune, its renderings side by side.
    const tunes = new Map();
    cands.forEach((c, i) => { c.i = i; (tunes.get(c.tune) || tunes.set(c.tune, []).get(c.tune)).push(c); });
    list.innerHTML = '';
    for (const [tune, cs] of tunes) {
      const c0 = cs[0];
      const div = document.createElement('div');
      div.className = 'tune';
      div.innerHTML = `<h2>${esc(c0.title)} <span class="meta">${esc(tune)}</span></h2>
        <div class="meta">${esc(c0.key || '')} · ${esc(c0.timeSig || '')} · ${c0.bpm || ''} BPM · ${c0.bars || ''} bars · ${fmt(c0.seconds)}</div>
        <p>${esc(c0.description || '')}</p>
        <div class="cands">${cs.map((c) => `<div class="cand" data-i="${c.i}">
          <button class="play" aria-pressed="false">▶ ${esc(c.renderer)}</button>
          <span class="size">${c.kb ? c.kb + ' KB' : ''}</span>
          <button class="use">Use in menus</button>
        </div>`).join('')}</div>`;
      list.appendChild(div);
    }
    for (const el of list.querySelectorAll('.cand')) {
      const c = cands[Number(el.dataset.i)];
      el.querySelector('.play').addEventListener('click', () => (playing === c ? stop() : play(c)));
      el.querySelector('.use').addEventListener('click', () => setPick(c));
    }
    paint();
  })
  .catch(() => { list.innerHTML = '<div class="empty">Could not load candidates.json.</div>'; })
  .finally(loadGuitars);

// Guitar sounds: one row per guitar, a play button per tune.
function loadGuitars() {
  fetch(DIR + 'guitars/guitars.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { guitars: [] }))
    .then((m) => {
      const guitars = (m && m.guitars) || [];
      if (!guitars.length) { guitarsEl.innerHTML = '<div class="empty">No guitar sounds yet: tools/music/render.mjs --excerpt=20 writes them to audio/music/menu/guitars/.</div>'; return; }
      const tunes = m.tunes && m.tunes.length ? m.tunes : [...new Set(guitars.flatMap((g) => Object.keys(g.files || {})))];
      const titleOf = (t) => { const c = cands.find((x) => x.tune === t); return c ? c.title : t; };
      excerpts = [];
      guitarsEl.innerHTML = guitars.map((g) => `<div class="grow" data-id="${esc(g.id)}">
          <span class="gname">${esc(g.label)}</span>
          <span class="gplays">${tunes.map((t) => {
            if (!g.files || !g.files[t]) return '';
            const x = excerpts.push({ file: 'guitars/' + g.files[t], tune: t, guitar: g.id, title: titleOf(t), renderer: g.label, gain: 1, excerpt: true }) - 1;
            return `<button class="gplay" data-x="${x}" aria-pressed="false" title="${esc(t)}">▶ ${esc(titleOf(t))}</button>`;
          }).join('')}</span>
          <span class="gsrc">${esc(g.source || '')}${g.licence ? ' · ' + esc(g.licence) : ''}</span>
        </div>`).join('');
      for (const b of guitarsEl.querySelectorAll('.gplay')) {
        const x = excerpts[Number(b.dataset.x)];
        b.addEventListener('click', () => (playing === x ? stop() : play(x)));
      }
      paint();
    })
    .catch(() => { guitarsEl.innerHTML = '<div class="empty">Could not load guitars/guitars.json.</div>'; });
}
