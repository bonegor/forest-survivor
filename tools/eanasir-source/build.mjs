// Reproducible native-pixel model. Production consumes only the packed result.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {writePng} from '../png.mjs';
import {nativeFrame,ATTACK_GRIPS,W,H} from './native-model.mjs';
const frames=[],idle=[],walk=[],attack=[],attackWalk=[];
for(let i=0;i<16;i++){idle.push(frames.length);frames.push(nativeFrame({phase:i/16,idle:true}));}
for(let i=0;i<16;i++){walk.push(frames.length);frames.push(nativeFrame({phase:i/16,moving:true}));}
for(let i=0;i<5;i++){attack.push(frames.length);frames.push(nativeFrame({attack:i}));}
for(let a=0;a<5;a++){const row=[];for(let g=0;g<16;g++){row.push(frames.length);frames.push(nativeFrame({phase:g/16,moving:true,attack:a}));}attackWalk.push(row);}
const palette=[0],colors=new Map([[0,0]]),pack=({w,h,d})=>{let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[y*w+x]>>>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const pixels=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=d[y*w+x];if(!colors.has(c)){colors.set(c,palette.length);palette.push(c);}pixels.push(colors.get(c));}return[x0,y0,x1-x0+1,y1-y0+1,Buffer.from(pixels).toString('base64')];};
const packed=frames.map(pack);
const fallLayers=Object.fromEntries(['farFoot','nearFoot','skirt','bust','copper','whip'].map(layer=>[layer,pack(nativeFrame({layer}))]));
const soulWalk=Array.from({length:16},(_,i)=>pack(nativeFrame({unarmed:true,moving:true,phase:i/16})));
const data={w:W,h:H,hires:1,anchorY:56,below:7,body:[25,44],idle,walk,attack,attackWalk,motionRate:2,idleRate:16/1.875/1.6,idleFps:16/1.875,walkFps:19.6,attackFps:18,attackRelease:2,manualDelay:2/18,selfBob:true,outline:false,
 sourceRevision:'native-stone-worshiper-2026-11-15',source:'tools/eanasir-source/native-model.mjs',reference:'tools/eanasir-source/reference/standing-male-worshiper.jpg',sourceModel:'tools/eanasir-source/model.png',sourceSha256:createHash('sha256').update(readFileSync('tools/eanasir-source/model.png')).digest('hex'),rigSource:'tools/eanasir-source/native-model.mjs',attackGrips:ATTACK_GRIPS,palette,indexBytes:1,frames:packed,fallLayers,soulWalk};
const output=process.env.EANASIR_OUT||'public/assets/heroes-authored',diagnostics=process.env.EANASIR_DIAGNOSTICS||'output/eanasir-statue/candidate';mkdirSync(output,{recursive:true});mkdirSync(diagnostics,{recursive:true});
writeFileSync(output+'/eanasir.js','// Rebuild: node tools/eanasir-source/build.mjs\nexport default '+JSON.stringify(data)+';\n');
const contact={w:W*8,h:H*Math.ceil(frames.length/8),d:new Uint32Array(W*8*H*Math.ceil(frames.length/8))};frames.forEach((f,i)=>{for(let y=0;y<H;y++)contact.d.set(f.d.subarray(y*W,(y+1)*W),(Math.floor(i/8)*H+y)*contact.w+i%8*W);});
writePng(diagnostics+'/all-frames.png',contact);writePng(diagnostics+'/standing.png',frames[0]);writeFileSync(diagnostics+'/rig.json',JSON.stringify({nativeDimensions:[W,H],palette:palette.length,frameCount:frames.length,attackGrips:ATTACK_GRIPS},null,2));console.log('Ea-nasir:',frames.length,'frames,',palette.length,'colours;',output);
