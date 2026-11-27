# Independent field review of the refined hero sprites

All 23 refinements passed independent visual review. Six passed on their first presentation, sixteen on their second, and the Marksman on her third. The reviewer compared each proposed finish with the shipping hero on the same Darkwood ground, at the same anchor and scale. The original idle reference matched the current production buffer byte-for-byte for every hero. A final pass through the production Game checked both facings, the selected motion frames and the surviving equipment in the lit scene.

| Hero and finish | Decision | Passes | Observations and revisions |
| --- | --- | --- | --- |
| Knight · Fluted field plate | Accepted | 1 | The cooler planes separate the visor, chest and shield boss at field size. The plume still identifies the starter and the sword clears the shield through the swing. The two pieces settle separately. |
| Ranger · Oiled trail leathers | Accepted | 2 | The first horn and leather accents disappeared into the warm outline as the bow drew. A broader pale quiver lip against the bottle-green cloak marks the rear shoulder while leaving the face and bowstring readable. |
| Sorcerer · Ivory travel mantle | Accepted | 2 | The first split hem disappeared on both releases. The indigo backing, old-gold binding and turned cuff now follow the cast and tumble. The blue palm flame stays distinct from the sleeve. |
| Shadow · Tideworn shroud | Accepted | 1 | The teal underside follows the trailing points of the cloak. The hood frames one clear eye line above the forward hand. The open space below the floating body survives both facings. |
| Necromancer · Mourning wool | Accepted | 1 | The overlapping wool shoulder makes the arm distinct from the cloak. Its narrow inner lining and the carved grip leave the staff readable during casting and collapse. |
| Paladin · Pilgrim marshal | Accepted | 2 | The original first-pass shield reverted to bright gold as it fell. The brass now retains its curved light edge through the drop. The maroon vestment remains legible behind it. |
| Druid · Alderwood traveller | Accepted | 2 | The folded mantle first flashed lime during the tumble. Its revised olive shading follows the same leaves into the grounded pose and keeps the white beard distinct. |
| Berserker · Ironbound twin axes | Accepted | 2 | The initial steel bevel vanished on both tossed axes. The new alloy follows the rotating heads into the last pose, while the layer of pelt leaves the forearms and grips unobstructed. |
| Witch Hunter · Waxed riding coat | Accepted | 2 | The first warm yoke was hard to see at release. A warmer brown now holds across shoulder and skirt while aiming. The dark brim and pale forward stock still read separately. |
| Footman · Ashwood shield | Accepted | 2 | Wood and boss initially disappeared at thrust and landing. The revised wood tone follows the turning shield, including its narrow side during attack and its broad face on the ground. |
| Marksman · Indigo hunting jack | Accepted | 3 | The first pass put bright blue crosses on the boots and obscured the boundary between hand and stock. The second darkened the cuffs and separated the walnut stock. The final coat-specific treatment carries cool indigo into the prone shoulder and rear flap while the hair, hat edge and dropped stock stay warm. |
| Templar · Linen campaign surcoat | Accepted | 2 | The linen and warm shield liner initially disappeared on the slash. They now keep the torso and shield distinct during the left and right release, with a consistent brass edge on the ground. |
| Trailblazer · Waxed Wayfarer | Accepted | 2 | The folded hood initially reverted to brighter green partway down. It now keeps its waxed green grade during the stumble, without obscuring the face or the bow. |
| Thornkeeper · Willowbark Warden | Accepted | 2 | The leaf mantle and waist pleats originally jumped to a brighter green in the fall. Revised foliage and willow bindings remain visible as the beard tilts and the staff separates. |
| Wraith · Sable Shroud | Accepted | 1 | A broken, cool cowl band stops before the eye. The softer lilac inner fold tracks the floating points during turns and thrusts. |
| Gravebinder · Barrow Cantor | Accepted | 1 | The broken bone stitch on the long tabard reads below a raised plum shoulder. It stays clear of the face and green staff core during the cast and loss of balance. |
| Arcanist · Indigo Scholar | Accepted | 2 | The original treatment returned to cobalt as the body fell. The revised hat and robe retain their indigo through the cast and landing, with the orange spell and staff lights still the brightest marks. |
| Praetorian · Palatine Guard | Accepted | 2 | The long scutum's steel panel first returned to the original gold at ground contact. Its bronze lip and cooler panel now turn together, keeping the dropped shield identifiable. |
| Seraph · Vesper Mantle | Accepted | 2 | The first feathered mantle reverted to bright gold in the fall. Its softer warm lining now follows the body downward without dimming the halo or blade. |
| Boltguard · Greylock Arbalist | Accepted | 2 | The first jacket reverted at both releases. The cool sleeve, iron rest and walnut stock now travel with the firing arm. The horn nose remains visible against the coat. |
| Swordbearer · Fluted Man-at-Arms | Accepted | 2 | A broad grey fuller initially erased the blade edge at rest. A narrow light edge now separates blade and shield while the cooler steel extends through the strike. |
| Sentinel · Ashwood Watchman | Accepted | 2 | The first ash face dropped as an ordinary dark brown shield. The revised green-grey boards and bands remain distinct as the shield rotates and lands beside the sword. |
| Copper Merchant · Ur Wool Merchant | Accepted | 1 | The beard reads as carved rows below the original face. The diagonal sash and stepped wool hem remain visible as the statue turns, while its copper whip and fallen equipment remain distinct. |

## Reproduce the comparisons

Run `node tools/field-refined-review.mjs --baseline` to cache original native frames, then `node tools/field-refined-review.mjs` to render the paired sheets. Either command accepts specific hero IDs for a focused pass. The tool reuses the earlier Darkwood capture when available. A fresh checkout paints the backdrop from the game's Darkwood terrain and night colours.

The output is under `output/field-refined/`. Each hero's `-idle.png` shows a threefold enlargement. The `-poses.png` sheets pair right and left travel and strikes with the original above the refinement at native size. Six death samples follow the stumble through surviving equipment. The `-cycle.png` sheets show the complete native walk and standing strike in order, including the return to their first frames.

For the final field plates, run `node tools/field-refined-capture.mjs` with `CANVAS_MODULE` pointing to an installed `@napi-rs/canvas` package. The capture changes each review hero in one disposable Game, calls the production draw path, and verifies the frame and facing reported by the player renderer. The six `field-*.png` overviews show original and refined pairs at 1×. Each hero's `-field.png` includes both facings and a 2× enlargement.
