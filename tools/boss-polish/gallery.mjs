// A contact gallery made from actual Game draws, not a replacement renderer.
import{createRequire}from'node:module';
import{mkdirSync,writeFileSync}from'node:fs';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const[{buildSprites},{Game},{defaultProfile,metaBonuses},{view},{input},{mulberry32},{makeBossScene,BOSS_IDS}]=await Promise.all([
 import('../../public/js/engine/sprites.js'),import('../../public/js/game/game.js'),import('../../public/js/shared/profile.js'),
 import('../../public/js/engine/view.js'),import('../../public/js/engine/input.js'),import('../../public/js/engine/util.js'),import('../hero-round2-review/boss-scene.js')]);
buildSprites();
const world=createCanvas(960,600),ctx=world.getContext('2d'),ui=createCanvas(960,600),cardW=384,cardH=356,board=createCanvas(cardW*4,cardH*2+72),bc=board.getContext('2d');
ctx.imageSmoothingEnabled=bc.imageSmoothingEnabled=false;
Object.assign(view,{canvas:world,ctx,ui,uctx:ui.getContext('2d'),S:2.4,W:400,H:250,pxW:960,pxH:600,zoom:1});
bc.fillStyle='#10191e';bc.fillRect(0,0,board.width,board.height);bc.fillStyle='#efdfb8';bc.font='28px Georgia';bc.fillText('Forest Survivor · Eight bosses',22,34);bc.font='14px sans-serif';bc.fillStyle='#b7c2c7';bc.fillText(`${process.env.BOSS_GALLERY_LABEL||'Updated art'} in the real game · original combat timing and sprite dimensions`,22,58);
const names={boneking:'Ossarian · Bone King',butcher:'Grimgut · Butcher',lich:'Malgrath · Lich',demonlord:'Azgaroth · Demon Lord',pharaoh:'Pharaoh',frostgiant:'Frost Giant',thornqueen:'Thorn Queen',pitlord:'Pit Lord'};
const out=process.env.BOSS_GALLERY_OUT||'output/boss-polish/final';mkdirSync(out,{recursive:true});
for(const[idIndex,id]of BOSS_IDS.entries()){
 Math.random=mulberry32(7127);const scene=makeBossScene({Game,defaultProfile,metaBonuses,input},id);scene.tick(1/60);scene.draw(ctx);
 const x=(scene.e.x-scene.g.cam.x)*2.4,y=(scene.e.y-scene.g.cam.y)*2.4,ox=idIndex%4*cardW,oy=72+Math.floor(idIndex/4)*cardH;
 bc.fillStyle='#1b2830';bc.fillRect(ox+4,oy+4,cardW-8,cardH-8);bc.fillStyle='#ead8ad';bc.font='18px Georgia';bc.fillText(names[id],ox+15,oy+29);
 const png=world.toBuffer('image/png');writeFileSync(`${out}/${id}-world.png`,png);
 // Freeze each source: native Canvas may defer drawing a reused canvas.
 bc.drawImage(await loadImage(png),x-155,y-235,400,320,ox+8,oy+40,368,294.4);
}
writeFileSync(`${out}/eight-bosses.png`,board.toBuffer('image/png'));console.log(`${out}/eight-bosses.png`);
