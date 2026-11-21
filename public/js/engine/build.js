// Whether this is a release build: the zip for itch.io (tools/build-itch.mjs writes true into its
// copy of this file). A release is static hosting only, so it never asks for the game's server,
// and has neither the debug address (storage.js DEBUG, audio.js) nor the developer panel
// (main.js). In the repository, and so on gamevibe.si, false: everything as before.
export const RELEASE = false;
// Set only in generated free-demo builds. The working game and full releases retain all content.
export const DEMO = false;
// Set only in the copy the publish puts on GitHub Pages (.github/workflows/pages.yml): static
// hosting, with no game server to ask for, so a network blip while the game loads is never taken
// for a game server down (engine/storage.js init) with the browser's save left unread.
export const STATIC = false;
