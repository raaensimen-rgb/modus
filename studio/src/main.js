import { invoke } from '@tauri-apps/api/core';
import './style.css';
const $=id=>document.getElementById(id);
let articles=[],current=-1,dirty=false;
function status(s){$('status').textContent=s}
function validArticles(data){if(!Array.isArray(data))throw Error('Forventet en liste med artikler');const ids=new Set();for(const a of data){if(!a||typeof a.slug!=='string'||!a.slug||typeof a.title!=='string'||typeof a.intro!=='string'||!Array.isArray(a.sections)||a.sections.some(s=>!Array.isArray(s)||s.length!==2||s.some(x=>typeof x!=='string')))throw Error('Ugyldig artikkelstruktur');if(ids.has(a.slug))throw Error('Duplisert slug: '+a.slug);ids.add(a.slug)}return data}
function renderList(){const list=$('articleList');list.replaceChildren();articles.forEach((a,i)=>{const el=document.createElement('option');el.value=String(i);el.textContent=a.title+' ('+a.slug+')';list.append(el)});if(current>=0)list.value=String(current);$('articleCount').textContent=articles.length+' artikler';filterList()}
function filterList(){const q=$('articleSearch').value.trim().toLowerCase();for(const o of $('articleList').options)o.hidden=Boolean(q)&&!o.textContent.toLowerCase().includes(q)}
function commitFields(){if(current<0)return;const sections=JSON.parse($('sections').value);if(!Array.isArray(sections)||sections.some(s=>!Array.isArray(s)||s.length!==2||s.some(x=>typeof x!=='string')))throw Error('Seksjoner må være en liste av [overskrift, HTML]');const a=articles[current];a.title=$('title').value;a.intro=$('intro').value;a.sections=sections;validArticles(articles)}
function preview(){const container=$('preview');container.replaceChildren();if(current<0)return;const a=articles[current];const h=document.createElement('h3');h.textContent=$('title').value;container.append(h);const p=document.createElement('p');p.textContent=$('intro').value;container.append(p);try{const blocks=JSON.parse($('sections').value);for(const [head,html] of blocks){const h4=document.createElement('h4');h4.textContent=head;const t=document.createElement('p');t.textContent=html.replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ');container.append(h4,t)}}catch{const warn=document.createElement('p');warn.textContent='Seksjoner har ugyldig JSON';container.append(warn)}}
function choose(i){if(current>=0){try{commitFields()}catch(e){status('Rett seksjonene før du bytter: '+e.message);$('articleList').value=String(current);return}}current=i;const a=articles[i];$('slug').value=a.slug;$('articleLocale').value=a.locale==='en'?'Engelsk':'Norsk';$('title').value=a.title;$('intro').value=a.intro;$('sections').value=JSON.stringify(a.sections,null,2);renderList();preview()}
function changed(){dirty=true;status('Ulagrede endringer');preview()}
for(const id of ['title','intro','sections'])$(id).addEventListener('input',changed);
$('articleList').addEventListener('change',()=>choose(Number($('articleList').value)));
$('open').addEventListener('click',async()=>{if(dirty&&!confirm('Ulagrede endringer vil gå tapt. Fortsette?'))return;try{const result=await invoke('open_articles');if(!result)return;const data=validArticles(JSON.parse(result.content));articles=data;current=-1;dirty=false;$('filename').textContent=result.path;$('save').disabled=false;renderList();if(data.length)choose(0);status(data.length+' artikler åpnet lokalt')}catch(e){status('Kunne ikke åpne fil: '+e)}});
$('save').addEventListener('click',async()=>{try{commitFields();const content=JSON.stringify(validArticles(articles),null,2)+'\n';const saved=await invoke('save_articles_copy',{content});if(saved){dirty=false;status('Lagring fullført: '+saved)}}catch(e){status('Lagring feilet: '+e)}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
status('Åpne en lokal content/articles.json for å begynne.');
$('articleSearch').addEventListener('input',filterList);
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
 const design=button.dataset.view==='design';
 $('articlesView').hidden=design;$('designView').hidden=!design;
 $('currentView').textContent=design?'Design og UX':'Artikler';
 for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b===button);
});
$('exportDesign').addEventListener('click',()=>{
 const note=$('designNotes').value.trim();
 if(!note){$('designStatus').textContent='Skriv et notat før eksport.';return}
 const file=new Blob(['# MODUS Studio – Design og UX\n\n'+note+'\n'],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='modus-design-ux-notater.md';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('designStatus').textContent='Notatet er klargjort for lokal nedlasting. Ingen endring er publisert.';
});
for(const id of ['demoButton','demoSecondary'])$(id).addEventListener('click',()=>{$('designStatus').textContent='Komponentkontroll: '+$(id).textContent+' – lokal prøvevisning.'});
