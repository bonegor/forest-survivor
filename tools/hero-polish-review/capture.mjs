import{chromium}from'playwright-core';import{writeFileSync,mkdirSync}from'node:fs';
mkdirSync('output/hero-polish-2026-11-14/preview', {recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'})}),page=await browser.newPage({viewport:{width:1480,height:1200}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3017/',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.heroReview);await page.click('#pause');
await page.evaluate(()=>{window.evidenceBoard=document.createElement('canvas');evidenceBoard.width=1200;evidenceBoard.height=468;const ctx=evidenceBoard.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#17202a';ctx.fillRect(0,0,1200,468);ctx.fillStyle='#e7dfc7';ctx.font='18px Georgia';ctx.fillText('Forest Survivor · Native artwork in the real game',12,22);});
for(const [i,id]of['archer','rogue','berserker','paladin','eanasir'].entries()){
 await page.selectOption('#hero',id);await page.selectOption('#setting','forest');await page.click('[data-action="idle"]');await page.evaluate(()=>heroReview.advance(.5));
 await page.screenshot({path:`output/hero-polish-2026-11-14/preview/${id}-preview.png`,fullPage:true});
 await page.evaluate(({i,id})=>{const ctx=evidenceBoard.getContext('2d');for(let side=0;side<2;side++){const g=heroReview.games[side],[x,y,w,h]=g.player._rect;ctx.fillStyle='#e7dfc7';ctx.font='13px sans-serif';ctx.fillText((side?'Applied':'Before')+' · '+g.player.hero.title,i*240+8,45+side*214);ctx.drawImage(document.querySelector('#world'+side),x,y,w,h,i*240,52+side*214,240,192);}}, {i,id});
}
const png=await page.evaluate(()=>evidenceBoard.toDataURL('image/png').split(',')[1]);writeFileSync('output/hero-polish-2026-11-14/preview/five-hero-before-after.png',Buffer.from(png,'base64'));
await page.selectOption('#hero','archer');await page.click('[data-action="play"]');
const prior=await page.evaluate(()=>heroReview.games.map(g=>g.player.x));await page.keyboard.down('KeyD');await page.evaluate(()=>heroReview.advance(.6));await page.keyboard.up('KeyD');
const current=await page.evaluate(()=>heroReview.games.map(g=>g.player.x));if(current.some((x,i)=>x<=prior[i]+10))throw Error('Keyboard play did not move both games');
await page.selectOption('#setting','crypt');await page.click('[data-action="play"]');await page.keyboard.down('KeyX');await page.evaluate(()=>heroReview.advance(.6));await page.keyboard.up('KeyX');
const strikes=await page.evaluate(()=>heroReview.games.map(g=>g.player.strikeAt));if(strikes.some(t=>t==null))throw Error('Keyboard crypt strike failed');
await page.click('[data-action="idle"]');await page.selectOption('#setting','forest');await page.screenshot({path:'output/hero-polish-2026-11-14/preview/ranger-preview.png',fullPage:true});
writeFileSync('output/hero-polish-2026-11-14/preview/keyboard-review.json',JSON.stringify({prior,current,strikes,errors},null,2));await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log('Final screenshots, native five-hero board and paired WASD/X keyboard checks passed.');
