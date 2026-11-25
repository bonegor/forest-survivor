---
name: "sprite-maker"
description: "Make 2D game sprites with free code-drawn pixel or vector art (characters, enemies, projectiles, pickups, tiles, icons, effects, animations) as sprite sheets + JSON atlas; use whenever the user wants sprites, pixel art or game art."
---

# Sprite Maker

Claude can't paint images, but it can place pixels and shapes exactly. This skill turns that into a small production pipeline that needs only Python and the free Pillow library. You write each sprite as a text grid (pixel art) or as SVG (smooth vector style). Then `sprite_tool.py` renders engine-ready sprite sheets, a JSON atlas, a zoomed preview for checking your work, and GIFs for the user. It uses no paid services and no image generators.

It works best for small, readable game art from 8 to 64 px: characters, enemies, projectiles, pickups, tiles, icons and effects. That is exactly what top-down action games like Vampire Survivors-likes need. Painterly or photoreal art is out of reach; say so and offer the closest pixel or vector version.

## 1. Setup (once per project)

1. Look for `sprite_tool.py` (project root or `art/`). If it's missing, create it from the last section of this file. If this SKILL.md is readable on disk (its folder is usually shown when the skill loads), don't retype the ~640 lines. Extract them with a few lines of Python: take the text between the line after the heading `## sprite_tool.py` that starts the python code fence and the closing fence. Otherwise write it out verbatim. Then check it with `python sprite_tool.py -h`.
2. Check that Pillow is installed with `python -c "import PIL"`. If `python` isn't found, use `python3` (macOS/Linux) or `py` (Windows). If Pillow is missing, run `python -m pip install pillow`. In the Claude app, code execution must be on (Settings → Capabilities → "Create and edit files").
3. Use `art/src/` for sources (`.sprite`, `.svg`) and `art/out/` for generated files. The sources are the real assets; outputs can always be regenerated.

## 2. Workflow

