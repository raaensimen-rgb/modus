// Read-only projection. Never grants approval or publication permission.
const rev=x=>Number.isInteger(x)&&x>=0?x:null;
const known={draft:'Utkast',in_review:'Under vurdering',approved:'Godkjent'};
const checks={not_documented:'Ikke vurdert',under_review:'Under vurdering',in_review:'Under vurdering',approved:'Godkjent',rejected:'Ikke godkjent'};
export function editorPresentation({identity,policy=null,review=null,versionContext=null,local=null,accountDraft=null,published=null,availableLocales=[],dirty=false}={}){
 if(!identity||!['nb','en'].includes(identity.locale)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identity.slug))throw new TypeError('Ugyldig artikkelidentitet eller språk. Tillatt språk er nb og en.');
 const {locale}=identity,issues=[];
 const bound=versionContext?.locale===locale&&versionContext.contentMatches===true;
 const proof=policy?.publication_evidence?.[locale];
 const exact=bound&&/^[a-f0-9]{64}$/.test(versionContext?.sourceVersion||'')&&proof?.reviewed_version_sha256===versionContext.sourceVersion&&typeof proof?.reference==='string'&&!!proof.reference.trim()&&Array.isArray(policy?.approved_locales)&&policy.approved_locales.every(l=>['nb','en'].includes(l))&&policy.approved_locales.includes(locale);
 const state=(value,map,source,approvalBound=exact)=>{
  if(value===undefined||value===null)return {label:'Ikke vurdert',source:null};
  if(typeof value!=='string'||!Object.hasOwn(map,value)){issues.push('Ukjent status i '+source+'.');return {label:'Ukjent status',source};}
  if(value==='approved'&&!approvalBound){issues.push('Godkjenningsstatus mangler samsvarende språk- og versjonsbevis.');return {label:'Ikke vurdert',source};}
  return {label:map[value],source};
 };
 let work=state(policy?.editorial_status,known,'publication-policy');
 if(policy&&Object.hasOwn(known,policy.editorial_status)&&!bound){work={label:'Ikke vurdert',source:'publication-policy'};issues.push('Vurderingsgrunnlaget gjelder ikke denne arbeidsversjonen.');}
 if(policy?.approved_locales!==undefined&&(!Array.isArray(policy.approved_locales)||policy.approved_locales.some(l=>!['nb','en'].includes(l))))issues.push('Ugyldig språkgrunnlag i publiseringsregisteret.');
 if(policy?.visibility!=null&&!['private','preview','public'].includes(policy.visibility))issues.push('Ukjent status for synlighet.');
 const reviewBound=exact&&review?.locale===locale&&review?.source_versions_sha256?.[locale]===versionContext.sourceVersion;
 const sourceFromReview=review?.source_control_status!==undefined&&review?.source_control_status!==null;
 const storage=value=>({exists:!!value,revision:rev(value?.revision)});
 const result={identity:{...identity},work,visibility:{label:policy?.visibility==null?'Ikke oppgitt':(['private','preview','public'].includes(policy.visibility)?{private:'Privat',preview:'Preview',public:'Offentlig'}[policy.visibility]:'Ukjent status'),source:policy?'publication-policy':null},checks:{subject:state(review?.subject_status,checks,'editorial-review',reviewBound),sources:state(review?.source_control_status??policy?.source_control_status,checks,sourceFromReview?'editorial-review':'publication-policy',sourceFromReview?reviewBound:exact),rights:state(review?.rights_status,checks,'editorial-review',reviewBound)},languages:Object.fromEntries(['nb','en'].map(l=>[l,{exists:availableLocales.includes(l),label:l==='nb'?'Norsk':'Engelsk'}])),storage:{local:storage(local),accountDraft:storage(accountDraft),published:storage(published)},version:{revision:accountDraft?rev(accountDraft.revision):rev(local?.revision),recovery:local?.recovery?{sourceRevision:rev(local.recovery.sourceRevision),replacementBaseRevision:rev(local.recovery.replacementBaseRevision)}:null},dirty:!!dirty,readOnly:true,issues};
 return result;
}
