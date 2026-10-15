// Standing proposals, 14 October 2026. Native editable pixel art, not animation replacements.
// All heroes use a 48x48 cell, a ground line at y=40 and a single-pixel contour.
// Left-facing views are mirrored by the same Frame class used in the real game.
import { makeBuf, hexPack } from '../../../../../public/js/engine/pixels.js';

export const PALETTE = {
  o:'#211c2b', // shared warm ink
  a:'#263b36', b:'#3e6045', c:'#698953', d:'#a6b96f', e:'#d4d99b', // ranger cloth
  h:'#382a32', j:'#664136', k:'#9b6445', l:'#d49a62', // leather
  s:'#9d604d', t:'#d99b75', u:'#f4c99a', // skin
  v:'#414052', w:'#737589', x:'#adb4c3', z:'#e3e5df', // steel and beard
  g:'#89704b', q:'#c7a66a', f:'#f1d38a', // old gold
  A:'#232b48', B:'#314d77', C:'#486f9c', D:'#739bbd', E:'#b6d4db', // mage blue
  F:'#e18040', G:'#f3b85f', H:'#ffe1a1', // flame
  I:'#302936', J:'#4c394b', K:'#755365', M:'#a77b80', // necromancer cloth
  N:'#666564', O:'#a4a595', P:'#d4d0ac', Q:'#f1e6c5', // aged bone
  R:'#683541', S:'#a14d57', T:'#d4877c', // crimson
  U:'#416959', V:'#6fa77a', W:'#b3db95', X:'#e0efc2', // soul fire
};

function draw() {
  const buf=makeBuf(48,48);
  const pal=Object.fromEntries(Object.entries(PALETTE).map(([k,c])=>[k,hexPack(c)]));
  const put=(x,y,c)=>{if(x<0||x>=48||y<0||y>=48)throw new Error('pixel outside cell');if(c!=='.'){if(!(c in pal))throw new Error(`unknown colour ${c}`);buf.d[y*48+x]=pal[c];}};
  const rows=(x,y,a)=>a.forEach((r,j)=>[...r].forEach((c,i)=>{if(c!=='.')put(x+i,y+j,c);}));
  const line=(x0,y0,x1,y1,c)=>{
    const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
    for(let i=0;i<=n;i++)put(Math.round(x0+(x1-x0)*i/(n||1)),Math.round(y0+(y1-y0)*i/(n||1)),c);
  };
  return {buf,put,rows,line};
}

function ranger() {
  const p=draw(),{rows,line,put}=p;
  // Quiver: the arrows stay behind the shoulder, clear of the hood.
  rows(13,12,[
    '.zo.zo..', 'zxozxo..', '.w..w...', '.jo.jo..', '..j.jo..',
    '..ojjo..', '..okjho.', '...klho.', '...kjho.', '...oho..',
  ]);
  // Short cloak with an angular fall. The illuminated edge does not thicken the outline.
  rows(13,20,[
    '.....ocbbo..', '....ocdbbao.', '....occbbao.', '...occcbao..',
    '...occbbao..', '..occcbbao..', '..occcbaao..', '..occbbaao..',
    '.occcbbaho..', '.occcbaho...', '.occbbaao...', 'occcbbaho...',
    'occbbaaho...', 'odcbaho.....', '.oobo.......',
  ]);
  // Two connected legs, with one relaxed knee and defined toes.
  rows(19,29,[
    'ohjko.ojkho.', 'ohjko.ojkho.', 'ohjko.ojlho.', 'ohjho.ojkho.',
    'ovwvo.owxwo.', 'ovwvo.owwvo.', '.ohho.ohkho.', '.ohjo.ohkho.',
    '.ojko.ojkko.', 'ohjkkoojklko', 'oooooo.ooooo',
  ]);
  // Fitted jerkin, shoulder cape, diagonal quiver strap, a compact belt.
  rows(18,20,[
    '..obccboo...', '.obcddbcbo..', 'obcccbgqbo..', 'obcbkjqko...',
    'obhjklgko...', '.ohkllkjo...', '.ohklgjho...', '.ohjgqjho...',
    '.ohhffhho...', '.ojkqqjko...', 'ohjkljkho...', 'ohjhoohho...',
  ]);
  // A deep cowl overlaps the brow and near cheek; only a small face opening remains.
  rows(18,10,[
    '....oooo.....', '...ocdcbo....', '..ocddccbo...', '.ocdecccbbo..',
    'ocddccbbbao..', 'occccbbaaaao.', 'occcbbooooao.', 'obcbbaosoto..',
    'obbbaostuo...', '.obaaojsuo...', '..obaohso....', '...ooooo.....',
  ]);
  // Steel bracer and a lowered forearm make this a resting pose.
  rows(25,22,[
    '.ovwo.....', 'ovxwvo....', '.ovwvo....', '..ohkho...', '...owxvo..',
    '....owwvo.', '.....otuo.', '......ouo.',
  ]);
  // One slender recurved bow: limb, string, grip and the hand wrapped around it.
  line(33,17,33,35,'g');
  const bow=[[32,16],[34,18],[36,21],[37,24],[37,28],[36,31],[34,34],[32,36]];
  for(let i=1;i<bow.length;i++)line(...bow[i-1],...bow[i],'o');
  for(const [x,y] of [[33,17],[34,19],[35,21],[36,23],[36,24],[36,29],[35,31],[34,33],[33,35]])put(x,y,'l');
  rows(33,26,['ootuo','ojuto','..oho']);
  put(32,16,'q');put(32,36,'q');
  return p.buf;
}

