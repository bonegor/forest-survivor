// In-game HUD, drawn into the low-res UI canvas (1 unit = 1 art pixel).

import { drawText, textCanvas, textWidth } from '../engine/font.js';
import { SPR } from '../engine/sprites.js';
import { input } from '../engine/input.js';
import { fmtTime, fmtNum, clamp, makeCanvas, hexToRgb, TAU, ease } from '../engine/util.js';
import { MAX_WEAPON_LEVEL, MAX_WEAPONS, MAX_RELICS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { RANKS } from '../shared/profile.js';
import { NIGHTMARE } from '../data/difficulty.js';
import { view } from '../engine/view.js';

// Beside the clock on a Nightmare (twice the monsters; never Ranked).
const NIGHTMARE_TAG = NIGHTMARE.name.toUpperCase();

const ORB_R = 21, ORB_S = ORB_R * 2 + 6;

// An orb's shape, the same for every orb and every frame: what each pixel of its square is. The
// glass's rims never change, so only the liquid inside is painted again each frame.
const OUT = 0, INK = 1, RIM_LIT = 2, RIM_DARK = 3, LIQUID = 4;
const RIMS = [null, [24, 20, 37], [254, 174, 52], [190, 74, 47]];
const SHAPE = new Uint8Array(ORB_S * ORB_S);
// Over the liquid, the glass: 0 clear, 1 its sheen (lightens), 2 its shaded edge (darkens).
const GLASS = new Uint8Array(ORB_S * ORB_S);
{
  const s = ORB_S, R = ORB_R, cx = s / 2, cy = s / 2;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const p = y * s + x, dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r > R + 2.5) SHAPE[p] = OUT;
      else if (r > R + 1.5) SHAPE[p] = INK;
      else if (r > R + 0.5) SHAPE[p] = dx + dy < 0 ? RIM_LIT : RIM_DARK;
      else if (r > R - 0.5) SHAPE[p] = INK;
      else {
        SHAPE[p] = LIQUID;
        if (Math.hypot(dx + R * 0.38, dy + R * 0.42) < R * 0.28) GLASS[p] = 1;
        else if (r > R - 2.5 && dx + dy > R * 0.6) GLASS[p] = 2;
      }
    }
  }
}
// The liquid's tones, by depth from the surface (an orb's own colours), and the dark above it.
const DEEP = 0, MID = 1, TOP = 2, FOAM = 3, EMPTY = 4;
const EMPTY_RGB = [13, 11, 20];
// This frame's surface height and rising bubbles, column by column (Orb.render).
const WAVE = new Float64Array(ORB_S), BUBBLE = new Uint8Array(ORB_S);

// Liquid orb rendered per-pixel into a small canvas.
class Orb {
  constructor(colors) {
    this.colors = colors.map(hexToRgb);
    const s = ORB_S;
    this.c = makeCanvas(s, s);
    this.g = this.c.getContext('2d');
    this.img = this.g.createImageData(s, s);
    this.shown = 1;
    // Each tone (deep, mid, top, foam, then the empty dark) under clear glass, its sheen and its
    // shaded edge, as red, green, blue; and the same lit by the glow of a full orb, each frame.
    const rgb = [...this.colors, EMPTY_RGB];
    this.tones = new Float64Array(rgb.length * 9);
    rgb.forEach((col, k) => {
      for (let ch = 0; ch < 3; ch++) {
        const c = col[ch], i = k * 9 + ch;
        this.tones[i] = c;
        this.tones[i + 3] = c + (255 - c) * 0.35;
        this.tones[i + 6] = c * 0.75;
      }
    });
    this.lit = new Uint8ClampedArray(this.tones.length);
    // The rims once, and the whole orb opaque: the square outside it stays clear.
    const d = this.img.data;
    for (let p = 0; p < s * s; p++) {
      if (SHAPE[p] === OUT) continue;
      const col = RIMS[SHAPE[p]];
      if (col) {
        d[p * 4] = col[0];
        d[p * 4 + 1] = col[1];
        d[p * 4 + 2] = col[2];
      }
      d[p * 4 + 3] = 255;
    }
  }

