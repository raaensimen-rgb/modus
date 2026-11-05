(()=>{'use strict';
if(document.querySelector('.modus-feedback')||document.body.classList.contains('editor-page'))return;
const en=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
const t=en?{open:'Contact MODUS',title:'Contact MODUS',intro:'Report an issue, ask a question, or suggest an improvement.',type:'What is this about?',error:'Report an issue',question:'Ask a question',suggestion:'Suggest an improvement',message:'Your message',placeholder:'Tell us what happened or what you would like to see…',email:'Email (optional)',privacy:'We store your message and optional email address to review your feedback. Do not send sensitive information.',send:'Send feedback',sending:'Sending…',done:'Thanks! Your message has been received.',failure:'Unable to send right now. Please try again later.',short:'Please write at least 10 characters.',wait:'Please wait a little before sending again.',close:'Close'}:{open:'Kontakt MODUS',title:'Kontakt MODUS',intro:'Rapporter en feil, still et spørsmål eller foreslå en forbedring.',type:'Hva gjelder henvendelsen?',error:'Rapporter en feil',question:'Still et spørsmål',suggestion:'Foreslå en forbedring',message:'Din melding',placeholder:'Fortell oss hva som skjedde eller hva du ønsker deg …',email:'E-post (valgfritt)',privacy:'Vi lagrer meldingen og eventuell e-postadresse for å behandle henvendelsen. Ikke send sensitive opplysninger.',send:'Send melding',sending:'Sender …',done:'Takk! Meldingen er mottatt.',failure:'Kunne ikke sende nå. Prøv igjen senere.',short:'Skriv minst 10 tegn.',wait:'Vent litt før du sender en ny melding.',close:'Lukk'};
const root=document.createElement('aside');root.className='modus-feedback';root.setAttribute('aria-label',t.title);
root.innerHTML=`<div class="modus-feedback-panel" id="modus-feedback-panel" hidden><div class="modus-feedback-heading"><div><strong>${t.title}</strong><p>${t.intro}</p></div><button type="button" class="modus-feedback-close" aria-label="${t.close}">×</button></div><form class="modus-feedback-form"><label for="modus-feedback-type">${t.type}</label><select id="modus-feedback-type" name="category" required><option value="error">${t.error}</option><option value="question">${t.question}</option><option value="suggestion">${t.suggestion}</option></select><label for="modus-feedback-message">${t.message}</label><textarea id="modus-feedback-message" name="message" minlength="10" maxlength="3000" required placeholder="${t.placeholder}"></textarea><label for="modus-feedback-email">${t.email}</label><input id="modus-feedback-email" name="email" type="email" maxlength="254" autocomplete="email"><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="modus-feedback-note">${t.privacy}</p><button class="modus-feedback-send" type="submit">${t.send}</button><p class="modus-feedback-status" role="status" aria-live="polite"></p></form></div><button type="button" class="modus-feedback-toggle" aria-expanded="false" aria-controls="modus-feedback-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 9 9 0 0 1-3.5-.7L4 20l1.7-4.8A7.5 7.5 0 1 1 20 11.5Z"/></svg><span>${t.open}</span></button>`;
document.body.append(root);
/* Global contextual help, paired with the existing floating contact control. */
const helpPages={
 'backingtracks.html':[['Toneart','Bestemmer tonesenteret for backingtracken.'],['Modus','Velger skala og tonal karakter.'],['Groove','Velger rytmisk akkompagnement.'],['Harmonikk','Velger hvordan akkordene bygges opp.'],['Tempo','Hastighet målt i slag per minutt (BPM).'],['Klikk','Hør en jevn metronompuls mens du spiller.']],
 'akkorder.html':[['Grunntone','Tonen akkorden er oppkalt etter.'],['Akkordtype','Bestemmer hvilke intervaller akkorden inneholder.'],['Gitargrep','Alternative plasseringer av akkordtonene på gitarhalsen.'],['Omvending','Samme akkordtoner, men en annen tone ligger nederst på pianoet.']],
 'musikkart.html':[['Mitt musikkatlas','Viser sammenhenger mellom musikalske fagområder og moduler.'],['Under arbeid','Et område du arbeider med, eller har åpnet tilknyttet undervisningsstoff for.'],['Lært','Egenmarkert status, ikke formell vurdering av kompetanse.'],['Nullstill','Nullstiller atlasets synlige markeringer og notater, men ikke quizresultatene på kontoen.']],
 'laeringssti.html':[['Læringssti','Foreslått rekkefølge for å utforske teori og praktiske øvelser.'],['Grunnstudier','Innføring i sentrale musikalske begreper og sammenhenger.']],
 'modus-plus.html':[['MODUS+','Planlagt medlemskap. Kjøp er foreløpig ikke åpnet.'],['Priser','Forslag under utvikling, ikke et aktivt abonnement.']],
 'artikler.html':[['Artikler','Musikkfaglige tekster og forklaringer.'],['Quiz','Oppgaver for å kontrollere forståelsen av et tema.']],
 'teori.html':[['Teorirommet','Utforsk hvordan skalaer, akkorder og intervaller henger sammen.']],
 'grunnstudier.html':[['Grunnstudier','Et planlagt studieløp med gradvis progresjon.']]
};
const currentPage=location.pathname.split('/').pop()||'index.html';
const helpItems=helpPages[currentPage]||[['Navigasjon','Bruk menyen øverst til å finne læringsstoff og musikkverktøy.'],['Visning','Bytt mellom mørk, lesevennlig og høy kontrast.'],['Kontakt MODUS','Send inn spørsmål, feil eller forbedringsforslag.']];
const helpTitle=en?'Help on this page':'Hjelp på denne siden';
const helpButton=document.createElement('button');helpButton.type='button';helpButton.className='modus-help-toggle';helpButton.setAttribute('aria-label',helpTitle);helpButton.setAttribute('aria-expanded','false');helpButton.setAttribute('aria-controls','modus-help-panel');helpButton.textContent='?';helpButton.title=helpTitle;
const helpPanel=document.createElement('section');helpPanel.className='modus-help-panel';helpPanel.id='modus-help-panel';helpPanel.hidden=true;helpPanel.setAttribute('aria-label',helpTitle);
const helpHeading=document.createElement('strong');helpHeading.textContent=helpTitle;helpPanel.append(helpHeading);
const helpList=document.createElement('dl');
for(const [term,description] of helpItems){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=description;helpList.append(dt,dd);}
helpPanel.append(helpList);
const actionRow=document.createElement('div');actionRow.className='modus-feedback-actions';
root.insertBefore(helpPanel,root.firstChild);
root.insertBefore(actionRow,root.querySelector('.modus-feedback-toggle'));
actionRow.append(helpButton,root.querySelector('.modus-feedback-toggle'));
function showHelp(open){helpPanel.hidden=!open;helpButton.setAttribute('aria-expanded',String(open));if(open){root.querySelector('.modus-feedback-panel').hidden=true;root.querySelector('.modus-feedback-toggle').setAttribute('aria-expanded','false');}}
/* Activate contextual explanations rather than opening a static list. */
const hints={
 '#key':'Velg grunntonen eller tonesenteret for musikken.',
 '#mode':'Velg skalaens musikalske karakter, for eksempel dorisk eller eolisk.',
 '#style':'Velg akkompagnementets rytmiske stil.',
 '#harmony':'Velg hvordan akkordrekken bygges opp.',
 '#tempo,#bpm,#tap':'Styr tempoet i slag per minutt (BPM).',
 '#click':'Slå metronomklikk av eller på.',
 '#play':'Start eller stopp backingtracken.',
 '#chordInstrument':'Velg piano- eller flygelljud for akkordene.',
 '#chordSlots select':'Velg grunntone eller akkordtype for dette akkordfeltet.',
 '#pianoInversionButtons button':'Velg hvilken akkordtone som ligger nederst i pianoakkorden.',
 '#guitarGripTabs button':'Velg et alternativt grep for den samme akkorden.',
 '#alternateGrip':'Vis et annet gitargrep for akkorden.',
 '#map-search':'Finn et fagområde eller en modul i musikkatlaset.',
 '#map-clear':'Nullstill egne atlasmarkeringer og notater. Quizresultatene beholdes.',
 '#map-export':'Last ned en kopi av dine personlige atlasmarkeringer.',
 '#map-reset':'Fjern markering av valgt område uten å slette progresjon.',
 '[data-state]':'Marker egen vurdering av arbeidet med dette emnet.',
 '.theme-picker summary':'Velg mørk, lesevennlig eller høy kontrast.',
 '.language-picker a':'Bytt språk på siden.',
 '.nav-trigger':'Åpne menyen for å se flere sider i denne kategorien.',
 '.modus-feedback-toggle':'Send et spørsmål, meld inn feil eller foreslå en forbedring.'
};
const hintEntries=Object.entries(hints);
const contextualTip=document.createElement('div');
contextualTip.className='modus-context-tip';
contextualTip.id='modus-context-tip';
contextualTip.setAttribute('role','tooltip');
contextualTip.hidden=true;
document.body.append(contextualTip);
let contextualHelp=false,activeHintTarget=null;
function explainTarget(el){
 if(!(el instanceof Element))return null;
 for(const [selector,message] of hintEntries){const match=el.closest(selector);if(match&&!match.disabled)return {target:match,message};}
 // Global fallback: every ordinary interactive control should explain its purpose.
 const control=el.closest('button, a[href], select, input:not([type="hidden"]), summary, textarea, [role="button"]');
 if(!control||control.disabled||root.contains(control))return null;
 const label=control.getAttribute('aria-label')||control.labels?.[0]?.textContent||control.closest('label')?.textContent||control.textContent||control.title||control.getAttribute('placeholder')||'Dette valget';
 const name=label.replace(/\s+/g,' ').trim().slice(0,100);
 const action=control.matches('a[href]')?'Åpner siden eller innholdet':control.matches('select')?'Velg et alternativ for':control.matches('input, textarea')?'Skriv inn eller endre':'Aktiverer';
 return {target:control,message:action+' «'+(name||'dette valget')+'».'};
}
function closeContextTip(){contextualTip.hidden=true;activeHintTarget=null;}
function openContextTip(target,message){
 activeHintTarget=target;
 contextualTip.textContent=message;
 contextualTip.style.right='auto';
 contextualTip.hidden=false;
 const rect=target.getBoundingClientRect(), width=contextualTip.offsetWidth,height=contextualTip.offsetHeight;
 let x=Math.min(window.innerWidth-width-12,Math.max(12,rect.left+rect.width/2-width/2));
 let y=rect.top-height-12;
 if(y<12)y=Math.min(window.innerHeight-height-12,rect.bottom+12);
 contextualTip.style.left=Math.max(12,x)+'px';
 contextualTip.style.top=Math.max(12,y)+'px';
}
function setContextHelp(enabled){
 contextualHelp=enabled;
 helpButton.setAttribute('aria-pressed',String(enabled));
 helpButton.setAttribute('aria-label',enabled?'Avslutt forklaringsmodus':'Aktiver forklaringsmodus');
 helpButton.title=enabled?'Klikk for å avslutte. Hold pekeren over kontroller for forklaring.':'Aktiver forklaringer ved å holde pekeren over kontroller.';
 showHelp(false);
 closeContextTip();
 if(enabled)openContextTip(helpButton,'Hjelp er aktiv. Hold pekeren over en knapp eller et valg.');
 document.documentElement.classList.toggle('modus-context-help-active',enabled);
}
helpButton.addEventListener('click',()=>setContextHelp(!contextualHelp));
document.addEventListener('mouseover',e=>{
 if(!contextualHelp)return;
 const hit=explainTarget(e.target);
 if(hit&&hit.target!==activeHintTarget)openContextTip(hit.target,hit.message);
 else if(!hit)closeContextTip();
});
document.addEventListener('focusin',e=>{
 if(!contextualHelp)return;
 const hit=explainTarget(e.target);
 if(hit)openContextTip(hit.target,hit.message);
});
document.addEventListener('pointerdown',e=>{
 if(!contextualHelp||e.pointerType!=='touch')return;
 const hit=explainTarget(e.target);
 if(hit){e.preventDefault();if(activeHintTarget===hit.target)closeContextTip();else openContextTip(hit.target,hit.message);}
 else closeContextTip();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&contextualHelp){setContextHelp(false);helpButton.focus();}});
window.addEventListener('scroll',closeContextTip,{passive:true});
window.addEventListener('resize',closeContextTip,{passive:true});
document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))showHelp(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!helpPanel.hidden){showHelp(false);helpButton.focus();}});

