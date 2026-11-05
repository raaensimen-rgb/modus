(function(){
  'use strict';
  const key='modus-theme-v1',values=['original','readable','contrast'];
  function valid(value){return values.includes(value)?value:'original';}
  function apply(value,persist=true){
    value=valid(value);document.documentElement.dataset.theme=value;
    if(persist)try{localStorage.setItem(key,value);}catch{}
    return value;
  }
  let saved='original';try{saved=localStorage.getItem(key);}catch{}
  apply(saved,false);
  window.ModusTheme={key,valid,apply};
})();
