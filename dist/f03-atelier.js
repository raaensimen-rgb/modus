"use strict";
/* F03 editorial workbench – never records or certifies mastery. */
(() => {
 const draft=document.getElementById("f03-draft");
 if(!draft || new URLSearchParams(location.search).get("modul")?.toUpperCase()!=="F03")return;
 const $=id=>document.getElementById(id);
 const scales={
  easy:[{s:2,label:"Stor sekund"},{s:4,label:"Stor ters"}],
  medium:[{s:2,label:"Stor sekund"},{s:4,label:"Stor ters"},{s:7,label:"Ren kvint"}],
  hard:[{s:1,label:"Liten sekund"},{s:2,label:"Stor sekund"},{s:3,label:"Liten ters"},{s:4,label:"Stor ters"},{s:7,label:"Ren kvint"}]
 };
 const pitchNames=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","H"];
 const labelOf=midi=>pitchNames[midi%12]+Math.floor(midi/12-1);
 const stage={manual:[60,62],quiz:null,revealed:false,last:null,selectedAnswer:null,attempted:false};
 const piano=$("f03-piano"),guitar=$("f03-fretboard");
 const pianoKeys=[],fretKeys=[];
 const whiteCount=15,whiteWidth=100/whiteCount;
 let whiteIndex=0;
 for(let midi=48;midi<=72;midi++){
  const chroma=midi%12,black=[1,3,6,8,10].includes(chroma);
  const key=document.createElement("button");
  key.type="button";key.className="piano-key "+(black?"black":"white");
  key.dataset.midi=String(midi);
  key.setAttribute("aria-label",labelOf(midi)+" – spill flygel");
  if(black){key.style.left=(whiteIndex*whiteWidth-whiteWidth*.33)+"%";key.style.width=(whiteWidth*.66)+"%";}
  else {key.style.left=(whiteIndex*whiteWidth)+"%";key.style.width=whiteWidth+"%";key.textContent=chroma===0?labelOf(midi):pitchNames[chroma];whiteIndex++;}
  key.addEventListener("click",()=>sound([midi],"f03-visual-status"));
  piano.append(key);pianoKeys.push(key);
 }
 const stringMidi=[64,59,55,50,45,40];
 const stringNames=["e","H","G","D","A","E"];
 const corner=document.createElement("span");corner.className="fret-label";corner.textContent="Streng";guitar.append(corner);
 for(let fret=0;fret<=12;fret++){let label=document.createElement("span");label.className="fret-label";label.textContent=fret;guitar.append(label);}
 stringMidi.forEach((open,string)=>{
  const title=document.createElement("span");title.className="fret-label";title.textContent=stringNames[string];guitar.append(title);
  for(let fret=0;fret<=12;fret++){
   const midi=open+fret,key=document.createElement("button");key.type="button";key.className="fret-note";
   key.dataset.midi=String(midi);key.setAttribute("aria-label",stringNames[string]+"-streng bånd "+fret+" – "+labelOf(midi)+" – spill flygel");
   key.addEventListener("click",()=>sound([midi],"f03-visual-status"));
   guitar.append(key);fretKeys.push(key);
  }
 });
 function render(notes,status){
  const [root,top]=notes||[];
  [...pianoKeys,...fretKeys].forEach(key=>{
   const midi=Number(key.dataset.midi);
   key.classList.toggle("is-tonic",midi===root);
   key.classList.toggle("is-target",midi===top);
   const fret=key.classList.contains("fret-note");
   key.textContent=fret&&(midi===root||midi===top)?pitchNames[midi%12]:fret?"":key.textContent;
  });
  $("f03-visual-status").textContent=status||(notes?"Viser "+labelOf(root)+" og "+labelOf(top)+".":"Tonene er skjult i gehørøvelsen.");
 }
 async function sound(midis,statusId,simultaneous=false){
  try{if(!window.MODUSGrand)throw Error("Audio system not ready");await window.MODUSGrand.playMidi(midis,simultaneous);
   $(statusId).textContent=simultaneous?"Spiller pianotonene samtidig.":"Spiller akustisk flygel.";
  }catch{$(statusId).textContent="Flygelsamplene kunne ikke lastes. Prøv på nytt.";}
 }
 function manual(){
  const option=Number(document.querySelector('[data-interval][aria-pressed="true"]')?.dataset.interval||2);
  stage.manual=[60,60+option];
  render(stage.manual);
 }
 document.querySelectorAll("[data-interval]").forEach(b=>b.addEventListener("click",()=>{stage.quiz=null;manual();}));
 manual();
 function newQuestion(){
  const difficulty=$("f03-difficulty").value;
  const options=scales[difficulty];
  let candidate;
  // Avoid the same two notes appearing immediately after one another.
  for(let n=0;n<15;n++){
   const selected=options[Math.floor(Math.random()*options.length)];
   const root=55+Math.floor(Math.random()*10);
   candidate={root,s:selected.s,label:selected.label};
   if(!stage.last||stage.last.root!==candidate.root||stage.last.s!==candidate.s)break;
  }
  stage.quiz=candidate;stage.last=candidate;stage.revealed=false;stage.attempted=false;stage.selectedAnswer=null;
  $("f03-ear-answers").replaceChildren();
  options.forEach(option=>{
   const button=document.createElement("button");button.type="button";
   button.className="action";button.textContent=option.label;
   button.setAttribute("aria-pressed","false");
   button.addEventListener("click",()=>answer(option.s));
   $("f03-ear-answers").append(button);
  });
  $("f03-ear-feedback").textContent="Lytt først, og velg deretter intervallet. Tonene er skjult.";
  $("f03-ear-feedback").dataset.result="pending";
  render(null,"Gehørspørsmål: tonene er skjult til du svarer.");
 }
 function answer(semitones){
  const q=stage.quiz;
  if(!q||stage.attempted)return;
  stage.attempted=true;stage.revealed=true;stage.selectedAnswer=semitones;
  $("f03-ear-answers").querySelectorAll("button").forEach((b,i)=>{
   b.setAttribute("aria-pressed",String(scales[$("f03-difficulty").value][i].s===semitones));
   b.disabled=true;
  });
  const correct=q.s===semitones;
  const name=labelOf(q.root)+"–"+labelOf(q.root+q.s);
  $("f03-ear-feedback").textContent=(correct?"Riktig hørt! ":"Ikke denne gangen. ")+
   "Du hørte "+name+" – "+q.label.toLowerCase()+" ("+q.s+" halvtonetrinn). "+
   (correct?"Prøv samme avstand fra en annen grunntone.":"Lytt igjen og sammenlign avstanden før du tar en ny oppgave.")+
   " Dette er egenkontroll, ikke dokumentert mestring.";
  $("f03-ear-feedback").dataset.result=correct?"correct":"retry";
  render([q.root,q.root+q.s],"Svaret er "+name+" ("+q.s+" halvtonetrinn).");
 }
 async function hearQuestion(){
  if(!stage.quiz)newQuestion();
  const q=stage.quiz;
  await sound([q.root,q.root+q.s],"f03-ear-feedback");
  if(!stage.attempted)$("f03-ear-feedback").textContent="Lytt til avstanden og velg et svar. Tonene er fortsatt skjult.";
 }
 $("f03-difficulty").addEventListener("change",newQuestion);
 $("f03-new-question").addEventListener("click",newQuestion);
 $("f03-listen").addEventListener("click",hearQuestion);
 $("f03-again").addEventListener("click",hearQuestion);
 newQuestion();
 // Start with the lesson example visible; a new ear question masks it only when opened.
 render(stage.manual);
})();
