/* Shared scale spelling and guitar model; formulas come from Musikkatlas. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ModusScales=api;})(globalThis,()=>{
'use strict';
const ids=['ionian','dorian','phrygian','lydian','mixolydian','aeolian','locrian'];
const characters=[[2,6],[5],[1],[3],[6],[5],[1,4]], open=[40,45,50,55,59,64], letters='CDEFGAB', naturals=[0,2,4,5,7,9,11];
const mod=n=>(n%12+12)%12;
function parse(name){const m=/^([A-G])([#♯b♭]{0,2}|𝄪)?$/.exec(name);if(!m)throw RangeError('Invalid root');const a=m[2]||'';const accidental=a==='𝄪'?2:[...a].reduce((v,c)=>v+('♯#'.includes(c)?1:-1),0);return {letter:m[1],pc:mod(naturals[letters.indexOf(m[1])]+accidental)};}
function spell(name,pc,offset,degree){const i=(letters.indexOf(name[0])+degree)%7;let a=mod(pc+offset-naturals[i]);if(a>6)a-=12;if(Math.abs(a)>2)throw RangeError('Unsupported accidental');return letters[i]+(a===2?'𝄪':a>0?'♯':a===-2?'♭♭':a<0?'♭':'');}
function create(data){
 function scale(root,mode){mode=({major:'ionian',naturalMinor:'aeolian'})[mode]||mode;const index=ids.indexOf(mode);if(index<0)throw RangeError('Invalid mode');const p=parse(root),m=data.modes[index];return m.steps.map((offset,i)=>({pc:mod(p.pc+offset),name:spell(root,p.pc,offset,i),degree:m.intervals[i],character:characters[index].includes(i),root:i===0}));}
 function position(root,mode,string,fret){if(!Number.isInteger(string)||string<1||string>6||!Number.isInteger(fret)||fret<0||fret>24)throw RangeError('Invalid guitar position');const midi=open[6-string]+fret,pc=mod(midi),note=scale(root,mode).find(n=>n.pc===pc);return {string,fret,midi,pc,member:!!note,...(note||{})};}
 return {scale,position,board:(root,mode)=>open.flatMap((_,s)=>Array.from({length:25},(_,f)=>position(root,mode,6-s,f)))};
}
return {ids,open,parse,spell,create};
});