  render(frac, t, glow) {
    this.shown += (frac - this.shown) * 0.15;
    const s = ORB_S, R = ORB_R, cy = s / 2;
    const d = this.img.data, tones = this.tones, lit = this.lit;
    const level = cy + R - 2 * R * clamp(this.shown, 0, 1);
    const shine = 40 * (0.5 + 0.5 * Math.sin(t * 8));
    for (let k = 0; k < tones.length; k++) lit[k] = glow ? Math.min(255, tones[k] + shine) : tones[k];
    for (let x = 0; x < s; x++) {
      WAVE[x] = Math.sin(x * 0.45 + t * 3) * 1.1 + Math.sin(x * 0.2 - t * 2) * 0.8;
      BUBBLE[x] = Math.floor((t * 7 + x * 13) % 9) === 0 ? 1 : 0;
    }
    for (let y = 0; y < s; y++) {
      const depth = (y - level) / (2 * R);
      const tone = depth < 0.08 ? FOAM : depth < 0.3 ? TOP : depth < 0.65 ? MID : DEEP;
      // Rising bubbles.
      const bubbles = Math.floor(y + t * 20) % 11 === 0;
      for (let x = 0; x < s; x++) {
        const p = y * s + x;
        if (SHAPE[p] !== LIQUID) continue;
        const k = y + 0.5 > level + WAVE[x] ? (bubbles && BUBBLE[x] ? FOAM : tone) : EMPTY;
        const j = k * 9 + GLASS[p] * 3, i = p * 4;
        d[i] = lit[j];
        d[i + 1] = lit[j + 1];
        d[i + 2] = lit[j + 2];
      }
    }
    this.g.putImageData(this.img, 0, 0);
    return this.c;
  }
}

export class Hud {
  constructor(g) {
    this.g = g;
    this.hp = new Orb(['#5c0f1c', '#a22633', '#e43b44', '#f6757a']);
    this.fury = new Orb(['#2a1438', '#68386c', '#b55088', '#f6757a']);
    this.furyFull = new Orb(['#3b2346', '#b55088', '#f6757a', '#ffffff']);
    this.xpShown = 0;
    this.comboScale = 1;
    this.lastCombo = 0;
  }

  draw(ctx, W, H, t) {
    const g = this.g, p = g.player;
    this.drawXp(ctx, W, p);
    this.drawSlots(ctx, p);
    this.drawTop(ctx, W, t);
    this.drawOrbs(ctx, W, H, p, t);
    this.drawBoss(ctx, W, t);
    this.drawNames(ctx, W, H);
    this.drawIndicators(ctx, W, H, t);
    this.drawCombo(ctx, W, H, t);
    this.drawBanners(ctx, W, H);
    if (g.world.drawMinimap) g.world.drawMinimap(ctx, W, H, g.showMap);
    if (input.device === 'touch') this.drawTouch(ctx, W, H, p);
  }

