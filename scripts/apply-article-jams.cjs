"use strict";
// Build-time enrichment only: reuse Jam's URL serializer, never a second audio model.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function render(directory){
 const context={window:{},URLSearchParams};vm.createContext(context);
 for(const file of ['theory-data.js','progressions.js'])vm.runInContext(fs.readFileSync(path.join(directory,file),'utf8'),context);
 const model=context.window.ModusProgressions,data=JSON.parse(fs.readFileSync(path.join(root,'content/article-jams.json'),'utf8'));
 assert.equal(data.version,1);const seen=new Set();
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const e of data.exercises){
  assert(/^[a-z0-9-]+$/.test(e.id)&&!seen.has(e.id));seen.add(e.id);
  assert(/^[a-z0-9-]+$/.test(e.article));
  assert(JSON.parse(fs.readFileSync(path.join(root,'content/articles.json'),'utf8')).some(a=>a.slug===e.article),'Unknown article');
  assert.equal(e.meter,'4/4','Jam currently supports 4/4 only');
  assert(Number.isInteger(e.key)&&e.key>=0&&e.key<12);
  assert(Number.isInteger(e.mode)&&e.mode>=0&&e.mode<9);
  assert(Number.isInteger(e.tempo)&&e.tempo>=40&&e.tempo<=200);
  assert(['fusion','jazz','rock','funk','ambient'].includes(e.style));
  assert(model.validSequence(e.chords));
  const link=model.link('../backingtracks.html',e)+'&meter=4%2F4';
  for(const [locale,t] of Object.entries(e.locales)){
   assert(['nb','en'].includes(locale));for(const k of ['title','instruction','button','start'])assert(typeof t[k]==='string'&&t[k].length);
   const file=path.join(directory,locale==='en'?'en':'','artikler',e.article+'.html');let html=fs.readFileSync(file,'utf8');
   // Private/unavailable editions remain untouched in ordinary CMS policy builds.
   if(!html.includes('</article>')||!html.includes('class="article-quiz"'))continue;
   assert(!html.includes('data-article-jam='),'Duplicate exercise');
   const section='<section class="related" data-article-jam="'+escape(e.id)+'" aria-labelledby="jam-'+escape(e.id)+'"><h2 id="jam-'+escape(e.id)+'">'+escape(t.title)+'</h2><p>'+escape(t.instruction)+'</p><p><a class="button" href="'+escape(link)+'">'+escape(t.button)+' ↗</a></p><p>'+escape(t.start)+'</p></section>';
   html=html.replace('</article>','</article>'+section);fs.writeFileSync(file,html);
  }
 }
}
module.exports={render};if(require.main===module)render(path.resolve(process.argv[2]));
