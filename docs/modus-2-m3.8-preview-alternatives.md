# MODUS 2.0 – M3.8: Preview uten Access eller ny betalingsmetode

**02.11.2026 · Til 00 – Prosjektledelse · Kun undersøkelse og dokumentasjon.**

**Anbefaling: bruk lokal, loopback-begrenset forhåndsvisning nå, og behold `modus-2-preview` tomt.** Det krever ingen ny tjeneste, betalingsmetode, autentiseringskode eller endring av produksjonen. Ved senere behov for ekstern testing kan eksisterende, godkjent SSH-/VPN-tilgang vurderes separat. Ingen løsning er aktivert i M3.8.

## Kort sammenligning

| Alternativ | Beskytter faktisk innhold? | Kostnad og begrensning | Vurdering |
|---|---|---|---|
| Pages som rent statisk prosjekt uten Access | Ingen dokumentert innebygd alternativ innloggingskontroll funnet som dekker både rot, assets og alle deployment-URL-er | Ingen ny auth-kostnad, men ingen adgangssperre | Ikke egnet for beskyttet publisering |
| Egen serverautentisering i Pages Functions | Mulig dersom hver forespørsel og hver deployment går gjennom kontrollen før assets leveres | Potensielt 0 USD innen Workers Free; faktisk plan og eventuelle betalingskrav er ikke bekreftet. Ny serverkode, secrets og omfattende tester kreves | Et mulig senere utviklingsoppdrag, ikke publiseringsklart |
| Lokal server på `127.0.0.1`, kun godkjent `dist/` | Ingen direkte nettverkstilgang fra andre maskiner når korrekt bundet og uten videresending | 0 i nye tjenestekostnader; andre lokale brukere/prosesser kan nå serveren | **Anbefalt nå**, på prosjekteiers kontrollerte maskin |
| Lokal server via eksisterende autentisert SSH/VPN | Kan begrense tilgang til eksplisitt godkjente nøkler/identiteter og porter | Ingen ny tjeneste nødvendig dersom infrastrukturen allerede finnes; faktisk tilgjengelighet/kostnad må avklares | Mulig senere for flere enheter; ikke offentlig LAN-/tunnelpublisering |

