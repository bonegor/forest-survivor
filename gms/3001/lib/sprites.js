// Sprite sets from the scouted catalogues (sprites/heroes, sprites/monsters) in one shape, for
// the Sprite Lab (gms/3001).
//
// A set: { id, kind: 'hero' | 'monster', name, group, pack, packName, artist, artistUrl,
// license, licenseUrl, licFamily, credit, source, rating, restricted, height, faces, anims,
// previews, still, boss }. anims[name] is one view { fps, once, frames, w, h, ax, ay, top,
// cx0, cx1 } or a view per direction { fps, once, dirs: { down, up, left, right } }; each
// frame is [x, y, w, h, sheet] (a sheet's url, or a canvas already holding the frame, as
// in a redrawn set: lib/redraw.js). The anchor (ax, ay) is the feet; top..ay and cx0..cx1
// bound the body. `restricted` marks sets that can't be used commercially, or whose
// licence isn't stated.

export const views = (anim) => (anim.dirs ? Object.values(anim.dirs) : [anim]);

// The game's knight (public/js/art/knight-plumed.js) stands 30 sprite pixels tall, plume to
// feet, in its tallest resting frame.
export const KNIGHT_H = 30;

// How tall a set should stand in the game, in game pixels: every hero as tall as the knight,
// every monster by what it is, against him as a man (a rat 8, a wolf 14, a skeleton 23, an
// ogre 34, a dragon 40; the game's own monsters, drawn for a smaller hero, are smaller still).
// Packs disagree about scale (tile sets draw a dragon as big as a man), so a monster's kind,
// from its name, tags and family, decides. Creatures are matched before callings, so a
// skeleton warrior is a skeleton and a vampire bat a bat; "giant", "dire", "king" and the
// like make a creature bigger, and a boss is bigger again.
const KINDS = [
  [/werewolf|lycanthrope/, 27],
  [/lizard ?(man|men|folk|monk|warrior|knight|mage|priest|shaman|archer|soldier|guard|king)|naga|merfolk|frog ?man|angel|seraph|succubus|incubus/, 26],
  [/dragon(?!fl)|wyrm|wyvern|\bdrakes?\b|hydra|behemoth/, 40],
  [/\bdino|saurus|\brex\b|triceratops|raptor/, 26],
  [/treant|\bent\b|colossus|titan/, 36],
  [/ogre|troll|ettin|cyclops|minotaur|golem|yeti/, 34],
  [/horse|centaur|unicorn|elephant|mammoth/, 30],
  [/demon|devil|balrog|fiend/, 28],
  [/elemental/, 26],
  [/\bbears?\b|gorilla/, 24],
  [/skeleton|zombie|ghoul|mummy|undead|revenant|wight|corpse/, 23],
  [/ghost|wraith|spectre|specter|spirit|phantom|banshee|shade|reaper/, 22],
  [/\borcs?\b|orcish|uruk|hobgoblin/, 26],
  [/goblin|kobold|gremlin|gnome/, 17],
  [/\bimps?\b|pixie|fairy|faerie|homunculus|wisp/, 14],
  [/crocodile|alligator|panther|tiger|lion|lynx|leopard/, 16],
  [/wolf|wolves|hound|\bdogs?\b|jackal|fox|hyena|coyote|quadra?uped|boar|\bpigs?\b|deer|goat|\bcats?\b/, 14],
  [/\beyes?\b|beholder|floating|\borbs?\b/, 14],
  [/mimic|chest|crate|barrel|\burns?\b|\bpots?\b|coffin/, 13],
  [/fish|shark|piranha|squid|octopus/, 13],
  [/mushroom|fungus|fungi|shroom|plant|flower|vine|cactus|mandrake/, 14],
  [/slime|ooze|blob|jelly|cube|pudding/, 11],
  [/\bbats?\b|bird|avian|crow|raven|\bowls?\b|hawk|eagle|chicken|duck|harpy/, 11],
  [/spider|scorpion|beetle|\bants?\b|\bbees?\b|wasp|insect|\bbugs?\b|\bfly\b|flies|dragonfl|butterfl|moth|\bticks?\b|centipede|crab|snail|slug|larva|mosquito/, 10],
  [/snake|serpent|\bworms?\b|\beels?\b|leech|reptile|lizard|gecko|salamander|newt/, 10],
  [/\brats?\b|mouse|mice|rodent|pest|vermin|\bfrogs?\b|\btoads?\b|rabbit|squirrel/, 8],
  [/knight|warrior|soldier|guard|paladin|gladiator|samurai|\bking\b|\bqueen\b/, 27, 'calling'],
  [/vampire|lich|necromancer|cultist|wizard|witch|sorcer|\bmage\b|priest|monk|bandit|thief|rogue|archer|hunter|human|humanoid|\bman\b|\bmen\b|woman|\belf\b|elves|dwarf|gnoll|player|hero|adventurer|villager|peasant|merchant/, 26, 'calling'],
  [/\bgiants?\b/, 34],
];
const FAMILY_H = { undead: 23, beasts: 14, demons: 28, dragons: 40, slimes: 11, elementals: 26, humans: 26, insects: 10, plants: 14, aquatic: 13, aberrations: 18, props: 13, goblinoids: 18, mimics: 13, other: 18 };
// Which line of the size table a name matches (the same for "Ghoul" and "Skeleton"), or -1.
export const kindIndex = (name) => KINDS.findIndex(([re]) => re.test(String(name).toLowerCase()));

