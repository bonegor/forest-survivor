# Menu art credits

The menus' frames, buttons, pointer, dividers and title font come from free libraries, baked here by
`tools/bake-ui.mjs` and `tools/bake-fonts.mjs` from the Creative Commons collection kept beside the game
(`forest-survivor-assets/cc-graphics`). `js/ui/skin.js` recolours them into the game's palette and
draws them nine-sliced; `js/engine/font.js` sets titles in the fonts.

| What | Piece | Source | Licence |
| --- | --- | --- | --- |
| Panel frame, pointed buttons, gold pointer (`pieces.js`: `panel`, `button`, `arrow`) | `Generic/Menu/Png/GenericPanel.png`, `Generic/Menu buttons/Png/GenericButton.png`, `Generic/Menu/Png/GenericArrow.png` | [Lucifer RPG UI](https://foozlecc.itch.io/lucifer-rpg-ui), art by Baldur, distributed by Foozle | CC0 1.0 (`LICENSE-Lucifer-RPG-UI.txt`) |
| Title dividers (`pieces.js`: `divider`), halved to one-pixel lines | `PNG/Default/Divider Fade/divider-fade-003.png` | [Fantasy UI Borders](https://kenney.nl/assets/fantasy-ui-borders) by Kenney | CC0 1.0 (`LICENSE-Kenney-Fantasy-UI-Borders.txt`) |
| Title font (`pixtura12.js`), converted from the BDF to the game's glyph rows | `Pixtura12-12px.bdf` | [Pixtura12](https://opengameart.org/content/pixtura12-medieval-pixel-font) by eishiya | SIL Open Font License 1.1 (`OFL-Pixtura12.txt`) |
| Logo and screen-title fonts (`jacquard24.js`, `jacquard12.js`), drawn by Chrome at one pixel a grid step and read back as glyph rows | `Jacquard24-Regular.ttf`, `Jacquard12-Regular.ttf` | [Jacquard 24 and Jacquard 12](https://github.com/scfried/soft-type-jacquard) by Sarah Cadigan-Fried (The Soft Type Project) | SIL Open Font License 1.1 (`OFL-Jacquard.txt`) |

Changes: the pieces are recoloured at run time; the Kenney divider is halved; Pixtura12 and
the Jacquards are converted to glyph rows. CC0 asks for no credit; it is given as thanks. The fonts stay under the OFL.
