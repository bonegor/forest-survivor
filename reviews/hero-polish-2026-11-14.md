# Hero art and weapon polish · 14 November 2026

Applied to the production roster: Ranger's original Hunter proportions with restrained native facial detail; stronger Berserker chest, fur, brow and jaw; a Paladin face contained within the hood; and a sterner, broader Ea-nāṣir with copper bracers and belt. Shadow idle, travel and attack animation clocks are doubled. Movement speed, strike delay and weapon cooldowns retain their existing values.

Ea-nāṣir starts with **Whip** and **Medium Quality Copper**. The Whip is his manual crypt weapon; copper continues firing automatically. Rank-8 Whip + Gauntlets of Might + a chest produces **Lion's Lash**, opening Phoenix Heart for this hero even if the account has not bought it. Rank-8 copper + Phoenix Heart + a chest produces **High Quality Copper (not for sale)**. The Heart is retained by evolution and still has its normal revival/reoffer rules. The six cursed copper slots and the existing merchant-unlock challenge are unchanged. New evolution save bits are appended to the existing list.

The weapon review repaired visible attacks passing through crates and clarified the Praetor's front-facing lane/reprisal. The independent playthrough then found that twelve starters could not attack an isolated field crate at all. Their existing creature selection now falls back to a nearby visible prop, firing the actual weapon with its normal cooldown. Creature priority and monster hit budgets remain intact; Gravebinder's object peck provides no soul fuel. Hidden targets no longer steal manual crypt aim or Marksman shots. Ea-nāṣir's boss lash was aligned with his new hand and impact pose in both directions.

## Review evidence

- [Main weapon design, all 22 heroes](2026-11-14-main-weapons.md)
- [Independent playthrough review](hero-polish-playthrough-2026-11-14.md)
- [Independent graphics review](hero-polish-graphics-2026-11-14.md)
- [Playable comparison](http://127.0.0.1:3017/?hero=archer): exact pre-edit artwork for the five changed heroes, all 22 heroes selectable, real Game rendering, selection showcases, walking/idle/combat controls and WASD/X play. Run `node tools/hero-polish-review/serve.mjs` to restart it. Baseline assets are bundled under `tools/hero-polish-review/before/`; generated captures remain under ignored `output/` directories.
- Native before/after board: `output/hero-polish-2026-11-14/preview/five-hero-before-after.png`.

All review profiles are disposable and in memory. The preview does not read or write the user's saved progression. Artwork changes are reproducible through `tools/animation-round/build.mjs`; Ea-nāṣir remains component-authored in `public/js/art/eanasir.js`.

Final validation: **1,150 tests passed, zero failures** using `node --test --test-concurrency=4 "test/*.test.js"` with local loopback available for the HTTP fixtures. Browser verification loaded every hero and exercised eight scenes for each changed hero, with no page errors. Paired keyboard movement and manual crypt strikes also worked. The complete test log is `output/hero-polish-2026-11-14/test-suite-final.log`.

After that full run, the final reviewer added copper's line-of-sight/solid target filter to prevent a nearer blocked foe stealing its shots in Dungeon Run. **112 focused tests passed** after this last small targeting change, including fresh base/high-copper real-projectile regressions.

Push verification: the exact staged source was exported into a clean directory, excluding unrelated local demo/desktop work and V2 experiments. All **1,145 tests passed** there, including standalone art-preservation fixtures. The packaged comparison served all five bundled before assets and the staged hero screen correctly. The different test total reflects the exclusion of uncommitted experimental tests and inclusion of this pass's standalone art checks.

The broader reviews distinguish functional correctness from balance and aesthetic judgment. In particular, the single-seed maximum-Armory autopilot runs are diagnostic evidence, not estimated player win rates; the older two-frame monster designs remain coarser than the current hero art.
