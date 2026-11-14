// Actual seeded crypt / merchantAI / Enemy frame selection and renderer.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {buildSprites}=await import('../../public/js/engine/sprites.js');
const {Game}=await import('../../public/js/game/game.js');
const {Dungeon,cryptHasEaNasir}=await import('../../public/js/game/dungeon.js');
const {defaultProfile,metaBonuses}=await import('../../public/js/shared/profile.js');
const {view}=await import('../../public/js/engine/view.js');
const {input}=await import('../../public/js/engine/input.js');
const {mulberry32}=await import('../../public/js/engine/util.js');
buildSprites();
const root='output/hero-round2-2026-11-14/eanasir-art/boss',W=360,H=240,S=2.4,PW=W*S,PH=H*S;
mkdirSync(root+'/frames',{recursive:true});
const canvas=createCanvas(PW,PH),ctx=canvas.getContext('2d'),ui=createCanvas(PW,PH),uctx=ui.getContext('2d');ctx.imageSmoothingEnabled=uctx.imageSmoothingEnabled=false;
Object.assign(view,{canvas,ctx,ui,uctx,S,W,H,pxW:PW,pxH:PH,zoom:1});
const oldRandom=Math.random,oldBot=input.bot,profile=defaultProfile(),before=JSON.stringify(profile),report=[],contact=createCanvas(PW*3,PH*2),cc=contact.getContext('2d');let sample=0,stage=0;
try{for(const face of [-1,1])for(const kind of ['whip','magic','pqc']){
 Math.random=mulberry32(20261115);input.bot={x:0,y:0};
 const g=new Game({hero:'knight',mode:'s15',map:'forest',diff:'easy',meta:metaBonuses(profile),settings:{numbers:false,softFlash:true,weather:false},crypts:false});
 g.spawner.update=()=>{};g.weather=null;g.banners.length=0;g.enemies=[];g.pickups=[];g.effects=[];g.player.weapons=[];g.player.devGod=true;g.player.ultLocked=true;
 const seed=Array.from({length:200},(_,i)=>i).find(i=>cryptHasEaNasir(i,g.player.id));
 g.inCrypt={key:'source-review',depth:1,hp:g.player.hp,minute:0};new Dungeon(g,1,seed,{name:'The Copper Crypt',theme:'crypt',lords:2});
 const e=g.enemies.find(e=>e.type==='eanasir');if(!e)throw Error('No seeded merchant');for(const other of g.enemies)if(other!==e)other.dead=true;
 e.sleeping=e.dormant=false;e.aware=true;e.spawnT=0;e.spd=0;e.state='move';e.cdT=e.cd2=e.cd3=99;e[kind==='whip'?'cdT':kind==='magic'?'cd2':'cd3']=0;
 g.player.x=e.x+face*40;g.player.y=e.y;g.player.face=-face;g.syncCam();g.snapCam();
 if(!g.world.lineOfSight(e.x,e.y,g.player.x,g.player.y))throw Error('Review positions are not visible');
 const seen=new Set(),effects=new Set();let release=false,contactSaved=false;
 for(let f=0;f<84;f++){
  g.update(1/60);seen.add(e.frameIndex());for(const fx of g.effects)effects.add(fx.constructor.name);for(const shot of g.eshots)effects.add(shot.kind);
  if(e.data.releasedAt!=null)release=true;
  if(f%3)continue;g.draw(ctx);writeFileSync(root+'/frames/'+String(sample++).padStart(4,'0')+'.png',canvas.toBuffer('image/png'));
  if(!contactSaved&&e.data.releasedAt!=null&&e.life-e.data.releasedAt<.06){cc.drawImage(canvas,stage%3*PW,Math.floor(stage/3)*PH);writeFileSync(root+'/'+kind+'-'+(face<0?'left':'right')+'-release.png',canvas.toBuffer('image/png'));contactSaved=true;}
 }
 if(!release||e.data.attack!==kind||e.face!==face)throw Error('Wrong merchant state '+kind+'/'+face);
 report.push({face,kind,seed,frames:[...seen],effects:[...effects],release,contactSaved,sourceDensity:e.spr.hires,logicalBody:e.spr.body.map(n=>n/e.spr.hires)});stage++;
 console.log('Merchant',kind,face,'release captured');
}}finally{Math.random=oldRandom;input.bot=oldBot;}
if(JSON.stringify(profile)!==before)throw Error('Changed review profile');
writeFileSync(root+'/release-contact.png',contact.toBuffer('image/png'));writeFileSync(root+'/coverage.json',JSON.stringify({fps:20,frames:sample,displayScale:S,scenes:report,profileUnchanged:true},null,2));
