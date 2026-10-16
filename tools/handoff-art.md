# Art handoff: the class rosters' new weapons

The class rosters (16 October 2026) brought eight new weapons and evolutions, renamed the Shadow's daggers to Shadow Blade, and made his blades spin. Everything plays now, but on **borrowed art**. This is what the art pair (one generator, one reviewer) has to deliver, and where each piece goes in.

All art is palette strings, as in `public/js/art/items.js`: one character per pixel, keys from `public/js/art/palette.js`, `.` transparent. The build adds a 1 px dark outline (`k`) round every sprite unless it says `outline: false`, so don't draw one. `emissive` lists the keys that glow unlit in the dark.

Check a piece with `node tools/preview.mjs <name> --scale=8` (writes `tools/out/sheet.png`), and in the game with the developer panel's **Give weapon** (any class's weapon, any hero) and **Evolve all**.

## Icons: 13, in `ICON_ART` (`public/js/art/items.js`)

Each icon is **14 rows of 14 characters**, outlined by the build to **16×16**, like `i_aura` or `i_daggers`. Name them exactly as below, then swap the `icon:` of the weapon in `public/js/data/weapons.js` (each placeholder is marked `// placeholder (tools/handoff-art.md)`).

| Icon | For | Look | Now borrows |
| --- | --- | --- | --- |
| `i_arcane` | Arcane Ray (Sorcerer) | a violet beam of force, `P` `i` `w`, glowing | `i_lightning` |
| `i_prismatic` | Prismatic Ray (its evolution) | the beam splitting in two, a rainbow edge | `i_thunderstorm` |
| `i_caltrops` | Caltrops (Shadow) | three or four steel caltrops, `N` `g` `G` `w` | `i_frost` |
| `i_razorfield` | Razor Field (its evolution) | a field of razors, a glint of red | `i_frozenheart` |
| `i_clone` | Shadow Clone (Shadow) | Kael's hooded silhouette in `q` `p` `j`, half seen | `i_daggers` |
| `i_twinshadows` | Twin Shadows (its evolution) | two such shades back to back, blades between | `i_shadowstrike` |
| `i_miasma` | Miasma (Necromancer) | a green poison cloud, `l` `L` `e`, glowing | `i_aura` |
| `i_pestilence` | Pestilence (its evolution) | the cloud with a skull in it | `i_sanctuary` |
| `i_bonespear` | Bone Spear (Necromancer) | a spear of bone, `z` `Z`, diagonal | `i_bow` |
| `i_spinelance` | Spine Lance (its evolution) | a barbed spine lance, a green glow | `i_stormstring` |
| `i_grasp` | Grasping Dead (Necromancer) | a skeletal hand clawing out of dirt (`m` `b`) | `i_thorns` |
| `i_gravehands` | Hands of the Grave (its evolution) | a ring of hands | `i_briarheart` |
| `i_shadowblade` *(optional)* | Shadow Blade (renamed from Throwing Daggers) | a spinning dark blade | `i_daggers` (it may keep it) |

## Sprites

| Sprite | Size | Where it goes in | Now borrows |
| --- | --- | --- | --- |
| `shadowblade` | about 12×12, one frame | `WEAPON_SPRITES.shadowblade` in `public/js/data/weapons.js`, then add it to `PROJECTILE_ART` | `dagger` |
| `bonespear` | 14×4, one frame, pointing right | `WEAPON_SPRITES.bonespear`; then set `scale: 1.25` to `scale: 1` in `KINDS.bonespear.shoot` (`public/js/game/weapons.js`) | `bone`, drawn 1.25× |
| `grasp` | two frames, about 9×14 like `thorn` | `THORN_LOOK.bone` in `public/js/game/effects.js`: `sprite: 'grasp', frames: [0, 1]`, and drop its `tint` | `thorn`'s iron frames 2-3, tinted toward `#c0cbdc` |
| `caltrop` | about 5×5, one frame | `WEAPON_SPRITES.caltrop` (the scatter in the air) | `dagger` |
| clone look | a tint, or a sheet | `LOOKS.shadow` in `public/js/game/minions.js`: `sprite` (`WEAPON_SPRITES.clone`), `tint` (a `TINTS` entry in `public/js/engine/sprites.js`) and `alpha` | Kael's own `rogue` sheet, silhouetted (`TINTS.shadow`) at 60% |

Notes for each:

- **`shadowblade`** spins as it flies: the projectile is drawn with `frames[0].rotated(rot, 16)`, so it turns in 16 steps. A blade that reads at any angle (a curved or double-edged dark blade, `q` `p` `N` `G`, a `j` edge) works best. Kael's Shadowstrike and Twin Shadows throw the same sprite.
- **`bonespear`** flies point first: drawn with `frames[0].rotated(ang, 32)`, pointing right at angle 0. Bone `z` `Z`, a sharp tip, a knuckle at the back; Spine Lance trails green (`l`).
- **`grasp`** rises out of the ground: `Thorns.draw` crops it from the top down as it grows, its bottom row on the ground. Two variants side by side along the line (an open hand and a clutching one, say). Pale bone `#c0cbdc` (`G`) and `#8b9bb4` (`g`), no leaves; dirt is drawn under it already.
- **Caltrops on the ground** are drawn now as little steel crosses (`Pool.drawGround`, the `marks` of `POOL_LOOK.spikes` in `public/js/game/effects.js`). A `caltrop` sprite can replace them there: blit it at each mark instead of the two `fillRect` crosses.
- **The clone** is Kael's own sprite and walk cycle. If the pair wants a look of its own, a new `TINTS` entry (say, a deep violet `#3b2346` at 70%) is the smallest change; a whole sheet would go in through `WEAPON_SPRITES.clone`, with `walk` and `idle` lists like the heroes'.

Nothing else draws on borrowed art: Miasma's cloud and trail use the poison palette that `POOL_LOOK.poison` always had, the Arcane Ray is a drawn beam (`Bolt`, style `'ray'`), and Pestilence's bursts are Miasma's own pools.
