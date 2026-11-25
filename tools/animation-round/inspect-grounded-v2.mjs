// Source-pose proof. Runtime motion is separately captured through the real Game.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import sheets from './variants/v1/index.js';
import baseline from './baseline/index.js';
import {unpack} from './build.mjs';
import {buildGroundedWalk,GROUNDED_MODELS} from './grounded-walk.mjs';
import {writePng} from '../png.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const out=resolve(process.argv[2]||'output/animation-round/grounded-v2/candidate1');mkdirSync(out,{recursive:true});
const report={};
for(const [id,base] of Object.entries(GROUNDED_MODELS)) {
  const data=sheets[id],standing=unpack(data,data.frames[0]),gait=buildGroundedWalk(id,baseline[id].palette,standing,{version:'v2'});
  const c=createCanvas(9*240,2*216),ctx=c.getContext('2d');ctx.fillStyle='#d8d2b7';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.font='12px sans-serif';
  const frames=[...gait.frames,gait.frames[0]];
  for(let i=0;i<frames.length;i++) {
    const frame=frames[i],a=createCanvas(80,64);a.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(frame.d.buffer),80,64),0,0);
    const x=i%9*240,y=Math.floor(i/9)*216;ctx.drawImage(a,10,12,60,48,x,y+20,240,192);ctx.fillStyle='#25251e';ctx.fillText(id+' v2 '+i%16,x+8,y+16);
    if(i<16)writePng(resolve(out,`${id}-${String(i).padStart(2,'0')}.png`),frame);
  }
  writeFileSync(resolve(out,id+'-walk.png'),c.toBuffer('image/png'));
  const rest={};for(const leg of base.legs)rest[leg.name]=(Math.hypot(leg.knee[0]-leg.hip[0],leg.knee[1]-leg.hip[1])+Math.hypot(leg.ankle[0]-leg.knee[0],leg.ankle[1]-leg.knee[1]))*base.scale;
  report[id]={motion:gait.motion,reachReduction:1-gait.motion.reach/base.motion.reach,liftReduction:1-gait.motion.lift/base.motion.lift,
    v1VisibleLegLength:rest,v2FullLegLength:Object.fromEntries(gait.poses[0].legs.map(l=>[l.name,l.restLength])),
    maxExtension:Math.max(...gait.poses.flatMap(p=>p.legs.map(l=>l.extension))),fps:gait.fps,poses:gait.poses};
  writeFileSync(resolve(out,id+'-poses.json'),JSON.stringify(report[id],null,2)+'\n');
}
writeFileSync(resolve(out,'metrics.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved thirteen v2 complete cycles and motion metrics to '+out);
