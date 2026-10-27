import {createClient} from '@supabase/supabase-js';
import config from './supabase-config.json';
import {IDS, localProgress} from './progress-state.js';
const en=document.documentElement.lang==='en', t=(nb,english)=>en?english:nb;
let storage;try{storage=window.localStorage;}catch{}
const guest=localProgress(storage);
const client=createClient(config.url,config.publishableKey,{auth:{storageKey:'modus-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
const pendingMemory=new Map();
let user=null, local=guest, generation=0, cloudError=false, busy=false, loaded=false, currentId;
const notify=()=>{document.dispatchEvent(new CustomEvent('modus-account-change'));render();};
function pendingFor(id){if(pendingMemory.has(id))return pendingMemory.get(id);try{return JSON.parse(storage?.getItem('modus.pending.v1.'+id)||'[]').filter(v=>IDS.includes(v));}catch{return [];}}
function setPending(id,values){pendingMemory.set(id,values);try{storage?.setItem('modus.pending.v1.'+id,JSON.stringify(values));}catch{}}
async function flush(id, expectedGeneration){
 const pending=pendingFor(id);if(!pending.length)return;
 const {error}=await client.from('quiz_progress').upsert(pending.map(article_id=>({user_id:id,article_id})),{onConflict:'user_id,article_id',ignoreDuplicates:true});
 if(error)throw error;
 if(generation===expectedGeneration&&user?.id===id)setPending(id,pendingFor(id).filter(v=>!pending.includes(v)));
}
async function load(next,force=false){
 if(!force&&loaded&&currentId===(next?.id||null))return;
 const run=++generation;user=next||null;currentId=user?.id||null;loaded=true;
 local=user?localProgress(storage,user.id):guest;cloudError=false;notify();
 if(!user)return;
 const id=user.id;
 try{
  await flush(id,run);
  const {data,error}=await client.from('quiz_progress').select('article_id').eq('user_id',id);
  if(error)throw error;if(run!==generation)return;
  data.forEach(row=>local.pass(row.article_id));cloudError=false;
 }catch{if(run===generation)cloudError=true;}
 if(run===generation)notify();
}
let recovery=false;
client.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY')recovery=true;
 if(event!=='INITIAL_SESSION')setTimeout(()=>load(session?.user),0);
});
const ready=client.auth.getSession().then(({data,error})=>{if(error)throw error;return load(data.session?.user);}).catch(()=>{cloudError=true;loaded=true;notify();});
window.ModusAccount={
 ready,has:id=>local.has(id),get user(){return user;},get cloudError(){return cloudError;},
 async pass(id){
  if(!IDS.includes(id))return {saved:false};
  const persisted=local.pass(id);if(!user){notify();return {saved:persisted,where:'device'};}
  const who=user.id,run=generation;
  setPending(who,[...new Set([...pendingFor(who),id])]);
  try{await flush(who,run);if(run!==generation)return {saved:false,where:'changed'};cloudError=false;notify();return {saved:true,where:'account'};}
  catch{if(run===generation){cloudError=true;notify();}return {saved:persisted,where:'pending'};}
 }
};
window.addEventListener('online',()=>load(user,true));
window.addEventListener('storage',()=>{notify();});
const root=document.querySelector('[data-account-page]');
const message=root?.querySelector('#accountMessage');
let mode='signin';
function say(text){if(message){message.textContent=text;message.focus();}}
function render(){
 document.querySelectorAll('[data-account-link]').forEach(a=>a.textContent=user?t('Min side','My account'):t('Logg inn','Sign in'));
 document.querySelectorAll('.quiz-storage').forEach(e=>e.textContent=user?(cloudError?t('Kan ikke synkronisere akkurat nå. Fremdriften beholdes på denne enheten.','Cannot sync right now. Progress is kept on this device.'):t('Fullføringen lagres på MODUS-kontoen din.','Completion is saved to your MODUS account.')):t('Fullføring lagres i denne nettleseren. Logg inn for å følge fremdriften på flere enheter.','Completion is saved in this browser. Sign in to follow your progress across devices.'));
 const note=document.querySelector('.library-progress>span');if(note)note.textContent=user?(cloudError?t('Viser fremdrift fra denne enheten. Synkronisering er midlertidig utilgjengelig.','Showing progress from this device. Sync is temporarily unavailable.'):t('Din fremdrift, lagret på MODUS-kontoen.','Your progress, saved to your MODUS account.')):t('Haken lagres i nettleseren. Logg inn for personlig fremdrift på flere enheter.','The checkmark is saved in this browser. Sign in for personal progress across devices.');
 if(!root)return;
 root.querySelector('#accountLoading').hidden=loaded;
 root.querySelector('#accountGuest').hidden=!loaded||!!user;
 root.querySelector('#accountMember').hidden=!user;
 if(!user)return;
 root.querySelector('#accountEmail').textContent=user.email;
 root.querySelector('#accountSync').textContent=cloudError?t('Fremdriften kunne ikke synkroniseres. Prøv igjen når du er på nett.','Progress could not be synced. Try again when you are online.'):t('Fremdriften er synkronisert med kontoen din.','Your progress is synced with your account.');
 const count=local.list().length;root.querySelector('#accountCount').textContent=en?`${count} of ${IDS.length} quizzes completed`:`${count} av ${IDS.length} quizer fullført`;
 const progress=root.querySelector('progress');progress.value=count;progress.max=IDS.length;
 const list=root.querySelector('#accountArticles');list.replaceChildren();
 const titles=JSON.parse(document.querySelector('#articleTitles').textContent)[en?'en':'nb'];
 IDS.forEach(id=>{const li=document.createElement('li'),a=document.createElement('a'),status=document.createElement('span');a.href='artikler/'+id+'.html';a.textContent=titles[id];status.textContent=local.has(id)?t('✓ Fullført','✓ Completed'):t('Ikke fullført','Not completed');li.append(a,status);list.append(li);});
 const imports=guest.list().filter(id=>!local.has(id));root.querySelector('#accountImport').hidden=!imports.length;
 root.querySelector('#importCount').textContent=en?`${imports.length} quizzes are completed in this browser but are not on your account.`:`${imports.length} quizer er fullført i denne nettleseren, men ligger ikke på kontoen din.`;
 root.querySelector('#passwordUpdate').hidden=!recovery;
}
if(root){
 const form=root.querySelector('#accountForm'),email=form.querySelector('[name=email]'),password=form.querySelector('[name=password]');
 const submit=form.querySelector('[type=submit]');
 if (config.accountsEnabled === false) { form.querySelectorAll('input,button[type=submit]').forEach(e=>e.disabled=true); }

 function changeMode(next){mode=next;message.textContent='';password.required=mode!=='reset';password.closest('label').hidden=mode==='reset';password.autocomplete=mode==='signup'?'new-password':'current-password';password.minLength=mode==='signup'?10:1;submit.textContent=mode==='signup'?t('Opprett konto','Create account'):mode==='reset'?t('Send lenke','Send reset link'):t('Logg inn','Sign in');root.querySelectorAll('[data-auth-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.authMode===mode)));}
 root.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>changeMode(b.dataset.authMode)));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(config.accountsEnabled === false)return;if(busy)return;busy=true;submit.disabled=true;say(t('Et øyeblikk …','One moment …'));
  try{
   const redirectTo=new URL((en?'/en':'')+'/konto.html',location.origin).href;
   if(mode==='signin'){
    const {data,error}=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error)throw error;password.value='';await load(data.user,true);say(t('Du er logget inn.','You are signed in.'));
   }else if(mode==='signup'){
    const {data,error}=await client.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:redirectTo}});if(error)throw error;password.value='';
    if(data.session)await load(data.user,true);
    say(t('Sjekk e-posten din for å bekrefte kontoen. Kontroller også søppelpost.','Check your email to confirm your account. Check your spam folder too.'));
   }else{
    const {error}=await client.auth.resetPasswordForEmail(email.value.trim(),{redirectTo});if(error)throw error;say(t('Hvis adressen har en konto, blir en lenke sendt på e-post.','If the address has an account, a reset link will be sent by email.'));
   }
  }catch(error){
   const code=error.code||'';
   say(code==='invalid_credentials'?t('E-post eller passord stemmer ikke.','The email or password is incorrect.'):code==='email_not_confirmed'?t('Bekreft e-postadressen før du logger inn.','Confirm your email address before signing in.'):code==='weak_password'?t('Velg et sterkere passord med minst 10 tegn.','Choose a stronger password with at least 10 characters.'):code.includes('rate_limit')?t('For mange forsøk. Vent litt før du prøver igjen.','Too many attempts. Please wait before trying again.'):t('Handlingen kunne ikke fullføres. Prøv igjen senere.','This could not be completed. Please try again later.'));
  }finally{busy=false;submit.disabled=false;}
 });
 root.querySelector('#signOut').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){say(t('Kunne ikke logge ut. Prøv igjen.','Could not sign out. Try again.'));return;}await load(null,true);say(t('Du er logget ut.','You are signed out.'));});
 root.querySelector('#syncAgain').addEventListener('click',()=>load(user,true));
 root.querySelector('#importProgress').addEventListener('click',async()=>{if(!user||busy)return;busy=true;const id=user.id;const imports=guest.list().filter(q=>!local.has(q));for(const q of imports){if(user?.id!==id)break;await window.ModusAccount.pass(q);}busy=false;say(cloudError?t('Importen er beholdt på enheten og venter på synkronisering.','The import is kept on this device and is waiting to sync.'):t('Fremdriften er lagt til kontoen din.','Progress has been added to your account.'));});
 root.querySelector('#newPasswordForm').addEventListener('submit',async event=>{event.preventDefault();const f=event.currentTarget;const value=f.querySelector('input').value;const {error}=await client.auth.updateUser({password:value});if(error){say(t('Passordet kunne ikke oppdateres. Be om en ny lenke og prøv igjen.','The password could not be updated. Request a new link and try again.'));return;}f.reset();recovery=false;render();say(t('Passordet er oppdatert.','Your password has been updated.'));});
 root.querySelector('#accountRetry').addEventListener('click',()=>location.reload());
}
ready.then(render);
