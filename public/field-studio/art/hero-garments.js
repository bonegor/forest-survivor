// The garment box sits on the moving body. [centre x, top y] are offsets
// from the near eye, followed by the native breadth and drop of the garment.
export const fittings = {
  knight:[-3,4,15,13], archer:[-4,4,14,16], mage:[-5,4,19,20], rogue:[-10,3,21,18],
  necromancer:[-4,4,18,20], paladin:[-3,3,15,17], druid:[-5,3,17,17], berserker:[-3,4,13,15],
  witchhunter:[-3,3,16,17], eanasir:[-2,16,18,19], footman:[-5,4,17,16], marksman:[-4,3,14,15],
  templar:[-3,3,15,18], trailblazer:[-3,3,14,15], thornkeeper:[-3,4,18,20], wraith:[-8,3,21,18],
  gravebinder:[-5,3,18,21], arcanist:[-5,3,19,19], praetorian:[-4,4,16,14], seraph:[-3,3,16,17],
  boltguard:[-4,3,14,15], swordbearer:[-4,4,17,15], sentinel:[-3,4,15,15],
};

// These are painted material regions, with the source folds and the crossing
// weapon carried through. n is deep cloth, c dyed cloth, l its light edge,
// i ivory lining, g gilt, b blackened plate, m silver, a enamel and t leather.
const robes = [
  // The night mantle wraps over the back shoulder; its ivory lining opens
  // on the front. Stars belong to the fabric and follow it around the arm.
  ['..nniiii....','nnginnngi...','ninnnnngi...','nnnnninnni..','nngnnnnngi..','nnnnnnnngi..',
   'nnnninngii..','nninnnngii..','nnnnnngiii..','gnnnngiiic..','iggggiiccc..','iiiinnccci..','iin.nncici..','i...nnci.i..'],
  // Icy side cape, long vertical glass facets, short white fur collar.
  ['..iiiii.....','iiimiiiill..','imiccccllii.','iccccllllll.','ccccllnclli.','cccllnnclli.',
   'ccllnncllii.','cllnnccilli.','llnnccillci.','lnnccillnci.','nnccillncci.','nccillnncli.','ccilnnn.cl..','cilnn...l...'],
  // Wine-coloured open chasuble with two broad gilded orphreys.
  ['..gg..g.....','gggi..iggg..','gcgiiigccg..','ccggiggccgg.','cccgigcccgc.','nccgigccngc.',
   'nccgigccngc.','nccgigccngc.','nccg.gccngc.','ncgg.gccngg.','ncgi.igcngg.','ncgi.igcngg.','gggi.igcggg.','gii...iiigg.'],
  // Comet mantle closes on one shoulder with a diagonal trail. The lower
  // drape has a jagged ink side and a single long pale leading edge.
  ['..cccga.....','nnnnncgai...','nnnnnnnali..','nnnnnnaacc..','nnnnnaggcc..','nnnnalnncc..',
   'nnnallnncc..','nnaallnncc..','nalclnnnci..','alclnnnnci..','lclnnncnci..','clnnnclnci..','ln.ncln.ci..','n..cln..i...'],
];
const coats = [
  // Long asymmetric hunting mantle over a pale doublet.
  ['..iiinn....','niiiiing...','nnnnncigi..','nnnnncigi..','nnnnnciii..','ncnnnciii..',
   'nccnciiii..','nccnctttt..','nccnccigi..','nccnc.i.i..','ncin..i.i..','ciln.......'],
  // Fur collar and crossing hide straps over two sculpted green/teal hides.
  ['..iiiii....','iiiiiiimi..','ilililcci..','lcccttcci..','cccttclli..','ccttcllcc..',
   'cttcllccc..','tccgcccct..','ccgccccct..','ccllc.ccc..','cllcc..cl..','ll.c...l...'],
  // Quartered jack, bright hunting tab and doubled plated belt.
  ['..cccngg...','gcclcngg...','ccllcgnii..','cllcggnii..','cccgccnii..','ccgccciii..',
   'gggccciii..','mmmgtgggm..','sgggtttgg..','lc.ciggcc..','c..cig.cc..','...gi..g...'],
  // Dark brigandine under the pale shoulder cape, long split back.
  ['..iiiimmm..','iiimmmbbm..','immbbgbbb..','mmbgbbbgb..','mbbbbgbbb..','nbbgbbbgb..',
   'nnmbbgbbb..','nntttagtt..','nnttttttt..','nnn.c.nn...','nn..c..n...','n...l...n..'],
];
const plates = [
  // Half-surcoat over a dark mail shirt, decorated at its lower point.
  ['.hhimmm....','iiimmbbb...','iiincmmi...','ningcmmm...','nnngcmmmb..','nnngcbbb...','nnngggmmm..','nngiiibbb..','ngiiiiccc..','gi.ci.cc...','i..ci..c...'],
  // Stepped, overlapping lamellae, pale collar and coloured sash.
  ['.iiimmm....','iiimmbbbb..','mmbbbbmmm..','bbmmmmmbb..','mmmmmbbcc..','mbbmmcccl..','bbmccclmm..','mccclmmbb..','ccclmmmmm..','ccl.mm.m...','cl..m..m...'],
  // Gilded cuirass with a contrasting diagonal baldric and broad side cape.
  ['.ccggmg....','ccggmmgg...','ccgggtigg..','ccggtiggg..','ccgtigggg..','cctiggggb..','ctiggggbb..',
   'cimmmgtgg..','ci.ggtcgg..','c..gg..gg..','...ig..i...'],
  // One polished breast plate against dark brigandine. Rivets stay in rows.
  ['.hhmmm.....','mmmbbbmmm..','mbbgbgbmm..','bbgbgbgmm..','bbbgbgbmm..','bbgbgbgmb..','bmmbbbbbm..',
   'btttgattt..','nctgggtcn..','ncct.tccn..','nc...t.cn..'],
];
const shrouds = [
  ['nnnniii.....','nnniiignn...','nnninnnnn...','nnnnningn...','nincnnnii...','nnncnnnni...',
   'nnncnngni...','nnccngnii...','nccnggiii...','ccggiincc...','ciiinnnc.c..','i..n.nn..c..'],
  ['..iiiiim....','niiimiii....','nimmmimmm...','nmiimnnmm...','nniiinimm...','niimmnmmi...',
   'nnnimmimi...','nniinmmni...','nninmnmni...','ninnmnnni...','nnn..nn.i...','n....n..i...'],
  ['nn..lcc.....','nngcllcc....','nnncllcc....','nncllnaci...','ncllnacii...','cllnacci....',
   'llnnacci....','lnnaccii....','nnacciai....','nacni.ai....','ac.n..i.....','c...........'],
  ['.lllnnn.....','cllllcnn....','nncccllin...','nnncllccnn..','nncllncccn..','ncllnnnccn..',
   'cllnnanncn..','llnnannncn..','lnnacnnnci..','nnacn.nci...','nac...n.i...','ac....n.....'],
];
export const garments={robe:robes,plate:plates,leather:coats,shade:shrouds,stone:robes};

