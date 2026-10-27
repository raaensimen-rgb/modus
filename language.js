(function(){
 'use strict';
 const english=document.documentElement.lang==='en';
 document.querySelectorAll('[data-language]').forEach(link=>{
  function refresh(){
   const language=link.dataset.language,url=new URL(location.href),base=url.pathname.replace(/^\/en(?=\/|$)/,'')||'/';
   const query=window.ModusLanguage&&window.ModusLanguage.query;
   if(query)for(const [key,value] of Object.entries(query())){if(value===null)url.searchParams.delete(key);else url.searchParams.set(key,String(value));}
   url.pathname=language==='en'?'/en'+base:base;
   url.searchParams.set('lang',language);link.href=url.pathname+url.search+url.hash;
  }
  refresh();
  if((link.dataset.language==='en')===english)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
  for(const event of ['focus','mouseenter','click'])link.addEventListener(event,refresh);
  link.addEventListener('click',()=>{try{localStorage.setItem('modus-language-v1',link.dataset.language);}catch{}});
 });
})();
