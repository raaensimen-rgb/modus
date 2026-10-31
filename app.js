'use strict';
const $=id=>document.getElementById(id);
const MODES=[
{name:'Ionisk',steps:[0,2,4,5,7,9,11],degrees:[0,3,4,0],color:'Lyst og åpent. La stor septim lede tilbake til grunntonen.',focus:'Stor 7',intervals:['1','2','3','4','5','6','7']},
{name:'Dorisk',steps:[0,2,3,5,7,9,10],degrees:[0,3,0,3],color:'Moll med lys sekst. Vekslingen i–IV fremhever den doriske fargen.',focus:'Stor 6',intervals:['1','2','♭3','4','5','6','♭7']},
{name:'Frygisk',steps:[0,1,3,5,7,8,10],degrees:[0,1,0,1],color:'Mørkt og tett. Den lave andre tonen ligger rett over grunntonen.',focus:'Liten 2',intervals:['1','♭2','♭3','4','5','♭6','♭7']},
{name:'Lydisk',steps:[0,2,4,6,7,9,11],degrees:[0,1,0,1],color:'Svevende dur. Den hevede kvarten gir klangen et åpent, filmatisk preg.',focus:'Hevet 4',intervals:['1','2','3','♯4','5','6','7']},
{name:'Miksolydisk',steps:[0,2,4,5,7,9,10],degrees:[0,6,3,0],color:'Dur med senket septim. Et naturlig utgangspunkt for rock og fusion.',focus:'Liten 7',intervals:['1','2','3','4','5','6','♭7']},
{name:'Eolisk',steps:[0,2,3,5,7,8,10],degrees:[0,5,2,6],color:'Naturlig moll. Utforsk den lille seksten og den naturlige mollklangen.',focus:'Liten 6',intervals:['1','2','♭3','4','5','♭6','♭7']},
{name:'Lokrisk',steps:[0,1,3,5,6,8,10],degrees:[0,0,0,0],color:'Ustabilt og spenningsfylt. En tonikadrone holder sentrum mens du utforsker ♭2 og ♭5.',focus:'Senket 5',intervals:['1','♭2','♭3','4','♭5','♭6','♭7']},
{name:'Harmonisk moll',steps:[0,2,3,5,7,8,11],degrees:[0,3,4,0],color:'Moll med hevet septim. Dominanten V7 trekker tydelig hjem til molltonika; utforsk spranget mellom ♭6 og 7.',focus:'Stor 7 · ♭6',intervals:['1','2','♭3','4','5','♭6','7']},
{name:'Frygisk dominant',steps:[0,1,4,5,7,8,10],degrees:[0,1,3,0],color:'Femte modus av harmonisk moll. Stor ters og liten sekund gir en markant klang når grunntonen holdes som sentrum.',focus:'Liten 2 · stor 3',intervals:['1','♭2','3','4','5','♭6','♭7']}];
const KEYS=[['C',0],['C♯',1],['D',2],['E♭',3],['E',4],['F',5],['F♯',6],['G',7],['A♭',8],['A',9],['B♭',10],['B',11]];
let state={key:4,mode:5,style:'fusion',harmony:'modal',chordType:'triad',tempo:90,click:false,intervals:false,mapInstrument:'guitar',chordInstrument:'auto',customChords:[],levels:{drums:65,bass:65,chords:55},muted:{drums:false,bass:false,chords:false}};
try{const saved=JSON.parse(localStorage.getItem('modus-v1'));if(saved&&KEYS[saved.key]&&MODES[saved.mode])state={...state,...saved,tempo:Math.max(40,Math.min(200,Number(saved.tempo)||90)),levels:{...state.levels,...saved.levels},muted:{...state.muted,...saved.muted}};}catch{}
// Links from lessons and the chord workshop carry a validated, complete setup.
const theoryLaunch=new URLSearchParams(location.search),importedSequence=window.ModusProgressions.readLaunch(location.search);
state.customChords=window.ModusProgressions.validSequence(state.customChords)||[];
if(theoryLaunch.has('key')){const value=Number(theoryLaunch.get('key'));if(Number.isInteger(value)&&KEYS[value])state.key=value;}
if(theoryLaunch.has('mode')){const value=Number(theoryLaunch.get('mode'));if(Number.isInteger(value)&&MODES[value])state.mode=value;}
if(importedSequence){state.customChords=importedSequence.chords;state.key=importedSequence.key;state.mode=importedSequence.mode;state.tempo=importedSequence.tempo;state.style=importedSequence.style;state.harmony='custom';}
else if(theoryLaunch.has('key')||theoryLaunch.has('mode'))state.harmony=theoryLaunch.get('harmony')==='drone'?'drone':'modal';
if(theoryLaunch.get('harmony')==='drone')state.harmony='drone';
if(theoryLaunch.has('tempo')){const n=Number(theoryLaunch.get('tempo'));if(Number.isInteger(n)&&n>=40&&n<=200)state.tempo=n;}
if(['fusion','jazz','rock','funk','ambient'].includes(theoryLaunch.get('style')))state.style=theoryLaunch.get('style');
if(['acoustic','electric'].includes(theoryLaunch.get('instrument')))state.chordInstrument=theoryLaunch.get('instrument');
if(state.harmony==='custom'&&!state.customChords.length)state.harmony='modal';
if(!['triad','seventh'].includes(state.chordType))state.chordType='triad';
if(['triad','seventh'].includes(theoryLaunch.get('chordType')))state.chordType=theoryLaunch.get('chordType');
const save=()=>{try{localStorage.setItem('modus-v1',JSON.stringify(state));}catch{}};
let progression=[],notes=[],playing=false,audio,master,compressor,noiseBuffer,timer,step=0,nextTime=0,visualTimers=[],activeSources=new Set(),tapTimes=[];
$('key').innerHTML=KEYS.map((k,i)=>`<option value="${i}">${k[0]}</option>`).join('');
$('mode').innerHTML=MODES.map((m,i)=>`<option value="${i}">${m.name}</option>`).join('');
function spellScale(){const name=KEYS[state.key][0],letters=['C','D','E','F','G','A','B'],natural=[0,2,4,5,7,9,11],start=letters.indexOf(name[0]),root=KEYS[state.key][1];return MODES[state.mode].steps.map((n,i)=>{const li=(start+i)%7;let diff=(root+n-natural[li]+12)%12;if(diff>6)diff-=12;return letters[li]+(diff>0?'♯'.repeat(diff):'♭'.repeat(-diff));});}
function chordAt(d){
 const m=MODES[state.mode],r=m.steps[d],seventh=state.chordType==='seventh';
 const ints=(seventh?[0,2,4,6]:[0,2,4]).map(x=>m.steps[(d+x)%7]+12*Math.floor((d+x)/7)-r);
 const minor=ints[1]===3,dim=ints[2]===6,aug=ints[2]===8,major7=ints[3]===11,fullDim=dim&&ints[3]===9;
 const suffix=seventh?(fullDim?'dim7':dim?'m7♭5':aug?'augMaj7':minor?(major7?'m(maj7)':'m7'):(major7?'maj7':'7')):(dim?'dim':aug?'aug':minor?'m':'');
 let numeral=['I','II','III','IV','V','VI','VII'][d];if(minor)numeral=numeral.toLowerCase();
 const quality=seventh?(fullDim?'°7':dim?'ø7':aug?'+maj7':major7?'maj7':'7'):(dim?'°':aug?'+':'');
 const alteration=m.steps[d]-[0,2,4,5,7,9,11][d];
 return{degree:d,name:notes[d]+suffix,roman:(alteration===-1?'♭':alteration===1?'♯':'')+numeral+quality,midi:48+KEYS[state.key][1]+r,ints};
}
function chordSampleName(){return state.chordInstrument==='acoustic'||state.chordInstrument==='auto'&&state.style==='jazz'?'jazz-piano':'piano';}
function updateSoundDescription(){$('soundDescription').textContent=(chordSampleName()==='jazz-piano'?'Akustisk flygel':'Elpiano')+(state.style==='jazz'?' · kontrabass · jevn 4/4-puls.':' · elbass · akustiske trommer.');}
function update(){updateSoundDescription();notes=spellScale();const m=MODES[state.mode],custom=state.harmony==='custom'&&state.customChords.length;progression=custom?state.customChords.map(ch=>window.ModusProgressions.model(ch,state.key,state.mode)):(state.harmony==='drone'||state.mode===6?[0,0,0,0]:m.degrees).map(chordAt);$('chords').innerHTML=progression.map((c,i)=>`<div class="chord" id="chord${i}"><small>${String(i+1).padStart(2,'0')}</small><strong>${c.name}</strong><span class="roman">${c.roman}</span></div>`).join('');$('scaleTitle').textContent=KEYS[state.key][0]+' '+m.name.toLowerCase();$('modeFormula').textContent=m.intervals.join(' – ');$('scaleNotes').innerHTML=notes.map((n,i)=>`<span title="${m.intervals[i]}">${n}</span>`).join('');$('modePill').textContent=m.focus;$('modeDescription').textContent=m.color;$('loopInfo').textContent=custom?'EGEN REKKE · '+progression.length+' TAKTER':state.harmony==='drone'||state.mode===6?'TONIKADRONE · 4 TAKTER':'4 TAKTER';$('chordType').disabled=Boolean(custom);$('chordTypeHelp').textContent=custom?'Akkordtypene følger den egne rekken. Endre dem i akkordverkstedet.':state.chordType==='triad'?'Tre toner per akkord: dur, moll, forminsket eller forstørret, ut fra valgt skala.':'Fire toner per akkord: maj7, m7, 7 og andre septimakkorder, ut fra valgt skala.';$('customSequenceNote').hidden=!custom;$('harmony').querySelector('option[value="custom"]').disabled=!state.customChords.length;if(custom){const outside=progression.filter(c=>c.outside.length).map(c=>c.name+': '+c.outside.join(', '));$('customScaleInfo').textContent=outside.length?'Toner utenfor valgt skalakart – '+outside.join(' · ')+'. Kartet viser fortsatt '+KEYS[state.key][0]+' '+m.name.toLowerCase()+'.':'Akkordtonene passer i valgt skalakart: '+KEYS[state.key][0]+' '+m.name.toLowerCase()+'.';$('editCustomSequence').href=window.ModusProgressions.link('akkorder.html',{chords:state.customChords,key:state.key,mode:state.mode,tempo:state.tempo,style:state.style});}drawFretboard();save();}
function drawFretboard(){
 jamPiano.releaseManual();
 if(state.mapInstrument==='piano'){drawPiano();return;}
 $('fretboard').setAttribute('viewBox','0 0 1060 340');$('fretboard').setAttribute('aria-label','Gripebrett med '+KEYS[state.key][0]+' '+MODES[state.mode].name.toLowerCase()+' i standardstemming');$('mapScroll').classList.remove('piano-map');$('mapCaption').textContent='STANDARDSTEMMING · E A D G B E';$('mapRange').textContent='ÅPEN STRENG → 15. BÅND';
 const m=MODES[state.mode],root=KEYS[state.key][1],tuning=[64,59,55,50,45,40],openNames=['E','B','G','D','A','E'];
 const nut=110,spacing=62,x=f=>f===0?70:nut+(f-.5)*spacing,y=str=>50+str*43;
 let svg='<rect x="110" y="25" width="930" height="265" rx="8" fill="#11170f"/>';
 for(let f=1;f<=15;f++){
  if(f%2===1)svg+=`<rect x="${nut+(f-1)*spacing}" y="25" width="${spacing}" height="265" fill="#1c2618"/>`;
  svg+=`<text x="${x(f)}" y="320" text-anchor="middle" fill="#d1d9c5" font-size="16" font-weight="600">${f}</text>`;
 }
 for(const f of [3,5,7,9,12,15])for(const yy of(f===12?[114,200]:[157]))svg+=`<circle cx="${x(f)}" cy="${yy}" r="5" fill="#56624a"/>`;
 for(let f=0;f<=15;f++)svg+=`<line x1="${nut+f*spacing}" y1="25" x2="${nut+f*spacing}" y2="290" stroke="${f===0?'#dde4d2':'#66725b'}" stroke-width="${f===0?5:1.5}"/>`;
 tuning.forEach((open,str)=>{
  svg+=`<text x="18" y="${y(str)+6}" text-anchor="middle" fill="#bdc8b0" font-size="16" font-weight="600">${openNames[str]}</text><line x1="50" x2="1040" y1="${y(str)}" y2="${y(str)}" stroke="#929c86" stroke-width="${1+str*.22}"/>`;
  for(let f=0;f<=15;f++){
   const idx=m.steps.indexOf((open+f-root+120)%12);if(idx<0)continue;
   const tonic=idx===0,label=state.intervals?m.intervals[idx]:notes[idx];
   svg+=`<g><title>${openNames[str]}-streng, ${f===0?'åpen':f+'. bånd'}: ${notes[idx]} (${m.intervals[idx]})</title>`;
   if(tonic)svg+=`<circle cx="${x(f)}" cy="${y(str)}" r="21" fill="none" stroke="#d7f48c" stroke-width="2"/>`;
   svg+=`<circle cx="${x(f)}" cy="${y(str)}" r="18" fill="${tonic?'#d7f48c':'#465b36'}" stroke="${tonic?'#e9ffc2':'#98b27e'}" stroke-width="1.5"/><text x="${x(f)}" y="${y(str)+.5}" dominant-baseline="middle" text-anchor="middle" fill="${tonic?'#14200c':'#ffffff'}" font-family="sans-serif" font-weight="700" font-size="${label.length>2?14:17}">${label}</text></g>`;
  }
 });
 $('fretboard').innerHTML=svg;
}
const jamPiano=window.ModusPiano.create({element:$('fretboard'),name:m=>{const i=MODES[state.mode].steps.indexOf((m-KEYS[state.key][1]+120)%12);return i<0?window.ModusPiano.noteName(m):notes[i];},load:async midi=>{initAudio();await audio.resume();await loadSamples();master.gain.cancelScheduledValues(audio.currentTime);master.gain.setValueAtTime(.68,audio.currentTime);const sample=samples[chordSampleName()],nearest=[...sample.keys()].reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a);return {context:audio,output:channelGains.chords,buffer:sample.get(nearest),nearest};},onError:()=>{$('error').textContent='Kunne ikke spille tonen.';}});
function drawPiano(){
 const m=MODES[state.mode],root=KEYS[state.key][1],whitePC=[0,2,4,5,7,9,11],blackAfter=[0,1,3,4,5],blackPC=[1,3,6,8,10],keyWidth=48,left=24,top=20,height=238;
 let svg='<rect width="1110" height="320" fill="#11170f"/>';
 const labelFor=(midi,cx,black)=>{
  const idx=m.steps.indexOf((midi-root+120)%12);if(idx<0)return '';
  const tonic=idx===0,cy=black?142:219,label=state.intervals?m.intervals[idx]:notes[idx];
  return `<g data-note-midi="${midi}">${tonic?`<circle cx="${cx}" cy="${cy}" r="19" fill="none" stroke="${black?'#d7f48c':'#3c5722'}" stroke-width="2"/>`:''}<circle cx="${cx}" cy="${cy}" r="16" fill="${tonic?'#d7f48c':black?'#465b36':'#344a26'}"/><text x="${cx}" y="${cy+.5}" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${label.length>2?12:15}" font-weight="700" fill="${tonic?'#14200c':'#ffffff'}">${label}</text></g>`;
 };
 // Three octaves plus C6, covering every possible Jam voicing. Black keys are drawn on top.
 for(let octave=0;octave<=3;octave++)for(let w=0;w<(octave===3?1:7);w++){
  const midi=48+octave*12+whitePC[w],x=left+(octave*7+w)*keyWidth,idx=m.steps.indexOf((midi-root+120)%12),tonic=idx===0;
  svg+=`<g><title>${idx>=0?notes[idx]+' ('+m.intervals[idx]+')':'Utenfor valgt skala'} · MIDI ${midi}</title><rect data-midi="${midi}" data-tonic="${tonic}" x="${x}" y="${top}" width="${keyWidth-1}" height="${height}" rx="4" fill="${tonic?'#e0efbc':idx>=0?'#e2e9d7':'#f4f3eb'}" stroke="#647057"/>${labelFor(midi,x+keyWidth/2,false)}</g>`;
  if(w===0)svg+=`<text x="${x+keyWidth/2}" y="291" text-anchor="middle" fill="#c5d0b9" font-size="14">C${octave+3}</text>`;
 }
 for(let octave=0;octave<3;octave++)for(let b=0;b<5;b++){
  const midi=49+octave*12+blackPC[b]-1,cx=left+(octave*7+blackAfter[b]+1)*keyWidth,idx=m.steps.indexOf((midi-root+120)%12),tonic=idx===0;
  svg+=`<g><title>${idx>=0?notes[idx]+' ('+m.intervals[idx]+')':'Utenfor valgt skala'} · MIDI ${midi}</title><rect data-midi="${midi}" data-tonic="${tonic}" x="${cx-17}" y="${top}" width="34" height="148" rx="3" fill="${tonic?'#516d30':idx>=0?'#293d20':'#161a14'}" stroke="#68765a"/>${labelFor(midi,cx,true)}</g>`;
 }
 $('fretboard').setAttribute('viewBox','0 0 1110 320');$('fretboard').setAttribute('aria-label','Pianokart med '+KEYS[state.key][0]+' '+m.name.toLowerCase()+', C3 til C6');$('fretboard').innerHTML=svg;jamPiano.refresh();$('mapScroll').classList.add('piano-map');$('mapCaption').textContent='PIANOKART · TRE OKTAVER';$('mapRange').textContent='C3 → C6 · GRUNNTONER MARKERT I LYST GRØNT';
}
for(const id of ['mapInstrument','chordInstrument']){
 $(id).value=state[id];$(id).addEventListener('change',()=>{state[id]=$(id).value;if(id==='mapInstrument')drawFretboard();else updateSoundDescription();save();});
}
for(const id of ['key','mode','style','harmony','chordType']){$(id).value=state[id];$(id).addEventListener('change',()=>{state[id]=id==='key'||id==='mode'?Number($(id).value):$(id).value;const was=playing;if(was)stop();update();if(was)start();});}
function setTempo(v){state.tempo=Math.max(40,Math.min(200,Math.round(Number(v)||90)));$('tempo').value=$('bpm').value=state.tempo;save();}
$('tempo').oninput=e=>setTempo(e.target.value);$('bpm').onchange=e=>setTempo(e.target.value);setTempo(state.tempo);$('click').checked=state.click;$('click').onchange=e=>{state.click=e.target.checked;save();};$('tap').onclick=()=>{const now=performance.now();if(tapTimes.length&&now-tapTimes.at(-1)>2000)tapTimes=[];tapTimes.push(now);tapTimes=tapTimes.slice(-5);if(tapTimes.length>1)setTempo(60000/((now-tapTimes[0])/(tapTimes.length-1)));};
$('noteToggle').onclick=()=>{state.intervals=!state.intervals;$('noteToggle').textContent=state.intervals?'Vis tonenavn ↗':'Vis intervaller ↗';drawFretboard();save();};$('noteToggle').textContent=state.intervals?'Vis tonenavn ↗':'Vis intervaller ↗';
const labels={drums:'Trommer',bass:'Bass',chords:'Akkorder'};$('mixer').innerHTML=Object.entries(labels).map(([id,name])=>`<div class="channel"><button id="mute-${id}" aria-label="Demp ${name.toLowerCase()}" aria-pressed="${state.muted[id]}">${state.muted[id]?'−':'♪'}</button><label for="vol-${id}">${name}</label><input type="range" id="vol-${id}" min="0" max="100" value="${state.levels[id]}" aria-label="Volum ${name.toLowerCase()}"><output id="out-${id}">${state.levels[id]}</output></div>`).join('');for(const id of Object.keys(labels)){$('mute-'+id).onclick=()=>{state.muted[id]=!state.muted[id];$('mute-'+id).setAttribute('aria-pressed',state.muted[id]);$('mute-'+id).textContent=state.muted[id]?'−':'♪';save();};$('vol-'+id).oninput=e=>{state.levels[id]=+e.target.value;$('out-'+id).textContent=e.target.value;save();};}
const samples={piano:new Map(),bass:new Map(),'jazz-piano':new Map(),'jazz-bass':new Map(),drums:{}},channelGains={};let sampleLoad,room,pianoRoom,previousVoicing=null;
function initAudio(){if(audio)return;audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.68;compressor=audio.createDynamicsCompressor();compressor.threshold.value=-17;compressor.knee.value=18;compressor.ratio.value=3;master.connect(compressor);compressor.connect(audio.destination);for(const id of Object.keys(labels)){const g=audio.createGain();g.gain.value=1;g.connect(master);channelGains[id]=g;}room=audio.createConvolver();const impulse=audio.createBuffer(2,Math.floor(audio.sampleRate*1.3),audio.sampleRate);for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(audio.sampleRate*.22))*.24;}room.buffer=impulse;const wet=audio.createGain();wet.gain.value=.22;room.connect(wet);wet.connect(master);
 pianoRoom=audio.createConvolver();const grandImpulse=audio.createBuffer(2,Math.floor(audio.sampleRate*2.6),audio.sampleRate);
 for(let ch=0;ch<2;ch++){const data=grandImpulse.getChannelData(ch);for(let i=0;i<data.length;i++){const seconds=i/audio.sampleRate;data[i]=seconds<.025?0:(Math.random()*2-1)*Math.exp(-(seconds-.025)/.54)*.16;}for(const [delay,gain] of [[.029,.26],[.047,.19],[.073,.12]])data[Math.floor((delay+ch*.003)*audio.sampleRate)]+=gain;}
 pianoRoom.buffer=grandImpulse;const roomTone=audio.createBiquadFilter(),roomWet=audio.createGain();roomTone.type='lowpass';roomTone.frequency.value=4700;roomWet.gain.value=.23;pianoRoom.connect(roomTone);roomTone.connect(roomWet);roomWet.connect(master);
}
async function loadSamples(){if(sampleLoad)return sampleLoad;sampleLoad=(async()=>{const jobs=[];async function load(url){const response=await fetch(url);if(!response.ok)throw Error('Sample '+response.status);return audio.decodeAudioData(await response.arrayBuffer());}for(const [name,lo,hi] of [['piano',48,84],['bass',28,64],['jazz-piano',48,84],['jazz-bass',28,64]])for(let n=lo;n<=hi;n+=3)jobs.push(load(`audio/${name==='jazz-piano'?'grand':name}-${n}.mp3`).then(b=>samples[name].set(n,b)));for(const name of ['kick','snare','hihat'])jobs.push(load(`audio/${name}.mp3`).then(b=>samples.drums[name]=b));await Promise.all(jobs);})();try{await sampleLoad;}catch(e){sampleLoad=null;throw e;}}
const freq=n=>440*2**((n-69)/12);const level=id=>state.muted[id]?0:state.levels[id]/100;
function track(src){activeSources.add(src);src.onended=()=>activeSources.delete(src);return src;}
function tone(midi,t,duration,vol,type='sine',cutoff=2200){if(vol<=0)return;const osc=track(audio.createOscillator()),g=audio.createGain();osc.type=type;osc.frequency.value=freq(midi);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+duration+.01);}
function playSample(buffer,t,duration,volume,rate,channel,pan=0,send=0,options={}){
 if(volume<=0||!buffer)return;
 const available=buffer.duration/rate-.005;if(available<=.01)return;
 const src=track(audio.createBufferSource()),g=audio.createGain(),p=audio.createStereoPanner();src.buffer=buffer;src.playbackRate.value=rate;p.pan.value=pan;
 if(options.grand){
  const body=audio.createBiquadFilter(),warmth=audio.createBiquadFilter();body.type='lowshelf';body.frequency.value=180;body.gain.value=1.3;warmth.type='highshelf';warmth.frequency.value=3400;warmth.gain.value=-2.1;src.connect(body);body.connect(warmth);warmth.connect(g);
 }else src.connect(g);
 g.connect(p);p.connect(channelGains[channel]);if(send){const r=audio.createGain();r.gain.value=send;p.connect(r);r.connect(options.grand?pianoRoom:room);}
 const gate=Math.min(duration,available),end=Math.min(gate+(options.release||0),available);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.004);
 if(options.grand){const releaseStart=Math.max(.005,Math.min(gate,end-.01));g.gain.setValueAtTime(volume,t+releaseStart);g.gain.exponentialRampToValueAtTime(Math.max(.00001,volume*.008),t+end);}
 else{g.gain.setValueAtTime(volume,t+Math.max(.005,end-.08));g.gain.linearRampToValueAtTime(0,t+end);}
 src.start(t);src.stop(t+end+.01);return {source:src,end:t+end};
}
function instrument(name,midi,t,duration,velocity){
 const nearest=[...samples[name].keys()].reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a),grand=name==='jazz-piano',keys=name.includes('piano');
 const pan=keys?Math.max(-.4,Math.min(.4,(midi-65)/(grand?85:36))):0;
 const release=state.style==='ambient'?1.65:state.style==='jazz'?.55:state.style==='funk'?.28:.95;
 const voice=playSample(samples[name].get(nearest),t,duration,velocity*(grand?.88:1),2**((midi-nearest)/12),keys?'chords':'bass',pan,grand?(state.style==='ambient'?.78:.44):keys?(state.style==='ambient'?1.2:.45):0,grand?{grand:true,release}:{});
 if(keys&&voice)jamPiano.track(voice.source,midi,t,voice.end,audio);
}
function chooseChordVoicing(c,previousVoicing=null){let voices=c.ints.map(n=>c.midi+n);while(voices[0]>60)voices=voices.map(n=>n-12);const candidates=[];for(let inv=0;inv<voices.length;inv++){const v=voices.slice();for(let i=0;i<inv;i++)v[i]+=12;v.sort((a,b)=>a-b);for(const octave of [-12,0,12]){const candidate=v.map(n=>n+octave);if(candidate[0]>=48&&candidate.at(-1)<=84)candidates.push(candidate);}}let best=candidates[0]||voices;if(previousVoicing&&previousVoicing.length){const score=v=>v.reduce((sum,n)=>sum+Math.min(...previousVoicing.map(p=>Math.abs(n-p))),0)+Math.abs(v[0]-previousVoicing[0])*.2;best=candidates.reduce((a,b)=>score(b)<score(a)?b:a,best);}return best;}
function chordVoicing(c){return previousVoicing=chooseChordVoicing(c,previousVoicing);}
const vary=(v,amount=.1)=>v*(1+(Math.random()-.5)*amount*2);
function chordSound(c,t,duration){const v=level('chords')*.32;chordVoicing(c).forEach((m,i)=>instrument(chordSampleName(),m,t+i*.009+Math.random()*.005,duration,vary(v)));}
function bassSound(m,t,d,velocity=1){instrument(state.style==='jazz'?'jazz-bass':'bass',m,t,d,vary(level('bass')*.65*velocity,.07));}
function drum(name,t,velocity=1){playSample(samples.drums[name],t,samples.drums[name].duration,vary(level('drums')*({kick:.85,snare:.65,hihat:.32}[name])*velocity,.09),vary(1,.012),'drums',name==='hihat'?.25:0,name==='snare'?.14:.04);}
function walkingBassNote(c,next,beatIndex,variation){
 let root=c.midi-24;while(root<28)root+=12;while(root>47)root-=12;
 if(state.harmony==='drone'||state.mode===6&&state.harmony!=='custom')return root;
 if(beatIndex===0)return root;
 if(beatIndex===1)return root+c.ints[variation%2?2:1];
 if(beatIndex===2)return root+(variation%2?12:c.ints[2]);
 // Approach the next root from a neighbouring scale tone, preserving the selected scale.
 let target=next.midi-24;while(target<30)target+=12;while(target>49)target-=12;
 if(c.custom)return target+(variation%2?1:-1);
 const scale=MODES[state.mode].steps,tonic=KEYS[state.key][1];
 const candidates=[];for(let n=target-2;n<=target+2;n++)if(n!==target&&scale.includes((n-tonic+120)%12))candidates.push(n);
 return candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||(variation%2?b-a:a-b))[0]??root+c.ints[1];
}
function schedule(s,t){const bar=Math.floor(s/16)%progression.length,p=s%16,beat=60/state.tempo,c=progression[bar],ambient=state.style==='ambient',cycle=Math.floor(s/(16*progression.length)),funk=state.style==='funk',rock=state.style==='rock',jazz=state.style==='jazz';const groove=t+(funk&&p%2?beat*.025:0)+(jazz?0:Math.random()*.004);
if(jazz){
 // Consistent 4/4: piano on beats 2 and 4 in every bar.
 if(p===4||p===12)chordSound(c,groove,beat*.8);
 if(p%4===0)bassSound(walkingBassNote(c,progression[(bar+1)%progression.length],p/4,bar+cycle),groove,beat*.87,p===0?1:.88);
 // Swing eighths on the hi-hat, with a softer kick and light snare punctuation.
 if(p%4===0)drum('hihat',groove,p===4||p===12?.95:.68);
 if(p===8)drum('hihat',groove,.68);
 if(p===0||p===8)drum('kick',groove,.26);
 if(p===4||p===12)drum('snare',groove,.23);
 
}else{
 if(p===0)chordSound(c,groove,beat*(ambient?3.9:funk?.55:2.7));if(!ambient&&((funk&&[6,10,14].includes(p))||(!rock&&!funk&&p===10)||(rock&&p===8)))chordSound(c,groove,beat*(rock?1.6:.65));
 const bass=c.midi-24;
 if(ambient){if(p===0)bassSound(bass,groove,beat*3.8);}else{const pattern=funk?[0,3,6,8,11,14]:rock?[0,2,4,6,8,10,12,14]:[0,6,8,11,14];if(pattern.includes(p)){const isDrone=state.harmony==='drone'||state.mode===6&&state.harmony!=='custom';const pitch=isDrone?0:p===8?c.ints[2]:p===14?12:p===11?c.ints[1]:0;bassSound(bass+pitch,groove,beat*(funk?.34:rock?.42:.65),p%4===0?1:.82);}}
 if(!ambient){const kicks=rock?[0,6,8,10]:funk?[0,6,8,14]:cycle%2?[0,7,8,14]:[0,7,8];if(kicks.includes(p))drum('kick',groove);if(p===4||p===12)drum('snare',groove+.006);if(p%2===0||funk)drum('hihat',groove,p%4===0?1:.58);if(!rock&&p===15&&bar%2===1)drum('snare',groove,.2);if(bar===progression.length-1&&cycle%2===1&&[13,15].includes(p))drum('snare',groove,p===15?.6:.35);}
}
if(state.click&&p%4===0)tone(p===0?96:89,t,.035,.13);
if(p%4===0){const id=setTimeout(()=>{if(!playing)return;document.querySelectorAll('.chord').forEach((el,i)=>el.classList.toggle('active',i===bar));document.querySelectorAll('.beatlights i').forEach((el,i)=>el.classList.toggle('active',i===p/4));$('position').textContent=`Takt ${bar+1} / ${progression.length} · Slag ${p/4+1}`;},Math.max(0,(t-audio.currentTime)*1000));visualTimers.push(id);if(visualTimers.length>32)visualTimers.splice(0,16);}}

