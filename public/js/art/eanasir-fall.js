import { merchantFallParts, merchantSoulWalk } from './eanasir-source.js';
import { hexPack } from '../engine/pixels.js';
import { SOUL_RELEASE, appendDecay, blank, fallFrameAt, mix, paint, turn } from './hero-fall.js';

// The stone merchant draws his hands to his beard, loses his coil, then tips
// from his knees as his last piece of copper rolls just beyond his reach.
// Seconds, waist x/y, upper-body angle, skirt angle and skirt foreshortening.
const keys = [
  [0,     39,39,  0,  0,1],    [.14, 39,39, -6, -2,1],
  [.28,   37,40,-11,  6,.94],  [.43, 36,42, -3, 15,.85],
  [.58,   37,44,  9, 24,.76],  [.76, 38,46, 18, 38,.70],
  [.91,   39,47, 28, 44,.63], [1.04, 39,47, 33, 47,.63],
  [1.24,  39,47, 33, 47,.63], [1.37, 39,48, 51, 52,.75],
  [1.50,  39,48, 73, 61,.87], [1.63, 39,48, 90, 68,.93],
  [1.69,  39,49, 87, 71,.94], [1.76, 39,49, 89, 72,.94],
];
// The rolling disc bounces at its rim before settling flat. Positions use
// the same world pivot as the native actor, including its extra side margin.
const copper = [
  [.60,46,40,12,1], [.76,52,45,45,.94], [.90,58,52,100,.88],
  [1.01,61,49,145,.83], [1.12,64,52,207,.83], [1.26,67,52,286,.8],
  [1.43,70,53,324,.60], [1.55,71,54,352,.38], [1.65,71,55,360,.31],
];
const coil = [
  [.38,36,37,0,1], [.52,32,41,16,.90], [.67,28,49,16,.66],
  [.80,26,54,2,.32], [.88,26,53,0,.33], [.95,26,54,0,.32],
];
const samples = Array.from({length:37},(_,i)=>[i/20]);
const margin = 12, floor = 56;

function poseAt(track,t) {
  const next=track.findIndex(key=>key[0]>t);
  if (next<0) return track.at(-1).slice(1);
  if (!next) return track[0].slice(1);
  const a=track[next-1], b=track[next], k=(t-a[0])/(b[0]-a[0]);
  return a.slice(1).map((n,i)=>mix(n,b[i+1],k));
}

// Parts keep the coordinates of their pivots on the original model sheet.
function place(out,part,pivot,x,y,angle,sy=1) {
  paint(out,part.buf,[pivot[0]-part.x,pivot[1]-part.y],[margin+x,y],angle,sy);
}
function gear(out,parts,t,hip,lean) {
  const hand=turn([-1,-5],lean,hip), palm=turn([8,-5],lean,hip);
  const [wx,wy,wa,ws]=t<coil[0][0]?[...hand,lean,1]:poseAt(coil,t);
  place(out,parts.whip,[38,34],wx,wy,wa,ws);
  const [cx,cy,ca,cs]=t<copper[0][0]?[...palm,lean,1]:poseAt(copper,t);
  place(out,parts.copper,[47,34],cx,cy,ca,cs);
  out.d.fill(0,(floor+1)*out.w);
}

function drawBody(out, parts, [x,y,lean,tilt,sy]) {
  for (const [foot,dx] of [[parts.farFoot,3],[parts.nearFoot,-3]]) {
    const ankle=turn([dx,15*sy],tilt,[x,y]);
    place(out,foot,[39+dx,54],ankle[0],Math.min(54,ankle[1]),tilt,sy);
  }
  place(out,parts.skirt,[39,39],x,y,tilt,sy);
  place(out,parts.bust,[39,39],x,y,lean);
  out.d.fill(0,(floor+1)*out.w);
}

// His spirit starts in the corpse's exact pose, gathers its feet beneath it,
// then walks away empty-handed. Keep the carved eyes and beard in the light ramp.
const rising = [
  [0,39,49,89,72,.94], [.16,40,48,74,67,.86], [.33,41,46,45,49,.71],
  [.49,41,44,24,36,.64], [.66,40,41,11,18,.81], [.82,39,39,0,0,1],
];
const riseTime = rising.at(-1)[0], riseCount = 17;
// Leave the stone figure visible beside its double for the first few strides.
const decayDelay = .20, decayRate = .62;
const soulColors = ['#37687b','#548d9e','#76b6bd','#a2d8d6','#ccf3e9','#edfff7'].map(c=>hexPack(c));
function asSpirit(buf) {
  const d=buf.d.map(color=>{
    if (!color) return 0;
    const warm=color & 255;
    return soulColors[warm<70?0:warm<152?1:warm<180?2:warm<196?3:warm<217?4:5];
  });
  return {w:buf.w,h:buf.h,d};
}

function walkingSpirit(parts) {
  const rise = Array.from({length:riseCount},(_,i)=>{
    const buf=blank(104,64);
    drawBody(buf,parts,poseAt(rising,i*riseTime/(riseCount-1)));
    return asSpirit(buf);
  });
  return [...rise,...merchantSoulWalk().map(asSpirit)];
}

export function merchantFall(merchant) {
  let frames,parts,spirit;
  return {anchorY:floor,outline:false,remainsAt:SOUL_RELEASE+decayDelay+1.30/decayRate,
    frameAt(t) {
      const time=t<SOUL_RELEASE?t:SOUL_RELEASE+Math.max(0,t-SOUL_RELEASE-decayDelay)*decayRate;
      return fallFrameAt(samples,time);
    },
    wisp:{release:SOUL_RELEASE, anchorY:floor, offsetX:0, offsetY:0, outline:false,
      walkOff:{rise:riseTime, speed:50, clearance:18},
      gen:()=>spirit??=walkingSpirit(parts??=merchantFallParts()),
      frameAt(age) {
        if (age<riseTime) return Math.max(0,Math.floor(age/riseTime*(riseCount-1)));
        return riseCount+(4+Math.floor((age-riseTime)*24))%16;
      },
    },
    cues:[{time:SOUL_RELEASE,sound:'souldepart'}],
    gen() {
      if (frames) return frames;
      parts??=merchantFallParts();
      const standing=merchant.gen()[merchant.idle[0]];
      const empty=()=>blank(standing.w+2*margin,standing.h);
      frames=samples.map(([time])=>{
        const out=empty();
        if (time===0) {
          paint(out,standing,[0,0],[margin,0]);
          return out;
        }
        const pose=poseAt(keys,time);
        drawBody(out,parts,pose);
        gear(out,parts,time,[pose[0],pose[1]],pose[2]);
        return out;
      });
      const remains=empty();
      gear(remains,parts,SOUL_RELEASE,[39,49],89);
      appendDecay(frames,remains,floor);
      return frames;
    },
  };
}