Cloudflare dokumenterer Access som Pages sin Preview-adgangskontroll. Den vanlige Preview-innstillingen dekker ikke rotadressen alene, og gamle hash-URL-er kan bestå. `_headers`, redirects, `noindex` og hemmelige URL-er er ikke alternativ autentisering. En beskyttet reverse proxy foran en ellers offentlig Pages-origin ville fortsatt etterlate direkte Pages-/hash-adresser som omgåelsesvei. [Pages-dokumentasjon](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

## Serverhåndhevet alternativ – hva som faktisk måtte bygges

En liten **HTTP Basic-kontroll over HTTPS i en separat Pages Function** er teknisk mulig. Kontrollen må skje på serveren før `ASSETS` kan levere noe, ikke i frontend-JavaScript. Advanced mode kan ta hånd om alle innkommende forespørsler; en vanlig root-middleware kan også ligge foran statiske filer, men ruteunntak må kontrolleres. Hver root-, hash- og grenversjon må inneholde samme godkjente vern. En ny deployment beskytter ikke automatisk en eldre ubeskyttet versjon. [Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/) · [Middleware](https://developers.cloudflare.com/pages/functions/middleware/).

Minimumskrav ved et senere mandat:

- HTTPS før autentisering; et langt, tilfeldig, unikt Preview-passord. Serversjekk med konstanttidssammenligning og ingen standard-/reservepassord. Manglende secret skal avvise tilgang. Hemmeligheten oppbevares som serverside secret, aldri i HTML, JS, URL, kildekode, statiske miljøfiler eller offentlige manifest. Authorization/cookies/passord må skjules i logger og testopptak. [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
- Alle paths/metoder må være beskyttet, inkludert direkte JS/JSON/bilder/media, HEAD og Range-GET. Ingen offentlige asset-unntak eller autentiseringscache som kan levere godkjent respons til en anonym bruker. Avvisning må skje før assetoppslag; ingen feilbehandler må gi assets som reserve.
- Basic Auth gir ikke identitetsbekreftelse, SSO, MFA eller sikker individuell utlogging. En delt/utlevert hemmelighet kan brukes av andre. Nettleseren kan huske credentials; rotasjon og stenging må prøves mot **alle** fortsatt tilgjengelige deployment-URL-er, ikke bare nyeste versjon. Cloudflares Basic-eksempel er uttrykkelig et eksempel, ikke produksjonsklar autentisering. [Basic Auth](https://developers.cloudflare.com/workers/examples/basic-auth/).
- Kvotebrudd, CPU-/runtimefeil, manglende secret, malformed auth, caching og direkte URL-er må gi avvisning/feil, aldri offentlig innhold. Ingen eksisterende CMS-worker skal gjenbrukes: den er parkert og hører til den backend-koblingen som ble fjernet fra Preview.

**Konkret blokkering i dagens prosjekt:** en GET-kontroll kl. `2026-11-02T20:44:57.392123+00:00` viser `fail_open=true` i både preview- og production-konfigurasjonen. Det er ikke endret. Cloudflare oppgir at fail-open ved brukt Functions-gratiskvote kan levere statiske assets uten å kjøre funksjonen; sikker autentisering krever fail-closed. Ekskluderte ruter kan også hoppe over funksjonen. Plattformens feil-/asset-fallback må verifiseres, ikke bare normal 401-respons. [Routing og fail modes](https://developers.cloudflare.com/pages/functions/routing/) · [Dokumenterte feilbegrensninger](https://developers.cloudflare.com/pages/platform/known-issues/).

[Lesende prosjektbevis](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.8/pages-read-only.json>). `usage_model=standard` i responsen er et konfigurasjonsfelt, **ikke bevis for betalt eller gratis kontoplan**.

Dagens kildeversjon fjerner `_worker.js`, og artefaktporten avviser worker-/functions-/routes-runtime. En autentiseringsworker kan derfor ikke legges til den godkjente pakken i etterkant. Det ville kreve separat godkjent kildeendring, presis auth-only tillatelse i bygg/audit, ny SHA, nytt manifest og nye regresjons-/lekkasje-/fail-closed-tester. Produksjonsbyggingen og backend-isolasjonen skal fortsatt være uendret.

## Kostnader

Pages Functions bruker Workers-kvoter. Workers Free har offentlig oppgitt grense på 100 000 forespørsler per dag, delt på kontoen, og 10 ms CPU per kall. Når autentisering må kjøre før alle assets, vil også disse forespørslene belaste funksjonskvoten; bottrafikk kan bruke opp kvoten og stenge en korrekt fail-closed-testside. Workers Paid starter på 5 USD/måned med mulig forbruksbetaling; det er ikke et anbefalt eller godkjent kjøp. [Pages Functions-prising](https://developers.cloudflare.com/pages/functions/pricing/) · [Workers-priser](https://developers.cloudflare.com/workers/platform/pricing/) · [Grenser](https://developers.cloudflare.com/workers/platform/limits/).

0 USD for en slik skyløsning er dermed **betinget av faktisk Workers Free-tilgang uten ny betalingsmetode**, tilstrekkelig kvote og eiergodkjent konfigurasjon. Dette er ikke bekreftet på kontoen, og må ikke utledes fra at Free finnes i prislisten. Ingen Zero Trust-aktivering, Workers-oppgradering eller betalingsregistrering er utført.

## Anbefalt neste handling

Fortsett eier-/QA-gjennomgang av eksisterende isolerte artefakt **lokalt**, og avklar menneskelig mobil-, tastatur- og kontrastkontroll. Serveren skal bare eksponere godkjent `dist/`, aldri repository, `.git`, miljøfiler, evidensmapper eller private innholdskilder. Loopback er en nettverksavgrensning, ikke innlogging per lokal bruker; bruk en kontrollert maskin/OS-konto uten offentlig proxy, portåpning eller tunnel.

Den eksisterende lokale QA-serveren fra M3.4 binder `127.0.0.1:8764`, serverer bare `dist/` og legger på de bygde HTTP-headerne. Den kan gjenbrukes ved en senere avtalt lokal gjennomgang. En vanlig `http.server` må også bindes eksplisitt til loopback, og håndhever ikke Pages sin `_headers`-fil; det er en begrensning ved header-testing. Python-serveren er ikke egnet som offentlig produksjonsserver. [Python-dokumentasjon](https://docs.python.org/3.9/library/http.server.html).

Ved testing fra telefon/annen maskin: bruk bare en separat godkjent privat forbindelse med nøkkel-/identitetskontroll og begrenset porttilgang. Ikke endre bind-adressen til `0.0.0.0` og dele en ubeskyttet LAN- eller offentlig tunnel-URL som erstatning for autentisering. Ingen server eller tunnel er startet her. Google Fonts er fortsatt en ekstern leseavhengighet; lokal visning er ikke automatisk helt offline.

`modus-2-preview` beholdes uten innhold. Hvis en nettadresse senere blir nødvendig, bør et nytt mandat først gjelde implementering og lokal negativtesting av serverautentisering, kostnadsavklaring og QA-vurdering. Det skal ikke omfatte deploy automatisk.

## Påvirkning på samtlige QA-001-kriterier

Ingen eksisterende evidens er omdefinert til en ny bestått skytest. Et alternativ til Cloudflare Access krever godkjent endring/akseptert avvik i de Access-spesifikke kriteriene.

| Kriterium | Konsekvens |
|---|---|
| M33-01 Ingen produksjons-Supabase | Lokal isolasjon beholdes. Ny auth-runtime må vise kun godkjent assettilgang, ingen produksjonskall. |
| M33-02 Endepunkter/config/workers | Lokal kandidat er fortsatt statisk. Functions-alternativet endrer forutsetningen og krever ny kilde-/byggaudit. |
| M33-03 Ingen proxy/binding-fallback | Privat forbindelse må ende i loopback-serveren. Skyalternativ må ikke ha offentlig origin-/asset-omgåelse eller produksjonsbindinger. |
| M33-04 Fail-closed | Lokal bind-/tilgangsavgrensning må kontrolleres. Functions er blokkert med dagens fail-open; kvote- og feiltester kreves. |
| M33-05 Private manus ute | Behold samme publiseringsaudit og bare godkjent `dist/`. Autentisering gir ingen tillatelse til å ta med privat manus. |
| M33-06 Ingen secrets | Lokal eiergjennomgang trenger ingen nye websecrets. Basic krever kontrollert serversecret og dokumentert fravær fra assets/logger. |
| M33-07 Direkte URL/API-sperrer | Loopback skal ikke nås eksternt. I skyen må rot, alle hash-/alias-adresser og direkte assets testes med manglende/feil auth. |
| M33-08 Cloudflare Access konfigurert | Oppfylles ikke når Access velges bort. QA/eier må formelt godkjenne et annet kontrollmål; ikke merkes bestått automatisk. |
| M33-09 Anonym tilgang avvist | Lokal/privat tilgang må verifiseres i valgt nettverksomfang. Basic må avvise før innhold på alle adresser. Ikke testet i M3.8. |
| M33-10 Godkjent tilgang/revokering | OS-/SSH-/VPN-identitet kan dokumenteres der det brukes. Basic-passord er ikke bekreftet personlig Cloudflare-identitet; rotasjon/utlogging er svakere og krever akseptert avvik/test. |
| M33-11 NO/EN | Eksisterende lokale resultater beholdes. Eventuell auth må fungere for begge språk og ressursruter. |
| M33-12 Manuell mobilkontroll | Fortsatt åpen. Fysisk mobil trenger godkjent privat forbindelse eller lokal enhetsgjennomgang; viewport-emulering alene lukker ikke kriteriet. |
| M33-13 Manuell tastaturkontroll | Fortsatt åpen. Eventuell native Basic-dialog/ny loginflyt må inkluderes i tilgjengelighetstesten. |
| M33-14 Fag-/spillfunksjoner | Samme isolerte verktøy kan vurderes lokalt. Ny auth krever ny kontroll av lyd/video, Range-requests, søk og lokal progresjon. |
| M33-15 SHA og sporbarhet | Gjeldende kandidat er fortsatt `2f2a2c2787af9f680731dc6ed09434c1d78857ac`. Ny serverkode må få ny commit, manifest og relevante tester. |
| M33-16 Tilbakeføring | Lokal server/tunnel kan stenges. Basic-rotasjon må dokumentert stenge også gamle deployment-versjoner; ikke likestilles med Access-revokering uten test. |
| M33-17 Eier-GO før deploy | Fortsatt lukket. Denne undersøkelsen gir ikke publiseringstillatelse, heller ikke med et alternativt vern. |

**Ingen kode, Cloudflare-konfigurasjon, GitHub eller produksjon er endret. Det er kun lest dokumentasjon, eksisterende kilder og prosjektmetadata samt skrevet denne vurderingen.**
