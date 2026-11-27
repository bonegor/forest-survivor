// Native right-facing cloth, helmets and equipment. The hand pivot lives with
// the item so the drawn bow, sword or lash follows the same grip in every pose.
const rows = s => s.split('/');
const item = (x, y, drawing) => ({ grip: [x, y], rows: rows(drawing) });

const gargoyleBow = item(4, 6,
  '.............h/..........hmmh/.......h.mhss./.h.....mhmms../mhhhhhhhHhhhhHh/.mgtgggmmgggss/..gttg.sg.ms/...tt.....ms/..tg.......ms/..t.........h');
const hornetBow = item(4, 5,
  '............g/.........ggh/.......gg.h/......g..h/.ttgggggAghhhhHh/ttgtttgggg/..tgg....g/..tt......g/.t.........g');
const ratchetBow = item(4, 6,
  '........hhhm/.......hm.sh/.......m...m/...ggggggggggg/.ghhgghhhhmhHhhhHh/hgsggggmgmggggss/mgsgtgmsmms./.mgst.smmg....mm/..tt...hg....hm/..t.......hhhms/..........hss');
const corsairBow = item(3, 5,
  '.............h/...........ggh/.......h.gg../.......hhg....g/.tggggggggghhhhhhH/.tgtgsgggmssss../..tt....g.m...t/..t........m.t/.tt.........hm/..g.........h');
const flamberge = item(3, 15,
  '................H/...............Hh/.............HHhm/............Hhm/............Hhm/..........HHhm/.........Hhmm/.........Hhm/.......HHhm/......Hhmm/......Hhm/....HHhm/...gHhm/...gghmg/..ggt.gg/...tg..g/..tg/.gg');
const wreckBlade = item(3, 14,
  '........h.......H/........hm....HHh/........hHm..HHhm/.........hHhhHmm/..........HHhmms/.........hHhmgms/.........Hhmgs/........Hhmgs/.......Hhmms/......Hhmmm/.....hthhm/..h.hhgmm/..ggmhms/.gggmmgg/..tt.gg/.tt...g/gg');
const headsman = item(3, 15,
  '..........hhHhh/.........hHhmmm/........hHhmms/.......hHhmms/......hHhmms/.....hHhmms/....hHhmms/...hHhmms/...Hhmms/....hmms/...hmms/..hmmg/..hmgg/..sgtg/...gt/...tg/..tg/.tg/g');
const mirrorBlade = item(3, 13,
  '................H/..............HHH/.............HhHm/............HhHh/...........HhHh/..........HhHh/.........HhHh/........HhHh/.......HhHh/......HhHh/...H.HhHh/..ghHhhg/..gAgmg/..gtgg/..tg..g/.tg/g');
const thornSaber = item(3, 13,
  '...............h/.............mhm/...........h.hhs/...........hmmms/..........hmms/........h.hms/........hmms/.......hmms/.....h.hmms/.....hmmms/....hmms/..g.hmg/..ggmgg/..gtg/.tg/g');
const briarShield = item(4, 8,
  '..h.....l/.hl...hlm/.hms.hlms/hhhlshmms/.mlhAhlms/mlclmclmms/mlcglgclms/mccgAgccms/.lcgAgcms./.lcgggcms./..cglgcs/..sllmss/...lsms/....ms');
const portcullis = item(5, 8,
  'hmh..hmh..hm/hmm..hmm..hm/mhhhhhHhhhm/mhmmmhmmmhms/mgmmmmmmmmgs/mhmshhhhsmms/mhmsmssmsmms/mhmsmskmsmms/mhmsmskmsmms/mhmsmskmsmms/mhmsmskmsmms/mgmmhmhmhmgs/mhhHHhhhhmms/.mmmmmmmmss');
const gateSword = item(3, 13,
  '.............hh/............HHm/...........HHhm/..........HHhm/.........HHhm/........HHhm/.......HHhm/......HHhm/.....HHhm/....HHhm/..h.Hhm/..hghm/..gghmg/..gt.gg/..tg/.tg/g');
const moonBuckler = item(5, 5,
  '....hhhHh/..mhhmm/..hmls/.hmls...A/hmls...hAh/hmls....A/hmlms/.hmlms..hm/.mhmlmhhms/..mhhmmms/....mmms');
