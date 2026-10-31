"use strict";
// Curriculum titles are descriptive only; this demonstration does not unlock lessons.
const modules = [{"id":"F01","title":"Lyd og tonehøyde","level":1},{"id":"F02","title":"Puls, takt og rytme","level":1},{"id":"F03","title":"Tonenavn og intervaller","level":1},{"id":"F04","title":"Durskalaen","level":1},{"id":"E01","title":"Tonearter og kvintsirkelen","level":2},{"id":"E02","title":"Moll og treklanger","level":2},{"id":"E03","title":"Diatoniske progresjoner","level":2},{"id":"E04","title":"Pentatonikk og gehør","level":2},{"id":"I01","title":"Funksjonsharmonikk","level":3},{"id":"I02","title":"Kadenser og ii–V–I","level":3},{"id":"I03","title":"Moduser","level":3},{"id":"I04","title":"Motivisk improvisasjon","level":3},{"id":"A01","title":"Sekundærdominanter","level":4},{"id":"A02","title":"Modal harmonikk","level":4},{"id":"A03","title":"Stemmeføring og reharmonisering","level":4},{"id":"A04","title":"Oddetakt og form","level":4},{"id":"P01","title":"Kromatisk harmonikk","level":5},{"id":"P02","title":"Jazzharmonikk","level":5},{"id":"P03","title":"Kontrapunkt","level":5},{"id":"P04","title":"Orkestrering og produksjon","level":5},{"id":"X01","title":"Strukturell analyse","level":6},{"id":"X02","title":"Eget harmonisk språk","level":6},{"id":"X03","title":"Original komposisjon","level":6},{"id":"X04","title":"Kunstnerisk portefølje","level":6}];
const levels=["Grunnlaget","Grunnleggende","Mellomnivå","Avansert","Profesjonell fordypning","Kunstnerisk selvstendighet"];
const query=new URLSearchParams(location.search);const code=(query.get("modul")||"").toUpperCase();
const selected=modules.find(m=>m.id===code);
if(selected){document.getElementById("module-title").textContent=selected.id+" · "+selected.title;document.getElementById("crumb-level").textContent=levels[selected.level-1];document.getElementById("crumb-module").textContent=selected.id;document.getElementById("module-prereq").textContent="Nivå "+selected.level+" – "+levels[selected.level-1]+". Modulens individuelle forkunnskaper og læringsmål må kvalitetssikres før undervisning åpnes.";}
else {document.getElementById("crumb-level").textContent="Demonstrasjon";document.getElementById("crumb-module").textContent="Undervisningsrom";}
let note="C4";const frequencies={C4:261.625565,D4:293.664768,E4:329.627557};const buttons=[...document.querySelectorAll("[data-note]")];const keys=[...document.querySelectorAll("[data-key]")];
function select(value){if(!Object.hasOwn(frequencies,value))return;note=value;buttons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.note===note)));keys.forEach(k=>k.classList.toggle("chosen",k.dataset.key===note));}
buttons.forEach(b=>b.addEventListener("click",()=>select(b.dataset.note)));
let context;let grandRun=0;const grandSources=new Set();const status=document.getElementById("audio-status");
// Use the existing sampled MODUS piano, not sine-wave oscillators.
// Audio samples are recorded every three semitones; pitch-shift only to the nearest sample.
const pianoBuffers=new Map();
const pianoSamples=[48,51,54,57,60,63,66,69,72,75,78,81,84];
const midiByNote={C4:60,D4:62,E4:64,G4:67};
function nearestSample(midi){return pianoSamples.reduce((best,n)=>Math.abs(n-midi)<Math.abs(best-midi)?n:best,pianoSamples[0]);}
async function pianoContext(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)throw Error("AudioContext unavailable");
 context ||=new AudioContextClass();
 await context.resume();
 return context;
}
async function pianoBuffer(midi){
 const sample=nearestSample(midi);
 if(!pianoBuffers.has(sample)){
   const promise=fetch("audio/grand-"+sample+".mp3")
     .then(response=>{if(!response.ok)throw Error("Piano sample unavailable");return response.arrayBuffer();})
     .then(array=>context.decodeAudioData(array));
   pianoBuffers.set(sample,promise.catch(error=>{pianoBuffers.delete(sample);throw error;}));
 }
 return {buffer:await pianoBuffers.get(sample),sample};
}
// Reusable acoustic grand-piano playback for learning activities.
// Returns a Promise and supports all chromatic notes within the sampled instrument's range.
async function playGrandMidi(midiNotes,simultaneous=false,visual=null){
 stopGrand();const token=grandRun;const ctx=await pianoContext();
 const values=midiNotes.filter(n=>Number.isInteger(n)&&n>=48&&n<=84);
 if(values.length!==midiNotes.length)throw Error("Note is outside the sample range");
 const loaded=await Promise.all(values.map(async midi=>({midi,...(await pianoBuffer(midi))})));
 if(token!==grandRun)return;
 const start=ctx.currentTime+.035;
 loaded.forEach(({midi,buffer,sample},i)=>{
  const at=start+(simultaneous?0:i*.54);
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffer;
  source.playbackRate.value=Math.pow(2,(midi-sample)/12);
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(simultaneous?.23:.32,at+.02);
  gain.gain.setTargetAtTime(0,at+.35,.35);
  source.connect(gain).connect(ctx.destination);
  const end=Math.min(at+1.9,at+buffer.duration/source.playbackRate.value);
  grandSources.add(source);source.addEventListener('ended',()=>grandSources.delete(source),{once:true});
  if(visual)visual.track(source,midi,at,end,ctx);
  source.start(at);source.stop(end);
 });
}
async function loadGrandNote(midi){const ctx=await pianoContext(),{buffer,sample}=await pianoBuffer(midi);return {context:ctx,buffer,nearest:sample,output:ctx.destination};}
function stopGrand(){grandRun++;for(const source of grandSources){try{source.stop();}catch{}}grandSources.clear();genericPiano?.clear();lessonPiano?.clear();}
let genericPiano,lessonPiano;
const mini=document.querySelector('.mini-keys');
if(mini&&window.ModusPiano){
 mini.querySelectorAll('.mini-key').forEach((key,i)=>{key.dataset.midi=String([60,62,64,65,67,69,71][i]);});
 genericPiano=window.ModusPiano.create({element:mini,load:loadGrandNote,onError:()=>{status.textContent='Kunne ikke spille tonen.';}});genericPiano.refresh();
}
window.MODUSGrand=Object.freeze({playMidi:playGrandMidi,loadNote:loadGrandNote,stop:stopGrand,setView:view=>{lessonPiano=view;}});
async function playPiano(notes,simultaneous=false){return playGrandMidi(notes.map(n=>midiByNote[n]),simultaneous,lessonPiano||genericPiano);}
window.addEventListener('pagehide',stopGrand);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopGrand();});
async function play(values){
 try{await playPiano(values);status.textContent="Spiller flygellyd · demonstrasjon.";}
 catch{status.textContent="Kunne ikke laste pianolyden. Prøv igjen.";}}