/* Keep the fixed contact control above the footer divider and its links.
   As the footer enters view, the widget tracks its top edge rather than
   overlapping the footer. The normal viewport inset is restored on scroll-up. */
const footer=document.querySelector('body > footer, .site-footer, footer');
if(footer){
  let scheduled=false;
  function positionFeedback(){
    scheduled=false;
    const footerTop=footer.getBoundingClientRect().top;
    const baseInset=window.innerWidth<=620?12:Math.min(28,Math.max(12,window.innerWidth*.025));
    const reserved=Math.max(0,window.innerHeight-footerTop+12);
    root.style.bottom=Math.max(baseInset,reserved)+'px';
  }
  function scheduleFeedbackPosition(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(positionFeedback);
  }
  window.addEventListener('scroll',scheduleFeedbackPosition,{passive:true});
  window.addEventListener('resize',scheduleFeedbackPosition,{passive:true});
  scheduleFeedbackPosition();
}
const toggle=root.querySelector('.modus-feedback-toggle'),panel=root.querySelector('.modus-feedback-panel'),close=root.querySelector('.modus-feedback-close'),form=root.querySelector('form'),send=root.querySelector('.modus-feedback-send'),status=root.querySelector('.modus-feedback-status');
function show(open){if(open)showHelp(false);panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('select').focus();else toggle.focus();}
toggle.addEventListener('click',()=>show(panel.hidden));close.addEventListener('click',()=>show(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false);});
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;if(form.elements.website.value)return;
const message=form.elements.message.value.trim(),email=form.elements.email.value.trim();if(message.length<10){status.textContent=t.short;status.dataset.error='true';return;}
const last=Number(localStorage.getItem('modus.feedback.last')||0);if(Date.now()-last<60000){status.textContent=t.wait;status.dataset.error='true';return;}
send.disabled=true;send.textContent=t.sending;status.textContent='';status.dataset.error='false';
try{const response=await fetch('https://kwwsixmsdsilwcwpdbtc.supabase.co/rest/v1/modus_feedback',{method:'POST',headers:{'Content-Type':'application/json','apikey':'sb_publishable_VpDgl-RE-ubJcMo-38PhnA_FFaGLOXw','Prefer':'return=minimal'},body:JSON.stringify({category:form.elements.category.value,message,email:email||null,page_url:location.origin+location.pathname})});if(!response.ok)throw new Error('Submission failed');localStorage.setItem('modus.feedback.last',String(Date.now()));form.reset();status.textContent=t.done;}catch{status.textContent=t.failure;status.dataset.error='true';}finally{send.disabled=false;send.textContent=t.send;}
});
})();