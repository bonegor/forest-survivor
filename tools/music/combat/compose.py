"""Original dark-fantasy score. Export with the installed Music Studio songkit.

Three 64-bar combat loops plus a 32-bar title and a 16-bar aftermath cue.
Every song starts on the action; there are no count-ins or fade-out endings.
"""
import os
import sys
from pathlib import Path

SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home() / '.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL / 'scripts'))
from songkit import Song, SHREDDAGE_KS, SHREDDAGE_RANGE, BASS, power, drum, fill

PIECES = {
    'thorn-hunt': ('Thorn Hunt', 176, 64, 'hunt'),
    'bone-procession': ('Bone Procession', 168, 64, 'crypt'),
    'crown-of-cinders': ('Crown of Cinders', 192, 64, 'boss'),
    'oath-at-the-gate': ('Oath at the Gate', 144, 32, 'title'),
    'embers-and-iron': ('Embers and Iron', 112, 16, 'results'),
}

# Four-bar call and answer phrases, composed for this score. Durations are sixteenths.
HOOKS = {
 'hunt': [[(0,3,71),(3,1,69),(4,2,67),(6,2,69),(8,3,71),(11,1,74),(12,3,71)],
          [(0,4,72),(4,2,71),(6,2,67),(8,3,64),(12,3,67)],
          [(0,3,69),(3,1,71),(4,3,74),(8,2,72),(10,2,69),(12,3,66)],
          [(0,4,71),(4,2,69),(6,2,66),(8,2,63),(10,2,66),(12,3,71)]],
 'crypt': [[(0,3,64),(3,3,65),(6,2,71),(8,4,67),(12,3,65)],
           [(0,4,65),(4,2,69),(6,2,72),(8,3,71),(12,3,69)],
           [(0,3,67),(3,3,71),(6,2,74),(8,4,71),(12,3,67)],
           [(0,4,65),(4,2,64),(6,2,62),(8,6,64)]],
 'boss': [[(0,2,64),(2,1,66),(3,1,67),(4,3,71),(7,1,72),(8,3,75),(12,3,76)],
          [(0,3,72),(3,1,71),(4,2,69),(6,2,67),(8,4,72),(12,3,71)],
          [(0,3,69),(3,1,71),(4,3,72),(8,3,76),(12,3,72)],
          [(0,2,75),(2,2,72),(4,2,71),(6,2,69),(8,3,66),(12,3,63)]],
}

