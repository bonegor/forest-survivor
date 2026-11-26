// Native pixels, right-facing. Each origin is relative to the near eye.
// Metals use s/m/h/H, dyed material D/C/L/W and enamel a/A. Dots show the
// underlying pose. Broad facets survive the actual one-world-pixel blit.
export const headPieces = {
  wing: [-8,-8,['H.......','hH......','mhH.....','.mhH....','.smhH...','..smha..','...ssAA.','....ssm.']],
  pinion: [-8,-8,['.LL.....','CLW.....','CCL.....','.CLW....','..CL....','...mA...','...smha.']],
  quill: [-7,-8,['..WLL..','.LLC...','LCC....','CC.....','.C.m...','..mA...','...hAA.']],
  raven: [-8,-6,['.shm....','mChhm...','CCsAhH..','.CDssh..','..DCC...','...smm..']],
  antler: [-8,-8,['h...m....','h.m.h..h.','mh..hh.h.','.hm..mh..','..hm..m..','...hmh...','....aA...']],
  fork: [-8,-8,['g....g..','g.gg.gG.','ggg..g..','.gg.gG..','..ggg...','...gA...','...Cmh..']],
  split: [-6,-8,['DD..CC..','CL..LC..','CWLCL...','.CLCC...','..CDm...','...mmh..']],
  laurel: [-7,-6,['...GA...','.GAa..G.','Gaa..GA.','.aa.Gg..','..ggg...','...gahh.']],
  leaf: [-7,-7,['.W..L..','.LW.LW.','.CCLWL.','..CCC..','.LCg...','..ggA..']],
  crescent: [-8,-6,['..HH...','.hm....','hm.....','hmm....','.mh..h.','..mhhm.','...aaA.']],
  mitre: [-6,-8,['...H....','..hWh...','.hCaLh..','hCCACCh.','.CLCCL..','..mhhm..','..sAAh..']],
  shards: [-7,-7,['H..W...','hH.LW..','mhHCL..','.mhCWh.','..smmhH','...aAh.']],
  lens: [-6,-5,['..ghh...','..gHHh..','..mhLh..','..smmh..','..sgaGG.']],
  moth: [-8,-5,['Lh....L.','LWh..WL.','.CLhaLC.','..CChCC.','...shm..','....Aa..']],
  skull: [-5,-4,['.hHhh.','mhHHhm','shshsh','.mHHhm','..smmh']],
  viper: [-7,-7,['..LLL..','.LWaLh.','..CCD..','....DL.','...CCL.','..CaL..','..aA...']],
  ossuary: [-7,-8,['h..h..H.','hm.hH.h.','hm.hm.h.','.hmhmhm.','..hshh..','..maAm..','...mhh..']],
  sunburst: [-7,-8,['...A....','.G.G..G.','..GAGG..','G.AAAG..','.GGGg...','..gghh..','...smAh.']],
  veil: [-7,-6,['..hhhhh.','.hLCLh..','hLCDh...','LCCh....','CCh.....','CDh.....','DCh.....','Ch......']],
  cap: [-9,-6,['...CWL....','..LWLCL...','.LCCaCCL..','LCCCLCChh.','CCCsmmh...','...ggA....']],
  flower: [-7,-6,['..L..L..','.WCLCL..','..LCaWL.','..CAGC..','.WCLC...','..CDg...']],
  wolf: [-8,-7,['h.....h.','hh..mhm.','mhmhhh..','.hHmhhm.','.msHAmh.','..shhmm.','...mH...']],
  horn: [-9,-7,['.H......G','hH.....gG','hm....gg.','mh...ga..','.mh.gA...','..mhA....','...mmhh..']],
  bear: [-7,-6,['.mh..mh.','.hHhhHh.','mhmsmhm.','mhhmhmm.','.shAmh..','..shm...']],
  brooch: [-6,-4,['..hh...','.maAh..','..hAmm.','...ghha']],
  diadem: [-7,-6,['...a....','.GGAAGG.','gAsLCAg.','.ghhhg..','..gmm...']],
  turban: [-7,-7,['..CLLh..','.CLLCCL.','CLCCCWh.','CCLWLLC.','.CCCaA..','..CCh...']],
  seal: [-6,-6,['..mhhm..','.mAAghm.','.mhAhhm.','..mhhm..','..CCLh..']],
  boar: [-7,-6,['..mmhh..','.mhmhHh.','msmmshh.','.hAHhmm.','..hhmh..','...mH...']],
  bar: [-6,-5,['..mhHh..','.mhmhHh.','mmsmshh.','.shsmsh.','..smmmh.']],
  fox: [-7,-7,['L.....L.','LW...LL.','LCCLLCL.','.CWCLC..','.CLsAAh.','..Cmh...']],
  lion: [-7,-7,['.LLLh...','LWaLLh..','LCCChLL.','.CLsAh..','..LCgH..','..CCh...','...D...']],
};

