import { WEAPON_SOUND_STYLES, WEAPON_SOUND_KEY, weaponSoundStyle, applyWeaponSoundStyle } from '../js/engine/weapon-sounds.js';
import { prepareWeaponAudio, setWeaponSoundAudition, setVolumes, stopMusic } from '../js/engine/audio.js';
import { MAX_WEAPON_LEVEL } from '../js/data/weapons.js';
import { buildSprites } from '../js/engine/sprites.js';
import { view } from '../js/engine/view.js';
import { makeWeaponPreview, PREVIEW_WEAPONS, PREVIEW_SECONDS } from './preview.js';

const $ = id => document.getElementById(id);
const canvas = $('arena'), ctx = canvas.getContext('2d'), ui = document.createElement('canvas');
ui.width = canvas.width; ui.height = canvas.height;
Object.assign(view, { canvas, ctx, ui, uctx: ui.getContext('2d'), S: 1, W: canvas.width, H: canvas.height, pxW: canvas.width, pxH: canvas.height, zoom: 1 });
ctx.imageSmoothingEnabled = false;
buildSprites();
let current = null, request = 0, last = 0, running = false;
for (const w of PREVIEW_WEAPONS) $('weapon').add(new Option(w.name, w.id));
for (const [index, style] of WEAPON_SOUND_STYLES.entries()) {
  const card = document.createElement('article');
  card.className = 'style'; card.dataset.style = style.id;
  card.innerHTML = `<p class="index">0${index + 1} / ${style.id === 'current' ? 'ORIGINAL' : 'NEW STYLE'}</p><h2>${style.name}</h2><p class="desc">${style.desc}</p><div class="listen"><button type="button" data-level="1">▶ Level 1</button><button type="button" data-level="${MAX_WEAPON_LEVEL}">▶ Max · L${MAX_WEAPON_LEVEL}</button></div><button type="button" class="apply">Apply ${style.name}</button>`;
  for (const button of card.querySelectorAll('[data-level]')) button.addEventListener('click', () => play(style, Number(button.dataset.level), button));
  card.querySelector('.apply').addEventListener('click', () => {
    const saved = applyWeaponSoundStyle(style.id);
    refreshSelection(saved ? `${style.name} applied. Your game will use this style.` : `${style.name} selected for this tab. Browser storage is unavailable.`);
  });
  $('styles').append(card);
}
function refreshSelection(message) {
  const id = weaponSoundStyle(), style = WEAPON_SOUND_STYLES.find(s => s.id === id);
  for (const card of document.querySelectorAll('.style')) {
    const active = card.dataset.style === id;
    card.classList.toggle('selected', active);
    const button = card.querySelector('.apply');
    button.textContent = active ? '✓ Applied' : `Apply ${WEAPON_SOUND_STYLES.find(s => s.id === card.dataset.style).name}`;
    button.setAttribute('aria-pressed', String(active));
  }
  $('saved').textContent = message || `Applied: ${style.name}. Listening never changes your choice.`;
}
function stop(message = 'Preview stopped') {
  request++; running = false;
  setVolumes(0, 0);
  setWeaponSoundAudition(null);
  document.querySelectorAll('.playing').forEach(button => button.classList.remove('playing'));
  $('timer').textContent = message;
}
async function play(style, level, button) {
  stop('Loading sounds…');
  const token = request;
  try {
    await prepareWeaponAudio();
    if (token !== request) return;
    setWeaponSoundAudition(style.id);
    setVolumes(0, Number($('volume').value) / 100);
    current = makeWeaponPreview($('weapon').value, level);
    stopMusic();
    const w = current.weapon;
    $('playing').textContent = `${w.def.name} · Level ${level} · ${style.name}`;
    $('stats').textContent = `${w.s.cd.toFixed(2)}s cooldown · ${w.s.amount} per attack · No relics or gear`;
    button.classList.add('playing');
    running = true; last = performance.now();
  } catch (error) { stop('Could not start preview'); $('saved').textContent = error.message; }
}
function frame(now) {
  if (running && current) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    current.game.update(dt);
    current.game.draw(ctx);
    $('timer').textContent = `${Math.max(0, PREVIEW_SECONDS - current.game.clock).toFixed(1)}s remaining`;
    if (current.game.clock >= PREVIEW_SECONDS) stop('Preview complete');
  }
  last = now;
  requestAnimationFrame(frame);
}
$('stop').addEventListener('click', () => stop());
$('weapon').addEventListener('change', () => { stop(); $('playing').textContent = `${$('weapon').selectedOptions[0].text} · ready`; });
$('volume').addEventListener('input', () => {
  $('volume-value').textContent = `${$('volume').value}%`;
  if (running) setVolumes(0, Number($('volume').value) / 100);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('storage', event => { if (event.key === WEAPON_SOUND_KEY) refreshSelection(); });
current = makeWeaponPreview('axe', 1);
stopMusic(); current.game.draw(ctx);
refreshSelection();
requestAnimationFrame(frame);
