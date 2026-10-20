// The Witch Hunter's weapon art (Mercy Crane): her Silver Crossbow's icon, its evolution's
// (the Purifier) and the silver bolt it looses. Palette strings as in items.js (keys from
// palette.js, '.' clear); the build adds the 1-px outline.

export const WITCHHUNTER_ITEMS = {
  // The Silver Crossbow, turned to point up and right: a walnut stock from the butt (bottom left),
  // a steel prod across its front with the string drawn back to the nut, a silver bolt laid on
  // the stock, its white broadhead past the prod.
  i_crossbow: {
    emissive: 'w',
    frames: [[
      '.............w',
      '...ggGGG...ww.',
      '...ZNNNGG..Gw.',
      '....Z..NNGG...',
      '....Z....GG...',
      '....Z...GbNG..',
      '....Z..Gb.NGG.',
      '.....ZGb...NG.',
      '....zGb....NG.',
      '....zzZZZ..gg.',
      '...Bb....ZZZg.',
      '..Bb..........',
      'BBbm..........',
      'Bbm...........',
    ]],
  },
  // The Purifier: the crossbow wreathed in white-silver holy fire.
  i_purifier: {
    emissive: 'wzG',
    frames: [[
      '.............w',
      '...ggGGG...ww.',
      '.G.zNNNGG..Gw.',
      'Gz..z..NNGG...',
      'zwz.z....GG...',
      'zwz.zGg.GbNG..',
      '.z..GgNNb.NGG.',
      '.G...NNb...NG.',
      '.z..zGb....NG.',
      '.w..zzzzz.Ggg.',
      '...Bb....zzzg.',
      '..Bb....GzwGz.',
      'BBbm...Gzwwzw.',
      'Bbm.....zw..z.',
    ]],
  },
  // The bolt in flight, pointing right: white fletching, a silver shaft, a white broadhead.
  silverbolt: {
    emissive: 'w',
    frames: [['zz......G..', 'ZgGGGGGGGww', 'zz......G..']],
  },
};
