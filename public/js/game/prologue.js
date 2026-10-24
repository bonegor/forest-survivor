// A short, distance-based journey before the first night. Uses the real Knight, sword,
// enemies and pickups, with its own road and encounters instead of the night's director.
import { Game } from './game.js';
import { Forest } from './forest.js';
import { layoutChunk, CHUNK } from './darkwood.js';
import { BASE_SPEED } from './player.js';
import { HEROES } from '../data/heroes.js';
import { defaultProfile, metaBonuses } from '../shared/profile.js';
import { clamp, damp, hash2 } from '../engine/util.js';
import { playMusic } from '../engine/audio.js';

export const ROAD = {
  seconds: 40,
  length: BASE_SPEED * HEROES.knight.stats.speed * 40,
  left: -64,
  halfWidth: 21,
  guideAfter: 8,
  encounters: [[200, 2], [650, 2], [1150, 3], [1675, 3], [2210, 3], [2750, 3]],
  bends: [[0, 0], [0.14, 0], [0.27, -90], [0.42, -90], [0.58, 95], [0.75, 95], [0.9, 0], [1, 0]],
};

// A few soft turns, always heading east. The camps keep a straight approach.
export function roadY(x) {
  const u = clamp(x / ROAD.length, 0, 1);
  for (let i = 1; i < ROAD.bends.length; i++) {
    const [b, by] = ROAD.bends[i];
    if (u > b) continue;
    const [a, ay] = ROAD.bends[i - 1], t = (u - a) / (b - a);
    return ay + (by - ay) * t * t * (3 - 2 * t);
  }
  return 0;
}

export function needsPrologue(profile, settings) {
  return !settings.prologueDone && profile.runs === 0;
}

function roadScene() {
  const xs = [], ys = [], hw = [], av = [];
  for (let x = -64; x <= ROAD.length + 300; x += 4) {
    xs.push(x); ys.push(roadY(x)); hw.push(ROAD.halfWidth); av.push(0);
  }
  const camp = (x) => ({
    clear: { x, y: 0, r: 100 },
    props: [
      { n: 'campfire', x: x - 20, y: 32, anim: 8, light: ['fire', 60] },
      { n: 'stump', x: x + 8, y: 48 },
      { n: 'stump', x: x - 48, y: 42 },
      { n: 'crate', x: x - 39, y: -32 },
      { n: 'barrel', x: x - 53, y: -29 },
    ],
  });
  return { paths: [{ kind: 'road', xs, ys, hw, av }], places: [camp(0), camp(ROAD.length)], landmarks: [] };
}

export class DayForest extends Forest {
  constructor(g) {
    super(g, 7361);
    this.daylight = true;
    this.scene = roadScene();
    this.start = { x: 0, y: 0 };
  }

  layout(cx, cy) {
    const lay = layoutChunk(cx, cy, this.scene);
    lay.daylight = true;
    // The trees behind camp make the western boundary visible even after a detour.
    if (cx === -1) {
      for (let y = cy * CHUNK; y < (cy + 1) * CHUNK; y += 28) {
        lay.props.push({ n: hash2(0, y, 3) > 0.5 ? 'oak1' : 'oak2', x: -88 - Math.round(hash2(1, y, 4) * 16), y });
      }
    }
    return lay;
  }

  syncShrines() {} // No crypts or shrines on this road.
  ambient() { return [255, 250, 232]; }
  drawOverlay() {} // Clear daylight, without the night's drifting fog.

  collide(e) {
    super.collide(e);
    if (e === this.g.player) e.x = Math.max(ROAD.left, e.x);
  }

