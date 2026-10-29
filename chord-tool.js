'use strict';
const C=id=>document.getElementById(id),CK=window.ModusTheoryData.keys;
const qualities=window.ModusProgressions.qualities;
const tuning=[40,45,50,55,59,64],openShapes={'0-0':[-1,3,2,0,1,0],'2-0':[-1,-1,0,2,3,2],'7-0':[3,2,0,0,0,3],'2-1':[-1,-1,0,2,3,1],'0-2':[-1,3,2,3,1,0],'2-2':[-1,-1,0,2,1,2],'7-2':[3,2,0,0,0,1],'0-3':[-1,3,2,0,0,0],'2-3':[-1,-1,0,2,2,2],'7-3':[3,2,0,0,0,2],'2-4':[-1,-1,0,2,1,1],'2-5':[-1,-1,0,2,2,1]};
let chords=[{key:0,q:3},{key:9,q:4},{key:2,q:4},{key:7,q:2}],selected=0,gripIndex=0,inversion=0,tempo=90,ctx,bus,run=0,busy=false;const cache=new Map(),live=new Set();
let centerKey=0,scaleMode=0;const draftStorage='modus-chord-draft-v1',libraryStorage='modus-chord-library-v1';
const receivedSequence=window.ModusProgressions.readLaunch(location.search);
try{const saved=JSON.parse(localStorage.getItem(draftStorage));if(!receivedSequence&&saved&&window.ModusProgressions.validSequence(saved.chords)){chords=window.ModusProgressions.validSequence(saved.chords);tempo=Number.isInteger(saved.tempo)&&saved.tempo>=40&&saved.tempo<=200?saved.tempo:90;centerKey=Number.isInteger(saved.key)&&CK[saved.key]?saved.key:0;scaleMode=Number.isInteger(saved.mode)&&window.ModusTheoryData.modes[saved.mode]?saved.mode:0;}}catch{}
if(receivedSequence){chords=receivedSequence.chords;tempo=receivedSequence.tempo;centerKey=receivedSequence.key;scaleMode=receivedSequence.mode;}
function currentSetup(){return {chords:chords.map(c=>({...c})),key:centerKey,mode:scaleMode,tempo,style:'fusion'};}
function saveDraft(){try{localStorage.setItem(draftStorage,JSON.stringify(currentSetup()));C('localSaveStatus').textContent='Utkastet lagres i denne nettleseren.';}catch{C('localSaveStatus').textContent='Lokal lagring er ikke tilgjengelig. Bruk MIDI eller åpne rekken i backingtracks.';}}
function updateLaunchLink(){const setup=currentSetup();setup.chords=chords.map(ch=>({...ch,rootName:chordRootName(ch)}));C('openBackingTrack').href=window.ModusProgressions.link('backingtracks.html',setup);}
function readLibrary(){try{const rows=JSON.parse(localStorage.getItem(libraryStorage));return Array.isArray(rows)?rows.filter(row=>row&&typeof row.id==='string'&&typeof row.name==='string'&&row.name.length<=80&&window.ModusProgressions.validSequence(row.chords)).slice(0,20):[];}catch{return [];}}
function renderLibrary(){const select=C('savedSequences');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Velg en lagret akkordrekke';select.appendChild(empty);readLibrary().forEach(row=>{const option=document.createElement('option');option.value=row.id;option.textContent=row.name;select.appendChild(option);});}
function spell(name,pc,n,offset){const letters=['C','D','E','F','G','A','B'],natural=[0,2,4,5,7,9,11],li=(letters.indexOf(name[0])+offset)%7;let diff=(pc+n-natural[li]+120)%12;if(diff>6)diff-=12;return letters[li]+(diff>0?'♯'.repeat(diff):'♭'.repeat(-diff));}
function chordRootName(chord){if(chord.rootName)return chord.rootName;const tonic=CK[centerKey],distance=(CK[chord.key][1]-tonic[1]+12)%12,degree=window.ModusTheoryData.modes[scaleMode].steps.indexOf(distance);return degree<0?CK[chord.key][0]:spell(tonic[0],tonic[1],distance,degree);}
function analysis(chord){return window.ModusProgressions.model({...chord,rootName:chordRootName(chord)},centerKey,scaleMode);}
function info(chord){const pc=CK[chord.key][1],name=chordRootName(chord),q=qualities[chord.q];return {name:name+q.suffix,pc,q,notes:q.ints.map(n=>48+pc+n),names:q.ints.map((n,i)=>spell(name,pc,n,i*2)),pcs:q.ints.map(n=>(pc+n)%12)};}
function grips(chord){const c=info(chord),candidates=[];const open=openShapes[`${c.pc}-${chord.q}`];if(open)candidates.push({frets:open,barre:0,name:'Åpent grep'});for(const [shape,base,label] of [[c.q.e,4,'E-form'],[c.q.a,9,'A-form']]){const offset=(c.pc-base+12)%12,frets=shape.map(f=>f<0?-1:f+offset);if(Math.max(...frets)>14)continue;candidates.push({frets,barre:offset,name:offset?label+' med barré':label+' · åpent grep'});}return candidates.filter((g,i,arr)=>arr.findIndex(a=>a.frets.join()===g.frets.join())===i).sort((a,b)=>{const score=g=>Math.max(...g.frets)*.2+(g.barre?2+g.barre*.12:0);return score(a)-score(b);});}
function pianoNotes(chord,inv=inversion){const notes=info(chord).notes.slice();for(let n=0;n<Math.min(inv,notes.length-1);n++)notes[n]+=12;return notes.sort((a,b)=>a-b);}
function renderSlots(){C('chordSlots').innerHTML=chords.map((ch,i)=>`<article class="chord-slot ${i===selected?'selected':''}"><div class="slot-head"><span>TAKT ${i+1}</span><button class="remove-chord" data-remove="${i}" aria-label="Fjern akkord ${i+1}" ${chords.length<2?'disabled':''}>×</button></div><button class="select-chord" data-select="${i}" aria-pressed="${i===selected}" aria-label="Vis grep for ${info(ch).name}, ${analysis(ch).roman}, takt ${i+1}"><span class="chord-name">${info(ch).name}</span><span class="chord-roman">${analysis(ch).roman}</span></button><div class="slot-edit"><label>Grunntone<select data-root="${i}" aria-label="Grunntone for akkord ${i+1}">${CK.map((k,n)=>`<option value="${n}" ${n===ch.key?'selected':''}>${n===ch.key?chordRootName(ch):k[0]}</option>`).join('')}</select></label><label>Akkordtype<select data-quality="${i}" aria-label="Akkordtype for akkord ${i+1}">${qualities.map((q,n)=>`<option value="${n}" ${n===ch.q?'selected':''}>${q.name}</option>`).join('')}</select></label></div></article>`).join('');updatePlaybackMarker();C('addChord').disabled=chords.length>=8;document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.select;gripIndex=0;inversion=0;render();});document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{stop();chords.splice(+b.dataset.remove,1);selected=Math.min(selected,chords.length-1);gripIndex=0;inversion=0;render();});for(const [attr,prop] of [['root','key'],['quality','q']])document.querySelectorAll(`[data-${attr}]`).forEach(s=>s.onchange=()=>{stop();selected=+s.dataset[attr];chords[selected][prop]=+s.value;if(prop==='key')delete chords[selected].rootName;gripIndex=0;inversion=0;render();});}
function drawGuitar(){const chord=chords[selected],c=info(chord),options=grips(chord),grip=options[gripIndex%options.length],frets=grip.frets,played=frets.filter(f=>f>0),start=Math.max(...frets)<=4?1:Math.min(...played),x=i=>47+i*35,y=f=>59+(f-start+.5)*36;let s='';for(let i=0;i<6;i++)s+=`<line x1="${x(i)}" x2="${x(i)}" y1="59" y2="239" stroke="#9bad8b" stroke-width="${2-i*.2}"/><text x="${x(i)}" y="275" text-anchor="middle" fill="#c5d6b5" font-size="12">${['E','A','D','G','B','E'][i]}</text>`;for(let f=0;f<=5;f++)s+=`<line x1="47" x2="222" y1="${59+f*36}" y2="${59+f*36}" stroke="${f===0&&start===1?'#dde8cf':'#617650'}" stroke-width="${f===0&&start===1?4:1}"/>`;s+=`<text x="19" y="${y(start)+4}" fill="#d7e9c5" font-size="12">${start}</text>`;if(grip.barre>0){const indexes=frets.flatMap((f,i)=>f===grip.barre?[i]:[]);if(indexes.length>1)s+=`<line x1="${x(indexes[0])}" x2="${x(indexes.at(-1))}" y1="${y(grip.barre)}" y2="${y(grip.barre)}" stroke="#91ad75" stroke-width="20" stroke-linecap="round"/>`;}
 frets.forEach((f,i)=>{if(f<0){s+=`<text x="${x(i)}" y="40" text-anchor="middle" fill="#acbf99" font-size="17">×</text>`;return;}if(f===0){s+=`<circle cx="${x(i)}" cy="34" r="7" fill="none" stroke="${tuning[i]%12===c.pc?'#d7f48c':'#bfceaF'}" stroke-width="2"/>`;return;}const pc=(tuning[i]+f)%12,idx=c.pcs.indexOf(pc),root=pc===c.pc;s+=`<circle cx="${x(i)}" cy="${y(f)}" r="13" fill="${root?'#d7f48c':'#e3ecd7'}"/><text x="${x(i)}" y="${y(f)+4}" text-anchor="middle" font-size="${c.names[idx].length>2?9:11}" font-weight="600" fill="#1c2c11">${c.names[idx]}</text>`;});C('guitarChord').innerHTML=s;C('guitarChord').setAttribute('aria-label',c.name+', '+grip.name+', bånd fra 6. til 1. streng: '+frets.map(n=>n<0?'dempet':n).join(', '));C('guitarInfo').textContent=grip.name+' · '+frets.map(n=>n<0?'x':n).join('–');C('alternateGrip').disabled=options.length<2;}
