import { buildSprites } from '../js/engine/sprites.js';
import { HEROES } from '../js/data/heroes.js';
import { HERO_V3 } from '../js/data/hero-v3.js';
import { HeroShowcase } from '../js/ui/hero-showcase.js';
import { defaultProfile } from '../js/shared/profile.js';
import { loadSettings, saveSettings } from '../js/engine/storage.js';

buildSprites();
const select = document.querySelector('#hero');
for (const hero of Object.values(HEROES)) select.add(new Option(`${hero.title} · ${hero.name}`, hero.id));
select.value = 'paladin';
const profile = defaultProfile(); // Preview only; never read or write progression.
let previews, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let speed = 1;
const pause = document.querySelector('#pause');
pause.textContent = paused ? 'Play' : 'Pause';
function reset() {
  const id = select.value, hero = HEROES[id];
  document.querySelector('#skin-name').textContent = HERO_V3[id].name;
  document.querySelector('#changes').textContent = HERO_V3[id].detail;
  document.querySelector('#status').textContent = '';
  previews = ['original', 'v3'].map(skin => {
    const settings = { diff: 'easy', skins: { [id]: skin } };
    return { show: new HeroShowcase(id, profile, settings), settings, ctx: document.querySelector('#' + skin).getContext('2d') };
  });
}
select.addEventListener('change', reset);
document.querySelector('#restart').addEventListener('click', reset);
pause.addEventListener('click', () => { paused = !paused;pause.textContent = paused ? 'Play' : 'Pause'; });
document.querySelector('#slow').addEventListener('click', e => {
  speed = speed === 1 ? 0.25 : 1;e.target.textContent = speed === 1 ? 'Slow motion' : 'Normal speed';
});
document.querySelector('#attack').addEventListener('click', () => {
  paused = false;pause.textContent = 'Pause';previews.forEach(({ show }) => show.attack());
});
document.querySelector('#equip').addEventListener('click', () => {
  const settings = loadSettings();
  settings.skins = { ...settings.skins, [select.value]: 'v3' };
  saveSettings(settings);
  document.querySelector('#status').textContent = `${HERO_V3[select.value].name} selected. Return to the game and choose ${HEROES[select.value].title}.`;
});
reset();
let last;
function draw(now) {
  const dt = paused || !last ? 0 : Math.min((now - last) / 1000, 0.05) * speed;
  last = now;
  for (const { show, settings, ctx } of previews) {
    ctx.imageSmoothingEnabled = false;
    show.update(dt);show.draw(ctx, { x: 0, y: 0, w: 240, h: 200 }, false, settings);
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
