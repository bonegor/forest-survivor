import { armFromSheet } from './fall-limbs.js';
import { fromRows } from '../engine/pixels.js';
import {
  BRACE_START, BRACE_END, SOUL_RELEASE, appendDecay, blank, cut, departingSoul, easeBetween, fallFrameAt, mix, paint, segment, turn,
} from './hero-fall.js';

const GROUND = 56;
const TIMES = [
  ...Array.from({ length: 27 }, (_, i) => [i / 25]),
  [BRACE_START],
  [BRACE_END + 1 / 60],
  ...Array.from({ length: 10 }, (_, i) => [BRACE_END + (i + 1) / 25]),
];

const at = (buf, x, y) => buf.d[y * buf.w + x];

function pixels(buf, samples, rows) {
  const palette = Object.fromEntries(Object.entries(samples).map(([k, [x, y]]) => [k, at(buf, x, y)]));
  return fromRows(rows, palette);
}

function lineArt(light, edge, middle, wide) {
  return fromRows(wide ? ['.ee.', 'emle', 'emle', 'emle', 'emle', '.ee.']
    : ['.m.', 'elm', 'elm', 'elm', 'elm', '.e.'], { l: light, e: edge, m: middle });
}

function palmArt(light, edge, middle) {
  return fromRows(['.em..', 'emll.', 'emmlm', '.eeee'], { l: light, e: edge, m: middle });
}

const rectangular = (x0, x1, count) => Array.from({ length: count }, () => [x0, x1]);

function paladinParts(buf) {
  const upper = cut(buf, 24, [
    ...rectangular(30, 44, 12), [30,42], [30,42], [30,42], [30,42], [32,41],
    [31,41], [31,41], [31,41], [31,41], [30,41], [30,41], [30,41], [30,41],
    [31,41], [31,40],
  ]);
  const sword = pixels(buf, {
    e: [28,45], m: [26,47], l: [27,46], w: [25,47], f: [23,50],
    g: [24,49], a: [27,42], h: [27,44], d: [28,43],
  }, [
    '.....aa...........',
    '....ahgmmmmmmmm...',
    'eddhggmllwwwwllgf.',
    'eddhggllwwwwwgffff',
    '....ahgmmmmmgggf..',
    '.....aa...........',
  ]);
  const shield = cut(buf, 34, [
    [44,46], [43,47], [43,48], [42,48], [42,48], [41,48], [43,48],
    [43,48], [43,48], [43,48], [43,48], [43,47], [43,48], [44,47], [44,47], [44,47],
  ]);
  return {
    upper, pivot: [6, 20],
    arm: lineArt(at(buf, 35, 36), at(buf, 35, 39), at(buf, 33, 40), true),
    cuff: lineArt(at(buf, 30, 40), at(buf, 34, 39), at(buf, 31, 40), true),
    palm: palmArt(at(buf, 30, 40), at(buf, 34, 39), at(buf, 31, 40)),
    leg: lineArt(at(buf, 33, 48), at(buf, 36, 48), at(buf, 32, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 33, 55), at(buf, 32, 52), true),
    boots: [cut(buf, 52, rectangular(28, 34, 5)), cut(buf, 52, rectangular(39, 47, 5))],
    bootPivots: [[4, 2], [3, 2]],
    gear: [
      { art: sword, grip: [4, 2.5], tip: [17, 3] },
      { art: shield, grip: [3, 7], tip: [3, 15] },
    ],
  };
}


function witchHunterParts(buf) {
  const coat = cut(buf,35,[
    [32,41],[31,41],[30,41],[30,40],[29,39],[29,38],[29,38],[30,39],
    [30,39],[29,39],[29,39],[29,39],[29,40],[28,40],[28,40],
  ]);
  const face = cut(buf,31,[[32,42],[32,42],[32,42],[32,42],[32,42],[32,42],[33,41]]);
  const hat = cut(buf,25,rectangular(28,47,8));
  // The actual polished stirrup, string, and stock from her idle. Leave
  // out the collar and sleeve which flank the stock in the living drawing.
  const crossbow=cut(buf,37,[
    [43,45],[43,46],[43,47],[40,49],[34,50],[35,50],
    [39,48],[42,47],[42,46],[42,45],[42,44],
  ]);
  return {
    coat, face, hat,
    arm: lineArt(at(buf,32,38),at(buf,32,39),at(buf,33,37),false),
    cuff: lineArt(at(buf,35,41),at(buf,33,42),at(buf,43,42),false),
    glove: pixels(buf,{e:[33,42],m:[32,41],l:[33,40]},['.em','mlm','ee.']),
    leg: lineArt(at(buf, 34, 47), at(buf, 36, 50), at(buf, 34, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 30, 53), at(buf, 32, 52), true),
    boots: [cut(buf, 51, rectangular(29, 35, 6)), cut(buf, 51, rectangular(39, 46, 6))],
    bootPivots: [[3, 2], [2, 2]],
    gear: {art:crossbow,grip:[4,5]},

  };
}

