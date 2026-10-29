// The hero: movement, stats, health, experience, fury and ultimates.

import { HEROES, heroLook } from '../data/heroes.js';
import { PASSIVES, BLESSING } from '../data/passives.js';
import { gearBonuses } from '../shared/items.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { clamp, damp, rand, lerp } from '../engine/util.js';
import { PC, P } from './particles.js';
import { faceAlong, faceAttack } from './facing.js';
import { foeName } from './names.js';
import { SURFACE } from './topology/index.js';

export const BASE_SPEED = 70;
export const BASE_MAGNET = 42;
// The floor every cooldown multiplier has (derived), however many relics, Armory ranks and
// Blessings of Haste press it down: past it a Blessing of Haste gives nothing (Game.blessingCapped).
export const COOLDOWN_FLOOR = 0.35;
// Armor, the user's: "10% + min 1 damage (but just denote that as armor +1) ... it can only stop
// 95% damage". Each point takes ARMOR_CUT off what is left of a blow, or 1 if that is more, and
// all of it together never more than ARMOR_MOST of the blow: every point adds a little less.
export const ARMOR_CUT = 0.1;
export const ARMOR_MOST = 0.95;

// What the levels themselves give, the user's: "level up make hero slightly stronger", then "do
// not cap, let it go wild. Also, let it be exponential for health", and on 16 October 2026
// "double the effect of levelling" (it was +0.5%, ×1.005 and a point every 20 levels). From
// level 2 on, each level adds LEVEL_MIGHT damage, multiplies health by LEVEL_HP (compounding),
// and every LEVEL_ARMOR levels bring LEVEL_ARMOR_GAIN armor. No cap. Then the owner's (21 October
// 2026): "Levelups do not make hero stronger", "set change to 0": every gain is nought for now
// (+0% damage, ×1 health, no armor); only the cards a level-up offers make him stronger.
export const LEVEL_MIGHT = 0;
export const LEVEL_HP = 1;
export const LEVEL_ARMOR = 10;
export const LEVEL_ARMOR_GAIN = 0;
export const levelBonus = (level) => ({
  might: 1 + LEVEL_MIGHT * (level - 1),
  hp: LEVEL_HP ** (level - 1),
  armor: LEVEL_ARMOR_GAIN * Math.floor(level / LEVEL_ARMOR),
});

// The fury orb, out of 100: what fills it. The owner's, 16 October 2026: it "should not be
// permanently ready, pressing it should be a decision". It was 0.75 a kill, and at thousands of
// kills a minute it was full every few seconds from about minute 5.
// - kill: a kill of the horde while the hero kills slowly. The faster he kills, the less each is
//   worth: kill / (1 + kills a minute / pace), the kills a minute counted over about the last
//   `window` seconds (killShare). So the horde's kills fill no more than kill × pace a minute
//   (30, an orb every 3 1/3 minutes) however many fall, and its odd fury orb (hordeOrb, the chance
//   for a lone kill) thins out the same way, but never below orbFloor of it, so the horde still
//   drops one now and then (the owner's rule: gems, the odd coin and fury orbs): 0.1 to 0.4 orbs
//   a minute at the late night's 1000 to 4000 kills.
// - boss, lord, champion: what killing one gives.
// - hit: what striking one down from full health to nothing gives, a blow its share of that (a
//   boss: the orb over the fight, a boss's tool). The ultimate's own blows give none.
// - hurt: what losing his whole health would give, a blow its share (a quarter: a fifth of the
//   orb), so a hero in trouble gets his ultimate.
// A fury orb, from a box or the horde, gives 40 (Pickup.collect).
export const FURY = {
  kill: 0.75,
  pace: 40,
  window: 15,
  hordeOrb: 0.002,
  orbFloor: 0.05,
  boss: 35,
  lord: 25,
  champion: 8,
  hit: { boss: 100, lord: 60, champion: 30 },
  hurt: 80,
};

// What is left of a blow of raw damage against armor points.
export function armored(raw, armor) {
  if (!(armor > 0)) return raw;
  return Math.max(raw * (1 - ARMOR_MOST), Math.min(raw * (1 - ARMOR_CUT) ** armor, raw - armor));
}

