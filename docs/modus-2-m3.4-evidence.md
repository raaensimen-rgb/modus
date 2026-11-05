# MODUS 2.0 – M3.4: Samlet evidenspakke for QA-001

**Kontrollert kilde-SHA:** `2f2a2c2787af9f680731dc6ed09434c1d78857ac`  
**Gren:** `dev/modus-2-pr52`  
**Repository:** `raaensimen-rgb/modus`  
**Uendret sammenligningsgrunnlag:** M3.1, `0e2e62d23e209b46077d01cea9824e6bbe6baa06`  
**Utført:** 2. november 2026, lokalt av Codex. Kontrollinstans: 05 – Kvalitetssikring og testing.

## 1. Beslutningsgrunnlag og avgrensning

Lokal sikkerhets- og regresjonsevidens er samlet. **QA-001 er ikke endelig lukket. Ingen Cloudflare-opprettelse eller deploy er godkjent gjennom denne rapporten.** Av 17 kriterier er 9 dokumentert bestått innen lokalt kontrollomfang, 7 krever ekstern verifikasjon, og M33-17 er ikke bestått fordi uttrykkelig eier-GO ikke foreligger. Dette siste er en tilsiktet autorisasjonsport, ikke en konstatert programfeil.

Ingen applikasjonskode, eksisterende tester, byggesystem, publiseringsregistre, `main`, PR #52 eller produksjonsinnstillinger er endret i M3.4. Ingen ny kodecommit er derfor opprettet; HEAD er fortsatt SHA-en ovenfor. Nye skript i evidensmappen er lokale dokumentasjonshjelpere, ikke installert applikasjonskode eller endring av testkildene. Ingen push, merge, Cloudflare-API-endring, prosjektopprettelse eller deploy er utført.

Kriteriene er hentet lesende fra **«05 – MODUS 2.0 | Kvalitetssikring og testing»**, QA-001-sluttkontrollen av 2. november. [Uttrekk av kriteriegrunnlaget](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/protocols/qa-001-source.md>). Ingen melding er sendt til fagtråden. Dette er Codex' primærbevis til kontrollinstansen; det er ikke en uavhengig godkjenning fra 05.

## 2. Pakken og sporbarhet

Evidensmappe: `test-results/m3.4-evidence/`. Den ligger under eksisterende ignore-regel for testresultater og er **ikke** del av `dist/`. Rapporten ligger separat i `docs/modus-2-m3.4-evidence.md`. Den lokale ZIP-en `test-results/modus-2-m3.4-evidence.zip` inneholder en portabel kopi av rapporten og hele evidensmappen. ZIP-en er ikke sendt eller publisert.

| Innhold | Bevis |
|---|---|
| Eksakt HEAD, gren, origin, versjoner, 484 sporede kildefilers SHA-256; tom kilde-diff | [Kildeproveniens](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/manifests/source-provenance.json>) |
| Nye kommandoer med eksplisitt SHA, miljø, start/slutt, exitkode og rålogg | [Kjøringer](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/UNIT.json>), [nettleser](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/BROWSER.json>), [forside](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/HOME.json>), [navigasjon](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/NAV.json>) |
| Alle scenario-ID-er og peker til original rad | [140 regresjons-/navigasjons-/forsideregistreringer](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/scenarios.json>) |
| Request/response/feilhendelser og HAR uten responsinnhold | [Nettverkssammendrag](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/network/summary.json>), [rå JSONL](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/network/requests.jsonl>) |
| Hele offentlige distribusjonen, ikke repository/private kilder | [339-filers artefakt](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/artifact/preview-dist.tar.gz>), [metadata](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/artifact/metadata.json>) |
| SHA-256 per distribusjonsfil, inkludert binærfiler | [Distribusjonsmanifest](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/manifests/distribution-files.json>) |
| Tidligere M3.3-logger bevart som historiske, ikke etterdatert med ny proveniens | `historical/`; brukes som bakgrunn, ferske `runs/` er primærbevis |
| Kontrollert kildeutdrag fra Git, uten private undervisningskilder eller backend-konfigurasjon | `reviewed-source/`; innholdet kan kontrolleres mot kildehashene |
| Integritet og offline-kontroll | [SHA256SUMS](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/SHA256SUMS>), [verify.py](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/verify.py>) |

Scenario-ID-ene er beskrivende ID-er tildelt i denne pakken, ikke påstått opprinnelige ID-er fra logger som manglet slike. De består av suite/motor/bredde/språk/side/feilvariant der feltene finnes. JSON-indekser er nullbaserte. En registrert rad kan inneholde flere kontroller; antall rader er ikke antall atomære assertions. Hver fersk kjøring er bundet til M3.3-SHA og det kontrollerte artefaktet; rå historiske logger merkes bare historiske.

### Offline-verifikasjon

Pakk ut ZIP-en lokalt, og kjør `python3 verify.py` i pakkens rot. Dette leser bare lokale filer: alle pakkefiler verifiseres mot `SHA256SUMS`, alle 339 tar-medlemmer mot distribusjonsmanifestet og inkluderte kildefiler mot kildehashene. Ingen avhengigheter, nettverk, utpakking av kode eller deploy kreves. SHA-256 er integritetsbevis, ikke en tredjepartssignatur. ZIP-ens egen hash leveres utenfor ZIP-en i leveransemeldingen.

