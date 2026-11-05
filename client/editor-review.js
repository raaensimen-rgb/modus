import {normalizeArticle} from '../cms/model.mjs';
import {contentFingerprint,sha256,emptyDocumentation,normalizeDocumentation,registryBundle,reviewPresentation,REVIEW_ALGORITHM} from '../cms/review-model.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function createReviewController({element,getArticle,getUserKey}){
 if(!element)return {refresh(){}};
 let context=null,contextOwner=null,timer,generation=0,current=null,signature=null;
 const forms=new Map(),unsaved=new Set(),protectedKeys=new Set();
 const localKey=a=>'modus.editor.review-draft.v1.'+getUserKey()+'.'+a.locale+':'+a.slug;
 const message=element.querySelector('[data-review-message]'),output=element.querySelector('[data-review-output]'),form=element.querySelector('[data-review-form]');
 const inputs=[...form.querySelectorAll('[name]')];let formKey=null;
 const status=(text,error=false)=>{message.textContent=text;message.classList.toggle('error',error);};
 const identity=a=>({slug:a.slug,locale:a.locale});
 const read=a=>{
  const k=localKey(a);try{const raw=localStorage.getItem(k);return raw?normalizeDocumentation(JSON.parse(raw),identity(a)):emptyDocumentation(identity(a));}
  catch{protectedKeys.add(k);status('Lokal dokumentasjon kunne ikke valideres. Originalen beholdes og overskrives ikke. Eksport av uleselig original er tilgjengelig.',true);return emptyDocumentation(identity(a));}
 };
 const download=(data,name)=>{const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function syncForm(a){
  const k=localKey(a);if(formKey===k)return;
  formKey=k;const saved=forms.get(k)||{};
  for(const input of inputs)input.value=saved[input.name]??(input.name==='type'?'source':input.name==='status'?'not_reviewed':'');
  status(unsaved.has(k)?'Ulagret dokumentasjonsutkast. Velg Lagre dokumentasjon lokalt.':'Lokal dokumentasjon for '+a.locale.toUpperCase()+'. Ingen myndighet overføres.');
 }
 function formData(){return Object.fromEntries(inputs.map(i=>[i.name,i.value]));}
 for(const i of inputs)i.addEventListener('input',()=>{if(formKey){forms.set(formKey,formData());unsaved.add(formKey);status('Ulagret dokumentasjonsutkast. Velg Lagre dokumentasjon lokalt.');}});
 window.addEventListener('beforeunload',e=>{if(unsaved.size){e.preventDefault();e.returnValue='';}});
 async function inspectMedia(a){
  const src=a.image.src;if(!src)return null;
  // Static same-origin image bytes only. No external URL, traversal, API or Auth.
  if(!/^\/(?:en\/)?images\/[a-z0-9_/-]+\.(?:svg|png|jpe?g|webp)$/i.test(src)||src.includes('..'))return null;
  try{const response=await fetch(src,{cache:'no-store',credentials:'omit',redirect:'error'});if(!response.ok)return null;const size=Number(response.headers.get('content-length'));if(size>10000000)return null;const data=await response.arrayBuffer();return data.byteLength<=10000000?sha256(data):null;}catch{return null;}
 }
 function render(view){
  output.setAttribute('aria-busy','false');output.replaceChildren();
  const heading=node('h3','Kontrollgrunnlag · '+view.identity.locale.toUpperCase());output.append(heading);
  const dl=node('dl');dl.className='review-checks';
  for(const [k,label] of [['subject','Faglig status'],['sources','Kildekontroll'],['rights','Medierettigheter']]){const group=node('div');group.append(node('dt',label),node('dd',view.statuses[k]));dl.append(group);}output.append(dl);
  output.append(node('p','Vurdert innhold: '+view.fingerprint.algorithm),node('code',view.fingerprint.sha256),node('p','Lokale registreringer gir aldri autoritativ godkjenning eller publiseringstillatelse. Innlastet registerkopi er ikke autentisert; Git-reglene er uendret.'));
  if(view.legacyVersion)output.append(node('p','Eksisterende registerhash (annen algoritme):'),node('code',view.legacyVersion));
  if(view.registeredSourceStatus)output.append(node('p','Registrert kildekontroll: '+view.registeredSourceStatus+' · ikke fullført kontroll av denne CMS-versjonen.'));
  const issues=node('ul');issues.setAttribute('aria-label','Kontrollavvik');for(const text of view.issues)issues.append(node('li',text));output.append(issues);
  output.append(node('h3','Dokumentasjonsreferanser'));
  if(!view.refs.length)output.append(node('p','Ingen registerreferanser for dette språket.'));
  for(const ref of view.refs){const box=node('section');box.className='review-reference';box.append(node('h4',ref.source),node('p',ref.scope));
   if(ref.valid&&ref.reference.startsWith('https://')){const a=node('a',ref.reference);a.href=ref.reference;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}else box.append(node('p',ref.reference+(ref.valid?'':' · ugyldig referanse')));
   if(ref.version)box.append(node('code',ref.version));output.append(box);
  }
  output.append(node('h3','Lokale registreringer'));
  if(!view.entries.length)output.append(node('p','Ingen lokal dokumentasjon for denne artikkelen og dette språket.'));
  for(const entry of view.entries){const box=node('section');box.className='review-reference';box.append(node('h4',entry.resource||'Ufullstendig registrering'),node('p',entry.localStatus+' · '+entry.label+' · '+(entry.current?'Samsvarende innhold':'Utdatert / uverifisert innhold')));
   for(const [field,label] of [['creator','Opphav'],['reference','Referanse'],['supports','Støtter'],['license','Lisens'],['credit','Kreditering']])box.append(node('p',label+': '+(entry[field]||'Mangler')));
   box.append(node('code',entry.contentFingerprint));for(const text of entry.problems)box.append(node('p',text));output.append(box);
  }
 }
 async function inspect(){
  const run=++generation;clearTimeout(timer);const input=getArticle();if(!input||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)){current=null;output.setAttribute('aria-busy','false');output.textContent='Velg en artikkel med gyldig adresse for kontrollvisning.';return null;}
  try{const a=normalizeArticle(structuredClone(input)),k=localKey(a);signature=k+JSON.stringify(a);if(contextOwner!==getUserKey()){context=null;contextOwner=null;}syncForm(a);output.setAttribute('aria-busy','true');output.textContent='Oppdaterer kontroll. Tidligere innhold er ikke bekreftet.';const digest=await inspectMedia(a),fingerprint=await contentFingerprint(a,digest);
   if(run!==generation||!getArticle()||k!==localKey(getArticle())||JSON.stringify(normalizeArticle(getArticle()))!==JSON.stringify(a))return null;
   const documentation=read(a);current={article:a,fingerprint,documentation,key:k};render(reviewPresentation({article:a,fingerprint,documentation,context}));return current;
  }catch(e){output.setAttribute('aria-busy','false');status('Kontrollgrunnlaget kunne ikke leses: '+e.message,true);return null;}
 }
 async function fileJSON(file,max){if(!file||file.size>max)throw Error('Filen mangler eller er for stor.');return JSON.parse(await file.text());}
 const write=(a,doc)=>{
  const k=localKey(a);if(protectedKeys.has(k))throw Error('Uleselig original skal ikke overskrives. Eksporter originalen for avklaring.');
  localStorage.setItem(k,JSON.stringify(normalizeDocumentation(doc,identity(a))));
 };
 element.querySelector('[data-review-refresh]').onclick=()=>void inspect();
 element.querySelector('[data-review-context]').onchange=async e=>{
  try{const next=registryBundle(await fileJSON(e.target.files[0],4000000));context=next;contextOwner=getUserKey();await inspect();status('Privat registerkopi lastet i minnet. Filen er ikke autentisert og gir ingen ny myndighet.');}catch(error){status('Registerimport avvist: '+error.message,true);}finally{e.target.value='';}
 };
 element.querySelector('[data-review-import]').onchange=async e=>{
  try{const state=await inspect();if(!state)throw Error('Velg stabil artikkel først.');const imported=normalizeDocumentation(await fileJSON(e.target.files[0],1000000),identity(state.article));if(localKey(getArticle())!==state.key)throw Error('Artikkel ble endret under import.');const previous=read(state.article);write(state.article,{...previous,entries:[...previous.entries,...imported.entries]});await inspect();status('Dokumentasjon importert som lokal registrering. Ingen godkjenning er overført.');}catch(error){status('Dokumentasjonsimport avvist: '+error.message,true);}finally{e.target.value='';}
 };
 element.querySelector('[data-review-export]').onclick=async()=>{
  try{const state=await inspect();if(!state)throw Error('Velg stabil artikkel først.');const raw=protectedKeys.has(state.key)?localStorage.getItem(state.key):JSON.stringify(read(state.article),null,2);download(raw||'',state.article.slug+'.'+state.article.locale+'.review.json');status('Lokal dokumentasjon eksportert. Ulagret tekst i registreringsfeltene må lagres separat.');}catch(e){status('Eksport mislyktes: '+e.message,true);}
 };
 element.querySelector('[data-review-export-fields]').onclick=async()=>{
  try{const state=await inspect();if(!state)throw Error('Velg stabil artikkel først.');const entry={...formData(),algorithm:REVIEW_ALGORITHM,contentFingerprint:state.fingerprint.sha256};const doc=normalizeDocumentation({...emptyDocumentation(identity(state.article)),entries:[entry]},identity(state.article));download(JSON.stringify(doc,null,2),state.article.slug+'.'+state.article.locale+'.review-fields.json');status('Registreringsfeltene er eksportert uten lokal lagring. Uleselige originaler og eksisterende dokumentasjon er uendret.');}catch(e){status('Kunne ikke eksportere registreringsfeltene: '+e.message,true);}
 };
 form.onsubmit=async e=>{
  e.preventDefault();try{const state=await inspect();if(!state)throw Error('Artikkelen ble endret. Prøv igjen.');const entry={...formData(),algorithm:REVIEW_ALGORITHM,contentFingerprint:state.fingerprint.sha256};const doc=read(state.article);write(state.article,{...doc,entries:[...doc.entries,entry]});unsaved.delete(state.key);await inspect();status('Dokumentasjon lagret bare i denne nettleseren. Ikke vurdert av autoritativ kontroll.');}
  catch(error){status('Kunne ikke lagre dokumentasjonen lokalt: '+error.message+' Feltene er beholdt; ikke lukk siden.',true);}
 };
 const host=element.closest('#editorForm');
 if(host)new MutationObserver(()=>{if(host.hidden){clearTimeout(timer);generation++;current=null;signature=null;output.replaceChildren();formKey=null;for(const i of inputs)i.value=i.name==='type'?'source':i.name==='status'?'not_reviewed':'';if(contextOwner!==getUserKey()){context=null;contextOwner=null;}}}).observe(host,{attributes:true,attributeFilter:['hidden']});
 return {refresh(force=false){
  const a=getArticle();let next=null;try{if(a)next=localKey(a)+JSON.stringify(normalizeArticle(a));}catch{}
  if(!force&&next&&next===signature&&current)return;
  clearTimeout(timer);generation++;current=null;signature=next;output.setAttribute('aria-busy','true');output.textContent='Oppdaterer kontroll. Tidligere innhold er ikke bekreftet.';timer=setTimeout(()=>void inspect(),100);
 }};
}
