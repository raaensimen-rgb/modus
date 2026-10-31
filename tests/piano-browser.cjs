'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const cases=[
 {url:'teori.html',id:'theoryKeyboard',play:'listen',stop:'listen',key:'theoryKey'},
 {url:'akkorder.html',id:'chordKeyboard',play:'playSelected',stop:'playProgression',key:'jamKey'},
 {url:'backingtracks.html',id:'fretboard',play:'play',stop:'play',key:'key',jam:true},
];
async function openPage(page,url){
 await page.goto(url);
 const notice=page.locator('.modus-premises-dialog[open]');
 if(await notice.isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();await notice.waitFor({state:'hidden'});}
}
async function waitActive(page,id,midi){await page.waitForFunction(({id,midi})=>document.querySelector(`#${id} [data-midi="${midi}"]`)?.dataset.playing==='true',{id,midi});}
async function waitIdle(page,id){await page.waitForFunction(id=>!document.querySelector(`#${id} .piano-playing`),id);}
async function manual(page,id){
 const key=page.locator(`#${id} [data-midi="64"]`);await key.scrollIntoViewIfNeeded();await key.focus();
 await key.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('data-midi'),'65','Arrow focus follows chromatic pitch');
 await page.keyboard.down('Enter');await waitActive(page,id,65);
 if(await page.locator(`#${id} .piano-active-label`).count())assert.equal(await page.locator(`#${id} [data-midi="65"] + .piano-active-label text`).textContent(),'F','Label follows the sounded F, not the tonic');
 await page.keyboard.up('Enter');await waitIdle(page,id);
 await key.focus();await page.keyboard.down('Space');await waitActive(page,id,64);await page.keyboard.up('Space');await waitIdle(page,id);
 await key.dispatchEvent('pointerdown',{pointerId:101,pointerType:'touch',button:0});await waitActive(page,id,64);
 await page.locator(`#${id} [data-midi="67"]`).dispatchEvent('pointerdown',{pointerId:102,pointerType:'touch',button:0});await waitActive(page,id,67);
 assert.equal(await page.locator(`#${id} .piano-playing`).count(),2,'Two independent touch voices');
 await key.dispatchEvent('pointercancel',{pointerId:101});await page.locator(`#${id} [data-midi="67"]`).dispatchEvent('pointerup',{pointerId:102});await waitIdle(page,id);
}
// Observe real BufferSource schedules and ended events; no simulated audio clock.
async function theoryTiming(page) {
 await page.evaluate(()=>{
  const probe=window.__theoryProbe={voices:[],frames:[],running:true};
  const original=theoryPiano.track;
  theoryPiano.track=(source,midi,start,end,context)=>{
   const voice={midi,start,end,context,source,ended:false,stop:null};probe.voices.push(voice);
   const stop=source.stop.bind(source);source.stop=t=>{voice.stop=t;return stop(t);};
   source.addEventListener('ended',()=>{voice.ended=true;voice.endedAt=context.currentTime;},{once:true});
   return original(source,midi,start,end,context);
  };
  const sample=()=>{
   if(!probe.running)return;
   if(probe.voices.length){
    const now=probe.voices[0].context.currentTime;
    const expected=probe.voices.filter(v=>!v.ended&&now>=v.start&&now<v.end).map(v=>v.midi);
    const actual=[...document.querySelectorAll('#theoryKeyboard .piano-playing')].map(k=>Number(k.dataset.midi));
    const boundary=probe.voices.some(v=>Math.abs(now-v.start)<.06||Math.abs(now-v.end)<.06);
    const keys=[...document.querySelectorAll('#theoryKeyboard .piano-playing')];
    probe.frames.push({now,expected,actual,boundary,keys:keys.map(k=>({midi:Number(k.dataset.midi),kind:k.dataset.keyKind,transform:getComputedStyle(k.parentElement).transform,label:k.nextElementSibling.textContent}))});
   }
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });
 await page.locator('#listen').click();
 await page.waitForFunction(()=>window.__theoryProbe.voices.length===8&&window.__theoryProbe.voices.every(v=>v.ended));
 await waitIdle(page,'theoryKeyboard');
 const result=await page.evaluate(()=>{
  const p=window.__theoryProbe;p.running=false;
  return {frames:p.frames,voices:p.voices.map(v=>({midi:v.midi,end:v.end,expectedEnd:Math.min(v.start+v.source.buffer.duration/v.source.playbackRate.value,v.stop),endedAt:v.endedAt}))};
 });
 assert.equal(result.voices.length,8,'Complete ascending scale sounds eight actual sources');
 for(const v of result.voices)assert(Math.abs(v.end-v.expectedEnd)<.000001,'Visual note-off matches buffer duration or actual scheduled source.stop, including release tail');
 const stable=result.frames.filter(f=>!f.boundary);assert(stable.length>10,'Sampled audio-clock frames away from note boundaries');
 for(const f of stable)assert.deepEqual([...f.actual].sort((a,b)=>a-b),[...new Set(f.expected)].sort((a,b)=>a-b),'Active keys follow actual scheduled audio clock');
 assert(stable.some(f=>f.actual.length>1),'Overlapping source tails retain both keys');
 for(const f of stable)for(const k of f.keys)assert.equal(k.label,({64:'E',66:'F♯',67:'G',69:'A',71:'B',73:'C♯',74:'D',76:'E'})[k.midi],'Automatic label names the actual sounding key');
 for(const kind of ['white','black'])assert(stable.some(f=>f.keys.some(k=>k.kind===kind&&k.transform!=='none')),'Visible pressed movement for '+kind+' keys');
 await page.locator('#listen').click();await page.waitForFunction(()=>!!document.querySelector('#theoryKeyboard .piano-playing'));
 await page.selectOption('#modeChoice','2');await waitIdle(page,'theoryKeyboard');
 await page.waitForTimeout(120);assert.equal(await page.locator('#theoryKeyboard .piano-playing').count(),0,'Mode rerender cancels sounding and queued notes');
 await page.locator('#listen').click();await page.waitForFunction(()=>!!document.querySelector('#theoryKeyboard .piano-playing'));
 await page.locator('#listen').click();await waitIdle(page,'theoryKeyboard');await page.selectOption('#modeChoice','1');
 return {sources:result.voices.length,clockFrames:stable.length,whiteAndBlack:true,overlap:true,restartAndModeChange:true};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=process.env.MODUS_TEST_URL||`http://127.0.0.1:${server.address().port}`,results=[];
 try{for(const [browserName,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{for(const width of [1440,375])for(const locale of ['', 'en/']){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const test of cases){
    await openPage(page,`${base}/${locale}${test.url}`);
    if(test.jam)await page.selectOption('#mapInstrument','piano');
    const tonic=page.locator(`#${test.id} [data-tonic="true"]`).first(),fill=await tonic.getAttribute('fill');
    assert.deepEqual(errors,[],'Initialization errors');if(test.id==='theoryKeyboard'){const timing=await theoryTiming(page);results.push({browser:browserName,width,locale:locale||'nb',page:test.url,timing,status:'passed'});}await manual(page,test.id);assert.equal(await tonic.getAttribute('fill'),fill,'Manual playing preserves tonic colour');
    await page.locator('#'+test.play).click();await page.waitForFunction(id=>!!document.querySelector(`#${id} .piano-playing`),test.id);
    assert.equal(await tonic.getAttribute('fill'),fill,'Automatic playing preserves tonic colour');
    await page.locator('#'+test.stop).click();await waitIdle(page,test.id);
    // A key change while a manually held note is sounding releases the old voice.
    const held=page.locator(`#${test.id} [data-midi="64"]`);await held.dispatchEvent('pointerdown',{pointerId:103,button:0});await waitActive(page,test.id,64);
    await page.selectOption('#'+test.key,'2');await waitIdle(page,test.id);
    await page.emulateMedia({reducedMotion:'reduce'});const again=page.locator(`#${test.id} [data-midi="64"]`);await again.focus();await page.keyboard.down('Enter');await waitActive(page,test.id,64);
    assert.equal(await again.evaluate(k=>getComputedStyle(k.parentElement).transform),'none','Reduced motion disables movement');await page.keyboard.up('Enter');await waitIdle(page,test.id);if(test.id==='theoryKeyboard'){const black=page.locator('#theoryKeyboard [data-midi="66"]');await black.focus();await page.keyboard.down('Enter');await waitActive(page,test.id,66);assert.equal(await black.evaluate(k=>getComputedStyle(k.parentElement).transform),'none','Reduced motion disables black-key movement too');await page.keyboard.up('Enter');await waitIdle(page,test.id);}await page.emulateMedia({reducedMotion:'no-preference'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');
    results.push({browser:browserName,width,locale:locale||'nb',page:test.url,status:'passed'});console.log(JSON.stringify(results.at(-1)));
   }
   if(!locale){
    await openPage(page,base+'/undervisning.html?modul=F03');await manual(page,'f03-piano');
    await page.locator('#f03-listen').click();await page.waitForTimeout(700);
    assert.equal(await page.locator('#f03-piano .piano-playing').count(),0,'Hidden ear-training answer is not disclosed');
    await openPage(page,base+'/undervisning.html');await page.locator('.mini-keys [data-midi="65"]').focus();await page.keyboard.down('Enter');await page.waitForFunction(()=>document.querySelector('.mini-keys [data-midi="65"]').dataset.playing==='true');await page.keyboard.up('Enter');
    results.push({browser:browserName,width,locale:'nb',page:'F03 and generic demonstration',status:'passed'});
   }
   assert.deepEqual(errors,[],'No JavaScript runtime errors');await context.close();
  }}finally{await browser.close();}
 }}finally{fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/piano-browser-results.json',JSON.stringify(results,null,2));server.close();}
 console.log('Passed piano browser cases: '+results.length);
})().catch(e=>{console.error(e);process.exitCode=1;});
