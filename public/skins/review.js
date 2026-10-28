import { buildSprites } from '../js/engine/sprites.js';
import { HEROES } from '../js/data/heroes.js';
import { HeroShowcase } from '../js/ui/hero-showcase.js';
import { defaultProfile } from '../js/shared/profile.js';
import { loadSettings, saveSettings } from '../js/engine/storage.js';

buildSprites();
const select = document.querySelector('#hero');
for (const hero of Object.values(HEROES)) select.add(new Option(`${hero.title} · ${hero.name}`, hero.id));
const profile = defaultProfile(); // Preview only; never read or write progression.
let previews, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = document.querySelector('#pause');
pause.textContent = paused ? 'Play' : 'Pause';
function reset() {
  const id = select.value, hero = HEROES[id];
  document.querySelector('#skin-name').textContent = hero.skins[1].name;
  document.querySelector('#status').textContent = '';
  previews = ['original', 'refined'].map(skin => {
    const settings = { diff: 'easy', skins: { [id]: skin } };
    return { show: new HeroShowcase(id, profile, settings), settings, ctx: document.querySelector('#' + skin).getContext('2d') };
  });
}
select.addEventListener('change', reset);
document.querySelector('#restart').addEventListener('click', reset);
pause.addEventListener('click', () => { paused = !paused;pause.textContent = paused ? 'Play' : 'Pause'; });
document.querySelector('#attack').addEventListener('click', () => {
  paused = false;pause.textContent = 'Pause';previews.forEach(({ show }) => show.attack());
});
document.querySelector('#equip').addEventListener('click', () => {
  const settings = loadSettings();
  settings.skins = { ...settings.skins, [select.value]: 'refined' };
  saveSettings(settings);
  document.querySelector('#status').textContent = `${HEROES[select.value].skins[1].name} selected. Return to the game and choose ${HEROES[select.value].title}.`;
});
reset();
let last;
function draw(now) {
  const dt = paused || !last ? 0 : Math.min((now - last) / 1000, 0.05);
  last = now;
  for (const { show, settings, ctx } of previews) {
    ctx.imageSmoothingEnabled = false;
    show.update(dt);show.draw(ctx, { x: 0, y: 0, w: 240, h: 200 }, false, settings);
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
