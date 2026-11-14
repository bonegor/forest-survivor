import test from 'node:test';import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Frame,buildSprite,PALETTE_CSS,colorIndex,SPR} from '../public/js/engine/sprites.js';
import {pack,hexPack} from '../public/js/engine/pixels.js';
import {OUTLINE} from '../public/js/art/palette.js';
import {Game} from '../public/js/game/game.js';
import {defaultProfile,metaBonuses} from '../public/js/shared/profile.js';
test('unregistered opaque source shades produce byte-palette debris without altering sprite colours',()=>{
 const colour=pack(217,102,41),f=new Frame({w:1,h:1,d:Uint32Array.of(colour)});assert.equal(f.pixels.length,3);assert.ok(f.pixels[2]>=0&&f.pixels[2]<256);assert.equal(f.buf.d[0],colour);
});
test('exact palette colours remain exact, while alpha, outline and custom rim stay out of debris',()=>{
 const red=hexPack('#e43b44'),rim=pack(3,11,27),f=new Frame({w:4,h:1,d:Uint32Array.of(red,0,OUTLINE,rim),rim});assert.deepEqual(f.pixels,[0,0,colorIndex('r')]);
});
test('registering an exact shade later supersedes the cached nearest debris match',()=>{
 if(PALETTE_CSS.length>=256)return;const c=hexPack('#d96b31');new Frame({w:1,h:1,d:Uint32Array.of(c)}).pixels;
 buildSprite('debris-only-test',{outline:false,palette:{'#d96b31':'#d96b31'},gen:()=>[{w:1,h:1,d:Uint32Array.of(c)}]});
 const f=new Frame({w:1,h:1,d:Uint32Array.of(c)});assert.equal(PALETTE_CSS[f.pixels[2]],'#d96b31');
});
test('dense boss death fragments originate inside the visible world body in both facings',()=>{
 const g=new Game({hero:'knight',mode:'s15',meta:metaBonuses(defaultProfile()),settings:{numbers:false}}),e=g.spawnEnemy('butcher',100,100,{instant:true,always:true}),fr=SPR.butcher.frames[0];e.sleeping=true;e.life=0;e.wob=0;e.spawnT=0;
 const old=Math.random;Math.random=()=>.1;try{for(const face of[-1,1]){e.face=face;const emitted=[];g.particles.emit=(...args)=>emitted.push(args);g.particles.burst=()=>{};g.deathFx(e,fr);assert.ok(emitted.length>100,'source shading now yields silhouette fragments');const b=e.body();for(const[x,y,z]of emitted){const sourceX=e.x+(x-e.x)/.2,sourceY=e.y-z+1;assert.ok(sourceX>=b[0]-1&&sourceX<=b[2]+1&&sourceY>=b[1]-1&&sourceY<=b[3]+1,'source-density conversion keeps debris at the visible body');}}}finally{Math.random=old;}
});
