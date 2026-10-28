"""Spark Rush v3 mix: tame isolated transients and bring the tune forward."""
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

GAINS_DB={'Live drums':0.,'Club punch':0.,'Spring bass':2.,'Pulse chords':2.,'Pluck hook':3.}

def drum_transients(audio,sr,threshold=-6.,ratio=4.,knee=6.,release_ms=15.):
    """Stereo-linked soft-knee compressor, short lookahead and 15 ms release.

    It acts only on strong peaks above the knee, without normalizing the body back up.
    """
    x=np.asarray(audio,dtype=np.float64)
    peak=np.max(np.abs(x),axis=0)
    level=20*np.log10(np.maximum(peak,1e-12))
    over=level-threshold
    smooth=np.where(over < -knee/2,0.,np.where(over>knee/2,over,(over+knee/2)**2/(2*knee)))
    reduction=(1-1/ratio)*smooth
    needed=10**(-reduction/20)
    gain=minimum_filter1d(needed,size=2*max(1,int(sr*.0007))+1)
    release=np.exp(-1/(sr*release_ms/1000))
    gain=np.minimum(signal.lfilter([1-release],[1,-release],gain,zi=[gain[0]*release])[0],gain)
    return (x*gain).astype(np.float32)

def revise_stem(name,audio,sr):
    if name=='Live drums':audio=drum_transients(audio,sr,threshold=-6.,ratio=4.,knee=6.)
    if name=='Club punch':audio=drum_transients(audio,sr,threshold=-9.,ratio=2.5,knee=6.)
    audio=audio*10**(GAINS_DB[name]/20)
    if name in ('Pulse chords','Pluck hook'):
        # These brief, coherent saw attacks account for under 0.2 s above -6 dB
        # across the entire two-minute song. Shape those peaks before the master.
        audio=drum_transients(audio,sr,threshold=-9.,ratio=2.5,knee=6.,release_ms=8.)
    return audio
