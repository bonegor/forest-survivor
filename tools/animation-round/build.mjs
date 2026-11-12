// Native motion pass. Rebuild from the retained packed inputs, never from output.
// No scaling, palette replacement or newly generated character models is involved.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import source from './baseline/index.js';
import { writePng } from '../png.mjs';
import { buildGroundedWalk, GROUNDED_MODELS } from './grounded-walk.mjs';
import { buildRobedWalk } from './robed-walk.mjs';

const TAU = Math.PI * 2;
const equipment=JSON.parse(readFileSync(new URL('./baseline/equipment-masks.json',import.meta.url),'utf8'));
const repaired = new Set(['knight','mage','paladin','berserker','marksman','templar','trailblazer','thornkeeper','gravebinder','praetorian','seraph','boltguard','swordbearer']);
const smooth = t => (t = Math.max(0, Math.min(1, t)), t * t * (3 - 2 * t));
// Material motion is deliberately local: trailing cloth, loose hair, plumes and
// hat tips respond after the torso; held weapons stay connected to the hand.
// [centre x, centre y, radius x, radius y, amplitude x, amplitude y, lag]
const rigs = {
  knight:      { hip:44, fps:14, breath:.85, parts:[[33,43,8,10,1.1,.3,.7],[45,40,5,8,.5,.25,1.4]], note:'A measured breath, trailing mantle and a quiet shield settling in the grip.' },
  archer:      { hip:44, fps:15, breath:.8, parts:[[34,42,7,12,1.2,.4,.7],[37,31,7,6,.6,.3,1.5]], note:'A relaxed bow guard, breathing shoulders and a loose auburn hair/cape ripple.' },
  mage:        { hip:44, fps:14, breath:.9, parts:[[36,46,8,9,1.1,.2,.8],[41,37,4,5,.55,.3,1.7],[32,22,3,5,.6,.6,2.2]], note:'Slow robe and beard movement with a living staff flame; casting is a separate gesture.' },
  rogue:       { hip:45, fps:5.4, breath:.7, floating:true, parts:[[29,43,13,11,1.8,.9,.7],[39,49,6,8,1.1,.8,1.7]], note:'An upright suspended breath with two trailing spectral cloth waves; travel leans forward.' },
  necromancer: { hip:44, fps:14, breath:.85, parts:[[34,43,9,12,1.2,.4,.6],[38,30,5,6,.6,.3,1.8]], note:'Hood and layered mourning robes gently stir while the casting hand stays lowered.' },
  paladin:     { hip:44, fps:14, breath:.8, parts:[[33,44,8,10,1.2,.35,.7],[41,31,5,8,.5,.4,1.6]], note:'A composed shield guard with breathing armour and a soft golden mantle/hair ripple.' },
  druid:       { hip:44, fps:15, breath:.9, parts:[[32,43,9,11,1.25,.45,.6],[37,29,6,5,.7,.35,1.5],[51,24,5,8,.6,.3,2.1]], note:'Leafy mantle, beard and antler leaves respond at different phases of a slow breath.' },
  berserker:   { hip:44, fps:16, breath:1.15, parts:[[35,34,7,7,.65,.35,.7],[31,46,5,7,.6,.35,1.4],[48,46,5,7,-.6,.35,1.4]], note:'A deeper chest breath with a restrained alternating settling of the two axe grips.' },
  witchhunter:{ hip:44, fps:17, breath:.8, parts:[[32,45,7,10,1.15,.3,.8],[35,34,5,7,.5,.25,1.8]], note:'A still crossbow guard, slow shoulders and a delayed coat-tail ripple.' },
  footman:     { hip:44, fps:14, breath:.8, parts:[[32,43,7,10,1.0,.3,.8],[46,41,5,8,.45,.25,1.5]], note:'Drilled shield guard, calm breathing and a small cloth response behind the plate.' },
  marksman:    { hip:44, fps:18, breath:.8, parts:[[31,44,7,10,1.15,.3,.7],[36,31,6,6,.6,.3,1.6]], note:'Hood and coat breathe around a supported, steady crossbow.' },
  templar:     { hip:44, fps:14, breath:.85, parts:[[35,25,6,8,1.1,.4,.6],[34,44,8,11,1.1,.3,1.5]], note:'Golden plume and surcoat lag behind the armoured breathing rhythm.' },
  trailblazer: { hip:44, fps:16, breath:.85, parts:[[32,42,8,11,1.25,.4,.6],[38,31,6,6,.55,.3,1.7]], note:'Loose hair and woodland cloak ripple while the bow remains in a resting guard.' },
  thornkeeper: { hip:44, fps:15, breath:.85, parts:[[33,43,8,11,1.2,.4,.7],[39,33,5,8,.55,.4,1.5],[49,25,4,6,.55,.4,2.1]], note:'White beard, green mantle and staff foliage each follow a slower separate arc.' },
  wraith:      { hip:45, fps:6.0, breath:.8, floating:true, parts:[[31,44,12,12,1.6,.8,.6],[39,49,7,9,1.0,.85,1.7]], note:'A restrained vertical hover and flowing shroud, distinct from the forward travelling float.' },
  gravebinder: { hip:44, fps:15, breath:.9, parts:[[34,43,8,11,1.2,.4,.8],[38,31,5,7,.6,.3,1.7],[49,30,3,5,.4,.35,2.4]], note:'A slow hooded breath, trailing purple folds and a quiet staff gem pulse.' },
  arcanist:    { hip:44, fps:14, breath:.95, parts:[[36,27,10,7,1.1,.5,.6],[37,46,8,10,1.1,.3,1.3],[40,36,5,6,.5,.3,2.1],[31,28,4,7,.6,.5,2.5]], note:'Floppy hat tip, beard, robe and staff fire follow a calm layered rhythm.' },
  praetorian:  { hip:44, fps:13, breath:.85, parts:[[34,27,9,7,1.25,.4,.7],[32,42,8,11,1.1,.3,1.4]], note:'A heavy planted breath with a delayed red crest and cape movement.' },
  seraph:      { hip:44, fps:14, breath:.85, parts:[[35,27,8,7,1.2,.35,.7],[30,43,10,12,1.3,.45,1.5]], note:'Golden crest and long mantle sway around a calm sword-and-shield guard.' },
  boltguard:   { hip:44, fps:17, breath:.85, parts:[[31,45,8,10,1.1,.3,.7],[36,34,6,8,.6,.3,1.6]], note:'Coat and pale hair move with a slow breath while the heavy crossbow stays supported.' },
  swordbearer: { hip:44, fps:14, breath:.85, parts:[[32,43,8,11,1.1,.35,.7],[38,29,7,6,.55,.25,1.4]], note:'A poised sword guard with breathing shoulders and a restrained mantle ripple.' },
};

