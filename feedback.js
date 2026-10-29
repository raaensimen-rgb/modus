(()=>{'use strict';
if(document.querySelector('.modus-feedback')||document.body.classList.contains('editor-page'))return;
const en=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
const t=en?{open:'Contact MODUS',title:'Contact MODUS',intro:'Report an issue, ask a question, or suggest an improvement.',type:'What is this about?',error:'Report an issue',question:'Ask a question',suggestion:'Suggest an improvement',message:'Your message',placeholder:'Tell us what happened or what you would like to see…',email:'Email (optional)',privacy:'We store your message and optional email address to review your feedback. Do not send sensitive information.',send:'Send feedback',sending:'Sending…',done:'Thanks! Your message has been received.',failure:'Unable to send right now. Please try again later.',short:'Please write at least 10 characters.',wait:'Please wait a little before sending again.',close:'Close'}:{open:'Kontakt MODUS',title:'Kontakt MODUS',intro:'Rapporter en feil, still et spørsmål eller foreslå en forbedring.',type:'Hva gjelder henvendelsen?',error:'Rapporter en feil',question:'Still et spørsmål',suggestion:'Foreslå en forbedring',message:'Din melding',placeholder:'Fortell oss hva som skjedde eller hva du ønsker deg …',email:'E-post (valgfritt)',privacy:'Vi lagrer meldingen og eventuell e-postadresse for å behandle henvendelsen. Ikke send sensitive opplysninger.',send:'Send melding',sending:'Sender …',done:'Takk! Meldingen er mottatt.',failure:'Kunne ikke sende nå. Prøv igjen senere.',short:'Skriv minst 10 tegn.',wait:'Vent litt før du sender en ny melding.',close:'Lukk'};
const root=document.createElement('aside');root.className='modus-feedback';root.setAttribute('aria-label',t.title);
root.innerHTML=`<div class="modus-feedback-panel" id="modus-feedback-panel" hidden><div class="modus-feedback-heading"><div><strong>${t.title}</strong><p>${t.intro}</p></div><button type="button" class="modus-feedback-close" aria-label="${t.close}">×</button></div><form class="modus-feedback-form"><label for="modus-feedback-type">${t.type}</label><select id="modus-feedback-type" name="category" required><option value="error">${t.error}</option><option value="question">${t.question}</option><option value="suggestion">${t.suggestion}</option></select><label for="modus-feedback-message">${t.message}</label><textarea id="modus-feedback-message" name="message" minlength="10" maxlength="3000" required placeholder="${t.placeholder}"></textarea><label for="modus-feedback-email">${t.email}</label><input id="modus-feedback-email" name="email" type="email" maxlength="254" autocomplete="email"><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="modus-feedback-note">${t.privacy}</p><button class="modus-feedback-send" type="submit">${t.send}</button><p class="modus-feedback-status" role="status" aria-live="polite"></p></form></div><button type="button" class="modus-feedback-toggle" aria-expanded="false" aria-controls="modus-feedback-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 9 9 0 0 1-3.5-.7L4 20l1.7-4.8A7.5 7.5 0 1 1 20 11.5Z"/></svg><span>${t.open}</span></button>`;
document.body.append(root);
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
function show(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('select').focus();else toggle.focus();}
toggle.addEventListener('click',()=>show(panel.hidden));close.addEventListener('click',()=>show(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false);});
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;if(form.elements.website.value)return;
const message=form.elements.message.value.trim(),email=form.elements.email.value.trim();if(message.length<10){status.textContent=t.short;status.dataset.error='true';return;}
const last=Number(localStorage.getItem('modus.feedback.last')||0);if(Date.now()-last<60000){status.textContent=t.wait;status.dataset.error='true';return;}
send.disabled=true;send.textContent=t.sending;status.textContent='';status.dataset.error='false';
try{const response=await fetch('https://kwwsixmsdsilwcwpdbtc.supabase.co/rest/v1/modus_feedback',{method:'POST',headers:{'Content-Type':'application/json','apikey':'sb_publishable_VpDgl-RE-ubJcMo-38PhnA_FFaGLOXw','Prefer':'return=minimal'},body:JSON.stringify({category:form.elements.category.value,message,email:email||null,page_url:location.origin+location.pathname})});if(!response.ok)throw new Error('Submission failed');localStorage.setItem('modus.feedback.last',String(Date.now()));form.reset();status.textContent=t.done;}catch{status.textContent=t.failure;status.dataset.error='true';}finally{send.disabled=false;send.textContent=t.send;}
});
})();