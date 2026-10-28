'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const init=fs.readFileSync('dist/language-init.js','utf8');
function visit(href,saved,blocked=false){
 const url=new URL(href,'https://modus.test'),data={'modus-language-v1':saved};let redirected=null;
 const context={URL,location:{href:url.href,replace:value=>redirected=value},localStorage:{getItem:k=>{if(blocked)throw Error();return data[k]},setItem:(k,v)=>{if(blocked)throw Error();data[k]=v}},document:{documentElement:{}},window:{}};
 vm.runInNewContext(init,context);return {context,data,redirected};
}
assert.equal(visit('/').context.document.documentElement.lang,'nb');
let r=visit('/backingtracks.html?key=4&mode=1#map','en');
assert.equal(r.redirected,'https://modus.test/en/backingtracks.html?key=4&mode=1#map');
r=visit('/en/artikler/kvintsirkelen?lang=nb&key=4','en');
assert.equal(r.redirected,'https://modus.test/artikler/kvintsirkelen?lang=nb&key=4');
assert.equal(r.data['modus-language-v1'],'nb');
r=visit('/en/artikler/kvintsirkelen','nb');assert.equal(r.context.document.documentElement.lang,'en');assert.equal(r.redirected,null);
assert.equal(visit('/?lang=en',undefined,true).redirected,'https://modus.test/en/?lang=en');
assert.equal(visit('/en/',undefined,true).redirected,null);
const switcher=fs.readFileSync('dist/language.js','utf8');
const links=['nb','en'].map(language=>({dataset:{language},attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(){}}));
vm.runInNewContext(switcher,{URL,window:{},location:{href:'https://modus.test/en/backingtracks.html?seq=%5B%5B4%2C4%5D%5D&key=4#map'},document:{documentElement:{lang:'en'},querySelectorAll:()=>links}});
assert(links[0].href.startsWith('/backingtracks.html?seq='));assert(links[0].href.endsWith('&lang=nb#map'));assert(links[1].href.startsWith('/en/backingtracks.html?'));assert.equal(links[1].attrs['aria-current'],'true');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(path.join(dir,f.name)):[path.join(dir,f.name)]);}
const originals=files('dist').filter(f=>f.endsWith('.html')&&!f.startsWith('dist/en/')&&!f.endsWith('/redaktor.html'));
assert.equal(originals.length,JSON.parse(fs.readFileSync('content/articles.json','utf8')).length+11);
for(const file of originals){
 const nb=fs.readFileSync(file,'utf8'),enPath=file.replace('dist/','dist/en/'),en=fs.readFileSync(enPath,'utf8');
 assert(nb.includes('data-language="nb"')&&nb.includes('data-language="en"'));assert(en.includes('<html lang="en"'));
 assert(en.includes('Main navigation')&&en.includes('Chord Workshop'));
 // Every local linked page and asset must resolve inside its own locale.
 for(const [,raw] of en.matchAll(/(?:href|src)="([^"#]+)"/g)){
  if(raw==='/redaktor.html'){assert(fs.existsSync('dist/redaktor.html'));continue;}
  if(/^(https?:|data:|mailto:|\?)/.test(raw))continue;
  let target=raw.split(/[?#]/)[0];if(!target)continue;
  target=path.resolve(path.dirname(enPath),target);
  assert(fs.existsSync(target)||fs.existsSync(target+'.html'),'missing '+raw+' from '+enPath);
 }
}
console.log('Passed: both locales on all pages, all English links/assets, preference restoration, explicit switches, shared English URLs, blocked-storage fallback and preserved query/hash.');
// Language links must use current controls, even when the original URL is stale.
const dynamicLinks=['nb','en'].map(language=>({dataset:{language},events:{},setAttribute(){},removeAttribute(){},addEventListener(k,v){(this.events[k]??=[]).push(v);}}));
const current={key:2,mode:1,seq:null};
vm.runInNewContext(switcher,{URL,window:{ModusLanguage:{query:()=>current}},localStorage:{setItem(){}},location:{href:'https://modus.test/backingtracks.html?key=4&mode=5&seq=old#map'},document:{documentElement:{lang:'nb'},querySelectorAll:()=>dynamicLinks}});
current.key=9;dynamicLinks[1].events.click.forEach(fn=>fn());
const switched=new URL(dynamicLinks[1].href,'https://modus.test');assert.equal(switched.searchParams.get('key'),'9');assert.equal(switched.searchParams.get('mode'),'1');assert.equal(switched.searchParams.has('seq'),false);assert.equal(switched.hash,'#map');
console.log('Passed: switching language preserves edited controls and removes obsolete sequences.');
