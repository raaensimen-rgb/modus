(function(){
  'use strict';
  const picker=document.querySelector('.theme-picker'),theme=window.ModusTheme;
  if(!picker||!theme)return;
  const english=document.documentElement.lang.toLowerCase().startsWith('en');
  const original=picker.querySelector('input[value="original"]')?.closest('label');
  if(original){
    const option=original.cloneNode(true),input=option.querySelector('input');
    input.value='blue';input.defaultChecked=false;input.checked=false;
    option.querySelector('strong').textContent='MODUS Blue';
    option.querySelector('small').textContent=english?'Dark blue page background with the original text colors.':'Mørkeblå sidebakgrunn med originale tekstfarger.';
    original.after(option);
  }
  const summary=picker.querySelector('summary'),radios=[...picker.querySelectorAll('input[name="modus-theme"]')];
  const names={original:'Original',blue:'MODUS Blue',readable:english?'Easy reading':'Lesevennlig',contrast:english?'High contrast':'Høy kontrast'};
  function sync(value){radios.forEach(input=>input.checked=input.value===value);picker.querySelector('[data-theme-name]').textContent=names[value];}
  sync(theme.valid(document.documentElement.dataset.theme));
  radios.forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked)return;
    const value=theme.apply(input.value);sync(value);
    document.getElementById('theme-status').textContent=names[value]+(english?' display selected.':' visning er valgt.');
    picker.open=false;summary.focus();
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&picker.open){picker.open=false;summary.focus();}});
  document.addEventListener('click',event=>{if(picker.open&&!picker.contains(event.target))picker.open=false;});
  window.addEventListener('storage',event=>{if(event.key===theme.key)sync(theme.apply(event.newValue,false));});
})();
