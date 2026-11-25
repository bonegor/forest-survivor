// A blank-page roster: shared raster primitives, independently authored class
// anatomy, costumes, weapons and movement. No prior character models imported.
import {Ink,PALETTE,SIZE} from './fresh/ink.mjs';
import {drawArcher,drawWitchHunter} from './fresh/scouts.mjs';
import {drawMage,drawRogue,drawNecromancer} from './fresh/casters.mjs';
import {drawPaladin,drawDruid,drawBerserker} from './fresh/heavies.mjs';

export const IDS=['archer','mage','rogue','necromancer','paladin','druid','berserker','witchhunter'];
const MODELS={archer:drawArcher,mage:drawMage,rogue:drawRogue,necromancer:drawNecromancer,paladin:drawPaladin,druid:drawDruid,berserker:drawBerserker,witchhunter:drawWitchHunter};
const GLOW={archer:[],mage:['c'],rogue:['c'],necromancer:['l'],paladin:['Y'],druid:[],berserker:[],witchhunter:[]};

export function makeHero(id){
  if(!MODELS[id])throw Error(`Unknown hero ${id}`);
  const frames=[];
  const add=(walk,attack,idle=0)=>{
    const c=new Ink();
    MODELS[id](c,{walk,attack,idle,phase:(walk??idle)/8*Math.PI*2});
    if(c.clipped)throw Error(`${id} pose ${frames.length}: ${c.clipped} clipped pixels`);
    if(!c.d.some(Boolean))throw Error(`${id}: empty pose`);
    frames.push({w:SIZE,h:SIZE,d:c.d});
  };
  for(let i=0;i<8;i++)add(null,null,i);
  for(let i=0;i<8;i++)add(i,null);
  for(let i=0;i<6;i++)add(null,i);
  for(let i=0;i<6;i++)for(let j=0;j<8;j++)add(j,i);
  return {frames,glow:GLOW[id].map(k=>PALETTE[k]),metadata:{
    anchorY:45,fitW:40,fitH:42,selfBob:true,
    idle:Array.from({length:8},(_,i)=>i),walk:Array.from({length:8},(_,i)=>8+i),
    attack:Array.from({length:6},(_,i)=>16+i),
    attackWalk:Array.from({length:6},(_,k)=>Array.from({length:8},(_,i)=>22+k*8+i)),
    attackRelease:3,attackFps:12,motionRate:1,idleRate:4,
  }};
}
