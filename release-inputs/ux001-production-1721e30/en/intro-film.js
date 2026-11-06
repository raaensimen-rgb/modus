/* Owner-approved MODUS introduction, 2026-11-05. User-initiated playback only. */
(()=>{'use strict';
const triggers=[...document.querySelectorAll('[data-intro-film-open]')];if(!triggers.length)return;
const en=document.documentElement.lang.toLowerCase().startsWith('en');
const copy=en?{title:'Discover MODUS',close:'Close video',note:'82 seconds · Norwegian on-screen text · Original music · No narration',loading:'Loading the film…',error:'The film could not play. Use the download link to open it separately.',download:'Download the film (MP4, 12.6 MB)',transcript:'Read the text alternative (English translation)',text:['MODUS. UNDERSTAND · DEVELOP · CREATE. A place where music theory comes alive. Music, curiosity and the joy of creating.','52 articles. From notes and intervals to chords and harmony. Read. Listen. Try it yourself.','See the whole picture. The music atlas connects the subject areas. Find what you want to explore.','Find your path. Choose a starting point and your next step. The learning path continues to develop.','Hear the theory. Explore intervals, scales and chords on the piano. From distance to sound.','Build harmony. Put chords together. Listen to the connections. MODUS HARMONI is a work in progress.','From sound to fingering. See chord tones on the piano and find guitar shapes. Take the idea to your instrument.','Bring your idea to life. Explore improvisation with bass, drums and piano. Let theory become your own expression.','MODUS. UNDERSTAND · DEVELOP · CREATE. From understanding to your own musical expression. Explore MODUS 2.0.']}:{title:'Bli kjent med MODUS',close:'Lukk filmen',note:'82 sekunder · Norsk tekst · Original musikk · Ingen fortellerstemme',loading:'Laster filmen …',error:'Filmen kunne ikke spilles av. Bruk nedlastingslenken for å åpne den separat.',download:'Last ned filmen (MP4, 12,6 MB)',transcript:'Les tekstalternativet',text:['MODUS. FORSTÅ · UTVIKLE · SKAP. Et sted der musikkteori blir levende. Musikk, nysgjerrighet og skaperglede.','52 artikler. Fra toner og intervaller til akkorder og harmonikk. Les. Lytt. Prøv selv.','Se helheten. Musikkatlas knytter fagområdene sammen. Finn det du vil utforske.','Finn din vei. Velg et utgangspunkt og ditt neste steg. Læringsløpet utvikles videre.','Hør teorien. Utforsk intervaller, skalaer og akkorder på piano. Fra avstand til klang.','Bygg harmonikk. Sett akkorder sammen. Lytt til forbindelsene. MODUS HARMONI · arbeidsutkast.','Fra klang til grep. Se akkordtonene på piano og finn grep på gitar. Ta ideen med til instrumentet.','Gi ideen liv. Utforsk improvisasjon med bass, trommer og piano. La teorien bli ditt eget uttrykk.','MODUS. FORSTÅ · UTVIKLE · SKAP. Fra forståelse til ditt eget musikalske uttrykk. Utforsk MODUS 2.0.']};
const dialog=document.createElement('dialog');dialog.className='intro-film-dialog';dialog.setAttribute('aria-labelledby','intro-film-title');
dialog.innerHTML='<div class="intro-film-shell"><div class="intro-film-heading"><h2 id="intro-film-title"></h2><button type="button" class="intro-film-close">✕</button></div><video class="intro-film-player" controls playsinline preload="none" poster="/media/modus-intro-poster.jpg" aria-labelledby="intro-film-title"><source src="/media/modus-intro-81eed15e5f0f.mp4" type="video/mp4"></video><p class="intro-film-note" role="status"></p><a class="intro-film-download" href="/media/modus-intro-81eed15e5f0f.mp4" download></a><details class="intro-film-transcript"><summary></summary><div></div></details></div>';
document.body.appendChild(dialog);
const video=dialog.querySelector('video'),close=dialog.querySelector('button'),note=dialog.querySelector('.intro-film-note');let opener=triggers[0];
dialog.querySelector('h2').textContent=copy.title;close.setAttribute('aria-label',copy.close);note.textContent=copy.note;dialog.querySelector('a').textContent=copy.download;dialog.querySelector('summary').textContent=copy.transcript;
for(const text of copy.text){const p=document.createElement('p');p.textContent=text;dialog.querySelector('.intro-film-transcript>div').appendChild(p);}
function stop(){video.pause();if(video.readyState)video.currentTime=0;}
function hide(){stop();dialog.close();}
// Pages serves full-file 200 responses instead of HTTP byte ranges. Load a local
// Blob only after the user's click so the native player can seek reliably.
const filmPath=video.querySelector('source').getAttribute('src');let loading,openRequest=0;
function prepareFilm(){
 if(!loading)loading=fetch(filmPath).then(response=>{if(!response.ok)throw new Error('Film request failed');return response.blob();}).then(blob=>{video.src=URL.createObjectURL(blob);}).catch(error=>{loading=undefined;throw error;});
 return loading;
}
for(const trigger of triggers)trigger.addEventListener('click',async()=>{
 opener=trigger;const request=++openRequest;note.textContent=copy.loading;dialog.showModal();close.focus();
 try{await prepareFilm();if(!dialog.open||request!==openRequest)return;note.textContent=copy.note;await video.play();}
 catch(error){if(dialog.open&&request===openRequest)note.textContent=copy.error;}
});
close.addEventListener('click',hide);dialog.addEventListener('cancel',e=>{e.preventDefault();hide();});
dialog.addEventListener('click',e=>{if(e.target===dialog)hide();});dialog.addEventListener('close',()=>{stop();opener.focus();});video.addEventListener('error',()=>{note.textContent=copy.error;});video.querySelector('source').addEventListener('error',()=>{note.textContent=copy.error;});
})();