// Heals that come of kills (the Paladin's Devotion, Bloodstorm's): at most `most` of his health a
// second between them (Player.leech), so a horde mown down at once doesn't fill him at a stroke.
export const KILL_HEAL = { most: 0.01 };
// Vampire Fang's heal from damage dealt: at most this share of his health a second (Player.fangHeal).
export const FANG_MOST = 0.012;
// Heals that come in drops (Leech Chains, Vampire Fang, kills): what they mend adds up and shows as
// one green number every `every` seconds, without the heal's sound (Player.trickle).
export const TRICKLE = { every: 0.6 };
// Rimeheart: foes within `r` px freeze for `base` + `per` per rank beyond the first, then it rests
// `rest` s less `cut` per rank beyond the first (Player.hurt).
export const RIME = { r: 50, base: 1, per: 0.2, rest: 7, cut: 0.6 };
// The Druid's Grove Warden: a tree within `near` px of him (World.treeNear), looked for every
// `every` s.
export const GROVE = { near: 48, every: 0.25 };
// What a Survival map's own ground does to him (game/topology, 28 October 2026), only where the map
// has such ground (g.world.topo: never in the Darkwood, Ranked, a crypt or on the road by day). Every
// trap is readable and fair (REQS2): a hold (a gust's frost) is short, drawn (Game.drawHero: a timer
// arc round his feet) and followed by a grace to walk out in; his weapons fire on through all of it,
// and he can be hit.
// The Sunscorch's quicksand. It held him at first, the owner's "feel free to add quicksand, hero steps
// in and cannot move for a few seconds" (2.5 s, then a grace); then the owner's of 29 October 2026:
// "quicksand, make it so that it doesnt exactly stop the hero, but only greatly slows him down, for
// like 2/3 slower". So it never holds him: wading in it he walks at `pace` of his pace, once his feet
// are `enter` px inside its rim, the slow easing in over those px from the rim (and out over them as
// he wades out), so its edge never snaps (Player.wade, sandPace). He sinks `sink` px into it over
// `settle` s and rises out as fast once he is out, the tell that it has him. A leap carries him over
// it unslowed, and the horde crosses it freely.
export const QUICKSAND = { pace: 1 / 3, enter: 4, sink: 4, settle: 0.35 };
// The Frostfell's ice, the owner's "hero steps on the ice and continues sliding until reaches regular
// ground. If hits wall while sliding will stop and can decide where to slide next": a slide at `speed`
// times his walking speed along the way he came on, the player's steering ignored; begun by walking on
// at more than `start` px/s once his feet are `enter` px on the ice, or, standing on it, by a direction
// pressed. It ends once he is `leave` px off the ice (-1: just off it), or when a step of it covers less
// than `block` of its way along it: he struck something solid (a cliff, a rock, a trunk, an igloo).
export const ICE = { speed: 1.25, start: 12, enter: 1, leave: -1, block: 0.5 };
// Frozen by a gust (game/hazards/gusts.js), the owner's "gusts here and there freeze monsters or hero":
// held `hold` s, then `grace` s in which no gust freezes him.
export const FROST = { hold: 1.5, grace: 1.5 };

export function xpFor(level) {
  if (level < 20) return 5 + (level - 1) * 10;
  if (level < 40) return 200 + (level - 20) * 18;
  // Past level 100 (endless nights) each level costs ever more, so Blessings thin out.
  return 560 + (level - 40) * 55 + Math.max(0, level - 100) ** 2 * 2;
}

export class Player {
  constructor(g, heroId, meta) {
    this.g = g;
    this.id = heroId;
    this.hero = heroLook(heroId, g.settings?.skins); // in the look chosen on the hero screen
    this.meta = meta;
    this.x = 0;
    this.y = 0;
    this.r = 5;
    this.vx = 0;
    this.vy = 0;
    this.face = 1;
    this.aim = 0; // radians, last movement direction
    this.moving = false;
    this.anim = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpFor(1);
    this.passives = new Map();
    this.blessings = 0; // stacking rewards once the build is complete
    this.hastes = 0; // and the Blessings of Haste and Reach taken (data/passives.js BLESSING)
    this.reaches = 0;
    this.weapons = [];
    this.strikeAt = null; // when the last blow struck by hand began (Game.strike)
    this.strikeAng = 0; // and which way it was struck
    this.strikeBuf = 0; // a strike pressed before the weapon was ready, kept a moment
    this.fury = 0;
    this.furyFullAt = null; // when the orb last filled (addFury)
    this.lastBlow = null; // who struck the last blow, as the results name it (hurt)
    this.recentKills = 0; // the horde's kills, each fading over FURY.window seconds (killShare)
    this.ult = null; // active ultimate state
    this.invuln = 0;
    this.flash = 0;
    this.buffs = new Map(); // id -> { t, max }
    this.revivals = meta.revival || 0;
    // All from the Armory's Insight and Exile since 21 October 2026 (two free of each before):
    // shared/profile.js metaBonuses.
    this.rerolls = meta.reroll || 0;
    this.banishes = meta.banish || 0; // a card out of the run for good (the level-up's BANISH)
    this.ultLocked = false; // the hero's ultimate not yet opened (Game: open.ult): no fury, no ultimate
    this.dead = false;
    this.stepT = 0;
    this.heartT = 0;
    this.healPool = 0; // sanctuary heal accumulator
    this.leechLeft = 0; // what kills may heal him yet this second (leech)
    this.fangLeft = 0; // what Vampire Fang may heal yet this second (FANG_MOST)
    this.trickled = 0; // what drops of healing mended since the last green number (TRICKLE)
    this.trickleT = 0;
    this.rimeCd = 0; // Rimeheart's rest between freezes
    this.leap = null; // a leap of the Twin Axes under way (leapTo)
    this.inGrove = false; // a tree near him, for Grove Warden (GROVE)
    this.groveT = 0;
    // A Survival map's ground (QUICKSAND, ICE, FROST): none of it ever set in the Darkwood.
    this.held = null; // { kind: 'frost', t, max }: FROZEN by a gust; he can't move
    this.frostFree = 0; // s left in which no gust freezes him
    this.wade = 0; // WADING: how deep his feet are in quicksand, 0 (out of it) to 1 (QUICKSAND.enter px in)
    this.sink = 0; // and how far he has sunk into it, px (Game.placePlayer cuts that much off his feet)
    this.slide = null; // { x, y }: SLIDING, the unit heading of a slide on ice under way
    this.onIce = false; // standing on ice, not sliding (a direction pressed starts a slide)
    this.sprayT = 0; // the ice thrown up as he slides (update)
    this.recompute();
    this.revivals += this.gearB.revival;
    this.hp = this.maxHp;
  }

