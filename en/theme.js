(function(){
  'use strict';
  const picker=document.querySelector('.theme-picker'),theme=window.ModusTheme;
  if(!picker||!theme)return;
  const english=document.documentElement.lang.toLowerCase().startsWith('en');
  const toggle=document.createElement('button');
  const paletteLabel=english?'Theme: MODUS Blue':'Tema: MODUS Blue';
  toggle.type='button';
  toggle.className='site-theme-toggle';
  toggle.textContent=english?'Theme':'Tema';
  toggle.setAttribute('aria-label',paletteLabel);
  toggle.title=paletteLabel;
  const teachingArt=[...document.querySelectorAll('img[src]:not([srcset])')].flatMap(image=>{
    const original=image.getAttribute('src'),url=new URL(original,document.baseURI);
    if(url.origin!==location.origin || !/\/images\/(articles|teaching-diagrams)\/[^/]+\.svg$/.test(url.pathname))return [];
    url.pathname=url.pathname.replace(/\/images\/(articles|teaching-diagrams)\//,'/images/modus-blue/$1/');
    return [{image,original,blue:url.href}];
  });
  function syncArt(){
    const {sitePalette,theme:display}=document.documentElement.dataset;
    for(const {image,original,blue} of teachingArt){
      const next=sitePalette==='blue'&&display==='original'?blue:original;
      if(image.getAttribute('src')!==next)image.setAttribute('src',next);
    }
  }
  function syncPalette(value){
    toggle.setAttribute('aria-pressed',String(value==='blue'));
    syncArt();
  }
  syncPalette(document.documentElement.dataset.sitePalette);
  toggle.addEventListener('click',()=>{
    const blue=document.documentElement.dataset.sitePalette==='blue';
    syncPalette(theme.applyPalette(blue?'original':'blue'));
  });
  picker.after(toggle);
  if(picker.parentElement.classList.contains('header-tools')){
    picker.parentElement.classList.add('header-tools--site-theme');
  }
  const summary=picker.querySelector('summary'),radios=[...picker.querySelectorAll('input[name="modus-theme"]')];
  const names={original:'Original',readable:english?'Easy reading':'Lesevennlig',contrast:english?'High contrast':'Høy kontrast'};
  function sync(value){radios.forEach(input=>input.checked=input.value===value);picker.querySelector('[data-theme-name]').textContent=names[value];syncArt();}
  sync(theme.valid(document.documentElement.dataset.theme));
  radios.forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked)return;
    const value=theme.apply(input.value);sync(value);
    document.getElementById('theme-status').textContent=names[value]+(english?' display selected.':' visning er valgt.');
    picker.open=false;summary.focus();
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&picker.open){picker.open=false;summary.focus();}});
  document.addEventListener('click',event=>{if(picker.open&&!picker.contains(event.target))picker.open=false;});
  window.addEventListener('storage',event=>{
    if(event.key===theme.key)sync(theme.apply(event.newValue,false));
    if(event.key===theme.paletteKey)syncPalette(theme.applyPalette(event.newValue,false));
  });
})();
