// One real Darkwood Game, camera, actors and light rig are shared by the whole
// review. CANVAS_MODULE may point to an existing @napi-rs/canvas install.
// node tools/field-refined-capture.mjs [changed hero ids...]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {prepareSprites}=await import('../public/field-studio/runtime.js');
const {FieldScene}=await import('../public/field-studio/field-scene.js');
const {HERO_ORDER,HEROES}=await import('../public/js/data/heroes.js');
const {SPR}=await import('../public/js/engine/sprites.js');
const {mulberry32}=await import('../public/js/engine/util.js');
const out=fileURLToPath(new URL('../output/field-refined',import.meta.url));
mkdirSync(out,{recursive:true});
prepareSprites();
Math.random=mulberry32(731);
const scene=new FieldScene('mage','forest',false),g=scene.game,p=g.player;
g.banners.length=0;
const W=80,H=57, target=createCanvas(196,80);
const args=process.argv.slice(2),ids=args.length?args:HERO_ORDER;
let group=[],groupN=0;
function saveGroup(){
  const w=4*W*2,h=group.length*(H+15),c=createCanvas(w,h),ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#151b1e';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e7decb';ctx.font='12px sans-serif';
  group.forEach(({id,shots},i)=>{
    const y=i*(H+15);ctx.fillText(HEROES[id].title+'  /  Original, refined    ·    idle, walk, strike, remains',4,y+12);
    shots.forEach(({image,look,phase})=>ctx.drawImage(image,phase*W*2+look*W,y+15,W,H));
  });
  writeFileSync(join(out,'field-'+(args.length?ids[0]+'-':'')+(++groupN)+'.png'),c.toBuffer('image/png'));
  group=[];
}
for(const id of ids){
  scene.hero=id;p.hero=HEROES[id];p.id=id;scene.original=SPR[p.hero.sprite];scene.variants.clear();
  const s=scene.original,heroBoard=createCanvas(2*W*2,5*(H*3+15)),board=heroBoard.getContext('2d');
  board.imageSmoothingEnabled=false;board.fillStyle='#171a20';board.fillRect(0,0,heroBoard.width,heroBoard.height);
  board.fillStyle='#eee3c7';board.font='12px sans-serif';
  const shots=[];
  for(const [row,motion]of ['idle','walk','strike','fall','remains'].entries()){
    board.fillText(HEROES[id].title+' / '+motion+'     Original   Refined',5,row*(3*H+15)+12);
    for(const [faceIndex,face]of [1,-1].entries()){
      p.face=face;scene.motion=motion;
      p.moving=p.walking=motion==='walk';p.anim=2.1/(1.4*s.motionRate);p.idleAnim=0;
      p.dead=motion==='fall'||motion==='remains';g.deathT=motion==='fall'?.78:9;
      g.time=5;p.strikeAt=motion==='strike'?g.time-((s.attackRelease??0)+.2)/s.attackFps:null;
      p.strikeAng=face<0?Math.PI:0;
      for(const [lookIndex,look]of ['original','refined'].entries()){
        if(p.dead)p._rect=[0,0,0,0,null,face<0];
        scene.paint(target,look);
        const px=Math.round((p.x-g.cam.x)*g.cam.S),py=Math.round((p.y-g.cam.y)*g.cam.S);
        const pic=createCanvas(W,H),cx=pic.getContext('2d');cx.drawImage(target,px-W/2,py-46,W,H,0,0,W,H);
        board.drawImage(pic,(lookIndex+faceIndex*2)*W,row*(3*H+15)+15);
        if(faceIndex===0){
          board.drawImage(pic,lookIndex*W*2,row*(3*H+15)+15+H,2*W,2*H);
          if(row<3||row===4)shots.push({image:pic,look:lookIndex,phase:row===4?3:row});
        }
        if(!p.dead && (p._rect[5]!== (face<0)||p._rect[4]!==scene.variants.get(look).frames[
          motion==='strike'?s.attack[s.attackRelease??0]:motion==='walk'?s.walk[Math.floor(p.anim*1.4*s.motionRate)%s.walk.length]:s.idle[0]
        ]))throw Error(id+' selected wrong '+motion+' frame or facing');
      }
    }
  }
  writeFileSync(join(out,id+'-field.png'),heroBoard.toBuffer('image/png'));
  group.push({id,shots});
  if(group.length===4)saveGroup();
}
if(group.length)saveGroup();
