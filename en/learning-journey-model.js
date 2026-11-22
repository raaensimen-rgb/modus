(function(root){
'use strict';
const KEY='modus.learning-journey.F03.v1',STEPS=['understand','hear','play','explain','apply'];
const empty=()=>({version:1,module:'F03',checked:[],lastVisited:null});
function parse(raw){
 if(!raw)return {state:empty(),issue:null};
 try{const x=JSON.parse(raw);if(!x||x.module!=='F03'||![0,1].includes(x.version))throw Error('schema');
 const checked=x.version===0?x.completed:x.checked;
 if(!Array.isArray(checked)||checked.some(v=>!STEPS.includes(v))||!(x.lastVisited===null||STEPS.includes(x.lastVisited)))throw Error('data');
 return {state:{...empty(),checked:[...new Set(checked)],lastVisited:x.lastVisited},issue:x.version===0?'migrated':null};
 }catch{return {state:empty(),issue:'invalid'};}
}
function change(state,step,on){if(!STEPS.includes(step))throw Error('step');return {...state,checked:STEPS.filter(v=>v===step?on:state.checked.includes(v))};}
function next(state){return STEPS.find(v=>!state.checked.includes(v))||STEPS[0];}
const api={KEY,STEPS,empty,parse,change,next};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ModusJourney=api;
})(typeof window==='undefined'?this:window);
