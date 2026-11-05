import {createClient} from '@supabase/supabase-js';
import config from './supabase-config.json';
import {createReviewController} from './editor-review.js';
import {normalizeLocalRecord} from '../cms/admin-model.mjs';
import {editorPresentation} from '../cms/editor-presentation.mjs';
import deployment from '../cms/deployment-config.json';
import {LEVELS,TOPICS,escape,cleanHTML,normalizeArticle,validateArticle,renderArticle} from '../cms/model.mjs';
const $=id=>document.getElementById(id),client=createClient(config.url,config.publishableKey,{auth:{storageKey:'modus-editor-auth-v1',flowType:'pkce',persistSession:true,detectSessionInUrl:true}});
let seeds=[],drafts=[],publications=[],user=null,isEditor=false,previewMode=false,article=null,revision=0,dirty=false,saving=false,locale='nb',filter='',generation=0,timer,recovery=null,openedLocalKey=null;
const reviewController=createReviewController({element:document.getElementById('editorReview'),getArticle:()=>article,getUserKey:()=>user?.id||'preview'});
const editorialSeeds=new Map(),dataIssues=new Set(),protectedCopies=new Set(),observedCopies=new Map();
function issue(message){dataIssues.add(message);const node=$('editorDataIssues');if(node){node.hidden=false;node.textContent=[...dataIssues].join(' ');}}
function readArticle(value,source,allowBlank=false){try{const a=normalizeArticle(value);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)&&!(allowBlank&&a.slug===''))throw new TypeError('Ugyldig eller manglende artikkeladresse.');return a;}catch(e){issue(source+': '+e.message+' Dataene er beholdt og ikke lagret på nytt.');return null;}}
const key=a=>a.locale+':'+a.slug,localKey=a=>'modus.editor.local.v1.'+(user?.id||'preview')+'.'+key(a);
const status=(s,error=false)=>{$('editorStatus').textContent=s;$('editorStatus').classList.toggle('error',error);};
const storageGet=(k,observe=false)=>{try{const raw=localStorage.getItem(k);if(observe)observedCopies.set(k,raw);return raw===null?null:normalizeLocalRecord(JSON.parse(raw));}catch{protectedCopies.add(k);issue('Lokal kopi kunne ikke leses. Originalen er beholdt.');return null;}};
function persistLocal(){
 if(!article)return true;
 if(protectedCopies.has(localKey(article))){dirty=true;status('Den eksisterende lokale kopien kan ikke valideres og skal ikke overskrives. Last ned sikkerhetskopi av teksten i skjemaet. Originalen er beholdt for avklaring.',true);renderSummary();return false;}
 try{
  const k=localKey(article),current=localStorage.getItem(k),expected=k===openedLocalKey?(observedCopies.get(k)??null):null;
  if(current!==expected){dirty=true;status('Lagringskonflikt / Storage conflict: Kopien er endret i en annen fane, eller adressen er allerede i bruk. Ingenting er overskrevet. Eksporter teksten før du åpner den lagrede kopien på nytt.',true);return false;}
  const previous=current===null?null:normalizeLocalRecord(JSON.parse(current));
  if(previous&&JSON.stringify(previous.article)===JSON.stringify(article)&&previous.revision===revision&&JSON.stringify(previous.recovery)===JSON.stringify(recovery||undefined)){renderSummary();return true;}
  const history=previous?[{article:previous.article,revision:previous.revision??null,savedAt:previous.savedAt,localRevision:previous.localRevision??0},...(previous.history||[])].slice(0,5):[];
  const value=JSON.stringify({article,revision,localRevision:(previous?.localRevision??0)+1,savedAt:new Date().toISOString(),history,...(recovery?{recovery}:{})});
  localStorage.setItem(k,value);observedCopies.set(k,value);openedLocalKey=k;
  // A stored identity must not change as the title is edited.
  $('field-slug').readOnly=true;renderSummary();return true;
 }
 catch{dirty=true;renderSummary();status('Den lokale kopien kunne ikke lagres. Endringene er fortsatt ulagret lokalt. Bruk Last ned sikkerhetskopi før du lukker eller bytter artikkel.',true);return false;}
}
function markDirty(){
 if(!article.slug){article.slug='utkast-'+crypto.randomUUID();$('field-slug').value=article.slug;}
 dirty=true;status('Endret / Changed · venter på lokal lagring / local save pending.');renderList();clearTimeout(timer);timer=setTimeout(()=>{if(persistLocal())status(previewMode?'Automatisk lagret lokalt / Automatically saved locally. Ingen synkronisering mellom enheter.':'Endret · lokal sikkerhetskopi lagret. Trykk Lagre utkast for å lagre på kontoen.');},500);
}
// Mobile browsers may suspend a tab without firing beforeunload. Flush the
// pending local copy while storage is still available; never save to the server.
function flushLocalCopy(){if(dirty){clearTimeout(timer);persistLocal();}}
window.addEventListener('pagehide',flushLocalCopy);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushLocalCopy();});
function blank(){return {slug:'',locale,title:'',intro:'',level:'beginner',category:'basics',topic:TOPICS.basics,sections:[['','<p></p>']],exercise:'',practice:'',practice_label:'',image:{src:'',alt:''},quiz:Array.from({length:3},()=>({question:'',options:['','',''],answer:0,explanation:'',section:1}))};}
function slugify(s){return s.toLowerCase().replace(/æ/g,'ae').replace(/ø/g,'o').replace(/å/g,'a').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function rows(){
 const m=new Map(seeds.map(a=>[key(a),{article:a,revision:0}]));
 drafts.forEach(d=>m.set(key(d),{article:d.payload,revision:d.revision}));
 try{for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);if(!k.startsWith('modus.editor.local.v1.'+(user?.id||'preview')+'.'))continue;
  const saved=storageGet(k);if(!saved)continue;const a=readArticle(saved.article,'Lokal kopi');if(!a){protectedCopies.add(k);continue;}
  if(k!==localKey(a)){protectedCopies.add(k);issue('Lokal kopi har en annen artikkelidentitet enn lagringsnøkkelen. Originalen er beholdt.');continue;}
  if(previewMode||!m.has(key(a)))m.set(key(a),{article:a,revision:saved.revision??0});
 }}catch{issue('Nettleseren kunne ikke lese alle lokale kopier.');}
 return [...m.values()];
}
function presentation(a,all=rows()){
 const seed=editorialSeeds.get(key(a)),saved=storageGet(localKey(a));
 return editorPresentation({identity:{slug:a.slug,locale:a.locale},policy:seed?.policy||null,versionContext:seed?{locale:a.locale,contentMatches:JSON.stringify(a)===JSON.stringify(seed.article),sourceVersion:seed.sourceVersion}:null,
  local:saved?{...saved,...(article&&key(a)===key(article)&&recovery?{recovery}:{})}:recovery&&article&&key(a)===key(article)?{revision:null,recovery}:null,
  accountDraft:drafts.find(d=>key(d)===key(a)),published:publications.find(d=>key(d)===key(a))||(seed?.policy?.visibility==='public'?{revision:null}:null),availableLocales:all.filter(r=>r.article.slug===a.slug).map(r=>r.article.locale),dirty:!!article&&key(a)===key(article)&&dirty});
}
const versionText=n=>n===null?'ukjent revisjon':'revisjon '+n;
function renderSummary(all=rows()){
 const node=$('editorSummary');reviewController.refresh();if(!node||!article)return;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)){node.textContent='Ny artikkel · '+article.locale.toUpperCase()+' · Ikke vurdert. Skriv en gyldig adresse for å vise versjonsoversikten.';return;}
 renderLocalHistory();
 const view=presentation(article,all);node.replaceChildren();
 const add=(title,lines)=>{const group=document.createElement('div'),heading=document.createElement('dt'),body=document.createElement('dd');heading.textContent=title;for(const line of lines){const p=document.createElement('p');p.textContent=line;body.append(p);}group.append(heading,body);node.append(group);};
 const source=s=>s?' · kilde: '+({'publication-policy':'Publiseringsregister','editorial-review':'Redaksjonell gjennomgang'}[s]||s):' · mangler vurderingsgrunnlag';
 add('Arbeid',[view.work.label+source(view.work.source),'Synlighet i register: '+view.visibility.label,'Status gir ikke publiseringstillatelse.']);
 add('Fag / kilde / rettigheter',Object.entries(view.checks).map(([k,v])=>({subject:'Fag',sources:'Kilde',rights:'Rettigheter'}[k])+': '+v.label+source(v.source)));
 add('Språk',Object.values(view.languages).map(v=>v.label+': '+(v.exists?'Tilgjengelig':'Mangler språkversjon')));
 add('Lagring',Object.entries(view.storage).map(([k,v])=>({local:'Lokal kopi',accountDraft:'Kontoutkast',published:'Publisert versjon'}[k])+': '+(v.exists?versionText(v.revision):'Ingen')) .concat(view.dirty?'Ulagrede endringer':'Ingen ulagrede endringer'));
 add('Versjon',[versionText(view.version.revision),...(view.version.recovery?['Lokal historikk: gjenopprettet fra '+versionText(view.version.recovery.sourceRevision)+'. Ikke godkjenningsbevis.']:[]),...view.issues]);
}
function renderList(){
 const list=$('editorArticleList'),all=rows();list.replaceChildren();
 all.filter(r=>r.article.locale===locale&&(r.article.title+' '+r.article.topic).toLowerCase().includes(filter)).forEach(r=>{
  const a=article&&key(article)===key(r.article)?article:r.article,v=presentation(a,all),b=document.createElement('button');b.type='button';b.className='editor-article';b.dataset.articleSlug=a.slug;b.dataset.articleLocale=a.locale;b.setAttribute('aria-pressed',String(!!article&&key(article)===key(a)));
  const title=document.createElement('strong'),note=document.createElement('small');title.textContent=a.title||a.slug;note.textContent=a.locale.toUpperCase()+' · Arbeid: '+v.work.label+' · '+versionText(v.version.revision)+(v.dirty?' · Ulagrede endringer':'');b.append(title,note);b.onclick=()=>openArticle(r.article,r.revision);list.append(b);
 });
 if(!list.children.length)list.textContent=all.length?'Ingen artikkel i valgt språk / søk. Språkversjon kan mangle.':'Ingen artikler. Opprett et nytt utkast.';
 renderSummary(all);
}
function leave(){if(!dirty)return true;clearTimeout(timer);if(!persistLocal())return confirm('Lokal lagring mislyktes. Endringene er ikke sikret lokalt. Velg Avbryt og bruk Last ned sikkerhetskopi først. Vil du likevel fortsette uten en lokal sikkerhetskopi?');return confirm('Du har endringer som ikke er lagret på kontoen. Fortsette? En lokal sikkerhetskopi er lagret.');}
function revisionLabel(){return (revision?'Versjon '+revision:'Ikke lagret på kontoen')+(recovery?' · gjenopprettet fra '+(recovery.sourceRevision===null?'ukjent versjon':'versjon '+recovery.sourceRevision):'');}
function openArticle(a,v=0,force=false){
 const candidate=readArticle(a,'Artikkel',force&&v===0);if(!candidate)return;if(!force&&!leave())return;clearTimeout(timer);article=candidate;revision=v;dirty=false;recovery=null;
 openedLocalKey=localKey(article);
 const saved=storageGet(localKey(article),true),base=Number.isInteger(saved?.revision)&&saved.revision>=0?saved.revision:null;
 const differs=!!saved&&JSON.stringify(saved.article)!==JSON.stringify(article),conflict=differs&&(base===null||base!==v);
 if(saved?.recovery&&JSON.stringify(saved.article)===JSON.stringify(article))recovery=saved.recovery;
 $('restoreLocal').hidden=!differs;
 $('restoreLocal').onclick=()=>{
  if(!leave())return;
  if(conflict&&!confirm('Revisjonskonflikt: Den lokale kopien bygger på '+(base===null?'ukjent versjon':'versjon '+base)+', mens artikkelen på kontoen er versjon '+v+'. Vil du erstatte teksten i redigeringsfeltet med den lokale kopien? Ved neste kontolagring forsøker du å erstatte versjon '+v+'. Hvis kontoen er endret i mellomtiden, blir lagringen avvist. Velg Avbryt for å beholde teksten på kontoen.'))return;
  const restored=readArticle(saved.article,'Lokal gjenoppretting');if(!restored)return;clearTimeout(timer);article=restored;dirty=true;
  recovery=saved.recovery||{sourceRevision:base,sourceSavedAt:typeof saved.savedAt==='string'?saved.savedAt:null,replacementBaseRevision:v};
  // Keep the observed cloud revision for the existing RPC compare-and-swap. The
  // original local base is retained separately, and replacing a different base
  // requires the explicit confirmation above. Never fetch/rebase and retry.
  renderForm();status(conflict?'Lokal kopi gjenopprettet etter bekreftet revisjonskonflikt. Endringene er ikke lagret på kontoen.':'Lokal sikkerhetskopi gjenopprettet. Endringene er ikke lagret på kontoen.');$('restoreLocal').hidden=true;
 };
 renderForm();renderList();$('editorEmpty').hidden=true;$('editorForm').hidden=false;
 status(conflict?'Revisjonskonflikt: Lokal kopi har '+(base===null?'ukjent versjon':'versjon '+base)+', mens kontoen viser versjon '+v+'. Gjenoppretting krever bekreftelse.':v?'Utkast åpnet · versjon '+v:'Artikkel åpnet. Endringer blir ikke synlige før du publiserer.',conflict);reviewController.refresh(true);
}
function renderLocalHistory(){
 const select=$('localHistory'),button=$('restoreLocalVersion');if(!select||!article)return;
 const saved=storageGet(localKey(article));select.replaceChildren();
 const label=document.createElement('option');label.value='';label.textContent=article.locale==='en'?'Choose a previous local version':'Velg en tidligere lokal versjon';select.append(label);
 (saved?.history||[]).forEach((v,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=(article.locale==='en'?'Local version ':'Lokal versjon ')+(v.localRevision??0)+' · '+(v.savedAt||'ukjent tidspunkt');select.append(option);});
 select.disabled=!saved?.history?.length;button.disabled=true;
 $('localSaveDetails').textContent=saved?(article.locale==='en'?'Saved locally':'Lagret lokalt')+' · '+(saved.savedAt||'ukjent tidspunkt')+' · '+(article.locale==='en'?'local revision ':'lokal revisjon ')+(saved.localRevision??0)+' · '+(article.locale==='en'?'browser only, no sync':'kun denne nettleseren, ingen synkronisering'):article.locale==='en'?'Not saved locally yet':'Ikke lagret lokalt ennå';
}
$('localHistory').onchange=()=>{$('restoreLocalVersion').disabled=$('localHistory').value==='';};
$('restoreLocalVersion').onclick=()=>{
 let raw;try{raw=localStorage.getItem(localKey(article));}catch{status('Lokal lagring kan ikke leses / Local storage is unavailable. Eksporter teksten før du fortsetter.',true);return;}
 const selected=Number($('localHistory').value);
 if(raw!==(observedCopies.get(localKey(article))??null)){status('Lagringskonflikt / Storage conflict. Eksporter teksten og åpne den lagrede kopien på nytt.',true);return;}
 const saved=storageGet(localKey(article)),version=saved?.history?.[selected];
 if($('localHistory').value===''||!version)return;
 if(!confirm(article.locale==='en'?'Restore this local version? The current text will be kept in local history. Nothing is published.':'Gjenopprette denne lokale versjonen? Nåværende tekst beholdes i lokal historikk. Ingenting publiseres.'))return;
 // Save pending edits first, retaining them as a recoverable history entry.
 if(!persistLocal())return;
 article=normalizeArticle(version.article);dirty=true;
 if(!persistLocal()){renderForm();return;}
 renderForm();renderList();status('Lokal versjon gjenopprettet / Local version restored. Ingenting er publisert.');
};
window.addEventListener('storage',event=>{if(article&&event.key===localKey(article)&&event.newValue!==(observedCopies.get(event.key)??null)){clearTimeout(timer);status('Lagringskonflikt / Storage conflict: En annen fane har endret kopien. Eksporter teksten før du åpner den lagrede kopien på nytt.',true);}});
function selectOptions(node,values,value){node.replaceChildren();Object.entries(values).forEach(([k,label])=>{const o=document.createElement('option');o.value=k;o.textContent=label;node.append(o);});node.value=value;}
// Native proofreading is a browser hint, not an external service or content edit.
function articleSpelling(container){
 const language=article.locale==='en'?'en':'nb';
 for(const field of container.querySelectorAll('#field-title,#field-intro,#field-exercise,#field-practice_label,#field-alt,.section-title,.rich-editor,[data-question],[data-option],[data-explanation]')){
  field.setAttribute('lang',language);field.setAttribute('spellcheck','true');field.setAttribute('autocorrect','off');
 }
 for(const field of container.querySelectorAll('#field-slug,#field-practice')){field.setAttribute('spellcheck','false');field.setAttribute('autocorrect','off');}
}
function renderForm(){
 for(const name of ['title','slug','intro','exercise','practice','practice_label'])$('field-'+name).value=article[name];
 $('field-slug').readOnly=revision>0||seeds.some(a=>key(a)===key(article))||!!storageGet(localKey(article));
 selectOptions($('field-level'),LEVELS,article.level);selectOptions($('field-category'),TOPICS,article.category);
 const images={'':'Ingen illustrasjon'};seeds.filter(a=>a.locale===article.locale).forEach(a=>{if(a.image.src)images[a.image.src]=a.title;});if(article.image.src)images[article.image.src]=images[article.image.src]||'Valgt illustrasjon';selectOptions($('field-image'),images,article.image.src);$('field-alt').value=article.image.alt;
 $('editorLanguage').textContent=article.locale==='en'?'Engelsk versjon':'Norsk versjon';$('editorRevision').textContent=revisionLabel();$('saveDraft').textContent=previewMode?'Lagre lokalt':'Lagre utkast';$('publishArticle').disabled=!isEditor||!deployment.publishingEnabled;
 renderSections();renderQuiz();renderSummary();articleSpelling($('editorForm'));
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
 });articleSpelling(container);}
