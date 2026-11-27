import { handGear as gear, rows } from './company-gear.js';

// Each head meets its own cuirass or coat at the neck. The renderer supplies
// the articulated arms and legs so these garments travel with the field pose.
export const companyDesigns = {
  witchhunter: [
    {
      name: 'Candle Warden', palette: 'bone', stance: 'tall', weapon: gear.lanternBow,
      head: rows('....A....A.../....w...hw.../....hg..hg.../...cwgllhg.../...lwgllhg.../..clclccgcl../.wwwwllgggll./llccddddddhhh/..ddcFFFms.../...dcffFf..../...dlcff...../....dcld.....'),
      body: rows('....hhww....../..hHhlcllh..../.hhlclcclll../mlcccgAgclcc./.dccgtggtccd./.dccg..gtccd./.dllcgggclcd./.dlcclclclcd./.dggttggttcd./.dlccttcctcd./.dlclddlccld./.lcld..dlccd./.ccd....dcld.'),
      cloak: rows('....hlll../..hlllcc../.lllclccd./.lclcccdd./.lclccdd../cllccdd.../clccdd..../cllccd..../lclcdd..../clccd...../dcd.......'),
    },
    {
      name: 'Moorland Hound', palette: 'harvest', stance: 'low', weapon: gear.forkBow,
      head: rows('....ccc..../..cllllll../.lcwwllccl./.cccllccccll/..lldddddmmm/..ttffFsg/..tffFffgtt/.ttfff..tgtH/.ttff....sth/.tddc.....s'),
      body: rows('...llhhll....../.llwwlllcccll../hlclllclllccll./.lllccclccclcd./..lcgllttcccd../..lccttggcccd../.lcclccgtgccd../.lcccgccgttcd../.lcggggttttcd../.lcctggllcttd../llcclcllccltd../lccclddllccld../clccd...dccld../.cd......dld...'),
    },
    {
      name: 'Iron Penitent', palette: 'storm', stance: 'tall', weapon: gear.rackBow,
      head: rows('.....mhh/....gHHhg/...hmssmhh/..hmsmsmsh/.hmshmhmmsh/.smsksksksm/.smsksksksm/..msksksms/..msksksms/...smssms/....smsm'),
      body: rows('....hmmmhh..../..hhmmmmmmhh../.mHhgtttmhhms./hmmmgtgttgmms./.ssgtmggtgtms./..mgttmggtgm../..mgtgttggmm../..smggmtgmmm../..sttggggttd../..sttcttggtd../..stclttggtd../..sclldgggtd../..dcld..gtdd../..dcd....ttd..'),
      cloak: rows('...cchh/..cllcc/.cllcdd/.llccdd/.lccldd/.lccldd/.lccldd/.clcldd/.clcldd/..ldlcd/..d..ld'),
    },
    {
      name: 'Fen Witchfinder', palette: 'briar', stance: 'forward', weapon: gear.boltBow,
      head: rows('.......t....../......tgt...../.....ttgtt..../...tglgtttt.../..tlllgtgtgt../llltgglltgttt./gtttgtttgtttgg/..tddfFFsk..../..ddffFffg..../...dfFff....../...ddcd.......'),
      body: rows('....lclt....../..llllllccc.../.lclwlcllcll../llccllccclclc./lcllclttgttld./lccclgtggttld./.dclggtclttd../.dcgtcccttld../.dggttttggtd../.dcctgccgtcd../.dccclctllcd../.dclcldlcldd../.clldd..dcld../.cd......dcd..'),
    },
  ],
  footman: [
    {
      name: 'Bridge Tollguard', palette: 'tide', stance: 'wide', weapon: 'sabre', offhand: gear.shieldWall,
      head: rows('.....hhhm...../....hHhhmm..../..hhhmmmmmms../hHhhhmmmmmmmsh/hmmssssssssssm/...smfFffms.../...msfffFsm.../...msffftsm.../....msffms..../....smssm.....'),
      body: rows('....mhmhh..../..hhmhhmhmh../.hHmhmhmmhmh./shhmmhhmhmhms/.smhmtgttmhms/..mmtggmssms./..mtgcllllls./..ggclclclcs./..tggttttggd./..mlcggcttcd./..mcllccttcd./.mclllcccttcd/.dcldd.dcllcd'),
    },
    {
      name: 'Stone Ram', palette: 'bone', stance: 'low', weapon: 'greatsword', offhand: gear.shieldBoss,
      head: rows('.gghh...gghh../gHhmmg.hHmmmg./ghssmg.hhssmg./.gsmhHhmmmhmg./..hHhhmmmhghm./..msmhsshsms../..mskAkksAms../...smhmmhms.../...sgmssmgs.../....gmgmg.....'),
      body: rows('...llwwwlll..../.llwlwwllwlcc../hwwllclllclcccm/lclclhmhhmclcld/.ldhmhHHhmmss../..hHhmmmsmmms../..smhhmmmsmms../..smmsmmhhmms../..gttgggtttg.../..gttgAgtttg.../..mhhhgmmmmms../..smsmssmsmms../..smms..smmms..'),
    },
    {
      name: 'Pennant Captain', palette: 'sapphire', stance: 'tall', weapon: 'sword', offhand: gear.shieldChevron,
      head: rows('wwllcc..g.../llccdd.ggg../.dcc..gHhg../.....hHhhmg./....hHhhmmms/....hgggghms/....sffFgms./....mfffFms./....sffftm../.....stts...'),
      body: rows('....hmmhh..../..ghHHhmmmgg./.ghHhhhmmggmg/gghhhmggmhmms/.mmhgghmmhmms/..gggmmhmhhms/..ghmhclcchms/..ghmcllclcms/..tggtttggtcd/..mwlggcllcdd/..mwlclllccld/..mwlcclllcdd/..mlld.cllcld/..mwd...dclld/..ld.....dcd.'),
      cloak: rows('llllllg/.wllllg/..clllg/...cllg/..ccc.g/...cc.g/......g/......g/......t/......t/......t'),
    },
    {
      name: 'Quarry Sapper', palette: 'cinder', stance: 'forward', weapon: 'sabre', offhand: 'disc',
      head: rows('...ccclll.../..clllcccl../.clwllllccc./.cccllcccllh/..ttgggggghm/..tffFmhAAms/..dtfffsgms./...tfFfttm../..dtttttt.../.dcdtttt....'),
      body: rows('....tggtt...../..mmtttghhmm../.mHHmtttHmmms./.hmmttccttmm../..ttccggttms../..tccclggttd../..ttccllggtt../..tttttgttgt../.gtttttggttgg./.gttghhtgttgd./.tttmtmttccgd./..ttmtmcccld../..ctdd..clld..'),
    },
  ],
  marksman: [
    {
      name: 'Belfry Sniper', palette: 'dusk', stance: 'tall', weapon: gear.rackBow,
      head: rows('.....g...../....ghg..../...mmmms.../..hHHhhmm../..hmhmmms../..msmssms../..mmgAAsmm./..ssffFsms./...sffftms./....ttttm..'),
      body: rows('....cggcc..../...hmcclhmm../..hmmccllhmm./.smsscllcchms/..ssmclgggggs/..smgggtttcms/..ggttcccclms/..gtccllcclms/..ttggggtttms/..mmttgghmcms/..mmlcclhhcms/..sclccllhcd./..dcld.cclld.'),
    },
    {
      name: 'Hedge Arbalist', palette: 'briar', stance: 'low', weapon: gear.forkBow,
      head: rows('...l..l....../..lwl.lh...../..lcclcll..../.cllwlcccll../clllcclllccl./.lclddffFfss./..ccdfFffts../..lcdffft..../.llcddt....../.cd...d......'),
      body: rows('...llwcll..../.llwllcllhc../llccllwlclcl./.lclcccllclcl/clclcclcllccd/.lcccttgtcld./.cccttgtlccd./..dgtgclccld./.ttttggtttcd./.lccltgtllcd./clclcllclcdd./.dcllddclcd../..ld....lcd..'),
      cloak: rows('...ll../..cllcl/.cllllc/llcllcc/cllccld/llclcld/cclcdcd/.lcccld/clcdcld/.cd.ldd/.....cd'),
    },
    {
      name: 'Siege Arbalist', palette: 'royal', stance: 'wide', weapon: gear.arbalest,
      head: rows('.....hhh.../....hHhhm../..hHmmmmm../.hHmmmmsms./.hggggggsm./.ssmfFfsms./..smffFfssm/..smffttsm./..smttttsm./...ssmmsm..'),
      body: rows('....mmttmm..../..hhHhhgttmh../.mHhhmhtttmhh./hhmssmtttmhhhs/.sshmtttgghms./..mmtttgghhms./..mtttgghmms../..tttgghmmms../..gggttttggt../..ssmhggtttms./.ssmhmhmhmmss./.smmsmssmhms../..sms...ssms..'),
      cloak: rows('...mmmhhh........./..mgggggm/.hgccllgm/.hgccllgm/.hgwlclgm/.hglwclgm/.hglcwwgm/.hgclllgm/.hgccclgm/.hgccclgm/.hgccclgm/.hgccclgm/.hggggggm/..mmmmmms'),
    },
    {
      name: 'Bee-eater Scout', palette: 'sun', stance: 'forward', weapon: gear.boltBow,
      head: rows('ww.....l...../llw...lw...../.cllllwlc..../..lcclllcl.../...lltggggh../...cgtfFFssg./...dtfFfff..g/...dtfFff..../....ttft...../...tddt......'),
      body: rows('..wwwlll...../wlllcllllc.../lllcllwwllcl./clcllgclllccd/.clgtgtclllcd/..tgtllclllcd/..gtclcclccd./..tcllcllcdd./..ggggtggtcd./..tcllggtcld./..tclcclccld./..dcld..clld.'),
    },
  ],
  templar: [
    {
      name: 'Rose Chapel Knight', palette: 'orchid', stance: 'tall', weapon: 'sword', offhand: gear.roseShield,
      head: rows('...cll..lh.../..lwlllgclh../.clAllglllcl./.llgAgAlcll../..gHHhggghmm./..hmhhmmmmsm./..smskkmksms./..smhmmhmsms./...shmmhmsm../....mhmsm....'),
      body: rows('....gglwlgg...../..lhlwlwllmhl.../.hhHHHHhhlmhhh../hHhhmghgllHhmms./mssmhgAAglmhmms./..hmgllgllmms.../..hhmhlclhhms.../..smhlwlclmms.../..gttgtggttgg.../..mcllglclmms.../..mclgAgclhms.../.mclllgcllchms../.sclclgclclcms../.mclld..cllcld..'),
    },
    {
      name: 'Vow of Silence', palette: 'umbra', stance: 'wide', weapon: 'greatsword', offhand: 'kite',
      head: rows('......cc...../....ccllc..../...cllllcc.../..cllcmhhmcc./.cllcmhmmmcc./.lcchhskshmc./.cclsmsssmcc./..cclssgsscd./..cccsmsmcd../...cclgcld.../....cllcd....'),
      body: rows('..hh..nn..hmm../.hHHhllnnlhmmm./hHhhcllnnlchmms/hmmmlclnnlcmmms/.ssmcllnnlcmms./...mcllnnlcms../...mcllgglcms../...mcgAgglcms../...gttggtttgd../...ccllgglcdd../...ccllnnlccd../..cclclnnlclcd./..clcclnnlccld./..clccd..cllcd./..ccd.....clcd.'),
      cloak: rows('...cccll../..clllccd./.cclclccd./.clcclccd./cclcclcdd./lclccllccd/lclclllccd/lclccllccd/clcclcccd./cclclccd../cd.dclcd../...d..dd..'),
    },
    {
      name: 'Order of the Bell', palette: 'harvest', stance: 'low', weapon: 'hammer', offhand: gear.lanternShield,
      head: rows('.....gg...../....gAAg..../...gHhhgg.../..ghhggmg.../..ghgggmmg../.ghggsggmmg./hHhhhhhhgggg/...skskksm../...sgghggm../....sgggms../.....ggms...'),
      body: rows('....mggggm...../..hggHggggggh../.hHggggmggggmh./hgggmghHhggmggm/.ggmmgggggggms./...mgcgAgmgms../...mgclglmgms../...smglllgmms../..gtttgggtttgg./..gmclgtgclmgg./..gmclglgclmmg./.gmgclgAgclmgg./.smgggsssgggms./..ss.....sss...'),
    },
    {
      name: 'Ash Procession', palette: 'garnet', stance: 'forward', weapon: 'sabre', offhand: gear.lanternShield,
      head: rows('......w...../...l.Hl...../..lHlhh..m../..hHhhhmmm../..hHmmmsmms./..hkkAkkkms./..hmmmhmmms./...msmhmsm../...smhmmms../....smsms...'),
      body: rows('...A......A..../..gAh....gAg.../.ghggllllhggg../hHgggcllcghgggs/.ssmclwlccsmms./..hmgmggmghms../..smghggmgmms../..smggggggmms../..gttggAtttgg../..gclgllglcg.../.gcllgllgllcg../.gmclghgglcgm../.gmclg..glcgm../..ssg....gss...'),
    },
  ],
  trailblazer: [
    {
      name: 'Reed Runner', palette: 'tide', stance: 'forward', weapon: gear.thornBow,
      head: rows('.......l...../......lll..../.....llcll.../..thllllcct../.thtgggggtgt./tttlttggttttt/..cldfFFts.../..clffFff..../...cdfFf...../....dtdd.....'),
      body: rows('....lltt...../..llwlcctt.../.llccllwcttl./clllclcclgtcd/cclcclttgtgl./.ccclgtggttd./..cgtgclccld./..gtggclccld./..tttggttttd./..clltgcllcd./.ccllcllclld./.clld..clld../..cd....cd...'),
      cloak: rows('....l../...cll./..llcll/.lwlcld/lcllccd/clcllcd/lclccld/clclcld/.cd.lcd/....dd.'),
    },
    {
      name: 'Old Pine Guide', palette: 'briar', stance: 'wide', weapon: gear.longbow,
      head: rows('.....c......./....clc....../...clllc...../..cllclllc.../.clllllclll../lclddFFftlcl./llcdFffffclc./.lcdffFfccld./.lccfttclcld./..cllcdllcd../...dclcld....'),
      body: rows('..hhllhhll...../.lwlclwllwll.../lhllclllclllc../lcllcllclccttc./.llcllcclctggc./..cccllctgtlcd./..cllcctgtclcd./..llcltgclllcd./..ggtttgtgttt../..clgggtttllcd./.cclllccllccld./.lcclccclcclcd./.dccld...dclld.'),
      cloak: rows('..tttttt........../.tgtggtgt../.tttggttt../..gttgtgt../..tggttgt../..ttggttt../..ttggttt../..tttgtgt../...ttttt...'),
    },
    {
      name: 'Cliff Runner', palette: 'storm', stance: 'low', weapon: gear.cliffBow,
      head: rows('...tttttt..../..ttggtttt.../ttttttttttt../.llwwlllllc../llccclfffss../.llc.tfFFf.../.lct.tfFff.../.lt..tfft..../.g....tt.....'),
      body: rows('....tggc....../..ttgggtcll.../.tgtttgtlllcl./.tgggtttllcld./..gtgttclclcd./..tggtglclcld./..clgtggclcld./..cltggttllcd./..tttggtttttd./..ggtgtgggtgd./..tgtclclgtgd./..tgcllclcldd./...cld...cld..'),
    },
    {
      name: 'Lantern Guide', palette: 'sun', stance: 'tall', weapon: 'bow',
      head: rows('.....gg...../....gAAg..../...clggcl.../..cllwlllc../.cclddccllc./.clcffFFmsl./.clcffFffcl./..llcffftcl./..lcclcclcd./...cclclcd..'),
      body: rows('....clllg..../..lllllggg.../.cllwllggtcl./cllclclgtclcd/.cclclgtllccd/..clcgtclccld/..ccgtclclccd/..gttggttttcd/.gAgclggclltd/.gAgllclllcld/.gggllcclccld/.dcccld.clcld/...cld...cld.'),
      cloak: rows('....lllc./...lwwllc/..lcllclc/.lclllccd/.clcclccd/cllcclccd/lclcclccd/lclcclccd/cllcclcd./cclcdlcd./.cd..cd..'),
    },
  ],
  thornkeeper: [
    {
      name: 'Pollard Sage', palette: 'harvest', stance: 'wide', weapon: gear.treeStaff,
      head: rows('..t..t...t.../.ttgtgt..tt../.tttgttgttt../.tgggttggtt../.tttgggtgtt../..tgtgggtg../..ttkAffAk../..tffFtttft./..tftttgttt./...ttgtgtt../....ttttt...'),
      body: rows('..t..t..t..t.../.ttltgtggtltt../ttltglgtggtltl./.lttltgtggtclt./..ttlclgtggtt../..gtcllgttggt../..ttcllgtgtgt../..tgtlclttgtg../..tgttgggggtt../.tglgtglgttgt../.tltgtlcgtgtlt./tltgtlclgttclt./.tgtlttdclgtgt./.tldttd..ttdtd.'),
      cloak: rows('t.....l../tt...lll./tgt.lllc./.ttllclll/.lltgtlcl/.lctgltcl/cltgtltcl/lclgtltcl/cdtgttdcd/..ttd....'),
    },
    {
      name: 'Keeper of Hives', palette: 'sun', stance: 'tall', weapon: gear.hiveStaff,
      head: rows('....ttt...../...tgggtt.../..tghtgggt../hgggggggggtt/.tcgcgcgcgs./.tgcgcgcgcs./.tcgffgfgcs./.tgcgcgcgcs./..cgcgcgcs../...gggggs...'),
      body: rows('....tggggg..../..hhgggllggl../.ghggcllggclg./hgllggllglclgg/.gcgllglcggclg/..glcgglcgclg./..gglcgglcclg./..tgttggttttg./..llcgttglclc./.cllcggggllcl./.clcgcllggcll./clcglgllggclcd/clccggdllcclcd/.cllld...clcld'),
    },
    {
      name: 'Spore Tender', palette: 'orchid', stance: 'low', weapon: gear.sporeStaff,
      head: rows('.....llll...../...llwwclll.../..llwlcclwcl../.llcllclllclc./wwclllcwlcllcc/lllclllcclcccd/.hhmhmhmhmhh../...msffFfms.../...dcFfffdc.../....ccffc.....'),
      body: rows('....lllhh....../..llwwllclll.../.llcwlclllcllc./wllclllwlcllllc/.lhmhmmhmmmmml./..lcdlcccllcld./..llcllccllcld./..clcclclcclld./..tggtgtggttcd./..cllgActlclld./.cllllcclcllcd./lllcwllllclwlc./.cllddclclclcd./..cd...dd..cd..'),
    },
    {
      name: 'Winter Pruner', palette: 'glacier', stance: 'forward', weapon: gear.pruningStaff,
      head: rows('t...h....t..h/ht.th...th.ht/.httt.Ath.ht./..htgAtttth../...ttgggtth../....tmhhhgt../....mffFffgt./....dfffFtgt./...dctfttct../...clcctt....'),
      body: rows('..H......HH..../..hhll..hHhc.../.lHhwlclhHhlc../llhlclwclhlclc./.llclllcllclcd./..hclggtcclcd../..hlgtgclclcd../..lgtgcclclcd../..tggtttgttgt../..htllggtlltd../.hlclccllhcld../.hllcclclhlcd../..hllddlchlcd../..hd.....hdd...'),
    },
  ],
  wraith: [
    {
      name: 'Mourning Veil', palette: 'dusk', stance: 'tall', hovering: true, weapon: gear.curvedKnife, offhand: 'dagger',
      head: rows('.....ll..../....lwll.../...llclll../..lclccllc./.lclcddcllc/lclddkkdcld/lclkkAAkcld/.lcdkddkdc./.lccdccdcd/..clclcld./...dd.dd..'),
      body: rows('...cccllllc..../..lclwlclllcc../lclllwclcllllc./clcllcclcccclcd/.cldclcclclcldd/..cdlclclccdcl./..dclld..clccd./..dlcld..lclcd./..lcld...dlccl./.lclc..l..dlcd./clcld..cl...dcd/clcd...lcd...cd/.cd....dlcd...d'),
      cloak: rows('....lll../...lwlcc./..lcllcd./.lcllccd./lclclccd./lclccdcd./clcld.cd./lcld..d../cld...l../.d....cd.'),
    },
    {
      name: 'Chainbound Ghost', palette: 'storm', stance: 'wide', hovering: true, weapon: 'dagger', offhand: gear.curvedKnife,
      head: rows('...mhhhmm.../..mh....gm../..mg.AA.hm../..m.hAA..m../..gm.ww.gm../...mAkkAg.../...g.hh.g.../...mAgghm.../....gmmg....'),
      body: rows('..gmm..AA..mgg../.ghhg.cAAl.hhmg./gm..ggllclgm..mg/.mhgghclghhggms./..gm.gAAgmm.gg../...gmggmgggmg.../...dg..g..gcd.../...lcd...lcd..../..clld..ccld..../..lgmg..clc...../..mg.gm..lcc..../..gmgm..dlcld.../...gm....dlcd...'),
    },
    {
      name: 'Candlewisp', palette: 'cinder', stance: 'forward', hovering: true, weapon: gear.curvedKnife, offhand: gear.mirrorKnife,
      head: rows('.......A..../......wA..../....A.lAl.../...AlAAlc.../..Awwwlllc../.llwllcllc../.wlcckkAklc./.llcdAkkAlc./..wlcddcld../..llwllcld../...lc..lcd..'),
      body: rows('..A.....A..A.../.AAl..lAll.AA../.hwAlwwwllllwA./lwllwlllwlwlllc/.lwlcllcllcllc./..lwllwllcllcc./..llclcllwllcd./..ll.wc.cllcld./..ll.lc..llccd./.lwl..l..clld../.lc......clcd../.d......cld....'),
    },
    {
      name: 'Mirror Revenant', palette: 'aurora', stance: 'low', hovering: true, weapon: gear.mirrorKnife, offhand: gear.mirrorKnife,
      head: rows('......H...../..h..Hhm..../..Hh.Hhm.h../..mHhhmmhH../..smhHmhhs../...hHmhms.../...mhAAms.../...smhmms.../....sHms..../.....ms.....'),
      body: rows('..H....hH...hH./.Hhm.hHhhm.Hhm./.hhmsmhHmmshms./.smHm.hhhmhms../..smsshAHmms.../....smhAmms.h../.h..smhms..hm../.ms..smh..hHm../.....smms..ms../..h..hms....s../.mh..ms..hm..../.s..sm...sm....'),
    },
  ],
};
