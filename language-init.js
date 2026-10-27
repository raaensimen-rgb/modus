(function(){
  'use strict';
  const key='modus-language-v1',url=new URL(location.href),english=url.pathname==='/en'||url.pathname.startsWith('/en/');
  const requested=url.searchParams.get('lang');
  let saved;try{saved=localStorage.getItem(key);}catch{}
  const language=requested==='en'?'en':requested==='nb'||requested==='no'?'nb':english?'en':saved==='en'?'en':'nb';
  try{localStorage.setItem(key,language);}catch{}
  document.documentElement.lang=language;
  if((language==='en')!==english){
    const path=english?url.pathname.replace(/^\/en(?=\/|$)/,'')||'/':'/en'+(url.pathname==='/'?'/':url.pathname);
    url.pathname=path;location.replace(url.href);
  }
  window.ModusLanguage={key,language};
})();
