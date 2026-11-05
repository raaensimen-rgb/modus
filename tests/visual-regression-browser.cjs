'use strict';
// Local visual/keyboard audit of the public, isolated artifact. Never contacts a live app.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve('dist'),records=[],audits=[];
const routes=['index.html','laeringssti.html','laereplan.html','artikler.html','konto.html','backingtracks.html','akkorder.html','teori.html','musikkart.html','om-modus.html'];
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(p!==root&&!p.startsWith(root+path.sep))return res.writeHead(403).end();if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p))return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();fs.mkdirSync('test-results/session',{recursive:true});try{
for(const width of [320,375,768,1024,1440])for(const locale of ['','en/']){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes){await page.goto(base+'/'+locale+route+'?lang='+(locale?'en':'nb'));const notice=page.locator('.modus-premises-dialog[open]');if(await notice.isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();}await page.evaluate(()=>document.fonts.ready);await page.emulateMedia({reducedMotion:'reduce'});
 for(const theme of ['original','readable','contrast']){await page.evaluate(t=>window.ModusTheme.apply(t),theme);await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&s.visibility==='visible'&&s.display!=='none'&&(r.right>innerWidth+1||r.left< -1)&&!e.closest('.keyboard-wrap,.fret-scroll,.nav-tooltip');}).slice(0,12).map(e=>({tag:e.tagName,id:e.id,class:typeof e.className==='string'?e.className:'svg'}))}));records.push({width,locale:locale?'en':'nb',route,theme,...layout});
 if(width===375){const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();audits.push({width,locale:locale?'en':'nb',route,theme,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:audit.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
 if((width===320||width===1440)&&theme==='original'&&['index.html','backingtracks.html','akkorder.html','musikkart.html'].includes(route))await page.screenshot({path:`test-results/session/${route.replace('.html','')}-${width}-${locale?'en':'nb'}.png`,animations:'disabled'});
 }
 }assert.deepEqual(errors,[]);await context.close();console.log(`Visual audit completed: ${width}px ${locale||'nb'}`);
}
}finally{await browser.close();server.close();fs.writeFileSync('test-results/session/layout.json',JSON.stringify(records,null,2));fs.writeFileSync('test-results/session/accessibility.json',JSON.stringify(audits,null,2));}
assert.deepEqual(records.filter(r=>r.overflow),[],'Horizontal overflow');assert.deepEqual(audits.filter(r=>r.violations.length),[],'WCAG violations');console.log(`${records.length} layouts and ${audits.length} accessibility audits passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});
