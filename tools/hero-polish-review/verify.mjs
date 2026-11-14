import {chromium} from 'playwright-core';
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('output/hero-polish-2026-11-14/preview', {recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'})});
const page=await browser.newPage({viewport:{width:1480,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3017/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>!!window.heroReview);
await page.click('#pause');
await page.screenshot({path:'output/hero-polish-2026-11-14/preview/ranger-preview.png',fullPage:true});
const roster=await page.locator('#hero option').evaluateAll(list=>list.map(n=>n.value));
const result={url:page.url(),roster,heroes:{}};
for(const id of roster){
 await page.selectOption('#hero',id);
 await page.evaluate(()=>window.heroReview.advance(.25));
 result.heroes[id]=await page.evaluate(()=>({state:heroReview.state,heading:document.querySelector('#heading0').textContent,frames:[...document.querySelectorAll('.world')].map(c=>({frame:c.dataset.frame,pose:c.dataset.pose}))}));
}
for(const id of ['archer','rogue','berserker','paladin','eanasir']){
 await page.selectOption('#hero',id);
 const scenes={};
 for(const [setting,action]of [['forest','idle'],['forest','right'],['forest','left'],['forest','diagonal'],['forest','attack-walk'],['crypt','idle'],['crypt','attack'],['crypt','attack-walk']]){
  await page.selectOption('#setting',setting);await page.click(`[data-action="${action}"]`);
  scenes[setting+'/'+action]=await page.evaluate(()=>{
   const seen=[new Set(),new Set()];
   for(let n=0;n<144;n++){heroReview.advance(1/60);[...document.querySelectorAll('.world')].forEach((c,i)=>seen[i].add(c.dataset.frame));}
   return{seen:seen.map(s=>[...s]),pose:[...document.querySelectorAll('.world')].map(c=>c.dataset.pose)};
  });
 }
 result.heroes[id].scenes=scenes;
 await page.selectOption('#setting','forest');await page.click('[data-action="idle"]');
 await page.evaluate(()=>heroReview.advance(.5));
 await page.screenshot({path:`output/hero-polish-2026-11-14/preview/${id}-preview.png`,fullPage:true});
}
result.errors=errors;writeFileSync('output/hero-polish-2026-11-14/preview/browser-review.json',JSON.stringify(result,null,2));
await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log(`Verified ${roster.length} heroes; five changed heroes across eight scenes; no browser errors.`);
