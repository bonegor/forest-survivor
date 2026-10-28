"""Lantern Guard: a new fifteen-minute neoclassical combat instrumental.

160 BPM, 600 bars, D minor / F major, with A-major dominant turns.
An immediate drum/bass engine, short string strokes and a percussive keyboard
theme share Clockwork Charge's instrument palette, with entirely new themes.
Eighteen 32-bar chapters develop three themes and two rhythmic bridge textures.
"""
import os, sys
from pathlib import Path
SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL/'scripts'))
from songkit import Song, BASS_RANGE, drum, fill

S = Song('Lantern Guard - fifteen minute journey', bpm=160, seed=627431, target_lufs=-13)
ST = S.add_track('Lantern Strings', 'battle_strings', 'rhythm', prange=(45,76))
KY = S.add_track('Lantern Keyboard', 'battle_keys', 'keys', prange=(45,76))
BS = S.add_track('Deep Bass', 'bass', 'bass', prange=BASS_RANGE)
DR = S.add_track('March Drums', 'drums', 'drums')
S.mix = {ST:1.0, KY:-1.5, BS:1.0, DR:0.0}
S.master['tail_sec'] = 0

# Compact inversions reduce chord-to-chord movement. The separate low bass
# defines each root; C# is reserved for the A-major dominant and final D major.
CHORDS = {
    'Dm':([57,62,65],38), 'Bb':([58,62,65],34),
    'F':([57,60,65],29), 'A':([57,61,64],33),
    'Gm':([55,58,62],31), 'C':([55,60,64],36),
    'Edim':([55,58,64],28), 'D':([57,62,66],38),
}
A_CHANGES = ['Dm','Bb','F','A','Dm','Gm','Bb','A']
B_CHANGES = ['F','C','Dm','Bb','F','Gm','A','Dm']
C_CHANGES = ['Gm','C','F','Bb','Edim','A','Dm','A']

# The principal melody has a descending answer followed by a rising pickup.
# Strong quarter-note positions land on harmony tones; weak notes connect them.
A = [
    [(0,3,69),(3,1,67),(4,2,65),(6,2,64),(8,4,62),(12,2,65),(14,2,69)],
    [(0,4,65),(4,2,62),(6,2,60),(8,4,58),(12,2,62),(14,2,65)],
    [(0,2,65),(2,2,67),(4,4,69),(8,3,72),(11,1,70),(12,4,69)],
    [(0,3,69),(3,1,67),(4,4,64),(8,4,61),(12,3,64)],
    [(0,2,62),(2,2,65),(4,3,69),(7,1,67),(8,4,65),(12,2,64),(14,2,62)],
    [(0,4,62),(4,2,65),(6,2,64),(8,4,67),(12,2,65),(14,2,62)],
    [(0,3,65),(3,1,64),(4,4,62),(8,4,58),(12,4,62)],
    [(0,4,64),(4,2,61),(6,2,62),(8,3,64),(11,1,65),(12,3,69)],
]
B = [
    [(0,4,69),(4,2,72),(6,2,74),(8,4,72),(12,4,69)],
    [(0,3,67),(3,1,65),(4,4,64),(8,4,60),(12,2,64),(14,2,67)],
    [(0,4,69),(4,2,67),(6,2,65),(8,4,62),(12,2,65),(14,2,69)],
    [(0,2,70),(2,2,69),(4,4,65),(8,4,62),(12,4,65)],
    [(0,3,72),(3,1,70),(4,4,69),(8,4,65),(12,2,67),(14,2,69)],
    [(0,4,70),(4,2,69),(6,2,67),(8,4,62),(12,4,67)],
    [(0,2,69),(2,2,67),(4,4,64),(8,4,61),(12,2,64),(14,2,69)],
    [(0,4,74),(4,2,72),(6,2,69),(8,4,65),(12,3,62)],
]
C = [
    [(0,2,67),(2,2,70),(4,4,74),(8,4,70),(12,2,69),(14,2,67)],
    [(0,3,67),(3,1,65),(4,4,64),(8,2,60),(10,2,62),(12,4,64)],
    [(0,4,65),(4,2,69),(6,2,70),(8,4,72),(12,4,69)],
    [(0,4,70),(4,2,69),(6,2,67),(8,4,65),(12,4,62)],
    [(0,3,64),(3,1,65),(4,4,67),(8,2,70),(10,2,67),(12,4,64)],
    [(0,4,69),(4,2,67),(6,2,64),(8,4,61),(12,4,64)],
    [(0,2,65),(2,2,64),(4,4,62),(8,4,57),(12,4,62)],
    [(0,4,61),(4,2,62),(6,2,64),(8,3,69),(11,1,67),(12,3,64)],
]
THEMES = {'A':(A_CHANGES,A),'B':(B_CHANGES,B),'C':(C_CHANGES,C)}

