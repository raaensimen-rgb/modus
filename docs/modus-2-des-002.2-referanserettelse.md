# DES-002.2 – retting mot godkjent bilde, 3. november 2026

**Status: implementert og testet lokalt. Publisering stoppet fordi tilgangsbeskyttelsen ikke kunne verifiseres. Ingen oppdatert Preview er publisert.**

## Visuell fasit og resultat

Fasit er brukerens `a_sleek_high_contrast_dark_green_teal_ui_hero_hea.png`, SHA-256 `7595b68b36f6a6228c184f4323fc5409c2fd0bcc15a36a409122afb56d4f1bed`. Filen er lest og sammenlignet visuelt med faktisk nettlesergjengivelse, ikke med en illustrasjon av implementasjonen.

Den korrigerte forsiden har:

- Større desktop-identitet og fremtredende HJEM, STUDIER, SPILL, MITT MUSIKKATLAS, ARTIKLER og OM MODUS.
- Vesentlig mindre MODUS+, LOGG INN, NO, EN, SØK og VISNING under hovedmenyen.
- Små diamantbaserte SVG-linjeikoner over etikettene, i samme geometri som referansen. Ikonets diamant er ikke en ramme rundt kontrollens trefflate.
- Ingen flagg i forsidens genererte kontrollmarkup, ingen gamle knapperammer eller pseudo-elementrammer. Diskrete vertikale skiller og turkis/gulgrønn glød.
- Minst 44 × 44 CSS-piksler trefflate, synlig tastaturfokus og tydelig valgt språk også når glød er deaktivert i lese-/høykontrasttema.
- Mobiloppsett som bryter kontrollene over flere rader. Ingen endring av ruter, søk, språkfunksjon eller temavelger.

Hovedmeny/ordmerke/bølge/fjell er fortsatt HTML/CSS og prosjektets eksisterende vektor-/naturassets. Referansebildet er ikke lagt inn som erstatning for ekte navigasjon. Verktøysider og de andre lokale forbedringene er ikke publisert.

## CSS- og adressefeilen

En vanlig anonym Chromium-kontekst fikk HTTP 200 på de undersøkte eksisterende adressene før Access-forhåndskontrollen. Ingen alternativ autentisering ble brukt.

| Adresse | Faktisk observert CSS |
|---|---|
| `https://modus-2-preview.pages.dev` | Gammel hoveddeployment; `home-2.css` uten DES-002.2, SHA-256 `4a843d2c85f732b1023f6c1b73e108c68a03a570221e7853bdab95be20186c16`. Innrammede kontroller og flagg. |
| `https://dev-modus-2-pr52.modus-2-preview.pages.dev` | Tidligere DES-preview; `home-2.css` med DES-002.2, SHA-256 `68251889ffda29daa8197daa5a516166a4eb4c7ce0fbea780a6923583257e870`. |
| `https://ca1f7c99.modus-2-preview.pages.dev` | Samme tidligere DES-fil som grenadressen. |

Dermed er det dokumentert en forskjell mellom hoveddeployment og grenpreview, ikke bare en antatt nettlesercachefeil. Det er ikke endret på hoveddeploymenten eller `main` for å få rotadressen til å vise grenpreviewen.

I det korrigerte lokale bygget lastes forsidens CSS **etter** felles navigasjon og søk, med filnavnet `home-2.a776fe6c16.css`. SHA-256 for filinnholdet er `a776fe6c164fc14318fab2f44f6e39699edc82988a2ddda51e17b7f9ecd67e0a`. Nettlesertesten kontrollerer at filen faktisk lastes, at innholdet stemmer med hashen i URL-en, og at den er siste stilark på både norsk og engelsk. Dette forhindrer gjenbruk av en gammel CSS-URL etter en senere autorisert deployment.

## Tilgangsbeskyttelse: publiseringshindring

Lesende kontroll kl. `2026-11-03T06:22:56 UTC`:

- Riktig konto/prosjekt: `modus-2-preview`, ID `9162f418-3185-4967-a5c9-9b1d17cf8d18`. Prosjektlesing fikk HTTP 200.
- `GET /accounts/d56ac50a4568da9b7995405c62d7479e/access/apps`: **HTTP 403**, Cloudflare-feilkode **9999**.
- Access-policyenes omfang, eiertillatelse og håndheving kan derfor ikke attesteres. Anonym HTTP 200 fra den tidligere nettleserkontrollen er ikke bevis på beskyttelse.
- Arbeidet stoppet før opplasting/deploy. Ingen credential refresh, ny autentisering, token-/rettighetsutvidelse, Access-endring eller omgåelse ble forsøkt.

