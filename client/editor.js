import {createClient} from '@supabase/supabase-js';
import config from './supabase-config.json';
import deployment from '../cms/deployment-config.json';
import {LEVELS,TOPICS,escape,cleanHTML,normalizeArticle,validateArticle,renderArticle} from '../cms/model.mjs';
const $=id=>document.getElementById(id),client=createClient(config.url,config.publishableKey,{auth:{storageKey:'modus-editor-auth-v1',flowType:'pkce',persistSession:true,detectSessionInUrl:true}});
let seeds=[],drafts=[],publications=[],user=null,isEditor=false,previewMode=false,article=null,revision=0,dirty=false,saving=false,locale='nb',filter='',generation=0,timer;
const key=a=>a.locale+':'+a.slug,localKey=a=>'modus.editor.local.v1.'+(user?.id||'preview')+'.'+key(a);
const status=(s,error=false)=>{$('editorStatus').textContent=s;$('editorStatus').classList.toggle('error',error);};
const storageGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
function persistLocal(){if(!article)return;try{localStorage.setItem(localKey(article),JSON.stringify({article,revision,savedAt:new Date().toISOString()}));}catch{status('Nettleseren kunne ikke lagre en lokal kopi. Bruk Last ned sikkerhetskopi.',true);}}
function markDirty(){dirty=true;clearTimeout(timer);timer=setTimeout(()=>{persistLocal();status('Endret · lokal sikkerhetskopi lagret. Trykk Lagre utkast for å lagre på kontoen.');},500);}
function blank(){return {slug:'',locale,title:'',intro:'',level:'beginner',category:'basics',topic:TOPICS.basics,sections:[['','<p></p>']],exercise:'',practice:'',practice_label:'',image:{src:'',alt:''},quiz:Array.from({length:3},()=>({question:'',options:['','',''],answer:0,explanation:'',section:1}))};}
function slugify(s){return s.toLowerCase().replace(/æ/g,'ae').replace(/ø/g,'o').replace(/å/g,'a').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function rows(){const m=new Map(seeds.filter(a=>a.locale===locale).map(a=>[key(a),{article:a,revision:0,source:'På nettsiden'}]));drafts.filter(a=>a.locale===locale).forEach(d=>m.set(key(d),{article:d.payload,revision:d.revision,source:publications.find(p=>key(p)===key(d))?.revision===d.revision?'Publisert':'Utkast'}));try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith('modus.editor.local.v1.'+(user?.id||'preview')+'.'))continue;const saved=storageGet(k);if(saved?.article?.locale===locale&&(previewMode||!m.has(key(saved.article))))m.set(key(saved.article),{article:saved.article,revision:saved.revision||0,source:'Bare lagret lokalt'});}}catch{}return [...m.values()];}
function renderList(){const list=$('editorArticleList');list.replaceChildren();rows().filter(r=>(r.article.title+' '+r.article.topic).toLowerCase().includes(filter)).forEach(r=>{const b=document.createElement('button');b.type='button';b.className='editor-article';b.setAttribute('aria-pressed',String(!!article&&key(article)===key(r.article)));const title=document.createElement('strong'),note=document.createElement('small');title.textContent=r.article.title;note.textContent=r.source;b.append(title,note);b.onclick=()=>openArticle(r.article,r.revision);list.append(b);});if(!list.children.length)list.textContent='Ingen artikler passer søket.';}
function leave(){if(!dirty)return true;return confirm('Du har endringer som ikke er lagret på kontoen. Fortsette? En lokal sikkerhetskopi beholdes.');}
function openArticle(a,v=0,force=false){if(!force&&!leave())return;clearTimeout(timer);article=normalizeArticle(structuredClone(a));revision=v;dirty=false;const saved=storageGet(localKey(article));$('restoreLocal').hidden=!saved||JSON.stringify(saved.article)===JSON.stringify(article);$('restoreLocal').onclick=()=>{article=normalizeArticle(saved.article);dirty=true;renderForm();status('Lokal sikkerhetskopi gjenopprettet. Lagre utkast for å lagre den på kontoen.');$('restoreLocal').hidden=true;};renderForm();renderList();$('editorEmpty').hidden=true;$('editorForm').hidden=false;status(v?'Utkast åpnet · versjon '+v:'Artikkel åpnet. Endringer blir ikke synlige før du publiserer.');}
function selectOptions(node,values,value){node.replaceChildren();Object.entries(values).forEach(([k,label])=>{const o=document.createElement('option');o.value=k;o.textContent=label;node.append(o);});node.value=value;}
function renderForm(){
 for(const name of ['title','slug','intro','exercise','practice','practice_label'])$('field-'+name).value=article[name];
 $('field-slug').readOnly=revision>0||seeds.some(a=>key(a)===key(article));
 selectOptions($('field-level'),LEVELS,article.level);selectOptions($('field-category'),TOPICS,article.category);
 const images={'':'Ingen illustrasjon'};seeds.filter(a=>a.locale===article.locale).forEach(a=>{if(a.image.src)images[a.image.src]=a.title;});if(article.image.src)images[article.image.src]=images[article.image.src]||'Valgt illustrasjon';selectOptions($('field-image'),images,article.image.src);$('field-alt').value=article.image.alt;
 $('editorLanguage').textContent=article.locale==='en'?'Engelsk versjon':'Norsk versjon';$('editorRevision').textContent=revision?'Versjon '+revision:'Ikke lagret på kontoen';$('saveDraft').textContent=previewMode?'Lagre lokalt':'Lagre utkast';$('publishArticle').disabled=!isEditor||!deployment.publishingEnabled;
 renderSections();renderQuiz();
}
function renderSections(){const container=$('editorSections');container.replaceChildren();article.sections.forEach((s,i)=>{
 const box=document.createElement('section');box.className='editor-section';
 box.innerHTML=`<div class="editor-section-top"><label>Overskrift på del ${i+1}<input class="section-title" maxlength="180" value="${escape(s[0])}"></label><div class="section-order"><button type="button" data-move="-1" aria-label="Flytt del opp" ${i===0?'disabled':''}>↑</button><button type="button" data-move="1" aria-label="Flytt del ned" ${i===article.sections.length-1?'disabled':''}>↓</button><button type="button" data-remove aria-label="Fjern del" ${article.sections.length===1?'disabled':''}>Fjern</button></div></div><div class="editor-toolbar" role="group" aria-label="Formater tekst"><button type="button" data-command="bold"><strong>Fet</strong></button><button type="button" data-command="italic"><em>Kursiv</em></button><button type="button" data-command="insertUnorderedList">Punktliste</button><button type="button" data-command="insertOrderedList">Nummerert liste</button></div><div class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Tekst i del ${i+1}">${cleanHTML(s[1])}</div>`;
 const body=box.querySelector('.rich-editor');box.querySelector('.section-title').oninput=e=>{article.sections[i][0]=e.target.value;markDirty();};
 body.oninput=()=>{article.sections[i][1]=cleanHTML(body.innerHTML);markDirty();};
 body.onpaste=e=>{e.preventDefault();const html=e.clipboardData.getData('text/html'),plain=e.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,html?cleanHTML(html):plain.split('\n').map(v=>'<p>'+escape(v)+'</p>').join(''));};
 box.querySelectorAll('[data-command]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>{body.focus();document.execCommand(b.dataset.command,false);article.sections[i][1]=cleanHTML(body.innerHTML);markDirty();};});
 box.querySelector('[data-remove]').onclick=()=>{if(!confirm('Fjerne denne delen?'))return;article.sections.splice(i,1);article.quiz.forEach(q=>{if(q.section===i+1)q.section=1;else if(q.section>i+1)q.section--;});markDirty();renderSections();renderQuiz();};
 box.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const to=i+Number(b.dataset.move);[article.sections[i],article.sections[to]]=[article.sections[to],article.sections[i]];article.quiz.forEach(q=>{if(q.section===i+1)q.section=to+1;else if(q.section===to+1)q.section=i+1;});markDirty();renderSections();renderQuiz();});container.append(box);
 });}