export function unpack(data, frame) {
  const [x,y,w,h,encoded] = frame, raw = Buffer.from(encoded, 'base64');
  const d = new Uint32Array(data.w * data.h);
  for (let iy=0; iy<h; iy++) for (let ix=0; ix<w; ix++)
    d[(y+iy)*data.w+x+ix] = data.palette[raw.readUIntLE((iy*w+ix)*data.indexBytes,data.indexBytes)];
  return {w:data.w,h:data.h,d};
}

// Isolated dark scanner/export specks are not part of the character silhouette.
// Keep every coloured particle and every substantial connected component.
function clean(frame) {
  const {w,h,d} = frame, out = d.slice(), seen = new Uint8Array(d.length);
  for(let p=0;p<d.length;p++) {
    if(seen[p] || !(d[p]>>>24)) continue;
    const todo=[p], component=[]; seen[p]=1; let bright=0;
    while(todo.length) {
      const q=todo.pop(), x=q%w, y=Math.floor(q/w), c=d[q]; component.push(q);
      bright=Math.max(bright,c&255,c>>>8&255,c>>>16&255);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const xx=x+dx,yy=y+dy,k=yy*w+xx;
        if(xx<0||xx>=w||yy<0||yy>=h||seen[k]||!(d[k]>>>24))continue;
        seen[k]=1;todo.push(k);
      }
    }
    if(component.length<=12&&bright<62)for(const q of component)out[q]=0;
  }
  return {...frame,d:out};
}

