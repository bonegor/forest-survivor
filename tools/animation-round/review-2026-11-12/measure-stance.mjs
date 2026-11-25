// Compare the displayed pose's planted-sole target with player/world translation.
// This measures pose-quantized target drift, not aesthetic quality.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const [capture,poseRoot,out,...requested]=process.argv.slice(2);
if(!out)throw Error('Usage: node measure-stance.mjs CAPTURE POSE_ROOT OUTPUT_JSON [HERO ...]');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const coverage=read(join(capture,'coverage.json'));
const combined=existsSync(join(poseRoot,'motion.json'))?read(join(poseRoot,'motion.json')):{};
const ids=requested.length?requested:Object.keys(coverage.heroes);
const results={capture,poseRoot,note:'Horizontal stance ranges include source-pose quantization; no claim of aesthetic approval.',heroes:{}};
for(const id of ids){
  const data=combined[id]??read(join(poseRoot,`${id}-poses.json`));
  const poses=data.poses,meta=coverage.heroes[id];
  if(!poses[0].legs&&!poses[0].boots)continue;
  const source=read(join(capture,`${id}-world`,'samples.json'));
  const scenes={};
  for(const scene of [...new Set(source.map(s=>s.phase))]){
    if(!['walk-right','walk-left','restart','slow-travel','field-attack-moving','crypt-attack-moving-left'].includes(scene))continue;
    const samples=source.filter(s=>s.phase===scene),runs=[],active=[[],[]];
    const flush=k=>{if(active[k].length>=3){const xs=active[k].map(p=>p.x);runs.push({samples:xs.length,range:Math.max(...xs)-Math.min(...xs),seconds:active[k].at(-1).t-active[k][0].t});}active[k]=[];};
    for(const sample of samples){
      // A forced dash can suspend locomotion while moving the character. It is
      // not one continuous foot stance across the gap in walking samples.
      if(!sample.walking){active.forEach((_,k)=>flush(k));continue;}
      const n=Math.floor(sample.gait*1.4*meta.motionRate)%poses.length;
      const parts=poses[n].legs??poses[n].boots;
      parts.forEach((part,k)=>{
        if(!part.support){flush(k);return;}
        const x=sample.x+sample.face*(part.ankle?.[0]??part.x);
        active[k].push({x,t:sample.time});
      });
    }
    active.forEach((_,k)=>flush(k));
    const seconds=samples.at(-1)?.time-samples[0]?.time;
    const cycleDelta=(samples.at(-1)?.gait-samples[0]?.gait)*1.4*meta.motionRate/poses.length;
    scenes[scene]={sampleFps:meta.world.fps,stanceRuns:runs.length,
      averageRangePx:runs.reduce((n,r)=>n+r.range,0)/(runs.length||1),
      maxRangePx:Math.max(0,...runs.map(r=>r.range)),
      cyclesPerSecond:cycleDelta/seconds,stepsPerSecond:cycleDelta/seconds*2};
  }
  results.heroes[id]=scenes;
}
writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
