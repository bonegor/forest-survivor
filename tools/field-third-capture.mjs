// node tools/field-third-capture.mjs HERO [design|motion]
// See tools/field-third-capture.md for sheet keys, clocks and native Canvas setup.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEROES } from '../public/js/data/heroes.js';

const [id, mode = 'both', extra] = process.argv.slice(2);
if (id === '--help' || !Object.hasOwn(HEROES, id) || !['both', 'design', 'motion'].includes(mode) || extra) {
  console.log('Usage: node tools/field-third-capture.mjs HERO [design|motion]\nHeroes: ' + Object.keys(HEROES).join(', '));
  process.exit(id === '--help' ? 0 : 2);
}
const require = createRequire(import.meta.url);
const bundledCanvas = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
let canvasPackage;
try { canvasPackage = require.resolve(process.env.CANVAS_MODULE || '@napi-rs/canvas'); }
catch (error) {
  if (process.env.CANVAS_MODULE || !existsSync(bundledCanvas)) throw error;
  canvasPackage = require.resolve(bundledCanvas);
}
const { createCanvas, GifEncoder } = require(canvasPackage);
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { FieldScene, FIELD_W, FIELD_H } = await import('../public/field-studio/field-scene.js');
const { prepareSprites, proposalSprite } = await import('../public/field-studio/runtime.js');
const { SPR } = await import('../public/js/engine/sprites.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
const { strikeClip } = await import('../public/js/game/hero-animation.js');
const { faceAlong } = await import('../public/js/game/facing.js');
const { input } = await import('../public/js/engine/input.js');

const output = fileURLToPath(new URL('../output/field-third/' + id + '/', import.meta.url));
mkdirSync(output, { recursive: true });
function save(name, bytes) {
  const dest = join(output, name), temp = dest + '.' + process.pid + '.tmp';
  writeFileSync(temp, bytes);
  renameSync(temp, dest);
}
function surface(width, height) {
  const ctx = createCanvas(width, height).getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#191d22';
  ctx.fillRect(0, 0, width, height);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#e2e1d2';
  return ctx;
}

prepareSprites();
Math.random = mulberry32(731);
const scene = new FieldScene(id, 'forest', false), g = scene.game, p = g.player;
const source = scene.original, key = p.hero.sprite;
const looks = { original: source, reforged: proposalSprite(id, 'reforged', source) };
if (mode !== 'motion') looks.refined = proposalSprite(id, 'refined', source);
// Materialize at least the first proposed frame before writing any evidence.
assert.ok(looks.reforged.frames[looks.reforged.idle[0]].buf);
const world = [p.x, p.y], groundX = Math.round((p.x - g.cam.x) * g.cam.S), groundY = Math.round((p.y - g.cam.y) * g.cam.S);
const round = x => Number(x.toFixed(5));
const fieldWidth = Math.min(FIELD_W, Math.max(94, ...Object.values(looks).map(s => s.fall.frames[0].w)));
const fieldCrop = { x: groundX - (fieldWidth >> 1), y: 0, w: fieldWidth, h: FIELD_H };
g.banners.length = 0;
// Measure the actual player clocks at this hero's normal travel speed.
p.moving = true; p.anim = 0; p.advanceAnimation(1, p.moveSpeed);
const walkUnits = p.anim;
p.moving = false; p.idleAnim = 0; p.advanceAnimation(1, 0);
const idleUnits = p.idleAnim;
const clockRates = s => ({ idle: idleUnits * s.idleRate, walk: walkUnits * 1.4 * s.motionRate, attack: s.attackFps });
const measured = new WeakMap();
function rawGeometry(frame) {
  if (measured.has(frame)) return measured.get(frame);
  const { w, h, d } = frame.buf;
  let x0 = w, x1 = -1, y0 = h, y1 = -1, count = 0, cx = 0, cy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!(d[y * w + x] >>> 24)) continue;
    count++; cx += x + .5; cy += y + .5;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = y;
  }
  const runs = [];
  if (count) for (let x = x0; x <= x1; x++) {
    if (!(d[y1 * w + x] >>> 24)) continue;
    const prev = runs.at(-1);
    if (prev && prev[1] === x) prev[1]++; else runs.push([x, x + 1]);
  }
  const data = { size:[w,h], ink:count, box:count ? [x0,y0,x1+1,y1+1] : null,
    centre:count ? [round(cx/count),round(cy/count)] : null, bottomRuns:runs };
  measured.set(frame, data);
  return data;
}