function warp(frame, field) {
  const {w,h,d}=frame, out=new Uint32Array(d.length);
  // Inverse nearest-neighbour mapping prevents cracks between shifted rows.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    let sx=x,sy=y;
    for(let n=0;n<3;n++){const [dx,dy]=field(sx,sy);sx=x-dx;sy=y-dy;}
    const xx=Math.round(sx),yy=Math.round(sy);
    if(xx>=0&&xx<w&&yy>=0&&yy<h)out[y*w+x]=d[yy*w+xx];
  }
  return {w,h,d:out};
}

function materialField(rig, ph, moving=false) {
  return (x,y) => {
    const upper = smooth((55-y)/(55-rig.hip));
    // A grounded breath grows from the waist; boots remain at their original sole.
    const breath=(1-Math.cos(ph))*.5*rig.breath;
    let dx=0,dy=rig.floating ? -Math.sin(ph)*.8 : -breath*upper;
    if(moving) dy=-(1-Math.cos(ph*2))*.35*upper;
    for(const [cx,cy,rx,ry,ax,ay,lag] of rig.parts) {
      const u=Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2), weight=smooth(u);
      const wave=Math.sin(ph-lag);
      dx+=weight*ax*wave*(moving?1.15:1);
      dy+=weight*ay*Math.sin(ph-lag+.8);
    }
    // The foot line is sacred even where a flowing robe reaches the ground.
    if(!rig.floating){const pin=smooth((55-y)/3);dx*=pin;dy*=pin;}
    return [dx,dy];
  };
}

function connectedWalk(frame,id,step) {
  if(id!=='footman'||step!==4)return frame;
  // The imported rear leg starts below the pelvis in this contact pose. Restore
  // the three-pixel plate contour under the belt without moving the knee/boot.
  const d=frame.d.slice(),colors=[...new Set(d)].filter(c=>(c>>>24)>=200);
  const nearest=([r,g,b])=>colors.reduce((best,c)=>{
    const distance=q=>((q&255)-r)**2+((q>>>8&255)-g)**2+((q>>>16&255)-b)**2;
    return distance(c)<distance(best)?c:best;
  },colors[0]);
  d[47*frame.w+38]=nearest([42,34,54]);
  d[47*frame.w+39]=nearest([139,131,158]);
  d[47*frame.w+40]=nearest([86,77,107]);
  return {...frame,d};
}

function pack(frames, data) {
  const palette=[0], colors=new Map([[0,0]]);
  const tiles=frames.map(({w,h,d})=>{
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[y*w+x]>>>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(x1<0)throw Error('Empty animation pose');
    const p=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const c=d[y*w+x]>>>24?d[y*w+x]:0;
      if(!colors.has(c)){colors.set(c,palette.length);palette.push(c);}
      p.push(colors.get(c));
    }
    return [x0,y0,x1-x0+1,y1-y0+1,p];
  });
  const indexBytes=palette.length>256?2:1;
  return {...data,palette,indexBytes,frames:tiles.map(([x,y,w,h,p])=>{
    const bytes=Buffer.alloc(p.length*indexBytes);p.forEach((n,i)=>bytes.writeUIntLE(n,i*indexBytes,indexBytes));
    return [x,y,w,h,bytes.toString('base64')];
  })};
}

