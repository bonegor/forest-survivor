"""Spark Rush: fifteen-minute development of the approved electronic combat tune.

156 BPM, D Dorian, 585 bars = 900 seconds. The original eight-bar hook and
offbeat bass return between new answers, pedal passages, builds and bass breaks.
No instruments or melodies from Clockwork Charge are used.
"""
from pathlib import Path
import os, sys
SKILL=Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0,str(SKILL/'scripts'))
from songkit import Song, drum

S=Song('Spark Rush - fifteen minute version',bpm=156,seed=8243,target_lufs=-13.)
S.master.update(tail_sec=0,glue=False,limiter_oversample=4)
DR=S.add_track('Live drums','drums','drums')
CLUB=S.add_track('Club punch','local_club_punch','drums')
BS=S.add_track('Spring bass','local_spring_bass','bass',prange=(28,55))
CH=S.add_track('Pulse chords','local_pulse_chords','keys',prange=(48,76))
HK=S.add_track('Pluck hook','local_pluck_hook','lead',prange=(48,76))
S.mix={DR:0,CLUB:0,BS:0,CH:0,HK:0}

CHORDS={'Dm':(38,[53,57,62,65]),'G':(31,[55,59,62,67]),
        'C':(36,[55,60,64,67]),'F':(29,[53,57,60,65]),
        'Am':(33,[52,57,60,64]),'Em':(28,[52,55,59,64])}
RUN=['Dm','Dm','G','G','Dm','C','G','Dm']
HOOK=['F','C','G','Dm','F','C','G','Dm']
LIFT=['C','G','Dm','Dm','C','G','G','G']
ANSWER_CHANGES=['Dm','Am','G','C','F','G','Em','Dm']
PEDAL=['Dm','Dm','Dm','Dm','G','G','C','G']

# Preserved principal hook from the approved Spark Rush.
A=[[(0,2,62),(3,1,62),(6,2,65),(10,2,64),(14,1,62)],
   [(2,2,60),(6,2,62),(10,2,64)],
   [(0,2,67),(3,1,67),(6,2,65),(10,2,62),(14,1,59)],
   [(0,3,62),(6,2,57),(10,2,60),(14,1,62)],
   [(0,2,65),(3,1,65),(6,2,69),(10,2,67),(14,1,65)],
   [(2,2,64),(6,2,67),(10,2,64)],
   [(0,2,67),(3,1,65),(6,2,62),(10,2,59)],
   [(0,3,62),(6,2,60),(10,4,62)]]
# The new answer gives long tones to the end of the bar, rather than filling
# every gap. B-natural over G/Em supplies the characteristic Dorian colour.
B=[[(0,3,69),(6,2,65),(10,2,64),(14,1,62)],
   [(2,2,64),(6,2,60),(10,4,57)],
   [(0,2,59),(3,1,62),(6,2,67),(10,4,69)],
   [(2,2,67),(6,2,64),(10,4,60)],
   [(0,3,65),(6,2,69),(10,2,67),(14,1,65)],
   [(0,2,67),(6,2,62),(10,4,59)],
   [(2,2,64),(6,2,67),(10,2,71),(14,1,67)],
   [(0,3,69),(6,2,65),(10,4,62)]]
C=[[(0,2,62),(6,2,57),(12,2,62)],
   [(2,2,65),(8,2,62),(14,1,60)],
   [(0,3,62),(6,2,65),(12,2,69)],
   [(2,2,67),(8,3,65),(14,1,62)],
   [(0,2,67),(6,2,59),(12,2,62)],
   [(2,2,59),(8,3,62),(14,1,67)],
   [(0,3,64),(6,2,67),(12,2,60)],
   [(2,2,67),(8,2,62),(14,1,59)]]

def play(track,bar,pos,length,notes,vel=100,gate=.8,hum=1.3):
    S.play(track,bar,pos,length,notes,int(vel),hum_ms=hum,gate=gate,vel_jitter=3)

def rhythm(bar,mode,level,turn,end=False):
    for p in (0,4,8,12):
        drum(S,DR,bar,p,'kick',int((122 if p in (0,8) else 115)*level),1)
        play(CLUB,bar,p,1,36,(120 if p in (0,8) else 112)*level)
    for p in (4,12):
        drum(S,DR,bar,p,'snare',int((113 if mode=='hook' else 107)*level),1.5)
        play(CLUB,bar,p,1,39,(113 if mode=='hook' else 104)*level)
    for p in range(0,16,2):
        open_hat=p in (2,10) and mode in ('hook','lift','answer')
        drum(S,DR,bar,p,'ohh' if open_hat else 'chh',int((84 if p%4 else 72)*level),1.4)
    if mode in ('hook','lift') or turn%3==2:
        for p in (3,7,11,15):drum(S,DR,bar,p,'chh',int((48 if p!=15 else 62)*level),1.4)
    if turn%8==0:drum(S,DR,bar,0,'crash',int((106 if mode=='hook' else 94)*level),0)
    if end or turn%8==7:
        for j,p in enumerate((13,14,15)):
            drum(S,DR,bar,p,'snare' if j==0 else ('tom_hi' if j==1 else 'tom_mid'),int((91+8*j)*level),1.2)
        if mode=='lift':
            for p in (8,9,10,11):drum(S,DR,bar,p,'snare',int((74+(p-8)*8)*level),1)

