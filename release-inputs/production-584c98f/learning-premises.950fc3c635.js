/* MODUS learning premises · articles only, one acknowledgement per tab session. */
(function () {
  'use strict';
  const FLOW_KEY = 'modus-premises-articles-session-v1';
  const path = location.pathname.replace(/\/+$/, '').toLowerCase();
  const isArticle = /^\/(?:en\/)?artikler(?:\.html|\/[^/]+)?$/.test(path);
  const isPlus = /\/(?:modus-plus)(?:\.html)?$/.test(path);
  const en = document.documentElement.lang.toLowerCase().startsWith('en');
  const assetRoot = new URL('images/', document.currentScript.src).href;
  let acceptedInMemory = false;
  const copy = en ? {
    eyebrow: 'BEFORE YOU EXPLORE', title: 'Learn, understand and find <em>your own way.</em>',
    first: 'MODUS is built on documented independent study and music-related quality assurance. We aim to give you a foundation for further learning – not a definitive answer to music.',
    second: 'The content offers guidance and supplements your own practice, exploration and any lessons with a teacher. MODUS is not a complete or accredited education and does not award academic credits.',
    check: 'I have read and understood.', continue: 'Continue to MODUS',
    fine: 'Your confirmation applies for this browser session, including page refreshes and language changes.',
    storage: 'Session storage is unavailable. You can continue, but may be asked again when opening another article page.'
  } : {
    eyebrow: 'FØR DU UTFORSKER', title: 'Lær, forstå og finn <em>din egen vei.</em>',
    first: 'MODUS bygger på dokumentert eget studiearbeid og musikkfaglig kvalitetssikring. Vi ønsker å gi deg en grunnmur for videre læring – ikke en endelig fasit på musikk.',
    second: 'Innholdet er veiledning og et supplement til egen øving, utforskning og eventuell undervisning med lærer. MODUS er ikke en komplett eller akkreditert utdanning, og gir ikke studiepoeng.',
    check: 'Jeg har lest og forstått.', continue: 'Fortsett til MODUS',
    fine: 'Bekreftelsen gjelder for denne nettleserøkten, også når du oppdaterer siden eller bytter språk.',
    storage: 'Øktlagring er utilgjengelig. Du kan fortsette, men kan bli spurt på nytt når du åpner en annen artikkelside.'
  };
  function createNotice() {
    if (document.getElementById('modus-premises-note')) return;
    const section = document.createElement('section');
    section.id = 'modus-premises-note';
    section.className = 'modus-premises-note';
    section.setAttribute('aria-label', 'Viktig om MODUS+');
    section.innerHTML = '<strong>Viktig om MODUS+</strong><p>MODUS er et supplement til egen læring – ikke en komplett eller akkreditert musikkutdannelse. Forklaringer og verktøy er ment som en faglig grunnmur for videre utforskning, ikke som eneste fasit. MODUS+ er foreløpig et konsept, ikke et aktivt abonnement.</p>';
    document.querySelector('main')?.prepend(section);
  }
  function createDialog() {
    if (!isArticle || document.querySelector('.modus-premises-dialog') || acceptedInMemory) return;
    try { if (sessionStorage.getItem(FLOW_KEY) === '1') return; } catch (_) {}
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'modus-premises-dialog';
    dialog.setAttribute('aria-labelledby', 'modus-premises-title');
    dialog.setAttribute('aria-describedby', 'modus-premises-first modus-premises-second');
    dialog.innerHTML = `<div class="modus-premises-art" aria-hidden="true"><img class="modus-premises-logo" src="${assetRoot}modus-geometric.svg" alt="" width="38" height="38"><img class="modus-premises-wave" src="${assetRoot}modus-waves.svg" alt="" width="1600" height="180"></div><div class="modus-premises-inner"><span class="modus-premises-eyebrow">${copy.eyebrow}</span><h2 id="modus-premises-title" tabindex="-1">${copy.title}</h2><p id="modus-premises-first">${copy.first}</p><p id="modus-premises-second">${copy.second}</p><form method="dialog" id="modus-premises-form"><label class="modus-premises-check"><input type="checkbox" id="modus-premises-accept" required><span>${copy.check}</span></label><button type="submit" class="modus-premises-confirm" disabled>${copy.continue}<span aria-hidden="true"> →</span></button></form><p class="modus-premises-fine">${copy.fine}</p><p class="modus-premises-storage" role="status" hidden></p></div>`;
    document.body.append(dialog);
    const input = dialog.querySelector('#modus-premises-accept');
    const button = dialog.querySelector('.modus-premises-confirm');
    const storageNote = dialog.querySelector('.modus-premises-storage');
    try { sessionStorage.setItem('modus-premises-storage-check', '1'); sessionStorage.removeItem('modus-premises-storage-check'); }
    catch (_) { storageNote.hidden = false; storageNote.textContent = copy.storage; }
    input.addEventListener('change', () => { button.disabled = !input.checked; });
    dialog.querySelector('form').addEventListener('submit', event => {
      if (!input.checked) { event.preventDefault(); return; }
      acceptedInMemory = true;
      try { sessionStorage.setItem(FLOW_KEY, '1'); } catch (_) {}
    });
    dialog.addEventListener('cancel', event => event.preventDefault());
    dialog.addEventListener('click', event => { if (event.target === dialog) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      const target = previous && previous !== document.body && previous.isConnected ? previous : document.querySelector('main');
      if (target) target.focus({preventScroll: true});
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('h2').focus({preventScroll: true});
    dialog.scrollTop = 0;
  }
  const start = () => { if (isPlus) createNotice(); createDialog(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
