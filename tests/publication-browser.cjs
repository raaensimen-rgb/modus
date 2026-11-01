'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const publicIds=require('./publication-helper.cjs');
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
   await page.locator('#articleSearch').fill('unpublished-check');
   assert.equal(await page.locator('.article-card:visible').count(),0);
   await page.locator('#articleSearch').fill('');
   assert(await page.evaluate(w=>innerWidth===w&&document.documentElement.scrollWidth<=w+1,width));
   fs.mkdirSync('test-results',{recursive:true});
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
