// Rebuild comparison proposals only; never writes public/ or the Sprite Lab's picks.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {renderSource} from '../art-v3/bake.mjs';
import {guardian} from './src/guardians.mjs';

export const HEROES=['archer','mage','rogue','necromancer','paladin','druid','berserker'];
const out=resolve('tools/out/hero-v2/assets');
mkdirSync(out,{recursive:true});
for(const id of HEROES) {
  const base=(await import(pathToFileURL(resolve(`public/assets/heroes/${id}.js`)))).default;
  let rendered;
  if(['druid','berserker'].includes(id)) rendered=guardian(id);
  else {
    const file=`tools/hero-v2/src/${id}.px.js`;
    const animation=[...readFileSync(file,'utf8').matchAll(/anim\(\s*['"]([^'"]+)['"]/g)].at(-1)[1];
    rendered=renderSource(file,animation);
  }
  const palette=[0],map=new Map([[0,0]]);
  const indexed=rendered.frames.map(b=>[...b.d].map(c=>{
    if(!map.has(c)){map.set(c,palette.length);palette.push(c);}
    return map.get(c);
  }));
  const indexBytes=palette.length>256?2:1;
  const frames=indexed.map(f=>Buffer.from(indexBytes===2?f.flatMap(i=>[i&255,i>>8]):f).toString('base64'));
  const data={...base,...rendered.metadata,name:`${id} V2 proposal`,pick:`proposal:v2-${id}`,
    w:rendered.frames[0].w,h:rendered.frames[0].h,palette,indexBytes,frames,
    glow:rendered.glow??base.glow??[]};
  for(const i of [...data.idle,...data.walk,...data.attack??[],...data.attackWalk?.flat()??[]]) {
    if(!Number.isInteger(i)||!frames[i])throw Error(`${id}: missing animation frame ${i}`);
  }
  // Portraits stay the current approved artwork. Only sprite and menu motion are compared.
  writeFileSync(resolve(out,`${id}.js`),`export default ${JSON.stringify(data)};\n`);
  console.log(`${id}: ${frames.length} frames, ${palette.length-1} colours`);
}
