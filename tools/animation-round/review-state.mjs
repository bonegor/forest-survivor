// Compare a named current locomotion pose against its retained source on light terrain.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import current from '../../public/assets/heroes-approved/index.js';
import baseline from './baseline/index.js';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const [id,motion,phaseText]=process.argv.slice(2),phase=Number(phaseText),c=createCanvas(640,288),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#bdb8a5';ctx.fillRect(0,0,640,288);
for(const [n,[name,data]] of [['source',baseline[id]],['current',current[id]]].entries()){
 const index=data[motion][phase%data[motion].length],b=unpack(data,data.frames[index]),tile=createCanvas(b.w,b.h);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);ctx.drawImage(tile,n*320,0,320,256);ctx.fillStyle='#17202a';ctx.font='15px sans-serif';ctx.fillText(`${id} ${name} ${motion}${phase}`,n*320+5,278);
}
const path=`output/animation-round/critical-pass/${id}-${motion}-${phase}-source-light.png`;writeFileSync(path,c.toBuffer('image/png'));console.log(path);
