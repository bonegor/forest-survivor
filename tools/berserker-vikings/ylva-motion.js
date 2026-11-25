// Archived painted proposal. All rig coordinates are in the source PNG's
// reduced pixel grid, never in interpolated screen pixels.
const clamp = v => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a + (b-a)*t;
const tau = 2*Math.PI;

function inside(x, y, polygon) {
  let hit = false;
  for (let i=0, j=polygon.length-1; i<polygon.length; j=i++) {
    const [ax,ay] = polygon[j], [bx,by] = polygon[i];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) hit=!hit;
  }
  return hit;
}

function layersOf(data, rig) {
  const source = Uint8Array.from(atob(data.pixels), ch=>ch.charCodeAt(0));
  const layers = {};
  for (const id of ['body', ...Object.keys(rig.mask)]) layers[id]=new Uint8Array(source.length);
  for (let y=0;y<data.h;y++) for (let x=0;x<data.w;x++) {
    const p=y*data.w+x;
    if (!source[p]) continue;
    const part = Object.entries(rig.mask).find(([,polygons])=>polygons.some(poly=>inside(x+.5,y+.5,poly)));
    layers[part?.[0] || 'body'][p]=source[p];
  }
  return layers;
}

function sample(out, spec, texture, inverse) {
  const {w,h,sw,sh,ox,oy} = spec;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const [u,v]=inverse(x-ox+.5,y-oy+.5);
    if (u<0 || v<0 || u>=sw || v>=sh) continue;
    const index=texture[Math.floor(v)*sw+Math.floor(u)];
    if (index) out[y*w+x]=index;
  }
}

const pivot = (spec, texture, out, joint, angle, dx=0, dy=0) => {
  const c=Math.cos(angle), s=Math.sin(angle), [px,py]=joint;
  sample(out,spec,texture,(x,y)=>{
    const u=x-px-dx,v=y-py-dy;
    return [px+u*c+v*s,py-u*s+v*c];
  });
};

function footOffsets(phase, motion) {
  const t=(phase+1)%1, support=.59;
  if (t<support) return [mix(motion.reach,-motion.reach,t/support),0];
  const u=(t-support)/(1-support);
  return [mix(-motion.reach,motion.reach,u*u*(3-2*u)),-Math.sin(u*Math.PI)*motion.lift];
}

// Inverse-map each row through its two adjacent joints. Above the hip the
// trouser follows the torso, below the ankle the entire boot follows its heel.
function drawLeg(out,spec,texture,leg,bob,travel) {
  const {hip,knee,ankle}=leg, [footX,footY]=travel;
  const ankleX=footX+leg.centerX-ankle[0], ankleY=footY+leg.floorY-ankle[1];
  const kneeX=.45*ankleX-.65*ankleY;
  const kneeY=bob*.34+ankleY*.42;
  const joints=[
    [hip[1],0,bob], [knee[1],kneeX,kneeY], [ankle[1],ankleX,ankleY],
  ];
  sample(out,spec,texture,(x,y)=>{
    if (y<=hip[1]+bob) return [x,y-bob];
    if (y>=ankle[1]+ankleY) return [x-ankleX,y-ankleY];
    const n = y<knee[1]+kneeY ? 0 : 1;
    const [v0,x0,y0]=joints[n], [v1,x1,y1]=joints[n+1];
    const t=clamp((y-v0-y0)/(v1+y1-v0-y0));
    return [x-mix(x0,x1,t),mix(v0,v1,t)];
  });
}

export function rigCharacter(data, rig) {
  const spec={w:rig.w,h:rig.h,sw:data.w,sh:data.h,ox:rig.w/2-rig.anchorX,oy:rig.floor-data.h};
  const textures=layersOf(data,rig), frames=[];
  const encode=out => frames.push(btoa(String.fromCharCode(...out)))-1;
  const duration=rig.motion.cycle;
  const seq=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
  const count=rig.motion.count;

  function frame(walkIndex=null,idleIndex=0,attackIndex=null) {
    const out=new Uint8Array(spec.w*spec.h);
    if (walkIndex==null && attackIndex==null && idleIndex===0) {
      const still = Uint8Array.from(atob(data.pixels), ch=>ch.charCodeAt(0));
      for (let y=0;y<data.h;y++)
        out.set(still.subarray(y*data.w,(y+1)*data.w),(spec.oy+y)*spec.w+spec.ox);
      return encode(out);
    }
    const phase=(walkIndex ?? 0)/count;
    const attack=attackIndex==null ? null : rig.strike[attackIndex];
    const idle=rig.idle[idleIndex];
    const bob = (walkIndex==null ? idle.bob : -.95+.95*Math.cos(2*tau*phase))+(attack?.bob||0);
    const shift = (walkIndex==null ? 0 : .65*Math.sin(tau*phase))+(attack?.shift||0);
    const side=Math.cos(tau*phase);
    for (const name of ['farLeg','nearLeg']) {
      if (walkIndex==null) {
        drawLeg(out,spec,textures[name],rig[name],bob,
          [rig[name].ankle[0]-rig[name].centerX,rig[name].ankle[1]-rig[name].floorY]);
      } else {
        const travel=footOffsets(phase+(name==='farLeg'?.5:0),rig.motion);
        drawLeg(out,spec,textures[name],rig[name],bob,travel);
      }
    }
    for (const name of rig.stack) {
      if (name==='body') { pivot(spec,textures.body,out,rig.chest,0,shift,bob); continue; }
      const angle=attack ? attack[name] : walkIndex==null ? idle[name] : rig.sway[name]*side;
      pivot(spec,textures[name],out,rig[name],angle||0,shift,bob);
    }
    return encode(out);
  }
  const idle=seq(rig.idle.length,i=>frame(null,i));
  const walk=seq(count,i=>frame(i));
  const attack=seq(rig.strike.length,i=>frame(null,0,i));
  const attackWalk=seq(rig.strike.length,i=>seq(count,j=>frame(j,0,i)));
  return { name:'Ylva Wolf-Tooth', pick:'review:ylva-wolf-tooth',
    w:spec.w,h:spec.h,anchorY:rig.floor,hires:2,fitW:76,fitH:76,
    idle,walk,attack,attackWalk,attackRelease:3,attackFps:12,motionRate:count/(9.8*duration),
    idleRate:3.2,selfBob:true,indexBytes:1,palette:data.palette,frames };
}