function renderQuiz(){const container=$('editorQuiz');container.replaceChildren();article.quiz.forEach((q,i)=>{const f=document.createElement('fieldset');f.className='editor-question';f.innerHTML=`<legend>Spørsmål ${i+1}</legend><label>Spørsmål<input data-question maxlength="500" value="${escape(q.question)}"></label><div class="editor-answers">${q.options.map((v,j)=>`<label class="editor-answer"><input type="radio" name="answer-${i}" value="${j}" ${q.answer===j?'checked':''} aria-label="Svar ${j+1} er riktig"><input data-option="${j}" maxlength="500" value="${escape(v)}" aria-label="Svaralternativ ${j+1}"></label>`).join('')}</div><label>Forklaring<textarea data-explanation rows="3" maxlength="2000">${escape(q.explanation)}</textarea></label><label>Forklaringen finnes i del<select data-section>${article.sections.map((s,j)=>`<option value="${j+1}">${j+1}. ${escape(s[0]||'Uten overskrift')}</option>`).join('')}</select></label>`;f.querySelector('[data-question]').oninput=e=>{q.question=e.target.value;markDirty();};f.querySelector('[data-explanation]').oninput=e=>{q.explanation=e.target.value;markDirty();};f.querySelectorAll('[data-option]').forEach(n=>n.oninput=e=>{q.options[+n.dataset.option]=e.target.value;markDirty();});f.querySelectorAll('[type=radio]').forEach(n=>n.onchange=()=>{q.answer=+n.value;markDirty();});const select=f.querySelector('[data-section]');select.value=q.section;select.onchange=e=>{q.section=+e.target.value;markDirty();};container.append(f);});articleSpelling(container);}
async function refresh(){const run=++generation;const {data:{user:next}}=await client.auth.getUser();if(run!==generation)return;user=next;isEditor=false;
 if(user){const {data,error}=await client.from('cms_editors').select('user_id').eq('user_id',user.id).maybeSingle();if(run!==generation)return;isEditor=!!data&&!error;}
 $('editorInbox').hidden=!isEditor;$('editorLogin').hidden=!!user||previewMode;$('editorWorkspace').hidden=!isEditor&&!previewMode;$('editorAccess').hidden=!user||isEditor||previewMode;$('editorSignOut').hidden=!user;$('editorAccount').textContent=user?.email|| (previewMode?'Lokal prøvevisning':'');
 if(user&&!isEditor){$('editorUserId').textContent=user.id;$('copyEditorId').onclick=()=>navigator.clipboard.writeText(user.id).then(()=>status('Bruker-ID kopiert. Dette er ikke et passord.'));}
 if(!isEditor&&!previewMode){article=null;dirty=false;$('editorForm').hidden=true;return;}
 if(isEditor){const [d,p]=await Promise.all([client.from('cms_article_drafts').select('*').order('updated_at',{ascending:false}),client.from('cms_article_publications').select('slug,locale,revision,published_at')]);if(run!==generation)return;if(d.error||p.error){status('Kunne ikke hente artiklene. Prøv Oppdater.',true);return;}drafts=d.data.filter(d=>{const a=readArticle(d.payload,'Kontoutkast');if(!a)return false;if(d.slug!==a.slug||d.locale!==a.locale){issue('Kontoutkast har motstridende identitet. Dataene er beholdt.');return false;}d.payload=a;return true;});publications=p.data.filter(p=>{if(!['nb','en'].includes(p.locale)){issue('Publisert metadata har ugyldig språk.');return false;}return true;});}
 $('editorModeNote').hidden=!previewMode;renderList();if(isEditor)void loadFeedback();
}
// Feedback inbox: a private editor-only view, with RLS enforcing access in Supabase.
async function loadFeedback(){
 if(!isEditor||!user)return;
 const list=$('feedbackAdminList'),message=$('feedbackAdminStatus');
 message.textContent='Henter henvendelser …';
 const showResolved=$('feedbackShowResolved').checked;
 let query=client.from('modus_feedback').select('id,created_at,category,message,email,page_url,status');
 if(!showResolved)query=query.neq('status','resolved');
 const {data,error}=await query.order('created_at',{ascending:false}).limit(100);
 if(!isEditor)return;
 if(error){message.textContent='Kunne ikke hente henvendelser. Prøv igjen.';return;}
 const types={error:'Feilrapport',question:'Spørsmål',suggestion:'Forbedringsforslag'};
 const states={new:'Ny',in_progress:'Pågår',resolved:'Løst'};
 list.replaceChildren();
 message.textContent=data.length?data.length+(showResolved?' henvendelser':' aktive henvendelser')+' (viser maksimalt 100).':(showResolved?'Ingen henvendelser ennå.':'Ingen aktive henvendelser. Velg «Vis løste» for historikk.');
 for(const item of data){
  const card=document.createElement('article');card.className='editor-inbox-item';
  const head=document.createElement('div');head.className='editor-inbox-item-head';
  const title=document.createElement('strong');title.textContent=types[item.category]||item.category;
  const date=document.createElement('time');date.dateTime=item.created_at;date.textContent=new Date(item.created_at).toLocaleString('nb-NO');
  head.append(title,date);card.append(head);
  const body=document.createElement('p');body.className='editor-inbox-message';body.textContent=item.message;card.append(body);
  if(item.email){const email=document.createElement('a');email.href='mailto:'+item.email;email.textContent=item.email;email.className='editor-inbox-email';card.append(email);}
  if(item.page_url){try{const url=new URL(item.page_url);if(url.protocol==='https:'||url.protocol==='http:'){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.className='editor-inbox-page';link.textContent='Side: '+url.pathname;card.append(link);}}catch{}}
  const row=document.createElement('div');row.className='editor-inbox-controls';
  const label=document.createElement('label');label.textContent='Status';
  const select=document.createElement('select');select.setAttribute('aria-label','Status for '+(types[item.category]||'henvendelse'));
  for(const [key,text] of Object.entries(states)){const opt=document.createElement('option');opt.value=key;opt.textContent=text;select.append(opt);}
  select.value=item.status;
  select.addEventListener('change',async()=>{select.disabled=true;const previous=item.status;const {error:err}=await client.from('modus_feedback').update({status:select.value}).eq('id',item.id);if(err){select.value=previous;message.textContent='Kunne ikke lagre statusen. Prøv igjen.';}else{item.status=select.value;if(item.status==='resolved'&&!$('feedbackShowResolved').checked){card.remove();const remaining=list.children.length;message.textContent=remaining?remaining+' aktive henvendelser vises.':'Ingen aktive henvendelser. Velg «Vis løste» for historikk.';}else{message.textContent='Status oppdatert.';}}select.disabled=false;});
  label.append(select);row.append(label);card.append(row);list.append(card);
 }
}
$('feedbackRefresh').addEventListener('click',()=>{if(isEditor)void loadFeedback();});
$('feedbackShowResolved').addEventListener('change',()=>{if(isEditor)void loadFeedback();});