function phaseFrame(s, kind, phase, step) {
  if (kind === 'idle' || kind === 'walk' || kind === 'attack') return s[kind][phase];
  const mixed = s.attackWalk?.[phase];
  return mixed ? mixed[step] : s.floating ? s.attack[phase] : s.walk[step];
}
function living(s, kind, phase, step, face, dy=0) {
  SPR[key] = s;
  const rates = clockRates(s);
  const move = kind === 'walk' || kind === 'moving-attack', strike = kind === 'attack' || kind === 'moving-attack';
  const gaitTime = move ? ((kind === 'walk' ? phase : step) + .25) / rates.walk : 0;
  const idleTime = kind === 'idle' ? (phase + .25) / rates.idle : 0;
  const attackTime = strike ? (phase + .25) / rates.attack : 0;
  g.state = g.playState; g.deathT = undefined; g.time = 10 + (strike ? attackTime : move ? gaitTime : idleTime);
  p.dead = false; p.face = faceAlong(-face,face,dy); p.aim=Math.atan2(dy,face); p.moving = move; p.anim = p.idleAnim = 0;
  p.advanceAnimation(move ? gaitTime : idleTime, move ? gaitTime * p.moveSpeed : 0);
  p.strikeAt = null; scene.motion = strike ? 'strike' : kind;
  if (strike) p.strike(face < 0 ? Math.PI : 0, 10);
  g.draw(scene.ctx);
  const idx = phaseFrame(s, kind, phase, step), frame = s.frames[idx];
  const [x,y,w,h,selected,flipped] = p._rect;
  assert.equal(selected, frame, id + ' ' + kind + ' phase ' + phase + ' step ' + step);
  assert.equal(flipped, face < 0);
  assert.deepEqual([p.x,p.y], world);
  return { idx, frame, rect:[x,y,w,h], clock:round(g.time), gait:move ? round(gaitTime) : null,
    time:round(strike ? attackTime : move ? gaitTime : idleTime), manual:strike ? phase >= strikeClip(s).from : undefined };
}

// Find a representative time in the first interval for each actual source
// index. The source wisp may have poses beyond its shorter on-field duration.
function timings(clip, end, preferVisibleFrom = 0) {
  const found = new Map();
  let from = 0, previous = clip.frameAt(0);
  function add(until) {
    if (found.has(previous)) return;
    const start = preferVisibleFrom >= from && preferVisibleFrom < until ? preferVisibleFrom : from;
    found.set(previous, (start + until) / 2);
  }
  for (let ms = 1; ms <= Math.ceil(end * 1000); ms++) {
    const t = ms / 1000, next = clip.frameAt(t);
    if (previous === next) continue;
    add(t); previous = next; from = t;
  }
  if (!found.has(previous)) found.set(previous, from + .001);
  return Array.from({ length:clip.frames.length }, (_,i) => found.get(i) ?? null);
}

