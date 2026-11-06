'use strict';
// One local, sequential build/QA entry point. No network/deploy/GitHub commands.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),task=path.dirname(root),evidence=path.join(task,'evidence'),delivery=path.join(task,'delivery');
fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(delivery,{recursive:true});
const rows=[],started=new Date().toISOString();
const sourceState=()=>spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim();
const initialSourceState=sourceState();
for(const name of ['test-results.json','local-candidate.json','navigation-current/results.json','release-current.json','piano-browser-results.json','audio-signal-results.json'])fs.rmSync(path.join(root,'test-results',name),{force:true});
const stages=[
 ['build',['npm','run','build'],true],
 ['static',['npm','test']],
 ['reproducibility',['python3','tests/candidate-reproducibility.py']],
 ['navigation',['npm','run','test:navigation']],
 ['release',['node','tests/release-browser.cjs']],
 ['piano',['node','tests/piano-browser.cjs']],
 ['audio',['node','tests/audio-signal-browser.cjs']]
];
// Clear old evidence in the summary, without discarding historical log files.
let blocked=false;
for(const [name,args,gate] of stages){
 if(blocked){rows.push({name,command:args.join(' '),status:'skipped',reason:'Build prerequisite failed'});continue;}
 const log=path.join(evidence,name+'.log'),fd=fs.openSync(log,'w'),start=Date.now();
 console.log('Starting '+name+'…');
 const run=spawnSync(args[0],args.slice(1),{cwd:root,env:{...process.env,MODUS_TEST_DIST:path.join(task,'package')},stdio:['ignore',fd,fd]});
 fs.closeSync(fd);
 const exitCode=run.error?1:run.status??1;
 rows.push({name,command:args.join(' '),status:exitCode===0?'passed':'failed',exitCode,seconds:Math.round((Date.now()-start)/1000),log:path.relative(task,log),error:run.error?.message});
 console.log(name+': '+rows.at(-1).status.toUpperCase());
 if(gate&&exitCode!==0)blocked=true;
}
const read=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return null;}};
const manifest=read('../package/release-manifest.json'),staticTests=read('test-results/test-results.json');
const result={status:rows.every(x=>x.status==='passed')?'LOCAL_CANDIDATE_PASSED':'FAILED',startedAt:started,completedAt:new Date().toISOString(),sourceSha:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),sourceChanges:spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim(),baselineSha:'d809a7b0fc4fbb8480f7ee5b8e3daa7ffb5227e5',baselineDeployment:'536b0e35-23a1-4dad-99bd-337a51afb13b',deploymentAuthorized:false,networkDeploymentPerformed:false,stages:rows,ordinaryGroups:staticTests&&{total:staticTests.total,passed:staticTests.passed,failed:staticTests.failed},preservation:read('test-results/local-candidate.json'),navigation:read('test-results/navigation-current/results.json'),release:read('test-results/release-current.json'),piano:read('test-results/piano-browser-results.json'),audio:read('test-results/audio-signal-results.json'),sourceChangedDuringRun:initialSourceState!==sourceState(),manualSafari:false,manualVoiceOver:false,authenticatedAdminTest:false};
if(result.sourceChangedDuringRun||manifest?.source_sha!==result.sourceSha){
 result.status='FAILED';result.integrityError='Source changed during QA or candidate source SHA differs';
}
const zip=path.join(delivery,'MODUS-package-A-local.zip');
if(fs.existsSync(zip))result.archiveSha256=crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
fs.writeFileSync(path.join(delivery,'REPORT.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# Pakke A – lokal kandidat', '', '**Status: '+result.status+'**', '',
 'Kilde: `'+result.sourceSha+'`. Publisert grunnlag: `'+result.baselineSha+'`, deployment `'+result.baselineDeployment+'`.',
 '', 'Menyretting: første pekerklikk bekrefter hoveråpnet meny; neste klikk lukker. Tastatur og berøring beholder veksling. Temavelgerens åpne panel løftes over menyrekken og gjenoppretter tidligere lag ved lukking. Ingen CSS eller fag-/medieinnhold er endret.',
 '', '| Kontroll | Resultat | Logg |','|---|---|---|',...rows.map(r=>'| '+r.name+' | '+r.status+' | '+(r.log?'['+r.log+'](../'+r.log+')':r.reason)+' |'),'',
 'Ordinære grupper: '+(staticTests?staticTests.passed+'/'+staticTests.total:'ikke kjørt')+'.',
 'Bevaring: '+JSON.stringify(result.preservation)+'.',
 'Nettleserscenarioer: meny '+(result.navigation?.rows.length??0)+', samlet release '+(result.release?.rows.length??0)+', piano '+(result.piano?.length??0)+', lyd '+(result.audio?.length??0)+'.',
 '', 'ZIP SHA-256: `'+(result.archiveSha256||'ikke bygget')+'`.',
 '', 'Bygg/test kjøres samlet med `npm run quality:local` fra source. Kandidaten bygges fra vendort, hashbundet siste offentlige pakke etter ordinært artikkel-/CMS-bygg. En andre bygging kontrollerer alle filhash og identisk ZIP.',
 '', 'Første diagnostiske kjøring og feillogger er bevart i evidence/first-quality-run. Der ble temavelgerens overlapp og utdaterte testforventninger identifisert. Endelig status over gjelder denne kjøringen.',
 '', 'Privatgrense: eksakt fildelta, tom offentlig CMS-seed og fravær av private runtime-/kildemapper er kontrollert. Negative tester avviser privat runtime, privat innhold, HTML-innholdsendring og endret baseline.',
 '', 'Begrensninger: automatisert Chromium/WebKit er ikke manuell Safari-/iPhone-/VoiceOver-attest. Ingen autentisert administratorinnlogging eller ny live-/Access-kontroll er utført. Den offentlige tjenesten er ikke endret.',
 '', 'Ingen push, merge, deploy, GitHub-endring, Access-/database-/DNS-endring. Kandidaten er kun lokal; eventuell senere publisering krever separat uttrykkelig GO.',
 '', 'Kildestatus ved kontroll: '+(result.sourceChanges?'arbeidsendringer registrert i REPORT.json':'ren lokal commit')+'.', ''];
fs.writeFileSync(path.join(delivery,'REPORT.md'),lines.join('\n'));
console.log(result.status+' — '+path.join(delivery,'REPORT.md'));
process.exitCode=result.status==='LOCAL_CANDIDATE_PASSED'?0:1;
