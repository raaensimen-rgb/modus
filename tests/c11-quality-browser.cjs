'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {startPublicPackageServer}=require('./public-package-server.cjs');
const root=path.resolve(process.env.MODUS_TEST_DIST||'../package'),out=path.resolve(process.env.C11_RESULTS||'../evidence/c11-browser.json');
(async()=>{const server=await startPublicPackageServer(root),rows=[];
try{for(const [engineName,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();try{for(const locale of ['nb','en'])for(const width of [375,768,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.setDefaultTimeout(5000);
 const base=server.origin+'/'+(locale==='en'?'en/':'');
 async function open(name){await page.goto(base+name);if(await page.locator('.modus-premises-dialog[open]').count()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();}}
 async function check(name,fn){try{await fn();rows.push({engine:engineName,locale,width,name,status:'passed'});}catch(e){rows.push({engine:engineName,locale,width,name,status:'failed',error:e.message});}console.log(engineName,locale,width,name,rows.at(-1).status,rows.at(-1).error||'');}
 await check('search-network-recovery',async()=>{
 let requests=0;await page.route('**/search-index.json',async r=>{requests++;await new Promise(resolve=>setTimeout(resolve,100));await r.fulfill({status:503,body:'unavailable'});});
 await open('index.html');await page.locator('[data-global-search-open]').click();
 await page.waitForFunction(()=>/unavailable|utilgjengelig/.test(document.querySelector('[data-global-search-status]').textContent));
 await page.locator('[data-global-search-input]').fill('atlas');
 assert.match(await page.locator('[data-global-search-status]').textContent(),/unavailable|utilgjengelig/,'Typing after failure must retain an honest error');
 await page.keyboard.press('Escape');await page.unrouteAll({behavior:'wait'});await page.locator('[data-global-search-open]').click();
 await page.locator('[data-global-search-result],.global-search-result').first().waitFor();assert.equal(requests,1);
 await page.keyboard.press('Escape');assert(await page.locator('[data-global-search-open]').evaluate(e=>e===document.activeElement));
 });await page.unrouteAll({behavior:'wait'});
 await check('search-one-request-and-loading',async()=>{
 let requests=0;await page.route('**/search-index.json',async r=>{requests++;await new Promise(resolve=>setTimeout(resolve,500));await r.continue();});
 await open('index.html');await page.locator('[data-global-search-open]').click();
 assert.match(await page.locator('[data-global-search-status]').textContent(),/Loading|Laster/);
 await page.keyboard.press('Control+k');await page.keyboard.press('Control+k');
 await page.locator('[data-global-search-input]').fill('atlas');await page.locator('.global-search-result').first().waitFor();assert.equal(requests,1,'Concurrent opens must reuse one request');await page.keyboard.press('Escape');
 });await page.unrouteAll({behavior:'wait'});
 await check('search-invalid-index',async()=>{
 const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);
 await page.route('**/search-index.json',r=>r.fulfill({status:200,contentType:'application/json',body:'{"error":"bad payload"}'}));
 await open('index.html');await page.locator('[data-global-search-open]').click();await page.waitForTimeout(150);await page.locator('[data-global-search-input]').fill('atlas');await page.waitForTimeout(50);
 assert.equal(errors.length,0,'Invalid index must not throw on input');assert.match(await page.locator('[data-global-search-status]').textContent(),/unavailable|utilgjengelig/);page.off('pageerror',handler);await page.keyboard.press('Escape');
 });await page.unrouteAll({behavior:'wait'});
 await check('article-ascii-search',async()=>{
 await open('artikler.html');const input=page.locator('#articleSearch');
 const pairs=locale==='nb'?[['gehør','gehor'],['første','forste'],['sekundær','sekundaer']]:[['Dorian','DORIAN']];
 for(const [native,ascii] of pairs){await input.fill(native);const expected=await page.locator('.article-card:visible').evaluateAll(es=>es.map(e=>e.dataset.articleId));assert(expected.length>0,native);await input.fill(ascii);assert.deepEqual(await page.locator('.article-card:visible').evaluateAll(es=>es.map(e=>e.dataset.articleId)),expected,ascii);}
 await input.fill('zzzz_no_match');assert(await page.locator('#noResults').isVisible());await page.locator('#resetArticles').click();assert.equal(await input.inputValue(),'');assert(await input.evaluate(e=>e===document.activeElement));
 });
 await check('theory-hash-history',async()=>{
 await open('teori.html#moduser');
 for(const [hash,topic] of [['#akkorder','chords'],['#intervaller','intervals'],['#kadenser','cadences'],['#moduser','modes']]){
 await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(t=>document.querySelector('[data-topic][aria-selected="true"]')?.dataset.topic===t,topic,{timeout:1500});}
 await page.goBack();await page.waitForFunction(()=>document.querySelector('[data-topic][aria-selected="true"]')?.dataset.topic==='cadences');assert.equal(await page.locator('[data-topic][aria-selected="true"]').getAttribute('data-topic'),'cadences');
 await open('teori.html?topic=intervals#akkorder');assert.equal(await page.locator('[data-topic][aria-selected="true"]').getAttribute('data-topic'),'intervals');
 await page.evaluate(()=>location.hash='#kadenser');await page.waitForFunction(()=>document.querySelector('[data-topic][aria-selected="true"]')?.dataset.topic==='cadences');
 });
 await check('responsive-and-200-percent',async()=>{
 await open('artikler.html');for(const zoom of [1,2]){await page.evaluate(z=>document.documentElement.style.zoom=z,zoom);await page.locator('[data-global-search-open]').click();await page.locator('[data-global-search-input]').fill('atlas');await page.locator('.global-search-result').first().waitFor();assert(await page.locator('[data-global-search-input]').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.keyboard.press('Escape');}
 });await context.close();
 }}finally{await browser.close();}}
}finally{await server.stop();fs.writeFileSync(out,JSON.stringify({rows,passed:rows.filter(r=>r.status==='passed').length,failed:rows.filter(r=>r.status==='failed').length},null,2));}
console.log(out);if(rows.some(r=>r.status==='failed'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
