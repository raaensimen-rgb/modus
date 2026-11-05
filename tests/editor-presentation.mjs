import assert from 'node:assert/strict';
import fs from 'node:fs';
import {editorPresentation} from '../cms/editor-presentation.mjs';
import {normalizeArticle,renderArticle} from '../cms/model.mjs';
const hash='a'.repeat(64),identity={slug:'synthetic-status',locale:'nb'};
const policy={editorial_status:'approved',visibility:'public',approved_locales:['nb'],source_control_status:'under_review',publication_evidence:{nb:{reference:'Synthetic review',reviewed_version_sha256:hash}}};
const ctx={locale:'nb',contentMatches:true,sourceVersion:hash};
let cases=0;const test=(label,fn)=>{fn();cases++;console.log('PASS '+label);};
test('RED003-01 separate NB/EN work and checks',()=>{
 const nb=editorPresentation({identity,policy,versionContext:ctx,review:{locale:'nb',subject_status:'approved',rights_status:'under_review',source_control_status:'not_documented',source_versions_sha256:{nb:hash}},availableLocales:['nb','en']});
 assert.equal(nb.work.label,'Godkjent');assert.equal(nb.visibility.label,'Offentlig');assert.equal(nb.checks.subject.label,'Godkjent');assert.equal(nb.checks.sources.label,'Ikke vurdert');assert.equal(nb.checks.rights.label,'Under vurdering');
 const en=editorPresentation({identity:{...identity,locale:'en'},policy:{editorial_status:'in_review'},versionContext:{locale:'en',contentMatches:true},availableLocales:['nb','en']});assert.equal(en.work.label,'Under vurdering');assert.equal(en.checks.subject.label,'Ikke vurdert');assert.equal(en.readOnly,true);
});
test('RED003-02 missing language and immutable projection',()=>{const input={identity,availableLocales:['nb']},before=JSON.stringify(input);const r=editorPresentation(input);assert.equal(r.languages.en.exists,false);assert.equal(r.languages.nb.exists,true);assert.equal(JSON.stringify(input),before);});
test('RED003-03 missing/invalid statuses never imply approval',()=>{
 for(const value of [undefined,null,false,0,{},[], 'yes','__proto__']){const r=editorPresentation({identity,policy:{editorial_status:value},versionContext:ctx});assert.notEqual(r.work.label,'Godkjent');if(value!==undefined&&value!==null)assert.equal(r.work.label,'Ukjent status');}
});
test('RED003-04 approval requires exact locale, version and existing evidence',()=>{
 for(const input of [{},{versionContext:{...ctx,locale:'en'}},{versionContext:{...ctx,contentMatches:false}},{versionContext:{...ctx,sourceVersion:'b'.repeat(64)}},{versionContext:ctx,policy:{...policy,approved_locales:'nb'}},{versionContext:ctx,policy:{...policy,publication_evidence:{}}}])assert.notEqual(editorPresentation({identity,policy,...input}).work.label,'Godkjent');
 assert.notEqual(editorPresentation({identity:{...identity,locale:'en'},policy,versionContext:{...ctx,locale:'en'}}).work.label,'Godkjent');
});
test('RED003-05 storage and revisions are independent',()=>{const r=editorPresentation({identity,accountDraft:{revision:8},published:{revision:3},local:{revision:7,recovery:{sourceRevision:1,replacementBaseRevision:7}},dirty:true});assert.equal(r.storage.published.revision,3);assert.equal(r.storage.accountDraft.revision,8);assert.equal(r.storage.local.revision,7);assert.equal(r.version.recovery.sourceRevision,1);assert.equal(r.work.label,'Ikke vurdert');assert.equal(r.dirty,true);assert.equal(editorPresentation({identity,local:{}}).storage.local.revision,null);assert.equal(editorPresentation({identity,accountDraft:{},local:{revision:4}}).version.revision,null);});
test('RED003-06 all existing learning metadata survives JSON/model roundtrip',()=>{
 const articles=JSON.parse(fs.readFileSync('content/articles.json'));const quizzes=JSON.parse(fs.readFileSync('content/article-quizzes.json'));let fields=0;
 for(const a of articles)for(const locale of ['nb','en']){const n=normalizeArticle({...a,locale,quiz:quizzes[a.slug]});assert.deepEqual(normalizeArticle(JSON.parse(JSON.stringify(n))),n);for(const k of ['learning','practice_steps','next_step'])if(a[k]!==undefined){assert.deepEqual(n[k],a[k]);fields++;}}
 assert.equal(fields,articles.reduce((n,a)=>n+2*["learning","practice_steps","next_step"].filter(k=>a[k]!==undefined).length,0));
});
test('RED003-07 invalid locale/corrupt metadata rejected without mutating input',()=>{
 for(const locale of ['fr','',null,undefined])assert.throws(()=>normalizeArticle({locale}),/språk/);
 for(const extra of [{learning:null},{learning:{unknown:'do not discard'}},{learning:{goals:[{}]}},{practice_steps:['ok',{}]},{next_step:{slug:'javascript:evil',reason:'X'}},{sections:[['Heading',null]]},{quiz:'corrupt'}]){const input={locale:'nb',...extra},before=JSON.stringify(input);assert.throws(()=>normalizeArticle(input));assert.equal(JSON.stringify(input),before);}
 assert.throws(()=>editorPresentation({identity:{...identity,locale:'fr'}}),/språk/);
});
test('RED003-08 retained metadata is not blindly rendered or treated as authority',()=>{const n=normalizeArticle({slug:'synthetic-status',locale:'nb',learning:{goals:['<script>METADATA_ONLY</script>']},editorial_status:'approved'});assert.equal(n.learning.goals[0],'<script>METADATA_ONLY</script>');assert.equal(n.editorial_status,undefined);assert.doesNotMatch(renderArticle(n),/METADATA_ONLY|<script>/);});
test('RED003-09 check provenance does not cross locales',()=>{const r=editorPresentation({identity,policy,versionContext:ctx,review:{locale:'en',subject_status:'approved',rights_status:'approved',source_versions_sha256:{en:hash}}});assert.equal(r.checks.subject.label,'Ikke vurdert');assert.equal(r.checks.rights.label,'Ikke vurdert');});
console.log(`${cases}/${cases} editor presentation/model groups passed.`);
