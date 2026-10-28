/* MODUS homepage: sourced quotations, shuffled without repeats per cycle. */
(() => {
  'use strict';
  const quotes = [
    {id:'rameau', original:'La mélodie naît', emphasis:'de l’harmonie.', translation:'«Melodien fødes av harmonien.»', language:'fr', author:'Jean-Philippe Rameau', date:'1726', url:'https://s9.imslp.org/files/imglnks/usimg/d/d3/IMSLP383954-PMLP168592--1726-_Nouveau_syst%C3%A8me_de_musique_th%C3%A9orique_-BNF-.pdf'},
    {id:'ellington', original:'If it sounds good,', emphasis:'it sounds good.', translation:'«Låter det bra, så låter det bra.»', language:'en', author:'Duke Ellington', date:'1957', url:'https://quoteinvestigator.com/2019/03/14/sound/'},
    {id:'stravinsky', original:'To listen is an effort,', emphasis:'and just to hear is no merit.', translation:'«Å lytte krever innsats. Å bare høre er ingen prestasjon.»', language:'en', author:'Igor Stravinskij', date:'1959', url:'https://ijin-lab.org/en/quotes/Q7314-003'},
    {id:'wooten', original:'I love what I do,', emphasis:'and I do what I love.', translation:'«Jeg elsker det jeg gjør, og gjør det jeg elsker.»', language:'en', author:'Victor Wooten', date:'', url:'https://college.berklee.edu/people/victor-wooten'},
    {id:'brahms', original:'Without craftsmanship,', emphasis:'inspiration is a mere reed shaken in the wind.', translation:'«Uten håndverk er inspirasjon som et siv i vinden.»', language:'en', author:'Johannes Brahms', date:'', url:'https://carnegieart.org/resource/achenbach-and-brahms/'},
    {id:'nielsen', original:'Music is life,', emphasis:'and like it, inextinguishable.', translation:'«Musikk er liv, og som livet kan den ikke slukkes.»', language:'en', author:'Carl Nielsen', date:'1916', url:'https://www.carlnielsen.dk/gb/bio/'},
    {id:'mozart', original:'I simply follow', emphasis:'my own feelings.', translation:'«Jeg følger ganske enkelt mine egne følelser.»', language:'en', author:'Wolfgang Amadeus Mozart', date:'', url:'https://www.classical-music.com/articles/best-classical-music-quotes'},
    {id:'beethoven', original:'One can also sing', emphasis:'on the piano.', translation:'«Man kan også synge på pianoet.»', language:'en', author:'Ludwig van Beethoven', date:'1796', url:'https://www.beethoven.de/en/glossar/view/6587061687549952/Art%20and%20music'},
    {id:'bach', original:'The glory of God', emphasis:'and the refreshment of the soul.', translation:'«Til Guds ære og sjelens forfriskning.»', language:'en', author:'Johann Sebastian Bach', date:'1738', url:'https://fixquotes.com/quotes/the-aim-and-final-end-of-all-music-should-be-none-122655/'}
  ];
  const headline = document.querySelector('#welcome');
  const translation = document.querySelector('.quote-translation');
  const credit = document.querySelector('.quote-credit');
  if (!headline || !translation || !credit) return;
  const key = 'modus.homepage.quote-deck.v1';
  let deck = [];
  let last = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.deck)) {
      deck = saved.deck.filter(id => quotes.some(quote => quote.id === id));
      last = saved.last || null;
    }
  } catch (_) { /* session storage is optional */ }
  if (!deck.length) {
    deck = quotes.map(q => q.id);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck.length > 1 && deck[0] === last) [deck[0], deck[1]] = [deck[1], deck[0]];
  }
  const chosen = quotes.find(q => q.id === deck.shift()) || quotes[0];
  try { sessionStorage.setItem(key, JSON.stringify({deck, last:chosen.id})); } catch (_) {}
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const heading = chosen.original + ' ';
  headline.replaceChildren(document.createTextNode(heading), Object.assign(document.createElement('em'), {textContent:chosen.emphasis}));
  headline.lang = chosen.language;
  if (isEnglish && chosen.language === 'en') {
    translation.hidden = true;
  } else {
    translation.hidden = false;
    translation.textContent = chosen.translation;
    translation.lang = 'nb';
  }
  const a = document.createElement('a');
  a.href = chosen.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = chosen.author + (chosen.date ? ' · ' + chosen.date : '') + ' ↗';
  a.title = isEnglish ? 'Read the source' : 'Les kilden til sitatet';
  credit.replaceChildren(a);
})();
