// New field models. Each head and garment is a native drawing joined at the
// neck. The rig supplies hands and feet, moving the whole kit through a clip.
const rows=s=>s.split('/');
const item=(grip,s)=>({grip,rows:rows(s)});
function kit(name,palette,stance,head,body,weapon,offhand,cloak) {
  return {name,palette,stance,head:rows(head),body:rows(body),weapon,offhand,cloak:cloak?rows(cloak):null};
}
const greatAxe=item([3,13],'.....HHh.../....Hhhhm../..hHHmmhhh./.hHhmmgmmhm/.hmmmmggmHs/.shhmggsmhs/..shgtg.shs/...sgtg..h./....tg...../....tg...../...tg....../...tg....../...tg....../..tg......./..tg......./..gh.......');
const moonBlade=item([2,11],'............H/..........HHh/.........Hhm/.......HHhm/.....HHhhm/....Hhhmm/...Hhmm/..Hhms/.gHmm/.ghm/.tgg/.gt/.g');
const warMace=item([3,13],'....hhHh.../..H.mmhh.H./..hHmgghHm./.hmmgAAgmmh/.mhgAAAAghm/..mmgAAghm./...hmgghh../....mggm.../....gg...../....tg...../....tg...../...tg....../...tg....../...tg....../...tg....../...g.......');
const ashStaff=item([3,16],'......A..../..h...A..H./..mh.AAAhm./...mhAAhm../....gAAg.../....hggm.../.....gg..../....tg...../....tg...../....tg...../....tg...../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../..ggh......');
const moonStaff=item([3,15],'.....HHh.../...HHhm..../..Hhhm...../.hHmm...A../.hHm...AAH./.mhHm...H../..mhHhhh.../...mggh..../....tg...../....tg...../....tg...../....tg...../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...mg......');
const budStaff=item([3,14],'...W....W../..LWL..WL../..CLWLCWL../...CLWLL.../..LCLALWL../...LAAACL../....gAg..../....tg...../....tg...../....tg...../....tg...../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../...tg....../..gt......./..tg.......');
const sunBow=item([5,8],'..GH..../...gHm../....gHm./.....gh./.....ghm/.....gAm/......gm/.....tgg/.....ttg/.....tgg/.....gAm/....ghm./...gHm../..gHm.../.gHm..../.GH.....');
const thornBow=item([4,8],'.L......./.LC....../..tg.L.../..tgLC.../...gC..../...tgg.../....tgg../....tg.../....tg.../...gtg.../..Lgg..../.LCg...../.tg....../.g.......');
const duelistShield=item([3,6],'..hhhhm../.hmggmhm./.hggggghm/mgCCLCgmm/mgCWWCgmm/mgCWCCgmm/.mgCCgmm./..mggmm../...mhm.../....m....');

