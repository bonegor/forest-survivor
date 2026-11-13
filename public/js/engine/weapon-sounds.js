// Original, short procedural alternatives for weapon launches. The current
// recordings remain the default until the player explicitly applies a style.
export const WEAPON_SOUND_KEY = 'fs_weapon_sound_style_v1';
export const WEAPON_SOUND_STYLES = Object.freeze([
  { id: 'current', name: 'Current', desc: 'The game’s existing recorded weapon sounds.' },
  { id: 'tempered', name: 'Tempered', desc: 'Short air cuts, restrained steel and a clear attack.' },
  { id: 'heavy', name: 'Heavy', desc: 'Lower iron weight with a soft, compact impact.' },
  { id: 'arcade', name: 'Arcade', desc: 'Crisp synthetic strikes with a bright, playful edge.' },
]);
export const WEAPON_SOUND_NAMES = new Set(['slash', 'arrow', 'axe', 'dagger', 'fireball', 'zap', 'flask', 'shard', 'blade', 'whoosh', 'wood']);
export const normalizeWeaponSoundStyle = value => WEAPON_SOUND_STYLES.some(s => s.id === value) ? value : 'current';
let selected = 'current';
try { selected = normalizeWeaponSoundStyle(globalThis.localStorage?.getItem(WEAPON_SOUND_KEY)); } catch {}
export const weaponSoundStyle = () => selected;
export function applyWeaponSoundStyle(style) {
  selected = normalizeWeaponSoundStyle(style);
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(WEAPON_SOUND_KEY, selected);
    return true;
  } catch { return false; }
}
globalThis.addEventListener?.('storage', event => {
  if (event.key === WEAPON_SOUND_KEY) selected = normalizeWeaponSoundStyle(event.newValue);
});

// Each family keeps its own pitch and envelope; styles change its materials.
const FAMILY = {
  slash: [650, 2100, 0.11], arrow: [1150, 3500, 0.065], axe: [250, 1500, 0.12],
  dagger: [1450, 4200, 0.05], fireball: [180, 850, 0.18], zap: [1250, 2800, 0.09],
  flask: [1750, 3200, 0.10], shard: [2350, 5000, 0.10], blade: [720, 1750, 0.10],
  whoosh: [155, 650, 0.19], wood: [320, 1200, 0.075],
};

export function weaponSoundRecipe(name, style, opts = {}) {
  if (!FAMILY[name] || !['tempered', 'heavy', 'arcade'].includes(style)) return [];
  const [pitch, air, duration] = FAMILY[name];
  const p = Math.max(0.5, Math.min(1.6, Number.isFinite(opts.pitch) ? opts.pitch : 1));
  const heavy = style === 'heavy', arcade = style === 'arcade';
  const rate = heavy ? 0.69 : arcade ? 1.35 : 1;
  const dur = duration * (heavy ? 1.12 : arcade ? 0.64 : 0.84);
  const layers = [
    { kind: 'noise', f0: air * rate * p, f1: air * (heavy ? 0.38 : arcade ? 0.55 : 0.7),
      filter: 'bandpass', q: heavy ? 0.7 : 1.0, dur, attack: 0.004, vol: heavy ? 0.17 : arcade ? 0.10 : 0.15 },
    { kind: 'tone', type: arcade ? 'square' : 'triangle', f0: pitch * rate * p,
      f1: pitch * (arcade ? 0.48 : 0.38), dur: dur * 0.7, attack: 0.002,
      vol: arcade ? 0.045 : heavy ? 0.065 : 0.035, lowpass: arcade ? 3200 : 2400 },
  ];
  if (heavy || name === 'axe' || name === 'fireball') layers.push({
    kind: 'tone', type: 'sine', f0: (name === 'axe' ? 180 : 125) * rate * p,
    f1: heavy ? 48 : 85, dur: dur * 0.8, attack: 0.003, vol: heavy ? 0.13 : 0.07,
  });
  else layers.push({ kind: 'tone', type: 'sine', f0: pitch * (arcade ? 2 : 1.7) * p,
    f1: pitch * 1.1, at: 0.012, dur: dur * 0.45, attack: 0.002, vol: arcade ? 0.035 : 0.018 });
  // Reserve headroom even for six coherent launches before the live compressor.
  return layers.map(layer => ({ ...layer, vol: layer.vol * 0.6 }));
}

const noiseBuffers = new WeakMap();
function noiseBuffer(ctx) {
  if (noiseBuffers.has(ctx)) return noiseBuffers.get(ctx);
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate), data = buffer.getChannelData(0);
  let seed = 0x61e7fe;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 0x100000000) * 2 - 1;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

// Shared by the live engine and OfflineAudioContext verification. No random
// calls, sample downloads or long tails; dense volleys stay short and readable.
export function scheduleWeaponSound(ctx, destination, name, style, opts = {}, when = ctx.currentTime) {
  const layers = weaponSoundRecipe(name, style, opts);
  if (!layers.length) return false;
  let output = destination;
  if (opts.pan && ctx.createStereoPanner) {
    output = ctx.createStereoPanner();
    output.pan.value = Math.max(-1, Math.min(1, opts.pan));
    output.connect(destination);
  }
  let remaining = layers.length;
  for (const layer of layers) {
    const t = when + (layer.at || 0), end = t + layer.dur;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(layer.vol, t + layer.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.gain.linearRampToValueAtTime(0, end + 0.005);
    gain.connect(output);
    let source, node;
    if (layer.kind === 'noise') {
      source = ctx.createBufferSource(); source.buffer = noiseBuffer(ctx);
      node = ctx.createBiquadFilter(); node.type = layer.filter;
      node.frequency.setValueAtTime(layer.f0, t);
      node.frequency.exponentialRampToValueAtTime(layer.f1, end);
      node.Q.value = layer.q;
      source.connect(node);
    } else {
      source = ctx.createOscillator(); source.type = layer.type;
      source.frequency.setValueAtTime(layer.f0, t);
      source.frequency.exponentialRampToValueAtTime(layer.f1, end);
      node = source;
      if (layer.lowpass) {
        node = ctx.createBiquadFilter(); node.type = 'lowpass'; node.frequency.value = layer.lowpass;
        source.connect(node);
      }
    }
    node.connect(gain);
    source.start(t); source.stop(end + 0.01);
    source.onended = () => {
      source.disconnect(); node.disconnect(); gain.disconnect();
      if (--remaining === 0 && output !== destination) output.disconnect();
    };
  }
  return true;
}
