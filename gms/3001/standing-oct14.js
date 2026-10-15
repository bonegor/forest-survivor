// Isolated standing-art review. Uses the real Game renderer with a disposable profile.
import {buildSprites,buildSprite,SPR} from '/game/js/engine/sprites.js';
import {Game} from '/game/js/game/game.js';
import {view} from '/game/js/engine/view.js';
import {defaultProfile,metaBonuses} from '/game/js/shared/profile.js';
import {mulberry32} from '/game/js/engine/util.js';

const path='/sprites/lab/standing-oct14/';
const info=[
 {id:'archer',name:'Ranger · Thornwarden',text:'Revised: a deeper hood shades the brow and cheek around a small face opening.'},
 {id:'mage',name:'Mage · Ember Archmage',text:'Revised: a smooth tapered hat, forward-bent tip and a narrower brim seated above the face.'},
 {id:'necromancer',name:'Necromancer · Grave Regent',text:'A close hood, bone armour, split crimson robes and a soul staff.'},
 {id:'necromancer-ossuary',role:'necromancer',name:'Necromancer · Ossuary King',text:'New alternative: an exposed crowned skull, broad bone armour, ash-green robes and a hooked soul staff.'},
];
const cards=document.querySelector('#cards');
for(const item of info){
 const el=document.createElement('article');el.className='card';
 el.innerHTML=`<h3>${item.name}</h3><p>${item.text}</p><div class="sprites"><img src="${path+item.id}-left.png" alt="${item.name} standing left"><img src="${path+item.id}-right.png" alt="${item.name} standing right"></div><div class="captions"><span>LEFT</span><span>RIGHT</span></div><div class="native"><img src="${path+item.id}-left.png" alt="Native scale, left"><img src="${path+item.id}-right.png" alt="Native scale, right"></div><div class="downloads"><a href="${path+item.id}-left.png" download>Left PNG</a><a href="${path+item.id}-right.png" download>Right PNG</a><a href="${path+item.id}-standing-pair.png" download>Pair</a></div>`;
 cards.append(el);
}

async function load(id){
 const img=new Image();img.src=path+id+'-right.png';await img.decode();
 const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
 const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
 const data=ctx.getImageData(0,0,48,48);
 return buildSprite(id,{gen:()=>[{w:48,h:48,d:new Uint32Array(data.data.buffer)}],idle:[0],walk:[0],anchorY:40,fitW:36,fitH:36,outline:false,selfBob:true});
}
const error=document.querySelector('#error');
try{
 buildSprites();
 const roles=[...new Set(info.map(item=>item.role||item.id))];
 const original=Object.fromEntries(roles.map(id=>[id,SPR[id]]));
 const proposed=Object.fromEntries(await Promise.all(info.map(async({id})=>[id,await load(id)])));
 let selected='archer';
 const games={};
 for(const id of roles){
   const random=Math.random;Math.random=mulberry32(2047);
   try{games[id]=new Game({hero:id,mode:'s15',meta:metaBonuses(defaultProfile()),settings:{}});}finally{Math.random=random;}
   const g=games[id];g.fade=0;g.time=8;g.player.anim=0;g.player.weapons.length=0;
 }
 function render(){
   const item=info.find(i=>i.id===selected),role=item.role||item.id;
   const scale=Number(document.querySelector('#scale').value),g=games[role];
   for(const [id,spr,face] of [['current',original[role],1],['left',proposed[selected],-1],['right',proposed[selected],1]]){
     const c=document.querySelector('#'+id),ctx=c.getContext('2d');
     Object.assign(view,{canvas:c,ctx,pxW:c.width,pxH:c.height,W:c.width/scale,H:c.height/scale,S:scale,zoom:1});
     SPR[role]=spr;g.player.face=face;g.player.moving=false;g.player.anim=0;
     g.syncCam();g.snapCam();g.draw(ctx);
   }
   SPR[role]=original[role];
   document.querySelector('#status').textContent=`${item.name} · actual game renderer · ${scale}× · standing only`;
 }
 document.querySelector('#roles').addEventListener('click',(e)=>{
   const b=e.target.closest('button[data-role]');if(!b)return;
   selected=b.dataset.role;
   for(const el of document.querySelectorAll('#roles button'))el.setAttribute('aria-pressed',String(el===b));
   render();
 });
 document.querySelector('#scale').addEventListener('change',render);
 render();
}catch(e){error.textContent='Preview could not load: '+e.message;console.error(e);}
