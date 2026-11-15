// Ossarian: deterministic native-pixel material/model revision of the CC0 baked source.
// All edits are colour ownership INSIDE the immutable source alpha; no geometry or clocks change.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ORIGINAL from '../../../public/assets/art/bosses.js';
import { bakedBuffers } from '../../../public/js/art/baked.js';
import { writePng } from '../../png.mjs';

const out = 'output/boss-polish/boneking/artist';
mkdirSync(out, { recursive:true });
mkdirSync('public/assets/art/bosses-polished', { recursive:true });
const src=ORIGINAL.boneking;
const original=src.frames.map(s=>Uint8Array.from(Buffer.from(s,'base64')));
const hex=c=>parseInt(c.slice(1,3),16)|(parseInt(c.slice(3,5),16)<<8)|(parseInt(c.slice(5,7),16)<<16);
// Exactly the original allocation: 23 palette entries, one byte/index, 29 80×80 frames.
const rgb=['#000000','#101318','#e4c276','#b88b46','#775734','#92a9b2','#423629','#576b7b','#252936','#d3e0db','#f6c46b','#ae6b38','#303d50','#d4ccb3','#8c846b','#3b3029','#211d20','#f0e4c4','#252936','#252936','#f3e8cd','#f3e8cd','#f3e8cd'];
const palette=rgb.map((c,i)=>(hex(c)|((src.palette[i]>>>24)<<24))>>>0);
const frames=original.map(f=>f.slice());
const reference=original[0],model=reference.slice();
function pixel(d,x,y,c){if(x>=0&&x<80&&y>=0&&y<80&&d[y*80+x])d[y*80+x]=c;}
function line(d,x,y,w,c){for(let i=0;i<w;i++)pixel(d,x+i,y,c);}
function rows(d,x,y,rr,key){rr.forEach((r,j)=>[...r].forEach((s,i)=>{if(s!=='.')pixel(d,x+i,y+j,key[s]);}));}

// A continuous crown band joins the two original horn roots. The dark central jewel
// and broad, stepped bevel are deliberate native clusters, not a halo or extra silhouette.
rows(model,33,14,[
 '......GG......',
 '....GgGGgG....',
 '..GggGGGGggG..',
 '..gggGddGggg..',
 '...sssGgsss...',
],{G:2,g:3,s:4,d:6});

// Stern ivory skull. Rear cranium stays in shadow; two tiny amber cores sit under
// a downward brow. The jaw is bone separated by dark tooth gaps, never a red grin.
rows(model,35,19,[
 '.sIIIIIIIs..',
 '.sIIIIIIsI..',
 '.ssIIIssIs..',
 '..ssssIssss.',
 '..sdddIddds.',
 '..sdaIdsads.',
 '..IIddIddIs.',
 '...IIsdsIIs.',
 '...sIdddIs..',
 '....IIdIIs..',
 '....sIIIs...',
 '.....sss....',
 '......s.....',
],{I:13,s:14,d:8,a:10});
// A hard upper-left cheek and forehead edge; lower teeth remain small, severe marks.
line(model,37,19,4,17);line(model,37,20,2,17);pixel(model,37,25,17);
pixel(model,39,28,17);pixel(model,41,28,17);pixel(model,43,28,13);

// Shoulder plates: cool steel planes, a single edge, and restrained antique rivets.
for(let y=26;y<=36;y++)for(let x=24;x<=52;x++){
 const k=y*80+x,v=reference[k];
 if(v===7&&y<=34&&(x<=35||x>=47))model[k]=7;
 if(v===12&&y===34&&x>=28&&x<=34)model[k]=7;
}
line(model,27,33,5,5);line(model,28,34,5,7);
pixel(model,28,35,3);pixel(model,50,35,3);
// Royal gorget closes the neck and visually separates skull from the chest.
line(model,36,34,8,4);line(model,37,34,6,3);line(model,39,35,3,2);

