// Pharaoh: deliberate gold, lapis and ancient linen surfaces in the original
// model's native coordinates. The silhouette, padding and animation rig stay
// exactly as authored. Painting never touches a source alpha byte.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const P={
 nemes:[[37,21],[40,16],[45,10],[51,5],[60,3],[66,7],[67,19],[72,22],[76,34],[73,38],[65,35],[59,36],[54,28],[47,24]],
 mask:[[61,5],[66,6],[69,12],[69,21],[66,24],[62,21],[60,16]],
 collar:[[27,20],[36,21],[47,26],[56,31],[67,35],[76,33],[78,36],[76,40],[67,42],[54,38],[43,32],[35,25],[29,23]],
 shoulder:[[28,25],[35,26],[42,32],[41,39],[37,44],[29,43],[26,38]],
 arm:[[28,40],[38,42],[37,49],[36,54],[39,62],[37,66],[31,67],[27,60],[25,52]],
 fist:[[32,65],[38,65],[43,69],[43,75],[40,79],[35,79],[31,74],[30,69]],
 chest:[[41,33],[49,37],[57,40],[69,42],[73,45],[72,51],[66,55],[50,54],[42,48]],
 forearm:[[75,44],[82,47],[85,48],[89,43],[94,44],[94,49],[87,55],[80,56],[74,52]],
 grip:[[88,39],[94,39],[98,42],[98,48],[95,50],[88,49],[86,46],[86,43]],
 thigh:[[48,78],[57,73],[62,74],[62,82],[58,90],[53,95],[48,100],[43,103],[39,99],[42,91]],
 shin:[[39,96],[48,97],[48,105],[44,113],[46,118],[48,122],[38,122],[34,119],[35,108]],
 foot:[[80,113],[86,112],[88,116],[94,117],[98,120],[98,123],[80,123],[77,119]],
 cuff:[[29,57],[35,58],[38,61],[38,65],[33,66],[29,64]],
 belt:[[48,51],[60,52],[65,50],[71,50],[75,52],[79,56],[78,60],[70,59],[66,58],[60,57],[48,57]],
 jewel:[[66,50],[69,49],[72,52],[72,56],[69,58],[66,55]],
 kilt:[[63,58],[70,58],[74,66],[77,84],[77,97],[72,101],[67,98],[63,87]],
 crook:[[84,9],[89,7],[97,8],[101,10],[103,15],[102,20],[99,24],[96,24],[98,19],[99,14],[96,11],[91,10],[87,13],[86,18],[88,23],[91,25],[90,38],[87,39],[88,27],[85,23],[83,18],[83,13]],
};
const R={
 gold:[[25,21,27],[65,39,28],[111,64,29],[159,97,32],[201,140,47],[231,183,72],[248,216,117],[255,238,173]],
 lapis:[[9,15,30],[16,25,48],[24,38,68],[32,54,91],[45,73,115],[68,96,137],[110,133,163]],
 linen:[[28,25,30],[63,51,45],[103,86,65],[144,126,95],[178,159,122],[207,188,148],[232,216,178],[247,234,204]],
 garnet:[[31,13,25],[74,22,35],[121,36,46],[170,54,50],[219,96,64]],
};
const C={ink:[16,19,31],goldDark:[96,55,29],goldShade:[152,91,31],gold:[213,153,49],goldLight:[246,207,103],gleam:[255,237,169],blueDark:[15,27,50],blue:[31,58,99],blueLight:[69,105,150],linenDark:[85,66,51],linen:[189,166,124],linenLight:[236,217,175],red:[132,34,43]};
function ramp(name,t){const a=R[name],u=clamp(t)*(a.length-1),n=Math.round(u);return a[n];}

