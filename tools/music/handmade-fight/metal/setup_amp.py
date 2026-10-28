"""Create a high-gain metal amp copy in this render's isolated studio."""
import copy, json, os, sys
from pathlib import Path
SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL/'scripts'))
from common import load_config, save_config, fx_state_path, HOME, hard_exit
from tweak_fx import find_value
import dawdreamer as daw

def main():
    cfg = load_config()
    source = fx_state_path(cfg, 'metal_rhythm')
    assert source and Path(source).is_file()
    folder = Path(HOME)/'_sounds'
    folder.mkdir(exist_ok=True)
    state = folder/'rally-heavy.fx.state'
    assert not state.exists(), 'Preserve previous amp states; use a fresh run.'
    engine = daw.RenderEngine(cfg['sample_rate'], cfg['block_size'])
    proc = engine.make_plugin_processor('heavy_amp', cfg['plugins']['guitar_rig']['path'])
    proc.load_state(source)
    engine.load_graph([(proc, [])])
    engine.render(.1)
    names = {proc.get_parameter_name(i):i for i in range(proc.get_plugin_parameter_size())}
    mode_index = names['Fire Seeker Gain Mode']
    mode_value, mode_label = find_value(engine, proc, mode_index, 'II')
    proc.set_parameter(mode_index, mode_value)
    index = names['Fire Seeker Gain']
    before = proc.get_parameter_text(index).strip()
    value, label = find_value(engine, proc, index, '7')
    proc.set_parameter(index, value)
    engine.render(.1)
    proc.save_state(str(state))
    sound = copy.deepcopy(cfg['sounds']['metal_rhythm'])
    sound['fx']['state'] = str(state)
    cfg['sounds']['rally_heavy'] = sound
    save_config(cfg)
    report = dict(base='metal_rhythm', source_state=source, output_state=str(state),
                  control='Fire Seeker Gain', original=before, chosen=label, gain_mode=mode_label,
                  calibration_gain_db=sound['gain_db'], double_tracked=sound.get('double'))
    (Path(HOME)/'heavy-amp.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report), flush=True)
    hard_exit(0)

if __name__ == '__main__':
    main()
