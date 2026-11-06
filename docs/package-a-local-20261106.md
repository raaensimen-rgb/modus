# Pakke A – én lokal bygg- og testflyt

Utgangspunktet er offentlig MODUS 2.0, SHA `d809a7b0fc4fbb8480f7ee5b8e3daa7ffb5227e5`, produksjonsdeployment `536b0e35-23a1-4dad-99bd-337a51afb13b` i eksisterende prosjekt `modus`. GitHub main og gamle PR-/Preview-pakker er ikke produksjonsgrunnlaget. Oppdraget gir bare lokal fullmakt, ingen push, merge, deploy eller GitHub-endring.

## Bruk

Fra denne isolerte kildemappen: `npm run quality:local`.

Kjøringen utfører ordinært artikkel-/CMS-bygg, bygger kandidaten, kjører alle ordinære testgrupper, verifiserer et identisk andre kandidatbygg og ZIP, og kjører aktuelle meny-, release-, piano- og lydtester sekvensielt. Den produserer `../delivery/REPORT.md`, `REPORT.json`, `MODUS-package-A-local.zip` og logger i `../evidence/`. Nettlesertestene trenger lokal Chromium/WebKit, Node-avhengigheter fra låst package-lock og Python 3. Ingen deployverktøy eller hemmeligheter trengs. `npm run preview:local` viser deretter kun den kontrollerte offentlige kandidaten på en lokal loopback-adresse.

`npm run build` kjører `build:source` og deretter `build:candidate`. `npm test` kontrollerer både ordinært bygg og kandidaten. `npm run test:navigation` og `npm run test:browser` bruker kandidaten som standard. `MODUS_TEST_DIST` kan velge en annen lokal testmappe eksplisitt.

`dist/` er et mellomresultat fra ordinære generatorer, med egne interne testforutsetninger. Den er ikke den offentlige leveransen og skal ikke serveres eller lastes opp som produksjonspakke. Den eneste kandidaten fra dette oppdraget er `../package/` og den kontrollerte ZIP-en. Ingen lokal kilde-/CMS-mappe følger med.

## Avgrenset og reproduserbar integrasjon

Siste offentlige pakke er vendort i `release-inputs/published-d809a7b`, med separat hashinventar. 645 produktkildefiler er også hashbundet, slik at endringer utenfor oppdraget ikke kan bli oversett av et fryst kandidatgrunnlag. Byggeren avviser endret baseline og krever at ordinært bygg har samme `navigation.js` som kilden. Den tillater kun rettet meny-JS, to nye versjonsbundne menyfiler, oppdaterte scriptreferanser på 137 sider og nytt leveransemanifest. Alle andre eksisterende filer må være byte-identiske. HTML sammenlignes etter normalisering av bare menyfilnavnet, slik at tekst, stiler, struktur og resten av headeren ikke kan endres.

Menyrettingen lagrer om et panel ble åpnet av hover. Første pekerklikk bekrefter åpningen og bruker opp denne tilstanden; neste klikk lukker. Keyboard click (`detail=0`) og touch veksler fortsatt. Lukking nullstiller hovertilstanden. Hover over et allerede tastatur-/klikkåpnet panel endrer ikke åpningens opphav.

Temavelgeren hadde dessuten en arvet overlappingsfeil: toolbarens `isolation:isolate` lot menyrekken dekke temavalg. Menyfilen løfter nå verktøyfeltet kun mens temavelgeren er åpen og gjenoppretter tidligere lag ved lukking. Ingen CSS-fil endres. Baselinefeilen dokumenteres separat i `../evidence/theme-baseline.json`.

Den nye regresjonstesten feilet på publisert kilde før rettingen. Loggen er bevart i `../evidence/menu-before.log`. Browserkontrollen sammenligner den lukkede headeren mot baseline og kontrollerer ekte peker-, tastatur- og touchhendelser, undermenylenker, eksklusiv åpning, fokus/Escape, temaer, språk, treffflater og desktopreflow tilsvarende 200 prosent zoom. Dette er ikke manuell Safari-/VoiceOver-attest.

## Samordning av eksisterende tester

- De 45 eksisterende ordinære testgruppene beholdes. Publiseringspolicyens Git-frie mutasjonsfiksturer kjører `build:source`, slik at de fortsatt prøver faktiske endrede tillatelser og ikke den låste leveransebyggeren. Menyregresjon og uavhengig kandidat-/privatgrensekontroll kommer i tillegg.
- Bibliotektesten åpner temafilterets eksisterende details-kontroll før den klikker filtrene, og krever tom CMS-seed i offentlig kandidat fremfor intern build-seed.
- Plattformtesten bruker godkjent offentlig typografi 13/10 px, ikke eldre 14/11 px.
- Releasekontrollen krever godkjent 82-sekunders film, klikkstyrt innlasting, Blob-spoling og gjenopprettet fokus. Den krever ikke den pensjonerte 38-sekundersfilmen.
- Gamle detaljerte layout-/releaseforventninger er bevart som tekst under `tests/history`, og de aktive menyinngangene peker til kontrollen for gjeldende design. Funksjonskrav om språk, tema, søk, tastatur, touch og fokus er videreført i gjeldende kontroller.
- Historiske kandidatbyggere er bevart i `scripts/history`; aktive kompatibilitetsinnganger bruker siste låste baseline. De kan ikke lenger velge eldre publiseringsgrunnlag.
- To bevaringstester bruker nå vendort baseline og låste kildehash fremfor andre lokale oppdragsmapper. Uavhengige musikk-/diagramkontroller beholdes.
- `.github/workflows` er ikke endret eller aktivert. Ingen GitHub-status eller CI-resultat er oppdatert. Denne lokale rapporten er kontrollgrunnlaget for akkurat denne kandidaten.

Eksisterende historiske Preview-/adminverktøy og deres testfiksturer er ikke en autorisasjon til bruk mot tjenestene. Gjeldende produksjonsflyt er lokal ferdigstilling og eventuelt separat godkjent direkte pakke til `modus`; ingen mellomliggende Preview.

## Risiko og videre gate

Design, faginnhold, quiz, illustrasjoner, film, lyd, lagringsnøkler, CMS-policy og Access er bevart. Funksjonsendringene er menyens bekreftende første pekerklikk og klikkbar temavelger uten overlapp. Offentlig tjeneste og administrator er ikke endret. Faglig sluttkontroll, F03-aktiviteter, språkrestanser og øvrige utviklingspakker er utenfor dette oppdraget. Eventuell senere publisering krever særskilt eier-GO til eksakt kandidat og ZIP-hash, ny kontroll av faktisk siste offentlige leveranse og rollbackgrunnlag.