export function polishSource(source){
 const {w,h}=source,d=source.d.slice(),mat=new Array(d.length);
 const put=(x,y,c,a=1,only=null)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x,v=d[i];if(!(v>>>24)||(only&&mat[i]!==only))return;const old=[v&255,(v>>>8)&255,(v>>>16)&255],rgb=mix(old,c,a).map(v=>Math.round(clamp(v,0,255)));d[i]=((v>>>24)<<24)|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0];};
 const line=(p,c,a=1,only=null)=>{for(let n=1;n<p.length;n++){const [x0,y0]=p[n-1],[x1,y1]=p[n],steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=steps;k++)put(x0+(x1-x0)*k/steps,y0+(y1-y0)*k/steps,c,a,only);}};
 const fill=(p,c,a=1,only=null)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inside(x+.5,y+.5,p))put(x,y,c,a,only);};
 const skin=['shoulder','arm','fist','chest','forearm','grip','thigh','shin','foot'];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,v=d[i];if(!(v>>>24))continue;
  const r=v&255,g=(v>>>8)&255,b=(v>>>16)&255,l=(r*.27+g*.56+b*.17)/255,has=n=>inside(x+.5,y+.5,P[n]);
  let m=(b>r*.88&&b>g*1.02)?'lapis':'gold';
  if(skin.some(has))m='linen';
  if(has('mask')||has('collar')||has('cuff')||has('belt')||has('crook'))m='gold';
  if(has('nemes')&&!has('mask')&&!has('collar'))m=b>r*.72?'lapis':'gold';
  if(has('kilt'))m=b>r*.72?'lapis':'gold';
  if(has('jewel'))m='lapis';
  mat[i]=m;
  let t=m==='gold'?clamp((l-.02)*1.14):m==='linen'?clamp((l-.035)*1.08):clamp(l*1.43);
  // Preserve the original edge shadows; avoid turning charcoal edges bronze.
  const color=l<.085?C.ink:ramp(m,t);
  put(x,y,color);
 }

 // Nemes: broad, stepped blue/gold bands fold consistently over the crown.
 // Bands are painted in their own cloth island, so collar/face keep authority.
 const crown=[[41,18],[43,15],[48,10],[53,7],[58,6],[61,8],[61,17],[64,21],[58,23],[50,21]];
 fill(crown,C.blue,.8);
 for(const p of [ [[49,10],[55,9],[59,10]], [[45,14],[53,13],[60,14]], [[42,18],[51,17],[60,18]], [[45,21],[54,21],[61,22]] ]){
  line(p,C.gold,.96);line(p.map(([x,y])=>[x,y-1]),C.goldLight,.78);
 }
 line([[52,7],[56,6],[59,7]],C.gleam,.86);
 line([[40,19],[47,20],[53,22]],C.blueDark,.95);
 // Front lappet: four clean bands and a dark edge against the mask and neck.
 fill([[56,21],[61,22],[64,26],[65,34],[62,35],[59,29]],C.blue,.84);
 for(const p of [ [[56,23],[61,24]], [[58,27],[63,28]], [[60,31],[64,32]], [[62,35],[65,35]] ]){
  line(p,C.goldLight,.95);line(p.map(([x,y])=>[x,y+1]),C.goldShade,.8);
 }
 line([[61,21],[64,25],[66,33]],C.blueDark,.83);
 line([[69,22],[71,26],[73,32],[73,35]],C.blue,.9);
 line([[70,25],[72,25]],C.goldLight,.95);
 line([[71,29],[73,29]],C.goldLight,.95);
 line([[72,33],[74,33]],C.goldLight,.95);

 // Stern funerary mask: brow, narrow black eye, strong nose plane and jaw.
 // Small areas are intentionally two pixels thick to survive mesh sampling.
 fill([[62,8],[65,8],[67,11],[67,18],[65,21],[63,19],[62,15]],C.gold,.91);
 fill([[66,11],[68,12],[68,18],[66,21],[65,20]],C.goldShade,.9);
 line([[62,10],[64,10],[66,11]],C.gleam,.9);
 line([[62,12],[65,12],[66,13]],C.goldDark,1);
 line([[63,13],[65,13]],C.ink,1);
 line([[63,14],[65,14]],C.blueDark,1);
 line([[66,13],[66,16],[67,16]],C.goldLight,1);
 line([[63,17],[65,18],[67,18]],C.goldDark,1);
 line([[64,17],[66,17]],C.gleam,.9);
 line([[65,20],[67,19]],C.goldLight,.95);
 // Uraeus crown ornament and lapis ceremonial false beard.
 line([[65,2],[66,2],[66,5],[65,7]],C.goldLight,.95);
 put(65,3,C.gleam);put(65,6,C.red);
 fill([[66,21],[68,21],[69,27],[68,28],[66,24]],C.blueDark,.98);
 line([[67,22],[68,26]],C.blueLight,.92);

 // Broad usekh collar: gold rims and separated lapis inlays, no glitter noise.
 line([[29,21],[35,22],[42,26],[49,31],[57,35],[66,38],[73,38],[77,36]],C.goldLight,.97);
 line([[30,22],[36,23],[43,28],[50,33],[58,37],[67,40],[74,39],[77,37]],C.goldShade,.96);
 line([[36,24],[43,29],[50,34],[58,38],[67,41],[74,40]],C.goldDark,.94);
 for(const p of [ [[37,24],[39,27]], [[43,27],[45,30]], [[49,31],[51,34]], [[55,34],[57,37]], [[62,37],[63,40]], [[70,38],[70,40]], [[75,36],[75,38]] ]){
  line(p,C.blue,.96);line(p.map(([x,y])=>[x+1,y]),C.blueLight,.68);
 }
 line([[33,22],[38,24]],C.gleam,.9);
 line([[53,35],[59,38],[65,40]],C.goldLight,.8);

 // Chest and limbs retain old linen, with readable wrap overlaps and planes.
 fill([[46,40],[52,42],[58,43],[58,47],[50,46],[45,44]],C.linenLight,.35,'linen');
 fill([[49,48],[59,49],[65,47],[66,51],[60,53],[49,51]],C.linenDark,.27,'linen');
 const wraps=[
  [[28,34],[32,35],[37,34]],[[28,38],[33,39],[38,38]],
  [[27,45],[31,46],[36,44]],[[27,50],[31,51],[35,49]],[[29,55],[33,56],[36,54]],
  [[43,40],[49,42],[55,42]],[[44,44],[50,46],[60,46],[65,44]],[[48,50],[57,51],[63,49]],
  [[50,80],[56,82],[60,81]],[[46,86],[51,88],[57,87]],[[43,92],[47,94],[52,93]],
  [[38,100],[42,101],[47,100]],[[37,105],[41,106],[45,105]],[[36,110],[40,111],[43,110]],
 ];
 for(const p of wraps){line(p,C.linenDark,.69,'linen');line(p.map(([x,y])=>[x,y-1]),C.linenLight,.66,'linen');}
 line([[32,29],[35,30],[38,32]],C.linenLight,.7,'linen');
 line([[35,68],[38,68],[41,70]],C.linenLight,.8,'linen');
 for(const y of [71,74])line([[33,y],[37,y+1],[41,y]],C.linenDark,.68,'linen');
 line([[89,42],[93,42],[96,43]],C.linenLight,.82,'linen');
 for(const y of [44,47])line([[89,y],[94,y+1],[96,y]],C.linenDark,.82,'linen');
 line([[36,117],[41,116],[44,118]],C.linenLight,.64,'linen');
 line([[38,120],[41,119],[44,120]],C.linenDark,.62,'linen');

 // Royal cuffs and belt carry a few large set stones, each with one facet.
 line([[29,59],[33,60],[36,59]],C.goldLight,.92,'gold');
 line([[30,64],[34,65],[37,64]],C.goldDark,.95,'gold');
 fill([[32,60],[34,60],[35,63],[33,64],[32,62]],C.red,.98,'gold');
 put(33,60,[227,101,66]);
 line([[49,53],[58,54],[64,53]],C.goldLight,.92,'gold');
 line([[49,56],[57,57],[63,55]],C.goldDark,.87,'gold');
 line([[73,53],[77,55],[78,58]],C.goldLight,.9,'gold');
 fill([[68,50],[70,51],[71,54],[69,56],[67,54]],C.blueDark,1);
 fill([[68,51],[70,52],[70,54],[68,54]],C.blue,.98);
 line([[68,51],[69,51]],C.blueLight,1);put(68,51,[158,202,220]);
 line([[66,52],[66,55],[69,58],[72,55],[72,52],[69,49],[66,52]],C.goldLight,.97);

 // Kilt front: strong gold edge, quiet lapis field, and one royal glyph.
 fill([[66,61],[69,61],[73,80],[74,94],[71,98],[68,95]],C.blue,.84);
 line([[64,60],[65,73],[66,87],[68,97],[71,100]],C.goldLight,.96);
 line([[70,60],[72,71],[75,88],[75,96],[72,100]],C.gold,.94);
 line([[65,61],[66,74],[67,87],[69,96]],C.goldDark,.83);
 line([[68,66],[69,66],[70,73],[69,77]],C.goldLight,.86);
 line([[68,78],[72,78],[73,81],[70,84],[68,81],[68,78]],C.gold,.92);
 line([[70,84],[71,91]],C.goldLight,.92);
 line([[69,87],[73,87]],C.gold,.92);
 line([[70,92],[72,93]],C.gold,.9);
 // Diagonal sash keeps one bright top edge, with a broad shadow underneath.
 line([[60,60],[55,63],[48,67],[43,69]],C.goldLight,.85,'gold');
 line([[59,65],[52,70],[46,73]],C.goldDark,.74,'gold');
 line([[59,71],[53,76],[48,79]],C.goldLight,.88,'gold');

 // Quiet, long lapis cape folds contrast the opulent metal borders.
 line([[27,54],[24,65],[23,80],[21,93],[21,105],[20,114]],C.blueLight,.53,'lapis');
 line([[29,57],[27,72],[28,86],[26,100],[24,111]],C.blueDark,.7,'lapis');
 line([[34,80],[32,91],[31,105],[29,115]],C.blueLight,.45,'lapis');
 line([[55,94],[52,104],[51,114]],C.blueLight,.46,'lapis');
 line([[15,88],[12,99],[11,111]],C.goldLight,.57,'gold');
 line([[5,117],[10,118],[16,118]],C.goldLight,.73,'gold');

 // Solid golden crook: continuous exterior rim and a deep inner plane.
 line([[86,12],[89,9],[94,8],[98,10],[100,13],[100,18],[98,22]],C.goldLight,.92);
 line([[86,13],[85,17],[86,21],[89,25]],C.gleam,.86);
 line([[88,12],[90,11],[94,10],[97,12]],C.goldShade,.9);
 line([[99,14],[99,18],[97,22]],C.goldDark,.9);
 line([[89,26],[89,32],[88,37]],C.goldLight,.93);
 // The existing rigid shaft runs behind the gripping hand.
 line([[88,50],[87,63],[86,76],[85,89],[84,103],[83,115]],C.goldLight,.84,'gold');
 line([[89,51],[88,64],[87,77],[86,90],[85,104],[84,115]],C.goldDark,.86,'gold');
 for(const [x,y] of [[88,54],[87,67],[86,80],[85,93],[84,106]]){
  line([[x-1,y],[x+1,y]],C.blueDark,.86);put(x,y-1,C.goldLight,.92);
 }
 return {...source,d};
}
