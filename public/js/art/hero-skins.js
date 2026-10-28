import { HERO_SKINS } from '../data/hero-skins.js';

// Share the original native frames and animation metadata, and recolour through
// the production sprite builder (which also remaps emissive colours). No new
// outline or padding: silhouette-based collision and weapon reach stay identical.
export function skinArt(originals) {
  const result = {};
  for (const [id, { palette }] of Object.entries(HERO_SKINS)) {
    result[id + '_refined'] = { ...originals[id], palette };
    // The Knight's painted portrait is an accepted separate piece, kept intact.
    if (id !== 'knight') result[id + '_refined_pose'] = { ...originals[id + '_pose'], palette };
  }
  return result;
}
