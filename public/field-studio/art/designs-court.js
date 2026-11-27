// Facing right, painted at field resolution. Gear pivots are local to the
// individual piece so, for example, a censer swings from its chain.
const rows = art => art.split('/');
const gear = (art, x, y) => ({ rows: rows(art), grip: [x, y] });
// Local metal, dye and enamel swatches. A brass cuirass, a brass instrument
// and a moonlit wing have different shadow materials on the same dark field.
const finishes = {
  'Tollkeeper of the Ossuary': { c:'215050', l:'648e84', n:'162d3c', m:'608780', h:'b4d0b6', g:'b17746', A:'a3fff2' },
  'Mothwake Medium': { c:'573673', l:'b86cad', w:'e2b7e4', n:'221f43', g:'a48767', A:'6af0d8' },
  'Cardinal of Ash': { c:'ab3150', l:'f48b72', n:'54213b', g:'efa857', h:'c2b5bc', A:'61ddd9' },
  'The Marrow Hound': { c:'47363f', n:'252b3a', s:'494851', m:'918573', h:'d5c5a1', H:'fff5d7', A:'ff5435' },
  'Brass Orrerist': { c:'235555', n:'15333b', m:'53665d', h:'97ac92', g:'c78432', w:'fae7a0', A:'70f5e2' },
  'Stormglass Fencer': { c:'164e77', l:'51abbd', g:'a37a53', m:'456d85', h:'9ac7d4', H:'ecfff5', A:'43e6f1' },
  'Blue Hour Harlequin': { c:'5b4488', n:'281e43', l:'bb6e98', h:'c4bfed', H:'ffebc3', A:'63cfc5', g:'d69c57' },
  'Mask of the Heliograph': { c:'a02e42', n:'4c223c', g:'dc942e', s:'583342', m:'985b49', h:'ffd37a', H:'fff2c0', A:'fc6541' },
  'Boar Gate Tribune': { c:'963448', n:'492433', g:'c48b43', s:'343746', m:'777d86', h:'bac0b9', H:'fff0cb' },
  'Black Salt Centurion': { s:'293c49', m:'35646a', h:'809c9e', H:'cddcce', c:'29596d', g:'aa7153', A:'64efdb' },
  'Griffin Lictor': { c:'324d70', n:'202c4e', s:'4d4654', m:'8b775d', h:'caae76', H:'ffe9bb', g:'dd9b49', A:'64c7cb' },
  'Cathedral Guard': { c:'62466f', n:'2b2348', m:'50657b', h:'a1bac2', H:'e5e6ce', g:'bf8a58', A:'5ecfd2' },
  'The Ivory Heron': { s:'415c64', m:'78978b', h:'bcd7c8', H:'fff6dd', g:'d8a352', w:'dce9cd', A:'56b4b1' },
  'Vesper Bell': { c:'8f2d4b', n:'441d37', s:'363741', m:'765d50', h:'cfac7c', H:'fee3ae', g:'bf8755', A:'f7a4ab' },
  'Midnight Swan': { c:'5f3c75', n:'292336', s:'2e2c46', m:'514765', h:'9581a6', H:'c7cbe2', g:'a67f60', A:'78d6ed' },
  'Chainbreaker': { c:'a74648', n:'5a2b3b', f:'b67150', F:'ebba81', m:'536c76', h:'9ab2bd', H:'e0d5bb', g:'d69347', A:'65ddcc' },
};
function model(name, palette, stance, head, body, weapon, offhand, cloak, extra = {}) {
  return { name, palette, ink: finishes[name], stance, head: rows(head), body: rows(body), weapon, offhand,
    ...(cloak ? { cloak: rows(cloak) } : {}), ...extra };
}

const tombBell = gear(
  '.......ggk/......gwgk/.......gk/.......mk/.......gk/.......mk/......kgsk/.....kghmgk/....kgcccgmk/...kgnlccckk/...kgccgcgmk/..kgccgmgcgmk/.kgmmhhhmmmgk/..kkkkgkkkkk/.....kgk', 7, 1);