def play(track,bar,pos,length,pitches,velocity,gate=.86,hum=2):
    S.play(track,bar,pos,length,pitches,int(max(1,min(125,velocity))),
           gate=gate,hum_ms=hum,vel_jitter=4 if hum else 0)

def foundation(bar,chord,level,style,variation):
    voices,root = CHORDS[chord]
    low = root+12
    while low<45: low+=12
    # Two interlocking string figures, rather than doubling the keyboard line.
    if style=='bridge':
        attacks = [(0,[low,voices[0]],5.2),(8,voices,5.2)]
    elif style=='sequence':
        attacks = [(0,[low],2.8),(3,voices[1:],2.2),(6,[voices[0]],1.6),
                   (8,[low+7],2.8),(11,voices[1:],2.2),(14,[voices[0]],1.6)]
    else:
        attacks = [(0,[low,voices[0]],3.5),(4,voices[1:],3.5),
                   (8,[low+7,voices[0]],3.5),(12,voices[1:],3.5)]
    for pos,notes,length in attacks:
        play(ST,bar,pos,length,notes,(91 if pos in (0,8) else 79)*level)
    if style=='lift':
        for pos in (2,6,10,14):
            note=voices[-1] if (pos+variation)%4 else voices[1]
            play(ST,bar,pos,1.3,note,70*level)
    roots = [root,root,root+7,root,root+12,root,root+7,root]
    if variation%3==1: roots = [root,root+7,root,root,root+12,root+7,root,root+7]
    if variation%3==2: roots = [root,root,root+12,root+7,root,root+7,root+12,root+7]
    for j,pitch in enumerate(roots):
        if style=='bridge' and j in (1,5): continue
        play(BS,bar,j*2,1.85,pitch,(108 if j in (0,4) else 96)*level,gate=.9)

def tune(bar,phrase,chord,level,variation,style):
    voices,_ = CHORDS[chord]
    for k,(pos,length,pitch) in enumerate(phrase):
        # Later returns alter rhythm and register locally, keeping the principal
        # motif intact. Octave displacement avoids any new out-of-key pitch.
        if variation%4==1 and k==len(phrase)-1 and pitch>=69:
            pitch-=12
        if variation%4==2 and k in (0,2) and pitch>=69:
            pitch-=12
        if variation%4==3 and pos==12 and length>=3:
            play(KY,bar,pos,1.7,pitch,94*level)
            play(KY,bar,pos+2,length-2,voices[-1],88*level)
            continue
        if style=='bridge' and k%2==1:
            continue
        play(KY,bar,pos,length,pitch,(100 if pos in (0,8) else 94)*level)
    # Low chord answers enter only where the melody has left a phrase-end gap.
    if phrase[-1][0]+phrase[-1][1] <= 15 and style in ('lift','sequence'):
        play(KY,bar,15,.7,voices[1:],66*level,gate=.7)

