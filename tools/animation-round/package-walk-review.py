"""Package chronological native Game walk captures without smoothing or time drift.

python package-walk-review.py OUTPUT_ROOT --ids knight [--before BASELINE_ROOT]
PNG captures remain authoritative. GIF loop cuts include the scrolling scene cut.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('root', type=Path)
parser.add_argument('--ids', nargs='*')
parser.add_argument('--before', type=Path)
args = parser.parse_args()
coverage = json.loads((args.root / 'coverage.json').read_text())
ids = args.ids or list(coverage['heroes'])
before = json.loads((args.before / 'coverage.json').read_text()) if args.before else None


def samples(root, hero):
    return json.loads((root / f'{hero}-world' / 'samples.json').read_text())


def tile(root, hero, sample, caption):
    native = Image.open(root / f'{hero}-world' / f"{sample['frame']:04d}.png").convert('RGB')
    x, y, width, height = sample['rect']
    crop = native.crop((x - 8, y - 10, x + width + 8, y + height + 10))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.NEAREST)
    out = Image.new('RGB', (crop.width, crop.height + 20), '#17202a')
    out.paste(crop, (0, 20))
    ImageDraw.Draw(out).text((5, 4), caption, fill='#e7dfc7')
    return out


def save_gif(path, frames, fps):
    durations = [(round((i + 1) * 100 / fps) - round(i * 100 / fps)) * 10 for i in range(len(frames))]
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=False)


for hero in ids:
    world = coverage['heroes'][hero].get('world')
    if not world:
        continue
    fps = world['fps']
    recorded = samples(args.root, hero)
    prior = samples(args.before, hero) if before and hero in before['heroes'] else []
    prior_fps = before['heroes'][hero]['world']['fps'] if prior else None
    for phase in dict.fromkeys(s['phase'] for s in recorded):
        selected = [s for s in recorded if s['phase'] == phase]
        frames = [tile(args.root, hero, sample, f"{hero}: {phase}") for sample in selected]
        save_gif(args.root / f'{hero}-{phase}.gif', frames, fps)
        width, height = frames[0].size
        board = Image.new('RGB', (width * 8, height * ((len(frames) + 7) // 8) + 25), '#26313a')
        draw = ImageDraw.Draw(board)
        draw.text((8, 7), f'{hero}: {phase}; chronological {fps} fps real Game samples', fill='#e7dfc7')
        for n, (frame, sample) in enumerate(zip(frames, selected)):
            frame = frame.copy()
            ImageDraw.Draw(frame).rectangle((0, 0, width, 19), fill='#17202a')
            ImageDraw.Draw(frame).text((5, 4), f"{sample['time']:.2f}s / pose {sample['spriteFrame']}", fill='#e7dfc7')
            board.paste(frame, (n % 8 * width, 25 + n // 8 * height))
        board.save(args.root / f'{hero}-{phase}-sequence.png')
        old = [s for s in prior if s['phase'] == phase]
        if old:
            # Each side uses its own recorded time; equal list indices would
            # incorrectly speed up a 20 fps baseline beside a 30 fps capture.
            duration = min(len(old) / prior_fps, len(selected) / fps)
            paired = []
            for n in range(round(duration * fps)):
                old_sample = old[min(len(old) - 1, int(n / fps * prior_fps))]
                left = tile(args.before, hero, old_sample, f'{hero}: before')
                right = tile(args.root, hero, selected[n], f'{hero}: updated')
                pair = Image.new('RGB', (left.width + right.width, max(left.height, right.height)), '#17202a')
                pair.paste(left, (0, 0))
                pair.paste(right, (left.width, 0))
                paired.append(pair)
            save_gif(args.root / f'{hero}-{phase}-comparison.gif', paired, fps)
    print(f'{hero}: {len(recorded)} native samples packaged at {fps} fps')