document.getElementById("play-note").addEventListener("click",()=>play([note]));document.getElementById("play-sequence").addEventListener("click",()=>play(["C4","D4","E4"]));

/* F03 is an editorial draft, never a released course or mastery assessment. */
const f03Draft=document.getElementById("f03-draft");
if(code==="F03"&&f03Draft){
 f03Draft.hidden=false;
 document.getElementById("generic-demo").hidden=true;
 const choiceButtons=[...document.querySelectorAll("[data-interval]")];
 const names={2:"C → D · 2 halvtonetrinn",4:"C → E · 4 halvtonetrinn",7:"C → G · 7 halvtonetrinn"};
 let interval=2;
 choiceButtons.forEach(b=>b.addEventListener("click",()=>{
   interval=Number(b.dataset.interval);
   choiceButtons.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
   document.getElementById("interval-display").textContent=names[interval];
 }));
 async function intervalAudio(simultaneous){
   const message=document.getElementById("interval-audio-status");
   const notes={2:"D4",4:"E4",7:"G4"};
   try{await playPiano(["C4",notes[interval]],simultaneous);
     message.textContent=simultaneous?"To pianotoner samtidig.":"To pianotoner etter hverandre.";
   }catch{message.textContent="Kunne ikke laste pianolyden. Prøv igjen.";}
 }
 document.getElementById("interval-melodic").addEventListener("click",()=>intervalAudio(false));
 document.getElementById("interval-harmonic").addEventListener("click",()=>intervalAudio(true));
 document.getElementById("check-interval").addEventListener("click",()=>{
   const ans=document.querySelector('input[name="interval-answer"]:checked');
   document.getElementById("interval-feedback").textContent=!ans?"Velg et svar først.":ans.value==="4"?"Riktig – C til E er fire halvtonetrinn, en stor ters. Dette er en øvelsessjekk, ikke dokumentert mestring.":"Prøv igjen: tell C–C♯–D–D♯–E. Hva får du?";
 });
}
