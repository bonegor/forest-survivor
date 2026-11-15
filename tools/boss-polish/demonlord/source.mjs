// Azgaroth: native pixel authorship over the immutable 14-pose Gothicvania rig.
// Only RGB is changed. Every operation clips to the original opaque mask.
// Same ten palette entries and one-byte indices as the original baked model.
export const PALETTE = [
  '#00000000', '#621619', '#983e1d', '#470c24', '#fee761',
  '#f77622', '#a22633', '#262b44', '#0d0415', '#5a6988',
];
const pack = s => s.length===9&&s.endsWith('00')?0:(0xff000000|parseInt(s.slice(5,7),16)<<16|parseInt(s.slice(3,5),16)<<8|parseInt(s.slice(1,3),16))>>>0;
export const packedPalette=PALETTE.map(pack);
const inside=(x,y,p)=>{let b=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])b=!b;return b;};
// Torso counter-movement follows the original shoulders, including the deep
// folded crouch and the side-on invocation. Coordinates are native pixels.
const torso=[[48,52],[48,52],[48,51],[48,50],[48,51],[48,52],[48,52],[47,56],[46,58],[48,53],[47,52],[46,52],[52,54],[52,54]];
const heads=[[47,39],[47,39],[47,38],[47,37],[47,38],[47,39],[47,39],[44,45],[42,49],null,null,null,[53,41],[53,42]];
const hands=[[[25,58],[65,50]],[[24,59],[67,51]],[[24,61],[68,52]],[[22,59],[68,52]],[[24,61],[68,52]],[[25,59],[67,51]],[[25,58],[65,50]],[[28,53],[69,48]],[[28,51],[69,47]],[[21,71],[77,69]],[[22,68],[72,64]],[[24,66],[68,60]],[[15,54],[65,51]],[[16,56],[65,50]]];

export function polishIndices(original,n){
  const d=Uint8Array.from(original),W=96,H=80;
  const pixel=(x,y,c,materials=null)=>{if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;if(original[i]&&(!materials||materials.includes(original[i])))d[i]=c;};
  const line=(x0,y0,x1,y1,c,materials=null)=>{const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=steps;i++)pixel(Math.round(x0+(x1-x0)*i/steps),Math.round(y0+(y1-y0)*i/steps),c,materials);};
  const poly=(p,c,materials=null)=>{for(let y=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1]))));y<=Math.min(H-1,Math.max(...p.map(v=>v[1])));y++)for(let x=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0]))));x<=Math.min(W-1,Math.max(...p.map(v=>v[0])));x++)if(inside(x+.5,y+.5,p))pixel(x,y,c,materials);};
  const body=[7,8], [cx,cy]=torso[n], heat=n>=12?2:n>=6?1:0;

  // One articulated black-iron breastplate, broad lit shoulder and layered
  // waist plates. Large uninterrupted planes replace the baseline red specks.
  poly([[cx-7,cy-6],[cx-1,cy-7],[cx+7,cy-3],[cx+6,cy+4],[cx+1,cy+8],[cx-6,cy+4]],7,[1,3,7,8]);
  poly([[cx-7,cy-6],[cx-3,cy-6],[cx-3,cy-1],[cx-6,cy+2],[cx-8,cy-1]],9,body);
  poly([[cx-2,cy-4],[cx+1,cy-4],[cx+1,cy+3],[cx-2,cy+4]],8);
  poly([[cx+2,cy-3],[cx+6,cy-2],[cx+5,cy+1],[cx+2,cy+2]],8);
  line(cx-6,cy-5,cx-2,cy-6,9,body);
  line(cx+2,cy-4,cx+5,cy-2,9,body);
  line(cx-5,cy+5,cx+1,cy+7,8,body);
  line(cx+1,cy+7,cx+5,cy+4,8,body);
  line(cx-4,cy+8,cx+2,cy+10,7,body);
  line(cx-3,cy+10,cx+2,cy+12,9,body);
  // Narrow connected furnace seal, never an aura or detached sparks.
  poly([[cx,cy-3],[cx+3,cy],[cx+1,cy+4],[cx-1,cy+1]],3);
  line(cx,cy-1,cx+1,cy+2,heat?5:6);
  if(heat){pixel(cx+1,cy,5);pixel(cx+1,cy+1,4);}
  if(heat===2){pixel(cx,cy,4);pixel(cx+1,cy+2,5);pixel(cx+2,cy,5);}

  // A hard brow and separate dark eye sockets beneath the connected crown.
  // These are authored clusters, not an across-the-board yellow recolour.
  if(heads[n]){
    const [hx,hy]=heads[n], folded=n===7||n===8;
    const rows=folded?[
      '2666662','2D2D2D2','6H4H4H6','8H2H2H8','86E6E68','88E5E88','8886888',
    ]:[
      '266D62','2D2D62','6H4H46','8H2H28','86E6E8','88E5E8','888688',
    ];
    const key={'2':2,'4':4,'5':5,'6':6,'8':8,D:4,H:8,E:5};
    for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)pixel(hx+x,hy+y,key[rows[y][x]]);
    // The jaw is hot, but darker than the eyes and crown tips.
    pixel(hx+3,hy+6,heat===2?5:6);
  }else{
    // The invocation turns the head; keep its profile instead of pasting the
    // frontal mask onto the back of the skull. Darken jaw, expose one eye.
    const side=n===9?{x:47,y:40}:n===10?{x:37,y:41}:{x:35,y:44};
    pixel(side.x,side.y,8);pixel(side.x+1,side.y,4);
    pixel(side.x+1,side.y+1,2);pixel(side.x+2,side.y+1,8);
    pixel(side.x+1,side.y+2,6);pixel(side.x+2,side.y+2,5);
  }

  // Gauntlet rims and a continuous lit tendon along the authored dark arm.
  // Existing transparent articulation gaps remain byte-for-byte unchanged.
  for(const [hx,hy]of hands[n]){
    for(let y=hy-2;y<=hy+2;y++)for(let x=hx-2;x<=hx+2;x++){
      const k=original[y*W+x];
      if(k===9)pixel(x,y,heat===2?4:5);
      if(k===2)pixel(x,y,2);
      if(k===1)pixel(x,y,7);
    }
    pixel(hx,hy,heat===2?4:5,[1,2,9]);
    pixel(hx-1,hy-1,heat?5:2,[1,2,9]);
    for(let y=hy+1;y<=hy+10;y++)for(let x=hx-3;x<=hx+4;x++)if(original[y*W+x]===8)pixel(x,y,7);
  }
  return d;
}
