// Package existing real-Game PNG captures; never rerender or smooth the artwork.
// Arguments: Ranger take, Berserker take, Ea-Nasir take (capture-review output dirs).
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const takes=process.argv.slice(2),ids=['archer','berserker','eanasir'],names=['Ranger','Berserker','Ea-Nasir'];
if(takes.length!==3)throw Error('Pass the three reviewed capture folders: Ranger, Berserker, Ea-Nasir.');
const out=process.env.STYLE_OUT||'output/style-match/proof';mkdirSync(out,{recursive:true});
const records=ids.map((id,i)=>JSON.parse(readFileSync(join(takes[i],`${id}-world/samples.json`),'utf8')));
const poses=['idle-right','walk-right','crypt-attack-right'];
const c=createCanvas(720,660),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
ctx.fillStyle='#18212a';ctx.fillRect(0,0,c.width,c.height);
for(let row=0;row<3;row++)for(let col=0;col<3;col++){
 const samples=records[row].filter(s=>s.phase===poses[col]);
 const chosen=col===2?(samples.find(s=>s.attack)||samples[0]):samples[Math.floor(samples.length/2)];
 const source=await loadImage(join(takes[row],`${ids[row]}-world`,`${String(chosen.frame).padStart(4,'0')}.png`));
 const [x,y,w,h]=chosen.rect;
 ctx.drawImage(source,x,y,w,h,col*240,row*220+22,240,192);
 ctx.fillStyle='#ead4aa';ctx.font='14px sans-serif';
 ctx.fillText(`${names[row]} · ${['idle','walking','crypt strike'][col]}`,col*240+8,row*220+17);
}
writeFileSync(join(out,'heroes-in-game.png'),c.toBuffer('image/png'));
console.log(join(out,'heroes-in-game.png'));
