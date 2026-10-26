// Heroes picked in the Sprite Lab, as baked from its sheets by tools/bake-heroes.mjs: the
// frames exactly as picked, packed as palette indices (public/assets/heroes), with the
// animation lists and rates the lab plays them at. Their outlines are in the frames already.
import ARCHER from '../../assets/heroes/archer.js';
import MAGE from '../../assets/heroes/mage.js';
import NECROMANCER from '../../assets/heroes/necromancer.js';
import ROGUE from '../../assets/heroes/rogue.js';
import PALADIN from '../../assets/heroes/paladin.js';
import DRUID from '../../assets/heroes/druid.js';
import BERSERKER from '../../assets/heroes/berserker.js';
import WITCHHUNTER from '../../assets/heroes/witchhunter.js';
import KNIGHT_B from '../../assets/heroes/knight_b.js';
import KNIGHT_C from '../../assets/heroes/knight_c.js';
import KNIGHT_D from '../../assets/heroes/knight_d.js';
import KNIGHT_E from '../../assets/heroes/knight_e.js';
import KNIGHT_F from '../../assets/heroes/knight_f.js';
import KNIGHT_G from '../../assets/heroes/knight_g.js';
import ARCHER_B from '../../assets/heroes/archer_b.js';
import ARCHER_C from '../../assets/heroes/archer_c.js';

function decode(data) {
  // Palette indices are one byte per pixel, or two (little-endian) past 256 colours.
  const n = data.indexBytes || 1;
  return data.frames.map((encoded) => {
    const bytes = atob(encoded), d = new Uint32Array(data.w * data.h);
    for (let i = 0; i < d.length; i++) d[i] = data.palette[n === 2 ? bytes.charCodeAt(2 * i) | (bytes.charCodeAt(2 * i + 1) << 8) : bytes.charCodeAt(i)];
    return { w: data.w, h: data.h, d };
  });
}

// The in-game sprite. What glows in the dark: the colours baked with it (data.glow), or
// emissive, palette keys as the art's own source sets them.
function sheet(data, more = {}) {
  let frames;
  return {
    gen: () => (frames ??= decode(data)),
    idle: data.idle, walk: data.walk, attack: data.attack, attackFps: data.attackFps,
    motionRate: data.motionRate, idleRate: data.idleRate, anchorY: data.anchorY,
    fitW: data.fitW, fitH: data.fitH, selfBob: data.selfBob, outline: false,
    // A ranger's bow (game/ranger-animation.js): the frame the arrow leaves on, her shots on the move.
    ...(data.attackRelease != null ? { attackRelease: data.attackRelease, attackWalk: data.attackWalk } : {}),
    ...(data.glow ? { glow: data.glow } : {}),
    ...more,
  };
}

// The menu pose: the idle loop at its own pace, cut down to the hero. Drawn at two thirds of
// the old poses' scale (hires), as these are painted at about half again their detail.
function pose(def) {
  let frames;
  const gen = () => {
    if (frames) return frames;
    const all = def.gen(), list = def.idle.map((i) => all[i]);
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const b of list) {
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          if (!(b.d[y * b.w + x] >>> 24)) continue;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x);
          y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    return (frames = list.map((b) => {
      const d = new Uint32Array(w * h);
      for (let y = 0; y < h; y++) d.set(b.d.subarray((y + y0) * b.w + x0, (y + y0) * b.w + x0 + w), y * w);
      return { w, h, d };
    }));
  };
  return { gen, fps: def.idleRate * 1.6, hires: 1.5, emissive: def.emissive, glow: def.glow, outline: false };
}

// Picked on the hero review page on 15 October 2026 and animated in the lab
// (gms/3001/sprites/lab/src/animated-oct15), in the colours saved there:
// Lyra as Silverleaf, her moonstone glowing; Eldrin as the Grand Archmage, his fire glowing;
// Morvath as Soulflame, crowned, his eyes and the crown's gem glowing.
export const ARCHER_SHEET = sheet(ARCHER);
export const MAGE_SHEET = sheet(MAGE);
export const NECROMANCER_SHEET = sheet(NECROMANCER);
// Kael as the Eclipse Wraith, in the colours of its tweak.
export const ROGUE_SHEET = sheet(ROGUE);

export const ARCHER_POSE = pose(ARCHER_SHEET);
export const MAGE_POSE = pose(MAGE_SHEET);
export const NECROMANCER_POSE = pose(NECROMANCER_SHEET);
export const ROGUE_POSE = pose(ROGUE_SHEET);

// The four of 20 October 2026, drawn in the lab (src/newheroes-oct20): Dame Seraphine the
// Paladin, Bramwyn the Druid, Ulfric the Berserker and Mercy Crane the Witch Hunter.
export const PALADIN_SHEET = sheet(PALADIN);
export const DRUID_SHEET = sheet(DRUID);
export const BERSERKER_SHEET = sheet(BERSERKER);
export const WITCHHUNTER_SHEET = sheet(WITCHHUNTER);
export const PALADIN_POSE = pose(PALADIN_SHEET);
export const DRUID_POSE = pose(DRUID_SHEET);
export const BERSERKER_POSE = pose(BERSERKER_SHEET);
export const WITCHHUNTER_POSE = pose(WITCHHUNTER_SHEET);
// The Knight's second look (22 October 2026), drawn with claude-pxl (src/knight-b): a skin.
export const KNIGHT_B_SHEET = sheet(KNIGHT_B);
export const KNIGHT_B_POSE = pose(KNIGHT_B_SHEET);
// And five more (src/knight-c .. knight-g).
export const KNIGHT_C_SHEET = sheet(KNIGHT_C);
export const KNIGHT_C_POSE = pose(KNIGHT_C_SHEET);
export const KNIGHT_D_SHEET = sheet(KNIGHT_D);
export const KNIGHT_D_POSE = pose(KNIGHT_D_SHEET);
export const KNIGHT_E_SHEET = sheet(KNIGHT_E);
export const KNIGHT_E_POSE = pose(KNIGHT_E_SHEET);
export const KNIGHT_F_SHEET = sheet(KNIGHT_F);
export const KNIGHT_F_POSE = pose(KNIGHT_F_SHEET);
export const KNIGHT_G_SHEET = sheet(KNIGHT_G);
export const KNIGHT_G_POSE = pose(KNIGHT_G_SHEET);
// The Ranger's looks in the plumed Knight's style (26 October 2026, src/ranger-knightstyle): A drawn
// in code, B with claude-pxl. Each carries her bow's release and shots on the move, as hers do.
export const ARCHER_B_SHEET = sheet(ARCHER_B);
export const ARCHER_B_POSE = pose(ARCHER_B_SHEET);
export const ARCHER_C_SHEET = sheet(ARCHER_C);
export const ARCHER_C_POSE = pose(ARCHER_C_SHEET);
