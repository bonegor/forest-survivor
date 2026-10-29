import { buildSprites } from '../js/engine/sprites.js';
import { initView, view, presentUI } from '../js/engine/view.js';
import { initInput, input } from '../js/engine/input.js';
import { Game } from '../js/game/game.js';
import { HEROES, heroLook } from '../js/data/heroes.js';
import { defaultProfile, metaBonuses } from '../js/shared/profile.js';
const query = new URLSearchParams(location.search), id = HEROES[query.get('hero')] ? query.get('hero') : 'paladin';
const canvas = document.querySelector('canvas'), choose = document.querySelector('#look');
buildSprites(); initView(canvas); initInput(canvas);
const options = HEROES[id].skins || [{ id: 'original', name: 'Plumed Knight' }];
for (const look of options) choose.add(new Option(look.name, look.id));
choose.value = options.some(o => o.id === query.get('look')) ? query.get('look') : options[0].id;
document.querySelector('#name').textContent = HEROES[id].title;
document.querySelector('#back').href = `./?hero=${id}`;
let game, paused = false;
function reset() {
  game = new Game({ hero: id, mode: 's15', diff: 'easy', meta: metaBonuses(defaultProfile()), crypts: false,
    settings: { numbers: false, screenshake: false, skins: { [id]: choose.value } } });
  game.player.devGod = true;
  game.syncCam(); game.cam.x = game.player.x - game.cam.W / 2; game.cam.y = game.player.y - 8 - game.cam.H / 2;
}
choose.addEventListener('change', () => { game.player.hero = heroLook(id, { [id]: choose.value }); game.settings.skins[id] = choose.value; });
document.querySelector('#reset').addEventListener('click', reset);
const pause = document.querySelector('#pause');
pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; });
const zoom = document.createElement('select'); zoom.setAttribute('aria-label', 'Zoom');
for (const level of [1, 2, 3]) zoom.add(new Option(`${level}× zoom`, String(level)));
zoom.addEventListener('change', () => { view.zoom = 0.8 * Number(zoom.value); });
pause.after(zoom);
reset();
let last;
function draw(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.04) : 0; last = now;
  if (!paused) {
    // Field test only: clear reward screens without submitting a run or changing a profile.
    if (['levelup', 'chest', 'item'].includes(game.state)) {
      game.pendingLevels = 0; game.chestQueue.length = 0; game.itemQueue.length = 0; game.state = 'play';
    }
    if (game.state === 'paused') game.state = 'play';
    game.update(dt);
  }
  game.draw(view.ctx); view.uctx.clearRect(0, 0, view.W, view.H); game.hud.draw(view.uctx, view.W, view.H, game.time); presentUI();
  input.endFrame(); requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
