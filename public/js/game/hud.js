// In-game HUD, drawn into the low-res UI canvas (1 unit = 1 art pixel).

import { drawText, textCanvas, textWidth } from '../engine/font.js';
import { SPR } from '../engine/sprites.js';
import { input } from '../engine/input.js';
import { fmtTime, fmtNum, clamp, makeCanvas, hexToRgb, TAU, ease } from '../engine/util.js';
import { MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { RANKS } from '../shared/profile.js';

const ORB_R = 21;

// Liquid orb rendered per-pixel into a small canvas.
class Orb {
  constructor(colors) {
    this.colors = colors.map(hexToRgb);
    const s = ORB_R * 2 + 6;
    this.c = makeCanvas(s, s);
    this.g = this.c.getContext('2d');
    this.img = this.g.createImageData(s, s);
    this.shown = 1;
  }

  render(frac, t, glow) {
    this.shown += (frac - this.shown) * 0.15;
    const s = this.c.width, R = ORB_R, cx = s / 2, cy = s / 2;
    const d = this.img.data;
    const [deep, mid, top, foam] = this.colors;
    const level = cy + R - 2 * R * clamp(this.shown, 0, 1);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const r = Math.hypot(dx, dy);
        let col = null, a = 255;
        if (r > R + 2.5) {
          d[i + 3] = 0;
          continue;
        } else if (r > R + 1.5) col = [24, 20, 37];
        else if (r > R + 0.5) col = (dx + dy < 0 ? [254, 174, 52] : [190, 74, 47]);
        else if (r > R - 0.5) col = [24, 20, 37];
        else {
          const wave = Math.sin(x * 0.45 + t * 3) * 1.1 + Math.sin(x * 0.2 - t * 2) * 0.8;
          if (y + 0.5 > level + wave) {
            const depth = (y - level) / (2 * R);
            col = depth < 0.08 ? foam : depth < 0.3 ? top : depth < 0.65 ? mid : deep;
            // Rising bubbles.
            const bx = Math.floor((t * 7 + x * 13) % 9);
            if (bx === 0 && (Math.floor(y + t * 20) % 11) === 0) col = foam;
          } else col = [13, 11, 20];
          // Glass sheen.
          const sh = Math.hypot(dx + R * 0.38, dy + R * 0.42);
          if (sh < R * 0.28) col = col.map((c) => c + (255 - c) * 0.35);
          else if (r > R - 2.5 && dx + dy > R * 0.6) col = col.map((c) => c * 0.75);
          if (glow) col = col.map((c) => Math.min(255, c + 40 * (0.5 + 0.5 * Math.sin(t * 8))));
        }
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = a;
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
    for (let i = 0; i < 6; i++) {
      const w = p.weapons[i];
      this.slot(ctx, x, y, w ? SPR[w.def.icon] : null, w ? (w.evolved ? -1 : w.level) : 0, MAX_WEAPON_LEVEL, w && w.evolved);
      x += 18;
    }
    x = 3;
    const ps = [...p.passives.entries()];
    for (let i = 0; i < 6; i++) {
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
      drawText(ctx, fmtTime(g.time), cx, 32, { align: 'center', color: '#8b9bb4' });
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
    }
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
    if (g.player.revivals > 0) ctx.drawImage(SPR.i_revival.frames[0].c, ox + hpImg.width - 6, oy - 8, 12, 12);
  }

  drawBoss(ctx, W, t) {
    const b = this.g.boss;
    if (!b || b.dead) return;
    const w = Math.min(220, W - 120);
    const x = Math.floor(W / 2 - w / 2), y = this.g.mode === 'dungeon' ? 44 : 40;
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
    drawText(ctx, `${b.def.name.toUpperCase()}, ${b.def.title.toUpperCase()}`, W / 2, y + 9, { align: 'center', color: ['#fee761', '#feae34', '#be4a2f'] });
  }

  drawNames(ctx, W, H) {
    const g = this.g, cam = g.cam;
    for (const e of g.enemies) {
      if (e.dead || (!e.elite && !e.boss && !e.speech && e.type !== 'thief')) continue;
      const x = e.x - cam.x, y = e.y - e.h - 6 - cam.y;
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
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y + 3);
      const f = clamp(p.hp / p.maxHp, 0, 1);
      ctx.fillStyle = '#181425';
      ctx.fillRect(x - 9, y, 18, 4);
      ctx.fillStyle = '#3e2731';
      ctx.fillRect(x - 8, y + 1, 16, 2);
      ctx.fillStyle = f < 0.3 ? '#ff0044' : '#e43b44';
      ctx.fillRect(x - 8, y + 1, Math.round(16 * f), 2);
    }
  }

  drawIndicators(ctx, W, H, t) {
    const g = this.g, cam = g.cam;
    const targets = [];
    if (g.boss && !g.boss.dead) targets.push([g.boss.x, g.boss.y - 10, '#e43b44', 'skull']);
    for (const s of g.shrines) if (!s.used) targets.push([s.x, s.y - 10, SHRINE_COLORS[s.type], 'shrine']);
    for (const pk of g.pickups) if (pk.kind === 'chest') targets.push([pk.x, pk.y, '#feae34', 'chest']);
    for (const e of g.enemies) if (e.type === 'thief' && !e.dead) targets.push([e.x, e.y, '#fee761', 'thief']);
    if (g.world.marker) {
      const m = g.world.marker();
      if (m) targets.push(m);
    }
    // Markers live on a rectangle inset from the HUD bands.
    const top = 52, bottom = H - 30, left = 14, right = W - 14;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    for (const [wx, wy, col] of targets) {
      const sx = wx - cam.x, sy = wy - cam.y;
      if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) continue;
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
