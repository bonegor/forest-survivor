// Monster sprites, facing right. Light comes from the top-left.

// Allied undead raised by the Necromancer reuse these rows (see bottom).
export const MONSTER_ART = {
  bat: {
    emissive: 'x',
    frames: [
      [
        '.p..........p.',
        '.pp........pp.',
        '.qpp..pp..ppq.',
        '..qpppqppppq..',
        '...qppxpxpq...',
        '....qpwpwq....',
        '.....qppq.....',
      ],
      [
        '..............',
        '......pp......',
        '.....pxpx.....',
        '...qppppppq...',
        '.qppqpwpwqppq.',
        '.pp.qppppq.pp.',
        'p.....qq.....p',
      ],
    ],
  },

  rat: {
    emissive: 'x',
    frames: [
      [
        '..........aA...',
        '....aAAAAaAAA..',
        '..aAAAAAAAAxAa.',
        'iaaAAAAAAaAAAAi',
        'i.aaaaaaaaaaa..',
        '.i..a.a...a.a..',
      ],
      [
        '..........aA...',
        '....aAAAAaAAA..',
        '..aAAAAAAAAxAa.',
        '.aaAAAAAAaAAAAi',
        'i.aaaaaaaaaaa..',
        'i...a...a.a....',
      ],
    ],
  },

  slime: {
    emissive: '',
    frames: [
      [
        '....LLLL....',
        '...LwlLLL...',
        '..LlwLLLee..',
        '.LLLLkLkLee.',
        '.LLLLkLkLeE.',
        '.eLLLLLLLeE.',
        '.eeeLLLLeeE.',
        '..EEeeeeEE..',
      ],
      [
        '............',
        '....LLLL....',
        '..LLwlLLLe..',
        '.LlwLkLkLee.',
        'LLLLLkLkLLeE',
        'eLLLLLLLLLeE',
        'eeeLLLLLLeeE',
        '.EEEeeeeEEE.',
      ],
    ],
  },

  slimelet: {
    emissive: '',
    frames: [
      ['..LLL...', '.LwLLe..', 'LLkLkLe.', 'eLLLLLe.', '.EeeeE..'],
      ['........', '..LLL...', '.LwkLke.', 'eLLLLLeE', '.EEeeEE.'],
    ],
  },

  skeleton: {
    emissive: 'x',
    frames: [
      [
        '....zzzzz.....',
        '...zzzzzzZ....',
        '...zzkkzkkZ...',
        '...zZkxzkxZ...',
        '...ZzzzzzzZ...',
        '....ZzkzkzZ...',
        '.....ZZZZZ....',
        '..zzZzzzzZzz..',
        '.zZ..zZzZz..Zz',
        '.z...zzzzz...z',
        '.Z...ZZZZZ...Z',
        '.z...zzzzz...z',
        'zz....ZzZ....zz',
        '......zzz.....',
        '.....zZ.Zz....',
        '.....z...z....',
        '.....Z...Z....',
        '....zz...zz...',
      ],
      {
        from: 0,
        rows: {
          14: '....zZ...Zz...',
          15: '....z.....z...',
          16: '...zZ.....Z...',
          17: '...z......zz..',
        },
      },
    ],
  },

  zombie: {
    emissive: 'Y',
    frames: [
      [
        '....EEEE......',
        '...EeeeeE.....',
        '...eeYeYeE....',
        '...eeeeeeE....',
        '...EekkkeE....',
        '....EEeEE.....',
        '...bBBBBbeeeE.',
        '..bBbBBBbbeeL.',
        '..bbmBBBmb....',
        '..eebBmBbb....',
        '..e.bbbbbb....',
        '....mmmmmm....',
        '....bb..bb....',
        '....Ee..Ee....',
        '...mmm..mmm...',
      ],
      {
        from: 0,
        rows: {
          12: '....bb...bb...',
          13: '...Ee.....Ee..',
          14: '..mmm.....mmm.',
        },
      },
    ],
  },

  wolf: {
    emissive: 'x',
    frames: [
      [
        '.............nN...',
        '...........nNNgN..',
        '..........nNggggN.',
        '..nNNNNNNNNgggxgkk',
        '.nNggggggNNNgGGGGw',
        'nNgggggggggNNGkkw.',
        'n.NNNNNNNNNNn.....',
        '..nN.nN....nN.nN..',
        '..n...n.....n...n.',
      ],
      [
        '.............nN...',
        '...........nNNgN..',
        '..........nNggggN.',
        '..nNNNNNNNNgggxgkk',
        'nNNggggggNNNgGGGGw',
        'n.gggggggggNNGkkw.',
        '..NNNNNNNNNNn.....',
        '.nN...nN..nN..nN..',
        'n......n.n.....n..',
      ],
    ],
  },

  goblin: {
    emissive: 'x',
    frames: [
      [
        '....eLLLe.....',
        'eE.eLLLLLL....',
        '.eeLLLLxLxL...',
        '..eLLLLLLLLL..',
        '...eLLkwkwL...',
        '....eeLLLe....',
        '...bBBbBBb.O..',
        '..LbBBBBBbLO..',
        '..e.bbbbb..G..',
        '....mmmmm..G..',
        '....Le.Le.....',
        '...ee..ee.....',
      ],
      {
        from: 0,
        rows: {
          10: '...Le...Le....',
          11: '..ee.....ee...',
        },
      },
    ],
  },

  spider: {
    emissive: 'x',
    frames: [
      [
        '.....qqqq.......',
        '...qqpjjpq......',
        '..qpjjpppqq.qqq.',
        '..qppprpppqqpppq',
        '.qqpprrrpqqqpxpx',
        '..qqpprppqqaqqq.',
        '.a.aqqqqqa.a.a..',
        'a..a.a..a..a..a.',
        '..a...a..a...a..',
      ],
      [
        '.....qqqq.......',
        '...qqpjjpq......',
        '..qpjjpppqq.qqq.',
        '..qppprpppqqpppq',
        '.qqpprrrpqqqpxpx',
        '..qqpprppqqaqqq.',
        '..a.qqqqqa.a.a..',
        '.a.a..a.a.a..a..',
        'a...a..a...a...a',
      ],
    ],
  },

  ghost: {
    emissive: 'c',
    frames: [
      [
        '....GGGG....',
        '...GwwGGG...',
        '..GwwGGGGG..',
        '..GGGkkGkk..',
        '.GGGGkcGkc..',
        '.GGGGGGGGGg.',
        '.GGGGGkkGGg.',
        '.gGGGGkkGGg.',
        '.gGGGGGGGGg.',
        '..gGGGGGGgg.',
        '..gGgGGgGg..',
        '..g.gG.gG.g.',
        '......g...g.',
      ],
      [
        '....GGGG....',
        '...GwwGGG...',
        '..GwwGGGGG..',
        '..GGGkkGkk..',
        '.GGGGkcGkc..',
        '.GGGGGGGGGg.',
        '.GGGGGkkGGg.',
        '.gGGGGkkGGg.',
        '.gGGGGGGGGg.',
        '..gGGGGGGgg.',
        '..GgGGgGGg..',
        '.g.Gg.gGg.g.',
        '.g...g......',
      ],
    ],
  },

  cultist: {
    emissive: 'Yi',
    frames: [
      [
        '.....RR.....',
        '....RrrR....',
        '...RrrrrR...',
        '...RrkkkR...',
        '...RkYkYR...',
        '...RRkkkR...',
        '..RRrrrrRR..',
        '.RrrrRrrrRR.',
        '.RrrRRRrrsPi',
        '.RrrRTTRrrPP',
        '.RrrRRRrrR..',
        '.RRrrRrrrR..',
        '.RRrrRrrrRR.',
        '.RRRrRrrrRR.',
        '..RRRRRRRR..',
        '...mm..mm...',
      ],
      {
        from: 0,
        rows: {
          14: '..RRRRRRRR..',
          15: '..mm....mm..',
        },
      },
    ],
  },

  orc: {
    emissive: 'x',
    frames: [
      [
        '.......eeee.........',
        '......eLLLLe........',
        '.....eLLLLLLe.......',
        '.....eLLxLLxe.......',
        '.....eLLLLLLL.......',
        '.....ezLkkLzL.......',
        '......eeLLLe........',
        '...gGNNbbbbNNgG.BB..',
        '..gGNNeBBBBeNNGBbbB.',
        '..NNLebBBBBbeLLbbBB.',
        '...eLebbmbbbeLe.Bb..',
        '...eL.bBBBBb.eLeb...',
        '...LL.mmmmmm..LLb...',
        '......mmyymm....b...',
        '......bbb.bbb.......',
        '......eLe.eLe.......',
        '......eLe.eLe.......',
        '.....mmmm.mmmm......',
      ],
      {
        from: 0,
        rows: {
          14: '......bbb..bbb......',
          15: '.....eLe....eLe.....',
          16: '.....eLe....eLe.....',
          17: '....mmmm....mmmm....',
        },
      },
    ],
  },

  imp: {
    emissive: 'Y',
    frames: [
      [
        '..T.....T...',
        '..Tr...rT...',
        '...rrrrrr...',
        'mR.rrYrYrr..',
        'mmRrrrrrrr..',
        '.mRRrrkwkr..',
        '..mRRrrrr...',
        '...RrrrrrR..',
        '...rRrrRrr..',
        '....rr.rr...',
        '...RR...RR.R',
        '..........RR',
      ],
      [
        '..T.....T...',
        '..Tr...rT...',
        '...rrrrrr...',
        '...rrYrYrr..',
        '..RrrrrrrR..',
        '.mRRrrkwkr..',
        'mmRRRrrrr...',
        'mR.RrrrrrR..',
        '...rRrrRrr..',
        '....rr.rr..R',
        '...RR...RRRR',
        '............',
      ],
    ],
  },

  hellhound: {
    emissive: 'oyY',
    frames: [
      [
        'y..............Y..',
        'oy...........oyhh.',
        '.oyy.......oyhhhhh',
        '..oymmmmmmmyhhhYhR',
        '...mhhhhhhhhhhmmmw',
        '..mhhhhhhhhhmmmRRw',
        '..mmmmmmmmmmmm....',
        '...mh.mh....mh.mh.',
        '...m...m....m...m.',
      ],
      [
        '..........y....Y..',
        '.y...........oyhh.',
        'oyyy.......oyhhhhh',
        '..oymmmmmmmyhhhYhR',
        '...mhhhhhhhhhhmmmw',
        '..mhhhhhhhhhmmmRRw',
        '..mmmmmmmmmmmm....',
        '..mh...mh..mh..mh.',
        '.m......m.m.....m.',
      ],
    ],
  },

  ogre: {
    emissive: '',
    frames: [
      [
        '.........bbbbb..........',
        '........bBBBBBb.........',
        '.......bBttttBBb........',
        '.......BtwwwwtBb........',
        '.......BtwkkwtBb........',
        '.......BtwwwwtBb........',
        '.......bBttttBBb........',
        '.......bBzkkzBb.........',
        '......bbBBBBBBBbb.......',
        '....bBBBtttttttBBBb.....',
        '...bBttBBBBBBBBBttBb.NN.',
        '..bBtBbBttttttBbBtBbNgN.',
        '..bBBb.BBBBBBBB.bBBbgN..',
        '..bBb..bBBBBBBb..bBbbN..',
        '..BtB..bBbbbbBb..BtBbN..',
        '..tBb..mmmmmmmm..bBNgN..',
        '..BB...mmmyymmm...NgN...',
        '.......mmmmmmmmm..bb....',
        '.......bBBb.bBBb..bb....',
        '.......bBBb.bBBb........',
        '.......bBBb.bBBb........',
        '......bbbbb.bbbbb.......',
      ],
      {
        from: 0,
        rows: {
          18: '......bBBb...bBBb.bb....',
          19: '......bBBb...bBBb.......',
          20: '.....bBBb.....bBBb......',
          21: '.....bbbb.....bbbbb.....',
        },
      },
    ],
  },

  deathknight: {
    emissive: 'c',
    frames: [
      [
        '....n.....n.....',
        '....Nn...nN.....',
        '.....NnnnN......',
        '....nNNNNNn.....',
        '....NnkkkkNn....',
        '....NkckckNn....',
        '....nNnnnNnn....',
        '...RnnNNNnnR..G.',
        '..RRNNnNNnNNR.G.',
        '..RnNnKnnKnNR.c.',
        '.RRnnnKKKnnnRRG.',
        '.RRKnnnKnnnKRRG.',
        '.RmKnNnnnNnKRRG.',
        '.mm.nnnccnnnRRG.',
        '.mm.KnnnnnnK.ny.',
        '.m..nNnnnnNn.yN.',
        '....nNn..nNn..N.',
        '....nNn..nNn....',
        '...KKnn..KKnn...',
      ],
      {
        from: 0,
        rows: {
          16: '...nNn....nNn.N.',
          17: '...nNn....nNn...',
          18: '..KKnn....KKnn..',
        },
      },
    ],
  },

  thief: {
    emissive: 'Y',
    frames: [
      [
        '..TTTtt.........',
        '.TtYTTtt........',
        'TtyttTtTt.......',
        'TttYtttTt.eLLLe.',
        'TtttytttteLLxLxL',
        '.TtttttttLLLLLLL',
        '.tTttttt.eLkwkL.',
        '..tttt.bBbBeLe..',
        '.....LbBBBBbL...',
        '.....e.bbbbb.e..',
        '.......mmmmm....',
        '.......Le.Le....',
        '......ee..ee....',
      ],
      {
        from: 0,
        rows: {
          11: '......Le...Le...',
          12: '.....ee.....ee..',
        },
      },
    ],
  },
};

// Raised allies: same bones, green soul-fire instead of red eyes.
const recolor = (def, map) => ({
  ...def,
  emissive: 'l',
  frames: def.frames.map((f) =>
    Array.isArray(f)
      ? f.map((r) => r.replace(/./g, (ch) => map[ch] ?? ch))
      : { from: f.from, rows: Object.fromEntries(Object.entries(f.rows).map(([k, r]) => [k, r.replace(/./g, (ch) => map[ch] ?? ch)])) },
  ),
});
MONSTER_ART.minion = recolor(MONSTER_ART.skeleton, { x: 'l', Z: 'G' });
MONSTER_ART.legionnaire = recolor(MONSTER_ART.deathknight, { c: 'l', R: 'E', m: 'v' });