1. **Brief.** Settle which sprites, their size and camera view, the animations and frame counts, and the game's ground colour (used in previews). Don't quiz the user. Fill gaps from the size guide (section 6) and state your assumptions in one line.
2. **Palette first.** Write `art/src/palette.sprite` (start from the default in section 4 or the user's own palette) and `include` it in every sprite. One palette for the whole game keeps the art consistent and makes recoloured variants trivial.
3. **Anchor the style.** If this is the project's first art and the user is around, show one representative sprite (the player, or the most important enemy) and get an OK before batch work. If the look is already approved, or no one can answer, make the batch and treat your first sprite as the anchor. Later sprites copy its outline, shading and proportions.
4. **Render, look, fix.** Run `python sprite_tool.py render "art/src/*.sprite" --out art/out --atlas atlas --bg "#<ground>"`. Add `--flash` for hit-flash sheets. Fix every ERROR and weigh every WARN. Then open `art/out/<name>_preview.png` with the Read tool and critique it against section 3. Fix the one or two biggest problems per pass. Stop after about three passes unless the user wants more: each pass costs usage, and small sprites stop improving quickly.
5. **Deliver.** Hand over `<name>.png` + `<name>.json` (and `atlas.png`/`atlas.json`), show the preview, mention the GIFs, and give the import notes from section 9 the first time.

**Reading the preview.** Each animation row shows its frames zoomed on a checkerboard (checkerboard = transparent). Under them, an "on ground 2x" strip shows every frame on the game background, which is what players actually see. At the bottom, the first frame appears at 1x and 2x and as a solid black "shape" (the silhouette test). Tiles also get a 3x3 repeat to reveal seams. You can't watch the GIFs, so judge motion by comparing neighbouring frames.

## 3. What makes small sprites read well

- **Silhouette first.** Block the shape in one or two colours before adding detail, then check the black shape panel. If the silhouette doesn't read, detail won't save it. At 16 px a big head and an exaggerated pose beat realistic proportions.
- **Few colours, in ramps.** Use 3–4 shades per material (shadow → base → light → highlight). Shift the hue along the ramp, with shadows cooler (toward blue or purple) and highlights warmer (toward yellow), instead of only darkening and lightening. Rough budget: 8 colours or fewer at 16 px, 12–16 at 32 px. `limit N` warns you when you go over.
- **One light source**, top-left, for every sprite in the game. `frame sym` mirrors everything, so add the asymmetric highlights and shadows afterwards with `@` patches.
- **Outline.** A near-black outline (the palette's darkest colour, not pure black) separates a sprite from busy backgrounds. From about 24 px you can use a "selective outline": darker shades of the local colour on the lit side.
- **Check against the real ground.** On dark grounds the outline barely shows, so body colours and every moving limb must be clearly lighter than the ground. In Sweetie 16, `o k n p t` are dark: keep them for outlines and interior shading. On light grounds the reverse applies. The "on ground 2x" strip shows the problem in every frame.
- **Contrast hierarchy for crowded screens.**
  - Ground: low contrast, desaturated, few colours.
  - Enemies: clear silhouettes, medium-high contrast.
  - Player: the most distinctive colours on screen.
  - Projectiles and pickups: the brightest, most saturated things, often with a white core or glint.
- **Colour roles across the cast.**
  - Give each enemy type its own main hue.
  - Reserve one hue (usually red/orange) for elites and danger.
  - Keep pickup colours (XP gems) off enemies.
  - Keep the player's colours unique.
- **Clean lines.** Lines should step in regular patterns (1-1-1, 2-2-2, or a smooth 1-2-3). Avoid "pillow shading", where every edge darkens toward the centre; shade away from the light instead. Avoid "banding", where shade strips just echo the outline. Remove stray single pixels unless they're sparkles; the tool flags them.
- **Faces.** At 16 px, 1-pixel eyes with strong contrast beat any detail.
- **Stable framing.** Every frame of a character uses the same canvas, with feet on the same row. Anything that moves keeps a 1 px empty margin at the top and sides; the tool warns when it doesn't.
- **Facing.** Draw side-view characters facing right; engines flip them for left.

## 4. The .sprite format

A `.sprite` file is plain text. Each palette character maps to a colour, and each frame is a grid of those characters. The default palette is Sweetie 16 (by GrafxKid, free to use); its letters make the ramps easy to remember. Adding one to three colours is fine when a material needs it, for example `color R #e43b44` (vivid red) or `color B #8f563b` (wood brown).

```
# art/src/palette.sprite - Sweetie 16
# ramps: greys o k m l w | warm p r a y | greens t g G | blues n b c C
color o #1a1c2c   # outline, near-black
color k #333c57   # dark slate
color m #566c86   # slate
color l #94b0c2   # light slate
color w #f4f4f4   # white
color p #5d275d   # plum (warm shadow)
color r #b13e53   # red
color a #ef7d57   # orange
color y #ffcd75   # yellow, light skin
color t #257179   # teal (green shadow)
color g #38b764   # green
color G #a7f070   # lime (green highlight)
color n #29366f   # navy
color b #3b5dc9   # blue
color c #41a6f6   # sky
color C #73eff7   # cyan
```

Example (tested). A 2-frame idle slime plus a red elite version:

```
include palette.sprite
sprite slime
size 14x10
limit 6
anim idle fps=4
frame sym            # rows are the left half; the tool mirrors them
.......
.......
.......
.....oo
...oogg
..ogggg
..ogggg
..ogggg
..otggg
...oooo
@4:5 GG              # top-left highlight
@5:3 GG
@6:7 ogo             # eyes looking right
@7:7 ogo
frame sym            # squash: 1px lower, 2px wider, eyes squint
.......
.......
.......
.......
....ooo
..ooggg
.oggggg
.oggggg
.otgggg
..ooooo
@5:4 GG
@6:2 GG
@7:8 ogo
variant slime_red g=#b13e53 G=#ef7d57 t=#5d275d
```

| Line | Meaning |
|---|---|
| `include palette.sprite` | Paste another file here (path relative to this file). Put it first. |
| `sprite NAME` | Output name (default: the file name). |
| `size 16x16` | Canvas size for every frame of this sprite. |
| `color c #rrggbb` | Palette char → colour (`#rrggbbaa` and `transparent` also work). |
| `limit 8` | Warn if the sprite uses more colours. |
| `tile` | Mark a ground tile: no edge warnings, and the preview adds a 3x3 repeat. |
| `anim NAME fps=8 [loop=false]` | Start an animation, which becomes one row of the sheet. |
| `anim NAME from=OTHER [flip] [flipv] [rot=90] [shift=dx,dy] [reverse] [fps=N]` | Derive a whole animation from another. |
| `frame [hold=2]` | Followed by exactly H rows of W chars. `hold=2` shows the frame twice as long. |
| `frame sym` | Rows hold only the left half (⌈W/2⌉ chars); the right half is mirrored. |
| `frame from=ANIM:i` or `from=i` + `[flip] [flipv] [rot=..] [shift=dx,dy] [hold=n]` | Copy an earlier frame (`i` is 0-based; same anim if no name) and transform it. |
| `@ROW chars` / `@ROW:COL chars` | Right after a frame: replace a whole row, or write chars from column COL (0-based). |
| `variant NAME c=#hex ...` | Also output a recoloured copy (elites, teams, damage states). |
| `# text` | Comment (whole line, or after a space). |

Rules that save debugging time:

- `.` is always transparent, including inside `@` patches, where writing `.` erases.
- `#`, `@` and `.` can't be palette chars. Pick letters that look different in a grid.
- Rows contain no spaces. A frame needs exactly H rows, unless it uses `from=`.
- Transforms run before patches, so patches land on the shifted, flipped or rotated frame.
- `shift` drops whatever moves off the canvas; for example, `shift=0,1` cuts off feet on the bottom row, so patch them back.
- `rot` turns clockwise and needs a square canvas.
- Output per sprite (and per variant) in `--out`:
  - `<name>.png`: the sheet, one row per animation.
  - `<name>.json`: the atlas.
  - `<name>_preview.png`: the preview.
  - `<name>_<anim>.gif`: one GIF per animation.
  - With `--flash`: `<name>_flash.png`.
  - With `--atlas NAME`: also `NAME.png` + `NAME.json` with every sprite, including flash frames.

## 5. Animation recipes

**Side-view walker, 16×16 (tested).** Swap in your own head and body; the leg rows (13–15) and the frame recipe are what you reuse. `n` is the far leg (darker) and `m` the near leg:

```
anim idle fps=4
frame                         # standing: hips row 12, feet row 15
................
......oooo......
.....oyyyyo.....
....oyyyyyyo....
....oyyyyoyo....
....oayyyyyo....
.....oaaaao.....
....obbbbbbo....
...obcbbbbbbo...
...obcbbbbbyo...
...oooobbbbo....
.....onnnnno....
.....onnnnno....
.....onn.mmo....
.....onn.mmo....
.....ooo.ooo....
frame from=0 shift=0,1        # breathe: all 1px down, then restore the feet
@14 .....onn.mmo....
@15 .....ooo.ooo....
anim walk fps=8
frame from=idle:0 shift=0,1   # contact: legs apart, body low
@14 ....onno.ommo...
@15 ...ooo....ooo...
frame from=idle:0             # passing: legs together, body high
@13 .....onnmmo.....
@14 .....ooommo.....
@15 .......ooo......
frame from=0                  # contact, other leg forward
@14 ....ommo.onno...
@15 ...ooo....ooo...
frame from=1                  # passing, other leg lifted
@13 .....ommnno.....
@14 .....ooonno.....
@15 .......ooo......
```

- **Idle** (2–4 frames, 3–5 fps): the body drops 1 px while the feet stay put (as above). Floating creatures can simply use `shift=0,1`.
- **Shamble or waddle** (zombies, tiny enemies): a 2-frame walk, or the 4-frame walk with `hold=2` on the dragging frame.
- **Flying** (bat, ghost): wings up/down (2 frames) or up/mid/down/mid (4), 8–12 fps. Add a 1 px body bob with `shift`. Make wing tips readable shapes, not thin lines.
- **Slime / blob:** rest → squash (1 px lower, wider) → rest → stretch (taller, narrower). Keep the bottom row fixed.
- **Spinning projectile** (axe, knife, shuriken): draw one frame on a square canvas, then add `frame from=0 rot=90`, `rot=180` and `rot=270`. Play at 12–16 fps.
- **Hit spark** (3 frames, 15 fps, `loop=false`): small star → bigger, thinner star → 2–3 specks.
- **Death poof** (5–6 frames, 12 fps, `loop=false`): puff → expanding ring → specks → smaller specks → empty. Add `anim spawn from=death reverse` for a spawn effect.
- **Pickup:** an `idle` anim (1 frame) plus a `glint` anim (3 frames, 8 fps) where a 1–2 px white glint crosses the item. The game plays the glint now and then, and does any bobbing itself.
- **Hit flash:** render with `--flash` and swap to the `_flash` frames (same layout, solid white) for 1–2 frames when hit.
- **Elites and variants:** use a `variant` line instead of redrawing. Change hue and brightness, keep the silhouette.

## 6. Size guide (Survivors-like, ~640×360 internal resolution scaled 2–3x)

| Asset | Canvas | Frames |
|---|---|---|
| Player | 16×16 – 24×24 | idle 2, walk 4 |
| Common enemy (bat, zombie, skeleton, ghost, slime) | 16×16 | 2–4, looping |
| Elite enemy | same as base | `variant` |
| Big enemy / boss | 32×32 – 48×48 | 4 |
| Projectile | 8×8 – 16×16 | 1, plus `rot` copies for spin |
| XP gem, coin | 8×8 – 12×12 | idle 1, glint 3 |
| Pickup (food, chest, magnet) | 12×12 – 16×16 | 1 |
| Hit spark / death poof | 16×16 – 24×24 | 3–6, `loop=false` |
| Ground tile | 16×16 or 32×32, `tile` | 1, plus 1–2 variants to break repetition |
| Upgrade / level-up icon | 16×16 or 24×24 | 1 |

If the user asks for other sizes, follow them. Keep every character in one game within the same few canvas sizes.

## 7. Smooth vector style

Use this route when the user wants clean, non-pixel art, or for sprites of 48 px and up, where text grids get long.

1. **Size and filtering.** Rasterize at the size the sprite is drawn on screen: a 32 px sprite shown at 2x should get `--size 64x64`. The engine must use linear filtering (Godot: Linear; Unity: Bilinear; Phaser: no `pixelArt: true`). Small anti-aliased art scaled up with nearest-neighbour or blurry filtering looks bad, so tell the user.
2. **Drawing.**
   - Write SVGs with `viewBox="0 0 W H"` and the palette's hex colours.
   - Use big, simple shapes with flat fills, plus one shadow shape and one highlight shape, lit from the top-left.
   - For one clean outline around several parts, draw the whole silhouette first with a thick dark stroke (`stroke="#1a1c2c" stroke-width="3" stroke-linejoin="round"`), then the fills on top with no stroke.
   - Keep 1 px of margin, and for spinning items keep every point within W/2−1 of the centre.
3. **Generate frames with a short Python script**, one folder per sprite, with files named `<anim>_<i>.svg`.
   - Animate by changing transforms only: rotate limbs around joints, move the body 1 unit for bobs, and use `sin(2*pi*i/n)` for loops.
   - Make colour variants by looping over colour sets in the same script.
   - For palette hex values, use `from sprite_tool import palette_of`: `palette_of(path)` returns `{char: (r, g, b, a)}`.
   - Spinning: in smooth style, the engine can rotate a single frame. Otherwise use 8 frames at 45°. Don't rotate the light with the sprite if you can help it.
4. **Rasterize and pack everything in two commands:**
   ```
   python sprite_tool.py svg art/src/gem art/src/axe art/src/fireball --size 32x32 --out art/tmp
   python sprite_tool.py pack "art/tmp/*" --out art/out --atlas atlas --fps 12 --once explode --smooth --bg "#<ground>"
   ```
   - `svg` writes each source folder to `art/tmp/<folder>/`, using the first free rasterizer it finds: cairosvg, resvg, Inkscape, or Playwright's Chromium. If none is installed, offer `python -m pip install playwright` then `python -m playwright install chromium` (works on Windows), or Inkscape. Godot can also import `.svg` directly.
   - `pack` turns each folder into a sprite named after it.
     - Options: `--fps idle=4,glint=8` for per-animation speeds, `--order idle,glint` for row order, `--once` for non-looping animations, `--smooth` for smooth preview zoom.
     - It warns about repeated frames and edge clipping.

## 8. Code-drawn and hybrid sprites

- **Procedural batches** suit many similar items (rocks, crystals, potions, particles). A short Pillow script draws `<anim>_<i>.png` frames at native size with `ImageDraw`; at small sizes this stays pixel-exact. Then `pack` the folder. Seed the randomness so reruns give the same art.
- **Vector to pixel art.** Block a complex pose quickly in SVG and rasterize it at 4x. Run `python sprite_tool.py snap big.png --size 16x16 --palette art/src/palette.sprite` to shrink it onto the palette. Then `python sprite_tool.py tosprite small.png --palette art/src/palette.sprite` prints `.sprite` rows to paste and hand-polish. Snapped art always needs cleanup (stray pixels, broken outlines), so treat it as a sketch.

## 9. Engine import

Each `<name>.png` sheet has one row per animation, frames left to right, all cells the same size. Its `<name>.json` is in the common "JSON hash" atlas format (TexturePacker and Aseprite style):

- Frames are named `sprite/anim/index`, each with its duration in ms.
- `meta.frameTags` gives each animation's frame range.
- `meta.grid` gives cell size, columns, and per-row fps/loop.

`atlas.json` has the frames and tags for every sprite, but no grid. Use it with engines that read atlases. Use the per-sprite sheets with grid importers.

Engine notes:

- **Godot 4:** for pixel art, set Project Settings → Rendering → Textures → Default Texture Filter to Nearest. In AnimatedSprite2D, create SpriteFrames, choose "Add frames from sprite sheet" on a per-sprite sheet, set Horizontal to `meta.grid.columns` and Vertical to the row count, and pick one row per animation.
- **Unity:**
  - Import settings: Texture Type "Sprite (2D and UI)", Sprite Mode Multiple, Pixels Per Unit = cell size, Compression None, Filter Mode Point for pixel art (Bilinear for vector).
  - Slicing: Sprite Editor → Slice → Grid By Cell Size.
- **Phaser 3:** set `pixelArt: true` for pixel art and load with `this.load.atlas('atlas', 'atlas.png', 'atlas.json')`. List the frames yourself so held frames can repeat: `this.anims.create({ key: 'zombie-walk', frames: [0, 1, 1, 2, 3].map(i => ({ key: 'atlas', frame: 'zombie/walk/' + i })), frameRate: 8, repeat: -1 })`.
- **Others** (LÖVE, MonoGame, pygame, GameMaker): slice by the even grid or read the JSON.

Engines that play at a fixed fps ignore per-frame durations. To keep a `hold=2` frame, list it twice, as in the Phaser example. With hordes of enemies on screen, loading one atlas keeps rendering fast.

## 10. Using less of the user's plan

- Extract `sprite_tool.py` instead of retyping it (setup step 1).
- Derive instead of redrawing: `sym`, `from=` + `@` patches, `rot`, `flip`, `anim … from=`, and `variant`.
- Use the smallest canvas the game allows. A 16×16 frame is 16 short rows; a 64×64 frame is 64 long ones.
- Render everything in one command, and open only the previews you need to judge.
- Fix the biggest problem per pass. Three passes is usually the useful limit.

## sprite_tool.py

Create this file exactly as shown (only when it isn't already in the project):

```python
#!/usr/bin/env python3
"""sprite_tool.py - free sprite pipeline. Needs only Python 3.8+ and Pillow.

  render FILE.sprite ... [--out DIR] [--atlas NAME] [--flash] [--frames] [--pad N] [--scale N] [--bg #hex]
  pack   FRAMES_DIR ... [--name NAME] [--fps 8 | --fps idle=4,walk=8] [--order idle,walk] [--once death]
         [--out DIR] [--atlas NAME] [--flash] [--smooth]      (frames named <anim>_<i>.png)
  svg    FILE.svg|DIR ... --size WxH [--out DIR]     SVG -> PNG; a folder DIR goes to OUT/DIR
         (uses cairosvg, resvg, Inkscape or Playwright, whichever is installed)
  snap   IN.png --size WxH [--palette P.sprite | --colors N] [--out OUT.png]
  tosprite IN.png --palette P.sprite                 print a small PNG as .sprite rows
"""
import argparse, glob, json, os, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

RS = getattr(Image, "Resampling", Image)
CLEAR = (0, 0, 0, 0)
KEYWORDS = {"sprite", "size", "color", "limit", "tile", "anim", "frame", "variant"}


class SpriteError(Exception):
    pass


def hexcolor(s, where):
    if s.lower() in ("transparent", "clear", "none"):
        return CLEAR
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?", s)
    if not m:
        raise SpriteError(f"{where}: bad colour '{s}' (use #rrggbb, #rrggbbaa or transparent)")
    h = m.group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (int(m.group(2), 16) if m.group(2) else 255,)


def parse_size(s, where="--size"):
    m = re.fullmatch(r"(\d+)(?:x(\d+))?", s.lower())
    if not m:
        raise SpriteError(f"{where}: size must look like 16x16")
    return int(m.group(1)), int(m.group(2) or m.group(1))


def read_lines(path, seen=()):
    path = os.path.abspath(path)
    if path in seen:
        raise SpriteError(f"include loop at {path}")
    if not os.path.exists(path):
        raise SpriteError(f"file not found: {path}")
    out = []
    with open(path, encoding="utf-8") as f:
        for n, raw in enumerate(f, 1):
            s = re.sub(r"\s+#\s.*$", "", raw.strip())  # drop "  # comment"
            if not s or s.startswith("#"):
                continue
            if s.startswith("include "):
                inc = os.path.join(os.path.dirname(path), s.split(None, 1)[1])
                out += read_lines(inc, seen + (path,))
            else:
                out.append((f"{os.path.basename(path)}:{n}", s))
    return out


def options(tokens):
    d = {}
    for t in tokens:
        k, eq, v = t.partition("=")
        d[k] = v if eq else True
    return d


def transform(g, o, where):
    if o.get("flip"):
        g = [r[::-1] for r in g]
    if o.get("flipv"):
        g = g[::-1]
    try:
        rot = int(o.get("rot", 0))
    except ValueError:
        rot = 1
    if rot % 90:
        raise SpriteError(f"{where}: rot must be 90, 180 or 270")
    if rot % 180 and len(g) != len(g[0]):
        raise SpriteError(f"{where}: rot={rot} needs a square canvas")
    for _ in range(rot // 90 % 4):  # clockwise
        g = [list(r) for r in zip(*g[::-1])]
    if "shift" in o:
        try:
            dx, dy = (int(v) for v in str(o["shift"]).split(","))
        except ValueError:
            raise SpriteError(f"{where}: shift must look like shift=1,0")
        h, w = len(g), len(g[0])
        g = [[g[y - dy][x - dx] if 0 <= x - dx < w and 0 <= y - dy < h else "." for x in range(w)] for y in range(h)]
    return [list(r) for r in g]


def build_frame(sp, anim, fr):
    W, H = sp["size"]
    o, where = fr["opts"], fr["where"]
    if "from" in o:
        an, _, idx = str(o["from"]).rpartition(":")
        src = sp["anims"].get(an) if an else anim
        if src is None:
            raise SpriteError(f"{where}: unknown anim '{an}' in from=")
        try:
            g = [r[:] for r in src["frames"][int(idx)]["grid"]]
        except (ValueError, IndexError):
            raise SpriteError(f"{where}: from={o['from']} is not an existing earlier frame")
    else:
        rows = fr["rows"]
        if o.get("sym"):
            half = (W + 1) // 2
            for r, w in rows:
                if len(r) != half:
                    raise SpriteError(f"{w}: 'frame sym' rows are the left half: {half} chars, got {len(r)}")
            rows = [(r + (r[::-1] if W % 2 == 0 else r[-2::-1]), w) for r, w in rows]
        for r, w in rows:
            if len(r) != W:
                raise SpriteError(f"{w}: row has {len(r)} chars, expected {W}")
        g = [list(r) for r, _ in rows]
    g = transform(g, o, where)
    for spec, row, w in fr["patches"]:
        y, colon, x = spec.partition(":")
        try:
            y, x = int(y), int(x or 0)
        except ValueError:
            raise SpriteError(f"{w}: patch must look like '@5 row' or '@5:3 chars'")
        if not 0 <= y < H:
            raise SpriteError(f"{w}: row {y} is outside 0..{H - 1}")
        if (not colon and len(row) != W) or x + len(row) > W:
            raise SpriteError(f"{w}: patch '{row}' does not fit (a full row needs {W} chars; @R:C writes from column C)")
        g[y][x:x + len(row)] = list(row)
    for y, r in enumerate(g):
        for x, c in enumerate(r):
            if c not in sp["colors"]:
                raise SpriteError(f"{where}: unknown colour '{c}' at row {y}, col {x} (define it: color {c} #rrggbb)")
    return {"grid": g, "hold": max(1, int(o.get("hold", 1)))}


def parse_sprite(path):
    sp = {"name": os.path.splitext(os.path.basename(path))[0], "size": None, "colors": {".": CLEAR},
          "anims": {}, "variants": [], "tile": False, "limit": None}
    anim = fr = None

    def close():
        nonlocal fr
        if fr is not None:
            anim["frames"].append(build_frame(sp, anim, fr))
            fr = None

    for where, s in read_lines(path):
        t = s.split()
        kw = t[0]
        if fr is not None and "from" not in fr["opts"] and len(fr["rows"]) < sp["size"][1]:
            if len(t) == 1 and kw not in KEYWORDS and not kw.startswith("@"):
                fr["rows"].append((kw, where))
                continue
            raise SpriteError(f"{fr['where']}: frame has {len(fr['rows'])} rows, expected {sp['size'][1]} (stopped at {where})")
        if kw.startswith("@"):
            if fr is None or len(t) != 2:
                raise SpriteError(f"{where}: '@ROW chars' patches must directly follow a frame")
            fr["patches"].append((kw[1:], t[1], where))
            continue
        if kw not in KEYWORDS:
            extra = " (extra row? that frame already has all its rows)" if fr is not None and len(t) == 1 else ""
            raise SpriteError(f"{where}: unexpected '{s}'{extra}")
        if kw in ("sprite", "size", "limit") and len(t) < 2:
            raise SpriteError(f"{where}: '{kw}' needs a value")
        if kw == "sprite":
            sp["name"] = t[1]
        elif kw == "size":
            sp["size"] = parse_size(t[1], where)
        elif kw == "limit":
            sp["limit"] = int(t[1])
        elif kw == "tile":
            sp["tile"] = True
        elif kw == "color":
            if len(t) < 3 or len(t[1]) != 1 or t[1] in "#@.":
                raise SpriteError(f"{where}: use 'color c #rrggbb [name]' with one char other than # @ .")
            sp["colors"][t[1]] = hexcolor(t[2], where)
        elif kw == "anim":
            close()
            if len(t) < 2:
                raise SpriteError(f"{where}: anim needs a name")
            name, o = t[1], options(t[2:])
            if name in sp["anims"]:
                raise SpriteError(f"{where}: anim '{name}' is defined twice")
            base = sp["anims"].get(o["from"]) if "from" in o else None
            if "from" in o and base is None:
                raise SpriteError(f"{where}: unknown anim '{o['from']}'")
            anim = {"name": name, "frames": [], "fps": float(o.get("fps", base["fps"] if base else 8)),
                    "loop": str(o.get("loop", base["loop"] if base else True)).lower() not in ("false", "0", "no")}
            if base:
                frames = [{"grid": transform([r[:] for r in f["grid"]], o, where), "hold": f["hold"]} for f in base["frames"]]
                anim["frames"] = frames[::-1] if o.get("reverse") else frames
            sp["anims"][name] = anim
        elif kw == "frame":
            close()
            if anim is None:
                raise SpriteError(f"{where}: 'frame' before any 'anim'")
            if sp["size"] is None:
                raise SpriteError(f"{where}: put 'size WxH' before the first frame")
            fr = {"opts": options(t[1:]), "rows": [], "patches": [], "where": where}
        elif kw == "variant":
            close()
            over = {}
            for kv in t[2:]:
                c, eq, v = kv.partition("=")
                if len(c) != 1 or not eq:
                    raise SpriteError(f"{where}: variant recolours look like: variant bat_red b=#b13e53")
                over[c] = hexcolor(v, where)
            if len(t) < 3:
                raise SpriteError(f"{where}: variant needs a name and at least one recolour")
            sp["variants"].append((t[1], over))
    close()
    for a in sp["anims"].values():
        if not a["frames"]:
            raise SpriteError(f"{path}: anim '{a['name']}' has no frames")
    return sp


def lint(sp):
    W, H = sp["size"]
    col = sp["colors"]
    warns, used = [], set()

    def solid(g, x, y):
        return 0 <= x < W and 0 <= y < H and col[g[y][x]][3] > 0

    for a in sp["anims"].values():
        prev = None
        for i, f in enumerate(a["frames"]):
            g = f["grid"]
            used.update(col[c] for r in g for c in r if col[c][3] > 0)
            if g == prev:
                warns.append(f"{a['name']} frame {i} repeats frame {i - 1} (use hold=2, or change it)")
            prev = g
            strays = [(x, y) for y in range(H) for x in range(W) if solid(g, x, y) and not any(
                solid(g, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)]
            if strays:
                warns.append(f"{a['name']} frame {i}: {len(strays)} isolated pixel(s), e.g. (x,y) {strays[:3]} - fine for sparkles, else remove")
        if len(a["frames"]) > 1 and not sp["tile"]:
            frames = [f["grid"] for f in a["frames"]]
            if any(solid(g, x, y) for g in frames for y in range(H) for x in (0, W - 1)) or \
               any(solid(g, x, 0) for g in frames for x in range(W)):
                warns.append(f"{a['name']}: touches the top/left/right edge - leave 1px so motion and outlines don't clip")
    if sp["limit"] and len(used) > sp["limit"]:
        warns.append(f"uses {len(used)} colours, limit is {sp['limit']}")
    return warns, len(used)


def to_images(sp, colors):
    anims = []
    for a in sp["anims"].values():
        frs = []
        for f in a["frames"]:
            im = Image.new("RGBA", sp["size"])
            im.putdata([colors[c] for r in f["grid"] for c in r])
            frs.append((im, round(1000 * f["hold"] / a["fps"])))
        anims.append((a["name"], frs, a["loop"], a["fps"]))
    return anims


def make_sheet(name, anims, pad):
    W, H = anims[0][1][0][0].size
    cols = max(len(frs) for _, frs, _, _ in anims)
    sheet = Image.new("RGBA", (cols * (W + pad) - pad, len(anims) * (H + pad) - pad), CLEAR)
    frames, tags, rows, i = {}, [], [], 0
    for r, (an, frs, loop, fps) in enumerate(anims):
        tags.append({"name": an, "from": i, "to": i + len(frs) - 1, "direction": "forward"})
        rows.append({"anim": an, "row": r, "frames": len(frs), "fps": fps, "loop": loop})
        for c, (im, dur) in enumerate(frs):
            x, y = c * (W + pad), r * (H + pad)
            sheet.paste(im, (x, y))
            frames[f"{name}/{an}/{c}"] = {"frame": {"x": x, "y": y, "w": W, "h": H}, "rotated": False, "trimmed": False,
                                          "spriteSourceSize": {"x": 0, "y": 0, "w": W, "h": H},
                                          "sourceSize": {"w": W, "h": H}, "duration": dur}
            i += 1
    meta = {"app": "sprite_tool.py", "version": "1.0", "image": f"{name}.png", "format": "RGBA8888",
            "size": {"w": sheet.width, "h": sheet.height}, "scale": "1", "frameTags": tags,
            "grid": {"cellWidth": W, "cellHeight": H, "padding": pad, "columns": cols, "rows": rows}}
    return sheet, {"frames": frames, "meta": meta}


def checker(w, h, s=8):
    im = Image.new("RGBA", (w, h), (205, 205, 205, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range((y // s) % 2 * s, w, 2 * s):
            d.rectangle([x, y, x + s - 1, y + s - 1], fill=(172, 172, 172, 255))
    return im


def make_preview(anims, scale, bg, tile, smooth=False):
    W, H = anims[0][1][0][0].size
    font = ImageFont.load_default()
    cw, ch, gap, lw, k = W * scale, H * scale, 10, 130, max(1, scale // 2)
    zoom = RS.BILINEAR if smooth else RS.NEAREST
    first = anims[0][1][0][0]
    row_h = ch + 18 + 2 * H + 4 + 14
    width = max([lw + len(frs) * (cw + gap) for _, frs, _, _ in anims] +
                [lw + 3 * W + 16 + cw + 3 * gap, (lw + 3 * W * k + gap) if tile else 0])
    read_h = max(ch, 2 * H + 8)
    height = gap + len(anims) * row_h + read_h + 22 + ((3 * H * k + 22) if tile else 0)
    pv = Image.new("RGBA", (width, height), (38, 38, 42, 255))
    d = ImageDraw.Draw(pv)
    y = gap
    for name, frs, loop, fps in anims:
        d.text((6, y + ch // 2 - 6), f"{name}  {len(frs)}f {fps:g}fps" + ("" if loop else "  (once)"),
               fill=(255, 255, 255, 255), font=font)
        d.text((6, y + ch + 18 + H - 6), "on ground 2x", fill=(150, 150, 150, 255), font=font)
        for c, (im, _) in enumerate(frs):
            x = lw + c * (cw + gap)
            pv.paste(checker(cw, ch), (x, y))
            pv.alpha_composite(im.resize((cw, ch), zoom), (x, y))
            d.text((x + 2, y + ch + 3), str(c), fill=(190, 190, 190, 255), font=font)
            box = Image.new("RGBA", (2 * W + 4, 2 * H + 4), bg)
            box.alpha_composite(im.resize((2 * W, 2 * H), zoom), (2, 2))
            pv.paste(box, (x, y + ch + 18))
        y += row_h
    d.text((6, y + 4), "1x | 2x | shape", fill=(255, 255, 255, 255), font=font)
    x = lw
    for m in (1, 2):
        box = Image.new("RGBA", (W * m + 8, H * m + 8), bg)
        box.alpha_composite(first.resize((W * m, H * m), zoom), (4, 4))
        pv.paste(box, (x, y))
        x += box.width + gap
    sil = Image.new("RGBA", first.size, (20, 20, 24, 255))
    sil.putalpha(first.getchannel("A").point(lambda v: 255 if v else 0))
    box = Image.new("RGBA", (cw, ch), (236, 236, 236, 255))
    box.alpha_composite(sil.resize((cw, ch), RS.NEAREST))
    pv.paste(box, (x, y))
    y += read_h + 22
    if tile:
        t = Image.new("RGBA", (3 * W, 3 * H))
        for ty in range(3):
            for tx in range(3):
                t.paste(first, (tx * W, ty * H))
        d.text((6, y + 4), "tiled 3x3", fill=(255, 255, 255, 255), font=font)
        pv.paste(t.resize((3 * W * k, 3 * H * k), RS.NEAREST), (lw, y))
    return pv


def save_gif(path, frs, scale, bg):
    imgs = []
    for im, _ in frs:
        b = Image.new("RGBA", im.size, bg)
        b.alpha_composite(im)
        imgs.append(b.convert("RGB").resize((im.width * scale, im.height * scale), RS.NEAREST))
    imgs[0].save(path, save_all=True, append_images=imgs[1:], duration=[max(20, d) for _, d in frs], loop=0, disposal=2)


def white(im):
    w = Image.new("RGBA", im.size, (255, 255, 255, 255))
    w.putalpha(im.getchannel("A"))
    return w


def write_outputs(name, anims, a, tile=False):
    os.makedirs(a.out, exist_ok=True)
    sheet, data = make_sheet(name, anims, a.pad)
    sheet.save(os.path.join(a.out, f"{name}.png"))
    with open(os.path.join(a.out, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    W, H = anims[0][1][0][0].size
    scale = a.scale or max(2, min(12, 160 // max(W, H)))
    make_preview(anims, scale, a.bg, tile, a.smooth).save(os.path.join(a.out, f"{name}_preview.png"))
    for an, frs, _, _ in anims:
        if len(frs) > 1:
            save_gif(os.path.join(a.out, f"{name}_{an}.gif"), frs, max(1, min(8, 128 // max(W, H))), a.bg)
    blocks = [(name, sheet, data)]
    if a.flash:
        fl, fdata = make_sheet(f"{name}_flash", [(an, [(white(im), d) for im, d in frs], lp, fps)
                                                 for an, frs, lp, fps in anims], a.pad)
        fl.save(os.path.join(a.out, f"{name}_flash.png"))
        blocks.append((f"{name}_flash", fl, fdata))
    if a.frames:
        fd = os.path.join(a.out, name)
        os.makedirs(fd, exist_ok=True)
        for an, frs, _, _ in anims:
            for i, (im, _) in enumerate(frs):
                im.save(os.path.join(fd, f"{an}_{i}.png"))
    return blocks


def make_atlas(blocks, pad, max_w=1024):
    x = y = shelf = used_w = 0
    pos = {}
    for name, sheet, _ in sorted(blocks, key=lambda b: -b[1].height):
        if x and x + sheet.width > max_w:
            y, x, shelf = y + shelf + pad, 0, 0
        pos[name] = (x, y)
        x += sheet.width + pad
        shelf, used_w = max(shelf, sheet.height), max(used_w, x - pad)
    atlas = Image.new("RGBA", (max(1, used_w), max(1, y + shelf)), CLEAR)
    frames, tags = {}, []
    for name, sheet, data in blocks:
        ox, oy = pos[name]
        atlas.paste(sheet, (ox, oy))
        base = len(frames)
        for fname, fd in data["frames"].items():
            f = dict(fd)
            f["frame"] = dict(fd["frame"], x=fd["frame"]["x"] + ox, y=fd["frame"]["y"] + oy)
            frames[fname] = f
        tags += [dict(t, name=f"{name}/{t['name']}", **{"from": t["from"] + base, "to": t["to"] + base})
                 for t in data["meta"]["frameTags"]]
    meta = {"app": "sprite_tool.py", "version": "1.0", "image": "", "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height}, "scale": "1", "frameTags": tags}
    return atlas, {"frames": frames, "meta": meta}


def write_atlas(blocks, a):
    atlas, data = make_atlas(blocks, a.pad)
    data["meta"]["image"] = f"{a.atlas}.png"
    atlas.save(os.path.join(a.out, f"{a.atlas}.png"))
    with open(os.path.join(a.out, f"{a.atlas}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    print(f"atlas {a.out}/{a.atlas}.png {atlas.width}x{atlas.height}, {len(data['frames'])} frames")


def cmd_render(a):
    files = [f for p in a.files for f in (sorted(glob.glob(p)) or [p])]
    blocks, errors = [], 0
    for path in files:
        try:
            sp = parse_sprite(path)
            if not sp["anims"]:
                print(f"skip {path}: no anims (palette/include file)")
                continue
            warns, ncol = lint(sp)
            targets = [(sp["name"], sp["colors"])]
            for vname, over in sp["variants"]:
                bad = [c for c in over if c not in sp["colors"]]
                if bad:
                    raise SpriteError(f"{path}: variant {vname} recolours unknown char(s) {bad}")
                targets.append((vname, {**sp["colors"], **over}))
            for name, colors in targets:
                blocks += write_outputs(name, to_images(sp, colors), a, sp["tile"])
            W, H = sp["size"]
            anims = ", ".join(f"{n}:{len(v['frames'])}" for n, v in sp["anims"].items())
            more = f" + variants {', '.join(v for v, _ in sp['variants'])}" if sp["variants"] else ""
            print(f"OK   {sp['name']} {W}x{H} [{anims}] {ncol} colours{more} -> {a.out}/{sp['name']}_preview.png")
            for w in warns:
                print(f"     WARN {w}")
        except SpriteError as e:
            print(f"ERROR {e}")
            errors += 1
    if a.atlas and blocks:
        write_atlas(blocks, a)
    sys.exit(1 if errors else 0)


def load_frames(d, fps, default, order, once):
    groups = {}
    for p in sorted(os.listdir(d)):
        m = re.match(r"^(.+)_(\d+)\.png$", p, re.I)
        if m:
            groups.setdefault(m.group(1), []).append((int(m.group(2)), os.path.join(d, p)))
    if not groups:
        raise SpriteError(f"{d}: no frames named <anim>_<number>.png")
    names = [n for n in order if n in groups] + sorted(n for n in groups if n not in order)
    anims, size, warns = [], None, []
    for an in names:
        frs = []
        for _, p in sorted(groups[an]):
            im = Image.open(p).convert("RGBA")
            if size and im.size != size:
                raise SpriteError(f"{p} is {im.size[0]}x{im.size[1]}, other frames are {size[0]}x{size[1]}")
            size = im.size
            frs.append((im, round(1000 / fps.get(an, default))))
        for i in range(1, len(frs)):
            if frs[i][0].tobytes() == frs[i - 1][0].tobytes():
                warns.append(f"{an} frame {i} repeats frame {i - 1}")
        boxes = [im.getchannel("A").getbbox() for im, _ in frs]
        if len(frs) > 1 and any(b and (b[0] == 0 or b[1] == 0 or b[2] == size[0]) for b in boxes):
            warns.append(f"{an}: touches the top/left/right edge - leave 1px so motion and outlines don't clip")
        anims.append((an, frs, an not in once, fps.get(an, default)))
    return anims, size, warns


def cmd_pack(a):
    dirs = [d for p in a.dirs for d in (sorted(glob.glob(p)) or [p]) if os.path.isdir(d)]
    if not dirs:
        raise SpriteError("no frame folders found")
    if a.name and len(dirs) > 1:
        raise SpriteError("--name works with one folder; with several, each folder's name is used")
    if "=" in a.fps:
        fps, default = {k: float(v) for k, v in (kv.split("=") for kv in a.fps.split(","))}, 8.0
    else:
        fps, default = {}, float(a.fps)
    order, once = a.order.split(","), set(a.once.split(","))
    blocks = []
    for d in dirs:
        name = a.name or os.path.basename(os.path.normpath(d))
        anims, size, warns = load_frames(d, fps, default, order, once)
        blocks += write_outputs(name, anims, a)
        print(f"OK   {name} {size[0]}x{size[1]} [{', '.join(f'{n}:{len(f)}' for n, f, _, _ in anims)}] "
              f"-> {a.out}/{name}_preview.png")
        for w in warns:
            print(f"     WARN {w}")
    if a.atlas:
        write_atlas(blocks, a)


def rasterize_all(jobs, W, H):
    try:
        import cairosvg
        for src, dst in jobs:
            cairosvg.svg2png(url=src, write_to=dst, output_width=W, output_height=H)
        return "cairosvg"
    except (ImportError, OSError):
        pass
    exe = shutil.which("resvg") or shutil.which("inkscape")
    if exe:
        for src, dst in jobs:
            if "resvg" in os.path.basename(exe).lower():
                cmd = [exe, "-w", str(W), "-h", str(H), src, dst]
            else:
                cmd = [exe, src, "--export-type=png", f"--export-filename={dst}", f"--export-width={W}",
                       f"--export-height={H}"]
            subprocess.run(cmd, check=True, capture_output=True)
        return os.path.basename(exe)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SpriteError("no SVG rasterizer found. Free options: 'pip install cairosvg' (Linux/macOS), "
                          "Inkscape or resvg, or 'pip install playwright' then 'python -m playwright install chromium'")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": W, "height": H})
        for src, dst in jobs:
            with open(src, encoding="utf-8") as f:
                svg = f.read()
            pg.set_content(f"<html><body style='margin:0;background:transparent'><style>svg{{width:{W}px;"
                           f"height:{H}px;display:block}}</style>{svg}</body></html>")
            pg.screenshot(path=dst, omit_background=True)
        b.close()
    return "playwright"


def cmd_svg(a):
    W, H = parse_size(a.size)
    jobs = []
    for p in a.inputs:
        for item in sorted(glob.glob(p)) or [p]:
            if os.path.isdir(item):
                od = os.path.join(a.out, os.path.basename(os.path.normpath(item)))
                srcs = sorted(glob.glob(os.path.join(item, "*.svg")))
            elif os.path.isfile(item):
                od, srcs = a.out, [item]
            else:
                raise SpriteError(f"{item}: no such file or folder")
            os.makedirs(od, exist_ok=True)
            jobs += [(src, os.path.join(od, os.path.splitext(os.path.basename(src))[0] + ".png")) for src in srcs]
    if not jobs:
        raise SpriteError("no .svg files found")
    print(f"OK   {len(jobs)} SVG file(s) -> {a.out} ({rasterize_all(jobs, W, H)})")


def dist(c1, c2):
    return 2 * (c1[0] - c2[0]) ** 2 + 4 * (c1[1] - c2[1]) ** 2 + 3 * (c1[2] - c2[2]) ** 2


def palette_of(path):
    sp = parse_sprite(path)
    return {c: v for c, v in sp["colors"].items() if v[3] > 0}


def cmd_snap(a):
    W, H = parse_size(a.size)
    small = Image.open(a.input).convert("RGBA").resize((W, H), RS.BOX)
    px = [small.getpixel((x, y)) for y in range(H) for x in range(W)]
    solid = [p[:3] for p in px if p[3] >= a.alpha]
    if a.palette:
        pal = [v[:3] for v in palette_of(a.palette).values()]
    else:
        q = Image.new("RGB", (max(1, len(solid)), 1))
        q.putdata(solid or [(0, 0, 0)])
        qq = q.quantize(colors=a.colors)
        flat = qq.getpalette()
        pal = [tuple(flat[i * 3:i * 3 + 3]) for _, i in qq.getcolors()]
    cache = {}
    out = [CLEAR if p[3] < a.alpha else cache.setdefault(p[:3], min(pal, key=lambda c: dist(c, p))[:3] + (255,)) for p in px]
    res = Image.new("RGBA", (W, H))
    res.putdata(out)
    dst = a.out or os.path.splitext(a.input)[0] + "_snap.png"
    res.save(dst)
    print(f"OK   {dst} {W}x{H}, {len(set(c for c in out if c[3]))} colours")


def cmd_tosprite(a):
    pal = palette_of(a.palette)
    im = Image.open(a.input).convert("RGBA")
    print(f"size {im.width}x{im.height}\nframe")
    for y in range(im.height):
        print("".join("." if im.getpixel((x, y))[3] < 128 else
                      min(pal, key=lambda c: dist(pal[c], im.getpixel((x, y))))[0] for x in range(im.width)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p):
        p.add_argument("--out", default="out")
        p.add_argument("--pad", type=int, default=0, help="transparent pixels between frames")
        p.add_argument("--scale", type=int, default=0, help="preview zoom (default: about 160px per frame)")
        p.add_argument("--bg", default="#3b4a3b", help="game background colour for previews and GIFs")
        p.add_argument("--flash", action="store_true", help="also write <name>_flash.png (white hit-flash sheet)")
        p.add_argument("--frames", action="store_true", help="also write every frame as its own PNG")
        p.add_argument("--smooth", action="store_true", help="smooth (not pixel) zoom in previews, for vector art")
        p.add_argument("--atlas", help="also pack everything into ATLAS.png + ATLAS.json")

    r = sub.add_parser("render")
    r.add_argument("files", nargs="+")
    common(r)
    k = sub.add_parser("pack")
    k.add_argument("dirs", nargs="+")
    k.add_argument("--name")
    k.add_argument("--fps", default="8")
    k.add_argument("--order", default="")
    k.add_argument("--once", default="", help="anims that play once, e.g. death,hit")
    common(k)
    s = sub.add_parser("svg")
    s.add_argument("inputs", nargs="+")
    s.add_argument("--size", required=True)
    s.add_argument("--out", default="frames")
    n = sub.add_parser("snap")
    n.add_argument("input")
    n.add_argument("--size", required=True)
    n.add_argument("--palette")
    n.add_argument("--colors", type=int, default=16)
    n.add_argument("--alpha", type=int, default=128)
    n.add_argument("--out")
    t = sub.add_parser("tosprite")
    t.add_argument("input")
    t.add_argument("--palette", required=True)
    a = ap.parse_args()
    try:
        if hasattr(a, "bg"):
            a.bg = hexcolor(a.bg, "--bg")
        {"render": cmd_render, "pack": cmd_pack, "svg": cmd_svg, "snap": cmd_snap, "tosprite": cmd_tosprite}[a.cmd](a)
    except SpriteError as e:
        print(f"ERROR {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```