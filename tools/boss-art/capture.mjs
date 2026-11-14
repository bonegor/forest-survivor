import{createRequire}from'node:module';import{mkdirSync,writeFileSync}from'node:fs';import{spawnSync}from'node:child_process';
const require=createRequire(import.meta.url),canvasPath=process.env.CANVAS_MODULE||'@napi-rs/canvas',{createCanvas}=require(canvasPath);globalThis.document={createElement:()=>createCanvas(1,1)};
const{buildSprites}=await import('../../public/js/engine/sprites.js'),{Game}=await import('../../public/js/game/game.js'),{defaultProfile,metaBonuses}=await import('../../public/js/shared/profile.js'),{view}=await import('../../public/js/engine/view.js'),{input}=await import('../../public/js/engine/input.js'),{mulberry32}=await import('../../public/js/engine/util.js'),{makeBossScene,BOSS_IDS}=await import('../hero-round2-review/boss-scene.js');
buildSprites();const c=createCanvas(960,600),ctx=c.getContext('2d'),ui=createCanvas(960,600),crop=createCanvas(400,320),cc=crop.getContext('2d');ctx.imageSmoothingEnabled=cc.imageSmoothingEnabled=false;Object.assign(view,{canvas:c,ctx,ui,uctx:ui.getContext('2d'),S:2.4,W:400,H:250,pxW:960,pxH:600,zoom:1});
const chosen=process.argv.filter(s=>BOSS_IDS.includes(s)),out='output/hero-round2-2026-11-14/bosses';
for(const id of chosen.length?chosen:BOSS_IDS){
 Math.random=mulberry32(7127);const scene=makeBossScene({Game,defaultProfile,metaBonuses,input},id),dir=`${out}/${id}-runtime`;mkdirSync(dir,{recursive:true});const records=[],seen=new Set,contact=createCanvas(1600,960),cg=contact.getContext('2d');cg.fillStyle='#17201b';cg.fillRect(0,0,1600,960);let captures=0;
 for(let tick=0;tick<30*60;tick++){
  scene.tick(1/60);seen.add(scene.e.frameIndex());if(tick%4)continue;scene.draw(ctx);const e=scene.e,S=2.4,x=(e.x-scene.g.cam.x)*S,y=(e.y-scene.g.cam.y)*S;cc.clearRect(0,0,400,320);cc.drawImage(c,x-100,y-135,200,160,0,0,400,320);cc.fillStyle='#ead4aa';cc.font='14px monospace';cc.fillText(`${id} ${scene.label} ${scene.time.toFixed(2)}s`,8,20);cc.fillText(`${e.state} / ${e.pose||'–'} / ${e.frameIndex()}`,8,39);
  const file=String(captures).padStart(4,'0');writeFileSync(`${dir}/${file}.png`,crop.toBuffer('image/png'));records.push(scene.record());
  if(tick%180===0||tick===420||tick===600){const n=Math.min(11,Math.floor(tick/180));cg.putImageData(cc.getImageData(0,0,400,320),(n%4)*400,Math.floor(n/4)*320);writeFileSync(`${out}/${id}-game-${file}.png`,c.toBuffer('image/png'));}captures++;
 }
 writeFileSync(`${out}/${id}-runtime-contact.png`,contact.toBuffer('image/png'));writeFileSync(`${out}/${id}-runtime.json`,JSON.stringify({seconds:30,seen:[...seen],records},null,2));
 const ff=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','15','-i',`${dir}/%04d.png`,'-filter_complex','[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=none','-loop','0',`${out}/${id}-game.gif`],{encoding:'utf8',windowsHide:true});if(ff.status!==0)throw Error(ff.stderr||'ffmpeg failed');
 console.log(id,captures,'captures',seen.size,'source frames',`scale ${scene.e.scale}, drawScale ${scene.e.drawScale}, hr ${scene.e.hr}`);
}
