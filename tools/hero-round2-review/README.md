# Second art review

Start from the repository root:

```sh
node tools/hero-round2-review/serve.mjs
```

Open <http://127.0.0.1:3018/?hero=archer&scale=2.4>. The local comparison uses the production Game, sprites, camera, lighting and selection showcase. Previous-pass Ranger, Berserker and Ea-nasir sources are frozen in `before/`; both sides use current gameplay. All other heroes are available for inspection. Profiles are disposable and in memory.

Select idle, walking, diagonal travel, attack, moving attack, or the complete tour. Play controls both sides with WASD/arrows and X in crypts. The `scale` URL parameter chooses device pixels per logical world pixel; 1, 2.4 and 3.2 exercise small and desktop rendering. Higher source detail preserves each hero's world footprint.

Run browser verification with the server running and the optional `playwright-core` developer package installed:

```sh
node tools/hero-round2-review/verify.mjs
```

This checks all 22 heroes at three display scales, eight scenes for each revised hero, paired keyboard movement and manual crypt strikes, and complete 30-second tours of all six upgraded bosses in both facings. Evidence is written to `output/hero-round2-2026-11-14/preview/`. `BROWSER_EXECUTABLE` may select a Chromium executable; the default is installed Chrome. `REVIEW_HERO_IDS` and `REVIEW_SCALES` can narrow a follow-up take. `HERO_ROUND2_PORT` overrides the server port; the supplied verification targets the default 3018.

Open <http://127.0.0.1:3018/bosses.html> for the interactive boss review, including idle, travel, anticipation, release and recovery.
