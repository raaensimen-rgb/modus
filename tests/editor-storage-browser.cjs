'use strict';
// Actual editor + synthetic SDK: no real Auth, table reads, writes or credentials.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/red-002a');
const fixture=locale=>({slug:'synthetic-editor',locale,title:'Synthetic '+locale,intro:'Synthetic introduction',level:'beginner',category:'basics',sections:[['Synthetic heading','<p>Synthetic body</p>']],exercise:'Synthetic exercise',quiz:Array.from({length:3},(_,i)=>({question:'Question '+i,options:['A','B','C'],answer:0,explanation:'Synthetic explanation',section:1}))});
const fixtures=['nb','en'].map(fixture);
const stub=`export function createClient(){
 let user=new URLSearchParams(location.search).has('cloud')?{id:'synthetic-user',email:'synthetic@example.invalid'}:null;
 const initial=${JSON.stringify(fixtures)};
 const state=window.__EDITOR_TEST={calls:[],revision:3,failRPC:false,failAfterRPC:false,payloads:structuredClone(initial),publications:structuredClone(initial)};
 const result=table=>({error:null,data:table==='cms_editors'?{user_id:'synthetic-user'}:table==='cms_article_drafts'?state.payloads.map(payload=>({slug:payload.slug,locale:payload.locale,payload:structuredClone(payload),revision:state.revision})):table==='cms_article_publications'?initial.map(a=>({slug:a.slug,locale:a.locale,revision:3})):[]});
 return {auth:{getUser:async()=>({data:{user}}),onAuthStateChange:()=>{},signOut:async()=>{user=null;return {}; }},from(table){const q={then(resolve,reject){return Promise.resolve(result(table)).then(resolve,reject)}};for(const m of ['select','eq','neq','order','limit','maybeSingle'])q[m]=()=>q;return q;},rpc:async(name,args)=>{state.calls.push({name,args:structuredClone(args)});if(name!=='cms_save_draft')throw Error('Unexpected publishing RPC');if(state.failRPC)return {error:{code:'OFFLINE',message:'Synthetic offline'}};if(args.p_expected_revision!==state.revision)return {error:{code:'40001'}};state.payloads=state.payloads.map(a=>a.locale===args.p_locale?structuredClone(args.p_payload):a);state.revision++;if(state.failAfterRPC)window.__failStorage=true;return {data:state.revision,error:null};}};
}`;
const localKey=(locale='nb',cloud=false)=>`modus.editor.local.v1.${cloud?'synthetic-user':'preview'}.${locale}:synthetic-editor`;
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const bundle=await build({entryPoints:[path.join(root,'client/editor.js')],bundle:true,format:'esm',write:false,plugins:[{name:'synthetic-sdk',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'synthetic-sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:stub,loader:'js'}));b.onLoad({filter:/supabase-config\.json$/},()=>({contents:'{"url":"https://offline.invalid","publishableKey":"synthetic-not-a-credential"}',loader:'json'}));}}]});
 const html=fs.readFileSync(path.join(root,'cms/editor.html'),'utf8').replace(/<link\b[^>]*>/g,'');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/editor.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(p==='/cms-seed.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixtures));}else if(p==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 let browser;const cases=[],external=[],errors=[];const record=s=>{cases.push(s);console.log('PASS '+s);};
 try{
  browser=await chromium.launch({headless:true});
  async function page({cloud=false,locale='nb',saved=null}={}){
   const context=await browser.newContext({acceptDownloads:true});
   await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});
   await context.addInitScript(({saved,key})=>{if(window.top!==window)return;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){if(window.__failStorage)throw new DOMException('Synthetic quota','QuotaExceededError');return original.apply(this,args);};if(saved)localStorage.setItem(key,JSON.stringify(saved));},{saved,key:localKey(locale,cloud)});
   const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
   await p.goto(origin+(cloud?'/?cloud':''));
   if(!cloud)await p.locator('#tryEditor').click();
   if(locale==='en')await p.locator('#editorLocale').selectOption('en');
   await p.locator('#editorArticleList button').click();
   return p;
  }
  async function stored(p,locale='nb',cloud=false){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),localKey(locale,cloud));}
  async function clickSave(p,expected){await p.locator('#saveDraft').click();await p.waitForFunction(s=>document.querySelector('#editorStatus').textContent.includes(s),expected);}
  async function confirmAction(p,id,accept){const dialogEvent=p.waitForEvent('dialog');const click=typeof id==='function'?id():p.locator(id).click();const d=await dialogEvent;const message=d.message();await (accept?d.accept():d.dismiss());await click;return message;}
  async function download(p){const event=p.waitForEvent('download');await p.locator('#downloadDraft').click();const d=await event;return JSON.parse(fs.readFileSync(await d.path(),'utf8'));}
  for(const locale of ['nb','en']){
   const immediate=await page({locale});
   for(const event of ['pagehide','visibilitychange']){
    const title='Synthetic immediate '+event+' '+locale;
    await immediate.evaluate(({title,event})=>{
     const field=document.querySelector('#field-title');field.value=title;field.dispatchEvent(new Event('input',{bubbles:true}));
     if(event==='pagehide')window.dispatchEvent(new Event(event));
     else{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event(event));}
    },{title,event});
    assert.equal((await stored(immediate,locale)).article.title,title);
    assert.deepEqual(await immediate.evaluate(()=>window.__EDITOR_TEST.calls),[]);
   }
   record('LIFECYCLE-'+locale+': pending edits flushed immediately on pagehide/hidden without RPC');
   const p=await page({locale});await p.locator('#field-title').fill('Synthetic edit '+locale);await p.waitForFunction(k=>!!localStorage.getItem(k),localKey(locale));assert.equal((await stored(p,locale)).article.title,'Synthetic edit '+locale);await clickSave(p,'Lagret lokalt');assert.deepEqual(await p.evaluate(()=>window.__EDITOR_TEST.calls),[]);assert.equal((await stored(p,locale)).article.slug,'synthetic-editor');record('STORE-'+locale+': autosave/manual save, identity and locale preserved');
   const q=await page({locale});await q.evaluate(()=>window.__failStorage=true);await q.locator('#field-title').fill('Synthetic unsaved '+locale);await q.waitForFunction(()=>document.querySelector('#editorStatus').classList.contains('error'));await q.waitForTimeout(650);assert.match(await q.locator('#editorStatus').textContent(),/kunne ikke lagres/);await clickSave(q,'kunne ikke lagres');assert.equal(await q.locator('#editorStatus').getAttribute('class'),'editor-status error');assert.equal(await stored(q,locale),null);assert.equal((await download(q)).title,'Synthetic unsaved '+locale);
   // Dirty content cannot be discarded by an internal transition after quota failure.
   assert.match(await confirmAction(q,'#newArticle',false),/Lokal lagring mislyktes/);assert.equal(await q.locator('#field-title').inputValue(),'Synthetic unsaved '+locale);
   const other=locale==='nb'?'en':'nb';await confirmAction(q,()=>q.locator('#editorLocale').selectOption(other),false);assert.equal(await q.locator('#editorLocale').inputValue(),locale);
   await confirmAction(q,'#exitPreview',false);assert.equal(await q.locator('#editorWorkspace').isVisible(),true);
   // Chromium beforeunload prompt is evidence that dirty remains set after failed save.
   const closing=q.waitForEvent('dialog');const navigation=q.evaluate(()=>{location.href='/?attempted-navigation';});const d=await closing;assert.equal(d.type(),'beforeunload');await d.dismiss();await navigation;assert.equal(await q.locator('#field-title').inputValue(),'Synthetic unsaved '+locale);record('QUOTA-'+locale+': error persists, export works, transitions/beforeunload retain dirty content');
   await q.evaluate(()=>window.__failStorage=false);await clickSave(q,'Lagret lokalt');assert.equal((await stored(q,locale)).article.title,'Synthetic unsaved '+locale);record('RETRY-'+locale+': storage recovery succeeds explicitly');
  }
  const p=await page({cloud:true});const originalPublic=await p.evaluate(()=>window.__EDITOR_TEST.publications);await p.locator('#field-title').fill('Synthetic cloud revision');await clickSave(p,'versjon 4');assert.equal(await p.evaluate(()=>window.__EDITOR_TEST.calls[0].args.p_expected_revision),3);assert.equal((await stored(p,'nb',true)).revision,4);assert.deepEqual(await p.evaluate(()=>window.__EDITOR_TEST.publications),originalPublic);assert.equal(await p.locator('#publishArticle').isDisabled(),true);record('CLOUD-SAVE: expected revision, returned revision, publication unchanged/disabled');
  await p.evaluate(()=>window.__EDITOR_TEST.revision++);await p.locator('#field-title').fill('Synthetic conflict');await clickSave(p,'annen fane');assert.equal((await stored(p,'nb',true)).article.title,'Synthetic conflict');assert.equal(await p.evaluate(()=>window.__EDITOR_TEST.calls.at(-1).args.p_expected_revision),4);assert.equal(await p.locator('#editorRevision').textContent(),'Versjon 4');record('RPC-CONFLICT: stale expected revision rejected, no rebase/retry');
  const failed=await page({cloud:true});await failed.evaluate(()=>window.__failStorage=true);await failed.locator('#field-title').fill('Synthetic failed safety copy');await clickSave(failed,'kunne ikke lagres');assert.deepEqual(await failed.evaluate(()=>window.__EDITOR_TEST.calls),[]);assert.equal((await download(failed)).title,'Synthetic failed safety copy');record('CLOUD-QUOTA: safety-copy failure aborts RPC and leaves export available');await confirmAction(failed,'#editorSignOut',true);await failed.waitForFunction(()=>document.querySelector('#editorStatus').textContent==='Logget ut.');record('QUOTA-SIGNOUT: explicit discard permits secure signout after backup/export opportunity');
  const finalFailure=await page({cloud:true});await finalFailure.evaluate(()=>window.__EDITOR_TEST.failAfterRPC=true);await finalFailure.locator('#field-title').fill('Synthetic saved only in cloud');await clickSave(finalFailure,'men den lokale kopien');assert.equal(await finalFailure.locator('#editorStatus').evaluate(e=>e.classList.contains('error')),true);assert.equal(await finalFailure.evaluate(()=>window.__EDITOR_TEST.revision),4);assert.equal((await download(finalFailure)).title,'Synthetic saved only in cloud');record('POST-RPC-QUOTA: cloud success distinguished from failed local update; error retained');
  const network=await page({cloud:true});await network.evaluate(()=>window.__EDITOR_TEST.failRPC=true);await network.locator('#field-title').fill('Synthetic RPC failure');await clickSave(network,'Kunne ikke lagre på kontoen');assert.equal((await stored(network,'nb',true)).article.title,'Synthetic RPC failure');record('RPC-FAILURE: local backup retained, no success');
  for(const locale of ['nb','en']){
   const saved={article:{...fixture(locale),title:'Synthetic old '+locale},revision:1,savedAt:'2026-01-01T00:00:00Z'};
   const r=await page({cloud:true,locale,saved});assert.match(await r.locator('#editorStatus').textContent(),/Revisjonskonflikt/);
   const original=await r.locator('#field-title').inputValue();const warning=await confirmAction(r,'#restoreLocal',false);assert.match(warning,/versjon 1/);assert.match(warning,/versjon 3/);assert.equal(await r.locator('#field-title').inputValue(),original);assert.equal((await stored(r,locale,true)).revision,1);assert.equal(await r.locator('#restoreLocal').isVisible(),true);assert.deepEqual(await r.evaluate(()=>window.__EDITOR_TEST.calls),[]);record('RESTORE-CANCEL-'+locale+': explicit conflict can be cancelled without content/RPC mutation');
   await confirmAction(r,'#restoreLocal',true);assert.equal(await r.locator('#field-title').inputValue(),'Synthetic old '+locale);await clickSave(r,'versjon 4');const local=await stored(r,locale,true);assert.equal(local.recovery.sourceRevision,1);assert.equal(local.recovery.sourceSavedAt,saved.savedAt);assert.equal(local.recovery.replacementBaseRevision,3);assert.equal(local.revision,4);assert.equal(await r.evaluate(()=>window.__EDITOR_TEST.calls[0].args.p_expected_revision),3);assert.deepEqual(await r.evaluate(()=>window.__EDITOR_TEST.publications),fixtures);record('RESTORE-ACCEPT-'+locale+': explicit replacement, original revision/timestamp retained, CAS and public snapshot preserved');
  }
  const stale=await page({cloud:true,saved:{article:{...fixture('nb'),title:'Synthetic race'},revision:1}});await confirmAction(stale,'#restoreLocal',true);await stale.evaluate(()=>window.__EDITOR_TEST.revision=4);await clickSave(stale,'annen fane');assert.equal(await stale.evaluate(()=>window.__EDITOR_TEST.calls.length),1);assert.equal((await stored(stale,'nb',true)).recovery.sourceRevision,1);assert.equal(await stale.evaluate(()=>window.__EDITOR_TEST.calls[0].args.p_expected_revision),3);record('RESTORE-RACE: post-confirmation cloud change rejects restore save, zero automatic retry');
  const same=await page({cloud:true,saved:{article:{...fixture('nb'),title:'Synthetic same base'},revision:3}});await same.locator('#restoreLocal').click();await clickSave(same,'versjon 4');assert.equal((await stored(same,'nb',true)).recovery.sourceRevision,3);record('RESTORE-SAME: same-base restore remains supported');
  const unknown=await page({cloud:true,saved:{article:{...fixture('nb'),title:'Synthetic unknown base'}}});assert.match(await confirmAction(unknown,'#restoreLocal',false),/ukjent versjon/);assert.equal(await unknown.locator('#field-title').inputValue(),'Synthetic nb');record('RESTORE-UNKNOWN: legacy missing revision requires confirmation, cancel is safe');
  const cancel=await page();await cancel.locator('#field-title').fill('Synthetic cancel transition');await confirmAction(cancel,'#newArticle',false);assert.equal(await cancel.locator('#field-title').inputValue(),'Synthetic cancel transition');assert.equal((await stored(cancel)).article.title,'Synthetic cancel transition');record('TRANSITION-CANCEL: cancellation keeps content and backup');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  const result={source_head:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),editor_sha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'client/editor.js'))).digest('hex'),cases,unexpectedExternalRequests:external,pageErrors:errors,scope:'Synthetic SDK + actual editor; not a live database/RLS attestation'};
  fs.writeFileSync(path.join(out,'editor-storage.json'),JSON.stringify(result,null,2)+'\n');console.log(cases.join('\n'));console.log(`${cases.length}/${cases.length} passed; 0 external requests; 0 page errors`);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
