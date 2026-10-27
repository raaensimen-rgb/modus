(function(){
  'use strict';
  const picker=document.querySelector('.theme-picker'),theme=window.ModusTheme;
  if(!picker||!theme)return;
  const summary=picker.querySelector('summary'),radios=[...picker.querySelectorAll('input[name="modus-theme"]')];
  const names={original:'Original',readable:'Easy reading',contrast:'High contrast'};
  function sync(value){radios.forEach(input=>input.checked=input.value===value);picker.querySelector('[data-theme-name]').textContent=names[value];}
  sync(theme.valid(document.documentElement.dataset.theme));
  radios.forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked)return;
    const value=theme.apply(input.value);sync(value);
    document.getElementById('theme-status').textContent=names[value]+' display selected.';
    picker.open=false;summary.focus();
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&picker.open){picker.open=false;summary.focus();}});
  document.addEventListener('click',event=>{if(picker.open&&!picker.contains(event.target))picker.open=false;});
  window.addEventListener('storage',event=>{if(event.key===theme.key)sync(theme.apply(event.newValue,false));});
})();
