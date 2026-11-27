// All grips are in native, right-facing pixels. The animation rotates each
// entire item around its grip, including its hilt, engraving and edge.
const piece=(grip,lines)=>({grip,rows:lines.split('/')});
export const weapons={
  sword:piece([2,12],'.............H/............Hh/...........Hhm/..........Hhm/.........Hhm/........Hhm/.......Hhm/......Hhm/.....Hhm/...gHhm/..gghm/.t.ghg/.gt.g/.g/sg'),
  greatsword:piece([3,14],'...............H/..............Hh/.............HHm/............HHhm/...........HHhm/..........HHhm/.........HHhm/........HHhm/.......HHhm/......HHhm/.....HHhm/..g.HHhm/..gghhmg/..t.gmg/..gt.g/..gt/.sg/sg'),
  sabre:piece([2,11],'............H/............Hh/...........Hhm/..........Hhm/........HHhm/......HHhhm/.....Hhhm/....Hhm/..gHhm/.ggmg/.t.gg/.gtg/.gt/.g'),
  dagger:piece([2,7],'........H/.......Hh/......Hhm/.....Hhm/....Hhm/.g.Hhm/..gmg/..t.g/.gt/.g'),
  axe:piece([3,11],'......mHH../.....mmhHh./....mmgmmHm/...mgghssHh/....gg..shH/....tg/...tg/...tg/..tg/..tg/.tg/.tg/.tg'),
  hammer:piece([2,12],'.....mhhm.../....mHhhhm../...mAhhhmmh./....mmmsmmm./.....ggmmm../....tg/....tg/...tg/...tg/...tg/..tg/..tg/.tg/.g'),
  spear:piece([3,14],'.........H/........Hhm/.......Hhm/......Hhm/......hm/.....gm/.....tg/.....tg/....tg/....tg/....tg/...tg/...tg/...tg/..tg/..tg/..tg/.tg/.g'),
  staff:piece([3,14],'....A/..hmAh./.hAAAhm/.mALAhm/..hLhm/..gmg/...g/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/..ggh'),
  crook:piece([3,14],'..gggg/..gAhhg/.gg...h/.gg..A/.gg/ggh/.tg/.tg/..tg/..tg/..tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg/...tg'),
  wand:piece([1,8],'.......H/......Ah/.....AAH/.....gA/....gh/...gh/..tg/.tg/.tg/.t'),
  bow:piece([5,8],'..tG./...tG./...htG/....htg/....htg/.....htg/.....mtg/......gg/.....ttg/.....ttg/.....gg/....hgg/....hgg/...hgg/..htg/..tg/.g'),
  crossbow:piece([3,6],'.......hgt./.........gA./.......tgh../mmmmmmhHhhHh/.tgggGggggg/..tttg..hgg/..ttg.....tg/..tg.......g/..t........g'),
  whip:piece([2,9],'............gG/...........gt./......gggggt../.....gttt...../....gt......../...gt........./..gt........../..tg........../.tg.........../.tg.........../.gg...........'),
  orb:piece([3,4],'..hHh../.hAAWm./hAAWLLh/mAWLCCm/.mCLCmm/..hmmh'),
  shield:piece([3,5],'..mmhhm./.mHhmmhs/mhccLcmm/mccALcsm/mcLALCsm/mccCCcsm/.mccCsm./..mcsm../...mm...'),
  kite:piece([4,6],'..mmhhhmm./.mHhhmmhhs/mccLCCLCms/mcCLACLCms/mcCLAALCms/mcCLACLCms/.mcLCCLms./.mcLCCms../..mcLms.../...mhm..../....m.....'),
  tower:piece([4,7],'.mmhhhhhmm/mHCChmCChm/mcCChmCCcm/mcCChmCCcm/mcChABhCcm/mcCLAALCcm/mcChAAhCcm/mcCChmCCcm/mcCChmCCcm/mcCChmCCcm/.mChhmChm./..mhHhhm../...mmmm...'),
  book:piece([3,4],'.gGGGhhh/gCCghHHh/gCACCWhh/gCLCghhH/gCCggHHh/gCCgghhH/.gggmmmm'),
  disc:piece([4,4],'..ggGgg../.gGAAGGg./gGgGGggGg/gGgAAGgGg/gGgAAgAgG/gGgGGggGg/.gGgggGg./..gggGg..'),
};