Full testreproduksjon krever derimot det lokale Git-repositoriet med begge commitobjektene, prosjektavhengighetene og de private kildene som publiseringsauditen sammenligner mot. Disse private kildene pakkes **ikke** med. Node `26.13.0`, Python `3.9.6`, Playwright `1.62.1`, axe/playwright `4.14.0` og esbuild `0.25.12` er brukt. Foreslått Cloudflare-build bruker Node 22 som eksisterende CI; Node 22/Cloudflare-buildimage er ikke testet i denne lokale kjøringen.

## 3. Hvorfor 112 ble rapportert som 92

**Ingen reduksjon i tilsvarende dekning: `112 = 92 + 20`.** M3.1 samlet navigasjon med de øvrige nettleserscenarioene. M3.3 rapporterte de samme 20 navigasjonsscenarioene separat. De 142 isolasjonsregistreringene brukes ikke som kompensasjon for funksjonsdekning.

| Suite | M3.1 samlet | M3.3 felles nettlesersuite | Separat M3.3/M3.4 |
|---|---:|---:|---:|
| Release | 8 | 8 | – |
| Plattform/Atlas | 8 | 8 | – |
| Læringsreise | 8 | 8 | – |
| Publisering | 8 | 8 | – |
| Piano | 28 | 28 | – |
| Lydsignal/fallback | 32 | 32 | – |
| Navigasjon | 20 | – | 20 |
| **Samme omfang** | **112** | **92** | **20** |

[Full differanse og kildehashkontroll](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/112-vs-92.json>) viser at alle åtte relevante nettlesertestfiler er byte-identiske ved M3.1 og M3.3. [Original M3.1-oppsummering](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/historical/m3.1-summary.json>) dokumenterer tellegrunnlaget. Historisk navigasjonsresultat og ferske resultater har identiske scenarioidentiteter. **Fjernet: 0. Erstattet: 0. Bevisst utelatt: 0. Manglende: 0.** Forsidens 28 registreringer og den særskilte M3.1-kontrollprotokollen er ikke lagt inn en gang til i 112-tallet.

Alle tidligere 30 ordinære testkommandoer er bevart i samme rekkefølge, med én ny isolasjonstest først: [kommando-/dekningssammenligning](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/unit-coverage.json>). To eksisterende tester ble tilpasset i M3.3: feedback-testen forventer statisk redaktørsperre kun i isolert bygg; publiseringsfixturene fjerner de to nye isolasjonsvariablene for å teste det ordinære bygget. Ordinære assertions og publiseringsregler er beholdt. Friske normalbygg er dessuten byte-identiske med baseline.

### Alle de 20 avvikene, klassifisert enkeltvis

