'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async function(browser,browserName,base){
 const records=[];
 for(const width of [1440,375])for(const locale of ['','en/']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const acknowledge=async()=>{const d=page.locator('.modus-premises-dialog[open]');if(await d.isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();await d.waitFor({state:'hidden'});}};
  const open=async path=>{await page.goto(base+'/'+locale+path);await acknowledge();};
  try{
   await open('laeringssti.html');assert.match(await page.locator('#f03-resume').innerText(),/0\/5/);assert.match(await page.locator('#f03-resume a').getAttribute('href'),/#understand$/);
   await page.evaluate(()=>localStorage.setItem('atlas-sentinel','unchanged'));
   await page.locator('#f03-resume a').click();await page.locator('#journey-check').waitFor();
   for(const id of ['understand','hear','play','explain','apply']){await page.locator(`.journey-shell nav a[href="#${id}"]`).click();await page.locator('#journey-check').check();}
   assert.equal(await page.locator('progress').getAttribute('value'),'5');
   await open('laeringssti.html');assert.match(await page.locator('#f03-resume a').innerText(),/Repeter|Review again/);
   await page.locator('#f03-resume a').click();await page.locator('#journey-check').uncheck();await page.reload();await acknowledge();assert.equal(await page.locator('progress').getAttribute('value'),'4');assert.equal(await page.locator('#journey-check').isChecked(),false);
   await page.locator('.journey-shell nav a[href="#play"]').click();await page.reload();await acknowledge();assert.equal(await page.locator('[aria-current="step"]').getAttribute('href'),'#play');
   await page.locator('#journey-check').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#journey-check').evaluate(e=>e===document.activeElement),true);
   await page.emulateMedia({reducedMotion:'reduce'});
   const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).display!=='none';}).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right})).slice(0,15)}));assert(overflow.width<=overflow.viewport+1,'Normal-width overflow: '+JSON.stringify(overflow));
   fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:`test-results/pl101-${browserName}-${width}-${locale?'en':'nb'}.png`,fullPage:true});
   await page.evaluate(()=>{document.documentElement.style.zoom='2';});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at CSS zoom 200%');
   await page.evaluate(()=>{document.documentElement.style.zoom='';});
   const beforeReset=await page.locator('progress').getAttribute('value');page.once('dialog',d=>d.dismiss());await page.locator('#journey-reset').click();assert.equal(await page.locator('progress').getAttribute('value'),beforeReset,'Cancelled reset preserves progress');page.once('dialog',d=>d.accept());await page.locator('#journey-reset').click();assert.equal(await page.locator('progress').getAttribute('value'),'0');assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-sentinel')),'unchanged');
   await page.evaluate(()=>localStorage.setItem('modus.learning-journey.F03.v1','{bad'));await open('laeringssti.html');assert.match(await page.locator('#f03-resume [role=status]').innerText(),/kunne ikke|could not/);
   await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));await open('f03-laeringsreise.html');await page.locator('#journey-check').check();assert.equal(await page.locator('progress').getAttribute('value'),'1');assert.match(await page.locator('#journey-storage').innerText(),/utilgjengelig|unavailable/);
   assert.equal(await page.locator('.journey-shell nav a').count(),5);assert.deepEqual(errors,[]);
   records.push({browser:browserName,width,locale:locale||'nb',status:'passed',zoom:'CSS zoom 200%, manual browser zoom pending'});
  }finally{await context.close();}
 }
 return records;
};