// Shield: hard gold rim around a blue-black field, carrying a crowned blade sigil.
// Its compact, symmetric geometry is attached to the same shield through every pose.
rows(model,34,37,[
 '..ggGGgg....',
 '.gGssssGg...',
 '.GsCcCcCsG..',
 '.GsCCCCCsg..',
 '..gsCCCsG...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '..gsSCSsg...',
 '...gsCsg....',
 '....gGg.....',
 '.....g......',
],{G:2,g:3,s:12,S:8,C:3,c:2});

// Spectral hem: large connected charcoal folds with one worn light-facing edge.
// The exact opaque and semitransparent footprint is retained.
for(let y=53;y<=64;y++)for(let x=33;x<=44;x++){
 const k=y*80+x;if(reference[k]===1)model[k]=(x<=36&&y<61)||(x===40&&y<59)?8:1;
}
line(model,34,54,4,12);line(model,35,55,2,12);line(model,35,56,2,8);

const offsets=[];
for(let f=0;f<29;f++){
 let dx=0,dy=0;
 if(f===26){dy=-2;}else{
  const pts=[];for(let i=0;i<6400;i++)if(original[f][i]===10||original[f][i]===11)pts.push(i);
  dx=Math.min(...pts.map(i=>i%80))-38;dy=Math.min(...pts.map(i=>Math.floor(i/80)))-23;
 }
 offsets.push([dx,dy]);
 // Transfer only unchanged model pixels; swords, moving arms, charge orb and slash
 // stay in front. This source-matched ownership is crucial in frames 16 and 27–28.
 if(f!==26)for(let y=0;y<80;y++)for(let x=0;x<80;x++){
  const nx=x+dx,ny=y+dy;if(nx<0||nx>=80||ny<0||ny>=80)continue;
  const a=y*80+x,b=ny*80+nx;
  if(model[a]!==reference[a]&&original[f][b]===reference[a])frames[f][b]=model[a];
 }
 // Moving limb ivory and sword remain coherent from the base palette; gold is
 // reserved for crown/shield. Steel crossguards inherit cold highlights.
 // Attack FX have stepped material planes while retaining every alpha byte.
 if(f===24||f===25){
  const points=[];for(let i=0;i<6400;i++)if(original[f][i]===20)points.push([i%80,Math.floor(i/80)]);
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,r=(maxX-minX+1)/2;
  for(const[x,y]of points){const d=Math.max(Math.abs(x-cx),Math.abs(y-cy));frames[f][y*80+x]=d>=r-1?3:d>=r-2?2:20;}
 }
 if(f===20||f===27){
  for(let y=0;y<80;y++)for(let x=0;x<80;x++){
   const k=y*80+x;if(original[f][k]!==20)continue;
   const neighbours=[[-1,0],[0,-1],[1,0],[0,1]].some(([a,b])=>x+a<0||x+a>79||y+b<0||y+b>79||original[f][(y+b)*80+x+a]!==20);
   if(f===20){
    const span=[];for(let sx=0;sx<80;sx++)if(original[f][y*80+sx]===20)span.push(sx);
    const lo=span[0],hi=span.at(-1),t=(x-lo)/Math.max(1,hi-lo);
    frames[f][k]=t>.8?20:t>.6?9:t>.26?5:12;
   }else frames[f][k]=neighbours?9:20;
  }
 }
 // The single 50 ms nova impact is hot ivory with an antique-gold crown, a stern
 // eye/core read, and broad material shapes. Nothing delays its 1.0 s release.
 if(f===26){
  for(let y=0;y<80;y++)for(let x=0;x<80;x++){
   const k=y*80+x;if(original[f][k]!==20)continue;
   const ry=y-dy,rx=x-dx,mi=ry*80+rx;
   if(ry>=8&&ry<=18&&rx>=30&&rx<=49&&reference[mi])frames[f][k]=model[mi]===1?3:[2,3,4,6].includes(model[mi])?2:17;
   else if(ry>=19&&ry<=30&&rx>=36&&rx<=46&&reference[mi])frames[f][k]=model[mi]===8?4:model[mi]===10?10:20;
   else if(ry>=38&&ry<=50&&rx>=35&&rx<=44&&reference[mi])frames[f][k]=[2,3].includes(model[mi])?2:17;
   else if(ry>53)frames[f][k]=17;
  }
 }
}

