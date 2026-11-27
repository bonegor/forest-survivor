// Local paint studies on the production idle poses. Each block follows its own piece of kit.
export const vanguardRefinements = {
  knight: {
    name: 'Fluted field plate',
    palette: { a:'333242', b:'596175', c:'8b98a7', d:'ccd0cd', e:'e1ddd0', f:'49404a', g:'93685b' },
    dyes: { 'e81f00':'bc3e31', '900200':'762a29', 'ff5b00':'de6241' },
    patches: [
      // The brow turns away from the light above the existing eye slit.
      { x:38, y:20, rows:['..cd','cdddc','..bcca','....ba'], mix:.81 },
      { x:33, y:29, rows:['...bc','..cdd','.cdbb','bcb.a'], mix:.90 },
      { x:38, y:30, rows:['cd..','bcdc.','abccd','.abcb','..abc'], mix:.87 },
      // A narrow rolled rim and raised boss belong to the shield, ahead of the sword.
      { x:44, y:30, rows:['.bc..','bbcc.','af.bc','agb.c','abf.c','.fb.b','.ab.b','..bb.'], mix:.91 },
      { x:34, y:41, rows:['.cd.','cdb.','bb..','bc..','c...'], mix:.84 },
    ],
  },
  archer: {
    name: 'Oiled trail leathers',
    palette: { a:'2b3028', b:'47553a', c:'758052', d:'a9a274', e:'634236', f:'966a49', g:'c39265', h:'d9c79b', i:'efddad', j:'384c3b' },
    dyes: { '47522c':'394c39', '6b783d':'536c4e', '949f56':'889a70', 'd2c393':'e7d4a4' },
    patches: [
      // Stiff fletching and the stitched lip of the leather quiver.
      { x:29, y:34, rows:['.jj.','hij.','ghii','.jgh','.jbb'], mix:.98 },
      { x:35, y:37, rows:['.cc...','cbed..','.cgef.','..egfe','...efg','....ee'], mix:.93 },
      { x:37, y:42, rows:['...ff','eeeg.','.babe','cbb..'], mix:.88 },
      { x:28, y:42, rows:['...bc','..bcc','.bcda','bcdb.','bbb..','..a..'], mix:.86 },
      // Pale horn nocks catch light at the curve of the existing bow.
      { x:44, y:34, rows:['..h.','.hg.','.g..','.f..','g...'], mix:.86 },
      { x:32, y:50, rows:['ffg','eef','.ef','.ee'], mix:.80 },
    ],
  },
  mage: {
    name: 'Ivory travel mantle',
    palette: { a:'1b2a49', b:'354f72', c:'6984a0', d:'93a6b0', e:'b4a99b', f:'ddd1b7', g:'f3e7cb', h:'997849', i:'caa975' },
    materialDyes: [
      { from:'0a1971', to:'293254', tolerance:40 },
      { from:'0e3aa6', to:'40587c', tolerance:49 },
      { from:'1359c3', to:'526d92', tolerance:43 },
    ],
    patches: [
      // Split hems of the ivory over-robe lap over an indigo under-tunic.
      { x:35, y:43, rows:['...df','..dgf','.dgg.','.ffg.','dff..','dfg..','ff...','fg...','fe...'], mix:.92 },
      { x:39, y:46, rows:['..aab','..aab','.aabd','.abc.','.abc.','abcf.','abg..','ab...'], mix:.96 },
      { x:46, y:44, rows:['f...','ef..','df..','bfg.','.df.','.dfg','..df','..bf','..bb'], mix:.85 },
      { x:35, y:35, rows:['.dgg.','dfgfa','ef.bh','.b..i'], mix:.83 },
      { x:37, y:40, rows:['...hii.','..ih.ih','.hf..hh','..a..a.'], mix:.87 },
      // An indigo bound hem turns across the light skirt, with a single line of old gold.
      { x:32, y:49, rows:['......ia','....iia.','..hhaa..','.bha....','.bb.....'], mix:.96 },
      { x:47, y:39, rows:['..ig','.iib','abc.','.fg.'], mix:.93 },
      { x:33, y:44, rows:['i.','he','h.','i.'], mix:.81 },
    ],
  },
  rogue: {
    name: 'Tideworn shroud',
    palette: { a:'222035', b:'36334b', c:'504b68', d:'706b83', e:'8a8797', f:'264955', g:'37676a', h:'578988', i:'67586e' },
    patches: [
      // A cut-on hood, with the lining turned back from the eyes.
      { x:43, y:27, rows:['....cdd','...cddd','..cded.','.cdcb..','ddb....','b......'], mix:.87 },
      // The long pennants are fabric, lit on their upper fold and dark underneath.
      { x:29, y:36, rows:['........bcd','.....bccdc.','...ccddcb..','.cdccbb....','cfgff......','ghg........'], mix:.90 },
      { x:36, y:43, rows:['.....ic','...bcc.','..bcgg.','.cghgf.','bgg....'], mix:.83 },
      { x:40, y:46, rows:['......bci','.....bci.','...bccib.','..ccibb..','.cci.b...','cb..b....'], mix:.91 },
      { x:46, y:37, rows:['bcdd.','.cdeb','..bbc','...ab'], mix:.76 },
    ],
  },
  necromancer: {
    name: 'Mourning wool',
    palette: { a:'252231', b:'373448', c:'51495e', d:'6d6171', e:'86808c', f:'49314e', g:'6c476b', h:'94697e', i:'917257', j:'c8b391', k:'e1cfab' },
    patches: [
      // Heavy wool drops from the shoulder in continuous, overlapping folds.
      { x:32, y:33, rows:['.......cd','.....ccde','...cdedc.','..cddcb..','.ccbb....','bb.......'], mix:.93 },
      { x:30, y:41, rows:['.....bc','....bcc','...bcdc','..bcdc.','.bccdc.','.bcdc..','bcdcb..','bccb...','bcc....','bc.....'], mix:.90 },
      { x:38, y:41, rows:['...h','..gh','..gf','..gf','.agh','.agh','.fgh','.fg.','fg..','gf..','f...'], mix:.88 },
      { x:38, y:28, rows:['....cd','...cde','..cde.','.cdc..','bcb...','bc....'], mix:.80 },
      // Carved bone over the existing cane and a rubbed highlight on its grip.
      { x:44, y:35, rows:['......','..jkk.','ji..jj','.....i'], mix:.86 },
      { x:44, y:43, rows:['i.','jh','ii','j.'], mix:.82 },
    ],
  },
  paladin: {
    name: 'Pilgrim marshal',
    palette: { a:'4d3437', b:'793c3d', c:'a3514c', d:'c46e58', e:'674c34', f:'967444', g:'b99860', h:'dfc58a', i:'f1dba4', j:'746775', k:'a8a2a5', l:'dfd7c8' },
    materialDyes: [
      { from:'f8c547', to:'c5a56b', tolerance:53 },
      { from:'bd7c27', to:'9c7950', tolerance:50 },
      { from:'f8e29c', to:'e0c999', tolerance:35 },
    ],
    patches: [
      { x:32, y:27, rows:['....cd.','...cdcb','..ccc..','.ccba..','.cb....','bb.....'], mix:.85 },
      { x:35, y:40, rows:['c....','dc...','ccb..','.dcb.','.ccb.','.bcdb','..cda','..ccb','..bca','...ba'], mix:.92 },
      { x:30, y:36, rows:['..ghh','ghhi.','hgfe.','.e...'], mix:.84 },
      // The shield's broad centre is a convex brass face bounded by a rolled rim.
      { x:42, y:36, rows:['.ghi.','gihi.','hhhgg','hgffg','gfeeg','hgffg','.gffg','.gff.','..gfg','..gg.','..g..'], mix:.85 },
      { x:30, y:49, rows:['.kl.','.ll.','.kj.','.jk.','kk..'], mix:.80 },
    ],
  },
  druid: {
    name: 'Alderwood traveller',
    palette: { a:'233528', b:'39503a', c:'566e43', d:'768952', e:'9caa6c', f:'b6bd85', g:'55382d', h:'81563c', i:'ae8058', j:'c5a57c' },
    materialDyes: [
      { from:'9bbd2c', to:'92a465', tolerance:50 },
      { from:'6d9724', to:'718951', tolerance:53 },
      { from:'397023', to:'496c43', tolerance:43 },
    ],
    patches: [
      // A sewn leaf edge follows the natural taper of the hood, clear of the face.
      { x:34, y:29, rows:['...bcc.','..cdee.','.bcccef','..ddcf.','.ccef..','cdef...','cef....','cf.....'], mix:.89 },
      { x:29, y:39, rows:['......cdde','.....cdeef','....cddeb.','...bddcb..','..bcceda..','.bcdeed...','..cdeeb...','.bcdda....','bcca......'], mix:.91 },
      // The hanging end of the garment rolls back on itself below the elbow.
      { x:29, y:47, rows:['..cde..','.cddfec','.cbdec.','bcbcc..','cbcb...','b.a....'], mix:.86 },
      { x:40, y:41, rows:['.hii.','hihhg','iihgg','hggg.','.gg..'], mix:.87 },
      { x:48, y:24, rows:['i....','gih..','.hig.','..ig.','..hh.','..ig.','..hg.'], mix:.87 },
    ],
  },
  berserker: {
    name: 'Ironbound twin axes',
    palette: { a:'303a45', b:'495a64', c:'78878b', d:'aab4af', e:'d8dbca', f:'5e4940', g:'876750', h:'b28b67', i:'3b5f58', j:'658378', k:'8f9e87' },
    dyes: { '193c3e':'2c4542', '285657':'45645c', '3a4466':'38474b', '5a6988':'566a6b',
      '8b9bb4':'869b9a', 'c0cbdc':'adbcb7', 'f4f4e4':'d8dbca' },
    patches: [
      // Each axe has an iron cheek, a darker socket and a single broad polished edge.
      { x:8, y:21, rows:['.c....','decb.b','edccbc','.dbaa.','.dba..','.ca...','.c....','.b....'], mix:.91 },
      { x:32, y:23, rows:['b..c.de','acccdde','.bbbcdd','..abbcd','...abc.','....ab.','.....b.'], mix:.88 },
      { x:18, y:20, rows:['..cd...','.dedc..','cdcbcc.','bccdc..','.acb...','..bba..'], mix:.83 },
      { x:22, y:26, rows:['...fg','..ghi','.ghg.','gigg.','jjb..','jj...'], mix:.88 },
      { x:20, y:31, rows:['.bji.','..jkj','..i..','..i..'], mix:.80 },
    ],
  },
  witchhunter: {
    name: 'Waxed riding coat',
    palette: { a:'34262b', b:'4f3430', c:'735041', d:'986e53', e:'b99466', f:'48434a', g:'67636b', h:'989194', i:'bdbaad', j:'a08056' },
    materialDyes: [
      { from:'71262b', to:'825340', tolerance:46 },
      { from:'42151f', to:'53382e', tolerance:32 },
      { from:'a3613a', to:'a87950', tolerance:34 },
    ],
    patches: [
      // A blocked felt crown and a rubbed brim around the original hatband.
      { x:34, y:27, rows:['.ghg.','.ghfg','..bcd'], mix:.79 },
      { x:30, y:30, rows:['..fgghiihg.','....ff....'], mix:.83 },
      { x:31, y:35, rows:['..cd..','.cddc.','cdcbb.','cbaa..','ba....'], mix:.85 },
      // Wax catches the light where the left coat skirt peels away from the boot.
      { x:29, y:44, rows:['....bc.','...ccd.','..cded.','.cdeda.','cddba..','caa....'], mix:.91 },
      { x:40, y:45, rows:['bc...','bcdc.','.cdd.','..cd.','..bb.'], mix:.85 },
      { x:40, y:40, rows:['.hii...','.jcdde.','bcbba..','..baa..'], mix:.89 },
    ],
  },
  footman: {
    name: 'Ashwood shield',
    palette: { a:'3c302f', b:'624a3a', c:'87674b', d:'ab8960', e:'c4a578', f:'3f4657', g:'627183', h:'909eaa', i:'bdc4c5', j:'dddccd' },
    materialDyes: [
      { from:'793e24', to:'9a7854', tolerance:28 },
      { from:'61311b', to:'806044', tolerance:23 },
      { from:'492417', to:'574233', tolerance:17 },
    ],
    patches: [
      // Two broad ash boards gently curve away from their steel binding.
      { x:49, y:34, rows:['..ihh...','.iccdg..','hcdcbdg.','hcdcbdcg','gcbcbcdg','gcbcbdcg','gcbcbdcg'], mix:.90 },
      { x:50, y:41, rows:['cbgijbg','cbhigbg','cbggbcg','ccbbbdg','cdbbcg.','.dbbcg.','.cbcg..','..bg...'], mix:.92 },
      { x:40, y:26, rows:['..iij.','.hijji','ghihii','ghb...'], mix:.82 },
      { x:34, y:33, rows:['..hi.','.hiji','hiihg','hggg.'], mix:.85 },
      { x:41, y:38, rows:['.giiig','ghiih.','gghgg.','.fgff.'], mix:.86 },
      { x:35, y:49, rows:['..gi.','.hih.','.hg..','ghg..','hg...'], mix:.80 },
    ],
  },
  marksman: {
    name: 'Indigo hunting jack',
    palette: { a:'2d3345', b:'425269', c:'596f88', d:'798fa0', e:'a4afb1', f:'603b33', g:'8c5541', h:'b17b55', i:'c8a06b', j:'b6a28b' },
    // These source colours occur only in the jack's shoulder and tail. The fall
    // turns those same pixels on their sides, independently of the hat and crossbow.
    dyes: {
      '302e43':'28394d', '332849':'293950', '332946':'293950', '332c46':'293950',
      '37324c':'30445c', '38334f':'30445c', '423f58':'364e66', '443f59':'364e66',
      '46425b':'3b536c', '494463':'3b536c', '4a4a64':'3b566d', '4e4c68':'405b73',
      '4e4d67':'405b73', '505069':'415e77', '53526d':'45647c', '53526f':'45647c',
      '54546e':'45647c', '555470':'47667f', '676b87':'56778f', '6b6e8b':'5b7b93',
      '6c708d':'5b7b93', '6d718e':'5b7b93', '6e728f':'5e7e96', '6f728c':'5e7e96',
      '70758f':'618299', '71758f':'618299', '737692':'65859c', '737791':'65859c',
    },
    patches: [
      // A pressed, flat band gathers the low crown without changing the brim.
      { x:38, y:28, rows:['..cc..','.bdcb.','.fghhg','fghhgf'], mix:.85 },
      { x:34, y:32, rows:['..bccddeedc','abb........'], mix:.80 },
      // A double-stitched shoulder and split indigo tail belong to the same coat.
      { x:39, y:37, rows:['..cd.','.cde.','bcdc.','bdba.','ba...'], mix:.91 },
      { x:33, y:45, rows:['....bbc','...bbcc','..bcccb','.bcccb.','bcccb..','bcbb...','bbb....','ba.....'], mix:.82 },
      { x:46, y:47, rows:['b.','bc','bb','ab'], mix:.66 },
      { x:46, y:42, rows:['.j...','..hig','...gg'], mix:.82 },
    ],
  },
  templar: {
    name: 'Linen campaign surcoat',
    palette: { a:'685747', b:'93856c', c:'b7af97', d:'d7cfb4', e:'ede5ca', f:'6d4040', g:'9a5e4f', h:'715b3c', i:'a48753', j:'ccb47a', k:'e7d29a', l:'5a6874' },
    materialDyes: [
      { from:'f9bf42', to:'c6a46e', tolerance:54 },
      { from:'eaa22b', to:'b58c55', tolerance:47 },
      { from:'fcf1d8', to:'e4d9bd', tolerance:28 },
    ],
    patches: [
      // The surcoat turns over at the belt and hangs in two panels. A narrow
      // madder facing follows its left selvage beneath the sword arm.
      { x:35, y:43, rows:['...bcd.','..gcdee','.gfceed','.gcdedd','gfcdeed','gcdeedc','fcdddbb','fcb....'], mix:.94 },
      { x:34, y:36, rows:['.jjk.','jkkji','jiih.','hh...'], mix:.80 },
      { x:36, y:28, rows:['jjh..','kih..','ih...','h....'], mix:.83 },
      // A dark leather shield liner is held between two worn brass edges.
      { x:46, y:36, rows:['..jj.','.jkkh','jkdbi','jidhh','jikah','jikah','jikah','jikah','.ikah','.ijih','..ii.','..i..'], mix:.90 },
      { x:36, y:50, rows:['.jkc.','..cl.','.bll.','.c...','.bc..'], mix:.80 },
    ],
  },
};
