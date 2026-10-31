'use strict';
/* Observe real samples at the final Web Audio output; UI animation is not proof of sound. */
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium,webkit}=require('playwright'),root=path.resolve('dist');
const server=http.createServer((req,res)=>{
 const name=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!name.startsWith(root+path.sep)||!fs.existsSync(name)||!fs.statSync(name).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'})[path.extname(name)]||'application/octet-stream');fs.createReadStream(name).pipe(res);
});
function meter(){
 const probe=window.__audioProbe={contexts:[],started:0,decoded:0,peak:0,rms:0};
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){
  if(destination===this.context.destination){
   const context=this.context,analyser=context.createAnalyser();analyser.fftSize=2048;
   const entry={context,analyser,data:new Float32Array(analyser.fftSize),rms:0};probe.contexts.push(entry);
   connect.call(this,analyser,...args);connect.call(analyser,destination);return destination;
  }
  return connect.call(this,destination,...args);
 };
 const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args){probe.started++;return start.apply(this,args);};
 const decode=BaseAudioContext.prototype.decodeAudioData;
 BaseAudioContext.prototype.decodeAudioData=function(...args){const result=decode.apply(this,args);if(result?.then)result.then(()=>probe.decoded++,()=>{});return result;};
 setInterval(()=>{
  let total=0;
  for(const entry of probe.contexts){entry.analyser.getFloatTimeDomainData(entry.data);let sum=0;for(const value of entry.data)sum+=value*value;entry.rms=Math.sqrt(sum/entry.data.length);total+=entry.rms;}
  probe.rms=total;probe.peak=Math.max(probe.peak,total);
 },15);
}
async function open(page,url){
 await page.goto(url);const dialog=page.locator('.modus-premises-dialog[open]');
 if(await dialog.isVisible()){await page.locator('#modus-premises-accept').check();await page.locator('.modus-premises-confirm').click();}
}
async function snapshot(page){return page.evaluate(()=>({rms:window.__audioProbe.rms,peak:window.__audioProbe.peak,started:window.__audioProbe.started,decoded:window.__audioProbe.decoded,states:window.__audioProbe.contexts.map(e=>e.context.state),error:document.querySelector('#error,#chordStatus')?.textContent}));}
async function audible(page){await page.waitForFunction(()=>window.__audioProbe.peak>.0005,undefined,{timeout:15000});return snapshot(page);}
async function reset(page){await page.evaluate(()=>{window.__audioProbe.peak=0;});}
const apps=[{url:'backingtracks.html',start:'#play',stop:'#play',piano:'#fretboard',jam:true},{url:'akkorder.html',start:'#playProgression',stop:'#playProgression',piano:'#chordKeyboard'}];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const local=`http://127.0.0.1:${server.address().port}`,results=[];
 const baselineOnly=process.env.MODUS_AUDIO_BASELINE_ONLY==='1';
 const targets=baselineOnly?(process.env.MODUS_AUDIO_BASELINES||'').split(',').filter(Boolean).map(base=>({base,live:true})):[{base:process.env.MODUS_TEST_URL||local,live:false}];
 try{for(const [browserName,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{for(const target of targets)for(const locale of ['', 'en/'])for(const app of apps)for(const fault of (target.live?['none']:['none','missing','throwing','tracking'])){
   const context=await browser.newContext(),page=await context.newPage(),errors=[],failedSamples=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/audio/')&&response.status()!==200)failedSamples.push({url:response.url(),status:response.status()});});
   await page.addInitScript(meter);
   if(fault==='missing')await page.route('**/piano-interaction.js*',route=>route.fulfill({status:404,contentType:'text/javascript',body:''}));
   if(fault==='throwing')await page.route('**/piano-interaction.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'window.ModusPiano={create(){throw Error("visual initialization failed");}};'}));
   if(fault==='tracking')await page.route('**/piano-interaction.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'window.ModusPiano={create:()=>({track(){throw Error("visual tracking failed");},refresh(){},clear(){},releaseManual(){}})};'}));
   const result={browser:browserName,base:target.base,locale:locale||'nb',page:app.url,fault};
   try{
    await open(page,`${target.base}/${locale}${app.url}`);
    result.scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
    if(target.live){result.assets=[];for(const file of [app.url,app.jam?'app.js':'chord-tool.js','piano-interaction.js']){const response=await page.request.get(`${target.base}/${locale}${file}`),bytes=await response.body();result.assets.push({file,status:response.status(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,cache:response.headers()['cf-cache-status']});}}
    if(app.jam&&fault==='none'&&await page.locator('#mapInstrument').count())await page.selectOption('#mapInstrument','piano');
    await page.locator(app.start).click();result.first=await audible(page);
    assert(result.first.started>0&&result.first.decoded>0,'Real decoded sources must reach the output');assert.deepEqual(failedSamples,[],'All requested samples load');
    await page.locator(app.stop).click();await page.waitForFunction(()=>window.__audioProbe.rms<.0001,undefined,{timeout:5000});
    await reset(page);await page.locator(app.start).click();result.restart=await audible(page);await page.locator(app.stop).click();
    await page.waitForFunction(()=>window.__audioProbe.rms<.0001,undefined,{timeout:5000});
    if(fault==='none'&&await page.locator(`${app.piano} [data-midi="64"]`).count()){
     await reset(page);const key=page.locator(`${app.piano} [data-midi="64"]`);await key.focus();await page.keyboard.down('Enter');result.manual=await audible(page);await page.keyboard.up('Enter');await page.waitForFunction(()=>window.__audioProbe.rms<.0001,undefined,{timeout:5000});
     assert(await page.locator(`${app.piano} [data-tonic="true"]`).count()>0,'Tonic marker is retained');
    }
    assert.deepEqual(errors,[],'No uncaught app errors');result.status='passed';
   }catch(error){result.status='failed';result.message=error.message;result.audio=await snapshot(page).catch(()=>null);result.errors=errors;result.failedSamples=failedSamples;if(!target.live)process.exitCode=1;}
   results.push(result);console.log(JSON.stringify(result));await context.close();
  }}finally{await browser.close();}
 }}finally{fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/audio-${baselineOnly?'baseline':'signal'}-results.json`,JSON.stringify(results,null,2));server.close();}
 if(!baselineOnly)assert(results.every(r=>r.status==='passed'),'Audio signal regression failure');
})().catch(error=>{console.error(error);process.exitCode=1;});