const polished={...src,palette,frames:frames.map(f=>Buffer.from(f).toString('base64')),glow:['#f6c46b','#ae6b38']};
// Verify exact alpha, timing and allocations before emitting anything integrable.
let changed=0;const bounds=[];
for(let f=0;f<29;f++){
 let minX=80,minY=80,maxX=-1,maxY=-1,count=0;
 for(let i=0;i<6400;i++){
  const a=src.palette[original[f][i]]>>>24,b=palette[frames[f][i]]>>>24;
  if(a!==b)throw Error(`Alpha changed in frame ${f} at ${i%80},${Math.floor(i/80)}`);
  if(a){minX=Math.min(minX,i%80);maxX=Math.max(maxX,i%80);minY=Math.min(minY,Math.floor(i/80));maxY=Math.max(maxY,Math.floor(i/80));count++;}
  if(src.palette[original[f][i]]!==palette[frames[f][i]])changed++;
 }
 bounds.push({frame:f,bounds:[minX,minY,maxX,maxY],opaqueOrPartialPixels:count});
}
const file='public/assets/art/bosses-polished/boneking.js';
writeFileSync(file,'// Ossarian native pixel polish. Generated by tools/boss-polish/boneking/build.mjs.\n// Derived from Foozle / Baldur Ancient Skeleton, CC0; original alpha, anchors and clocks preserved.\nexport default '+JSON.stringify(polished)+';\n');
writeFileSync(`${out}/allocation-check.json`,JSON.stringify({sourceSha256:createHash('sha256').update(JSON.stringify(src)).digest('hex'),changedPixels:changed,frames:29,width:80,height:80,paletteEntries:palette.length,indexBytes:1,indexPayloadBytes:29*80*80,decodedRgbaBytes:29*80*80*4,exactAlpha:true,metadataUnchangedExceptGlow:true,offsets,bounds},null,2));

const before=bakedBuffers(src),after=bakedBuffers(polished);
function buffer(w,h,c=0xff201811){const o={w,h,d:new Uint32Array(w*h)};o.d.fill(c);return o;}
function blit(o,b,ox,oy,s=1,flip=false){for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const p=b.d[y*b.w+(flip?b.w-1-x:x)],a=(p>>>24)/255;if(!a)continue;for(let j=0;j<s;j++)for(let i=0;i<s;i++){const k=(oy+y*s+j)*o.w+ox+x*s+i,q=o.d[k];o.d[k]=(0xff000000|Math.round((p&255)*a+(q&255)*(1-a))|(Math.round(((p>>>8)&255)*a+((q>>>8)&255)*(1-a))<<8)|(Math.round(((p>>>16)&255)*a+((q>>>16)&255)*(1-a))<<16))>>>0;}}}
// Minimal native numeric labels are integral pixels and intentionally not smoothed.
const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
function label(o,n,x,y){[...String(n)].forEach((c,j)=>{for(let a=0;a<15;a++)if(digits[+c][a]==='1')o.d[(y+Math.floor(a/3))*o.w+x+j*4+a%3]=0xffdbd8cf;});}
for(const s of[1,3])for(const flip of[false,true]){
 const o=buffer(5*164*s,6*90*s);for(let f=0;f<29;f++){const x=(f%5)*164*s,y=Math.floor(f/5)*90*s;label(o,f,x+2,y+2);blit(o,before[f],x,y+8*s,s,flip);blit(o,after[f],x+82*s,y+8*s,s,flip);}writePng(`${out}/all-29-before-after-${s}x-${flip?'left':'right'}.png`,o);
}
const hero=buffer(80*4*5,90*5);[0,17,24,28].forEach((f,i)=>blit(hero,after[f],i*80*5,0,5));writePng(`${out}/polished-keyposes-5x.png`,hero);
const pair=buffer(160*6,80*6);blit(pair,before[0],0,0,6);blit(pair,after[0],80*6,0,6);writePng(`${out}/before-after-0-6x.png`,pair);
console.log(JSON.stringify({file,changedPixels:changed,paletteEntries:palette.length,exactAlpha:true,output:out},null,2));