const mothLamp = gear(
  '....ggk/...g..gk/...g..gk/....ggk/..kghhgk/.kslAAlsk/.ksAHHAsk/.kslAAlsk/..kgllgk/...kgmk/....gk', 4, 1);
const ossuaryCrozier = gear(
  '....kgggk/...kghwgmk/..kghk.gAk/..kgmk..k/...kgsk/....kgk/.....gk/.....gk/.....tk/.....gk/.....tk/.....gk/.....tk/.....gk/.....mk', 5, 10);
const boneHook = gear(
  '..........kHhk/........kHhhk/......kHmmmk/....kHhmmss/..kHmmsskk/.khhsskk/.kmskk/..kgggk/...ktk/....tk/....gk', 4, 9);
const marrowKnife = gear(
  '......kH/....kHhk/..kHhmk/.khmsk/kmmmk/.ksk/..gk/..tk/..gk', 2, 7);
const funeralPennant = gear(
  '....gk/...gggk/....gk/....ggggggk/....gcnnnck/....gclAlnk/....gcnlnck/....gcnknck/....gc..nck/....gk...ck/....gk/....tk/....gk/....gk/....mk', 4, 11);
const reliquary = gear(
  '....gk/...gAgk/..gghggk/.kgchcgk/.kgAhAgk/.kgcHcgk/.kgggggk/..ksssk/...kgk', 3, 5);

const orrery = gear(
  '......gk/....kgwgk/...ggm.mgg/..gm..A..mgk/.gw..lHl..wgk/.gm.gAHAg.mgk/..gg..A..ggk/...gmgmgmgk/....kgwgk/.....kgk', 4, 8);
const orbitStaff = gear(
  '........kggk/......kgh..gk/.....kg..g..gk/.....g..AH..gk/......g..g.gk/.......kgggk/........gk/.......gk/.......tk/......gk/......tk/.....gk/.....tk/....gk/....mk', 6, 9);
const prismRapier = gear(
  '...............H/..............Hh/.............Hhk/............Hmk/...........Hmk/..........Hmk/.........Hhk/........Hhk/.......Hhk/....g.Hhk/.....ggk/....gkgmk/...tk..g/..tk/..gk', 3, 12);
const glassGuard = gear(
  '....kA/..kAlHk/.klHHHlk/kHHlmlAlk/klAmkslAk/.klHHhlk/..klAlk/...kAk', 4, 4);
const fateCards = gear(
  '..HHk.Hwk/.HAAkHcck/HlHAlcAlk/HAAAgcHck/.Hhclllk/..ksssk', 3, 5);
const cometWand = gear(
  '.........g/.......wgA/......AHAk/.....kwgk/.....gk/....gk/...tk/..gk/.tk', 2, 7);
const sunMirror = gear(
  '......g/...g..wg..g/....gwwggg/..ggghHHhggk/...ghHhglhgk/.gghHhglmgwwk/..ggHhlmmggk/...gghhhggk/..g..ggg..g/......g', 4, 6);

const boarShield = gear(
  '..kggggggk/.kgmmhhmmgk/kgmdsssssmgk/kgmdgssgssgk/kgmsfFFfmggk/kgmdfkkfmgsk/kgmHwffwHmgk/kgmdfggfmggk/kgmdsccssmgk/kgmdsccssmgk/.kmsggggmgk/..kmhhhhmk/...kksskk', 5, 6);
const coralHook = gear(
  '..........kh/.........khk/........khmk/.......khmsk/....g.khmsk/....kgHhsk/....kggmk/.....gk/.....tk/....gk/....tk/..g.gk/..gkghk/.kmmgmk/..kmkk', 5, 8);
const breakersWheel = gear(
  '....g...gk/..g.gmhg.gk/..kgmsmmgk/.kmmg..gmmk/kggg.A..gggk/.kmmg..gmmk/..kgmsmmgk/.g..gmhg..g/....g...g', 5, 4);
const griffinAxe = gear(
  '......kggk/......kHhgmk/.....kHHmmmgk/...kgggghhmgk/..kghHh.Hhhhhk/.kHHmsk..hHHHk/kHmkk.....kHk/....gk/....tk/...gk/...tk/..gk/..sk', 4, 8);
