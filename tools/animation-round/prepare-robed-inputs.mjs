// Preserve source ownership once; ordinary builds read only baseline/robed-walk.
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readPng, writePng } from '../png.mjs';
const root='example sprites folder/heroes-animation-2026-11-03';
const target='tools/animation-round/baseline/robed-walk';
mkdirSync(target,{recursive:true});
const designs={mage:'heroes7-apprentice',necromancer:'heroes7-lich',druid:'heroes7-druid',thornkeeper:'heroes5-druid',gravebinder:'heroes5-lich',arcanist:'heroes5-mage'};
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const inside=(poly,x,y)=>{let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],c=poly[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
const all={};
for(const [id,design]of Object.entries(designs)){
  const dir=`${root}/${design}`,meta=read(`${dir}/iteration2-metadata.json`),run=`${dir}/texture-motion/run2`;
  let config;
  if(id!=='arcanist'){
    config=read(`${run}/definition.json`);
    for(let i=0;i<3;i++)copyFileSync(`${run}/source-layer-${i}.png`,`${target}/${id}-${i}.png`);
  }else{
    const g=read(`${run}/geometry.json`),fix=g.ownershipFix,source=readPng(`${dir}/original-reuse/original-pose0.png`);
    const layers=Array.from({length:3},()=>({...source,d:new Uint32Array(source.d.length)}));
    for(let y=0;y<source.h;y++)for(let x=0;x<source.w;x++){
      let who=0;const p=y*source.w+x,hit=poly=>inside(poly,x+.5,y+.5);
      if(hit(g.boots.A.polygon)||fix.AExtraPolygons.some(hit))who=1;
      if(hit(g.boots.B.polygon)||fix.BExtraPolygons.some(hit))who=2;
      if(x>=47&&x<67&&y<333||x>=128&&x<=173&&y<=322||hit(fix.protectedRightGoldHem))who=0;
      if(who===1&&!hit(fix.drawPolygons.A)||who===2&&!hit(fix.drawPolygons.B))continue;
      layers[who].d[p]=source.d[p];
    }
    for(let i=0;i<3;i++)writePng(`${target}/${id}-${i}.png`,layers[i]);
    config={centreX:g.gait.centreX,floorY:g.gait.gaitFloorY||335,returnLift:26,
      legs:[{pivotX:83,phaseOffset:.5},{pivotX:184,phaseOffset:0}],
      garmentWarp:{startY:235,endY:322,centreX:132,width:94,protectPolygons:[[[47,0],[67,0],[67,341],[47,341]],[[128,220],[173,220],[173,322],[128,322]]]},
      protectedPolygons:[[[47,0],[67,0],[67,341],[47,341]]],drawOrder:[2,1]};
  }
  all[id]={design,source:`${root}/${design}`,scale:meta.baseInfo.logicalScale,pivot:meta.baseInfo.idlePivot,
    centreX:config.centreX,floorY:config.floorY,legs:config.legs.map(l=>({pivotX:l.pivotX,phaseOffset:l.phaseOffset})),
    garment:config.garmentWarp,protectedPolygons:config.protectedPolygons||[],
    originalSourceSha256:meta.baseInfo.sha256,
    layers:Array.from({length:3},(_,i)=>({file:`${id}-${i}.png`,sha256:createHash('sha256').update(readFileSync(`${target}/${id}-${i}.png`)).digest('hex')}))};
}
writeFileSync(`${target}/models.json`,JSON.stringify(all,null,2)+'\n');
console.log('Retained six explicit robe/boot/equipment ownership models.');
