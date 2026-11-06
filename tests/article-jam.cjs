'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const root=path.resolve(__dirname,'..'),base=path.join(root,'release-inputs/production-1721e30'),pkg=path.resolve(root,'../package');
const changed=[];function walk(d,p=''){for(const e of fs.readdirSync(d,{withFileTypes:true})){const n=p+e.name;if(e.isDirectory())walk(path.join(d,e.name),n+'/');else if(n!=='release-manifest.json'&&!fs.readFileSync(path.join(base,n)).equals(fs.readFileSync(path.join(pkg,n))))changed.push(n);}}walk(base);
const integration=JSON.parse(fs.readFileSync(path.join(root,'release-inputs/ux-jam-integration.json')));assert.deepEqual(changed.sort(),integration.changed_html);
for(const prefix of ['','en/']){
 const n=prefix+'artikler/dorisk-og-eolisk.html',before=fs.readFileSync(path.join(base,n),'utf8'),after=fs.readFileSync(path.join(pkg,n),'utf8');
 const withoutPilot=after.replace(/<section class="related" data-article-jam="[^" ]+".*?<\/section>/,'');
 assert.equal(require('crypto').createHash('sha256').update(withoutPilot).digest('hex'),integration.ux_reader_sha256[n]);
 assert.equal(after.match(/<section class="related" data-article-jam="[^" ]+".*?<\/section>/)[0],integration.jam_sections[n]);
 const href=after.match(/data-article-jam=.*?href="([^"]+)"/)[1].replaceAll('&amp;','&'),url=new URL(href,'https://local/'+n);
 assert.equal(url.pathname,'/'+prefix+'backingtracks.html');assert.equal(url.searchParams.get('meter'),'4/4');
 const c={window:{},URLSearchParams};vm.createContext(c);for(const f of ['theory-data.js','progressions.js'])vm.runInContext(fs.readFileSync(path.join(pkg,f),'utf8'),c);
 const m=c.window.ModusProgressions,launch=m.readLaunch(url.search);
 assert.equal(launch.key,4);assert.equal(launch.mode,1);assert.equal(launch.tempo,90);
 assert.deepEqual(JSON.parse(JSON.stringify(launch.chords)),[{key:4,q:4},{key:9,q:2},{key:4,q:4},{key:9,q:2}]);
 assert.equal(m.model(launch.chords[0],4,1).name,'Em7');assert.equal(m.model(launch.chords[1],4,1).name,'A7');assert.equal(m.model(launch.chords[1],4,1).outside.length,0);
 for(const seq of ['null','{}','[]','[[99,4]]','[[4,99]]','[[4,4,"<script>"]]','['.repeat(1600)])assert.equal(m.readLaunch('?seq='+encodeURIComponent(seq)),null);
}
console.log('Article Jam: exact two-file delta, complete article preservation, NB/EN links, harmonic model and unsafe sequence rejection passed');
