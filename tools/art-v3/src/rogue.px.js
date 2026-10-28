// V3 Shadow: a continuous hood, cowl, shoulders and spectral robe replace the
// spidery disconnected silhouette. No legs or planted feet: cloth curls beneath
// a coherent floating torso, with the eye and hand positions carried by one rig.
pal({
  a:'#15172d', b:'#292b48', c:'#414367', d:'#61638a', e:'#9294b6', f:'#c0c5dc',
  p:'#34253f', q:'#56405e', r:'#806083', s:'#b890b0', X:'#c9b4ef', W:'#f0e3ff',
});
ramps('abcdef','pqrs','XW');
glow('XW');
meta({ w:40,h:40,anchorY:39,fitW:40,fitH:40,selfBob:true,
  motionRate:1.125,idleRate:4.5,
  idle:[0,1,2,3,4,5,6,7,8],walk:[0,1,2,3,4,5,6,7,8],attack:null,attackFps:0 });
const HOOD=[
  '....cdd....',
  '...cdeec...',
  '..cdeedcb..',
  '.cdecbabb..',
  '.cddbaaaa..',
  '.cdcaaXWa..',
  '..cdbbaab..',
  '..bcdccb...',
  '...cddc....',
];
function draw(c) {
  const ph=c.frame/9*Math.PI*2, bob=Math.round(Math.sin(ph)*.75);
  const px=(x,y,k)=>c.px(x,y+bob,k);
  const line=(ax,ay,bx,by,k,width=1)=>{
    const n=Math.ceil(Math.hypot(bx-ax,by-ay)*2);
    for(let i=0;i<=n;i++){const t=i/(n||1);for(let w=0;w<width;w++)px(ax+(bx-ax)*t+w,ay+(by-ay)*t,k);}
  };
  // Full connected cloak; near edge rolls inward instead of breaking into flames.
  for(let y=17;y<=33;y++){
    const t=(y-17)/16, sway=Math.round(Math.sin(ph-t*2)*t*2);
    const left=Math.round(15-5*t)+sway,right=Math.round(25-1*t)+sway;
    for(let x=left;x<=right;x++){
      const u=(x-left)/(right-left);
      px(x,y,x===left||x===right?'a':u<.24?'c':u<.42?'d':u<.6?'c':u<.79?'b':'p');
    }
  }
  // Two broad folded tails, attached to the hem, leave a visible hovering gap.
  const curl=Math.sin(ph);
  line(11,30,8+curl*2,33,'b',3);line(8+curl*2,33,12,35,'c',2);
  line(21,30,25+curl,34,'p',3);line(25+curl,34,22,36,'q',2);
  // Rear arm, shoulder to curled glove, holds the spectral dagger.
  line(24,18,28,21,'b',3);line(28,21,30,24,'c',2);
  line(30,24,34,20,'e');line(31,24,35,20,'f');
  // Short layered shoulder mantle gives the head a structural seat.
  const mantle=['....cdeedc....','..bcdeffedcb..','.bcdeedcdeedb.','bcddccbbccddcb','abbbbaaaabbbba'];
  mantle.forEach((row,y)=>[...row].forEach((k,x)=>{if(k!=='.')px(12+x,16+y,k);}));
  HOOD.forEach((row,y)=>[...row].forEach((k,x)=>{if(k!=='.')px(15+x,8+y,k);}));
  // Forearm crosses the chest; glove connects to the cuff, never an isolated blob.
  line(14,20,14,24,'b',3);line(15,24,20,26,'c',2);line(15,23,20,25,'e');
  px(20,25,'d');px(21,25,'e');px(21,26,'c');
  // One readable long dagger outside the cloak, with a dark grip and a crossguard.
  line(21,25,27,18,'e');line(22,24,27,18,'f');line(20,24,23,26,'q');px(21,26,'a');
  // Fold seams are broad clusters, never random per-frame noise.
  line(18,23,16+Math.sin(ph)*.7,31,'d');line(21,28,20,32,'q');
}
anim('rogue_v3',{w:40,h:40,frames:9,fps:8},draw);
