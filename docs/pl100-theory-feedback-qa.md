# PL-100 – synlig tangentrespons i Teorirommet, 31.10.2026

## Avgrensning
PR #29 er allerede merget. Dette er en liten oppfølging fra main
`cda616a31a57f7157ab2427b15f8c3e6f362a687`, på isolert gren
`fix/pl100-theory-key-feedback`. Ingen ny lydmotor eller endring av notevalg,
lydnivå, faste grunntone-/skalafarger eller andre pianovisningers design.

- `theory.js`: visualiseringens slutt følger minimum av faktisk samplevarighet
  (korrigert for playbackRate) og source.stop-tid, inkludert eksisterende 20 ms
  utklang. Tidligere ble den nominelle gain-envelope-slutten brukt.
- `theory.js`: data-key-kind skiller svarte og hvite tangenter.
- `theory.css`: kun #theoryKeyboard får nedtrykk med liten vertikal bevegelse,
  kompresjon og kontrast. Aktive etiketter følger samme eksisterende tangentgruppe.
  Tonic/scale fill beholdes. Prefers-reduced-motion fjerner transform og overgang
  for begge tangenttyper, men beholder synlig aktiv kontrast/omriss.
- Den eksisterende ModusPiano-mekanismen leser AudioContext.currentTime og
  source.ended. Ingen separat produksjonstimer er lagt til.
- NO/EN produseres av eksisterende bygging fra samme kildefiler.

## Automatiske kontrollpunkter
1. `npm run build`, `npm test` (24 kontroller), `npm run test:browser`.
2. Utvidet tests/piano-interaction.cjs: overlapp av samme MIDI, stillestående
   lydklokke og kjøring av den faktiske Teorirommet-schedulerfunksjonen med korte
   og lange samples. Ny test FEILER med gammel theory.js (10.91 mot forventet
   10.26 i kort-sample-tilfellet), BESTÅR med rettingen.
3. tests/piano-browser.cjs: åtte ekstra skala-kontroller i Chromium/WebKit,
   1440/375 CSS-px og NO/EN. Observerer faktiske AudioBufferSourceNode-start/stopp/
   ended og DOM-markering per frame (60 ms grensemargin for renderkvantisering).
   Bekrefter full skala, korrekte toneetiketter, hvite/svarte nedtrykk, overlapp,
   stopp/gjentakelse, modusbytte, uendret grunntonefarge og reduced-motion også på
   svart tangent. Eksisterende Jam/Harmoni/F03-regresjoner beholdes.
4. Resultater: test-results/piano-browser-results.json i CI-artefakten.

Lokale Node-tester og bygging består. Lokal nettleserinstallasjon feilet fordi
apt ikke kunne endre bruker/grupper i dette miljøet; ingen lokal visuell
nettleser-QA er utført. Eksakte CI-resultater/commit oppgis i PR-rapporten.

## 07 – faktisk visuell og lyttende kontroll
Bruk isolert Cloudflare Preview for den eksakte nye PR-headen. Gammel PR #29-
Preview eller produksjon er ikke testbevis for denne leveransen. Registrer URL,
commit, nettleser, visningsbredde og zoom ved hver test.

- Teorirommet `/teori.html` og `/en/teori.html`, 1440×900 og 375×900, zoom 100 %.
- E dorisk: Lytt til skalaen. E, F♯, G, A, B, C♯, D, E skal følge lyden.
  Hvite og svarte tangenter skal oppleves diskret men tydelig nedtrykt.
- Grunntonens faste farge skal fortsatt være synlig. Aktiv etikett følger den
  faktisk spilte tonen; overlappende utklanger kan gi flere aktive taster.
- Stopp midt i avspilling, start igjen, bytt modus/grunntone raskt og bytt emne.
  Ingen hengende tangent eller forsinket tone fra forrige eksempel.
- Intervaller/akkorder/kadenser i samme rom: sjekk simultane og overlappende toner.
- Spill hvit/svart tangent med mus, berøring og Enter/Space; slipp og avbryt.
  Kontroller fokus med piltaster/Home/End og at omriss ikke klippes.
- Redusert bevegelse: ingen forskyvning/kompresjon, fortsatt tydelig aktiv tast.
- Ved 375 px skal bare eksisterende keyboard-wrap kunne rulles horisontalt;
  ingen ny side-overløp eller endret navigasjon.

F03 #28 følger etter denne leveransen. Studio forblir pauset. Ingen merge eller
produksjonspublisering er autorisert.
