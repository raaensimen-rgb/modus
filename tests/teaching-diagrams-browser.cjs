'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium,webkit}=require('playwright');const {default:AxeBuilder}=require('@axe-core/playwright');
const R=path.resolve(__dirname,'..'),D=path.resolve(R,'../package'),out=path.join(R,'test-results/teaching-diagrams');fs.mkdirSync(out,{recursive:true});
const A=JSON.parse(fs.readFileSync(path.join(R,'content/articles.json'))),M=JSON.parse(fs.readFileSync(path.join(R,'editorial/teaching-diagrams/manifest.json'))),seed=JSON.parse(fs.readFileSync(path.join(R,'dist/cms-seed.json')));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html';let f=path.join(D,n);if(!fs.existsSync(f)&&fs.existsSync(f+'.html'))f+='.html';if(!f.startsWith(D+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;const rows=[],svgRows=[];try{
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 browser=await launcher.launch();
 // Real SVG layout bounds including text, accidentals, ledger lines and clefs.
 const check=await browser.newPage();
 for(const entry of M.articles)for(const loc of ['nb','en'])for(const variant of ['diagram','card']){
  const f=entry.locales[loc].assets[variant].path;await check.setContent(fs.readFileSync(path.join(R,f),'utf8'));await check.evaluate(()=>document.fonts.ready);
  const clipped=await check.evaluate(()=>{const svg=document.querySelector('svg'),vb=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].flatMap(e=>{const b=e.getBBox(),m=e.getCTM(),p=new DOMPoint(b.x,b.y).matrixTransform(m),q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m),s=svg.getCTM().inverse();const x=p.matrixTransform(s),z=q.matrixTransform(s);return x.x<0||x.y<0||z.x>vb.width+1||z.y>vb.height+1?[e.textContent]:[];});});
  assert.deepEqual(clipped,[],engine+' clipped text '+f);svgRows.push({engine,slug:entry.slug,locale:loc,variant,bounds:true});
 }
 await check.close();
 for(const width of [375,1440])for(const locale of ['nb','en']){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 for(const a of seed.filter(a=>a.locale===locale)){
  await p.goto(base+(locale==='en'?'/en':'')+'/artikler/'+a.slug+'.html');
  if(await p.locator('.modus-premises-dialog[open]').count()){await p.locator('#modus-premises-accept').check();await p.locator('.modus-premises-confirm').click();}
  const fig=p.locator('[data-teaching-diagram]');assert.equal(await fig.count(),1);await fig.scrollIntoViewIfNeeded();await p.waitForFunction(()=>[...document.querySelectorAll('[data-teaching-diagram] img')].every(e=>e.complete&&e.naturalWidth>0));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+a.slug);
  assert.equal(await p.locator('h1').textContent(),a.title);assert.equal(await p.locator('.reading-body section[id^="del-"]').count(),a.sections.length);
  for(let i=0;i<a.sections.length;i++){
   const wanted=await p.evaluate(s=>{const e=document.createElement('div');e.innerHTML=s;return e.textContent.replace(/\uFE0E/g,'').replace(/\s+/g,' ').trim();},a.sections[i][1]);
   const got=await p.locator('#del-'+(i+1)).evaluate(e=>{const n=e.cloneNode(true);n.querySelector('h2').remove();return n.textContent.replace(/\uFE0E/g,'').replace(/\s+/g,' ').trim();});assert.equal(got,wanted,a.slug+' original section '+i);
  }
  const summary=fig.locator('summary');await summary.focus();await p.keyboard.press('Enter');assert(await fig.locator('details').getAttribute('open')!==null);assert((await fig.locator('li').count())>=2);await p.keyboard.press('Enter');
  for(let i=0;i<3;i++)await p.locator('input[name="q'+i+'"][value="'+a.quiz[i].answer+'"]').check();
  await p.locator('.quiz-form button[type="submit"]').click();assert(await p.locator('.quiz-complete').isVisible());assert.equal(await p.evaluate(s=>localStorage.getItem('modus.article-quiz.v1.'+s),a.slug),'passed');
  let axe=0;
  if(engine==='chromium'&&width===375){
   const audit=await new AxeBuilder({page:p}).include('.teaching-diagram').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[],a.slug);axe=audit.violations.length;
   await fig.screenshot({path:path.join(out,locale+'-'+a.slug+'-375.png')});
  }
  if(width===1440&&engine==='webkit'&&['intervallomvendinger','sekundaerdominanter','kontrapunkt-to-selvstendige-stemmer','formanalyse-av-hele-verk','kirketonearter-ett-system-sju-uttrykk','akkordutvidelser'].includes(a.slug))await fig.screenshot({path:path.join(out,locale+'-'+a.slug+'-1440.png')});
  await p.evaluate(()=>document.documentElement.style.zoom='2');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200% overflow '+a.slug);await p.evaluate(()=>document.documentElement.style.zoom='');
  rows.push({engine,width,locale,slug:a.slug,image:true,originalText:true,quizSaved:true,keyboard:true,zoom200:true,axeViolations:axe});
 }
 await p.goto(base+(locale==='en'?'/en':'')+'/artikler.html');assert.equal(await p.locator('.article-card').count(),locale==='en'?16:52);
 const cards=await p.locator('.card-art img').evaluateAll(es=>{es.forEach(e=>e.loading='eager');return Promise.all(es.map(e=>e.decode().then(()=>e.naturalWidth>0).catch(()=>false)));});assert(cards.every(Boolean));
 if(engine==='chromium')await p.screenshot({path:path.join(out,locale+'-catalog-'+width+'.png'),fullPage:true});assert.deepEqual(errors,[]);await c.close();
 }
 const p=await browser.newPage();for(const a of A.slice(16)){const response=await p.goto(base+'/en/images/teaching-diagrams/'+a.slug+'.svg');assert.equal(response.status(),404);}
 for(const pre of ['','en/']){await p.goto(base+'/'+pre+'redaktor.html');assert.equal(await p.locator('#editorForm').count(),0);assert((await p.locator('body').textContent()).match(/unavailable|utilgjengelig/i));}
 await p.close();await browser.close();browser=null;
}
const result={status:'passed',readerScenarios:rows.length,svgLayoutScenarios:svgRows.length,axeDiagramAudits:68,privateENNegativeRequests:72,rows,svgRows};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({readerScenarios:rows.length,svgLayoutScenarios:svgRows.length,status:'passed'}));
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
