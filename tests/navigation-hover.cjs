'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.MODUS_NAVIGATION_SOURCE||'navigation.js','utf8');
function setup(hover=true){
 const handlers={};let focused;
 function group(){
  const events={},attrs={'aria-expanded':'false'},trigger={focus(){focused=trigger;},getAttribute:k=>attrs[k],setAttribute(k,v){attrs[k]=v;},addEventListener(k,f){events[k]=f;}},link={focus(){focused=link;}},panel={hidden:true};
  return {events,trigger,link,panel,classList:{toggle(){}},contains:n=>n===trigger||n===link,addEventListener(k,f){events['group:'+k]=f;},querySelector:s=>s==='.nav-trigger'?trigger:s==='.nav-panel'?panel:link};
 }
 const groups=[group(),group()];
 vm.runInNewContext(source,{window:{matchMedia:()=>({matches:hover}),addEventListener(){}},document:{querySelectorAll:()=>groups,querySelector:()=>null,addEventListener(k,f){handlers[k]=f;}}});
 return {groups,handlers,focus:()=>focused};
}
for(const menu of [0,1]){
 const {groups,handlers,focus}=setup(),g=groups[menu],other=groups[1-menu];
 g.events['group:mouseenter']();assert.equal(g.panel.hidden,false,'hover opens');
 g.events.click({detail:1});assert.equal(g.panel.hidden,false,'first pointer click keeps hover-opened menu open');
 g.events.click({detail:1});assert.equal(g.panel.hidden,true,'second pointer click closes');
 g.events.click({detail:0});assert.equal(g.panel.hidden,false,'keyboard opens');
 g.events['group:mouseenter']();g.events.click({detail:1});assert.equal(g.panel.hidden,true,'hover does not reclassify keyboard-opened menu');
 g.events['group:mouseenter']();g.events.click({detail:0});assert.equal(g.panel.hidden,true,'keyboard toggles even when hover opened');
 g.events['group:mouseenter']();g.events.keydown({key:'ArrowDown',preventDefault(){}});g.events.click({detail:1});assert.equal(g.panel.hidden,true,'ArrowDown takes ownership from hover');
 g.events['group:mouseenter']();g.events['group:mouseleave']();assert.equal(g.panel.hidden,true,'leave closes');
 g.events.click({detail:1});assert.equal(g.panel.hidden,false,'leave clears hover origin');
 let cancelled=false;handlers.click({target:g.link,preventDefault(){cancelled=true;}});assert.equal(cancelled,false,'links remain native');
 handlers.focusin({target:g.link});assert.equal(g.panel.hidden,false,'panel focus keeps open');
 other.events.click({detail:0});assert.equal(g.panel.hidden,true,'exclusive opening');
 handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(other.panel.hidden,true);assert.equal(focus(),other.trigger,'Escape restores focus');
 g.events['group:mouseenter']();handlers.click({target:{}});g.events.click({detail:1});assert.equal(g.panel.hidden,false,'outside click clears origin');
 handlers.focusin({target:{}});assert.equal(g.panel.hidden,true,'outside focus closes');
 g.events.keydown({key:'ArrowDown',preventDefault(){}});assert.equal(g.panel.hidden,false);assert.equal(focus(),g.link,'ArrowDown focuses first link');
}
const {groups}=setup(false),g=groups[0];
g.events['group:mouseenter']();assert.equal(g.panel.hidden,true,'touch does not hover-open');
g.events.click({detail:1});assert.equal(g.panel.hidden,false,'first touch opens');
g.events.click({detail:1});assert.equal(g.panel.hidden,true,'second touch closes');
console.log('PASS: both menus, hover/first/second click, keyboard, touch, re-entry, native links, exclusivity, leave, outside focus/click and Escape.');
