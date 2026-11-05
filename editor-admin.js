import {mountAdminConsole} from './admin-console.js';
// Presentation adapter only: existing editor handlers and RED models own all data.
const $=id=>document.getElementById(id),shell=document.querySelector('.admin-shell');
const form=$('editorForm'),documentPanel=document.createElement('div'),tools=document.createElement('aside');
documentPanel.className='admin-document';tools.className='admin-tools';tools.setAttribute('aria-label','Artikkelens redaksjonelle informasjon');
for(const child of [...form.children]){(child.matches('.editor-summary,#editorReview')?tools:documentPanel).append(child);}
// Keep language switching reachable when the current document is closed.
$('editorSearch').closest('label').before($('editorLocale').closest('label'));form.append(documentPanel,tools);
const actions=document.createElement('div');actions.className='admin-actions';
for(const [target,label] of [['newArticle','＋ Ny artikkel'],['previewArticle','Forhåndsvis'],['saveDraft','Lagre utkast'],['downloadDraft','Eksporter utkast']]){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.adminAction=target;
 const source=$(target);
 b.onclick=()=>{if(!$('editorWorkspace').hidden&&(target==='newArticle'||!form.hidden))source.click();};
 const sync=()=>{if(target==='saveDraft')b.textContent=source.textContent;b.disabled=source.disabled||(target!=='newArticle'&&form.hidden);};
 sync();
 new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true,characterData:true});
 if(target!=='newArticle')new MutationObserver(sync).observe(form,{attributes:true,attributeFilter:['hidden']});
 actions.append(b);
}
const ai=document.createElement('button');ai.type='button';ai.disabled=true;ai.textContent='AI-kontroll · planlagt';actions.append(ai);
$('editorWorkspace').prepend(actions);
const menu=$('mobileMenu'),side=$('sidebar');
function updateMenu(){menu.setAttribute('aria-expanded',String(innerWidth<=720?side.classList.contains('mobile-open'):!shell.classList.contains('collapsed')));}
function toggleMenu(){if(innerWidth<=720)side.classList.toggle('mobile-open');else shell.classList.toggle('collapsed');updateMenu();}
menu.onclick=toggleMenu;$('collapse').onclick=toggleMenu;addEventListener('resize',updateMenu);updateMenu();
addEventListener('keydown',e=>{if(e.key==='Escape'&&side.classList.contains('mobile-open')){side.classList.remove('mobile-open');updateMenu();menu.focus();}});
for(const b of side.querySelectorAll('[data-admin-view]'))b.onclick=()=>{
 side.querySelectorAll('[data-admin-view]').forEach(n=>n.classList.toggle('active',n===b));
 const view=b.dataset.adminView;
 shell.classList.toggle('admin-list-open',view==='articles');
 if(innerWidth<=720){side.classList.remove('mobile-open');updateMenu();}
 const target=view==='review'?$('editorReview'):view==='articles'?$('editorSearch'):document.querySelector('.editor-intro h1');
 if(view==='review'&&form.hidden){$('editorStatus').textContent='Åpne eller opprett en artikkel før fag-, kilde- og rettighetskontroll.';return;}
 target?.scrollIntoView({block:'start'});if(target){target.tabIndex=target.tabIndex<0?-1:target.tabIndex;target.focus({preventScroll:true});}
};

