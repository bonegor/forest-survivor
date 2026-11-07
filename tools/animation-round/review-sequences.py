"""Chronological native Game crops, preserving every recorded sample and time."""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
heroes = {}
for folder in map(Path, sys.argv[2:]):
    coverage = json.loads((folder / 'coverage.json').read_text())
    for hero, data in coverage['heroes'].items():
        if data.get('world'):
            heroes[hero] = folder

for hero, folder in heroes.items():
    source = folder / f'{hero}-world'
    samples = json.loads((source / 'samples.json').read_text())
    for phase in ['field-attack-moving', 'crypt-attack-right', 'crypt-attack-moving-left']:
        selected = [s for s in samples if s['phase'] == phase]
        board = Image.new('RGB', (1280, 30 + math.ceil(len(selected)/8)*148), '#26313a')
        draw = ImageDraw.Draw(board)
        draw.text((8, 8), f'{hero}: {phase}; chronological 20 fps actual Game samples', fill='#e7dfc7')
        for n, sample in enumerate(selected):
            im = Image.open(source / f"{sample['frame']:04}.png").convert('RGB')
            x, y, w, h = sample['rect']
            tile = im.crop((x, y, x+w, y+h)).resize((160, 128), Image.Resampling.NEAREST)
            ox, oy = n%8*160, 30+n//8*148
            board.paste(tile, (ox, oy))
            draw.text((ox+3, oy+130), f"{sample['time']:.2f}s / pose{sample['spriteFrame']}", fill='#e7dfc7')
        board.save(out / f'{hero}-{phase}.png')
print(f'{len(heroes)} heroes: {out}')