  passiveSum(key, passives = this.passives) {
    let v = 0;
    for (const [id, rank] of passives) {
      const s = PASSIVES[id].stat[key];
      if (s) v += s * rank;
    }
    return v;
  }

  // The hero's stats as his relics, worn gear (gearB, as recompute last took it), the Armory and
  // his Blessings make them. `passives` in place of his own shows what a relic card would make of
  // them, changing nothing (ui/gamescreen.js cardChange); recompute takes them for good.
  derived(passives = this.passives) {
    const h = this.hero.stats, m = this.meta, q = this.gearB;
    // Worn gear adds to the relics' sums.
    const bonus = (k) => this.passiveSum(k, passives) + (q[k] || 0);
    const lv = levelBonus(this.level), regenMul = h.regenMul || 1, B = BLESSING;
    return {
      maxHp: Math.round((h.maxHp ?? 100) * m.maxHp * (1 + bonus('maxHp') + this.blessings * B.maxHp) * lv.hp),
      armor: (h.armor || 0) + m.armor + bonus('armor') + lv.armor,
      speedMul: (h.speed || 1) * m.speed * (1 + bonus('speed')),
      might: (h.might || 1) * m.might * (1 + bonus('might') + this.blessings * B.might) * lv.might,
      // The Blessings of Reach, counted up to B.reachMost, and of Haste, to the floor of 0.35
      // (COOLDOWN_FLOOR).
      area: (h.area || 1) * m.area * (1 + bonus('area') + Math.min(this.reaches, B.reachMost) * B.area),
      cooldown: Math.max(COOLDOWN_FLOOR, (h.cooldown || 1) * m.cooldown * (1 + bonus('cooldown') + this.hastes * B.cooldown)),
      amount: bonus('amount') + (m.amount || 0) + (this.buff('mirror') ? 1 : 0), // a Mirror Shard
      duration: (m.duration || 1) * (1 + bonus('duration')),
      summonDur: h.summonDur || 1, // the Necromancer's Grave Pact: his minions alone last longer
      projSpeed: (h.projSpeed || 1) * (m.projSpeed || 1) * (1 + bonus('projSpeed')),
      magnet: BASE_MAGNET * m.magnet * (1 + bonus('magnet')),
      luck: (h.luck || 1) * m.luck * (1 + bonus('luck')),
      growth: (h.growth || 1) * m.growth * (1 + bonus('growth')),
      greed: m.greed * (1 + q.greed) * (1 + 0.5 * (this.g.skulls || 0)), // the Cursed Skulls (Game.cursedSkull)
      regenMul,
      healMul: h.healMul || 1, // the Paladin's Devotion: every heal does this much (heal)
      // regenBoost: a bot's test buff (tools/headless.mjs), all its regeneration times this.
      regen: ((h.regen || 0) + m.regen + bonus('regen')) * regenMul * (m.regenBoost || 1),
      crit: 0.05 + (h.crit || 0) + bonus('crit'),
      // The relics that bite (hitEnemy, hurt): Hunter's Mark, Berserker's Torc, Thornmail, Shadow
      // Cloak, Ember Heart, Ram's Horn, Vampire Fang, Rimeheart.
      huntBane: bonus('bane'),
      torc: bonus('torc'),
      thorns: bonus('thorns'),
      dodge: Math.min(0.5, bonus('dodge')),
      ember: bonus('ember'),
      knock: bonus('knock'),
      fang: bonus('fang'),
      rime: bonus('rime'),
      critMult: 2 + q.critMult,
    };
  }

