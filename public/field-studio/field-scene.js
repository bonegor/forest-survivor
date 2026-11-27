import { Game } from '../js/game/game.js';
import { BASE_SPEED } from '../js/game/player.js';
import { Pickup } from '../js/game/pickups.js';
import { view } from '../js/engine/view.js';
import { SPR } from '../js/engine/sprites.js';
import { defaultProfile, metaBonuses } from '../js/shared/profile.js';
import { proposalSprite } from './runtime.js';
import { applyGemFamily } from './art/crystals.js';

export const FIELD_W = 196, FIELD_H = 80;
export const TIER_VALUES = [1, 5, 25, 100];

export class FieldScene {
  constructor(hero, map, gems) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = FIELD_W;
    this.canvas.height = FIELD_H;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    Object.assign(view, { W: FIELD_W, H: FIELD_H, S: 1, zoom: 1,
      pxW: FIELD_W, pxH: FIELD_H, canvas: this.canvas, ctx: this.ctx });
    this.game = new Game({ hero, map, mode: 's15', diff: 'easy', seed: 731, crypts: false,
      settings: { numbers: false, shake: false, weather: false, softFlash: true }, meta: metaBonuses(defaultProfile()) });
    const g = this.game, p = g.player;
    this.hero = hero;
    this.gems = gems;
    this.variants = new Map();
    this.original = SPR[p.hero.sprite];
    p.flash = p.invuln = 0;
    p.x += 52;
    p.y += 52;
    g.syncCam();
    g.snapCam();
    g.cam.y -= 7;
    if (gems) {
      p.y -= 5;
      g.pickups = TIER_VALUES.map((value, i) =>
        new Pickup(g, 'gem', p.x + (i - 1.5) * 31, p.y + 14, value, { pop: false, t: 0 }));
    }
    // Crypt strikes use the same field renderer. Only the pose lookup needs crypt context.
    g.placePlayer = (camera) => {
      const was = g.inCrypt;
      if (this.motion === 'strike' || this.motion === 'walk-strike') g.inCrypt = { preview: true };
      try { Game.prototype.placePlayer.call(g, camera); }
      finally { g.inCrypt = was; }
    };
  }

  advance(dt, motion, facing) {
    const g = this.game, p = g.player;
    if (motion !== this.motion) {
      this.motionStart = g.time;
      p.anim = p.idleAnim = 0;
    }
    this.motion = motion;
    p.face = facing;
    p.dead = motion === 'fall';
    p.moving = motion === 'walk' || motion === 'walk-strike';
    g.time += dt;
    if (dt > 0) p.advanceAnimation(dt, p.moving ? p.moveSpeed * dt : 0);
    else p.walking = p.moving;
    const age = g.time - this.motionStart;
    if ((motion === 'strike' || motion === 'walk-strike') && this.original.attack?.length) {
      const period = this.original.attack.length / this.original.attackFps + 0.26;
      p.strike(facing < 0 ? Math.PI : 0, g.time - age % period);
    } else p.strikeAt = null;
    if (p.dead) g.deathT = age % (g.deathTiming.end + 1);
    for (const pickup of g.pickups) pickup.t = g.time;
  }

  stepDuration() {
    const sprite = this.original;
    if (this.motion === 'walk') return BASE_SPEED / (7 * 1.4 * sprite.motionRate * this.game.player.moveSpeed);
    if (this.motion === 'strike' || this.motion === 'walk-strike') return 1 / sprite.attackFps;
    if (this.motion === 'fall') return 1 / 24;
    return 1 / (1.6 * sprite.idleRate);
  }

  paint(target, look, groundMark = false) {
    const g = this.game, key = g.player.hero.sprite;
    if (this.gems) applyGemFamily(g, look);
    else {
      if (!this.variants.has(look)) this.variants.set(look, proposalSprite(this.hero, look, this.original));
      SPR[key] = this.variants.get(look);
    }
    try {
      // Each comparison keeps its own hit pose and facing through the death flash.
      if (g.player.dead && this.motion === 'fall') g.placePlayer(g.cam);
      g.draw(this.ctx);
      if (g.player.dead && this.motion === 'fall') g.hud.drawDepartingSoul(this.ctx);
      g.hud.drawNames(this.ctx, FIELD_W, FIELD_H);
      const ctx = target.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const x = (FIELD_W - target.width) >> 1, y = (FIELD_H - target.height) >> 1;
      ctx.drawImage(this.canvas, x, y, target.width, target.height, 0, 0, target.width, target.height);
      if (groundMark) {
        const gx = Math.round((g.player.x - g.cam.x) * g.cam.S) - x;
        const gy = Math.round((g.player.y - g.cam.y) * g.cam.S) - y;
        ctx.fillStyle = '#84e8d8';
        ctx.fillRect(gx - 16, gy, 5, 1);
        ctx.fillRect(gx + 12, gy, 5, 1);
        ctx.fillRect(gx, gy, 1, 2);
      }
    } finally {
      if (!this.gems) SPR[key] = this.original;
    }
  }
}
