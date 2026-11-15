// Grimgut material painting in the original 128px model coordinates.
// This is a surface pass: every original alpha byte and the shared rig survive.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const poly={
 hood:[[45,14],[54,10],[60,5],[64,1],[69,2],[74,6],[78,11],[80,24],[79,29],[73,30],[65,28],[61,23],[52,21]],
 shoulder:[[21,35],[27,24],[34,18],[43,15],[52,18],[59,23],[63,29],[64,36],[62,45],[59,50],[50,52],[42,48],[35,46],[33,51],[23,48],[19,44]],
 chest:[[62,25],[67,28],[74,30],[79,28],[85,33],[86,40],[81,41],[78,37],[68,36],[64,32]],
 hand:[[20,61],[29,61],[34,63],[37,67],[35,73],[32,76],[25,75],[20,71]],
 fist:[[92,32],[101,32],[106,36],[107,43],[102,48],[94,47],[91,43],[90,36]],
 apron:[[63,34],[79,35],[85,40],[88,47],[92,55],[92,64],[94,74],[96,91],[94,106],[66,106],[63,98],[40,100],[32,93],[38,80],[40,66],[43,53],[56,51],[62,46]],
 blade:[[87,0],[112,0],[112,32],[92,32],[91,17]],
 hook:[[29,74],[36,73],[36,80],[27,83],[23,87],[22,91],[24,95],[29,97],[34,96],[36,91],[37,86],[41,86],[41,94],[37,100],[31,103],[24,102],[20,99],[17,94],[18,87],[22,81]],
 belt:[[38,55],[45,54],[55,55],[66,56],[78,57],[91,57],[94,64],[84,64],[72,63],[59,63],[49,63],[37,65]],
 buckle:[[54,53],[60,53],[63,57],[62,62],[57,64],[54,61]],
 chain:[[51,61],[54,61],[54,69],[56,73],[59,74],[62,71],[62,65],[65,64],[65,72],[62,76],[56,77],[52,74]],
};
const ramps={
 hood:[[8,11,16],[25,30,38],[65,72,82]],
 skin:[[34,22,26],[151,108,90],[242,209,169]],
 apron:[[13,19,27],[48,61,72],[122,137,146]],
 leather:[[15,12,15],[55,37,32],[116,85,63]],
 steel:[[19,28,39],[93,118,135],[220,233,232]],
 iron:[[16,22,29],[74,89,99],[167,181,184]],
 blood:[[25,11,19],[84,23,31],[135,48,45]],
};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function ramp(name,t){const a=ramps[name],q=Math.round(clamp(t)*31)/31;return q<.5?mix(a[0],a[1],q*2):mix(a[1],a[2],(q-.5)*2);}