  recompute() {
    this.gearB = gearBonuses(this.g.gear);
    const oldMax = this.maxHp || 0;
    Object.assign(this, this.derived());
    // More health to have brings the health with it; less (gear sold) caps it.
    if (oldMax && this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    for (const w of this.weapons) w.recompute();
  }

  // Revives left: the Second Winds counted down in `revivals`, and those relics give while held
  // (the Phoenix Heart's, spent first: hurt).
  get revives() {
    return this.revivals + this.passiveSum('revivals');
  }

  // Worn gear changed mid-run: its stats now, and a revive more or less from a legendary.
  gearChanged() {
    const before = this.gearB.revival;
    this.recompute();
    this.revivals = Math.max(0, this.revivals + this.gearB.revival - before);
  }

  // A blow his weapon strikes by itself never turns him, walking or standing: he keeps facing
  // the way he last walked, whichever side it lands (facing.js).
  swing(ang) {
    this.swingT = 0.14;
    this.swingAng = ang;
  }

  // A blow struck by the player (Game.strike): the sprite's attack starts now (at, the game's
  // clock). The one blow that may turn him: standing, he turns to the foe the player strikes at.
  strike(ang, at) {
    this.strikeAt = at;
    this.strikeAng = ang;
    this.face = faceAttack(this.face, this.moving, Math.cos(ang), Math.sin(ang));
  }

  buff(id) {
    const b = this.buffs.get(id);
    return b && b.t > 0;
  }

  addBuff(id, t) {
    this.buffs.set(id, { t, max: t });
  }

  // The Berserker's Bloodrage: 0 at full health to 1 at none (none for any other hero), and how
  // much faster it makes his weapons (Weapon.haste); hitEnemy adds its damage.
  get rage() {
    return this.hero.stats.rage ? clamp(1 - this.hp / this.maxHp, 0, 1) : 0;
  }

  get rageHaste() {
    const r = this.hero.stats.rage;
    return r ? 1 + r.haste * this.rage : 1;
  }

  // The Twin Axes' leap (weapons.js LEAP): to (x, y) over LEAP.dur s, onLand then. The leap is his
  // own blow carrying him, never a blow shoving him, and it only goes where the weapon found open.
  // Frozen by a gust's frost (28 October 2026) he can't leap out of it: the blow falls where he
  // stands (onLand at once), so the axes keep chopping while he is held, as every other weapon keeps
  // firing. Out of quicksand he leaps as far as ever, as it never holds him (29 October 2026). A leap
  // from a slide ends the slide (he lands standing: update). Whether he leapt.
  leapTo(x, y, onLand, dur = 0.16) {
    if (this.held) {
      onLand();
      return false;
    }
    this.slide = null;
    this.leap = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, dur, onLand, lx: this.x, ly: this.y };
    return true;
  }

  // Frozen by a gust (FROST, game/hazards/gusts.js) for t s: refused in the grace after the last
  // (frostFree), already held, in the air (a leap), in the Ward's bubble or in the Shadow Dance, which
  // no blow touches either. A slide is stopped where it is. Whether it took him.
  freeze(t = FROST.hold) {
    if (this.dead || this.held || this.frostFree > 0 || this.leap || this.buff('ward') || (this.ult && this.ult.type === 'shadowdance')) return false;
    this.held = { kind: 'frost', t, max: t };
    this.slide = null;
    this.vx = 0;
    this.vy = 0;
    this.moving = false;
    return true;
  }

  // Every hold of the ground let go (Game.enterCrypt, backToForest): a crypt's floor and the forest
  // he comes back to by its door start him on his own feet.
  clearTerrain() {
    this.held = null;
    this.frostFree = 0;
    this.wade = 0;
    this.sink = 0;
    this.slide = null;
    this.onIce = false;
  }

  // The share of his pace the quicksand leaves him (QUICKSAND): all of it out of it, QUICKSAND.pace
  // wading in it, between the two at its rim. Exactly 1 wherever there is no quicksand.
  get sandPace() {
    return 1 - (1 - QUICKSAND.pace) * this.wade;
  }

  // The ground's clocks: the gust's grace runs down, and its hold run out lets him go into the grace
  // (FROST.grace), to walk away from where the gust blew. They stand still with everything else under
  // a level-up's cards, a chest, a find or the pause (Game.update). Quicksand has no clock: it never
  // holds him (29 October 2026).
  holdClock(dt) {
    if (this.frostFree > 0) this.frostFree -= dt;
    const h = this.held;
    if (h && (h.t -= dt) <= 0) {
      this.held = null;
      this.frostFree = FROST.grace;
    }
  }

