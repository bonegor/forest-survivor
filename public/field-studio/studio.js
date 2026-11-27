import { HEROES, HERO_ORDER } from '../js/data/heroes.js';
import { WEAPONS } from '../js/data/weapons.js';
import { SPR } from '../js/engine/sprites.js';
import { heroVariants } from './art/hero-variants.js';
import { GEM_FAMILIES, gemArt, DEFAULT_GEM_FAMILY } from './art/crystals.js';
import { prepareSprites } from './runtime.js';
import { collectionForLink, collectionOptions } from './collections.js';
import { FieldScene, FIELD_W, FIELD_H, TIER_VALUES } from './field-scene.js';

const $ = selector => document.querySelector(selector);
const make = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
};
const storageKey = 'fs_field_studio_picks_v1';
const terrains = Array.from($('#terrain').options, option => option.value);
const crystalOptions = GEM_FAMILIES.filter(option => option.id !== 'original');
const tierKeys = TIER_VALUES.map(value => 'crystal-' + value);
const pickKeys = [...HERO_ORDER, ...tierKeys];
const proposals = key => key === 'crystals' || tierKeys.includes(key) ? crystalOptions : heroVariants(key);
const label = key => key === 'crystals' ? 'Pickup crystals' : HEROES[key]?.name || key.slice(8) + ' XP crystal';
let picks = {};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const key of pickKeys) {
    const id = saved?.[key] ?? (tierKeys.includes(key) ? saved?.crystals : null);
    if (proposals(key).some(option => option.id === id)) picks[key] = id;
  }
} catch { /* Restricted browsers can still compare and copy choices. */ }

let hero, terrain, gems, scene, cards = [], motion = 'idle', face = -1;
const selectedSets = { heroes: 'refined', crystals: 'new' };
const section = (crystals = gems) => crystals ? 'crystals' : 'heroes';
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, comparing = false;
let groundMark = false;
let last = 0, ticking = false;
const currentKey = () => gems ? 'crystals' : hero;
function syncQuery() {
  const params = new URLSearchParams({ hero, map: terrain, set: selectedSets[section()] });
  if (gems) params.set('tab', 'crystals');
  return params;
}
function readRoute() {
  const url = new URL(location.href), p = url.searchParams;
  hero = HERO_ORDER.includes(p.get('hero')) ? p.get('hero') : 'mage';
  terrain = terrains.includes(p.get('map')) ? p.get('map') : 'forest';
  gems = p.get('tab') === 'crystals';
  const options = proposals(currentKey());
  selectedSets[section()] = collectionForLink(p, options, gems);
  if (!gems) {
    const look = p.get('look');
    if (look && look !== 'original' && !options.some(o => o.id === look)) p.delete('look');
    if (url.href !== location.href) history.replaceState(null, '', url);
  }
}
function navigate(nextHero, nextTerrain, nextGems, nextSet = selectedSets[section(nextGems)]) {
  if (hero === nextHero && terrain === nextTerrain && gems === nextGems && selectedSets[section()] === nextSet) return;
  hero = nextHero;
  terrain = nextTerrain;
  gems = nextGems;
  selectedSets[section()] = nextSet;
  history.pushState(null, '', location.pathname + '?' + syncQuery());
  loadScene();
}

