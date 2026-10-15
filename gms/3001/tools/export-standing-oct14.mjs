// Rebuild the transparent standing PNGs, comparison board and dimension report.
import '../../../tools/headless.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import proposals from '../sprites/lab/src/standing-oct14.js';
import {SPR} from '../../../public/js/engine/sprites.js';
import {makeBuf,flipX,hexPack,blit} from '../../../public/js/engine/pixels.js';
import {GLYPHS} from '../../../public/js/engine/fontdata.js';
import {writePng} from '../../../tools/png.mjs';

const out=fileURLToPath(new URL('../sprites/lab/standing-oct14/',import.meta.url));
mkdirSync(out,{recursive:true});
const colours={bg:hexPack('#171c22'),panel:hexPack('#222930'),text:hexPack('#e5e2d8'),muted:hexPack('#96a5ac'),gold:hexPack('#d4b47b'),line:hexPack('#39464c')};
const board=makeBuf(1000,162+216*proposals.length);board.d.fill(colours.bg);
function rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)board.d[j*board.w+i]=c;}
function text(s,x,y,c=colours.text,k=2){for(const ch of s.toUpperCase()){
 const rows=(GLYPHS[ch]||GLYPHS['?']).split('/');
 rows.forEach((r,j)=>[...r].forEach((v,i)=>{if(v!=='0'&&v!=='.'&&v!==' ')rect(x+i*k,y+j*k,k,k,c);}));x+=(rows[0].length+1)*k;
}}
function sprite(b,cx,foot,anchor,k=4){for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)if(b.d[y*b.w+x]>>>24)rect(Math.round(cx-b.w*k/2+x*k),foot-anchor*k+y*k,k,k,b.d[y*b.w+x]);}
function bounds(b){let x0=b.w,y0=b.h,x1=-1,y1=-1;b.d.forEach((v,i)=>{if(v>>>24){const x=i%b.w,y=Math.floor(i/b.w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}});return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
text('FOREST SURVIVOR',28,24,colours.gold,3);
text('STANDING REDESIGNS / 14 OCT 2026',29,57,colours.muted,1);
text('CURRENT',83,93,colours.muted,2);text('PROPOSAL / LEFT',298,93,colours.gold,2);text('PROPOSAL / RIGHT',547,93,colours.gold,2);text('KNIGHT REFERENCE',790,93,colours.muted,2);
const report=[];
for(const [i,p] of proposals.entries()){
 const label=p.name.replace(' · ',' / '),file=p.file||p.cls;
 const top=121+i*216,foot=top+190,b=p.def.gen()[0],old=SPR[p.cls],ref=SPR.knight;
 rect(20,top,960,206,colours.panel);text(label,34,top+14,colours.text,2);
 rect(42,foot,916,1,colours.line);
 sprite(old.frames[old.idle?.[0]||0].buf,134,foot,old.anchorY);
 sprite(flipX(b),387,foot,p.def.anchorY);sprite(b,640,foot,p.def.anchorY);sprite(ref.frames[0].buf,878,foot,ref.anchorY);
 const pair=makeBuf(96,48);blit(pair,flipX(b),0,0);blit(pair,b,48,0);
 writePng(out+file+'-left.png',flipX(b));writePng(out+file+'-right.png',b);writePng(out+file+'-standing-pair.png',pair);
 report.push({class:p.cls,id:p.id,file,name:p.name,cell:[48,48],anchorY:p.def.anchorY,visible:bounds(b),before:bounds(old.frames[0].buf),colours:new Set([...b.d].filter(v=>v>>>24)).size,frames:1,animation:'standing only'});
}
text('SAME PIXEL SCALE / TRANSPARENT 48 X 48 CELLS / STANDING POSES ONLY',29,board.h-23,colours.muted,1);
writePng(out+'comparison.png',board);writeFileSync(out+'manifest.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