// All imported poses share a pelvis at y44 and sole line y55. For moving attacks
// retain the complete gait through the hips, knees and boots; apply only the
// attack's changes above that joint. Equipment extending below it is kept from
// the attack as a foreground detail if it is outside the lower-body envelope.
const staffRanges={mage:[29,37],arcanist:[27,34],druid:[47,60],thornkeeper:[44,60],gravebinder:[44,60]};
const restingWeapons={
  knight:[[34,45],[39,45],[48,52],[42,53]],
  footman:[[37,43],[44,43],[56,52],[46,54]],
  praetorian:[[34,44],[40,45],[49,54],[44,55]],
  swordbearer:[[34,43],[40,43],[50,49],[43,51]],
  paladin:[[26,43],[31,46],[25,53],[21,52]],
  templar:[[31,43],[35,47],[28,54],[24,52]],
  berserker:[[21,45],[54,45],[54,51],[21,51]],
};
function inPolygon(poly,x,y) {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const [a,b]=poly[i],[c,d]=poly[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
function lowerGait(walk,rig,id,step) {
  const polygon=restingWeapons[id];
  if(!polygon)return walk;
  const d=walk.d.slice(),mask=new Uint8Array(d.length);
  for(let y=rig.hip+4;y<56;y++)for(let x=20;x<58;x++) {
    const p=y*walk.w+x,c=d[p],r=c&255,g=c>>>8&255,b=c>>>16&255;
    if(id==='footman'&&x>=49&&y<=51){mask[p]=1;continue;}
    if(!inPolygon(polygon,x+.5,y+.5))continue;
    // The white/steel blade and its cool edge are equipment. Warm leather,
    // tabard and skin underneath stay part of the retained moving leg.
    if((b>=r*.88&&b>=g*.85)||(id==='berserker'&&(x<32||x>46))||
       (id==='paladin'&&x<31)||(id==='templar'&&x<30)||(id==='footman'&&x>48))mask[p]=1;
  }
  for(let y=rig.hip+4;y<56;y++)for(let x=20;x<58;x++) {
    const p=y*walk.w+x;if(!mask[p])continue;
    d[p]=0;
    if((id==='paladin'&&x<31)||(id==='templar'&&x<30)||(id==='footman'&&x>48))continue;
    // Continue an occluded trouser/greave only when the next visible leg pixel
    // is close below it. Outside the leg this remains transparent.
    for(let dy=1;dy<=2;dy++) {
      const q=(y+dy)*walk.w+x;if(mask[q])continue;
      if(walk.d[q])d[p]=walk.d[q];
      break;
    }
  }
  if(id==='footman') {
    // The resting blade occludes this greave in the imported walk. Removing it
    // must reconstruct the knee-to-ankle link, not leave the boot suspended.
    // These joints follow the existing eight original contact/passing poses.
    const joints=[[[42,47],[44,49],[47,52]],null,[[40,47],[42,48],[44,50]],null,
      [[42,47],[44,49],[47,52]],null,[[40,47],[42,48],[44,50]],[[42,47],[44,49],[47,52]]][step];
    if(joints) {
      const colors=[...new Set(walk.d)].filter(c=>c>>>24);
      const nearest=([r,g,b])=>colors.reduce((best,c)=>{
        const distance=q=>((q&255)-r)**2+((q>>>8&255)-g)**2+((q>>>16&255)-b)**2;
        return distance(c)<distance(best)?c:best;
      },colors[0]);
      const edge=nearest([34,28,45]),mid=nearest([78,69,96]),lit=nearest([135,128,153]);
      for(let k=0;k<joints.length-1;k++) {
        const a=joints[k],b=joints[k+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);
        for(let i=0;i<=n;i++) {
          const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);
          if(y<48)continue;
          d[y*walk.w+x-1]=edge;d[y*walk.w+x]=lit;d[y*walk.w+x+1]=mid;
        }
      }
    }
  }
  if(id==='knight') {
    // The resting blade hides the complete near thigh as well as the shin.
    // Recover its hip-to-knee contour in every stride phase; connecting only
    // the lower boot left a faint shield edge standing in for the actual hip.
    const points=[[[40,47],[41,49],[42,51]],[[40,47],[40,49],[41,50]],
      [[40,47],[40,49],[40,50]],[[40,47],[40,49],[41,50]],
      [[40,47],[42,49],[43,52]],[[40,47],[40,49],[41,50]],
      [[40,47],[40,49],[40,50]],[[40,47],[40,50],[41,52]]][step];
    const shades=[walk.d[53*walk.w+42]||0xff2b1a18,walk.d[54*walk.w+43]||0xff433024,walk.d[54*walk.w+44]||0xff665039];
    for(let k=0;k<2;k++)for(let t=0;t<=1;t+=.2) {
      const x=Math.round(points[k][0]+(points[k+1][0]-points[k][0])*t),y=Math.round(points[k][1]+(points[k+1][1]-points[k][1])*t);
      if(y<48)continue;
      d[y*walk.w+x-1]=shades[0];d[y*walk.w+x]=shades[1];d[y*walk.w+x+1]=shades[2];
    }
  }
  return {...walk,d};
}
function staffMask(frame,range) {
  const mask=new Uint8Array(frame.d.length);
  if(!range)return mask;
  for(let y=43;y<56;y++)for(let x=range[0];x<=range[1];x++) {
    const c=frame.d[y*frame.w+x],r=c&255,g=c>>>8&255,b=c>>>16&255;
    if(!(c>>>24)||r<35||r<g*1.17||g<b*.88)continue;
    for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(frame.d[yy*frame.w+xx])mask[yy*frame.w+xx]=1;
  }
  return mask;
}
function corridor(frame,points,radius=1.3) {
  const mask=new Uint8Array(frame.d.length);
  for(let y=43;y<frame.h;y++)for(let x=20;x<65;x++) {
    if(!frame.d[y*frame.w+x])continue;
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
      if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<=radius){mask[y*frame.w+x]=1;break;}
    }
  }
  return mask;
}
function expandedMask(indices,w=80) {
  const mask=new Set();
  for(const p of indices)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)mask.add(p+y*w+x);
  return mask;
}
function belowEquipment(frame,x0,x1,y0,y1,seedX0=x0) {
  const mask=new Uint8Array(frame.d.length),todo=[];
  for(let x=seedX0;x<=x1;x++)if(frame.d[y0*frame.w+x]>>>24>=16){mask[y0*frame.w+x]=1;todo.push(y0*frame.w+x);}
  while(todo.length) {
    const p=todo.pop(),x=p%frame.w,y=Math.floor(p/frame.w);
    for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++) {
      const q=yy*frame.w+xx;
      if(xx<x0||xx>x1||yy<y0||yy>y1||mask[q]||(frame.d[q]>>>24)<16)continue;
      mask[q]=1;todo.push(q);
    }
  }
  return mask;
}
function attackWalking(attack, walk, standing, rig, id, step, attackStep, cleanLower) {
  const {w,h}=attack, out=(cleanLower||lowerGait(walk,rig,id,step)).d.slice();
  const seam=rig.hip+4, range=staffRanges[id];
  let oldStaff=staffMask(walk,range), newStaff=staffMask(attack,range);
  if(id==='thornkeeper') {
    // Explicit staff ownership excludes the warm leather boot which a colour
    // mask alone confused with the diagonal wood during the wind-up.
    oldStaff=corridor(walk,[[48,43],[48,55]],1.35);
    const path=attackStep<2?[[50,42],[55,50],[55,51]]:attackStep===2?[[48,41],[45,52],[45,55]]:attackStep===3?[[48,42],[47,55]]:[[48,43],[48,55]];
    newStaff=corridor(attack,path,1.35);
  }
  if(cleanLower?.staffFree){
    // These pixels belong to the old stationary boot/export margin, not the
    // active shaft. Filter the source ownership mask rather than erasing the
    // independently drawn moving foot at the same world coordinates.
    if(id==='mage'&&attackStep>=2&&attackStep<=3)for(let y=54;y<h;y++)newStaff[y*w+35]=0;
    if(id==='gravebinder'&&attackStep<3)newStaff[55*w+49]=0;
    if(id==='gravebinder'&&attackStep===3)for(let y=54;y<h;y++)for(let x=49;x<=50;x++)newStaff[y*w+x]=0;
  }
  const trueWeapon=equipment[id]?expandedMask(equipment[id].attackMasks[attackStep]):null;
  const lowSword=id==='templar'?belowEquipment(attack,24,31,47,52):null;
  const oldBow=id==='trailblazer'?belowEquipment(walk,43,52,47,53,44):null;
  const activeBow=id==='trailblazer'?belowEquipment(attack,43,56,47,53,44):null;
  const footmanThrust=id==='footman'&&cleanLower?.hips&&(attackStep===3||attackStep===4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const p=y*w+x;
    if(y<seam){
      // Footman's thrust shifts the upper guard left of the travelling pelvis.
      // Keep the source-owned upper thighs behind transparent attack pixels at
      // the waist; replacing them with transparency severs the forward leg.
      const behindWaist=cleanLower&&id==='footman'&&y>=rig.hip&&(attack.d[p]>>>24)<128&&(out[p]>>>24)>=128;
      // In the two thrust poses the original near thigh runs backwards above
      // the normal seam. It belongs to the stationary leg, not the pelvis or
      // guard; retain the moving layer there and redraw its new proximal thigh.
      const oldNearThigh=footmanThrust&&y>=44&&x<37;
      if(!behindWaist&&!oldNearThigh)out[p]=attack.d[p];
    }
    // Source-owned robed lower layers already exclude the resting shaft before
    // their boots are drawn. A broad colour mask here would cut the new shin.
    else if(!cleanLower?.staffFree&&oldStaff[p])out[p]=0;
    if(y>=seam&&newStaff[p])out[p]=attack.d[p];
    // Sword/axe tips can extend outside the legs during follow-through. Their
    // opaque connected metal survives below the hip; loose cloak flares do not.
    if(y>=seam&&trueWeapon?.has(p)&&(!cleanLower||attack.d[p]>>>24>=128))out[p]=attack.d[p];
    if(y>=seam&&!trueWeapon&&!range&&!['mage','arcanist','necromancer','archer','trailblazer','witchhunter','marksman','boltguard'].includes(id)) {
      const c=attack.d[p],r=c&255,g=c>>>8&255,b=c>>>16&255;
      const leftSword=id==='templar'&&lowSword[p];
      const outside=id==='templar'?false:id==='berserker'?(x<32||x>44):id==='footman'?x>49:x>47;
      const metal=Math.max(r,g,b)>100&&Math.max(r,g,b)-Math.min(r,g,b)<85&&(id!=='berserker'||b>=r*.7&&b>=g*.8);
      if((leftSword||outside&&metal)&&c>>>24)out[p]=c;
    }
    // The bow's lower limb belongs to the resting equipment, never the leg.
    if(id==='trailblazer'&&y>=seam) {
      // Native lower layers contain no resting bow. Its old footprint can now
      // contain a travelling shin, so only legacy composites erase that mask.
      if(!cleanLower&&oldBow[p])out[p]=0;
      if(activeBow[p])out[p]=attack.d[p];
    }
    // Crossbow undersides sit exactly on this compositor row; keep the live
    // crossbow footprint instead of the lowered resting-stock pixels.
    if((id==='marksman'&&x>=49||id==='boltguard'&&x>=48)&&y===48)out[p]=attack.d[p];
    if(!cleanLower?.staffFree){
      if(id==='mage'&&attackStep>=2&&attackStep<=3&&x===35&&y>=54)out[p]=0;
      if(id==='gravebinder'&&x===49&&y===55&&attackStep<3)out[p]=0;
      if(id==='gravebinder'&&attackStep===3&&x>=49&&x<=50&&y>=54)out[p]=0;
    }
    // Near-transparent export fringe is not a separate pixel-art part. Leaving
    // alpha1 crumbs makes indexed previews show debris that the live blend hides.
    if(repaired.has(id)&&(out[p]>>>24)<16)out[p]=0;
  }
  if(footmanThrust){
    // The two forward thrust poses lean the attack pelvis left/up. The far
    // walking hip remains under the shield; continue the armoured thigh between
    // these two real anchors rather than leaving that whole leg detached.
    for(const [name,a] of [['far',[42,45.5]],['near',[35.5,43.5]]]){
      const b=cleanLower.hips.find(j=>j.name===name)?.hip;
      if(!b)continue;
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      const edge=attack.d[46*w+42],mid=attack.d[47*w+41],highlight=attack.d[46*w+40];
      for(let y=Math.floor(a[1]-1);y<=Math.ceil(b[1]+1);y++)for(let x=Math.floor(a[0]-2);x<=Math.ceil(b[0]+2);x++){
        const px=x+.5-a[0],py=y+.5-a[1],t=(px*dx+py*dy)/(length*length),cross=(-px*dy+py*dx)/length;
        if(t<0||t>1.1||Math.abs(cross)>1.25)continue;
        const p=y*w+x;
        if((out[p]>>>24)<128)out[p]=Math.abs(cross)>.85?edge:cross<0?highlight:mid;
      }
    }
  }
  // Single isolated low-opacity/outline crumbs left by the removed resting
  // equipment are not limbs. Actual live weapon and staff masks are exempt.
  if(repaired.has(id))for(let y=48;y<h-1;y++)for(let x=1;x<w-1;x++) {
    const p=y*w+x;if(!out[p]||trueWeapon?.has(p)||newStaff[p]||lowSword?.[p]||activeBow?.[p])continue;
    let connected=false;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&out[p+dy*w+dx])connected=true;
    if(!connected)out[p]=0;
  }
  return {w,h,d:out};
}

