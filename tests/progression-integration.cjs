const fs=require('fs'),vm=require('vm'),assert=require('assert');
const dist=process.env.MODUS_DIST||'dist';
function sandbox(search='',seed={}){const elements={},data={...seed};function element(id){return elements[id]??={value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},parentElement:{setAttribute(){}},setAttribute(){},addEventListener(){},appendChild(){},replaceChildren(){},querySelectorAll(){return [];},querySelector(){return {disabled:false,prepend(){}}},classList:{add(){},remove(){},toggle(){}}};}const s={URLSearchParams,TextEncoder,console,document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){},createElement:()=>element('created'+Math.random())},window:{addEventListener(){},ModusPiano:{create:()=>({releaseManual(){},refresh(){},clear(){},track(){}})}},location:{search,hash:'',reload(){}},localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;},removeItem:k=>delete data[k]},performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},cancelAnimationFrame(){},setInterval:()=>1,clearInterval(){},_elements:elements,_storage:data};vm.createContext(s);for(const file of ['theory-data.js','progressions.js','midi.js'])vm.runInContext(fs.readFileSync(dist+'/'+file,'utf8'),s);return s;}
const s=sandbox();vm.runInContext(`for(const bad of [null,[],[[99,0]],[[0,99]],[[0,0,'<script>']],[[0,0,'D']]]){if(window.ModusProgressions.validSequence(bad))throw Error('accepted invalid input');}`,s);
for(let length=1;length<=8;length++){
 const rows=Array.from({length},(_,i)=>({key:i%12,q:i%8}));const link=s.window.ModusProgressions.link('backingtracks.html',{chords:rows,key:4,mode:1,tempo:83,style:'jazz'});const scene=sandbox(link.slice(link.indexOf('?')));vm.runInContext(fs.readFileSync(dist+'/app.js','utf8'),scene);assert.equal(vm.runInContext('progression.length',scene),length);assert.equal(vm.runInContext('state.harmony',scene),'custom');assert.equal(vm.runInContext('state.tempo',scene),83);
 vm.runInContext(`audio={currentTime:0};const chordNames=[];chordSound=(c)=>{chordNames.push(c.name);};bassSound=(m,t,d)=>{if(!Number.isFinite(m)||!Number.isFinite(t)||d<=0)throw Error('invalid bass');};drum=()=>{};tone=()=>{};for(const style of ['fusion','rock','funk','ambient','jazz']){state.style=style;for(let n=0;n<progression.length*32;n++)schedule(n,1+n*.2);}for(const chord of progression){const v=chooseChordVoicing(chord,[48,52,55]);if(v.length!==chord.ints.length||v.some(n=>!Number.isFinite(n)||n<48||n>84))throw Error('invalid voicing');}if(chordNames.length===0)throw Error('no chords');`,scene);
}
const native=sandbox();vm.runInContext(fs.readFileSync(dist+'/app.js','utf8'),native);vm.runInContext(`for(const type of ['triad','seventh'])for(let key=0;key<12;key++)for(let mode=0;mode<9;mode++){state.key=key;state.mode=mode;state.harmony='modal';state.chordType=type;update();if(progression.length!==4)throw Error('native loop');for(let d=0;d<7;d++){const chord=chordAt(d),v=chooseChordVoicing(chord);if(v.length!==(type==='triad'?3:4)||v.some(n=>!Number.isFinite(n)))throw Error('native voicing');}}state.key=4;state.mode=5;state.chordType='triad';update();if(progression.map(c=>c.name).join(',')!=='Em,C,G,D')throw Error('E minor triads');state.chordType='seventh';update();if(progression.map(c=>c.name).join(',')!=='Em7,Cmaj7,Gmaj7,D7')throw Error('E minor sevenths');state.key=0;state.mode=7;state.chordType='triad';update();if(chordAt(1).name!=='Ddim'||chordAt(1).roman!=='ii°'||chordAt(2).name!=='E♭aug')throw Error('harmonic minor triads');`,native);
const course=sandbox();vm.runInContext(fs.readFileSync(dist+'/course.js','utf8'),course);vm.runInContext(`for(let key=0;key<12;key++){learner.key=key;const s=setup();const models=s.chords.map(ch=>LP.model(ch,key,1));if(models[0].roman!=='i7'||models[1].roman!=='IV7')throw Error('wrong dorian spelling '+models[1].roman);if(models.some(c=>c.outside.length))throw Error('non-dorian note');for(let step=0;step<6;step++){learner.step=step;render();const launch=LP.readLaunch(L('courseJam').href.split('?')[1]);if(!launch||launch.chords.length!==(step<2?2:4)||launch.mode!==1||launch.key!==key)throw Error('lesson launch');}}learner.done=[0,2];learner.notes={0:'Testnotat'};saveLearner();`,course);const saved=JSON.parse(course._storage['modus-course-dorian-v1']);assert.deepEqual(saved.done,[0,2]);assert.equal(saved.notes[0],'Testnotat');
const workshop=sandbox('',{'modus-chord-draft-v1':JSON.stringify({chords:[{key:4,q:4},{key:9,q:2}],key:4,mode:1,tempo:82})});vm.runInContext(fs.readFileSync(dist+'/chord-tool.js','utf8'),workshop);assert.equal(vm.runInContext('chords.length',workshop),2);assert.equal(vm.runInContext('tempo',workshop),82);vm.runInContext(`const launch=window.ModusProgressions.readLaunch(C('openBackingTrack').href.split('?')[1]);if(launch.chords.length!==2||launch.mode!==1)throw Error('workshop launch');C('sequenceName').value='Min testrekke';C('saveSequence').onclick();`,workshop);assert.equal(JSON.parse(workshop._storage['modus-chord-library-v1'])[0].name,'Min testrekke');
console.log('Passed: input validation; 1–8-bar loops in five grooves; triad/seventh voicings; 216 native scale/chord combinations; six lessons in 12 keys; local progress and chord saving.');
// Verify chord spellings, played guitar tones and piano inversions independently.
vm.runInContext(`for(let key=0;key<12;key++)for(let q=0;q<qualities.length;q++){
 const chord={key,q},c=info(chord),options=grips(chord);if(!options.length)throw Error('missing guitar grip');
 for(const g of options){const pcs=g.frets.flatMap((f,i)=>f<0?[]:[(tuning[i]+f)%12]);
  if(pcs.some(p=>!c.pcs.includes(p)))throw Error('non-chord tone in guitar grip');
  // A perfect fifth may be omitted in a practical guitar voicing.
  for(const index of [0,1,...(c.q.ints.length===4?[3]:[])])if(!pcs.includes(c.pcs[index]))throw Error('missing essential chord tone');
 }
 for(let inv=0;inv<c.q.ints.length;inv++){const pitches=pianoNotes(chord,inv);if(pitches[0]%12!==c.pcs[inv]||pitches.some(p=>!c.pcs.includes(p%12)))throw Error('incorrect piano inversion');}
}`,workshop);
function theorySandbox(search=''){
 const t=sandbox(search),tabs=['intervals','modes','chords','cadences'].map(topic=>({dataset:{topic},id:'tab-'+topic,setAttribute(){},focus(){}}));
 t.document.querySelectorAll=selector=>selector==='[data-topic]'?tabs:[];
 vm.runInContext(fs.readFileSync(dist+'/theory.js','utf8'),t);return t;
}
const theory=theorySandbox('?key=2&topic=cadences&cadence=1');
assert.equal(vm.runInContext('ts.key',theory),2);assert.equal(vm.runInContext('ts.cadence',theory),1);
vm.runInContext(`for(let key=0;key<12;key++){
 ts.key=key;ts.topic='cadences';
 for(let cadence=0;cadence<3;cadence++){ts.cadence=cadence;render();const setup=window.ModusProgressions.readLaunch(T('practiceLink').href.split('?')[1]),c=cadenceData();
 if(setup.chords.length!==3||setup.key!==key)throw Error('cadence transfer');
 setup.chords.forEach((ch,i)=>{const actual=window.ModusProgressions.model(ch,key,setup.mode),expected=c.chords[i];if(actual.name!==expected.name||actual.ints.some((n,j)=>(actual.midi+n)%12!==expected.pcs[j]))throw Error('cadence changed in transfer');});
 }
 ts.topic='chords';for(let q=0;q<8;q++){ts.quality=q;render();const setup=window.ModusProgressions.readLaunch(T('practiceLink').href.split('?')[1]);if(setup.chords.length!==1||setup.chords[0].q!==q||setup.key!==key)throw Error('chord transfer');}
}`,theory);
// Decode exported MIDI to check tempo, meter, complete bars and note-offs.
function readMidi(bytes){
 const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'MThd');assert.equal(b.readUInt16BE(8),1);assert.equal(b.readUInt16BE(10),2);assert.equal(b.readUInt16BE(12),480);
 let offset=14;const tracks=[];
 for(let track=0;track<2;track++){
  assert.equal(b.toString('ascii',offset,offset+4),'MTrk');const end=offset+8+b.readUInt32BE(offset+4);offset+=8;let tick=0;const events=[];
  function vlq(){let n=0,c;do{c=b[offset++];n=n*128+(c&127);}while(c&128);return n;}
  while(offset<end){tick+=vlq();const status=b[offset++];if(status===255){const type=b[offset++],length=vlq(),data=[...b.subarray(offset,offset+length)];offset+=length;events.push({tick,type,data});}else{const length=(status&240)===192?1:2;events.push({tick,status,data:[...b.subarray(offset,offset+length)]});offset+=length;}}
  assert.equal(offset,end);tracks.push(events);
 }
 assert.equal(offset,b.length);return tracks;
}
for(let length=1;length<=8;length++){
 const rows=Array.from({length},(_,i)=>({name:'Chord '+i,notes:[48+i,52+i,55+i]}));
 const tracks=readMidi(s.window.ModusMidi.create({tempo:80,title:'MODUS',chords:rows}));
 assert.deepEqual(tracks[0].find(e=>e.type===81).data,[11,113,176]);assert.deepEqual(tracks[0].find(e=>e.type===88).data,[4,2,24,8]);
 const on=tracks[1].filter(e=>e.status===144),off=tracks[1].filter(e=>e.status===128);assert.equal(on.length,length*3);assert.equal(off.length,on.length);
 on.forEach(e=>assert(off.some(x=>x.tick===e.tick+1920&&x.data[0]===e.data[0])));assert.equal(tracks[1].at(-1).tick,length*1920);
}
console.log('Passed: guitar/piano voicings in 12 roots; exact cadence/chord transfers; decoded MIDI tempo, meter, note-offs and 1–8-bar duration.');
(async()=>{
 const a=sandbox();vm.runInContext(fs.readFileSync(dist+'/app.js','utf8'),a);
 vm.runInContext(`audio={currentTime:0,state:'running',resume:()=>Promise.resolve()};master={gain:{cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){}}};initAudio=()=>{};let finishLoad,scheduled=0;loadSamples=()=>new Promise(resolve=>{finishLoad=resolve;});scheduler=()=>{scheduled++;};const pendingStart=start();`,a);
 await Promise.resolve();vm.runInContext('stop();finishLoad();',a);await vm.runInContext('pendingStart',a);
 assert.equal(vm.runInContext('playing',a),false);assert.equal(vm.runInContext('scheduled',a),0);assert.equal(a._elements.play.disabled,false);
 console.log('Passed: cancelling an instrument load cannot start audio afterwards.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Exercise the actual key/mode change handlers, including persistence and transfer.
const contextWorkshop=sandbox();
vm.runInContext(fs.readFileSync(dist+'/chord-tool.js','utf8'),contextWorkshop);
vm.runInContext(`
 C('jamKey').onchange({target:{value:'2'}});
 if(chords.map(ch=>info(ch).name).join(',')!=='Dmaj7,Bm7,Em7,A7')throw Error('key did not transpose chords');
 C('jamMode').onchange({target:{value:'1'}});
 if(chords.map(ch=>info(ch).name).join(',')!=='Dm7,Bm7♭5,Em7,Am7')throw Error('mode did not harmonize chords');
 const stored=JSON.parse(localStorage.getItem(draftStorage));
 const transfer=window.ModusProgressions.readLaunch(C('openBackingTrack').href.split('?')[1]);
 if(stored.key!==2||stored.mode!==1||stored.chords[1].q!==6||transfer.chords[1].q!==6)throw Error('changed harmony not saved/transferred');
 if(!C('chordSlots').innerHTML.includes('Bm7♭5'))throw Error('cards not updated');
 let stops=0;stop=()=>{stops++;};render=()=>{};
 for(let key=0;key<12;key++)for(let oldMode=0;oldMode<9;oldMode++)for(let nextMode=0;nextMode<9;nextMode++)for(let degree=0;degree<7;degree++)for(const count of [3,4]){
  centerKey=key;scaleMode=oldMode;
  const oldSteps=window.ModusTheoryData.modes[oldMode].steps,newSteps=window.ModusTheoryData.modes[nextMode].steps;
  const ints=Array.from({length:count},(_,i)=>(oldSteps[(degree+2*i)%7]-oldSteps[degree]+12)%12);
  const q=qualities.findIndex(q=>q.ints.join()===ints.join());if(q<0)throw Error('unsupported scale chord');
  chords=[{key:(CK[key][1]+oldSteps[degree])%12,q}];
  changeContext(key,nextMode);
  const result=info(chords[0]);
  const expected=Array.from({length:count},(_,i)=>(newSteps[(degree+2*i)%7]-newSteps[degree]+12)%12);
  if(result.pc!==(CK[key][1]+newSteps[degree])%12||result.q.ints.join()!==expected.join())throw Error('wrong adapted harmony');
  const roundTrip=window.ModusProgressions.readLaunch(window.ModusProgressions.link('backingtracks.html',currentSetup()).split('?')[1]);
  if(!roundTrip)throw Error('adapted sequence invalid');
  changeContext(key,oldMode);
  if(info(chords[0]).q.ints.join()!==ints.join())throw Error('mode round trip failed');
 }
 centerKey=0;scaleMode=0;chords=[{key:8,q:2,rootName:'A♭'}];changeContext(2,0);
 if(info(chords[0]).name!=='B♭7')throw Error('chromatic transposition');
 centerKey=0;scaleMode=0;chords=[{key:1,q:2,rootName:'D♭'}];changeContext(0,1);
 if(info(chords[0]).name!=='D♭7')throw Error('chromatic chord lost');
 if(!stops)throw Error('context change did not stop playback');
`,contextWorkshop);
console.log('Passed: actual context controls update cards, draft and backingtrack; all mode pairs in 12 keys; triads/sevenths; round trips and chromatic chords.');
