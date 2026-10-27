/* Standard MIDI File export: chord voicings plus tempo and meter. */
(function(root){
 'use strict';
 const PPQ=480,BAR=PPQ*4;
 const ascii=s=>Array.from(s,c=>c.charCodeAt(0));
 function vlq(n){const bytes=[n&127];while((n=Math.floor(n/128))>0)bytes.unshift((n&127)|128);return bytes;}
 const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
 function meta(type,text){const bytes=Array.from(new TextEncoder().encode(text));return [255,type,...vlq(bytes.length),...bytes];}
 function track(events,end){events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let last=0,data=[];for(const e of events){data.push(...vlq(e.tick-last),...e.bytes);last=e.tick;}data.push(...vlq(Math.max(0,end-last)),255,47,0);return [...ascii('MTrk'),...u32(data.length),...data];}
 function create({tempo,title,chords,program=0}){
  if(!Number.isFinite(tempo)||tempo<40||tempo>200||!Array.isArray(chords)||(chords.length<1||chords.length>16))throw Error('Invalid MIDI settings');
  const end=chords.length*BAR,microseconds=Math.round(60000000/tempo);
  const conductor=[{tick:0,order:0,bytes:meta(3,title)},{tick:0,order:1,bytes:[255,81,3,(microseconds>>>16)&255,(microseconds>>>8)&255,microseconds&255]},{tick:0,order:2,bytes:[255,88,4,4,2,24,8]}];
  const events=[{tick:0,order:-3,bytes:meta(3,'MODUS · Akkorder')},{tick:0,order:-2,bytes:[192,program]},{tick:0,order:-1,bytes:[176,7,100]}];
  chords.forEach((chord,bar)=>{
   if(!Array.isArray(chord.notes)||(chord.notes.length<3||chord.notes.length>6)||chord.notes.some(n=>!Number.isInteger(n)||n<0||n>127))throw Error('Invalid MIDI chord');
   const start=bar*BAR;events.push({tick:start,order:1,bytes:meta(6,chord.name)});
   chord.notes.forEach((n,i)=>{events.push({tick:start,order:2,bytes:[144,n,i===0?76:70]},{tick:start+BAR,order:0,bytes:[128,n,0]});});
  });
  return new Uint8Array([...ascii('MThd'),0,0,0,6,0,1,0,2,(PPQ>>>8)&255,PPQ&255,...track(conductor,end),...track(events,end)]);
 }
 root.ModusMidi={create};
})(typeof window!=='undefined'?window:globalThis);