| Tidligere scenario-ID, retrospektivt definert | Nåværende scenario-ID | Klassifisering | Ferskt resultat |
|---|---|---|---|
| `NAV/chromium/1440/1` | `NAV/chromium/1440/1` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/1440/2` | `NAV/chromium/1440/2` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/1051/1` | `NAV/chromium/1051/1` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/1051/2` | `NAV/chromium/1051/2` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/768/1` | `NAV/chromium/768/1` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/768/2` | `NAV/chromium/768/2` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/375/1` | `NAV/chromium/375/1` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/375/2` | `NAV/chromium/375/2` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/320/1` | `NAV/chromium/320/1` | Flyttet: rapportert separat | Bestått |
| `NAV/chromium/320/2` | `NAV/chromium/320/2` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/1440/1` | `NAV/webkit/1440/1` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/1440/2` | `NAV/webkit/1440/2` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/1051/1` | `NAV/webkit/1051/1` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/1051/2` | `NAV/webkit/1051/2` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/768/1` | `NAV/webkit/768/1` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/768/2` | `NAV/webkit/768/2` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/375/1` | `NAV/webkit/375/1` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/375/2` | `NAV/webkit/375/2` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/320/1` | `NAV/webkit/320/1` | Flyttet: rapportert separat | Bestått |
| `NAV/webkit/320/2` | `NAV/webkit/320/2` | Flyttet: rapportert separat | Bestått |

Hver rad dekker både NO/EN og tre visningstemaer. Navigasjonstesten har egne zoom-/reflowvarianter; dette er ikke en attest for fysisk nettleserzoom eller skjermleserbruk.

## 4. Testkommandoer og resultater

Ferske kjøringer var nødvendige fordi flere eldre M3.3-rålogger ikke hadde samtidige SHA-/miljømetadata. Det er dokumentasjonsgapet som begrunner gjentakelsen. Applikasjonen er ikke bygget om i arbeidsmappen; eksisterende `dist` var attestert mot nøyaktig M3.3-SHA og ble kontrollert før og etter. Normalbygg ble rekonstruert i nye midlertidige mapper fra Git-arkiver, slik at arbeidskopien og andre MODUS-mapper ikke ble påvirket.

Felles isolert miljø, uten arvede produksjons-/releaseflagg:

```sh
export MODUS_ISOLATED_PREVIEW=1
export MODUS_PREVIEW_PROJECT=modus-2-preview
export MODUS_CATALOG_PREVIEW=1
export CF_PAGES_BRANCH=dev/modus-2-pr52
export PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers
unset CONTEXT MODUS_PLATFORM_RELEASE CF_PAGES_COMMIT_SHA
```

| ID | Faktisk prosjektkommando / hjelpekjøring | Resultat og logg |
|---|---|---|
| UNIT | `npm test` via `python3 test-results/m3.4-evidence/reproduce.py unit` | 31/31, exit 0; [rålogg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/UNIT.log>), [alle kommandoer og resultater](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/test-results.json>) |
| BROWSER | `npm run test:browser` via samme hjelper med `browser` | 92/92, exit 0; [rålogg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/BROWSER.log>) |
| HOME | `npm run test:homepage` via samme hjelper med `home` | 28/28, exit 0; [rålogg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/HOME.log>), [24 axe-analyser](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/homepage-accessibility.json>) |
| NAV | `node tests/navigation-controls-browser.cjs` via samme hjelper med `nav` | 20/20, exit 0; [rålogg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/NAV.log>) |
| NETWORK | `node -r ./test-results/m3.4-evidence/network/preload.cjs tests/preview-isolation-browser.cjs` | 142/142, exit 0; [rålogg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/NETWORK.log>), [resultater](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/network/isolation-results.json>) |
| PUBLICATION | `python3 tests/publication-audit.py` inngår også i `npm test` | Bestått; [manifest og audit](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/publication-audit.json>) |
| EXTENDED | `python3 test-results/m3.4-evidence/audit.py` | Alle 339 filer, 95 private fragmenter, 10 negative bygg og 55 direkte HTTP-kontroller; [audit](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/extended-audit.json>) |
| BACKEND-CONFIG | `python3 test-results/m3.4-evidence/backend-fixture.py` | Manglende config avvist; ugyldig config holdes ute; [resultat](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/backend-config-fixtures.json>) |
| COMPARE | `python3 test-results/m3.4-evidence/compare-builds.py` | Fire vellykkede bygg, to komplette identitetskontroller; [kommandoer/miljø/SHA-er](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/build-comparisons.json>) |
| GATE | `python3 preview/check-preview-artifact.py --expect-sha 2f2a2c2787af9f680731dc6ed09434c1d78857ac --report test-results/m3.4-evidence/manifests/artifact-gate.json` | Bestått ved innsamling før rapportfilen ble opprettet; [portresultat](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/manifests/artifact-gate.json>) |

Loggene for hver baseline-/target-build heter `runs/compare-<modus>-<SHA-prefix>.log`. Miljøverdier og SHA i `build-comparisons.json` er del av beviset; ikke bland normal- og isolasjonsmiljø når kommandoene gjentas.

## 5. Backend, nettverk og serverside

### Klient og observerte forespørsler

- Kontoens isolerte bundle bygges fra et eget lokalt inngangspunkt, uten Supabase-SDK eller runtime-konfigurasjon. Syntetiske utløpte access-/refresh-token, URL-callback og lagrings-/onlinehendelser ble prøvd uten at auth eller synkronisering ble aktivert. Progresjon blir lokal, og blokkert lagring har minnebasert fallback.
- Kontaktens originale nettverkshåndterer utelates. Feltene er deaktivert og forklaringen er synlig på begge språk. Nettredaktøren er statisk; ingen innlogging, adminlister, draft-/publiseringsruntime eller editor-bundle leveres. Stripe-testkasse og -portal har ingen aktiv lenke i Preview.
- Første script på alle 66 HTML-sider begrenser nettverk. HTTP-CSP og HTML-meta er også testet separat uten JavaScript-vernet, i ferske Chromium-/WebKit-kontekster.

`network/requests.jsonl` inneholder **6 787 request/response/feilhendelser**, hvorav **3 383 request-hendelser**: 3 135 mot lokal HTTP-origin, 150 Google Fonts-forespørsler som ble besvart/blokkert lokalt av testen og 98 `blob:`-hendelser uten nettverkstransport. **0 observerte backend-requestforsøk**, **0 lokale skriveforespørsler som unnslapp vernet** og **0 eksterne forespørsler videresendt av sikkerhetstesten**. Åtte HAR-filer dekker nettleserkontekstene. Bodies er utelatt; ingen ekte innlogging, credentials eller brukerdata er brukt.

Dette betyr ikke at testen aldri kalte en backend-API-funksjon: den gjorde det med vilje. Supabase-POST og de andre negative kallene ble avvist før nettleserens request-routinglag. Resultatfeltet `backend_outbound_attempts=[]` gjelder observerte nettverksforsøk, ikke antall tilsiktede JS-invokasjoner. [Fire språk-/motorbatcher](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/network/isolation-results.json>) viser 12 assertions per batch: eksternt fetch POST/GET, lokalt API, lokal POST, redirect, XHR, WebSocket, EventSource, Beacon, to skjemaveier og en positiv lokal GET.

142 registreringer består av 132 sidekontroller, 4 språk-/API-batcher, 4 uavhengige CSP-kontroller og 2 oppsummeringer for sidefeil. De rå nettverksloggene inneholder 114 avbrutte laster ved sidenavigasjon, fire bevisst blokkerte redirect-forespørsler og to blokkerte skriftforespørsler i lagringsfeilfixturene. Dette er ikke skjulte Supabase-feil. WebKits to forventede redirect-sidefeil er uttrykkelig håndtert; andre sidefeil feiler testen.

Google Fonts er en gjenværende, tillatt ekstern stil-/skriftavhengighet. En ordinær UI-visning kan kontakte disse fonttjenestene; dette er **ikke** et bevis for null tredjepartstrafikk utenfor sikkerhetstesten. CSP begrenser fontopprinnelsene, og referrer er deaktivert. Brukerinitierte eksterne faglenker beholdes. Ingen av disse er produksjonskonto-/CMS-skriveoperasjoner.

### Serverside, proxy og direkte URL-er

Distribusjonen har ingen `_worker.js`, `_routes.json`, `functions/`, CMS-serverkode, editor-runtime, backend-konfigurasjon eller bindingsfil. Den inkluderte produksjons-Wrangler-filen er kontrollert som uendret; det separate Preview-forslaget har prosjektet `modus-2-preview` og ingen bindings/secrets. Kilde-CMS eksisterer fortsatt, men er parkert og ikke med i artefaktet. `npm run build:cms-runtime` avvises i isolert modus.

Den lokale HTTP-fixturen er en skrivebeskyttet statisk server uten videresending eller backend-transport. [55 faktiske HTTP-kontroller](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/direct-http.json>) dekker private kilde-/configstier, worker/editor/API/auth/REST-stier, tom seed, statiske redaktørsperrer, 38 publiseringssperrede lærings-/artikkelruter og avvist POST. Ikke-eksisterende backend-/private ressurser gir 404, lokale skrivekall avvises, sperrede innholdsruter gir bare holdesiden. Riktig 200 på en holdeside er ikke eksponert privat fulltekst.

Dette er bevis for den lokale statiske leveransen, **ikke** serverlogger fra Cloudflare. Remote bindings, edge-workers, tredjepartsinjeksjon eller proxyfallback kan ikke sluttattesteres før et faktisk autorisert miljø finnes. M33-03 står derfor åpent for ekstern verifikasjon. Ingen RLS-/databasekall er sendt til produksjons-Supabase for å «teste» isolasjonen.

## 6. Fail-closed og negative bevis

[Ti reelle negative CLI-kjøringer](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/fail-closed.json>) stopper med exit 1: ugyldig isolasjonsverdi, manglende isolasjonsflagg, manglende/feil prosjektmarkør, manglende katalogflagg/gren, `main`, produksjonskontekst, release-flagg og separat CMS-runtime. Det eksisterende artefaktets filer/hashes er uendret etter alle disse. Hver kjøring har egen `NEG-*.log`.

[Backend-fixturene](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/backend-config-fixtures.json>) bruker kun en ny midlertidig Git-arkivkopi. Manglende `client/supabase-config.json` stanser HTML-genereringen med exit 1, og ingen isolasjonsattest skrives. Dette avdekket at bygging av kontosiden fortsatt leser flagget fra config; det ble ikke feilaktig dokumentert som en helt config-uavhengig byggkjede. Deretter ble kun en syntetisk ugyldig URL/nøkkel og `accountsEnabled=true` satt, mens produksjonsklientenes kildefiler manglet. Isolert bygg bestod, men ingen av disse syntetiske verdiene, SDK-klientene eller editor-/worker-runtime kom med. Denne uttrykkelig modifiserte fixturen er **ikke** deploykandidaten.

[12 artefaktmanipulasjoner](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/tamper-cases.json>) avvises enkeltvis: filhash, global CSP, backendreferanse, syntetisk secret, editor-runtime, privat sti, ikke-tom CMS-seed, endret guard, ubeskyttet HTML, betalingslenke, ugyldig manifest og feil godkjent SHA. Casegrunnlaget er identisk med `tests/preview-isolation.py` ved testet commit.

**Viktig grense:** når både prosjektmarkør og isolasjonsflagg er fraværende, er et ordinært bygg fortsatt tillatt for å bevare produksjonen. `MODUS_CATALOG_PREVIEW=1` alene isolerer ikke backend. Sikker publiseringsflyt krever derfor den obligatoriske SHA-/artefaktporten; et vanlig bygg mangler isolasjonsattest og kan ikke godkjennes der. Første opplasting skal bruke `prepare-reviewed-upload.sh`, som setter alle nødvendige flagg og stopper før staging hvis porten feiler. Ikke aktiver et senere automatisk Git-bygg som bare kjører et potensielt ordinært `npm run build` og hopper over artefaktporten. Automatikk er foreslått av, ikke aktivert.

Den nye rapporten er usporet dokumentasjon utenfor M3.3-commiten. Den eksisterende porten avviser slike ureviewede filer; [kontroll etter rapportopprettelse](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/post-report-gate.json>) dokumenterer den forventede dokumentasjonsblokkeringen. Ikke omgå denne med nye unntak. En senere godkjent klargjøring må kjøres fra et rent checkout av godkjent SHA, eller fra en separat gjennomgått ny commit. App-/artefaktinnholdet er uendret.

## 7. Full artefakt, private manus og secrets

- **339 filer**, **12 858 469 byte**, **222 UTF-8-filer** og 117 øvrige filer er inventert. HTML, JS, JSON, tekst/metadata, SVG, media og binærressurser inngår i filmanifestet. Ingen symlinker er tatt med i distribusjonsarkivet.
- Alle **95 private kildefragmenter** er normalisert med HTML-unescape, fjerning av markup og sammentrekking av whitespace. Samtlige er minst 80 tegn; minste lengde er 123. Alle 95 er derfor faktisk søkt etter, ikke bare telt. Ingen treff i noen av de 222 tekstfilene. [Segmentindeks, lengde og SHA-256](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/extended-audit.json>) gjør metoden etterprøvbar uten å gjengi private tekster.
- 38 private lærings-/artikkelruter er holdesider, CMS-seed er `[]`, og søkeindeksens artikler stemmer med gjeldende offentlig godkjenning. Godkjente passive katalogkort/illustrasjoner åpner ikke manus eller fulltekst. F03/studier kontrolleres i den offentlig tillatte, sperrede tilstanden; privat undervisningsruntime er ikke testet som offentlig funksjon.
- Ingen sourcemaps, `.env`, private kildekataloger, tests/docs, Git-data, config-/worker-/CMS-runtime eller andre avviste ressurser finnes i output. 110 MP3-er og én godkjent introduksjonsfilm er lokale, offentlige ressurser.
- Mønsterskanning av alle filbytes omfatter Supabase-host/nøkler, private PEM-nøkler, AWS-nøkler, GitHub-token, Stripe-secret og JWT-kandidater: **0 funn**. Manifest-/kodegjennomgang supplerer dette. Dette er ikke en garanti for alle mulige fremtidige hemmelighetsformater eller en attest av skykontoens secrets. Testkildene i evidenspakken inneholder tydelig merkede syntetiske negative eksempler, ingen ekte slike credentials.

| Kontrollobjekt | SHA-256 |
|---|---|
| `manifests/distribution-files.json` (eksakte filbytes i denne JSON-filen) | `ae5f98593db10b7372899136606d2ad7b8e98afcb32cb465b6a9d6a9ac55b621` |
| Artefaktportens kanoniske distribusjonsmanifest | `d689149414daac526dd98ad8a42b50fd82cd020007618bfc80569b1066714d1a` |
| `artifact/preview-dist.tar.gz` | `cc33e0e91ab67828673eb92ef7d1466d19dc8e43f53b5d6e68cff5567691b341` |

De to manifest-hashene har forskjellige serialiseringsformater og skal ikke være like. Portens hash beregnes av sortert `path/bytes/sha256` med kompakt, nøkkelsortert JSON; den andre gjelder den lesbare filens bytes. Isolasjonsmanifestet viser kilde-SHA og `tracked_source_dirty=false`; det lister 338 øvrige filer, mens det separate fullmanifestet også inkluderer manifestet selv, totalt 339.

## 8. Byteidentisk ordinær produksjon

Begge commitene er eksportert med `git archive --format=tar <eksakt-SHA>` til nye midlertidige mapper. Samme tilgjengelige `node_modules`, uendret låsefil og lokal runtime ble brukt. Ingen nettverksinstallasjon var nødvendig. For hvert modus ble hele filsettet sammenlignet med sortert relativ sti, byteantall og SHA-256. Ingen filer ble utelatt fra sammenligningen, og filenes timestamps ble ikke brukt som innholdsbevis.

| Modus | Miljø, isolasjonsvariabler fraværende | Baseline → M3.3 | Resultat |
|---|---|---|---|
| Ordinær produksjon | `CF_PAGES_BRANCH=main CONTEXT=production MODUS_CATALOG_PREVIEW=0`; intet release-flagg | 304 → 304 filer | Alle byte-identiske |
| Ordinært katalog-Preview | `CF_PAGES_BRANCH=dev/modus-2-pr52 MODUS_CATALOG_PREVIEW=1`; ingen produksjonskontekst | 336 → 336 filer | Alle byte-identiske |

[Fire bygg med kommando, miljø og låsefilhash](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/build-comparisons.json>) og de fire komplette manifestene i `manifests/` knytter dette til begge eksakte commitene. Dette er en ny rekonstruksjon fra Git, ikke bare en gjenbruk av det gamle feltet `identical_files`. Ordinær M3.3-funksjon hadde også 31/31 ordinære tester, 92/92 nettleserscenarioer og 28/28 forsidekontroller i M3.3; disse gamle loggene er bevart som historiske. De er ikke kjørt enda en gang i M3.4 fordi byteidentitet og uendrede testkilder gir begrunnet gjenbruk; ferske M3.4-regresjoner gjelder isolert kandidat.

## 9. NO/EN, mobil, tastatur og tilgjengelighet

Fersk automatisering: Chromium og WebKit, NO/EN, 160/320/375/768/1024/1440/1536 CSS-piksler. De fem bestilte breddene er alle representert. 28 registreringer dekker tre temaer, navigasjon/ruter, faktisk konto-rute, språkbytte, søk, film, tastatur og redusert animasjon etter testenes assertions. 24 axe-analyser har null rapporterte `violations`, men **alle 24 har `color-contrast` som `incomplete`**. Dette er et åpent manuelt kontrollpunkt, ikke en full kontrastattest.

Agentassistert interaktiv CUA-kontroll er ført separat: 10 visuelt inspiserte NO/EN-visninger og 13 direkte UI-/tastaturkontroller. [Interaktiv tastaturprotokoll](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/protocols/interactive-keyboard.json>), [bekreftede CSS-bredder](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/protocols/ui-viewport-geometry.json>) og [full manuell QA-protokoll](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/protocols/manual-qa.md>). CUA-JPEG-ene utelater nettleserkant/rullefelt; filens pikselbredde er derfor ikke det samme som `innerWidth`.

| Forespurt og bekreftet CSS-bredde | Interaktive skjermbilder | Automatisering | Menneskelig mobilkontroll |
|---|---|---|---|
| 320 px | [NO](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-nb-320.jpg>) · [EN](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-en-320.jpg>) | Begge motorer, begge språk, tre temaer | Agentobservert; menneskelig signatur avventer |
| 375 px | [NO](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-nb-375.jpg>) · [EN](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-en-375.jpg>) | Begge motorer, begge språk, tre temaer | Agentobservert; menneskelig signatur avventer |
| 768 px | [NO](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-nb-768.jpg>) · [EN](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-en-768.jpg>) | Begge motorer, begge språk, tre temaer | Agentobservert; menneskelig signatur avventer |
| 1024 px | [NO](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-nb-1024.jpg>) · [EN](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-en-1024.jpg>) | Begge motorer, begge språk, tre temaer | Agentobservert; menneskelig signatur avventer |
| 1440 px | [NO](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-nb-1440.jpg>) · [EN](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/screenshots/ui-en-1440.jpg>) | Begge motorer, begge språk, tre temaer | Agentobservert; menneskelig signatur avventer |

**Konkrete gjenværende observasjoner:** flytende kontakt-/hjelpeknapper kan visuelt overlappe nedre hero/filmlenke/kort ved enkelte scrollposisjoner (også dokumentert i M3.1); den engelske sidens nedre ARIA-gruppe har norsk navn; Atlas-søkeresultatets beskrivelse er norsk selv om ruten er engelsk. Disse er ikke rettet som del av en evidensinnsamling og er ikke nye backend-isolasjonsfeil. Ingen nytt redesign er utført.

**Ikke utført:** signert menneskelig/fysisk mobil- og tastaturtest, faktisk nettleserzoom 200 %, skjermleser og full manuell kontrastkontroll. Protokollen har konkrete trinn, forventede bevis og åpne statusfelt; ingen menneskelig signatur eller bestått-resultat er simulert. M33-12 og M33-13 står derfor åpne, selv om agent- og automasjonsbevisene er positive.

## 10. Cloudflare Access – sikker konfigurasjonsplan, ikke utført

Cloudflare dokumenterer at Preview-lenker er offentlige uten Access, og at Preview-beskyttelse ikke automatisk dekker prosjektets rotadresse eller egendefinerte domener. Det må kontrolleres per hostname. [Offisiell Pages-dokumentasjon](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

Foreslått oppsett for **kun** `modus-2-preview`:

1. Separat prosjekt og godkjent prosjekt-ID/konto; ingen produksjonsdomener, secrets, D1/KV/R2, service bindings eller backend-proxy. Ikke gjenbruk produksjonens Wrangler-prosjekt eller token.
2. Ingen automatisk produksjons- eller Preview-deploy, ingen deploy hooks eller automatisk PR-publisering. Branch `dev/modus-2-pr52`; `main` er kun prosjektets produksjonsklassifisering med produksjonsbygg avslått. Første kandidat skal være kontrollert lokal staging; grenen/SHA er ikke pushet til GitHub.
3. Access-applikasjoner/policyer må dekke både `modus-2-preview.pages.dev` og alle `*.modus-2-preview.pages.dev`-URL-er, inkludert faktisk grenalias og immutable hash-URL-er, alle paths og direkte assets. Ingen custom domains i første steg. Ikke anta at ett wildcard dekker rotadressen.
4. Bare uttrykkelig eiergodkjente enkeltidentiteter får Allow; identiteter/IdP er ennå ikke fastsatt. Forslag: 30 minutters sesjon og MFA gjennom godkjent IdP. Ingen Everyone-/domenevid Allow, ingen Bypass, ingen gjenbrukte tjenestetoken eller offentlig ressurssti. Alle andre avvises som standard. Bypass ville slå av Access-håndheving og skal ikke brukes. [Access-policyer](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
5. Access-logger, revokering og cache-/tilgangstest må dokumenteres. Fjern Allow/identitet **og** tilbakekall eksisterende applikasjons-/brukersesjoner ved sperring; bare å endre tillatelseslisten er ikke testbevis for at en tidligere sesjon straks er borte. [Sesjonsstyring](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).

Eksakt prosjekt-/buildforslag finnes i `reviewed-source/preview/modus-2-preview.project.proposed.json` og separat Wrangler-mal. Alle slike felt er **forslag**, ikke leste dashboardinnstillinger. Cloudflare-konto, faktiske policyer, permissions og byggmiljø er ikke inspisert/opprettet i dette oppdraget. Før senere GitHub-push må eksisterende tilkoblede produksjonsprosjekters automatiske triggere også undersøkes; lokal byteidentitet sier ingenting om disse triggerne.

## 11. Tilbakeføringsprosedyre og lokal øvelse

Første tiltak ved avvik skal være **steng tilgang, behold bevis, stopp videre bygg**. Ikke rull Preview tilbake til M3.1: den baselinen er egnet til produksjonssammenligning, men har backend-koblingene som M3.3 fjernet.

| Trinn | Prosedyre etter separat autorisasjon | Kontrollbevis |
|---|---|---|
| RB-CF-01 | Steng Allow for testprosjektet og tilbakekall aktive Access-sesjoner. La beskyttelsen forbli på. | Anonym og tidligere godkjent sesjon får ikke innhold på rot, alias, hash og assets |
| RB-CF-02 | Bekreft at alle automatiske bygg/hooks er av. Bevar Access-/deploylogger, deployment-ID, kilde-SHA og manifest. | Tidslinje og konfigurasjonsuttrekk uten secrets |
| RB-CF-03 | Ved første deploy finnes ingen eldre trygg Preview. Forbli stengt til ny beslutning. Senere kan kun en tidligere gjennomgått **backend-isolert** kandidat brukes; kjent lokal kandidat her er M3.3-SHA-en ovenfor. | Kontrollert kandidat + SHA-256 og ny eierautorisasjon |
| RB-CF-04 | Gjenoppretting skal gjelde bare `modus-2-preview`, med ny kontrollert opplasting/alias etter tillatelse. Endring av alias stenger ikke gamle hash-URL-er. Eventuell sletting av testdeployment krever egen autorisasjon. | Alle gamle og nye URL-er fortsatt beskyttet |
| RB-CF-05 | Kontroller at produksjonsprosjekt, domene/DNS, bindings, backend og data ikke er endret. Ingen database-reversering skal være nødvendig fordi Preview ikke skriver. | Sammenligning med forhåndsregistrert produksjonskonfigurasjon og relevante logger |

Ikke bruk Pages' produksjonsrollback som om den var en Preview-rollback: Cloudflare oppgir at Preview-deploymenter ikke er gyldige mål for den funksjonen. [Offisiell rollback-dokumentasjon](https://developers.cloudflare.com/pages/configuration/rollbacks/).

Lokal øvelse: `python3 test-results/m3.4-evidence/rollback-dry-run.py` verifiserte kjent innhold 200 → stengt lokal fixture 503 uten innhold → samme tidligere gjennomgåtte bytes 200. [RB-01 til RB-03, faktiske resultater](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.4-evidence/runs/rollback-local.json>). Originalt `dist` og produksjon var uendret. Dette er kun en lokal tilgjengelighetsøvelse; den attesterer ikke Access-revokering, edge-cache eller faktisk Cloudflare-tilbakeføring. Derfor er M33-16 fortsatt ekstern.

## 12. Kontroller som først kan lukkes etter autorisert miljøopprettelse

Alle punktene nedenfor er **ikke kjørt**. Miljøopprettelse krever egen eierautorisasjon; deploy krever en ny, særskilt GO etter at beskyttelsen er klargjort. Ingen offentlig testdeploy anbefales.

| Fremtidig ID | Når | Kontroll og forventet resultat |
|---|---|---|
| CF-01 | Etter autorisert opprettelse, før innhold | Faktisk konto/prosjekt-ID/navn, ingen prod-domener, bindings/secrets, proxy eller server-runtime; eksport uten hemmelighetsverdier |
| CF-02 | Før innhold | Rot, wildcard, gren-/hash-URL-er og assets dekket av riktig Access-applikasjon; streng identitetsliste/IdP/MFA/sesjon, ingen bypass |
| CF-03 | Før/etter beskyttet deploy | Incognito uten cookies avvises/omdirigeres til Access uten å motta HTML, JS, JSON, media eller andre beskyttede bytes; test NO/EN og direkte assets |
| CF-04 | Etter beskyttet deploy | Godkjent identitet får rett innhold; innlogget, ikke-godkjent identitet avvises |
| CF-05 | Etter beskyttet deploy | Tilbakekall tidligere godkjent sesjon og fjern tillatelsen; kontroller ny forespørsel, tidligere fane, direkte assets og flere klienter; loggfør faktisk håndhevingstid |
| CF-06 | Etter beskyttet deploy | Faktiske responseheaders/CSP/no-store/noindex på alle rutetyper; ingen worker-/fallback-respons som omgår statisk grense |
| CF-07 | Etter beskyttet deploy | Gjenta nettverks-/negative tester mot beskyttet origin; ingen produksjonsbackend-trafikk i nettleser eller eventuell faktisk edge-runtime |
| CF-08 | Etter beskyttet deploy | Hent manifest fra autorisert sesjon; verifiser nøyaktig godkjent SHA og filhashene; ikke godta bare branchlabel/deploynavn |
| CF-09 | Under tilgangs-/tilbakeføringsøvelse | Bekreft at gamle immutable hash-URL-er, grenalias, rot og assets er stengt, ikke bare «nyeste» URL |
| CF-10 | Hvis Cloudflare/Git bygger | Test faktisk Node 22/buildimage, riktig metadata og fail-closed-artefaktport; alle automatiske bygg forblir av til egen godkjenning |
| CF-11 | Før og etter isolert deploy/tilbakeføring | Sammenlign produksjons-DNS/prosjekt/bindings/triggere og relevante backendlogger med registrert baseline, uten å sende testskriv til produksjon |
| CF-12 | Før eventuell videre bruk | Menneskelig QA-protokoll signert, åpne observasjoner vurdert, 05 etterkontrollerer pakken, og prosjekteier gir uttrykkelig og avgrenset GO |

Anbefalt neste handling er dokumentbasert etterkontroll av denne pakken hos 05, ikke prosjektopprettelse eller deploy. Ingen tillatelse er utledet fra rapporterte beståtte tester.

## 13. Endelig matrise M33-01–M33-17

«Bestått med dokumentasjon» gjelder det oppgitte **lokale** bevisomfanget. Cloudflare-status og menneskelige signaturer er aldri utledet fra lokale tester.

| ID | QA-001-kontrollpunkt | Status | Dokumentasjon og grense |
|---|---|---|---|
| M33-01 | Ingen produksjons-Supabase-trafikk | **Bestått med dokumentasjon** | 142/142; rå request-logg + 8 HAR, 0 backend-requestforsøk. Gjelder testet lokal origin; CF-07 gjenstår i skyen. |
| M33-02 | Endepunkter, konfigurasjon og workers | **Bestått med dokumentasjon** | 339-filers audit, ingen SDK/config/editor/worker/functions i output; kontrollert kildeutdrag og separat Preview-mal. |
| M33-03 | Ingen produksjonsfallback via proxy/binding | **Krever ekstern verifikasjon** | Lokalt statisk output/server uten proxy eller binding er kontrollert; faktiske Cloudflare-innstillinger/edge-runtime er ikke tilgjengelige. CF-01/06/07. |
| M33-04 | Fail-closed ved feil konfigurasjon | **Bestått med dokumentasjon** | 10 negative bygg, manglende backend-config uten attest, ugyldig config ute av artefaktet, 12 portmanipulasjoner; obligatorisk port også når ordinært bygg er valgt. |
| M33-05 | Private manus og sperret innhold ute | **Bestått med dokumentasjon** | 95/95 søkte hashidentifiserte fragmenter uten treff, 38 holdesider, tom seed, korrekt søkeindeks; hele output kontrollert. Ingen generell attest av ukjent privat innhold. |
| M33-06 | Ingen secrets eller sensitive nøkler | **Bestått med dokumentasjon** | Alle filbytes skannet, 0 aktuelle mønsterfunn; kilde-/artefaktgjennomgang. Ingen attest av fremtidig skykontos secrets. |
| M33-07 | Direkte URL/API kan ikke omgå sperrer | **Bestått med dokumentasjon** | 55 direkte lokale HTTP-kontroller, API-/skjemanegativer og uavhengig CSP. Faktisk hosting-/Access-bypass må gjentas via CF-03/06/07. |
| M33-08 | Cloudflare Access konfigurert | **Krever ekstern verifikasjon** | Konkret plan foreligger; ikke opprettet eller konfigurert. CF-01/02. |
| M33-09 | Anonym tilgang avvist | **Krever ekstern verifikasjon** | Krever beskyttet autorisert miljø og faktiske URL-/assettester. CF-03/09. |
| M33-10 | Godkjent tilgang og tilbakekalling | **Krever ekstern verifikasjon** | Krever faktiske identiteter, policyer og sesjoner; ingen ekte innlogging utført. CF-04/05. |
| M33-11 | NO/EN i isolert modus | **Bestått med dokumentasjon** | Begge språk i 31/112/28/142-kontrollomfanget; CUA-skjermbilder/protokoll. To mindre språkavvik er dokumentert og ikke skjult. |
| M33-12 | Manuell mobilkontroll | **Krever ekstern verifikasjon** | Fem bredder på begge språk automatisert og agentobservert med skjermbilder; fysisk/menneskelig mobil-QA ikke signert. HUMAN-MOB-01/02. |
| M33-13 | Manuell tastaturkontroll | **Krever ekstern verifikasjon** | 13 agentstyrte UI-kontroller og automatiserte kontroller; menneskelig tastatur/skjermleser/reell zoom/kontrast avventer. HUMAN-KB-01/02 og HUMAN-A11Y-01. |
| M33-14 | Fag- og spillfunksjoner håndterer isolasjon | **Bestått med dokumentasjon** | Samme 112 scenarioer bevart; Jam/Harmoni/piano/lyd/Atlas, reise, lokal progresjon, ruter og private F03-/artikkelsperrer kontrollert. Ingen privat undervisning er åpnet for å bestå testen. |
| M33-15 | SHA, bygg og testsporbarhet | **Bestått med dokumentasjon** | Eksakt M3.3-SHA, rålogger, scenario-ID-er, 339-filers snapshot, kildehash, to fullstendige byteidentitetskontroller og offline-verifikator. Uavhengig 05-gjennomgang gjenstår. |
| M33-16 | Dokumentert tilbakeføring | **Krever ekstern verifikasjon** | Prosedyre, kjent isolert kandidat og lokal 200→503→200-øvelse foreligger. Faktisk Access-revokering/Cloudflare-stenging og produksjonsuendret må testes eksternt. |
| M33-17 | Uttrykkelig eier-GO før deploy | **Ikke bestått** | Ingen eier-GO for opprettelse eller deploy foreligger. Porten holdes lukket; dette er en autorisasjonsblokkering, ikke en testfeil. |