function mage() {
  const p=draw(),{rows,line,put}=p;
  // Mantle and boots: the robe wraps a body instead of reading as one blue triangle.
  rows(15,21,[
    '....oBBo......', '...oBCBBo.....', '..oBCDCAo.....', '..oBCCBAo.....',
    '.oBCCBAAo.....', '.oBCCBAAo.....', '.oBCBBAAo.....', 'oBCCBBAAo.....',
    'oBCBBAAAo.....', 'oBCBBAAAo.....', 'oBCBBAAAo.....', '.oBBBAAAo.....',
    '..oBAAAo......', '...ooo........',
  ]);
  rows(18,35,['.ohhho..ohho.', '.ojkho..ojho.', 'ohjkho..ojkho', 'ohkkkho.ojkkho', 'ooooooo.oooooo']);
  rows(17,21,[
    '..ovxwvooooo...', '.ovxzxxwBCBAo..', 'ovxwwvvBCDCBAo.', '.ovvBBCDCBBAo..',
    '..oBCDCCBBAo...', '..oBCDCBBBAo...', '..oBCDBgqgAo...', '..oAAgqffgAo...',
    '..oBBgqgBBAo...', '..oBCgqBBBAAo..', '.oBCCgqBCBBAo..', '.oBCBgqBCBBAo..',
    'oBCBBgqBCCBBAo.', 'oBCBBgqBCCBBAo.', 'oBCBAgqBCBBBAo.', '.ogggqfgBBBAo..',
    '..oqqqgqqgqo...', '...oooooooo....',
  ]);
  // Rear arm holds a small fire; palm connects to a braced elbow at the waist.
  rows(11,23,[
    '.otuo......', '.ostuo.....', '..owxvo....', '...oDCBo...', '....oDCBBo.',
    '.....oCCBAo', '......oBAo.', '.......oo..',
  ]);
  rows(11,18,['..Fo..','..GFo.','.FGHFo','oGHGGo','.oGGo.','..oo..']);
  // A continuously widening cone seats above the brow, with a narrow tilted brim.
  // The tip bends forward; broad shaded clusters avoid the old zigzag / boot shape.
  rows(16,5,[
    '.........ooo......', '.......ooCBBo.....', '......oDCCBo......', '.....oDCCBAo......',
    '.....oDCCBAo......', '....oDCCBBAAo.....', '...oDCCCBBAAo.....', '...oDCCBBBAAo.....',
    '...ogqqqqgggo.....', '..oCDDCCCBBBBo....', '.oCBBBBBAAAAAAo...', '..oooovxtuuwoo....',
    '.....ovxtuuwo.....', '.....ovzuotuo.....', '.....owzutuuo.....', '.....owzzuswo.....',
    '......owzzxwo.....', '......owzxwo......', '.......ozxwo......', '.......owxo.......',
    '........oxo.......',
  ]);
  // Staff sits on the ground, leans forward and meets a visible leading hand.
  line(34,39,37,14,'o');line(33,38,36,14,'j');line(33,37,35,18,'l');
  rows(33,10,['..oxxo..','.oxExwo.','oxEXExo.','.oxExwo.','..owwo..','..ogqo..']);
  rows(28,23,['oBAo....','oCDBo...','.oDCBo..','..oCDvo.','...owxuo','....otuo','.....oo.']);
  put(34,39,'o');
  return p.buf;
}

