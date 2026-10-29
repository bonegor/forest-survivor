"""Lantern Guard v2: harp-led combat music with new themes and a new rhythmic identity.

160 BPM, 600 bars, exactly 15 minutes. D minor opens into F major; the final
cadence resolves to D major. No keyboard and no imported melodies.
"""
import os, sys
from pathlib import Path
SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL', Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL/'scripts'))
from songkit import Song, BASS_RANGE, drum, fill

S = Song('Lantern Guard - fifteen minute journey',160,seed=934629,target_lufs=-13)
ST = S.add_track('Lantern String Answers','battle_strings','pad',prange=(45,76))
HP = S.add_track('Concert Harp Hook','lantern_harp','lead',prange=(48,81))
BS = S.add_track('Deep Bass','bass','bass',prange=BASS_RANGE)
DR = S.add_track('March Drums','drums','drums')
S.mix = {ST:1.,HP:0.,BS:1.,DR:0.}
S.master['tail_sec'] = 0
CHORDS = {
    'Dm':([57,62,65],38), 'C':([55,60,64],36), 'Gm':([55,58,62],31),
    'Bb':([53,58,62],34), 'A':([57,61,64],33), 'F':([57,60,65],29),
    'Am':([57,60,64],33), 'D':([57,62,66],38),
}
A_CHANGES = ['Dm','Dm','C','C','Gm','Dm','Bb','A']
B_CHANGES = ['F','Am','Bb','C','F','Dm','Gm','A']
C_CHANGES = ['Gm','Gm','Bb','C','Dm','Bb','A','A']
# The new opening signal is a short D--A leap, then a syncopated F--E--D answer.
# Rests and uneven groups distinguish it from the old descending keyboard line.
A = [
 [(0,1.6,62),(3,1.4,69),(6,2.2,65),(10,1.5,64),(12,3,62)],
 [(0,4,74),(6,2,69),(9,2,65),(12,3.5,62)],
 [(0,1.6,64),(3,1.4,67),(6,2.2,72),(10,1.5,70),(12,3,67)],
 [(0,4,64),(6,2,60),(10,1.5,62),(12,3,64)],
 [(0,1.6,62),(3,1.4,67),(6,2.2,70),(10,1.5,69),(12,3,67)],
 [(0,2,65),(3,2,69),(6,3,74),(11,1.5,69),(14,1.5,65)],
 [(0,1.6,62),(3,1.4,65),(6,2.2,70),(10,1.5,69),(12,3,65)],
 [(0,3,64),(5,2,69),(8,2,73),(11,1.5,71),(14,1.5,69)],
]
# The bright theme has longer arches, with a rising answer and a full phrase rest.
B = [
 [(0,5,69),(7,2,72),(10,4,77)],
 [(0,3,76),(5,2,72),(8,5,69)],
 [(0,5,70),(7,2,65),(10,4,74)],
 [(0,3,72),(5,2,67),(8,5,64)],
 [(0,2,65),(3,2,69),(6,3,72),(11,3,69)],
 [(0,4,74),(6,2,72),(10,4,69)],
 [(0,3,70),(5,2,67),(8,5,62)],
 [(0,4,73),(6,2,69),(10,4,64)],
]
# A lower, skipping pursuit theme exchanges brief cells with the string ensemble.
C = [
 [(0,2,55),(3,2,62),(8,2,58),(11,2,67)],
 [(0,3,70),(5,2,67),(10,3,62)],
 [(0,2,58),(3,2,65),(8,2,62),(11,2,70)],
 [(0,3,67),(5,2,64),(10,3,60)],
 [(0,2,57),(3,2,65),(8,2,62),(11,2,69)],
 [(0,3,70),(5,2,65),(10,3,62)],
 [(0,2,57),(3,2,64),(8,2,61),(11,2,69)],
 [(0,3,73),(5,2,71),(10,3,69)],
]
THEMES = {'A':(A_CHANGES,A),'B':(B_CHANGES,B),'C':(C_CHANGES,C)}

def play(track,bar,pos,length,pitches,velocity=96,gate=.9,hum=2):
    S.play(track,bar,pos,length,pitches,int(max(1,min(122,velocity))),gate=gate,
           hum_ms=hum,vel_jitter=3 if hum else 0)

def backing(bar,chord,style,level,turn):
    voices,root = CHORDS[chord]
    low = root+12
    while low<45: low+=12
    if style in ('sail','bridge'):
        # Long bowing leaves the plucked lead its own rhythmic space.
        play(ST,bar,0,13.5,voices,68*level,gate=.98)
        if turn%2: play(ST,bar,14,1.5,[voices[0],voices[-1]],76*level)
    elif style=='dialogue':
        for pos,notes,length in [(4,voices[1:],2.6),(7,[voices[0]],1.5),(12,voices,2.8)]:
            play(ST,bar,pos,length,notes,77*level)
    elif style=='crossstep':
        for pos,note in [(0,low),(3,voices[1]),(6,voices[-1]),(8,low+7),(11,voices[1]),(14,voices[0])]:
            play(ST,bar,pos,1.5,note,79*level,gate=.76)
    else:
        for pos,notes in [(0,voices),(6,voices[1:]),(8,[low,voices[0]]),(14,voices[1:])]:
            play(ST,bar,pos,3.1 if pos in (0,8) else 1.5,notes,83*level)
    positions = [0,3,6,8,10,14]
    pitches = [root,root+7,root,root+12,root+7,root]
    if style=='bridge': positions,pitches=[0,4,8,12],[root,root+7,root+12,root+7]
    if turn%2 and style!='bridge': pitches=[root,root,root+7,root+12,root,root+7]
    for pos,pitch in zip(positions,pitches):
        play(BS,bar,pos,2.3 if style=='bridge' else 1.7,pitch,(108 if pos in (0,8) else 97)*level)

