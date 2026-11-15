// Production HeroScreen at small and desktop logical viewports, in memory only.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {buildSprites}=await import('../../public/js/engine/sprites.js');
const {defaultProfile}=await import('../../public/js/shared/profile.js');
const {HeroScreen}=await import('../../public/js/ui/hero-selection.js');
const {MenuScene}=await import('../../public/js/ui/background.js');
const {UI}=await import('../../public/js/ui/ui.js');
const {input}=await import('../../public/js/engine/input.js');
const {view}=await import('../../public/js/engine/view.js');
buildSprites();
const out=process.env.REVIEW_OUT||'output/style-match/selection';
mkdirSync(out,{recursive:true});input.mouse.x=input.mouse.y=-1;
for(const id of ['archer','berserker','eanasir'])for(const [w,h] of [[640,420],[480,270]]){
 const canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),ui=createCanvas(w,h),uctx=ui.getContext('2d');
 ctx.imageSmoothingEnabled=uctx.imageSmoothingEnabled=false;
 Object.assign(view,{canvas,ctx,ui,uctx,S:1,W:w,H:h,pxW:w,pxH:h,zoom:1});
 const profile=defaultProfile();if(!profile.heroes.includes(id))profile.heroes.push(id);
 const before=JSON.stringify(profile),app={ui:new UI(),store:{profile},settings:{diff:'easy'},choice:{hero:id},scene:new MenuScene(),go(){}};
 const screen=new HeroScreen();screen.enter(app);
 for(let i=0;i<45;i++)screen.draw(ctx,w,h,1/60);
 writeFileSync(`${out}/${id}-${w}.png`,canvas.toBuffer('image/png'));
 if(JSON.stringify(profile)!==before)throw Error(`${id}: preview changed its in-memory profile`);
}
console.log(`Six production HeroScreen views captured: ${out}`);
