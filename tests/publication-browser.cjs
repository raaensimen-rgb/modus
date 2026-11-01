'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const publicIds=require('./publication-helper.cjs');
const {execFileSync}=require('node:child_process');
const previewCards=JSON.parse(execFileSync('python3',['-c',"import sys,json;sys.path.insert(0,'scripts');from publication import preview_catalog_cards;print(json.dumps({l:preview_catalog_cards(locale=l) for l in ('nb','en')}))"],{encoding:'utf8'}));
module.exports=async(browser,browserName,base)=>{
 const records=[];
 for(const width of [1440,375])for(const locale of ['','en/']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const open=async path=>{
   await page.goto(base+'/'+locale+path);
   if(await page.locator('.modus-premises-dialog[open]').isVisible()){
    await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();
   }
  };
  try{
   await open('artikler.html');
   assert.equal(await page.locator('.article-card').count(),publicIds(locale?'en':'nb').length);
   const pending=page.locator('#publicationPending');
   assert.equal(await pending.getAttribute('data-source-count'),'16');
   assert.equal(await pending.getAttribute('data-published-count'),'0');
   const metadata=previewCards[locale?'en':'nb'];
   assert((await pending.innerText()).includes(metadata.length?(locale?'Article library · in progress':'Artikkelbibliotek · under arbeid'):(locale?'The library is preserved':'Biblioteket er bevart')));
   const cards=page.locator('.catalog-preview-card');assert.equal(await cards.count(),metadata.length);
   if(metadata.length)assert.equal(await page.locator('.catalog-preview-note').innerText(),metadata.length+(locale?' article cards · full text unavailable':' artikkelkort · fulltekst ikke tilgjengelig'));
   for(const item of metadata){
    const c=page.locator(`[data-catalog-id="${item.slug}"]`);
    assert.equal(await c.getByRole('heading').innerText(),item.title);
    assert((await c.innerText()).includes(item.category_label));
    assert((await c.innerText()).includes(locale?'In progress':'Under arbeid'));
    assert.equal(await c.locator('a,button,input,script,[tabindex],[onclick]').count(),0);
    const image=c.locator('.catalog-preview-art img');assert.equal(await image.count(),1);
    assert.equal(await image.getAttribute('alt'),'');
    assert.equal(await image.getAttribute('src'),'images/articles/'+item.slug+'.svg');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(slug=>{const img=document.querySelector(`[data-catalog-id="${slug}"] img`);return img.complete&&img.naturalWidth>0;},item.slug);
    const bounds=await c.evaluate(e=>{const r=e.getBoundingClientRect(),a=e.querySelector('.catalog-preview-art').getBoundingClientRect(),copy=e.querySelector('.card-copy').getBoundingClientRect(),image=e.querySelector('img').getBoundingClientRect();return {card:r.width,art:a.width,height:a.height,imageWidth:image.width,imageHeight:image.height,copyTop:copy.top,artBottom:a.bottom};});
    assert(bounds.art<=bounds.card+1&&bounds.height>80&&bounds.imageWidth<=bounds.art+1&&bounds.imageHeight<=bounds.height+1&&bounds.copyTop>=bounds.artBottom-1,'Illustration fits above title');
   }
   if(metadata.length){
    const location=page.url();await cards.first().getByRole('heading').click();assert.equal(page.url(),location);
    await cards.first().locator('img').click();assert.equal(page.url(),location);
    await page.locator('#articleSearch').fill(locale?'circle of fifths':'kvintsirkelen');
    assert.equal(await page.locator('.catalog-preview-card:visible').count(),1);
    await page.locator('#articleSearch').fill('');
    await page.locator('[data-topic-filter="chords"]').click();
    assert.equal(await page.locator('.catalog-preview-card:visible').count(),metadata.filter(x=>x.category==='chords').length);
    await page.locator('[data-group-by="topic"]').click();
    await page.locator('#articleSearch').fill('zz-no-metadata-match');
    assert(await page.locator('#noResults').isVisible());
    await page.locator('#resetArticles').click();assert.equal(await page.locator('.catalog-preview-card:visible').count(),metadata.length);
    assert(await page.locator('#articleSearch').evaluate(e=>e===document.activeElement));
    await page.keyboard.press('Tab');assert(await page.evaluate(()=>!document.activeElement.closest('.catalog-preview-card')));
    await page.locator('[data-group-by="order"]').click();
    const columns=await page.locator('.article-grid:visible').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,width===375?1:3);
   }
   assert.equal(await pending.locator('img,script,[data-article-id],a[href*="artikler/"]').count(),0,'Notice must not link to or embed private articles');
   await page.locator('#articleSearch').fill('unpublished-check');
   assert.equal(await page.locator('.article-card:visible').count(),0);
   await page.locator('#articleSearch').fill('');
   assert.equal(await page.locator('.catalog-preview-card:visible').count(),metadata.length);
   await page.evaluate(()=>{document.documentElement.style.zoom='2';});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Catalog fits CSS zoom 200%');
   await page.evaluate(()=>{document.documentElement.style.zoom='';});
   assert(await page.evaluate(w=>innerWidth===w&&document.documentElement.scrollWidth<=w+1,width));
   fs.mkdirSync('test-results',{recursive:true});
   if(metadata.length)await cards.first().screenshot({path:`test-results/publication-card-${browserName}-${width}-${locale?'en':'nb'}.png`});
   await page.screenshot({path:`test-results/publication-${browserName}-${width}-${locale?'en':'nb'}.png`,fullPage:true,
    style:'.site-header .nav-tooltip { display:none!important }'});
   for(const path of ['undervisning.html?modul=F03','laer-dorisk.html','grunnstudier.html','artikler/toner-og-intervaller.html']){
    await open(path);
    assert.equal(await page.locator('[data-publication-hold]').count(),1,path);
    assert.equal(await page.locator('#f03-piano,[data-quiz-id],.foundation-exercise').count(),0);
    assert.equal(await page.locator('script[src*="f03-atelier"],script[src*="undervisning.js"],script[src*="course.js"]').count(),0);
   }
   const seed=await page.request.get(base+'/cms-seed.json');assert.equal(seed.status(),200);
   assert.deepEqual(await seed.json(),[],'No private article/quiz payload in the public CMS seed');
   for(const path of ['/f03-atelier.js','/undervisning.js','/course.js','/en/f03-atelier.js','/content/articles.json','/editorial/legacy/undervisning.html']){
    const response=await page.request.get(base+path);assert.equal(response.status(),404,'Private resource must be absent: '+path);
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>{document.documentElement.style.zoom='2';});
   assert(await page.evaluate(()=>document.querySelector('main').getBoundingClientRect().right<=innerWidth+1),'Holding page fits CSS 200%');
   assert.deepEqual(errors,[]);
   records.push({browser:browserName,width,locale:locale||'nb',status:'passed',zoom:'CSS 200%; actual browser zoom pending independent QA'});
  }finally{await context.close();}
 }
 return records;
};