function renderQuiz(){const container=$('editorQuiz');container.replaceChildren();article.quiz.forEach((q,i)=>{const f=document.createElement('fieldset');f.className='editor-question';f.innerHTML=`<legend>Spørsmål ${i+1}</legend><label>Spørsmål<input data-question maxlength="500" value="${escape(q.question)}"></label><div class="editor-answers">${q.options.map((v,j)=>`<label class="editor-answer"><input type="radio" name="answer-${i}" value="${j}" ${q.answer===j?'checked':''} aria-label="Svar ${j+1} er riktig"><input data-option="${j}" maxlength="500" value="${escape(v)}" aria-label="Svaralternativ ${j+1}"></label>`).join('')}</div><label>Forklaring<textarea data-explanation rows="3" maxlength="2000">${escape(q.explanation)}</textarea></label><label>Forklaringen finnes i del<select data-section>${article.sections.map((s,j)=>`<option value="${j+1}">${j+1}. ${escape(s[0]||'Uten overskrift')}</option>`).join('')}</select></label>`;f.querySelector('[data-question]').oninput=e=>{q.question=e.target.value;markDirty();};f.querySelector('[data-explanation]').oninput=e=>{q.explanation=e.target.value;markDirty();};f.querySelectorAll('[data-option]').forEach(n=>n.oninput=e=>{q.options[+n.dataset.option]=e.target.value;markDirty();});f.querySelectorAll('[type=radio]').forEach(n=>n.onchange=()=>{q.answer=+n.value;markDirty();});const select=f.querySelector('[data-section]');select.value=q.section;select.onchange=e=>{q.section=+e.target.value;markDirty();};container.append(f);});}
async function refresh(){const run=++generation;const {data:{user:next}}=await client.auth.getUser();if(run!==generation)return;user=next;isEditor=false;
 if(user){const {data,error}=await client.from('cms_editors').select('user_id').eq('user_id',user.id).maybeSingle();if(run!==generation)return;isEditor=!!data&&!error;}
 $('editorLogin').hidden=!!user||previewMode;$('editorWorkspace').hidden=!isEditor&&!previewMode;$('editorAccess').hidden=!user||isEditor||previewMode;$('editorSignOut').hidden=!user;$('editorAccount').textContent=user?.email|| (previewMode?'Lokal prøvevisning':'');
 if(user&&!isEditor){$('editorUserId').textContent=user.id;$('copyEditorId').onclick=()=>navigator.clipboard.writeText(user.id).then(()=>status('Bruker-ID kopiert. Dette er ikke et passord.'));}
 if(!isEditor&&!previewMode){article=null;dirty=false;$('editorForm').hidden=true;return;}
 if(isEditor){const [d,p]=await Promise.all([client.from('cms_article_drafts').select('*').order('updated_at',{ascending:false}),client.from('cms_article_publications').select('slug,locale,revision,published_at')]);if(run!==generation)return;if(d.error||p.error){status('Kunne ikke hente artiklene. Prøv Oppdater.',true);return;}drafts=d.data;publications=p.data;}
 $('editorModeNote').hidden=!previewMode;renderList();
}
async function save(){
 if(saving||!article)return false;clearTimeout(timer);article=normalizeArticle(article);
 if(!article.slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(article.slug)){status('Gi artikkelen en gyldig adresse først.',true);return false;}
 persistLocal();if(previewMode){dirty=false;renderList();status('Lagret lokalt i denne nettleseren. Ingenting er publisert.');return true;}
 if(!isEditor)return false;saving=true;$('editorForm').inert=true;$('saveDraft').disabled=true;$('publishArticle').disabled=true;
 const a=structuredClone(article),run=generation;
 try{const {data,error}=await client.rpc('cms_save_draft',{p_slug:a.slug,p_locale:a.locale,p_payload:a,p_expected_revision:revision});if(error)throw error;if(run!==generation)return false;revision=data;dirty=false;const row={slug:a.slug,locale:a.locale,payload:a,revision};drafts=drafts.filter(d=>key(d)!==key(a)).concat(row);persistLocal();renderList();$('editorRevision').textContent='Versjon '+revision;$('field-slug').readOnly=true;status('Utkast lagret på kontoen · versjon '+revision+'. Den publiserte artikkelen er uendret.');return true;}catch(e){status(e.code==='40001'?'Utkastet er endret i en annen fane. Lokal kopi er beholdt. Last inn artikkelen på nytt før du lagrer.':'Kunne ikke lagre på kontoen. Lokal kopi er beholdt. '+(e.message||''),true);return false;}finally{saving=false;$('editorForm').inert=false;$('saveDraft').disabled=false;$('publishArticle').disabled=!isEditor||!deployment.publishingEnabled;}
}
$('editorLoginForm').onsubmit=async e=>{e.preventDefault();status('Logger inn …');const {error}=await client.auth.signInWithPassword({email:$('editorEmail').value.trim(),password:$('editorPassword').value});$('editorPassword').value='';if(error)status('Innlogging mislyktes. Kontroller e-post og passord, og at e-posten er bekreftet.',true);else await refresh();};
$('editorRegister').onclick=async()=>{if(!$('editorLoginForm').reportValidity())return;const {error}=await client.auth.signUp({email:$('editorEmail').value.trim(),password:$('editorPassword').value,options:{emailRedirectTo:location.origin+'/redaktor.html'}});$('editorPassword').value='';status(error?'Kunne ikke opprette konto. '+error.message:'Sjekk e-posten for bekreftelse. Kontoen får ikke redaktørtilgang automatisk.',!!error);};
$('verifyLink').onclick=async()=>{try{const url=new URL($('confirmationLink').value.trim()),token=url.searchParams.get('token')||url.searchParams.get('token_hash'),type=url.searchParams.get('type');if(!token||!['signup','email'].includes(type)||url.origin!==config.url)throw Error();const {error}=await client.auth.verifyOtp({token_hash:token,type});$('confirmationLink').value='';if(error)throw error;status('E-posten er bekreftet.');await refresh();}catch{status('Bekreftelseslenken kunne ikke brukes. Den kan være utløpt eller allerede brukt. Prøv å logge inn.',true);}};
$('editorSignOut').onclick=async()=>{if(!leave())return;persistLocal();await client.auth.signOut();previewMode=false;drafts=[];publications=[];article=null;await refresh();status('Logget ut.');};
$('tryEditor').onclick=async()=>{previewMode=true;await refresh();status('Lokal prøvevisning. Du kan redigere og forhåndsvise, men ikke publisere.');};
$('exitPreview').onclick=async()=>{if(!leave())return;persistLocal();previewMode=false;article=null;dirty=false;await refresh();};
$('refreshEditor').onclick=async()=>{if(!leave())return;await refresh();article=null;dirty=false;$('editorForm').hidden=true;$('editorEmpty').hidden=false;status('Listen er oppdatert. Velg artikkelen på nytt.');};
$('editorSearch').oninput=e=>{filter=e.target.value.toLowerCase();renderList();};
$('editorLocale').onchange=e=>{if(!leave()){e.target.value=locale;return;}persistLocal();locale=e.target.value;article=null;dirty=false;$('editorForm').hidden=true;$('editorEmpty').hidden=false;renderList();};
$('newArticle').onclick=()=>{if(!leave())return;openArticle(blank(),0,true);$('field-title').focus();};
for(const name of ['title','slug','intro','exercise','practice','practice_label'])$('field-'+name).oninput=e=>{article[name]=e.target.value;if(name==='title'&&!$('field-slug').readOnly){article.slug=slugify(article.title);$('field-slug').value=article.slug;}markDirty();};
$('field-level').onchange=e=>{article.level=e.target.value;markDirty();};$('field-category').onchange=e=>{article.category=e.target.value;article.topic=TOPICS[e.target.value];markDirty();};$('field-image').onchange=e=>{article.image.src=e.target.value;markDirty();};$('field-alt').oninput=e=>{article.image.alt=e.target.value;markDirty();};
$('addSection').onclick=()=>{if(article.sections.length>=30)return;article.sections.push(['','<p></p>']);markDirty();renderSections();renderQuiz();};
$('saveDraft').onclick=save;
$('downloadDraft').onclick=()=>{const blob=new Blob([JSON.stringify(normalizeArticle(article),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(article.slug||'modus-utkast')+'.'+article.locale+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('previewArticle').onclick=async()=>{
 const a=normalizeArticle(article);$('previewArticle').disabled=true;
 try{
  const assets=await Promise.all(['/home.css','/articles.css',(a.locale==='en'?'/en':'')+'/article-quiz.js'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error();return r.text();}));
  let content=renderArticle(a);
  if(a.image.src){try{const r=await fetch(a.image.src);if(r.ok){const blob=await r.blob(),image=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});content=content.replace('src="'+escape(a.image.src)+'"','src="'+image+'"');}}catch{}}
  const navScript="document.querySelector('.quiz-storage').textContent='Prøvevisning: svarene lagres ikke.';document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const href=a.getAttribute('href');if(href.startsWith('#'))document.getElementById(href.slice(1))?.scrollIntoView();});";
  $('articlePreview').srcdoc=`<!doctype html><html lang="${a.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${(assets[0]+'\n'+assets[1]).replace(/<\/style/gi,'<\\/style')}</style></head><body><main class="reading-page">${content}</main><script>window.MODUS_CMS_IDS=${JSON.stringify([a.slug]).replace(/</g,'\\u003c')};${assets[2].replace(/<\/script/gi,'<\\/script')};${navScript}<\/script></body></html>`;
  $('previewDialog').showModal();
 }catch{status('Kunne ikke lage forhåndsvisningen. Prøv igjen.',true);}finally{$('previewArticle').disabled=false;}
};
$('closePreview').onclick=()=>$('previewDialog').close();
$('publishArticle').onclick=()=>{if(!deployment.publishingEnabled)return;const errors=validateArticle(normalizeArticle(article));if(errors.length){status(errors.join(' '),true);return;}$('publishTitle').textContent=article.title;$('publishDialog').showModal();};
$('cancelPublish').onclick=()=>$('publishDialog').close();$('confirmPublish').onclick=async()=>{if(!isEditor||saving||!deployment.publishingEnabled)return;$('confirmPublish').disabled=true;try{if(!await save())return;const {data,error}=await client.rpc('cms_publish_article',{p_slug:article.slug,p_locale:article.locale,p_expected_revision:revision});if(error)throw error;publications=publications.filter(p=>key(p)!==key(article)).concat({slug:article.slug,locale:article.locale,revision,published_at:data});renderList();status('Publisert. Artikkelen er nå synlig på nettsiden.');$('publishedLink').href=(article.locale==='en'?'/en':'')+'/artikler/'+article.slug+'.html';$('publishedLink').hidden=false;}catch(e){status('Publisering mislyktes. Utkastet er beholdt. '+(e.message||''),true);}finally{$('confirmPublish').disabled=false;$('publishDialog').close();}};
window.addEventListener('beforeunload',e=>{if(dirty){persistLocal();e.preventDefault();e.returnValue='';}});
client.auth.onAuthStateChange(()=>{setTimeout(()=>refresh(),0);});
try{const r=await fetch('/cms-seed.json');if(!r.ok)throw Error();seeds=(await r.json()).map(normalizeArticle);await refresh();}catch{status('Redaktøren kunne ikke lastes. Prøv å laste siden på nytt.',true);}

 
// Analytics is visible only inside the editor workspace. Server verifies auth again.
(function setupEditorAnalytics(){
 const workspace=document.getElementById('editorWorkspace'), layout=workspace?.querySelector('.editor-layout');
 if(!workspace||!layout)return;
 const nav=document.createElement('div');nav.className='editor-analytics-navigation';
 const articles=document.createElement('button');articles.type='button';articles.textContent='Artikler';articles.setAttribute('aria-pressed','true');
 const stats=document.createElement('button');stats.type='button';stats.textContent='Statistikk';stats.setAttribute('aria-pressed','false');
 nav.append(articles,stats);layout.before(nav);
 const panel=document.createElement('section');panel.hidden=true;panel.className='editor-analytics-panel';
 panel.innerHTML='<h2>Besøksstatistikk</h2><p>Besøk og sidevisninger fra Cloudflare Web Analytics. Forhåndsvisninger kan inngå dersom de bruker samme måle-ID.</p><button type="button" id="analyticsReload">Oppdater tall</button><p id="analyticsMessage" role="status"></p><div id="analyticsCards" class="editor-analytics-cards"></div><div id="analyticsMonths"></div><p class="analytics-footnote">Historikken omfatter kun måleperioden som Cloudflare API gir tilgang til. «Totalt» fra nettstedets oppstart krever separat historisk lagring.</p>';
 layout.after(panel);
 const style=document.createElement('style');style.textContent='.editor-analytics-navigation{display:flex;gap:.8rem;margin:1rem 0 1.5rem}.editor-analytics-navigation button,.editor-analytics-panel button{border:1px solid #506744;border-radius:8px;color:#dfeccc;background:#22321e;padding:.65rem 1rem;cursor:pointer}.editor-analytics-navigation button[aria-pressed=true]{color:#d2ef96;border-color:#b3db78}.editor-analytics-panel{border:1px solid #34492e;background:#182315;border-radius:12px;padding:clamp(1rem,3vw,2rem);color:#dfe9d8}.editor-analytics-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin:1.2rem 0}.editor-analytics-card{border:1px solid #3c5135;background:#20301c;padding:1.2rem;border-radius:10px}.editor-analytics-card small{display:block;color:#a6bb96}.editor-analytics-card strong{font-size:1.8rem}.editor-analytics-panel table{width:100%;border-collapse:collapse}.editor-analytics-panel td,.editor-analytics-panel th{text-align:left;padding:.6rem;border-bottom:1px solid #34492e}.analytics-footnote{font-size:.9rem;color:#a9bca2}';document.head.append(style);
 const msg=panel.querySelector('#analyticsMessage'),cards=panel.querySelector('#analyticsCards'),months=panel.querySelector('#analyticsMonths');
 const num=n=>Number(n||0).toLocaleString('nb-NO');
 const card=(title,value)=>{const d=document.createElement('div');d.className='editor-analytics-card';const label=document.createElement('small'),strong=document.createElement('strong');label.textContent=title;strong.textContent=num(value);d.append(label,strong);return d;};
 async function load(){
   msg.textContent='Henter statistikk …';cards.replaceChildren();months.replaceChildren();
   if(previewMode||!isEditor){msg.textContent='Statistikk krever innlogget redaktør. Lokal prøvevisning har ikke tilgang.';return;}
   try{
     const session=await client.auth.getSession(),token=session.data.session?.access_token;
     if(!token){msg.textContent='Logg inn på nytt for å se statistikk.';return;}
     const response=await fetch('/api/editor/analytics',{headers:{authorization:'Bearer '+token},cache:'no-store'});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Ukjent feil');
     const days=data.days||[],now=new Date(),today=now.toISOString().slice(0,10),current=today.slice(0,7);
     const sum=(xs,key)=>xs.reduce((n,x)=>n+Number(x[key]||0),0);
     cards.append(card('Besøk i dag',sum(days.filter(x=>x.date===today),'visits')),card('Besøk denne måneden',sum(days.filter(x=>x.date?.startsWith(current)),'visits')),card('Besøk i måleperioden',sum(days,'visits')),card('Sidevisninger denne måneden',sum(days.filter(x=>x.date?.startsWith(current)),'views')));
     const grouped=new Map();for(const d of days){const m=(d.date||'').slice(0,7);if(!m)continue;const row=grouped.get(m)||{visits:0,views:0};row.visits+=d.visits;row.views+=d.views;grouped.set(m,row);}
     const table=document.createElement('table');const head=document.createElement('tr');for(const v of ['Måned','Besøk','Sidevisninger']){const th=document.createElement('th');th.textContent=v;head.append(th);}table.append(head);
     for(const [m,v] of [...grouped].sort((a,b)=>b[0].localeCompare(a[0]))){const tr=document.createElement('tr');for(const s of [m,num(v.visits),num(v.views)]){const td=document.createElement('td');td.textContent=s;tr.append(td);}table.append(tr);}months.append(table);
     msg.textContent='Sist hentet: '+new Date(data.updatedAt).toLocaleString('nb-NO')+'.';
   }catch(error){msg.textContent=error.message||'Kunne ikke hente statistikk.';}
 }
 articles.onclick=()=>{panel.hidden=true;layout.hidden=false;articles.setAttribute('aria-pressed','true');stats.setAttribute('aria-pressed','false');};
 stats.onclick=()=>{panel.hidden=false;layout.hidden=true;articles.setAttribute('aria-pressed','false');stats.setAttribute('aria-pressed','true');load();};
 panel.querySelector('#analyticsReload').onclick=load;
})();