// Approved master dashboard, backed only by current CMS state; no prototype data.
const overview=document.createElement('section');overview.innerHTML="<div class=\"content view activeview\" id=\"adminOverview\" hidden>\n <div class=\"intro\"><div><div class=\"crumb\">VELKOMMEN TIL MODUS</div><h1>Arbeidsoversikt</h1><p>Din arbeidsplass for musikkfaglig innhold, læring og skaperglede.</p></div><button class=\"primary\" data-admin-shortcut=\"new\">＋ &nbsp; Ny artikkel</button></div>\n <section class=\"surface resume\" aria-label=\"Fortsett arbeidet\"><div><div class=\"eyebrow\">FORTSETT DER DU SLAPP</div><h2>Gi ideene dine plass til å vokse.</h2><p>Åpne eksisterende artikkelutkast, skriv videre og gå gjennom faglig innhold når det er klart. Artikkeloversikten og kontrollfeltene gjenbruker den eksisterende redaktøren.</p></div><button class=\"quietlink\" data-admin-shortcut=\"articles\">Se artikler ↗</button></section>\n <div class=\"section-title\"><h2>Redaksjonelt arbeid</h2><p>Fire snarveier til det viktigste</p></div>\n <section class=\"tiles\" aria-label=\"Arbeidsområder\">\n  <button class=\"surface tile\" data-admin-shortcut=\"articles\"><svg viewBox=\"0 0 24 24\"><path d=\"M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h6\"/></svg><h3>Utkast og artikler</h3><p>Finn artikler du ønsker å skrive eller bearbeide.</p></button>\n  <button class=\"surface tile\" data-admin-shortcut=\"review\"><svg viewBox=\"0 0 24 24\"><path d=\"M12 2 20 6v6q0 7-8 10-8-3-8-10V6zM8 12l3 3 5-6\"/></svg><h3>Faglig kontroll</h3><p>Se krav til kilder, dokumentasjon og medierettigheter.</p></button>\n  <button class=\"surface tile\" data-admin-shortcut=\"articles\"><svg viewBox=\"0 0 24 24\"><path d=\"M3 5h18M3 19h18M5 12h6m-6-4v8m14-8h-6m6-4v8\"/></svg><h3>Norsk / engelsk</h3><p>Følg språkversjoner hver for seg, uten antatt godkjenning.</p></button>\n  <button class=\"surface tile\" data-admin-shortcut=\"articles\"><svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 6v6l4 3M3 12h2\"/></svg><h3>Lagring og revisjoner</h3><p>Hold oversikt over lokale kopier og kontrollert versjonering.</p></button>\n </section>\n <div class=\"under\"><section class=\"surface boxcard\"><h3>Åpent arbeidsutkast</h3><div class=\"empty\" data-current-draft>Ingen artikkel er valgt. Åpne eller opprett et utkast i redaktøren.</div></section><section class=\"surface boxcard\"><h3>Kontroll og publisering</h3><div class=\"empty\">Faglig kontroll, kilder og rettigheter må være dokumentert for den eksakte språk- og artikkelversjonen. En godkjenning innebærer aldri automatisk publisering.</div></section></div>\n <p class=\"footerhint\">PL-ADM-001 · Eksisterende CMS. Faglig kontroll og publisering er separate beslutninger. Ingen AI-integrasjon er aktivert.</p>\n</div>";
const dashboard=overview.firstElementChild;document.querySelector('.editor-main').prepend(dashboard);
function showOverview(show){dashboard.hidden=!show;shell.classList.toggle('admin-overview-open',show);if(show){const title=$('field-title').value;dashboard.querySelector('[data-current-draft]').textContent=!form.hidden&&title?'Åpent utkast: '+title+' · '+($('editorLocale').value==='en'?'EN':'NB')+'. Bruk Artikler for å fortsette.':'Ingen artikkel er valgt. Åpne eller opprett et utkast i redaktøren.';dashboard.querySelector('h1').tabIndex=-1;dashboard.querySelector('h1').focus();}}
for(const b of side.querySelectorAll('[data-admin-view]'))b.addEventListener('click',()=>{const isOverview=b.dataset.adminView==='overview';showOverview(isOverview);if(!isOverview){const t=b.dataset.adminView==='articles'?$('editorSearch'):!form.hidden?$('reviewHeading'):$('editorStatus');t.tabIndex=-1;t.focus();}});
for(const b of dashboard.querySelectorAll('[data-admin-shortcut]'))b.onclick=()=>{const view=b.dataset.adminShortcut;if(view==='new'){showOverview(false);$('newArticle').click();}else side.querySelector('[data-admin-view="'+view+'"]').click();};

mountAdminConsole();