function tween(rows, t) {
  const next = rows.findIndex(row => row[0] > t);
  if (next < 0) return rows.at(-1).slice(1);
  const from = rows[Math.max(0, next - 1)], to = rows[next];
  const k = next === 0 ? 0 : (t - from[0]) / (to[0] - from[0]);
  return from.slice(1).map((n, i) => mix(n, to[i + 1], k));
}

const shieldKneel = [
  [0,    36,44,  0, 31,50,30,53, 40,50,42,53,  0,0,   0,0],
  [.20,  35,44, -4, 31,50,30,53, 41,49,42,53,  5,2,  -5,-4],
  [.40,  35,45,  1, 31,52,29,53, 42,48,44,53,  0,4,   5,-8],
  [.62,  35,47,  5, 31,54,27,53, 43,48,45,54,-12,-16, 10,-10],
  [.82,  35,49,  8, 32,55,26,53, 43,49,45,54,-18,-27, 13,-11],
  [BRACE_START,35,50,16, 32,55,26,53, 43,49,45,54,-23,-45, 13,-16],
  [BRACE_END,  35,50,16, 32,55,26,53, 43,49,45,54,-23,-45, 13,-16],
  [1.37, 36,50, 35, 32,55,26,53, 43,51,45,54,-28,-56, 16,-19],
  [1.48, 37,51, 58, 32,55,26,53, 43,53,44,54,-34,-71, 17,-24],
  [1.57, 38,51, 74, 32,55,26,53, 42,54,41,54,-38,-79, 18,-29],
  [1.65, 39,51, 86, 33,55,27,53, 42,54,39,54,-41,-83, 19,-32],
];


// Mercy guards the ribs beneath her coat. The hip settles behind her boots;
// the brim comes down across her eyes as the shoulder rolls onto the coat.
const hunterSeat = [
  // time, hip, chest angle, back knee, back ankle, lead knee, lead ankle, chin dip
  [0,    37,47,  0, 34,51,32,54, 41,50,43,54, 0],
  [.13,  37,47, -2, 34,51,32,54, 42,50,44,54, 2],
  [.24,  36,47, -5, 33,51,32,54, 42,49,44,54, 5],
  [.36,  35,48, -7, 33,51,32,54, 41,49,44,54, 7],
  [.48,  35,49,-10, 33,51,32,54, 41,49,44,54, 9],
  [.59,  34,50,-12, 33,51,32,54, 40,49,44,54,11],
  [.72,  33,51,-15, 33,51,33,54, 39,49,44,54,13],
  [.87,  33,52,-17, 34,51,34,54, 39,49,45,54,15],
  [1.05, 33,53,-18, 34,51,35,54, 39,49,45,54,17],
  [1.25, 33,53,-21, 34,51,35,54, 39,49,45,54,18],
  [1.35, 33,54,-32, 34,51,36,54, 39,49,45,54,20],
  [1.45, 33,54,-49, 35,52,37,54, 40,50,45,54,23],
  [1.54, 33,54,-65, 35,53,38,54, 40,51,45,54,25],
  [1.64, 33,54,-80, 35,53,38,54, 41,52,45,54,26],
];
const hunterDrop=[
  [0,38,42,0],[.20,38,42,0],[.33,39,43,3],[.43,42,45,7],
  [.55,46,48,11],[.65,48,50,14],[.72,49,51,15],
];
const hunterTimes=Array.from({length:34},(_,i)=>[i/20]);

function seatedHunter(standing,parts,t) {
  const out=blank(standing.w,standing.h), clip={...out,h:GROUND+1};
  const [x,y,tilt,kx,ky,ax,ay,fx,fy,bx,by,chin]=tween(hunterSeat,t);
  const hip=[x,y], neck=turn([0,-10],tilt,hip);
  drawLeg(clip,parts,[x-2,y],[kx,ky],[ax,ay],0,-10);
  drawLeg(clip,parts,[x+2,y],[fx,fy],[bx,by],1,9);
  paint(clip,parts.coat,[9,12],hip,tilt);
  paint(clip,parts.face,[5,6],neck,tilt+chin);
  const brow=turn([0,-5],tilt+chin,neck);
  paint(clip,parts.hat,[9,7],brow,tilt+chin+chin*.25);
  // The gloved fist comes inward onto the ribs. Real shoulder/elbow/wrist
  // offsets come from the crossbow arm in the production idle.
  const inward=easeBetween(t,.20,.75);
  const [shoulder,elbow,wrist]=armFromSheet([[-3,-9],[-4,-5],[1,-5]],hip,tilt,-17*inward,-47*inward);
  segment(clip,parts.arm,shoulder,elbow);
  segment(clip,parts.cuff,elbow,wrist);
  paint(clip,parts.glove,[1,1],wrist,tilt-18*inward);
  drawGear(out,parts.gear,tween(hunterDrop,t));
  return out;
}

