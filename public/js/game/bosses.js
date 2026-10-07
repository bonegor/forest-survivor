// Boss behaviour. Each AI returns [dirX, dirY, speedMultiplier] per frame and
// schedules telegraphed attacks so every hit can be dodged.

import { sfx } from '../engine/audio.js';
import { rand, TAU, pick } from '../engine/util.js';
import { EnemyShot } from './projectiles.js';
import { Telegraph, Explosion, Ring } from './effects.js';
import { PC, P } from './particles.js';

const distP = (e) => Math.hypot(e.g.player.x - e.x, e.g.player.y - e.y);
const angP = (e) => Math.atan2(e.g.player.y - e.y, e.g.player.x - e.x);
const toward = (e) => e.g.world.steer(e, e.g.player);

function say(e, text, dur = 2.2) {
  e.speech = { text, t: dur };
}

function blast(g, x, y, r, dmg, style = 'dark') {
  g.effects.push(new Explosion(g, x, y, r, style));
  g.effects.push(new Ring(g, x, y, 4, r * 1.1, 0.4, style === 'fire' ? '#fee761' : '#f6757a'));
  const p = g.player;
  if (Math.hypot(p.x - x, p.y - y) < r + p.r) p.hurt(dmg);
  g.shake(0.45);
  sfx('slam');
}

function shoot(g, e, ang, kind, speed, dmg, opts) {
  g.eshots.push(new EnemyShot(g, e.x, e.y - 10, ang, speed, dmg * g.dmgScale, kind, opts));
}

function ring(g, e, n, kind, speed, dmg, off = 0, opts) {
  for (let i = 0; i < n; i++) shoot(g, e, off + (i / n) * TAU, kind, speed, dmg, opts);
  sfx('enemyshot');
}

function fan(g, e, n, spread, kind, speed, dmg, opts) {
  const a0 = angP(e);
  for (let i = 0; i < n; i++) shoot(g, e, a0 + (i - (n - 1) / 2) * spread, kind, speed, dmg, opts);
  sfx('enemyshot');
}

function strike(g, x, y, r, dmg, delay, style = 'fire') {
  g.effects.push(new Telegraph(g, { shape: 'circle', x, y, r, dur: delay, onDone: () => blast(g, x, y, r, dmg, style) }));
}

function cast(e, t) {
  e.state = 'cast';
  e.stateT = t;
}

function casting(e, dt) {
  if (e.state !== 'cast') return false;
  e.stateT -= dt;
  if (e.stateT <= 0) e.state = 'move';
  return true;
}

