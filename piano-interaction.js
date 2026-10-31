'use strict';
/* One audio-clock driven view; adapters retain each room's existing audio engine. */
window.ModusPiano=(()=>{
 const names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
 const noteName=m=>names[(m%12+12)%12];
 function create({element,load,name=noteName,onError=()=>{}}){
  let events=[],frame=0,keys=[],generation=0;
  const held=new Map(),contexts=new WeakSet(),ns='http://www.w3.org/2000/svg';
  function paint(){
   frame=0;
   events=events.filter(e=>!e.ended&&e.context.currentTime<e.end);
   const active=new Set(events.filter(e=>e.context.state==='running'&&e.context.currentTime>=e.start).map(e=>e.midi));
   for(const key of keys){const on=active.has(Number(key.dataset.midi));key.classList.toggle('piano-playing',on);key.setAttribute('aria-pressed',String(on));key.dataset.playing=String(on);}
   element.querySelectorAll('[data-note-midi]').forEach(label=>label.classList.toggle('piano-tone-active',active.has(Number(label.dataset.noteMidi))));
   if(events.length)frame=requestAnimationFrame(paint);
  }
  function wake(){if(!frame)frame=requestAnimationFrame(paint);}
  function track(source,midi,start,end,context){
   if(!contexts.has(context)){contexts.add(context);context.addEventListener('statechange',()=>{if(context.state!=='running')clear();});}
   const event={source,midi,start,end,context,ended:false};events.push(event);
   source.addEventListener('ended',()=>{event.ended=true;wake();},{once:true});wake();return event;
  }
  function release(id){
   const slot=held.get(id);if(!slot)return;held.delete(id);slot.cancelled=true;
   if(slot.voice){const {source,gain,context}=slot.voice,t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(.0001,t,.015);try{source.stop(t+.08);}catch{}slot.event.end=t+.08;wake();}
  }
  function releaseManual(){generation++;for(const id of [...held.keys()])release(id);}
  function clear(){releaseManual();for(const event of events){try{event.source.stop();}catch{}}events=[];cancelAnimationFrame(frame);frame=0;paint();}
  async function press(id,key){
   if(held.has(id))return;
   const slot={generation,key,cancelled:false};held.set(id,slot);
   try{
    const midi=Number(key.dataset.midi),{context,buffer,nearest,output}=await load(midi);
    if(slot.cancelled||slot.generation!==generation||held.get(id)!==slot||!key.isConnected)return;
    if(context.state!=='running')throw Error('Audio suspended');
    const source=context.createBufferSource(),gain=context.createGain(),t=context.currentTime;
    source.buffer=buffer;source.playbackRate.value=2**((midi-nearest)/12);gain.gain.setValueAtTime(.6,t);source.connect(gain);gain.connect(output);
    slot.voice={source,gain,context};const end=t+buffer.duration/source.playbackRate.value;
    slot.event=track(source,midi,t,end,context);source.addEventListener('ended',()=>{if(held.get(id)===slot)held.delete(id);},{once:true});source.start(t);return slot;
   }catch(error){if(!slot.cancelled&&slot.generation===generation){held.delete(id);onError(error);}}
  }
  function refresh(){
   releaseManual();keys=[...element.querySelectorAll('[data-midi]')];
   element.classList.add('interactive-piano');element.setAttribute('role','group');
   keys.forEach((key,i)=>{
    const midi=Number(key.dataset.midi);key.setAttribute('role','button');key.setAttribute('tabindex',i===0?'0':'-1');
    key.setAttribute('aria-label',name(midi)+Math.floor(midi/12-1));key.setAttribute('aria-pressed','false');
    if(key.tagName.toLowerCase()==='rect'&&!key.parentNode.hasAttribute('data-piano-key')){
     const group=document.createElementNS(ns,'g');group.setAttribute('data-piano-key','');key.before(group);group.append(key);
     const label=document.createElementNS(ns,'g');label.setAttribute('class','piano-active-label');label.setAttribute('aria-hidden','true');
     const x=Number(key.getAttribute('x'))+Number(key.getAttribute('width'))/2,y=Number(key.getAttribute('y'))+Number(key.getAttribute('height'))-28;
     label.innerHTML=`<circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${name(midi)}</text>`;
     group.append(label);
    }
   });wake();
  }
  element.addEventListener('pointerdown',e=>{const key=e.target.closest('[data-midi]');if(!key||!element.contains(key)||e.button>0)return;e.preventDefault();key.focus({preventScroll:true});try{element.setPointerCapture(e.pointerId);}catch{}press('p'+e.pointerId,key);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>release('p'+e.pointerId));
  element.addEventListener('keydown',e=>{
   const key=e.target.closest('[data-midi]');if(!key)return;
   if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press('k'+e.key,key);}
   const sorted=[...keys].sort((a,b)=>Number(a.dataset.midi)-Number(b.dataset.midi)),index=sorted.indexOf(key);
   const next=e.key==='Home'?0:e.key==='End'?sorted.length-1:e.key==='ArrowRight'?Math.min(sorted.length-1,index+1):e.key==='ArrowLeft'?Math.max(0,index-1):-1;
   if(next>=0){e.preventDefault();releaseManual();keys.forEach(k=>k.setAttribute('tabindex','-1'));sorted[next].setAttribute('tabindex','0');sorted[next].focus();}
   if(e.key==='Escape')clear();
  });
  element.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release('k'+e.key);}});
  element.addEventListener('focusout',e=>{if(e.target.closest('[data-midi]')){release('k ');release('kEnter');}});
  // Pointer/keyboard events are handled above. A synthetic accessibility click
  // (detail=0) still plays a short note, without duplicating a physical press.
  element.addEventListener('click',e=>{if(e.detail!==0)return;const key=e.target.closest('[data-midi]');if(!key||held.size)return;press('accessible',key).then(slot=>{if(slot)setTimeout(()=>{if(held.get('accessible')===slot)release('accessible');},350);});});
  window.addEventListener('blur',releaseManual);window.addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  return {track,refresh,clear,releaseManual};
 }
 return {create,noteName};
})();
