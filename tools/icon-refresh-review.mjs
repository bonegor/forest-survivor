// Production Armory and sprite-renderer evidence; never reads or writes a save.
// CANVAS_MODULE may point at an installed @napi-rs/canvas package.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {buildSprites,SPR}=await import('../public/js/engine/sprites.js');
const {ArmoryScreen,CodexScreen}=await import('../public/js/ui/screens.js');
const {UI}=await import('../public/js/ui/ui.js');
const {MenuScene}=await import('../public/js/ui/background.js');
const {defaultProfile,openEverything}=await import('../public/js/shared/profile.js');
const {input}=await import('../public/js/engine/input.js');
const {view}=await import('../public/js/engine/view.js');
const {PASSIVES}=await import('../public/js/data/passives.js');
buildSprites();
const tag=process.argv[2]||'after',out=`output/icon-refresh/${tag}`;
mkdirSync(out,{recursive:true});input.mouse.x=input.mouse.y=-1;
const base=openEverything(defaultProfile());base.gold=10000;
for(const [W,H]of [[640,420],[480,270]])for(const focus of ['phoenix','banish']){
 const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 Object.assign(view,{W,H,canvas,ctx,ui:canvas,uctx:ctx,S:1,pxW:W,pxH:H,zoom:1});
 const profile=structuredClone(base),before=JSON.stringify(profile);
 const app={ui:new UI(),store:{profile},scene:new MenuScene(),settings:{},choice:{hero:'knight'},go(){}};
 const screen=new ArmoryScreen();screen.enter(app,{focus});
 for(let i=0;i<3;i++)screen.draw(ctx,W,H,.1);
 writeFileSync(`${out}/armory-${focus}-${W}.png`,canvas.toBuffer('image/png'));
 if(JSON.stringify(profile)!==before)throw Error('Armory capture changed its disposable profile');
}
// Codex uses the relic definition shared by cards, pause slots and the HUD.
{
 const W=640,H=420,canvas=createCanvas(W,H),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 Object.assign(view,{W,H,canvas,ctx,ui:canvas,uctx:ctx,S:1,pxW:W,pxH:H,zoom:1});
 const profile=structuredClone(base),before=JSON.stringify(profile);
 const app={ui:new UI(),store:{profile},scene:new MenuScene(),settings:{},choice:{hero:'knight'},go(){}};
 const screen=new CodexScreen();screen.enter(app);
 screen.tab='relic';app.ui.focusId='cx_relic_phoenix';
 for(let i=0;i<3;i++)screen.draw(ctx,W,H,.1);
 writeFileSync(`${out}/codex-phoenix.png`,canvas.toBuffer('image/png'));
 if(JSON.stringify(profile)!==before)throw Error('Codex capture changed its disposable profile');
}
const icons=[['Phoenix Heart',PASSIVES.phoenix.icon],['Exile',SPR.i_banish?'i_banish':'i_reroll'],['Revival','i_revival'],['Insight','i_reroll'],['Ember Heart','i_ember']];
const board=createCanvas(700,230),ctx=board.getContext('2d');ctx.imageSmoothingEnabled=false;
ctx.fillStyle='#15131f';ctx.fillRect(0,0,board.width,board.height);ctx.font='15px sans-serif';
icons.forEach(([label,id],i)=>{
 const f=SPR[id].frames[0],x=i*140;
 ctx.fillStyle='#ead4aa';ctx.fillText(label,x+8,24);
 ctx.drawImage(f.c,x+54,40);ctx.drawImage(f.c,x+24,78,96,96);
 ctx.fillStyle='#8b9bb4';ctx.font='12px sans-serif';ctx.fillText(id,x+10,200);ctx.font='15px sans-serif';
});
writeFileSync(`${out}/icons.png`,board.toBuffer('image/png'));
console.log(`Production icon and Armory captures: ${out}`);