def compose(slug):
    title, bpm, bars, mode = PIECES[slug]
    quiet = mode == 'results'
    menu = mode in ('title', 'results')
    S = Song(title, bpm, seed=173 + list(PIECES).index(slug), target_lufs=-16)
    R = S.add_track('Rhythm', 'acoustic_strum' if menu else 'metal_rhythm', 'acoustic' if menu else 'rhythm',
                    keyswitches=None if menu else SHREDDAGE_KS, prange=(40,84) if menu else SHREDDAGE_RANGE)
    L = S.add_track('Melody', 'tin_whistle' if mode in ('hunt','title','results') else 'metal_lead', 'lead',
                    keyswitches=None if mode in ('hunt','title','results') else SHREDDAGE_KS,
                    prange=(74,98) if mode in ('hunt','title','results') else SHREDDAGE_RANGE)
    B = S.add_track('Bass', 'bass', 'bass', prange=(28,55))
    D = S.add_track('War Drums', 'drums', 'drums')
    S.mix = {R: 1 if not menu else -2, L: -1 if mode == 'hunt' else (-5 if not menu else -8), B: -1, D: -2 if not menu else -6}
    if mode == 'title':
        S.mix.update({R: 0, L: -10, B: 1})
    elif quiet:
        S.mix.update({R: 0, L: -11})
    chords = {'hunt':['E','C','D','B'], 'crypt':['E','F','G','E'],
              'boss':['E','C','A','B'], 'title':['E','C','D','B'], 'results':['E','C','A','B']}[mode]
    hook = HOOKS[mode if not menu else 'hunt']
    for start in range(0, bars, 8):
        S.section(start, start+8, ('pursuit','rally','charge','answer','siege','rally-return','charge-return','turnaround')[(start//8)%8])
    for bar in range(bars):
        block, phrase = bar//8, bar%4
        c = chords[phrase]
        # Refrains open out harmonically; riff passages keep a low-E pedal.
        refrain = block in (1,3,5,6) or menu
        if menu:
            triad = {'E':[52,55,59,64], 'C':[48,55,60,64], 'D':[50,57,62,66], 'B':[47,54,59,63], 'A':[45,52,57,60]}[c]
            for j,p in enumerate(range(0,16,4 if quiet else 2)):
                S.play(R, bar,p,5 if quiet else 3,triad[j%4],75 if j%4==0 else 64,hum_ms=3)
        elif refrain:
            for p,ln in [(0,3),(3,3),(6,2),(8,3),(11,1),(12,2),(14,2)]:
                S.play(R,bar,p,ln,power(c),115 if p in (0,8) else 104,art='sus' if p in (0,8) else 'mute',hum_ms=2)
        else:
            positions = (0,2,3,4,6,7,8,10,11,12,14,15) if mode!='crypt' else (0,1,3,4,6,8,9,11,12,14)
            for p in positions:
                chord = c if p in (6,14) else 'E'
                if bar%8==7 and p>=12: chord='B' if mode!='crypt' else 'F'
                S.play(R,bar,p,1 if p%4 else 1.8,power(chord,octave=False),110 if p%4==0 else 99,art='mute',hum_ms=2)
        root = BASS[c if refrain else 'E']
        for p in range(0,16,4 if quiet else 2):
            S.play(B,bar,p,3.4 if quiet else 1.6,root,99 if p%4==0 else 88,hum_ms=2)
        # Leads answer the riff in every second half-phrase; space keeps attacks intelligible.
        active = refrain or bar%8>=4
        if active:
            for p,ln,note in hook[phrase]:
                if not refrain and p<8: continue
                if mode in ('hunt','title','results'): note+=12
                if block==6 and phrase==0 and p==0: note=min(note+5,96 if mode=='hunt' else 76)
                S.play(L,bar,p,ln,note,95 if menu else 107,
                       art=None if mode in ('hunt','title','results') else 'sus',hum_ms=2,gate=.9)
        if quiet:
            for p in (0,8): drum(S,D,bar,p,'tom_floor',68)
            drum(S,D,bar,12,'stick',65)
        elif mode=='title':
            for p in (0,6,8,14): drum(S,D,bar,p,'tom_floor',90 if p%8==0 else 74)
            for p in (4,12): drum(S,D,bar,p,'snare',86)
            for p in range(0,16,2): drum(S,D,bar,p,'chh',66)
        else:
            cymbal='ride' if refrain else 'chh'
            for p in range(0,16,2): drum(S,D,bar,p,cymbal,88 if p%4==0 else 72)
            kicks=(0,2,3,6,8,10,11,14) if mode!='boss' else tuple(range(0,16,2))+(3,7,11,15)
            for p in kicks: drum(S,D,bar,p,'kick',113 if p%4==0 else 101)
            for p in (4,12): drum(S,D,bar,p,'snare',117)
            if bar%8==0: drum(S,D,bar,0,'crash',110)
        if bar%8==7 and not quiet:
            fill(S,D,bar,12,kind='toms' if block%2==0 else 'snare',base_vel=94,step=1)
    # Render one full cycle and 4 s of release. Build wraps the release into the opening.
    S.master['tail_sec']=5
    return S

if __name__ == '__main__':
    out = Path(sys.argv[1])
    for slug in sys.argv[2:] or PIECES:
        song=compose(slug)
        meta=song.export(out/slug)
        meta['loop_bars']=PIECES[slug][2]
        meta['loop_seconds']=PIECES[slug][2]*240/PIECES[slug][1]
        import json
        (out/slug/'song.json').write_text(json.dumps(meta,indent=1))
