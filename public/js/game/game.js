// A single run: owns every system and runs the update/draw loop.

import { diffFor, nightmareFor, moveFor, VETERAN, NIGHTMARE } from '../data/difficulty.js';
import { HEROES, startWeapons, weaponsFor } from '../data/heroes.js';
import { WEAPONS, MAX_WEAPON_LEVEL, MAX_WEAPONS, MAX_RELICS } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS, FILLERS, FILLER_IDS, BLESSING } from '../data/passives.js';
import { ENEMIES } from '../data/enemies.js';
import { FLOORS, monsterHp, minuteOf, HORDE_CAP, SURVIVAL_BOSSES, RANKED_BOSS_EVERY } from '../data/waves.js';
import { RANKS, HERO_UNLOCK_TIME } from '../shared/profile.js';
import { RARITIES, SLOT_NAMES, rollItem, sanitizeGear, itemPrice, lordDrop } from '../shared/items.js';
import { SPR, TINTS, walkFrame, idleFrame } from '../engine/sprites.js';
import { sfx, playMusic, playJingle, stopMusic, cutToMusic } from '../engine/audio.js';
import { ARRIVAL, LOW_HP, CARD_END } from './arrival.js';
import { ULT_LAUNCH, RECEIPT, compact, ultBlow } from './ultimate.js';
import { WARN, eventWords, sideWord, RECORDS, RECORD_GRACE } from './events.js';
import { view } from '../engine/view.js';
import { input, padKey } from '../engine/input.js';
import { rand, pick, chance, TAU, clamp, damp, weighted, mulberry32, hash2, ease } from '../engine/util.js';
import { Player, ULT_DURATION, FURY, COOLDOWN_FLOOR } from './player.js';
import { rangerPose } from './ranger-animation.js';
import { faceAlong } from './facing.js';
import { Weapon, aimAt } from './weapons.js';
import { Enemy, makeEnemyPool, drawNightEdge } from './enemies.js';
import { maskHorde, maskBosses, keepHorde, putHorde } from './horde-over.js';
import { Pickup } from './pickups.js';
import { Particles, PC, P } from './particles.js';
import { Numbers } from './numbers.js';
import { Lighting } from './lighting.js';
import { SpatialGrid } from './grid.js';
import { jostle, CROWD } from './crowd.js';
import { Spawner } from './spawner.js';
import { Forest } from './forest.js';
import { Weather } from './weather.js';
import { Dungeon, cryptLords, cryptLook } from './dungeon.js';
import { Hud, SHRINE_COLORS, SHRINE_INFO } from './hud.js';
import { releaseProjectile } from './projectiles.js';
import { explode, Ring, Beam, Whirl, ArrowRain, ShadowDance, Meteor, Sanctum, Overgrowth, Frenzy, Purge, FRENZY } from './effects.js';
import { shadowSprite, glow, splatSprite, vignette, groundRing } from './fxsprites.js';
import { Minion } from './minions.js';
import { Hints } from './hints.js';

const tmp = [];
// How far behind the hero coins and potions in the forest last (a few screens).
const PICKUP_FAR = 1400;
// How hard the hero's blows throw a foe back: px/s per point of a blow's kb, before the foe's
// own weight and resistance. A third of the old 75 since 15 October 2026 (the user's call).
export const KNOCKBACK = 25;
// How long each big beat holds every screen back, in real seconds (Game.moment): a boss's fall
// (its 1.1 s slow motion and flash), a crypt lord's (0.8 s), a revive's.
export const MOMENT = { boss: 1.3, lord: 1, revive: 1.1, levelup: 0.25 };
// A Dungeon Run floor's guardian leaves one piece of gear, always (27 October 2026: the Dungeon
// gave none, so a hero was better built in Survival). It rolls as a crypt lord's would at this
// minute and depth, floor by floor: the first as by the start at 5:00, the last floor's as three
// crypts out at dawn. Luck plays no part (shared/items.js rarityOdds), as with the lords.
export const GUARDIAN_GEAR = [{ minute: 5, depth: 1 }, { minute: 10, depth: 2 }, { minute: 15, depth: 3 }];
// The levels whose level-up is a milestone, with a stamp and a stinger of its own (LevelUpOverlay).
export const MILESTONES = [10, 25, 50, 100];
// The most banners on screen at once.
export const BANNERS_MOST = 2;
// The hero's fall, in real seconds from the killing blow (onPlayerDeath): the music stops; the
// world slows and drains to grey and dark over `drain`; he flashes white for `flash` and tips
// over in `fall`, still in colour; "Slain by …" fades in from `name` (Hud); the results at `end`.
export const DEATH = { drain: 1, flash: 0.12, fall: 0.45, name: 1.1, end: 2.8 };
// A boss still standing at dawn (the Lich, outlasted) burns away in sight over `boss` s, where it
// had vanished at random like any foe (the 27 October 2026 review, D15; burnBoss).
export const DAWN_BURN = { boss: 2.5 };
// The options' FLASHES: SOFT (27 October 2026): no white flash over the screen or a boss's bar
// brighter than this, crits in one steady gold, no white pulse.
export const FLASH_SOFT = 0.2;
// The combo (28 October 2026, the 27 October review's C7): kills with no lull of `hold` seconds of
// the world's time between them (Game.update). The HUD shows it from `show` kills, on every
// difficulty; its four named tiers (CARNAGE!, MASSACRE!, ANNIHILATION!, GODLIKE!) come at `tiers`
// on Veteran, and on another difficulty at those times its horde over Veteran's (data/difficulty.js
// spawn, a Nightmare's NIGHTMARE.more again) to the power `bend`: late in a thick night the combo
// runs on unbroken (the casino review), so its tiers rise with the horde, but a thin one breaks
// between kills, so not by as much (an estimate to tune). Presentation only: a combo pays no gold or
// experience ("the grind is by design").
export const COMBO = { hold: 2, show: 10, tiers: [50, 100, 200, 500], bend: 0.5 };
// The tiers as a run of this difficulty has them, each rounded to 5 and clear of COMBO.show and of
// the one below (Normal 20/35/70/175, Elite 70/140/285/705, an Elite Nightmare 120/245/490/1225).
// The Cursed Skulls are left out: the tiers stay put through the run.
export function comboTiers(diff, nightmare = false) {
  const crowd = (diff.spawn / VETERAN.spawn) * (nightmare ? NIGHTMARE.more : 1);
  return COMBO.tiers.map((n, i) => Math.max(COMBO.show + 5 * (i + 1), Math.round((n * crowd ** COMBO.bend) / 5) * 5));
}
// A combo of n's tier: -1 below COMBO.show (not shown), 0 shown (COMBO), 1-4 the named tiers.
export function comboTier(tiers, n) {
  if (n < COMBO.show) return -1;
  let k = 0;
  while (k < tiers.length && n >= tiers[k]) k++;
  return k;
}
// Going into a crypt is meant: the hero stands on its steps (CRYPT_STEPS: half as wide, how far
// below the door) pushing up for CRYPT_PUSH seconds, half a second, while a prompt fills over the
// door (Hud.drawCryptDoor); stepping off or letting go starts over.
export const CRYPT_STEPS = { w: 9, below: 9 };
export const CRYPT_PUSH = 0.5;

// A crypt's name, by its crossroads (key 'i,j'). One that wears the Undercroft's look
// (dungeon.js cryptLook) is an Undercroft.
export function cryptName(key) {
  const [a, b] = key.split(',').map(Number);
  const kind = cryptLook(key) === 'undercroft' ? 'Undercroft' : CRYPT_KIND[Math.floor(hash2(a, b, 41) * CRYPT_KIND.length)];
  return `${kind} of ${CRYPT_OF[Math.floor(hash2(a, b, 42) * CRYPT_OF.length)]}`;
}

// Whether a card is one of the fillers a level-up falls back on once fewer upgrades are left than
// it offers (data/passives.js FILLERS). With nothing else left a level-up shows just these, and
// the player may tick ALWAYS on one: the run's level-ups then take it unseen (Game.autoPick).
export const isFiller = (c) => FILLER_IDS.includes(c.type);

// What a card weighs in the pool a level-up and a chest draw from (Game.upgradePool): a weapon
// he holds grows (held), a new weapon (fresh), the hero's own signature weapons, held or new
// (signature: the owner's, 27 October 2026), a relic he holds grows (relic, times its own weight),
// a new relic (freshRelic, likewise), and that new relic again if it is the partner of a weapon he
// holds that hasn't evolved (partner: the owner's, 27 October 2026; silent, no card says so).
export const CARD_WEIGHT = { held: 3, fresh: 1, signature: 6, relic: 2, freshRelic: 0.55, partner: 2.5 };
// The owner's (27 October 2026): a level-up screen after SIGNATURE_PITY screens in a row without
// one of the hero's own signature weapons offers one for certain (Game.sureSignature).
export const SIGNATURE_PITY = 2;

// The hero is always found: a ring on the ground in his own colour (HEROES color), softly
// pulsing, turning red under a third of his health, drawn again over the scene when something
// stands in front of him (a foe, a minion, a boss); and he himself is drawn last, over everything
// of the world (Game.drawHero): the owner's (27 October 2026) "Some attacks, like lighthouse seem
// to cover the hero. Hero must always be on top of everything". No line round him: the owner's
// (20 October 2026) "hero has an outline that is too bright. Undo that bright outline, we dont
// need it because the hero is visible since its always in center".
export const HERO_MARK = { rx: 9, ry: 4, low: 0.3, hurt: '#e43b44' };


// A foe the hero's weapons may pick out, to aim, cast or chain at (nearestEnemy, nearestEnemies,
// enemiesOnScreen): alive, no prop (a barrel or a crate breaks only to what happens to hit it),
// and not still rising out of the ground. A monster that rises (def.rise) is passed over for the
// first 0.45 s of its 0.75 s rise, while spawnT is above 0.3; every other one fades in within a
// quarter second and is never passed over. A blow that lands where one rises still hurts it.
export const targetable = (e) => !e.dead && !e.prop && e.spawnT <= 0.3;

// On a Dungeon Run floor a foe may stand in the rock (Dungeon.throughWalls), where the hero's shots
// break on the wall's face (projectiles.js, Dungeon.solid): it seems this much farther (squared px)
// to his weapons' aim, taken only when no foe on open ground is in reach.
const IN_ROCK = 1e12;

// The ultimates laid over the world rather than about the hero: Overgrowth's vines and the foes
// they hold, the Arrow Rain's storm. A change of world (a crypt's door, the stairs, a faint) ends
// them (Game.clearTransient); those about him (persistent effects) go with him.
const WORLD_ULTS = new Set(['overgrowth', 'arrowstorm']);

// Game.dropSpots: how far apart two drops lie, side by side or one above the other, and where the
// second goes from the first when neither way is open (a tile on, any way).
const DROP_GAP = 10;
const DROP_SIDES = [[DROP_GAP, 0], [0, DROP_GAP]];
const DROP_ON = [[16, 0], [-16, 0], [0, 16], [0, -16]];

// What each broken barrel, crate, urn or lantern leaves, by weight: at plain luck the weights
// are the odds, and every one holds something. The user's (16 October 2026): "one third of boxes
// have potions, one third has rage powerup, one tenth has a magnet, and the rest have gold" or
// the rarer finds. So a third a potion, a third a fury orb, a tenth a Scroll of Gathering, and
// of the 23% left gold the most (a fifth of all), now and then an elixir or a Frost Rune, and
// a Holy Relic half as often. The horde leaves none of these but the odd coin and fury orb
// (Game.killEnemy). Luck multiplies the rare treasures' weights, so better luck only ever makes
// each of them likelier.
// Seconds a broken box's loot waits before it pops out (breakProp).
export const PROP_HOLD = 0.2;
// The owner's (22 October 2026): "Reduce the number of pickups by half and let it be so that the
// pickups fly a bit away when we break the box, like 2 spots away, perpendicular to hero movement,
// but not far, just so we dont directly pick them up". So half the boxes hold nothing (empty), and
// what one holds hops `toss` px to one side of the way the hero walks (of the way to the box when
// he stands), and waits there to be walked over: the magnet doesn't pull it (Pickup opts.box).
export const PROP_DROP = { empty: 0.5, toss: 26 };

// find (1 a rare find, 2 the rarest) is only how a box tells what it held as it pops out
// (BOX_FIND, Game.boxFind), never the odds: those are the weights alone.
export const PROP_LOOT = [
  { kind: 'potion', w: 1 / 3 },
  { kind: 'fury', w: 1 / 3 },
  { kind: 'magnet', w: 1 / 10, lucky: true },
  { kind: 'coins', w: 0.08 },
  { kind: 'goldpile', w: 0.08 },
  { kind: 'elixir', w: 1 / 75, lucky: true, find: 2 },
  { kind: 'frostrune', w: 1 / 75, lucky: true, find: 1 },
  { kind: 'relic', w: 1 / 150, lucky: true, find: 2 },
  // The timed finds (takePowerUp): a hundredth each; the Treasure Map and the Cursed Skull half as often.
  { kind: 'wildcap', w: 1 / 100, lucky: true, find: 1 },
  { kind: 'ward', w: 1 / 100, lucky: true, find: 1 },
  { kind: 'mirror', w: 1 / 100, lucky: true, find: 1 },
  { kind: 'map', w: 1 / 200, lucky: true, find: 2 },
  { kind: 'skull', w: 1 / 200, lucky: true, find: 2 },
];
// How a rare find out of a broken box tells itself as it pops out (Game.boxFind), by its
// PROP_LOOT find (28 October 2026): 1, a bright two-note chime and a short beam of its own light;
// 2, the rarest, a stronger sting, a taller beam and its name over where it lands (Numbers.text,
// 1.6 s), which shows a Cursed Skull for what it is before he walks onto it. Presentation only.
export const BOX_FIND = [null, { sound: 'find', beam: 0.4, h: 70, tag: false }, { sound: 'treasure', beam: 0.6, h: 110, tag: true }];
const BOX_FIND_NAMES = { elixir: 'Elixir', relic: 'Holy Relic', map: 'Treasure Map', skull: 'Cursed Skull' };

// The timed finds (Game.takePowerUp): [name, what it does, colour, seconds].
export const POWER_UPS = {
  wildcap: ['Wild Mushroom', 'Double damage and +30% speed for 10s', '#e43b44', 10],
  ward: ['Ward Bubble', 'Nothing can touch you for 5s', '#2ce8f5', 5],
  mirror: ['Mirror Shard', 'Every weapon strikes once more for 10s', '#8fb8ff', 10],
};
// The most Cursed Skulls one run can take (Game.cursedSkull).
export const MAX_SKULLS = 3;

// A blow struck by hand on the hero's sprite: its attack from two frames before the blow frame,
// where the blade lands or the shot leaves (delay seconds in): the bow's release, else the
// middle frame. Null for a sprite with no attack.
export function strikeClip(spr) {
  if (!spr.attack || !spr.attack.length || !spr.attackFps) return null;
  const hit = spr.attackRelease ?? Math.floor(spr.attack.length / 2), from = Math.max(0, hit - 2);
  return { from, hit, delay: (hit - from) / spr.attackFps };
}

// What a hand-struck weapon is called on to do, for the crypt's banner (Game.enterCrypt).
const STRIKE_VERB = { bow: 'shoot', fireball: 'cast', meteor: 'cast', daggers: 'throw', summon: 'raise the dead', smite: 'smite', roots: 'call the roots', leap: 'leap', crossbow: 'shoot' };
// How near the hero a blow struck by hand breaks a box (Game.breakBoxes): px past the box's own
// reach (Enemy.hr), so every box on the tiles round him, the corners too, and none two tiles off.
const BOX_REACH = 20;

// Crypt names, picked by the crossroads; the night's minute picks the stone.
const CRYPT_KIND = ['Crypt', 'Barrow', 'Tomb', 'Ossuary', 'Sepulchre', 'Vault'];
// The monsters' blows (Game.dmgScale): DMG_AT_DAWN times as hard at dawn, phase 21 (15:00), along
// a curve; past dawn, as the old rule had them climb. The old rule: gentle, then steeper from phase
// 10, a little less steep from 20 (2.1 times at dawn), and steeper again from 30.
const DAWN_PHASE = 21, DMG_AT_DAWN = 5;
const oldDmgScale = (ph) => 1 + ph * 0.025 + Math.max(0, ph - 10) * 0.06 - Math.max(0, ph - 20) * 0.04 + Math.max(0, ph - 30) * 0.1;

const CRYPT_OF = ['the Hollow King', 'Saint Aldwyn', 'the Nameless', 'Mourn', 'the Weeping Widow', 'Old Bones', 'the Last Knight', 'the Ashen Monk', 'the Drowned', 'Vesper', 'the Pale Hunt', 'Black Ondra'];
// How many of a crypt's lords, in its banners.
const LORDS_WORD = ['No', 'One', 'Two', 'Three', 'Four'];

