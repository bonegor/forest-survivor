import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const revision=Number(process.argv[2]||1);
if(![1,2,3,4].includes(revision))throw Error('Use revision 1, 2, 3 or 4');
const source={1:'models.mjs',2:'models-fixup.mjs',3:'models-round3.mjs',4:'models-round4.mjs'}[revision];
const {makeHero,IDS}=await import(pathToFileURL(resolve('tools/hero-redesign/src',source)));
const out=resolve(`tools/out/hero-redesign/pass${revision}/assets`);mkdirSync(out,{recursive:true});
for(const id of IDS){
 const {frames,metadata,glow}=makeHero(id,{revision}),palette=[0],lookup=new Map([[0,0]]);
 const dataFrames=frames.map(f=>Buffer.from([...f.d].map(c=>{if(!lookup.has(c)){lookup.set(c,palette.length);palette.push(c);}return lookup.get(c);})).toString('base64'));
 if(palette.length>256)throw Error('Palette too large');
 for(const n of [...metadata.idle,...metadata.walk,...metadata.attack,...metadata.attackWalk.flat()])if(!dataFrames[n])throw Error(`${id}: invalid frame ${n}`);
 const data={name:`${id} original redesign pass ${revision}`,pick:`redesign:pass${revision}:${id}`,w:52,h:52,indexBytes:1,palette,frames:dataFrames,...metadata,glow};
 writeFileSync(resolve(out,`${id}.js`),`export default ${JSON.stringify(data)};\n`);
 console.log(`${id}: ${frames.length} original poses; ${palette.length-1} master-palette colors`);
}
