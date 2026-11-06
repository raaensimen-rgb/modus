'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium,webkit}=require('playwright'),{startPublicPackageServer}=require('./public-package-server.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../delivery');fs.mkdirSync(out,{recursive:true});
(async()=>{const server=await startPublicPackageServer(path.resolve(root,'../package')),rows=[];let browser;
try{for(const [engine,type] of Object.entries({chromium,webkit})){
 browser=await type.launch();for(const locale of ['nb','en'])for(const width of [320,375,768,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),p=await context.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/\/audio\//.test(r.url()))requests.push(r.url());});
 await p.addInitScript(()=>{window.__audioContexts=0;for(const name of ['AudioContext','webkitAudioContext']){const Original=window[name];if(Original)window[name]=new Proxy(Original,{construct(t,args){window.__audioContexts++;return Reflect.construct(t,args);}});}});
 await p.goto(server.origin+(locale==='en'?'/en':'')+'/artikler/dorisk-og-eolisk.html');
 if(await p.locator('.modus-premises-dialog[open]').count()){await p.locator('#modus-premises-accept').check();await p.locator('.modus-premises-confirm').click();}
 const exercise=p.locator('[data-article-jam]');assert(await exercise.isVisible());assert(await exercise.locator('a').getAttribute('href'));
 await p.evaluate(()=>localStorage.setItem('modus-v1',JSON.stringify({key:0,mode:0,tempo:150,harmony:'drone'})));
 await exercise.screenshot({path:path.join(out,`${engine}-${locale}-${width}-exercise.png`)});
 await exercise.locator('a').click();await p.waitForSelector('#chords .chord');
 assert.equal(await p.locator('#key').inputValue(),'4');assert.equal(await p.locator('#mode').inputValue(),'1');assert.equal(await p.locator('#bpm').inputValue(),'90');assert.equal(await p.locator('#harmony').inputValue(),'custom');
 assert.deepEqual(await p.locator('#chords .chord strong').allTextContents(),['Em7','A7','Em7','A7']);
 assert.equal(await p.evaluate(()=>window.__audioContexts),0);assert.equal(requests.length,0);assert.equal(await p.locator('#play').isEnabled(),true);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Deterministic failure path: missing samples must leave transport recoverable.
 await p.route('**/audio/**',r=>r.abort());await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#error').textContent.length>0);
 assert(await p.locator('#play').isEnabled());assert.equal(await p.locator('#playIcon').innerText(),'▶');assert.equal(errors.length,0);
 rows.push({engine,locale,width,configured:true,noAutoplay:true,staleStorageOverridden:true,audioFailureRecoverable:true,overflow:false});await context.close();
 }await browser.close();browser=null;
}fs.writeFileSync(path.join(out,'ARTICLE-JAM-BROWSER.json'),JSON.stringify(rows,null,2));console.log(rows.length+' article → Jam browser scenarios passed');
}finally{if(browser)await browser.close();await server.stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