function canvas(width, height, name) {
  const el = make('canvas');
  el.width = width;
  el.height = height;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', name);
  return el;
}
function blitThumb(el, frame) {
  const [x, y, right, bottom] = frame.box, w = right - x, h = bottom - y;
  const scale = Math.min((el.width - 3) / w, (el.height - 3) / h);
  const dw = Math.max(1, Math.round(w * scale)), dh = Math.max(1, Math.round(h * scale));
  const ctx = el.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.c, x, y, w, h, (el.width - dw) >> 1, (el.height - dh) >> 1, dw, dh);
}
function roster() {
  const rows = $('#hero-list'), select = $('#hero-select');
  $('#count').textContent = HERO_ORDER.length;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const row = entry.target, h = HEROES[row.dataset.hero];
      blitThumb(row.firstElementChild, SPR[h.pose || h.sprite].frames[0]);
      observer.unobserve(row);
    }
  }, { root: rows, rootMargin: '40px' });
  for (const id of HERO_ORDER) {
    const h = HEROES[id], row = make('button', 'row');
    row.dataset.hero = id;
    row.title = h.name + ' · ' + h.title;
    row.append(canvas(34, 34, h.title), make('span', '', h.name), make('em'));
    row.onclick = () => navigate(id, terrain, false);
    rows.append(row);
    observer.observe(row);
    select.add(new Option(h.name + ' · ' + h.title, id));
  }
  select.onchange = () => navigate(select.value, terrain, false);
  $('#search').oninput = e => {
    const term = e.target.value.trim().toLowerCase();
    for (const row of rows.children) row.hidden = !row.title.toLowerCase().includes(term);
  };
}
function swatches(id) {
  const list = make('div', 'swatches');
  for (let i = 0; i < TIER_VALUES.length; i++) {
    const fig = make('figure'), button = make('button'), value = TIER_VALUES[i] + ' XP', el = canvas(30, 30, value);
    const frame = gemArt(id, i).frames[0], ctx = el.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const scale = Math.max(1, Math.floor(28 / Math.max(frame.w, frame.h)));
    ctx.drawImage(frame.c, (30 - frame.w * scale) >> 1, (30 - frame.h * scale) >> 1, frame.w * scale, frame.h * scale);
    button.dataset.tier = tierKeys[i];
    button.title = 'Pick ' + value + ' from this set';
    button.setAttribute('aria-label', button.title + ' · ' + GEM_FAMILIES.find(family => family.id === id).name);
    button.onclick = () => togglePick([tierKeys[i]], id);
    button.append(el, make('span', '', value));
    fig.append(button);
    list.append(fig);
  }
  return list;
}
function cardFor(option) {
  const card = make('article', 'card'), stage = make('div', 'stage');
  const el = canvas(FIELD_W, FIELD_H, label(currentKey()) + ' · ' + option.name);
  stage.append(el);
  card.dataset.look = option.id;
  const footer = make('div', 'card-footer'), actions = make('div', 'actions');
  const tryLink = make('a', 'try', 'Playtest'), choose = make('button', 'choose', 'Pick');
  const params = syncQuery();
  params.set('look', option.id);
  tryLink.href = 'field-studio/trial.html?' + params;
  tryLink.setAttribute('aria-label', 'Playtest ' + option.name);
  actions.append(tryLink);
  if (option.id !== 'original') {
    choose.onclick = () => togglePick(gems ? tierKeys : [hero], option.id);
    actions.append(choose);
  }
  const title = make('div');
  if (selectedSets[section()] === 'refined' && option.id !== 'original') {
    title.append(make('small', 'version', option.id === 'reforged' ? 'New design' : 'First refinement'));
  }
  title.append(make('h2', '', option.name));
  footer.append(title, actions);
  card.append(stage);
  if (gems) card.append(swatches(option.id));
  card.append(footer);
  if (option.description) card.append(make('p', 'card-desc', option.description
    + (gems && option.id === DEFAULT_GEM_FAMILY ? ' Used in the game.' : '')));
  $('#grid').append(card);
  return { el, card, choose, option };
}
function togglePick(keys, id) {
  const clear = keys.every(key => picks[key] === id);
  for (const key of keys) {
    if (clear) delete picks[key];
    else picks[key] = id;
  }
  try { localStorage.setItem(storageKey, JSON.stringify(picks)); }
  catch { $('#status').textContent = 'Picks are available to copy for this visit.'; }
  updatePicks();
}
function updatePicks() {
  $('#picks span').textContent = Object.keys(picks).length;
  for (const { card, choose, option } of cards) {
    if (option.id === 'original') continue;
    const active = gems ? tierKeys.every(key => picks[key] === option.id) : picks[hero] === option.id;
    for (const btn of card.querySelectorAll('[data-tier]')) {
      btn.setAttribute('aria-pressed', String(picks[btn.dataset.tier] === option.id));
    }
    card.classList.toggle('picked', active);
    choose.textContent = active ? 'Picked ✓' : gems ? 'Pick set' : 'Pick';
    choose.setAttribute('aria-pressed', String(active));
    choose.setAttribute('aria-label', (active ? 'Remove pick ' : 'Pick ') + option.name);
  }
  for (const row of $('#hero-list').children) {
    row.setAttribute('aria-current', String(row.dataset.hero === hero));
    row.lastElementChild.textContent = picks[row.dataset.hero] ? '✓' : '';
  }
}
function controls() {
  for (const btn of $('#motions').children) btn.setAttribute('aria-pressed', String(btn.dataset.motion === motion));
  $('#pause').textContent = paused ? 'Resume' : 'Pause';
  $('#step').hidden = !paused || gems;
  $('#ground').hidden = gems;
  $('#ground').setAttribute('aria-pressed', String(groundMark));
  $('#facing').textContent = face < 0 ? 'Face right' : 'Face left';
  $('#compare').textContent = comparing ? 'Show proposals' : 'Show original';
  $('#compare').setAttribute('aria-pressed', String(comparing));
  $('#grid').classList.toggle('comparing', comparing);
}
function draw(dt = 0) {
  scene.advance(dt, gems ? 'idle' : motion, face);
  if (!$('#reference').hidden) scene.paint($('#reference canvas'), 'original');
  for (const { el, option } of cards) scene.paint(el, comparing ? 'original' : option.id, groundMark && !gems);
}
function fail(error) {
  scene = null;
  $('#status').textContent = 'The field could not load. Refresh to try again.';
  console.error(error);
}
function tick(now) {
  ticking = false;
  if (!scene || paused || document.hidden) return;
  if (now - last >= 58) {
    try { draw(last ? Math.min((now - last) / 1000, 0.2) : 0); }
    catch (error) { fail(error); return; }
    last = now;
  }
  start();
}
function start() {
  if (!ticking && !paused && !document.hidden && scene) {
    ticking = true;
    requestAnimationFrame(tick);
  }
}
function updateSetButtons() {
  const group = $('#sets');
  if (group.dataset.section !== section()) {
    group.dataset.section = section();
    group.setAttribute('aria-label', gems ? 'Crystal designs' : 'Hero designs');
    group.replaceChildren();
    for (const set of gems ? ['new', 'first'] : ['refined', 'first', 'new']) {
      const name = set === 'refined' ? 'Refined' : set === 'first' ? 'First proposals' : gems ? 'New crystals' : 'New sprites';
      const btn = make('button', '', name);
      btn.dataset.set = set;
      if (gems) btn.append(' ', make('span', '', '4'));
      group.append(btn);
    }
  }
  for (const btn of group.children) btn.setAttribute('aria-pressed', String(btn.dataset.set === selectedSets[section()]));
}
function loadScene() {
  scene = null;
  comparing = false;
  document.body.classList.toggle('gem-mode', gems);
  $('#hero-tab').toggleAttribute('aria-current', !gems);
  $('#gem-tab').toggleAttribute('aria-current', gems);
  (gems ? $('#gem-tab') : $('#hero-tab')).setAttribute('aria-current', 'page');
  $('#section-name').textContent = gems ? 'Field pickups' : 'Hero sprites';
  $('#title').textContent = label(currentKey());
  $('#identity').textContent = gems ? 'Pick a full set, or select individual XP tiers below each preview.' : HEROES[hero].title + ' · ' + WEAPONS[HEROES[hero].weapon].name;
  $('#ref-label').textContent = gems ? 'Original diamonds' : 'Current look';
  $('#hero-select').value = hero;
  $('#terrain').value = terrain;
  const refined = selectedSets[section()] === 'refined';
  $('#grid').classList.toggle('refined', refined);
  $('#reference').hidden = refined;
  $('#compare').hidden = refined;
  updateSetButtons();
  $('#grid').replaceChildren();
  $('#status').textContent = 'Preparing the field…';
  try {
    scene = new FieldScene(hero, terrain, gems);
    const options = collectionOptions(proposals(currentKey()), selectedSets[section()]);
    if (refined) options.unshift({ id: 'original', name: 'Current gameplay sprite' });
    cards = options.map(cardFor);
    controls();
    updatePicks();
    draw();
    last = 0;
    $('#status').textContent = '';
    start();
  } catch (error) { fail(error); }
}
$('#hero-tab').onclick = e => { e.preventDefault(); navigate(hero, terrain, false); };
$('#gem-tab').onclick = e => { e.preventDefault(); navigate(hero, terrain, true); };
$('#terrain').onchange = e => navigate(hero, e.target.value, gems);
$('#sets').onclick = e => {
  const button = e.target.closest('button');
  if (button) navigate(hero, terrain, gems, button.dataset.set);
};
$('#motions').onclick = e => {
  if (!e.target.dataset.motion || !scene) return;
  motion = e.target.dataset.motion;
  controls(); draw();
};
$('#facing').onclick = () => { face *= -1; controls(); if (scene) draw(); };
$('#ground').onclick = () => { groundMark = !groundMark; controls(); if (scene) draw(); };
$('#pause').onclick = () => { paused = !paused; controls(); last = 0; start(); };
$('#step').onclick = () => { if (paused && scene) draw(scene.stepDuration()); };
$('#compare').onclick = () => { comparing = !comparing; controls(); if (scene) draw(); };
document.addEventListener('visibilitychange', () => { last = 0; start(); });
window.addEventListener('popstate', () => { readRoute(); loadScene(); });

function chosen() {
  return pickKeys.filter(key => picks[key]).map(key => [label(key), proposals(key).find(o => o.id === picks[key]).name]);
}
$('#picks').onclick = () => {
  const list = $('#pick-list'), choices = chosen();
  list.replaceChildren();
  for (const [key, name] of choices) {
    const li = make('li');
    li.append(make('span', '', key), make('strong', '', name));
    list.append(li);
  }
  if (!choices.length) list.append(make('li', '', 'Pick a look to add it here.'));
  $('#copy').disabled = !choices.length;
  $('#copy-status').textContent = '';
  $('#choices').showModal();
};
$('#close').onclick = () => $('#choices').close();
$('#copy').onclick = async () => {
  const lines = chosen().map(([who, look]) => who + ' — ' + look).join('\n');
  try { await navigator.clipboard.writeText(lines); $('#copy-status').textContent = 'Copied'; }
  catch {
    const range = document.createRange(); range.selectNodeContents($('#pick-list'));
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    $('#copy-status').textContent = 'List selected for copying';
  }
};
prepareSprites();
readRoute();
roster();
loadScene();
