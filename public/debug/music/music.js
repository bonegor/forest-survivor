// The menu-music audition page (index.html): plays the candidates listed in
// audio/music/menu/candidates.json and keeps the pick for the debug game in localStorage.
const DIR = '../../audio/music/menu/';
const KEY = 'fs_menu_music';
const list = document.getElementById('list'), now = document.getElementById('now'), vol = document.getElementById('vol');
let audio = null, playing = null, cands = [];

const pick = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const setPick = (c) => { try { c ? localStorage.setItem(KEY, JSON.stringify({ file: c.file, gain: c.gain || 1 })) : localStorage.removeItem(KEY); } catch {} paint(); };

function stop() {
  if (audio) { audio.pause(); audio.src = ''; audio = null; }
  playing = null;
  paint();
}
function play(c) {
  stop();
  audio = new Audio(DIR + c.file);
  audio.loop = true;
  audio.volume = level(c);
  audio.play().catch(() => { now.textContent = 'Could not play ' + c.file; });
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
  .catch(() => { list.innerHTML = '<div class="empty">Could not load candidates.json.</div>'; });