function drawPiano(){const c=info(chords[selected]),notes=pianoNotes(chords[selected]),whites=[0,2,4,5,7,9,11],blacks=[1,3,6,8,10],after=[0,1,3,4,5],left=24,width=46;let svg='';function mark(midi,cx,cy){if(!notes.includes(midi))return '';const pc=midi%12,idx=c.pcs.indexOf(pc),root=pc===c.pc;return `<circle cx="${cx}" cy="${cy}" r="15" fill="${root?'#d7f48c':'#365027'}"/><text x="${cx}" y="${cy+.5}" text-anchor="middle" dominant-baseline="middle" font-size="${c.names[idx].length>2?10:14}" font-family="sans-serif" font-weight="600" fill="${root?'#14200c':'#fff'}">${c.names[idx]}</text>`;}for(let o=0;o<3;o++)for(let i=0;i<7;i++){const midi=48+o*12+whites[i],x=left+(o*7+i)*width;svg+=`<rect x="${x}" y="16" width="45" height="195" rx="3" fill="${notes.includes(midi)?midi%12===c.pc?'#e1efbb':'#dce8cd':'#f2f1e8'}" stroke="#6b7c5b"/>${mark(midi,x+23,182)}`;if(i===0)svg+=`<text x="${x+23}" y="239" text-anchor="middle" fill="#abc194" font-size="13">C${o+3}</text>`;}for(let o=0;o<3;o++)for(let i=0;i<5;i++){const midi=48+o*12+blacks[i],cx=left+(o*7+after[i]+1)*width;svg+=`<rect x="${cx-16}" y="16" width="32" height="121" rx="3" fill="${notes.includes(midi)?midi%12===c.pc?'#587638':'#2e4422':'#151a12'}" stroke="#6b7c5b"/>${mark(midi,cx,113)}`;}C('chordKeyboard').innerHTML=svg;C('chordKeyboard').setAttribute('aria-label',c.name+', '+['grunnstilling','første omvending','andre omvending','tredje omvending'][inversion]+', MIDI-toner '+notes.join(', '));C('pianoNoteNames').textContent=notes.map(n=>c.names[c.pcs.indexOf(n%12)]).join(' · ');C('pianoInversion').value=inversion;C('pianoInversion').querySelector('option[value="3"]').disabled=c.q.ints.length<4;}
function renderSelection(){const c=info(chords[selected]);C('selectedChordName').textContent=c.name;C('selectedRoman').textContent=analysis(chords[selected]).roman;C('romanReference').textContent=CK[centerKey][0]+' · '+window.ModusTheoryData.modes[scaleMode].name;C('selectedFormula').textContent=c.q.formula.join(' – ');C('selectedNotes').textContent=c.names.join(' · ');drawGuitar();drawPiano();updateLaunchLink();saveDraft();}
function render(){renderSlots();renderSelection();}
C('addChord').onclick=()=>{if(chords.length>=8)return;stop();const steps=window.ModusTheoryData.modes[scaleMode].steps,ints=[0,2,4,6].map(d=>steps[d]),q=qualities.findIndex(quality=>quality.ints.length===4&&quality.ints.every((n,i)=>n===ints[i]));chords.push({key:centerKey,q});selected=chords.length-1;gripIndex=0;inversion=0;render();};C('alternateGrip').onclick=()=>{gripIndex++;drawGuitar();};C('pianoInversion').onchange=e=>{inversion=+e.target.value;drawPiano();};C('chordTempo').onchange=e=>{tempo=Math.max(40,Math.min(200,Math.round(Number(e.target.value)||90)));e.target.value=tempo;updateLaunchLink();saveDraft();};
let playback=null,playbackFrame=0;
function updatePlaybackMarker(){
 const index=playback&&ctx.currentTime>=playback.start?playback.indices[Math.min(playback.indices.length-1,Math.floor((ctx.currentTime-playback.start)/playback.span))]:-1;
 // Keep the theory-to-voicing view synchronized with each sounding chord.
 if(index>=0&&playback.indices.length>1&&index!==selected){
  selected=index;gripIndex=0;inversion=0;
  renderSelection();
  C('chordSlots').querySelectorAll('.chord-slot').forEach((slot,i)=>{
   slot.classList.toggle('selected',i===selected);
   const button=slot.querySelector('.select-chord');
   if(button)button.setAttribute('aria-pressed',String(i===selected));
  });
 }
 C('chordSlots').classList.toggle('is-playing',index>=0);
 C('chordSlots').querySelectorAll('.chord-slot').forEach((slot,i)=>{
  slot.classList.toggle('playing',i===index);
  if(i===index)slot.setAttribute('aria-current','step');else slot.removeAttribute('aria-current');
 });
}
function clearPlaybackMarker(){cancelAnimationFrame(playbackFrame);playbackFrame=0;playback=null;updatePlaybackMarker();}
function followPlayback(token,start,span,indices){
 clearPlaybackMarker();playback={start,span,indices};
 function tick(){if(token!==run)return;updatePlaybackMarker();playbackFrame=requestAnimationFrame(tick);}
 tick();
}
function stop(){run++;clearPlaybackMarker();live.forEach(s=>{try{s.stop();}catch{}});live.clear();busy=false;C('playProgression').textContent='▶ Spill akkordrekken';C('playSelected').disabled=false;C('chordStatus').textContent='';}
async function bufferFor(n){const key=Math.max(48,Math.min(84,48+Math.round((n-48)/3)*3));if(!cache.has(key))cache.set(key,(async()=>{const r=await fetch(`audio/grand-${key}.mp3`);if(!r.ok)throw Error('sample');return ctx.decodeAudioData(await r.arrayBuffer());})().catch(e=>{cache.delete(key);throw e;}));return {buffer:await cache.get(key),key};}
async function play(all){if(busy){stop();return;}busy=true;const token=++run;C('chordStatus').textContent='Laster flygel…';C('playProgression').textContent='■ Stopp';C('playSelected').disabled=true;const playbackIndices=all?chords.map((_,i)=>i):[selected];const groups=all?chords.map(ch=>pianoNotes(ch,0)):[pianoNotes(chords[selected])];try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();bus=ctx.createGain();bus.gain.value=.28;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;bus.connect(comp);comp.connect(ctx.destination);}await ctx.resume();if(ctx.state!=='running')throw Error('audio');const loaded=await Promise.all(groups.map(g=>Promise.all(g.map(bufferFor))));if(token!==run)return;const beat=60/tempo,span=all?4*beat:1.8,start=ctx.currentTime+.07;loaded.forEach((group,i)=>{group.forEach(({buffer,key},j)=>{const source=ctx.createBufferSource(),g=ctx.createGain(),t=start+i*span,d=Math.min(span+.45,buffer.duration/2**((groups[i][j]-key)/12)-.01);source.buffer=buffer;source.playbackRate.value=2**((groups[i][j]-key)/12);source.connect(g);g.connect(bus);g.gain.setValueAtTime(.65,t);g.gain.setValueAtTime(.65,t+Math.max(.01,d-.5));g.gain.exponentialRampToValueAtTime(.0001,t+d);source.start(t);source.stop(t+d+.01);live.add(source);source.onended=()=>{live.delete(source);if(token===run&&live.size===0){clearPlaybackMarker();busy=false;C('playProgression').textContent='▶ Spill akkordrekken';C('playSelected').disabled=false;C('chordStatus').textContent='Spill gjerne akkordrekken selv, på gitar eller piano.';}};});});followPlayback(token,start,span,playbackIndices);C('chordStatus').textContent=all?'Spiller akkordrekken på flygel…':'Spiller valgt piano-omvending…';}catch{if(token===run){stop();C('chordStatus').textContent='Lyden kunne ikke starte. Sjekk forbindelsen og prøv igjen.';}}}
C('playProgression').onclick=()=>play(true);C('playSelected').onclick=()=>play(false);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
C('exportChords').onclick=()=>{const data=window.ModusMidi.create({tempo,title:'MODUS · Egen akkordrekke',program:0,chords:chords.map(ch=>({name:info(ch).name,notes:pianoNotes(ch,0)}))}),url=URL.createObjectURL(new Blob([data],{type:'audio/midi'})),a=document.createElement('a');a.href=url;a.download=`MODUS_akkordrekke_${tempo}bpm.mid`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);C('chordStatus').textContent=`MIDI-fil laget · ${chords.length} takter · ${tempo} BPM`;};
C('jamKey').innerHTML=CK.map((k,i)=>`<option value="${i}">${k[0]}</option>`).join('');C('jamMode').innerHTML=window.ModusTheoryData.modes.map((m,i)=>`<option value="${i}">${m.name}</option>`).join('');C('jamKey').value=centerKey;C('jamMode').value=scaleMode;C('chordTempo').value=tempo;
function changeContext(nextKey,nextMode){
 if(nextKey===centerKey&&nextMode===scaleMode)return;
 stop();
 const tonic=CK[centerKey][1],nextTonic=CK[nextKey][1],oldSteps=window.ModusTheoryData.modes[scaleMode].steps,nextSteps=window.ModusTheoryData.modes[nextMode].steps;
 chords=chords.map(ch=>{
  const distance=(CK[ch.key][1]-tonic+12)%12,degree=analysis(ch).degree;
  let offset=distance-oldSteps[degree];if(offset>6)offset-=12;if(offset<-6)offset+=12;
  const pc=(nextTonic+nextSteps[degree]+offset+24)%12;
  let q=ch.q;
  if(nextMode!==scaleMode&&offset===0){
   const ints=qualities[q].ints.map((_,i)=>(nextSteps[(degree+i*2)%7]-nextSteps[degree]+12)%12);
   const match=qualities.findIndex(quality=>quality.ints.length===ints.length&&quality.ints.every((n,i)=>n===ints[i]));
   if(match>=0)q=match;
  }
  return {key:CK.findIndex(k=>k[1]===pc),q,rootName:spell(CK[nextKey][0],nextTonic,nextSteps[degree]+offset,degree)};
 });
 centerKey=nextKey;scaleMode=nextMode;gripIndex=0;inversion=0;render();
}
/* Familiar harmonic progressions. Values are scale degrees with explicit qualities,
   not fixed chord names, so every preset follows the chosen tonic. */
