# Hero polish comparison

Run `node tools/hero-polish-review/serve.mjs`, then open <http://127.0.0.1:3017/>. The server binds only to loopback. `HERO_POLISH_PORT` can select another port. The browser runs the actual game with disposable in-memory profiles; no saved progression is read or changed.

The five `before/` assets preserve the exact pre-edit production art from commit `7b84daa`. They also provide standalone regression fixtures; the comparison does not require local screenshots or the uncommitted V2 walk proposals. Other heroes show the current production art in both columns.

Optional browser verification uses an installed `playwright-core` package and Chrome. Run `node tools/hero-polish-review/verify.mjs` or `capture.mjs` with the server running on the default port. Set `BROWSER_EXECUTABLE` to use another Chromium executable. These scripts create their ignored `output/` folder automatically. Native contact-sheet tools additionally require `@napi-rs/canvas`, or its module path through `CANVAS_MODULE`.
