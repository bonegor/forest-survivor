import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const IDs={knight:'heroes7-sentinel',paladin:'heroes7-guardian-upg',praetorian:'heroes6-praetorian',seraph:'heroes6-angel',swordbearer:'heroes7-knecht'};
mkdirSync('tools/animation-round/generated',{recursive:true});
const result={};
for(const [id,design]of Object.entries(IDs)){
  const dir=`example sprites folder/heroes-animation-2026-11-03/${design}`;
  const read=f=>JSON.parse(readFileSync(`${dir}/${f}`,'utf8'));
  const accepted=read('source-motion/accepted-attack.json').folder;
  const arm=await loadImage(`${dir}/source-motion/${accepted}/original-arm-sword.png`);
  const body=await loadImage(`${dir}/source-motion/${accepted}/body-without-arm.png`);
  const m=read('sequence-round-2026-11-04/regen-metadata.json'),geometry=read('sequence-round-2026-11-04/geometry-provenance.json');
  const am=read(`source-motion/${accepted}/metadata.json`),shoulder=am.ownership?.shoulder||am.shoulder;
  const s=m.baseInfo.logicalScale,pivot=m.baseInfo.idlePivot;
  const render=(image,angle=0,offset=[0,0])=>{
    const c=createCanvas(80,64),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.translate(40,56);ctx.scale(s,s);ctx.translate(-pivot[0]+offset[0]/s,-pivot[1]+offset[1]/s);
    ctx.translate(...shoulder);ctx.rotate(angle*Math.PI/180);ctx.drawImage(image,-shoulder[0],-shoulder[1]);
    return c;
  };
  const masks=geometry.poses.map(p=>{
    const c=render(arm,p.angle,p.upperTranslationNative),rgba=c.getContext('2d').getImageData(0,0,80,64).data;
    return [...rgba].filter((_,i)=>i%4===3).flatMap((a,i)=>a?[i]:[]);
  });
  const c=createCanvas(80*4,64),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.drawImage(render(body),0,0);ctx.drawImage(render(arm),80,0);ctx.drawImage(render(arm,geometry.poses[8].angle,geometry.poses[8].upperTranslationNative),160,0);ctx.drawImage(render(arm,geometry.poses[12].angle,geometry.poses[12].upperTranslationNative),240,0);
  writeFileSync(`tools/animation-round/generated/${id}-equipment.png`,c.toBuffer('image/png'));
  result[id]={source:`${design}/source-motion/${accepted}`,mask:masks[0],attackMasks:masks};
}
writeFileSync('tools/animation-round/generated/equipment-masks.json',JSON.stringify(result));
