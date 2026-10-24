import { Game } from '../game/game.js';
import { Player, BASE_SPEED } from '../game/player.js';
import { SPR } from '../engine/sprites.js';
import { bounds, rimRing } from '../engine/pixels.js';
import { clamp } from '../engine/util.js';
import { HEROES, HERO_ORDER, heroLook } from '../data/heroes.js';
import { metaBonuses } from '../shared/profile.js';
import { moveFor } from '../data/difficulty.js';
import { pixelEllipse, portraitBackdrop, mix } from './scenes.js';

// A deterministic twelve-second demonstration. Turns happen while standing, not mid-stride.
export function showcaseAction(time) {
  const t = ((time % 12) + 12) % 12;
  if (t < 1.4) return { kind: 'idle', face: 1, local: t };
  if (t < 3.4) return { kind: 'walk', face: 1, local: t - 1.4 };
  if (t < 4) return { kind: 'idle', face: 1, local: t - 3.4 };
  if (t < 4.8) return { kind: 'attack', face: 1, local: t - 4 };
  if (t < 6) return { kind: 'idle', face: 1, local: t - 4.8 };
  if (t < 8) return { kind: 'walk', face: -1, local: t - 6 };
  if (t < 8.6) return { kind: 'idle', face: -1, local: t - 8 };
  if (t < 9.4) return { kind: 'attack', face: -1, local: t - 8.6 };
  return { kind: 'idle', face: t < 11.5 ? -1 : 1, local: t - 9.4 };
}

const extents = new Map();
export function showcaseBounds(spr) {
  if (extents.has(spr)) return extents.get(spr);
  let left = 0, right = 0, top = 0, bottom = 0;
  for (const frame of spr.frames) {
    const b = bounds(frame.buf);
    if (!b) continue;
    left = Math.min(left, b.x0 - frame.w / 2);
    right = Math.max(right, b.x1 + 1 - frame.w / 2);
    top = Math.min(top, b.y0 - spr.anchorY);
    bottom = Math.max(bottom, b.y1 + 1 - spr.anchorY);
  }
  const result = { radius: Math.max(-left, right), top, bottom };
  extents.set(spr, result);
  return result;
}

export class HeroShowcase {
  constructor(id, profile, settings) {
    // Render-only Game instance: real Player stats, pose selection and drawing, with no world,
    // audio, input, random rolls or save submission. Gameplay never advances from this screen.
    this.game = Object.create(Game.prototype);
    Object.assign(this.game, { settings, gear: profile.gear[id] || {}, skulls: 0, time: 0, cryptTime: 0, move: moveFor('s15', settings.diff), inCrypt: { preview: true } });
    this.game.player = new Player(this.game, id, metaBonuses(profile));
    this.time = 0;
    this.manualAt = null;
  }

  attack() { this.manualAt = this.time; }

  update(dt) {
    this.time += dt;
    const g = this.game, p = g.player, spr = SPR[p.hero.sprite];
    g.time = this.time;
    let action = showcaseAction(this.time);
    if (this.manualAt !== null && this.time - this.manualAt < 0.9) {
      action = { kind: 'attack', face: p.face, local: this.time - this.manualAt };
    }
    this.action = action;
    p.face = action.face;
    p.moving = action.kind === 'walk';
    // Same animation clock as Player.update, including the hero's movement-speed multiplier.
    p.anim += dt * (p.moving ? 7 * clamp(p.moveSpeed / BASE_SPEED, 0.6, 1.6) : 1.6);
    if (action.kind === 'attack' && spr.attack) {
      const from = Math.max(0, (spr.attackRelease ?? Math.floor(spr.attack.length / 2)) - 2);
      p.strike(p.face < 0 ? Math.PI : 0, this.time - action.local + from / spr.attackFps);
    } else p.strikeAt = null;
  }

  draw(ctx, box, locked, settings) {
    const g = this.game, p = g.player, h = p.hero, spr = SPR[h.sprite];
    const { x, y, w, h: height } = box;
    const models = HERO_ORDER.map(id => SPR[heroLook(id, settings.skins).sprite]);
    const radius = Math.max(...models.map(s => showcaseBounds(s).radius));
    const top = Math.min(...models.map(s => showcaseBounds(s).top));
    const bottom = Math.max(...models.map(s => showcaseBounds(s).bottom));
    const scale = Math.max(1, Math.min(7, Math.floor((w - 16) / (radius * 2)), Math.floor((height - 18) / Math.max(1, bottom - top))));
    const foot = y + height - 12;
    const center = Math.round(x + w / 2);
    const camera = { S: scale, x: -center / scale, y: -foot / scale };
    this.geometry = { scale, foot, center, radius, top, bottom };
    ctx.save();
    ctx.beginPath();ctx.rect(x, y, w, height);ctx.clip();
    ctx.drawImage(portraitBackdrop(w, height, mix(h.color, '#15131f', 0.5), locked), x, y);
    // Quiet architectural edges and a broad stone plinth tie the stage to the roster above.
    ctx.fillStyle = mix(h.color, '#0d0b14', locked ? 0.88 : 0.65);
    ctx.fillRect(x, y, 1, height);ctx.fillRect(x + w - 1, y, 1, height);
    pixelEllipse(ctx, center, foot + 2, Math.round(w * 0.43), 9, '#13131f');
    pixelEllipse(ctx, center, foot, Math.round(w * 0.4), 7, mix(h.color, '#262b44', 0.7));
    pixelEllipse(ctx, center, foot, Math.round(w * 0.35), 5, '#191a27');
    pixelEllipse(ctx, center, foot, Math.round(10 * scale), Math.max(2, scale), 'rgba(5,4,10,0.55)');
    if (locked) ctx.globalAlpha = 0.38;
    // Game.drawPlayer is the production renderer: native walk, attack and mirrored frames.
    g.drawPlayer(ctx, camera);
    if (locked) {
      const rect = p._rect;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(rect[4].variant('selection-lock', b => ({ ...b, d: b.d.map(c => c >>> 24 ? 0xff201b29 : 0) }), rect[5]), rect[0], rect[1], rect[2], rect[3]);
    }
    ctx.globalAlpha = 1;
    if (h.line && !locked && p._rect) {
      const [dx, dy, dw, dh, frame, flip] = p._rect;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(frame.variant('showcase-edge', b => rimRing(b, '#d8e2f0', 1), flip), dx - scale, dy - scale, dw + scale * 2, dh + scale * 2);
      ctx.globalAlpha = 1;
    }
    // The Shadow's accepted float has no humanoid attack sheet. Show its signature blades
    // around the hovering body, using the existing native icon and rotation cache.
    if (p.id === 'rogue' && this.action?.kind === 'attack' && !locked) {
      const blade = SPR.i_shadowblade.frames[0];
      for (let i = 0; i < 2; i++) {
        const a = this.action.local * 10 + i * Math.PI;
        const img = blade.rotated(a);
        const bx = center + Math.cos(a) * 15 * scale, by = foot - 17 * scale + Math.sin(a) * 7 * scale;
        ctx.drawImage(img, Math.round(bx - img.width * scale / 2), Math.round(by - img.height * scale / 2), img.width * scale, img.height * scale);
      }
    }
    ctx.restore();
  }
}
