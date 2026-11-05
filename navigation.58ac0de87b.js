(function(){
 'use strict';
 const groups=[...document.querySelectorAll('.nav-group')],theme=document.querySelector('.theme-picker');
 function setOpen(group,open){
  group.classList.toggle('is-open',open);
  group.querySelector('.nav-trigger').setAttribute('aria-expanded',String(open));
  group.querySelector('.nav-panel').hidden=!open;
 }
 function close(except){groups.forEach(group=>{if(group!==except)setOpen(group,false);});}
 groups.forEach(group=>{
  const trigger=group.querySelector('.nav-trigger');
  function open(){close(group);setOpen(group,true);if(theme)theme.open=false;}
  trigger.addEventListener('click',()=>{if(trigger.getAttribute('aria-expanded')==='true')setOpen(group,false);else open();});
  trigger.addEventListener('keydown',event=>{
   if(event.key==='ArrowDown'){event.preventDefault();open();group.querySelector('.nav-panel a').focus();}
  });
 });
 // Links retain native navigation. Do not hide them on blur, pointerdown or click.
 document.addEventListener('focusin',event=>{if(!groups.some(group=>group.contains(event.target)))close();});
 document.addEventListener('click',event=>{if(!groups.some(group=>group.contains(event.target)))close();});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const opened=groups.find(group=>group.querySelector('.nav-trigger').getAttribute('aria-expanded')==='true');
  if(opened){event.preventDefault();close();opened.querySelector('.nav-trigger').focus();}
 });
 if(theme)theme.addEventListener('toggle',()=>{if(theme.open)close();});
})();
