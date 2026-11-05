'use strict';
// Regression contract for the approved 3 November DES-002.2 header.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium,webkit}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve('dist'),records=[],audits=[];
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file))return res.writeHead(404).end();
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 fs.mkdirSync('test-results/des002-mobile',{recursive:true});
 try{for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{for(const width of [320,375,768,1024,1440])for(const locale of ['','en/']){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/'+locale+'?lang='+(locale?'en':'nb'));
   await page.evaluate(()=>document.fonts.ready);await page.emulateMedia({reducedMotion:'reduce'});
   if(width===1440&&process.env.MODUS_DESKTOP_BASELINE_CSS){
    const snapshot=()=>[document.querySelector('.site-header'),...document.querySelectorAll('.site-header *')].map(e=>({tag:e.tagName,cls:e.getAttribute('class'),style:getComputedStyle(e).cssText,rect:JSON.stringify(e.getBoundingClientRect().toJSON()),properties:['display','fontSize','color','background','padding','gap','width','height','gridTemplateColumns','gridTemplateRows'].map(k=>getComputedStyle(e)[k])}));
    const current=await page.evaluate(snapshot),baseline=await page.addStyleTag({content:fs.readFileSync(process.env.MODUS_DESKTOP_BASELINE_CSS,'utf8')});
    assert.deepEqual(await page.evaluate(snapshot),current,'Approved desktop rendering unchanged');await baseline.evaluate(e=>e.remove());
   }
   const href=await page.locator('link[rel=stylesheet]').evaluateAll(es=>es.at(-1).getAttribute('href'));
   assert.match(href,/^home-2\.[a-f0-9]{10}\.css$/,'Homepage override loads last, with content hash');
   const bytes=await (await page.request.get(base+'/'+locale+href)).body();
   assert(href.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,10)),'CSS URL matches bytes');
   assert(!/[\u{1F1E6}-\u{1F1FF}]/u.test(await page.locator('.header-tools').textContent()),'No flag characters in homepage controls');
   assert.equal(await page.locator('.header-tools .home-control-icon').count(),6);
   assert.equal(await page.locator('.header-tools .home-control-icon path[d="m12 2 10 10-10 10L2 12 12 2Z"]').count(),0,'No diamond frames');
   const languages=await page.locator('.language-picker .home-control-icon').evaluateAll(es=>es.map(e=>e.innerHTML));assert.equal(languages[0],languages[1],'Harmonized language symbols');
   assert.equal(await page.locator('.theme-picker .home-control-icon path[fill="currentColor"]').count(),1,'Half-filled display symbol');
   for(const theme of ['original','readable','contrast']){
    await page.evaluate(t=>ModusTheme.apply(t),theme);
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    const controls=await page.locator('.header-tools > .nav-membership,.header-tools > .nav-account,.header-tools > .global-search-trigger,.header-tools .language-picker>a,.header-tools .theme-picker>summary').evaluateAll(es=>es.map(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e),icon=e.querySelector('svg').getBoundingClientRect();
     const text=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());const range=document.createRange();range.selectNode(text);const label=range.getBoundingClientRect();
     return {label:e.textContent,width:r.width,height:r.height,font:parseFloat(s.fontSize),border:s.borderTopWidth,radius:s.borderRadius,iconBottom:icon.bottom,labelTop:label.top,pseudos:['::before','::after'].map(p=>({border:getComputedStyle(e,p).borderTopWidth,width:getComputedStyle(e,p).width,content:getComputedStyle(e,p).content}))};
    }));
    for(const c of controls){assert(c.width>=44&&c.height>=44,JSON.stringify(c));assert(c.font<=10);assert.equal(c.border,'0px');assert.equal(c.radius,'0px');assert(c.iconBottom<=c.labelTop+1,'Icon above label: '+JSON.stringify(c));assert(c.pseudos.every(p=>p.border==='0px'),'No pseudo-element button frame');}
    if(width>=320&&width<=375){
     const grid=await page.evaluate(()=>{
      const selectors=['.nav-membership','.nav-account','[data-language="nb"]','[data-language="en"]','.global-search-trigger','.theme-picker>summary'];
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
      return {tools:selectors.map(s=>rect(document.querySelector('.header-tools '+s))),menu:[...document.querySelector('.site-nav').children].map(rect)};
     });
     for(const cells of [grid.tools,grid.menu]){
      assert.equal(cells.length,6);assert(cells.slice(0,3).every(c=>Math.abs(c.y-cells[0].y)<1));assert(cells.slice(3).every(c=>Math.abs(c.y-cells[3].y)<1),JSON.stringify({width,locale,theme,grid}));assert(cells[3].y>cells[0].y);
      for(let i=0;i<3;i++)assert(Math.abs(cells[i].x-cells[i+3].x)<1,'Aligned three-column rows');
     }
     assert(grid.tools.every(c=>Math.abs(c.w-grid.tools[0].w)<1&&c.w>=44&&c.h>=44),'Equal touch targets');
    }
    const badge=await page.locator('.nav-membership').evaluate(e=>{
     const label=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()),range=document.createRange();range.selectNode(label);
     const text=range.getBoundingClientRect(),status=e.querySelector('.nav-coming').getBoundingClientRect(),target=e.getBoundingClientRect();
     return {separate:status.top>=text.bottom,inside:status.left>=target.left&&status.right<=target.right,position:getComputedStyle(e.querySelector('.nav-coming')).position,font:getComputedStyle(e.querySelector('.nav-coming')).fontSize,textBottom:text.bottom,statusTop:status.top,statusLeft:status.left,statusRight:status.right,targetLeft:target.left,targetRight:target.right};
    });assert(badge.separate&&badge.inside&&badge.position==='absolute','Coming status must not squeeze/overlap MODUS+: '+JSON.stringify({name,width,locale,theme,badge}));
    const trigger=page.locator('.global-search-trigger');await page.keyboard.press(name==='webkit'?'Alt+Tab':'Tab');await trigger.focus();
    assert(await trigger.evaluate(e=>e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none'));
    if([1440,375].includes(width)){
     await page.mouse.move(1,990);await page.evaluate(()=>document.activeElement.blur());
     const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();audits.push({name,width,locale:locale?'en':'nb',theme,violations:audit.violations});
    }
   }
   await page.evaluate(()=>ModusTheme.apply('original'));
   await page.locator('#nav-learn').focus();await page.keyboard.press('ArrowDown');assert(await page.locator('#nav-panel-learn').isVisible());await page.keyboard.press('Escape');
   if(width<=375){
    for(const [id,route] of [['learn','laeringssti.html'],['play','backingtracks.html']]){
     await page.locator('#nav-'+id).click();assert(await page.locator('#nav-panel-'+id).isVisible());await page.locator('#nav-panel-'+id+' a').first().click();await page.waitForURL(u=>u.pathname.endsWith('/'+route));await page.goto(base+'/'+locale+'?lang='+(locale?'en':'nb'));
    }
   }
   await page.locator('.global-search-trigger').click();await page.locator('[data-global-search-input]').fill('atlas');await page.locator('.global-search-result').first().waitFor();await page.keyboard.press('Escape');
   await page.locator('.theme-picker summary').click();assert(await page.locator('.theme-options').isVisible());await page.keyboard.press('Escape');
   await page.locator('[data-language="'+(locale?'nb':'en')+'"]').click();await page.waitForURL(u=>locale?!u.pathname.startsWith('/en/'):u.pathname.startsWith('/en/'));
   assert.equal(await page.locator('html').getAttribute('lang'),locale?'nb':'en');
   await page.goto(base+'/'+locale+'?lang='+(locale?'en':'nb'));await page.evaluate(()=>document.fonts.ready);await page.mouse.move(1,990);
   await page.screenshot({path:`test-results/des002-mobile/${name}-${width}-${locale?'en':'nb'}.png`,animations:'disabled'});
   if([1440,320,375].includes(width))await page.locator('.site-header').screenshot({path:`test-results/des002-mobile/${name}-header-${width}-${locale?'en':'nb'}.png`,animations:'disabled'});
   assert.deepEqual(errors,[]);records.push({name,width,locale:locale?'en':'nb',themes:3,status:'passed'});await context.close();console.log(`Reference header passed: ${name}/${width}/${locale||'nb'}`);
  }}finally{await browser.close();}
 }}finally{server.close();fs.writeFileSync('test-results/des002-mobile/results.json',JSON.stringify({records,audits},null,2));}
 assert.deepEqual(audits.filter(x=>x.violations.length),[],'WCAG violations');console.log(`${records.length} header cases, ${audits.length} accessibility audits passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});