const moonFalx = item(3, 13,
  '...............H/...............Hh/..............HHm/.............HHhm/..........HHHhhm/.......HHHhhhms/......Hhhmmms/.....Hhhmms/.....Hhms/....Hhms/...Hhms/..gghm/..gAgmg/..gt.gg/.tg/.g');
const stormShield = item(5, 7,
  '.............H/...........Hhm/.........HHhms/......HHHhhms/....HHhmlmms/..HHhhllmms/..hlhlmlms/..mhhAHmms/.mhlhAmls/.mmmhlms/.hmhlms/.mhmms/.mmms/..ms');
const stormBlade = item(3, 14,
  '..............H/.............Hh/............Hhm/..........HHhm/..........hhm/.........Hhm/.......HHhm/.......hhm/......Hhm/....HHhm/....hhm/..gHhm/..ghmg/.gAgmg/..tt.gg/.tt/.g');
const bullLash = item(2, 10,
  '.................g/...........ggg...g/..........gt.tt..g/.........gt...ggg/........gt/.......gt/.....ggt/....gg/..ggg/..gt/.gt/.g');
const lapisLash = item(2, 11,
  '...............A/..............g/.........Agg.g/........gg..A/......Ag/.....g/....Ag/...g/...Ag/..g/.gAg/.gt/.g');
const lionLash = item(2, 10,
  '............gg....h/...........gt.g..g/..........gt...gg/.....gggggt/....gt/....gg...g/.....gggg/....gt/..ggtg/..gt/.gt/.g');
const furnaceLash = item(2, 11,
  '........h........g/.......g.g...gg.g/......g...ggg..A/......g/.......A/......g/.....g/....A/...gg/..gAg/.gt/.tg/.g');
const copperTablet = item(3, 4,
  '..ggggg/.ghhhgg/gttgtgg/gghgtgg/gtggttg/ggtgttg/gtggttg/.tggggs/..ssss');
const ingot = item(4, 3,
  '..gggggg/.gghhggg/hhhhhgggs/gggggttgs/.ttgggtgs/..ttttss');
const sunDisc = item(4, 4,
  '...gAg/..ggAgg/.gAghgAg/gAgghggAg/AAhhHhhAA/gAgghggAg/.gAghgAg/..ggAgg/...gAg');

