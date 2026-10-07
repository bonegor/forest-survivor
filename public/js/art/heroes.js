// Hero sprites, facing right. Light comes from the top-left.

export const HERO_ART = {
  necromancer: {
    emissive: 'lL',
    frames: [
      [
        '.....hhhh.......',
        '....haaaah...lL.',
        '...haAAaaah.lLlL',
        '...hazzzZah.Llzl',
        '...hzlzlZah.lzzL',
        '...hazZzZah..zz.',
        '..hhaZkZZahh..b.',
        '.haaAhhhhaaah.b.',
        '.hAlahaaahalaZb.',
        '.hAl.haaah.la.m.',
        '.Za..hLlLh..a.b.',
        '.....haaaah...b.',
        '....haaaaaah..b.',
        '....haLaaLah..m.',
        '...hhaaaaaahh.b.',
        '...hLLhhhhLLh.b.',
        '....mm....mm..m.',
      ],
      {
        from: 0,
        rows: {
          15: '...hLLhhhhLLh.b.',
          16: '...mm......mm.m.',
        },
      },
    ],
  },

  rogue: {
    emissive: '',
    frames: [
      [
        '......qqqq......',
        '.....qpppppq....',
        '....qpjjppppq...',
        '....qpjqqqqpq...',
        '....qpqSsSkSq...',
        '....qqpkkkkkq...',
        '...qqppqkkkqqq..',
        '..qpjppqqqqqpGw.',
        '..qpjpqKnnnKqqG.',
        '..qpp.qKbybKq...',
        '..Gw..qKnnnKq...',
        '..G...qKKnKKq...',
        '......KK...KK...',
        '......nK...nK...',
        '.....kkk...kkk..',
      ],
      {
        from: 0,
        rows: {
          12: '.....KK.....KK..',
          13: '.....nK.....nK..',
          14: '....kkk.....kkk.',
        },
      },
    ],
  },

  knight: {
    emissive: '',
    frames: [
      [
        '.......rrrr.....',
        '.....rrrRRRr....',
        '...rR.GGGggg....',
        '...R.GGgggggN...',
        '.....GgggggNN...',
        '.....ggkkkkkN...',
        '.....ggggNkgN...',
        '.....NggggkNN...',
        '......NNNNNN....',
        '...GGguUUUugNN..',
        '.yyyyNuUyUuNgGN.',
        '.yrryNuyyyuNNgn.',
        '.yrRyNuUyUuNNg..',
        '.yRRy.uuuuu.Gg..',
        '..yy.bbbybbbyyy.',
        '.....uUuuuUu.G..',
        '......gN.gN..G..',
        '......gN.gN..g..',
        '.....mmm.mmm....',
      ],
      {
        from: 0,
        rows: {
          15: '.....uUuuuUu.G..',
          16: '.....gN...gN.G..',
          17: '....mmm...gN.g..',
          18: '..........mmm...',
        },
      },
    ],
  },

  archer: {
    emissive: '',
    frames: [
      [
        '......EeeE......',
        '.....EeLLeE.....',
        '....EeLLeeeE....',
        '....EeLesssE....',
        '....EeessksE....',
        '....EEessssE....',
        '...wEEeeSSeE.b..',
        '..wrEEEeeeEEG.B.',
        '..rbEEbBBBbEG.B.',
        '..bbEEbBtBbbbbs.',
        '..b.EEbBBBbEG.B.',
        '....EEmmymmEG.B.',
        '....EEbBbbbE.b..',
        '.....EEbbbbE....',
        '......EE.EE.....',
        '......EE.EE.....',
        '.....mmm.mmm....',
      ],
      {
        from: 0,
        rows: {
          14: '.....EE...EE....',
          15: '.....EE...EE....',
          16: '....mmm....mmm..',
        },
      },
    ],
  },

  mage: {
    emissive: 'Yo',
    frames: [
      [
        '...pq...........',
        '....pj..........',
        '.....pjj........',
        '.....pjjj.......',
        '....qpjjjj......',
        '....qyyyyyy.....',
        '..qqppjjjjppq...',
        '....qSsskS...Yo.',
        '....zZsssz..oYYo',
        '...pzzzzzzp..oo.',
        '..pjpzzzzzpj..b.',
        '..pjpjzzzjpjsbb.',
        '..pjppyzyppj..b.',
        '..qpjppypjjp..b.',
        '..qpjpjjpjjpq.b.',
        '..qqpjjjjjppq.b.',
        '...qqppppppq..b.',
        '....mm...mm...b.',
      ],
      {
        from: 0,
        rows: {
          16: '...qqppppppq..b.',
          17: '...mm.....mm..b.',
        },
      },
    ],
  },
};