const griffinBuckler = gear(
  '..g...g/.kgghggk/kggHhHggk/kgmhHmmgk/kgmggmmgk/.kgmAmmk/..kgmmk/...kgk', 4, 4);
const spireShield = gear(
  '.....Hk/....ghgk/...kgHgmk/..kghAHgmk/.kgHAAAHgmk/.kgAHgHAgmk/.kgHgAgHgmk/.kgAHgHAgmk/.kgHgAgHgmk/.kgAAHAAgmk/.kghHHHhgmk/..kghhhgmk/...kgmgmk/....kgmk/.....gk', 5, 7);
const spireBlade = gear(
  '.........H/........Hhk/.......HAhk/......HAAk/.....HAAk/....HAAk/...gHhk/..ggggmk/...gmk/..tk/.gk', 2, 9);

const featherPike = gear(
  '............Hk/..........kHhk/.........kHhmk/.......wHhhhk/.......Hhhmk/.....kHhmmk/.....kgggk/......gk/.....gk/.....tk/....gk/....tk/...gk/...tk/..gk',5,9);
const bellHammer = gear(
  '....kgggk/...kgHHhgk/..kghmssmgk/.kggmssggmgk/kghhhmmmmggk/..kkkkgkkkk/.....kgk/.....tk/....gk/....tk/...gk/...mk',5,7);
const swanGlaive = gear(
  '............kH/.........kHHhk/.......kHmmhk/.....kHmmssk/...kHmmssk/.kHmmmskk/.kmmsskk/..kgmk/...gk/...tk/..gk/..tk/.gk',3,9);
const chainGauntlet = gear(
  '....g...g/..kggggggk/.kghHmmhggk/kgmAHHmmmgk/kgmmHhmmmk/.kgggmmmk/..kgggk/..gk.g/...gkgk/....gk',4,5);

