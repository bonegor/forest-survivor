import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import BAKED from '../../../public/assets/art/bosses.js';
import {writePng} from '../../png.mjs';
import {polishIndices,packedPalette} from './source.mjs';

const dir='output/boss-polish/demonlord/artist',out='public/assets/art/bosses-polished/demonlord.js';
mkdirSync(dir,{recursive:true});mkdirSync('public/assets/art/bosses-polished',{recursive:true});
const src=BAKED.demonlord,original=src.frames.map(s=>Uint8Array.from(Buffer.from(s,'base64'))),next=original.map(polishIndices);
for(let n=0;n<original.length;n++)for(let i=0;i<original[n].length;i++)if(Boolean(original[n][i])!==Boolean(next[n][i]))throw Error(`Alpha changed: ${n}/${i}`);
const result={...src,palette:packedPalette,frames:next.map(a=>Buffer.from(a).toString('base64'))};
writeFileSync(out,'// Azgaroth native art polish; rebuild: node tools/boss-polish/demonlord/build.mjs\nexport default '+JSON.stringify(result)+';\n');
const buffers=(frames,palette)=>frames.map(d=>({w:src.w,h:src.h,d:Uint32Array.from(d,i=>palette[i])}));
const base=buffers(original,src.palette),polished=buffers(next,packedPalette);
function sheet(frames,scale=1,flip=false){const w=96*7*scale,h=80*2*scale,d=new Uint32Array(w*h);d.fill(0xff312723);frames.forEach((f,n)=>{for(let y=0;y<80*scale;y++)for(let x=0;x<96*scale;x++){const c=f.d[Math.floor(y/scale)*96+(flip?95-Math.floor(x/scale):Math.floor(x/scale))];if(c)d[(Math.floor(n/7)*80*scale+y)*w+(n%7)*96*scale+x]=c;}});return{w,h,d};}
for(const [label,frames] of [['before',base],['candidate',polished]])for(const scale of[1,4])for(const flip of[false,true])writePng(`${dir}/${label}-${scale}x${flip?'-left':''}.png`,sheet(frames,scale,flip));
for(let n=0;n<14;n++)writePng(`${dir}/candidate-${n}.png`,polished[n]);
const sha=s=>createHash('sha256').update(s).digest('hex');
const meta=({palette,frames,...m})=>m;
const record={frameCount:next.length,canvas:[src.w,src.h],paletteEntriesBefore:src.palette.length,paletteEntriesAfter:result.palette.length,indexBytesBefore:1,indexBytesAfter:1,rgbaBytesBefore:14*96*80*4,rgbaBytesAfter:14*96*80*4,alphaEqual:true,metadataEqual:JSON.stringify(meta(src))===JSON.stringify(meta(result)),sourceHash:sha(readFileSync('public/assets/art/bosses.js')),candidateHash:sha(readFileSync(out)),changedPixels:next.map((f,n)=>f.reduce((sum,v,i)=>sum+Number(packedPalette[v]!==src.palette[original[n][i]]),0)),metadata:meta(src)};
writeFileSync(`${dir}/invariants.json`,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
