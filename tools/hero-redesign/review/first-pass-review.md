# First-pass sprite review

This is the single formal visual critique, before the requested fixup iteration. No second subjective review is planned.

## Overall judgment

These are new designs, but I would not ship this first pass. The class equipment reads; the people carrying it do not yet feel powerful. Compared with the approved Knight, most have small heads, thin bodies and long exposed legs. Several heads visibly float above the shoulders. Adding more gold, particles or trim would hide the problem rather than fix the anatomy.

Spend the one fixup pass on compact, connected anatomy. Close the 1–3 native-pixel neck gaps with shaded necks, gorgets, collars or hoods; a black one-pixel bridge is not enough. Shorten exposed legs by about 2–3 pixels while keeping the feet at the same game anchor. Give the heavy classes wider shoulders, thighs and boots. Keep crisp native pixels; do not solve this by shrinking the finished sprite. Preserve distinct class silhouettes and large value groups.

The shared palette and hard edges already fit the game. The weaknesses are proportion, head/body connection and distribution of visual weight, not a lack of decorative detail. These are my art-direction judgments, not claims of a universal style rule. The visible neck gaps and weakened class readability are more concrete than my preference for compact, heavy proportions.

## Ranger

The bow and green silhouette clearly say Ranger. The silver shape on the head reads more like a helmet or a short white cap than flowing elf hair, and the thin arm/chest make her look tentative. The large bow is useful; the body needs enough presence to wield it.

**Fixup priority:** Make the exposed hair a deliberate silhouette: a 2–3-pixel-wide silver lock or braid extending roughly 7 pixels behind the shoulder, with a separate pointed ear. Connect the jaw to a compact neck and leather shoulder, shorten the lower legs by about 2 pixels, and give the bow arm a firm elbow-to-hand line. Keep the face uncovered and the bow as her dominant prop.

## Sorcerer

The purple robes and raised fire hand read as a caster. The tiny face under a tall, disconnected-looking crown reads more like a fragile royal figurine than a dangerous sorcerer. The vertical gold line down the robe also emphasizes how narrow he is.

**Fixup priority:** Build a substantial shoulder mantle around a visible neck/beard connection. Widen the mantle about 2 pixels on each side and make the face/headpiece one connected mass. Lower the crown prongs about 2 pixels and merge their base into the headpiece. Let a broad purple-and-gold chest shape carry the design instead of one skinny center stripe; keep the casting hand and staff clear.

## Shadow

The floating tail and paired knives give Shadow a strong direction. The little diamond head is too detached from the armored torso, so this currently looks like separate pieces of equipment hovering together. The bright forearms steal attention from the face.

**Fixup priority:** Enlarge the hood about 1 pixel on each side and extend its dark fabric down into a high shoulder cowl, forming one continuous head-to-body silhouette. Keep the two eyes as the focal point. Darken most forearm highlights, reserving the sharp bright clusters for the actual blades. Preserve the hovering lower body and its ground gap.

## Necromancer

The crow is present and recognizable in the enlarged view, and the skull, ribs and black cape establish the class. In the game the skull floats over a narrow rib ladder, while the bird reads like another loose dark object beside it. This needs a composed, commanding upper-body silhouette.

**Fixup priority:** Join the skull to broad raised shoulders with an ivory collar or visible vertebral neck, and replace some thin rib stripes with a few larger bone plates. Perch the crow directly on that shoulder: visible talons/contact, a clear 2-pixel beak and one readable folded wing. Separate the bird from the cape with a restrained blue-gray edge, not an aura. Keep both skulls and the crow readable without enlarging the whole sprite.

## Paladin

The sun shield, winged helmet and gold sword are the strongest immediate class symbols in this set. He still looks like a tall thin fencer wearing paladin props, rather than someone who can hold a line. The helmet-to-chest break is especially damaging here.

**Fixup priority:** Seat the helmet into a visible gorget. Widen the shoulder armor by about 2 pixels per side, give the breastplate one broad lit plane, and thicken the thighs/greaves by about 1 pixel. Reduce the exposed leg length about 2 pixels and keep the shield tight to a substantial forearm. Keep the sun motif; do not add an aura until the armored body itself looks formidable.

## Druid

The stag mask and antlers make this a different character, but the long narrow body and tiny neck make him read as a scarecrow. The chest is busy with small bark marks while the large shape underneath remains weak. The antlers dominate a body that cannot visually support them.

**Fixup priority:** Give him a dense moss-and-bark mantle that connects directly beneath the stag mask, with a broad chest and a short, heavy skirt covering the top of the legs. Merge the chest texture into two or three large bark plates. Shorten the exposed legs about 3 pixels and trim the antlers by 1–2 pixels so the mask and shoulders feel like one powerful woodland figure. Keep a clear gap between antlers and staff.

## Berserker

The single large axe is a good defining choice. The body is the biggest miss: a detached small head, triangular orange chest and narrow legs make him look like a lightweight action figure. The axe is doing almost all the work of making him threatening.

**Fixup priority:** Give him a visible 3-pixel neck and trapezius mass, broaden the upper torso about 4 pixels overall, and thicken both thighs and boots by about 1 pixel. Lower the center of mass by shortening the exposed legs roughly 3 pixels. Use one broad chest highlight and a clear darker side plane, with less patchy skin detail. Keep the axe head separated from the shoulder by a small negative-space gap and support it with a visibly thick forearm.

## Witch Hunter

The hat, pistol and sword identify Witch Hunter immediately. The coat and skinny legs make him feel like a mannequin, and the dark face almost disappears below the brim. He needs a severe person inside the costume, not more accessories.

**Fixup priority:** Connect the face to a raised coat collar and show a restrained cheek/eye highlight under the brim. Broaden the coat shoulders about 1–2 pixels per side and flare the lower coat into a stronger triangular mass while shortening the visible shins about 2 pixels. Keep the pistol and sword silhouettes; shorten the feather slightly so the hat, face and weapons remain the important shapes.

## Evidence and review basis

I inspected the frozen first-pass native roster and all eight native pose sheets, the daylight and crypt game rosters, the eight chronological in-game pose sheets across daylight/crypt contexts, individual mirrored and attack captures, and the approved Knight game capture. I looked at both native game crops and enlarged artwork. The capture take was `20261030120550`; first-pass source/assets remain frozen.

In the pose sequences, equipment remains identifiable through facing changes, and Shadow keeps a floating lower body. The same narrow-body and neck issues persist through the movement cycle, so they should be repaired in the shared character model rather than patched in isolated frames. The review is based on captured sequences, not a claim that I played a complete run.

The external review framework was the vetted [Pixel Art Fundamentals skill](https://github.com/ProkStudio/skills/blob/de1d5f60c10a142f45aca7d07aabb2eed8887e17/skills/game/2d/pixel-art-fundamentals/SKILL.md) and its [critique checklist](https://github.com/ProkStudio/skills/blob/de1d5f60c10a142f45aca7d07aabb2eed8887e17/skills/game/2d/pixel-art-fundamentals/references/critique-checklist.md). See `skill-vetting.md` for scope and safety checks. The per-class observations above are my direct visual assessment of this artwork.
