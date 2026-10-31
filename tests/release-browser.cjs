'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, webkit} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}
  const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
  if(!fs.existsSync(target)){res.writeHead(404).end();return}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
  const size=fs.statSync(target).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const headers={'Content-Type':mime[path.extname(target)]||'application/octet-stream','Accept-Ranges':'bytes'};
  if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||size-1),size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(target,{start,end}).pipe(res)}
  else {res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(target).pipe(res)}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=process.env.MODUS_TEST_URL||`http://127.0.0.1:${server.address().port}`;
  const results=[];
  try {
    for(const [name,type] of Object.entries({chromium,webkit})) {
      const browser=await type.launch({headless:true});
      try {for(const width of [1440,375])for(const locale of ['', 'en/']) {
        const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===375}),page=await context.newPage();
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto(base+'/'+locale);
        // PL-098: both disclosure menus must survive hover -> click, submenu movement and touch.
        for(const key of ['learn','play']) {
          const menu=page.locator('#nav-'+key),panel=page.locator('#nav-panel-'+key),first=panel.locator('a').first();
          if(width===1440) {
            await menu.hover();assert(await panel.isVisible(),'Hover opens '+key);
            await menu.click();assert(await panel.isVisible(),'First hover click retains '+key);
            await first.hover();assert(await panel.isVisible(),'Moving to submenu retains '+key);
            await menu.click();assert(!(await panel.isVisible()),'Second pointer click closes '+key);
            await page.mouse.move(0,0);
          } else {
            await menu.tap();assert(await panel.isVisible(),'First touch opens '+key);
            await menu.tap();assert(!(await panel.isVisible()),'Second touch closes '+key);
          }
          await menu.focus();await menu.press('Enter');assert(await panel.isVisible(),'Enter opens '+key);
          await menu.press('Tab');assert(await first.evaluate(e=>e===document.activeElement),'Tab enters '+key);
          assert(await first.evaluate(e=>{
            const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return r.width>0&&r.height>0&&r.x>=0&&r.right<=innerWidth&&hit&&e.contains(hit);
          }),'Submenu target must fit and remain unobstructed: '+key);
          await first.press('Escape');assert(!(await panel.isVisible()));
          assert(await menu.evaluate(e=>e===document.activeElement),'Escape returns '+key+' focus');
          await menu.press('Space');assert(await panel.isVisible(),'Space opens '+key);
          await menu.press('ArrowDown');assert(await first.evaluate(e=>e===document.activeElement));
          await first.press('Escape');
          if(width===1440)await menu.hover();else await menu.tap();
          const target=new URL(await first.getAttribute('href'),page.url());
          if(width===1440)await first.click();else await first.tap();
          await page.waitForURL(url=>url.pathname.replace(/\.html$/,'')===target.pathname.replace(/\.html$/,''));
          await page.goto(base+'/'+locale);
        }
        const trigger=page.locator('[data-global-search-open]'),input=page.locator('[data-global-search-input]');
        assert(await trigger.isVisible());await trigger.click();await input.waitFor({state:'visible'});
        await input.press('Escape');assert(await trigger.evaluate(e=>document.activeElement===e));
        await trigger.click();await input.fill('dorisk');await page.locator('.global-search-result').first().waitFor();
        assert((await page.locator('.global-search-result').count())>0);
        await input.press('Escape');assert(await trigger.evaluate(e=>document.activeElement===e));
        await trigger.click();await input.fill('zzzzmissingtest');await page.waitForFunction(()=>document.querySelector('[data-global-search-status]').textContent.match(/Ingen treff|No matches/));
        await input.press('Escape');
        const film=page.locator('[data-intro-film-open]');assert(await film.isVisible());
        assert.equal(await film.innerText(),locale?'Watch the introduction':'Se introduksjonsfilmen');
        const media=await page.request.get(base+'/media/modus-introduksjon.mp4');assert.equal(media.status(),200);assert(media.headers()['content-type'].includes('video/mp4'));
        await film.click();await page.locator('.intro-film-dialog').waitFor({state:'visible'});
        await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2&&v.currentTime>0&&!v.paused}, undefined, {timeout:20000});
        assert(await page.locator('video').evaluate(v=>v.duration>38&&v.duration<39));
        await page.locator('video').evaluate(v=>v.pause());assert(await page.locator('video').evaluate(v=>v.paused));
        await page.locator('video').evaluate(v=>v.play());
        await page.keyboard.press('Escape');assert(await film.evaluate(e=>document.activeElement===e));
        assert(await page.locator('video').evaluate(v=>v.paused));
        await film.click();await page.locator('.intro-film-close').click();assert(await film.evaluate(e=>document.activeElement===e));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
        assert.deepEqual(errors,[]);
        const result={browser:name,width,locale:locale||'nb',status:'passed'};results.push(result);console.log(JSON.stringify(result));
        await context.close();
      }} finally {await browser.close()}
    }
  } finally {
    fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/browser-results.json',JSON.stringify(results,null,2));server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