function drawLeg(out, parts, hip, knee, foot, index, tilt) {
  segment(out, parts.leg, hip, knee);
  segment(out, parts.shin, knee, foot);
  paint(out, parts.boots[index], parts.bootPivots[index], foot, tilt);
}


function drawGear(out, item, [x, y, angle]) {
  paint({ ...out, h: GROUND + 1 }, item.art, item.grip, [x, y], angle);
}


const paladinArms = [
  [[-3,-7], [-5,-4], [-6,-2]],
  [[3,-7], [6,-4], [9,-3]],
];

function kneelingPaladin(t) {
  const [x,y,lean,kx,ky,ax,ay,fx,fy,bx,by,ru,rf,nu,nf] = tween(shieldKneel, t);
  const hip = [x, y];
  return { hip, lean, backKnee: [kx,ky], backBoot: [ax,ay], frontKnee: [fx,fy], frontBoot: [bx,by],
    rear: armFromSheet(paladinArms[0], hip, lean, ru, rf), near: armFromSheet(paladinArms[1], hip, lean, nu, nf) };
}

function paladinEquipment(out, parts, time) {
  const [sword, shield] = parts.gear;
  const swordRelease = .39, swordContact = .63, shieldContact = .88;
  const swordAngle = mix(142, 92, easeBetween(time, .08, swordRelease));
  const swordWrist = kneelingPaladin(Math.min(time, swordRelease)).rear[2];
  if (time <= swordRelease) drawGear(out, sword, [...swordWrist, swordAngle]);
  else {
    const tip = turn([sword.tip[0] - sword.grip[0], sword.tip[1] - sword.grip[1]], swordAngle, swordWrist);
    const slip = easeBetween(time, swordRelease, swordContact);
    paint(out, sword.art, sword.tip, [mix(tip[0], 27, slip), mix(tip[1], GROUND + 1, slip)],
      mix(swordAngle, 76, slip));
  }

  // The shield follows the actual wrist until the lower rim takes its weight.
  // It pivots on that contact while she folds over it.
  const lastGrip = kneelingPaladin(Math.min(time, shieldContact)).near[2];
  const angle = mix(0, 10, easeBetween(time, .22, shieldContact));
  if (time < shieldContact) drawGear(out, shield, [...lastGrip, angle]);
  else {
    const tip = turn([shield.tip[0] - shield.grip[0], shield.tip[1] - shield.grip[1]], angle, lastGrip);
    const tilt = 10 + 10 * easeBetween(time, shieldContact, BRACE_START)
      + 44 * easeBetween(time, BRACE_END, 1.63);
    paint(out, shield.art, shield.tip, [tip[0], GROUND], tilt);
  }
}

export function paladinFall(sprite) {
  let frames;
  return {
    anchorY: sprite.anchorY, outline: false, frameAt: seconds => fallFrameAt(TIMES, seconds),
    wisp: { ...departingSoul, offsetX: 7, offsetY: -7 },
    cues: [{ time: .88, sound: 'shieldfall' }, { time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]];
      const parts = paladinParts(standing);
      const arm = (out, [shoulder, elbow, wrist]) => {
        segment(out, parts.arm, shoulder, elbow);
        segment(out, parts.cuff, elbow, wrist);
        paint(out, parts.palm, [1.5,1.5], wrist);
      };
      frames = TIMES.map(([t], i) => {
        if (!i) return standing;
        const frame = blank(standing.w, standing.h), out = { ...frame, h: GROUND + 1 };
        const k = kneelingPaladin(t), [x,y] = k.hip;
        drawLeg(out, parts, [x-2,y], k.backKnee, k.backBoot, 0, -46 * easeBetween(t,.26,.83));
        drawLeg(out, parts, [x+2,y], k.frontKnee, k.frontBoot, 1, -25 * easeBetween(t,BRACE_END,1.65));
        arm(out, k.rear);
        paint(out, parts.upper, parts.pivot, k.hip, k.lean);
        arm(out, k.near);
        paladinEquipment(out, parts, t);
        return frame;
      });
      const remains = blank(standing.w, standing.h);
      paladinEquipment({ ...remains, h: GROUND + 1 }, parts, SOUL_RELEASE);
      appendDecay(frames, remains, GROUND);
      return frames;
    },
  };
}


export function witchHunterFall(sprite) {
  let frames;
  return {
    anchorY:sprite.anchorY,outline:false,
    frameAt:seconds=>fallFrameAt(hunterTimes,seconds),
    wisp:{...departingSoul,offsetX:-12,offsetY:-6},
    cues:[{time:SOUL_RELEASE,sound:'souldepart'}],
    gen(){
      if(frames)return frames;
      const standing=sprite.gen()[sprite.idle[0]],parts=witchHunterParts(standing);
      frames=hunterTimes.map(([t],i)=>i?seatedHunter(standing,parts,t):standing);
      const rest=blank(standing.w,standing.h);
      drawGear(rest,parts.gear,tween(hunterDrop,SOUL_RELEASE));
      appendDecay(frames,rest,GROUND);
      return frames;
    },
  };
}
