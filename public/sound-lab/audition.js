import { WEAPON_SOUND_STYLES, WEAPON_SOUND_KEY, WEAPON_CHOICES_KEY, weaponSoundChoice, applyWeaponSoundChoice } from '../js/engine/weapon-sounds.js';
import { weaponRecordingCatalog } from '../js/engine/weapon-recordings.js';
import { prepareWeaponAudio, setWeaponSoundAudition, setVolumes, stopMusic } from '../js/engine/audio.js';
import { MAX_WEAPON_LEVEL, WEAPONS } from '../js/data/weapons.js';
import { buildSprites } from '../js/engine/sprites.js';
import { view } from '../js/engine/view.js';
import { RELEASE } from '../js/engine/build.js';
import { makeWeaponPreview, PREVIEW_WEAPONS, PREVIEW_SECONDS } from './preview.js';
import { recommendedSounds } from './recommendations.js';

const $ = id => document.getElementById(id);
const canvas = $('arena'), ctx = canvas.getContext('2d'), ui = document.createElement('canvas');
ui.width = canvas.width; ui.height = canvas.height;
Object.assign(view, { canvas, ctx, ui, uctx: ui.getContext('2d'), S: 1, W: canvas.width, H: canvas.height, pxW: canvas.width, pxH: canvas.height, zoom: 1 });
ctx.imageSmoothingEnabled = false;
$('studio').hidden = RELEASE;
buildSprites();

let library = new Map(), suggestions = [], selected = 'current';
let current, request = 0, last = 0, running = false, cues = 0;
const weapon = () => PREVIEW_WEAPONS.find(w => w.id === $('weapon').value);
const style = id => WEAPON_SOUND_STYLES.find(s => s.id === id);
const title = id => style(id)?.name || library.get(id.slice(5))?.title || 'Saved recording';
for (const name of ['Shared weapons','Hero signatures','Cursed copper','Fusions']) {
  const group = document.createElement('optgroup'); group.label = name;
  for (const w of PREVIEW_WEAPONS.filter(w => w.group === name)) group.append(new Option(w.name, w.id));
  $('weapon').append(group);
}
$('weapon').value = 'axe';

