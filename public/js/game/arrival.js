// Bosses as events. Real seconds unless said.
//   stir:        before a night's boss the edges darken and a rumble rises, "Something stirs in the dark…"
//   at its spawn the horde within recoilR recoils outward (Game.pushback: monsters only, never the hero),
//   the music is cut for `gap` and the boss piece slams in, the name card shows for `card` (letterbox
//   bars for `letterbox`), and the bar slams in at `slamAt` (Ranked's lighter return: `lightSlamAt`, no
//   letterbox, no cut; a crypt's lord: at once).
//   under LOW_HP of its health the bar pulses white and a heartbeat plays every `beat`.
//   at its fall the music eases back to the night's over `easeBack`.
export const ARRIVAL = {
  stir: 1.5,
  stirOut: 0.6,
  recoilR: 120,
  recoilF: 260,
  gap: 0.4,
  card: 2.4,
  letterbox: 0.8,
  slamAt: 0.9,
  lightSlamAt: 0.3,
  slam: 0.25,
  beat: 0.7,
  easeBack: 3,
};
// A boss slain while his name card is up: the card fades out in CARD_END s, and the banners (his
// "…is slain!" with them) wait for it, so the two never share the screen.
export const CARD_END = 0.2;
export const LOW_HP = 0.1;
