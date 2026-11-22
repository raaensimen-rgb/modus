/* One existing card collection: layout never copies content or changes saved progress. */
(() => {
 const library=document.getElementById('library');
 if(!library)return;
 const controls=library.querySelector('[data-card-layout-control]');
 if(!controls)return;
 const buttons=[...controls.querySelectorAll('[data-card-layout-choice]')];
 function apply(layout){
  if(!['grid','list'].includes(layout))return;
  library.dataset.cardLayout=layout;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cardLayoutChoice===layout)));
 }
 controls.addEventListener('click',event=>{const button=event.target.closest('[data-card-layout-choice]');if(button&&controls.contains(button))apply(button.dataset.cardLayoutChoice);});
 apply('grid');controls.hidden=false;
})();
