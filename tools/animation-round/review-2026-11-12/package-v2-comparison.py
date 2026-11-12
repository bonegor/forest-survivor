"""Pair native Game captures by elapsed scene time, without retiming the gait."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('v1', type=Path)
p.add_argument('v2', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--ids', nargs='+')
p.add_argument('--scenes', nargs='+')
p.add_argument('--scale', type=int, choices=(1, 2), default=2)
args = p.parse_args()
coverage = [json.loads((root / 'coverage.json').read_text()) for root in (args.v1, args.v2)]
ids = args.ids or list(coverage[1]['heroes'])
args.output.mkdir(parents=True, exist_ok=True)
evidence = {'presentation': 'Equal native scale and elapsed scene time; no gait retiming.',
            'v1': str(args.v1), 'v2': str(args.v2), 'scale': args.scale, 'heroes': {}}
friendly = {'walk-right': 'Travel right', 'walk-left': 'Travel left',
            'walk-diagonal': 'Diagonal travel', 'stop': 'Stop', 'restart': 'Restart',
            'slow-travel': 'Gentle movement', 'field-attack-moving': 'Field combat',
            'crypt-attack-moving-left': 'Moving crypt attack'}


def native_crop(root, hero, sample):
    with Image.open(root / f'{hero}-world' / f"{sample['frame']:04d}.png") as source:
        x, y, w, h = sample['rect']
        crop = source.convert('RGB').crop((x - 8, y - 16, x + w + 8, y + h + 16))
    if crop.size != (96, 96):
        raise ValueError(f'{hero}: unregistered native crop {crop.size}')
    return crop.resize((96 * args.scale, 96 * args.scale), Image.Resampling.NEAREST)


for hero in ids:
    worlds = [c['heroes'][hero]['world'] for c in coverage]
    streams = [json.loads((root / f'{hero}-world' / 'samples.json').read_text())
               for root in (args.v1, args.v2)]
    common = set(s['phase'] for s in streams[0]) & set(s['phase'] for s in streams[1])
    scenes = args.scenes or [s for s in dict.fromkeys(x['phase'] for x in streams[1])
                             if s in friendly and s in common]
    if not scenes or any(s not in common for s in scenes):
        raise ValueError(f'{hero}: requested scene missing from one version')
    fps = min(w['fps'] for w in worlds)
    side = 96 * args.scale
    frames, summary, total = [], {}, 0
    for scene in scenes:
        samples = [[s for s in stream if s['phase'] == scene] for stream in streams]
        duration = min(len(s) / w['fps'] for s, w in zip(samples, worlds))
        count = round(duration * fps)
        summary[scene] = {'seconds': duration, 'frames': count, 'start': total}
        for i in range(count):
            elapsed = i / fps
            tile = Image.new('RGB', (side * 2, side + 36), '#17202a')
            draw = ImageDraw.Draw(tile)
            draw.text((5, 3), f'{hero} / {friendly.get(scene, scene)}', fill='#f3e9d3')
            for column, (root, stream, world) in enumerate(zip((args.v1, args.v2), samples, worlds)):
                sample = stream[min(len(stream) - 1, int(elapsed * world['fps'] + 1e-8))]
                tile.paste(native_crop(root, hero, sample), (column * side, 36))
                draw.text((column * side + 5, 20), 'V1: preserved' if column == 0 else 'V2: restrained',
                          fill='#c3d6e0' if column == 0 else '#f1d29b')
            frames.append(tile.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                                        dither=Image.Dither.NONE))
        total += count
    durations = [(round((i + 1) * 100 / fps) - round(i * 100 / fps)) * 10 for i in range(total)]
    frames[0].save(args.output / f'{hero}-v1-v2.gif', save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, optimize=False)
    evidence['heroes'][hero] = {'fps': fps, 'frames': total, 'durationMs': sum(durations),
                                'scenes': summary,
                                'sourceFingerprint': [c['heroes'][hero]['frameFingerprint'] for c in coverage]}
    print(f'{hero}: paired {total} samples at {fps} fps', flush=True)
(args.output / 'comparison-evidence.json').write_text(json.dumps(evidence, indent=2))