const lights={mage:[[27,17,36,29,'warm'],[46,29,56,42,'blue']],arcanist:[[27,23,36,34,'warm'],[46,31,56,44,'warm']],druid:[[47,18,56,31,'green']],thornkeeper:[[44,20,54,32,'green']],gravebinder:[[47,23,55,33,'green']]};
function flicker(frame, id, phase, palette) {
  if(!lights[id])return frame;
  const out=frame.d.slice(), cache=new Map();
  for(const [x0,y0,x1,y1,kind] of lights[id])for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
    const p=y*frame.w+x,c=out[p],r=c&255,g=c>>>8&255,b=c>>>16&255;
    const yes=kind==='warm'?r>110&&r>g*1.25&&g>b*1.2:kind==='blue'?b>110&&b>r*1.2: g>85&&g>r*1.1&&g>b*1.05;
    if(!yes||!(c>>>24))continue;
    // Reuse existing material colours; highlights brighten while outer tongues
    // dim, avoiding a whole-sprite opacity flash or new colour ramp.
    const amount=1+.16*Math.sin(phase*2+(x+y)*.7),key=`${c}:${Math.round(amount*20)}`;
    if(!cache.has(key)) {
      const target=[Math.min(255,r*amount),Math.min(255,g*amount),Math.min(255,b*amount)];
      let best=c,score=Infinity;
      for(const q of palette)if(q>>>24) {
        const rr=q&255,gg=q>>>8&255,bb=q>>>16&255;
        const d=(rr-target[0])**2+(gg-target[1])**2+(bb-target[2])**2;
        if(d<score){score=d;best=q;}
      }
      cache.set(key,best);
    }
    out[p]=cache.get(key);
  }
  return {...frame,d:out};
}

