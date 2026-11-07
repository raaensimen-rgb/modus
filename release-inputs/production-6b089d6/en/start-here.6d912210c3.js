/* UX-001: read the existing quiz/evidence state; never write or migrate storage. */
(()=>{
'use strict';
const template=document.getElementById('start-reading-route'),root=document.querySelector('[data-start-resume]');
if(!template||!root)return;
let route;try{route=JSON.parse(template.content.textContent);}catch{return;}
if(!Array.isArray(route)||!route.length||route.some(x=>!x||!/^[a-z0-9-]+$/.test(x.id)||x.href!==`artikler/${x.id}.html`||typeof x.title!=='string'))return;
const en=document.documentElement.lang==='en';
async function update(){
 const account=window.ModusAccount;if(account)try{await account.ready;}catch{}
 let storage;try{storage=window.localStorage;}catch{}
 const done=id=>{try{return account?account.has(id):storage?.getItem('modus.article-quiz.v1.'+id)==='passed';}catch{return false;}};
 let opened={};try{const x=JSON.parse(storage?.getItem('modus.atlas.article-evidence.v1')||'{}');if(x&&typeof x==='object'&&!Array.isArray(x))opened=x;}catch{}
 const begun=route.some(x=>done(x.id)||opened[x.id]?.opened===true);
 root.hidden=!begun;if(!begun)return;
 const next=route.find(x=>!done(x.id)),item=next||route[0];
 root.querySelector('[data-start-resume-link]').setAttribute('href',item.href);
 root.querySelector('[data-start-resume-title]').textContent=item.title;
 root.querySelector('[data-start-resume-note]').textContent=next?(en?'First article without a completed quiz. Progress is stored in this browser; this is not your exact reading position.':'Første artikkel uten fullført quiz. Progresjonen ligger i denne nettleseren; dette er ikke nøyaktig leseposisjon.'):(en?'All quizzes in this language are complete. Revisit the building blocks whenever you like.':'Alle quizene på dette språket er fullført. Repeter byggesteinene når du vil.');
 root.querySelector('.start-resume-label').textContent=next?(en?'Continue where you left off':'Fortsett der du slapp'):(en?'Review from the start':'Repeter fra starten');
}
document.addEventListener('modus-account-change',update);window.addEventListener('storage',update);window.addEventListener('pageshow',update);update();
})();
