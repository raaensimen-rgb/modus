'use strict';
// Reproducible local-only C05 entry point. Does not deploy, authenticate or contact other chats.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../evidence/quality-ux001');fs.mkdirSync(out,{recursive:true});const rows=[];
const stages=[['build',['npm','run','build']],['static',['npm','test']],['reproducibility',['python3','tests/candidate-reproducibility.py']],['flow',['node','tests/start-here-browser.cjs']],['accessibility',['node','tests/start-here-accessibility.cjs']],['release',['node','tests/release-browser.cjs']]];
for(const [stage,args]of stages){const fd=fs.openSync(path.join(out,stage+'.log'),'w'),result=spawnSync(args[0],args.slice(1),{cwd:root,stdio:['ignore',fd,fd]});fs.closeSync(fd);rows.push({stage,exitCode:result.status,status:result.status===0?'passed':'failed'});console.log(stage+': '+rows.at(-1).status);if(result.status!==0)break;}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));process.exitCode=rows.length===stages.length&&rows.every(x=>x.status==='passed')?0:1;
