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
    assert.deepEqual(errors,[],'Initialization errors');await manual(page,test.id);assert.equal(await tonic.getAttribute('fill'),fill,'Manual playing preserves tonic colour');
    await page.locator('#'+test.play).click();await page.waitForFunction(id=>!!document.querySelector(`#${id} .piano-playing`),test.id);
    assert.equal(await tonic.getAttribute('fill'),fill,'Automatic playing preserves tonic colour');
    await page.locator('#'+test.stop).click();await waitIdle(page,test.id);
    // A key change while a manually held note is sounding releases the old voice.
    const held=page.locator(`#${test.id} [data-midi="64"]`);await held.dispatchEvent('pointerdown',{pointerId:103,button:0});await waitActive(page,test.id,64);
    await page.selectOption('#'+test.key,'2');await waitIdle(page,test.id);
    await page.emulateMedia({reducedMotion:'reduce'});const again=page.locator(`#${test.id} [data-midi="64"]`);await again.focus();await page.keyboard.down('Enter');await waitActive(page,test.id,64);
    assert.equal(await again.evaluate(k=>getComputedStyle(k.parentElement).transform),'none','Reduced motion disables movement');await page.keyboard.up('Enter');await waitIdle(page,test.id);await page.emulateMedia({reducedMotion:'no-preference'});
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