export const shoulders = {
  plate: [-8,3,['..hhHh.','.hHhhhm','mhmmmms','smmshm.','.shhm..']],
  pauldron: [-8,3,['...mhHh','..hHhhm','.Ahmms.','mhmmh..','.smh...']],
  scale: [-8,3,['..hHam.','.mhmmh.','hmsmhm.','.mhsm..','mhms...','.ms....']],
  mantle: [-8,3,['...WhLh','..WLCh.','.LCLCh.','LCCCh..','CCLh...','.Ch....']],
  lion: [-8,3,['..GAag.','.GAAAGg','GgGaAG.','.Ggsg..','.gAG...','..g....']],
  collar: [-8,2,['..gAhh.','.gLCh..','.LCCh..','CChh...','Chg....']],
  cloak: [-8,3,['...CLWh','..CLCh.','.CLCh..','LCCCh..','CCLh...','CCh....','CD.....']],
  fang: [-8,3,['..hHhm.','.hWhhm.','mhmmsh.','.HmH...','..mh...']],
};

export const devices = {
  talon:['.h..','hmh.','.mhh','..h.'], shard:['..H.','.hHm','..hm','..m.'],
  lozenge:['.g..','gAG.','.g..'], sun:['.A.','AGA','.A.'], fletch:['..h','h.h','.h.','h..'],
  briar:['.h.','h.A','.Ah','h..'], moon:['.hH','hm.','hh.','.hm'], star:['..H.','.hHh','..h.','..m.'],
  comet:['..hH','.Ch.','LC..','C...'], eye:['.mh.','hAhH','.sm.'], ribs:['m.hm','hhhm','m.hm','hhhm'],
  chalice:['h..h','mhHm','.ms.','.hh.'], cross:['.h..','hHhm','.h..','.m..'], wave:['..h.','.hHm','hm.h','.mm.'],
  leaf:['..hH','.hHm','hmm.','m...'], spore:['.aA.','aAAa','..h.','..m.'], bolt:['..A.','.AA.','..a.','.a..'],
  tablet:['gGGg','gAgG','gGag','gggg'], bull:['h..h','mhHm','.aA.','..g.'], tower:['h.h.','hhhm','.hm.','.hh.'], key:['.hh','hAh','.h.','.hh'],
};

export const equipment = {
  // Painted onto the face of an existing shield. Its lower point and outer
  // metal silhouette stay with the source pose as the arm turns.
  shield: [
    [-2,-3,['.hHh.','mCWCm','mCCWm','mWCCm','.mCm.','..h..']],
    [-2,-3,['..H..','.hAh.','hACAh','.hAh.','..h..']],
    [-2,-3,['Ch.hC','CLhLC','CChCC','CCWCC','.ChC.','..h..']],
    [-2,-3,['.AhA.','.gHg.','hhHhh','.gHg.','..h..']],
  ],
  focus: [
    [-3,-3,['..H...','.haH..','mhaALh','.mhhm.','..gG..','..gh..']],
    [-3,-3,['h...h.','mhHhm.','.mAh..','..Wh..','.gGg..','..gh..']],
    [-3,-3,['...A..','.g.Ag.','..AAg.','.gAg..','..gh..','..gA..']],
    [-3,-3,['.H....','hm...h','h..Hhm','.mmhm.','..hA..','..gG..']],
  ],
  stock: [
    [-3,-2,['.hhH...','mmAgGhh','...h...']],
    [-3,-2,['.aAhh..','gghmhmm','..s....']],
    [-3,-2,['..hHh..','gAghhmm','..m....']],
    [-3,-2,['.H..H..','hmsmshm','..aa...']],
  ],
  axe: [
    [-2,-2,['HHh.','mmAh','msCh','.mh.']],
    [-2,-2,['Hmh.','mhHh','mhmh','.hm.']],
    [-2,-2,['.hH.','mAGh','mhmh','.mm.']],
    [-2,-2,['HHh.','haAh','hssh','.mm.']],
  ],
};

// Back-mounted shafts under the real near arm. The arrows differ from the
// steel quarrels and do not replace the missile held in front.
export const fletching = [
  [-9,-3,['W.h.','L.H.','.Lm.','.gh.','..g.','..Cg']],
  [-9,-3,['h..L','h.CL','.mC.','.gg.','..g.','..Cg']],
  [-9,-3,['g..H','AG.h','.g.h','.gm.','..g.','..Cg']],
  [-9,-3,['A.h.','C.H.','.Cm.','.gg.','..g.','..Cg']],
];
export const fabricEdges = [
  ['hL..','.hL.','.Ch.','.Ch.','..h.','.hCh','.hC.','..h.'],
  ['..Ah','.Ah.','.hC.','hCC.','hC..','hm..','.m..'],
  ['h..h','LhhL','hLLh','.hh.','.Ch.','.h..'],
  ['.h..','.hC.','.hC.','hCh.','Chh.','h.h.'],
];
