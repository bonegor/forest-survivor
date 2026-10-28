"""Spark Rush — original, beat-led electronic combat song.

156 BPM, D Dorian, 80 bars, about 2:04 with the final decay.
The custom synth sound names are local to render_song.py; global sounds stay untouched.
"""
from pathlib import Path
import os,sys
SKILL = Path(os.environ.get('MUSIC_STUDIO_SKILL',Path.home()/'.agents/skills/music-studio'))
sys.path.insert(0, str(SKILL/'scripts'))
from songkit import Song, drum

S = Song('Spark Rush', bpm=156, seed=8243, target_lufs=-13.)
S.master['tail_sec'] = 1.5
DR = S.add_track('Live drums', 'drums', 'drums')
CLUB = S.add_track('Club punch', 'local_club_punch', 'drums')
BS = S.add_track('Spring bass', 'local_spring_bass', 'bass', prange=(28,55))
CH = S.add_track('Pulse chords', 'local_pulse_chords', 'keys', prange=(48,76))
HK = S.add_track('Pluck hook', 'local_pluck_hook', 'lead', prange=(48,76))
S.mix = {DR:0, CLUB:0, BS:0, CH:0, HK:0}

FORM = [(0,4,'Immediate groove'), (4,20,'Run'), (20,28,'Lift'), (28,44,'Hook'),
        (44,52,'Run variation'), (52,60,'Rhythm bridge'), (60,76,'Final hook'), (76,80,'Finish')]
for start,end,label in FORM:
    S.section(start,end,label)

# Root and compact voicing. The B-natural in G gives the minor tonic a brighter Dorian lift.
CHORDS = {
    'Dm': (38,[53,57,62,65]), 'G': (31,[55,59,62,67]),
    'C': (36,[55,60,64,67]), 'F': (29,[53,57,60,65]),
}
RUN = ['Dm','Dm','G','G','Dm','C','G','Dm']
HOOK = ['F','C','G','Dm','F','C','G','Dm']
LIFT = ['C','G','Dm','Dm','C','G','G','G']
HOOK_NOTES = [
    [(0,2,62),(3,1,62),(6,2,65),(10,2,64),(14,1,62)],
    [(2,2,60),(6,2,62),(10,2,64)],
    [(0,2,67),(3,1,67),(6,2,65),(10,2,62),(14,1,59)],
    [(0,3,62),(6,2,57),(10,2,60),(14,1,62)],
    [(0,2,65),(3,1,65),(6,2,69),(10,2,67),(14,1,65)],
    [(2,2,64),(6,2,67),(10,2,64)],
    [(0,2,67),(3,1,65),(6,2,62),(10,2,59)],
    [(0,3,62),(6,2,60),(10,4,62)],
]

def play(track,bar,pos,length,notes,vel=100,gate=.80):
    S.play(track,bar,pos,length,notes,vel,hum_ms=1.3,gate=gate,vel_jitter=3)

for bar in range(80):
    label = next(label for a,b,label in FORM if a<=bar<b)
    chorus = label in ('Hook','Final hook')
    bridge = label == 'Rhythm bridge'
    lift = label == 'Lift'
    ending = label == 'Finish'
    if chorus: name = HOOK[(bar-(28 if label=='Hook' else 60))%8]
    elif lift: name = LIFT[(bar-20)%8]
    elif bridge: name = ['Dm','Dm','G','G','C','C','G','G'][(bar-52)%8]
    elif ending: name = ['F','C','G','Dm'][bar-76]
    else: name = RUN[bar%8]
    root,notes = CHORDS[name]

    # Four-on-the-floor pulse stays intact through the bridge and every fill.
    kicks = (0,4,8,12) if bar<79 else (0,4,8)
    for p in kicks:
        drum(S,DR,bar,p,'kick',122 if p in (0,8) else 115,hum_ms=1)
        play(CLUB,bar,p,1,36,120 if p in (0,8) else 112)
    for p in (4,12):
        if bar==79 and p==12: continue
        drum(S,DR,bar,p,'snare',113 if chorus else 107,hum_ms=1.5)
        play(CLUB,bar,p,1,39,113 if chorus else 104)
    for p in range(0,16,2):
        if bar==79 and p>8: continue
        open_hat = p in (2,10) and (chorus or lift)
        drum(S,DR,bar,p,'ohh' if open_hat else 'chh',84 if p%4 else 72,hum_ms=1.4)
    if chorus or lift:
        for p in (3,7,11,15):
            drum(S,DR,bar,p,'chh',48 if p!=15 else 62,hum_ms=1.4)
    if bar in (0,4,20,28,36,44,52,60,68,76):
        drum(S,DR,bar,0,'crash',108 if chorus else 96,hum_ms=0)
    if bar%4==3 and bar<79:
        # Add short fills without removing the kick and backbeat.
        for j,p in enumerate((13,14,15)):
            drum(S,DR,bar,p,'snare' if j==0 else ('tom_hi' if j==1 else 'tom_mid'),91+8*j,hum_ms=1.2)
    if bar in (27,59):
        for p in (8,9,10,11,12,13,14,15):
            drum(S,DR,bar,p,'snare',72+(p-8)*6,hum_ms=1)

    # The bass answers the kick with short, weighty offbeats and small octave lifts.
    bass_pattern = [(0,1.8,0),(2.5,1.2,0),(4,1.6,0),(6,1.6,12),
                    (8,1.8,0),(10.5,1.2,0),(12,1.6,0),(14,1.6,7)]
    if bridge: bass_pattern=[(0,2,0),(3,1,0),(6,2,7),(8,2,0),(11,1,12),(14,1.6,7)]
    if bar==79: bass_pattern=[(0,2,0),(4,2,0),(8,6,0)]
    for p,length,interval in bass_pattern:
        play(BS,bar,p,length,root+interval,113 if p%4==0 else 103)

    # Chord stabs are rhythmic accompaniment, not a sustained solo line.
    stabs = [(2,1.3),(6,1.3),(10,1.3),(14,1.3)] if chorus else [(2,1.2),(7,1.1),(10,1.3),(14,1.1)]
    if bar<2: stabs=[(2,1.2),(10,1.2)]
    if lift: stabs=[(0,1.7),(3,1.4),(6,1.5),(10,1.5),(14,1.4)]
    if bridge: stabs=[(6,1),(14,1)] if bar<56 else [(2,1),(6,1),(10,1),(14,1)]
    if bar==79: stabs=[(0,2),(4,2),(8,6)]
    for p,length in stabs:
        play(CH,bar,p,length,notes,96 if chorus else 82,gate=.8)

    if chorus:
        phrase=HOOK_NOTES[(bar-(28 if label=='Hook' else 60))%8]
        for p,length,note in phrase:
            # The octave double is occasional; most of the hook stays in a warm middle register.
            pitches=[note,note-12] if label=='Final hook' and p==0 else note
            play(HK,bar,p,length,pitches,98 if p==0 else 89,gate=.77)
    elif lift and bar>=24:
        for p,note in ((0,62),(6,65),(10,67)):
            play(HK,bar,p,1.5,note,75+(bar-24)*4)
    elif label in ('Run','Run variation') and bar%4==3:
        for p,note in ((10,57),(12,60),(14,62)):
            play(HK,bar,p,1.3,note,76)

if __name__=='__main__':
    S.export(sys.argv[1] if len(sys.argv)>1 else str(Path(__file__).resolve().parent/'draft-export'))
