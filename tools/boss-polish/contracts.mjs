// Geometry and animation contract captured before the material revision.
// RGB is deliberately excluded: artwork quality is judged by the reviewers.
import{createHash}from'node:crypto';
export const BOSS_IDS=['boneking','butcher','lich','demonlord','pharaoh','frostgiant','thornqueen','pitlord'];
export function contract(sprite){
 const alpha=createHash('sha256');
 const sizes=sprite.frames.map(f=>{alpha.update(Uint8Array.from(f.buf.d,c=>c>>>24));return[f.w,f.h];});
 const metadata=JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(sprite).filter(([k,v])=>k!=='frames'&&typeof v!=='function'))));
 return{metadata,sizes,alpha:alpha.digest('hex'),rgbaBytes:sizes.reduce((n,[w,h])=>n+w*h*4,0)};
}
