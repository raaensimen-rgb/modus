// Local, read-only administration projections. Never grants access or approval.
import {normalizeArticle,validateArticle} from './model.mjs';
import {normalizeDocumentation} from './review-model.mjs';
export const BACKUP_KIND='modus-admin-backup',SNAPSHOT_KIND='modus-admin-snapshot';
export const DRAFT_PREFIX='modus.editor.local.v1.preview.',REVIEW_PREFIX='modus.editor.review-draft.v1.preview.';
// Extend the existing v1 record, keeping old copies and backup files compatible.
// Local revision is separate from the server's compare-and-swap revision.
export function normalizeLocalRecord(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ugyldig lokal kopi.');
 const article=normalizeArticle(raw.article),identity=article.locale+':'+article.slug;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug))throw Error('Ugyldig lokal artikkeladresse.');
 const check=v=>{if(v.revision!==undefined&&v.revision!==null&&(!Number.isSafeInteger(v.revision)||v.revision<0))throw Error('Ugyldig revisjon.');if(v.localRevision!==undefined&&(!Number.isSafeInteger(v.localRevision)||v.localRevision<0))throw Error('Ugyldig lokal revisjon.');if(v.savedAt!==undefined&&(typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt))))throw Error('Ugyldig lagringstidspunkt.');};
 check(raw);
 if(raw.history!==undefined){if(!Array.isArray(raw.history)||raw.history.length>5)throw Error('Ugyldig lokal historikk.');for(const version of raw.history){if(!version||typeof version!=='object'||version.history!==undefined)throw Error('Ugyldig lokal historikk.');check(version);const a=normalizeArticle(version.article);if(a.locale+':'+a.slug!==identity)throw Error('Historikken har feil artikkelidentitet.');}}
 return {...raw,article};
}
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x,max=400)=>{if(typeof x!=='string'||x.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))throw Error('Ugyldig tekstfelt.');return x;};
const number=x=>{if(x===null||x===undefined)return null;if(!Number.isFinite(x)||x<0||x>Number.MAX_SAFE_INTEGER)throw Error('Ugyldig måleverdi.');return x;};
export const day=x=>{if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(Date.parse(x))||new Date(x).toISOString().slice(0,10)!==x)throw Error('Ugyldig dato.');return x;};
const stamp=x=>{if(typeof x!=='string'||x.length>40||!Number.isFinite(Date.parse(x)))throw Error('Ugyldig tidspunkt.');return new Date(x).toISOString();};
const path=x=>{text(x,500);if(!/^\/(?!\/)[a-zA-Z0-9/_.,%-]*$/.test(x)||x.includes('..')||/%(?:2e|2f|5c|3f|23)/i.test(x))throw Error('Bruk offentlig sidesti uten spørring eller persondata.');return x;};
const enumValue=(x,values)=>{if(!values.includes(x))throw Error('Ukjent status.');return x;};
const list=(x,fn)=>{if(!Array.isArray(x)||x.length>5000)throw Error('Rapportlisten er ugyldig eller for stor.');return x.map(v=>{if(!obj(v))throw Error('Ugyldig rapportlinje.');return fn(v);});};
const dated=(v,out)=>({date:day(v.date),...out});
const dimensions=x=>list(x,v=>dated(v,{label:text(v.label,200),count:number(v.count)}));
export function normalizeSnapshot(raw){
 if(!obj(raw)||raw.kind!==SNAPSHOT_KIND||raw.schema_version!==1||!obj(raw.period))throw Error('Forventet MODUS-administrasjonsrapport versjon 1.');
 const period={from:day(raw.period.from),to:day(raw.period.to)};if(period.from>period.to)throw Error('Ugyldig rapportperiode.');
 const out={kind:SNAPSHOT_KIND,schema_version:1,source:text(raw.source,200),generatedAt:stamp(raw.generatedAt),period};
 if(raw.analytics!==undefined){const a=raw.analytics;if(!obj(a))throw Error('Ugyldig statistikk.');out.analytics={daily:list(a.daily,v=>dated(v,{visits:number(v.visits),pageViews:number(v.pageViews)}))};
  for(const key of ['referrers','countries','devices','browsers','languages'])if(a[key]!==undefined)out.analytics[key]=dimensions(a[key]);
  if(a.content!==undefined)out.analytics.content=list(a.content,v=>dated(v,{path:path(v.path),title:text(v.title,180),views:number(v.views),readStarts:number(v.readStarts),readCompletions:number(v.readCompletions),activeSeconds:number(v.activeSeconds)}));
  if(a.tools!==undefined)out.analytics.tools=list(a.tools,v=>dated(v,{tool:text(v.tool,100),starts:number(v.starts),completions:number(v.completions),activeSeconds:number(v.activeSeconds)}));
  if(a.search!==undefined)out.analytics.search=list(a.search,v=>dated(v,{query:text(v.query,200),searches:number(v.searches),noResults:number(v.noResults)}));
  if(a.studies!==undefined)out.analytics.studies=list(a.studies,v=>dated(v,{id:text(v.id,120),title:text(v.title,180),starts:number(v.starts),completions:number(v.completions)}));
  if(a.quizzes!==undefined)out.analytics.quizzes=list(a.quizzes,v=>dated(v,{id:text(v.id,120),title:text(v.title,180),attempts:number(v.attempts),completions:number(v.completions),correctAnswers:number(v.correctAnswers),totalAnswers:number(v.totalAnswers)}));
 }
 if(raw.members!==undefined)out.members=list(raw.members,v=>({id:text(v.id,120),name:text(v.name,180),email:text(v.email,254),plan:text(v.plan,100),status:enumValue(v.status,['active','trial','paused','cancelled','expired','unknown']),joinedAt:stamp(v.joinedAt),endedAt:v.endedAt?stamp(v.endedAt):null}));
 if(raw.messages!==undefined)out.messages=list(raw.messages,v=>({id:text(v.id,120),category:enumValue(v.category,['error','question','suggestion']),status:enumValue(v.status,['new','in_progress','resolved']),createdAt:stamp(v.createdAt),message:text(v.message,10000),email:text(v.email||'',254),path:v.path?path(v.path):''}));
 if(raw.technical!==undefined)out.technical=list(raw.technical,v=>dated(v,{path:path(v.path),requests:number(v.requests),errors:number(v.errors),brokenLinks:number(v.brokenLinks),audioFailures:number(v.audioFailures),loadMs:number(v.loadMs),lcpMs:number(v.lcpMs),cls:number(v.cls)}));
 for(const key of ['members','messages'])if(out[key]&&new Set(out[key].map(v=>v.id)).size!==out[key].length)throw Error('Rapporten har doble identiteter.');
 const datedRows=[...Object.values(out.analytics||{}).flat(),...(out.technical||[])];if(datedRows.some(v=>v.date<period.from||v.date>period.to))throw Error('Måling ligger utenfor oppgitt rapportperiode.');
 return out;
}
export const inRange=(rows,from,to)=>(rows||[]).filter(v=>v.date>=from&&v.date<=to);
export function total(rows,key){if(!rows.length)return 0;if(rows.some(v=>v[key]===null||v[key]===undefined))return null;return rows.reduce((n,v)=>n+v[key],0);}
export function grouped(rows,key,fields){const map=new Map();for(const row of rows){const id=row[key];if(!map.has(id))map.set(id,{[key]:id,...Object.fromEntries(fields.map(f=>[f,[]]))});for(const f of fields)map.get(id)[f].push(row[f]);}return [...map.values()].map(v=>({[key]:v[key],...Object.fromEntries(fields.map(f=>[f,v[f].some(x=>x===null||x===undefined)?null:v[f].reduce((a,b)=>a+b,0)]))}));}
export function readLocalDrafts(storage){const records=[],issues=[];try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(DRAFT_PREFIX))continue;try{const raw=normalizeLocalRecord(JSON.parse(storage.getItem(key))),article=raw.article;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)||key!==DRAFT_PREFIX+article.locale+':'+article.slug)throw Error();records.push({key,article,revision:Number.isInteger(raw.revision)?raw.revision:null,savedAt:typeof raw.savedAt==='string'?raw.savedAt:null,problems:validateArticle(article)});}catch{issues.push('En lokal kopi kunne ikke valideres. Originalen er beholdt.');}}}catch{issues.push('Nettleseren blokkerer lesing av lokale kopier.');}return {records,issues};}
export function draftSummary(records){const identities=new Map();for(const r of records){if(!identities.has(r.article.slug))identities.set(r.article.slug,new Set());identities.get(r.article.slug).add(r.article.locale);}return {drafts:records.length,articles:identities.size,missingLanguages:[...identities.values()].filter(v=>v.size<2).length,needsWork:records.filter(r=>r.problems.length>0).length,media:records.filter(r=>r.article.image.src).length};}
const allowedKey=k=>typeof k==='string'&&(k.startsWith(DRAFT_PREFIX)||k.startsWith(REVIEW_PREFIX));
export function createBackup(storage){const records=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(allowedKey(key))records.push({key,value:storage.getItem(key)});}return {kind:BACKUP_KIND,schema_version:1,scope:'preview',createdAt:new Date().toISOString(),records};}
export function inspectBackup(raw,storage){if(!obj(raw)||raw.kind!==BACKUP_KIND||raw.schema_version!==1||raw.scope!=='preview'||!Array.isArray(raw.records)||raw.records.length>5000)throw Error('Ugyldig lokal sikkerhetskopi.');const seen=new Set(),records=raw.records.map(v=>{if(!obj(v)||!allowedKey(v.key)||seen.has(v.key))throw Error('Ugyldig eller dobbel lagringsnøkkel.');seen.add(v.key);text(v.value,1000000);const content=JSON.parse(v.value);let slug,locale;if(v.key.startsWith(DRAFT_PREFIX)){const a=normalizeLocalRecord(content).article;slug=a.slug;locale=a.locale;}else{slug=content.slug;locale=content.locale;normalizeDocumentation(content,{slug,locale});}const prefix=v.key.startsWith(DRAFT_PREFIX)?DRAFT_PREFIX:REVIEW_PREFIX;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||v.key!==prefix+locale+':'+slug)throw Error('Kopien har feil artikkelidentitet.');return {key:v.key,value:v.value,exists:storage.getItem(v.key)!==null};});return {records,newCopies:records.filter(v=>!v.exists).length,existingCopies:records.filter(v=>v.exists).length};}
export function restoreMissing(plan,storage){let restored=0,skipped=0,failed=0;for(const r of plan.records){try{if(storage.getItem(r.key)!==null){skipped++;continue;}storage.setItem(r.key,r.value);restored++;}catch{failed++;}}return {restored,skipped,failed};}
export function csv(rows){return rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^\s*[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');}
