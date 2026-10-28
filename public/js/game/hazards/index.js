// game/hazards: what a Survival map's sky does to the fight, beyond how it looks (28 October 2026).
// The owner's words that day: the Sunscorch's "weather is clear or has duststorm with effect reduced
// visibility", the Frostfell's "Weather is snow blizzard, gusts here and there freeze monsters or
// hero". A look names its hazards as data (look.hazards: absent in the Darkwood, the Bloomvale and the
// Abyss, so nothing here is ever made for them) and the Game makes them once a run (makeHazards), each
// kind its own class, all of them run and drawn through one Hazards:
//   gusts  game/hazards/gusts.js: a telegraphed patch of whirling snow that blasts, freezing the horde
//          in it and the hero (Player.freeze), more often the harder the weather's `key` blows
//   haze   game/hazards/haze.js: blowing sand round the hero as thick as the weather's `key`, the
//          HUD showing what it hides (hazeR, Hud.drawIndicators)
// Each kind's numbers are the look's (biomes/desert.js, biomes/frozen.js `hazards`); its dice its own,
// from the run's seed, never Math.random, so a seeded run plays out the same.
//
// Nothing of it runs or shows in a crypt, where the forest waits (Game.inCrypt), nor outside play (a
// level-up's cards, a chest, the pause, a journey's fade): every clock stands still with the world's.

import { Gusts } from './gusts.js';
import { Haze } from './haze.js';

// The kinds a look may name (the Bloomvale's is added here: world spec 6c).
export const KINDS = { gusts: Gusts, haze: Haze };

// The night's hazards from its look, or null where it has none (the Darkwood, Ranked, the Dungeon Run,
// a look naming no kind known here).
export function makeHazards(g, look) {
  const H = look && look.hazards;
  if (!H) return null;
  const list = [];
  for (const k of Object.keys(H)) if (KINDS[k]) list.push(new KINDS[k](g, H[k]));
  return list.length ? new Hazards(g, list) : null;
}

export class Hazards {
  constructor(g, list) {
    this.g = g;
    this.list = list;
  }

  // Whether they are out here with the hero: not while he is down in a crypt.
  get out() {
    return !this.g.inCrypt;
  }

  // Each kind's, while the night is being played out here. In a crypt what was under way is let go
  // (a gust gathering as he went down never blasts by the door he comes back out of).
  update(dt) {
    const g = this.g;
    if (g.inCrypt) {
      for (const h of this.list) if (h.clear) h.clear();
      return;
    }
    if (g.state !== 'play') return;
    for (const h of this.list) h.update(dt);
  }

  // Under the actors, with the ground's own (Game.draw, after drawGroundProps): a gust's gathering.
  drawGround(ctx, cam) {
    if (!this.out) return;
    for (const h of this.list) if (h.drawGround) h.drawGround(ctx, cam);
  }

  // Over the actors, under the shots (Game.draw): a gust's ring and its snow, so no crowd hides it.
  drawOver(ctx, cam) {
    if (!this.out) return;
    for (const h of this.list) if (h.drawOver) h.drawOver(ctx, cam);
  }

  // Over the world's fog, under the weather's grains (Game.drawSkies): the dust haze.
  drawOverlay(ctx, cam) {
    if (!this.out) return;
    for (const h of this.list) if (h.drawOverlay) h.drawOverlay(ctx, cam);
  }

  // World px of clear sight round the hero while a haze is thick, else null (Hud.drawIndicators: what
  // stands on the screen beyond it shows its marker where it stands).
  get hazeR() {
    if (!this.out) return null;
    for (const h of this.list) {
      const r = h.hazeR;
      if (r != null) return r;
    }
    return null;
  }
}
