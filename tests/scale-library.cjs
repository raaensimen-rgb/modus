'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const context={window:{}};vm.runInNewContext(fs.readFileSync('theory-data.js','utf8'),context);const api=require('../scale-model.js'),m=api.create(JSON.parse(JSON.stringify(context.window.ModusTheoryData)));
const roots=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const offsets=[[0,2,4,5,7,9,11],[0,2,3,5,7,9,10],[0,1,3,5,7,8,10],[0,2,4,6,7,9,11],[0,2,4,5,7,9,10],[0,2,3,5,7,8,10],[0,1,3,5,6,8,10]],degrees=[['1','2','3','4','5','6','7'],['1','2','♭3','4','5','6','♭7'],['1','♭2','♭3','4','5','♭6','♭7'],['1','2','3','♯4','5','6','7'],['1','2','3','4','5','6','♭7'],['1','2','♭3','4','5','♭6','♭7'],['1','♭2','♭3','4','♭5','♭6','♭7']],chars=[[2,6],[5],[1],[3],[6],[5],[1,4]],tuning=[64,59,55,50,45,40],letters='CDEFGAB',natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const decode=n=>(natural[n[0]]+[...n.slice(1).replace('𝄪','♯♯')].reduce((v,c)=>v+(c==='♯'?1:-1),0)+24)%12;
let count=0;for(let r=0;r<12;r++)for(let mode=0;mode<7;mode++)for(let s=1;s<=6;s++)for(let f=0;f<=24;f++){
 const p=m.position(roots[r],api.ids[mode],s,f),pc=(tuning[s-1]+f)%12,i=offsets[mode].indexOf((pc-r+12)%12);assert.equal(p.pc,pc);assert.equal(p.midi,tuning[s-1]+f);assert.equal(p.member,i>=0);if(i>=0){assert.equal(p.degree,degrees[mode][i]);assert.equal(p.character,chars[mode].includes(i));assert.equal(p.root,i===0);assert.equal(decode(p.name),pc);assert.equal(p.name[0],letters[(letters.indexOf(roots[r][0])+i)%7]);}count++;
}
const p=(s,f)=>m.position('E','dorian',s,f),names=(r,mode)=>m.scale(r,mode).map(n=>n.name).join(' '),passed=[];function test(id,fn){fn();passed.push(id);}
test('SK-001',()=>{assert.equal(p(6,0).midi,40);assert.equal(p(6,0).degree,'1')});
test('SK-002',()=>{assert.equal(p(6,9).name,'C♯');assert.equal(p(6,9).midi,49);assert(p(6,9).character)});
test('SK-003',()=>{assert.equal(p(3,6).midi,61);assert.equal(p(3,6).degree,'6')});
test('SK-004',()=>assert.equal(p(2,2).midi,p(3,6).midi));test('SK-005',()=>assert.equal(p(3,4).midi,p(2,0).midi));test('SK-006',()=>assert.equal(p(2,5).midi,p(1,0).midi));
test('SK-007',()=>{for(const mode of api.ids)for(const f of [0,12,24]){const n=m.position('E',mode,6,f);assert.equal(n.midi,40+f);assert(n.root)}});
test('SK-008',()=>{assert.equal(names('C','lydian'),'C D E F♯ G A B');assert.equal(m.scale('C','lydian')[3].degree,'♯4')});test('SK-009',()=>assert.equal(names('C','locrian'),'C D♭ E♭ F G♭ A♭ B♭'));
test('SK-010',()=>assert.equal(names('C♯','major'),'C♯ D♯ E♯ F♯ G♯ A♯ B♯'));test('SK-011',()=>assert.equal(m.scale('C♯','lydian')[3].name,'F𝄪'));
test('SK-012',()=>{for(const mode of api.ids){const a=m.board('C♯',mode),b=m.board('D♭',mode);assert.deepEqual(a.map(n=>n.member),b.map(n=>n.member));assert.notEqual(names('C♯',mode),names('D♭',mode))}});
for(const [id,a,b] of [['SK-013','major','ionian'],['SK-014','naturalMinor','aeolian']])test(id,()=>{for(const r of roots)assert.deepEqual(m.board(r,a),m.board(r,b))});
test('SK-015',()=>{const a=m.scale('E','dorian').map(n=>n.pc),b=m.scale('E','aeolian').map(n=>n.pc);assert.deepEqual(a.filter(n=>!b.includes(n)),[1]);assert.deepEqual(b.filter(n=>!a.includes(n)),[0])});
test('SK-016',()=>assert.deepEqual(m.scale('D','dorian').map(n=>n.pc),m.scale('E','dorian').map(n=>(n.pc+10)%12)));
test('SK-017',()=>{for(const f of [-1,25,1.5,NaN])assert.throws(()=>p(6,f),RangeError)});test('SK-018',()=>{for(const s of [0,7,1.5,NaN])assert.throws(()=>p(s,0),RangeError)});
test('SK-019',()=>{const path=require('node:path'),base=path.resolve(__dirname,'../../package');assert.equal(fs.readFileSync(base+'/scale-model.js','utf8'),fs.readFileSync(base+'/en/scale-model.js','utf8'));const load=p=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(p,'utf8'),c);return api.create(JSON.parse(JSON.stringify(c.window.ModusTheoryData)))};const nb=load(base+'/theory-data.js'),en=load(base+'/en/theory-data.js');for(const r of roots)for(const mode of api.ids)assert.deepEqual(nb.board(r,mode),en.board(r,mode))});
test('SK-020',()=>{const n=m.board('E','dorian').filter(n=>n.name==='C♯');assert.equal(n.length,12);assert(n.every(n=>n.character))});
for(const root of ['D♭','G♭','D♯','A♯','B♯','C♭','F♭','E♯'])for(const mode of api.ids){const notes=m.scale(root,mode);assert.equal(new Set(notes.map(n=>n.name[0])).size,7);for(const n of notes)assert.equal(decode(n.name),n.pc)}
console.log(JSON.stringify({matrix:count,matrixPassed:count,tests:passed,enharmonicScales:56,aliasBoards:24},null,2));
