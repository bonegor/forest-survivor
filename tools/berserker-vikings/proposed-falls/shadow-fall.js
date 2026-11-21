import { fromRows } from '../../../public/js/engine/pixels.js';
import { SOUL_RELEASE, appendDecay, blank, cut, fallFrameAt, paint, sinkingSoul } from '../../../public/js/art/hero-fall.js';
import { packedPalette } from '../../../public/js/art/palette.js';

// The suspended hem touches first. The shoulders settle into the mantle,
// and then the hood bows over the hands. No legs appear under the hollow robe.
// Time, collar, hood pitch, belt, mantle compression and breadth of the folded hem.
const poses = [
  [0,    45,35, 0, 43,44,1,   1],
  [.13,  45,35, 3, 43,44,.99,1],
  [.23,  44,36, 6, 43,45,.97,1],
  [.34,  44,37,10, 42,46,.94,1],
  [.45,  44,38,15, 42,47,.91,1],
  [.54,  43,39,18, 42,48,.87,1],
  [.64,  43,40,23, 42,49,.83,1.03],
  [.74,  43,41,26, 42,50,.79,1.06],
  [.82,  42,42,29, 41,51,.75,1.10],
  [.94,  42,43,32, 41,51,.71,1.12],
  [1.04, 42,44,34, 41,52,.68,1.14],
  [1.13, 42,45,36, 41,52,.66,1.16],
  [1.23, 42,46,38, 41,52,.63,1.18],
  [1.32, 42,47,40, 41,53,.60,1.20],
  [1.40, 42,49,43, 41,53,.56,1.25],
  [1.48, 42,51,47, 41,54,.53,1.29],
  [1.57, 42,52,49, 41,54,.50,1.32],
  [1.64, 42,53,51, 41,54,.48,1.34],
];

const pal = packedPalette();
const dagger = fromRows([
  '  G', ' Ggk', ' wGk', ' wGk', ' wGk', ' Ggk', ' Ggk', ' Ggk',
  'nNNnk', ' kkK', ' kgK', ' kNK', '  n',
], pal);
const offhand = fromRows([
  '  g', ' gNk', ' wGk', ' wGk', ' gNk', ' gNk',
  'nNNnk', ' kkK', ' knK', '  n',
], pal);
// The tips peel downward as the fingers open. Each blade then lies beside
// the hem, leaving the jade eye and dark silhouette visible in the middle.
const drops = [
  [[59,35,52],[38,38,-14]], [[59,36,57],[38,39,-22]], [[59,37,62],[38,40,-31]],
  [[59,39,76],[36,42,-46]], [[60,42,90],[34,44,-61]], [[61,45,105],[32,46,-75]],
  [[61,48,100],[30,49,-84]], [[62,51,103],[28,51,-94]], [[63,54,106],[26,53,-100]],
  [[64,56,109],[24,56,-105]],
];

function splitCloak(standing) {
  return {
    hood: cut(standing,24,[
      ...Array(8).fill([37,55]),[38,55],[38,55],[39,55],[40,54],
    ]),
    cowl: cut(standing,34,[
      [41,52],[41,53],[40,53],[40,54],[40,54],[40,54],
      [41,54],[40,54],[40,54],[40,54],[39,53],[39,51],[39,50],
    ]),
    mantle: cut(standing,32,[
      [39,43],[39,44],[38,45],[32,45],[29,44],[27,43],[26,43],
      [25,43],[25,42],[24,42],[24,41],[24,40],[24,29],[24,27],
    ]),
    hem: cut(standing,42,[
      [38,50],[36,50],[36,50],[35,50],[34,50],[34,48],[34,48],
      [34,48],[35,47],[36,46],[36,44],[36,44],[36,41],[36,38],
    ]),
  };
}

function drawDrops(out, index) {
  const surface={...out,h:56};
  const [front,back]=drops[Math.min(index-1,drops.length-1)];
  paint(surface,offhand,[2,0],back.slice(0,2),back[2]);
  paint(surface,dagger,[2,0],front.slice(0,2),front[2]);
}

function drawPose(standing,parts,index) {
  const [,cx,cy,pitch,bx,by,squash,spread]=poses[index];
  const out=blank(standing.w,standing.h), body={...out,h:56};
  const sink=1-squash;
  // Spill the long coattails against the floor before the shoulders arrive.
  // Only cloth foreshortens. The hood and its eye retain their native size.
  paint(body,parts.hem,[8,2],[bx,by],8+sink*57,squash,spread);
  paint(body,parts.mantle,[18,3],[cx,cy+1],-sink*29,squash,1-sink*.20);
  paint(body,parts.cowl,[3,1],[cx,cy+1],pitch*.43,.96-sink*.28);
  paint(body,parts.hood,[8,10],[cx,cy],pitch,.99-sink*.10);
  drawDrops(out,index);
  return out;
}

export function shadowFall(sprite) {
  let frames;
  return {
    anchorY: sprite.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: { ...sinkingSoul, offsetX: 3, offsetY: -6 },
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]];
      const parts = splitCloak(standing);
      frames = poses.map((_, index) => index ? drawPose(standing, parts, index) : standing);
      const remains = blank(standing.w, standing.h);
      drawDrops(remains, poses.length - 1);
      appendDecay(frames, remains, sprite.anchorY - 1);
      return frames;
    },
  };
}