// How tall a set stands in the game, and why: { h, why }.
export function gameSize(set) {
  if (set.kind !== 'monster') return { h: KNIGHT_H, why: 'a hero: as tall as the knight' };
  // Its own name first; then its family; the scout's tags (which say what it could stand in
  // for, not what it is) only for the catch-all family.
  const name = set.name.toLowerCase(), tags = (set.tags || []).join(' ').toLowerCase();
  let kind = KINDS.find(([re]) => re.test(name)), from = 'name';
  if (!kind && (!set.family || set.family === 'other')) {
    kind = KINDS.find(([re]) => re.test(tags));
    from = 'tags';
  }
  let h = kind ? kind[1] : FAMILY_H[set.family] || 18;
  const why = [kind ? `"${(from === 'name' ? name : tags).match(kind[0])[0].trim()}" in its ${from}: ${h}` : FAMILY_H[set.family] ? `its family, ${set.family}: ${h}` : `nothing to go by: ${h}`];
  const big = kind && !kind[2] && kind[1] < 34 && /\b(giant|huge|great|dire|elder|king|queen|lord|brute|alpha)\b/.exec(name);
  if (big) {
    h = Math.min(40, h * 1.6);
    why.push(`"${big[1]}": ${Math.round(h)}`);
  }
  // A boss stands at least a head taller than the knight.
  if (set.boss) {
    h = Math.max(KNIGHT_H + 4, Math.round(h * 1.3));
    why.push(`a boss: ${h}`);
  }
  return { h: Math.round(h), why: why.join(', ') };
}
export function gameHeight(set) {
  if (!set.gameH) set.gameH = gameSize(set).h;
  return set.gameH;
}
// The factor that brings a set to its game height, measured from its own sheet (the
// catalogues' heights are only a first guess until it has loaded).
export function gameFit(set) {
  const b = visibleBox(set);
  const h = b ? b.h : set.height || (set.anims ? metrics(set).h : 0);
  return h > 0 ? Math.min(8, Math.max(0.2, gameHeight(set) / h)) : 1;
}

// The pixels a set really covers in its resting animation, facing right: the size of its
// tallest and widest frame, read from the sheet once that has loaded (null until then).
export function visibleBox(set) {
  const name = defaultAnim(set), anim = name && set.anims[name];
  if (!anim) return null;
  const { v } = pickView(set, anim, 'right');
  return v && v.frames.length ? viewBox(v) : null;
}