def rhythm(bar,level,style,variation,phrase_end=False):
    kicks = (0,6,8,14) if variation%3==0 else (0,4,8,10,14) if variation%3==1 else (0,3,8,10)
    if style=='bridge': kicks=(0,6,8,14)
    for pos in kicks: drum(S,DR,bar,pos,'kick',int((119 if pos in (0,8) else 107)*level),2)
    for pos in (4,12): drum(S,DR,bar,pos,'snare',int(109*level),2)
    for pos in (2,6,10,14): drum(S,DR,bar,pos,'chh',int(65*level),2)
    toms=(0,3,8,11) if variation%2==0 else (2,6,10,14)
    for pos in toms: drum(S,DR,bar,pos,'tom_floor',int((81 if pos in (0,8) else 69)*level),2)
    if style=='lift':
        for pos in (0,8): drum(S,DR,bar,pos,'ride',int(82*level),2)
        for pos in (7,15): drum(S,DR,bar,pos,'chh',int(52*level),2)
    if bar%8==0: drum(S,DR,bar,0,'crash',int(104*level),2)
    if phrase_end:
        fill(S,DR,bar,12,kind='toms' if variation%2 else 'snare',base_vel=int(95*level))
        for pos in (12,14): drum(S,DR,bar,pos,'kick',int(110*level),2)

def passage(start,bars,theme,level,style,variation,label):
    changes,melodies = THEMES[theme]
    S.section(start,start+bars,label)
    for i in range(bars):
        b=start+i
        chord=changes[i%8]
        # Each eight-bar lap has a different response, bass figure and fill.
        turn=variation+i//8
        foundation(b,chord,level,style,turn)
        tune(b,melodies[i%8],chord,level,turn,style)
        rhythm(b,level,style,turn,phrase_end=i%8==7)

passage(0,8,'A',1.0,'march',0,'Lantern signal — immediate hook')
# These chapter choices provide two complete large-scale rises and releases.
# The repeated themes are recast in texture, phrasing and register each time.
CHAPTERS = [
    ('A','march',.96,'Patrol begins'),
    ('A','sequence',1.00,'Footsteps answer'),
    ('B','lift',1.04,'First light'),
    ('A','march',1.01,'Lantern refrain'),
    ('C','sequence',.98,'Winding stair'),
    ('B','lift',1.05,'Open courtyard'),
    ('C','bridge',.91,'Low archway'),
    ('A','march',.98,'Reforming ranks'),
    ('B','lift',1.06,'Signal on the wall'),
    ('C','sequence',1.00,'Spiral pursuit'),
    ('A','bridge',.93,'Steady guard'),
    ('A','march',1.02,'Second rally'),
    ('C','bridge',.94,'Countermarch'),
    ('C','sequence',1.02,'Turning machinery'),
    ('B','lift',1.07,'Daybreak lift'),
    ('A','lift',1.06,'Lantern charge'),
    ('B','sequence',1.04,'Dancing banners'),
    ('A','lift',1.08,'Final charge'),
]
for index,(theme,style,level,label) in enumerate(CHAPTERS):
    passage(8+index*32,32,theme,level,style,index+1,label)

passage(584,8,'B',1.06,'lift',19,'Homeward banners')
S.section(592,600,'Eight-bar final cadence')
ending = ['Gm','C','F','Bb','Edim','A','A','D']
for i,chord in enumerate(ending):
    bar=592+i
    if i<7:
        foundation(bar,chord,1.04,'lift',i)
        phrase=(C if i<6 else A)[i%8]
        # Adapt the final dominant to its chord, then resolve to D major.
        if i in (5,6): phrase=[(0,4,69),(4,4,64),(8,4,61),(12,3,64)]
        tune(bar,phrase,chord,1.05,i,'lift')
        rhythm(bar,1.05,'lift',i,phrase_end=i==6)
    else:
        # This held chord sets the exact 600-bar endpoint (no rendered tail).
        play(ST,bar,0,16,[50,57,62,66],104,gate=1,hum=0)
        play(KY,bar,0,15.5,[62,66,69,74],105,gate=1,hum=0)
        play(BS,bar,0,16,38,112,gate=1,hum=0)
        drum(S,DR,bar,0,'kick',122,0)
        drum(S,DR,bar,0,'crash',114,0)
        drum(S,DR,bar,0,'tom_floor',104,0)

assert abs(S.length_16-9600)<1e-8, S.length_16
assert len(S.sections)==21
if __name__=='__main__':
    S.export(sys.argv[1] if len(sys.argv)>1 else str(Path(__file__).parent/'export'))
