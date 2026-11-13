// Render the real post-run gear menu without touching saved progression.
// CANVAS_MODULE may point at an installed @napi-rs/canvas package.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites } = await import('../public/js/engine/sprites.js');
const { SpoilsReveal } = await import('../public/js/ui/reward-reels.js');
const { UI } = await import('../public/js/ui/ui.js');
const { defaultProfile } = await import('../public/js/shared/profile.js');
const { packSpoils } = await import('../public/js/shared/spoils.js');
const { rollItem, itemName } = await import('../public/js/shared/items.js');
const { input } = await import('../public/js/engine/input.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
buildSprites();
input.mouse.x = input.mouse.y = -1;
const tag = process.argv[2] || 'after', out = `output/gear-menu-review/${tag}`;
mkdirSync(out, { recursive: true });
const find = (slot, predicate) => {
  for (let seed = 1; seed < 1000; seed++) {
    const item = rollItem(mulberry32(seed), { slot });
    if (predicate(item)) return item;
  }
  throw Error('No fixture');
};
const sandals = find('boots', item => itemName(item) === 'Sandals');
const ring = find('ring', item => item.rarity === 2 && itemName(item).includes('Gold Ring'));
const blue = find('armor', item => item.rarity === 2);
const gold = find('weapon', item => item.rarity === 4);
const base = defaultProfile();
base.gold = 1820;
const evidence = [];
for (const [W, H] of [[580, 216], [480, 270], [320, 240], [293, 633], [240, 210]]) {
  for (const [label, items] of [['two', [sandals, ring]], ['many', Array.from({ length: 12 }, (_, i) => [sandals, ring, blue, gold][i % 4])]]) {
    const profile = structuredClone(base), before = JSON.stringify(profile);
    const receipt = { id: '0123456789abcdef01234567', hero: 'knight', claims: packSpoils(items.map(item => ({ item, state: 'sealed' }))), spoils: '' };
    const ui = new UI(), reveal = new SpoilsReveal({ ui, store: { profile } }, receipt);
    const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0914';ctx.fillRect(0, 0, W, H);
    reveal.draw(ctx, W, H, 1);
    writeFileSync(`${out}/${label}-${W}x${H}.png`, canvas.toBuffer('image/png'));
    if (JSON.stringify(profile) !== before) throw Error('Rendering changed profile');
    evidence.push({ label, W, H, items: ui.items });
  }
}
writeFileSync(`${out}/controls.json`, JSON.stringify(evidence, null, 2));
console.log(`Captured ${evidence.length} actual gear menus in ${out}`);
