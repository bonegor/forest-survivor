"""Rebuild the earlier, high-density painted Skardi study."""
import argparse
import base64
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


HERE = Path(__file__).resolve().parent
SCALE = 3
NATIVE = (132, 112)
WORK = tuple(n * SCALE for n in NATIVE)
BASELINE = 99

# These cut paths follow the actual painted edges. Coordinates are in the
# 132 x 112 animation cell. Transparent space outside the silhouette is safe.
LEFT_ARM = [(13,9),(50,9),(48,35),(39.2,38.5),(38.2,42.5),(39.9,44.6),
    (40.9,43.7),(42.1,44.4),(43.6,46.6),(45.3,49.4),(46.4,52.1),
    (46.6,53.5),(45.7,54.2),(43.8,55),(41.6,55.8),(39.9,56.4),
    (38.4,56.2),(33.9,57),(32.1,60.5),(30,68.5),(16,71)]
RIGHT_ARM = [(77.1,57.3),(77.9,55.7),(79.6,54.1),(81.7,53.2),(83.5,53.1),
    (85.5,53.6),(87.2,54.6),(87.7,55.9),(87.6,57.4),(89.4,59.8),
    (91.1,61),(115,59),(116,87),(91.1,87),(87.7,79),(87.5,77.3),
    (87.6,77.8),(86.7,77.8),(85.8,78.7),(84.8,78.7),(83.8,79.1),
    (82.4,79.5),(81.5,79.2),(80.5,78.5),(75.2,81.6),(74.3,81.8),(73,81.5),(72.5,80.5),
    (72.4,79.4),(72.8,78.6),(73.2,78),(79.8,74.6),(80,72.5),(80.8,70.8),
    (80.1,69.4),(79.8,67.6),(78.2,66),(77.7,63.5),(78.1,61.1),(77.5,60.4)]
LEFT_LEG = [(39.5,70.6),(40,69.1),(41,68),(43.1,66.5),(45.6,66.2),(47.7,66.4),
    (49.9,67.1),(50.4,68.4),(50.5,71),(50.8,74.8),(50.6,78),
    (50,80.2),(48.8,81.4),(48.2,81.2),(46.1,83.6),(46.5,85.2),(48,87.6),
    (43,102),(24,102),(26,88),(30.8,83.8),(31.8,81.2),(34.6,79.4),
    (34.7,77.8),(34.1,77.1),(34.8,75.5),(36.7,73.7),(37.4,73.1),(38.3,72.5)]
RIGHT_LEG = [(64,80),(65.7,79.6),(67.4,78.8),(69.1,77.5),(69.8,75.9),
    (70.1,77.2),(71.6,78.1),(72.7,77.6),(74.2,75.3),(77.7,73.5),
    (80.1,72.8),(86,74.5),(87.9,78.8),(87.4,81.2),(91,87),(97.4,100),
    (74.1,100),(72.1,91.4),(71.5,87.3),(70.8,85.6),(68.2,84.7)]


