// Whether this is a release build: the zip for itch.io (tools/build-itch.mjs writes true into its
// copy of this file). A release is static hosting only, so it never asks for the game's server,
// and has neither the debug address (storage.js DEBUG, audio.js) nor the developer panel
// (main.js). In the repository, and so on gamevibe.si, false: everything as before.
export const RELEASE = false;
