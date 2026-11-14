// Source-model art shared by the merchant hero and crypt encounter. All pixels
// and clips are packed in the repository; no image generation runs in the game.
import data from '../../assets/heroes-authored/eanasir.js';
function unpack([x,y,w,h,encoded],box){
 const raw=atob(encoded),d=new Uint32Array(box.w*box.h),n=data.indexBytes;
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
  const i=(yy*w+xx)*n,color=raw.charCodeAt(i)|(n===2?raw.charCodeAt(i+1)<<8:0);
  d[(yy+y-box.y)*box.w+xx+x-box.x]=data.palette[color];
 }
 return{w:box.w,h:box.h,d};
}
const idle=data.idle.map(i=>data.frames[i]);
const x=Math.min(...idle.map(f=>f[0])),y=Math.min(...idle.map(f=>f[1]));
const box={x,y,w:Math.max(...idle.map(f=>f[0]+f[2]))-x,h:Math.max(...idle.map(f=>f[1]+f[3]))-y};
let worldFrames,portraitFrames;
export const EANASIR_MODEL_ART={
 eanasir:{gen:()=>worldFrames??=data.frames.map(f=>unpack(f,{x:0,y:0,w:data.w,h:data.h})),
  ...Object.fromEntries(['hires','anchorY','below','body','idle','walk','attack','attackWalk','motionRate','idleRate','attackFps','attackRelease','manualDelay','selfBob','outline'].map(k=>[k,data[k]]))},
 eanasir_pose:{gen:()=>portraitFrames??=idle.map(f=>unpack(f,box)),hires:data.hires,outline:false,fps:data.idleFps},
};
