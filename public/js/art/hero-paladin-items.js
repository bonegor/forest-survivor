// The Paladin's weapon art, like ICON_ART in items.js: keys from palette.js, '.' clear, no
// outline drawn (the build adds it).
//   i_smite      Smite (14×14, 16×16 once outlined): her warhammer upright, a pillar of light
//                falling on its head, rays breaking off it
//   i_judgement  Judgement (its evolution): the hammer before a blazing sun, rays all round and
//                three pillars coming down
//   brand        the gold sun sigil drawn over a branded foe (7×7)
export const PALADIN_ITEMS = {
  i_smite: {
    emissive: 'Yf',
    frames: [[
      '......ff......',
      '......ff......',
      '..Y..YffY..Y..',
      '...YYffffYY...',
      '..GGGGyyGGGg..',
      '..GwwGyYGGgN..',
      '..GwGGyYGggN..',
      '..gGGGydGggN..',
      '..NNNNddNNNN..',
      '......Bb......',
      '......Bb......',
      '......Bb......',
      '......Bb......',
      '......yd......',
    ]],
  },
  i_judgement: {
    emissive: 'Yf',
    frames: [[
      '.Y...YffY...Y.',
      '..Y.yYffYy.Y..',
      '...yYYffYYy...',
      'YY.YffffffY.YY',
      '..GGGGyyGGGg..',
      'YYGwwGyYGGgNYY',
      '..GwGGyYGggN..',
      '.YgGGGydGggNY.',
      '..NNNNddNNNN..',
      '.Y..YyBbyY..Y.',
      'Y.....Bb.....Y',
      '......Bb......',
      '......Bb......',
      '......yd......',
    ]],
  },
  brand: {
    emissive: 'Yyf',
    frames: [[
      '...Y...',
      '..yYy..',
      '.yYfYy.',
      'YYfffYY',
      '.yYfYy.',
      '..yYy..',
      '...Y...',
    ]],
  },
};
