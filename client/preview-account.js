// No config/SDK/auth imports. Existing learning surfaces retain the local guest API.
import {localProgress} from './progress-state.js';
let storage;try{storage=window.localStorage;}catch{}
const guest=localProgress(storage);
const notify=()=>document.dispatchEvent(new CustomEvent('modus-account-change'));
window.ModusAccount=Object.freeze({
 ready:Promise.resolve(),user:null,cloudError:false,isolated:true,
 has:id=>guest.has(id),
 async pass(id){const saved=guest.pass(id);notify();return {saved,where:'device'};}
});
const en=document.documentElement.lang==='en';
document.querySelectorAll('.quiz-storage,.library-progress>span').forEach(e=>e.textContent=en?'Progress is stored only in this browser. Sign-in is unavailable in the test version.':'Fremdrift lagres bare i denne nettleseren. Innlogging er utilgjengelig i testversjonen.');
window.addEventListener('storage',notify);
