// node tools/field-refined-review.mjs --baseline [hero ...]
// node tools/field-refined-review.mjs [hero ...]
// The initial pass captures the original game buffers once. Repeated reviews
// then read two small PNG atlases per hero, including the original on every row.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from './png.mjs';
import { makeBuf, hexPack } from '../public/js/engine/pixels.js';
import { textMask } from '../public/js/engine/font.js';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { buildSprite } from '../public/js/engine/sprites.js';
import { CHUNK, layoutChunk, paintChunk } from '../public/js/game/darkwood.js';
import { NIGHT } from '../public/js/game/biomes.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const out = join(repo, 'output/field-refined'), cache = join(out, 'reference');
mkdirSync(cache, { recursive: true });
const ids = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const baseline = process.argv.includes('--baseline');
const targets = ids.length ? ids : HERO_ORDER;
const neutral = hexPack('#181c22'), labelInk = hexPack('#dfdbcc');
const W = 86, H = 56, floor = 47;

function copy(dst, src, x, y, scale = 1, flip = false) {
  for (let sy = 0; sy < src.h; sy++) for (let sx = 0; sx < src.w; sx++) {
    const c = src.d[sy * src.w + sx], a = c >>> 24;
    if (!a) continue;
    const ox = x + (flip ? src.w - 1 - sx : sx) * scale, oy = y + sy * scale;
    for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) {
      const xx = ox + i, yy = oy + j;
      if (xx < 0 || yy < 0 || xx >= dst.w || yy >= dst.h) continue;
      const k = yy * dst.w + xx;
      if (a === 255 || !dst.d[k]) dst.d[k] = c;
      else {
        const bg = dst.d[k], blend = shift => Math.round(((c >>> shift & 255) * a + (bg >>> shift & 255) * (255 - a)) / 255);
        dst.d[k] = (0xff000000 | blend(16) << 16 | blend(8) << 8 | blend(0)) >>> 0;
      }
    }
  }
}
function label(dst, text, x, y) {
  const { w, h, mask } = textMask(text);
  copy(dst, { w, h, d: Uint32Array.from(mask, bit => bit ? labelInk : 0) }, x, y);
}
function crop(src, x, y, w, h, stride = 1) {
  const b = makeBuf(w, h);
  for (let j=0;j<h;j++) for (let i=0;i<w;i++) b.d[j*w+i] = src.d[(y+j*stride)*src.w+x+i*stride];
  return b;
}

// Reuse the unobstructed native field crop if the earlier trial was captured.
// On a fresh checkout, paint a Darkwood chunk and apply its first night light.
const terrainPath = join(cache,'darkwood.png');
if (!existsSync(terrainPath)) {
  const recording = join(repo,'output/field-studio/trial-keyboard.png');
  if (existsSync(recording)) writePng(terrainPath, crop(readPng(recording),196,332,W,H,2));
  else {
    const chunk = makeBuf(CHUNK,CHUNK), light = NIGHT[0][1];
    paintChunk(layoutChunk(1,2),chunk.d);
    const patch = crop(chunk,22,54,W,H);
    patch.d = patch.d.map(c => {
      const channel = (n) => Math.round((c >>> (8*n) & 255) * light[n]/255);
      return (0xff000000 | channel(2)<<16 | channel(1)<<8 | channel(0)) >>> 0;
    });
    writePng(terrainPath,patch);
  }
}
const ground = readPng(terrainPath);

function atlas(id, kind, built, keys) {
  const {w,h} = built.frames[0].buf, cols=8, data=makeBuf(cols*w, Math.ceil(keys.length/cols)*h);
  keys.forEach((index, j)=>copy(data,built.frames[index].buf,(j%cols)*w,Math.floor(j/cols)*h));
  writePng(join(cache,id+'-'+kind+'.png'),data);
  return { keys, cols, w, h, anchor:built.anchorY };
}
function original(id) {
  const sprite=buildSprite(id,HERO_ART[id]), fall=sprite.fall, i0=sprite.idle[0];
  const archive=join(repo,'output/field-hero-design',id+'.rgba');
  if(existsSync(archive)){
    const buf=sprite.frames[i0].buf, bytes=Buffer.from(buf.d.buffer,buf.d.byteOffset,buf.d.byteLength);
    if(!bytes.equals(readFileSync(archive))) console.warn('Using the current production idle in place of the older archive: '+id);
  }
  const release=sprite.attackRelease??Math.floor(sprite.attack.length/2);
  const steps=[0,.25,.5,.75].map(t=>Math.floor(sprite.walk.length*t));
  const mix=sprite.attackWalk?.[release] || sprite.walk;
  const releaseTime=fall.wisp?.release??1.85;
  const phases={
    idle:[i0,sprite.idle[Math.floor(sprite.idle.length/2)]],
    walk:sprite.walk,
    attack:sprite.attack,
    mixed:steps.map(step=>mix[step]),
    strike:[sprite.attack[0],sprite.attack[release],sprite.attack.at(-1),mix[steps[1]]],
    fall:[.24,.74,1.2,releaseTime+.01,releaseTime+.6,10].map(t=>fall.frameAt(t)),
  };
  const livingKeys=[...new Set([...sprite.idle,...sprite.walk,...sprite.attack,...phases.mixed])];
  const fallenKeys=[...new Set(phases.fall)];
  const info={id,phases,release,body:atlas(id,'living',sprite,livingKeys),fallen:atlas(id,'fall',fall,fallenKeys)};
  writeFileSync(join(cache,id+'.json'),JSON.stringify(info));
}
function frames(id, kind, desc){
  const sheet=readPng(join(cache,id+'-'+kind+'.png')), result=new Map();
  desc.keys.forEach((key,j)=>result.set(key,crop(sheet,(j%desc.cols)*desc.w,Math.floor(j/desc.cols)*desc.h,desc.w,desc.h)));
  return result;
}
const specs={};
let paint, paintFall;
if(!baseline){
  ({refineFrame:paint,refineFallFrame:paintFall}=await import('../public/field-studio/art/refinement.js'));
  for(const [file,key] of [['refined-vanguard','vanguardRefinements'],['refined-company','companyRefinements']]){
    const url=new URL('../public/field-studio/art/'+file+'.js',import.meta.url);
    if(existsSync(fileURLToPath(url)))Object.assign(specs,(await import(url))[key]);
  }
}

