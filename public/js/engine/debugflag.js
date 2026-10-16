// The debug address's query flag: a random token rather than "debug", so no one guesses it (the
// owner's link list has it). With it the game opens every hero and mode in a save of its own
// (storage.js DEBUG) and plays a chosen menu-music candidate (audio.js). Kept in a file of its
// own so a test can read it before the modules that look at the address load.
export const DEBUG_FLAG = '2kr0cve2eu0';
