import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {writePng} from '../png.mjs';
import {nativeFrame} from './native-model.mjs';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {buildSprite}=await import('../../public/js/engine/sprites.js');
const old=(await import('../hero-round2-review/before/eanasir-source.js')).EANASIR_ART.eanasir;
const original=buildSprite('eanasir-before',old),candidate=nativeFrame({idle:true});
const out=process.env.EANASIR_DIAGNOSTICS||'output/style-match/eanasir-candidate';mkdirSync(out,{recursive:true});writePng(out+'/candidate-standing.png',candidate);
const c=createCanvas(1000,560),ctx=c.getContext('2d');ctx.fillStyle='#182124';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f0e8d6';ctx.font='19px sans-serif';ctx.fillText('Ea-nasir — native pixel model and retained early design',25,30);
const next=createCanvas(80,64);next.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(candidate.d.buffer),80,64),0,0);
ctx.imageSmoothingEnabled=false;
for(const [i,image,D] of [[0,original.frames[0].c,1],[1,next,1]]){
 const x=25+i*480;ctx.fillText(i?'Native statue adaptation':'Early merchant design',x,70);ctx.drawImage(image,0,0,80*D,64*D,x,90,400,320);ctx.fillText('S1',x,450);ctx.drawImage(image,x,460,80,64);ctx.fillText('S2.4',x+130,430);ctx.drawImage(image,x+130,430,192,153.6);
}
writeFileSync(out+'/eanasir-threeway.png',c.toBuffer('image/png'));
