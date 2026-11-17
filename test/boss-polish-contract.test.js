import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import'../tools/headless.mjs';
import{SPR}from'../public/js/engine/sprites.js';
import{BOSS_IDS,contract}from'../tools/boss-polish/contracts.mjs';
const baseline=JSON.parse(readFileSync(new URL('../tools/boss-polish/geometry-baseline.json',import.meta.url)));
for(const id of BOSS_IDS)test(`${id}: boss artwork preserves hit bounds, clocks and canvas allocation`,()=>{
 const current=contract(SPR[id]),before=baseline[id];
 assert.deepEqual(current.metadata,before.metadata,'all positioning, density and animation metadata');
 assert.deepEqual(current.sizes,before.sizes,'every source and mirrored canvas keeps its dimensions');
 assert.equal(current.alpha,before.alpha,'the encounter sprite retains its complete alpha mask and hit bounds');
 assert.equal(current.rgbaBytes,before.rgbaBytes,'decoded RGBA allocation stays fixed');
});
