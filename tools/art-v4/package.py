"""Package real renderer captures with exact 12-second timing and a whole-loop contact sheet."""
from pathlib import Path
import argparse
import subprocess
import sys
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('--helper', type=Path, required=True, help='forest-survivor-art/scripts/capture-gif.py')
a = p.parse_args()
root = Path('output/hero-v4/review')
for folder in sorted(root.iterdir()):
    if not folder.is_dir():
        continue
    paths = sorted(folder.glob('*.png'))
    if len(paths) != 240:
        raise RuntimeError(f'{folder}: expected 240 frames, got {len(paths)}')
    subprocess.run([sys.executable, str(a.helper), '--frames', str(folder), '--out', str(root / (folder.name + '.gif')), '--duration', '50'], check=True)
    # Review the complete 12s loop, including its return, rather than just its first poses.
    selected = [0, *range(10, 240, 10), 239]
    tw, th = 480, 124
    sheet = Image.new('RGB', (tw * 3, ((len(selected) + 2) // 3) * (th + 22)), '#10131b')
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(selected):
        im = Image.open(paths[frame]).convert('RGB').resize((tw, th), Image.Resampling.NEAREST)
        x, y = i % 3 * tw, i // 3 * (th + 22)
        draw.text((x + 8, y + 3), f'{folder.name} / {frame * .05:.2f}s', fill='#dfd0ad')
        sheet.paste(im, (x, y + 22))
    sheet.save(root / (folder.name + '-whole-loop.png'))
