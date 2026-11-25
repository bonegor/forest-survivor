"""Compact, phase-labelled contact sheets from actual paired game captures."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('take')
parser.add_argument('--revision', type=int, required=True)
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'out' / 'hero-redesign'
take = out / 'captures' / args.take

for folder in sorted(take.glob('*/*')):
    coverage = folder / 'coverage.json'
    if not coverage.exists():
        continue
    data = json.loads(coverage.read_text(encoding='utf-8'))
    records = data['records']
    phases = list(dict.fromkeys(r['phase'] for r in records))
    sheet = Image.new('RGB', (8 * 104, len(phases) * 120), '#141b1e')
    draw = ImageDraw.Draw(sheet)
    for row, phase in enumerate(phases):
        unique = {}
        for i, record in enumerate(records):
            if record['phase'] == phase:
                unique.setdefault(record['variants'][1]['frame'], i)
        selected = list(unique.values())
        if len(selected) > 8:
            selected = [selected[round(j * (len(selected) - 1) / 7)] for j in range(8)]
        for col, i in enumerate(selected):
            with Image.open(folder / 'frames' / f'{i:04}.png') as frame:
                # Right/new variant, without resampling; labels sit outside pixels.
                crop = frame.crop((144, 10, 248, 114))
            sheet.paste(crop, (col * 104, row * 120 + 16))
            draw.text((col * 104 + 2, row * 120 + 2),
                      f"{phase} {records[i]['variants'][1]['frame']}", fill='white')
    sheet.save(out / f"round{args.revision}-{data['id']}-{data['setting']}-motion.png")
print(f'Wrote native motion contacts for take {args.take}.')
