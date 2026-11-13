import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import {Game} from '../public/js/game/game.js';
import {SPR, idleFrame, walkFrame} from '../public/js/engine/sprites.js';
import {HEROES} from '../public/js/data/heroes.js';
import {input} from '../public/js/engine/input.js';
import {mulberry32} from '../public/js/engine/util.js';
import {defaultProfile, metaBonuses} from '../public/js/shared/profile.js';
import {strikeClip} from '../public/js/game/hero-animation.js';
import {Slash} from '../public/js/game/effects.js';

function run(id, fn) {
  const bot=input.bot, random=Math.random;
  const held=[...input.held], down=[...input.justDown];
  try {
    Math.random=mulberry32(8137);input.bot={x:0,y:0};input.held.clear();input.justDown.clear();
    const g=new Game({hero:id,mode:'s15',map:'forest',diff:'easy',crypts:false,
      meta:metaBonuses(defaultProfile()),settings:{numbers:false,skins:{[id]:'v3'}}});
    g.spawner.update=()=>{};g.player.devGod=true;
    return fn(g,g.player,g.mainWeapon(),SPR[g.player.hero.sprite]);
  } finally {
    input.bot=bot;Math.random=random;input.held.clear();input.justDown.clear();
    for(const key of held)input.held.add(key);for(const key of down)input.justDown.add(key);
  }
}

function draw(g) {
  const calls=[], transforms=[];
  const ctx={globalAlpha:1,drawImage(...args){calls.push(args);},
    rotate(...args){transforms.push(['rotate',...args]);},
    scale(...args){transforms.push(['scale',...args]);},
    translate(...args){transforms.push(['translate',...args]);},save(){},restore(){}};
  g.drawPlayer(ctx,g.cam);
  assert.equal(calls.length,1,'the hero is drawn exactly once');
  assert.deepEqual(transforms,[],'automatic weapon state must not deform or rotate the hero');
  const rect=g.player._rect;
  assert.equal(calls[0][0],rect[6],'the displayed image is the selected frame image');
  assert.deepEqual(calls[0].slice(1),rect.slice(0,4),'the native draw rectangle reaches the canvas unchanged');
  return rect;
}

function enter(g) {
  const p=g.player;
  g.enterCrypt({key:'0,0',depth:1,x:p.x,y:p.y});
  for(let n=0;n<180&&(!g.inCrypt||g.state!=='play');n++)g.update(1/60);
  assert.ok(g.inCrypt);assert.equal(g.state,'play');
  for(const enemy of g.enemies)enemy.dormant=true;
}

test('all heroes ignore hostile automatic receipts in the actual frame, image and draw transform',()=>{
  for(const id of Object.keys(HEROES))run(id,(g,p,w,spr)=>{
    assert.equal(p.hero.sprite,HEROES[id].sprite,'old saved skins cannot bypass the common selector');
    for(const crypt of [false,true])for(const walking of [false,true])for(const face of [-1,1]){
      g.inCrypt=crypt?{}:null;p.strikeAt=null;p.face=face;p.walking=p.moving=walking;
      for(let n=0;n<24;n++){
        p.anim=n*.37;p.idleAnim=n*.29;p.heroAttack={at:g.clock+(n%3-1),ang:face<0?Math.PI:0,weapon:w};
        p.swingT=.14;p.swingAng=n;w.queue=5;w.queueT=-.1;w.cd=0;
        const step=Math.floor(p.anim*(spr.walk?1.4:1)*spr.motionRate);
        const expected=walking?walkFrame(spr,step):idleFrame(spr,Math.floor(p.idleAnim*spr.idleRate));
        const rect=draw(g);
        assert.equal(rect[4],expected,`${id}: ${crypt?'crypt':'field'} automatic state cannot select attack`);
        assert.equal(rect[5],face<0);assert.equal(rect[6],expected.get(face<0));
        assert.equal(rect[2],expected.w*g.cam.S);assert.equal(rect[3],expected.h*g.cam.S);
      }
    }
  });
});