def painted_source(path):
    original = Image.open(path).convert('RGBA')
    box = original.getchannel('A').point(lambda a: 255 if a>=96 else 0).getbbox()
    image = original.crop(box)
    height = 82
    width = round(height*image.width/image.height)
    image = image.convert('RGBa').resize((width*SCALE,height*SCALE),Image.Resampling.LANCZOS).convert('RGBA')
    result = Image.new('RGBA',WORK)
    result.alpha_composite(image,(((NATIVE[0]-width)//2)*SCALE,(BASELINE+1-height)*SCALE))
    return result


def main_island(mask, alpha, seed):
    # A hand selection may touch an isolated flyaway hair outside the painted
    # arm. Leave that hair on the coat. Filling from the interior also removes
    # nearly transparent wisps introduced in the source alpha channel.
    visible = (np.asarray(mask)>0) & (np.asarray(alpha)>36)
    probe = Image.fromarray((visible*255).astype('uint8')).copy()
    xy=tuple(int(n*SCALE) for n in seed)
    assert probe.getpixel(xy)==255, f'Empty interior at {seed}'
    ImageDraw.floodfill(probe,xy,128)
    island=np.asarray(probe)==128
    assert island.sum()>50, f'Missing paint at {seed}'
    core = Image.fromarray((island*255).astype('uint8')).filter(ImageFilter.MaxFilter(3))
    return np.minimum(np.asarray(core),np.asarray(mask))


def polygon_mask(poly):
    mask = Image.new('L', WORK)
    ImageDraw.Draw(mask).polygon([(round(x*SCALE), round(y*SCALE)) for x,y in poly], fill=255)
    return mask


def transformed(part, matrix):
    """The matrix describes the forward pose in native-pixel coordinates."""
    matrix = matrix.copy()
    matrix[:2, 2] *= SCALE
    inv = np.linalg.inv(matrix)
    return part.transform(WORK, Image.Transform.AFFINE, tuple(inv[:2].flat), Image.Resampling.BICUBIC)


def translate(x=0., y=0.):
    return np.array([[1.,0.,x], [0.,1.,y], [0.,0.,1.]])


def turn(degrees, pivot):
    a = math.radians(degrees)
    c, s = math.cos(a), math.sin(a)
    return translate(*pivot) @ np.array([[c,-s,0.],[s,c,0.],[0.,0.,1.]]) @ translate(-pivot[0],-pivot[1])


def component(source, mask):
    """Mask colour and premultiplied alpha together for clean interpolation."""
    raw = np.asarray(source).copy()
    raw[:, :, 3] = np.minimum(raw[:, :, 3], np.asarray(mask))
    return Image.fromarray(raw).convert('RGBa')


def stepping(part, source_rows, dx, dy):
    """Bend the trousers at the knee while carrying the complete lower boot.

    Interpolate the travel of the hip, knee and ankle inside each horizontal
    band. The boot's shaft, toe and sole share a final rigid translation.
    """
    rows = np.asarray(source_rows, dtype=float) * SCALE
    dest = rows + np.asarray(dy, dtype=float) * SCALE
    xoff = np.asarray(dx, dtype=float) * SCALE
    bands = []
    for y in range(WORK[1]):
        source_y = np.interp([y,y+1],dest,rows)
        shift = np.interp([y,y+1],dest,xoff)
        bands.append(((0,y,WORK[0],y+1),
            (-shift[0],source_y[0],-shift[1],source_y[1],
              WORK[0]-shift[1],source_y[1],WORK[0]-shift[0],source_y[0])))
    return part.transform(WORK,Image.Transform.MESH,bands,Image.Resampling.BICUBIC)


def composite_parts(parts):
    result = Image.new('RGBA',WORK)
    for part in parts:
        result.alpha_composite(part.convert('RGBA'))
    return result


def native_frame(composite):
    # Resample in premultiplied space. Threshold only the outer coverage after
    # reduction so the dark matte cannot seep into illuminated metal and skin.
    tiny = composite.convert('RGBa').resize(NATIVE, Image.Resampling.LANCZOS).convert('RGBA')
    raw = np.asarray(tiny).copy()
    raw[:, :, 3] = np.where(raw[:, :, 3] >= 112, 255, 0)
    raw[raw[:, :, 3] == 0] = 0
    return Image.fromarray(raw)


def write_sheet(frames, idle, walk, attack, attack_walk, outfile):
    # Shared palette prevents metallic highlights from changing colour between
    # adjacent poses. No diffusion dither on the small shapes around the eyes.
    samples = []
    for frame in frames:
        rgba = np.asarray(frame)
        samples.append(rgba[rgba[:, :, 3] != 0, :3][::4])
    sample = np.concatenate(samples)
    sample = sample[:len(sample)//256*256].reshape(-1,256,3)
    indexed = Image.fromarray(sample).quantize(254, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    table = np.array(indexed.getpalette(), dtype=np.uint8).reshape(-1,3)
    # Entries 254 and 255, where present, repeat entry zero. They must never
    # wrap into the reserved transparent index during the one-based conversion.
    quantizer = Image.new('P',(1,1))
    quantizer.putpalette(np.vstack((table[:254],table[0],table[0])).tobytes())
    colors = [0, *[int(r) | int(g)<<8 | int(b)<<16 | 0xff000000 for r,g,b in table[:254]]]
    encoded = []
    for frame in frames:
        rgba = np.asarray(frame)
        ids = np.asarray(frame.convert('RGB').quantize(palette=quantizer,dither=Image.Dither.NONE)).copy()
        ids[ids>=254] = 0
        ids += 1
        ids[rgba[:, :, 3] == 0] = 0
        encoded.append(base64.b64encode(ids.tobytes()).decode('ascii'))
    box = frames[idle[0]].getbbox()
    data = dict(name='Skardi Ironbrow', pick='berserker-vikings:skardi', w=NATIVE[0], h=NATIVE[1],
                anchorY=BASELINE, hires=2, fitW=box[2]-box[0], fitH=box[3]-box[1], indexBytes=1,
                idle=idle, walk=walk, attack=attack, attackWalk=attack_walk, attackRelease=3,
                attackFps=12, idleRate=3.75, motionRate=1.05, selfBob=True, palette=colors, frames=encoded)
    outfile.write_text('// Painted source and animation are rebuilt by skardi-bake.py.\nexport default '+
                       json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')


LEFT_CUFF = [(12,8),(50,8),(49,40),(37,44.7),(38.5,45.4),(39.5,46.8),(40.0,48.8),
    (39.8,50.7),(39.0,52.4),(37.4,54.3),(36.1,55.9),(31,70),(10,72)]
RIGHT_CUFF = [(69,83),(78.6,68.6),(79.8,67),(81.0,65.7),(82.8,64.7),
    (84.7,64.0),(86.6,64.0),(88.3,64.5),(90.4,65.7),(92,65.5),
    (109,55),(119,62),(118,94),(68,94)]


def divide_arm(source, mask, cuff):
    fore_mask = np.minimum(mask,np.asarray(polygon_mask(cuff)))
    # One pixel of painted underlap at the wristband keeps the arm connected
    # when the cuff rotates against the bare tattooed skin behind it.
    upper = Image.fromarray(np.minimum(mask,255-fore_mask)).filter(ImageFilter.MaxFilter(7))
    upper = np.minimum(np.asarray(upper),mask)
    return component(source,Image.fromarray(upper)),component(source,Image.fromarray(fore_mask))


def thigh_underpaint(source):
    # The axe haft crosses dark trousers. Extend their existing painted folds
    # under the haft, so lifting the hand reveals a complete thigh beneath it.
    points=[(66,78.7),(69.8,74.1),(75.5,72.7),(80,72.5),(83.4,74.6),
        (85.3,76.6),(86.1,80.7),(83.5,83.5),(77.2,84.3),(72,82.2)]
    mask=np.asarray(polygon_mask(points))
    yy,xx=np.indices(mask.shape)
    tx=np.clip((78.2*SCALE+(xx-72*SCALE)*.4).astype(int),78*SCALE,84*SCALE)
    ty=np.clip((80.5*SCALE+(yy-73*SCALE)*.34).astype(int),80*SCALE,84*SCALE)
    sampled=np.asarray(source)[ty,tx].copy()
    sampled[:,:,:3]=(sampled[:,:,:3]*.80).astype('uint8')
    sampled[:,:,3]=mask
    return Image.fromarray(sampled)


def rig(source):
    alpha=source.getchannel('A')
    left,right,front,back=[main_island(polygon_mask(path),alpha,seed) for path,seed in
        [(LEFT_ARM,(31,45)),(RIGHT_ARM,(84,73)),(LEFT_LEG,(43,75)),(RIGHT_LEG,(80,84))]]
    back=np.minimum(back,255-right)
    torso=main_island(Image.fromarray(255-np.maximum.reduce([left,right,front,back])),alpha,(65,56))
    # The top clothing remains above the moving trousers; fill the small
    # triangle between a raised kneecap and the split red tunic.
    rear_leg=thigh_underpaint(source)
    rear_leg.alpha_composite(component(source,Image.fromarray(back)).convert('RGBA'))
    torso_part=component(source,Image.fromarray(torso))
    return dict(left=divide_arm(source,left,LEFT_CUFF), right=divide_arm(source,right,RIGHT_CUFF),
                front_leg=component(source,Image.fromarray(front)), back_leg=rear_leg.convert('RGBa'), torso=torso_part)


def articulated(arm, body, shoulder, elbow, shoulder_turn, elbow_turn):
    upper,fore=arm
    base=body @ turn(shoulder_turn,shoulder)
    return transformed(upper,base),transformed(fore,base @ turn(elbow_turn,elbow))


# Contact, compression, push, lift and passing. A mirrored index means each
# sole supports the body while the other foot clears the ground.
GAIT=[(7.8,0,3.5),(4.9,0,2.7),(0.4,0,0.7),(-3.9,0,-1.2),
      (-6.9,0.7,-1.9),(-5.4,3.9,0.6),(-0.1,6.1,4.0),(5.7,3.1,5.3)]
# Torso lean and travel, then shoulder and elbow rotations for both arms.
# Right arm raises the axe at the elbow, left arm chops from the high guard.
BLOWS=[(-.7,-.5,-1., -3,-4, -3,-5), (-3.4,-1.8,-1.4,-9,-9,-13,-20),
       (-5.2,-2.3,-2.0,-15,-12,-17,-31), (5.8,3,1.2,17,37,9,10),
       (7.3,3.5,2.1,23,46,13,17), (2.5,1,0.7,9,15,5,5)]


def pose(parts, source, idle=None, walk=None, attack=None):
    if walk is None and attack is None and idle==0:
        return native_frame(source)
    wave=math.sin((idle or 0)*math.tau/8)
    side=0. if walk is None else math.sin(walk*math.tau/8)
    x, bob, lean = (0.0,-.47*wave,.12*wave) if walk is None else (
        .7*side,[0,1.5,.5,-1.3,0,1.5,.5,-1.3][walk],.8*side)
    ls,le,rs,re = (wave*.5,wave*.55,-wave*.45,-wave*.75) if walk is None else (
        2.0*side,2.9*side,-2.9*side,-3.9*side)
    if attack is not None:
        adjust,x1,y1,ls,le,rs,re = BLOWS[attack]
        lean+=adjust; x+=x1; bob+=y1
    body=translate(x,bob) @ turn(lean,(65,64))
    left=articulated(parts['left'],body,(44.2,48.),(37,50),ls,le)
    right=articulated(parts['right'],body,(83.5,54.5),(84.5,65.7),rs,re)

    def leg(part,rows,phase,rest_offset):
        foot,lift,knee=GAIT[phase] if phase is not None else (0,0,0)
        if phase is not None: foot+=rest_offset
        return stepping(part,[0,*rows,NATIVE[1]],
            [x,x,knee+x*.55,foot,foot], [bob,bob,bob*.30-lift*.48,-lift,-lift])

    legs=[leg(parts['back_leg'],[74.0,81.6,91.1],None if walk is None else (walk+4)%8,-3),
          leg(parts['front_leg'],[67.2,76.5,89],walk,4)]
    layers=[*legs, left[0], transformed(parts['torso'],body), left[1], *right]
    return native_frame(composite_parts(layers))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=HERE/'art/skardi.png')
    parser.add_argument('--output',type=Path,default=HERE/'art/skardi-painted-sheet.js')
    parser.add_argument('--preview',type=Path)
    args=parser.parse_args()
    source=painted_source(args.source)
    parts=rig(source)
    frames=[]
    def add(**kw):
        frames.append(pose(parts,source,**kw))
        return len(frames)-1
    idle=[add(idle=i) for i in range(8)]
    walk=[add(walk=i) for i in range(8)]
    attack=[add(attack=i) for i in range(6)]
    attack_walk=[[add(attack=i,walk=j) for j in range(8)] for i in range(6)]
    write_sheet(frames,idle,walk,attack,attack_walk,args.output)
    if args.preview:
        board=Image.new('RGB',(NATIVE[0]*4*2,NATIVE[1]*4*2),'#445654')
        for n,i in enumerate([0,*walk,*attack,7]):
            im=frames[i].resize((NATIVE[0]*2,NATIVE[1]*2),Image.Resampling.NEAREST)
            board.paste(im,(n%4*im.width,n//4*im.height),im)
        board.save(args.preview)
    print(f'{len(frames)} poses, {NATIVE[0]} x {NATIVE[1]} at 2x. Standing bounds: {frames[0].getbbox()}')


if __name__=='__main__':
    main()
