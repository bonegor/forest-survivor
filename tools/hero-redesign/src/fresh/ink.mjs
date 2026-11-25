// Raster primitives only. The new roster shares no character or equipment art
// with previous proposals; every model owns its proportions and motion.
import {packedPalette} from '../../../../public/js/art/palette.js';
export const PALETTE=packedPalette();
export const SIZE=52;
export class Ink {
  constructor(){this.d=new Uint32Array(SIZE*SIZE);this.clipped=0;}
  dot(x,y,key){
    if(key==='.')return;
    if(!PALETTE[key])throw Error(`Unknown palette key ${key}`);
    x=Math.round(x);y=Math.round(y);
    if(x<0||y<0||x>=SIZE||y>=SIZE){this.clipped++;return;}
    this.d[y*SIZE+x]=PALETTE[key];
  }
  rows(x,y,text){text.trim().split('\n').forEach((r,j)=>[...r.trim()].forEach((k,i)=>this.dot(x+i,y+j,k)));}
  line(a,b,key,width=1){
    const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));
    const lo=-Math.floor((width-1)/2),hi=Math.ceil((width-1)/2);
    for(let i=0;i<=steps;i++)for(let dy=lo;dy<=hi;dy++)for(let dx=lo;dx<=hi;dx++)this.dot(a[0]+(b[0]-a[0])*i/steps+dx,a[1]+(b[1]-a[1])*i/steps+dy,key);
  }
  poly(points,key){
    const y0=Math.floor(Math.min(...points.map(p=>p[1]))),y1=Math.ceil(Math.max(...points.map(p=>p[1])));
    const x0=Math.floor(Math.min(...points.map(p=>p[0]))),x1=Math.ceil(Math.max(...points.map(p=>p[0])));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[i],b=points[j];
        if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      if(inside)this.dot(x,y,key);
    }
  }
  shape(points,key,edge='k'){
    this.poly(points,key);
    if(edge)for(let i=0;i<points.length;i++)this.line(points[i],points[(i+1)%points.length],edge);
  }
  ellipse(x,y,rx,ry,key,edge=null){
    for(let j=-ry;j<=ry;j++)for(let i=-rx;i<=rx;i++){
      const v=i*i/(rx*rx)+j*j/(ry*ry);
      if(v<=1)this.dot(x+i,y+j,edge&&v>.68?edge:key);
    }
  }
}