function necromancer() {
  const p=draw(),{rows,line,put}=p;
  // Narrow hood, strong shoulders and a waist above a split robe.
  rows(14,19,[
    '....oJJJoo.......', '...oKJJJJIo......', '..oKKJJJIIo......', '..oKJJJJIIo......',
    '..oKJJJIIIo......', '.oKKJJJIIIo......', '.oKJJJJIIIo......', '.oKJJJIIIIo......',
    'oKKJJJIIIIo......', 'oKJJJJIIIIo......', 'oKJJJIIIIo.......', 'oKJJJIIIIo.......',
    'oKJJJIIIo........', '.oKJIIIo.........', '.oKJIIo..........', '..oJIoo..........',
    '...oo............',
  ]);
  rows(18,34,['.ovvvo..ovvo..','.ovwvo..ovwo..','.owxvo..owwvo.','ovwwvo..ovwwvo','ovwwvvo.ovwwvo','ooooooo.oooooo']);
  rows(18,22,[
    '..oPOOo....', '.oPQPOJIo..', 'oOPQPOJIIo.', '.oPOOJJIIo.', '.oNPNJJIIo.',
    '.oOPNJJIIo.', '.ogqgqggIo.', '.oqqfqqqIo.', '.oRSoRSIIo.', '.oRSSoSIIo.',
    'oJRSSoRSIIo', 'oJRSSoRSIIo', 'oJRSRoRSIIo', 'oJRSIoRSIIo', '.oRIooRSIo.',
    '..oo..oIo..', '.......o...',
  ]);
  // Bone pauldrons: defined masses, no loose disconnected spikes.
  rows(15,20,['..oPQo.....','oOPQPOo....','oPQPOONo...','.oPOONNo...','..oNNo.....']);
  rows(27,20,['.oPQo..','oPQPOo.','oPOONNo','.oNNNo.','..oo...']);
  // The hood wraps the skull. A brow casts shadow across a single clear pair of green eyes.
  rows(18,8,[
    '.....ooo......', '....oKKIo.....', '...oKMKJIo....', '..oKMKJJIIo...',
    '.oKMKJJIIPo...', '.oKKJOPQPOo...', 'oKKJOPQPOONo..', 'oKJIONOPOONo..',
    'oKJIOWONWNo...', 'oKJIOPOoONo...', '.oJIOPONNo....', '.oJIioPPNo....',
    '..oIIoNNo.....', '...ooooo......',
  ].map(r=>r.replaceAll('i','I')));
  // Free hand holds a bound tome close to the torso, clear of the face.
  rows(13,25,['.oKJo......','.oKJIo.....','..oKJIo....','...oOPOo...','....oPQo...']);
  rows(13,29,['.oPPQPo..','oPPQQQPo.','oRPPPNRo.','oRSRRRRo.','.oRRRRo..','..oooo...']);
  // Forward-leaning skull staff, held midway. Small green fire stays part of its crown.
  line(33,39,37,14,'o');line(32,38,36,14,'N');line(32,37,35,17,'O');
  rows(33,7,[
    '...Vo...', '...WVo..', '..VWVo..', '.oWXWVo.', '.oPQPOo.', 'oPQPONo.',
    'oONONNo.', '.oWOONo.', '..oPNNo.', '...oNo..',
  ]);
  rows(28,24,['oJIo....','oKJIo...','.oKJIo..','..oKNPo.','...oPQo.','....oo..']);
  put(33,39,'o');
  return p.buf;
}

