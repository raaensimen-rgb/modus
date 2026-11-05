import {editorPresentation} from './editor-presentation.mjs';
import {normalizeArticle} from './model.mjs';
export const REVIEW_ALGORITHM='modus-editor-content-v1';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function canonicalJSON(value){
 if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export async function sha256(bytes){return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function contentFingerprint(article,mediaDigest=null){
 const content=normalizeArticle(article);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(content.slug))throw Error('Artikkelen trenger en gyldig adresse.');
 const media=content.image.src?(hash(mediaDigest)?mediaDigest:'unverified'):null;
 const material={algorithm:REVIEW_ALGORITHM,content,media};
 return {algorithm:REVIEW_ALGORITHM,sha256:await sha256(new TextEncoder().encode(canonicalJSON(material))),mediaVerified:!content.image.src||hash(mediaDigest),mediaDigest:media==='unverified'?null:media};
}
export function validReference(value){
 if(typeof value!=='string'||value.length>2000||/[\u0000-\u001f]/.test(value))return false;
 if(/^https:\/\//i.test(value)){try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&!/\s/.test(value);}catch{return false;}}
 return /^(?:doi:10\.\d{4,9}\/\S+|isbn:[0-9x -]{10,20}|ref:[a-z0-9._/-]{3,120})$/i.test(value);
}
const fields=['resource','creator','reference','supports','license','credit','issues'];
export function normalizeDocumentation(raw,identity){
 if(!object(raw)||Object.keys(raw).some(k=>!['schema_version','kind','slug','locale','authoritative','entries'].includes(k))||raw.schema_version!==1||raw.kind!=='modus-local-review-draft'||typeof raw.slug!=='string'||raw.slug.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug)||raw.slug!==identity.slug||raw.locale!==identity.locale||!['nb','en'].includes(raw.locale)||!Array.isArray(raw.entries)||raw.entries.length>50)throw Error('Ugyldig dokumentasjonsformat, artikkel eller språk. Originalen er beholdt.');
 const entries=raw.entries.map(e=>{
  if(!object(e)||Object.keys(e).some(k=>!['type','status','algorithm','contentFingerprint',...fields].includes(k))||!['subject','source','rights'].includes(e.type)||!['not_reviewed','in_review','checked','rejected'].includes(e.status)||e.algorithm!==REVIEW_ALGORITHM||!hash(e.contentFingerprint))throw Error('Ugyldig kontrolltype, status eller innholdsfingeravtrykk.');
  const out={type:e.type,status:e.status,algorithm:REVIEW_ALGORITHM,contentFingerprint:e.contentFingerprint};
  for(const k of fields){if(typeof e[k]!=='string'||e[k].length>4000)throw Error('Ugyldig dokumentasjonsfelt: '+k);out[k]=e[k];}
  return out;
 });
 return {schema_version:1,kind:'modus-local-review-draft',slug:identity.slug,locale:identity.locale,authoritative:false,entries};
}
export function emptyDocumentation(identity){return normalizeDocumentation({schema_version:1,kind:'modus-local-review-draft',slug:identity.slug,locale:identity.locale,entries:[]},identity);}
// A derived local copy of existing registries. It is never an approval authority.
export function registryBundle(input){
 if(!object(input)||input.schema_version!==1||input.kind!=='modus-private-review-context'||!object(input.registries))throw Error('Ugyldig registergrunnlag.');
 const r=input.registries;
 for(const k of ['review','publication','illustrations','cards'])if(!object(r[k])||r[k].schema_version!==1)throw Error('Ugyldig register: '+k);
 if(!Array.isArray(r.review.articles)||r.review.articles.some(a=>!object(a)||typeof a.slug!=='string'||a.evidence_reviewed!==undefined&&(!Array.isArray(a.evidence_reviewed)||a.evidence_reviewed.some(e=>!object(e)||typeof e.url!=='string'||typeof e.scope!=='string')))||!object(r.publication.articles)||!object(r.illustrations.images)||!object(r.cards.cards))throw Error('Ugyldige registeroppføringer.');
 return input;
}
export function reviewPresentation({article,fingerprint,documentation,context=null}){
 const identity={slug:article.slug,locale:article.locale};
 const notes=normalizeDocumentation(documentation,identity),r=context?.registries;
 const row=r?.review.articles.find(a=>a.slug===identity.slug),policy=r?.publication.articles[identity.slug];
 const base=editorPresentation({identity,policy,review:row});
 const illustration=r?.illustrations.images[identity.slug]?.[identity.locale],card=r?.cards.cards[identity.slug];
 const refs=[];const add=(source,reference,scope,version=null)=>{if(typeof reference==='string')refs.push({source,reference,valid:validReference(reference),scope,version:hash(version)?version:null});};
 for(const e of row?.evidence_reviewed||[])add('Artikkelgjennomgang',e.url,e.scope||'Avgrenset registerreferanse',row?.source_versions_sha256?.[identity.locale]);
 const proof=policy?.publication_evidence?.[identity.locale];if(proof)add('Publiseringsregister',proof.reference,'Eksisterende Git-publiseringsregel; ikke lokal godkjenning',proof.reviewed_version_sha256);
 if(illustration)add('Illustrasjonstillatelse',illustration.reference,r.illustrations.scope,illustration.sha256);
 if(card)add('Korttillatelse',card.reference,r.cards.scope,card.versions?.[identity.locale]);
 const issues=[];
 if(!context)issues.push('Lokalt registergrunnlag er ikke lastet.');
 if(!fingerprint.mediaVerified)issues.push('Illustrasjonsbytes kan ikke verifiseres. Eksterne ressurser hentes ikke.');
 if(row&&!hash(row.source_versions_sha256?.[identity.locale]))issues.push('Registeret mangler gyldig kontrollert tekstversjon for dette språket.');
 if(proof&&!hash(proof.reviewed_version_sha256))issues.push('Publiseringsbeviset mangler gyldig innholdshash.');
 if(card&&!hash(card.versions?.[identity.locale]))issues.push('Korttillatelsen mangler gyldig versjon for dette språket.');
 if(row)issues.push('Eksisterende kildehash bruker en annen algoritme. Den er ikke automatisk koblet til gjeldende CMS-fingeravtrykk.');
 if(!row)issues.push('Ingen artikkelgjennomgang for denne identiteten.');
 if(!refs.length||refs.some(x=>!x.valid))issues.push('Dokumentasjonsreferanser mangler eller er ugyldige.');
 if(article.image?.src&&!illustration)issues.push('Medierettigheter mangler i illustrasjonsregisteret for dette språket.');
 const mediaScope=r?.illustrations.scope==='isolated-preview-existing-illustrations-only'&&validReference(r?.illustrations.approval_reference)&&illustration?.reference===r.illustrations.approval_reference;
 const mediaMatch=!!illustration&&mediaScope&&fingerprint.mediaVerified&&illustration.sha256===fingerprint.mediaDigest&&validReference(illustration.reference);
 if(illustration&&!mediaMatch)issues.push('Illustrasjonstillatelsen samsvarer ikke med verifiserte bildebytes eller dokumentert Preview-omfang.');
 if(mediaMatch)issues.push('Samsvarende SHA i lokal registerkopi gjelder bare angitt Preview-omfang, ikke fulltekst eller verifisert generell lisens.');
 const entries=notes.entries.map(e=>{
  const current=e.contentFingerprint===fingerprint.sha256&&fingerprint.mediaVerified;
  const problems=[];
  if(!current)problems.push('Utdatert eller uverifiserbart innholdsfingeravtrykk.');
  if(!validReference(e.reference))problems.push('Ugyldig eller manglende referanse.');
  if(!e.resource.trim()||!e.creator.trim()||!e.supports.trim())problems.push('Ressurs, opphav eller støttet påstand mangler.');
  if(e.type==='rights'&&(!e.license.trim()||!e.credit.trim()))problems.push('Lisens eller krediteringskrav mangler.');
  if(e.issues.trim())problems.push('Åpne avvik: '+e.issues);
  return {...e,current,problems,label:'Ikke vurdert',localStatus:{not_reviewed:'Ikke gjennomgått lokalt',in_review:'Under lokal gjennomgang',checked:'Sjekket lokalt',rejected:'Avvist lokalt'}[e.status]};
 });
 return {identity,fingerprint,statuses:{subject:'Ikke vurdert',sources:'Ikke vurdert',rights:'Ikke vurdert'},registeredSourceStatus:base.checks.sources.source?base.checks.sources.label:null,legacyVersion:hash(row?.source_versions_sha256?.[identity.locale])?row.source_versions_sha256[identity.locale]:null,mediaMatch,refs,entries,issues,authoritative:false};
}