// Four different closures: swept sallet, open cheek plates, slitted close
// helm, and an open steel brow. Hoods and veils keep a forward-facing gap
// for the source eye; the little area visible varies with the pose.
export const helmets={
  plate:[
    [-8,-5,['...mhhHhh...','..mhHHHhhm..','.mhmmmmhhhm.','smmsmmmmmhh.','ssmsshhs....','smmssm...mh.','.smmms..hm..','..smm..hm...']],
    [-7,-5,['...HhhHh...','..hmhhhHhm.','.hmssmmhhh.','.mms...mh..','mmss.......','mms....hm..','sm....mh...','.m...mh....']],
    [-7,-5,['...shHHhm..','..shhhHHhm.','.mmhmmmmhh.','ssmssmhhhhm','.sssh.....m','.smmsmhmmhm','..ssmmmsmm.','...smmshh..']],
    [-7,-5,['...smhhm...','..sshHHhm..','.ssmhhmmmm.','ssmmgAAghhm','.smm.......','..sm.....m.','..s.....m..']],
  ],
  leather:[
    [-7,-5,['...CLLWWL.','..CLLCCLLh','.CCLCDLLhh','CCCDCLh...','CCDDCh....','CDDDh.....','CCDCh.....','.CCh......','.Ch.......']],
    [-7,-5,['...hhWWh..','..hmhhHhh.','.mhmhLhmh.','mhLmmhghh.','Cmmh......','Ch........','Ch........']],
    [-7,-5,['...CLLC...','..CLLCCL..','.LCCgaCL..','hhgggggghh','.CDh......','..Dh......']],
    [-6,-4,['..mhhhm..','.mmmhhhm.','smCDCCLh.','.DC......','.CC...Chh','..CCLChhm','..DCCLhm.','...DCCm..']],
  ],
  robe:[
    [-7,-6,['...CCLh...','..CLLhhL..','.CCLLhCL..','CCCDhCCCh.','CDDhC.....','DDh.......','DCh.......','.Ch.......']],
    [-7,-5,['..hhLLLh..','.hLLCCCLh.','LLCCDCLLh.','CCCDCh....','.CCCh.....','.CCh......','.Ch.......']],
    [-7,-5,['...gGGGh..','..gACCLGg.','.gLCCLLgg.','gLLgAAgggG','CCh.......','Ch........']],
    [-8,-5,['...CLLLh..','..CLCCLLh.','.CLCCDDCLh','CCCDDDLh..','CCDDDDh...','CDDCCCh...','.DDCCh....','..CCm.....']],
  ],
  shade:[
    [-7,-5,['..Cmmhhm..','.CCmhhmhh.','CCCDmmshh.','CDDmmh....','CDDCm.....','DDCm......','DCm.......']],
    [-6,-4,['..mhHHhm..','.mhhhHHhh.','mhhHhmhHm.','mhhs..shm.','mHm....hm.','.mmh..hm..','..mhmhh...']],
    [-7,-4,['...CLCCh..','..CLLCCLh.','.mmsmmgAh.','.CC.......','..CL...mh.','..CCLChhm.','...CCLhm..']],
    [-7,-5,['..nCLLCh..','.CCLhCLLh.','CCLhCCCmhh','mhhCCm....','hCCCh.....','.CLh..mh..','..Chhmm...']],
  ],
};

// The four crowns on the Sorcerer have complete silhouettes: a ceremonial
// mitre, broken ice crown, solar nimbus, and swept crescent cowl.
export const sorcererCrowns=[
  [-8,-11,['.......g....','......gAg...','.....gLWLg..','....gCCWCCg.','...gCCCWCCCg','..gCCCaACCCg','..CCCLLCCCL.','.CCCLLCCCL..','.CCLLLLLLL..','..hhHhhHh...','...smmm.....']],
  [-9,-10,['H....H....H.','hH...HW..HW.','mhH..hW..hW.','.mhH.hWLhW..','.CmhHCWhWLH.','..CmhLWLLWh.','...CCLWhhL..','....smAAhm..','.....smhm...']],
  [-9,-9,['....g.A..g..','g...G.A..G..','.g.GGGAGGg..','..GAaaaaAG..','gGa......aG.','.Ga..LL...aG','..aCLLLL..Ag','..gLLCCCLga.','...hGAAGhh..']],
  [-10,-9,['.......LhH..','....LCLLh...','..LLLCCm....','.LCCCDh.....','LCCDCh...A..','CCDDLh..h...','DCDDLm.hh...','.CDCCLhm....','..CCCWmm....','...sCLL.....']],
];
