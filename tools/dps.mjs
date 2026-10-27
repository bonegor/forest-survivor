// Rough strength of every weapon, from the real game headless (headless.mjs): each weapon alone on
// a neutral hero (the Knight with might, cooldown, area, amount, crit... all 1 or 0, no relics, no
// level-ups, pickups, fury or ultimate) kiting the same stop-go star path (walk 1.5 s at full pace,
// stand 1 s, turn 2.4 rad, so he keeps turning back into what follows him), at level 1, level 8 and
// as its evolution (added by id, so no relic's stats leak in). Foe health follows the stage: Veteran
// minute 1 for L1, minute 5 for L8, minute 10 for EVO. Four fights, the same seeds for every weapon
// (the spawn ring has its own random stream, so every weapon meets the same spawn layout):
//   horde: 120 Ghouls, kept at 120, refilled 320-360 px out (past the screen's edge);
//   tough: 36 of them at five times that health, same ring;
//   wall: 40 Ghouls that never die, round him: raw damage with no supply cap and no overkill (the
//         fair place for synergy; execute and on-death effects read 0 here);
//   boss: one undying champion at full Ghoul pace (it catches him while he stands, he leaves it
//         while he walks: contact and mid range by turns).
// Measured after a warm-up: damage dealt a second (all damage in the game: only this weapon deals
// any; minions, DoTs, pools and blasts included), kills a second, and the damage the hero WOULD have
// taken a second (he is untouchable, every blow that lands is counted: the worth of slows, freezes,
// stuns, fear and push). Support weapons (hex, smite, lantern, spores) also run beside a reference
// (arcane at the same stage); their uplift is the pair's damage over the reference's alone.
// Writes dps.json and dps.md to --out and prints the md. Runs the cases on worker processes.
//   node tools/dps.mjs [--only=bow,axe] [--seeds=3] [--secs=60] [--workers=14] [--out=dir]
import { fork } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const WORKER = process.argv.includes('--worker');

// ------------------------------------------------------------------ one case, in a worker --