export class Game {
  constructor(o) {
    this.mode = o.mode;
    // Normal or Veteran (data/difficulty.js), as chosen; Veteran without.
    this.diff = diffFor(o.mode, o.diff);
    this.diffId = this.diff.id;
    // A Nightmare, three times the monsters (data/difficulty.js NIGHTMARE), as chosen: Veteran only,
    // never on Ranked.
    this.nightmare = nightmareFor(o.mode, o.nightmare, this.diffId);
    this.settings = o.settings || {};
    this.seed = Math.floor(Math.random() * 2 ** 31);
    this.duration = this.mode === 's15' ? 15 * 60 : Infinity;
    this.rankedBest = o.rankedBest || 0; // personal best to beat in Ranked
    this.rankIdx = 0;
    this.pace = o.pace || 1; // how much faster than real time the run goes: real time (1) since 21 October 2026
    // How fast the hero and the monsters move (data/difficulty.js moveFor): the bots' too.
    this.move = o.move ?? moveFor(o.mode, this.diffId);
    // How many weapons and relics the hero may carry: the Armory's (shared/profile.js metaBonuses:
    // three of each, one more a rank of Arsenal or Reliquary), unless a run says otherwise (the
    // bots try what a hero can do with fewer slots); never more than MAX_WEAPONS, MAX_RELICS.
    this.maxWeapons = Math.min(MAX_WEAPONS, o.maxWeapons ?? o.meta?.weaponSlots ?? MAX_WEAPONS);
    this.maxRelics = Math.min(MAX_RELICS, o.maxRelics ?? o.meta?.relicSlots ?? MAX_RELICS);
    // What the profile has opened (shared/profile.js openFor): { weapons, relics, ult }, the shared
    // weapons and the relics a run may find and whether the hero's ultimate is open. None given,
    // everything is (the tests, the bots unless they play as a profile).
    this.open = o.open || null;
    // The hero five minutes on the clock bring in, announced as the clock passes them.
    this.unlocks = o.unlocks || null;
    this.time = 0;
    this.floorTime = 0;
    this.frame = 0;
    this.state = 'play'; // play | levelup | chest | item | paused | dying | dawn | descend | travel | over
    this.timeScale = 1;
    this.bossPower = 1;
    this.kills = 0;
    this.gold = 0;
    this.stats = { damage: 0, damageTaken: 0, gold: 0, bosses: 0, chests: 0, maxCombo: 0, minHp: 1, fromBoss: 0, fromMobs: 0, fromShots: 0, bossLog: [], killedBy: null, wounds: {} };
    // wounds: the damage taken by who dealt it, a foe by its kind, a boss by his name, a shot as its
    // shooter's (Player.hurt), for the results' wounds line (ui/gamescreen.js woundLines).
    this.cam = { x: 0, y: 0, S: 4, W: 480, H: 270, pxW: 1920, pxH: 1080 };
    this.trauma = 0;
    this.hurtFlash = 0;
    this.whiteFlash = 0;
    this.calm = 0;
    this.dawn = 0;
    this.magnetAll = 0;
    this.skulls = 0; // Cursed Skulls taken this run (cursedSkull)
    this.combo = 0;
    this.comboT = 0;
    this.comboTier = -1; // the tier it has come to (comboTier), its sting played once each
    this.comboTiers = comboTiers(this.diff, this.nightmare);
    this.comboSting = 0; // the highest tier come to since the last sting, rung at the frame's end (update)
    this.comboRun = 0; // the combos a lull has broken, so the HUD pops the next as it comes up (Hud.drawCombo)
    // A boss's arrival (arrival.js): the stir before it, its name card, the heartbeat while it is
    // nearly done.
    this.stir = null; // { id, t, after }
    this.stirFor = -1; // the night's boss the stir was for (Spawner)
    this.card = null; // { name, title, color, t, letterbox }
    this.bossBeatT = 0;
    // The ultimate as a moment (ultimate.js): its launch, the world's stop, and its run (kills, damage).
    this.ultLaunch = null; // { type, t, started }
    this.ultStop = 0;
    this.ultRun = null; // { type, name, kills, dmg }
    // Events announced (events.js): { ev, from: [dx, dy] of its side, t }.
    this.warnings = [];
    // The profile's records as they stood when the run began, and those this run has broken.
    this.records = o.records || {};
    this.recordsBroken = new Set();
    this.stats.bestUlt = null; // { kills, dmg } the run's best ultimate
    this.gemCombo = 0;
    this.gemComboT = 0;
    // A run of coins, as of gems: its pitch climbs (Pickup.collect, COIN_COMBO).
    this.coinCombo = 0;
    this.coinComboT = 0;
    this.banners = [];
    this.boss = null;
    this.result = null;
    this.pendingLevels = 0;
    // The filler the player chose to take at every level-up once nothing else is left (one of
    // FILLER_IDS, or null: ask). For this run only; the pause menu clears it.
    this.autoPick = null;
    this.phoenixLostAt = null; // the level a Phoenix Heart was spent at this run (Game.relicOffered)
    // A relic's showings for certain (PASSIVES' `sure`) since it last became one to offer:
    // id -> { n: given, lvl: the level whose screen had the last } (Game.sureRelic).
    this.sureShown = new Map();
    // Level-up screens in a row without a signature card (Game.sureSignature): n so far; before,
    // as it stood when the screen of level lvl came (a reroll of it counts from there again).
    this.sigMiss = { lvl: null, before: 0, n: 0 };
    this.banished = new Set(); // 'weapon:axe', 'passive:might': out of the run (the level-up's BANISH)
    this.chestQueue = [];
    this.showMap = false;
    this.floor = 1;
    this.objective = '';
    this.floorName = '';
    this.relocT = 0;
    this.fade = 0;
    this.slowT = 0;
    // The big beat playing now (Game.moment): its kind and the real seconds it still holds.
    this.momentKind = null;
    this.momentT = 0;
    this.hostileCount = 0;
    this.propCount = 0;
    // Gear worn into the run (kept between runs), and the crypts off the forest roads.
    this.gear = sanitizeGear(o.gear);
    this.itemQueue = [];
    this.itemsFound = 0; // pieces of gear dropped this run; the server keeps no more new ones than this
    this.gearThenWin = false; // the Dungeon's last guardian is down: the victory waits for his gear's screen (bossDefeated)
    this.crypts = [];
    this.cleared = new Set();
    this.lost = new Set(); // crypts the hero left before their last lord fell, or fainted in: shut to him
    this.inCrypt = null; // the crypt the hero is in; the night's clock stands still meanwhile
    this.boxBlowAt = null; // when the blow he last struck by hand lands on the boxes about him (breakBoxes)
    this.cryptsOpen = o.crypts !== false; // the balance bots keep to the forest unless asked
    this.cryptDoor = null; // the crypt door whose steps the hero stands on (update)
    this.evoReady = []; // the weapons the next chest opened will evolve (update: evolvable)
    this.milestones = new Set(); // the milestone levels (MILESTONES) whose stinger has played
    // The first run's hints (hints.js), where the game screen asks for them (o.hints), with the
    // way to keep the settings that remember them (o.saveSettings).
    this.hints = o.hints ? new Hints(this, this.settings, o.saveSettings || (() => {})) : null;
    this.cryptTime = 0; // play time spent in crypts, where the night's clock stands still

    this.enemies = [];
    this.minions = [];
    this.projectiles = [];
    this.eshots = [];
    this.pickups = [];
    this.effects = [];
    this.decals = [];
    this.shrines = [];
    this.drawList = [];
    this.topList = []; // bosses and crypt lords, drawn over the rest
    // A headless run (tools/headless.mjs, the bots) skips what only the screen shows: particles
    // and the forest's ground pixels.
    this.headless = !!o.headless;
    this.particles = new Particles(this.headless);
    this.numbers = new Numbers();
    this.numbers.enabled = this.settings.numbers !== false;
    this.numbers.steady = this.settings.softFlash === true;
    this.lighting = new Lighting();
    this.grid = new SpatialGrid();
    this.enemyPool = makeEnemyPool();
    this.hud = new Hud(this);

    this.player = new Player(this, o.hero, o.meta);
    // The owner's (21 October 2026): the special ability locked at first. Until a run with the hero
    // lasts PROGRESS.ultTime his fury orb stays empty and the ultimate key does nothing (Player).
    this.player.ultLocked = !!this.open && !this.open.ult;
    // The numbers keep clear of the hero and of the bosses' bodies (numbers.js).
    this.numbers.hero = this.player;
    this.numbers.bodies = this.topList;
    this.heroCovered = false; // something stands in front of him this frame (drawHero)
    this.freeSrc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    this.spawner = new Spawner(this);

    if (this.mode === 'dungeon') this.enterFloor(this.floor);
    else {
      this.world = new Forest(this, this.seed);
      // The night's weather (weather.js): the forest's only, forecast from the run's seed.
      this.weather = new Weather(this);
      this.player.x = this.world.start.x;
      this.player.y = this.world.start.y;
      playMusic('forest');
    }
    for (const id of startWeapons(HEROES[o.hero])) this.addWeapon(id);
    this.syncCam();
    this.cam.x = this.player.x - this.cam.W / 2;
    this.cam.y = this.player.y - this.cam.H / 2;
    if (this.mode === 's15') this.banner('The Darkwood', 'Survive 15 minutes until dawn', '#8fb8ff', 3.5);
    else if (this.mode === 'ranked') {
      this.banner('The Endless Night', 'No dawn will come. Last as long as you can.', '#f6757a', 3.5);
      this.rankIdx = RANKS.findLastIndex(([min]) => this.time >= min * 60);
      this.bestBeaten = this.rankedBest > 0 && this.time > this.rankedBest;
    }
  }

  // ------------------------------------------------------------- clock --

  get phase() {
    if (this.mode === 'ranked') {
      // The 15-minute night's pace, then a climb that never stops.
      const m = this.time / 60;
      return m <= 15 ? m * 1.4 : 21 + (m - 15) * 0.9;
    }
    if (this.mode === 's15') return (this.time / 60) * 1.4;
    const f = FLOORS[this.floor - 1];
    return Math.min(f.cap, f.phase0 + (this.floorTime / 60) * f.rate);
  }

  // What animation runs by: the night's clock, which keeps going in crypts.
  get clock() {
    return this.time + this.cryptTime;
  }

  // Enemy damage stays gentle early and climbs once the night gets long: one smooth curve to five
  // times at dawn (the owner's, 23 October 2026: "have it more nicely scaled and get to 5X instead
  // of 2.1X"), about x1.1 at 3:00, x1.3 at 5:00, x2.5 at 10:00, x3.3 at 12:00. Past dawn (Ranked)
  // it climbs on as it always did, from those five times (oldDmgScale).
  get dmgScale() {
    const ph = this.phase;
    if (ph <= DAWN_PHASE) return 1 + (DMG_AT_DAWN - 1) * (ph / DAWN_PHASE) ** 2.5;
    return (DMG_AT_DAWN * oldDmgScale(ph)) / oldDmgScale(DAWN_PHASE);
  }

  // ------------------------------------------------------------ floors --

  enterFloor(n) {
    const f = FLOORS[n - 1];
    // What lies about the floor he leaves comes with him (sweepLoot) before the floor is cleared away.
    this.sweepLoot();
    this.floor = n;
    this.floorName = f.name;
    this.floorTime = 0;
    for (const e of this.enemies) this.enemyPool.put(e);
    this.enemies.length = 0;
    this.clearTransient();
    this.pickups.length = 0;
    this.decals.length = 0;
    this.shrines.length = 0;
    this.boss = null;
    this.world = new Dungeon(this, n, (this.seed + n * 7919) >>> 0);
    const start = this.world.start;
    this.player.x = start.x;
    this.player.y = start.y;
    this.cam.x = start.x - this.cam.W / 2;
    this.cam.y = start.y - this.cam.H / 2;
    // His raised dead and the Army of the Dead's knights come down with him, as into a crypt.
    this.gatherMinions();
    this.spawner.resetForFloor(f.phase0);
    this.objective = `Slay ${ENEMIES[f.guardian].name}`;
    this.banner(`Floor ${n}`, f.name, n === 3 ? '#f77622' : '#c0cbdc', 3.2);
    playMusic('dungeon-' + f.theme);
  }

  // ------------------------------------------------------------- items --

  addWeapon(id, level = 1) {
    const src = this.freeSrc.shift() ?? 13;
    const w = new Weapon(this, id, src);
    w.level = WEAPONS[id].evolved ? MAX_WEAPON_LEVEL : level;
    w.recompute();
    this.player.weapons.push(w);
    return w;
  }

  // The developer panel's (dev/panel.js): a weapon taken away (by its id, or the id it evolved
  // from), his own as freely as any other, but never his last (false: he keeps it). Its hit
  // channel is free for the next weapon; its blades or aura go out, and what else of it is about
  // (pools, shots, the raised dead) fades out at once.
  removeWeapon(id) {
    const p = this.player, w = p.weapons.find((x) => x.id === id || WEAPONS[id]?.evo?.into === x.id);
    if (!w || p.weapons.length <= 1) return false;
    p.weapons.splice(p.weapons.indexOf(w), 1);
    if (!p.weapons.some((x) => x.src === w.src) && !this.freeSrc.includes(w.src)) this.freeSrc.push(w.src);
    w.fx = null;
    for (const fx of this.effects) {
      if (fx.w !== w) continue;
      if (fx.persistent) fx.dead = true; // an orbit of blades, an aura
      else if (fx.dur > fx.t + 0.4) fx.dur = fx.t + 0.4; // a pool, as one that runs out
    }
    for (const s of this.projectiles) {
      if (s.w !== w) continue;
      s.onLand = null; // a flask in the air breaks on nothing
      s.life = Math.min(s.life, 0.15);
    }
    for (const m of this.minions) if (m.w === w) m.life = Math.min(m.life, 0.6);
    return true;
  }

  // The developer panel's: the night's clock set to any second, and all that runs by it with it.
  // The horde comes from that minute's pocket by itself (phase); timed swarms and bosses whose
  // time has passed count as done, and those still to come, after a jump back too, wait for
  // theirs: none comes on the jump itself. A Dungeon floor's clock moves as far; Ranked's rank and
  // best are as they would be. The game's own clock (clock: hit cooldowns, animations) runs on
  // unbroken, so nothing waits out a jump back.
  setTime(seconds) {
    const t = Math.max(0, seconds), d = t - this.time, sp = this.spawner;
    this.time = t;
    this.cryptTime -= d;
    if (this.mode === 'dungeon') this.floorTime = Math.max(0, this.floorTime + d);
    const ph = this.phase, from = this.mode === 'dungeon' ? FLOORS[this.floor - 1].phase0 + 1.5 : 0;
    sp.eventIdx = sp.events.findIndex((e) => e.at > ph && e.at >= from);
    if (sp.eventIdx < 0) sp.eventIdx = sp.events.length;
    sp.loopAt = 0;
    sp.rewarn();
    if (this.mode === 'ranked') {
      sp.bossIdx = Math.floor(t / RANKED_BOSS_EVERY);
      this.rankIdx = RANKS.findLastIndex(([min]) => t >= min * 60);
      this.bestBeaten = this.rankedBest > 0 && t > this.rankedBest;
    } else if (SURVIVAL_BOSSES[this.mode]) {
      const bosses = SURVIVAL_BOSSES[this.mode];
      sp.bossIdx = 0;
      while (sp.bossIdx < bosses.length && bosses[sp.bossIdx].at <= t) sp.bossIdx++;
    }
    return t;
  }

  addPassive(id, rank = 1) {
    this.player.passives.set(id, rank);
    this.player.recompute();
  }

  ownsWeapon(id) {
    return this.player.weapons.some((w) => w.id === id || (w.def.evolved && WEAPONS[id].evo && WEAPONS[id].evo.into === w.id));
  }

  // Everything a level-up card or a chest can still give, each with its weight (CARD_WEIGHT): a
  // weapon he holds grows (3); a new weapon while a slot is free (1: the hero's own signature and
  // those shared by all, never another class's, weaponsFor); the hero's own signatures, held or
  // new, 6; a relic he holds grows (twice its weight); a new relic while a slot is free (about
  // half its weight, two and a half times that for the partner of a weapon he holds that hasn't
  // evolved, silent: no card says so; the Phoenix Heart only when relicOffered says so). Empty
  // once the whole build is maxed, and it stays so: an evolution adds nothing to choose. (Only a
  // Phoenix Heart spent frees a slot again.) Nothing banished comes back (the level-up's BANISH),
  // at a level-up or in a chest.
  upgradePool() {
    const p = this.player;
    const pool = [];
    const out = (type, id) => this.banished.has(type + ':' + id);
    const sig = (id) => p.hero.unique.includes(id);
    for (const w of p.weapons) {
      if (!w.maxed && !out('weapon', w.id)) pool.push({ type: 'weapon', id: w.id, level: w.level + 1, weight: sig(w.id) ? CARD_WEIGHT.signature : CARD_WEIGHT.held });
    }
    if (p.weapons.length < this.maxWeapons) {
      for (const id of weaponsFor(p.hero)) if (this.weaponOpen(id) && !this.ownsWeapon(id) && !out('weapon', id)) pool.push({ type: 'weapon', id, level: 1, isNew: true, weight: sig(id) ? CARD_WEIGHT.signature : CARD_WEIGHT.fresh });
    }
    for (const [id, rank] of p.passives) {
      if (rank < PASSIVES[id].max && !out('passive', id)) pool.push({ type: 'passive', id, level: rank + 1, weight: (PASSIVES[id].weight || 1) * CARD_WEIGHT.relic });
    }
    if (p.passives.size < this.maxRelics) {
      const partner = (id) => p.weapons.some((w) => !w.evolved && w.def.evo?.with === id);
      for (const id of PASSIVE_IDS) {
        if (!p.passives.has(id) && this.relicOpen(id) && this.relicOffered(id) && !out('passive', id)) {
          pool.push({ type: 'passive', id, level: 1, isNew: true, weight: (PASSIVES[id].weight || 1) * CARD_WEIGHT.freshRelic * (partner(id) ? CARD_WEIGHT.partner : 1) });
        }
      }
    }
    return pool;
  }

  // Whether the profile has opened a weapon (the hero's own signatures always are) or a relic
  // (open, shared/profile.js openFor): nothing locked is ever offered, at a level-up or in a chest.
  weaponOpen(id) {
    return !this.open || this.player.hero.unique.includes(id) || this.open.weapons.includes(id);
  }

  relicOpen(id) {
    return !this.open || this.open.relics.includes(id);
  }

  // Whether the player knows what a weapon evolves with: the owner's (27 October 2026), not until
  // a run before has made its evolution (the profile's open.evos, shared/profile.js knownEvos).
  // With no profile's open (the tests, the bots) every evolution is known.
  evoKnown(id) {
    const evo = WEAPONS[id]?.evo;
    return !!evo && (!this.open?.evos || this.open.evos.includes(evo.into));
  }

  // What a weapon's evolution waits on, as the cards and the pause screen tell it, or null for
  // one with none: { state: 'unknown' } while evoKnown says no, else { relic, state }: 'owned'
  // (held; a Phoenix Heart held, which evolves any, is owned for all), 'open' (it may still
  // come), or blocked this run: 'locked' (the profile hasn't opened it), 'banished', or 'full'
  // (no relic slot free).
  evoState(id) {
    const evo = WEAPONS[id]?.evo, p = this.player;
    if (!evo) return null;
    const any = [...p.passives.keys()].find((r) => PASSIVES[r].evolvesAny);
    if (any && !p.passives.has(evo.with)) return { relic: any, state: 'owned' };
    if (!this.evoKnown(id)) return { state: 'unknown' };
    const r = evo.with;
    const state = p.passives.has(r) ? 'owned' : !this.relicOpen(r) ? 'locked' : this.banished.has('passive:' + r) ? 'banished' : p.passives.size >= this.maxRelics ? 'full' : 'open';
    return { relic: r, state };
  }

  // Whether a relic he doesn't hold may be offered. The Phoenix Heart (afterSignature) only once
  // one of the hero's own signature weapons has evolved, and, if one was spent this run, not
  // until `again` levels after.
  relicOffered(id) {
    const r = PASSIVES[id], p = this.player;
    if (!r.afterSignature) return true;
    return this.signatureEvolved() && (this.phoenixLostAt == null || p.level - this.phoenixLostAt >= (r.again || 0));
  }

  // Whether one of the hero's own signature weapons has evolved this run (the Knight's opens the
  // Phoenix Heart in the Armory, shared/progress.js).
  signatureEvolved() {
    const p = this.player;
    return p.weapons.some((w) => w.evolved && p.hero.unique.some((u) => WEAPONS[u].evo?.into === w.id));
  }

  // A relic used up (the Phoenix Heart, by the revive it gave): gone, its slot free again, and
  // remembered so it is not offered again too soon (relicOffered). Once it may be offered again,
  // its showings for certain start over (sureRelic).
  spendRelic(id) {
    const p = this.player;
    p.passives.delete(id);
    p.recompute();
    this.phoenixLostAt = p.level;
    this.sureShown.delete(id);
  }