function tile(frame, anchor, flip=false) {
  const b={...ground,d:ground.d.slice()};
  copy(b,frame,(W-frame.w)>>1,floor-anchor,1,flip);
  return b;
}
for(const id of targets){
  if(!HEROES[id])throw Error('Unknown hero '+id);
  if(baseline||!existsSync(join(cache,id+'.json')))original(id);
  const info=JSON.parse(readFileSync(join(cache,id+'.json'))), p=info.phases;
  const src=frames(id,'living',info.body), falls=frames(id,'fall',info.fallen);
  const f0=src.get(p.idle[0]);
  const spec=specs[id];if(!baseline&&!spec){console.log(id+' awaiting proposal');continue;}
  const newBody=new Map(),newFall=new Map();
  if(!baseline){
    for(const [key,frame]of src)newBody.set(key,paint(spec,frame,f0));
    for(const [key,frame]of falls)newFall.set(key,paintFall(spec,frame,f0));
  }
  const choices=baseline?[[src,falls]]:[[src,falls],[newBody,newFall]];
  const cols=8, wide=cols*W, top=176, rows=3*(choices.length*H+15);
  const sheet=makeBuf(wide,top+rows+3);sheet.d.fill(neutral);
  label(sheet,HEROES[id].title+' / '+HEROES[id].name,8,4);
  choices.forEach(([living],j)=>{
    const x=8+j*284;
    label(sheet,(j?'REFINED':'ORIGINAL')+'   2x',x,20);
    copy(sheet,tile(living.get(p.idle[0]),info.body.anchor),x,34,2);
    copy(sheet,tile(living.get(p.idle[0]),info.body.anchor,true),x+170,91);
    label(sheet,'1x / left',x+177,148);
  });
  const step=p.walk.length;
  const phaseRows=[
    ['WALK   contact, pass, opposite contact, pass / right then left',Array.from({length:8},(_,i)=>p.walk[Math.floor((i%4)*step/4)]),false],
    ['STRIKE   start, release, recovery, moving release / right then left',[...p.strike,...p.strike],false],
    ['FALL   stumble, fall, ground, soul, dissolve, remains / mirrored remains', [...p.fall,p.fall.at(-1),p.fall[2]],true],
  ];
  phaseRows.forEach(([title,indexes,fall],row)=>{
    const y=top+row*(choices.length*H+15);label(sheet,title,3,y+1);
    choices.forEach(([living,fallen],j)=>indexes.forEach((key,i)=>{
      const anchor=fall?info.fallen.anchor:info.body.anchor,frame=(fall?fallen:living).get(key);
      copy(sheet,tile(frame,anchor,i>=(fall?6:4)),i*W,y+14+j*H);
    }));
  });
  const path=join(baseline?cache:out,id+'-poses.png');
  writePng(path,sheet);
  if(!baseline){
    const detail=makeBuf(2*W*3,H*3);detail.d.fill(neutral);
    choices.forEach(([live],i)=>copy(detail,tile(live.get(p.idle[0]),info.body.anchor),i*W*3,0,3));
    writePng(join(out,id+'-idle.png'),detail);
    const cycle=makeBuf(8*W,Math.ceil((p.walk.length+p.attack.length+2)/8)*(2*H+13));
    cycle.d.fill(neutral);
    const cycleFrames=[...p.walk,p.walk[0],...p.attack,p.attack[0]];
    cycleFrames.forEach((key,i)=>{
      const x=i%8*W,y=Math.floor(i/8)*(2*H+13);
      label(cycle,(i<=p.walk.length?'W':'A')+' '+key,x+1,y);
      choices.forEach(([live],j)=>copy(cycle,tile(live.get(key),info.body.anchor),x,y+12+j*H));
    });
    writePng(join(out,id+'-cycle.png'),cycle);
  }
  console.log(id+' '+path);
}
