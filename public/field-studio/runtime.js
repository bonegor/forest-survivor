import { ART } from '../js/art/defs.js';
import { ART_FALLBACKS } from '../js/art/fallbacks.js';
import { SPR, Frame, buildSprite } from '../js/engine/sprites.js';
import { HEROES } from '../js/data/heroes.js';
import { heroVariantFrame, heroVariantFallFrame, heroVariantWispFrame, reforgedSoulOrigin } from './art/hero-variants.js';

function lazy(object, key, make) {
  Object.defineProperty(object, key, { enumerable: true, configurable: true, get() {
    const value = make();
    Object.defineProperty(object, key, { value, writable: true, configurable: true, enumerable: true });
    return value;
  } });
}

// A review typically opens just one hero. Materialize the same game assets on first use.
export function prepareSprites() {
  for (const [id, def] of Object.entries(ART)) {
    if (!(id in SPR)) lazy(SPR, id, () => buildSprite(id, def));
  }
  for (const [id, target] of Object.entries(ART_FALLBACKS)) {
    if (!(id in SPR) && target in SPR) lazy(SPR, id, () => SPR[target]);
  }
}

function dressFrames(source, id, look, draw, idle) {
  const result = Object.create(source);
  result.frames = new Array(source.frames.length);
  for (let i = 0; i < result.frames.length; i++) {
    lazy(result.frames, i, () => {
      const frame = source.frames[i];
      return new Frame(draw(id, look, frame.buf, i, idle), frame.emissive);
    });
  }
  return result;
}

export function proposalSprite(id, look, source = SPR[HEROES[id].sprite]) {
  if (look === 'original') return source;
  const idle = look === 'refined' ? source.frames[source.idle[0]].buf : undefined;
  const result = dressFrames(source, id, look, heroVariantFrame, idle);
  if ('fall' in source) lazy(result, 'fall', () => {
    const fall = dressFrames(source.fall, id, look, heroVariantFallFrame, idle);
    if (look === 'reforged' && source.fall.wisp) {
      lazy(fall, 'wisp', () => Object.assign(dressFrames(source.fall.wisp, id, look, heroVariantWispFrame), reforgedSoulOrigin(id)));
    }
    return fall;
  });
  return result;
}
