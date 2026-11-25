"""Independent diagnostics for staged native PNG gait frames; never modifies art."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('root', type=Path)
p.add_argument('ids', nargs='+')
args = p.parse_args()
report = {}
def pixels(frame):
    return list(frame.get_flattened_data() if hasattr(frame, 'get_flattened_data') else frame.getdata())

for hero in args.ids:
    files = sorted(args.root.glob(f'{hero}-[0-9][0-9].png'))
    if not files:
        raise ValueError(f'No native frames found for {hero}')
    frames = [Image.open(f).convert('RGBA') for f in files]
    checks = []
    for frame in frames:
        width, height = frame.size
        data = pixels(frame)
        todo = {n for n, c in enumerate(data) if c[3] >= 128}
        components = []
        while todo:
            first = todo.pop()
            stack, component = [first], [first]
            while stack:
                n = stack.pop()
                x, y = n % width, n // width
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        xx, yy = x + dx, y + dy
                        neighbor = yy * width + xx
                        if 0 <= xx < width and 0 <= yy < height and neighbor in todo:
                            todo.remove(neighbor)
                            stack.append(neighbor)
                            component.append(neighbor)
            xs, ys = [n % width for n in component], [n // width for n in component]
            components.append({'pixels': len(component), 'box': [min(xs), min(ys), max(xs), max(ys)]})
        components.sort(key=lambda c: c['pixels'], reverse=True)
        checks.append({'lowDetached': [c for c in components[1:] if c['pixels'] >= 3 and c['box'][1] >= 46],
                       'bounds': frame.getbbox()})
    changed = [sum(a != b for a, b in zip(pixels(frame), pixels(frames[(i + 1) % len(frames)])))
               for i, frame in enumerate(frames)]
    report[hero] = {'frames': len(frames), 'unique': len({frame.tobytes() for frame in frames}),
                    'consecutiveChangedPixelsIncludingSeam': changed, 'poses': checks}
    for background, color in [('light', '#bdb8a5'), ('dark', '#26313a')]:
        board = Image.new('RGB', (256 * 4, 196 * ((len(frames) + 4) // 4) + 24), color)
        draw = ImageDraw.Draw(board)
        text_color = '#17202a' if background == 'light' else '#e7dfc7'
        draw.text((8, 6), f'{hero}: complete lower-body sequence at 8x plus return0', fill=text_color)
        for i, frame in enumerate(frames + [frames[0]]):
            crop = frame.crop((24, 38, 56, 60)).resize((256, 176), Image.Resampling.NEAREST)
            x, y = (i % 4) * 256, 24 + (i // 4) * 196
            board.paste(crop, (x, y), crop)
            draw.line((x, y + 18 * 8, x + 255, y + 18 * 8), fill='#7c8078')
            draw.text((x + 6, y + 180), f'phase {i}' if i < len(frames) else 'return0', fill=text_color)
        board.save(args.root / f'{hero}-lower-review-{background}.png')
out = args.root / 'independent-png-review.json'
out.write_text(json.dumps(report, indent=2))
print(json.dumps({hero: {'unique': data['unique'], 'detachedPoses': [n for n, pose in enumerate(data['poses']) if pose['lowDetached']],
                        'seamChanged': data['consecutiveChangedPixelsIncludingSeam'][-1]} for hero, data in report.items()}, indent=2))
