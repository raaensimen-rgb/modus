(function(){
  'use strict';
  const key='modus-theme-v1',paletteKey='modus-palette-v1';
  const values=['original','readable','contrast'],root=document.documentElement;
  function valid(value){return values.includes(value)?value:'original';}
  function store(name,value){try{localStorage.setItem(name,value);}catch{}}
  function apply(value,persist=true){
    value=valid(value);root.dataset.theme=value;
    if(persist)store(key,value);
    return value;
  }
  function applyPalette(value,persist=true){
    value=value==='blue'?'blue':'original';root.dataset.sitePalette=value;
    if(persist)store(paletteKey,value);
    return value;
  }
  let saved,palette;
  try{saved=localStorage.getItem(key);palette=localStorage.getItem(paletteKey);}catch{}
  apply(saved,false);
  applyPalette(palette??(saved==='blue'?'blue':'original'),false);
  window.ModusTheme={key,paletteKey,valid,apply,applyPalette};
})();
