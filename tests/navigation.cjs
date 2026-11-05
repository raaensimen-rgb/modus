'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const handlers={},outside={};
function group(){const events={},attrs={'aria-expanded':'false'},trigger={focus(){},getAttribute:k=>attrs[k],setAttribute(k,v){attrs[k]=v;},addEventListener(k,fn){events[k]=fn;}},link={focus(){}},panel={hidden:true};return {events,trigger,link,panel,classList:{toggle(){}},contains:n=>n===trigger||n===link,addEventListener(k,fn){events['group:'+k]=fn;},querySelector:s=>s==='.nav-trigger'?trigger:s==='.nav-panel'?panel:link};}
const groups=[group(),group()];
vm.runInNewContext(fs.readFileSync('dist/navigation.js','utf8'),{window:{addEventListener(){}},document:{querySelectorAll:()=>groups,querySelector:()=>null,addEventListener(k,fn){handlers[k]=fn;}}});
const g=groups[0];
g.events['group:mouseenter']();assert.equal(g.panel.hidden,false,'desktop hover opens dropdown');
g.events['group:mouseleave']();assert.equal(g.panel.hidden,true,'leaving menu closes dropdown');
g.events.click();assert.equal(g.panel.hidden,false);assert.equal(g.trigger.getAttribute('aria-expanded'),'true');
let cancelled=false;handlers.click({target:g.link,preventDefault(){cancelled=true;}});assert.equal(g.panel.hidden,false);assert.equal(cancelled,false);
handlers.focusin({target:g.link});assert.equal(g.panel.hidden,false);
groups[1].events.click();assert.equal(g.panel.hidden,true);assert.equal(groups[1].panel.hidden,false);
handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(groups[1].panel.hidden,true);
g.events.click();handlers.focusin({target:outside});assert.equal(g.panel.hidden,true);
g.events.click();handlers.click({target:outside});assert.equal(g.panel.hidden,true);
const dropdownMarkup=fs.readFileSync('dist/index.html','utf8');
assert(dropdownMarkup.includes('>Hjem<span class="nav-tooltip"'),'Home should be labeled Hjem');
assert(dropdownMarkup.includes('>Studier<span class="nav-chevron"'),'Studies dropdown should be labeled Studier');
for(const label of ['Start å lære','Læringsløpet','Leksjoner og øvelser','Utforsk musikkteori']) {
 assert(dropdownMarkup.includes(label),'missing descriptive label: '+label);
}
assert(dropdownMarkup.includes('href="modus-plus.html" class="nav-membership"'),'membership preview must remain navigable');
assert(dropdownMarkup.includes('class="nav-coming" aria-hidden="true">Kommer</span>'),'membership must show coming-soon status');
assert(dropdownMarkup.includes('Kjøp er ikke åpnet.'),'membership preview tooltip must clarify no purchases');
const navStyles=fs.readFileSync('dist/navigation.css','utf8');
assert(dropdownMarkup.includes('class="nav-tooltip" aria-hidden="true"'),'main links need explanatory hover tips');
assert(dropdownMarkup.includes('aria-description="'),'hover tips must have an accessible equivalent');

assert(dropdownMarkup.includes('class="nav-chevron" aria-hidden="true"></span>'),'chevrons must be pure decorative CSS shapes');

assert(navStyles.includes('.site-header .nav-panel small{display:block'),'submenu descriptions must be visible');
assert(navStyles.includes('#nav-panel-learn'),'learning submenu should have a distinct readable layout');
assert(navStyles.includes('.nav-panel:not([hidden])::before'),'hover menu needs a pointer-safe bridge');
assert(navStyles.includes('pointer-events:none'),'tooltip must not capture pointer events');
console.log('Passed: button disclosure, native link clicks, exclusive panels, outside focus/click and Escape.');
