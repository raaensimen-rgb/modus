'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const publicIds=require('./publication-helper.cjs');
module.exports=async(browser,browserName,base)=>{
 const records=[];
 for(const width of [1440,375])for(const locale of ['','en/']){
  const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async path=>{await page.goto(base+'/'+locale+path);if(await page.locator('.modus-premises-dialog[open]').isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();}};
  try{
   await open('artikler.html');assert.equal(await page.locator('.article-card').count(),locale?16:52);assert.equal(publicIds(locale?'en':'nb').length,locale?16:52);assert.equal(await page.locator('#publicationPending,.catalog-preview-card').count(),0);
   const first=page.locator('.article-card').first(),link=first.locator('.card-main');assert(await link.getAttribute('href'));await link.click();assert.equal(await page.locator('[data-publication-hold]').count(),0);await page.locator('[data-quiz-id]').waitFor();assert(await page.locator('.reading-illustration img').evaluate(e=>e.complete&&e.naturalWidth>0));
   await open('artikler.html');await page.locator('#articleSearch').fill(locale?'circle of fifths':'kvintsirkelen');assert.equal(await page.locator('.article-card:visible').count(),1);await page.locator('#articleSearch').fill('');await page.locator('.compact-topics>summary').click();await page.locator('[data-topic-filter="chords"]').click();assert(await page.locator('.article-card:visible').count()>0);await page.locator('[data-group-by="topic"]').click();await page.locator('#articleSearch').fill('zz-no-metadata-match');assert(await page.locator('#noResults').isVisible());await page.locator('#resetArticles').click();assert.equal(await page.locator('.article-card:visible').count(),locale?16:52);await page.locator('[data-group-by="order"]').click();
   const columns=await page.locator('.article-grid:visible').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,width===375?2:4);await page.evaluate(()=>{document.documentElement.style.zoom='2';});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>{document.documentElement.style.zoom='';});
   fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:`test-results/publication-${browserName}-${width}-${locale?'en':'nb'}.png`,fullPage:true});
   // Private lesson bodies and runtimes remain held; the public article route is an index only.
   for(const path of ['undervisning.html?modul=F03','laer-dorisk.html']){await open(path);assert.equal(await page.locator('[data-publication-hold]').count(),1,path);assert.equal(await page.locator('#f03-piano,[data-quiz-id],.foundation-exercise').count(),0);assert.equal(await page.locator('script[src*="f03-atelier"],script[src*="undervisning.js"],script[src*="course.js"]').count(),0);}
   await open('grunnstudier.html');assert.equal(await page.locator('.route-step').count(),locale?16:52);assert.equal(await page.locator('[data-publication-hold],#f03-piano,.foundation-exercise,[data-quiz-id]').count(),0);assert.equal(await page.locator('script[src*="course.js"],script[src*="f03-atelier"]').count(),0);
   const r=await page.request.get(base+'/cms-seed.json');assert.equal(r.status(),200);const seed=await r.json();assert.equal(seed.length,0);assert(seed.every(a=>publicIds(a.locale).includes(a.slug)));assert(!JSON.stringify(seed).includes('private_notes'));
   for(const p of ['/f03-atelier.js','/undervisning.js','/course.js','/en/f03-atelier.js','/content/articles.json','/editorial/legacy/undervisning.html']){const r=await page.request.get(base+p);assert.equal(r.status(),404,'Unselected private resource: '+p);}
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{document.documentElement.style.zoom='2';});assert(await page.evaluate(()=>document.querySelector('main').getBoundingClientRect().right<=innerWidth+1));assert.deepEqual(errors,[]);records.push({browser:browserName,width,locale:locale||'nb',publicArticles:locale?16:52,privateLessonsStillHeld:true,status:'passed'});
  }finally{await ctx.close();}
 }
 return records;
};
