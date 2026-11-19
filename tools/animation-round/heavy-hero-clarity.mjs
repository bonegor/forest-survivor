// Native, registered retouching for the accepted Paladin face.
// Applied after motion construction, so all action/gait combinations receive
// the same character treatment while their existing equipment/grips survive.
const rgba = (r,g,b) => (r | g<<8 | b<<16 | 255<<24) >>> 0;
const COLORS={
 k:rgba(29,21,28),d:rgba(62,41,42),h:rgba(91,42,31),r:rgba(139,48,27),
 R:rgba(185,65,28),o:rgba(221,102,42),s:rgba(175,96,65),t:rgba(218,142,94),
 T:rgba(244,184,128),j:rgba(124,64,48),f:rgba(76,68,67),F:rgba(130,119,101),
 W:rgba(212,198,166),m:rgba(104,111,124),M:rgba(170,180,190),g:rgba(155,107,48),
 G:rgba(224,169,73),w:rgba(237,232,206),
};
const PALADIN_COLORS={...COLORS,s:rgba(191,135,106),t:rgba(224,174,139),T:rgba(247,208,162),j:rgba(143,85,70),h:rgba(83,38,42)};
function stamp(d,w,x,y,rows,colors=COLORS) {
 rows.forEach((row,yy)=>[...row].forEach((key,xx)=>{if(key!=='.')d[(y+yy)*w+x+xx]=colors[key];}));
}
export function paladinCrest(frame) {
 // Register to the original warm hair/hood, including the one-pixel breath and
 // moving-combat translation. A blade above the crown must not become a head.
 for(let y=23;y<=31;y++){
  const xs=[];
  for(let x=32;x<=43;x++){
   const c=frame.d[y*frame.w+x],r=c&255,g=c>>>8&255,b=c>>>16&255;
   if(c>>>24>190&&r>60&&r>g*1.4&&r>b*1.3)xs.push(x);
  }
  if(xs.length>=2)return {x:Math.round(xs.reduce((n,x)=>n+x,0)/xs.length),y};
 }
 throw Error('Paladin: could not register the native head');
}
export function heavyHeroClarity(frame,id) {
 // Berserker now uses its coherent original source model via source-detail.mjs.
 if(id!=='paladin')return frame;
 const d=frame.d.slice(),p=paladinCrest(frame);
 {
  // The red hood and gold circlet are already a strong silhouette. Give the
  // exposed face a brow, one lit nose edge and a connected jaw instead of the
  // old long white streak; its size still fits inside the original hood.
  const x=p.x+1,y=p.y+4;
  stamp(d,frame.w,x,y,['hssk','skTk','stTt','jstk','hjtk','.hk.'],PALADIN_COLORS);
 }
 return {...frame,d};
}