def bass_chords(bar,chord,mode,level,variation):
    root,notes=CHORDS[chord]
    pattern=[(0,1.8,0),(2.5,1.2,0),(4,1.6,0),(6,1.6,12),
             (8,1.8,0),(10.5,1.2,0),(12,1.6,0),(14,1.6,7)]
    if mode in ('bridge','pedal'):
        pattern=[(0,2,0),(3,1,0),(6,2,7),(8,2,0),(11,1,12),(14,1.6,7)]
    elif mode=='answer' and variation%2:
        pattern=[(0,1.8,0),(3,1.3,7),(4,1.7,0),(6.5,1.2,12),
                 (8,1.8,0),(10,1.3,7),(12,1.7,0),(14.5,1,12)]
    for p,length,interval in pattern:play(BS,bar,p,length,root+interval,(113 if p%4==0 else 103)*level)
    stabs=[(2,1.3),(6,1.3),(10,1.3),(14,1.3)] if mode=='hook' else [(2,1.2),(7,1.1),(10,1.3),(14,1.1)]
    if mode=='lift':stabs=[(0,1.7),(3,1.4),(6,1.5),(10,1.5),(14,1.4)]
    if mode=='bridge':stabs=[(6,1.1),(14,1.1)]
    if mode=='pedal':stabs=[(3,1.2),(11,1.2)] if variation%2 else [(2,1),(6,1),(10,1),(14,1)]
    if mode=='answer':stabs=[(1,1.2),(6,1.5),(9,1.2),(14,1.5)]
    voicing=notes[1:]+[notes[0]+12] if variation%4==3 else notes
    for p,length in stabs:play(CH,bar,p,length,voicing,(96 if mode=='hook' else 84)*level)

def tune(bar,phrase,mode,level,variation):
    if mode in ('bridge','run'):
        if variation%4!=3:return
        phrase=[(10,1.3,57),(12,1.3,60),(14,1.3,62)]
    for k,(p,length,note) in enumerate(phrase):
        if mode=='pedal' and k%2:continue
        # Answers change register on alternate returns, without losing the
        # approved main hook's contour or adding a piercing high solo.
        if variation%4==2 and k==0 and note>=67:note-=12
        pitches=[note,note-12] if mode=='hook' and variation>=12 and p==0 and note-12>=48 else note
        play(HK,bar,p,length,pitches,(98 if p==0 else 89)*level,gate=.77)

def passage(start,bars,mode,theme,level,variation,label):
    S.section(start,start+bars,label)
    changes=HOOK if mode=='hook' else LIFT if mode=='lift' else ANSWER_CHANGES if mode=='answer' else PEDAL if mode=='pedal' else RUN
    melodies={'A':A,'B':B,'C':C}[theme]
    for j in range(bars):
        bar=start+j
        turn=variation+j//8
        local_mode=mode
        # Sixteen-bar rises evolve from sparse stabs into the full refrain.
        if mode=='lift' and j>=16:local_mode='hook'
        rhythm(bar,local_mode,level,j,end=j==bars-1)
        bass_chords(bar,changes[j%8],local_mode,level,turn)
        tune(bar,melodies[j%8],local_mode,level,turn)

passage(0,4,'hook','A',1.,0,'Immediate Spark signal')
CHAPTERS=[
 ('run','A',.97,'Spring engine'),('lift','A',1.0,'Voltage rises'),
 ('hook','A',1.04,'Spark Rush refrain'),('bridge','C',.93,'Percussion tunnel'),
 ('answer','B',1.0,'Bass and pluck answer'),('hook','A',1.05,'Open circuit'),
 ('pedal','C',.96,'Low pulse'),('answer','B',1.02,'Crossing currents'),
 ('hook','A',1.06,'Second rush'),('bridge','C',.94,'Moving shadows'),
 ('run','B',1.,'Spring engine return'),('lift','A',1.03,'Rising switchback'),
 ('answer','B',1.04,'Dorian sunlight'),('pedal','C',.97,'Interlocking sparks'),
 ('hook','A',1.07,'Full current'),('answer','B',1.04,'Answer over the bass'),
 ('lift','A',1.06,'Final rise'),('hook','A',1.08,'Last Spark Rush')]
for i,(mode,theme,level,label) in enumerate(CHAPTERS):
    passage(4+i*32,32,mode,theme,level,i+1,label)

S.section(580,585,'Five-bar final landing')
for j,chord in enumerate(['F','C','G','Dm','Dm']):
    bar=580+j
    if j<4:
        rhythm(bar,'hook',1.05,j,end=j==3)
        bass_chords(bar,chord,'hook',1.05,j)
        tune(bar,A[[4,5,6,7][j]],'hook',1.04,j)
    else:
        root,notes=CHORDS['Dm']
        S.play(BS,bar,0,16,root,110,gate=1,hum_ms=0,vel_jitter=0)
        S.play(CH,bar,0,16,notes,92,gate=1,hum_ms=0,vel_jitter=0)
        S.play(HK,bar,0,15,[62,74],94,gate=.9,hum_ms=0,vel_jitter=0)
        drum(S,DR,bar,0,'kick',122,0)
        drum(S,DR,bar,0,'crash',108,0)
        play(CLUB,bar,0,1,36,120,hum=0)

assert S.length_16==9360,S.length_16
assert abs(S.length_16*S.s16-900)<1e-8
if __name__=='__main__':
    S.export(sys.argv[1] if len(sys.argv)>1 else str(Path(__file__).parent/'export'))
