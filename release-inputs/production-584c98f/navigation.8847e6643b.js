(function(){
 'use strict';
 const groups=[...document.querySelectorAll('.nav-group')],theme=document.querySelector('.theme-picker'),header=document.querySelector('.site-header'),hoverOpened=new WeakSet();
 function reserveSpace(){
  if(!header)return;
  header.style.setProperty('--nav-panel-space','0px');
  const opened=groups.find(group=>!group.querySelector('.nav-panel').hidden);
  if(opened){const bottom=opened.querySelector('.nav-panel').getBoundingClientRect().bottom;header.style.setProperty('--nav-panel-space',Math.max(0,bottom-header.getBoundingClientRect().bottom+12)+'px');}
 }
 function setOpen(group,open){
  if(!open)hoverOpened.delete(group);
  group.classList.toggle('is-open',open);
  group.querySelector('.nav-trigger').setAttribute('aria-expanded',String(open));
  group.querySelector('.nav-panel').hidden=!open;
  reserveSpace();
 }
 function close(except){groups.forEach(group=>{if(group!==except)setOpen(group,false);});}
 groups.forEach(group=>{
  const trigger=group.querySelector('.nav-trigger');
  function open(){hoverOpened.delete(group);close(group);setOpen(group,true);if(theme)theme.open=false;}
  // Desktop pointer hover previews the menu; tap/click and keyboard remain supported.
  const canHover=()=>!window.matchMedia||window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)').matches;
  group.addEventListener('mouseenter',()=>{if(canHover()&&trigger.getAttribute('aria-expanded')!=='true'){open();hoverOpened.add(group);}});
  group.addEventListener('mouseleave',()=>{if(canHover())setOpen(group,false);});
  trigger.addEventListener('click',event=>{
   // The pointer's first click confirms its hover preview; keyboard activation still toggles.
   if(event?.detail!==0&&hoverOpened.has(group)){hoverOpened.delete(group);return;}
   if(trigger.getAttribute('aria-expanded')==='true')setOpen(group,false);else open();
  });
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
 window.addEventListener('resize',reserveSpace);
 if(document.fonts)document.fonts.ready.then(reserveSpace);
 if(theme){
  const tools=theme.closest('.header-tools'),previousZ=tools?.style.getPropertyValue('z-index'),previousPriority=tools?.style.getPropertyPriority('z-index');
  theme.addEventListener('toggle',()=>{
   if(theme.open)close();
   // The compact toolbar isolates its children. Lift it only while its popup is open.
   if(tools){
    if(theme.open)tools.style.setProperty('z-index','230');
    else if(previousZ)tools.style.setProperty('z-index',previousZ,previousPriority);
    else tools.style.removeProperty('z-index');
   }
  });
 }
})();