const soulCtx = surface(FIELD_W, FIELD_H);
const hudPosition = { rect:null, source:null };
const soulRecorder = {
  save:()=>soulCtx.save(), restore:()=>soulCtx.restore(),
  get globalAlpha(){return soulCtx.globalAlpha;}, set globalAlpha(a){soulCtx.globalAlpha=a;},
  drawImage(image,...args) {
    hudPosition.rect = args.length === 8 ? args.slice(4) : args.slice();
    hudPosition.source = args.length === 8 ? args.slice(0,4) : [0,0,image.width,image.height];
    soulCtx.drawImage(image,...args);
  },
};
function dying(s, kind, idx, ts, face) {
  SPR[key] = s;
  const fall = s.fall, wisp = fall.wisp, isSoul = kind === 'wisp';
  const frame = isSoul ? wisp.frames[idx] : fall.frames[idx];
  const t = ts === null ? null : isSoul ? wisp.release + ts : ts;
  p.dead = true; p.face = face; p.moving = p.walking = false; p.strikeAt = null;
  p.idleAnim = 0; scene.motion = 'fall'; g.state = 'dying';
  g.placePlayer(g.cam);
  const timing = g.deathTiming;
  let status = 'on field';
  if (t === null) status = 'asset only';
  else if (isSoul && ts >= g.soulDuration(wisp)) status = 'past soul duration';
  else if (t > timing.end) status = 'past results';
  else if (!isSoul && t < timing.flash) status = 'hit flash';
  g.deathT = t === null ? timing.end : Math.min(t, timing.end);
  g.time = 10 + g.deathT; g.draw(scene.ctx);
  soulCtx.clearRect(0,0,FIELD_W,FIELD_H); hudPosition.rect=hudPosition.source=null;
  if (wisp) g.hud.drawDepartingSoul(soulRecorder);
  scene.ctx.drawImage(soulCtx.canvas,0,0);
  assert.deepEqual([p.x,p.y],world);
  if (ts !== null) assert.equal((isSoul ? wisp : fall).frameAt(ts),idx);
  const density = s.hires || 1;
  const rect = isSoul ? hudPosition.rect : [groundX+Math.round(-frame.w/2/density), groundY+Math.round(-fall.anchorY/density),frame.w/density,frame.h/density];
  if(isSoul && status==='on field' && !rect)status='masked by ground';
  if (isSoul && status === 'on field' && !boxAt(frame, rect, face, hudPosition.source)) status = 'off camera';
  return { idx, frame, rect, time:t===null?null:round(t), age:isSoul&&ts!==null?round(ts):undefined,
    sourceRect:isSoul?hudPosition.source:null, clock:round(g.time), status, sourceOnly:status!=='on field' };
}

function drawTile(ctx, x, y, crop, scale, registration) {
  ctx.drawImage(scene.canvas,crop.x,crop.y,crop.w,crop.h,x,y,crop.w*scale,crop.h*scale);
  if (!registration) return;
  const gy=y+(groundY-crop.y)*scale, gx=x+(groundX-crop.x)*scale;
  ctx.fillStyle='#87d9c9';
  ctx.fillRect(x,gy,4,1);ctx.fillRect(x+crop.w*scale-4,gy,4,1);
  ctx.fillRect(gx,y+crop.h*scale-3,1,3);ctx.fillStyle='#e2e1d2';
}
function boxAt(frame, rect, face, sourceRect) {
  const geo=rawGeometry(frame), b=geo.box;
  if (!b || !rect) return null;
  const [x,y,w,h]=rect,[ox,oy,sw,sh]=sourceRect||[0,0,frame.w,frame.h],sx=w/sw,sy=h/sh;
  const left=Math.max(ox,face<0?frame.w-b[2]:b[0]),right=Math.min(ox+sw,face<0?frame.w-b[0]:b[2]);
  const top=Math.max(oy,b[1]),bottom=Math.min(oy+sh,b[3]);
  if(left>=right||top>=bottom)return null;
  const clippedLeft = Math.max(0, x + (left-ox)*sx), clippedRight = Math.min(FIELD_W, x + (right-ox)*sx);
  const clippedTop = Math.max(0, y + (top-oy)*sy), clippedBottom = Math.min(FIELD_H, y + (bottom-oy)*sy);
  if (clippedLeft >= clippedRight || clippedTop >= clippedBottom) return null;
  return [clippedLeft-groundX, clippedTop-groundY, clippedRight-groundX, clippedBottom-groundY].map(round);
}
function report() {
  return {hero:id,proposal:'reforged',map:'forest',seed:731,worldAnchor:world,screenAnchor:[groundX,groundY],
    viewport:[FIELD_W,FIELD_H],canvas:canvasPackage,images:[],frames:[],geometry:{}};
}
// Ink spanning the last world-pixel row before the ground. This deliberately
// includes a resting staff or coat; the reviewer identifies which runs are boots.
function groundSpans(frame, rect, face) {
  const [x,y,w,h]=rect, row=Math.floor((groundY-.5-y)/h*frame.h);
  if(row<0||row>=frame.h)return [];
  const spans=[];
  for(let col=0;col<frame.w;col++){
    const sourceX=face<0?frame.w-1-col:col;
    if((frame.buf.d[row*frame.w+sourceX]>>>24)<128)continue;
    const start=round(x+col*w/frame.w-groundX),end=round(x+(col+1)*w/frame.w-groundX);
    const prev=spans.at(-1);if(prev&&prev[1]===start)prev[1]=end;else spans.push([start,end]);
  }
  return spans;
}
function addRecord(log, clip, phase, step, face, sample, sheet, slot, pose) {
  const key=clip==='wisp'?'wisp':clip==='fall'||clip==='remains'?'fall':'living';
  const code=key+'-'+sample.idx;
  log.geometry[code]??=rawGeometry(sample.frame);
  log.frames.push({sheet,slot,clip,phase,step,face,geometry:code,frameIndex:sample.idx,
    seconds:sample.time,gameClock:sample.clock,gaitSeconds:sample.gait,soulAge:sample.age,
    transition:pose.label,travel:pose.dy===undefined?undefined:[face,pose.dy],manualStrike:sample.manual,visibility:sample.status,
    groundSpans:key==='living'?groundSpans(sample.frame,sample.rect,face):undefined,
    sceneInkBox:sample.sourceOnly?null:boxAt(sample.frame,sample.rect,face,sample.sourceRect)});
}

