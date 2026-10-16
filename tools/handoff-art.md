# Art handoff: the newer weapons

The signature weapons (16 October 2026) brought the Necromancer's Miasma and two weapons shared by all, the Arcane Ray and Caltrops, with their evolutions; renamed the Shadow's daggers to Shadow Blade; and made his blades spin. (Bone Spear, Shadow Clone and Grasping Dead were tried and taken out: each copied another class's signature.) Everything plays now, but on **borrowed art**. This is what the art pair (one generator, one reviewer) has to deliver, and where each piece goes in.

All art is palette strings, as in `public/js/art/items.js`: one character per pixel, keys from `public/js/art/palette.js`, `.` transparent. The build adds a 1 px dark outline (`k`) round every sprite unless it says `outline: false`, so don't draw one. `emissive` lists the keys that glow unlit in the dark.

Check a piece with `node tools/preview.mjs <name> --scale=8` (writes `tools/out/sheet.png`), and in the game with the developer panel's **Give weapon** (any class's weapon, any hero) and **Evolve all**.

## Icons: 8, in `ICON_ART` (`public/js/art/items.js`)

Each icon is **14 rows of 14 characters**, outlined by the build to **16×16**, like `i_aura` or `i_daggers`. Name them exactly as below, then swap the `icon:` of the weapon in `public/js/data/weapons.js`, or of the relic in `public/js/data/passives.js` (each placeholder is marked `// placeholder (tools/handoff-art.md)`).

| Icon | For | Look | Now borrows |
| --- | --- | --- | --- |
| `i_arcane` | Arcane Ray (shared) | a violet beam of force, `P` `i` `w`, glowing | `i_lightning` |
| `i_prismatic` | Prismatic Ray (its evolution) | the beam splitting in two, a rainbow edge | `i_thunderstorm` |
| `i_caltrops` | Caltrops (shared) | three or four steel caltrops, `N` `g` `G` `w` | `i_frost` |
| `i_razorfield` | Razor Field (its evolution) | a field of razors, a glint of red | `i_frozenheart` |
| `i_miasma` | Miasma (Necromancer) | a green poison cloud, `l` `L` `e`, glowing | `i_aura` |
| `i_pestilence` | Pestilence (its evolution) | the cloud with a skull in it | `i_sanctuary` |
| `i_shadowblade` *(optional)* | Shadow Blade (renamed from Throwing Daggers) | a spinning dark blade | `i_daggers` (it may keep it) |
| `i_phoenix` | Phoenix Heart (a relic: +1 revive, evolves any weapon) | a burning heart, or a phoenix feather in flame, `o` `O` `y` `w`, glowing; swap the `icon:` of `phoenix` in `public/js/data/passives.js` | `i_revival` |

## Sprites

| Sprite | Size | Where it goes in | Now borrows |
| --- | --- | --- | --- |
| `shadowblade` | about 12×12, one frame | `WEAPON_SPRITES.shadowblade` in `public/js/data/weapons.js`, then add it to `PROJECTILE_ART` | `dagger` |
| `caltrop` | about 5×5, one frame | `WEAPON_SPRITES.caltrop` (the scatter in the air) | `dagger` |

Notes for each:

- **`shadowblade`** spins as it flies: the projectile is drawn with `frames[0].rotated(rot, 16)`, so it turns in 16 steps. A blade that reads at any angle (a curved or double-edged dark blade, `q` `p` `N` `G`, a `j` edge) works best. Kael's Shadowstrike throws the same sprite.
- **Caltrops on the ground** are drawn now as little steel crosses (`Pool.drawGround`, the `marks` of `POOL_LOOK.spikes` in `public/js/game/effects.js`). A `caltrop` sprite can replace them there: blit it at each mark instead of the two `fillRect` crosses.

Nothing else draws on borrowed art: Miasma's cloud and trail use the poison palette that `POOL_LOOK.poison` always had, the Arcane Ray is a drawn beam (`Bolt`, style `'ray'`), and Pestilence's bursts are Miasma's own pools.
