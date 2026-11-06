'use strict';
// Current release contract: the approved 82-second film and 52 NB / 16 EN readers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {startPublicPackageServer}=require('./public-package-server.cjs');
const root=path.resolve(process.env.MODUS_TEST_DIST||'../package'),out=path.resolve('test-results');
(async()=>{
 const remote=process.env.MODUS_TEST_URL;
 assert(!remote||remote==='https://modus-4ye.pages.dev','Only the current production origin may be tested remotely');
 const server=remote?{stop:async()=>{}}:await startPublicPackageServer(root),base=remote||server.origin,rows=[];
 fs.mkdirSync(out,{recursive:true});
 try{
  for(const [name,engine] of Object.entries({chromium,webkit})){
   const browser=await engine.launch();
   try{
    rows.push(...await require('./platform-browser.cjs')(browser,name,base));
    rows.push(...await require('./learning-journey-browser.cjs')(browser,name,base));
    for(const locale of ['','en/'])for(const width of [375,1440]){
     const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
     let filmRequests=0;
     page.on('pageerror',e=>errors.push(e.message));
     page.on('request',r=>{if(r.url().endsWith('/media/modus-intro-81eed15e5f0f.mp4'))filmRequests++;});
     const open=async route=>{
      await page.goto(base+'/'+locale+route);
      if(await page.locator('.modus-premises-dialog[open]').count()){
       await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();
      }
     };
     try{
      await open('index.html');
      const search=page.locator('[data-global-search-open]'),input=page.locator('[data-global-search-input]');
      await search.click();await input.fill(locale?'Roman numerals':'sekundærdominanter');
      await page.locator('.global-search-result').first().waitFor();
      await input.press('Escape');assert(await search.evaluate(e=>document.activeElement===e));
      await search.click();await input.fill('zzzzmissingtest');
      await page.waitForFunction(()=>/Ingen treff|No matches/.test(document.querySelector('[data-global-search-status]').textContent));
      await input.press('Escape');
      assert.equal(filmRequests,0,'Film must not download before the user clicks');
      const film=page.locator('.intro-film-button[data-intro-film-open]');
      assert.equal(await film.innerText(),locale?'Watch the film ▷':'Se filmen ▷');
      await film.click();await page.locator('.intro-film-dialog').waitFor({state:'visible'});
      await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2&&v.currentTime>0&&!v.paused;},undefined,{timeout:25000});
      const video=page.locator('video');assert(await video.evaluate(v=>v.duration>80&&v.duration<85));
      await video.evaluate(v=>{v.pause();v.currentTime=40;});
      await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-40)<1&&!document.querySelector('video').seeking);
      await video.evaluate(v=>v.play());await page.keyboard.press('Escape');
      assert(await film.evaluate(e=>e===document.activeElement));assert(await video.evaluate(v=>v.paused));
      await page.locator('.introduction-poster[data-intro-film-open]').click();await page.locator('.intro-film-close').click();
      assert(await page.locator('.introduction-poster').evaluate(e=>e===document.activeElement));
      assert.equal(filmRequests,1,'The local Blob is reused');
      await open('artikler.html');assert.equal(await page.locator('.article-card').count(),locale?16:52);
      for(const mode of ['list','grid']){
       await page.locator('[data-card-layout-choice='+mode+']').click();assert.equal(await page.locator('#library').getAttribute('data-card-layout'),mode);
      }
      if(name==='chromium'&&width===1440){
       const links=await page.locator('.article-card a').evaluateAll(es=>[...new Set(es.map(e=>e.href.split('#')[0]))]);assert.equal(links.length,locale?16:52);
       for(const url of links){await page.goto(url);assert.equal(await page.locator('h1').count(),1);assert((await page.locator('main').innerText()).length>1000);assert.equal(await page.locator('[data-publication-hold]').count(),0);}
       rows.push({browser:name,locale:locale||'nb',articles:links.length,fulltexts:true,status:'passed'});
      }
      await open('redaktor.html');assert.equal(await page.locator('[data-preview-unavailable]').count(),1);assert.equal(await page.locator('input,textarea').count(),0);
      assert.deepEqual(await (await page.request.get(base+'/cms-seed.json')).json(),[]);
      for(const pre of ['','en/'])for(const route of ['admin-app.js','admin-package.json','editor.js','editor-admin.js','library-draft-backup.json','content/articles.json','editorial/article-publication-review.json','media/modus-introduksjon.mp4','audio/kick.mp3']){
       assert.equal((await page.request.get(base+'/'+pre+route)).status(),404,pre+route);
      }
      assert.deepEqual(errors,[]);rows.push({browser:name,locale:locale||'nb',width,search:true,filmPlaybackSeekFocus:true,catalog:true,privateBoundary:true,status:'passed'});
     }finally{await context.close();}
    }
   }finally{await browser.close();}
  }
 }finally{await server.stop();fs.writeFileSync(path.join(out,'release-current.json'),JSON.stringify({base,root,rows},null,2)+'\n');}
 console.log(rows.length+' current release scenarios passed; all 68 public fulltexts opened.');
})().catch(e=>{console.error(e);process.exitCode=1;});