function scheduler(){while(nextTime<audio.currentTime+.12){schedule(step,nextTime);nextTime+=60/state.tempo/4;step=(step+1)%(progression.length*32);}}
let starting=false,startRun=0;
async function start(){if(starting)return;starting=true;const run=++startRun;$('play').disabled=true;$('playText').textContent='Laster instrumenter…';try{initAudio();await audio.resume();await loadSamples();if(run!==startRun)return;if(audio.state!=='running')throw Error('blocked');master.gain.cancelScheduledValues(audio.currentTime);master.gain.setValueAtTime(.68,audio.currentTime);playing=true;step=0;previousVoicing=null;nextTime=audio.currentTime+.06;$('playIcon').textContent='■';$('playText').textContent='Stopp jam';$('play').setAttribute('aria-label','Stopp backingtrack');$('error').textContent='';scheduler();timer=setInterval(scheduler,25);}catch{if(run===startRun){$('error').textContent='Kunne ikke laste instrumentene. Sjekk forbindelsen og prøv igjen.';stop();}}finally{if(run===startRun){starting=false;$('play').disabled=false;}}}
function stop(){jamPiano.clear();startRun++;starting=false;$('play').disabled=false;playing=false;clearInterval(timer);visualTimers.forEach(clearTimeout);visualTimers=[];if(audio){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(.0001,audio.currentTime,.012);for(const src of activeSources){try{src.stop(audio.currentTime+.055);}catch{}}}$('playIcon').textContent='▶';$('playText').textContent='Start jam';$('play').setAttribute('aria-label','Start backingtrack');$('position').textContent='Klar når du er';document.querySelectorAll('.chord,.beatlights i').forEach(el=>el.classList.remove('active'));}
window.addEventListener('pagehide',stop);$('play').onclick=()=>playing?stop():start();document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.defaultPrevented&&!document.activeElement.isContentEditable&&!['INPUT','SELECT','BUTTON','TEXTAREA','A','SUMMARY'].includes(document.activeElement.tagName)){e.preventDefault();playing?stop():start();}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(playing||starting))stop();});$('reset').onclick=()=>{stop();try{localStorage.removeItem('modus-v1');}catch{}location.reload();};update();