export const courtDesigns = {
  gravebinder: [
    model('Tollkeeper of the Ossuary','bone','tall',
      '.....gk/....gAgk/...kgggk/..kgsssgk/.kgsmsmsgk/kgmHhhHmmgk/..kHkkHhsk/..khHhHsmk/...khkkmk/...ksggsk',
      '....kgkkgk/...kgcnncgk/..kgccggncgk/.kgcnHhhHncgk/kgccnssmhncggk/.kcnnhHhnncck/.kncnskmncnk/..kcnHhnncck/.kccngmgcnck/.kgnngtgnngk/kgcngtttgncgk/kgnnHtttHnngk/kgcnk...kccgk/kck.......kck',
      ossuaryCrozier,tombBell,
      '....kdddkk/..kdnccnndk/.kdncclllcndk/kdnnck...knnk/kdnnk.....knk/kdnk......kdk/knnk/knk/kk'),
    model('Mothwake Medium','umbra','wide',
      'gk..........kg/.gk..kkk...kg/..gkkcclkkkg/...kllHlllk/..kklHHHllkk/.kcAwkkwAAck/.kcHHkkHHlck/..knnllnnck/...knggnnk/....kggck',
      '....kgHhgk/...klAglAlk/..kcllHHllck/.kclAcccAlcck/..kngllgnnck/...kggHggck/...kcntncck/..kcncAcclck/.kcncHnHnlcck/knnclnknllcnk/knclnk.knllck/kclnk...knlck/klk.......klk',
      mothLamp,'wand',
      'k...............k/knk...........knk/kclkk.......kklck/kcAllck...kcllAck/.kcHAlck.kclAHck/.knllcngkgcnllnk/..kcnlAlAlAlnck/..kclgnngnnglck/.kcnngk..kgnnck/kcAlck....kclAck/kclnk......knlck/knk..........knk/k..............k',
      {hovering:true}),
    model('Cardinal of Ash','garnet','tall',
      '..gk..g...g/..ggkggk.gg/..kcgggAggk/..kgccgHgck/..kgncgHgck/..kggHHHggk/...kHkHkHmk/...khhhHhsk/....khHhmk/....kggggk',
      '...kgkkgkkgk/..kgccggcccgk/.kgcgnHhnccggk/kgccgnHhnccgcgk/kcncgnAhncggcck/kccngnHhncgccnk/.kcngnggncgnck/.kcngncgncgcck/.kcggncgnngcck/kcnngncgnnngck/kccngnHgnnngck/kcncggHggncgck/kggggk.kgggggk/kgnk.....knggk',
      funeralPennant,reliquary,
      '...kkkggkkk/..kccncccnck/.kcnnnkknncck/kccnnk..knccck/kcnnk....kncck/kcnk......knck/kck........kck'),
    model('The Marrow Hound','dusk','low',
      '...kHk..Hk/..kHhkkHhk/.kHhmHHhkkk/khhmsshhHHhk/kmmhHskAHHHHk/.kshksffHmkk/..kmmHhHHkk/..ksskkHk/...kkcck',
      '...khhhkkk/..kHhmhhHmk/.khmHmHhhHhkk/ksHhhffHhhmssk/..ksfffFsmsk/..kctffftcmk/..kntgfttnck/...kgttAgtk/..kHhggghHk/.khhmskshhmk/khhmsk..khhmk/kmskk...kshhk',
      boneHook,marrowKnife,
      '....khhHHhk/..khHhHhHhmk/.kHmhhHhmsmk/kHmmkskmsssk/kmsk..kskmk/kk.....ksk'),
  ],
  arcanist: [
    model('Brass Orrerist','harvest','wide',
      '...kgghgk/..kgm..ghgk/.kgg..g..mgk/gm..kgAgk.mg/kg..gHHHg.gk/.kgghsAsggk/...kFffFmk/...kfftssk/....kggtk',
      '....kghhgk/...kgmcggmk/..kgmncAnmgk/.kgmnsghnsmgk/kghmsggggsmhgk/.kgscctccsgmk/..kggtAtggmk/..kgctgtcggk/.kgcntgtcnmgk/kgnncgAgcncmk/kgncggmggncck/kgcgmk.kgmcck/kmmk....kmmmk',
      orbitStaff,orrery,
      '...kkggggkk/..kggnccnggk/.kgnccncncggk/kgnnck...kncgk/kgnck.....knck/kgtk.......ktk'),
    model('Stormglass Fencer','glacier','forward',
      '....HHh/.kHHhmlk/HHhhlcHlk/.kHccHllHk/.kclFFkFAk/..klfFFfk/..kfftfk/...kssk',
      '...khHHhk/...ksAmmgk/..ksmHhmggk/.kmmmHhmcccHk/kshHHHmclcllk/.ksmhmccnclck/..kmhgwncmk/..kggAgtcck/..kcngtcnck/.kccnnkccnck/kclnkk.kclcck/kllk....kllck/kk.......klk',
      prismRapier,glassGuard,
      '....kllllkk/..kllHlllcck/.kllHHlcnck/klllllnck/kllnck/klnck/klk'),
    model('Blue Hour Harlequin','royal','low',
      '...H.......gk/...cgk...kgHk/..kllgk.kggk/.kcnlggggck/knnkclHAlck/kck..HFFAk/..kHkkHkkFk/...khHFHfk/....kgngk',
      '....kgwwgk/..kgHwkHwgk/.kccHnHnHcHk/knclnHnHncclk/.kgclnHnccgk/..kcclncHnk/...kgAgnck/..knHnHnHck/.kcHnHnHnclk/.kHnHnknHnHk/kcnHnk.knHnck/kllk....kclck',
      cometWand,fateCards,
      '..kgkggkk/.kngnccclk/kcnHnHnHnk/kHnHnHnkk/kcnHnk/klk'),
    model('Mask of the Heliograph','sun','tall',
      '.g..g..g..g/..g.g.g.gg/.ggwwggggk/gwghHHHhggg/..gHAkgAgk/gggHhAghggg/.kgmhhgmgk/..gkgHgkg/..g..gk..g',
      '....gwwggk/...gwHHhggk/..ggHHghHgggk/.ggggHAgHHhggk/kgHgmmgggmmgHgk/.kghmHggmhhgk/..kgmmgmgmgk/..kcggAggck/.kcngggggcck/kccngHmHgncck/kcnngHmhgnnck/kcnngmkgcncck/kgngk...kggnk',
      'sabre',sunMirror,
      '....ggggg/..gwnncngg/ggccnkkcnngg/kncck..gnccngk/kcnn...kcccnnk/kcnk....kncnk/kck......kck',
      {hovering:true}),
  ],
  praetorian: [
    model('Boar Gate Tribune','harvest','wide',
      '.kcclllcccck/kcllccnnncgk/.knkgghhggk/...ghhhhHhHgk/..kgmgggmhhgk/..kgmkkHAffk/.kggmfffsfHk/.kgkkHgmgHk/...kmmgmmk',
      '...kgggghhgk/..kgHHHhmhhgk/.kghHHHhhmhhgk/kghmssggmssmmgk/..kmhhhhhggmk/..kgsmmmssmgk/..kghhhmhhmgk/..kgsmmmssmgk/..kgttgAgttgk/.kgnttgtgtcgk/.kctHtgHttctk/knttgtkgtHttk/knkk..k..kkk',
      'spear',boarShield,
      '....kccckk/..kcllcccnkk/.kcccnnkccck/kccnkk...kcck/kcnk......kck/kck'),
    model('Black Salt Centurion','tide','low',
      '..k..kk.gk/.kckgAgkggk/.kcgmmhHHhgk/.kmmssmssmhk/ksmgAgsmAgmk/ksmgwgsmlgmk/.ksmsssssmmk/..kmhggggmk/..kmmgmgmk',
      '....khhkkk/..kghhmmhmgk/.kmmmsggmhhmk/ksgHmghggmHhsk/kAghmggggmhhsk/.ksmmmtmsmsmk/..kgggAggggk/.kmsssmmssmgk/kgmAmggAmgmmk/kmggmmmggmsmk/kmmHskkshmAsk/kkmk....kkmsk',
      coralHook,breakersWheel,
      '...ksssmmkk/.ksAmsmmsmmk/ksmggAmmksmk/ksmgmksk..kk/kmsk..kk/kk'),
    model('Griffin Lictor','storm','forward',
      '.Hh...kggk/HhhHkgghhgk/.HmmgHhmmHgk/..HmhHAkHmmHk/...gHhhhggggHk/...gmmmffsk/...kmgHfffk/....kgsssk',
      '....kghghgk/..kHHghmmggk/.kHHhhmmhHHHgk/kHhmggAghHhhgk/kmmghggghmHHmk/.kgmhhmhmmhmk/..kmgssmssmgk/..kgttgAgttgk/.kccgnccngcck/.kgnnHghHnngk/kgcnHhkmhhgcgk/kkgmk..kmmgkk',
      griffinAxe,griffinBuckler,
      'HHhhk/HhHHhmkk/.HmmhhHHhk/..HmhmhmHHk/..HsmHmmmHk/...HkmmHsk/....kmHsk/.....kk'),
    model('Cathedral Guard','royal','tall',
      '....gk...gk/....gHg.gHg/...kgHhghHgk/..kgmHhhHHmgk/..kggmmHhgggk/..kgAgsAgAgk/..kghggggmgk/...kgmmgmgk/....kghhgk',
      '...kgHggHgk/..kgHhhHhhHgk/.kgmHHghHHmmgk/kgmmghAgghmmmgk/.kgHggHggghmgk/..kghmAhmhmgk/..kgmmgHmsmgk/..kggggAggggk/.kgccgmHmgccgk/.kgncgmHmgcngk/kgcncghHhgnncgk/kgnngmk.kmgnngk/kgggk....kgggk',
      spireBlade,spireShield,
      '...kgcgggck/..kgcnnnncgk/.kgcnnggnncgk/kgcnnkkkknccgk/kgnnk....knngk/kgck......kcgk/kgk........kgk'),
  ],
  seraph: [
    model('The Ivory Heron','bone','tall',
      '.....H....H/....HH...Hh/..kHhhk.Hhk/.kHhhHmHhhk/kHhmmgAgmHhk/..kgFFkFFHHk/..khFFFfhHk/...khFfhk/....kgwk',
      '....kwwggk/...kHwwHggk/..kHlhwghwwk/.kHHhgwwgHhhk/kHhHhgggHmhhHk/.kHhHwwwwHhHk/..khhhgHhhhk/...kgHtAgHk/..kHwwgHwwHk/.kHhwgHhHgwHk/khwwgHhkhHgHhk/kHhHhk..kHhhk/kHhk.....kHhk',
      featherPike,'disc',
      'HHk...............kHH/.Hhhk...........kHhhk/.HHhHk.........kHhhHk/..HhhHHk.....kHHhhHk/...HhHhhkk.kkhhHhhk/.HHHhHhhHgHhhhHhhHH/.HhhhhgHhHhHghhhHk/..HhhHhHhk.hhHhhhHk/...HhhHhk...kHhhhHk/..HhhHk.......kHhhH/..Hhk...........kHh/..H...............H',
      {hovering:true}),
    model('Vesper Bell','garnet','tall',
      '...gggHggg/..g.......g/.g...g.....g/g..kgggk....g/g.kghhhgk...g/.kgmssmmgk.g/khhhHhHhhhkk/..kknAnkk/....kgk',
      '....kggggk/..kgghhhHggk/.kggwmggmhggk/kghmssgmgsmmgk/kgnncggAggnngk/.kccnnggnncck/..kgcnncncgk/..kgccngncgk/.kgcnngHgncgk/kgcnngHhHgncgk/kgnngHmkmHgnngk/kgnngmk.kmgnngk/kgggk....kgggk',
      bellHammer,'disc',
      '..g.............g/.gngk.........kgncg/kgcggk.......kggcngk/.kgHggk.....kggHgk/..kHhHggk.kggHhHk/...kHhhgghgghhHk/..kHhHHhggghHHhHk/.kHhhHhk...khHhhHk/.kHhHk.......kHhHk/..kHk.........kHk',
      {hovering:true}),
    model('Midnight Swan','umbra','forward',
      '.g.....gk/..g..gggk/..kggmhk/.kmhHHhggk/ksmHHhmsmmk/.kshAkHHmHhk/..ksFFFfmkk/..ksffFmk/...kggsk',
      '....kgHhgk/..ksmsghhHk/.ksmHhggHHmk/ksmmghAgmhhmk/kmmHHkggHmhhmk/.kmHsmsmmmHHk/..ksmHmgshmk/..kmggAggmmk/.ksscnmgmccmk/ksmcncckmgnnmk/kmHmk...kmgnmk/kHk.......kmmk',
      swanGlaive,'dagger',
      'kH...............k/.mHk............mHk/kmsHk..........mmHk/.mmsHk.......kmmmHk/..mmsHHk....kmmmHk/.msmmsmHk..kmmssHk/..mHmmsmHkkmsmsHk/.msmHmmssmmmsmsHk/..mmsmHmmmsmmHmk/..mmsmHk.kmmmsmk/.mmsHk....kmsmHk/msHk.......kmHk/Hk...........mk',
      {hovering:true}),
    model('Chainbreaker','cinder','wide',
      '...gk.....gk/..gHk.....kg/..ggk..tk.gg/.kgktttttkkgk/..kttgAtttfk/.ktfFFfFFtfk/kttFfkFffftk/..kfFFFFfttk/..kktfFftk/....kgkgk',
      '...kgtkkgttk/..kghHtffktgk/.kgHHhftFfttgk/kgHgggttFFtgggk/kgmtggggFFtHHgk/.kgtftgtftfHgk/..kffffgtfttk/...kggggAggk/..kcttgtHgtck/.kcnttgttgtcck/kccngtk.kgcnck/knggk....kgcnk/kck........kgk',
      chainGauntlet,chainGauntlet,
      'Hk...............kH/kHHhk.........khHHk/.HhhHgk......gHhhHk/..HhHhgk...kgHhHhk/.HhhgHhggggHhgHhhh/..HhhggHhHhHggHhh/..HhkHhkk.khHkHhk/..H..Hk....kH..H/.....H......H'),
  ],
};
