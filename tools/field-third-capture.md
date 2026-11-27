# Third hero proposal capture

From the repository root, run a capture for one authored hero. Omitting the last argument generates both packets in one disposable Game.

```sh
node tools/field-third-capture.mjs knight design
node tools/field-third-capture.mjs knight motion
```

The command uses the registered `reforged` proposal for that hero, the production sprite builder, a seeded Darkwood Game, its player and camera, and its departing-soul HUD renderer. It uses a local installation of `@napi-rs/canvas` or the bundled Codex native Canvas installation. Set `CANVAS_MODULE` to the absolute package path to select another installation. The module used is recorded in each manifest.

## Read the evidence

Every design packet includes the original gameplay Eldrin and Plumed Knight at 1× and 3× on Darkwood. They illustrate the requested finish, lighting and readability. Each hero's own original supplies its proportions. Shadow retains his floating spectral shape and the Necromancer his gaunt build. [View the reference plate](../reviews/media/2026-11-27-hero-style.png).

Files are written under `output/field-third/<hero>/`. Each completed manifest lists the PNGs for that invocation in `images`. Follow that list when the same hero has been captured more than once.

- `design.png` shows the original, refined and reforged drawings in three columns. Idle, walk, release, fall and final equipment each have a 2× right-facing and a 1× left-facing view. The hero's world position and the camera are identical throughout.
- The `motion-*.png` sheets show the reforged proposal at native gameplay scale. Right and left samples are adjacent. Each cell gives its phase and native frame index. Moving attacks show the strike phase followed by the gait phase. The transition sheet isolates wraparound, incoming diagonal travel, release, recovery and the return to rest.
- Cyan side ticks mark the fixed ground row. The bottom tick marks the player's fixed horizontal anchor. In death and wisp sheets, a second rendering below the scene shows the native source frame on its own anchor. Thus the asset can still be inspected when the game is displaying the hit flash, masking a sinking soul or has finished presenting it. The final remains sheet samples the first observed hold and the last instant before the game's results transition when that frame is held long enough for both samples.
- `motion.json` records phase times in seconds, real Game clocks, world and screen anchors, native index, facing, visible ink bounds relative to the ground anchor, and occupied spans in the last row above ground. Span endpoints and ink bounds use an exclusive upper edge. A staff tip, hem or weapon can appear in the ground row alongside boots. Each native geometry entry includes its unclipped source bounds, ink centroid, and bottom-row runs. A pose outside its production display window has a visibility label and no visible scene bounds.

The player stays on the same world coordinates while `Player.advanceAnimation` receives the ground distance for the chosen gait phase. Standing attacks use the weapon's production frame rate. Moving attacks exercise every strike-and-gait combination, including repeated native frame indices. Full standing attack sheets include authored anticipation poses exposed by the field preview. The manifest's `manualStrike` field identifies which poses the gameplay strike starts from. Death and soul timing are sampled from each asset's own `frameAt` function. Poses follow the game clock. Stored frames the clock never returns appear last, labelled `asset only`.

## Watch the gait at game speed

The motion packet also includes a continuous four-second run. `travel.gif` records the actual player moving across Darkwood at 15 fps while the Game advances at 60 Hz. `motion-travel.png` lays out the same run in time order and marks cumulative distance. The `travel` entry in the manifest records world positions, facing, frame index and projected rectangle for these samples.

## Revise a drawing

Each module under `public/field-studio/art/reforged/heroes/` contains one hand-authored set of native pixel grids. The period represents transparency. Other characters reference the hero's palette. Increasing x faces right and increasing y points towards the ground. The origin lies between the soles.

- Draw the head, torso, cloak and front garment in their local grids. Each part's `at` places its top-left pixel relative to the origin.
- Draw each arm from shoulder to hand and each leg from hip to sole. The `axis` column, joint rows and hand or foot design keep the pieces attached when they bend. Weapons have their own `grip` coordinate.
- Use `motion` to position shoulders, hands, hips and feet. Tune stride, lift, body movement, weapon keys and drop positions for the individual hero. The standing strike keeps its ground contact while the arms, head and torso can shift. Hovering heroes use trailing cloth and a `hover` height.
- Use `forms` for alternate drawings, such as a drawn bow. `poses` can override individual source frames. Capture the changed hero again and have its reviewer examine the design and the affected sequences through the loop boundary.