export function rebuild({version='v1',outputDir=version==='v2'?'tools/animation-round/variants/v2':'public/assets/heroes-approved',generatedDir=version==='v2'?'tools/animation-round/generated/v2':'tools/animation-round/generated'}={}) {
if(!['v1','v2'].includes(version))throw Error('Unknown gait version: '+version);
mkdirSync(outputDir,{recursive:true});
mkdirSync(generatedDir,{recursive:true});
const report={};
for(const [id,base] of Object.entries(source)) {
  const rig=rigs[id], frames=base.frames.map(f=>clean(unpack(base,f)));
  // Dedicated resting model for spectres: use the upright source pose, not their
  // forward-travelling float sequence. Every idle owns separate frame indices.
  const standing=frames[0], idle=[];
  for(let i=0;i<16;i++){idle.push(frames.length);frames.push(flicker(warp(standing,materialField(rig,i/16*TAU)),id,i/16*TAU,base.palette));}
  for(let i=0;i<base.walk.length;i++)frames[base.walk[i]]=connectedWalk(warp(frames[base.walk[i]],materialField(rig,i/base.walk.length*TAU,true)),id,i);
  let walk=[...base.walk],walkFps=rig.fps;
  const nativeGait=buildRobedWalk(id,base.palette,standing,clean(unpack(base,base.frames[base.walk[0]])),{version})
    || buildGroundedWalk(id,base.palette,standing,{version});
  if(nativeGait) {
    walk=nativeGait.frames.map(frame=>{const index=frames.length;frames.push(frame);return index;});
    walkFps=nativeGait.fps;
    writeFileSync(`${generatedDir}/${id}-walk-poses.json`,JSON.stringify(nativeGait.poses,null,2)+'\n');
  }
  let attack=[...base.attack], attackRelease=base.attackRelease,attackFps=base.attackFps;
  if(attack.length===4) {
    const ranged=['marksman','boltguard','witchhunter'].includes(id);
    const anticipation=frames.length;
    frames.push(warp(frames[attack[0]],(x,y)=>[-.8*smooth((54-y)/12),0]));
    const recovery=frames.length;
    frames.push(warp(frames[attack[3]],(x,y)=>[(ranged?-1:.65)*smooth((54-y)/12),0]));
    if(ranged)frames[attack[1]]=warp(frames[attack[1]],(x,y)=>[-1.2*smooth((53-y)/11),-.3*smooth((53-y)/11)]);
    attack=[attack[0],anticipation,attack[1],attack[2],recovery,attack[3]];
    attackRelease=2; attackFps=ranged?12:14;
  }
  const attackWalk=rig.floating?undefined:attack.map((index,attackStep)=>walk.map((frame,step)=>{
    const n=frames.length;frames.push(attackWalking(frames[index],frames[frame],standing,rig,id,step,attackStep,nativeGait?.lowerFrames[step]));return n;
  }));
  const idleFps=rig.floating?7:8;
  const data=pack(frames,{...base,idle,idleFps,walk,walkFps,attack,attackRelease,attackFps,attackWalk,
    manualDelay:base.manualDelay??Math.min(2,base.attackRelease)/base.attackFps,
    motionRevision:version==='v2'?'restrained-roster-gait-v2-2026-11-12':'continuous-roster-gait-2026-11-12',
    motionSource:`tools/animation-round/${nativeGait?.settings?'robed':'grounded'}-walk.mjs`,
    motionNotes:nativeGait?.settings?.note||(nativeGait?'Sixteen connected contact, compression, passing and reaching phases; stable native upper-body texture, alternating planted soles and lifted returns.':rig.note),
  });
  writeFileSync(`${outputDir}/${id}.js`,`// Rebuild: node tools/animation-round/build.mjs${version==='v2'?' --v2':''}\nexport default ${JSON.stringify(data)};\n`);
  const contact={w:80*8,h:64*2,d:new Uint32Array(80*8*64*2)};
  idle.forEach((idx,i)=>{const b=frames[idx];for(let y=0;y<64;y++)contact.d.set(b.d.subarray(y*80,(y+1)*80),(Math.floor(i/8)*64+y)*contact.w+(i%8)*80);});
  writePng(`${generatedDir}/${id}-idle.png`,contact);
  report[id]={idle:idle.length,idleFps,walk:walk.length,walkFps,attack:attack.length,attackFps,attackRelease,movingAttack:!!attackWalk,frames:frames.length,note:data.motionNotes,gait:nativeGait.settings||nativeGait.motion,
    ...(GROUNDED_MODELS[id]?{gaitSource:{file:`baseline/grounded-models/${GROUNDED_MODELS[id].source}`,sha256:GROUNDED_MODELS[id].sha256}}:{}),
    sourceSha256:createHash('sha256').update(JSON.stringify(base)).digest('hex')};
}
writeFileSync(`${generatedDir}/manifest.json`,JSON.stringify(report,null,2)+'\n');
if(version==='v2')writeFileSync(`${outputDir}/index.js`,readFileSync(new URL('./baseline/index.js',import.meta.url),'utf8'));
console.log(`Rebuilt ${Object.keys(report).length} ${version} heroes in ${outputDir}.`);
return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const version=process.argv.includes('--v2')?'v2':'v1';
  if(version==='v2')await import('./preserve-v1.mjs');
  rebuild({version});
}