  // What the ground under his feet does to him, on a Survival map's own ground (g.world.topo; the
  // world's surfaceAt and patchDepth, game/topology). Quicksand slows him by how deep his feet are in
  // it (wade: smoothly from nothing at its rim to all of it QUICKSAND.enter px in), never in the air,
  // and he sinks into it as he wades and rises out after, QUICKSAND.sink px in QUICKSAND.settle s
  // (sink); ice carries him on at the pace he came on with (a leap comes down standing on it), and
  // once he is ICE.leave px off it his steering is his again, his pace easing from the slide's.
  // `landed`: a leap came down this frame.
  groundUnder(g, landed, dt) {
    const w = g.world, s = w.surfaceAt(this.x, this.y);
    if (s === SURFACE.QUICKSAND && !this.leap) {
      const k = clamp(w.patchDepth(this.x, this.y) / QUICKSAND.enter, 0, 1);
      this.wade = k * k * (3 - 2 * k);
    } else this.wade = 0;
    if (this.sink || this.wade) {
      const to = QUICKSAND.sink * this.wade, most = (QUICKSAND.sink / QUICKSAND.settle) * dt;
      this.sink = this.sink < to ? Math.min(to, this.sink + most) : Math.max(to, this.sink - most);
    }
    if (s !== SURFACE.ICE && !this.slide && !this.onIce) return;
    const pd = w.patchDepth(this.x, this.y);
    if (s === SURFACE.ICE && pd > ICE.enter && !this.slide && !this.held && !this.leap) {
      const v = Math.hypot(this.vx, this.vy);
      if (v > ICE.start && !landed) this.slide = { x: this.vx / v, y: this.vy / v };
      else this.onIce = true;
    }
    if ((this.slide || this.onIce) && pd < ICE.leave) {
      this.slide = null;
      this.onIce = false;
    }
  }

  // How high off the ground he is in a leap, in px (Game.drawPlayer).
  get hop() {
    const L = this.leap;
    return L ? Math.sin(Math.min(1, L.t / L.dur) * Math.PI) * 7 : 0;
  }

  // A heal from a kill (KILL_HEAL): as much of v as this second has left.
  leech(v) {
    const h = Math.min(v, this.leechLeft);
    if (h <= 0) return 0;
    this.leechLeft -= h;
    return this.trickle(h);
  }