async function save(){
 if(saving||!article)return false;clearTimeout(timer);article=normalizeArticle(article);
 if(!article.slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(article.slug)){status('Gi artikkelen en gyldig adresse først.',true);return false;}
 if(!persistLocal())return false;if(previewMode){dirty=false;renderList();status('Lagret lokalt i denne nettleseren / Saved locally. Lokal revisjon '+storageGet(localKey(article)).localRevision+'. Ingenting er publisert.');return true;}
 if(!isEditor)return false;saving=true;$('editorForm').inert=true;$('saveDraft').disabled=true;$('publishArticle').disabled=true;
 const a=structuredClone(article),run=generation;
 try{const {data,error}=await client.rpc('cms_save_draft',{p_slug:a.slug,p_locale:a.locale,p_payload:a,p_expected_revision:revision});if(error)throw error;if(run!==generation)return false;revision=data;const row={slug:a.slug,locale:a.locale,payload:a,revision};drafts=drafts.filter(d=>key(d)!==key(a)).concat(row);const localSaved=persistLocal();dirty=!localSaved;renderList();$('editorRevision').textContent=revisionLabel();$('field-slug').readOnly=true;if(!localSaved){status('Utkastet ble lagret på kontoen som versjon '+revision+', men den lokale kopien kunne ikke lagres. Bruk Last ned sikkerhetskopi før du fortsetter.',true);return false;}status('Utkast lagret på kontoen · versjon '+revision+'. Den publiserte artikkelen er uendret.');return true;}catch(e){dirty=true;status(e.code==='40001'?'Utkastet er endret i en annen fane. Lokal kopi er beholdt. Last inn artikkelen på nytt før du lagrer.':'Kunne ikke lagre på kontoen. Lokal kopi er beholdt. '+(e.message||''),true);return false;}finally{saving=false;$('editorForm').inert=false;$('saveDraft').disabled=false;$('publishArticle').disabled=!isEditor||!deployment.publishingEnabled;}
}
$('editorLoginForm').onsubmit=async e=>{e.preventDefault();status('Logger inn …');const {error}=await client.auth.signInWithPassword({email:$('editorEmail').value.trim(),password:$('editorPassword').value});$('editorPassword').value='';if(error)status('Innlogging mislyktes. Kontroller e-post og passord, og at e-posten er bekreftet.',true);else await refresh();};
$('editorRegister').onclick=async()=>{if(!$('editorLoginForm').reportValidity())return;const {error}=await client.auth.signUp({email:$('editorEmail').value.trim(),password:$('editorPassword').value,options:{emailRedirectTo:location.origin+'/redaktor.html'}});$('editorPassword').value='';status(error?'Kunne ikke opprette konto. '+error.message:'Sjekk e-posten for bekreftelse. Kontoen får ikke redaktørtilgang automatisk.',!!error);};
$('verifyLink').onclick=async()=>{try{const url=new URL($('confirmationLink').value.trim()),token=url.searchParams.get('token')||url.searchParams.get('token_hash'),type=url.searchParams.get('type');if(!token||!['signup','email'].includes(type)||url.origin!==config.url)throw Error();const {error}=await client.auth.verifyOtp({token_hash:token,type});$('confirmationLink').value='';if(error)throw error;status('E-posten er bekreftet.');await refresh();}catch{status('Bekreftelseslenken kunne ikke brukes. Den kan være utløpt eller allerede brukt. Prøv å logge inn.',true);}};
$('editorSignOut').onclick=async()=>{if(!leave())return;await client.auth.signOut();previewMode=false;drafts=[];publications=[];article=null;await refresh();status('Logget ut.');};
$('tryEditor').onclick=async()=>{previewMode=true;await refresh();status('Lokal prøvevisning. Du kan redigere og forhåndsvise, men ikke publisere.');};
$('exitPreview').onclick=async()=>{if(!leave())return;previewMode=false;article=null;dirty=false;await refresh();};
$('refreshEditor').onclick=async()=>{if(!leave())return;await refresh();article=null;dirty=false;$('editorForm').hidden=true;$('editorEmpty').hidden=false;status('Listen er oppdatert. Velg artikkelen på nytt.');};
$('editorSearch').oninput=e=>{filter=e.target.value.toLowerCase();renderList();};
$('editorLocale').onchange=e=>{if(!leave()){e.target.value=locale;return;}locale=e.target.value;article=null;dirty=false;$('editorForm').hidden=true;$('editorEmpty').hidden=false;renderList();};
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
window.addEventListener('beforeunload',e=>{if(dirty){flushLocalCopy();e.preventDefault();e.returnValue='';}});
client.auth.onAuthStateChange(()=>{setTimeout(()=>refresh(),0);});
try{const r=await fetch('/cms-seed.json');if(!r.ok)throw Error();const raw=await r.json();if(!Array.isArray(raw))throw Error();seeds=raw.flatMap(row=>{const a=readArticle(row,'Artikkelgrunnlag');if(!a)return [];if(row.editorial?.locale===a.locale)editorialSeeds.set(key(a),{article:a,policy:row.editorial.policy,sourceVersion:row.editorial.sourceVersion});return [a];});await refresh();}catch{status('Redaktøren kunne ikke lastes. Prøv å laste siden på nytt.',true);}
