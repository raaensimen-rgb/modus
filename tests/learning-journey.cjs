'use strict';
const assert=require('node:assert/strict'),M=require('../learning-journey-model.js');
let s=M.empty();assert.equal(M.next(s),'understand');
for(const step of M.STEPS)s=M.change(s,step,true);
assert.equal(s.checked.length,5);assert.equal(M.next(s),'understand');s=M.change(s,'hear',false);assert.equal(M.next(s),'hear');
assert.deepEqual(M.parse(JSON.stringify(s)).state,s);
for(const raw of ['{bad','null','[]',JSON.stringify({...s,version:99}),JSON.stringify({...s,module:'F04'}),JSON.stringify({...s,checked:['bogus']})]){assert.equal(M.parse(raw).issue,'invalid');assert.deepEqual(M.parse(raw).state,M.empty());}
const old={version:0,module:'F03',completed:['hear','hear'],lastVisited:'play'};const migrated=M.parse(JSON.stringify(old));assert.equal(migrated.issue,'migrated');assert.deepEqual(migrated.state.checked,['hear']);assert.equal(migrated.state.version,1);
assert.throws(()=>M.change(s,'__proto__',true));assert.equal(M.parse('').issue,null);
console.log('Journey model: 0–5, undo, next step, invalid/schema/module isolation and migration passed.');
