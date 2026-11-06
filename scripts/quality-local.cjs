'use strict';
// One local, sequential build/QA entry point. No network/deploy/GitHub commands.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),task=path.dirname(root),evidence=path.join(task,'evidence'),delivery=path.join(task,'delivery');
fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(delivery,{recursive:true});
const rows=[],started=new Date().toISOString();
const sourceState=()=>spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim();
const initialSourceState=sourceState();
const baseline=JSON.parse(fs.readFileSync(path.join(root,'release-inputs/production-baseline.json'),'utf8'));
for(const name of ['test-results.json','local-candidate.json','navigation-current/results.json','release-current.json','piano-browser-results.json','audio-signal-results.json'])fs.rmSync(path.join(root,'test-results',name),{force:true});
const stages=[
 ['build',['npm','run','build'],true],
 ['static',['npm','test']],
 ['reproducibility',['python3','tests/candidate-reproducibility.py']],
 ['scales-browser',['node','tests/scale-library-browser.cjs']],
 ['navigation',['npm','run','test:navigation']],
 ['release',['node','tests/release-browser.cjs']],
 ['piano',['node','tests/piano-browser.cjs']],
 ['audio',['node','tests/audio-signal-browser.cjs']],
 ['article-jam',['node','tests/article-jam-browser.cjs']]
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
const result={status:rows.every(x=>x.status==='passed')?'LOCAL_CANDIDATE_PASSED':'FAILED',startedAt:started,completedAt:new Date().toISOString(),sourceSha:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),sourceChanges:spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim(),baselineSha:baseline.source_sha,baselineDeployment:baseline.deployment_id,deploymentAuthorized:false,networkDeploymentPerformed:false,stages:rows,ordinaryGroups:staticTests&&{total:staticTests.total,passed:staticTests.passed,failed:staticTests.failed},preservation:read('../delivery/scale-package-tests.json'),scales:read('../delivery/scale-browser-tests.json'),navigation:read('test-results/navigation-current/results.json'),release:read('test-results/release-current.json'),piano:read('test-results/piano-browser-results.json'),audio:read('test-results/audio-signal-results.json'),sourceChangedDuringRun:initialSourceState!==sourceState(),manualSafari:false,manualVoiceOver:false,authenticatedAdminTest:false};
if(result.sourceChangedDuringRun||manifest?.source_sha!==result.sourceSha){
 result.status='FAILED';result.integrityError='Source changed during QA or candidate source SHA differs';
}
result.changedFiles=spawnSync('git',['diff','--name-only',baseline.source_sha,'HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim().split('\n');
fs.writeFileSync(path.join(delivery,'REPORT.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# MODUS – lokal bygg- og testkontroll', '', '**Status: '+result.status+'**', '',
 'Kilde: `'+result.sourceSha+'`. Produksjonsgrunnlag: `'+baseline.source_sha+'` / '+baseline.deployment_id+'.', '',
 '| Kontroll | Resultat | Logg |','|---|---|---|',...rows.map(r=>'| '+r.name+' | '+r.status+' | '+(r.log?'../'+r.log:r.reason)+' |'),'',
 'Ordinære grupper: '+(staticTests?staticTests.passed+'/'+staticTests.total:'ukjent')+'.',
 'Kildebygg og den eksisterende avgrensede produktbyggeren er kjørt. PL-AUTO-001 production:workflow kontrollerer deretter differansen mot låst faktisk produksjon og lager en ny, SHA-bundet offentlig kandidat.',
 'Ingen deploy, push eller merge. Ingen manuell Safari/VoiceOver eller autentisert administratorattest. C06 krever separat eier-GO og fersk produksjonsførkontroll.'];
fs.writeFileSync(path.join(delivery,'REPORT.md'),lines.join('\n'));
console.log(result.status+' — '+path.join(delivery,'REPORT.md'));
process.exitCode=result.status==='LOCAL_CANDIDATE_PASSED'?0:1;
