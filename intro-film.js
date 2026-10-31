/* FILM-024 — accessible, user-initiated MODUS introduction video */
(()=>{'use strict';
const trigger=document.querySelector('[data-intro-film-open]');if(!trigger)return;

// Keep the film button aligned with the primary action, including after fonts load.
const primary=document.querySelector('.hero-actions .button');
if(primary){
  const matchWidth=()=>{trigger.style.width=primary.getBoundingClientRect().width+'px';trigger.style.maxWidth='100%';trigger.style.paddingInline='10px';trigger.style.gap='8px';};
  matchWidth();
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(matchWidth).observe(primary);
  else window.addEventListener('resize',matchWidth);
  if(document.fonts)document.fonts.ready.then(matchWidth);
}
const english=document.documentElement.lang.toLowerCase().startsWith('en');
const copy=english?{open:'Watch the introduction',title:'Discover MODUS',close:'Close video',error:'The video is not available yet. Please try again later.',note:'The video plays only when you choose to watch it.'}:{open:'Se introduksjonsfilmen',title:'Oppdag MODUS',close:'Lukk filmen',error:'Filmen er ikke tilgjengelig ennå. Prøv igjen senere.',note:'Filmen spilles bare når du selv velger å se den.'};
trigger.querySelector('[data-intro-film-label]').textContent=copy.open;
const dialog=document.createElement('dialog');dialog.className='intro-film-dialog';dialog.setAttribute('aria-label',copy.title);
dialog.innerHTML='<div class="intro-film-shell"><div class="intro-film-heading"><h2 id="intro-film-title"></h2><button type="button" class="intro-film-close" aria-label=""></button></div><video class="intro-film-player" controls playsinline preload="none" aria-labelledby="intro-film-title"><source src="/media/modus-introduksjon.mp4" type="video/mp4"></video><p class="intro-film-note" role="status"></p></div>';
document.body.appendChild(dialog);
const title=dialog.querySelector('h2'),close=dialog.querySelector('button'),video=dialog.querySelector('video'),note=dialog.querySelector('.intro-film-note');
title.textContent=copy.title;close.setAttribute('aria-label',copy.close);close.textContent='✕';note.textContent=copy.note;
function hide(){video.pause();video.currentTime=0;if(dialog.open)dialog.close();}
trigger.addEventListener('click',()=>{note.textContent=copy.note;dialog.showModal();close.focus();const attempt=video.play();if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{});});
close.addEventListener('click',hide);
dialog.addEventListener('cancel',e=>{e.preventDefault();hide();});
dialog.addEventListener('click',e=>{if(e.target===dialog)hide();});
dialog.addEventListener('close',()=>{video.pause();trigger.focus();});
video.addEventListener('error',()=>{note.textContent=copy.error;});
})();