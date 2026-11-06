'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const {startPublicPackageServer}=require('./public-package-server.cjs');
const root=path.resolve(process.env.MODUS_TEST_DIST||'../package'),baseline=path.resolve('release-inputs/published-d809a7b');
const out=path.resolve('test-results/navigation-current');fs.mkdirSync(out,{recursive:true});
async function open(page,base,locale){
 await page.goto(base+'/'+(locale==='en'?'en/':'')+'index.html?lang='+locale);
 if(await page.locator('.modus-premises-dialog[open]').count()){
  await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();
 }
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,950);
}
(async()=>{
 const original=await startPublicPackageServer(baseline),candidate=await startPublicPackageServer(root),rows=[];
 try{
  for(const [name,engine] of Object.entries({chromium,webkit})){
   const browser=await engine.launch();
   try{
    for(const locale of ['nb','en'])for(const width of [320,375,768,1440]){
     const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
     const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
     try{
      await open(page,original.origin,locale);const before=await page.locator('.site-header').screenshot({animations:'disabled'});
      await open(page,candidate.origin,locale);const after=await page.locator('.site-header').screenshot({animations:'disabled'});
      fs.writeFileSync(path.join(out,`${name}-${locale}-${width}-before.png`),before);fs.writeFileSync(path.join(out,`${name}-${locale}-${width}-after.png`),after);
      if(name==='chromium'&&locale==='nb'&&[375,1440].includes(width))await page.screenshot({path:path.join(out,`candidate-home-${width}.png`),animations:'disabled'});
      assert(before.equals(after),'Closed header pixels changed: '+name+'/'+locale+'/'+width);
      const hover=await page.evaluate(()=>matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)').matches);
      for(const id of ['nav-learn','nav-play']){
       const trigger=page.locator('#'+id),panel=page.locator('#'+await trigger.getAttribute('aria-controls'));
       await page.mouse.move(0,950);await trigger.hover();assert.equal(await trigger.getAttribute('aria-expanded'),String(hover));
       await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true','first pointer click');
       if(id==='nav-learn'&&name==='chromium'&&locale==='nb'&&[375,1440].includes(width))await page.screenshot({path:path.join(out,`candidate-menu-${width}.png`),animations:'disabled'});
       await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'false','second pointer click');
       await page.mouse.move(0,950);await trigger.hover();if(!hover)await trigger.click();
       const link=panel.locator('a').first();await link.hover();assert(await panel.isVisible(),'pointer-safe path to submenu');
       const destination=await link.getAttribute('href');await link.click();
       assert.equal(new URL(page.url()).pathname,new URL(destination,candidate.origin+'/'+(locale==='en'?'en/':'')+'index.html').pathname,'native submenu navigation');
       await open(page,candidate.origin,locale);
       await trigger.focus();await page.keyboard.press('Enter');assert.equal(await trigger.getAttribute('aria-expanded'),'true');
       await page.keyboard.press('Enter');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
       await page.keyboard.press('ArrowDown');assert(await panel.locator('a').first().evaluate(e=>document.activeElement===e));
       await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert(await trigger.evaluate(e=>document.activeElement===e));
       await trigger.focus();await page.keyboard.press('Space');assert.equal(await trigger.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');
      }
      await page.locator('#nav-learn').focus();await page.keyboard.press('Enter');await page.locator('#nav-play').focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('#nav-learn').getAttribute('aria-expanded'),'false');
      await page.locator('.site-header .brand').focus();assert.equal(await page.locator('#nav-play').getAttribute('aria-expanded'),'false');
      const learn=page.locator('#nav-learn');await learn.focus();await page.keyboard.press('Enter');await page.mouse.click(width-2,950);assert.equal(await learn.getAttribute('aria-expanded'),'false');
      await page.mouse.move(0,950);
      for(const theme of ['original','readable','contrast']){
       await page.evaluate(t=>window.ModusTheme.apply(t,true),theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
       for(const e of await page.locator('.site-header .site-nav>a,.site-header .nav-trigger,.nav-account,.language-picker a,.global-search-trigger,.theme-picker>summary').all()){
        const r=await e.boundingBox();assert(r.width>=43.9&&r.height>=43.9,'44px target');
       }
       if(width===375||width===1440){const a=await new AxeBuilder({page}).include('.site-header').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);}
      }
      const summary=page.locator('.theme-picker>summary');
      await summary.focus();await page.keyboard.press('Enter');assert(await page.locator('.theme-picker').evaluate(e=>e.open));
      assert(await page.locator('.theme-options').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));
      await page.keyboard.press('Escape');assert(await summary.evaluate(e=>document.activeElement===e));
      await summary.click();await page.locator('.theme-options input[value="readable"]').check();
      assert.equal(await page.locator('html').getAttribute('data-theme'),'readable');
      await summary.click();await page.locator('.theme-options input[value="original"]').check();
      assert.equal(await page.locator('html').getAttribute('data-theme'),'original');
      await page.waitForFunction(()=>!document.querySelector('.theme-picker').open&&document.querySelector('.header-tools').style.zIndex==='');
      const targetLanguage=locale==='nb'?'en':'nb';
      await page.locator('.language-picker [data-language="'+targetLanguage+'"]').click();
      await page.waitForURL(u=>targetLanguage==='en'?u.pathname.startsWith('/en/'):!u.pathname.startsWith('/en/'));
      assert.equal(await page.locator('html').getAttribute('lang'),targetLanguage);
      await open(page,candidate.origin,locale);
      if(width===1440){await page.setViewportSize({width:720,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200% desktop reflow');await learn.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');}
      assert.deepEqual(errors,[]);rows.push({browser:name,locale,width,input:'mouse and keyboard',pixelIdentical:true,themes:3,desktopReflow:width===1440,status:'passed'});
     }finally{await context.close();}
     const touch=await browser.newContext({viewport:{width,height:1000},hasTouch:true}),p=await touch.newPage();
     try{
      await open(p,candidate.origin,locale);
      for(const id of ['nav-learn','nav-play']){const trigger=p.locator('#'+id);await trigger.tap();assert.equal(await trigger.getAttribute('aria-expanded'),'true');await trigger.tap();assert.equal(await trigger.getAttribute('aria-expanded'),'false');}
      rows.push({browser:name,locale,width,input:'touch',status:'passed'});
     }finally{await touch.close();}
    }
   }finally{await browser.close();}
  }
 }finally{await Promise.all([original.stop(),candidate.stop()]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({root,rows},null,2)+'\n');}
 console.log(rows.length+' navigation scenarios passed; 16 header comparisons pixel-identical.');
})().catch(e=>{console.error(e);process.exitCode=1;});