function design() {
  const log=report(), order=['original','refined','reforged'], rowH=138, colW=3*fieldCrop.w+12;
  const ctx=surface(3*colW,30+5*rowH);
  order.forEach((look,col)=>ctx.fillText(HEROES[id].title+' / '+look,col*colW+5,17));
  const kinds=['idle','walk','attack','fall','remains'];
  for(const [row,kind] of kinds.entries()) for(const [col,look] of order.entries()) {
    const s=looks[look], phase=kind==='attack'?strikeClip(s).hit:kind==='walk'?Math.floor(s.walk.length/4):0;
    const y=30+row*rowH,x=col*colW+4;
    ctx.fillText(kind+(kind==='attack'?' / release':''),x,y+11);
    for(const face of [1,-1]){
      let result;
      if(kind==='fall'||kind==='remains'){
        SPR[key]=s;
        const t=kind==='fall'?.78:g.deathTiming.end-.002;
        result=dying(s,kind,s.fall.frameAt(t),t,face);
      }else result=living(s,kind,phase,0,face);
      // An enlarged frontal pose and a native mirrored pose, both ground-aligned.
      const tCrop={x:groundX-fieldCrop.w/2,y:groundY-49,w:fieldCrop.w,h:58};
      const sc=face===1?2:1;
      drawTile(ctx,face===1?x:x+fieldCrop.w*2+3,y+15+(2-sc)*49,tCrop,sc,true);
      log.frames.push({look,clip:kind,phase,face,frameIndex:result.idx,seconds:result.time,
        sceneInkBox:boxAt(result.frame,result.rect,face)});
    }
  }
  save('design.png',ctx.canvas.toBuffer('image/png'));
  const style = readFileSync(new URL('../reviews/media/2026-11-27-hero-style.png',import.meta.url));
  save('style-reference.png',style);
  log.styleReference = { sha256:createHash('sha256').update(style).digest('hex'), originals:['mage','knight'],
    purpose:'pixel finish and readability; retain each hero’s own original proportions' };
  log.images.push('design.png','style-reference.png');save('design.json',JSON.stringify(log,null,2));
}

