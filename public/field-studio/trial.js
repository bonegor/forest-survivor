import { prepareSprites, proposalSprite } from './runtime.js';
import { heroVariants } from './art/hero-variants.js';
import { GEM_FAMILIES, applyGemFamily } from './art/crystals.js';
import { SPR } from '../js/engine/sprites.js';
import { initView, presentUI, view } from '../js/engine/view.js';
import { initInput, input } from '../js/engine/input.js';
import { initAudio, setVolumes } from '../js/engine/audio.js';
import { HEROES } from '../js/data/heroes.js';
import { MAPS } from '../js/data/maps.js';
import { Game } from '../js/game/game.js';
import { defaultProfile, metaBonuses } from '../js/shared/profile.js';
import { UI } from '../js/ui/ui.js';
import { ChestOverlay, LevelUpOverlay } from '../js/ui/gamescreen.js';
import { TrophyOverlay } from '../js/ui/trophy.js';

const query = new URLSearchParams(location.search);
const hero = Object.hasOwn(HEROES, query.get('hero')) ? query.get('hero') : 'mage';
const map = Object.hasOwn(MAPS, query.get('map')) ? query.get('map') : 'forest';
const crystals = query.get('tab') === 'crystals';
const proposals = crystals ? GEM_FAMILIES.filter(family => family.id !== 'original') : heroVariants(hero).slice(0, 4);
const original = crystals ? GEM_FAMILIES.find(family => family.id === 'original') : { id: 'original', name: 'Original' };
const requested = query.get('look');
const firstCrystalSet = crystals && (query.get('set') === 'first' ||
  (!query.has('set') && proposals.slice(0, 4).some(option => option.id === requested)));
const look = requested === 'original' ? original :
  proposals.find(option => option.id === requested) || proposals[crystals && !firstCrystalSet ? 4 : 0];
const field = document.querySelector('#field'), notice = document.querySelector('#notice');
const pauseButton = document.querySelector('#pause'), restart = document.querySelector('#restart');
query.set('hero', hero);
query.set('map', map);
query.set('look', look.id);
if (crystals) query.set('set', firstCrystalSet ? 'first' : 'new');
else query.delete('set');
const replacedLook = !crystals && !!requested && requested !== look.id;
if (replacedLook) history.replaceState(null, '', location.pathname + '?' + query + location.hash);
document.querySelector('#back').href = 'field-studio/?' + query.toString();
document.querySelector('#title').textContent = crystals ? look.name : HEROES[hero].title + ' · ' + look.name;
document.querySelector('#detail').textContent = (crystals ? HEROES[hero].title + ' · ' : '') + MAPS[map].name +
  (replacedLook ? ' · Showing the first available look' : ' · Practice');

const session = { app: { ui: new UI() }, seen: null };
let game, reward, paused, previous;

function message(title, detail = '') {
  notice.querySelector('strong').textContent = title;
  notice.querySelector('span').textContent = detail;
  notice.hidden = !title;
}

function reset() {
  game = new Game({ hero, map, mode: 's15', diff: 'easy', meta: metaBonuses(defaultProfile()),
    settings: { numbers: true, shake: true, softFlash: true }, sealedGear: true });
  session.game = game;
  session.app.ui = new UI();
  if (crystals) {
    applyGemFamily(game, look.id);
    for (const [rank, value] of [1, 5, 25, 100].entries()) {
      game.addPickup('gem', game.player.x - 66 + rank * 44, game.player.y - 44, value, { pop: false });
    }
  }
  game.syncCam();
  game.snapCam();
  reward = null;
  paused = false;
  pauseButton.textContent = 'Pause';
  pauseButton.disabled = false;
  restart.disabled = false;
  input.releaseTouches();
  input.endFrame();
  input.joystickEnabled = true;
  message('');
  field.focus({ preventScroll: true });
}

function togglePause() {
  if (!game || game.state === 'over') return;
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  input.releaseTouches();
  input.joystickEnabled = !paused && !reward;
  message(paused ? 'Trial paused' : '', 'WASD or arrows to move · Drag to steer on touch');
  if (!paused) field.focus({ preventScroll: true });
}

function openReward() {
  if (game.state !== game.playState || game.momentRunning) return;
  if (game.pendingLevels) game.resolveAutoLevels();
  if (game.pendingLevels) {
    game.state = 'levelup';
    reward = new LevelUpOverlay(session);
  } else if (game.chestQueue.length) {
    game.state = 'chest';
    reward = new ChestOverlay(session, game.chestQueue.shift());
  } else if (game.trophyQueue.length) {
    game.state = 'chest';
    reward = new TrophyOverlay(session, game.trophyQueue.shift());
  }
  if (reward) {
    session.app.ui.lock(reward.lockTime ?? .35);
    session.app.ui.noSpace = !!reward.noSpace;
    input.releaseTouches();
    input.joystickEnabled = false;
  }
}

function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  input.update();
  if (((paused || !reward) && input.pressed('pause')) || (input.away && !paused)) togglePause();
  if (!paused && game.state !== 'over') {
    if (!reward) {
      if (input.pressed('map') && game.inCrypt) game.showMap = !game.showMap;
      game.update(dt);
      openReward();
      if (game.state === 'cleared' && !reward) game.finishLevel();
    } else game.fadeReal(dt);
  }
  game.draw(view.ctx);
  const ctx = view.uctx;
  ctx.clearRect(0, 0, view.W, view.H);
  game.hud.draw(ctx, view.W, view.H, game.clock, paused ? 0 : dt);
  if (reward && !paused && reward.draw(ctx, view.W, view.H - view.safe.bottom, dt) === 'close') {
    reward = null;
    session.app.ui.noSpace = false;
    input.joystickEnabled = true;
  }
  presentUI();
  if (game.state === 'over' && !pauseButton.disabled) {
    pauseButton.disabled = true;
    input.joystickEnabled = false;
    message(game.result?.victory ? 'Trial complete' : 'The hero has fallen', 'Restart to play this look again.');
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

async function start() {
  await prepareSprites();
  if (!crystals && look.id !== 'original') SPR[HEROES[hero].sprite] = await proposalSprite(hero, look.id);
  initView(field);
  // Keep browser tab navigation available for the trial controls. M still opens the crypt map.
  window.addEventListener('keydown', event => {
    if (event.code === 'Tab' || (event.target.closest?.('footer') && ['Space', 'Enter'].includes(event.code))) {
      event.stopImmediatePropagation();
    }
  }, true);
  initInput(field);
  input.touchRegions = (x, y) => {
    const floor = view.H - view.safe.bottom;
    if (reward || paused || y >= floor) return null;
    if (Math.abs(x - view.W / 2) < 14 && y > floor - 22) return 'pause';
    if (game.inCrypt && x > view.W / 2 + 18 && x < view.W / 2 + 52 && y > floor - 22) return 'map';
    if (x > view.W - view.safe.right - 56 && y > floor - 56) return 'ult';
    return null;
  };
  const enableAudio = () => { initAudio(); setVolumes(.35, .7); };
  field.addEventListener('pointerdown', enableAudio, { once: true });
  document.addEventListener('keydown', enableAudio, { once: true });
  restart.addEventListener('click', reset);
  pauseButton.addEventListener('click', togglePause);
  reset();
  previous = performance.now();
  requestAnimationFrame(frame);
}

start().catch(error => {
  console.error(error);
  message('Could not start the trial', error.message);
});
