// Chiptune score. Each token is a 16th note: a pitch ("A4", "C#5"), any
// other word to trigger a drum, '-' to sustain the previous note, '.' rest.

const bar = (s) => s;

export const SONGS = {
  // "The Long Night" — D minor, slow and moonlit.
  title: {
    bpm: 76,
    loop: true,
    patterns: {
      r1: 'D3 - - - - - - - - - - - - - - - A#2 - - - - - - - - - - - - - - - C3 - - - - - - - - - - - - - - - A2 - - - - - - - - - - - - - - -',
      t1: 'F3 - - - - - - - - - - - - - - - D3 - - - - - - - - - - - - - - - E3 - - - - - - - - - - - - - - - C#3 - - - - - - - - - - - - - - -',
      f1: 'A3 - - - - - - - - - - - - - - - F3 - - - - - - - - - - - - - - - G3 - - - - - - - - - - - - - - - E3 - - - - - - - - - - - - - - -',
      arp:
        'D4 . F4 . A4 . D5 . A4 . F4 . D4 . F4 . A#3 . D4 . F4 . A#4 . F4 . D4 . A#3 . D4 . ' +
        'C4 . E4 . G4 . C5 . G4 . E4 . C4 . E4 . A3 . C#4 . E4 . A4 . E4 . C#4 . A3 . C#4 .',
      m1:
        'A4 - - - F4 - E4 - D4 - - - - - - - D4 - F4 - A#4 - A4 - F4 - - - - - - - ' +
        'G4 - - - E4 - F4 - G4 - A4 - G4 - - - E4 - - - C#4 - - - A3 - - - - - - - ',
      m2:
        'D5 - - - C5 - A#4 - A4 - - - F4 - - - F4 - - - G4 - A4 - A#4 - - - D5 - - - ' +
        'C5 - - - A#4 - A4 - G4 - - - E4 - - - E4 - - - F4 - G4 - A4 - - - - - - - ',
      rest: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .',
    },
    tracks: [
      { inst: 'pad', seq: ['r1', 'r1', 'r1', 'r1'], vol: 1 },
      { inst: 'pad', seq: ['t1', 't1', 't1', 't1'], vol: 0.9 },
      { inst: 'pad', seq: ['f1', 'f1', 'f1', 'f1'], vol: 0.8 },
      { inst: 'bell', seq: ['arp', 'arp', 'arp', 'arp'], vol: 0.45 },
      { inst: 'lead', seq: ['rest', 'm1', 'm2', 'm1'], vol: 0.7 },
    ],
  },

  // "Darkwood Rumble" — A minor, driving.
  forest: {
    bpm: 140,
    loop: true,
    patterns: {
      bass:
        bar('A2 . A3 . A2 . A3 . A2 . A3 . A2 . G2 . ') +
        bar('A2 . A3 . A2 . A3 . A2 . A3 . C3 . B2 . ') +
        bar('F2 . F3 . F2 . F3 . F2 . F3 . F2 . E2 . ') +
        bar('G2 . G3 . G2 . G3 . G2 . G3 . G2 . B2 . ') +
        bar('A2 . A3 . A2 . A3 . A2 . A3 . A2 . G2 . ') +
        bar('A2 . A3 . A2 . A3 . A2 . A3 . C3 . B2 . ') +
        bar('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F2 . ') +
        bar('E2 . E3 . E2 . E3 . E2 . E3 . G#2 . B2 .'),
      lead:
        bar('E5 - - . A4 . C5 . E5 . D5 C5 B4 . C5 . ') +
        bar('A4 - - - - . E4 . A4 . B4 . C5 . D5 . ') +
        bar('C5 - - . A4 . F4 . A4 . C5 . F5 . E5 . ') +
        bar('D5 - - - - . G4 . B4 . D5 . G5 . F5 . ') +
        bar('E5 - - . A5 . G5 . E5 . D5 C5 D5 . E5 . ') +
        bar('A4 - - - - . C5 . B4 . A4 . G4 . A4 . ') +
        bar('F4 . A4 . C5 . F5 . E5 . D5 . C5 . A4 . ') +
        bar('B4 - - - G#4 - - - E4 - - - - . . .'),
      lead2:
        bar('A5 - - . G5 . E5 . G5 - - . E5 . D5 . ') +
        bar('C5 - - . D5 . E5 . A4 - - - - . . . ') +
        bar('F5 - - . E5 . C5 . A4 . C5 . F5 . A5 . ') +
        bar('G5 - - . F5 . D5 . B4 . D5 . G5 . B5 . ') +
        bar('A5 - - . E5 . C5 . A4 . C5 . E5 . A5 . ') +
        bar('G5 - - . E5 . D5 . C5 . B4 . A4 . G4 . ') +
        bar('F4 - - . A4 . C5 . F5 - - . E5 . D5 . ') +
        bar('E5 - - - D5 - - - B4 - - - G#4 - - -'),
      arp:
        bar('A4 C5 E5 A5 E5 C5 A4 C5 A4 C5 E5 A5 E5 C5 A4 E4 ').repeat(2) +
        bar('F4 A4 C5 F5 C5 A4 F4 A4 F4 A4 C5 F5 C5 A4 F4 C4 ') +
        bar('G4 B4 D5 G5 D5 B4 G4 B4 G4 B4 D5 G5 D5 B4 G4 D4 ') +
        bar('A4 C5 E5 A5 E5 C5 A4 C5 A4 C5 E5 A5 E5 C5 A4 E4 ').repeat(2) +
        bar('F4 A4 C5 F5 C5 A4 F4 A4 F4 A4 C5 F5 C5 A4 F4 C4 ') +
        bar('E4 G#4 B4 E5 B4 G#4 E4 G#4 E4 G#4 B4 E5 B4 G#4 E4 B3'),
      kick: 'x . . . . . . . x . x . . . . . '.repeat(7) + 'x . . . . . . . x . x . x . x .',
      snare: '. . . . x . . . . . . . x . . . '.repeat(7) + '. . . . x . . . . . x x x x x x',
      hat: 'x . x . x . x . x . x . x . x . '.repeat(8),
      quiet: '. '.repeat(128),
    },
    tracks: [
      { inst: 'bass', seq: ['bass', 'bass', 'bass', 'bass'] },
      { inst: 'lead', seq: ['quiet', 'lead', 'lead2', 'lead'], vol: 0.85 },
      { inst: 'pluck', seq: ['arp', 'arp', 'arp', 'arp'], vol: 0.35 },
      { inst: 'kick', seq: ['kick', 'kick', 'kick', 'kick'] },
      { inst: 'snare', seq: ['snare', 'snare', 'snare', 'snare'] },
      { inst: 'hat', seq: ['hat', 'hat', 'hat', 'hat'] },
    ],
  },

  // "Into the Depths" — E phrygian, heavy and slow.
  dungeon: {
    bpm: 112,
    loop: true,
    patterns: {
      bass:
        bar('E2 . . E2 . . E2 . E3 . . E2 . . D2 . ') +
        bar('F2 . . F2 . . F2 . F3 . . F2 . . E2 . ') +
        bar('E2 . . E2 . . E2 . E3 . . E2 . . G2 . ') +
        bar('D2 . . D2 . . D2 . C2 . . C2 . . B1 . '),
      organ:
        bar('E4 - - - - - - - G4 - - - F4 - - - ') +
        bar('E4 - - - - - - - - - - - . . . . ') +
        bar('B4 - - - - - - - C5 - - - B4 - - - ') +
        bar('A4 - - - G4 - - - F4 - - - D#4 - - - '),
      organ2:
        bar('B4 - - - - - - - C5 - - - D5 - - - ') +
        bar('C5 - - - - - - - B4 - - - A4 - - - ') +
        bar('G4 - - - - - - - A4 - - - B4 - - - ') +
        bar('C5 - - - B4 - - - A4 - - - F#4 - - - '),
      arp:
        bar('E4 . G4 . B4 . G4 . E4 . G4 . B4 . C5 . ') +
        bar('F4 . A4 . C5 . A4 . F4 . A4 . C5 . A4 . ') +
        bar('E4 . G4 . B4 . G4 . E4 . G4 . B4 . E5 . ') +
        bar('D4 . F4 . A4 . F4 . C4 . E4 . B3 . D#4 .'),
      kick: 'x . . . . . . . x . . x . . . . '.repeat(4),
      snare: '. . . . . . . . . . . . x . . . '.repeat(3) + '. . . . . . . . . . . . x . x x',
      hat: '. . x . . . x . . . x . . . x . '.repeat(4),
      quiet: '. '.repeat(64),
    },
    tracks: [
      { inst: 'bass', seq: ['bass', 'bass', 'bass', 'bass'] },
      { inst: 'organ', seq: ['quiet', 'organ', 'organ2', 'organ'], vol: 0.9 },
      { inst: 'pluck', seq: ['arp', 'arp', 'arp', 'arp'], vol: 0.3 },
      { inst: 'kick', seq: ['kick', 'kick', 'kick', 'kick'] },
      { inst: 'snare', seq: ['snare', 'snare', 'snare', 'snare'] },
      { inst: 'hat', seq: ['hat', 'hat', 'hat', 'hat'], vol: 0.8 },
    ],
  },

  // "Wrath" — C minor, fast and furious.
  boss: {
    bpm: 160,
    loop: true,
    patterns: {
      bass:
        bar('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 D#2 D#2 F2 G2 ') +
        bar('G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 C2 C2 D#2 G#1 ') +
        bar('A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 D2 D2 F2 A#1 ') +
        bar('G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 B1 B1 D2 F2'),
      lead:
        bar('C5 . C5 . D#5 . G5 . F5 - D#5 - D5 - C5 - ') +
        bar('C5 . G#4 . C5 . D#5 . D5 - C5 - A#4 - G#4 - ') +
        bar('D5 . A#4 . D5 . F5 . D#5 - D5 - C5 - A#4 - ') +
        bar('B4 - - - D5 - - - G5 - - - F5 - D5 - '),
      lead2:
        bar('G5 - - - F5 - D#5 - D5 - D#5 - F5 - G5 - ') +
        bar('G#5 - - - G5 - F5 - D#5 - D5 - C5 - D#5 - ') +
        bar('F5 - - - D#5 - D5 - C5 - D5 - D#5 - F5 - ') +
        bar('G5 - - - - - - - B5 - - - D6 - - -'),
      arp:
        bar('C5 D#5 G5 C6 G5 D#5 C5 D#5 C5 D#5 G5 C6 G5 D#5 C5 G4 ') +
        bar('C5 D#5 G#5 C6 G#5 D#5 C5 D#5 C5 D#5 G#5 C6 G#5 D#5 C5 G#4 ') +
        bar('D5 F5 A#5 D6 A#5 F5 D5 F5 D5 F5 A#5 D6 A#5 F5 D5 A#4 ') +
        bar('D5 G5 B5 D6 B5 G5 D5 G5 D5 G5 B5 D6 B5 G5 D5 B4'),
      kick: 'x . . . x . . . x . . . x . . . '.repeat(3) + 'x . . . x . . . x . x . x x x x',
      snare: '. . . . x . . x . . . . x . . . '.repeat(3) + '. . . . x . . . x . x x x x x x',
      hat: 'x x x x x x x x x x x x x x x x '.repeat(4),
    },
    tracks: [
      { inst: 'bass', seq: ['bass', 'bass'] },
      { inst: 'lead', seq: ['lead', 'lead2'], vol: 0.85 },
      { inst: 'pluck', seq: ['arp', 'arp'], vol: 0.3 },
      { inst: 'kick', seq: ['kick', 'kick'] },
      { inst: 'snare', seq: ['snare', 'snare'] },
      { inst: 'hat', seq: ['hat', 'hat'], vol: 0.55 },
    ],
  },

  victory: {
    bpm: 132,
    loop: false,
    patterns: {
      lead: 'C5 . C5 . C5 . G5 - - - E5 - G5 - - - C6 - - - - - - - - - - - . . . . ',
      harm: 'E4 . E4 . E4 . B4 - - - G4 - B4 - - - E5 - - - - - - - - - - - . . . . ',
      bass: 'C3 - - - - - - - G2 - - - - - - - C3 - - - - - - - - - - - . . . . ',
      kick: 'x . . . . . . . x . . . . . . . x . . . . . . . . . . . . . . . ',
    },
    tracks: [
      { inst: 'lead', seq: ['lead'] },
      { inst: 'pluck', seq: ['harm'], vol: 0.8 },
      { inst: 'bass', seq: ['bass'] },
      { inst: 'tom', seq: ['kick'] },
    ],
  },

  gameover: {
    bpm: 80,
    loop: false,
    patterns: {
      lead: 'A4 - - - G4 - - - F4 - - - E4 - - - - - - - - - - - . . . . . . . . ',
      bass: 'A2 - - - - - - - D2 - - - - - - - E2 - - - - - - - A1 - - - - - - - ',
    },
    tracks: [
      { inst: 'organ', seq: ['lead'] },
      { inst: 'bass', seq: ['bass'] },
    ],
  },
};