// A continuously advancing run also shows the feet against travelling terrain.
// The other plates pin the camera and player to make sub-pixel registration comparable.
function travel(log) {
  const hz=60,fps=15,total=240,diag=Math.SQRT1_2,oldInput=input.bot;
  const film=new GifEncoder(FIELD_W,FIELD_H,{repeat:0,quality:20});
  const strip=surface(6*94,19+4*76);
  strip.fillText(HEROES[id].title+' / continuous Darkwood travel, ordered in time / distance in world pixels',4,13);
  g.state=g.playState;g.deathT=undefined;g.time=0;
  p.dead=false;p.strikeAt=null;p.anim=p.idleAnim=p.vx=p.vy=0;
  [p.x,p.y]=world;g.syncCam();g.snapCam();scene.motion='walk';
  let distance=0,travelFrame=0;
  const samples=[];
  try {
    for(let tick=0;tick<total;tick++){
      input.bot=tick<88?{x:diag,y:diag}:tick<176?{x:-diag,y:-diag}:tick<217?{x:1,y:0}:{x:0,y:0};
      const x=p.x,y=p.y;g.update(1/hz);distance+=Math.hypot(p.x-x,p.y-y);
      if(tick%4 && tick%10)continue;
      g.draw(scene.ctx);
      const [sx,sy,w,h,frame,flip]=p._rect;
      assert.ok(looks.reforged.frames.includes(frame));
      if(tick%4===0){
        const rgba=scene.ctx.getImageData(0,0,FIELD_W,FIELD_H).data;
        const delay=10*(Math.round((travelFrame+1)*100/fps)-Math.round(travelFrame*100/fps));
        film.addFrame(Buffer.from(rgba.buffer,rgba.byteOffset,rgba.byteLength),FIELD_W,FIELD_H,{delay});
        travelFrame++;
      }
      if(tick%10===0){
        const i=tick/10,dx=(i%6)*94,dy=19+Math.floor(i/6)*76;
        const groundX=Math.round((p.x-g.cam.x)*g.cam.S),groundY=Math.round((p.y-g.cam.y)*g.cam.S);
        strip.fillText((tick/hz).toFixed(2)+'s · '+Math.round(distance)+'px',dx+2,dy+11);
        strip.drawImage(scene.canvas,groundX-46,groundY-48,92,60,dx,dy+14,92,60);
        samples.push({tick,x:round(p.x),y:round(p.y),frame:looks.reforged.frames.indexOf(frame),face:flip?-1:1,screen:[sx,sy,w,h]});
      }
    }
    assert.ok(distance>20,'Expected actual player travel on Darkwood');
    save('travel.gif',film.finish());
    save('motion-travel.png',strip.canvas.toBuffer('image/png'));
    log.images.push('motion-travel.png');
    log.travel={recording:'travel.gif',simulationHz:hz,recordingFps:fps,frames:travelFrame,worldDistance:round(distance),samples};
  } finally { input.bot=oldInput;film.dispose(); }
}

