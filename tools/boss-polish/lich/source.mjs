// Malgrath: native material painting on the original 128 × 128 texture.
// The silhouette is immutable. The original rig owns all motion and geometry.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const inside=(x,y,p)=>{let b=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],c=p[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
const palette={
 cloth:[[15,12,23],[27,18,39],[42,25,58],[59,33,78],[77,43,98],[99,56,118],[128,77,145]],
 lining:[[14,13,25],[25,23,39],[39,34,59],[55,46,79],[77,62,100],[103,83,125],[134,111,149]],
 gold:[[34,24,26],[66,43,28],[107,70,33],[151,105,44],[190,145,68],[222,185,103],[245,220,151]],
 bone:[[24,25,28],[54,55,49],[94,92,72],[142,134,103],[187,176,136],[221,211,171],[247,239,201]],
 wood:[[20,17,24],[42,29,32],[69,43,34],[99,63,39],[133,88,48],[171,124,68],[204,161,98]],
 green:[[14,29,27],[22,53,33],[30,87,39],[54,128,44],[94,178,58],[154,223,99],[225,252,169]],
};
const polys={
 crown:[[53,4],[59,10],[60,2],[64,8],[66,8],[67,1],[70,6],[73,1],[75,1],[75,15],[71,19],[62,17],[55,13]],
 face:[[68,12],[74,12],[75,18],[73,24],[73,31],[69,31],[66,27],[66,20]],
 hand:[[49,59],[54,58],[56,63],[59,68],[58,78],[55,79],[51,76],[49,70]],
 grip:[[92,35],[98,35],[101,38],[100,41],[98,44],[93,44],[90,41]],
 skull:[[95,1],[103,1],[109,5],[110,11],[108,19],[104,22],[101,20],[96,22],[93,18],[92,12],[89,12],[91,6]],
 shoulder:[[34,27],[40,24],[49,25],[55,27],[58,34],[51,36],[43,34],[36,34],[31,35]],
 brooch:[[56,27],[60,26],[64,29],[65,36],[63,40],[62,46],[58,46],[56,40],[54,35]],
 chest:[[64,33],[70,32],[76,33],[81,36],[84,39],[81,43],[76,44],[70,41],[63,40]],
 buckle:[[70,49],[76,48],[80,50],[81,54],[77,58],[71,56]],
};