  drawGroundProps(ctx, cam) {
    // Canvas-native tents, in the same small pixel scale as the forest's props.
    for (const x of [0, ROAD.length]) {
      if (Math.abs(x - this.g.player.x) > cam.W) continue;
      ctx.save();
      ctx.translate(Math.round((x - 26 - cam.x) * cam.S), Math.round((-52 - cam.y) * cam.S));
      ctx.scale(cam.S, cam.S);
      ctx.fillStyle = 'rgba(25,39,25,0.25)';
      ctx.fillRect(-24, 1, 49, 9);
      ctx.fillStyle = '#393b30';
      ctx.beginPath(); ctx.moveTo(-25, 5); ctx.lineTo(-7, -25); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c7b887';
      ctx.beginPath(); ctx.moveTo(-7, -25); ctx.lineTo(14, -25); ctx.lineTo(33, 5); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#998b63';
      ctx.beginPath(); ctx.moveTo(-25, 5); ctx.lineTo(-7, -25); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#33382f';
      ctx.beginPath(); ctx.moveTo(-16, 5); ctx.lineTo(-7, -15); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5e4d35';
      ctx.fillRect(-8, -27, 2, 34);
      ctx.restore();
    }
  }
}

export class Prologue extends Game {
  constructor(options = {}) {
    super({ ...options, hero: 'knight', mode: 's15', diff: 'easy', move: 1, meta: metaBonuses(defaultProfile()),
      gear: undefined, open: { weapons: [], relics: [], ult: false }, hints: false,
      records: {}, unlocks: null, crypts: false, nightmare: false });
    this.prologue = true;
    this.duration = Infinity;
    this.world = new DayForest(this);
    this.player.x = 0;
    this.player.y = 0;
    this.banners.length = 0;
    this.encounters = new Set();
    this.guideIdle = 0;
    this.guideAlpha = 0;
    this.reached = false;
    this.spawner = { update: () => this.spawnRoad() };
    this.snapCam();
    playMusic('title');
  }

  get phase() { return 0; }
  get progress() { return clamp(this.player.x / ROAD.length, 0, 1); }
  checkRecords() {}
  heroMilestone() {}
  relocate() {} // Rats left behind stay behind; the road has a finite set of encounters.
  dropGem() {} // No experience, level-up screens or evolution rewards in the prologue.

  addPickup(kind, ...args) {
    if (kind === 'coin' || kind === 'potion') return super.addPickup(kind, ...args);
  }

  spawnRoad() {
    const p = this.player;
    if (Math.abs(p.y - roadY(p.x)) > 100) return;
    ROAD.encounters.forEach(([x, count], i) => {
      if (this.encounters.has(i) || p.x < x - 100) return;
      this.encounters.add(i);
      for (let j = 0; j < count; j++) {
        const sx = x + j * 19;
        const e = this.spawnEnemy('rat', sx, roadY(sx) + (j % 2 ? -1 : 1) * (9 + j * 5), { instant: true, spdMul: 0.55, dmgMul: 0.15 });
        e.hp = e.maxHp = 8;
        e.xp = 0;
      }
    });
  }

  killEnemy(e, options = {}) {
    const killed = !e.dead && !this.player.dead;
    super.killEnemy(e, options);
    if (!killed || !e.dead) return;
    this.addPickup('coin', e.x, e.y, 3);
    if (this.kills % 3 === 0 || this.player.hp < this.player.maxHp * 0.7) this.addPickup('potion', e.x + 8, e.y, 1);
  }

  update(dt) {
    const wasPlaying = this.state === 'play', x = this.player.x;
    super.update(dt);
    if (!wasPlaying || this.state !== 'play' || this.reached) return;
    const p = this.player;
    const headingRight = p.x - x > dt * 4 && Math.abs(p.y - roadY(p.x)) < 70 && p.x < ROAD.length;
    this.guideIdle = headingRight ? 0 : this.guideIdle + dt;
    this.guideAlpha = damp(this.guideAlpha, this.guideIdle >= ROAD.guideAfter ? 1 : 0, 2, dt);
    if (p.x >= ROAD.length && Math.abs(p.y - roadY(ROAD.length)) <= 42) this.reached = true;
  }

  guideTarget() {
    const p = this.player;
    const x = clamp(p.x + (Math.abs(p.y - roadY(p.x)) > 70 ? 25 : 130), 0, ROAD.length);
    return { x, y: roadY(x) };
  }
}
