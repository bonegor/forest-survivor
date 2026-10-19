// What the results say slew the hero ("Slain by …", Player.hurt): a foe by its name (a champion's
// or a crypt lord's own, a boss's with its title), and a shot as its shooter's ("Cultist's bolt").

// A foe as the results name it.
export const foeName = (e) => (e.boss ? `${e.def.name}, ${e.def.title}` : e.name || e.def.name);

// What each kind of shot is called after its shooter's name.
export const SHOT_NOUN = { darkbolt: 'bolt', arrow: 'arrow', bone: 'bone', skullbolt: 'skull', firebolt: 'firebolt' };

// A shot as its shooter's ("Cultist's bolt", a boss's by its name alone: "King Ossarian's bone").
export const shotName = (e, kind) => `${e.boss ? e.def.name : e.name || e.def.name}'s ${SHOT_NOUN[kind] || 'shot'}`;
