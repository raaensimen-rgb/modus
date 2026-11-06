'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium,webkit}=require('playwright'),{startPublicPackageServer}=require('./public-package-server.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../delivery');fs.mkdirSync(out,{recursive:true});
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

(async()=>{const server=await startPublicPackageServer(path.resolve(root,'../package')),rows=[];let browser;
try{for(const [engine,type] of Object.entries({chromium,webkit})){
 browser=await type.launch();for(const locale of ['nb','en'])for(const width of [320,375,768,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),p=await context.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/\/audio\//.test(r.url()))requests.push(r.url());});
 await p.addInitScript(()=>{window.__audioContexts=0;for(const name of ['AudioContext','webkitAudioContext']){const Original=window[name];if(Original)window[name]=new Proxy(Original,{construct(t,args){window.__audioContexts++;return Reflect.construct(t,args);}});}});
 await p.addInitScript(meter);
 await p.goto(server.origin+(locale==='en'?'/en':'')+'/artikler/dorisk-og-eolisk.html');
 if(await p.locator('.modus-premises-dialog[open]').count()){await p.locator('#modus-premises-accept').check();await p.locator('.modus-premises-confirm').click();}
 const exercise=p.locator('[data-article-jam]');assert(await exercise.isVisible());assert(await exercise.locator('a').getAttribute('href'));
 await p.evaluate(()=>localStorage.setItem('modus-v1',JSON.stringify({key:0,mode:0,tempo:150,harmony:'drone'})));
 await exercise.screenshot({path:path.join(out,`${engine}-${locale}-${width}-exercise.png`)});
 await exercise.locator('a').click();await p.waitForSelector('#chords .chord');
 assert.equal(await p.locator('#key').inputValue(),'4');assert.equal(await p.locator('#mode').inputValue(),'1');assert.equal(await p.locator('#bpm').inputValue(),'90');assert.equal(await p.locator('#harmony').inputValue(),'custom');
 assert.deepEqual(await p.locator('#chords .chord strong').allTextContents(),['Em7','A7','Em7','A7']);
 assert.equal(await p.evaluate(()=>window.__audioContexts),0);assert.equal(requests.length,0);assert.equal(await p.locator('#play').isEnabled(),true);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Deterministic failure path: missing samples must leave transport recoverable.
 await p.route('**/audio/**',r=>r.abort());await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#error').textContent.length>0);
 assert(await p.locator('#play').isEnabled());assert.equal(await p.locator('#playIcon').innerText(),'▶');
 await p.unroute('**/audio/**');await p.locator('#play').click();
 await p.waitForFunction(()=>window.__audioProbe.peak>.0005);
 const signal=await p.evaluate(()=>({peak:__audioProbe.peak,decoded:__audioProbe.decoded,started:__audioProbe.started}));assert(signal.decoded>0&&signal.started>0);
 await p.locator('#play').click();await p.waitForFunction(()=>window.__audioProbe.rms<.0001);assert.equal(errors.length,0);
 rows.push({engine,locale,width,configured:true,noAutoplay:true,staleStorageOverridden:true,audioFailureRecoverable:true,retryAudible:signal,stopped:true,overflow:false});await context.close();
 }await browser.close();browser=null;
}fs.writeFileSync(path.join(out,'ARTICLE-JAM-BROWSER.json'),JSON.stringify(rows,null,2));console.log(rows.length+' article → Jam browser scenarios passed');
}finally{if(browser)await browser.close();await server.stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
