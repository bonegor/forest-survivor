// Coordinates on the first native idle pose. Transparent cells leave the cloth,
// outline and metal beneath a detail visible.
const patch = (x, y, rows, mix = 0.84) => ({ x, y, rows, mix });

// Small colour neighbourhoods keep the same material through separately drawn
// release and fall frames, even when an engraved detail turns out of sight.
const dye = (from, to, tolerance) => ({ from, to, tolerance });

export const companyRefinements = {
  trailblazer: {
    name: 'Waxed Wayfarer',
    palette: { a:'39452d', b:'5d7043', c:'82945c', d:'adad74', s:'40362c', t:'876448', u:'b39466' },
    materialDyes: [
      dye('47522c', '414d36', 27), dye('6b783d', '67754f', 36), dye('949f56', '93a273', 35),
      dye('78a150', '889762', 38), dye('54823e', '62774e', 34), dye('1a5538', '415d44', 28),
      dye('113e2e', '324735', 24), dye('7a5731', '947454', 24), dye('6c2d1b', '764532', 21),
    ],
    patches: [
      // Oiled, overhanging hood with a creased crown and a turned edge around the face.
      patch(34, 27, ['..ba.....','..cbb....','..bcccba.','.bcddccca','bcdbbbaaa','cdbbcs...','bcbat....','cbat.....','bba......']),
      patch(35, 36, ['..t...', '.uba..', 'tcbb..', 'abccba']),
      // The returning cloak shows a second plane at the shoulder and split hem.
      patch(26, 44, ['.....a..','....cba.','...ccba.','..cdbba.','.cdbbaa.','bcbaba..','aa..a...']),
      patch(35, 44, ['bcdcbba','ccbbacb','aba..ab']),
      patch(44, 38, ['u.','t.','s.','u.','t.'], 0.72),
    ],
  },
  thornkeeper: {
    name: 'Willowbark Warden',
    palette: { a:'323e26', b:'556134', c:'818746', d:'ada560', u:'bc9b6a', t:'786541', s:'4b382c' },
    materialDyes: [
      dye('246329', '3b5735', 26), dye('4f8b24', '617743', 32), dye('72a52e', '88924d', 34),
      dye('908c3e', '8c8d55', 32), dye('68652b', '646a41', 28), dye('84452f', '88694d', 26),
      dye('723a2b', '74563e', 22),
    ],
    patches: [
      // Layered lance-shaped leaves form a short mantle around the beard.
      patch(30, 32, ['....d...', '...dcb..', '..dcbca.', '.dcbdcba', 'cbbdcbaa','a.ccb...','..aa....']),
      patch(34, 42, ['..dcbaa','..cbdcb','.dca.cba','dcb..bca','cba..acb','ba...acb','a....aba']),
      patch(40, 44, ['...d.','..dcb','..cba','..bcb','..acb','...ba']),
      // The druid binds the staff at its elbow with three overlapping willow strips.
      patch(47, 30, ['.u.','tt.','su.','.t.','us.','ts.'], 0.8),
    ],
  },
  wraith: {
    name: 'Sable Shroud',
    palette: { a:'26243b', b:'43465a', c:'616d7b', d:'89949e', v:'483850', p:'735470', l:'96718b' },
    patches: [
      // A broken stripe turns down the cowl with the fabric, ending before the eye.
      patch(38, 27, ['......ccb..','....ccddcb.','..bcccbcccb','bcccbbaabcc','..baa.bc...','....bcba...','....cb.....']),
      patch(32, 34, ['...pplp..','..ppvpp..','..v..v...','.ppv.....','ppv......','vv.......']),
      // Pale inner folds follow the trailing, floating robe into its separate points.
      patch(37, 41, ['.......lp..','......lpv..','......pc...','.....lcb...','....lcb....','...pcba....','..pcb.pv...', '.pcc.pp....','pcb.ppv....','bv.pv......']),
      patch(41, 35, ['.cbb','dcba','cbaa','baa.'], 0.76),
    ],
  },
  gravebinder: {
    name: 'Barrow Cantor',
    palette: { a:'352334', b:'593750', c:'84556d', d:'a47e88', n:'4b403d', t:'8a7361', h:'bbab8e' },
    patches: [
      // An ash-grey rib crosses the raised mantle. The lining folds under it in plum.
      patch(30, 25, ['.....bb..','....ccb..','...ccba..','..dcbaa..','.cbbab..','bbaab...','aa.b....']),
      patch(34, 31, ['..dcccb.','.dcbbbca','cbbabbab','baabh...','a.bc....','..c.....']),
      // Interrupted rows of bone stitching and a deeper inner fold on the long tabard.
      patch(35, 42, ['..bcdh.','..bcct.','..bccn.','.bbct..','.bcdh..','bccch..','bcct...','bccn...','cct....','cb.....']),
      patch(27, 44, ['....b.','...cb.','..ccb.','.ccba.','ccbba.','bbaa..','..b...']),
      patch(47, 32, ['.h.','.t.','nt.','ht.','tn.'], 0.76),
    ],
  },
  arcanist: {
    name: 'Indigo Scholar',
    palette: { a:'292949', b:'3e4674', c:'586da5', d:'899abe', l:'c4bbb1', t:'9c7448' },
    materialDyes: [
      dye('2b5dc7', '667da9', 52), dye('21379e', '434e80', 45), dye('1d2179', '30335d', 37),
      dye('1b1050', '272544', 25), dye('702a6b', '64415f', 33),
    ],
    patches: [
      // A pleat turns back toward the tip of the hat, above a woven, stepped band.
      patch(35, 19, ['....cbb....', '..bccddb...', '.bcbcccdb..','ba..bcccb..','....abbccb.','.....abbcca']),
      patch(38, 25, ['....bdc.', 'abccdlta','ccddlt..','abba....'], 0.75),
      patch(36, 28, ['....bcdddccba','..bcccbba....','bcbba........'], 0.78),
      // The dark robe opens from a fastened shoulder into two different silk facings.
      patch(34, 35, ['...dcba','..dcbac','.bcbaa.','bcbb...','cba....','ba.....']),
      patch(36, 47, ['...cbd','..bccd','.bccdc','.bcdcb','bcdlbt','cdtb..'], 0.82),
      patch(44, 46, ['.bcd.','.bcd.','abcda','bccda','ccldb','.cdtb'], 0.76),
    ],
  },
  praetorian: {
    name: 'Palatine Guard',
    palette: { a:'493e39', b:'796954', c:'ac946b', d:'dcc292', v:'4f5354', m:'818787', h:'b9bbad', r:'993d39', l:'d1684a' },
    materialDyes: [
      dye('e89913', 'af966c', 45), dye('c6750f', '947851', 34), dye('a3600f', '71593d', 27),
      dye('d0b799', 'b0afa0', 37), dye('b89d88', '8d9288', 29), dye('24243f', '354147', 19),
      dye('e20101', 'b0493b', 52), dye('990002', '883730', 39), dye('600103', '55272c', 30),
    ],
    patches: [
      // The long scutum has a narrow bronze lip, a steel panel and a raised central rib.
      patch(42, 35, ['..cdd..','.cbbcc.','dbvmmb.','cbvmmbc','cbvmhbc','cbvmmbc','cbmhhbc','cbvmmbc']),
      patch(42, 43, ['cbvmmbc','cbvmmbc','cbvmhbc','cbvmmbc','cbmhmba','.bvmbba','..bccb.']),
      // Layered felt at the base of the plume and two joined lames below the gorget.
      patch(29, 26, ['...rrllr','..rrllra','.rrrlra.','rrlraa..','rrraa...','raa.....'], 0.75),
      patch(34, 39, ['..hhmma','hmvvmm.','vmmhhma','.vvvma.'], 0.72),
    ],
  },
  seraph: {
    name: 'Vesper Mantle',
    palette: { a:'66544b', b:'92795b', c:'c6aa78', d:'e3ce99', e:'f4e8c0', m:'9ba6a8', h:'cbd0cb' },
    materialDyes: [
      dye('e4ad3e', 'c6ac7a', 39), dye('9d7220', '957d54', 30), dye('644819', '665440', 26),
      dye('fde4b1', 'e3d6b4', 21), dye('795008', '78613c', 25),
    ],
    patches: [
      // Layered feather-shaped folds on the leading edge of the illuminated mantle.
      patch(23, 39, ['.......ba','......cdb','.....cdca','....cdeba','...cddba.','..cdeba..','.cddba...','cdedbc...','ddbcda...','b.cdba...']),
      patch(38, 45, ['.edc.', '.dcba','.dedb','ddcba','dcba.','cba..'], 0.74),
      // Hammered impressions follow the curve of the shield without crossing the sword.
      patch(47, 38, ['...ed.','..dcba','.dcccb','cbaaac','cbcecb','.bcdc.','.ccba.','.bcb..','..b...'], 0.85),
      patch(33, 33, ['.ehhm','ehhmc','mmcbc','.bc..'], 0.66),
    ],
  },
  boltguard: {
    name: 'Greylock Arbalist',
    palette: { a:'303039', b:'4c4c57', c:'697586', d:'9299a1', s:'513b30', t:'88654b', u:'b29569', x:'72737d', h:'c5b798' },
    materialDyes: [
      dye('464e6d', '606a77', 36), dye('353b57', '49545f', 28), dye('2a2f48', '383e49', 20),
      dye('704029', '947659', 26), dye('573124', '725943', 22), dye('757485', '9b998d', 24),
      dye('414966', '596572', 28),
    ],
    patches: [
      // Soft hat crown and a weathered, two-piece band above its downturned brim.
      patch(34, 28, ['....bccb...','...bccdcb..','...cbbccb..','.stttuttsss','bbuuttsbcbb'], 0.85),
      // A crossbowman's quilted jack, with the skirt falling open behind his left boot.
      patch(32, 44, ['....tutta','...bbcab.','..bccbab.','.bccbaba','.ccbab..','cccba...','bcbc....','..ab....']),
      patch(36, 38, ['.cdcb.', 'bcbbc.','abcbc.','.a.bt.','.ttus.'], 0.76),
      // Horn and steel sit flush on the original stock and leave its string visible.
      patch(44, 42, ['..t....','.uhxt..','btuxuh.','.sbtt..'], 0.85),
    ],
  },
  swordbearer: {
    name: 'Fluted Man-at-Arms',
    palette: { a:'363749', b:'505266', c:'788696', d:'adb5ba', e:'e2e2d6', w:'bb9a65', t:'75553d' },
    materialDyes: [
      dye('faedde', 'e9eeeb', 32), dye('9693b0', '8596a3', 36), dye('837f9f', '708291', 27),
      dye('676188', '586b7a', 30), dye('38344a', '394552', 21),
    ],
    patches: [
      // The breastplate and spaulder have broad convex ribs with shadows underneath.
      patch(29, 33, ['....edc.','..cddcbc','.dccdcbb','ddcbccba','cbaddcb.','..dcbba.','...ba...']),
      patch(37, 36, ['...dc.','..dccb','.dccdc','dcbccb','.cbccb','..cbb.']),
      patch(44, 36, ['.ddc..','cdbdc.','dbbcdb','dbccdb','dccbdb','dcbbdb','dccbdb','dcbbdb','dcbbdb','.ccbb.','.bba..']),
      // The fuller narrows towards the point, leaving a continuous cutting edge below it.
      patch(34, 44, ['.ddc..........', 'cbccddd.......', '.bccccdde.....', '....ccbccdde..', '.......ccbcdd.', '..........cbd.'], 0.72),
      patch(32, 42, ['.wt.', 'wt..','tw..','.t..'], 0.72),
    ],
  },
  sentinel: {
    name: 'Ashwood Watchman',
    palette: { a:'37423c', b:'5a6959', c:'8c9476', d:'c0baa0', s:'454855', m:'717c84', h:'a3afb0', w:'d5d5c8', t:'896949' },
    materialDyes: [
      dye('673c28', '596555', 22), dye('794930', '79806a', 19), dye('8c5435', '8c9278', 23),
      dye('674d4f', '5c6458', 23), dye('cbc3d6', 'c5ccca', 24),
    ],
    patches: [
      // An ashwood face within the original metal rim; the short transverse straps
      // turn around the curved boards rather than crossing the watchman's hand.
      patch(43, 35, ['wcdd.','mcbdm','mcbcm','mcabm','hddmh','mcbcm','mcbcm','mbacm','mcbcm','wcddh','mcbbm','.cba.']),
      patch(34, 27, ['....whmm.', '...whmhmm','..whmhmm.','.hmhwwhh.','mmms.....'], 0.66),
      patch(36, 37, ['.whmh.','whmhm.','mmshms','mshms.','shms..'], 0.76),
      patch(34, 41, ['.tt.dd.','ttddtt.','..tt...'], 0.72),
    ],
  },
  eanasir: {
    name: 'Ur Wool Merchant',
    palette: { a:'5c4b41', b:'90785e', c:'b59e7d', d:'d4c2a1', e:'ece1c6', v:'445c5a', l:'72847b' },
    patches: [
      // Carved rows turn under the beard; the forehead, eyes and nose are untouched.
      patch(36, 24, ['.dcdcdc.', '.bababab', '.cdcdcd.', '.ababab.', '.dcdcdc.', '..babab.', '..cdcdc.', '...baba.'], 0.68),
      // A folded wool sash crosses the wrapped kaunakes at the hip.
      patch(33, 38, ['..........bdc.', '........bdecb.', '......bdecba..','....bdecba....','..bdecba......','bdecba........','cbba..........'], 0.83),
      patch(32, 46, ['.dcb....dcb..dcb','dcbb...dcbb.dcbb','cbb....cbb..cbb.','.b....dcbb..b...'], 0.78),
      // A quietly coloured stepped hem runs over, then under, the broad vertical pleats.
      patch(31, 50, ['..dlv..dlv..dlv.', '.dlv..dlv..dlv..','blv..blv..blv...','bb..bb...bb...b.'], 0.86),
      patch(31, 28, ['.dd.','dcb.','cba.','bc..','b...'], 0.68),
    ],
  },
};