export const championDesigns={
  knight:[
    kit('Bell-Tower Knight','bone','tall',
      '.....gg..../....gHHg.../...smhhms../..smHHhhms./.smmhhmmmms/.smmsskkkkm/.smmhghghhm/.smmssmmms./..smmsmms../..smmhhms../...ssmms...',
      '..mhhmmhhm.../.mhHhmmHHhm../mhhhmgsmmmhm./.mmnnigbmmms./..snningmms../..snningmms../..sgggAggms../..smiimgmms../..smiiigcms../..sniiigccs../..sn.ii.ccs../..s..i...cs..',
      'greatsword','tower'),
    kit('Vermilion Drake','cinder','low',
      '..W.......g../..LL...m..gh./..CLL.mmhhhm./.CCLLhHHhhm../.CCshhhmhhhmm/..smmskkAAghh/..smmggggmhh./..sCmmmhhm.../...CCsmms....',
      '.gghhmmhhg.../gAghHHhHgAg../gCChhmmhCCgs./.Cghmgmmggm../..smgCCgmm.../..sgCCCCgm.../..sgCCLCgm.../..sggAAggm.../..sCLCCLms.../..CLCC.Cmm.../.CLCs...Cms../.CCs....sC...',
      'sabre',duelistShield,'...LCC../..CLCC../.CLCD.../CLCCD.../CCCDD.../CCDD..../DDD.....'),
    kit('Mantis Duelist','briar','forward',
      '......HH.../...H.hm..../...hhmhH.../..sHhHHhh../..smLLLhhs./..smAAkAmmm/.CLmhmshh../.CCmmmhm.../..Csmms....',
      '..mhw...mh../.mhWLh.hhhm./hhLCLhmmCLhm/.CCCsmmmCCm./.CCshgsgAm../..ssmCCgm.../..sCLggCCs../..sCmmmCCs../..smC.CCms../...Cs..Cms..',
      moonBlade,'dagger'),
    kit('Horned Castellan','storm','wide',
      'Hh.......hH./mHh.....hHm./.mHh.mmhHm../..mmhHHhhm../..shHhhhmhs./.ssmmssmhhh./.ssskAAkkmm./..smmsmhhm../..smmmsshm../...smmmms...',
      '.hHHmmmHHh.../mHHhhmmmhhHm./mhmmsggsmmhm./.mssmmmhmms../..smmbbmbms../..sgggAggms../..smmmbmmms../..smgmmgmms../..smcmsCCms../..smcs.sCms../..s......ms..',
      warMace,'kite'),
  ],
  mage:[
    kit('Starbell Magister','sapphire','tall',
      '......H...../.....HWH..../.....LWL..../....LLnL..../...LnnHnL.../..LnnnLnnL../.mhhHHHHhhm./...dfFFfF.../...dfkFAk.../...dffFFF.../....hwHh..../....mhH.....',
      '.wiii....hh../wWLLLnHHhhhm./LCnnLhHhlnCh./CCnAnnHgnnCh./CCnnnnhgnnCh./nCnnHnHgnCCh./nCnHHnHgnCCh./CCnnnnhgCCCh./CnnAnnHgiWCh./nnnnggHiiWCh./nnggiiH.iWCh./gHiWWLH..WCh./HWWLnn...Wh../WL........h..',
      moonStaff,'book','..LLnnnn../.LnnnnHnn./LnnnHnnnn./nHnnnnnn../nnnnnnn.../nnHnnn..../nnnnn...../n.nn......'),
    kit('Geode Oracle','aurora','wide',
      '..H.....H....','', 'staff'),
    kit('Cardinal of Embers','royal','tall',
      '.....A...../....gAg..../...gLALg.../..gLCnCLg../..gCgAgCg../.gCggAggCg./.gCCLALCCg./.ggggggggg./...kfFfFf../...kffkkf../...kwFFF.../....hwH....',
      '..gg...gg.../.gHggiggHg../gCCgwwgCCgg./CnnCggCnnCg./CnnCggCnnCg./CnnCAACnnCg./CnnCggCnnCg./CnnCggCnnCg./nCCggggCCng./nCCgiiigCng./CCgii.iigCg./CCgi...igCg./ggi.....igg.',
      ashStaff,'orb'),
    kit('Comet Smuggler','umbra','forward',
      '........LmHh/......LLhm../....LLLhm.../..LLCCmm..../.LCCnnnh..../Lnnnnnnghh../nCCDnnffFf../nDDnnffkAf../.DDnnhFFf.../..Dnnhh.....',
      '.CCLLg...mm../CCLnnAg.hhHm./nLnnngAghmCh./nnnHnnAgnnCh./nnnnnAgnnCCh./nnnnAgnnnCLh./nnnAgnnCnLCh./nnAgnnCCnCh./nAgnnnCnnCh./AgnnCCnn.Ch./gnnCLnn..Ch./nnCLn....Ch./nCL......h..',
      moonStaff,'orb','...CLLn../..LCCnn../.LCCnn.../LCCnn..../CCnn...../nnn......'),
  ],
  archer:[
    kit('Heron Faloner','bone','tall',
      '....hh...../.HhmHHh..../.mHhHHhh.../..mHHhhhh../.hHHhhmhHHh/...hhFffgg./...kfFFkF../....fFFF.../...sshh....',
      '..WWmhhh.../.WLhmhhhm../LWLCttmhm../LCCtgiihs../CCtsiiiiA../.Csiiiis.../..sttAgtt../..sCiiLcs../.CCnn.Lcs../.CLnn..cs../..nn...cs..',
      sunBow,null,'..HhHh.../.HhHm.../hHmhm.../mhmh..../smh.....'),
    kit('Wolfwood Tracker','harvest','low',
      '..L.....L../..LW...WL../.LCLh.hLCh./.ChhmhhmCh./.hmhAAhhhm./..mhHffFh../..smfFkF.../.sCshFFF.../.CCssm.....',
      '..hHhhhHh../.hHhmhmmHh./hmmhHHhhmhs/mhmsmttmms./.sCCtggCCm./.sCtggCCCs./.stggCCgCs./.sAgggAggs./.sCCCnCCls./.CCnn..Ccs./.nC.....ns.',
      thornBow,'dagger'),
    kit('Dune Hawkeye','sun','forward',
      '..gggLLL.../.gLWWLLCL../gLggggLCC../.LCgAAggCh./.CCggggshh./.CsfkkfFFF./..sLLLLL.../...CCLC....',
      '.LLigggLL.../LCCiiigCLg../CCnnigLCCg../nCnnnigiCg../nCnnigCCgg../nCigCCgCt.../nigCCggtt.../igCCggAgt.../.CCCCnCcs.../.CCn..Cs....',
      sunBow,null,'..LLh.../.LCCL.../LCCC..../CCC.....'),
    kit('Thornwing Bowyer','briar','wide',
      'Lh......Lh./CLL....WL../.CLh..WLC../..CLLWLC.../...CLhLh.../..CCgFAf.../..CsfFkk.../.CCsFFF..../.nCs.......',
      '..hhLLLh..../.hLCLLCLh.../LCCmCgglm.../.CmsClCCm.../..sCtCCg.... /..stCCgC..../.stgggCs..../.sggCCLC..../.sCiL.CCs.../.sCL...Cs...',
      thornBow,'dagger'),
  ],
};