async function worker() {
  await import('./headless.mjs');
  const { Game } = await import('../public/js/game/game.js');
  const { input } = await import('../public/js/engine/input.js');
  const { mulberry32 } = await import('../public/js/engine/util.js');
  const { monsterHp } = await import('../public/js/data/waves.js');
  const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');

  // The hero's multipliers, neutral (Player.recompute sets them; we set them back after it).
  const NEUTRAL = { might: 1, area: 1, cooldown: 1, amount: 0, duration: 1, projSpeed: 1, crit: 0, critMult: 2, armor: 0, huntBane: 0, torc: 0, thorns: 0, dodge: 0, ember: 0, knock: 0, fang: 0, rime: 0, summonDur: 1, luck: 1, growth: 1, regen: 0 };
  const SCEN = {
    horde: { type: 'zombie', n: 120, hp: 1, R: [320, 360] },
    tough: { type: 'zombie', n: 36, hp: 5, R: [320, 360] },
    wall: { type: 'zombie', n: 40, hp: 1e6, R: [60, 160] },
    boss: { type: 'zombie', n: 1, hp: 1e6, R: [170, 170], elite: true },
  };
  // Stop-go star: walk LEG.go s at full pace, stand LEG.stand s, turn LEG.turn rad. The legs sum to a
  // closed star, so he stays near home, and each new leg points partly back at his pursuers.
  const LEG = { go: 1.5, stand: 1, turn: 2.4 };

  function run({ weapons, scen, seed, secs, warm, phase }) {
    const random = Math.random, bot = input.bot;
    Math.random = mulberry32(seed * 1013 + 7);
    const ringRand = mulberry32(seed * 7919 + 3);
    try {
      input.bot = { x: 0, y: 0 };
      const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, headless: true });
      g.spawner.update = () => {};
      g.weather = null;
      g.shrines = [];
      g.dropGem = () => {};
      g.addPickup = () => {};
      const p = g.player;
      p.ultLocked = true;
      p.addXp = () => {};
      const rc = p.recompute.bind(p);
      p.recompute = () => {
        rc();
        Object.assign(p, NEUTRAL);
        for (const w of p.weapons) w.recompute();
      };
      // Untouchable, but what would land is counted (Player.hurt, with no armor). The game's 0.22 s
      // of grace after a blow would cap this at one blow per 0.22 s however many foes touch him, so
      // instead each foe touching him counts as striking every 0.22 s (Enemy.update calls hurt each
      // frame it touches): pressure, which a slow, a freeze or a push lowers.
      // A landed blow also shoves the crowd (Player.hurt's pushback, 30 px, at most once per 0.22 s).
      let hurt = 0, pb = -1;
      p.devGod = false;
      p.hurt = function (amount, src) {
        if (this.dead || this.untouchable || g.state === 'faint') return 0;
        const d = amount * g.diff.dmg * g.diff.hurt;
        hurt += src ? d * (1 / 60 / 0.22) : d;
        if (g.time - pb >= 0.22) {
          g.pushback(this.x, this.y, 30, 120);
          pb = g.time;
        }
        return d;
      };
      // The Scythe's reap kills outright (killEnemy, not hitEnemy), so g.stats.damage misses the
      // health it took: count it here. Kills through hitEnemy arrive with hp <= 0 and add nothing.
      const kill = g.killEnemy.bind(g);
      let reaped = 0;
      g.killEnemy = (e, o) => {
        if (o && o.w && !e.dead && e.hp > 0) reaped += e.hp;
        return kill(e, o);
      };
      for (const w of p.weapons) if (w.fx) w.fx.dead = true;
      p.weapons.length = 0;
      g.freeSrc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      const held = weapons.map(([id, lv]) => g.addWeapon(id, lv));
      p.recompute();

      const S = SCEN[scen];
      const hpMul = monsterHp(phase, 's15') * g.diff.hp * S.hp; // Veteran, at the stage's minute
      const foes = [];
      let foeHp = 0;
      const top = () => {
        for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead) foes.splice(i, 1);
        while (foes.length < S.n) {
          const a = ringRand() * Math.PI * 2, R = S.R[0] + ringRand() * (S.R[1] - S.R[0]);
          const e = g.spawnEnemy(S.type, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85, { instant: true, always: true, aware: true, hpMul, elite: !!S.elite, spdMul: S.spd ?? 1 });
          if (!e) break;
          foes.push(e);
          foeHp ||= e.maxHp;
        }
      };
      const dt = 1 / 60, total = Math.round((warm + secs) * 60), start = Math.round(warm * 60);
      let t = 0, d0 = 0, k0 = 0, h0 = 0, r0 = 0, a0 = [], notPlay = 0, th = 0, leg = 0;
      for (let f = 0; f < total; f++) {
        if (f === start) {
          d0 = g.stats.damage;
          k0 = g.kills;
          h0 = hurt;
          r0 = reaped;
          a0 = held.map((w) => w.dmgDealt);
        }
        if (g.state !== 'play') {
          notPlay++;
          g.state = 'play';
        }
        top();
        if (leg >= LEG.go + LEG.stand) {
          leg -= LEG.go + LEG.stand;
          th += LEG.turn;
        }
        input.bot = leg < LEG.go ? { x: Math.cos(th), y: Math.sin(th) } : { x: 0, y: 0 };
        leg += dt;
        g.update(dt);
        t += dt;
      }
      return {
        dps: (g.stats.damage - d0 + reaped - r0) / secs,
        supply: g.spawner.rate(phase),
        foeHp: foeHp / S.hp,
        kps: (g.kills - k0) / secs,
        hurt: (hurt - h0) / secs,
        attr: held.map((w, i) => (w.dmgDealt - a0[i]) / secs),
        notPlay,
      };
    } finally {
      Math.random = random;
      input.bot = bot;
    }
  }

  process.on('message', (m) => {
    if (m === 'done') process.exit(0);
    let r;
    try {
      r = run(m);
    } catch (e) {
      r = { error: String(e && e.stack || e) };
    }
    process.send({ key: m.key, r });
  });
  process.send({ ready: true });
}

// --------------------------------------------------------------------------------- main --