$('downloadMidi').onclick=()=>{
 let previous=null;const chords=progression.map(c=>{previous=chooseChordVoicing(c,previous);return {name:c.name,notes:previous};});
 const title=(state.harmony==='custom'?'Egen akkordrekke · ':state.chordType==='triad'?'Treklanger · ':'Septimakkorder · ')+KEYS[state.key][0]+' '+MODES[state.mode].name+' · '+state.tempo+' BPM';
 const data=window.ModusMidi.create({tempo:state.tempo,title,chords,program:chordSampleName()==='jazz-piano'?0:4});
 const blob=new Blob([data],{type:'audio/midi'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 const filename=('MODUS_'+KEYS[state.key][0]+'_'+MODES[state.mode].name+'_'+state.tempo+'bpm').replace(/♯/g,'sharp').replace(/♭/g,'flat').replace(/ /g,'_');
 link.href=url;link.download=filename+'.mid';document.body.appendChild(link);link.click();link.remove();$('downloadMidi').textContent='MIDI laget ✓';setTimeout(()=>{$('downloadMidi').textContent='Last ned MIDI ↓';},3000);setTimeout(()=>URL.revokeObjectURL(url),1000);
};

window.ModusLanguage=window.ModusLanguage||{};
window.ModusLanguage.query=()=>({key:state.key,mode:state.mode,tempo:state.tempo,style:state.style,instrument:state.chordInstrument,harmony:state.harmony,chordType:state.chordType,seq:state.harmony==='custom'?JSON.stringify(state.customChords.map(c=>c.rootName?[c.key,c.q,c.rootName]:[c.key,c.q])):null});
