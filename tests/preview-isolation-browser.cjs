'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve(process.env.MODUS_TEST_DIST||'dist'),meta=JSON.parse(fs.readFileSync(path.join(root,'preview-isolation.json')));
const policies=Object.fromEntries(fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n').filter(x=>x.startsWith('  ')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i).trim(),x.slice(i+1).trim()];}));
const serverWrites=[],records=[],attempts=[],localRequests=new Set(),fonts=new Set();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!['GET','HEAD'].includes(req.method)){serverWrites.push({method:req.method,path:url.pathname});return res.writeHead(405).end();}
 if(url.pathname==='/redirect-out')return res.writeHead(302,{Location:'https://blocked-backend.invalid/redirect'}).end();
 let fixture=url.pathname.match(/^\/__policy_(header|meta)_only__\/$/),file=path.resolve(root,'.'+decodeURIComponent(fixture?'/index.html':url.pathname));
 if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file))return res.writeHead(404).end();
 const headers={...policies,'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4'})[path.extname(file)]||'application/octet-stream'};
 if(fixture){
  let s=fs.readFileSync(file,'utf8').replace(/<script src="preview-guard.js"><\/script>/,'').replace('<head>','<head><base href="/">');
  if(fixture[1]==='header')s=s.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,'');else delete headers['Content-Security-Policy'];
  return res.writeHead(200,headers).end(s);
 }
 res.writeHead(200,headers);if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
});
function pages(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?pages(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const [name,type] of Object.entries({chromium,webkit})){
   const browser=await type.launch();
   try{
    const context=await browser.newContext();
    await context.route('**/*',async route=>{
     const r=route.request(),u=new URL(r.url());
     if(u.origin===base){localRequests.add(r.method+' '+u.pathname);return route.continue();}
     if(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin)){fonts.add(u.origin);return route.fulfill({status:200,contentType:'text/css',body:''});}
     attempts.push({browser:name,method:r.method(),origin:u.origin,path:u.pathname});return route.abort('blockedbyclient');
    });
    await context.addInitScript(()=>{
     const fake={access_token:'SYNTHETIC_DO_NOT_CONSUME',refresh_token:'SYNTHETIC_DO_NOT_REFRESH',expires_at:1,user:{id:'00000000-0000-4000-8000-000000000001',email:'synthetic@example.invalid'}};
     localStorage.setItem('modus-auth-v1',JSON.stringify(fake));localStorage.setItem('modus-editor-auth-v1',JSON.stringify(fake));
     localStorage.setItem('modus.pending.v1.'+fake.user.id,'["toner-og-intervaller"]');
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push({page:page.url(),message:e.message}));
    for(const file of pages(root)){
     const rel=path.relative(root,file).split(path.sep).join('/'),lang=rel.startsWith('en/')?'en':'nb';await page.goto(base+'/'+rel+'?lang='+lang);assert.equal(new URL(page.url()).pathname,'/'+rel);assert.equal(await page.locator('html').getAttribute('lang'),lang);
     assert(await page.evaluate(()=>window.ModusPreview?.ready),rel+' missing guard');
     assert.equal(await page.locator('a[href^="https://buy.stripe.com/"],a[href^="https://billing.stripe.com/"]').count(),0);
     assert(!await page.locator('body').innerText().then(s=>s.includes('SYNTHETIC_DO_NOT_')),rel+' exposed session');
     records.push({browser:name,page:rel,check:'all-public-pages',status:'passed'});
    }
    for(const locale of ['','en/']){
     await page.goto(base+'/'+locale+'konto.html?lang='+(locale?'en':'nb')+'&code=SYNTHETIC_CALLBACK#access_token=SYNTHETIC_CALLBACK');
     assert(!page.url().includes('SYNTHETIC_CALLBACK'));assert.equal(await page.locator('main form').count(),0);
     await page.locator('[data-preview-unavailable]').first().waitFor({state:'visible'});
     assert.deepEqual((await new AxeBuilder({page}).include('[data-preview-unavailable]').withTags(['wcag2a','wcag2aa']).analyze()).violations,[]);
     assert.equal(await page.evaluate(()=>window.ModusAccount.user),null);
     await page.evaluate(()=>{dispatchEvent(new Event('online'));dispatchEvent(new StorageEvent('storage',{key:'modus-auth-v1',newValue:'SYNTHETIC_DO_NOT_CONSUME'}));});
     assert(await page.evaluate(async()=>{const r=await ModusAccount.pass('toner-og-intervaller');return r.where==='device'&&ModusAccount.has('toner-og-intervaller')&&localStorage.getItem('modus-auth-v1').includes('SYNTHETIC_DO_NOT_CONSUME');}));
     await page.locator('.modus-feedback-toggle').click();await page.locator('.modus-feedback-status').waitFor({state:'visible'});assert(await page.locator('.modus-feedback-status').evaluate(e=>document.activeElement===e));
     assert(await page.locator('.modus-feedback-form input,.modus-feedback-form textarea,.modus-feedback-form select,.modus-feedback-send').evaluateAll(es=>es.every(e=>e.disabled)));
     await page.keyboard.press('Escape');
     await page.goto(base+'/'+locale+'redaktor.html?lang='+(locale?'en':'nb'));assert.equal(await page.locator('form,input,iframe').count(),0);assert(await page.locator('[data-preview-unavailable]').isVisible());
     await page.goto(base+'/'+locale+'?lang='+(locale?'en':'nb'));await page.waitForFunction(()=>document.body&&window.ModusPreview?.ready);
     const attack=await page.evaluate(async()=>{
      const out={},denied=async(k,fn)=>{try{await fn();out[k]=false;}catch{out[k]=true;}};
      await denied('external-fetch',()=>fetch('https://kwwsixmsdsilwcwpdbtc.supabase.co/rest/v1/preview_probe',{method:'POST',body:'SYNTHETIC'}));
      await denied('external-get',()=>fetch('//blocked-backend.invalid/read'));
      await denied('self-api',()=>fetch('/api/preview_probe'));
      await denied('self-post',()=>fetch('/search-index.json',{method:'POST',body:'SYNTHETIC'}));
      await denied('redirect',()=>fetch('/redirect-out'));
      await denied('xhr',()=>{const x=new XMLHttpRequest();x.open('POST','https://blocked-backend.invalid/write');x.send('SYNTHETIC');});
      await denied('socket',()=>new WebSocket('wss://blocked-backend.invalid/socket'));
      await denied('events',()=>new EventSource('https://blocked-backend.invalid/events'));
      out.beacon=navigator.sendBeacon('https://blocked-backend.invalid/beacon','SYNTHETIC')===false;
      const f=document.createElement('form');f.action='https://blocked-backend.invalid/form';f.method='POST';document.body.append(f);
      await denied('form-submit',()=>f.submit());await denied('request-submit',()=>f.requestSubmit());f.remove();
      out['self-get']=(await fetch('/search-index.json')).ok;
      return out;
     });assert(Object.values(attack).every(Boolean),JSON.stringify(attack));
     records.push({browser:name,locale:locale||'nb',check:'session/feedback/editor/local-progress/network-APIs',checks:attack,status:'passed'});
    }
    for(const policy of ['header','meta']){
     const policyContext=await browser.newContext();
     await policyContext.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base)return route.continue();if(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin))return route.fulfill({status:200,contentType:'text/css',body:''});attempts.push({browser:name,policy,origin:u.origin,path:u.pathname});return route.abort();});
     const page=await policyContext.newPage();
     const response=await page.goto(base+`/__policy_${policy}_only__/`);
     assert.equal(!!response.headers()['content-security-policy'],policy==='header');
     assert(!await page.evaluate(()=>!!window.ModusPreview),'Independent CSP fixture must omit JS guard');
     await page.evaluate(()=>{window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push(e.violatedDirective));});
     assert(await page.evaluate(()=>new Promise(resolve=>{const s=document.createElement('script');s.textContent="fetch('https://blocked-backend.invalid/csp').then(()=>window.cspResult(false),()=>window.cspResult(true))";window.cspResult=resolve;document.head.append(s);})));
     assert.deepEqual(attempts,[],JSON.stringify({policy,headers:response.headers(),meta:await page.locator('meta[http-equiv]').evaluateAll(es=>es.map(e=>e.outerHTML))}));
     await page.waitForFunction(()=>window.violations.some(s=>s.startsWith('connect-src')));
     records.push({browser:name,check:policy+'-CSP-without-JS-guard',status:'passed'});await policyContext.close();
    }
    // Storage failures preserve an in-memory guest and never activate auth.
    const offline=await browser.newContext();await offline.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await offline.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked storage');}}));
    const p=await offline.newPage();await p.goto(base+'/');assert(await p.evaluate(async()=>{await ModusAccount.pass('toner-og-intervaller');return ModusAccount.has('toner-og-intervaller')&&ModusAccount.user===null;}));await offline.close();
    // WebKit reports the deliberately blocked redirect as a page error even when fetch is caught.
    const expectedRedirectErrors=errors.filter(e=>name==='webkit'&&e.message.includes('/redirect-out due to access control checks.'));
    assert.deepEqual(errors.filter(e=>!expectedRedirectErrors.includes(e)),[]);
    records.push({browser:name,check:'no-unexpected-page-errors',expected_blocked_redirect_errors:expectedRedirectErrors.length,status:'passed'});await context.close();
   }finally{await browser.close();}
  }
  assert.deepEqual(attempts,[],'Unexpected outbound backend request attempts');assert.deepEqual(serverWrites,[],'Same-origin writes escaped the guard');
 }finally{
  fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/preview-isolation-browser-results.json',JSON.stringify({mode:meta.mode,source_sha:meta.source_sha,records,backend_outbound_attempts:attempts,same_origin_write_requests:serverWrites,local_request_inventory:[...localRequests].sort(),external_readonly_font_origins:[...fonts].sort(),test_external_requests_forwarded:0},null,2)+'\n');server.close();
 }
 console.log(`Isolated Preview: ${records.length} page/attack/CSP checks passed, zero backend attempts.`);
})().catch(e=>{console.error(e);process.exitCode=1});
