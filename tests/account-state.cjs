const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
let source=fs.readFileSync('client/progress-state.js','utf8').replaceAll('export ','');
const scope={};vm.runInNewContext(source+';this.localProgress=localProgress;this.ids=IDS;',scope);
const entries=new Map(),storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
const guest=scope.localProgress(storage),alice=scope.localProgress(storage,'alice'),bob=scope.localProgress(storage,'bob');
assert(guest.pass(scope.ids[0]));assert(!alice.has(scope.ids[0]));assert(!bob.has(scope.ids[0]));
alice.pass(scope.ids[1]);assert(!guest.has(scope.ids[1]));assert(!bob.has(scope.ids[1]));
assert(scope.localProgress(storage,'alice').has(scope.ids[1]));
assert(!alice.pass('unknown'));assert.equal(alice.list().length,1);
const blocked=scope.localProgress(null,'alice');assert.equal(blocked.pass(scope.ids[0]),false);assert(blocked.has(scope.ids[0]));
// Exercise the account coordinator with two identities and a delayed network request.
const original=fs.readFileSync('client/account.js','utf8');
const core=original.slice(0,original.indexOf("const root=document.querySelector"))
 .replace(/^import .*;$/gm,'')
 .replace(/const notify=.*?;\nfunction pendingFor/s,"const notify=()=>{};\nfunction pendingFor");
let onAuth,session={user:{id:'alice',email:'alice@example.invalid'}},failWrites=false;
const rows={alice:[{article_id:scope.ids[1]}],bob:[]};let writes=0;
const client={auth:{onAuthStateChange:f=>onAuth=f,getSession:async()=>({data:{session}})},from:()=>({
 upsert:async data=>{writes++;if(failWrites)return {error:Error('offline')};for(const r of data)rows[r.user_id].push({article_id:r.article_id});return {error:null};},
 select:()=>({eq:async(_,id)=>({data:rows[id],error:null})})
})};
const events={},window={localStorage:storage,addEventListener:(name,fn)=>events[name]=fn};
const context={window,document:{documentElement:{lang:'nb'}},createClient:()=>client,config:{},localProgress:scope.localProgress,IDS:scope.ids,CustomEvent:function(){},setTimeout,console};
vm.runInNewContext(core,context);
(async()=>{
 const account=window.ModusAccount;await account.ready;
 assert(account.has(scope.ids[1]));assert(!account.has(scope.ids[0]));
 assert.equal((await account.pass(scope.ids[2])).where,'account');assert(writes>0);
 failWrites=true;assert.equal((await account.pass(scope.ids[3])).where,'pending');assert(account.cloudError);
 session={user:{id:'bob',email:'bob@example.invalid'}};onAuth('SIGNED_IN',session);await new Promise(r=>setTimeout(r,10));
 assert(!account.has(scope.ids[1]));assert(!account.has(scope.ids[3]));
 onAuth('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,10));
 assert(account.has(scope.ids[0]));assert(!account.has(scope.ids[1]));
 failWrites=false;session={user:{id:'alice',email:'alice@example.invalid'}};onAuth('SIGNED_IN',session);await new Promise(r=>setTimeout(r,10));
 assert(account.has(scope.ids[3]));assert(!account.cloudError);
 console.log('Passed: guest/user isolation, account switching, persisted per-user cache, cloud writes, offline retry and sign-out.');
})().catch(e=>{console.error(e);process.exitCode=1;});