async function main() {
  const { WEAPONS, MAX_WEAPON_LEVEL } = await import('../public/js/data/weapons.js');
  const seeds = +arg('seeds', 3), secs = +arg('secs', 60), warm = 8;
  const nW = +arg('workers', Math.max(1, cpus().length - 2));
  const out = arg('out', 'tools/out/dps');
  const only = arg('only', '').split(',').filter(Boolean);

  const POOLS = {
    'Melee / close': ['sword', 'aura', 'blades', 'twinaxes', 'scythe'],
    // Weapons whose worth is mostly the damage they keep off (push, fear, pull, freeze, root).
    'Control (push / fear / pull / freeze / root)': ['gale', 'bell', 'hollow', 'frost', 'hook', 'roots'],
    'Aimed projectiles': ['bow', 'crossbow', 'daggers', 'wisps', 'fireball', 'glaive', 'axe', 'runestone', 'arcane'],
    'Strikes from above': ['lightning', 'chain', 'starfall', 'smite'],
    'Ground zones / DoT': ['flask', 'caltrops', 'spores', 'miasma', 'thorns', 'leech', 'lantern'],
    Summons: ['raise'],
  };
  const SUPPORT = ['hex', 'smite', 'lantern', 'spores'], REF = 'arcane';
  const base = Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved && (!only.length || only.includes(id)));
  const pooled = new Set(Object.values(POOLS).flat());
  const extra = base.filter((id) => !pooled.has(id) && id !== 'hex');
  if (extra.length) POOLS.Other = extra;
  const STAGES = ['L1', 'L8', 'EVO'];
  const SCENS = ['horde', 'tough', 'wall', 'boss'];
  const PHASE = { L1: 1.4, L8: 7, EVO: 14 }; // foe health at Veteran minute 1, 5 and 10
  const at = (id, st) => (st === 'L1' ? [id, 1] : st === 'L8' ? [id, MAX_WEAPON_LEVEL] : [WEAPONS[id].evo.into, MAX_WEAPON_LEVEL]);

  // Configs: each weapon alone at each stage, the supports beside the reference, and no weapon.
  const configs = { none: [] };
  for (const id of base) for (const st of STAGES) configs[`${id}@${st}`] = [at(id, st)];
  const needRef = base.some((id) => SUPPORT.includes(id));
  if (needRef) for (const st of STAGES) configs[`${REF}@${st}`] ??= [at(REF, st)];
  for (const id of base) if (SUPPORT.includes(id) && id !== REF) for (const st of STAGES) configs[`${id}+${REF}@${st}`] = [at(REF, st), at(id, st)];
  const jobs = [];
  for (const [cfg, weapons] of Object.entries(configs)) for (const scen of SCENS) for (let s = 1; s <= seeds; s++) jobs.push({ key: `${cfg}|${scen}|${s}`, weapons, scen, seed: s, secs, warm, phase: PHASE[cfg.split('@')[1]] ?? 7 });

  const t0 = Date.now();
  const results = {};
  await new Promise((done) => {
    let next = 0, live = 0, got = 0;
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    for (let i = 0; i < Math.min(nW, jobs.length); i++) {
      const c = fork(self, ['--worker'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      live++;
      const feed = () => {
        if (next < jobs.length) c.send(jobs[next++]);
        else c.send('done');
      };
      c.on('message', (m) => {
        if (m.key) {
          results[m.key] = m.r;
          if (m.r.error) console.error(m.key, m.r.error);
          if (++got % 50 === 0) process.stderr.write(`${got}/${jobs.length} cases, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
        }
        feed();
      });
      c.on('exit', () => --live === 0 && done());
    }
  });
  const runtime = (Date.now() - t0) / 1000;

  // Medians over the seeds.
  const med = (a) => {
    const s = [...a].sort((x, y) => x - y), n = s.length;
    return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
  };
  const agg = {};
  for (const cfg of Object.keys(configs)) {
    agg[cfg] = {};
    for (const scen of SCENS) {
      const rs = [];
      for (let s = 1; s <= seeds; s++) {
        const r = results[`${cfg}|${scen}|${s}`];
        if (r && !r.error) rs.push(r);
      }
      agg[cfg][scen] = {
        dps: med(rs.map((r) => r.dps)),
        kps: med(rs.map((r) => r.kps)),
        hurt: med(rs.map((r) => r.hurt)),
        supply: med(rs.map((r) => r.supply)),
        foeHp: med(rs.map((r) => r.foeHp)),
        attr: rs.length ? rs[0].attr.map((_, i) => med(rs.map((r) => r.attr[i]))) : [],
        notPlay: Math.max(0, ...rs.map((r) => r.notPlay)),
      };
    }
  }
  const none = agg.none;
  const name = (id, st) => (st === 'EVO' ? WEAPONS[WEAPONS[id].evo.into].name : WEAPONS[id].name);

  // ------------------------------------------------------------------- the report --
  const f0 = (v) => (!isFinite(v) ? '-' : v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  const pct = (v) => (isFinite(v) ? `${Math.round(v * 100)}%` : '-');
  const L = [];
  L.push(`# Weapon DPS estimates`, '');
  const sup = (st) => agg[`${REF}@${st}`]?.horde?.supply ?? agg[`${base[0]}@${st}`]?.horde?.supply;
  L.push(`Real game, headless. Neutral Knight (all multipliers 1, crit 0, no relics), stop-go star kite (walk 1.5 s at full pace, stand 1 s, turn 2.4 rad). ${seeds} seed(s), median; ${warm} s warm-up then ${secs} s measured. Runtime ${runtime.toFixed(0)} s.`);
  L.push(`Foe health per stage: Veteran minute 1 at L1, minute 5 at L8, minute 10 at EVO; a horde Ghoul has ${STAGES.map((st) => Math.round(agg[`${base[0]}@${st}`]?.horde?.foeHp)).join(' / ')} hp.`);
  L.push(`Fights: **H** horde = 120 Ghouls kept at 120, refilled 320-360 px out (past the screen edge); **T** tough = 36 at 5x health, same ring; **W** wall = 40 Ghouls that never die, round him: raw damage with no supply cap or overkill (execute and on-death effects read 0); **B** boss = one undying champion at full Ghoul pace (touches him while he stands, falls behind while he walks). DPS = all damage dealt / s (Scythe reaps included).`);
  L.push(`The real game's Veteran horde arrives at ${STAGES.map((st) => `${f0(sup(st))}/s (${st})`).join(', ')}; a horde kills/s above that (marked *) is beyond what the night supplies.`);
  L.push(`Would-be damage taken / s with no weapon: H ${f0(none.horde.hurt)}, T ${f0(none.tough.hurt)}, W ${f0(none.wall.hurt)}, B ${f0(none.boss.hurt)}. "Taken" columns below are % of the horde's (lower = the weapon keeps foes off better).`, '');
  L.push(`Flags: DPS more than 1.5x (HIGH) or under 0.6x (LOW) the pool median at that stage and fight. Pools of fewer than 3 are flagged against the median of all weapons.`, '');

  const dpsOf = (id, st, sc) => agg[`${id}@${st}`]?.[sc]?.dps;
  const allMed = {};
  for (const st of STAGES) for (const sc of SCENS) allMed[`${st}${sc}`] = med(base.map((id) => dpsOf(id, st, sc)).filter(isFinite));
  const flags = [];
  for (const [pool, ids0] of Object.entries(POOLS)) {
    const ids = ids0.filter((id) => base.includes(id));
    if (!ids.length) continue;
    L.push(`## ${pool}`, '');
    L.push('| weapon | L1 H / T / W / B | L8 H / T / W / B | EVO H / T / W / B | kills/s H L1 / L8 / EVO | taken L1 / L8 / EVO (H) | flags |');
    L.push('|---|---|---|---|---|---|---|');
    const pm = {};
    for (const st of STAGES) for (const sc of SCENS) pm[`${st}${sc}`] = ids.length >= 3 ? med(ids.map((id) => dpsOf(id, st, sc)).filter(isFinite)) : allMed[`${st}${sc}`];
    for (const id of ids) {
      const fl = [];
      for (const st of STAGES) for (const sc of SCENS) {
        if (!(pm[`${st}${sc}`] > 0)) continue;
        const r = dpsOf(id, st, sc) / pm[`${st}${sc}`];
        if (r > 1.5) fl.push(`${st} ${sc[0].toUpperCase()} HIGH ${r.toFixed(1)}x`);
        else if (r < 0.6) fl.push(`${st} ${sc[0].toUpperCase()} LOW ${r.toFixed(2)}x`);
      }
      if (fl.length) flags.push(`${id} (${pool}): ${fl.join(', ')}`);
      const cell = (st) => SCENS.map((sc) => f0(dpsOf(id, st, sc))).join(' / ');
      const kps = STAGES.map((st) => { const h = agg[`${id}@${st}`].horde; return f0(h.kps) + (h.kps > h.supply ? '*' : ''); }).join(' / ');
      const taken = STAGES.map((st) => pct(agg[`${id}@${st}`].horde.hurt / none.horde.hurt)).join(' / ');
      L.push(`| ${id} (${name(id, 'EVO')}) | ${cell('L1')} | ${cell('L8')} | ${cell('EVO')} | ${kps} | ${taken} | ${fl.join('; ')} |`);
    }
    const mc = (st) => SCENS.map((sc) => f0(pm[`${st}${sc}`])).join(' / ');
    L.push(`| *median${ids.length < 3 ? ' (all weapons)' : ''}* | ${mc('L1')} | ${mc('L8')} | ${mc('EVO')} | | | |`, '');
  }

  if (base.some((id) => SUPPORT.includes(id))) {
    L.push(`## Support, beside ${REF} at the same stage`, '');
    L.push(`Uplift = pair DPS / ${REF} alone - 1. Synergy = (pair - ${REF} alone - support alone) / ${REF} alone: what the pair gains over the two side by side (brand, curse, mark). ${REF}'s own = ${REF}'s attributed damage in the pair / alone - 1 (brands and marks land on its blows). Shown on the wall and the boss only: foes there never die, so the two weapons do not compete for kills.`, '');
    L.push('| weapon | stage | alone W / B | pair W / B | uplift W / B | synergy W / B | ' + REF + "'s own W / B |");
    L.push('|---|---|---|---|---|---|---|');
    for (const id of SUPPORT.filter((x) => base.includes(x))) for (const st of STAGES) {
      const pr = agg[`${id}+${REF}@${st}`], rf = agg[`${REF}@${st}`], WB = ['wall', 'boss'];
      L.push(`| ${id} | ${st} | ${WB.map((sc) => f0(dpsOf(id, st, sc))).join(' / ')} | ${WB.map((sc) => f0(pr[sc].dps)).join(' / ')} | ${WB.map((sc) => pct(pr[sc].dps / rf[sc].dps - 1)).join(' / ')} | ${WB.map((sc) => pct((pr[sc].dps - rf[sc].dps - dpsOf(id, st, sc)) / rf[sc].dps)).join(' / ')} | ${WB.map((sc) => pct(pr[sc].attr[0] / rf[sc].attr[0] - 1)).join(' / ')} |`);
    }
    L.push('');
  }

  L.push('## All weapons, sorted by L8 horde DPS', '');
  L.push('Growth is read on the wall (same foes at every stage, no supply cap); the horde\'s foes get tougher with the stage.', '');
  L.push('| weapon | L1 H | L8 H | EVO H | L8 W | EVO W | L8 B | EVO B | L1->L8 (W) | L8->EVO (W) | L8->EVO (B) | attributed share (L8 H) |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const sorted = [...base].sort((a, b) => (dpsOf(b, 'L8', 'horde') || 0) - (dpsOf(a, 'L8', 'horde') || 0));
  const growth = [];
  for (const id of sorted) {
    const g18 = dpsOf(id, 'L8', 'wall') / dpsOf(id, 'L1', 'wall'), g8e = dpsOf(id, 'EVO', 'wall') / dpsOf(id, 'L8', 'wall'), g8eB = dpsOf(id, 'EVO', 'boss') / dpsOf(id, 'L8', 'boss');
    growth.push({ id, g18, g8e, g8eB });
    const a = agg[`${id}@L8`].horde, share = a.attr[0] / a.dps;
    L.push(`| ${id} | ${f0(dpsOf(id, 'L1', 'horde'))} | ${f0(dpsOf(id, 'L8', 'horde'))} | ${f0(dpsOf(id, 'EVO', 'horde'))} | ${f0(dpsOf(id, 'L8', 'wall'))} | ${f0(dpsOf(id, 'EVO', 'wall'))} | ${f0(dpsOf(id, 'L8', 'boss'))} | ${f0(dpsOf(id, 'EVO', 'boss'))} | ${f0(g18)}x | ${f0(g8e)}x | ${f0(g8eB)}x | ${pct(share)} |`);
  }
  L.push('');
  const gm18 = med(growth.map((x) => x.g18).filter(isFinite)), gm8e = med(growth.map((x) => x.g8e).filter(isFinite));
  L.push(`Median growth L1->L8 ${f0(gm18)}x, L8->EVO ${f0(gm8e)}x (wall).`, '');
  const gflags = growth.filter((x) => x.g8e < 1.1 || x.g8e > 2 * gm8e || x.g18 < 0.5 * gm18 || x.g18 > 2 * gm18).map((x) => `${x.id}: L1->L8 ${f0(x.g18)}x, L8->EVO ${f0(x.g8e)}x (boss ${f0(x.g8eB)}x)`);
  L.push('## Flagged', '');
  for (const f of flags) L.push(`- ${f}`);
  if (gflags.length) {
    L.push('', 'Growth outliers (evolution under 1.1x its L8, or growth more than 2x / under half the median):', '');
    for (const f of gflags) L.push(`- ${f}`);
  }
  const stuck = Object.entries(agg).filter(([, v]) => SCENS.some((s) => v[s].notPlay > 0)).map(([k]) => k);
  if (stuck.length) L.push('', `Left 'play' state (forced back): ${stuck.join(', ')}`);
  const errs = Object.entries(results).filter(([, r]) => r.error).map(([k]) => k);
  if (errs.length) L.push('', `Errors: ${errs.join(', ')}`);

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'dps.json'), JSON.stringify({ seeds, secs, warm, runtime, pools: POOLS, agg, results }, null, 1));
  const md = L.join('\n') + '\n';
  writeFileSync(join(out, 'dps.md'), md);
  console.log(md);
}

if (WORKER) worker();
else main();
