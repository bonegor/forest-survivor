// What the results say slew the hero ("Slain by …", Player.hurt): a foe by its name (a champion's
// or a crypt lord's own, a boss's with its title), and a shot as its shooter's ("Cultist's bolt").

// A foe as the results name it.
export const foeName = (e) => (e.boss ? `${e.def.name}, ${e.def.title}` : e.name || e.def.name);

// What each kind of shot is called after its shooter's name.
export const SHOT_NOUN = { darkbolt: 'bolt', arrow: 'arrow', bone: 'bone', skullbolt: 'skull', firebolt: 'firebolt' };

// A shot as its shooter's ("Cultist's bolt", a boss's by its name alone: "King Ossarian's bone").
export const shotName = (e, kind) => `${e.boss ? e.def.name : e.name || e.def.name}'s ${SHOT_NOUN[kind] || 'shot'}`;

// A boss's name alone, for the results' wounds (Player.hurt): his slams and his shots are counted
// with his touch under it, so one boss fills one place of the three and his blows from afar count
// as a boss's (27 October 2026: "King Ossarian", "King Ossarian, The Bone King" and "King
// Ossarian's bone" could take all three). Null for any other foe. Taken when the blow sets off,
// for a boss's body may walk again as another foe before his shot lands.
export const bossOf = (e) => (e.boss ? e.def.name : null);