  // Up to n different upgrades, drawn by weight from the pool (upgradePool, or one given).
  drawUpgrades(n, pool = this.upgradePool()) {
    const out = [];
    pool = [...pool];
    while (out.length < n && pool.length) {
      const c = weighted(pool, (x) => x.weight);
      out.push(c);
      pool.splice(pool.indexOf(c), 1);
    }
    return out;
  }

  // A level-up's cards: n drawn from the pool, the fillers after them while there is room (the
  // first of them: Valor, the heal, the gold). With nothing left to draw, every filler, each with
  // its ALWAYS, whatever n (the owner's, 27 October 2026: the Blessing comes in three kinds). A
  // relic due for certain (sureRelic: the Phoenix Heart) and a signature due for certain
  // (sureSignature) are among the n, each in a place of chance. (A chest draws from the plain
  // pool by weight: the showings for certain are the cards'.) A Blessing that would give nothing
  // more (blessingCapped) is not among them.
  levelChoices(n) {
    const pool = this.upgradePool();
    if (!pool.length) return FILLER_IDS.filter((type) => !this.blessingCapped(type)).map((type) => this.filler(type));
    const sure = [this.sureRelic(pool), this.sureSignature(pool)].filter(Boolean);
    const out = this.drawUpgrades(n - sure.length, pool.filter((c) => !sure.includes(c)));
    for (const c of sure) out.splice(Math.floor(Math.random() * (out.length + 1)), 0, c);
    this.signatureSeen(pool, out);
    for (const type of FILLER_IDS) if (out.length < n && !this.blessingCapped(type)) out.push(this.filler(type));
    return out;
  }

  // The owner's (2026-10-20): the Phoenix Heart "should be available as soon as it is legal on the
  // very next level up. Then on the one after that, and then only if randomly selected." A relic
  // with `sure` (PASSIVES) is on the first `sure` level-up screens at which it can be offered (in
  // the pool: legal, a slot free, not banished), then only by its weight; spent, it starts over
  // (spendRelic). The screen is told by its level, so a reroll of the same level
  // keeps it among the new cards and spends no showing. Its card from `pool`, or null.
  sureRelic(pool) {
    const lvl = this.player.level - this.pendingLevels + 1;
    for (const c of pool) {
      const sure = c.type === 'passive' && c.isNew && PASSIVES[c.id].sure;
      if (!sure) continue;
      const s = this.sureShown.get(c.id) || { n: 0, lvl: null };
      if (s.lvl === lvl) return c;
      if (s.n >= sure) continue;
      this.sureShown.set(c.id, { n: s.n + 1, lvl });
      return c;
    }
    return null;
  }

  // A signature card due for certain (SIGNATURE_PITY screens in a row without one): drawn by
  // weight among the hero's own in the pool, or null. The screen is told by its level, as
  // sureRelic's: a reroll of it is the same screen. A maxed or banished signature isn't in the
  // pool, so it is never forced.
  sureSignature(pool) {
    const lvl = this.player.level - this.pendingLevels + 1, s = this.sigMiss;
    if (s.lvl !== lvl) {
      s.lvl = lvl;
      s.before = s.n;
    }
    const mine = pool.filter((c) => c.type === 'weapon' && this.player.hero.unique.includes(c.id));
    return s.before >= SIGNATURE_PITY && mine.length ? weighted(mine, (x) => x.weight) : null;
  }

  // After a screen is drawn: its run of screens without a signature card ends, or grows (with
  // none left to offer, none was missed).
  signatureSeen(pool, out) {
    const s = this.sigMiss, mine = (c) => c.type === 'weapon' && this.player.hero.unique.includes(c.id);
    s.n = !pool.some(mine) || out.some(mine) ? 0 : s.before + 1;
  }

  // BANISH: a weapon or relic out of the run for good, never offered again, at a level-up or in a
  // chest (upgradePool). A filler can't be banished. False when it wasn't.
  banish(c) {
    if (!c || (c.type !== 'weapon' && c.type !== 'passive')) return false;
    this.banished.add(c.type + ':' + c.id);
    return true;
  }

  // A card in the place of one banished: drawn by weight from the pool, less the cards still on
  // the screen (shown); else a filler not there yet (and not a Blessing capped); else none.
  redrawCard(shown) {
    const on = (c) => shown.some((s) => s.type === c.type && s.id === c.id);
    const pool = this.upgradePool().filter((c) => !on(c));
    if (pool.length) return weighted(pool, (x) => x.weight);
    for (const type of FILLER_IDS) if (!shown.some((s) => s.type === type) && !this.blessingCapped(type)) return this.filler(type);
    return null;
  }

  // A filler card: a heal of 35%; gold that grows with the night and with the hero's greed, as
  // every coin he picks up does; else a Blessing, of Valor, Haste or Reach (data/passives.js
  // BLESSING), Valor for any other and for one that would give nothing more (blessingCapped).
  filler(type) {
    if (type === 'heal') return { type, value: 0.35 };
    if (type === 'gold') return { type, value: Math.max(1, Math.round(30 * (1 + this.phase / 10) * this.player.greed)) };
    return { type: FILLERS[type]?.count && !this.blessingCapped(type) ? type : 'bless' };
  }

  // Whether a Blessing would give nothing more (27 October 2026): Haste once his cooldowns are at
  // the floor every cooldown has (COOLDOWN_FLOOR), Reach once taken BLESSING.reachMost times.
  // Valor, and any other card, never is. A capped one leaves the level-up's fillers and a
  // chest's, and an ALWAYS on it turns to Valor (resolveAutoLevels), so no level is spent on it.
  blessingCapped(type) {
    const p = this.player;
    if (type === 'haste') return p.cooldown <= COOLDOWN_FLOOR + 1e-9;
    if (type === 'reach') return p.reaches >= BLESSING.reachMost;
    return false;
  }

  choiceCount() {
    return Math.random() < 0.06 + (this.player.luck - 1) * 0.6 ? 4 : 3;
  }

  // Gives what a card (or a chest's draw) holds. quiet: no sound or number of its own, for
  // whatever shows it instead (the chest screen, a burst of auto-picked levels).
  applyChoice(c, quiet = false) {
    const p = this.player;
    if (c.type === 'weapon') {
      const w = p.weapons.find((x) => x.id === c.id);
      if (w) w.levelUp();
      else if (!this.ownsWeapon(c.id) && p.weapons.length < this.maxWeapons && this.weaponOpen(c.id)) this.addWeapon(c.id);
    } else if (c.type === 'passive') {
      if (!p.passives.has(c.id) && (!this.relicOpen(c.id) || p.passives.size >= this.maxRelics)) return;
      p.passives.set(c.id, (p.passives.get(c.id) || 0) + 1);
      p.recompute();
    } else if (c.type === 'gold') {
      this.gold += c.value;
      this.stats.gold += c.value;
      if (!quiet) sfx('coin');
    } else if (c.type === 'heal') {
      p.heal(p.maxHp * c.value, quiet);
    } else if (FILLERS[c.type]?.count) {
      p[FILLERS[c.type].count]++; // a Blessing, of Valor, Haste or Reach
      p.recompute();
    }
  }

  // Level-ups that need no screen: once nothing but the fillers is left and the player ticked
  // ALWAYS on one (autoPick), every waiting level takes it at once, with no pause. Every place
  // that would open the level-up screen asks here first (the game screen, the screen itself for
  // the next waiting level, the bots, the developer panel). The levels' own sound and beam
  // played as they came (queueLevelUp); one line over the hero says what the lot gave
  // ("Blessing ×17", "Haste ×4", "+35% health", "+41 gold"). True when no level-up is left waiting.
  resolveAutoLevels() {
    const n = this.pendingLevels;
    if (n <= 0) return true;
    if (!this.autoReady()) return false;
    const p = this.player;
    let gold = 0, heal = 0;
    for (let i = 0; i < n; i++) {
      // ALWAYS on a Blessing that gives nothing more is ALWAYS on Valor from then on, as the
      // pause menu then names it (blessingCapped).
      if (this.blessingCapped(this.autoPick)) this.autoPick = 'bless';
      const c = this.filler(this.autoPick);
      this.applyChoice(c, true);
      if (c.type === 'gold') gold += c.value;
      else if (c.type === 'heal') heal += c.value * p.healMul; // as Player.heal gives it (the Paladin's Devotion)
    }
    this.pendingLevels = 0;
    const [text, style, sound] =
      this.autoPick === 'gold' ? [`+${gold} gold`, 'gold', 'coin']
      : this.autoPick === 'heal' ? [`+${Math.min(100, Math.round(heal * 100))}% health`, 'heal', 'heal']
      : [`${FILLERS[this.autoPick].tally} ×${p[FILLERS[this.autoPick].count]}`, 'holy', 'pick'];
    this.numbers.text(p.x, p.y - 22, text, style);
    sfx(sound);
    // A milestone among the levels taken unseen: its banner and stinger (else the screen has them).
    for (let lvl = p.level - n + 1; lvl <= p.level; lvl++) if (this.milestoneDue(lvl)) this.banner('MILESTONE', `LEVEL ${lvl}`, '#fee761');
    return true;
  }

  // Whether a level is a milestone whose stinger has not played yet this run; plays it if so.
  milestoneDue(lvl) {
    if (!MILESTONES.includes(lvl) || this.milestones.has(lvl)) return false;
    this.milestones.add(lvl);
    sfx('milestone');
    return true;
  }

  // Whether nothing is left to offer but the fillers: the whole build maxed, as it stays unless a
  // Phoenix Heart is spent (its slot free again). A level-up then shows every filler alone,
  // each with its ALWAYS (LevelUpOverlay).
  fillersOnly() {
    return !this.upgradePool().length;
  }

  // Whether a level-up waiting is taken unseen now (resolveAutoLevels, the developer panel): the
  // player ticked ALWAYS on a filler (autoPick), nothing else is left to offer, and the level-up
  // screen isn't open (its cards come first).
  autoReady() {
    return this.state !== 'levelup' && FILLER_IDS.includes(this.autoPick) && this.fillersOnly();
  }

  queueLevelUp() {
    this.pendingLevels++;
    // The beam plays out before the cards: a short lead-in (MOMENT.levelup).
    // (A level the auto-pick takes unseen needs none.)
    if (!this.autoReady()) this.moment('levelup', MOMENT.levelup);
    sfx('levelup');
    const p = this.player;
    this.effects.push(new Beam(this, p.x, p.y, '#2ce8f5', 0.8, 120));
    this.effects.push(new Ring(this, p.x, p.y, 4, 60, 0.5, '#2ce8f5', true, 2));
    this.particles.burst(p.x, p.y - 8, 4, 30, [PC.c, PC.w, PC.U], 100, 0.8, 1, P.GLOW | P.FADE, { vz: 80 });
    this.pushback(p.x, p.y, 50, 160);
  }

  // The weapon a card completes an evolution of (its id, or null): a level that brings a weapon to
  // the top while its relic is held (or the Phoenix Heart), or a new relic that pairs with a weapon
  // already at the top (the Phoenix Heart with any). The next chest then evolves it (evolvable).
  completesEvolution(c) {
    const p = this.player;
    const anyRelic = [...p.passives.keys()].some((id) => PASSIVES[id].evolvesAny);
    if (c.type === 'weapon' && !c.isNew && c.level >= MAX_WEAPON_LEVEL) {
      const w = p.weapons.find((x) => x.id === c.id);
      if (w && !w.evolved && w.def.evo && (anyRelic || p.passives.has(w.def.evo.with))) return w.def.evo.into;
    }
    if (c.type === 'passive' && c.isNew) {
      for (const w of p.weapons) {
        if (w.evolved || !w.def.evo || w.level < MAX_WEAPON_LEVEL) continue;
        if (w.def.evo.with === c.id || PASSIVES[c.id].evolvesAny) return w.def.evo.into;
      }
    }
    return null;
  }

  // Weapons a chest may evolve: at their top level, with their relic held, or with any relic that
  // evolves them all (the Phoenix Heart, which evolving doesn't use up).
  evolvable() {
    const p = this.player;
    const any = [...p.passives.keys()].some((id) => PASSIVES[id].evolvesAny);
    return p.weapons.filter((w) => !w.evolved && w.level >= MAX_WEAPON_LEVEL && w.def.evo && (any || p.passives.has(w.def.evo.with)));
  }

  // What a chest holds, given at once: an evolution if one is ready, then draws from the
  // level-up cards' own pool, and gold. The owner's (22 October 2026): "chests can never give new
  // stuff. Only upgrade existing. If there is no existing to upgrade (all are maxxed out) boxes
  // give out somehting random only then". So a draw is a level of a weapon or relic the hero has;
  // only when none is left to raise is it anything of the pool (a new weapon or relic, while a
  // slot is free). With the pool empty, it is the run's auto-pick if the player chose one, else a
  // Blessing of Valor. The gold is the hero's at once too. The chest screen only shows them.
  rollChest(kind = 'elite') {
    const p = this.player;
    const items = [];
    const ev = this.evolvable();
    if (ev.length) {
      const w = ev[0];
      items.push({ type: 'evolve', w, id: w.def.evo.into });
      w.evolve();
    }
    let n = 1;
    // Luck makes a chest richer, but not a crypt lord's ('lord', drawn as a champion's at plain luck).
    const r = Math.random() / (kind === 'lord' ? 1 : p.luck);
    if (kind === 'boss') n = r < 0.35 ? 5 : 3;
    else n = r < 0.04 ? 5 : r < 0.2 ? 3 : 1;
    if (items.length) n = Math.max(0, n - 2);
    for (let i = 0; i < n; i++) {
      // The plain pool by weight: a Phoenix Heart due for certain is due on a level-up's cards
      // (levelChoices), not in a chest; nothing banished.
      const pool = this.upgradePool(), held = pool.filter((c) => !c.isNew);
      const u = this.drawUpgrades(1, held.length ? held : pool)[0] || this.filler(this.autoPick || 'bless');
      items.push(u);
      // Apply as we go so later draws see the new levels.
      this.applyChoice(u, true);
      if (u.type === 'weapon') u.level = p.weapons.find((w) => w.id === u.id).level;
      else if (u.type === 'passive') u.level = p.passives.get(u.id);
      else if (FILLERS[u.type]?.count) u.level = p[FILLERS[u.type].count];
    }
    const gold = this.chestGold(kind);
    this.gold += gold;
    this.stats.gold += gold;
    return { items, gold };
  }

  // A chest's gold: more as the night goes on, three times as much in a boss's.
  chestGold(kind) {
    return Math.round(rand(15, 40) * (1 + this.phase / 10) * (kind === 'boss' ? 3 : 1));
  }

  openChest(opts = {}) {
    this.chestQueue.push(opts.kind || 'elite');
    this.stats.chests++;
  }

  // The director of the big beats. A boss or a crypt lord slain, a revive: for `secs` of real
  // time no level-up, chest or gear screen opens (GameScreen.frame asks momentRunning), so the
  // slow motion, the flash and the fall play out in full; then what waited opens in its usual
  // order, level-ups, then chests, then gear. A longer beat over a shorter one extends it.
  moment(kind, secs) {
    if (secs <= this.momentT) return;
    this.momentT = secs;
    this.momentKind = kind;
  }

  get momentRunning() {
    return this.momentT > 0;
  }

  // ----------------------------------------------------------- enemies --

  // Past HORDE_CAP.most foes a new one comes only in the place of one far off-screen
  // (recycleFar), else not at all; a boss comes all the same (o.always). What is sent at the hero
  // (o.sent, o.summoned) may take any off-screen, and so may the steady horde while the screen is
  // all but empty (o.room, Spawner.update). Props standing don't count (a dungeon floor's
  // stand all floor long), and a new one comes whatever the count, taking no foe's place (spawnProp).
  spawnEnemy(type, x, y, o = {}) {
    if (this.enemies.length - this.propCount > HORDE_CAP.most && !o.always && !this.recycleFar(o.sent || o.summoned || o.room)) return null;
    const e = this.enemyPool.get().init(this, type, x, y, o);
    this.enemies.push(e);
    const cap = this.horde;
    if (cap && cap.frame === this.frame && !e.prop) cap.live++;
    return e;
  }

  spawnProp(type, x, y) {
    const spot = this.world.freeSpot(x, y);
    if (!spot) return null;
    // Not instant: it fades in over the usual 0.25 s (Enemy spawnT), so a site coming in view doesn't pop in.
    return this.spawnEnemy(type, spot.x, spot.y, { always: true });
  }

  spawnBoss(id, x, y, o = {}) {
    const mul = this.mode === 'dungeon' ? [0.65, 1.3, 4][this.floor - 1] : monsterHp(this.phase, this.mode) * 0.8;
    const e = this.spawnEnemy(id, x, y, { hpMul: this.diff.hp * mul, instant: true, always: true, ...o });
    if (!e) return null;
    // The Crypt's guardian is the gentler first boss: cramped rooms make every blow count.
    this.bossPower = this.mode === 'dungeon' && this.floor === 1 ? 0.75 : 1;
    if (!o.sleeping) this.bossIntro(e);
    return e;
  }

  // Something stirs in the dark: the edges darken and a rumble rises before a night's boss.
  bossStir(id) {
    this.stir = { id, t: 0, after: 0 };
    sfx('rumble');
  }

  // A boss comes (arrival.js). A night's boss or a Dungeon Run's guardian: the horde near it
  // recoils (never the hero), the music cuts and the boss piece slams in, its name card with the
  // letterbox, then its bar slams in (Hud.drawBoss, at e.slamAt). Ranked's returns the same,
  // lighter: no letterbox, no cut, the bar sooner. A crypt's lord waking: its banner as before, a
  // short sting and the bar slamming in at once.
  bossIntro(e) {
    e.sleeping = false;
    this.boss = e;
    e.introT = 0;
    e.slammed = false;
    this.stats.bossLog.push({ id: e.lord ? 'lord ' + e.type : e.type, t: Math.round(this.time), rt: this.clock, lvl: this.player.level, hp: Math.round(e.maxHp) });
    // A crypt's lord is a champion: its colour is its affix's.
    const color = e.lord ? (e.mod ? e.mod.color : '#b55088') : e.def.color;
    if (this.stir) this.stir.done = true;
    if (e.lord) {
      this.banner(e.name, `Lord of the ${this.inCrypt ? this.inCrypt.name : 'crypt'}`, color, 3);
      e.slamAt = 0;
      sfx('lordsting');
      playMusic('boss');
    } else {
      const full = this.mode !== 'ranked';
      this.card = { name: e.def.name, title: e.def.title, color, t: 0, letterbox: full };
      e.slamAt = full ? ARRIVAL.slamAt : ARRIVAL.lightSlamAt;
      this.pushback(e.x, e.y, ARRIVAL.recoilR, ARRIVAL.recoilF);
      sfx('boss');
      if (full) cutToMusic('boss', ARRIVAL.gap);
      else playMusic('boss');
    }
    this.shake(0.5);
    this.effects.push(new Ring(this, e.x, e.y, 6, e.lord ? 140 : ARRIVAL.recoilR + 20, 0.9, color, false, 3));
  }

