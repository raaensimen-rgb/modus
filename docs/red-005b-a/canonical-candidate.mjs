// INACTIVE independent candidate encoder for synthetic vectors; no server/UI imports.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
function canonical(v){
 if(v===null||typeof v==='boolean')return JSON.stringify(v);
 if(typeof v==='number'){if(!Number.isSafeInteger(v)||Object.is(v,-0))throw Error('number');return JSON.stringify(v);}
 if(typeof v==='string'){
  if(v.includes('\0'))throw Error('NUL');
  for(let i=0;i<v.length;i++){const n=v.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){const next=v.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))throw Error('surrogate');}else if(n>=0xdc00&&n<=0xdfff)throw Error('surrogate');}
  return JSON.stringify(v);
 }
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(typeof v==='object')return '{'+Object.keys(v).sort().map(k=>{if(!/^[\x01-\x7f]*$/.test(k))throw Error('key');return canonical(k)+':'+canonical(v[k]);}).join(',')+'}';
 throw Error('unsupported');
}
const vectors=JSON.parse(readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(vectors.map(value=>{const bytes=canonical(value);return {bytes,sha256:createHash('sha256').update(bytes,'utf8').digest('hex')};})));
