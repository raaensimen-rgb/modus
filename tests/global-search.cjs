'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root,'dist/search-index.json'),'utf8'));
assert(index.length >= 10, 'Expected articles and main navigation entries');
const urls = new Set();
for (const entry of index) {
  assert(entry.title && entry.url && entry.type, 'Required search fields missing');
  assert(!entry.url.startsWith('/') && !entry.url.includes('..'), 'Unsafe search URL');
  assert(!urls.has(entry.url), 'Duplicate search URL: ' + entry.url); urls.add(entry.url);
  assert(fs.existsSync(path.join(root,'dist',entry.url)), 'Missing Norwegian target: ' + entry.url);
  assert(fs.existsSync(path.join(root,'dist/en',entry.url)), 'Missing English target: ' + entry.url);
}
assert(index.some(x=>x.type==='article'),'Article search missing');
assert(index.some(x=>x.type==='atlas'),'Atlas search missing');
const englishIndex = JSON.parse(fs.readFileSync(path.join(root,'dist/en/search-index.json'),'utf8'));
assert.equal(englishIndex.length,index.length,'Both locales must index the same public URLs');
assert(englishIndex.some((x,i)=>x.title!==index[i].title),'English titles must not simply duplicate Norwegian index');
const code = fs.readFileSync(path.join(root,'dist/global-search.js'),'utf8');
// Catch reintroducing the native search control in the actual generated pages.
for (const locale of ['', 'en/']) {
 const html=fs.readFileSync(path.join(root,'dist',locale,'artikler.html'),'utf8');
 const field=html.match(/<input\b[^>]*\bdata-global-search-input\b[^>]*>/)?.[0];
 assert(field,'Generated search field missing: '+locale);
 assert(/\btype="text"/.test(field),'Avoid native Escape-to-clear search control');
 assert(/\brole="searchbox"/.test(field),'Retain accessible search semantics');
 assert(/\binputmode="search"/.test(field),'Retain mobile search keyboard hint');
}
let activeElement=null;
const makeElement = () => ({
  value:'', textContent:'', href:'', className:'', children:[], listeners:{},
  addEventListener(name,fn,options){(this.listeners[name]??=[]).push({fn,capture:options===true||!!options?.capture})},
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(){this.children=[]},
  focus(){activeElement=this}
});
function emit(element,name,event={}) { for(const {fn} of element.listeners[name]||[]) fn(event); }
// Dispatch through capture/target/bubble instead of directly calling a listener.
// A default native clear action is simulated only when not prevented.
function keydown(document,dialog,target,properties={}) {
 const event={key:'Escape',isComposing:false,defaultPrevented:false,stopped:false,...properties,
  preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true}};
 const route=[document,dialog,...(target===dialog?[]:[target])];
 for(const capture of [true,false]) {
  for(const element of capture?route:[...route].reverse()) {
   for(const listener of element.listeners.keydown||[]) if(listener.capture===capture)listener.fn(event);
   if(event.stopped)break;
  }
  if(event.stopped)break;
 }
 if(!event.defaultPrevented&&target.type==='search'&&event.key==='Escape')target.value='';
 return event;
}
async function exercise(pathname) {
 const input=makeElement(), results=makeElement(), status=makeElement(), close=makeElement(), trigger=makeElement();
 const dialog=Object.assign(makeElement(),{open:false,closeCalls:0,querySelector(s){return {'[data-global-search-input]':input,'[data-global-search-results]':results,'[data-global-search-status]':status,'[data-global-search-close]':close}[s]},showModal(){this.open=true},close(){this.closeCalls++;this.open=false;emit(this,'close')}});
 const document=Object.assign(makeElement(),{querySelector(s){return {'[data-global-search-dialog]':dialog,'[data-global-search-open]':trigger}[s]},createElement:makeElement});
 const english = pathname.startsWith('/en/');
 let fetched='';
 const context={document,location:{pathname},fetch:async(url)=>{fetched=url;return {ok:true,json:async()=>english?englishIndex:index}}};
 vm.runInNewContext(code,context,{filename:'global-search.js'});
 assert(document.listeners.keydown.some(listener=>listener.capture),'Escape must be captured at document level');
 const openSearch=()=>trigger.listeners.click[0].fn();
 assert.equal(typeof trigger.listeners.click[0].fn,'function','Search trigger missing');
 await openSearch();
 assert(dialog.open,'Dialog must open');
 assert.equal(activeElement,input,'Search input must receive focus');
 assert.equal(fetched,english?'/en/search-index.json':'/search-index.json','Wrong localized search index');
 assert(status.textContent.includes(english?'Type':'Skriv'),'Initial empty search state missing');
 input.value='dorisk'; emit(input,'input');
 assert(results.children.length>0,'Dorian query should return matches');
 assert(results.children.some(x=>x.href.includes('dorisk')),'Dorian article/lesson must be reachable');
 assert(results.children.every(x=>x.href.startsWith(pathname.startsWith('/en/')?'/en/':'/')),'Wrong locale prefix');
 input.value='xyzz_not_a_topic';emit(input,'input');assert.equal(results.children.length,0,'No match must yield empty list');
 for (const term of ['akkorder','intervaller','atlas']) {input.value=term;emit(input,'input');assert(results.children.length>0,'Required term missing: '+term)}
 input.value='modus';emit(input,'input');assert(results.children.length>0,'Partial query must match');
 input.value='';emit(input,'input');assert.equal(results.children.length,0,'Cleared query must remove matches');
 assert(dialog.open,'Manually clearing the field must not close the dialog');
 const shortcut=keydown(document,dialog,input,{metaKey:true,key:'k'});assert(shortcut.defaultPrevented,'Keyboard shortcut not handled');
 // Model a target handler consuming Escape: document capture must run first.
 let targetEscapes=0;
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){targetEscapes++;event.stopPropagation();}});
 for(const value of ['', 'dorisk']) {
  await openSearch();input.value=value;emit(input,'input');
  const calls=dialog.closeCalls;
  const escaped=keydown(document,dialog,input);
  assert(escaped.defaultPrevented&&escaped.stopped,'Escape must be owned in capture phase');
  assert(!dialog.open,'Escape must close with empty or filled input');
  assert.equal(dialog.closeCalls,calls+1,'Close exactly once per Escape');
  assert.equal(activeElement,trigger,'Focus must return to trigger');
  assert.equal(input.value,value,'Escape closes without clearing the query');
 }
 assert.equal(targetEscapes,0,'Escape must not reach a consuming input handler');
 const other=makeElement();other.focus();
 const closedEscape=keydown(document,dialog,other);
 assert(!closedEscape.defaultPrevented,'Closed search must not capture Escape');
 assert.equal(activeElement,other,'Closed search must not steal focus');
 await openSearch();
 const composing=keydown(document,dialog,input,{isComposing:true});
 assert(dialog.open&&!composing.defaultPrevented,'Do not interrupt IME composition');
 const ordinary=keydown(document,dialog,input,{key:'a'});
 assert(dialog.open&&!ordinary.defaultPrevented,'Do not consume normal typing');
 // Escape from another control in the dialog must also close and restore focus.
 close.focus();keydown(document,dialog,close);
 assert(!dialog.open&&activeElement===trigger,'Escape from close button must restore focus');
 await openSearch();
 let cancelled=false;
 emit(dialog,'cancel',{preventDefault(){cancelled=true}});
 assert(cancelled && !dialog.open,'Native cancel must close dialog');
 assert.equal(activeElement,trigger,'Native cancel must restore focus');
 await openSearch();
 emit(close,'click');assert(!dialog.open,'Close control must close dialog');
 assert.equal(activeElement,trigger,'Close control must restore focus');
 await openSearch();emit(dialog,'click',{target:input});assert(dialog.open,'Click inside must not close');
 emit(dialog,'click',{target:dialog});assert(!dialog.open&&activeElement===trigger,'Backdrop must close and restore focus');
}
(async()=>{await exercise('/');await exercise('/en/artikler.html');console.log('Passed global search: index, links, matching, empty state, locales and keyboard access.');})().catch(e=>{console.error(e);process.exitCode=1});