export const BOSS_AI = {
  boneking(e, dt) {
    const g = e.g;
    e.phase = e.hp / e.maxHp < 0.5 ? 1 : 0;
    if (casting(e, dt)) return [0, 0, 0];
    e.cdT -= dt;
    e.cd2 -= dt;
    e.cd3 -= dt;
    if (e.cdT <= 0 && distP(e) < 160) {
      e.cdT = e.phase ? 4.6 : 6.4;
      cast(e, 1.15);
      const R = 64;
      g.effects.push(new Telegraph(g, {
        shape: 'circle', x: e.x, y: e.y, r: R, dur: 1, follow: e,
        onDone: () => {
          if (e.dead) return;
          blast(g, e.x, e.y, R, 24, 'dark');
          ring(g, e, e.phase ? 14 : 10, 'bone', 85, 11, rand(TAU));
        },
      }));
      return [0, 0, 0];
    }
    if (e.cd2 <= 0) {
      e.cd2 = e.phase ? 9 : 12.5;
      cast(e, 0.9);
      if (Math.random() < 0.6) say(e, pick(['RISE, MY SERVANTS!', 'KNEEL BEFORE YOUR KING!', 'THE DEAD OBEY ME!']));
      g.summonRing('skeleton', e.phase ? 10 : 7, 72, { elite: false });
      sfx('boss');
      return [0, 0, 0];
    }
    if (e.phase && e.cd3 <= 0) {
      e.cd3 = 3;
      fan(g, e, 5, 0.22, 'bone', 115, 12);
    }
    const v = toward(e);
    return [v[0], v[1], e.phase ? 1.3 : 1];
  },

  butcher(e, dt) {
    const g = e.g;
    e.phase = e.hp / e.maxHp < 0.3 ? 1 : 0;
    if (e.phase && !e.data.enraged) {
      e.data.enraged = true;
      say(e, 'NOW I AM ANGRY!');
      sfx('boss');
    }
    e.cdT -= dt;
    e.cd2 -= dt;
    switch (e.state) {
      case 'aim':
        e.stateT -= dt;
        e.shake = 1;
        if (e.stateT <= 0) {
          e.state = 'dash';
          e.stateT = 0.7;
          e.shake = 0;
          sfx('charge');
        }
        return [e.lockX, e.lockY, 0];
      case 'dash':
        e.stateT -= dt;
        if (Math.random() < 0.8) g.particles.emit(e.x + rand(-6, 6), e.y, 0, -e.lockX * 40, -e.lockY * 40, 10, 0.4, 2, PC.a, P.FADE, 2);
        if (e.stateT <= 0) {
          e.state = 'recover';
          e.stateT = e.phase ? 0.3 : 0.6;
          g.shake(0.25);
        }
        return [e.lockX, e.lockY, 290 / e.spd];
      case 'recover':
        e.stateT -= dt;
        if (e.stateT <= 0) e.state = 'move';
        return [0, 0, 0];
      case 'cast':
        casting(e, dt);
        return [0, 0, 0];
      default:
        break;
    }
    const d = distP(e);
    if (e.cdT <= 0 && d < 220) {
      e.cdT = e.phase ? 2.8 : 4.6;
      e.state = 'aim';
      e.stateT = e.phase ? 0.55 : 0.8;
      const a = angP(e);
      e.lockX = Math.cos(a);
      e.lockY = Math.sin(a);
      e.face = e.lockX < 0 ? -1 : 1;
      g.effects.push(new Telegraph(g, { shape: 'line', x: e.x, y: e.y, ang: a, len: 200, w: 26, dur: e.stateT }));
      if (Math.random() < 0.35) say(e, pick(['FRESH MEAT!', 'COME HERE!', 'MEAT FOR THE HOOKS!']), 1.6);
      return [0, 0, 0];
    }
    if (e.cd2 <= 0 && d < 70) {
      e.cd2 = 5;
      cast(e, 0.95);
      g.effects.push(new Telegraph(g, {
        shape: 'circle', x: e.x, y: e.y, r: 54, dur: 0.85, follow: e,
        onDone: () => {
          if (!e.dead) blast(g, e.x, e.y, 54, 30, 'blood');
        },
      }));
      return [0, 0, 0];
    }
    const v = toward(e);
    return [v[0], v[1], e.phase ? 1.45 : 1];
  },

  lich(e, dt) {
    const g = e.g, p = g.player;
    e.phase = e.hp / e.maxHp < 0.5 ? 1 : 0;
    if (casting(e, dt)) return [0, 0, 0];
    e.cdT -= dt;
    e.cd2 -= dt;
    e.cd3 -= dt;
    e.data.off = (e.data.off || 0) + dt * 0.6;
    if (e.cdT <= 0) {
      e.cdT = e.phase ? 2 : 2.7;
      ring(g, e, e.phase ? 16 : 12, 'skullbolt', 58, 13, e.data.off);
      if (e.phase) fan(g, e, 3, 0.3, 'skullbolt', 70, 13, { homing: 0.9, life: 5 });
      cast(e, 0.35);
      return [0, 0, 0];
    }
    // Blinks away when cornered, but not right after a blink: melee gets a window.
    if (e.cd2 <= 0 || (distP(e) < 45 && e.cd2 < 3.5)) {
      e.cd2 = rand(6, 8);
      // Blink away in a puff of grave-light.
      g.particles.burst(e.x, e.y - 12, 0, 24, [PC.l, PC.L, PC.e], 90, 0.6, 2, P.GLOW | P.FADE, { vz: 40 });
      const a = rand(TAU), r = rand(110, 150);
      const spot = g.world.freeSpot(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) || { x: e.x, y: e.y };
      e.x = spot.x;
      e.y = spot.y;
      g.particles.burst(e.x, e.y - 12, 0, 24, [PC.l, PC.L, PC.w], 90, 0.6, 2, P.GLOW | P.FADE, { vz: 40 });
      sfx('teleport');
      cast(e, 0.5);
      return [0, 0, 0];
    }
    if (e.cd3 <= 0) {
      e.cd3 = e.phase ? 9 : 12;
      if (Math.random() < 0.5) say(e, pick(['YOUR SOUL IS MINE.', 'DEATH IS ONLY THE BEGINNING.', 'SERVE ME IN DEATH!']));
      g.summonRing('ghost', e.phase ? 8 : 6, 80);
      cast(e, 0.8);
      return [0, 0, 0];
    }
    // Keep a respectful distance and drift sideways.
    const d = distP(e);
    const a = angP(e);
    if (d < 85) return [-Math.cos(a), -Math.sin(a), 1.05];
    if (d > 160) return [Math.cos(a), Math.sin(a), 1.2];
    const side = Math.sin(e.life * 0.7) > 0 ? 1 : -1;
    return [-Math.sin(a) * side, Math.cos(a) * side, 0.8];
  },

  demonlord(e, dt) {
    const g = e.g, p = g.player;
    const hpf = e.hp / e.maxHp;
    const phase = hpf < 0.25 ? 2 : hpf < 0.55 ? 1 : 0;
    if (phase > e.phase) {
      e.phase = phase;
      say(e, phase === 2 ? 'I WILL BURN THIS WORLD!' : 'YOU DARE?!');
      sfx('boss');
      g.shake(0.6);
      g.effects.push(new Ring(g, e.x, e.y, 6, 120, 0.7, '#f77622', false, 3));
    }
    if (casting(e, dt)) return [0, 0, 0];
    e.cdT -= dt;
    e.cd2 -= dt;
    e.cd3 -= dt;
    e.data.cd4 = (e.data.cd4 ?? 6) - dt;
    const d = distP(e);
    if (e.cdT <= 0) {
      e.cdT = [3.6, 2.8, 2][e.phase];
      fan(g, e, [5, 7, 9][e.phase], 0.2, 'firebolt', 105, 15);
      cast(e, 0.4);
      return [0, 0, 0];
    }
    if (e.cd2 <= 0) {
      e.cd2 = [8.5, 7, 5.5][e.phase];
      const n = [6, 9, 12][e.phase];
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), r = i === 0 ? 0 : rand(16, 110);
        strike(g, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 24, 22, 1.05 + i * 0.07, 'fire');
      }
      if (Math.random() < 0.5) say(e, pick(['BURN!', 'THE SKY FALLS!', 'KNEEL IN ASH!']), 1.6);
      cast(e, 0.6);
      return [0, 0, 0];
    }
    if (e.data.cd4 <= 0 && d < 85) {
      e.data.cd4 = 5;
      cast(e, 1);
      g.effects.push(new Telegraph(g, {
        shape: 'circle', x: e.x, y: e.y, r: 84, dur: 0.9, follow: e,
        onDone: () => {
          if (e.dead) return;
          blast(g, e.x, e.y, 84, 32, 'fire');
          ring(g, e, 16, 'firebolt', 90, 12, rand(TAU));
        },
      }));
      return [0, 0, 0];
    }
    if (e.cd3 <= 0) {
      e.cd3 = [13, 11, 9][e.phase];
      g.summonRing('imp', [6, 8, 10][e.phase], 90);
      cast(e, 0.7);
      return [0, 0, 0];
    }
    const v = toward(e);
    return [v[0], v[1], [1, 1.15, 1.35][e.phase]];
  },
};