// A glacier mantle with three independent front facets around the face.
Object.assign(championDesigns.mage[1], {
  head:rows('..H...W...H../..hH..Wh.Hh../..mhHLWhhHh../...mLWLhhhm../...CLLCCmhh../..CCLhffFh.../..CChkAAf..../..ChhFFF...../...mhHh......'),
  body:rows('.hhhWWWWhh.../hHmhhhWWLhh../hmmCLLCCLLhm./.CLLCCLWLhms./.CCnCLWLCLh../.CnCLWLCCLh../.nnLWLCCCLh../.nLWLCCnCLh../.LWLCCnCLLh../LWLCCnnCLWh../WLCCnn.LWh.../LCCn...Lh....'),
  weapon:budStaff,offhand:'orb',cloak:rows('..hWWW../.hWLLCh./WLLCCCh./LCCCCh../CCCCh.../nCCh....'),
});

championDesigns.rogue=[
  kit('Ivory Eidolon','bone','forward',
    '..mHHHhm.../.mHHhmhhm../mhhmsmhhhhs/mhkkHmkkhhs/.msshmmmhh./..hHhhHhm../..shmhhs.../...smm.....',
    '..hmmhHhm.../.hhhmhmhhs../hmsmHHhhsms./smHhsHmhsms./.smHhHmhmms./..mshHmmhm../..shHHhhms../..smmHhms.../.CsmshmCs.../CCs..mCCs.../.C...DC...../.....D......',
    moonBlade,'dagger','...shmh...../..smmhmC..../.ssCCCmCn.../sCCnnnCCn.../CCCnnnC...../CCn..Cn...../nn...n......'),
  kit('Ember Noh','cinder','low',
    '.A......A../.gA....Ag../..ggHHgg.../.ghhhHhhg../.hHkkHkkHh./..hAgHAgH../..mgmHmh.../...mhAh..../....ms.....',
    '.CCCCggCCm../LCCnCggnCCh./CCnnCggCCCs./CnnngCCgnns./.nnCgggCCs../.nCggACnns../.CggCCnnCs../.gCCnCCnC.../CCn.CCn.C.../Cn..LC..n.../n...L.......',
    'sabre',null,'LLC...CLC../.LCC.LCC.../..LCLCnn.../.LCCnnC..../CCCnnCC..../nnn.CC...../n...C......'),
  kit('Abyssal Lantern','tide','tall',
    '......H...../....CLWh..../...LCCCWh.../..LCCDDCLh../.LCCnknCCh../LCCkkAAkCh../CCDkAAkkCh../.CCDkkDCh.../..CCDDCh..../...CCCm.....',
    '.mLnnACCh.../mLCCgAgCCh../LCnnnAnCCh../CnnnAnnCWs../nCnnAnCWLs../nCnAnnLCls../.CngnLCnCs../.CnCLnnCs.../.CCLnnnCs.../.CLn..ns..../CLn...n...../Ln..........',
    moonBlade,'orb','...Whh...../..WLLCh..../.LLCCCC.../LCCCnn..../CCCnn...../C.nn......'),
  kit('Moth of Glass','orchid','wide',
    '.Wh.....hW../.LWh...hWL../..LWhmhhL.../...mhhhm..../..mhHAhHm.../.mhkAAkAhm../..mhmhhhm.../...mmhmm..../....mm......',
    '.mhLLgALhhm./hLCLCgAgCLLh/LCCCmghgmCCl/CCnnsmmmnnCs/.CCnsmhmnCs../.nCCsmhsCs../..nCsmhCs.../..CnsmmCs.../.Cn..m.CC.../Cn.....CC.../n.......C...',
    'dagger','dagger','Wh.......LW./LWh..h..LWC./CLLh.h.LWLC./.CLLhLmLCC../..CnnLLCC.../.CLnnnCLCC../LCn.nn..CC../n.........C.'),
];
championDesigns.necromancer=[
  kit('Bell of Ossuary','bone','tall',
    '..h....H..../..hm..hH..../..mmhhHhm.../.mhhhHhhm.../mHhmhHHhhm../hHkkhHkkHm../.hhmhHmmh.../..hhsshm..../...mhhm.....',
    '.Hhhh.mhHHh../HhmhhHHhmhHm./hmshmmhmsmhms/.mhHHhHHhmms./.smshHhshms../.smshHhshms../.smmHhHhmms../.nCCgAgCCns../.nnnCgiCCns../.nniCgiCCns../nniC..iCCnn../niC....iCCn..',
    warMace,'book'),
  kit('Plague Falcon','venom','forward',
    '.....wLL..../...wLLCCh.../..LLCCsmh.../.LCCsmhhhm../CCCmAAgHHHhH/CCsmAggHHhm./.CCsmghhm.../..CCsmm...../..nCC.......',
    '.ChhhLCmhm../CLLLCCmhmmh./LLCCnCnhAAh./CCnntgghmms./CnnnggCnnns./nCggggCCnn../nggAAgCCnn../nnCCCCCCn.../nCCnnCLCs.../CCn.nCLCC.../n...nnnCCC..',
    'crook','orb','..LLC..../.LCCC..../LCCnn..../CCnn...../C.n......'),
  kit('Antlered Lich','briar','wide',
    'Hh......h...H./.Hm..h..hm.Hh./.mmh.hm.hhhh../..mhhmhhHh..../...hHHHHhm..../..hHhHHhhhm.../...hkAAkkhm.../...hhmmhhh..../....hhmmh...../.....hhm......',
    '.mhHhmhhHh.../mhhmmCCmmhh../hmmLCCAACCmh./.CCnnmHmmCs../.CCmhhhmCCs../.nCmsshmCCs../..CChhhmCs.../..ngggAggs.../.nCCLLnnCCs../.CCLnnnnCLs../.CLnn.n..CL../.Ln......LC..',
    budStaff,'book'),
  kit('Pharaoh of Ash','garnet','tall',
    '...ggAgg..../..gAgAgAg.../.ggggggggg../.gCggCggCgh./gCChhHHhCCg./gCCkAkhACCg./gCsmhHhhCCg./gCsmhhhCCCg./gCCsmmgCChg./gCs..ggCCg..',
    '..gggHHggg.../.gAgggHggAg../ggggAAAgAggg./.nCCgAgCCnn../.nnCgAgCnnn../.nnngggnnnn../.CCngggnCCC../.nngAAgAnnn../.nnCgggCCnn../.nCggg.gCCn../.CCgi...gCC../.gii.....gg..',
    'crook','disc'),
];
championDesigns.paladin=[
  kit('Lionheart Marshal','sun','wide',
    '...LLggg...../..LWAggggh.../.LLgghHHhgh../LLCghHAghhhh/LCCgHHgggHh./.LCghmmmhm../..CCmhHhh.../...Cmmhm..../....ssm.....',
    '.ghHhggghHhg../gAAghHHHhgAAg./ggghHhghhgggg./.mmhgAAghhmm../.smmggAggmms../..smhhghhms.../..sgggAgggs.../..sgiiiiiCs.../..sgiiCiiCs.../..sgiC.CiCs.../..ggg...ggg...',
    warMace,'kite'),
  kit('Abbey Gate','storm','tall',
    '.hm..h..mh../.hhmmhmmhh../.mHhhhhhhm../.mhhmhhmhm../.msmsmmsmm../.mskAkkAms../.msmmhhmms../..mmshhsmm../..mmsshmms../...mmmmms...',
    '.HhhhmmmhhhH./hhhhhhmhhhhhh/mhmmssmssmmhm/.mmmhggghmmms/..msmghtgmms./..msmmhgtgms./..smmsmhgtms./..ggggAgggms./..mggmmmggms./..msmCCsmmms./..msmC..smms./..ms....smm..',
    'hammer','tower'),
  kit('Ivory Wing','glacier','forward',
    'Hh.........H/mHh.....hhHh/.mHh..hhHHh./..mmhHHhhh../...mhHhhmhm./..mhhhHhhhh./..hhfFFkHh../...mfFFFh.../....shh.....',
    'Hhhhm...mhh../.hHHhhHHhhm../..hhhHHHHhhs./..mhHHHhmhms./..mHhghghmms./..smghAghms../..sgggAggms../..siihhhiCs../..siiiCiiCs../..siiC.CiCs../..si.....is..',
    moonBlade,duelistShield,'Hhh........../.hHHhh......./..hhHHh....../...hhHHhh..../....hhhHHh.../.....hhhHh.../......mh.....'),
  kit('Crimson Reliquary','garnet','low',
    '..C.......C../..LC..A..CL../...LLgAgLL.../...gLLgLLg.../..ghHHHHhhg../..mhhgAggmm../..smmkkkms.../..smmgggms.../...smhhms....',
    '.CCCgAAggCCC../CCCLgHHHgLCCC./CCnCggAggCnCC./.CCngCCCgCCs../.sCngHHHgnCs../..sCgghggCs.../..sngAAggns.../..sgggAgggs.../..sgCiiigCs.../..sgCi.CiCs.../..CCi...iCC...',
    'greatsword','book'),
];
championDesigns.druid=[
  kit('Inkcap Wanderer','orchid','low',
    '.....CLLh...../...CLLWWLLh.../..CLWHLCCWLh../.LWHCLCCLCCLh./LCCLLCCWCCCLLh/CCCCgggggmmmmm/...sffFFFf..../...sfkFkkf..../...mhFhhHh..../....mhHhh.....',
    '..LLWLLCCm.../.LLLCCLCCLh../LCCgCCWCCLCh./.CnnCgCCCnC../.nnnCAggCnt../.nnnngAgnnt../.nCCCggnCCt../.CCnCCCCCts../.CLnnCLCCCs../.Ln..nCC..C..',
    budStaff,'orb'),
  kit('White Hart','bone','tall',
    'h.....h..H....H/hH..h.Hh.hH..Hh/.mh.hm.hh.hmhh./..mmhmhhHHhh.../...hhHHHHhh..../..hmHHhmhHhm.../...hkkHkkhm..../...hhmhHhhH..../....mmHHmHh..../.....hhh..H....',
    '..hHhmhhHh.../.hHHhmhhhHHh./hhmmhmhhmmhh./.mhCCCCCCmm../..CCCLLCCCs../..CnnCCnCCs../..ngggAgggs../..nCCgiCCCs../.nCCgi..CCs../.CCgi...CLc../.Cgi.....CC..',
    'crook','disc'),
  kit('Verdant Chrysalis','briar','forward',
    '.L....h..L.../.WL..hHhWL.../..LWhHHhLC.../...CLLhhCCh../..CCgAAghhh../..CCsfFAkF.../...CsFFF...../...nCsh......',
    '..WhLLCLLWh../.WLCLLCLLCLW./LCCLAAACCCCLh/.CCggAggCCCs./.CCgCLCgCCCs./..gCLLLCgCs../..gLCnLCgCs../..gCnn.CgCs../..CLn..CCCs../.CLn....CCC..',
    budStaff,null,'W.......WL./LWh...hWL../.LLW.LWL.../..CLLCC.../..CnLC.... /.Cn.CC...'),
  kit('Rime Bear','aurora','wide',
    '..hh.....hh../.hHHh...hHHh./.hHHhhHhhHHh./..mHmmmmHHhm./..hhAkhhAhhh./.hHhhmmmhhmm./.hhhmfFFhmm../..hhffkFhm.../...hmmhhh....',
    '.hhHhhhhhHhh../hHHhhhmmhhhHm./hhmmmhhhmmhhs./.mhmsCCmshhm../..mCttgggCCs../..CttgAAgCCs../.CtgLCCLCggs../.sgLLCCnCgs.../.CLLnnCCLCs.../.CLn...CLC..../.Cn.....CC....',
    'staff',duelistShield),
];
championDesigns.berserker=[
  kit('Tusk Reaver','harvest','wide',
    '..C...H...... /.hCh..Hh.mh../hCChh.HhhHm../.hHHhhHHhm.../.hhmAAhhmh.../..hmhmmHhm.../..hFffFkFh.../..hFfFfff..../...mFFh......',
    '.mmmFFfFmhhm../mhHhFFFfhhHhm./hmmFtFFFmmmms./..ffttfffCms../..fffttffCms../..sfffttCCs.../..sgggAgggs.../..sCCLnnCCs.../..sCLn.nCCs.../..CLn...CC....',
    greatAxe,'axe'),
  kit('Frost Valkyrie','glacier','forward',
    'Hh........hH/HHh......hHh/.hHh....hHH./..hhHhhhHh../...mhHHhmm../..mhhmmhHHh./..mmfFFkfF../...fFFFFh.../..hhmFFhm.../..hm....mh..',
    '.hhHhmmHh.../hHHhmhhHHhm./mhmmmhhmhmhs/.mFFgttmFms./..fftgAffms./..sfftgFFs../.sgggggggs../.sCCiLLCCs../.sCLiC.CCs../.CLi....Cs..',
    'axe',greatAxe,'..hhH../.hHHh../hHHhm../hhhh.../mh.....'),
  kit('Ember Jaguar','cinder','low',
    '.CC.....CC.../CLLh...hLLC../.LLhgAAghLC../..WggCggCgh../..ggAAkAAgh../..CgHgghgh.../.CCgffFFhh.../.LCffffFf..../.C...hhh.....',
    '..gCFFFFFFg.../.gCCffFFfgCg../ggAgfffggCCgg./.CCfffggCCCs../..ffggCCCffs../..sggCCCfffs../..gAgggggggs../..gCCnCngCCs../.gCCn.nCLLCs../.gCn...nCCs...',
    greatAxe,'dagger'),
  kit('Night-Forge Breaker','umbra','tall',
    '..cLLLC...../.clLLLCC..../.cLCCmFFf.../..CCCfFFfF../...CCfkkfF../....fFFff.../...smffff.../..shhmFF....',
    '.HHhhmm..hh.../hHHHmhFFhHHm../mhhhmmFFmhhh../.mmmffttfFms../..sffggttfFs../..sffAggttfs../..sfffAggtgs../..sgggggAggs../..sCCnnnCCCs../..sCnn..CLCs../..Cn.....CCs..',
    warMace,'axe'),
];
