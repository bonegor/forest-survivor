import{makeBossScene}from'/boss-scene.js';
window.addEventListener('error',e=>document.querySelector('#status').textContent=`Preview error: ${e.message}`);
window.addEventListener('unhandledrejection',e=>document.querySelector('#status').textContent=`Preview error: ${e.reason?.message||e.reason}`);
const q=new URLSearchParams(location.search),variant=q.get('variant')==='before'?'before':'after',prefix=`/${variant}/js`;
const[{buildSprites},{Game},{defaultProfile,metaBonuses},{input},{view},{mulberry32}]=await Promise.all([import(`${prefix}/engine/sprites.js`),import(`${prefix}/game/game.js`),import(`${prefix}/shared/profile.js`),import(`${prefix}/engine/input.js`),import(`${prefix}/engine/view.js`),import(`${prefix}/engine/util.js`)]);
buildSprites();
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d'),detail=document.querySelector('#detail'),dc=detail.getContext('2d'),ui=document.createElement('canvas');ui.width=960;ui.height=600;
Object.assign(view,{canvas,ctx,ui,uctx:ui.getContext('2d'),S:2.4,W:400,H:250,pxW:960,pxH:600,zoom:1});ctx.imageSmoothingEnabled=dc.imageSmoothingEnabled=false;
let scene,paused=true,rng;
function seeded(fn){const original=Math.random;Math.random=rng;try{return fn();}finally{Math.random=original;}}
function reset(){rng=mulberry32(7127);scene=seeded(()=>makeBossScene({Game,defaultProfile,metaBonuses,input},q.get('boss')||'boneking'));window.__bossReview=scene;draw();}
function draw(){seeded(()=>scene.draw(ctx));const e=scene.e,S=2.4,x=(e.x-scene.g.cam.x)*S,y=(e.y-scene.g.cam.y)*S;dc.clearRect(0,0,400,320);dc.drawImage(canvas,x-155,y-212,310,248,0,0,400,320);document.querySelector('#status').textContent=`${scene.label} · ${scene.time.toFixed(2)}s · ${e.face<0?'left':'right'} · ${e.state} · frame ${e.frameIndex()}`;}
window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data.bossReview)return;const{cmd,value}=e.data;if(cmd==='reset')reset();if(cmd==='pause')paused=value;if(cmd==='face')scene.setFace(-scene.face);if(cmd==='action')scene.setAction(value);if(cmd==='step'){paused=true;seeded(()=>scene.tick(1/60));}if(cmd==='tick'&&!paused)seeded(()=>scene.tick(value));draw();});
reset();parent.postMessage({bossReady:true,variant,sequence:scene.sequence},location.origin);
new ResizeObserver(()=>parent.postMessage({bossHeight:Math.ceil(document.body.getBoundingClientRect().height)},location.origin)).observe(document.body);
