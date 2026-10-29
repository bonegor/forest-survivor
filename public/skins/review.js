import { buildSprites, SPR } from '../js/engine/sprites.js';
import { HEROES } from '../js/data/heroes.js';
import { HERO_REVIEW } from '../js/data/hero-review.js';
import { HeroShowcase } from '../js/ui/hero-showcase.js';
import { defaultProfile } from '../js/shared/profile.js';
import { loadSettings, saveSettings } from '../js/engine/storage.js';

buildSprites();
const select = document.querySelector('#hero'), motion = document.querySelector('#motion'), facing = document.querySelector('#facing');
for (const id of Object.keys(HERO_REVIEW)) select.add(new Option(`${HEROES[id].title} · ${HEROES[id].name}`, id));
select.value = new URLSearchParams(location.search).get('hero') || 'paladin';
if (!select.value) select.value = 'paladin';
const profile = defaultProfile();
let previews = [], paused = matchMedia('(prefers-reduced-motion: reduce)').matches, speed = 1, time = 0;
const pause = document.querySelector('#pause');
function setPaused(value) { paused = value; pause.textContent = paused ? 'Play' : 'Pause'; }
setPaused(paused);
function showSavedChoices() {
  const skins = loadSettings().skins || {}, list = document.querySelector('#saved-list');
  list.replaceChildren();
  let count = 0;
  for (const id of Object.keys(HERO_REVIEW)) {
    const hero = HEROES[id], saved = hero.skins.find(s => s.id === skins[id]);
    if (saved) count++;
    const row = document.createElement('li');
    const defaultLook = hero.skins.find(s => s.id === hero.skin) || hero.skins[0];
    row.textContent = `${hero.title}: ${saved ? saved.name : 'Not selected (using ' + defaultLook.name + ')'}`;
    list.append(row);
  }
  document.querySelector('#saved-count').textContent = `Saved choices · ${count} of 8 heroes selected`;
  for (const button of document.querySelectorAll('[data-look]')) {
    const selected = skins[select.value] === button.dataset.look;
    button.textContent = selected ? 'Selected' : 'Use this look';
    button.setAttribute('aria-pressed', String(selected));
  }
}
function reset() {
  time = 0;
  const id = select.value, hero = HEROES[id], kept = hero.skins[0];
  document.querySelector('#baseline-note').textContent = `${hero.title}: ${kept.id === 'v3' ? 'V3 is the retained baseline.' : 'The original is the retained baseline.'} Options A and B are proposals for review.`;
  document.querySelector('#status').textContent = '';
  const cards = document.querySelector('#cards'); cards.replaceChildren();
  const options = [
    { hero: 'knight', skin: 'original', tag: 'Style reference', name: 'Plumed Knight', detail: 'The approved Knight, kept exactly as it is.' },
    { hero: id, skin: kept.id, tag: 'Retained baseline', name: kept.name, detail: kept.id === 'v3' ? 'The unchanged V3 used as the starting point for both new options.' : 'The unchanged original used as the starting point for both new options.' },
    ...HERO_REVIEW[id].map((item, i) => ({ ...item, hero: id, skin: i ? 'v4b' : 'v4a', tag: `Option ${i ? 'B' : 'A'}` })),
  ];
  previews = options.map((item, col) => {
    const article = document.createElement('article'); if (!col) article.className = 'reference';
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = item.tag;
    const heading = document.createElement('h2'); heading.textContent = item.name;
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 220; canvas.setAttribute('aria-label', `${item.tag}: ${item.name} animation`);
    const detail = document.createElement('p'); detail.className = 'detail'; detail.textContent = item.detail;
    const actions = document.createElement('div'); actions.className = 'actions';
    const play = document.createElement('a'); play.href = `./play.html?hero=${item.hero}&look=${item.skin}`; play.textContent = 'Try in the forest'; actions.append(play);
    if (col) {
      const equip = document.createElement('button'); equip.textContent = 'Use this look';
      equip.dataset.look = item.skin;
      equip.addEventListener('click', () => {
        const settings = loadSettings(); settings.skins = { ...settings.skins, [id]: item.skin }; saveSettings(settings);
        showSavedChoices();
        document.querySelector('#status').textContent = `${item.name} selected for ${hero.title} in this preview. Hero unlocks and progress are unchanged.`;
      }); actions.append(equip);
    }
    article.append(tag, heading, canvas, detail, actions); cards.append(article);
    const settings = { diff: 'easy', skins: { [item.hero]: item.skin } };
    return { show: new HeroShowcase(item.hero, profile, settings), settings, ctx: canvas.getContext('2d') };
  });
  showSavedChoices();
  render(0);
}
function render(dt) {
  time += dt;
  for (const { show, settings, ctx } of previews) {
    if (motion.value !== 'cycle') {
      const ranges = { idle: [0, 1.3], walk: [1.4, 1.9], attack: [4, 0.8] };
      const [start, length] = ranges[motion.value]; show.time = start + (time % length) - dt;
    }
    show.update(dt);
    const p = show.game.player;
    if (facing.value !== 'auto' || motion.value !== 'cycle') {
      p.face = facing.value === 'auto' ? (Math.floor(time / 4) % 2 ? -1 : 1) : Number(facing.value);
      show.action.face = p.face;
      if (show.action.kind === 'attack' && SPR[p.hero.sprite].attack) p.strikeAng = p.face < 0 ? Math.PI : 0;
    }
    ctx.imageSmoothingEnabled = false;
    show.draw(ctx, { x: 0, y: 0, w: 240, h: 220 }, false, settings);
  }
}
select.addEventListener('change', reset);
motion.addEventListener('change', reset);
facing.addEventListener('change', () => render(0));
document.querySelector('#restart').addEventListener('click', reset);
pause.addEventListener('click', () => setPaused(!paused));
document.querySelector('#step').addEventListener('click', () => { setPaused(true); render(1 / 30); });
document.querySelector('#slow').addEventListener('click', e => { speed = speed === 1 ? 0.25 : 1; e.target.textContent = speed === 1 ? 'Slow motion' : 'Normal speed'; });
reset();
let last;
function draw(now) { const dt = paused || !last ? 0 : Math.min((now - last) / 1000, 0.05) * speed; last = now; render(dt); requestAnimationFrame(draw); }
requestAnimationFrame(draw);
