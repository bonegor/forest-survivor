import { fromRows, hexPack, makeBuf } from '../../../js/engine/pixels.js';

export const radians = degrees => degrees * Math.PI / 180;
export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mixPoint = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

// A point denotes a texel centre. The identity transform therefore reproduces
// the authored grid pixel for pixel, including single-texel outlines and grips.
export function matrix(x = 0, y = 0, angle = 0, sx = 1, sy = sx) {
  const co = Math.cos(angle), si = Math.sin(angle);
  return [co * sx, si * sx, -si * sy, co * sy, x, y];
}
export function point(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
export function compose(m, n) {
  return [m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1], m[0]*n[2]+m[2]*n[3],
    m[1]*n[2]+m[3]*n[3], m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
}
export function place(x, y, pivot, angle = 0, sx = 1, sy = sx) {
  const m = matrix(x,y,angle,sx,sy);
  m[4] -= m[0]*pivot[0] + m[2]*pivot[1];
  m[5] -= m[1]*pivot[0] + m[3]*pivot[1];
  return m;
}

export function stamp(out, tile, m) {
  if (!tile) return;
  const {w,h,d} = tile;
  const [a,b,c,e,tx,ty] = m, det = a*e - b*c;
  if (Math.abs(det) < 1e-6) return;
  if (a === 1 && b === 0 && c === 0 && e === 1) {
    const x0 = Math.round(tx), y0 = Math.round(ty);
    for (let y = Math.max(0,-y0); y < Math.min(h,out.h-y0); y++) {
      for (let x = Math.max(0,-x0); x < Math.min(w,out.w-x0); x++) {
        const colour = d[y*w+x];
        if (colour >>> 24) out.d[(y+y0)*out.w+x+x0] = colour;
      }
    }
    return;
  }
  const corner = point(m,[-.5,-.5]), ux = a*w, uy = b*w, vx = c*h, vy = e*h;
  const left = Math.max(0,Math.ceil(corner[0]+Math.min(0,ux)+Math.min(0,vx)-1e-7));
  const top = Math.max(0,Math.ceil(corner[1]+Math.min(0,uy)+Math.min(0,vy)-1e-7));
  const right = Math.min(out.w-1,Math.floor(corner[0]+Math.max(0,ux)+Math.max(0,vx)+1e-7));
  const bottom = Math.min(out.h-1,Math.floor(corner[1]+Math.max(0,uy)+Math.max(0,vy)+1e-7));
  for (let y=top; y<=bottom; y++) for (let x=left; x<=right; x++) {
    const dx=x-tx, dy=y-ty, xx=Math.floor((dx*e-dy*c)/det+.5), yy=Math.floor((dy*a-dx*b)/det+.5);
    if (xx<0 || yy<0 || xx>=w || yy>=h) continue;
    const colour=d[yy*w+xx];
    if (colour >>> 24) out.d[y*out.w+x]=colour;
  }
}

export function line(out, from, to, colour) {
  const [x0,y0]=from.map(Math.round), [x1,y1]=to.map(Math.round);
  const steps=Math.max(1,Math.abs(x1-x0),Math.abs(y1-y0));
  for(let i=0;i<=steps;i++) {
    const x=Math.round(lerp(x0,x1,i/steps)), y=Math.round(lerp(y0,y1,i/steps));
    if(x>=0 && y>=0 && x<out.w && y<out.h) out.d[y*out.w+x]=colour;
  }
}

export function bounds(tile) {
  let l=tile.w, t=tile.h, r=-1, b=-1;
  for(let y=0;y<tile.h;y++) for(let x=0;x<tile.w;x++) if(tile.d[y*tile.w+x]>>>24) {
    l=Math.min(l,x); t=Math.min(t,y); r=Math.max(r,x); b=Math.max(b,y);
  }
  return {l,t,r,b};
}

function raster(def, palette) {
  const rows = typeof def.rows === 'string' ? def.rows.split('/') : def.rows;
  for (const row of rows) for (const symbol of row) {
    if (symbol !== '.' && symbol !== ' ' && palette[symbol] === undefined) {
      throw new Error('Missing hero ink for "'+symbol+'" in '+row);
    }
  }
  return fromRows(rows,palette);
}
function slice(tile, start, end) {
  const h = Math.max(1, Math.min(tile.h,end) - start);
  return {w:tile.w,h,d:tile.d.subarray(start*tile.w,(start+h)*tile.w)};
}
function limb(def, key, endKey, palette) {
  if (!def) return null;
  const tile=raster(def,palette), joint=def[key], end=def[endKey], axis=def.axis ?? Math.floor(tile.w/2);
  if (!Number.isInteger(joint) || !Number.isInteger(end) || joint<=0 || end<=joint || end>=tile.h) {
    throw new Error('The '+key+' and '+endKey+' must be interior joint rows in the limb grid.');
  }
  const tip=slice(tile,end,tile.h), box=bounds(tip);
  // Share one painted joint row between adjacent bones to close rotation cracks.
  return {axis,joint,end,upper:slice(tile,0,joint+1),lower:slice(tile,joint,end+1),tip,box};
}
function bodyLayer(def,palette) {
  return def ? {tile:raster(def,palette), at:def.at} : null;
}
function item(def,palette) {
  if(!def) return null;
  const tile=raster(def,palette);
  let dx=1,dy=0,longest=0;
  for(let i=0;i<tile.d.length;i++) if(tile.d[i]>>>24) {
    const x=i%tile.w-def.grip[0], y=Math.floor(i/tile.w)-def.grip[1], dist=x*x+y*y;
    if(dist>longest){longest=dist;dx=x;dy=y;}
  }
  let angle=-Math.atan2(dy,dx);
  if(angle>Math.PI/2) angle-=Math.PI;
  if(angle< -Math.PI/2) angle+=Math.PI;
  return {...def,tile,rest:def.restAngle===undefined?angle:radians(def.restAngle),reach:Math.sqrt(longest)};
}
const models=new WeakMap();
export function modelFor(design) {
  if(models.has(design)) return models.get(design);
  const palette=Object.fromEntries(Object.entries(design.palette).map(([key,hex])=>[key,hexPack('#'+hex.replace(/^#/,''))]));
  const m=design.motion || {}, layers={};
  for(const key of ['head','torso','cloak','front']) layers[key]=bodyLayer(design[key],palette);
  const arm=limb(design.arm,'elbow','wrist',palette), leg=limb(design.leg,'knee','ankle',palette);
  if(!arm || !layers.torso || !layers.head) throw new Error(design.name+' needs a torso, head and arm.');
  if(!leg && !m.hover) throw new Error(design.name+' needs a painted leg or a hover gap.');
  const model={...layers,design,m,palette,arm,leg,offArm:limb(design.offArm,'elbow','wrist',palette) || arm,
    farLeg:limb(design.farLeg,'knee','ankle',palette) || leg,
    weapon:item(design.weapon,palette),offhand:item(design.offhand,palette),fallReleases:new Map()};
  models.set(design,model);
  return model;
}
export {makeBuf};