// Bits of a neighbouring frame in a frame's cell (a sheet cut a little off its grid): small
// clumps of pixels that touch the edge of the cell, apart from the body. d holds the cell's
// RGBA bytes; returns a mask (1 for a stray pixel), or null if there are none.
export function strayPixels(d, w, h) {
  const n = w * h, lab = new Int32Array(n).fill(-1), sizes = [], edge = [], stack = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (lab[i] >= 0 || d[i * 4 + 3] < 24) continue;
    const id = sizes.length;
    let size = 0, touches = false;
    lab[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop(), x = j % w, y = (j - x) / w;
      size++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, k = yy * w + xx;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || lab[k] >= 0 || d[k * 4 + 3] < 24) continue;
          lab[k] = id;
          stack.push(k);
        }
      }
    }
    sizes.push(size);
    edge.push(touches);
    total += size;
  }
  if (sizes.length < 2) return null;
  const biggest = Math.max(...sizes), stray = sizes.map((s, id) => edge[id] && s < biggest && s <= Math.max(3, total * 0.15));
  if (!stray.some(Boolean)) return null;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (lab[i] >= 0 && stray[lab[i]]) mask[i] = 1;
  return mask;
}

// What one view's frames really cover, in frame pixels: the union of their opaque pixels
// (x0..x1, y0..y1) and the size of the tallest and widest single frame (w, h), leaving out
// bits of neighbouring frames. Packs that draw a small creature in the middle of a big cell
// leave empty rows under its feet; this is how a sprite is stood on its lowest pixel instead.
const boxes = new WeakMap();
let scratch = null;
export function viewBox(v) {
  if (boxes.has(v)) return boxes.get(v);
  scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  let w = 0, h = 0, X0 = Infinity, X1 = -1, Y0 = Infinity, Y1 = -1;
  const centers = [];
  for (const [sx, sy, sw, sh, src] of v.frames) {
    const im = drawable(src);
    if (!isReady(im)) return null;
    if (scratch.canvas.width < sw || scratch.canvas.height < sh) {
      scratch.canvas.width = Math.max(scratch.canvas.width, sw);
      scratch.canvas.height = Math.max(scratch.canvas.height, sh);
    }
    scratch.clearRect(0, 0, sw, sh);
    scratch.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
    const d = scratch.getImageData(0, 0, sw, sh).data, stray = strayPixels(d, sw, sh);
    let x0 = sw, x1 = -1, y0 = sh, y1 = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] < 24 || (stray && stray[y * sw + x])) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    centers.push(y1 >= 0 ? (x0 + x1 + 1) / 2 : null);
    if (y1 >= 0) {
      w = Math.max(w, x1 - x0 + 1);
      h = Math.max(h, y1 - y0 + 1);
      X0 = Math.min(X0, x0);
      X1 = Math.max(X1, x1);
      Y0 = Math.min(Y0, y0);
      Y1 = Math.max(Y1, y1);
    }
  }
  // The body's usual centre (the median frame's), and whether frames jump about their cells:
  // a sheet cut on the wrong grid puts the creature in a different place in each frame.
  const known = centers.filter((c) => c != null).sort((a, b) => a - b);
  const cx = known.length ? known[Math.floor(known.length / 2)] : v.w / 2;
  const jitter = known.length > 1 && known[known.length - 1] - known[0] > Math.max(4, w * 0.75);
  // The frames with anything in them: a sheet cut on the wrong grid leaves some empty.
  const live = centers.map((c, i) => (c == null ? -1 : i)).filter((i) => i >= 0);
  const box = h ? { w, h, x0: X0, x1: X1, y0: Y0, y1: Y1, cx, centers, jitter, live } : { w: 8, h: 8, x0: 0, x1: v.w - 1, y0: 0, y1: v.ay - 1, cx: v.w / 2, centers, jitter: false, live };
  boxes.set(v, box);
  return box;
}
// The frame of a view to show at time t, passing over frames left empty.
export function pickFrame(anim, v, t, once) {
  const b = viewBox(v);
  if (!b || !b.live.length || b.live.length === v.frames.length) return frameIndex(anim, v.frames.length, t, once);
  return b.live[frameIndex(anim, b.live.length, t, once)];
}
// A view with nothing at all in it (once its sheet has loaded).
export function emptyView(v) {
  const b = viewBox(v);
  return !!b && !b.live.length;
}
// For a view whose frames jump about their cells, how far to move frame i (sprite pixels,
// before mirroring) so its body lines up with the usual centre; 0 for a steady view.
export function frameNudge(v, i, flip) {
  const b = viewBox(v);
  if (!b || !b.jitter || b.centers[i] == null) return 0;
  const d = b.cx - b.centers[i];
  return flip ? -d : d;
}
// How far to move a set's anchor, in sprite pixels, so its resting body is centred on x when
// facing `dir`. Some packs draw a creature off to one side of its cell; the resting pose is
// used for every animation, so a swung sword doesn't push the body aside.
export function bodyShift(set, dir) {
  const name = defaultAnim(set), anim = name && set.anims[name];
  if (!anim) return 0;
  const { v, flip } = pickView(set, anim, dir);
  const b = v && viewBox(v);
  if (!b) return 0;
  const off = b.cx - v.ax;
  return flip ? off : -off;
}
// How far below its anchor a view's lowest pixel sits, in frame pixels: shift by this to stand it on the anchor's row.
export function standGap(v) {
  const b = viewBox(v);
  return b ? v.ay - b.y1 - 1 : 0;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------- heroes --

export const CLASS_ORDER = ['knight', 'ranger', 'mage', 'rogue', 'necro'];

// The hero scout's catalogue: playable sets with animations, and sets known only by preview images.
export async function loadHeroes(base) {
  const cat = await getJson(base + 'catalog.json');
  const names = new Map((cat.classes || []).map((c) => [c.id, c.name]));
  const sets = [];
  for (const s of cat.sets || []) {
    let anims = null;
    if (s.anims && Object.keys(s.anims).length) {
      anims = {};
      const fix = (v) => ({ ...v, frames: v.frames.map((f) => [f[0], f[1], f[2], f[3], base + v.src]) });
      for (const [k, a] of Object.entries(s.anims)) {
        anims[k] = a.dirs
          ? { fps: a.fps, once: a.once, dirs: Object.fromEntries(Object.entries(a.dirs).map(([d, v]) => [d, fix(v)])) }
          : { fps: a.fps, once: a.once, ...fix(a) };
      }
    }
    const set = {
      id: s.id, kind: 'hero', cls: s.cls, group: names.get(s.cls) || s.cls, name: s.char || s.id,
      pack: s.pack, packName: s.packName, artist: s.artist, artistUrl: s.artistUrl, license: s.license, licenseUrl: s.licenseUrl,
      licFamily: s.family, credit: s.credit, source: s.source, rating: s.rating || 0, restricted: s.family === 'restricted',
      status: s.status, faces: s.faces || 'right', dir: s.dir, frame: s.frame, fit: s.fit, anims,
      previews: (s.previews || []).map((p) => (/^https?:/.test(p) ? p : base + p)), still: false, boss: false,
    };
    set.height = anims ? s.charH || metrics(set).h : null;
    sets.push(set);
  }
  return { sets, groups: CLASS_ORDER.filter((id) => names.has(id)).map((id) => names.get(id)) };
}

// -------------------------------------------------------------- monsters --

// The monster scout's catalogue is compact: entries name a pack (artist and licence live in
// cat.packs), and each animation lists frames as [x, y, sheet?] cells of one size, drawn
// from cat.sheets, with the feet at the bottom centre of the cell and the body inside the
// box c = [x, y, w, h] measured from the feet. Directions come as separate animations
// ('walk-down', 'attack-left'...); each such family becomes one animation with a view per
// direction ('side' counts as right, and a plain one of the same name faces the camera).
const DIR = /^(.+?)[-_ ](down|up|left|right|side)$/;
const LIC_FAMILY = { cc0: 'cc0', by: 'attribution', sa: 'share-alike', other: 'other', restricted: 'restricted' };

export async function loadMonsters(base, { still = true } = {}) {
  const cat = await getJson(base + 'catalog.json');
  const packs = new Map((cat.packs || []).map((p) => [p.id, p]));
  const sets = [], counts = new Map(), used = new Set();
  for (const e of cat.entries || []) {
    if ((e.still && !still) || !e.a) continue;
    const p = packs.get(e.p) || {};
    const plain = {}, dirs = {};
    for (const [k, A] of Object.entries(e.a)) {
      if (!A.f || !A.f.length) continue;
      const c = A.c || e.c || [-A.w / 2, -A.h, A.w, A.h];
      const ax = Math.floor(A.w / 2), ay = A.h;
      const view = {
        frames: A.f.map((f) => [f[0], f[1], A.w, A.h, base + cat.sheets[f[2] ?? A.s]]),
        w: A.w, h: A.h, ax, ay, top: ay + c[1], cx0: ax + c[0], cx1: ax + c[0] + c[2],
      };
      const m = DIR.exec(k);
      if (m) {
        const d = (dirs[m[1]] ??= { fps: A.fps || 8, once: !!A.once, dirs: {} });
        d.dirs[m[2] === 'side' ? 'right' : m[2]] ??= view;
      } else plain[k] = { fps: A.fps || 8, once: !!A.once, ...view };
    }
    const anims = { ...plain };
    for (const [k, d] of Object.entries(dirs)) {
      if (plain[k]) {
        const { fps, once, ...view } = plain[k];
        d.dirs[d.dirs.down ? (d.dirs.right ? 'up' : 'right') : 'down'] ??= view;
      }
      anims[k] = d;
    }
    if (!Object.keys(anims).length) continue;
    const fam = String(e.fam || 'other'), group = cap(fam);
    counts.set(group, (counts.get(group) || 0) + 1);
    used.add(e.p);
    sets.push({
      id: e.id, kind: 'monster', name: e.n || e.id, group, pack: e.p, packName: p.name, artist: p.artist, license: p.lic,
      licenseUrl: p.licUrl, licFamily: LIC_FAMILY[p.lf] || p.lf, credit: p.credit, source: p.src, rating: e.r || 0,
      restricted: p.lf === 'restricted', faces: e.face === 'L' ? 'left' : 'right', anims, previews: [], family: fam, tags: e.tags || [],
      still: !!e.still, boss: !!e.boss, size: e.sz, height: e.vis ? e.vis[1] : e.c ? e.c[3] : null, fit: e.fit,
    });
  }
  // Packs known only by their preview images (manual downloads, restricted ones) get a card each.
  for (const p of cat.packs || []) {
    if (used.has(p.id) || !(p.previews || []).length) continue;
    const group = cap(String((p.fams && p.fams[0]) || 'other'));
    counts.set(group, counts.get(group) || 0);
    sets.push({
      id: 'pack:' + p.id, kind: 'monster', name: p.name, group, pack: p.id, packName: p.name, artist: p.artist, license: p.lic,
      licenseUrl: p.licUrl, licFamily: LIC_FAMILY[p.lf] || p.lf, credit: p.credit, source: p.src, rating: p.r || 0,
      restricted: p.lf === 'restricted', faces: 'right', anims: null, previews: p.previews.map((u) => (/^https?:/.test(u) ? u : base + u)),
      still: false, boss: false, height: null, fit: p.notes,
    });
  }
  // Families by size, the catch-all last.
  const groups = [...counts.keys()].sort((a, b) => (a === 'Other') - (b === 'Other') || counts.get(b) - counts.get(a));
  return { sets, groups };
}

// ------------------------------------------------------------ animation --

// Animation names vary from pack to pack; these are tried in order.
export const NAMES = {
  idle: ['idle', 'stand', 'breathe', 'hover', 'fly', 'still', 'walk', 'move', 'run'],
  move: ['walk', 'run', 'move', 'fly', 'hover', 'crawl', 'hop', 'idle', 'still'],
  hurt: ['hurt', 'hit', 'damage', 'takehit', 'take hit', 'damaged'],
  death: ['death', 'die', 'dead', 'dying', 'defeat'],
  attack: ['attack', 'attack1', 'attack 1', 'slash', 'bite', 'claw', 'smash', 'punch', 'thrust', 'cast', 'shoot', 'attack2', 'attack 2', 'special'],
};
const squash = (s) => s.toLowerCase().replace(/[\s_-]/g, '');
export function findAnim(set, names) {
  if (!set.anims) return null;
  const keys = Object.keys(set.anims);
  for (const n of names) {
    const k = keys.find((k) => k.toLowerCase() === n) || keys.find((k) => squash(k) === squash(n));
    if (k) return k;
  }
  return null;
}
// The animation it rests in: an idle by name; else one named like a resting pose; else the
// first that isn't something happening (a death, a blow...). Once its sheet is in, not one
// whose frames are all empty (a sheet cut on the wrong grid) if any other has frames.
const BUSY = /death|die|dead|dying|hurt|hit|damage|attack|cast|shoot|special|slash|thrust|bite|claw|smash|punch|spell/i;
function blank(set, name) {
  const { v } = pickView(set, set.anims[name], 'right');
  const b = v && v.frames.length ? viewBox(v) : null;
  return !!b && !b.live.length;
}
export function defaultAnim(set) {
  if (!set.anims) return null;
  const keys = Object.keys(set.anims);
  const pick = findAnim(set, NAMES.idle) || keys.find((k) => /idle|rest|stand|static|still|breath/i.test(k)) || keys.find((k) => !BUSY.test(k)) || keys[0];
  if (!pick || !blank(set, pick)) return pick;
  return [findAnim(set, NAMES.move), ...keys.filter((k) => !BUSY.test(k)), ...keys].find((k) => k && !blank(set, k)) || pick;
}

// As in Vampire Survivors, a sprite only ever faces left or right: walking up or down keeps
// the way it last faced. A set drawn in several directions shows its side view (mirrored
// for the other side); one with only front or back views shows those, mirrored to face
// the way it goes.
export function pickView(set, anim, dir) {
  const left = dir === 'left';
  if (!anim.dirs) return { v: anim, flip: left !== (set.faces === 'left') };
  const d = anim.dirs, want = left ? 'left' : 'right', other = left ? 'right' : 'left';
  if (d[want]) return { v: d[want], flip: false };
  if (d[other]) return { v: d[other], flip: true };
  return { v: d.down || d.up || Object.values(d)[0], flip: left };
}
export const restDir = () => 'right';

export function animLen(set, name) {
  const a = name && set.anims && set.anims[name];
  return a ? views(a)[0].frames.length / (a.fps || 8) : 0;
}
export function frameIndex(anim, n, t, once) {
  const i = Math.floor(t * (anim.fps || 8));
  return once ? Math.min(n - 1, i) : ((i % n) + n) % n;
}

// Body size in sprite pixels, from the first view of its resting animation.
export function metrics(set) {
  const a = set.anims && set.anims[defaultAnim(set)];
  if (!a) return { w: 16, h: set.height || 16 };
  const v = views(a)[0];
  const w = v.cx1 > v.cx0 ? v.cx1 - v.cx0 : v.w * 0.6;
  const h = v.ay > v.top ? v.ay - v.top : v.h * 0.8;
  return { w: Math.max(4, w), h: Math.max(4, h) };
}
// How far a set reaches above, left and right of its feet across all its animations.
export function extent(set) {
  let up = 4, left = 4, right = 4, down = 1;
  for (const a of Object.values(set.anims || {})) {
    for (const v of views(a)) {
      up = Math.max(up, v.ay - Math.max(0, v.top));
      left = Math.max(left, v.ax - Math.max(0, v.cx0));
      right = Math.max(right, Math.min(v.w, v.cx1) - v.ax);
      down = Math.max(down, v.h - v.ay);
    }
  }
  return { up, left, right, down: Math.min(down, 4) };
}

const imgs = new Map();
export function img(src) {
  let im = imgs.get(src);
  if (!im) {
    im = new Image();
    im.src = src;
    imgs.set(src, im);
  }
  return im;
}
export function preload(set) {
  for (const a of Object.values(set.anims || {})) for (const v of views(a)) for (const f of v.frames) if (typeof f[4] === 'string') img(f[4]);
}
// Lets a sheet go; asking for it again loads it again.
export const unload = (src) => imgs.delete(src);
// What to draw for a frame's sheet: the loaded image for a url, or the canvas itself.
export const drawable = (src) => (typeof src === 'string' ? img(src) : src);
export const isReady = (im) => !!im && (!(im instanceof HTMLImageElement) || (im.complete && im.naturalWidth > 0));

// One frame, feet at (x, y) in canvas pixels, `k` canvas pixels per sprite pixel; `stand`
// centres the resting body on x and puts the animation's lowest pixel on y, rather than
// going by its cell's anchor.
export function drawFrame(ctx, set, name, dir, t, once, x, y, k, alpha = 1, stand = false) {
  const anim = set.anims && set.anims[name];
  if (!anim) return false;
  const { v, flip } = pickView(set, anim, dir);
  if (!v || !v.frames.length || emptyView(v)) return false;
  if (stand) {
    x += bodyShift(set, dir) * k;
    y += standGap(v) * k;
  }
  const fi = pickFrame(anim, v, t, once);
  const [sx, sy, sw, sh, src] = v.frames[fi];
  const im = drawable(src);
  if (!isReady(im)) return false;
  if (stand) x += frameNudge(v, fi, flip) * k;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, sx, sy, sw, sh, Math.round(-v.ax * k), Math.round(y - v.ay * k), sw * k, sh * k);
  } else ctx.drawImage(im, sx, sy, sw, sh, Math.round(x - v.ax * k), Math.round(y - v.ay * k), sw * k, sh * k);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- scale --

// The game's own sizing (public/js/engine/view.js): the canvas fills the window at the
// device's pixel ratio (at most 3, and at most 2560 x 1600 pixels in all), the HUD scale is
// the short side over 300, rounded, and the world is drawn at 0.8 of that, never under 1.
// Returns screen pixels per sprite pixel, as the game shows sprites in a window this size.
export function gameScale(cssW = window.innerWidth, cssH = window.innerHeight) {
  let dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cssW * cssH * dpr * dpr > 2560 * 1600) dpr = Math.sqrt((2560 * 1600) / (cssW * cssH));
  const S = Math.max(1, Math.round(Math.min(Math.round(cssW * dpr), Math.round(cssH * dpr)) / 300));
  const device = Math.max(1, S * 0.8);
  return { device, css: device / dpr };
}

// Licence families, for badges and filters.
export const LICENCE = {
  cc0: { name: 'Public domain (CC0)', color: '#63c74d' },
  attribution: { name: 'Credit required', color: '#2ce8f5' },
  'share-alike': { name: 'Share-alike', color: '#b55088' },
  other: { name: 'Custom free licence', color: '#feae34' },
  restricted: { name: 'Not for commercial use / unclear', color: '#e43b44' },
};
