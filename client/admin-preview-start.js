import './editor.js';
import '../editor-admin.js';
// Cloudflare Access is the perimeter. This application is deliberately browser-only.
await document.getElementById('tryEditor').onclick();
document.getElementById('newArticle').click();
const note=document.getElementById('editorModeNote');
note.querySelector('strong').textContent='Nettleserlagring / Browser-only storage';
note.querySelector('p').textContent='Utkast og kontrollnotater lagres bare i denne nettleseren på denne adressen. Ingen synkronisering mellom enheter. / Drafts and review notes stay in this browser on this address; no cross-device sync.';
// Access sign-in is separate from the parked CMS account/backend interface.
for(const id of ['editorLogin','editorAccess']){const node=document.getElementById(id);node.hidden=true;node.inert=true;}
for(const id of ['exitPreview','editorSignOut']){const node=document.getElementById(id);node.hidden=true;node.disabled=true;}
const logout=document.createElement('a');logout.id='adminAccessLogout';logout.href='/cdn-cgi/access/logout';logout.textContent='Logg ut av Access / Sign out of Access';logout.style.cssText='display:flex;align-items:center;min-height:44px;font-size:11px;color:var(--lime);margin-top:12px';document.querySelector('.sidebar-bottom').append(logout);
document.querySelector('[data-console-view=overview]').click();
