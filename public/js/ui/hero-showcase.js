import { Game, strikeClip } from '../game/game.js';
import { Player } from '../game/player.js';
import { SPR } from '../engine/sprites.js';
import { bounds, rimRing } from '../engine/pixels.js';
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
// Menu pixels per world pixel for a hero on the menus: a whole one, as the title's campfire
// figure. Menus are drawn on the W×H UI canvas, one pixel per art pixel, and blown up by
// view.S, so a smaller blit there (the gameplay-sized 0.8 this was) dropped whole rows and
// columns of the art, a different set each frame.
export function heroMenuScale() {
  return 1;
}

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
  const density = spr.hires || 1;
  const result = { radius: Math.max(-left, right) / density, top: top / density, bottom: bottom / density };
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
    // The real player's distance-based gait, with travel simulated on the plinth.
    p.advanceAnimation(dt, p.moving ? p.moveSpeed * dt : 0);
    const clip = strikeClip(spr);
    if (action.kind === 'attack' && clip) {
      p.strike(p.face < 0 ? Math.PI : 0, this.time - action.local);
    } else p.strikeAt = null;
  }

  draw(ctx, box, locked) {
    const g = this.game, p = g.player, h = p.hero, spr = SPR[h.sprite];
    const { x, y, w, h: height } = box;
    const { radius, top, bottom } = showcaseBounds(spr);
    // Whole menu pixels (heroMenuScale); every hero fits the hero screen's stage at 1:1, and
    // only a box too small for that shrinks him.
    const scale = Math.min(heroMenuScale(), Math.max(1, w - 8) / (radius * 2),
      Math.max(1, height - 14) / Math.max(1, bottom - top));
    const foot = y + Math.round(Math.min(height - 8 - bottom * scale, Math.max(height * .80, 4 - top * scale)));
    const center = Math.round(x + w / 2);
    const camera = { S: scale, x: -center / scale, y: -foot / scale };
    this.geometry = { scale, foot, center, radius, top, bottom };
    ctx.save();
    ctx.beginPath();ctx.rect(x, y, w, height);ctx.clip();
    ctx.drawImage(portraitBackdrop(w, height, mix(h.color, '#15131f', 0.5), locked), x, y);
    // Keep the dais in proportion to the figure as the panel widens.
    ctx.fillStyle = mix(h.color, '#0d0b14', locked ? 0.88 : 0.65);
    ctx.fillRect(x, y, 1, height);ctx.fillRect(x + w - 1, y, 1, height);
    const plinth = Math.round(Math.min(34 * scale, w * .42));
    pixelEllipse(ctx, center, foot + 2, plinth, 6, '#13131f');
    pixelEllipse(ctx, center, foot, plinth, 5, mix(h.color, '#262b44', 0.7));
    pixelEllipse(ctx, center, foot, Math.round(plinth * .88), 4, '#191a27');
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
      // Traced round the art you see (alpha 128 and up): round the sheet's faint, all but invisible
      // fringe it stood a pixel off his cloak, a broken wire beside him.
      const edge = frame.variant('showcase-edge', b => rimRing({ ...b, d: b.d.map(c => c >>> 24 >= 128 ? c : 0) }, '#d8e2f0', spr.hires || 1), flip);
      ctx.drawImage(edge, dx - scale, dy - scale, dw + scale * 2, dh + scale * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