function ossuaryKing() {
  const p=draw(),{rows,line,put}=p;
  // A broad, armoured lich, with an exposed crowned skull and a hooked soul staff.
  // Rear mantle has a ragged silhouette and desaturated green lining.
  rows(13,19,[
    '....oIIIoo........', '...oJJIIIoo.......', '..oKJJJIIIoo......', '.oKJJJJIIIIo......',
    '.oKJJJJIIIIo......', '.oKJJJJIIIIo......', 'oKKJJJJIIIIo......', 'oKJJJJJIIIIo......',
    'oKJJJJIIIIo.......', 'oKJJJJIIIIo.......', 'oKJJJIIUIIo.......', 'oKJJIIUVIIo.......',
    'oKJIIUVUIIo.......', '.oJIUVUUIo........', '.oIUVUUUIo........', '.oIUUoUIo.........',
    '..oUo.oIo.........', '...o...o..........',
  ]);
  // Planted steel greaves and a wide stance.
  rows(17,32,[
    '.ovwwo....ovwvo.', '.owxxvo...owxvo.', '.owxwvo...owwvo.', '.ovwvo....ovwvo.',
    '.ovwvo....ovwvo.', 'ovwxvo....ovwxvo', 'ovwwvvo...ovwwvo', 'ooooooo...oooooo',
  ]);
  // Dark cuirass with three curved bone ribs, a sternum and a heavy bone belt.
  rows(17,20,[
    '...ovwxxxwvo....', '..ovwxxwwvvvo...', '.ovwOPQPOwvvo...', 'ovwOPQPOOOvvvo..',
    '.ovOPoOPONvvo...', '..oOPoOPONvo....', '..ovOOOONvvo....', '..ovOPONvvvo....',
    '..oNPPQPOONo....', '..oOPQfPOONo....', '..oJUUoUUJIo....', '..oJUVUoUJIIo...',
    '.oJJUVUoUJIIo...', '.oJJUUUoUJIIo...', '.oJUUUo.UJIIo...', '..oUUo..oUIo....',
    '...oo....oo.....',
  ]);
  // Connected bone spikes and layered pauldrons, much wider than the hooded proposal.
  rows(12,19,[
    '.oQo..oQo...', '.oPPooPPo...', '..oPQPPOo...', '.oPQQPONNo..', 'oPQPPONNvo..',
    '.oPOONNvvo..', '..oNNvvo....', '...ovvo.....',
  ]);
  rows(28,19,[
    '.oQo.oQo...', '.oPPoPPo...', '..oPQPONo..', '.oPQPPONNo.', '.oPOONNvvo.',
    '..oNNNvvo..', '...ovvo....',
  ]);
  // Tall bone crown: three unequal points, a dark circlet and a recessed emerald gem.
  rows(19,6,[
    '....oQo......', '.oQo.Po..oQo.', '.oPPoPo.oPPo.', '..oPPPPoPPo..', '..oPQQPPPOo..',
    '..oNNOWONNo..', '..oOPQPOONo..', '..oPQPPONNo..', '..oNoOPoNNo..', '..oWONPoWNo..',
    '..oPOoPOONo..', '...oPOOONo...', '...oPPPPNo...', '....oPNNo....', '.....ooo.....',
  ]);
  // Rear forearm comes forward to a clenched skeletal fist holding soul fire.
  rows(13,25,['.ovwvo...','.owxvo...','..owxvo..','...ovwvo.','....oOPo.','....oPQo.','.....oo..']);
  rows(13,24,['..Vo..','..WVo.','.VWXVo','oWXWVo','.oWVo.','..oo..']);
  // Hooked, bone-headed staff, a different silhouette from the small skull staff.
  line(34,39,36,16,'o');line(33,38,35,16,'N');line(33,36,34,20,'P');
  rows(32,7,[
    '....oooo...', '...oPQQPo..', '..oPPOONo..', '.oPONooNo..', '.oPNo..oo..',
    '.oONo.WVo..', '..oNoVWVo..', '...oNWXVo..', '...oPPUo...', '....oNo....',
    '....oNo....',
  ]);
  rows(29,25,['ovwvo...','owxvo...','.owwvo..','..oOPPo.','...oPQo.','....oo..']);
  put(34,39,'o');
  return p.buf;
}

const model=(fn)=>{const frame=fn();return {gen:()=>[frame],idle:[0],walk:[0],anchorY:40,fitW:36,fitH:36,selfBob:true,outline:false};};
export default [
  {cls:'archer',id:'standing-oct14',name:'Ranger · Thornwarden',description:'A deep green hood shading the brow and cheek, a short mantle, leather armour and a bow held at rest. Standing proposal, both directions; no walk or attack animation.',collection:'Standing redesigns · October 14',def:model(ranger)},
  {cls:'mage',id:'standing-oct14',name:'Mage · Ember Archmage',description:'A tapered wizard hat with a forward-bent tip and a narrower brim, a stern face and shorter beard, steel shoulders, blue and antique-gold robes, a planted staff and a flame in the free hand. Standing proposal, both directions; no walk or attack animation.',collection:'Standing redesigns · October 14',def:model(mage)},
  {cls:'necromancer',id:'standing-oct14',name:'Necromancer · Grave Regent',description:'A fitted ash-violet hood, bone pauldrons over a split crimson robe, a green-eyed skull and a forward-leaning skull staff. Standing proposal, both directions; no walk or attack animation.',collection:'Standing redesigns · October 14',def:model(necromancer)},
  {cls:'necromancer',id:'standing-oct14-ossuary',file:'necromancer-ossuary',name:'Necromancer · Ossuary King',description:'An exposed crowned skull, broad spiked bone pauldrons, a dark ribbed cuirass, ash-green robes and a hooked soul staff. An alternative to the hooded Grave Regent. Standing proposal, both directions; no walk or attack animation.',collection:'Standing redesigns · October 14',def:model(ossuaryKing)},
];
