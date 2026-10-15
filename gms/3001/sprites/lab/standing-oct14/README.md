# Standing proposals · 14 October 2026

Four native pixel-art proposals: Ranger / Thornwarden, Mage / Ember Archmage,
Necromancer / Grave Regent and Necromancer / Ossuary King. Each has a transparent 48×48 left PNG and right
PNG. The 96×48 pair files put left first, then right. All feet anchor at y=40.

The ranger's revised hood shades the brow and near cheek, leaving a smaller face
opening. The mage's revised hat has a continuously tapered cone, a forward-bent tip
and a narrower brim seated over the face; he retains his shorter beard, steel
shoulders and blue/gold robes. Grave Regent has a close
hood, bone shoulders, a green-eyed skull, split crimson robes and a skull staff.
The shared warm ink, steel ramp, compact bodies and hard clusters echo the current
plumed knight. The knight itself was not edited.

Ossuary King is a separate necromancer design: an exposed crowned skull, wide
spiked bone shoulders, dark ribbed armour, ash-green split robes, a clenched
spell hand and a hooked soul staff. Grave Regent remains available unchanged.

| Class | Current visible size | Proposed visible size |
| --- | --- | --- |
| Ranger | 26×32 | 25×30 |
| Mage | 32×37 | 29×35 |
| Necromancer | 28×37 | 27×33 |
| Necromancer / Ossuary King | 28×37 | 29×34 |

These are standing studies only. They do not supply walking or attack cycles and
have not replaced the sprites on port 3000. Lab catalog entries use a single
held frame; selecting them in the existing lab will keep that pose during movement.

Preview: `http://localhost:3001/standing-oct14.html` (start with `npm run lab`).
The preview uses the production `Game`, sprite builder, camera, ground, shadows
and lighting with a disposable profile. It has no save API. Original and proposed
sprites use the same scene, scale and ground anchor.

Editable source: `../src/standing-oct14.js`.

Rebuild from the repository root:

```sh
node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/standing-oct14.js
node gms/3001/tools/export-standing-oct14.mjs
```

Verification: both facing directions were visually reviewed on the comparison
board and in the actual game renderer. The ranger was also checked at native 1×
scale. Transparent exports, exact mirrored pairs, padding, anchors, source/sheet
agreement and JavaScript syntax were checked. No animation approval is implied.
