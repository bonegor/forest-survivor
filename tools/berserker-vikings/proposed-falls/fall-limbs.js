import { turn } from '../../../public/js/art/hero-fall.js';

// The standing drawing supplies the length and resting direction of each bone.
// Flexing the elbow or turning the shoulder never changes either length.
export function armFromSheet([s, e, w], bodyOrigin, bodyAngle, upperTurn, foreTurn) {
  const shoulder = turn(s, bodyAngle, bodyOrigin);
  const elbow = turn([e[0] - s[0], e[1] - s[1]], bodyAngle + upperTurn, shoulder);
  const wrist = turn([w[0] - e[0], w[1] - e[1]], bodyAngle + foreTurn, elbow);
  return [shoulder, elbow, wrist];
}