test('all heroes reject field strikes and preserve a pending crypt release even when cooldown expires',()=>{
  for(const id of Object.keys(HEROES))run(id,(g,p,w)=>{
    w.cd=0;
    assert.equal(g.strike(),false,`${id}: manual pose requests are crypt-only`);
    assert.equal(p.strikeAt,null);assert.equal(w.handAt,null);
    g.inCrypt={};g.state='pause';
    assert.equal(g.strike(),false,`${id}: paused input must not start a strike`);
    g.state='play';assert.equal(g.strike(),true,`${id}: a ready crypt weapon strikes`);
    const at=p.strikeAt,release=w.handAt,queue=w.queue;
    // Haste can expire the cooldown before the authored release delay. A second
    // input must not keep postponing the first hit or restarting its animation.
    w.cd=-1;g.cryptTime+=1/120;
    assert.equal(g.strike(),false,`${id}: pending release owns the current wind-up`);
    assert.equal(p.strikeAt,at);assert.equal(w.handAt,release);assert.equal(w.queue,queue);
  });
});

test('holding strike with Haste and a short cooldown reaches real impacts instead of restarting forever',()=>run('knight',(g,p,w,spr)=>{
  enter(g);p.cooldown=.35;while(w.level<8)w.levelUp();w.recompute();w.cd=0;p.addBuff('haste',20);
  let slashes=0;const push=g.effects.push;
  g.effects.push=function(...effects){slashes+=effects.filter(effect=>effect instanceof Slash).length;return push.apply(this,effects);};
  input.held.add('KeyX');
  const strikes=new Set(),shown=new Set(),clip=strikeClip(spr);
  for(let i=0;i<180;i++){
    const pending=w.handAt,at=p.strikeAt;
    g.update(1/60);
    if(pending!==null&&g.clock<pending-1e-6){
      assert.equal(w.handAt,pending,'held input cannot postpone a pending release');
      assert.equal(p.strikeAt,at,'held input cannot restart its pending attack pose');
    }
    if(p.strikeAt!==null)strikes.add(p.strikeAt);
    shown.add(spr.frames.indexOf(draw(g)[4]));
  }
  input.held.delete('KeyX');
  assert.ok(strikes.size>=3,'held input repeats completed strikes');
  assert.ok(slashes>=3,`real sword impacts must occur, saw ${slashes}`);
  assert.ok(shown.has(spr.attack[clip.hit]),'the actual displayed frame reaches the authored impact');
  const last=p.strikeAt;
  for(let i=0;i<180;i++)g.update(1/60);
  assert.equal(p.strikeAt,last,'queued follow-up slashes never create a new manual start');
  assert.equal(draw(g)[4],idleFrame(spr,Math.floor(p.idleAnim*spr.idleRate)),'releasing input eventually returns to idle');
}));

test('real crypt entry and exit clear old strike and buffered input before another clock can reuse them',()=>run('mage',(g,p,w,spr)=>{
  p.strikeAt=g.clock;p.strikeBuf=.2;enter(g);
  assert.equal(p.strikeAt,null);assert.equal(p.strikeBuf,0);
  // A reset review/save clock cannot reuse the strike cleared by the transition.
  g.cryptTime=0;assert.equal(draw(g)[4],idleFrame(spr,Math.floor(p.idleAnim*spr.idleRate)));
  w.cd=0;assert.equal(g.strike(),true);p.strikeBuf=.2;g.leaveCrypt();
  for(let i=0;i<180&&(g.inCrypt||g.state!=='play');i++)g.update(1/60);
  assert.equal(g.inCrypt,null);assert.equal(p.strikeAt,null);assert.equal(p.strikeBuf,0);
  g.time=0;g.cryptTime=0;p.heroAttack={at:0,ang:0,weapon:w};
  assert.equal(draw(g)[4],idleFrame(spr,Math.floor(p.idleAnim*spr.idleRate)),'returning to an old timestamp cannot replay the departed manual strike');
}));
