import { weaponSfx } from '../../engine/audio.js';
import { dist2, TAU } from '../../engine/util.js';
import { stunFoe } from '../../game/effects.js';
import { slashFrame } from '../../game/fxsprites.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesBody, reachesFeet } from '../../game/hitbox.js';

const STEEL = ['#424557', '#718793', '#becdd4', '#f2f1e3'];
const BRASS = ['#64452e', '#ac834e', '#e3c781', '#fff1b7'];
const HEIGHT = 7, CUT_TIME = 0.18;

function stroke(w, angle, reach, bash) {
  const { x, y } = w.g.player;
  const direction = Math.round(angle / TAU * 32);
  return {
    w, t: 0,
    update(dt) { this.t += dt; return !this.dead && this.t < CUT_TIME; },
    draw(ctx, cam) {
      const frame = Math.min(5, Math.floor(this.t / CUT_TIME * 6));
      const image = slashFrame(reach, bash ? 1.5 : 0.8, direction, frame, 6, bash ? BRASS : STEEL);
      const width = image.width * cam.S, height = image.height * cam.S;
      ctx.drawImage(image, Math.round((x - cam.x) * cam.S - width / 2),
        Math.round((y - HEIGHT - cam.y) * cam.S - height / 2), width, height);
    },
  };
}

export default {
  fire(w) {
    const { g, s } = w, p = g.player;
    const angle = w.hand ? p.strikeAng : p.face < 0 ? Math.PI : 0;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const cuts = w.watchbladeCuts || 0, bash = cuts >= (w.evolved ? 1 : 2);
    const reach = (bash ? 26 : 32) * s.area, width = (bash ? 14 : 7) * s.area;
    const tipX = p.x + dx * reach, tipY = p.y + dy * reach;
    const targets = g.grid.foes(p.x, p.y, reach + width).filter(e =>
      !e.dead && e.spawnT <= 0.3 && (e.x - p.x) * dx + (e.y - p.y) * dy >= 0 &&
      (reachesFeet(e, p.x, p.y, tipX, tipY, width) ||
       reachesBody(e, p.x, p.y - HEIGHT, tipX, tipY - HEIGHT, width)) &&
      g.world.lineOfSight(p.x, p.y, e.x, e.y));
    targets.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
    recordHeroAttack(w, angle);
    p.swing(angle);
    g.effects.push(stroke(w, angle, reach, bash));
    weaponSfx(w, bash ? 'hit' : 'slash', { pitch: bash ? 0.72 : 0.95, pan: dx * 0.2 });
    let struck = 0;
    const limit = s.amount + (bash ? 2 : 0);
    for (const e of targets) {
      if (e.dead || (!e.prop && struck >= limit)) continue;
      const ordinary = !e.boss && !e.lord && !e.elite;
      const damage = g.hitEnemy(e, s.dmg * (bash ? 1.35 : 1), {
        w, kb: ordinary ? s.kb * (bash ? 1.7 : 1) : 0, kx: dx, ky: dy,
      });
      if (!damage || e.prop) continue;
      struck++;
      if (bash && ordinary) stunFoe(e, s.dur);
    }
    if (struck) w.watchbladeCuts = bash ? 0 : cuts + 1;
  },
};