def harp(bar,phrase,chord,style,level,turn):
    for k,(pos,length,pitch) in enumerate(phrase):
        if style=='bridge' and k%2: continue
        if turn%4==2 and k==len(phrase)-1 and pitch>=67: pitch-=12
        if turn%4==3 and k==0 and pitch<65: pitch+=12
        play(HP,bar,pos,length,pitch,(110 if k==0 else 99)*level,gate=.96)
    # A low, soft broken-chord response fills only deliberately vacant endings.
    if phrase[-1][0]+phrase[-1][1]<14 and style in ('sail','lift'):
        voices,_=CHORDS[chord]
        for pos,pitch in zip((14,15),voices[:2]): play(HP,bar,pos,.7,pitch,65*level)

def rhythm(bar,style,level,turn,end=False):
    kicks=(0,6,8,11,14) if turn%2==0 else (0,3,8,10)
    if style=='lift': kicks=(0,4,8,12,14)
    if style=='bridge': kicks=(0,6,8,14)
    for p in kicks: drum(S,DR,bar,p,'kick',int((119 if p in (0,8) else 107)*level),2)
    for p in (4,12): drum(S,DR,bar,p,'snare',int(110*level),2)
    cym='ride' if style in ('lift','dialogue') else 'chh'
    for p in range(0,16,2): drum(S,DR,bar,p,cym,int((78 if p%4==0 else 61)*level),2)
    # Toms answer the phrase, instead of repeating the old constant floor-tom ostinato.
    if bar%4==2:
        for p in (10,14): drum(S,DR,bar,p,'tom_floor',int(75*level),2)
    if turn%2 and style not in ('bridge',): drum(S,DR,bar,7,'snare',int(39*level),2)
    if bar%8==0: drum(S,DR,bar,0,'crash',int(101*level),2)
    if end:
        fill(S,DR,bar,12,'toms' if turn%2 else 'snare',base_vel=int(94*level))
        for p in (12,14): drum(S,DR,bar,p,'kick',int(110*level),2)

def passage(start,bars,theme,style,level,variation,label):
    changes,phrases=THEMES[theme]
    S.section(start,start+bars,label)
    for i in range(bars):
        bar=start+i; turn=variation+i//8; chord=changes[i%8]
        backing(bar,chord,style,level,turn)
        harp(bar,phrases[i%8],chord,style,level,turn)
        rhythm(bar,style,level,turn,end=i%8==7)

passage(0,8,'A','dialogue',1.,0,'New lantern signal - harp hook')
CHAPTERS = [
 (24,'A','sail',.98,'Across the water'),(32,'B','lift',1.02,'Golden bridge'),
 (24,'C','crossstep',.98,'Market pursuit'),(40,'A','dialogue',1.02,'Call between towers'),
 (16,'B','bridge',.92,'Beneath the arch'),
 (32,'C','crossstep',1.00,'Quickening steps'),(16,'A','sail',.96,'Open river'),
 (40,'B','lift',1.05,'Banners above'),(24,'C','dialogue',.99,'Answering watch'),
 (24,'A','lift',1.04,'First rally'),
 (40,'C','bridge',.93,'Steady undercurrent'),(24,'B','dialogue',1.00,'Lantern reply'),
 (32,'A','crossstep',1.02,'Turning tide'),(16,'C','sail',.95,'Clear passage'),
 (24,'B','lift',1.06,'Sunlit parapet'),
 (24,'A','dialogue',1.03,'Returning signal'),(40,'C','crossstep',1.02,'Last pursuit'),
 (16,'B','bridge',.95,'Gathering breath'),(32,'A','lift',1.07,'Rally on the bridge'),
 (24,'B','lift',1.08,'Bright answer'),
]
cursor=8
for index,(bars,theme,style,level,label) in enumerate(CHAPTERS):
    passage(cursor,bars,theme,style,level,index+1,label); cursor+=bars
assert cursor==552,cursor
passage(cursor,32,'A','dialogue',1.07,23,'The complete lantern refrain')
passage(584,8,'B','lift',1.06,24,'Final answering arch')
S.section(592,600,'Dawn cadence')
CODA = [
 [(0,3,67),(5,2,74),(8,2,70),(12,3,67)],
 [(0,3,64),(5,2,67),(8,2,72),(12,3,67)],
 [(0,3,69),(5,2,72),(8,2,77),(12,3,72)],
 [(0,3,74),(5,2,77),(8,2,70),(12,3,74)],
 [(0,3,70),(5,2,67),(8,2,62),(12,3,67)],
 [(0,3,64),(5,2,69),(8,2,73),(12,3,69)],
 [(0,3,73),(5,2,71),(8,2,69),(12,3,64)],
]
for i,chord in enumerate(['Gm','C','F','Bb','Gm','A','A','D']):
    bar=592+i
    if i<7:
        backing(bar,chord,'lift',1.04,i)
        harp(bar,CODA[i],chord,'lift',1.05,i)
        rhythm(bar,'lift',1.04,i,end=i==6)
    else:
        play(ST,bar,0,16,[50,57,62,66],92,gate=1,hum=0)
        play(HP,bar,0,15.8,[62,66,69,74],107,gate=1,hum=0)
        play(BS,bar,0,16,38,112,gate=1,hum=0)
        drum(S,DR,bar,0,'kick',122,0); drum(S,DR,bar,0,'crash',110,0)

assert abs(S.length_16-9600)<1e-8,S.length_16
assert S.sections[-1][1]==600
if __name__=='__main__':
    S.export(sys.argv[1] if len(sys.argv)>1 else str(Path(__file__).parent/'export'))