  summonRing(type, n, R, o = {}) {
    const p = this.player;
    // Summoned round the hero by a boss: they know where he is (Enemy.aware), and at the cap they
    // come in full and are never the ones that make room (recycleFar).
    const st = { hpMul: monsterHp(this.phase, this.mode) * this.diff.hp, aware: true, summoned: true, ...o };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.2, 0.2);
      const spot = this.world.freeSpot(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85);
      if (spot) this.spawnEnemy(type, spot.x, spot.y, st);
    }
  }

  hitEnemy(e, dmg, o = {}) {
    // Once the hero has fallen nothing he left behind (a pool, a blade, a minion) fells anything more.
    if (e.dead || this.player.dead) return 0;
    // A sealed guardian (dungeon.js) neither wakes to a blow nor loses health to it: what the blow
    // would have dealt, worked out below as for any foe, thaws its seal instead (Dungeon.strikeSeal).
    const sealed = e.sealed;
    if (!sealed) {
      if (e.sleeping) this.bossIntro(e);
      if (e.dormant) this.wakePack(e);
      // Hit, it knows where the hero is, in a crypt too (Enemy.aware).
      e.aware = true;
    }
    const p = this.player;
    let d = dmg, crit = false;
    // A blow already reckoned in full (o.raw: a Hex curse's payoff, Enemy.update, a share of blows
    // that each had the hero's strength, his crits and the foe's brand and stone in them) is dealt as
    // it is: put through all that again it counted twice (27 October 2026).
    if (!o.raw) {
      d *= p.might;
      if (p.buff('fury')) d *= 1.6;
      if (p.buff('wildcap')) d *= 2;
      // The ultimate's blows grow with nothing but its own strength: no 4% a level more, the
      // owner's "Levelups do not make hero stronger" (21 October 2026; player.js LEVEL_MIGHT), 27 October 2026.
      // Smite's brand on the foe; the Witch Hunter's Inquisition on the strong, the Berserker's
      // Bloodrage, the Druid's Grove Warden.
      if (e.brandT > 0) d *= 1 + e.brandK;
      const hs = p.hero.stats;
      if (hs.bane && (e.boss || e.lord || e.elite)) d *= 1 + hs.bane;
      if (p.huntBane && (e.boss || e.lord || e.elite)) d *= 1 + p.huntBane; // Hunter's Mark
      if (p.torc) d *= 1 + p.torc * (1 - clamp(p.hp / p.maxHp, 0, 1)); // Berserker's Torc
      if (hs.rage) d *= 1 + hs.rage.might * p.rage;
      if (hs.grove && p.inGrove) d *= 1 + hs.grove;
      // A tick of damage over time (Enemy.addDot) never crits.
      if (!o.noCrit) {
        crit = Math.random() < p.crit + (o.crit || 0);
        if (crit) d *= p.critMult + (o.critDmg || 0);
      }
      d *= rand(0.9, 1.1);
      if (e.mod && e.mod.id === 'stone') d *= 0.65;
      if (e.freezeT > 0 && o.shatter) d *= 1.5;
    }
    d = Math.max(1, Math.round(d));
    if (sealed) {
      this.world.strikeSeal(e, d);
      return 0;
    }
    // A blow on a boss, a lord or a champion charges the orb by the share of its health it takes
    // (FURY.hit); the ultimate's own blows don't (o.ult, or o.noFury for Shadow Dance's blades,
    // which keep their own strength).
    if (!o.ult && !o.noFury && (e.boss || e.lord || e.elite)) p.furyHit(e, Math.min(d, e.hp));
    e.hp -= d;
    if (!e.prop) e.flash = 0.09;
    else e.flash = 0.06;
    const kbRes = e.def.kbRes || 0;
    // Champions don't get pushed around: a blow stops them for a moment instead.
    if (e.elite) {
      if (o.kb) e.stagger();
    } else if (o.kb && kbRes < 1 && !e.prop) {
      const k = (o.kb * KNOCKBACK * (1 - kbRes) * (1 + p.knock)) / Math.sqrt(e.def.mass || 1); // Ram's Horn
      e.kx += (o.kx || 0) * k;
      e.ky += (o.ky || 0) * k;
    }
    if (o.slow) {
      e.slowT = Math.max(e.slowT, o.slowT || 1.5);
      e.slowF = Math.max(e.slowF, o.slow);
    }
    if (o.freeze && !e.boss && !e.prop && (o.freeze >= 1 || Math.random() < o.freeze)) {
      if (e.freezeT <= 0) this.particles.burst(e.x, e.y - 6, 4, 6, [PC.w, PC.c], 40, 0.4, 1, P.GLOW | P.FADE, {});
      e.freezeT = Math.max(e.freezeT, 1.6);
      e.shatterOnDeath = o.shatter;
    }
    if (this.numbers.enabled && !o.noNum) this.numbers.add(e.x, e.y - e.h * 0.85, d, crit ? 'crit' : o.type || 'normal', e);
    // Dealt: the health it took, not the overkill.
    const took = Math.min(d, Math.max(0, e.hp + d));
    if (e.curseT > 0) e.curseRec += took; // Hex Hourglass's curse (Enemy.curse)
    if (o.w) o.w.dmgDealt += took;
    if (this.ultRun && ultBlow(o)) this.ultRun.dmg += took;
    this.stats.damage += took;
    if (p.fang > 0) p.fangHeal(took); // Vampire Fang
    // Ember Heart: a blow (not a burn's own tick) may set the foe alight for 3 s at a quarter of the blow
    // as the weapon struck it (dmg) a second: each tick puts the hero's strength in (hitEnemy), as for
    // every other burn, so the blow's own is not in it twice (27 October 2026).
    if (p.ember > 0 && !o.noCrit && !e.prop && Math.random() < p.ember) e.addDot('fire', dmg * 0.25, 3, o.w);
    const pan = clamp((e.x - p.x) / 200, -1, 1);
    if (crit) sfx('crit', { pitch: rand(0.9, 1.1), pan });
    else sfx('hit', { pitch: rand(0.8, 1.2), pan });
    if (crit) this.particles.burst(e.x, e.y - e.h * 0.5, 4, 5, [PC.Y, PC.w], 90, 0.25, 1, P.GLOW | P.FADE, {});
    if (e.hp <= 0) this.killEnemy(e, o);
    return d;
  }

  killEnemy(e, o = {}) {
    if (e.dead || this.player.dead) return; // no kill counts once the hero has fallen
    e.dead = true;
    const fr = e.spr.frames[e.frameIndex()];
    if (e.prop) {
      this.breakProp(e, fr);
      return;
    }
    const p = this.player;
    this.kills++;
    if (this.ultRun && ultBlow(o)) this.ultRun.kills++;
    this.combo++;
    this.comboT = COMBO.hold;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    // A new tier: its sting, a step higher each (the HUD pops the count and the tier's word). It
    // rings at the frame's end (update), once, for the highest tier the frame came to (28 October
    // 2026): a Holy Relic or an ultimate taking the count past two tiers at once rang the lower's
    // sting, the higher's dropped by its limit, while the HUD popped the higher's word.
    const tier = comboTier(this.comboTiers, this.combo);
    if (tier > this.comboTier) {
      if (tier > 0) this.comboSting = tier;
      this.comboTier = tier;
    }
    p.furyKill(e);
    // Kills that heal: the Paladin's Devotion (a little, KILL_HEAL), Red Frenzy's (FRENZY.heal each).
    if (p.hero.stats.killHeal) p.leech(p.hero.stats.killHeal);
    if (p.ult && p.ult.type === 'frenzy') p.heal(p.maxHp * FRENZY.heal, true);
    if (o.w) {
      o.w.kills++;
      if (o.w.onKill) o.w.onKill(e);
    }
    // Weapons that watch every foe fall, whoever struck it (Weapon.onFoeDeath).
    for (const w of p.weapons) w.onFoeDeath(e);
    this.deathFx(e, fr);
    // Loot.
    if (e.xp > 0) this.dropGem(e.x, e.y, e.xp);
    const luck = p.luck;
    if (e.type === 'thief') {
      for (let i = 0; i < 26; i++) this.addPickup('coin', e.x, e.y, 2);
      this.addPickup('goldpile', e.x, e.y, 40);
      if (chance(0.5)) this.addPickup('chest', e.x, e.y, 0, { kind: 'elite' });
      this.banner('Thief slain!', 'Its stolen gold is yours', '#feae34', 1.8);
    } else if (e.boss) {
      this.bossDefeated(e);
    } else if (e.lord) {
      this.lordDefeated(e);
    } else if (e.elite) {
      // A champion leaves its chest and gold. Potions, scrolls, relics and runes come only
      // from what the hero breaks (PROP_LOOT).
      this.addPickup('chest', e.x, e.y, 0, { kind: 'elite' });
      this.addPickup('goldpile', e.x + rand(-8, 8), e.y, Math.round(rand(10, 20)));
      this.effects.push(new Ring(this, e.x, e.y, 4, 34, 0.45, '#fee761', false, 2)); // a gold ring where it fell, its chest on the way
    } else {
      // The horde leaves its soul gems and, now and then, a coin or a fury orb: nothing else.
      const r = Math.random();
      if (r < 0.014 * luck) this.addPickup('coin', e.x, e.y, 1);
      else if (r < (0.014 + FURY.hordeOrb * Math.max(p.killShare, FURY.orbFloor)) * luck) this.addPickup('fury', e.x, e.y);
    }
    if (e.def.split && !o.noSplit) {
      for (let i = 0; i < e.def.splitN; i++) {
        // Its experience as its own: a Normal horde slime's slimelets pay NORMAL_XP times theirs,
        // a champion's or a crypt's as ever (Enemy xpMul).
        const c = this.spawnEnemy(e.def.split, e.x + rand(-5, 5), e.y + rand(-5, 5), { hpMul: monsterHp(this.phase, this.mode) * this.diff.hp, instant: true, aware: true, xpMul: e.xpMul });
        if (c) {
          c.kx = rand(-60, 60);
          c.ky = rand(-60, 60);
        }
      }
    }
    if (e.shatterOnDeath && e.freezeT > 0) {
      explode(this, e.x, e.y, 22, 16 * (1 + this.phase * 0.05), null, 'frost', { kb: 1 });
    }
  }

  deathFx(e, fr) {
    const ps = this.particles;
    const pix = fr.pixels;
    const S = e.scale;
    const ox = e.x - (fr.w * S) / 2, oy = e.y - (fr.h - e.spr.below) * S;
    // The sprite shatters into its own pixels.
    const step = pix.length > 300 ? 3 : 1;
    const flip = e.face < 0;
    for (let i = 0, n = ps.off ? 0 : pix.length; i < n; i += 3 * step) {
      if (Math.random() > 0.45 * ps.budget) continue;
      const px = flip ? fr.w - 1 - pix[i] : pix[i];
      const x = ox + px * S, y = oy + pix[i + 1] * S;
      const dx = x - e.x, dy = y - (e.y - fr.h * S * 0.5);
      ps.emit(e.x + dx * 0.2, e.y, (e.y - y) + 1, dx * rand(3, 7) + rand(-20, 20), dy * rand(1, 3) + rand(-10, 10), rand(40, 110), rand(0.6, 1.3), S > 1.2 ? 2 : 1, pix[i + 2], P.GROUND | P.FADE, 1.5, 300);
    }
    const D = e.def.death;
    const pan = clamp((e.x - this.player.x) / 200, -1, 1);
    switch (D) {
      case 'blood':
        ps.burst(e.x, e.y, 6, 8, [PC.r, PC.R, PC.x], 70, 0.7, 1, P.GROUND | P.FADE, { vz: 70, grav: 280 });
        if (chance(0.6)) this.addDecal('blood', e.x, e.y, 3 + e.r * 0.6);
        sfx('die', { pitch: rand(0.8, 1.1), pan });
        break;
      case 'bones':
        ps.burst(e.x, e.y, 8, 6, [PC.z, PC.Z, PC.T], 80, 1, 1, P.GROUND | P.FADE, { vz: 100, grav: 300 });
        if (chance(0.5)) this.addDecal('bones', e.x, e.y, 4);
        sfx('bones', { pitch: rand(0.9, 1.2), pan });
        break;
      case 'goo':
        ps.burst(e.x, e.y, 4, 10, [PC.L, PC.l, PC.e], 70, 0.7, 1, P.GROUND | P.FADE, { vz: 60, grav: 250 });
        this.addDecal('goo', e.x, e.y, 3 + e.r * 0.6);
        sfx('goo', { pitch: rand(0.9, 1.3), pan });
        break;
      case 'ecto':
        ps.burst(e.x, e.y - 6, 4, 14, [PC.c, PC.G, PC.w], 40, 1, 2, P.GLOW | P.FADE | P.SHRINK, { vz: 40, drag: 2 });
        sfx('die', { pitch: 1.5, pan });
        break;
      case 'ash':
        ps.burst(e.x, e.y - 4, 4, 12, [PC.o, PC.y, PC.O], 80, 0.8, 1, P.GLOW | P.FADE, { vz: 60 });
        ps.burst(e.x, e.y, 4, 6, [PC.a, PC.A], 40, 1.2, 2, P.FADE, { vz: 30 });
        this.addDecal('ash', e.x, e.y, 4);
        sfx('die', { pitch: 0.7, pan });
        break;
      case 'dark':
        ps.burst(e.x, e.y - 4, 4, 10, [PC.P, PC.p, PC.q], 70, 0.7, 1, P.GLOW | P.FADE, { vz: 50 });
        if (chance(0.5)) this.addDecal('dark', e.x, e.y, 3 + e.r * 0.5);
        sfx('die', { pitch: rand(1, 1.3), pan });
        break;
      case 'gold':
        ps.burst(e.x, e.y - 4, 6, 24, [PC.Y, PC.y, PC.w], 120, 1, 1, P.GLOW | P.FADE, { vz: 90 });
        sfx('chest');
        break;
      default:
        sfx('die', { pan });
    }
    if (e.elite || e.boss || e.def.mass >= 3) {
      sfx('bigdie', { pan });
      if (e.boss) this.shake(0.8);
    }
  }

  breakProp(e, fr) {
    const ps = this.particles;
    const cols = e.type === 'urn' ? [PC.d, PC.O, PC.B] : e.type === 'lantern' ? [PC.b, PC.y, PC.N] : [PC.b, PC.B, PC.t, PC.m];
    ps.burst(e.x, e.y - 5, 6, 16, cols, 90, 1.1, 1, P.GROUND | P.FADE, { vz: 110, grav: 300 });
    sfx('wood', { pan: clamp((e.x - this.player.x) / 200, -1, 1) });
    this.addDecal('wood', e.x, e.y, 3);
    if (chance(PROP_DROP.empty)) return;
    const p = this.player, luck = p.luck;
    const { kind, find } = weighted(PROP_LOOT, (d) => (d.lucky ? d.w * luck : d.w));
    // The owner's (22 October 2026): what a box held pops out a moment after it breaks (PROP_HOLD),
    // not under the hero's feet the instant he walks into it, and to one side (PROP_DROP).
    const [tx, ty] = this.propToss(e);
    // A rare find tells itself as it pops out (find, boxFind); no more dice for it.
    const drop = (k, value, spread = 0) => this.addPickup(k, e.x, e.y, value, { hold: PROP_HOLD, box: true, find, toss: [tx + rand(-spread, spread), ty + rand(-spread, spread)] });
    if (kind === 'coins') {
      const n = Math.floor(rand(1, 4));
      for (let i = 0; i < n; i++) drop('coin', 1, 5);
    } else if (kind === 'goldpile') drop('goldpile', Math.round(rand(5, 12)));
    else if (kind) drop(kind, 1);
  }

  // A rare find out of a box, just popped out (Pickup.update, PROP_HOLD after the break): a beam of
  // its own light where the box stood and its sound; the rarest also its name over where it lands,
  // the Cursed Skull's in red and its sting lower. The odds are PROP_LOOT's as ever.
  boxFind(pk) {
    const F = BOX_FIND[pk.opts.find];
    if (!F) return;
    this.effects.push(new Beam(this, pk.x, pk.y, pk.glowColor, F.beam, F.h, pk.lightKey || 'holy'));
    const skull = pk.kind === 'skull';
    sfx(F.sound, { pan: clamp((pk.x - this.player.x) / 200, -1, 1), pitch: skull ? 0.75 : 1 });
    const name = BOX_FIND_NAMES[pk.kind];
    if (F.tag && name) {
      const [dx, dy] = pk.opts.toss || [0, 0];
      this.numbers.text(pk.x + dx, pk.y + dy - 14, name, skull ? 'bleed' : 'holy');
    }
  }

  // Where a broken box's loot lands, from the box: PROP_DROP.toss px across the way the hero walks,
  // to either side; standing, across the way from him to the box.
  propToss(e) {
    const p = this.player;
    let ax = p.vx, ay = p.vy;
    if (Math.hypot(ax, ay) < 5) {
      ax = e.x - p.x;
      ay = e.y - p.y;
    }
    let m = Math.hypot(ax, ay);
    if (m < 1e-3) {
      const a = rand(TAU);
      ax = Math.cos(a);
      ay = Math.sin(a);
      m = 1;
    }
    const side = chance(0.5) ? 1 : -1, d = (PROP_DROP.toss * side) / m;
    return [-ay * d, ax * d];
  }

  bossDefeated(e) {
    const p = this.player;
    this.stats.bosses++;
    const log = this.stats.bossLog.find((b) => b.id === e.type && b.kill === undefined);
    if (log) log.kill = Math.round(this.time - log.t);
    // A boss whose time came before the last one fell is still fighting: the bar and music go to it.
    const next = this.enemies.find((o) => o !== e && o.boss && !o.dead && !o.sleeping);
    if (this.boss === e) this.boss = next || null;
    this.moment('boss', MOMENT.boss);
    // His name card, if it is still up, goes first (CARD_END); his banner waits for it.
    if (this.card && this.card.end == null) this.card.end = this.card.t;
    this.timeScale = 0.35;
    this.slowT = 1.1;
    this.whiteFlash = 0.6;
    sfx('bossslain');
    explode(this, e.x, e.y - 8, 60, 0, null, 'fire');
    for (let i = 0; i < 6; i++) {
      this.effects.push(new Meteor(this, null, e.x + rand(-30, 30), e.y + rand(-24, 24), 20, 0, 0.1 + i * 0.12, { fall: 0.01 }));
    }
    // A Dungeon Run floor's guardian is gone for good: its body goes back to the pool and walks
    // again as another foe, which its minimap dot and marker would follow (Dungeon.drawMap, marker).
    if (this.world.guardian === e) this.world.guardian = null;
    // Its loot and its stairs together on the open floor nearest where it fell: a Dungeon Run
    // floor's guardian comes through the walls (Dungeon.throughWalls) and may fall deep in one.
    const at = this.world.floorNear ? this.world.floorNear(e.x, e.y) : e;
    this.addPickup('chest', at.x, at.y, 0, { kind: 'boss' });
    for (let i = 0; i < 18; i++) this.addPickup('coin', at.x, at.y, 2);
    this.addPickup('goldpile', at.x, at.y, 60);
    this.addPickup('elixir', at.x + rand(-10, 10), at.y + rand(-10, 10));
    // A Dungeon Run guardian's piece of gear (GUARDIAN_GEAR): straight to its screen, which opens
    // once the moment has played out, rather than on the ground.
    let gear = null;
    if (this.mode === 'dungeon') {
      gear = rollItem(mulberry32((Math.random() * 2 ** 32) >>> 0), GUARDIAN_GEAR[this.floor - 1]);
      this.itemsFound++;
      this.itemQueue.push(gear);
    }
    const R = gear && RARITIES[gear.rarity];
    this.banner(`${e.def.name} is slain!`, gear ? `${R.name} ${SLOT_NAMES[gear.slot].toLowerCase()} won` : e.def.title, gear ? R.color : '#fee761', 3.2);
    if (this.mode === 'dungeon') {
      if (this.floor < 3) {
        this.world.openStairs(at.x, at.y);
        this.objective = 'Descend the stairs';
      } else {
        // The victory waits for his gear's screen to close (update), and from this blow on nothing
        // fells the hero: the shots and touches still to come this frame are spent on his grace.
        this.objective = '';
        this.gearThenWin = true;
        this.player.invuln = Math.max(this.player.invuln, 0.2);
      }
    }
    if (next) return;
    // The music eases back to the night's over a few seconds.
    if (this.mode !== 'dungeon' || this.floor < 3) playMusic(this.mode === 'dungeon' ? 'dungeon-' + FLOORS[this.floor - 1].theme : 'forest', { fade: ARRIVAL.easeBack });
  }

  // A crypt's lord has fallen, and leaves its coins, its gold and, rolled lord by lord (LORD_DROPS
  // in shared/items.js), a piece of gear, a champion's chest or both. The last one's fall breaks
  // the wall open on a way out (Dungeon.lightWayOut). Luck plays no part in any of it: the drop,
  // the gear's rarity (the night's minute and the crypt's depth only) and the chest ('lord',
  // Game.rollChest) are plain chance.
  lordDefeated(e) {
    const c = this.inCrypt;
    const left = this.world.lordsLeft ? this.world.lordsLeft().length : 0;
    // The last one down: cleared now, however the hero leaves, so no more lords (and no more gear)
    // from going back in.
    if (c && !left) this.cleared.add(c.key);
    this.stats.bosses++;
    const log = this.stats.bossLog.find((b) => b.id === 'lord ' + e.type && b.kill === undefined);
    if (log) log.kill = Math.round(this.clock - log.rt);
    // Another lord still fighting: the bar and the music go to it.
    const next = this.enemies.find((o) => o !== e && o.lord && !o.dead && !o.sleeping);
    if (this.boss === e) this.boss = next || null;
    this.moment('lord', MOMENT.lord);
    this.timeScale = 0.4;
    this.slowT = 0.8;
    this.whiteFlash = 0.4;
    sfx('lordslain');
    explode(this, e.x, e.y - 8, 40, 0, null, 'fire');
    for (let i = 0; i < 10; i++) this.addPickup('coin', e.x, e.y, 2);
    this.addPickup('goldpile', e.x, e.y, left ? 20 : 30);
    const drop = lordDrop(Math.random());
    // Gear and a chest lie side by side, so neither hides the other, and neither in a wall.
    const [gearAt, chestAt] = drop.item && drop.chest ? this.dropSpots(e.x, e.y) : [e, e];
    let it = null;
    if (drop.item) {
      it = rollItem(mulberry32((Math.random() * 2 ** 32) >>> 0), { minute: c ? c.minute : minuteOf(this.phase), depth: c ? c.depth : 1 });
      this.itemsFound++;
      this.addPickup('item', gearAt.x, gearAt.y, 0, { item: it });
    }
    if (drop.chest) this.addPickup('chest', chestAt.x, chestAt.y, 0, { kind: 'lord' });
    const R = it && RARITIES[it.rarity];
    const what = it ? `${R.name} ${SLOT_NAMES[it.slot].toLowerCase()}${drop.chest ? ' and a chest' : ''}` : 'A chest';
    const rest = left ? `. ${LORDS_WORD[left] || left} ${left === 1 ? 'lord remains' : 'lords remain'}` : '';
    this.banner(`${e.name} is slain!`, `${what} dropped${rest}`, it ? R.color : '#feae34', 3.2);
    if (!left && this.world.lightWayOut) this.world.lightWayOut();
    if (!next) playMusic('crypt');
  }

  descend() {
    if (this.state !== 'play') return;
    this.state = 'descend';
    this.descendT = 0;
    sfx('descend');
  }

  // ------------------------------------------------------------ crypts --

  // What the prompt over a crypt's door says (Hud.drawCryptDoor): its name, how many lords sleep
  // below were he to go in now, and how far his push up its steps has come (0 to 1).
  doorInfo(d) {
    return { name: cryptName(d.key), lords: cryptLords(minuteOf(this.phase), d.depth), k: clamp((d.push || 0) / CRYPT_PUSH, 0, 1) };
  }

  // Every hero fights by hand below: in a crypt only his own weapon (the knight's sword, the
  // ranger's bow, ...) fights, and only when the player strikes (X or either Shift; a pad's
  // shoulder buttons; a second finger on a touch screen).
  get caveStrike() {
    return !!this.inCrypt;
  }

  // The hero's own weapon, or what it evolved into.
  mainWeapon() {
    const id = this.player.hero.weapon, into = WEAPONS[id].evo?.into;
    return this.player.weapons.find((w) => w.id === id || w.id === into) || null;
  }

  // A blow struck by the player (Player.update reads the keys), once the weapon is ready: at
  // the nearest foe in its reach (Weapon.reach; a sword on the move, only one ahead of him, as
  // he keeps facing the way he walks), else straight ahead, or for a shot the way he last
  // walked. The sprite plays its attack, and the blade lands or the shot leaves on its blow
  // frame (strikeClip).
  strike() {
    const p = this.player, w = this.mainWeapon();
    if (!w || w.cd > 0 || p.dead) return false;
    const melee = w.def.kind === 'sword';
    const t = this.nearestEnemy(p.x, p.y, w.reach, melee && p.moving ? (e) => (e.x - p.x) * p.face >= 0 : null);
    const ang = aimAt(p, t, !melee ? p.aim : p.face < 0 ? Math.PI : 0);
    const delay = strikeClip(SPR[p.hero.sprite])?.delay ?? 0;
    p.strike(ang, this.clock);
    w.strike(ang, delay, t);
    this.boxBlowAt = this.clock + delay;
    return true;
  }

  // The owner's (27 October 2026): a blow struck by hand breaks every box about the hero as it
  // lands (BOX_REACH), all round him and whatever his weapon, so one beside him needs no aiming
  // at. Never one through a wall.
  breakBoxes() {
    this.boxBlowAt = null;
    const p = this.player;
    if (p.dead) return;
    for (const e of this.enemies) {
      if (e.dead || !e.prop) continue;
      const R = BOX_REACH + e.hr;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= R * R && this.world.lineOfSight(p.x, p.y, e.x, e.y)) this.killEnemy(e);
    }
  }

  // Whether foe e shows (its body, shadow, glow, name and bar): in a crypt only while the hero sees
  // it, with no wall between them (the owner's, 27 October 2026), a box always; anywhere else, all.
  inView(e) {
    return !this.inCrypt || e.prop || this.world.lineOfSight(this.player.x, this.player.y, e.x, e.y);
  }

  // The hero walks into a crypt: the forest is set aside exactly as it was, and the night's clock stops.
  enterCrypt(d) {
    if (this.inCrypt || this.state !== 'play') return;
    this.stir = null;
    // A boss's stir cut short comes again once he is back (Spawner: stirFor), the night's clock
    // having stood still below.
    this.stirFor = -1;
    this.travel(() => {
      const p = this.player;
      this.forestState = {
        world: this.world, enemies: this.enemies, pickups: this.pickups, decals: this.decals, shrines: this.shrines,
        crypts: this.crypts, boss: this.boss, objective: this.objective, door: d, warnings: this.warnings,
      };
      // An event told just before he went down waits with the forest (Spawner.update sleeps in a
      // crypt): left here, its edge arrow pointed off into the rock all the while.
      this.warnings = [];
      this.enemies = [];
      this.pickups = [];
      this.decals = [];
      this.shrines = [];
      this.crypts = [];
      this.boss = null;
      this.clearTransient();
      const [a, b] = d.key.split(',').map(Number);
      const minute = minuteOf(this.phase);
      const name = cryptName(d.key);
      this.inCrypt = { key: d.key, depth: d.depth, minute, name, hp: p.hp };
      const theme = minute < 6 ? 'crypt' : minute < 11 ? 'catacombs' : 'inferno';
      new Dungeon(this, 1, (this.seed ^ Math.floor(hash2(a, b, 43) * 2 ** 31)) >>> 0, { name, theme, look: cryptLook(d.key), lords: cryptLords(minute, d.depth) });
      p.x = this.world.start.x;
      p.y = this.world.start.y;
      this.gatherMinions();
      this.snapCam();
      this.objective = '';
      this.banner(name, `Here the night stands still. ${LORDS_WORD[this.world.lordCount] || this.world.lordCount} lords sleep below`, '#b55088', 3.2);
      // The other weapons wait outside: their blades and auras go out until he is back.
      const main = this.mainWeapon();
      for (const w of p.weapons) {
        if (w === main || !w.fx) continue;
        w.fx.dead = true;
        w.fx = null;
        w.cd = Math.min(w.cd, 0.35);
      }
      const keys = input.device === 'pad' ? padKey('RB') : input.device === 'touch' ? 'Tap a second finger' : 'X or Shift';
      this.banner(`Your ${main ? main.def.name : 'weapon'} alone`, `${keys} to ${STRIKE_VERB[main?.def.kind] || 'strike'}`, '#feae34', 4);
      playMusic('crypt');
    });
  }

  // Back up to the forest, by the stairs he came down (whenever he likes) or the hole the last
  // lord's fall broke, out by the crypt's door. It is sealed behind him for the rest of the run:
  // cleared once its last lord has fallen, else shut with its lords below (lost).
  leaveCrypt() {
    if (!this.inCrypt || this.state !== 'play') return;
    this.travel(() => {
      // What lies about comes along, a lord's loot too if a shot still in flight as he turned to go
      // felled it during the fade (sweepLoot).
      this.sweepLoot();
      const c = this.inCrypt, door = this.backToForest(), done = this.cleared.has(c.key);
      if (!done) this.lost.add(c.key);
      door.sealed = true;
      this.banner('The crypt is sealed', done ? 'The night goes on' : 'Its lords sleep on below', done ? '#63c74d' : '#8b9bb4', 2.4);
    });
  }

  // Felled in a crypt, the hero only faints (Player.hurt): the dark takes him, and he wakes by
  // its door in the forest at half his health (or what he went in with, if less: a crypt is no
  // place to heal), the crypt shut to him for good. Whatever lay about in it is lost.
  faint() {
    if (!this.inCrypt || this.state !== 'play') return;
    this.state = 'faint';
    this.faintT = 0;
    this.timeScale = 0.3;
    const p = this.player;
    this.particles.burst(p.x, p.y - 8, 6, 20, [PC.w, PC.G], 40, 2, 2, P.GLOW | P.FADE, { vz: 50, drag: 1 });
    this.shake(0.8);
    sfx('descend');
  }

  wake() {
    const c = this.inCrypt, door = this.backToForest(), p = this.player;
    this.lost.add(c.key);
    door.sealed = true;
    p.hp = Math.max(1, Math.min(Math.round(c.hp), Math.round(p.maxHp * 0.5)));
    p.invuln = 3;
    this.timeScale = 1;
    this.banner('You wake by the crypt', 'Its door will not open again', '#8b9bb4', 3.2);
  }

  // The forest as the hero left it, him by the crypt's door; returns the door.
  backToForest() {
    const f = this.forestState, p = this.player;
    for (const e of this.enemies) this.enemyPool.put(e);
    this.clearTransient();
    this.world = f.world;
    this.enemies = f.enemies;
    this.pickups = f.pickups;
    this.decals = f.decals;
    this.shrines = f.shrines;
    this.crypts = f.crypts;
    this.boss = f.boss;
    this.objective = f.objective;
    this.warnings = f.warnings;
    this.forestState = null;
    this.inCrypt = null;
    p.x = f.door.x;
    p.y = f.door.y + 12;
    p.invuln = Math.max(p.invuln, 1.5);
    this.gatherMinions();
    this.snapCam();
    playMusic(this.boss && !this.boss.dead ? 'boss' : 'forest');
    return f.door;
  }

  // Fade out, swap worlds, fade back in.
  travel(go) {
    this.state = 'travel';
    this.travelT = 0;
    this.travelGo = go;
    sfx('descend');
  }

  // What lies about the world he leaves comes along: a crypt's on the way back up, a Dungeon Run
  // floor's on the way down (its guardian's chest and elixir among it, by stairs that open where
  // it fell), and the last floor's when the run is won (finish). Gems as XP (xp false: at the run's
  // end, where they would raise only the level shown), gold as gold, gear and chests to wait their
  // turn (itemQueue, chestQueue), a floor's elixir drunk; a crypt's stays below, a crypt being no
  // place to heal. Nothing else (a potion, a scroll) comes.
  sweepLoot(xp = true) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      if (pk.kind === 'gem') {
        if (xp) p.addXp(pk.value);
      } else if (pk.kind === 'coin' || pk.kind === 'goldpile') {
        // Fortune's double too, as walking over it would give (Pickup.collect).
        const v = Math.max(1, Math.round(pk.value * p.greed * (p.buff('fortune') ? 2 : 1)));
        this.gold += v;
        this.stats.gold += v;
      } else if (pk.kind === 'item') this.itemQueue.push(pk.opts.item);
      else if (pk.kind === 'chest') this.openChest(pk.opts);
      else if (pk.kind === 'elixir' && !this.inCrypt) p.heal(p.maxHp);
      pk.dead = true;
    }
  }

  clearTransient() {
    const p = this.player;
    // An ultimate over the world he leaves ends with it, its receipt next frame (ultReceipt).
    if (p.ult && WORLD_ULTS.has(p.ult.type)) p.ult = null;
    // Leech Chains' (Blood Tether's) hold on foes in the world he leaves: their effects go below,
    // and a chain kept in w.chains would hold its slot until that foe died.
    for (const w of p.weapons) if (w.chains) w.chains = [];
    for (const pr of this.projectiles) releaseProjectile(pr);
    this.projectiles.length = 0;
    this.eshots.length = 0;
    this.effects = this.effects.filter((e) => e.persistent);
    this.particles.clear();
    this.boxBlowAt = null;
  }

  gatherMinions() {
    const p = this.player;
    for (const m of this.minions) {
      m.x = p.x + rand(-12, 12);
      m.y = p.y + rand(-10, 10);
      m.forget(); // the foes it was on are in the world he left
    }
  }

  snapCam() {
    const c = this.cam, p = this.player;
    c.x = p.x - c.W / 2;
    c.y = p.y - 8 - c.H / 2;
  }

  // A crypt's pack wakes together.
  wakePack(e) {
    for (const o of this.enemies) {
      if (o.dormant && o.pack === e.pack) {
        o.dormant = false;
        o.aware = true;
      }
    }
  }

  // Gear from the pickup screen: wear it (selling what it replaces), or sell it, or sell what is worn.
  wearItem(it) {
    const old = this.gear[it.slot];
    if (old) this.earnGold(itemPrice(old));
    this.gear[it.slot] = it;
    this.player.gearChanged();
  }

  sellItem(it) {
    this.earnGold(itemPrice(it));
  }

  sellWorn(slot) {
    const it = this.gear[slot];
    if (!it) return;
    delete this.gear[slot];
    this.earnGold(itemPrice(it));
    this.player.gearChanged();
  }

  earnGold(v) {
    this.gold += v;
    this.stats.gold += v;
    sfx('coin');
  }

  escape(e) {
    e.dead = true;
    this.particles.burst(e.x, e.y - 6, 4, 20, [PC.Y, PC.y, PC.w], 60, 0.8, 1, P.GLOW | P.FADE, { vz: 60 });
    this.banner('The thief escaped...', '', '#8b9bb4', 1.6);
    sfx('teleport');
  }

  // ----------------------------------------------------------- pickups --

  // Two spots side by side for two things dropped at (x, y), both on open floor: DROP_GAP px to
  // either side of it, else above and below it (against a wall), else the open floor nearest it
  // and a spot a tile on from there (in a corner). Anywhere does in the forest, which has no walls.
  dropSpots(x, y) {
    const w = this.world, free = (a, b) => !w.free || w.free(a, b);
    for (const [dx, dy] of DROP_SIDES) {
      if (free(x + dx, y + dy) && free(x - dx, y - dy)) return [{ x: x + dx, y: y + dy }, { x: x - dx, y: y - dy }];
    }
    const a = (w.freeSpot && w.freeSpot(x, y)) || { x, y };
    for (const [dx, dy] of DROP_ON) if (free(a.x + dx, a.y + dy)) return [a, { x: a.x + dx, y: a.y + dy }];
    return [a, a];
  }

  addPickup(kind, x, y, value = 1, opts = {}) {
    // Never inside a wall: whatever falls there starts from the nearest open floor, however deep in
    // it (Dungeon.floorNear: on a Dungeon Run floor a foe falls in the walls it comes through).
    const w = this.world;
    if (w.free && !w.free(x, y)) ({ x, y } = w.floorNear(x, y));
    const pk = new Pickup(this, kind, x, y, value, opts);
    this.pickups.push(pk);
    return pk;
  }

  // At most 380 gems lie about. Past that, the one lying farthest from the hero (in the forest,
  // where gems never fade, often where he fought minutes ago) gives its XP to this new one, which
  // falls where he fights now: XP no longer piles up in a gem he left far behind.
  dropGem(x, y, value) {
    const p = this.player;
    let gems = 0, far = null, farD = -1;
    for (const pk of this.pickups) {
      if (pk.kind !== 'gem' || pk.dead) continue;
      gems++;
      if (pk.pulled) continue; // on its way to him already
      const d = (pk.x - p.x) ** 2 + (pk.y - p.y) ** 2;
      if (d > farD) {
        far = pk;
        farD = d;
      }
    }
    if (gems >= 380 && far) {
      far.dead = true;
      value += far.value;
    }
    this.addPickup('gem', x, y, value);
  }

  // ------------------------------------------------------------ queries --

  // Up to n foes within maxR of (x, y), nearest first. Like the two below, only targetable ones.
  nearestEnemies(x, y, n, maxR) {
    const cands = this.grid.query(x, y, maxR, tmp), rock = this.world.throughWalls ? this.world : null;
    const list = [];
    for (const e of cands) {
      if (!targetable(e)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= maxR * maxR) list.push([rock && rock.solid(e.x, e.y) ? d + IN_ROCK : d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((v) => v[1]);
  }

  // The nearest foe within maxR of (x, y) that filter (if any) takes, or null; on a Dungeon Run
  // floor one in the rock only if none stands in the open (IN_ROCK).
  nearestEnemy(x, y, maxR, filter) {
    const cands = this.grid.query(x, y, maxR, tmp), R2 = maxR * maxR, rock = this.world.throughWalls ? this.world : null;
    let best = null, bd = Infinity;
    for (const e of cands) {
      if (!targetable(e) || (filter && !filter(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d >= R2) continue;
      const k = rock && rock.solid(e.x, e.y) ? d + IN_ROCK : d;
      if (k < bd) {
        bd = k;
        best = e;
      }
    }
    return best;
  }

  // Every foe on screen.
  enemiesOnScreen() {
    const c = this.cam, out = [];
    for (const e of this.enemies) {
      if (!targetable(e)) continue;
      if (e.x > c.x - 8 && e.x < c.x + c.W + 8 && e.y > c.y - 4 && e.y < c.y + c.H + 16) out.push(e);
    }
    return out;
  }

  // ------------------------------------------------------------- juice --

  light(x, y, r, key, i = 1) {
    this.lighting.add(x, y, r, key, i);
  }

  shake(a) {
    if (this.settings.shake === false) return;
    this.trauma = Math.min(1, this.trauma + a);
  }

  // A banner: at most BANNERS_MOST at once (the oldest gives way), and one with the same title
  // takes its twin's place rather than stacking under it.
  banner(title, sub = '', color = '#ffffff', dur = 2.4) {
    const twin = this.banners.findIndex((b) => b.title === title);
    if (twin >= 0) this.banners.splice(twin, 1);
    const b = { title, sub, color, dur, t: 0 };
    this.banners.push(b);
    if (this.banners.length > BANNERS_MOST) this.banners.shift();
    return b;
  }

  // Whether a banner can come up without pushing the oldest off (banner): a first-run hint waits
  // for that (hints.js say).
  get bannerRoom() {
    return this.banners.length < BANNERS_MOST;
  }

  // Whether a first-run hint must wait (hints.js): while an event's warning, the ultimate's cut-in, a
  // boss's name card or the stir before him has the screen, and whenever the battlefield isn't what
  // is shown (a level-up, a chest, a find, the pause, a fall, a crossing). It is neither drawn nor
  // run down meanwhile (Game.fadeReal, Hud.drawBanners): 27 October 2026, a gem's hint ran out
  // unseen under the first level-up's cards, which come a second or two after it, and counted as said.
  get hintsHeld() {
    return this.state !== 'play' || this.warnings.length > 0 || !!this.ultLaunch || !!this.card || !!(this.stir && !this.stir.done);
  }

  addDecal(kind, x, y, r) {
    let img;
    if (kind === 'bones') img = SPR.bonepile.frames[0].c;
    else img = splatSprite(kind, Math.floor(rand(6)), r);
    this.decals.push({ img, x, y, t: 0, life: kind === 'scorch' ? 6 : 14 });
    if (this.decals.length > 240) this.decals.shift();
  }

  pushback(x, y, R, force) {
    const cands = this.grid.query(x, y, R + 10, tmp);
    for (const e of cands) {
      if (e.dead || e.prop || e.boss || e.elite) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const k = (force * (1 - d / R)) / Math.sqrt(e.def.mass || 1);
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    }
  }

  // Rimeheart: the foes within R of (x, y) freeze for t s; a boss, a lord or a champion is only
  // slowed. A frozen foe stands, so it is those chasing him that are held.
  rimeFreeze(x, y, R, t) {
    sfx('freeze');
    this.particles.burst(x, y - 6, 10, 10, [PC.w, PC.c, PC.U], 70, 0.5, 1, P.GLOW | P.FADE, {});
    for (const e of this.grid.foes(x, y, R, tmp)) {
      if (e.dead || e.prop || e.sealed || e.sleeping || e.dormant) continue;
      if (Math.hypot(e.x - x, e.y - y) > R + e.hr) continue;
      if (e.boss || e.lord || e.elite) {
        e.slowT = Math.max(e.slowT, t);
        e.slowF = Math.max(e.slowF, 0.6);
      } else e.freezeT = Math.max(e.freezeT, t);
    }
  }

  holyNova() {
    this.whiteFlash = 0.8;
    sfx('relic');
    this.shake(0.6);
    this.banner('Holy Relic', 'The wicked are purged', '#fee761', 2);
    const p = this.player;
    this.effects.push(new Ring(this, p.x, p.y, 6, 260, 0.8, '#fee761', false, 3));
    // Bosses, crypt lords and champions only take a heavy blow: a relic is no way past them. The
    // blow grows and shrinks with their health (difficulty.js health), so it takes the same share of
    // them on Normal as on Veteran: a flat 200 would all but fell a Normal crypt lord (216).
    for (const e of this.enemiesOnScreen()) {
      if (e.boss || e.elite) this.hitEnemy(e, 200 * this.diff.health, { type: 'holy' });
      else this.killEnemy(e, { noSplit: true });
    }
  }

  // A Wild Mushroom (double damage, +30% speed, 10 s), a Ward Bubble (untouchable, 5 s) or a
  // Mirror Shard (every weapon one more shot, 10 s): a buff on the hero (Player.buffs).
  takePowerUp(kind) {
    const p = this.player;
    const [title, sub, col, t] = POWER_UPS[kind];
    p.addBuff(kind, t);
    if (kind === 'mirror') p.recompute();
    sfx(kind === 'ward' ? 'shrine' : 'pick');
    this.banner(title, sub, col, 1.8);
    this.effects.push(new Ring(this, p.x, p.y, 4, 50, 0.5, col, true));
    this.particles.burst(p.x, p.y - 8, 2, 16, [PC.w, PC.c, PC.Y], 70, 0.6, 1, P.GLOW | P.FADE, { vz: 60 });
  }

  // A Treasure Map: a champion's chest lies a screen or so away in the forest, and the edge
  // arrow (Hud.drawIndicators) leads to it. Underground there is no such place: gold instead.
  treasureMap() {
    const p = this.player;
    sfx('pick');
    if (this.mode === 'dungeon' || this.inCrypt) {
      this.banner('Treasure Map', 'A purse of gold', '#feae34', 1.8);
      this.addPickup('goldpile', p.x, p.y, Math.round(rand(25, 45)));
      return;
    }
    let x = p.x, y = p.y + 330;
    for (let i = 0; i < 24; i++) {
      const a = rand(0, TAU), r = rand(330, 480);
      x = p.x + Math.cos(a) * r;
      y = p.y + Math.sin(a) * r;
      if (!this.world.free || this.world.free(x, y)) break;
    }
    this.addPickup('chest', x, y, 0, { kind: 'elite', pop: false });
    this.banner('Treasure Map', 'Find the chest it marks', '#feae34', 2);
  }

  // A Cursed Skull: from now on a quarter more monsters (spawner.js hordeMore) and half as much
  // gold again (Player.recompute), up to three skulls.
  cursedSkull() {
    const p = this.player;
    sfx('boss');
    this.shake(0.3);
    if (this.skulls >= MAX_SKULLS) {
      this.banner('Cursed Skull', 'The curse can grow no deeper', '#e43b44', 2);
      return;
    }
    this.skulls++;
    p.recompute();
    this.banner('Cursed Skull', `Monsters +${25 * this.skulls}%, gold +${50 * this.skulls}%`, '#e43b44', 2.4);
    this.effects.push(new Ring(this, p.x, p.y, 4, 80, 0.7, '#e43b44', true));
  }

  freezeAll(t) {
    sfx('freeze');
    this.banner('Frost Rune', 'Time itself freezes', '#2ce8f5', 2);
    this.whiteFlash = 0.3;
    for (const e of this.enemies) {
      if (e.prop || e.dead) continue;
      // The strong (bosses, crypt lords, champions) are slowed rather than frozen.
      if (e.boss || e.elite) {
        e.slowT = t;
        e.slowF = 0.6;
      } else e.freezeT = t;
    }
  }

  // The hero rises (Player.hurt): by a relic spent for it (the Phoenix Heart), or a Second Wind.
  revive(relic = null) {
    const p = this.player;
    this.moment('revive', MOMENT.revive);
    this.whiteFlash = 1;
    sfx('revive');
    if (relic) {
      this.banner(`${PASSIVES[relic].name}!`, 'You rise from the ashes', '#f77622', 2.5);
      this.numbers.text(p.x, p.y - 22, `${PASSIVES[relic].name} spent`, 'fire');
    } else this.banner('Second Wind!', 'You rise again', '#feae34', 2.5);
    this.effects.push(new Beam(this, p.x, p.y, '#feae34', 1.5, 160));
    explode(this, p.x, p.y, 90, 120, null, 'holy', { kb: 3 });
  }

  addShrine(x, y, type) {
    const spot = this.world.freeSpot(x, y);
    if (!spot) return;
    this.shrines.push({ x: spot.x, y: spot.y, type, used: false, t: rand(6), spr: SPR.shrine, shrine: true });
  }

  useShrine(s) {
    s.used = true;
    const p = this.player;
    p.addBuff(s.type, 30);
    if (s.type === 'protection') p.heal(p.maxHp * 0.25);
    const [title, sub] = SHRINE_INFO[s.type];
    this.banner(title, sub, SHRINE_COLORS[s.type], 2.6);
    sfx('shrine');
    this.effects.push(new Beam(this, s.x, s.y, SHRINE_COLORS[s.type], 1.2, 140));
    this.effects.push(new Ring(this, p.x, p.y, 4, 50, 0.5, SHRINE_COLORS[s.type], true));
  }

  // ---------------------------------------------------------- ultimate --

  // The press: the world stops for ULT_LAUNCH.stop (the hero and the HUD go on) under the cut-in,
  // with the sound and a low hit; then the ultimate itself (startUlt, from update once the stop ends).
  launchUlt(type) {
    const p = this.player;
    this.ultLaunch = { type, t: 0, started: false };
    this.ultStop = ULT_LAUNCH.stop;
    p.invuln = Math.max(p.invuln, ULT_LAUNCH.stop + 0.1);
    sfx('ult');
  }

  startUlt(type) {
    const p = this.player;
    const dur = ULT_DURATION[type];
    p.ult = { type, t: dur, max: dur, k: 0 };
    // Its own kills and damage, for the live count and the receipt (T3: a shake, no white flash).
    this.ultRun = { type, name: p.hero.ultName, kills: 0, dmg: 0 };
    this.shake(0.4);
    this.effects.push(new Ring(this, p.x, p.y, 4, 90, 0.5, '#f6757a', true, 2));
    if (type === 'whirlwind') this.effects.push(new Whirl(this, dur));
    else if (type === 'arrowstorm') this.effects.push(new ArrowRain(this, dur));
    else if (type === 'shadowdance') {
      this.effects.push(new ShadowDance(this, dur));
      p.invuln = dur;
    } else if (type === 'deadrise') {
      // Army of the Dead: a ring of empowered death knights.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const spot = this.world.freeSpot(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 26);
        if (spot) this.minions.push(new Minion(this, spot.x, spot.y, { dmg: 24, dur: 11 * p.duration * p.summonDur, speed: 1.3, knight: true, burst: true, ult: true }));
      }
      this.effects.push(new Ring(this, p.x, p.y, 6, 110, 0.7, '#9ee562', false, 3));
      this.pushback(p.x, p.y, 70, 260);
    } else if (type === 'sanctum') this.effects.push(new Sanctum(this, dur));
    else if (type === 'overgrowth') this.effects.push(new Overgrowth(this, dur));
    else if (type === 'frenzy') this.effects.push(new Frenzy(this, dur));
    else if (type === 'purge') {
      this.effects.push(new Purge(this, dur));
      // A volley at once: her crossbow is ready as the purge begins.
      const w = this.mainWeapon();
      if (w && w.def.kind === 'crossbow') w.cd = Math.min(w.cd, 0);
    }
  }

  // The ultimate over (and, for the Army of the Dead, its last knight gone; for Arrow Storm and
  // Cataclysm, their last arrow or meteor down): its receipt, once.
  ultReceipt() {
    const r = this.ultRun;
    if (!r || this.player.ult || this.minions.some((m) => m.ult) || this.effects.some((f) => f.ult)) return;
    this.ultRun = null;
    const best = this.stats.bestUlt, beats = !best || r.kills > best.kills || (r.kills === best.kills && r.dmg > best.dmg);
    if (beats) this.stats.bestUlt = { kills: r.kills, dmg: Math.round(r.dmg) };
    this.receipts = (this.receipts || 0) + 1;
    this.banner(`${r.name.toUpperCase()} · ${r.kills} slain · ${compact(r.dmg)} damage`, beats && best ? 'BEST' : '', '#f6757a', RECEIPT);
    sfx('tally', { pitch: 1.5 });
  }

  updateUlt(u, dt) {
    if (u.type !== 'cataclysm') return;
    u.k -= dt;
    while (u.k <= 0 && u.t > 0.3) {
      u.k += 0.12;
      const list = this.enemiesOnScreen();
      const e = list.length ? pick(list) : null;
      const p = this.player;
      const x = e ? e.x : p.x + rand(-150, 150), y = e ? e.y : p.y + rand(-90, 90);
      this.effects.push(new Meteor(this, null, x, y, 34, 55, 0, { fall: 0.45, ult: true }));
    }
  }

  // Ranked: announce each new rank, and the moment the personal best falls.
  rankedMilestones() {
    const next = RANKS[this.rankIdx + 1];
    if (next && this.time >= next[0] * 60) {
      this.rankIdx++;
      this.banner(`Rank: ${next[1]}`, `${next[0]} minutes survived`, '#fee761', 2.6);
      sfx('levelup');
    }
    if (!this.bestBeaten && this.rankedBest > 0 && this.time > this.rankedBest) {
      this.bestBeaten = true;
      this.banner('New personal best!', 'Every second now is a record', '#63c74d', 3);
      sfx('record');
    }
  }

  // Five minutes on the clock bring in the next hero; the profile takes them in when the run ends.
  heroMilestone() {
    if (!this.unlocks || this.time < HERO_UNLOCK_TIME) return;
    const h = HEROES[this.unlocks];
    this.unlocks = null;
    this.banner(`${h.title} unlocked!`, `${h.name} can join your next run`, h.color, 3.5);
    sfx('unlock');
  }

  // -------------------------------------------------------- end states --

  onPlayerDeath() {
    this.state = 'dying';
    this.deathT = 0;
    this.timeScale = 0.3;
    const p = this.player;
    this.particles.burst(p.x, p.y - 8, 6, 60, [PC.r, PC.R, PC.x, PC.w], 120, 1.4, 1, P.GROUND | P.FADE, { vz: 120, grav: 250 });
    this.particles.burst(p.x, p.y - 8, 6, 20, [PC.w, PC.G], 40, 2, 2, P.GLOW | P.FADE, { vz: 50, drag: 1 });
    this.shake(1);
    // Silence at the blow; the lament plays with the results (ResultsOverlay).
    stopMusic();
  }

  // An event about to come (Spawner.warn): its banner in its own words, its family's sting, and its
  // side for the edge arrow (a swarm comes from opposite the way it heads; a pack from its point).
  eventWarning(ev) {
    const R = Math.hypot(this.cam.W, this.cam.H) * 0.55;
    const from = ev.type === 'swarm' ? [-Math.cos(ev.dir) * R, -Math.sin(ev.dir) * R] : ev.type === 'pack' && ev.off ? ev.off : null;
    const [title, sub] = eventWords(ev, from ? sideWord(from) : '');
    // A batch's swarms each say which they are (data/waves.js batchEvents), "2 of 4".
    const which = ev.of > 1 ? `${ev.batch + 1} of ${ev.of}` : '';
    this.banner(title, [sub, which].filter(Boolean).join(' · '), '#e43b44', WARN.lead + 0.4);
    sfx('warn' + ev.type);
    this.warnings.push({ ev, from, t: 0 });
  }

  // A record of the profile's passed (kills, level, the night's time) for the first time this run:
  // one line and the record's sting, once each; never in the first minute.
  checkRecords() {
    if (this.time < RECORD_GRACE) return;
    const now = { kills: this.kills, level: this.player.level, time: this.mode === 's15' ? this.time : 0 };
    for (const k of Object.keys(RECORDS)) {
      const rec = this.records[k] || 0;
      if (rec <= 0 || now[k] <= rec || this.recordsBroken.has(k)) continue;
      this.recordsBroken.add(k);
      this.banner(`NEW RECORD · ${RECORDS[k]}`, '', '#63c74d', 2.4);
      sfx('record');
    }
  }

  victory(kind) {
    if (this.state === 'dawn' || this.state === 'over') return;
    this.state = 'dawn';
    this.dawnT = 0;
    this.calm = 1;
    this.victoryKind = kind;
    // A boss still standing burns in the sunrise (burnBoss), and the dawn says so.
    const lord = this.enemies.find((e) => e.boss && !e.dead);
    if (kind === 'survival') this.banner('Dawn breaks!', lord ? `${lord.def.title || lord.def.name} burns in the sunrise` : 'You survived the night', '#fee761', 4);
    else this.banner('Victory!', 'The Lord of Cinders is no more', '#fee761', 4);
    sfx('bell');
    playJingle('victory');
  }

  // A boss caught by the sunrise (the dawn's update): it fades and flickers over DAWN_BURN.boss s,
  // sparks pouring off it, then a last flare. Not a kill: no loot, no tally. The flicker is the
  // burn's tint (Enemy.draw burnT), steady with FLASHES: SOFT: a white frame every tenth of a
  // second over a boss 57 px tall was the white pulse that option holds back (27 October 2026).
  burnBoss(e, dt) {
    e.burnT += dt;
    const k = Math.min(1, e.burnT / DAWN_BURN.boss);
    e.alpha = (e.def.alpha || 1) * (1 - k);
    if (this.frame % 2 === 0) this.particles.burst(e.x + rand(-e.hr, e.hr), e.y, rand(4, e.h), 4, [PC.y, PC.o, PC.w], 60, 0.9, 1, P.GLOW | P.FADE, { vz: 60 });
    if (k >= 1) {
      e.dead = true;
      this.particles.burst(e.x, e.y, e.h / 2, 48, [PC.y, PC.o, PC.w], 110, 1.2, 2, P.GLOW | P.FADE, { vz: 80 });
      this.shake(0.4);
      sfx('bigdie');
    }
  }

  finish(victory) {
    const died = this.state === 'dying'; // fallen, not quit (Game.update's death, DEATH.end)
    this.state = 'over';
    if (this.hints) this.hints.done();
    const p = this.player;
    // The Dungeon Run won: the last floor's guardian falls as dawn comes, its chest and gold still
    // lying where it fell, and they are his (sweepLoot). Then what still waits for its screen, which
    // never opens now, pays all the same: a chest its gold (chestGold; its draws go unseen, so none
    // is made), a piece of gear its price, as if sold.
    if (victory && this.mode === 'dungeon') this.sweepLoot(false);
    let paid = 0;
    for (const kind of this.chestQueue) paid += this.chestGold(kind);
    for (const it of this.itemQueue) paid += itemPrice(it);
    this.chestQueue.length = 0;
    this.itemQueue.length = 0;
    this.gold += paid;
    this.stats.gold += paid;
    this.result = {
      victory,
      died, // for the Consecration's milestone (shared/progress.js deaths)
      mode: this.mode,
      diff: this.diffId,
      nightmare: this.nightmare,
      hero: p.id,
      time: Math.floor(this.time),
      gold: this.gold,
      kills: this.kills,
      level: p.level,
      bosses: this.stats.bosses, // bosses and crypt lords slain, for the milestones (shared/progress.js)
      combo: this.stats.maxCombo, // his longest kill streak, for the record (shared/profile.js best.combo)
      evolved: this.signatureEvolved(), // and his signature evolved
      evos: p.weapons.filter((w) => w.evolved).map((w) => w.id), // and every evolution he held
      floor: this.floor,
      weapons: p.weapons.map((w) => ({ id: w.id, level: w.level, dmg: Math.round(w.dmgDealt), kills: w.kills, since: w.since })),
      stats: { ...this.stats },
      gear: this.gear,
      realTime: Math.floor(this.clock),
      crypts: this.cleared.size,
      found: this.itemsFound,
    };
  }

  // ------------------------------------------------------------ update --

  syncCam() {
    const c = this.cam;
    // Zoomed out from the HUD scale, but never below one screen pixel per art pixel.
    c.S = Math.max(1, view.S * view.zoom);
    c.W = (view.W * view.S) / c.S;
    c.H = (view.H * view.S) / c.S;
    c.pxW = view.pxW;
    c.pxH = view.pxH;
  }

  // What runs by real time, under the cards as well (an open screen freezes the rest of the run):
  // the flashes and the shake fade, a slow motion runs out (so it can't resume when the screen
  // closes), and a big beat (moment) counts down. The shake fades as fast as it did by the game's
  // clock at its own pace.
  fadeReal(rdt) {
    this.trauma = Math.max(0, this.trauma - rdt * 1.6 * this.pace);
    this.hurtFlash = Math.max(0, this.hurtFlash - rdt * 2);
    this.whiteFlash = Math.max(0, this.whiteFlash - rdt * 1.5);
    this.momentT = Math.max(0, this.momentT - rdt);
    // The rain goes on under the cards, a chest and a find; only the pause lets it fade (Weather.hear).
    if (this.weather && (this.state === 'levelup' || this.state === 'chest' || this.state === 'item')) this.weather.hear(rdt);
    if (this.stir) {
      this.stir.t += rdt;
      if (this.stir.done && (this.stir.after += rdt) >= ARRIVAL.stirOut) this.stir = null;
    }
    if (this.card && ((this.card.t += rdt) >= ARRIVAL.card || (this.card.end != null && this.card.t - this.card.end >= CARD_END))) this.card = null;
    const bb = this.boss;
    if (bb && bb.introT !== undefined) {
      bb.introT += rdt;
      if (!bb.slammed && bb.introT >= bb.slamAt + ARRIVAL.slam) {
        bb.slammed = true;
        sfx('thunk');
        this.shake(0.25);
      }
    }
    this.ultStop = Math.max(0, this.ultStop - rdt);
    for (const w of this.warnings) w.t += rdt;
    if (this.ultLaunch && this.ultLaunch.started && (this.ultLaunch.t += rdt) >= ULT_LAUNCH.dur) this.ultLaunch = null;
    // Banners too: one that came before the cards has had its say when they close. A boss's name
    // card holds them back (they wait, unseen, and go on after it), and a first-run hint waits
    // under the cards as well (hintsHeld), to be seen in full.
    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      if (!this.card && !(b.hint && this.hintsHeld)) b.t += rdt;
      if (b.t >= b.dur) this.banners.splice(i, 1);
    }
    if (this.slowT > 0) {
      this.slowT -= rdt;
      if (this.slowT <= 0 && this.state !== 'dying' && this.state !== 'faint') this.timeScale = 1;
    }
  }

  update(rdt) {
    this.syncCam();
    this.fadeReal(rdt);
    // The weapons the next chest will evolve (EVOLVE READY on their slots and on the chests lying about).
    this.evoReady = this.evolvable();
    if (this.state === 'paused' || this.state === 'levelup' || this.state === 'chest' || this.state === 'item' || this.state === 'over') return;
    // The ultimate's launch stops the world for a moment: the hero (and the HUD) go on.
    const pdt = Math.min(rdt, 1 / 30) * this.timeScale * this.pace, dt = this.ultStop > 0 ? 0 : pdt;
    this.frame++;
    if (this.ultLaunch && !this.ultLaunch.started && this.ultStop <= 0 && this.state === 'play') {
      this.ultLaunch.started = true;
      this.startUlt(this.ultLaunch.type);
    }
    this.ultReceipt();
    const p = this.player;

    if (this.state === 'play') {
      if (this.inCrypt) this.cryptTime += dt;
      else this.time += dt;
      this.floorTime += dt;
    }
    this.magnetAll = Math.max(0, this.magnetAll - dt);
    this.gemComboT -= dt;
    this.coinComboT -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        this.comboTier = -1; // a combo begun again comes to its tiers again
        this.comboSting = 0;
        this.comboRun++;
      }
    }
    if (this.state === 'play') {
      // A boss nearly done: its heart beats (and its bar pulses, Hud.drawBoss).
      const b = this.boss;
      if (b && !b.dead && b.hp < b.maxHp * LOW_HP) {
        this.bossBeatT -= rdt;
        if (this.bossBeatT <= 0) {
          this.bossBeatT = ARRIVAL.beat;
          sfx('heartbeat');
        }
      } else this.bossBeatT = 0;
      p.update(pdt);
      this.spawner.update(dt);
      this.checkRecords();
    } else if (this.state === 'dying') {
      this.deathT += rdt;
      if (this.deathT > DEATH.end) this.finish(false);
    } else if (this.state === 'faint') {
      // The world slows and goes dark; then the fade back in, outside (as a journey's).
      this.faintT += rdt;
      this.fade = Math.min(1, this.faintT / 1.2);
      if (this.faintT >= 1.4) {
        this.wake();
        this.state = 'travel';
        this.travelT = 0.6;
        this.travelGo = null;
      }
    } else if (this.state === 'descend') {
      this.descendT += rdt;
      this.fade = Math.min(1, this.descendT / 0.8);
      if (this.descendT >= 0.8 && !this.descended) {
        this.descended = true;
        this.player.heal(this.player.maxHp * 0.3, true);
        this.enterFloor(this.floor + 1);
      }
      if (this.descendT >= 1.2) {
        this.fade = Math.max(0, 1 - (this.descendT - 1.2) / 0.8);
        if (this.descendT >= 2) {
          this.state = 'play';
          this.descended = false;
          this.fade = 0;
        }
      }
    } else if (this.state === 'travel') {
      this.travelT += rdt;
      this.fade = Math.min(1, this.travelT / 0.6);
      if (this.travelT >= 0.6 && this.travelGo) {
        const go = this.travelGo;
        this.travelGo = null;
        go();
      }
      if (this.travelT >= 0.9) {
        this.fade = Math.max(0, 1 - (this.travelT - 0.9) / 0.6);
        if (this.travelT >= 1.5) {
          this.state = 'play';
          this.fade = 0;
        }
      }
    } else if (this.state === 'dawn') {
      this.dawnT += rdt;
      this.dawn = Math.min(1, this.dawnT / 2.5);
      // Every foe burns away in the light; a boss slowly, in sight (burnBoss).
      if (this.frame % 3 === 0) {
        for (const e of this.enemies) {
          if (!e.dead && !e.prop && !e.boss && Math.random() < 0.15) {
            e.dead = true;
            this.particles.burst(e.x, e.y - 6, 4, 8, [PC.y, PC.o, PC.w], 50, 0.8, 1, P.GLOW | P.FADE, { vz: 50 });
          }
        }
      }
      for (const e of this.enemies) if (e.boss && !e.dead) this.burnBoss(e, rdt);
      p.update(dt);
      if (this.dawnT > 5) this.finish(true);
    }

    this.world.update(dt);
    if (this.weather) this.weather.update(dt);
    // Sweep last frame's dead before indexing; the grid must match the array.
    const E = this.enemies;
    for (let i = E.length - 1; i >= 0; i--) {
      if (E[i].dead) {
        this.enemyPool.put(E[i]);
        E[i] = E[E.length - 1];
        E.pop();
      }
    }
    this.grid.rebuild(E, p.x, p.y);

    if (this.state === 'play') {
      if (this.caveStrike) {
        this.mainWeapon()?.update(dt, true);
        if (this.boxBlowAt !== null && this.clock >= this.boxBlowAt - 1e-6) this.breakBoxes();
      } else for (const w of p.weapons) w.update(dt);
      updateList(this.minions, dt);
    }
    updateList(this.projectiles, dt, releaseProjectile);
    updateList(this.eshots, dt);

    // Enemies.
    let hostile = 0, props = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (this.state === 'play' || this.state === 'dying') e.update(dt);
      if (e.speech && (e.speech.t -= rdt) <= 0) e.speech = null; // a boss's words, by real time
      if (e.prop) props++;
      else hostile++;
    }
    this.hostileCount = hostile;
    this.propCount = props;
    this.separate(dt);
    this.relocT -= dt;
    if (this.relocT <= 0) {
      this.relocT = 0.5;
      this.relocate();
    }
    if (this.boss && this.boss.dead) this.boss = null;

    updateList(this.effects, dt);
    updateList(this.pickups, dt);
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.t += dt;
      if (d.t > d.life) this.decals.splice(i, 1);
    }
    // Shrines.
    for (const s of this.shrines) {
      s.t += dt;
      if (!s.used && this.state === 'play' && Math.hypot(p.x - s.x, p.y - s.y) < 13) this.useShrine(s);
    }
    // Crypt doors: on the steps, pushing up for CRYPT_PUSH goes in (cryptDoor: the one he is on,
    // for the HUD's prompt).
    this.cryptDoor = null;
    for (const d of this.crypts) {
      d.t += dt;
      const on = !d.sealed && this.cryptsOpen && this.state === 'play' && Math.abs(p.x - d.x) < CRYPT_STEPS.w && p.y > d.y - 6 && p.y < d.y + CRYPT_STEPS.below;
      d.push = on && p.vy < -10 ? (d.push || 0) + dt : 0;
      if (!on) continue;
      this.cryptDoor = d;
      if (d.push >= CRYPT_PUSH) this.enterCrypt(d);
    }
    this.particles.budget = this.particles.n > 3500 ? 0.4 : this.particles.n > 2000 ? 0.7 : 1;
    this.particles.update(dt);
    this.numbers.update(rdt * (this.timeScale < 1 ? 0.6 : 1));

    // Camera.
    const c = this.cam;
    const tx = p.x - c.W / 2, ty = p.y - 8 - c.H / 2;
    c.x = damp(c.x, tx, 9, rdt);
    c.y = damp(c.y, ty, 9, rdt);
    if (Math.abs(c.x - tx) > c.W) c.x = tx;
    if (Math.abs(c.y - ty) > c.H) c.y = ty;

    if (this.state === 'play' && this.mode !== 'dungeon' && this.time >= this.duration) this.victory('survival');
    // The last guardian's gear is chosen before the dawn, and nothing fells the hero meanwhile.
    if (this.gearThenWin) {
      if (this.state === 'play' && !this.itemQueue.length) {
        this.gearThenWin = false;
        this.victory('dungeon');
      } else this.player.invuln = Math.max(this.player.invuln, 0.2);
    }
    if (this.state === 'play' && this.mode === 'ranked') this.rankedMilestones();
    if (this.state === 'play') this.heroMilestone();
    if (this.hints) this.hints.update();
    // The frame came to a combo's new tier (killEnemy): one sting, the highest tier's, whatever
    // the weapons, a relic or the ultimate felled in it.
    if (this.comboSting > 0) {
      sfx('combo', { size: this.comboSting });
      this.comboSting = 0;
    }
  }

  // Foes pass through props (barrels, crates...), and in the forest through the trees, so nothing
  // holds a horde up (the user's rule of 16 October). They ease apart from one another (crowd.js,
  // the owner's "monsters repel one another" of 22 October), and none can stand inside the hero:
  // last, so that easing one off another can't leave it in him. The foes on him ease him off them
  // too, softly (CROWD.hero: never as fast as he walks), all but a boss or a lord. Dungeon walls stop him, and in a crypt
  // its walkers (Dungeon.collide, Enemy.walled: a Dungeon Run floor's horde goes through them), after the easing too.
  separate(dt) {
    const E = this.enemies, p = this.player;
    const live = this.state === 'play' || this.state === 'dying';
    if (live) jostle(E, p.x, p.y, dt);
    const walls = this.world instanceof Dungeon;
    let sx = 0, sy = 0;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (a.dead || a.prop) continue;
      if (walls && a.walled) this.world.collide(a);
      if (!a.def.fly) {
        const dx = a.x - p.x, dy = a.y - p.y, d2 = dx * dx + dy * dy, rr = a.r + p.r - 2;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), o = rr - d;
          a.x += (dx / d) * o * 0.5;
          a.y += (dy / d) * o * 0.5;
          // A boss or a lord never moves him (the rule of 15 October: the Bone King shoved him).
          if (!a.boss && !a.lord) {
            sx -= (dx / d) * o;
            sy -= (dy / d) * o;
          }
        }
      }
    }
    if (live && !p.dead && (sx || sy)) {
      const H = CROWD.hero, k = 1 - Math.exp(-H.rate * dt), most = H.most * dt;
      let mx = sx * k, my = sy * k;
      const m = Math.hypot(mx, my);
      if (m > most) {
        mx *= most / m;
        my *= most / m;
      }
      p.x += mx;
      p.y += my;
      this.world.collide(p);
    }
  }

  // Foes left far behind (the world's tooFar). Since the steady horde comes at a rate rather than
  // keeping a number standing (26 October 2026, data/waves.js HORDE_RATE), one of it the hero has
  // left behind is let go: it simply vanishes, never seen (no drops, no kill, no XP), as at the cap
  // (recycleFar). Moved back to the screen's edge, it was one more monster on top of the rate,
  // coming again and again however far he ran. What was sent at him (a swarm, a ring, a pack, a
  // champion, a boss's summons) is still brought back in, as before (on a Dungeon Run floor: one
  // more than 30 tiles off as the crow flies, Dungeon.tooFar, in a wall or not, as it comes
  // straight through them; the steady horde's let go likewise); bosses, lords, the thief and
  // sleeping packs are never touched.
  relocate() {
    const w = this.world;
    // In a crypt nothing is moved: its packs and lords come to the hero on their own feet, or not at
    // all (a woken lord far behind him used to appear at his side).
    if (this.inCrypt) return;
    for (const e of this.enemies) {
      if (e.dead || e.boss || e.lord || e.type === 'thief' || e.sleeping || e.dormant) continue;
      if (!w.tooFar(e, this.cam)) continue;
      if (e.prop) {
        // The forest's are put down about the hero as he goes, and fade behind him; a dungeon's
        // stand in the rooms they furnish until they are broken.
        if (w instanceof Forest) e.dead = true;
        continue;
      }
      if (e.steady) {
        e.dead = true;
        continue;
      }
      const pt = w.spawnPoint(this);
      if (pt) {
        e.x = pt.x;
        e.y = pt.y;
        e.lockT = 0;
      }
    }
    // The forest never ends: what the hero walked away from fades, or the list would only grow.
    // Gems, chests and gear stay (gems are folded together once there are many: dropGem).
    if (w instanceof Forest) {
      const p = this.player;
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind === 'gem' || pk.kind === 'chest' || pk.kind === 'item') continue;
        if (Math.abs(pk.x - p.x) > PICKUP_FAR || Math.abs(pk.y - p.y) > PICKUP_FAR) pk.dead = true;
      }
    }
  }

  // Room for one more foe at the cap (spawnEnemy; data/waves.js HORDE_CAP). The one farthest from
  // the hero, if it stands HORDE_CAP.far screen diagonals off or more, simply vanishes: never seen,
  // so it doesn't die (no drops, no kill, no XP). What is sent at him (sent: a ring, a swarm, a
  // pack, a champion, the thief, a boss's summons) may take the farthest anywhere off the screen,
  // as many as it brings; the steady horde HORDE_CAP.perFrame a frame at most. Never a boss, a
  // crypt's lord, a champion, the thief, a boss's summons or a sleeping pack. The horde is counted
  // and those off the screen listed (and sorted, the farthest first) once a frame, however many
  // spawns ask. Returns whether there is room now: there may be already, with the foes killed this
  // frame not yet swept away.
  recycleFar(sent) {
    const E = this.enemies;
    const c = (this.horde ??= { frame: -1, of: null, live: 0, used: 0, far2: 0, list: [], ids: [], d2: [], ord: [], at: 0, sorted: false, recycled: 0 });
    if (c.frame !== this.frame || c.of !== E) {
      const p = this.player, cam = this.cam, m = HORDE_CAP.edge;
      const far = Math.hypot(cam.W, cam.H) * HORDE_CAP.far;
      const x0 = cam.x - m, x1 = cam.x + cam.W + m, y0 = cam.y - m, y1 = cam.y + cam.H + m;
      c.frame = this.frame;
      c.of = E;
      c.live = c.used = 0;
      c.at = 0;
      c.sorted = false;
      c.far2 = far * far;
      c.list.length = c.ids.length = c.d2.length = 0;
      for (const e of E) {
        if (e.dead || e.prop) continue;
        c.live++;
        if (e.boss || e.lord || e.elite || e.summoned || e.sleeping || e.dormant || e.type === 'thief') continue;
        if (e.x > x0 && e.x < x1 && e.y > y0 && e.y < y1) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        c.list.push(e);
        c.ids.push(e.id);
        c.d2.push(dx * dx + dy * dy);
      }
    }
    if (c.live <= HORDE_CAP.most) return true;
    if (!sent && c.used >= HORDE_CAP.perFrame) return false;
    // The farthest still standing: the list sorted farthest first once a frame, the first time room
    // is asked for, and walked with a cursor (it was scanned whole for every spawn: at the cap an
    // Elite Nightmare ring of some 4,600 cost about ten million steps in one frame, 27 October 2026).
    // One gone since (killed, or made room) is passed over for good, and so is one swept away and
    // back from the pool as another foe with another id. Past the end there is no one left to take.
    // Turned away for standing too near (the steady horde), the cursor stays: a spawn sent at the
    // hero this frame may still take that one.
    if (!c.sorted) {
      c.ord.length = c.list.length;
      for (let i = 0; i < c.ord.length; i++) c.ord[i] = i;
      c.ord.sort((a, b) => c.d2[b] - c.d2[a]);
      c.sorted = true;
    }
    while (c.at < c.ord.length) {
      const i = c.ord[c.at];
      if (!c.list[i].dead && c.list[i].id === c.ids[i]) break;
      c.at++;
    }
    if (c.at >= c.ord.length) return false;
    const best = c.ord[c.at];
    if (!sent && c.d2[best] < c.far2) return false;
    c.list[best].dead = true;
    c.at++;
    c.live--;
    c.used++;
    c.recycled++;
    return true;
  }

  // -------------------------------------------------------------- draw --

  // The world's drifting overlay (the forest's fog) and the weather over it (draw).
  drawSkies(ctx, c) {
    if (this.world.drawOverlay) this.world.drawOverlay(ctx, c, this.clock);
    if (this.weather) this.weather.draw(ctx, c);
  }

  draw(ctx) {
    this.syncCam();
    const c = this.cam;
    const S = c.S;
    // Screen shake offsets the camera for this frame only. The camera sits on
    // whole screen pixels, so a fractional scale keeps a steady pixel pattern.
    const sh = this.trauma * this.trauma;
    const bx = c.x, by = c.y;
    c.x = Math.round((bx + (Math.random() - 0.5) * 9 * sh) * S) / S;
    c.y = Math.round((by + (Math.random() - 0.5) * 9 * sh) * S) / S;

    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, c.pxW, c.pxH);
    this.world.drawGround(ctx, c, this.clock);

    // Decals.
    for (const d of this.decals) {
      const a = Math.min(1, (d.life - d.t) / 3) * 0.85;
      if (a <= 0) continue;
      const sx = (d.x - c.x) * S, sy = (d.y - c.y) * S;
      if (sx < -40 || sy < -40 || sx > c.pxW + 40 || sy > c.pxH + 40) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(d.img, Math.round(sx - (d.img.width * S) / 2), Math.round(sy - (d.img.height * S) / 2), d.img.width * S, d.img.height * S);
    }
    ctx.globalAlpha = 1;
    if (this.world.drawGroundProps) this.world.drawGroundProps(ctx, c, this.clock);

    for (const e of this.effects) if (e.drawGround) e.drawGround(ctx, c);
    for (const pk of this.pickups) pk.draw(ctx, c);

    // Shadows.
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.dead && onScreen(c, e.x, e.y, 40) && this.inView(e)) e.drawShadow(ctx, c);
    }
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 40)) m.drawShadow(ctx, c);
    if (!p.dead) {
      const shd = shadowSprite(10);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(shd, Math.round((p.x - c.x) * S - (shd.width * S) / 2), Math.round((p.y - c.y) * S - (shd.height * S) / 2), shd.width * S, shd.height * S);
      ctx.globalAlpha = 1;
      this.drawHeroRing(ctx, c);
    }

    // Y-sorted actors and props. Bosses and crypt lords aren't among them: they stand over it all.
    // In a crypt a foe behind a wall from the hero isn't drawn at all (inView), nor its night layer.
    const list = this.drawList, tops = this.topList;
    list.length = 0;
    tops.length = 0;
    this.world.collectProps(c, list);
    for (const s of this.shrines) list.push(s);
    for (const d of this.crypts) if (onScreen(c, d.x, d.y, 60)) list.push(d);
    for (const e of this.enemies) if (!e.dead && onScreen(c, e.x, e.y, 60) && this.inView(e)) (e.boss || e.lord ? tops : list).push(e);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 60)) list.push(m);
    list.push(p);
    list.sort((a, b) => a.y - b.y);
    // The hero keeps his place in the sort, for what stands in front of him and the night's cut,
    // but is drawn only at the end, over everything (drawHero).
    if (!p.dead) this.placePlayer(c);
    // Whether a foe, a minion or a boss stands in front of the hero (his ring goes over it).
    let covered = false, after = false;
    for (const o of list) {
      if (o === p) {
        after = true;
        continue;
      }
      if (o.shrine) this.drawShrine(ctx, c, o);
      else if (o.crypt) this.drawCrypt(ctx, c, o);
      else if (o.def || o.minion) {
        o.draw(ctx, c);
        if (after && !covered && !o.prop && standsOver(o, p)) covered = true;
      } else this.world.drawProp(ctx, c, o, this.clock);
    }
    // The weapons' shots and blasts over the trees and boxes, under the monsters (horde-over.js).
    const armed = this.projectiles.length > 0 || this.effects.length > 0;
    let horde = armed && maskHorde(c, list, p);
    if (horde) keepHorde(ctx, c);
    for (const pr of this.projectiles) pr.draw(ctx, c);
    for (const e of this.effects) if (e.draw) e.draw(ctx, c);
    if (horde) putHorde(ctx);
    this.particles.draw(ctx, c, false);
    // Bosses and crypt lords over everything of the world but the hero (the trees, the horde, the
    // weapons' shots and blasts), each in a light of its own so the night can't hide it either:
    // only the hero, the HUD and its own telegraphs, on the ground, go over one.
    tops.sort((a, b) => a.y - b.y);
    for (const e of tops) {
      e.draw(ctx, c);
      this.light(e.x, e.y - e.h * 0.5, Math.max(56, e.h * 1.6), 'white', 0.85);
      if (!covered && standsOver(e, p)) covered = true;
    }
    if (armed) horde = maskBosses(c, tops, horde);

    // Lighting.
    this.world.addLights(this);
    if (this.weather) this.weather.addLights(this);
    for (const d of this.crypts) if (!d.sealed && onScreen(c, d.x, d.y, 80)) this.light(d.x, d.y - 8, 44 + 4 * Math.sin(d.t * 2), 'purple', 0.8);
    const flick = 0.94 + 0.06 * Math.sin(this.clock * 9) * Math.sin(this.clock * 5.3);
    this.light(p.x, p.y - 6, (this.mode === 'dungeon' ? 130 : 125) * flick, 'warm', 1);
    this.light(p.x, p.y - 8, 46, 'white', 0.7);
    this.lighting.render(ctx, c, this.world.ambient());
    // By night the vignette darkens the scene, its fog and rain with it, before the horde is
    // lifted out of it, so the far monsters at the screen's edge stand out of the dark as the
    // near ones do (enemies.js NIGHT_EDGE); the glows, shots and numbers drawn after it go over it.
    // By day the fog and weather and then the vignette go over everything, last.
    const vig = vignette(256, 144, '8,6,16', this.world.daylight ? 0.18 : 0.7);
    if (!this.world.daylight) {
      this.drawSkies(ctx, c);
      ctx.drawImage(vig, 0, 0, c.pxW, c.pxH);
    }
    // The horde lifted out of the dark and edged in light (enemies.js NIGHT_EDGE).
    drawNightEdge(ctx, c, this);

    // Unlit / additive layers.
    for (const o of list) {
      if (o.def || o.minion) o.drawEmissive(ctx, c);
      else if (o === p) continue; // with him, last (drawHero)
      else if (o.crypt) this.drawCryptEmissive(ctx, o);
      else if (!o.shrine && this.world.drawPropEmissive) this.world.drawPropEmissive(ctx, o);
    }
    for (const e of tops) e.drawEmissive(ctx, c);
    for (const pk of this.pickups) pk.drawEmissive(ctx);
    // The weapons' glows under the monsters too, lit and lifted out of the dark by now.
    if (horde) keepHorde(ctx, c);
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.effects) if (e.drawGlow) e.drawGlow(ctx, c);
    for (const pr of this.projectiles) pr.drawGlow(ctx, c);
    if (horde) putHorde(ctx);
    for (const s of this.shrines) this.drawShrineGlow(ctx, c, s);
    for (const d of this.crypts) if (!d.sealed && onScreen(c, d.x, d.y, 60)) this.drawCryptGlow(ctx, c, d);
    for (const pk of this.pickups) pk.drawGlow(ctx, c);
    if (p.buff('ward') && !p.dead) this.drawWard(ctx, c);
    for (const s of this.eshots) s.drawGlow(ctx, c);
    for (const e of this.enemies) if (!e.dead && (e.elite || e.boss) && onScreen(c, e.x, e.y, 60) && this.inView(e)) e.drawGlow(ctx, c);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 40)) m.drawGlow(ctx, c);
    this.particles.draw(ctx, c, true);
    ctx.globalCompositeOperation = 'source-over';

    if (this.world.daylight) this.drawSkies(ctx, c);
    // The foes' shots over everything, unlit: none can be lost behind a tree, in the horde or
    // in the dark.
    for (const s of this.eshots) s.draw(ctx, c);
    this.numbers.draw(ctx, c);
    // The hero over all of it: trees, the horde, bosses, every weapon's blast and glow, the foes'
    // shots and the numbers. Only the screen's own effects (a flash, a fade) go over him.
    this.heroCovered = covered;
    this.drawHero(ctx, c);

    // Screen-space post effects.
    if (this.world.daylight) ctx.drawImage(vig, 0, 0, c.pxW, c.pxH);
    if (p.dead && this.deathT !== undefined) this.drawFallen(ctx, c);
    const low = p.hp / p.maxHp;
    if (this.hurtFlash > 0 || (low < 0.3 && !p.dead)) {
      const a = Math.max(this.hurtFlash * 0.7, low < 0.3 ? (0.25 + 0.15 * Math.sin(this.clock * 6)) * (1 - low / 0.3) : 0);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(vignette(256, 144, '200,20,40', 0.9), 0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    if (this.whiteFlash > 0) {
      ctx.globalAlpha = Math.min(this.settings.softFlash ? FLASH_SOFT : 0.85, this.whiteFlash);
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    if (this.fade > 0) {
      ctx.globalAlpha = Math.min(1, this.fade);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    c.x = bx;
    c.y = by;
  }

  // The Ward Bubble round the hero: a shimmering shell, flickering in its last second.
  drawWard(ctx, c) {
    const p = this.player, S = c.S, t = this.clock, left = p.buffs.get('ward').t;
    const sx = (p.x - c.x) * S, sy = (p.y - 10 - c.y) * S, R = 17 * S * (1 + 0.03 * Math.sin(t * 6));
    const a = left < 1 ? 0.4 + 0.4 * Math.sin(t * 30) : 1;
    const gr = ctx.createRadialGradient(sx, sy, R * 0.55, sx, sy, R);
    gr.addColorStop(0, 'rgba(44,232,245,0)');
    gr.addColorStop(1, 'rgba(44,232,245,0.45)');
    ctx.globalAlpha = a;
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d6fbff';
    ctx.lineWidth = Math.max(1, S * 0.6);
    ctx.globalAlpha = a * (0.55 + 0.25 * Math.sin(t * 5));
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, TAU);
    ctx.stroke();
    // A sheen that turns round the shell.
    ctx.globalAlpha = a * 0.8;
    ctx.lineWidth = Math.max(1, S);
    ctx.beginPath();
    ctx.arc(sx, sy, R * 0.82, t * 1.7, t * 1.7 + 0.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx, c) {
    const p = this.player;
    if (p.dead) return; // fallen: drawn after the world has drained (drawFallen)
    this.placePlayer(c);
    const [X, Y, w, h, , , img, alpha] = p._rect;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
  }

  // Where the hero stands on the screen this frame and in which picture, unless he has fallen:
  // p._rect, [X, Y, w, h, frame, flip, picture, alpha].
  placePlayer(c) {
    const p = this.player;
    const S = c.S;
    const spr = SPR[p.hero.sprite];
    const moving = p.moving;
    // Walk cycles step a little faster so planted feet slide less against the ground.
    const step = Math.floor(p.anim * (spr.walk ? 1.4 : 1) * spr.motionRate);
    // Walk/idle remains the base. In the forest the ranger draws before the bow is ready and
    // releases with its real projectile; in a crypt every hero plays his attack for a blow
    // struck by hand, when it is struck the way he faces (on the move a shot may fly behind
    // him), the ranger his shot on the move too.
    let fr = moving ? walkFrame(spr, step) : idleFrame(spr, Math.floor(p.anim * spr.idleRate));
    const clip = this.caveStrike && p.strikeAt !== null ? strikeClip(spr) : null;
    if (clip && faceAlong(p.face, Math.cos(p.strikeAng), Math.sin(p.strikeAng)) === p.face) {
      const k = clip.from + Math.floor((this.clock - p.strikeAt) * spr.attackFps + 1e-6);
      if (k < spr.attack.length) fr = spr.frames[moving && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k]];
    }
    const bowPose = this.caveStrike ? null : rangerPose(this, spr, step);
    if (bowPose) fr = bowPose.frame;
    const flip = bowPose ? bowPose.flip : p.face < 0;
    let img = p.flash > 0 ? fr.white(flip) : fr.get(flip);
    // Walk cycles carry their own body bob; two-frame sprites hop on alternate steps.
    const bob = spr.selfBob ? 0 : moving ? (spr.walk ? 0 : -(step % 2)) : Math.sin(p.anim * 2) > 0.6 ? -1 : 0;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((p.x - c.x) * S - w / 2), Y = Math.round((p.y - c.y - spr.anchorY + bob - p.hop) * S);
    let alpha = 1;
    if (p.invuln > 0 && !(p.ult && p.ult.type === 'shadowdance') && Math.floor(p.invuln * 18) % 2 === 0) alpha = 0.45;
    if (p.ult && p.ult.type === 'shadowdance') alpha = 0.35 + 0.15 * Math.sin(this.clock * 20);
    p._rect = [X, Y, w, h, fr, flip, img, alpha];
  }

  // The hero fallen (DEATH): the world drains to grey and darkens round him, and he, still in
  // colour, flashes white and tips over where he stood.
  drawFallen(ctx, c) {
    const p = this.player, D = DEATH, t = this.deathT, S = c.S;
    const k = clamp(t / D.drain, 0, 1);
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = k;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, c.pxW, c.pxH);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.45 * k;
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, c.pxW, c.pxH);
    ctx.globalAlpha = 1;
    const spr = SPR[p.hero.sprite], fr = idleFrame(spr, 0), flip = p.face < 0;
    const img = t < D.flash ? fr.white(flip) : fr.get(flip);
    const a = ease.outBack(clamp(t / D.fall, 0, 1)) * (Math.PI / 2) * (flip ? -1 : 1);
    ctx.save();
    ctx.translate(Math.round((p.x - c.x) * S), Math.round((p.y - c.y) * S));
    ctx.rotate(a);
    ctx.drawImage(img, Math.round((-img.width * S) / 2), Math.round(-spr.anchorY * S), img.width * S, img.height * S);
    ctx.restore();
  }

  drawPlayerEmissive(ctx) {
    const p = this.player;
    if (p.dead || !p._rect) return;
    const [X, Y, w, h, fr, flip] = p._rect;
    if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, X, Y, w, h);
  }

  // The ring on the ground under the hero (HERO_MARK): his colour, pulsing; red when he is low.
  // k: how strongly (drawHero draws it again over the crowd).
  drawHeroRing(ctx, c, k = 1) {
    const p = this.player, M = HERO_MARK, S = c.S;
    const low = p.hp / p.maxHp < M.low;
    const img = groundRing(M.rx, M.ry, low ? M.hurt : p.hero.color);
    ctx.globalAlpha = k * ((low ? 0.7 : 0.55) + (low ? 0.3 : 0.25) * Math.sin(this.clock * (low ? 9 : 3)));
    ctx.drawImage(img, Math.round((p.x - c.x) * S - (img.width * S) / 2), Math.round((p.y + 1 - c.y) * S - (img.height * S) / 2), img.width * S, img.height * S);
    ctx.globalAlpha = 1;
  }

  // The hero, last of the world (HERO_MARK): over everything but the screen's own effects and the
  // HUD, unlit, as his own light shows him in full anyway; and when something stands in front of
  // him, his ring over it first, so it is never lost in the crowd.
  drawHero(ctx, c) {
    const p = this.player;
    if (p.dead || !p._rect) return;
    const [X, Y, w, h, , , img, alpha] = p._rect;
    if (this.heroCovered && !(p.ult && p.ult.type === 'shadowdance')) this.drawHeroRing(ctx, c, 0.8);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
    this.drawPlayerEmissive(ctx);
  }

  drawShrine(ctx, c, s) {
    const S = c.S;
    // Its type's altar (art/props.js), burning or shining at its own pace until used, then still.
    const spr = SPR['shrine_' + s.type] || s.spr;
    const fr = spr.frames[s.used ? 0 : Math.floor(s.t * (spr.fps || 0)) % spr.frames.length];
    const img = s.used ? fr.variant('dim', TINTS.dim, false) : fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((s.x - c.x) * S - w / 2), Y = Math.round((s.y - c.y) * S - h + S);
    ctx.globalAlpha = s.used ? 0.6 : 1;
    ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
    s._rect = [X, Y, w, h, fr]; // what it hides of the horde's night layer (drawNightEdge)
  }

  drawCrypt(ctx, c, d) {
    const S = c.S, fr = d.spr.frames[d.sealed ? 1 : 0], img = fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((d.x - c.x) * S - w / 2), Y = Math.round((d.y - c.y) * S - h + S);
    ctx.drawImage(img, X, Y, w, h);
    d._rect = [X, Y, w, h, fr];
  }

  drawCryptEmissive(ctx, d) {
    if (!d._rect || d.sealed) return;
    const [X, Y, w, h, fr] = d._rect;
    if (fr.em) ctx.drawImage(fr.em, X, Y, w, h);
  }

  drawCryptGlow(ctx, c, d) {
    const S = c.S;
    const sx = (d.x - c.x) * S, sy = (d.y - 7 - c.y) * S;
    const sz = (24 + 3 * Math.sin(d.t * 2)) * S;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(glow('#8f5bb0'), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
  }

  drawShrineGlow(ctx, c, s) {
    if (s.used) return;
    const S = c.S;
    const col = SHRINE_COLORS[s.type];
    const sx = (s.x - c.x) * S, sy = (s.y - 15 - c.y) * S;
    const sz = (26 + 4 * Math.sin(s.t * 3)) * S;
    ctx.drawImage(glow(col), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.drawImage(glow(col), sx - sz / 4, sy - sz / 4, sz / 2, sz / 2);
    this.light(s.x, s.y - 12, 70, s.type === 'fury' ? 'red' : s.type === 'haste' ? 'cyan' : s.type === 'fortune' ? 'gold' : s.type === 'wisdom' ? 'purple' : 'green', 0.9);
    if (Math.random() < 0.2) this.particles.emit(s.x + rand(-4, 4), s.y - 14, 0, 0, 0, rand(10, 25), 0.8, 1, PC.w, P.GLOW | P.FADE, 0);
  }
}

// Whether a figure drawn after the hero stands over him: its body overlaps his on the screen.
function standsOver(o, p) {
  const r = o._rect, q = p._rect;
  if (!r || !q) return Math.abs(o.x - p.x) < 9 && o.y > p.y && o.y - p.y < 14;
  return r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1];
}

function onScreen(c, x, y, m) {
  return x > c.x - m && x < c.x + c.W + m && y > c.y - m && y < c.y + c.H + m * 1.5;
}

function updateList(list, dt, release) {
  let j = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o.update(dt)) list[j++] = o;
    else if (release) release(o);
  }
  list.length = j;
}
