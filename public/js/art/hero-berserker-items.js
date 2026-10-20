// The Berserker's weapon icons, 14×14 like ICON_ART in items.js (16×16 once outlined): keys from
// palette.js, '.' clear, no outline drawn (the build adds it).
//   i_twinaxes   Twin Axes: two bearded hand axes crossed, heads up and blades out, their grips
//                bound in red
//   i_bloodstorm Bloodstorm (its evolution): the two axes whirled into a red crescent storm,
//                dripping blood
export const BERSERKER_ITEMS = {
  i_twinaxes: {
    frames: [[
      '.wG........Gw.',
      'wGGN......NGGw',
      'wGgNB....BNgGw',
      'wGgNbB..BbNgGw',
      '.wGN.bBBb.NGw.',
      '..w...Bb...w..',
      '.....BbbB.....',
      '....Bb..bB....',
      '...rR....rR...',
      '..rR......rR..',
      '.rR........rR.',
      '.R..........R.',
      'Bb..........bB',
      'm............m',
    ]],
  },
  i_bloodstorm: {
    frames: [[
      '.....rrrr..Gw.',
      '...rriiRRRNGGw',
      '..ri.R.R.BNgGw',
      '.ri..R..Bb.gw.',
      '.r.....Bb.....',
      'r......Bb.....',
      'r.....Bb.....r',
      'r.....Bb.....r',
      '.....Bb......r',
      '.....Bb.....r.',
      '.wg.Bb.....ir.',
      'wGgNB.....ir..',
      'wGGNRRRiirr...',
      '.wG..rrrr.....',
    ]],
  },
};
