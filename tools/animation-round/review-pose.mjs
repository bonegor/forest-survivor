import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import sheets from '../../public/assets/heroes-approved/index.js';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const [id,kRaw,stepRaw]=process.argv.slice(2),k=Number(kRaw),step=Number(stepRaw),data=sheets[id];
const c=createCanvas(960,288),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle=process.env.REVIEW_BACKGROUND||'#26313a';ctx.fillRect(0,0,960,288);
for(const [n,[label,index]] of [['walk',data.walk[step]],['attack',data.attack[k]],['moving',data.attackWalk[k][step]]].entries()){
 const b=unpack(data,data.frames[index]),tile=createCanvas(b.w,b.h);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);ctx.drawImage(tile,n*320,0,320,256);ctx.fillStyle='#e7dfc7';ctx.font='15px sans-serif';ctx.fillText(`${id} ${label}: attack${k}/gait${step}`,n*320+5,278);
}
const suffix=process.env.REVIEW_BACKGROUND?'-light':'';
const output=`output/animation-round/critical-pass/${id}-pose-${k}-${step}${suffix}.png`;writeFileSync(output,c.toBuffer('image/png'));console.log(output);