  // A drop of healing (TRICKLE): mended at once, shown with the others in one green number.
  trickle(amount) {
    if (this.dead) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount * this.healMul);
    this.trickled += this.hp - before;
    return this.hp - before;
  }

  // Vampire Fang: a share of the health a blow took, as much as this second has left (FANG_MOST).
  fangHeal(took) {
    const h = Math.min(took * this.fang, this.fangLeft);
    if (h <= 0) return 0;
    this.fangLeft -= h;
    this.trickle(h);
    return h;
  }

  get moveSpeed() {
    let s = BASE_SPEED * this.speedMul * this.g.move;
    if (this.buff('haste')) s *= 1.3;
    if (this.buff('wildcap')) s *= 1.3;
    if (this.ult && this.ult.type === 'whirlwind') s *= 1.15;
    return s;
  }

  update(dt) {
    const g = this.g;
    for (const [id, b] of this.buffs) {
      b.t -= dt;
      if (b.t <= 0) {
        this.buffs.delete(id);
        if (id === 'mirror') this.recompute(); // the extra shot goes
      }
    }
    // Movement. A Survival map's ground may slow him (WADING in quicksand), hold him (FROZEN by a
    // gust) or carry him (SLIDING on ice): its clocks first, then the player's steering, unless the
    // ground has him. In the Darkwood none of it is ever set, and he steers exactly as he always did.
    this.holdClock(dt);
    const ax = input.axis();
    const sp = this.moveSpeed;
    const pressed = Math.abs(ax.x) + Math.abs(ax.y) > 0.1;
    // Standing on ice, stopped by something solid or come down on it: a direction pressed sends him
    // sliding that way, from this frame (the owner's "can decide where to slide next").
    let fresh = false;
    if (this.onIce && !this.slide && !this.held && !this.leap && pressed) {
      const l = Math.hypot(ax.x, ax.y);
      this.slide = { x: ax.x / l, y: ax.y / l };
      this.aim = Math.atan2(ax.y, ax.x);
      fresh = true;
    }
    if (this.held) {
      // Held: he doesn't move whatever is pressed, and keeps facing and aiming the way he did.
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
    } else if (this.slide) {
      // Sliding: carried along the slide's way at ICE.speed of his pace, in his standing pose, the
      // steering ignored until he is off the ice or stopped.
      this.vx = this.slide.x * sp * ICE.speed;
      this.vy = this.slide.y * sp * ICE.speed;
      this.moving = false;
      this.face = faceAlong(this.face, this.slide.x, this.slide.y);
    } else if (this.onIce && !this.leap) {
      // Standing on the ice with nothing pressed: he stands.
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
    } else {
      // Walking; wading in quicksand, at as little as QUICKSAND.pace of his pace (sandPace: 1 out of it,
      // so the Darkwood's steps are exactly as they were).
      const pace = sp * this.sandPace;
      this.vx = damp(this.vx, ax.x * pace, 16, dt);
      this.vy = damp(this.vy, ax.y * pace, 16, dt);
      this.moving = pressed;
      if (this.moving) {
        this.aim = Math.atan2(ax.y, ax.x);
        this.face = faceAlong(this.face, ax.x, ax.y);
      }
    }
    // Only the player moves the hero: no blow, however heavy, shoves him (Enemy.update). His own
    // leap carries him (leapTo), the player's steering held while he is in the air.
    // Carried off mid-leap (a crypt's door, the stairs): the leap is over, and lands nowhere.
    if (this.leap && Math.hypot(this.x - this.leap.lx, this.y - this.leap.ly) > 1) this.leap = null;
    let landed = false;
    if (this.leap) {
      const L = this.leap;
      L.t += dt;
      const u = Math.min(1, L.t / L.dur);
      this.x = L.lx = lerp(L.x0, L.x1, u);
      this.y = L.ly = lerp(L.y0, L.y1, u);
      if (u >= 1) {
        this.leap = null;
        g.world.collide(this);
        landed = true;
        if (!this.dead) L.onLand();
      }
    } else {
      const x0 = this.x, y0 = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      g.world.collide(this);
      // A step of a slide that covered less than ICE.block of its way along it struck something
      // solid (the world held him: a cliff, a rock, a trunk, an igloo's walls): he stops there, on
      // the ice, and a direction pressed sends him off again.
      const S = this.slide, way = sp * ICE.speed * dt;
      if (S && way > 0 && (this.x - x0) * S.x + (this.y - y0) * S.y < ICE.block * way) {
        // One pressed from standing and stopped at once (pressed into what he stands against) goes
        // nowhere: he stays where he stood, rather than creeping along it a frame's step at a time,
        // steered as if he walked (28 October 2026, the owner's "continues sliding until reaches
        // regular ground"). Never on ice in the Darkwood.
        if (fresh) {
          this.x = x0;
          this.y = y0;
        }
        this.slide = null;
        this.onIce = true;
        this.vx = 0;
        this.vy = 0;
      }
    }
    // What the ground under him does, where the map has ground of its own (never in the Darkwood).
    if (g.world.topo) this.groundUnder(g, landed, dt);
    else this.wade = this.sink = 0;
    const spd = Math.hypot(this.vx, this.vy);
    this.anim += dt * (this.moving ? 7 * clamp(spd / BASE_SPEED, 0.6, 1.6) : 1.6);
    // Shadow hovers: ground still affects gameplay, but it leaves no walking particles or sounds.
    if (this.slide && this.id !== 'rogue') {
      // Sliding: ice thrown up from under him instead of dust, and no step heard.
      if ((this.sprayT -= dt) <= 0) {
        this.sprayT = 0.06;
        g.particles.emit(this.x + rand(-3, 3), this.y, 0, -this.vx * 0.2 + rand(-10, 10), -this.vy * 0.2 + rand(-5, 5), rand(10, 20), 0.35, 1, rand(1) < 0.5 ? PC.w : PC.c, P.FADE | P.GROUND, 3, 60);
      }
    } else if (this.moving && this.id !== 'rogue') {
      // Wading in quicksand: the wet sand he churns thrown up about his shins, as often however slowly
      // he goes (29 October 2026). Never out of it, so the Darkwood's dice fall as they did.
      if (this.wade > 0.5 && (this.sprayT -= dt) <= 0) {
        this.sprayT = 0.1;
        g.particles.emit(this.x + rand(-4, 4), this.y + rand(-1, 1), 0, rand(-12, 12), rand(-4, 4), rand(14, 26), 0.35, 1, rand(1) < 0.5 ? PC.b : PC.S, P.FADE | P.GROUND, 3, 80);
      }
      this.stepT -= dt * spd;
      if (this.stepT <= 0) {
        this.stepT = 22;
        g.particles.emit(this.x + rand(-2, 2), this.y, 0, rand(-8, 8), rand(-4, 2), 6, 0.4, 1, g.world.dustColor ?? PC.N, P.FADE | P.GROUND, 3, 30);
        // On ground the rain has wet, each step squelches (weather.js); in fresh snow falling (the
        // Frostfell's, Weather.crunch) it crunches, softly. Sand, ash and petals are silent.
        if (g.weather?.wet && !this.leap) sfx('wetstep');
        else if (g.weather?.crunch && !this.leap) sfx('step');
      }
    }

    // Regeneration and sanctuary healing.
    if (this.hp < this.maxHp && !this.dead) {
      let regen = this.regen;
      if (this.buff('protection')) regen += this.regenMul;
      if (regen > 0) this.hp = Math.min(this.maxHp, this.hp + regen * dt);
    }
    if (this.healPool > 0) {
      const h = Math.min(this.healPool, 4 * dt);
      this.healPool -= h;
      this.hp = Math.min(this.maxHp, this.hp + h * this.regenMul);
    }

    this.leechLeft = Math.min(this.maxHp * KILL_HEAL.most, this.leechLeft + this.maxHp * KILL_HEAL.most * dt);
    this.fangLeft = Math.min(this.maxHp * FANG_MOST, this.fangLeft + this.maxHp * FANG_MOST * dt);
    if ((this.trickleT -= dt) <= 0) {
      this.trickleT = TRICKLE.every;
      const n = Math.floor(this.trickled);
      if (n >= 1) {
        this.g.numbers.add(this.x, this.y - 18, n, 'heal');
        this.trickled -= n;
      }
    }
    if (this.rimeCd > 0) this.rimeCd -= dt;
    // Grove Warden: is a tree near him (the forest's; a crypt or the Dungeon has none)?
    if (this.hero.stats.grove && (this.groveT -= dt) <= 0) {
      this.groveT = GROVE.every;
      const was = this.inGrove;
      this.inGrove = !g.inCrypt && !!(g.world.treeNear && g.world.treeNear(this.x, this.y, GROVE.near));
      if (this.inGrove && !was) g.particles.burst(this.x, this.y - 4, 4, 6, [PC.L, PC.l, PC.e], 30, 0.6, 1, P.GLOW | P.FADE, { vz: 30 });
    }
    this.recentKills *= Math.exp(-dt / FURY.window);
    this.invuln = Math.max(0, this.invuln - dt);
    this.swingT = Math.max(0, (this.swingT || 0) - dt);
    this.flash = Math.max(0, this.flash - dt);

    // Low health heartbeat.
    if (this.hp / this.maxHp < 0.3 && !this.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.9;
        sfx('heartbeat');
      }
    }

    // Blows struck by hand, where the hero fights that way (Game.caveStrike): a press waits a
    // moment for the weapon to be ready, and holding the key strikes each time it is.
    if (g.caveStrike) {
      this.strikeBuf = input.pressed('strike') ? 0.25 : Math.max(0, this.strikeBuf - dt);
      if ((this.strikeBuf > 0 || input.down('strike')) && g.strike()) this.strikeBuf = 0;
    }

    // Ultimate.
    if (this.ult) {
      this.ult.t -= dt;
      g.updateUlt(this.ult, dt);
      if (this.ult.t <= 0) this.ult = null;
    } else if (this.fury >= 100 && !this.ultLocked && input.pressed('ult') && !g.ultLaunch) {
      // Spent at once, so the press can't be doubled; the launch plays first (Game.launchUlt).
      this.fury = 0;
      g.launchUlt(this.hero.ult);
    }
  }

  get untouchable() {
    return this.invuln > 0 || this.buff('ward') || !!this.leap || (this.ult && this.ult.type === 'shadowdance') || this.g.state !== 'play';
  }

  // A blow of amount from src (a foe, by contact) or by (who struck it from afar, as the results
  // name it: names.js); the one that fells him is the run's stats.killedBy. boss: a boss's name
  // alone when the blow from afar is his (names.js bossOf), for the wounds.
  hurt(amount, src, by = null, boss = null) {
    const g = this.g;
    if (this.dead || this.untouchable || this.devGod || g.state === 'faint') return 0;
    // Shadow Cloak: a dodged blow costs nothing, and a breath of grace stops the next roll at once.
    if (this.dodge > 0 && Math.random() < this.dodge) {
      this.invuln = 0.3;
      g.numbers.text(this.x, this.y - 22, 'Dodged', 'frost');
      g.particles.burst(this.x, this.y - 8, 6, 8, [PC.j, PC.q, PC.w], 50, 0.4, 1, P.GLOW | P.FADE, {});
      return 0;
    }
    // The difficulty's damage and the Survival map's (data/maps.js foe dmg: the Sunscorch's 0.7, the
    // Abyss's 1.25; 28 October 2026), before his armor: every blow, a touch, a shot or a boss's slam.
    // (A hero shown on the hero screen stands in a game with no map: hero-showcase.js.)
    let dmg = armored(amount * g.diff.dmg * (g.map?.foe?.dmg ?? 1), this.armor);
    if (this.buff('protection')) dmg *= 0.5;
    if (this.ult && this.ult.type === 'whirlwind') dmg *= 0.5;
    // Normal halves what he takes, after all of that (difficulty.js hurt). A blow always lands.
    dmg = Math.max(1, Math.round(dmg * g.diff.hurt));
    this.hp -= dmg;
    this.lastBlow = by || (src ? foeName(src) : null);
    // A moment's grace before the next blow can land: 0.22 s (the owner's, 23 October 2026; 0.6 s
    // before, when a crowd round him hurt no more than one foe did).
    this.invuln = 0.22;
    this.flash = 0.12;
    this.addFury((FURY.hurt * dmg) / this.maxHp);
    g.stats.damageTaken += dmg;
    // A boss's slams and shots are his as much as his touch (27 October 2026: they counted as the
    // horde's shots, and the results' tip for a boss came only when his touch had done the most).
    if ((src && src.boss) || boss) g.stats.fromBoss += dmg;
    else if (src) g.stats.fromMobs += dmg;
    else g.stats.fromShots += dmg;
    // And by who dealt it: a foe by its kind, a boss by his name whatever the blow, a shot as its
    // shooter's (names.js).
    const who = src ? src.def.name : boss || by || 'Unknown';
    g.stats.wounds[who] = (g.stats.wounds[who] || 0) + dmg;
    g.stats.minHp = Math.min(g.stats.minHp, Math.max(0, this.hp) / this.maxHp);
    // No number for his own wounds (the owner's, 28 October 2026: "not shown when deal on hero"):
    // the screen's red flash, the shake and his bar tell them.
    g.shake(0.35);
    g.hurtFlash = 0.35;
    sfx('hurt');
    g.particles.burst(this.x, this.y - 8, 6, 10, [PC.r, PC.R, PC.x], 60, 0.5, 1, P.GROUND | P.FADE, { grav: 200, vz: 60 });
    // Shove nearby enemies back so a crowd can't stun-lock you.
    g.pushback(this.x, this.y, 30, 120);
    if (src && src.vampiric) src.hp = Math.min(src.maxHp, src.hp + dmg * 3);
    // Thornmail: the foe that struck him by contact is struck back (his might applies).
    if (this.thorns > 0 && src && src.hp > 0 && !src.dead) g.hitEnemy(src, this.thorns, { type: 'normal', kb: 0, noCrit: true });
    // Rimeheart: the foes about him freeze, then it rests a while.
    if (this.rime > 0 && this.rimeCd <= 0) {
      const n = this.rime - 1;
      this.rimeCd = Math.max(2, RIME.rest - RIME.cut * n);
      g.rimeFreeze(this.x, this.y, RIME.r, RIME.base + RIME.per * n);
    }
    if (this.hp <= 0) {
      if (g.inCrypt) {
        // Felled in a crypt he only faints, and wakes outside it (Game.faint): a Second
        // Wind is kept for the forest, where a fall is the end.
        this.hp = 0;
        g.faint();
      } else if (this.revives > 0) {
        // A relic that raises him (the Phoenix Heart) is the revive spent first, and goes with
        // it; a Second Wind (the Armory's, a legendary's) waits for the next fall.
        const relic = [...this.passives.keys()].find((id) => PASSIVES[id].stat.revivals);
        if (relic) g.spendRelic(relic);
        else this.revivals--;
        this.hp = Math.round(this.maxHp * 0.6);
        this.invuln = 2.5;
        g.revive(relic);
      } else {
        this.hp = 0;
        this.dead = true;
        g.stats.killedBy = this.lastBlow;
        g.onPlayerDeath();
      }
    }
    return dmg;
  }

  heal(amount, quiet = false) {
    if (this.dead) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount * this.healMul);
    const healed = Math.round(this.hp - before);
    if (healed > 0 && !quiet) {
      this.g.numbers.add(this.x, this.y - 18, healed, 'heal');
      sfx('heal');
    }
    return healed;
  }

  addXp(v) {
    let gain = v * this.growth;
    if (this.buff('wisdom')) gain *= 1.5;
    if (this.g.mode === 's15' || this.g.mode === 'ranked') gain *= 1.1;
    else if (this.g.mode === 'dungeon') gain *= 1.15; // fewer foes down there
    this.xp += gain;
    const was = this.level;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpFor(this.level);
      this.g.queueLevelUp();
    }
    // Stronger for the levels themselves (levelBonus), the health he gains with it.
    if (this.level !== was) this.recompute();
  }

  // The orb fills; the moment it is full a chime rings, once until it has been emptied, and the HUD
  // bursts a ring out of it (furyFullAt, on the game's clock).
  addFury(v) {
    if (this.ultLocked) return; // nothing to fill it for while his ultimate is locked
    const was = this.fury;
    this.fury = Math.min(100, this.fury + v);
    if (was < 100 && this.fury >= 100) {
      this.furyFullAt = this.g.clock;
      sfx('furyready');
    }
  }

  // What a kill of the horde is worth to the orb now, as a share of a lone kill's (FURY): the
  // faster he is killing, the less.
  get killShare() {
    return 1 / (1 + (this.recentKills * 60) / FURY.window / FURY.pace);
  }

  // A kill's charge: a boss's, a lord's or a champion's is fixed, one of the horde's shrinks with
  // the pace of the killing (killShare).
  furyKill(e) {
    if (e.boss) return this.addFury(FURY.boss);
    if (e.lord) return this.addFury(FURY.lord);
    if (e.elite) return this.addFury(FURY.champion);
    this.addFury(FURY.kill * this.killShare);
    this.recentKills++;
  }

  // A blow of dmg on a boss, a lord or a champion: the share of its health it took.
  furyHit(e, dmg) {
    const k = e.boss ? FURY.hit.boss : e.lord ? FURY.hit.lord : e.elite ? FURY.hit.champion : 0;
    if (k) this.addFury((k * dmg) / e.maxHp);
  }
}

export const ULT_DURATION = { whirlwind: 3.5, arrowstorm: 3, cataclysm: 2.6, shadowdance: 3, deadrise: 0.8, sanctum: 5, overgrowth: 3, frenzy: 5, purge: 4 };
