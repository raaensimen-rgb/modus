'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const handlers={},outside={};
function group(){const events={},attrs={'aria-expanded':'false'},trigger={focus(){},getAttribute:k=>attrs[k],setAttribute(k,v){attrs[k]=v;},addEventListener(k,fn){events[k]=fn;}},link={focus(){}},panel={hidden:true};return {events,trigger,link,panel,classList:{toggle(){}},contains:n=>n===trigger||n===link,querySelector:s=>s==='.nav-trigger'?trigger:s==='.nav-panel'?panel:link};}
const groups=[group(),group()];
vm.runInNewContext(fs.readFileSync('dist/navigation.js','utf8'),{window:{addEventListener(){}},document:{querySelectorAll:()=>groups,querySelector:()=>null,addEventListener(k,fn){handlers[k]=fn;}}});
const g=groups[0];g.events.click();assert.equal(g.panel.hidden,false);assert.equal(g.trigger.getAttribute('aria-expanded'),'true');
let cancelled=false;handlers.click({target:g.link,preventDefault(){cancelled=true;}});assert.equal(g.panel.hidden,false);assert.equal(cancelled,false);
handlers.focusin({target:g.link});assert.equal(g.panel.hidden,false);
groups[1].events.click();assert.equal(g.panel.hidden,true);assert.equal(groups[1].panel.hidden,false);
handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(groups[1].panel.hidden,true);
g.events.click();handlers.focusin({target:outside});assert.equal(g.panel.hidden,true);
g.events.click();handlers.click({target:outside});assert.equal(g.panel.hidden,true);
console.log('Passed: button disclosure, native link clicks, exclusive panels, outside focus/click and Escape.');
