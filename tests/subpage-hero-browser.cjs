'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const {startPublicPackageServer}=require('./public-package-server.cjs');
const routes=['laeringssti','laereplan','undervisning','teori','backingtracks','akkorder','grunnstudier','laer-dorisk','f03-laeringsreise'];
(async()=>{const server=await startPublicPackageServer(path.resolve('../package')),out=path.resolve('../evidence');fs.mkdirSync(out,{recursive:true});let browser;const rows=[];
try{for(const [engine,launcher] of Object.entries({chromium,webkit})){
 browser=await launcher.launch();
 for(const locale of ['nb','en'])for(const width of [320,375,768,1440])for(const route of routes){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+(locale==='en'?'/en':'')+'/'+route+'.html?lang='+locale);await p.evaluate(()=>document.fonts.ready);
 if(await p.locator('.modus-premises-dialog[open]').count()){await p.locator('#modus-premises-accept').check();await p.locator('.modus-premises-confirm').click();}
 const hero=p.locator('.subpage-hero,.shared-hero-page .journey-shell>header');await hero.waitFor();assert.equal(await hero.locator('h1').count(),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} ${locale} ${width} ${route} overflow`);
 for(const a of await hero.locator('a').all()){const b=await a.boundingBox();assert(b.height>=44,route+' target');await a.focus();assert(await a.evaluate(e=>document.activeElement===e));}
 if(width===375||width===1440){for(const mode of (engine==='chromium'?['original','readable','contrast']:['original'])){await p.evaluate(mode=>window.ModusTheme.apply(mode,true),mode);const audit=await new AxeBuilder({page:p}).include('.subpage-hero,.shared-hero-page .journey-shell>header').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})),[],`${engine} ${locale} ${width} ${route} ${mode}`);}
 await p.evaluate(()=>window.ModusTheme.apply('original',true));}
 if(engine==='chromium'&&['backingtracks','laeringssti','laereplan','akkorder','undervisning','f03-laeringsreise'].includes(route)&&[375,1440].includes(width)){
 await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,`${route}-${locale}-${width}.png`)});await hero.screenshot({path:path.join(out,`${route}-${locale}-${width}-hero.png`)});}
 if(width===1440){await p.evaluate(()=>document.documentElement.style.zoom='2');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' zoom overflow');}
 assert.deepEqual(errors,[],route+' browser errors');rows.push({engine,locale,width,route,status:'passed'});await c.close();
 }await browser.close();browser=null;
}fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(rows,null,2));console.log(`${rows.length} responsive scenarios passed`);
}finally{if(browser)await browser.close();await server.stop();}})().catch(e=>{console.error(e);process.exitCode=1});
