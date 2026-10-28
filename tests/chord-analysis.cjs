'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function setup(locale=''){
 const scope={window:{}};
 vm.runInNewContext(fs.readFileSync('dist/'+locale+'theory-data.js','utf8'),scope);
 vm.runInNewContext(fs.readFileSync('dist/'+locale+'progressions.js','utf8'),scope);
 const source=fs.readFileSync('dist/'+locale+'chord-tool.js','utf8');
 const pure=source.slice(source.indexOf('function spell('),source.indexOf('function grips('));
 vm.runInNewContext("const CK=window.ModusTheoryData.keys,qualities=window.ModusProgressions.qualities;let centerKey=0,scaleMode=0;"+pure+";this.analyze=(ch,key,mode)=>{centerKey=key;scaleMode=mode;return {root:chordRootName(ch),chord:info(ch),model:analysis(ch)};};",scope);
 return scope;
}
for(const locale of ['','en/']){
 const s=setup(locale),check=(key,q,tonic,mode,roman,root)=>{const r=s.analyze({key,q},tonic,mode);assert.equal(r.model.roman,roman);if(root)assert.equal(r.root,root);return r;};
 check(2,4,0,0,'ii7');check(7,2,0,0,'V7');check(0,3,0,0,'Imaj7');
 check(4,1,4,1,'i');check(9,0,4,1,'IV');check(9,1,4,5,'iv');
 check(7,0,4,5,'♭III');check(8,0,0,0,'♭VI');check(10,0,0,4,'♭VII');
 check(8,7,9,7,'vii°7','G♯');check(11,6,0,0,'viiø7');check(0,5,0,0,'i(maj7)');
 check(3,4,1,0,'ii7','D♯');check(5,7,6,0,'vii°7','E♯');
 assert.equal(s.analyze({key:3,q:1,rootName:'E♭'},1,0).root,'E♭','Explicit spelling remains intentional');
 const letters=['C','D','E','F','G','A','B'],natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const pc=name=>(natural[name[0]]+[...name.slice(1)].reduce((v,c)=>v+(c==='♯'?1:-1),0)+36)%12;
 const data=s.window.ModusTheoryData;
 for(let tonic=0;tonic<12;tonic++)for(let mode=0;mode<data.modes.length;mode++)data.modes[mode].steps.forEach((step,degree)=>{
  const key=(data.keys[tonic][1]+step)%12;
  for(let q=0;q<8;q++){
   const r=s.analyze({key,q},tonic,mode);
   assert.equal(r.root[0],letters[(letters.indexOf(data.keys[tonic][0][0])+degree)%7]);assert.equal(pc(r.root),key);
   r.chord.names.forEach((name,i)=>assert.equal(pc(name),r.chord.notes[i]%12));
  }
 });
 const page=fs.readFileSync('dist/'+locale+'akkorder.html','utf8');
 for(const id of ['jamKey','jamMode','romanReference','romanHelp','selectedRoman'])assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert(page.indexOf('id="jamKey"')<page.indexOf('id="chordSlots"'));
 assert(!locale||page.includes('TONAL CENTRE AND SCALE MAP'));
}
console.log('Passed: chord degrees, all 12 tonics and 9 scales, enharmonic spelling, explicit spellings, shared notation and both languages.');
