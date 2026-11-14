// Original detailed models with authored, connected animation rigs.
// See tools/boss-art/build.mjs for source, joints, complete pose cycles, and
// the conversion preserving each boss's pre-existing world size and AI scale.
import butcher from '../../assets/art/bosses-reforged/butcher.js';
import lich from '../../assets/art/bosses-reforged/lich.js';
import pharaoh from '../../assets/art/bosses-reforged/pharaoh.js';
import frostgiant from '../../assets/art/bosses-reforged/frostgiant.js';
import thornqueen from '../../assets/art/bosses-reforged/thornqueen.js';
import pitlord from '../../assets/art/bosses-reforged/pitlord.js';

function unpack(data) {
  const {w,h,palette}=data,previous=new Uint16Array(w*h);
  return data.frames.map(encoded=>{
    const bytes=atob(encoded);let pos=0;
    for(let i=0;i<bytes.length;){const skip=bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8),n=bytes.charCodeAt(i+2)|(bytes.charCodeAt(i+3)<<8);i+=4;pos+=skip;for(let j=0;j<n;j++){previous[pos++]=bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8);i+=2;}}
    const d=new Uint32Array(w*h);for(let i=0;i<d.length;i++)d[i]=palette[previous[i]];
    return{w,h,d};
  });
}
export const REFORGED_BOSS_ART={};
for(const[id,data]of Object.entries({butcher,lich,pharaoh,frostgiant,thornqueen,pitlord})){
  const {frames,palette,delta16,...meta}=data;let buffers;
  REFORGED_BOSS_ART[id]={...meta,gen:()=>buffers??=unpack(data),outline:false};
}