export function polishSource(source){
 const {w,h}=source,d=source.d.slice(),mat=new Array(d.length);
 const put=(x,y,c,a=1,only=null)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x,v=d[i];if(!(v>>>24)||(only&&mat[i]!==only))return;const old=[v&255,(v>>>8)&255,(v>>>16)&255],rgb=mix(old,c,a).map(v=>Math.round(clamp(v,0,255)));d[i]=((v>>>24)<<24)|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0];};
 const line=(p,c,a=1,only=null)=>{for(let n=1;n<p.length;n++){const [x0,y0]=p[n-1],[x1,y1]=p[n],steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=steps;k++)put(x0+(x1-x0)*k/steps,y0+(y1-y0)*k/steps,c,a,only);}};
 const fill=(p,c,a=1,only=null)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inside(x+.5,y+.5,p))put(x,y,c,a,only);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,v=d[i];if(!(v>>>24))continue;
  const r=v&255,g=(v>>>8)&255,b=(v>>>16)&255,l=(r*.26+g*.57+b*.17)/255,has=n=>inside(x+.5,y+.5,poly[n]);
  let m='leather';
  if(has('apron'))m='apron';
  if(has('shoulder')||has('chest')||has('hand')||has('fist'))m='skin';
  if(has('hood'))m='hood';
  if(has('belt'))m='leather';
  if(has('blade')||has('hook'))m='steel';
  if(has('buckle')||has('chain'))m='iron';
  mat[i]=m;
  let t=l;
  if(m==='hood')t=clamp((l-.07)*1.23);
  if(m==='skin')t=clamp((l-.065)*1.12);
  if(m==='apron')t=clamp((l-.025)*1.48);
  if(m==='leather')t=clamp(l*1.45);
  if(m==='steel')t=clamp((l-.055)*1.35);
  if(m==='iron')t=clamp(l*1.35);
  let color=ramp(m,t);
  // Blood belongs to selected wounds/stains, never the whole warm material.
  const redness=r-Math.max(g,b),stain=redness>30&&r>g*1.29;
  if(stain&&((m==='apron'&&((x>67&&x<83&&y>73)||(x>77&&y>47&&y<55)))||(m==='steel'&&((y>87)||(x>105&&y<29)))))color=mix(color,ramp('blood',clamp(l*1.5)),.83);
  if(stain&&m==='skin'&&((x<47&&y<32)||(x>47&&y>38&&y<49)||(x<31&&y>37&&y<45)))color=mix(color,[112,49,49],.38);
  put(x,y,color);
 }

 // Coal hood: one hard brow, folded crown and a deep face plane.
 fill([[67,10],[76,10],[79,17],[78,23],[73,26],[67,23]], [8,11,16],.48,'hood');
 line([[63,5],[66,4],[70,6],[73,9]],[90,96,103],.52,'hood');
 line([[59,13],[63,12],[67,13]],[59,67,77],.7,'hood');
 line([[69,10],[73,10],[77,11]],[5,7,10],1,'hood');
 line([[70,12],[73,13]],[16,6,10],1,'hood');
 line([[75,13],[77,12]],[16,6,10],1,'hood');
 line([[70,12],[72,12]],[217,44,35],1,'hood');
 line([[75,12],[76,12]],[194,31,28],1,'hood');
 put(71,12,[255,99,56],1,'hood');
 // A darker second row keeps both narrow slits present when the head mesh
 // samples between source rows during breathing. Columns 73–74 stay black.
 line([[70,13],[72,13]],[167,28,26],1,'hood');
 line([[75,13],[76,13]],[150,22,24],1,'hood');
 line([[69,16],[69,21],[71,25]],[43,50,59],.7,'hood');
 line([[74,16],[74,22]],[45,52,60],.64,'hood');
 line([[64,24],[69,27],[75,28]],[10,13,19],.8,'hood');

 // Reassert broad shoulder/pectoral planes with short, deliberate scar seams.
 line([[30,22],[34,20],[39,19],[43,19]],[238,207,170],.55,'skin');
 line([[49,22],[53,24],[56,27]],[244,212,176],.48,'skin');
 line([[48,32],[52,34],[59,34]],[61,36,37],.5,'skin');
 line([[36,43],[41,47],[48,49],[54,49]],[57,32,35],.6,'skin');
 line([[42,21],[39,23],[38,26],[36,29]],[122,54,53],.8,'skin');
 line([[43,21],[40,24],[39,27]],[240,182,149],.7,'skin');
 for(const [x,y] of [[40,23],[38,26],[37,28]])line([[x-1,y],[x+1,y+1]],[62,36,37],.9,'skin');
 line([[58,40],[55,43],[52,45],[49,46]],[120,48,49],.8,'skin');
 line([[58,41],[55,44],[52,46]],[235,179,143],.7,'skin');
 for(const [x,y] of [[56,42],[53,44],[50,46]])line([[x-1,y-1],[x+1,y+1]],[66,36,38],.85,'skin');
 // Fist knuckles and finger separations keep the cleaver visibly gripped.
 line([[94,35],[98,34],[102,35]],[232,194,155],.65,'skin');
 line([[94,39],[99,39],[103,38]],[67,39,37],.6,'skin');
 line([[94,43],[99,43],[103,42]],[67,39,37],.6,'skin');

 // Apron: large cool folds, a sewn leather binding, and a single ragged stain.
 fill([[65,65],[69,65],[68,98],[66,103],[64,98]], [16,24,33],.48,'apron');
 fill([[87,66],[90,66],[92,101],[88,99]], [16,23,30],.43,'apron');
 line([[67,66],[69,78],[69,91],[70,100]],[123,139,146],.35,'apron');
 line([[82,66],[81,77],[84,91],[83,101]],[129,143,147],.3,'apron');
 line([[63,38],[63,48],[64,55]],[18,25,32],.75,'apron');
 line([[64,38],[64,48],[65,54]],[128,137,137],.45,'apron');
 line([[64,65],[63,79],[63,95],[65,105]],[101,76,58],.85,'apron');
 for(let y=68;y<100;y+=5)put(64,y,[156,131,99],.64,'apron');
 fill([[73,78],[76,76],[79,80],[78,85],[77,88],[76,96],[74,91],[72,85]], [81,22,31],.48,'apron');
 line([[74,85],[75,90],[75,95]],[43,15,24],.75,'apron');
 // Dark boot uppers remain distinct from the apron and catch small iron tips.
 line([[37,112],[42,111],[47,111],[51,113]],[126,112,94],.44,'leather');
 line([[78,112],[84,111],[90,112],[94,114]],[126,112,94],.44,'leather');
 line([[35,120],[43,121],[53,121]],[16,15,18],.9,'leather');
 line([[78,121],[87,122],[99,122]],[16,15,18],.9,'leather');
 for(const [x,y] of [[23,51],[31,51],[23,58],[30,58],[45,58],[70,60],[86,61]]){
  put(x,y,[148,156,154],.75);put(x,y+1,[26,24,26],.8);
 }

 // Cleaver: cool broad face, thick dark spine and a single chipped edge.
 fill([[95,5],[103,4],[103,28],[96,29]], [129,155,169],.24,'steel');
 line([[92,5],[94,12],[94,26],[95,29]],[25,34,45],.85,'steel');
 line([[108,4],[109,9],[108,14],[109,19],[108,24],[108,28]],[226,236,230],.87,'steel');
 line([[105,5],[106,12],[105,19],[106,26]],[177,199,207],.62,'steel');
 line([[96,29],[102,29],[107,28]],[195,215,219],.72,'steel');
 line([[98,8],[101,11]],[45,64,80],.55,'steel');
 line([[98,9],[101,12]],[191,211,217],.45,'steel');
 line([[97,22],[100,20]],[45,64,80],.65,'steel');
 // Hook edge follows the open curve; blood is limited to its lower barb.
 line([[29,80],[25,82],[22,86],[21,90],[22,94]],[185,206,214],.76,'steel');
 line([[24,97],[28,99],[32,99],[35,97],[37,93],[38,89]],[170,195,207],.66,'steel');
 line([[25,94],[28,96],[32,96],[34,94]],[22,31,42],.85,'steel');
 line([[19,91],[20,95],[23,98],[27,100]],[137,32,36],.72,'steel');
 return {...source,d};
}