const progressionPresets={
 pop:{name:'Pop',degrees:[0,4,5,3],qualities:[0,0,1,0],mode:0},
 rock:{name:'Rock',degrees:[0,3,4,0],qualities:[0,0,0,0],mode:0},
 ballad:{name:'Popballade',degrees:[5,3,0,4],qualities:[1,0,0,0],mode:0},
 jazz:{name:'Jazz / ii–V–I',degrees:[1,4,0],qualities:[4,2,3],mode:0},
 minor:{name:'Moll / moderne rock',degrees:[0,5,2,6],qualities:[1,0,0,0],mode:5}
};
function presetChords(preset){
 const tonic=CK[centerKey],steps=window.ModusTheoryData.modes[preset.mode].steps;
 return preset.degrees.map((degree,i)=>{
  const offset=steps[degree],pc=(tonic[1]+offset)%12;
  return {key:CK.findIndex(key=>key[1]===pc),q:preset.qualities[i],rootName:spell(tonic[0],tonic[1],offset,degree)};
 });
}
function updatePresetPreview(){
 const chosen=progressionPresets[C('progressionPreset').value];
 C('progressionPresetPreview').textContent=chosen
  ?chosen.name+': '+presetChords(chosen).map(c=>c.rootName+qualities[c.q].suffix).join(' – ')+'. '+(chosen.mode===5?'Naturlig moll. ':'Dur. ')+'Du kan endre akkordene fritt.'
  :'Velg en progresjon for å sette inn akkordene automatisk. Du kan endre dem fritt etterpå.';
}
C('progressionPreset').addEventListener('change',()=>{
 const preset=progressionPresets[C('progressionPreset').value];
 if(!preset){updatePresetPreview();return;}
 stop();
 chords=presetChords(preset);
 scaleMode=preset.mode;
 C('jamMode').value=scaleMode;
 selected=0;gripIndex=0;inversion=0;
 render();
 updatePresetPreview();
 C('chordStatus').textContent=preset.name+' er lagt inn. Du kan endre akkordene fritt.';
});
C('jamKey').onchange=e=>{changeContext(+e.target.value,scaleMode);updatePresetPreview();};C('jamMode').onchange=e=>{changeContext(centerKey,+e.target.value);updatePresetPreview();};
C('saveSequence').onclick=()=>{const name=(C('sequenceName').value.trim()||chords.map(c=>info(c).name).join(' – ')).slice(0,80),rows=readLibrary(),existing=rows.find(row=>row.name===name),id=existing?existing.id:String(Date.now());if(!existing&&rows.length>=20){C('chordStatus').textContent='Du har 20 lagrede rekker. Gi rekken samme navn som en eksisterende for å oppdatere den.';return;}const item={id,name,...currentSetup()},next=existing?rows.map(row=>row.id===id?item:row):rows.concat(item);try{localStorage.setItem(libraryStorage,JSON.stringify(next));renderLibrary();C('savedSequences').value=id;C('chordStatus').textContent='Lagret: '+name;}catch{C('chordStatus').textContent='Kunne ikke lagre i nettleseren. Du kan fortsatt laste ned MIDI.';}};
C('loadSequence').onclick=()=>{const row=readLibrary().find(r=>r.id===C('savedSequences').value);if(!row){C('chordStatus').textContent='Velg en lagret rekke først.';return;}stop();chords=window.ModusProgressions.validSequence(row.chords);tempo=Number.isInteger(row.tempo)&&row.tempo>=40&&row.tempo<=200?row.tempo:90;centerKey=Number.isInteger(row.key)&&CK[row.key]?row.key:0;scaleMode=Number.isInteger(row.mode)&&window.ModusTheoryData.modes[row.mode]?row.mode:0;selected=0;gripIndex=0;inversion=0;C('chordTempo').value=tempo;C('jamKey').value=centerKey;C('jamMode').value=scaleMode;C('sequenceName').value=row.name;render();C('chordStatus').textContent='Åpnet: '+row.name;};
renderLibrary();render();

window.ModusLanguage=window.ModusLanguage||{};
window.ModusLanguage.query=()=>Object.fromEntries(new URLSearchParams(window.ModusProgressions.link('backingtracks.html',currentSetup()).split('?')[1]));