function motion(){
  const s=looks.reforged,log=report();
  SPR[key]=s;
  log.rates=clockRates(s);log.spriteAnchorY=s.anchorY;
  log.fallAnchorY=s.fall.anchorY;log.soulAnchorY=s.fall.wisp?.anchorY;log.death=g.deathTiming;
  const maxTime=Math.max(9,log.death.end+1);
  const falls=timings(s.fall,maxTime,log.death.flash);
  const soul=s.fall.wisp, souls=soul?timings(soul,Math.max(9,g.soulDuration(soul)+1)): [];
  function captureClip(kind,poses){
    if(!poses.length)return;
    const isSoul=kind==='wisp', isFall=kind==='fall'||kind==='remains', inset=isSoul||isFall;
    const crop=isSoul?{x:0,y:0,w:FIELD_W,h:FIELD_H}:fieldCrop;
    const cellW=crop.w+2, extra=inset?(isSoul?soul:s.fall).frames.reduce((n,f)=>Math.max(n,f.h),0)+3:0;
    const cellH=crop.h+extra+15,cols=isSoul?4:8,perPage=cols*(inset?4:6);
    let page,ctx,sheet;
    for(let i=0;i<poses.length*2;i++){
      const start=i%perPage===0,slot=i%perPage,face=i%2?-1:1,pose=poses[Math.floor(i/2)];
      if(start){
        page=Math.floor(i/perPage)+1;sheet='motion-'+kind+'-'+String(page).padStart(2,'0')+'.png';
        const rows=Math.ceil(Math.min(poses.length*2-i,perPage)/cols);
        ctx=surface(cols*cellW,19+rows*cellH);ctx.fillText(HEROES[id].title+' / '+kind+' / reforged    R L per pose    cyan ticks = fixed ground anchor',4,13);
      }
      const {phase,step=0,time=null}=pose;
      const result=inset?dying(s,kind,phase,time,face):living(s,pose.motion||kind,phase,step,face,pose.dy);
      const x=(slot%cols)*cellW,y=19+Math.floor(slot/cols)*cellH;
      const title=(face===1?'R ':'L ')+(pose.label||phase)+(kind==='moving-attack'?'·'+step:'')+' #'+result.idx;
      ctx.fillText(title,x+2,y+11);
      drawTile(ctx,x,y+13,crop,1,true);
      if(inset){
        const f=result.frame,pin=isSoul?soul.anchorY:s.fall.anchorY,top=y+13+crop.h+1;
        const dx=x+Math.floor((crop.w-f.w)/2);ctx.drawImage(f.get(face<0),dx,top);
        ctx.fillStyle='#87d9c9';ctx.fillRect(x,top+pin,4,1);ctx.fillStyle='#e2e1d2';
        if(result.sourceOnly)ctx.fillText(result.status,x+2,y+crop.h+extra+11);
      }
      addRecord(log,kind,phase,pose.step,face,result,sheet,slot,pose);
      if(slot===perPage-1||i===poses.length*2-1){save(sheet,ctx.canvas.toBuffer('image/png'));log.images.push(sheet);}
    }
  }
  for(const kind of ['idle','walk','attack'])captureClip(kind,s[kind].map((_,phase)=>({phase})));
  const matrix=[];
  for(let phase=0;phase<s.attack.length;phase++)for(let step=0;step<(s.attackWalk?.[phase]?.length||s.walk.length);step++)matrix.push({phase,step});
  captureClip('moving-attack',matrix);
  const {from,hit}=strikeClip(s);
  const anticipation=s.attack.slice(0,hit).findLastIndex(frame=>frame!==s.attack[hit]);
  const strikeStart=[];
  if(anticipation>=0) strikeStart.push({motion:'attack',phase:anticipation,label:anticipation===from?'windup/start':'windup'});
  if(from!==anticipation && from!==hit) strikeStart.push({motion:'attack',phase:from,label:'manual start'});
  strikeStart.push({motion:'attack',phase:hit,label:from===hit?'start/release':'release'});
  captureClip('transitions',[
    {motion:'idle',phase:s.idle.length-1,label:'idle end'},{motion:'idle',phase:0,label:'idle start'},
    {motion:'walk',phase:0,label:'walk start'},{motion:'walk',phase:s.walk.length-1,label:'walk end'},
    {motion:'walk',phase:0,label:'restart'},{motion:'walk',phase:0,dy:-1,label:'up diag'},
    {motion:'walk',phase:Math.floor(s.walk.length/2),dy:1,label:'down diag'},
    ...strikeStart,
    {motion:'attack',phase:s.attack.length-1,label:'recover'},{motion:'idle',phase:0,label:'to idle'},
  ]);
  function timeOrder(times) {
    return times.map((time, phase) => ({ phase, time }))
      .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  }
  captureClip('fall',timeOrder(falls));
  captureClip('wisp',timeOrder(souls));
  const end=log.death.end-.002;
  const held=s.fall.frameAt(end);
  const holdStart=falls[held];
  const remains=[];
  if (holdStart !== null && holdStart < end-.002) {
    remains.push({phase:held,time:holdStart,label:'held'});
  }
  remains.push({phase:held,time:end,label:'final'});
  captureClip('remains',remains);
  log.counts=Object.fromEntries(['idle','walk','attack','moving-attack','transitions','fall','wisp','remains'].map(kind=>[kind,log.frames.filter(f=>f.clip===kind).length]));
  travel(log);
  save('motion.json',JSON.stringify(log,null,2));
  console.log(id+' motion: '+log.frames.length+' facing/pose samples across '+log.images.length+' sheets');
}
try {
  if(mode!=='motion'){design();console.log(id+' design: '+join(output,'design.png'));}
  if(mode!=='design')motion();
}finally{SPR[key]=source;}
