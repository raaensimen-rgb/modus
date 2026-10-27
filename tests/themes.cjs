const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/theme-init.js','utf8');
for(const [saved,expected] of [[null,'original'],['original','original'],['readable','readable'],['contrast','contrast'],['invalid','original']]){
 const records={},document={documentElement:{dataset:{}}};
 const box={window:{},document,localStorage:{getItem:()=>saved,setItem:(k,v)=>records[k]=v}};
 vm.runInNewContext(source,box);
 assert.equal(document.documentElement.dataset.theme,expected,'theme is applied immediately');
 box.window.ModusTheme.apply('contrast');assert.equal(records['modus-theme-v1'],'contrast');
 box.window.ModusTheme.apply('invalid');assert.equal(document.documentElement.dataset.theme,'original');
}
const blocked={window:{},document:{documentElement:{dataset:{}}},localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}};
vm.runInNewContext(source,blocked);blocked.window.ModusTheme.apply('readable');
assert.equal(blocked.document.documentElement.dataset.theme,'readable','storage failure does not break appearance controls');
console.log('Passed: initial restoration, validated themes, persistence and storage-failure fallback.');
