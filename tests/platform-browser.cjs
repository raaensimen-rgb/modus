'use strict';
const assert=require('node:assert/strict');
module.exports=async function(browser,browserName,base){
 const results=[];
 for(const width of [1440,375])for(const locale of ['', 'en/']){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push({page:page.url(),message:e.message,stack:e.stack}));
  const acknowledge=async()=>{const d=page.locator('.modus-premises-dialog[open]');if(await d.isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();await d.waitFor({state:'hidden'});}};
  const open=async path=>{await page.goto(base+'/'+locale+path);await acknowledge();};
  try{
   for(const path of ['index.html','artikler.html','laeringssti.html','f03-laeringsreise.html','backingtracks.html','akkorder.html','teori.html','musikkart.html']){
    await open(path);
    assert.equal(await page.locator('.site-header').count(),1,path);
    if(path==='index.html'){
     assert.equal(await page.locator('.home-geometric').count(),1,path);
     assert.equal(await page.locator('.home-wordmark').innerText(),'MODUS',path);
    }else{
     assert.equal(await page.locator('.home-geometric').count(),1,path);
     assert.equal(await page.locator('.home-wordmark').innerText(),'MODUS',path);
    }
    const metrics=await page.locator('.site-header').evaluate(e=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,fonts:[...e.querySelectorAll('.site-nav>a,.nav-trigger')].map(x=>[getComputedStyle(x).fontSize,getComputedStyle(x).fontWeight])}));
    assert.equal(metrics.width,width);assert.equal(metrics.overflow,false,path);
    for(const [size,weight] of metrics.fonts){
     assert.equal(weight,'500',path);
     assert.equal(size,width>=1024?'14px':'11px','Approved shared reference navigation: '+path);
    }
   }
   if(!locale){
    const nodes=page.locator('.module-node');assert.equal(await nodes.count(),24);
    await nodes.first().focus();await page.keyboard.press('Enter');
    assert(await page.locator('#inspector-module').isVisible());
    await page.locator('[data-state="exploring"]').click();
    await page.locator('#map-personal-note').fill('Isolated platform QA note');
    assert.equal(await page.locator('#map-exploring').innerText(),'1');
    await page.reload();await acknowledge();
    await page.locator('.module-node').first().focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#map-personal-note').inputValue(),'Isolated platform QA note');
    assert.equal(await page.locator('[data-state="exploring"]').getAttribute('aria-pressed'),'true');
    page.once('dialog',d=>d.dismiss());await page.locator('#map-clear').click();
    assert.equal(await page.locator('#map-exploring').innerText(),'1');
    page.once('dialog',d=>d.accept());await page.locator('#map-clear').click();
    assert.equal(await page.locator('#map-exploring').innerText(),'0');
   }else{
    const nodes=page.locator('.module-node');
    assert.equal(await nodes.count(),24,'English Atlas must render all 24 interactive modules');
    assert.equal(await page.locator('script[src^="musikkart.js"]').count(),1,'English Atlas loads the shared runtime');
    await nodes.first().focus();await page.keyboard.press('Enter');
    assert(await page.locator('#inspector-module').isVisible(),'English inspector opens by keyboard');
    await page.locator('[data-state="exploring"]').click();
    await page.locator('#map-personal-note').fill('English Atlas parity QA');
    await page.reload();await acknowledge();
    await page.locator('.module-node').first().focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#map-personal-note').inputValue(),'English Atlas parity QA');
    page.once('dialog',d=>d.dismiss());await page.locator('#map-clear').click();
    assert.equal(await page.locator('#map-exploring').innerText(),'1','Cancelled reset retains state');
    page.once('dialog',d=>d.accept());await page.locator('#map-clear').click();
    assert.equal(await page.locator('#map-exploring').innerText(),'0','Confirmed reset clears state');
   }
   assert.deepEqual(errors,[]);
   results.push({browser:browserName,width,locale:locale||'nb',pages:8,atlas:'24 modules, keyboard, persistence, cancelled/confirmed reset',status:'passed'});
  }finally{await context.close();}
 }
 return results;
};