  drawXp(ctx, W, p) {
    const f = clamp(p.xp / p.xpNext, 0, 1);
    this.xpShown += (f - this.xpShown) * 0.25;
    if (f < this.xpShown) this.xpShown = f;
    ctx.fillStyle = '#181425';
    ctx.fillRect(0, 0, W, 7);
    ctx.fillStyle = '#262b44';
    ctx.fillRect(1, 1, W - 2, 5);
    const w = Math.round((W - 2) * this.xpShown);
    ctx.fillStyle = '#124e89';
    ctx.fillRect(1, 1, w, 5);
    ctx.fillStyle = '#0099db';
    ctx.fillRect(1, 1, w, 3);
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(1, 1, w, 1);
    if (w > 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w - 1, 1, 2, 5);
    }
    drawText(ctx, `LV ${p.level}`, W - 3, 9, { align: 'right', color: ['#ffffff', '#fee761', '#feae34'] });
  }

  drawSlots(ctx, p) {
    let x = 3;
    const y = 9;
    // In a crypt, where he fights by hand with his own weapon alone, the others are dimmed.
    const main = this.g.caveStrike ? this.g.mainWeapon() : null;
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const w = p.weapons[i];
      if (main && w && w !== main) ctx.globalAlpha = 0.3;
      this.slot(ctx, x, y, w ? SPR[w.def.icon] : null, w ? (w.evolved ? -1 : w.level) : 0, MAX_WEAPON_LEVEL, w && w.evolved);
      ctx.globalAlpha = 1;
      x += 18;
    }
    x = 3;
    const ps = [...p.passives.entries()];
    for (let i = 0; i < MAX_RELICS; i++) {
      const e = ps[i];
      this.slot(ctx, x, y + 21, e ? SPR[PASSIVES[e[0]].icon] : null, e ? e[1] : 0, e ? PASSIVES[e[0]].max : 5, false, true);
      x += 18;
    }
    // Shrine buffs.
    let bx = 3;
    for (const [id, b] of p.buffs) {
      const col = SHRINE_COLORS[id] || '#ffffff';
      ctx.fillStyle = '#181425';
      ctx.fillRect(bx, y + 42, 26, 9);
      ctx.fillStyle = col;
      ctx.fillRect(bx + 1, y + 43, Math.round(24 * (b.t / b.max)), 7);
      drawText(ctx, id.slice(0, 4).toUpperCase(), bx + 13, y + 43, { align: 'center', color: '#181425', outline: null });
      bx += 28;
    }
  }

  slot(ctx, x, y, spr, level, max, evolved, small) {
    ctx.fillStyle = '#181425';
    ctx.fillRect(x, y, 17, 17);
    ctx.fillStyle = evolved ? '#be4a2f' : small ? '#262b44' : '#3a4466';
    ctx.fillRect(x + 1, y + 1, 15, 15);
    if (!spr) return;
    ctx.drawImage(spr.frames[0].c, x + 1 - 1, y + 1 - 1 + 1, 16, 16);
    if (level > 0) {
      // Level pips under the icon.
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < level ? (level >= max ? '#feae34' : '#fee761') : '#3a4466';
        ctx.fillRect(x + 1 + i * 2, y + 17, 1, 2);
      }
    } else if (evolved) {
      ctx.fillStyle = '#feae34';
      ctx.fillRect(x + 1, y + 17, 15, 1);
    }
  }

  drawTop(ctx, W, t) {
    const g = this.g;
    const cx = Math.floor(W / 2);
    if (g.mode === 'dungeon') {
      drawText(ctx, `FLOOR ${g.floor} · ${g.floorName.toUpperCase()}`, cx, 10, { align: 'center', color: ['#ffffff', '#c0cbdc', '#8b9bb4'] });
      if (g.objective) drawText(ctx, g.objective, cx, 21, { align: 'center', color: '#feae34' });
      const clock = fmtTime(g.time);
      drawText(ctx, clock, cx, 32, { align: 'center', color: '#8b9bb4' });
      if (g.nightmare) drawText(ctx, NIGHTMARE_TAG, cx + Math.ceil(textWidth(clock) / 2) + 5, 32, { color: '#e43b44' });
    } else if (g.mode === 'ranked') {
      // Endless: the clock counts up; the bar fills toward the next rank.
      const c = textCanvas(fmtTime(g.time), g.bestBeaten ? ['#ffffff', '#9ee562', '#63c74d'] : ['#ffffff', '#ffffff', '#c0cbdc'], '#181425');
      ctx.drawImage(c, cx - c.width, 9, c.width * 2, c.height * 2);
      const cur = RANKS[g.rankIdx], next = RANKS[g.rankIdx + 1];
      const u = next ? clamp((g.time - cur[0] * 60) / ((next[0] - cur[0]) * 60), 0, 1) : 1;
      ctx.fillStyle = '#181425';
      ctx.fillRect(cx - 30, 30, 60, 4);
      ctx.fillStyle = '#feae34';
      ctx.fillRect(cx - 29, 31, Math.round(58 * u), 2);
      drawText(ctx, cur[1].toUpperCase(), cx - 34, 29, { align: 'right', color: '#fee761' });
      if (g.rankedBest) drawText(ctx, `BEST ${fmtTime(Math.max(g.rankedBest, g.bestBeaten ? g.time : 0))}`, cx + 34, 29, { color: g.bestBeaten ? '#63c74d' : '#8b9bb4' });
    } else {
      const remain = Math.max(0, g.duration - g.time);
      const c = textCanvas(fmtTime(remain), remain < 60 ? ['#ffffff', '#fee761', '#feae34'] : ['#ffffff', '#ffffff', '#c0cbdc'], '#181425');
      ctx.drawImage(c, cx - c.width, 9, c.width * 2, c.height * 2);
      const u = g.time / g.duration;
      ctx.fillStyle = '#181425';
      ctx.fillRect(cx - 30, 30, 60, 4);
      ctx.fillStyle = u > 0.9 ? '#f6757a' : '#5a6988';
      ctx.fillRect(cx - 29, 31, Math.round(58 * u), 2);
      // A tiny moon/sun showing the night's progress.
      ctx.fillStyle = u > 0.93 ? '#feae34' : '#c0cbdc';
      ctx.fillRect(cx - 30 + Math.round(58 * u), 29, 2, 6);
      // Where Ranked shows its best time.
      if (g.nightmare) drawText(ctx, NIGHTMARE_TAG, cx + 34, 29, { color: '#e43b44' });
    }
    // In a crypt the clock above stands still.
    if (g.inCrypt) drawText(ctx, `${g.inCrypt.name.toUpperCase()} · TIME STANDS STILL`, cx, 38, { align: 'center', color: '#b55088' });
    // Kills and gold.
    let y = 10;
    const right = W - 4;
    const k = fmtNum(g.kills);
    drawText(ctx, k, right, y + 10, { align: 'right', color: '#c0cbdc' });
    ctx.drawImage(SPR.h_skull.frames[0].c, right - textWidth(k) - 11, y + 9);
    const gd = fmtNum(g.gold);
    drawText(ctx, gd, right, y + 21, { align: 'right', color: '#fee761' });
    ctx.drawImage(SPR.h_coin.frames[0].c, right - textWidth(gd) - 10, y + 21);
  }

  drawOrbs(ctx, W, H, p, t) {
    const g = this.g;
    const hpImg = this.hp.render(p.hp / p.maxHp, t, false);
    const ox = 4, oy = H - hpImg.height - 4;
    ctx.drawImage(hpImg, ox, oy);
    drawText(ctx, `${Math.ceil(p.hp)}`, ox + hpImg.width / 2, oy + hpImg.height / 2 - 4, { align: 'center', color: '#ffffff' });
    const full = p.fury >= 100;
    const fImg = (full ? this.furyFull : this.fury).render(p.fury / 100, t, full);
    const fx = W - fImg.width - 4, fy = H - fImg.height - 4;
    ctx.drawImage(fImg, fx, fy);
    if (p.ult) {
      drawText(ctx, p.hero.ultName.toUpperCase(), fx + fImg.width / 2, fy - 11, { align: 'center', color: '#f6757a' });
    } else if (full) {
      const key = input.device === 'pad' ? 'X' : input.device === 'touch' ? 'TAP' : 'SPACE';
      const blink = Math.floor(t * 3) % 2 === 0;
      drawText(ctx, key, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: blink ? '#ffffff' : '#fee761' });
      drawText(ctx, p.hero.ultName.toUpperCase(), fx + fImg.width / 2, fy - 11, { align: 'center', color: blink ? '#fee761' : '#f6757a' });
    } else {
      drawText(ctx, `${Math.floor(p.fury)}%`, fx + fImg.width / 2, fy + fImg.height / 2 - 4, { align: 'center', color: '#e8b796' });
    }
    if (g.player.revives > 0) ctx.drawImage(SPR.i_revival.frames[0].c, ox + hpImg.width - 6, oy - 8, 12, 12);
  }

  drawBoss(ctx, W, t) {
    const b = this.g.boss;
    if (!b || b.dead) return;
    const w = Math.min(220, W - 120);
    const x = Math.floor(W / 2 - w / 2), y = this.g.mode === 'dungeon' || this.g.inCrypt ? 48 : 40;
    const f = clamp(b.hp / b.maxHp, 0, 1);
    b._shown = b._shown === undefined ? f : b._shown + (f - b._shown) * 0.06;
    ctx.fillStyle = '#181425';
    ctx.fillRect(x - 2, y - 2, w + 4, 10);
    ctx.fillStyle = '#3e2731';
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = '#feae34';
    ctx.fillRect(x, y, Math.round(w * b._shown), 6);
    ctx.fillStyle = '#a22633';
    ctx.fillRect(x, y, Math.round(w * f), 6);
    ctx.fillStyle = '#e43b44';
    ctx.fillRect(x, y, Math.round(w * f), 3);
    ctx.fillStyle = '#f6757a';
    ctx.fillRect(x, y, Math.round(w * f), 1);
    // Phase notches.
    ctx.fillStyle = '#181425';
    for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(x + Math.round(w * q), y, 1, 6);
    const label = b.lord ? `${b.name.toUpperCase()}, LORD OF THE CRYPT` : `${b.def.name.toUpperCase()}, ${b.def.title.toUpperCase()}`;
    drawText(ctx, label, W / 2, y + 9, { align: 'center', color: ['#fee761', '#feae34', '#be4a2f'] });
  }

  drawNames(ctx, W, H) {
    const g = this.g, cam = g.cam;
    // World positions to HUD pixels: the world is drawn smaller than the HUD.
    const z = cam.S / view.S;
    for (const e of g.enemies) {
      if (e.dead || (!e.elite && !e.boss && !e.speech && e.type !== 'thief')) continue;
      const x = (e.x - cam.x) * z, y = (e.y - e.h - 6 - cam.y) * z;
      if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
      if (e.speech) {
        e.speech.t -= 1 / 60;
        if (e.speech.t <= 0) e.speech = null;
        else {
          const tw = textWidth(e.speech.text);
          ctx.fillStyle = '#181425';
          ctx.fillRect(Math.round(x - tw / 2 - 4), Math.round(y - 14), tw + 8, 13);
          ctx.fillStyle = '#ead4aa';
          ctx.fillRect(Math.round(x - tw / 2 - 3), Math.round(y - 13), tw + 6, 11);
          ctx.fillRect(Math.round(x - 1), Math.round(y - 2), 3, 2);
          drawText(ctx, e.speech.text, Math.round(x), Math.round(y - 11), { align: 'center', color: '#3e2731', outline: null });
          continue;
        }
      }
      if (e.elite) {
        drawText(ctx, e.name, Math.round(x), Math.round(y - 9), { align: 'center', color: e.mod ? e.mod.color : '#feae34' });
        const w = 26, f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#181425';
        ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 4);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), Math.round(w * f), 2);
      } else if (e.type === 'thief') {
        const w = 22, f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#181425';
        ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y + 1), w + 2, 4);
        ctx.fillStyle = '#feae34';
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), Math.round(w * f), 2);
      }
    }
    // Player health bar (classic survivors style).
    const p = g.player;
    if (!p.dead) {
      const x = Math.round((p.x - cam.x) * z), y = Math.round((p.y - cam.y + 3) * z);
      const f = clamp(p.hp / p.maxHp, 0, 1);
      ctx.fillStyle = '#181425';
      ctx.fillRect(x - 9, y, 18, 4);
      ctx.fillStyle = '#3e2731';
      ctx.fillRect(x - 8, y + 1, 16, 2);
      ctx.fillStyle = f < 0.3 ? '#ff0044' : '#e43b44';
      ctx.fillRect(x - 8, y + 1, Math.round(16 * f), 2);
    }
  }

  // Arrows at the screen's edge toward what's worth finding off it: the boss, shrines, crypts,
  // chests, the thief and the world's own marker (the stairs, a sleeping lord), in that order.
  drawIndicators(ctx, W, H, t) {
    const g = this.g;
    if (g.boss && !g.boss.dead) this.pointer(ctx, W, H, t, g.boss.x, g.boss.y - 10, '#e43b44');
    for (const s of g.shrines) if (!s.used) this.pointer(ctx, W, H, t, s.x, s.y - 10, SHRINE_COLORS[s.type]);
    for (const d of g.crypts) if (!d.sealed) this.pointer(ctx, W, H, t, d.x, d.y - 12, '#b55088');
    for (const pk of g.pickups) if (pk.kind === 'chest') this.pointer(ctx, W, H, t, pk.x, pk.y, '#feae34');
    for (const e of g.enemies) if (e.type === 'thief' && !e.dead) this.pointer(ctx, W, H, t, e.x, e.y, '#fee761');
    if (g.world.marker) {
      const m = g.world.marker();
      if (m) this.pointer(ctx, W, H, t, m[0], m[1], m[2]);
    }
  }

  // One of those arrows, toward world point (wx, wy), unless that is on screen.
  pointer(ctx, W, H, t, wx, wy, col) {
    const cam = this.g.cam;
    const z = cam.S / view.S;
    // Markers live on a rectangle inset from the HUD bands.
    const top = 52, bottom = H - 30, left = 14, right = W - 14;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const sx = (wx - cam.x) * z, sy = (wy - cam.y) * z;
    if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) return;
    const a = Math.atan2(sy - cy, sx - cx);
    const k = Math.min((right - left) / 2 / Math.abs(Math.cos(a) || 1e-6), (bottom - top) / 2 / Math.abs(Math.sin(a) || 1e-6));
    const x = cx + Math.cos(a) * k, y = cy + Math.sin(a) * k;
    const bob = Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.translate(Math.round(x + Math.cos(a) * bob), Math.round(y + Math.sin(a) * bob));
    ctx.rotate(a);
    ctx.fillStyle = '#181425';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-3, 3);
    ctx.fill();
    ctx.restore();
  }

  drawCombo(ctx, W, H, t) {
    const g = this.g;
    if (g.combo < 10) {
      this.lastCombo = g.combo;
      return;
    }
    if (g.combo !== this.lastCombo) {
      this.comboScale = 1.5;
      this.lastCombo = g.combo;
    }
    this.comboScale += (1 - this.comboScale) * 0.2;
    const tier = g.combo >= 500 ? 4 : g.combo >= 200 ? 3 : g.combo >= 100 ? 2 : g.combo >= 50 ? 1 : 0;
    const colors = [
      ['#ffffff', '#c0cbdc'],
      ['#fee761', '#feae34'],
      ['#feae34', '#f77622'],
      ['#f6757a', '#e43b44'],
      ['#ffffff', '#b55088'],
    ][tier];
    const c = textCanvas(`${g.combo}`, colors, '#181425', null, 'bold');
    const s = 2 * this.comboScale;
    const x = W - 6 - c.width * s, y = Math.round(H * 0.42 - (c.height * s) / 2);
    ctx.globalAlpha = clamp(g.comboT * 2, 0, 1);
    ctx.drawImage(c, Math.round(x), y, Math.round(c.width * s), Math.round(c.height * s));
    const label = ['COMBO', 'CARNAGE!', 'MASSACRE!', 'ANNIHILATION!', 'GODLIKE!'][tier];
    drawText(ctx, label, W - 6, y + Math.round(c.height * s) + 1, { align: 'right', color: colors[1] });
    // Timer sliver.
    ctx.fillStyle = colors[1];
    ctx.fillRect(W - 6 - Math.round(40 * clamp(g.comboT / 2, 0, 1)), y - 3, Math.round(40 * clamp(g.comboT / 2, 0, 1)), 1);
    ctx.globalAlpha = 1;
  }

  drawBanners(ctx, W, H) {
    const g = this.g;
    let y = Math.round(H * 0.22);
    for (const b of g.banners) {
      const u = b.t / b.dur;
      const a = u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1;
      const pop = u < 0.12 ? 1.6 - ease.outCubic(u / 0.12) * 0.6 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      const c = textCanvas(b.title, [ '#ffffff', b.color, b.color ], '#181425');
      const s = 2 * pop;
      ctx.drawImage(c, Math.round(W / 2 - (c.width * s) / 2), Math.round(y - (c.height * (s - 2)) / 2), Math.round(c.width * s), Math.round(c.height * s));
      if (b.sub) drawText(ctx, b.sub, Math.round(W / 2), y + 21, { align: 'center', color: '#c0cbdc' });
      y += b.sub ? 34 : 24;
    }
    ctx.globalAlpha = 1;
  }

  drawTouch(ctx, W, H, p) {
    const s = input.stick;
    if (s.active) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#c0cbdc';
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, 22, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy), k = Math.min(1, 22 / (l || 1));
      ctx.arc(s.ox + dx * k, s.oy + dy * k, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Pause button.
    ctx.fillStyle = '#181425';
    ctx.fillRect(W / 2 - 9, H - 18, 18, 14);
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(W / 2 - 4, H - 15, 3, 8);
    ctx.fillRect(W / 2 + 1, H - 15, 3, 8);
  }
}

export const SHRINE_COLORS = {
  fury: '#e43b44',
  haste: '#2ce8f5',
  fortune: '#feae34',
  wisdom: '#8f5bb0',
  protection: '#63c74d',
};

export const SHRINE_INFO = {
  fury: ['Shrine of Fury', 'Damage +60% for 30s'],
  haste: ['Shrine of Haste', 'Speed and attack speed up for 30s'],
  fortune: ['Shrine of Fortune', 'Double gold for 30s'],
  wisdom: ['Shrine of Wisdom', 'Experience +50% for 30s'],
  protection: ['Shrine of Protection', 'Half damage taken, regeneration for 30s'],
};