export function polishSource(source){
 const {w,h}=source,d=source.d.slice(),materials=new Array(d.length);
 const rgb=v=>[v&255,(v>>>8)&255,(v>>>16)&255];
 const pack=(v,c)=>((v>>>24)<<24)|(c[2]<<16)|(c[1]<<8)|c[0];
 const put=(x,y,c,a=1,m=null)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x,v=d[i];if(!(v>>>24))return;const old=rgb(v);d[i]=pack(v,old.map((k,n)=>Math.round(k+(c[n]-k)*a)));if(m)materials[i]=m;};
 const line=(p,c,a=1,m=null)=>{for(let n=1;n<p.length;n++){const [x0,y0]=p[n-1],[x1,y1]=p[n],steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=steps;k++)put(x0+(x1-x0)*k/steps,y0+(y1-y0)*k/steps,c,a,m);}};
 const fill=(p,c,a=1,m=null)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inside(x+.5,y+.5,p))put(x,y,c,a,m);};
 const shade=(m,t)=>palette[m][Math.round(clamp(t)*6)];
 // Material-aware local light removes the generated microtexture, retaining
 // the sculpted volume before authoring larger folds and controlled borders.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,v=source.d[i];if(!(v>>>24))continue;
  const [r,g,b]=rgb(v),has=n=>inside(x+.5,y+.5,polys[n]);
  const warm=r>b*1.20&&g>b*1.02;
  let m=y>89&&x>61&&x<87?'lining':'cloth';
  if(warm)m='gold';
  if(x>86&&y>23)m='wood';
  if(has('crown')||has('shoulder')||has('brooch')||has('chest')||has('buckle'))m='gold';
  if(has('face')||has('hand')||has('grip')||has('skull'))m='bone';
  if(g>r*1.09&&g>b*1.16)m='green';
  materials[i]=m;
  let light=0,total=0;
  for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){
   const p=source.d[yy*w+xx];if(!(p>>>24))continue;const [rr,gg,bb]=rgb(p),ww=rr>bb*1.20&&gg>bb*1.02;
   if(ww!==warm&&m!=='bone')continue;const weight=xx===x&&yy===y?4:1;
   light+=(rr*.26+gg*.59+bb*.15)/255*weight;total+=weight;
  }
  let t=light/total;
  if(m==='cloth')t=clamp((t-.025)*1.85);
  if(m==='lining')t=clamp(t*1.65);
  if(m==='gold')t=clamp((t-.035)*1.2);
  if(m==='bone')t=clamp((t-.045)*1.27);
  if(m==='wood')t=clamp(t*1.12);
  if(m==='green')t=clamp(t*1.4);
  d[i]=pack(v,shade(m,t));
 }

 // Broad violet velvet folds. Each plane has a shadow edge and a restrained
 // lit shoulder, so the body reads at the game's native rendering scale.
 fill([[31,39],[48,36],[56,38],[49,43],[35,47],[27,47]],[59,43,78],.85,'lining');
 fill([[29,45],[41,43],[48,46],[42,54],[34,67],[29,78],[26,93],[21,103],[14,108],[19,96],[22,76],[23,58]],[59,33,78],.72,'cloth');
 fill([[42,45],[48,46],[44,54],[37,65],[31,80],[27,96],[21,103],[24,88],[28,70],[34,55]],[99,56,118],.66,'cloth');
 fill([[32,56],[29,71],[26,86],[25,99],[20,107],[14,110],[18,98],[19,83],[22,69]],[27,18,39],.78,'cloth');
 fill([[49,77],[57,74],[59,81],[53,95],[44,108],[34,117],[24,122],[30,113],[41,99]],[77,43,98],.73,'cloth');
 fill([[50,80],[51,89],[44,101],[34,112],[30,113],[40,99]],[27,18,39],.8,'cloth');
 fill([[59,87],[63,89],[59,100],[53,110],[48,117],[42,121],[45,113],[53,101]],[99,56,118],.72,'cloth');
 fill([[60,102],[64,100],[62,112],[60,119],[55,122],[56,114]],[59,33,78],.8,'cloth');
 // The robe beneath the mantle is cool, almost black; its vertical folds
 // contrast with the long diagonal sweep of the cape.
 fill([[69,71],[73,73],[74,96],[72,110],[73,122],[68,122],[67,109],[69,94]],[39,34,59],.9,'lining');
 fill([[74,90],[77,96],[78,108],[81,121],[76,121],[74,110]],[77,62,100],.8,'lining');
 fill([[78,92],[81,92],[83,106],[85,121],[82,121],[78,108]],[25,23,39],.8,'lining');
 line([[70,99],[69,110],[70,119]],[103,83,125],.7,'lining');
 line([[76,103],[77,113],[79,119]],[103,83,125],.65,'lining');

 // Paired vestment panels: saturated silk fields, narrow antique-gold edges.
 // The old all-over embroidery becomes legible ritual clothing, not noise.
 fill([[62,41],[68,41],[69,53],[68,64],[67,70],[63,67],[61,59]],[59,33,78],.94,'cloth');
 fill([[75,56],[79,57],[80,71],[82,87],[80,96],[76,93],[74,81]],[42,25,58],.95,'cloth');
 fill([[61,73],[67,73],[67,84],[65,95],[58,98],[53,98],[58,88]],[59,33,78],.92,'cloth');
 line([[62,42],[62,54],[62,64],[64,69],[67,70]],[190,145,68],1,'gold');
 line([[68,42],[69,54],[68,64],[67,70]],[107,70,33],1,'gold');
 line([[74,57],[74,76],[75,89],[77,95],[80,96],[82,89]],[190,145,68],1,'gold');
 line([[79,58],[80,73],[82,87],[81,92]],[107,70,33],1,'gold');
 line([[61,75],[61,84],[57,94],[53,98],[60,98],[65,96],[67,87]],[190,145,68],1,'gold');
 line([[63,75],[63,85],[59,94],[56,96]],[107,70,33],1,'gold');
 // Three repeated gilded lozenges are the only embroidery on these panels.
 for(const [x,y] of [[65,52],[78,72],[62,88]]){
  fill([[x,y-3],[x+2,y],[x,y+3],[x-2,y]],[151,105,44],1,'gold');
  put(x,y-1,[245,220,151],1,'gold');put(x,y,[42,25,58],1,'cloth');
 }
 // Mantle trim follows existing cloth; highlights are confined to bends.
 line([[45,50],[49,53],[46,58],[42,65],[37,72],[33,80],[32,87],[35,94]],[190,145,68],.9,'gold');
 line([[45,52],[47,54],[44,60],[40,67],[35,75]],[245,220,151],.75,'gold');
 line([[35,95],[31,103],[24,108],[16,112],[9,116],[3,119]],[151,105,44],.85,'gold');
 line([[25,109],[18,113],[12,116],[8,117]],[222,185,103],.8,'gold');
 line([[24,122],[31,119],[37,114],[42,109]],[190,145,68],.8,'gold');

 // Raised collar and two gold shoulder masses frame the pale skull.
 fill([[48,16],[56,18],[64,23],[66,31],[61,28],[55,23]],[59,33,78],.9,'cloth');
 fill([[75,21],[82,22],[80,26],[76,29]],[59,33,78],.9,'cloth');
 line([[37,19],[43,19],[49,22],[55,26],[59,29]],[190,145,68],.9,'gold');
 line([[35,18],[41,18],[47,20]],[245,220,151],.85,'gold');
 line([[51,16],[57,19],[61,21]],[107,70,33],.9,'gold');
 line([[36,29],[40,27],[46,27],[51,29],[54,32]],[222,185,103],.85,'gold');
 fill([[38,30],[44,29],[50,30],[52,33],[47,34],[40,33]],[107,70,33],.8,'gold');
 line([[37,32],[43,32],[48,33]],[190,145,68],.85,'gold');
 fill([[57,29],[61,28],[64,30],[64,33],[62,37],[59,36],[56,33]],[222,185,103],.9,'gold');
 line([[58,32],[59,32]],[66,43,28],1,'gold');
 line([[62,32],[63,32]],[66,43,28],1,'gold');
 line([[59,36],[61,36],[62,35]],[107,70,33],1,'gold');
 line([[59,39],[60,43]],[190,145,68],.8,'gold');

 // A stern ivory profile beneath a royal crown. Continuous socket pixels
 // survive the head mesh's subpixel sampling without a flickering single eye.
 fill([[69,14],[73,14],[74,18],[72,20],[73,23],[71,27],[69,25],[68,20]],[221,211,171],.91,'bone');
 fill([[68,16],[70,15],[70,20],[69,23],[70,26],[68,25],[67,20]],[94,92,72],.95,'bone');
 line([[70,14],[73,14]],[247,239,201],1,'bone');
 line([[70,16],[73,16]],[24,25,28],1,'bone');
 line([[70,17],[73,17]],[30,87,39],1,'green');
 line([[71,16],[72,16]],[154,223,99],1,'green');
 line([[71,17],[72,17]],[225,252,169],1,'green');
 line([[73,19],[74,20],[72,20]],[54,55,49],1,'bone');
 line([[70,23],[73,23]],[24,25,28],1,'bone');
 line([[70,24],[72,24]],[247,239,201],1,'bone');
 put(71,24,[94,92,72],1,'bone');
 line([[69,27],[71,28],[72,27]],[187,176,136],1,'bone');
 line([[57,10],[62,13],[68,13],[73,11]],[222,185,103],.95,'gold');
 line([[61,5],[62,10],[64,12]],[245,220,151],.9,'gold');
 line([[68,3],[68,10],[70,12]],[245,220,151],.9,'gold');
 line([[74,3],[73,10]],[222,185,103],.85,'gold');
 fill([[64,11],[66,10],[67,12],[66,14],[64,13]],[59,33,78],1,'cloth');
 put(65,11,[128,77,145],1,'cloth');

 // Emerald breast seal anchors the gold chain but stays subordinate to eyes.
 fill([[74,34],[77,33],[80,35],[81,38],[78,40],[75,39],[73,37]],[107,70,33],1,'gold');
 fill([[76,34],[78,34],[80,36],[79,39],[76,38],[75,36]],[54,128,44],1,'green');
 line([[76,35],[77,34],[78,35]],[154,223,99],1,'green');
 put(77,35,[225,252,169],1,'green');
 line([[77,39],[78,39],[79,38]],[22,53,33],1,'green');

 // Skull sceptre: broad bone planes and dark green eye cavities, with a
 // restrained bright brow. The wooden shaft remains continuous through grip.
 fill([[98,3],[103,2],[107,5],[108,8],[104,9],[99,7],[96,8]],[221,211,171],.85,'bone');
 fill([[95,8],[99,8],[100,13],[98,17],[95,16],[93,13]],[94,92,72],.85,'bone');
 fill([[101,9],[106,8],[108,11],[106,15],[104,17],[101,15]],[187,176,136],.88,'bone');
 fill([[96,9],[99,9],[100,11],[98,13],[95,12]],[14,29,27],1,'green');
 fill([[104,10],[108,9],[108,12],[106,14],[103,13]],[14,29,27],1,'green');
 line([[96,10],[98,10],[98,11]],[94,178,58],1,'green');
 line([[104,11],[107,10]],[154,223,99],1,'green');
 put(97,10,[225,252,169],1,'green');put(106,11,[225,252,169],1,'green');
 line([[101,12],[102,15],[100,16]],[54,55,49],1,'bone');
 line([[102,17],[106,16]],[24,25,28],1,'bone');
 for(const [x,y]of [[102,18],[104,18],[106,17]])line([[x,y],[x,y+2]],[221,211,171],1,'bone');
 line([[99,3],[102,3],[105,5]],[247,239,201],.95,'bone');
 line([[94,20],[96,23],[99,23],[102,22]],[190,145,68],.9,'gold');
 line([[95,26],[94,32],[94,35]],[190,145,68],.85,'gold');
 line([[94,45],[94,51],[93,58],[92,65],[92,74],[90,89],[88,106],[87,121]],[151,105,44],.9,'wood');
 line([[95,46],[95,51],[94,57],[93,65],[93,73]],[66,43,28],1,'wood');
 for(const [x,y]of [[94,29],[94,47],[93,60],[92,73],[90,89],[88,106]])line([[x-1,y],[x+1,y]],[222,185,103],.9,'gold');
 // Deliberate finger separations replace the stippled hand surfaces.
 line([[93,37],[97,37],[99,38]],[247,239,201],.85,'bone');
 line([[93,39],[97,39],[99,40]],[54,55,49],.85,'bone');
 line([[93,41],[96,41],[98,42]],[247,239,201],.85,'bone');
 line([[51,63],[53,65],[55,67]],[247,239,201],.75,'bone');
 for(const [x,y]of [[52,69],[54,70],[56,70]])line([[x,y],[x,y+5]],[221,211,171],.85,'bone');
 for(const [x,y]of [[53,70],[55,71],[57,71]])line([[x,y],[x,y+4]],[54,55,49],.85,'bone');

 // Final palette snapping makes every painted plane a small set of hard
 // pixel clusters. No extra texture or pixels are introduced by this pass.
 for(let i=0;i<d.length;i++)if(d[i]>>>24){const c=rgb(d[i]),ramp=palette[materials[i]],best=ramp.reduce((best,p)=>{const dist=p.reduce((s,k,n)=>s+(k-c[n])**2,0);return dist<best.dist?{p,dist}:best;},{dist:Infinity});d[i]=pack(d[i],best.p);}
 return {...source,d};
}