export const bastionDesigns = {
  boltguard: [
    {
      name: 'Gargoyle Ballistier', palette: 'dusk', stance: 'low', weapon: gargoyleBow,
      head: rows('h...........h./.hm........hm./.hsmm....hms../..hmmhhhmmms../..sHhmmhhms.../.mhhmsmhHhhh../.hmsmssmkAllm/..msskssmmhmm/..mssmm..h.H./...msmhhhmmm./...mssmmsss../....sstsms...'),
      body: rows('h.....hmmm....h/.hm..hHHhhm..hm/.hmmhhhmmhmshms/hHhhmmhhmmsmhms/.mmhhHhmsmhmmss/.mssmmsmhHmss./..mshmhm.hmms./..hmsmhmmmmss./..mmsmAmmssms./..smmgmgmmss../...sggggggs.../..mhmsmhmms.../.hmssm.smmms../.sss....smss..'),
      cloak: rows('h.........../hh....h...../.hmm..hm..h./.hmsh.hlmhm./..hmcsslhms./..hmlcclms../...mccclm.../..mldccm..../..m..clm..../.....s.s....'),
    },
    {
      name: 'Hornet Lancer', palette: 'harvest', stance: 'forward', weapon: hornetBow,
      head: rows('....g......g../.....g....g.../.....gg..gg.../...hggggggg.../..gggggtgggg../.ggsmmmssghg../.gmshAAsgAAFg./.smmAAAsgAAg../..ssmmsggsg.../...gttggttgg../....gtg..g....'),
      body: rows('...mggggmm.../..hhggtggghh./.hmmmgggggmmm/hhhmmttttggmms/.sshggggggsms./..sgtttttttms./..cggggggggms/..sstttttttms/...gggggggms./....sttttss../...sggggggs../....smmmmms../.....smgms.../......tgt....'),
      cloak: rows('Hh....H......../.hHh..hHh....../.hhHh.hmhH....../..hsmhhsmh...../..hhhHhhmm....../...hs.smhh....../....s..mms.....'),
    },
    {
      name: 'Belfoundry Ratcheteer', palette: 'cinder', stance: 'wide', weapon: ratchetBow,
      head: rows('...hhhggg..../..mHmghhgmm../.mhmmsmmgmmh./.hmmhgggggmm./.hgAhgsghAggg/hgAkgmsmAAggg/hmgghhhmgtFFF/.hmmtttstftF./..mtgggggtf../..ssggmggg.../...ssmmms....'),
      body: rows('....ttggmhm..../..tgggttggmhm../.hHhhgtggmmmmh./.hmmgttgmhhmms./mmmsgtggmmggmms/.shgggggtggtms./..sgmggmghhgs../..smgAAgttggs../..smggmgttghs../..tgggtttgggt../..tggtgggtggt../..ggtthhmgttt../..tsttmtmmttt../...ssd..smmss..'),
    },
    {
      name: 'Corsair of the Shoals', palette: 'tide', stance: 'tall', weapon: corsairBow,
      head: rows('..Hh...h......./.HHh.hh......../..Hhh.......g../...h.dcc...gg../..gcllllccgld../gclccgggggclc../.gllggttttggggg/..ddtfkFFFff.../...dFtfFfFf..../..dgttttff...../...gddftt......'),
      body: rows('....hwwllcc..../..gllhHhttllg../.glllmmhttcllg./.llcchHtgttcll./llcclHtgttcccld/.ccllhtgttccld./..cclgggttccld./..lcggAAAggcld./..lclttggtlcld./..lclHhtgcclld./.llcllmttcllld./.lcllcmstcllcd./.clllc..scllcc./..clc....dcllc.'),
      cloak: rows('....lllll/..lllccll/.llcccccd/lccdcccd./.clcccd../.llcccd../.cccdd.../..lcd..../.cd......'),
    },
  ],
  swordbearer: [
    {
      name: 'Velvet Landsknecht', palette: 'garnet', stance: 'wide', weapon: flamberge,
      head: rows('ww....Hh......./.www.hhwh....../..wwhwhh....g../...wlwh..glll../...clllcllcll../.gcllwwllcccl../ggggggggggggg../..tctfFfkFFf.../..dtdfFFfFff.../...tgttttttf.../...t..ftt......'),
      body: rows('....wwhggcl..../..llwlcgggllh../.wlwcwlghmllwl./wlclclwwHhclclw/cwcwlclhhmlwccl/.llcllthmtclcl./..cllttgmgtlc../...gtggggtgcc../..gtttAgAttgc../..tgggtttggtt../.lcwlcltclwcll./.wlclwlttwlcwl./lclwllc..lwlcll/.ccllc...clclc.'),
    },
    {
      name: 'Drowned Champion', palette: 'tide', stance: 'forward', weapon: wreckBlade,
      head: rows('..l......l..h./.ll..l..hl.hm./.lmlhmlhlmhm../..hlmmmlmmms../..mHlmmhhmms../.hmmsmsmmhhms./.mmskAAskAAms./..sssmlmmhhs../...slmsssmlm../..lslmslmsls../..l..ml..ms...'),
      body: rows('..h.....h...h./..hl.hHhms.hms/.hlmhhmhhmhms./.hmlsmmmshlms./hmlmmlhHhmmms./.msmlmmsmhlms./..slmshhhmmls./..lmmmslslmms./..llmggtgggms./..msmgmtAmgms./.llmtgtttgmls./.lldcsmmmslms./.lc.lmms.smls./.l..sl...l.l..'),
      cloak: rows('...hllm.../..cllccl../.clldccml./.ll.cccld./.clcc.lll./.lc.ldcl../.clcldcl../.ll.d.l.../.lc.l.cl../.l....l...'),
    },
    {
      name: 'Red Wolf Headsman', palette: 'cinder', stance: 'low', weapon: headsman,
      head: rows('.l.........l../.lw.......ll../.lcl..ll.lll../.lclllccllcc../..cwwllclwwlc./..ccclcskAmlc./.cccltsmfhgggll/..cclttffttfgh./..ccddtFFfF.f../.ccldcttftt..../..cldclccd...../...c..cd.......'),
      body: rows('..ll...llwll..../..lwl.llwwll.../..lcwlllcccllw../.cllcwlclcccllc/llcclcllccccclc/.lcclgttgclclc./..cggtggttggc../..gtgttggtcgc../..ttggggttttt../..tggggggggtt../..tgtcccccggt../..ttcllclcctt../..dtclcclccdd../...dclldlcd..../....cdd..cd....'),
    },
    {
      name: 'Mirror Cavalier', palette: 'glacier', stance: 'tall', weapon: mirrorBlade, offhand: 'disc',
      head: rows('.....h.H.h.../....hHHHHh.../...hmmHhmhh../....HhHhhm.../...mHHHhhmm../..mHhmmHHhhm./..HhmskAAkHHh/..hhmsmmHhhm./...mhshmhHm../....mHHhmms../.....mmms....'),
      body: rows('.....Hhhms...../..hHHhhmmhHh.../.HhhhHmHhhHhh../.hmhHHmHHhmHHm./mmsHhmsHhmsmhm./.ssmHHhHhhHmss./...mshmhHhhms../...smhHhhmhms../...shmHhmhhms../...ggggAggggs../..hHhmhmhhHhms./..hmHmhmsmhHmm./.mhHhmsm.smhHm./..mssm.....sms.'),
      cloak: rows('...Hhhl../..hhlmll./.hllccll./.hllcclc./lllccllc./lllcclc../lllccld../.llcccd../.lclld.../.llcd..../..lc.....'),
    },
  ],
  sentinel: [
    {
      name: 'Thorn Rampart', palette: 'briar', stance: 'wide', weapon: thornSaber, offhand: briarShield,
      head: rows('h.l.........l.h/.llh..l....hll./..lmlhl.h.hlm../...lmhlmlhlms../...hmlmhhhms.../..hmllmhmmms.../.hHhmmhmmhhmm../..msksmAAkHhs../..sslmsmhmmss../...smlshmmms.../...s.smmms.....'),
      body: rows('h....hlm.....h../.hm.hhmHhm..hm../.hmlhhmshmhmlm../hmmlhmmhhmmmlms./.mmhhlmhlmhhms../.smlmmmsmsmlms../..llmmAmmmhls.../..lmlgmggmhms.../...hmlmmssmms.../...mgttgttgms.../..hlsmtgtmmls.../..hmlmmsmmlms.../.hlmmls..smlms../.lms.....smls.../..s......s.s....'),
    },
    {
      name: 'Gatehouse Blackguard', palette: 'dusk', stance: 'low', weapon: gateSword, offhand: portcullis,
      head: rows('..hm..hm..hm../..hm..hm..hm../.hhhhhHhhhhms./.mhhmhmhhmmms./.msmhmhmhmmms./.hmmmmmsmmmmms/.mhskskskAAhms/.mmsmsmsmsmms./..ssmsmsmmms../..smmmmmmss.../...msssss.....'),
      body: rows('hm..hm..hh..hm../hm..hm..hh..hm../hhhhHhhhhhhHhhms/.mmhmmmmmhmmmmms/.sshmhmmmhmhms./..mhhhhmhhhhhms/..msmmsmsmmsmms/..mhmmmHmmmmhms/..smsmmsmsmsmms/..mggggmgggggms/..mhhhhmhhhhmms/..smmsmssmsmmss/..mmsms..msmmss/..sss.....smss.'),
    },
    {
      name: 'Moonwell Custodian', palette: 'aurora', stance: 'tall', weapon: moonFalx, offhand: moonBuckler,
      head: rows('.....hHHh...../...hhm......../..hms....A..../.hms....hAh.../.hms..hlhlll../.hms.hlcclcl../..hmllccggggl./...hcllckAFFf./....llcdfFft../....lcdtttt.../...lccllcc....'),
      body: rows('.....hHhllc..../...hHhclggll.../..lhhllggglll../.lhhlllllhlclc./.hmlcllclhhmll./..lslclcAhhhmc./...lcllcgHhml../...lclcghhmls../...lgAggghmls../...tggggggccl../..llccllcllcl../..llclcccllcll./.llccllccclcll./.lclld...lcllc./.lld.....lccld.'),
      cloak: rows('....hlwll../..lhwllcll./.lwllclccl./lllcclcccl./.lcclcclld./llclclccld./lclcclclld./.cclclccd../.lclccld.../.lllccld.../..lccld....'),
    },
    {
      name: 'Stormwing Sentinel', palette: 'storm', stance: 'forward', weapon: stormBlade, offhand: stormShield,
      head: rows('H............./HHh....h....../.HHHh.hh....../..HhhHhm...h../..hhHhmmhhHh../...hHhmmmhhHm./...mHhhmmHHhhm/...msskAAmmhHh/....mhmmmshhms/....smhhmssms./.....ssmmss...'),
      body: rows('Hh...HHmh....h./.HHh.hHhmm..hm./.hHHhhhmmhHHms./..HhHhmHmmhHmmm/.hHmhhmHHmhhHhs/.hmsmhhmhhmsms./..msmhmAmmmsms./...smhmghmhms../..hmmhgggmmms../..mhggtggtggs../..smmtgmggmms../.hhmhhmsmhhms../.mmhhms..smhms./.hmms.....smss.'),
    },
  ],
  eanasir: [
    {
      name: 'Bull of Dilmun', palette: 'harvest', stance: 'wide', weapon: bullLash, offhand: ingot,
      head: rows('Hh.........hH/.Hh.......hH./.hHm.....mHh./..hHgAgggHh../...gAAggggg../..gghggghgg../..tggttgFFFf./..tftftFkFFf./.tgtfftFFft../.ttttttgttt../..tgtgttgt.../...tgtgtgt.../....ttttt....'),
      body: rows('....gghggtg...../..ttggAAggttt.../.tFFgghghggfFf../.fFFtgAggggFFf../.tfFgttggtgFft../..ttgggtttggt.../...ggtgtgggtt.../...clgggtgclc.../...cgggAgAccl.../...cggggggggc.../..ccgtgclggclc../..clgllclgtcll../..cllllgclllcl../..gclclclclggl../..ggg.ggg.gggg..'),
    },
    {
      name: 'Lapis King', palette: 'sapphire', stance: 'tall', weapon: lapisLash, offhand: sunDisc,
      head: rows('.....ggA....../....gllggg..../....gclwlcg.../....ggAgggg.../...glccclggg../..ggghgAgggg../..tgggttfFFFf./..tgftFfkFFFf./..tgttfFFFft../..tttgttttgt../...gttgttgtg../...tgggtgggt../....tgtgtgg...'),
      body: rows('...ggghAAggg..../..gAAAghggAAg.../.ggggAglwgAggg../.gllggAggAgllgt./.lclcggAgglclg../..lllclglclllg../..lcllgcccllgt../...lclgggccglg../...gAgAgggAggg../..gggggAgggggg../..gclgclgclgcl../..gclgclgclgcl../..gglgllgllgcg../..ggggggAggggg../...g.gt.gg.gt...'),
      cloak: rows('....gggllll../..gglccllcl../.glllccllcl../glccllclcl.../glclclccll.../glclcclcll.../glllcclclc.../glclcclclc.../.glcllccld.../.gclclccld.../..ggggggg....'),
    },
    {
      name: 'Lion of Ur', palette: 'sun', stance: 'forward', weapon: lionLash, offhand: copperTablet,
      head: rows('...gll...ggll..../..gclgglggttgg.../.lgltgtggghhggg../glgctgggtgkAgggl./.gglgcgtgtggggggg/glgtgtffkFFfHh.H./.lgglttfFFFF.H.../gctggtftttff..../.gclgtgtggtt..../..gltgtgttgg..../.cg.tgtgtgt...../..c..tggtt......'),
      body: rows('...ggggggg...../..gtgtttgggg.../.gtgttggtgtgg../.ggtgtggttgFFf./gtggttgtgttFFf./.tgtggggttFFft./..ggtgtggfFft../...tggtttgFt.../..gttggggggt.../..ggggAggAtt.../..tggggggggg.../..gttgclgltg.../..tgtglcgtgt.../.gttgtgclgggt../.ttgtt..gttgt..'),
    },
    {
      name: 'Furnace Creditor', palette: 'cinder', stance: 'low', weapon: furnaceLash, offhand: copperTablet,
      head: rows('...ms.....ms../...mms...mms../..ghhghhhmgg../..ghmmmmsmgg../.mhhhmhhmgggs./.msksklwwlksms/.msshssmlsmms./..slslsmslms../..sklklklsms../...skslsmms.../....msssmm....'),
      body: rows('...sshhhggss..../.sshHhhggmhhhs../.mHhmshghmsshhm./hhhsmsggssmmhmm/.ssmgssllccmss./..smgclwwwclms./..smgllAAwlcms./..smgcllwlcdms./..sggsclccsggs./..tgttgggggtt../..dccmgHmmccd../..dclggmmgclcd./..cllcdgmgcllc./..clld..dclllc./..sdd....scdd..'),
    },
  ],
};
