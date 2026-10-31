'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function target(extra={}){return {listeners:{},addEventListener(t,f){(this.listeners[t]??=[]).push(f);},emit(t,e={}){for(const f of this.listeners[t]||[])f(e);},...extra};}
const frames=new Map();let seq=0;
const doc=target({hidden:false}),win=target({});
vm.runInNewContext(fs.readFileSync('piano-interaction.js','utf8'),{window:win,document:doc,requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:n=>frames.delete(n),setTimeout});
const key=m=>({dataset:{midi:String(m)},tagName:'BUTTON',isConnected:true,attrs:{},classes:new Set(),setAttribute(k,v){this.attrs[k]=v;},classList:{toggle(){}},focus(){},closest(){return this;}});
const keys=[key(60),key(64),key(67)];for(const k of keys)k.classList.toggle=(c,v)=>v?k.classes.add(c):k.classes.delete(c);
const labels=keys.map(k=>({dataset:{noteMidi:k.dataset.midi},classList:{toggle(c,v){this.active=v;}}}));
const element=target({classList:{add(){}},setAttribute(){},querySelectorAll:q=>q==='[data-midi]'?keys:labels,contains:k=>keys.includes(k),setPointerCapture(){}});
const sources=[];
const context=target({currentTime:0,state:'running',createBufferSource(){const s=target({playbackRate:{},connect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}});sources.push(s);return s;},createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){}})});
const loaded={context,buffer:{duration:8},nearest:60,output:{}};let load=async()=>loaded;
const piano=win.ModusPiano.create({element,load:m=>load(m)});piano.refresh();
const tick=t=>{context.currentTime=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f());};
const active=()=>keys.filter(k=>k.dataset.playing==='true').map(k=>Number(k.dataset.midi));
const pointer=(type,id,k=keys[0])=>element.emit(type,{target:k,pointerId:id,button:0,preventDefault(){}});
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
(async()=>{
 const a=target({stop(){}}),b=target({stop(){}});
 piano.track(a,60,1,2,context);piano.track(b,64,1.5,2.5,context);
 tick(.9);assert.deepEqual(active(),[]);tick(1.6);assert.deepEqual(active(),[60,64]);assert(labels[1].classList.active);
 a.emit('ended');tick(1.7);assert.deepEqual(active(),[64]);tick(3);assert.deepEqual(active(),[]);assert.equal(frames.size,0,'Expired events stop the frame loop');
 // Same-pitch voices are independent: the first ended event must not release the second.
 const sameA=target({stop(){}}),sameB=target({stop(){}});
 piano.track(sameA,60,3,3.3,context);piano.track(sameB,60,3.1,3.7,context);
 tick(3.2);assert.deepEqual(active(),[60]);sameA.emit('ended');tick(3.4);assert.deepEqual(active(),[60]);
 tick(3.4);assert.deepEqual(active(),[60],'Frozen audio clock retains the sounding key across animation frames');
 sameB.emit('ended');tick(3.6);assert.deepEqual(active(),[]);tick(3);
 pointer('pointerdown',81,keys[1]);await settle();tick(3.1);assert.deepEqual(active(),[64],'Pointer ID is never interpreted as MIDI');
 pointer('pointerdown',82,keys[2]);await settle();tick(3.2);assert.deepEqual(active(),[64,67],'Multitouch preserves independent voices');
 pointer('pointercancel',81);tick(3.4);assert.deepEqual(active(),[67]);pointer('lostpointercapture',82);tick(3.6);assert.deepEqual(active(),[]);
 let finish;load=()=>new Promise(r=>finish=r);pointer('pointerdown',90);pointer('pointerup',90);const count=sources.length;finish(loaded);await settle();assert.equal(sources.length,count,'Release while loading never produces a ghost note');
 pointer('pointerdown',91);const old=finish;pointer('pointerup',91);pointer('pointerdown',91,keys[1]);old(loaded);await settle();assert.equal(sources.length,count,'Reused pointer cannot revive an old request');finish(loaded);await settle();tick(4);assert.deepEqual(active(),[64]);piano.clear();tick(4.1);assert.deepEqual(active(),[]);
 load=async()=>loaded;pointer('pointerdown',92);await settle();win.emit('blur');tick(4.4);assert.deepEqual(active(),[]);
 element.emit('keydown',{target:keys[2],key:'Enter',preventDefault(){}});await settle();tick(4.5);assert.deepEqual(active(),[67]);element.emit('keyup',{target:keys[2],key:'Enter',preventDefault(){}});tick(4.7);assert.deepEqual(active(),[]);
 pointer('pointerdown',93);await settle();context.state='suspended';context.emit('statechange');tick(4.8);assert.deepEqual(active(),[]);assert.equal(frames.size,0);
 // Execute the real Teorirommet scheduler with controlled sample durations.
 // One sample ends naturally before the envelope; the other reaches source.stop.
 const scheduled=[],theoryContext={currentTime:10,state:'running',resume:async()=>{},
  createBufferSource(){const voice={playbackRate:{value:1},connect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}};return voice;},
  createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})};
 const text={};const sandbox={audioBusy:false,audioRun:0,ta:theoryContext,output:{},sources:new Set(),
  T:()=>text,initTheoryAudio(){},stopAudio(){throw Error('Unexpected playback failure');},
  example:{kind:'scale',groups:[[64,66]]},
  getBuffer:async midi=>({buffer:{duration:midi===64?.2:5},nearest:64}),
  theoryPiano:{track(source,midi,start,end){scheduled.push({source,midi,start,end});}}};
 const theory=fs.readFileSync('theory.js','utf8');
 vm.runInNewContext(theory.slice(theory.indexOf('async function playExample()'),theory.indexOf('\nwindow.addEventListener',theory.indexOf('async function playExample()'))),sandbox);
 await sandbox.playExample();assert.equal(scheduled.length,2);
 for(const v of scheduled)assert.equal(v.end,Math.min(v.start+v.source.buffer.duration/v.source.playbackRate.value,v.source.stopAt),'Teorirommet highlight ends at the actual buffer or stop boundary');
 console.log('Passed: audio clock, overlapping notes, expiry, actual MIDI labels, multitouch, cancellation/loading race, pointer reuse, blur, keyboard and audio suspension.');
})().catch(e=>{console.error(e);process.exitCode=1;});
