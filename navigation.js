(function(){
 'use strict';
 const groups=[...document.querySelectorAll('.nav-group')],theme=document.querySelector('.theme-picker'),header=document.querySelector('.site-header');
 const hoverOpened=new WeakSet();
 function reserveSpace(){
  if(!header)return;
  header.style.setProperty('--nav-panel-space','0px');
  const opened=groups.find(group=>!group.querySelector('.nav-panel').hidden);
  if(opened){const bottom=opened.querySelector('.nav-panel').getBoundingClientRect().bottom;header.style.setProperty('--nav-panel-space',Math.max(0,bottom-header.getBoundingClientRect().bottom+12)+'px');}
 }
 function setOpen(group,open){
  group.classList.toggle('is-open',open);
  group.querySelector('.nav-trigger').setAttribute('aria-expanded',String(open));
  group.querySelector('.nav-panel').hidden=!open;
  if(!open)hoverOpened.delete(group);
  reserveSpace();
 }
 function close(except){groups.forEach(group=>{if(group!==except)setOpen(group,false);});}
 groups.forEach(group=>{
  const trigger=group.querySelector('.nav-trigger');
  function open(fromHover=false){close(group);setOpen(group,true);if(fromHover)hoverOpened.add(group);else hoverOpened.delete(group);if(theme)theme.open=false;}
  // Desktop pointer hover previews the menu; tap/click and keyboard remain supported.
  const canHover=()=>!window.matchMedia||window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  group.addEventListener('mouseenter',()=>{if(canHover()&&trigger.getAttribute('aria-expanded')!=='true')open(true);});
  group.addEventListener('mouseleave',()=>{if(canHover())setOpen(group,false);});
  trigger.addEventListener('click',(event={detail:0})=>{
   // The first real pointer click confirms the hover preview; keyboard clicks still toggle.
   if(event.detail>0&&hoverOpened.has(group)){hoverOpened.delete(group);return;}
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
 if(theme)theme.addEventListener('toggle',()=>{if(theme.open)close();});
})();
