"""Merge the latest native Game capture per hero/scene, retaining real elapsed time."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('output', type=Path)
p.add_argument('groups', nargs='+', type=Path)
p.add_argument('--fps', type=int, default=20)
args = p.parse_args()
order = ['knight', 'archer', 'mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker',
         'witchhunter', 'footman', 'marksman', 'templar', 'trailblazer', 'thornkeeper', 'wraith',
         'gravebinder', 'arcanist', 'praetorian', 'seraph', 'boltguard', 'swordbearer']
wanted = ['idle-right', 'walk-right', 'crypt-idle', 'crypt-attack-right']
labels = {'idle-right': 'field idle', 'walk-right': 'walk', 'crypt-idle': 'crypt idle',
          'crypt-attack-right': 'manual attack'}
clips = {hero: {} for hero in order}
for group in args.groups:
    coverage = json.loads((group / 'coverage.json').read_text())
    for hero, data in coverage['heroes'].items():
        if hero not in clips or 'world' not in data:
            continue
        samples = json.loads((group / f'{hero}-world' / 'samples.json').read_text())
        for phase in dict.fromkeys(s['phase'] for s in samples):
            selected = [s for s in samples if s['phase'] == phase]
            clips[hero][phase] = {'group': group, 'samples': selected, 'fps': data['world']['fps'],
                                 'sourceFingerprint': data['frameFingerprint']}
for hero in order:
    if missing := [phase for phase in wanted if phase not in clips[hero]]:
        raise ValueError(f'{hero}: missing final scenes {missing}')
args.output.mkdir(parents=True, exist_ok=True)
durations = {phase: min(len(clips[hero][phase]['samples']) / clips[hero][phase]['fps'] for hero in order)
             for phase in wanted}
timeline = [(phase, n / args.fps) for phase in wanted for n in range(round(durations[phase] * args.fps))]
gif_durations = [(round((n + 1) * 100 / args.fps) - round(n * 100 / args.fps)) * 10
                 for n in range(len(timeline))]
tile_width, tile_height = 192, 212
boards = [Image.new('RGB', (tile_width * 7, tile_height * 3), '#17202a') for _ in timeline]
for hero_index, hero in enumerate(order):
    frames = []
    for frame_index, (phase, elapsed) in enumerate(timeline):
        clip = clips[hero][phase]
        sample = clip['samples'][min(len(clip['samples']) - 1, int(elapsed * clip['fps'] + 1e-8))]
        native = Image.open(clip['group'] / f'{hero}-world' / f"{sample['frame']:04d}.png").convert('RGB')
        x, y, w, h = sample['rect']
        crop = native.crop((x - 8, y - 16, x + w + 8, y + h + 16))
        crop = crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.NEAREST)
        if crop.size != (192, 192):
            raise ValueError(f'{hero}: unexpected native registered crop {crop.size}')
        tile = Image.new('RGB', (tile_width, tile_height), '#17202a')
        tile.paste(crop, (0, 20))
        ImageDraw.Draw(tile).text((5, 5), f'{hero}: {labels[phase]}', fill='#e7dfc7')
        boards[frame_index].paste(tile, (hero_index % 7 * tile_width, hero_index // 7 * tile_height))
        frames.append(tile.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE))
    frames[0].save(args.output / f'{hero}-review.gif', save_all=True, append_images=frames[1:],
                   duration=gif_durations, loop=0, optimize=False)
    print(f'{hero}: latest capture selected per scene', flush=True)
indexed = [frame.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE) for frame in boards]
indexed[0].save(args.output / 'roster-game.gif', save_all=True, append_images=indexed[1:],
                duration=gif_durations, loop=0, optimize=False)
for phase in wanted:
    positions = [n for n, scene in enumerate(timeline) if scene[0] == phase]
    boards[positions[len(positions) // 2]].save(args.output / f'roster-{phase}.png')
evidence = {
    'renderer': 'Game/Player/sprite builder/Camera/lighting/HUD',
    'fps': args.fps, 'frames': len(timeline), 'durationMs': sum(gif_durations),
    'sceneSeconds': durations, 'presentation': 'Native scene crops at 2x nearest-neighbour; no retiming of source motion.',
    'note': 'Scene transitions and the recording loop are intentional cuts; native PNGs remain authoritative.',
    'heroes': {hero: {phase: {'capture': str(clip['group']), 'fps': clip['fps'],
                             'samples': len(clip['samples']), 'sourceFingerprint': clip['sourceFingerprint']}
                      for phase, clip in clips[hero].items()} for hero in order}}
(args.output / 'evidence-index.json').write_text(json.dumps(evidence, indent=2))
print(str(args.output / 'roster-game.gif'), flush=True)
