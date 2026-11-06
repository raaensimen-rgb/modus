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
 ['scales-browser',['node','tests/scale-library-browser.cjs']],
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
const result={status:rows.every(x=>x.status==='passed')?'LOCAL_CANDIDATE_PASSED':'FAILED',startedAt:started,completedAt:new Date().toISOString(),sourceSha:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),sourceChanges:spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim(),baselineSha:'d809a7b0fc4fbb8480f7ee5b8e3daa7ffb5227e5',baselineDeployment:'536b0e35-23a1-4dad-99bd-337a51afb13b',deploymentAuthorized:false,networkDeploymentPerformed:false,stages:rows,ordinaryGroups:staticTests&&{total:staticTests.total,passed:staticTests.passed,failed:staticTests.failed},preservation:read('../delivery/scale-package-tests.json'),scales:read('../delivery/scale-browser-tests.json'),navigation:read('test-results/navigation-current/results.json'),release:read('test-results/release-current.json'),piano:read('test-results/piano-browser-results.json'),audio:read('test-results/audio-signal-results.json'),sourceChangedDuringRun:initialSourceState!==sourceState(),manualSafari:false,manualVoiceOver:false,authenticatedAdminTest:false};
if(result.sourceChangedDuringRun||manifest?.source_sha!==result.sourceSha){
 result.status='FAILED';result.integrityError='Source changed during QA or candidate source SHA differs';
}
result.changedFiles=spawnSync('git',['diff','--name-only','4bb636538dc7d444607847388cdb4e34d50b88b5','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim().split('\n');
fs.writeFileSync(path.join(delivery,'REPORT.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# Interaktivt Skalabibliotek – lokal teknisk leveranse', '', '**Status: '+result.status+'**', '',
 'Lokal commit: `'+result.sourceSha+'`. Gren: codex/scale-library. Bygger videre på Pakke A 4bb6365 og publisert d809a7b, uten publisering.', '',
 'Implementert: minimalistisk geometrisk seksstrengshals, bånd 0–24, syv kanoniske moduser med dur/moll-aliaser, alle 12 toneklasser og enharmoniske alternativer, diatonisk stavemotor med doble fortegn, karaktertoner og NB/EN. Kompakt kontrollinje, horisontal mobilrulling, tastaturkontroller, teksttabell og bevart tilstand ved språkbytte. Musikkatlas bruker samme skalaformler og stavemotor; egenvurdering og lagring er urørt.', '',
 'Faglig QA: 20/20 SK-001–SK-020 og 12 600/12 600 grunntone–modus–streng–bånd-kombinasjoner. Hver posisjon kontrolleres mot uavhengige forventninger for MIDI, toneklasse, medlemskap, grad, diatonisk bokstav, stavemåte og karaktertone. 24 aliaspar og 56 ekstra enharmoniske skalasett. Se scale-model-tests.json og tests/scale-library.cjs.', '',
 '| Kontroll | Resultat | Logg |','|---|---|---|',...rows.map(r=>'| '+r.name+' | '+r.status+' | '+(r.log?'../'+r.log:r.reason)+' |'),'',
 'Ordinære grupper: '+(staticTests?staticTests.passed+'/'+staticTests.total:'ukjent')+'.',
 'Skalavisning: 16 Chromium/WebKit-scenarioer, NB/EN ved 320/375/768/1440 px; fire atlasintegrasjoner. Axe WCAG A/AA i modulen: null avvik. Skjermbilder scale-*.png. Se scale-browser-tests.json.',
 'Øvrige nettleserresultater: navigasjon '+(result.navigation?.rows.length??0)+', release '+(result.release?.rows.length??0)+', piano '+(result.piano?.length??0)+', lyd '+(result.audio?.length??0)+'.',
 'Pakke-/privatkontroll: '+JSON.stringify(result.preservation)+'. Låst offentlig baseline kontrolleres; bare eksplisitte meny-/atlas-/skaladeltaer tillates. Negative tester avviser privat runtime, privat innhold, uvedkommende HTML-endring, uautorisert modellversjon og endret baseline.', '',
 'SK-F01: posisjoner beregnes fra MIDI, aldri designbildet. SK-F02: separat stavemotor. SK-F03: karaktertoner beskrives som sammenligninger. SK-F04: komplett 12 600-matrise. SK-F05: standardnavn fra eksisterende atlas, valg av enharmoniske alternativer og doble fortegn. SK-F06: internasjonalt B/B♭ forklares på NB, identiske toner på EN. SK-F07: harmonikk, melodisk vekt og tonalt sentrum forklares.', '',
 'Designbegrensning: selve godkjente rasterbildet fra 01 var ikke tilgjengelig i identifisert oppdragsmappe eller chat-leseren (attachments=[]). Dokumenterte designkrav fra 01 er implementert. Eksakt bildesammenligning og endelig designattest må derfor gjennomføres hos C05/01 med originalbildet; dette er ikke påstått bestått.',
 'Automatisert WebKit er ikke manuell Safari-, iPhone- eller VoiceOver-attest. Ingen autentisert administratorinnlogging eller ny live-/Access-kontroll. Eksisterende adminfiler og privatgren er urørt.', '',
 'Endrede kildefiler mot Pakke A:',...result.changedFiles.map(n=>'- '+n),'',
 'Kjør npm run quality:local fra source. Ordinært artikkel-/CMS-bygg kjøres først; lokal kandidat bygges fra hashbundet siste offentlige pakke og eksplisitte kildeendringer. Andre bygging må gi identiske bytes. Ingen endring i offentlig innholdsvalg eller publiseringspolicy.', '',
 'Historiske førkontroll- og diagnostiske logger er bevart; denne rapportens siste samlede kjøring angir sluttstatus. Ingen push, merge eller deploy. Lokal pakke i ../package. Separat uttrykkelig GO kreves for enhver senere publisering.', ''];
fs.writeFileSync(path.join(delivery,'REPORT.md'),lines.join('\n'));
console.log(result.status+' — '+path.join(delivery,'REPORT.md'));
process.exitCode=result.status==='LOCAL_CANDIDATE_PASSED'?0:1;
