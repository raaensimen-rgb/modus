'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const root=path.resolve(process.env.MODUS_TEST_DIST||'../package'),results=[],accessibility=[];
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file))return res.writeHead(404).end();
  const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  fs.mkdirSync('test-results',{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const [name,type] of Object.entries({chromium,webkit})){
      const browser=await type.launch();
      try{
        for(const width of [1536,1440,1024,768,375,320,160])for(const locale of ['','en/']){
          const context=await browser.newContext({viewport:{width,height:1024}}),page=await context.newPage(),errors=[];
          page.on('pageerror',e=>errors.push(e.message));
          await page.goto(base+'/'+locale);await page.evaluate(()=>document.fonts.ready);
          for(const theme of ['original','readable','contrast']){
            await page.evaluate(t=>window.ModusTheme.apply(t),theme);
            // Audit the chosen theme after finite color transitions have settled.
            await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
            assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}/${width}/${locale}/${theme}: overflow`);
            const geometry=await page.locator('.home-portal').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,h:r.height};}));
            assert.equal(geometry.length,4);
            assert(geometry.every(r=>r.x>=0&&r.right<=width&&r.w>=44&&r.h>=44));
            if(width>=320){
              assert(await page.locator('.home-portal h2').evaluateAll(nodes=>nodes.every(h=>{
                const range=document.createRange();range.selectNodeContents(h);
                const text=range.getBoundingClientRect(),card=h.closest('a').getBoundingClientRect();
                return text.left>=card.left&&text.right<=card.right-4;
              })),`${name}/${width}/${locale}/${theme}: entry heading overlaps adjacent card`);
              assert(await page.locator('.preview-chords>div').evaluateAll(nodes=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)),`${name}/${width}/${locale}/${theme}: clipped chord label`);
            }
            const a11y=await page.evaluate(()=>{
              const bad=[...document.querySelectorAll('main a,main button')].filter(e=>!e.textContent.trim()&&!e.getAttribute('aria-label'));
              return {bad:bad.length,h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,decorative:[...document.querySelectorAll('main svg')].every(e=>e.getAttribute('aria-hidden')==='true')};
            });
            assert.equal(a11y.bad,0);assert.equal(a11y.h1,1);assert.equal(a11y.lang,locale?'en':'nb');assert(a11y.decorative);
            if([1440,375].includes(width)){
              const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
              accessibility.push({browser:name,width,locale:locale?'en':'nb',theme,violations:audit.violations,incomplete:audit.incomplete});
            }
          }
          await page.evaluate(()=>window.ModusTheme.apply('original'));
          // Native keyboard skip link, visible focus, real route navigation and browser Back.
          // macOS WebKit uses Option-Tab to include links in keyboard navigation.
          await page.goto(base+'/'+locale);await page.keyboard.press(name==='webkit'?'Alt+Tab':'Tab');
          assert(await page.locator('.home-skip').evaluate(e=>e===document.activeElement && e.getBoundingClientRect().top>=0));
          await page.keyboard.press('Enter');assert(await page.locator('main').evaluate(e=>e===document.activeElement));
          for(const href of ['laeringssti.html','backingtracks.html','musikkart.html','artikler.html']){
            await page.locator(`.home-portal[href="${href}"]`).focus();
            assert(await page.locator(`.home-portal[href="${href}"]`).evaluate(e=>e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none'));
            await page.keyboard.press('Enter');await page.waitForURL(base+'/'+locale+href);
            await page.goBack();await page.locator('.home-portals').waitFor();
          }
          await page.locator('.home-philosophy a').click();await page.waitForURL(base+'/'+locale+'om-modus.html');
          await page.goBack();await page.locator('.home-portals').waitFor();
          // Check the actual account route without submitting credentials or forms.
          await page.locator('.nav-account').click();await page.waitForURL(base+'/'+locale+'konto.html');
          assert(await page.locator('main').isVisible());
          await page.goBack();await page.locator('.home-portals').waitFor();
          await page.emulateMedia({reducedMotion:'reduce'});
          assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).scrollBehavior),'auto');
          await page.evaluate(()=>scrollTo(0,0));
          if([1536,1440,1024,768,375,320].includes(width)){
            await page.screenshot({path:`test-results/homepage-${name}-${width}-${locale?'en':'nb'}.png`,fullPage:true});
            if(width===1536&&!locale&&name==='chromium')await page.screenshot({path:'test-results/homepage-reference-viewport.png'});
          }
          assert.deepEqual(errors,[]);
          results.push({browser:name,width,locale:locale?'en':'nb',themes:3,status:'passed'});
          console.log(`Homepage passed: ${name}, ${width}px, ${locale||'nb'}, all themes, keyboard and routes`);
          await context.close();
        }
        // Progressive enhancement: primary routes and copy remain usable without scripts.
        const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:375,height:900}});
        await page.goto(base+'/');assert.equal(await page.locator('.home-portal').count(),4);
        await page.locator('.home-portal[href="laeringssti.html"]').click();await page.waitForURL(base+'/laeringssti.html');await page.close();
      }finally{await browser.close();}
    }
    const violations=accessibility.filter(a=>a.violations.length).map(a=>({...a,incomplete:undefined,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}));
    assert.deepEqual(violations,[],'WCAG A/AA accessibility violations');
    assert.deepEqual(accessibility.flatMap(a=>a.incomplete.filter(v=>v.id!=='color-contrast').map(v=>({browser:a.browser,theme:a.theme,id:v.id}))),[],'Unresolved structural accessibility checks');
  }finally{
    fs.writeFileSync('test-results/homepage-browser-results.json',JSON.stringify(results,null,2)+'\n');server.close();
    fs.writeFileSync('test-results/homepage-accessibility.json',JSON.stringify(accessibility,null,2)+'\n');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
