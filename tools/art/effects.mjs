// Spell and hit effects from two CC0 packs; baked by tools/bake-art.mjs into
// public/assets/art/effects.js, drawn by js/game/fxart.js (and effects.js, projectiles.js).
// Ninja Adventure's flames burn over Firebomb's and Hellfire's pools, its explosion goes off with
// every fire blast and its fireball is the Fireball; Gothicvania Magic Pack 9's fire bomb is a
// flask's shatter and a meteor's crash, its lightning Thunderstorm's and Chain Lightning's strike.
// The colours are swapped for the game's own (art/palette.js), Hellfire's for its blue.
const NINJA = 'pixel-boy-ninja-adventure/FX/';
const MP9 = 'ansimuz-gothicvania-magic-pack-9/';

// Ninja Adventure's fire into the game's: its pale yellow, orange and red.
const FIRE = { '#ffe18d': '#fee761', '#ffad5d': '#feae34', '#e66a3a': '#f77622', '#e46d3a': '#f77622', '#ff9554': '#feae34' };
// Ninja Adventure's explosion a step warmer, so its flash is fire and not a white cloud; its smoke kept.
const BLAST = { '#ffffff': '#fee761', '#ffe18d': '#feae34', '#ffbb6a': '#feae34', '#ffad5d': '#f77622', '#f08648': '#f77622', '#e66a3a': '#be4a2f', '#e46d3a': '#be4a2f' };
// The same into Hellfire's blue flames, a white heart kept.
const HELL = { '#ffe18d': '#2ce8f5', '#ffad5d': '#0099db', '#e66a3a': '#124e89', '#e46d3a': '#124e89' };
// Magic Pack 9's fire bomb: its yellow, orange, red and dark red; and in Hellfire's blue.
const BOMB = { '#ffde6a': '#fee761', '#ff9420': '#f77622', '#de4a20': '#be4a2f', '#a62a21': '#a22633' };
const BOMB_HELL = { '#ffffff': '#ffffff', '#ffde6a': '#2ce8f5', '#ff9420': '#0099db', '#de4a20': '#124e89', '#a62a21': '#262b44' };
// Magic Pack 9's lightning in the game's shock: white and cyan, its yellow white and its orange sparks cyan.
const ZAP = { '#ffde6a': '#ffffff', '#20d6c7': '#2ce8f5', '#a6fcdb': '#c0f8ff', '#ff9420': '#2ce8f5', '#00a0f8': '#0099db' };

export default {
  credits: [
    {
      pack: 'pixel-boy-ninja-adventure',
      title: 'Ninja Adventure Asset Pack',
      what: 'Flames on fire pools, fire explosions, the fireball',
      source: 'FX/Elemental/Flam/SpriteSheet.png, FX/Elemental/Explosion/SpriteSheet.png, FX/Projectile/Fireball.png',
      author: 'Pixel-Boy & AAA',
      link: 'https://pixel-boy.itch.io/ninja-adventure-asset-pack',
      licence: 'CC0',
    },
    {
      pack: 'ansimuz-gothicvania-magic-pack-9',
      title: 'Gothicvania Magic Pack 9',
      what: "A flask's shatter, a meteor's crash, lightning strikes",
      source: 'fx-fire-bomb.png, fx-lightning.png',
      author: 'Luis Zuno (ansimuz)',
      link: 'https://opengameart.org/content/gothicvania-magic-pack-9',
      licence: 'CC0',
    },
  ],
  sprites: {
    // A flame rising, flaring and scattering into sparks: 10 frames, its foot on the box's bottom.
    fx_flame: { file: `${NINJA}Elemental/Flam/SpriteSheet.png`, frame: [20, 30], map: FIRE, trim: true },
    fx_flame_hell: { file: `${NINJA}Elemental/Flam/SpriteSheet.png`, frame: [20, 30], map: HELL, trim: true },
    // A fire blast: a flash, a ball of flame, then smoke (the first frame, a falling shell, left out).
    fx_explosion: { file: `${NINJA}Elemental/Explosion/SpriteSheet.png`, frame: [40, 40], from: 1, map: BLAST, trim: true },
    // The fire bomb's blast, a dome on the ground (its blue charge-up and last, empty frame left out).
    fx_firebomb: { file: `${MP9}fx-fire-bomb.png`, frame: [64, 64], from: 7, count: 7, map: BOMB, trim: true },
    fx_firebomb_hell: { file: `${MP9}fx-fire-bomb.png`, frame: [64, 64], from: 7, count: 7, map: BOMB_HELL, trim: true },
    // A bolt from the sky (frames 0-3) and its splash on the ground (4-9; the last, empty one left out).
    fx_lightning: { file: `${MP9}fx-lightning.png`, frame: [56, 126], count: 10, map: ZAP, trim: true },
    // The fireball, flying up and to the right: 4 frames.
    fx_fireball: { file: `${NINJA}Projectile/Fireball.png`, frame: [16, 16], map: FIRE },
  },
};
