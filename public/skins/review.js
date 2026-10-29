import { buildSprites, SPR } from '../js/engine/sprites.js';
import { HEROES } from '../js/data/heroes.js';
import { HERO_SELECTED_LOOKS } from '../js/data/hero-review.js';
import { HeroShowcase } from '../js/ui/hero-showcase.js';
import { defaultProfile } from '../js/shared/profile.js';
buildSprites();
const motion=document.querySelector('#motion'), facing=document.querySelector('#facing'), pause=document.querySelector('#pause');
const settings={diff:'easy'}, profile=defaultProfile(), previews=[];
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches, speed=1, time=0;
function setPaused(value){paused=value;pause.textContent=paused?'Play':'Pause';}
for(const [id,name] of Object.entries(HERO_SELECTED_LOOKS)){
  const card=document.createElement('article'), tag=document.createElement('div'), title=document.createElement('h2'), canvas=document.createElement('canvas'), actions=document.createElement('div'), play=document.createElement('a');
  tag.className='tag';tag.textContent=HEROES[id].title;title.textContent=name;
  canvas.width=240;canvas.height=220;canvas.setAttribute('aria-label',HEROES[id].title+': '+name+' animation');
  actions.className='actions';play.href='./play.html?hero='+id;play.textContent='Try in the forest';actions.append(play);
  card.append(tag,title,canvas,actions);document.querySelector('#cards').append(card);
  previews.push({id,show:new HeroShowcase(id,profile,settings),ctx:canvas.getContext('2d')});
}
function reset(){time=0;for(const preview of previews)preview.show=new HeroShowcase(preview.id,profile,settings);render(0);}
function render(dt){time+=dt;for(const {show,ctx} of previews){
  if(motion.value!=='cycle'){const [start,length]=({idle:[0,1.3],walk:[1.4,1.9],attack:[4,.8]})[motion.value];show.time=start+(time%length)-dt;}
  show.update(dt);const p=show.game.player;
  if(facing.value!=='auto'||motion.value!=='cycle'){p.face=facing.value==='auto'?(Math.floor(time/4)%2?-1:1):Number(facing.value);show.action.face=p.face;if(show.action.kind==='attack'&&SPR[p.hero.sprite].attack)p.strikeAng=p.face<0?Math.PI:0;}
  ctx.imageSmoothingEnabled=false;show.draw(ctx,{x:0,y:0,w:240,h:220},false,settings);
}}
pause.addEventListener('click',()=>setPaused(!paused));
motion.addEventListener('change',reset);facing.addEventListener('change',()=>render(0));
document.querySelector('#restart').addEventListener('click',reset);
document.querySelector('#step').addEventListener('click',()=>{setPaused(true);render(1/30);});
document.querySelector('#slow').addEventListener('click',e=>{speed=speed===1?.25:1;e.target.textContent=speed===1?'Slow motion':'Normal speed';});
setPaused(paused);reset();let last;
function draw(now){const dt=paused||!last?0:Math.min((now-last)/1000,.05)*speed;last=now;render(dt);requestAnimationFrame(draw);}requestAnimationFrame(draw);
