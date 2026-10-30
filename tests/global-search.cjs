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
const makeElement = () => ({
  value:'', textContent:'', href:'', className:'', children:[], listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn},
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(){this.children=[]},
  focus(){this.focused=true}
});
async function exercise(pathname) {
 const input=makeElement(), results=makeElement(), status=makeElement(), close=makeElement(), trigger=makeElement();
 const dialog={open:false,querySelector(s){return {'[data-global-search-input]':input,'[data-global-search-results]':results,'[data-global-search-status]':status,'[data-global-search-close]':close}[s]},showModal(){this.open=true},close(){this.open=false},addEventListener(){}};
 const listeners={};
 const document={querySelector(s){return {'[data-global-search-dialog]':dialog,'[data-global-search-open]':trigger}[s]},createElement:makeElement,addEventListener(n,fn){listeners[n]=fn}};
 const english = pathname.startsWith('/en/');
 let fetched='';
 const context={document,location:{pathname},fetch:async(url)=>{fetched=url;return {ok:true,json:async()=>english?englishIndex:index}}};
 vm.runInNewContext(code,context,{filename:'global-search.js'});
 assert.equal(typeof trigger.listeners.click,'function','Search trigger missing');
 await trigger.listeners.click();
 assert(dialog.open,'Dialog must open');
 assert(input.focused,'Search input must receive focus');
 assert.equal(fetched,english?'/en/search-index.json':'/search-index.json','Wrong localized search index');
 assert(status.textContent.includes(english?'Type':'Skriv'),'Initial empty search state missing');
 input.value='dorisk'; input.listeners.input();
 assert(results.children.length>0,'Dorian query should return matches');
 assert(results.children.some(x=>x.href.includes('dorisk')),'Dorian article/lesson must be reachable');
 assert(results.children.every(x=>x.href.startsWith(pathname.startsWith('/en/')?'/en/':'/')),'Wrong locale prefix');
 input.value='xyzz_not_a_topic';input.listeners.input();assert.equal(results.children.length,0,'No match must yield empty list');
 for (const term of ['akkorder','intervaller','atlas']) {input.value=term;input.listeners.input();assert(results.children.length>0,'Required term missing: '+term)}
 input.value='modus';input.listeners.input();assert(results.children.length>0,'Partial query must match');
 input.value='';input.listeners.input();assert.equal(results.children.length,0,'Cleared query must remove matches');
 let prevented=false;listeners.keydown({metaKey:true,ctrlKey:false,key:'k',preventDefault(){prevented=true}});assert(prevented,'Keyboard shortcut not handled');
 close.listeners.click();assert(!dialog.open,'Close control must close dialog');
}
(async()=>{await exercise('/');await exercise('/en/artikler.html');console.log('Passed global search: index, links, matching, empty state, locales and keyboard access.');})().catch(e=>{console.error(e);process.exitCode=1});