Dette følger brukerens uttrykkelige instruks om å stoppe publiseringen dersom tilgangsbeskyttelsen ikke kan verifiseres. Før en senere deployment må autorisert lesetilgang gi innsyn i relevante policyer, og root-, gren- og hashadresser må ha verifisert ønsket beskyttelse. Det er ikke brukt en offentlig testdeployment for å komme rundt hindringen.

## Filendringer og bevaring

- `home-2.css`: referansens størrelseshierarki, ikoner over tekst, skiller/glød, tematilpasning og responsive trefflater.
- `scripts/site_navigation.py`: bare forsidens genererte kontroller får dekorative, skjulte-for-skjermleser SVG-er; flagg fjernes fra forsidens markup. Forside-CSS versjoneres etter innhold og lastes sist.
- `tests/homepage.cjs`: krever det versjonerte stilarket.
- `tests/des002-reference-browser.cjs`: ny målrettet kontroll av faktisk gjengivelse, CSS-hash, rammer/flaggsymboler, ikonplassering, treffflater, temaer, tastatur, søk og språkbytte.
- `tests/navigation-controls-browser.cjs`, `tests/platform-browser.cjs`: designforventninger oppdatert til større hovedmeny og mindre, lettere sekundærkontroller.

Eksisterende lokale endringer er beholdt. Førtilstanden er lagret i `.local-development/des002-correction/`; tidligere kilde- og dist-sikkerhetskopier er bevart. Grenen er fortsatt `dev/modus-2-pr52`, HEAD `e54572dda08b425301f6943fae54af56f38316eb`. Endringene er ukommitterte og ikke pushet. Eksakte kildefilhashverdier ligger i `source-manifest.json` i samme lokale evidensmappe.

## Tester

Bygg og ordinære tester bruker isolert preview-kontekst: `MODUS_ISOLATED_PREVIEW=1`, `MODUS_PREVIEW_PROJECT=modus-2-preview`, `MODUS_CATALOG_PREVIEW=1`, `CF_PAGES_BRANCH=dev/modus-2-pr52`.

| Kontroll | Resultat |
|---|---|
| Isolert `npm run build` | Bestått |
| `npm test` | 37/37 bestått |
| `node tests/des002-reference-browser.cjs` | 20 motor/bredde/språk-kombinasjoner; 320, 375, 768, 1024 og 1440 px; Chromium og WebKit; tre temaer. Alle bestått. |
| Axe i referansetesten | 24 WCAG A/AA-analyser; ingen rapporterte brudd |
| `node tests/navigation-controls-browser.cjs` | 20 motor/bredde/zoom-kombinasjoner bestått, begge språk og tre temaer, 100/200 % reflow |
| `npm run test:preview-isolation` | 142 kontroller; null backend-forsøk og null server-skriveforespørsler |
| `git diff --check -- ':!dist'` | Bestått |

## Skjermbilder og evidens

**Lokalt rettet, ikke publisert:**

- `test-results/des002-correction/chromium-header-nb.png`: faktisk gjengitt desktop-header på norsk.
- `test-results/des002-correction/chromium-header-en.png`: desktop-header på engelsk.
- `test-results/des002-correction/chromium-1440-nb.png`: desktop i sidekontekst.
- `test-results/des002-correction/chromium-320-nb.png`, `webkit-375-en.png`: mobil på norsk/engelsk.

**Eksisterende publisert, før rettingen:** `before-root.png`, `before-branch.png`, `before-hash.png`. Disse må ikke fremstå som skjermbilder av en ny deployment.

CSS-/adresseloggen ligger i `before-live.json`, tilgangshindringen i `access-preflight.json` og målrettede testresultater i `results.json`, under `test-results/des002-correction/`.

DES-002.2 er ikke markert ferdig publisert. Gjenstående steg er verifisert tilgangsbeskyttelse, deretter én isolert deployment til eksisterende grenpreview og nye skjermbilder fra den faktisk oppdaterte nettadressen.
