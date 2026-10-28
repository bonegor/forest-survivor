// Optional material palettes. Each ramp runs from shadow to highlight; exact source
// colours keep skin, eyes, weapon grips and magical effects separate from clothing.
const ramp = (from, to) => Object.fromEntries(from.split(' ').map((c, i) => ['#' + c, '#' + to.split(' ')[i]]));

export const HERO_SKINS = {
  knight: { name: 'Steelguard', palette: {
    ...ramp('2c1e3f 54496c 9085a3 e2ccd9 ffffff', '202b3a 485d72 8fa9ba d8e6e9 fff5df'),
    ...ramp('510200 900200 e81f00 ff8934', '381a2b 792b3d c64b4b ef9570'),
  } },
  archer: { name: 'Mosscloak', palette: {
    ...ramp('0a1a20 0e2725 11332a 184931 1e5f37 29793d 339242 50a94a 6dbf51 98d566 c2ea7a',
      '142729 1d3634 28483d 385b47 4b7050 62845a 7b9966 94ae73 b0c484 cddd9c e4edb9'),
    ...ramp('1e0e16 2e161a 3e1e1e 542b22 6a3726 84492c 9e5a32 b97946 d4985a',
      '221824 342332 49303a 62403e 7c5244 996b4e b98a61 d7ab7a f0cf9d'),
  } },
  mage: { name: 'Starweaver', palette: {
    ...ramp('21163e 2b2468 282f78 2a4293 2b59ae 3074c6 3f92d9 5fb1e8 93d0f2',
      '211d3b 34305a 483d78 605095 7b62b0 9979c5 b597d8 d0b7e8 ece0f4'),
  } },
  rogue: { name: 'Moonveil', palette: {
    ...ramp('0f0c34 23225c 413b88 6463b2 9ca1e9', '1b2341 354465 587298 91adc6 d6e7ee'),
    ...ramp('20102b 3d1e51 6d386b c462ce', '232237 45405c 82748d d7b5d0'),
    ...ramp('202a46 404867 747a9c', '303e51 60788c a5bac5'),
  } },
  necromancer: { name: 'Graveglass', palette: {
    ...ramp('0e1026 121838 1a224b 232e60 2f3d76 43538e 6274a8',
      '15232a 1c3239 28464c 3b5e60 537b76 75a094 a9c5b3'),
    ...ramp('120d24 191532 221c44 2c2457 382d6a 47397e 5b4892 755aa3 9a78b6 bf96c6',
      '231e2e 302737 403343 534251 695564 826b7b 9b8492 b7a0a9 d4bec1 eedcda'),
    ...ramp('6b3414 a1561b cf8a2b eebd4c fff0a6', '514049 82706a b1a08a d9ccb0 f5edcf'),
  } },
  paladin: { name: 'Dawnsteel', palette: {
    ...ramp('1b1430 2a1f42 3c3158 53476f 6c628a 7c7298 8c82a5 9d93b3 aea4c1 bfb5cf cfc5db ded4e3 efe5ec',
      '202937 2c3b4b 3e5263 566c7c 728c99 89a2ad 9fb7be b5c8cb cad8d7 dee5df e9ecdf f1f0e2 fff6df'),
    ...ramp('1e0716 370b20 560f28 76152e 961d33 b22b38 c94540 dc6a52',
      '292535 484052 665768 8c7883 b39c9e d4bfc0 ebd9d2 fff0de'),
  } },
  druid: { name: 'Elderwood', palette: {
    ...ramp('1c0e1e 3d1e2c 522a30 6c3a35 894e3a a66940 c3874c dcaa66',
      '20212b 393a3c 505047 6a6956 868469 a3a07d c2bf99 e1dbb7'),
    ...ramp('0e1f1f 14322b 1d4b30 2c6634 47833a 7cb048 b4d468',
      '132c2b 1d4139 2c5c49 43795a 639b6b 8fc184 c5dfaa'),
  } },
  berserker: { name: 'Ironfang', palette: {
    ...ramp('1c1420 2e2230 45363f 5e4d50 7a6862 978575 b3a28c cfbfa5 ebdfc6',
      '1c2431 2c3a49 425566 607787 829aa6 a5b8bf c3d0d0 dde3dd f5efdf'),
    ...ramp('24183a 827aa0 b0a2c0 d8c8da f7eef2', '1f2b3b 6c8a9f a0bbc7 d7e5e5 fff6e6'),
  } },
  witchhunter: { name: 'Ashwarden', palette: {
    ...ramp('16142b 2b2f4d 384360 4a5674 5d6b88 75829d 909cb2 afb6c8',
      '27222b 49404a 62525b 7e6770 9b8086 b89c9e d4bcba ebd9ce'),
    ...ramp('1f0f15 30171a 46221f 5f3025 7a432e 955a39 b0744a',
      '19242a 29383c 3c4e50 54696a 738b86 99ada0 c7d2b6'),
  } },
};
