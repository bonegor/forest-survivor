// Frostthane: native material and facial paint over the original 128px model.
// All drawing is clipped to the original source alpha and semantic materials.
// The shared builder owns the silhouette, texture islands and complete motion.
const rgb = hex => { const n = Number.parseInt(hex.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >>> 16)) >>> 0; };
const ramps = {
  ice: ['#142735','#1d3d52','#285671','#357590','#4695ac','#65b3c5','#90d0db','#c6ebed','#ebf8f2'],
  skin: ['#182233','#24344e','#344d6b','#4a6b89','#638ba7','#82adc0','#a7cbd5','#d2e6e7'],
  steel: ['#151c2b','#263243','#3c4d60','#52677a','#738a99','#9aadb4','#c9d5d3'],
  beard: ['#29333d','#45535b','#6c7b7e','#99a6a3','#c6d0c4','#e4e8d7','#f7f3df'],
  fur: ['#231f22','#3c3434','#574b45','#776957','#9a8c70','#b8aa89','#d5c9a5','#e9dfbe'],
  horn: ['#302823','#514235','#77604a','#9d8160','#bca27d','#dac5a0','#eee0bc'],
  leather: ['#1d2026','#322d2d','#4b3b32','#67513d','#82684b','#a48a63','#c5af83'],
  bronze: ['#27272a','#493b31','#68543b','#8d7149','#b49561','#d3bb87','#e4d4a8'],
};
for (const k of Object.keys(ramps)) ramps[k] = ramps[k].map(rgb);
const inPoly = (x,y,p) => {let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const shapes = {
  beard: [[65,18],[72,18],[75,21],[80,23],[83,29],[84,38],[81,49],[77,45],[75,43],[73,36],[70,32],[68,28],[64,27],[63,23]],
  helmet: [[58,12],[64,4],[71,7],[76,13],[76,19],[72,23],[65,23],[58,19]],
  skin: [
    [[32,28],[42,26],[46,29],[49,35],[47,43],[44,48],[36,48],[31,45],[25,47],[26,38]],
    [[47,32],[60,32],[65,36],[68,38],[71,39],[76,45],[77,50],[47,50],[44,43]],
    [[32,63],[41,64],[46,67],[48,72],[46,78],[41,81],[33,79],[28,75],[29,68]],
    [[47,78],[56,80],[60,85],[57,90],[53,92],[43,95],[37,93],[39,86]],
    [[88,40],[93,37],[101,39],[105,43],[104,49],[100,53],[93,53],[88,49],[86,44]],
  ],
  fur: [
    [[18,26],[29,14],[35,9],[49,8],[55,12],[62,14],[66,23],[65,33],[57,33],[53,29],[45,25],[36,24],[29,29]],
    [[6,49],[14,32],[23,23],[32,22],[35,27],[26,35],[22,50],[20,60],[22,67],[19,82],[19,99],[15,114],[11,126],[9,113],[6,105],[8,91],[10,78],[12,65]],
    [[23,46],[30,45],[39,45],[43,48],[44,54],[39,52],[34,51],[28,51],[23,54]],
    [[36,59],[46,58],[59,59],[61,64],[54,66],[46,65],[41,66],[35,64]],
    [[54,66],[59,65],[64,70],[66,80],[71,91],[70,104],[66,110],[63,104],[63,91],[59,84],[56,76]],
    [[62,64],[67,64],[70,76],[75,84],[78,88],[77,95],[71,92],[68,84],[65,74]],
    [[25,92],[34,90],[43,90],[52,93],[55,98],[54,105],[49,101],[43,99],[34,99],[27,103],[24,102]],
    [[68,98],[77,94],[84,92],[88,94],[87,101],[81,104],[73,106],[67,105]],
    [[80,25],[85,25],[89,31],[87,36],[83,37]],
  ],
};

export function polishSource(source) {
  const {w,h}=source, original=source.d, d=original.slice(), materials=new Array(d.length);
  const lum=v=>(v&255)*.28+((v>>>8)&255)*.56+((v>>>16)&255)*.16;
  const is=(p,x,y)=>inPoly(x+.5,y+.5,p);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,v=original[i];if(!(v>>>24))continue;
    const r=v&255,g=(v>>>8)&255,b=(v>>>16)&255;
    const cold=b-r>5 && b>g-5;
    let material='leather';
    if(x>=84 && y<=41 && cold) material='ice';
    else if(y<14 && ((x>=49&&x<=63)||(x>=72&&x<=79)) && r>=b) material='horn';
    else if(is(shapes.helmet,x,y)) material='steel';
    else if(is(shapes.beard,x,y)) material='beard';
    else if(shapes.skin.some(p=>is(p,x,y)) && (cold||b>r-7)) material='skin';
    else if(shapes.fur.some(p=>is(p,x,y))) material='fur';
    else if(x>=68&&x<=84&&y>=49&&y<=63) material='bronze';
    // Retain cold steel ferrules on the leather-wrapped haft and bracers.
    else if(cold && ((x>=88&&y>50)||(x>=24&&x<44&&y>=52&&y<=66))) material='steel';
    else if(cold && y<50) material='steel';
    materials[i]=material;
    // A material-specific limited palette makes the existing volume legible.
    // No contrast/colour overlay is applied to the assembled sprite.
    let light=lum(v),lo=20,hi=235;
    if(material==='skin'){lo=28;hi=205;}
    if(material==='ice'){lo=24;hi=208;}
    if(material==='steel'){lo=21;hi=224;}
    if(material==='leather'){lo=15;hi=224;}
    if(material==='beard'){lo=25;hi=231;}
    if(material==='fur'){lo=22;hi=238;}
    const ramp=ramps[material],t=Math.max(0,Math.min(.999,(light-lo)/(hi-lo)));
    d[i]=ramp[Math.min(ramp.length-1,Math.floor(t*ramp.length))];
  }
  const put=(x,y,col,allowed)=>{if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x;if(!(original[i]>>>24)||allowed&&!allowed.includes(materials[i]))return;d[i]=typeof col==='string'?rgb(col):col;};
  const poly=(points,col,allowed)=>{const minX=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0])))),maxX=Math.min(w-1,Math.ceil(Math.max(...points.map(p=>p[0])))),minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),maxY=Math.min(h-1,Math.ceil(Math.max(...points.map(p=>p[1]))));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(inPoly(x+.5,y+.5,points))put(x,y,col,allowed);};
  const line=(points,col,allowed,width=1)=>{for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));for(let k=0;k<=steps;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/(steps||1)),y=Math.round(a[1]+(b[1]-a[1])*k/(steps||1));for(let off=0;off<width;off++)put(x+off,y,col,allowed);}}};

  // Broad cast-steel helmet plates, angular brow and one restrained nasal ridge.
  poly([[64,5],[67,7],[68,13],[64,14],[62,12]],'#52677a',['steel']);
  poly([[68,7],[71,8],[74,13],[70,13]],'#3c4d60',['steel']);
  line([[65,6],[67,9],[67,12]],'#9aadb4',['steel']);
  line([[59,14],[64,13],[68,14],[73,14],[75,15]],'#263243',['steel'],2);
  line([[60,13],[64,12],[68,13]],'#738a99',['steel']);
  poly([[62,15],[68,15],[69,18],[63,18]],'#151c2b',['steel']);
  poly([[70,15],[75,15],[74,18],[70,18]],'#151c2b',['steel']);
  // Eyes are set into the helmet rather than resting on top of a light beard.
  line([[65,16],[66,16]],'#65b3c5',['steel']);
  put(66,16,'#d2efef',['steel']);
  line([[71,16],[72,16]],'#65b3c5',['steel']);
  put(72,16,'#ebf8f2',['steel']);
  put(66,15,'#263243',['steel']);put(71,15,'#263243',['steel']);
  // A visible blue cheek and substantial nose keep this a living frost giant,
  // not a closed visor. The nasal guard shadows the far side of the face.
  poly([[70,18],[73,18],[74,20],[73,22],[70,22]],'#638ba7',['steel','beard']);
  poly([[70,18],[71,18],[72,20],[71,21],[69,20]],'#a7cbd5',['steel','beard']);
  line([[70,21],[72,21],[73,20]],'#344d6b',['steel','beard']);
  line([[68,13],[69,18],[68,21]],'#738a99',['steel','beard']);
  put(69,17,'#c9d5d3',['steel']);
  line([[64,18],[63,22],[65,25]],'#3c4d60',['steel','beard']);

  // Ivory beard is colder and cleaner than the mantle. Three locks follow
  // its existing silhouette and terminate before the original tassel tips.
  poly([[69,21],[73,22],[77,25],[76,28],[73,27],[70,24]],'#e4e8d7',['beard']);
  poly([[66,23],[68,24],[71,31],[73,38],[73,42],[71,37],[69,32]],'#c6d0c4',['beard']);
  poly([[74,28],[77,29],[79,35],[79,43],[77,42],[76,35]],'#e4e8d7',['beard']);
  poly([[80,30],[82,33],[82,39],[80,46],[80,40]],'#c6d0c4',['beard']);
  line([[68,27],[70,31],[71,35]],'#45535b',['beard']);
  line([[74,30],[75,34],[76,38]],'#6c7b7e',['beard']);
  line([[79,35],[80,38],[79,43]],'#6c7b7e',['beard']);
  line([[68,22],[70,23],[72,24]],'#f7f3df',['beard']);
  // Dark moustache split gives the veteran face an unambiguous stern mouth.
  line([[70,21],[72,21],[74,22]],'#45535b',['beard']);
  line([[71,23],[73,24],[75,24]],'#99a6a3',['beard']);

  // Deltoid, chest and knuckles receive connected planes, not texture noise.
  poly([[35,29],[40,29],[43,33],[41,36],[36,35],[33,33]],'#638ba7',['skin']);
  poly([[38,33],[43,34],[44,38],[41,42],[38,40]],'#82adc0',['skin']);
  poly([[29,38],[32,36],[34,39],[32,44],[28,45]],'#638ba7',['skin']);
  line([[34,37],[36,40],[35,44]],'#344d6b',['skin']);
  poly([[49,35],[55,34],[60,36],[61,38],[55,38],[50,37]],'#638ba7',['skin']);
  poly([[58,41],[63,39],[67,40],[68,43],[64,45],[59,44]],'#82adc0',['skin']);
  line([[49,40],[54,41],[58,40]],'#24344e',['skin']);
  line([[56,43],[56,46],[58,48]],'#344d6b',['skin']);
  poly([[34,66],[38,66],[40,68],[39,71],[35,70]],'#82adc0',['skin']);
  line([[33,70],[33,74],[35,76]],'#a7cbd5',['skin']);
  line([[37,71],[37,76]],'#344d6b',['skin']);
  line([[41,70],[42,74]],'#344d6b',['skin']);
  poly([[46,84],[50,81],[53,83],[54,87],[50,89],[46,88]],'#82adc0',['skin']);
  line([[43,88],[46,90],[50,91]],'#344d6b',['skin']);
  line([[92,41],[96,41],[100,42]],'#a7cbd5',['skin']);
  line([[91,45],[96,45],[101,46]],'#344d6b',['skin']);
  line([[92,47],[98,48],[101,48]],'#82adc0',['skin']);

  // The axe uses large mineral faces. Bright pixels belong to one continuous
  // outer cutting edge and the crystalline ridge, never a detached glow.
  poly([[97,3],[95,10],[91,14],[89,23],[87,27],[86,19],[87,12],[92,7]],'#65b3c5',['ice']);
  poly([[95,10],[95,14],[99,17],[98,20],[93,19],[90,24],[91,17]],'#357590',['ice']);
  poly([[92,9],[94,7],[93,12],[89,17],[88,20],[88,14]],'#90d0db',['ice']);
  line([[97,3],[95,5],[91,8],[88,11],[86,16],[86,21],[87,25]],'#c6ebed',['ice']);
  line([[94,11],[91,15],[90,21]],'#4695ac',['ice']);
  poly([[113,7],[117,12],[119,16],[118,23],[115,29],[111,36],[113,28],[116,22],[116,16]],'#65b3c5',['ice']);
  poly([[112,12],[115,16],[114,22],[111,28],[111,24],[107,21],[108,17]],'#357590',['ice']);
  poly([[112,24],[115,23],[114,28],[111,34]],'#4695ac',['ice']);
  line([[113,7],[117,12],[119,16],[118,23],[115,30],[111,36]],'#c6ebed',['ice']);
  line([[114,10],[116,14],[117,18]],'#ebf8f2',['ice']);
  line([[107,13],[106,17],[106,21]],'#90d0db',['ice']);
  line([[99,16],[102,17],[105,17]],'#65b3c5',['ice']);
  line([[98,19],[102,20],[106,20]],'#1d3d52',['ice']);
  // A compact frost rune is carved into the broad right face.
  line([[113,17],[111,20],[112,22]],'#90d0db',['ice']);
  line([[110,18],[113,20]],'#65b3c5',['ice']);

  // Heavy belt: one dimensional bronze medallion and a few bevels.
  line([[49,52],[57,52],[62,53],[67,53]],'#a48a63',['leather']);
  line([[48,57],[56,57],[64,58],[67,57]],'#322d2d',['leather']);
  line([[70,52],[74,50],[78,50],[81,53]],'#d3bb87',['bronze']);
  line([[81,54],[82,57],[80,61],[76,62],[72,60]],'#493b31',['bronze']);
  poly([[74,52],[77,52],[80,55],[80,58],[77,60],[74,59],[72,56]],'#68543b',['bronze']);
  line([[76,53],[74,55],[76,57],[78,55],[76,53]],'#d3bb87',['bronze']);
  line([[76,57],[76,59]],'#b49561',['bronze']);
  line([[29,54],[33,53],[37,54]],'#a48a63',['leather']);
  line([[28,60],[33,61],[36,60]],'#322d2d',['leather']);
  // Sparse rivets and collar locks echo the broad cluster scale of the game.
  put(31,55,'#d3bb87',['leather']);put(36,56,'#b49561',['leather']);
  line([[31,103],[37,103],[42,104]],'#a48a63',['leather']);
  line([[32,110],[39,110],[45,111]],'#322d2d',['leather']);
  line([[71,108],[77,107],[82,107]],'#a48a63',['leather']);
  line([[69,115],[76,114],[84,115]],'#322d2d',['leather']);
  line([[35,12],[40,11],[44,12]],'#e9dfbe',['fur']);
  line([[45,15],[50,17],[53,20]],'#d5c9a5',['fur']);
  line([[24,27],[21,33],[19,37]],'#b8aa89',['fur']);
  line([[16,72],[14,78],[13,83]],'#b8aa89',['fur']);

  // Preserve the supplied object contract, dimensions, padding and every alpha.
  for(let i=0;i<d.length;i++) d[i]=((d[i]&0xffffff)|(original[i]&0xff000000))>>>0;
  return {...source,w,h,d,box:[...source.box]};
}