function stop(message = 'Preview stopped') {
  request++; running = false;
  setVolumes(0, 0); setWeaponSoundAudition(null);
  document.querySelectorAll('.playing').forEach(button => button.classList.remove('playing'));
  $('timer').textContent = message;
}
function saved(message) {
  $('saved').textContent = message || 'In game · ' + title(weaponSoundChoice(weapon().id));
  $('apply').disabled = !selected;
  $('apply').textContent = 'Apply to ' + weapon().name;
}
function credit() {
  const box = $('credit'); box.replaceChildren();
  const clip = library.get(selected?.slice(5));
  if (!clip) { box.textContent = style(selected)?.desc || ''; return; }
  box.append(document.createTextNode(clip.title + ' · ' + clip.artist + ' · '));
  const link = (name, url) => { const a = document.createElement('a'); a.textContent = name; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
  box.append(link(clip.source.game, clip.source.homepage));
  if (clip.licenseUrl) box.append(link(clip.license, clip.licenseUrl)); else box.append(clip.license);
  const detail = document.createElement('details'), summary = document.createElement('summary');
  summary.textContent = 'Recording credit';
  detail.append(summary, [clip.copyright, clip.origin, clip.source.file, clip.changes].filter(Boolean).join(' · '));
  if (clip.source.deb_url) detail.append(' · ', link('Source package', clip.source.deb_url));
  box.append(detail);
}
function sounds() {
  const query = $('search').value.trim().toLowerCase(), category = $('category').value;
  const list = $('recording'), options = [];
  const matches = text => !query || text.toLowerCase().includes(query);
  if (['best','styles','all'].includes(category)) for (const s of WEAPON_SOUND_STYLES) {
    if (matches(s.name + ' ' + s.desc)) options.push(new Option(s.name,s.id));
  }
  // Searching the suggested view searches the entire library, including a recording from another family.
  const entries = category === 'best' && !query ? suggestions : library.values();
  for (const entry of entries) {
    if (!['best','all'].includes(category) && entry.category !== category) continue;
    if (matches(entry.title + ' ' + entry.artist + ' ' + entry.source.game + ' ' + entry.tags.join(' ')))
      options.push(new Option(entry.title + ' · ' + entry.source.game,'clip:' + entry.id));
  }
  if (category === 'best' && !query && library.has(selected?.slice(5)) && !options.some(o => o.value === selected))
    options.unshift(new Option(title(selected),selected));
  list.replaceChildren(...options);
  if (options.some(o => o.value === selected)) list.value = selected;
  else list.selectedIndex = options.length ? 0 : -1;
  selected = list.value;
  $('count').textContent = options.length + ' available';
  for (const b of $('levels').children) b.disabled = !selected;
  credit(); saved();
}
function levels() {
  const w = weapon(), element = $('levels'); element.replaceChildren();
  const states = w.group === 'Fusions' ? [] : [[1,'Level 1'],[MAX_WEAPON_LEVEL,'Max · L' + MAX_WEAPON_LEVEL]];
  for (const id of w.forms) states.push([id, w.group === 'Fusions' ? 'Play fusion' : 'Evolved · ' + WEAPONS[id].name]);
  for (const [level, label] of states) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '▶ ' + label; b.dataset.level = level;
    b.onclick = () => play(level, b); element.append(b);
  }
}
function showWeapon() {
  stop('Ready'); const w = weapon();
  selected = weaponSoundChoice(w.id); $('search').value = ''; $('category').value = 'best';
  suggestions = recommendedSounds(w, library.values());
  $('identity').textContent = w.owner ? w.owner + ' signature' : w.group;
  $('playing').textContent = w.name;
  $('stats').textContent = 'Choose a rank to start the eight-second audition.';
  levels(); sounds();
  current = makeWeaponPreview(w.id, w.group === 'Fusions' ? w.id : 1); stopMusic(); current.game.draw(ctx);
}
async function play(level, button) {
  if (!selected) return;
  stop('Loading sound…');
  const token = request, voice = selected;
  try {
    await prepareWeaponAudio(voice);
    if (token !== request) return;
    current = makeWeaponPreview(weapon().id, level);
    cues = 0; stopMusic();
    current.game.onWeaponCue = () => { cues++; };
    setWeaponSoundAudition(voice);
    setVolumes(0, Number($('volume').value) / 100);
    $('playing').textContent = current.weapon.def.name + ' · ' + title(voice);
    $('stats').textContent = 'Listening for the first attack…';
    button.classList.add('playing'); running = true; last = performance.now();
  } catch (error) { if (token === request) { stop('Could not play'); saved(error.message); } }
}
function frame(now) {
  if (running) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    current.game.update(dt); current.game.draw(ctx);
    $('timer').textContent = Math.max(0, PREVIEW_SECONDS - current.game.clock).toFixed(1) + 's remaining';
    $('stats').textContent = cues + (cues === 1 ? ' weapon cue' : ' weapon cues') + ' · ' + (current.weapon.parts ? 'Combined attacks' : current.weapon.evolved ? 'Evolved' : 'Level ' + current.weapon.level);
    if (current.game.clock >= PREVIEW_SECONDS) stop('Preview complete');
  }
  last = now; requestAnimationFrame(frame);
}

$('weapon').onchange = showWeapon;
$('search').oninput = $('category').onchange = () => { stop('Ready'); sounds(); };
$('recording').onchange = () => { stop('Ready'); selected = $('recording').value; credit(); saved(); };
$('apply').onclick = () => {
  const ok = applyWeaponSoundChoice(weapon().id, selected);
  saved(ok ? 'Applied · ' + title(selected) + ' for ' + weapon().name : 'Applied for this tab. Browser storage is unavailable.');
};
$('stop').onclick = () => stop();
$('volume').oninput = () => { $('volume-value').textContent = $('volume').value + '%'; if (running) setVolumes(0, Number($('volume').value) / 100); };
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('storage', e => { if ([null, WEAPON_SOUND_KEY, WEAPON_CHOICES_KEY].includes(e.key)) saved(); });
showWeapon(); requestAnimationFrame(frame);
weaponRecordingCatalog().then(entries => {
  library = entries; suggestions = recommendedSounds(weapon(), library.values());
  if (!running && !requestPastInitialInteraction) selected = weaponSoundChoice(weapon().id);
  sounds();
}).catch(() => saved('Recording library unavailable. The four game styles are ready to play.'));
let requestPastInitialInteraction = false;
document.addEventListener('input', () => { requestPastInitialInteraction = true; }, { once:true });
