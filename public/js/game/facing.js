// Which way a sprite faces: one rule for the hero, monsters, bosses and minions alike (the
// Sprite Lab, gms/3001, runs it through the game itself).
//
// As in Vampire Survivors, a sprite only ever faces left or right. A move with any leftward
// part, straight or diagonal, turns it left; any rightward part, right. Standing still, or
// going straight up or down, keeps the way it last faced. A move within a few degrees of
// straight up or down counts as straight, so a creature steering round something doesn't
// flicker from side to side.
//
// One exception: a monster's (or minion's) blow, shot or charge begun standing still turns it
// toward its target first. On the move it keeps facing the way it goes, even striking behind
// itself. The hero turns only by walking: standing still he stays as he last faced, whatever
// his weapons hit, behind or beside him. Only a blow the player strikes by hand (the knight's
// sword in the crypts) turns him, standing, to the foe it is struck at.

// How far from straight up or down a move must lean (the sideways share of it) to turn a sprite.
export const STRAIGHT = 0.12;

// The facing (-1 left, 1 right) after a move of (dx, dy), at any scale; face: the facing before.
export function faceAlong(face, dx, dy = 0) {
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return face;
  const x = dx / len;
  return x > STRAIGHT ? 1 : x < -STRAIGHT ? -1 : face;
}

// The facing for an attack toward (dx, dy): turned toward it if begun standing still, kept on the move.
export const faceAttack = (face, moving, dx, dy = 0) => (moving ? face : faceAlong(face, dx, dy));
