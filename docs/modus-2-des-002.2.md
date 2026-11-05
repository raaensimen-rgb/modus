# MODUS 2.0 · DES-002.2

Integrert i eksisterende prosjektmappe på `dev/modus-2-pr52`. Ingen Git-push, merge eller endring av main. Arbeidsmappens kildeendringer er ikke committet. En separat ren lokal kildekopi på samme gren ble committet og brukt til opplasting: `f119eaef777e001779739a672232b54b6ada3679` (ikke pushet). Den eksakte kildepatchen er bevart i `.local-development/des002/reviewed-source.patch`.

## Implementering

- Designpakkens 218 linjer er integrert i `home-2.css`; global `navigation.css` er urørt.
- Hovedmenyen beholdes under logoen, med bølgelinje, små rammeløse sekundærkontroller, geometriske ikoner og NO/EN uten synlige flagg.
- Én nødvendig retting utover pakken: `z-index: 3` på forsidens navigasjon, slik at sekundærkontroller ikke avskjærer trykk på åpne undermenyer.
- CSS-assetkontrollen leser nå hele siterte data-URL-er, slik at SVG-gradientens interne `url(#g)` ikke forveksles med en ekstern fil.
- Ny nettlesertest: `tests/des002-navigation-browser.cjs`.

## Lokale endringer og sikkerhetskopi

Eksisterende kildefiler hadde ingen lokale sporede endringer før integreringen. Eksisterende endringer i `dist/` er sikkerhetskopiert både som binær Git-diff og som komplett arkiv i `.local-development/des002/backup/`. Nye eksisterende dokumentasjonsmapper og `.local-development/` ble beholdt. Bygget regenererte `dist/`; opprinnelig tilstand kan hentes fra sikkerhetskopien. Rotens `wrangler.toml`, som peker på `modus`, er uendret.

## Tester

Bygg og testpakke kjørt med `MODUS_ISOLATED_PREVIEW=1`, `MODUS_PREVIEW_PROJECT=modus-2-preview`, `MODUS_CATALOG_PREVIEW=1`, `CF_PAGES_BRANCH=dev/modus-2-pr52`.

- `npm run build`: bestått.
- `npm test`: 33/33 bestått. Første kjøring uten preview-variabler ga forventningsavvik; siste kjøring brukte korrekt byggkontekst.
- `npm run test:homepage`: 28/28 nettleser/språk/bredde-kombinasjoner; tre temaer, tastatur, fokus, reelle ruter, ingen horisontal overflow. 24 axe-analyser uten WCAG A/AA-brudd. En første kjøring hadde WebKit-timeout; full gjentakelse besto.
- `node tests/des002-navigation-browser.cjs`: 20/20; Chromium/WebKit, NO/EN, 320/375/768/1024/1440 px, pil ned/Escape, berøring, undermenylenker, språkbytte, søk og visningsvalg.
- `npm run test:preview-isolation`: 142 kontroller, null backend-forsøk og null server-skriveforespørsler.
- Ren opplastingskopi: `LOCAL_ARTIFACT_GATE_PASSED`; ingen Supabase-referanser, secret-kandidater, privat innhold eller CMS-runtime. Endelig manifest SHA-256: `7140f4be00a2978fc76683d348e2bc4fd1114cf7f7b045e404d08eba21d1369b`.

## Cloudflare og publisering

Konto `d56ac50a4568da9b7995405c62d7479e`, eksisterende prosjekt `modus-2-preview`, ID `9162f418-3185-4967-a5c9-9b1d17cf8d18`, er bekreftet med API-lesekall. Ingen Git-kilde, bindings eller miljøvariabler. Separat opplastingsmappe og konfigurasjon ble brukt; bare kontrollert `dist/` ble lastet opp.

- Deployment: `ca1f7c99-87f4-456e-82d9-751e6414b8e9`.
- Cloudflare miljø: **preview**, gren `dev/modus-2-pr52`, SHA som over; status **success**.
- Fast deployment-URL: https://ca1f7c99.modus-2-preview.pages.dev
- Grenalias: https://dev-modus-2-pr52.modus-2-preview.pages.dev
- Eksisterende canonical deployment `bce267d5-0f7d-41f6-abe7-5296673a7f06` på preview-prosjektets `main` ble ikke endret.
- Produksjonsprosjektet `modus` ble bare lest. Metadatahash før/etter samsvarer: `656316b6a638b275b5b4cc443206edcbd45650071492b591f032e302e256ad2e`.
- Publisert `/` og `/en/` ga HTTP 200 i Chromium, korrekt `nb`/`en` og isolerende CSP. Den enkle Python HTTP-klienten fikk Cloudflare 1010; nettleserkontrollen besto.
- Access-policyinventar ga 403. Privat/eierbegrenset tilgang kan ikke attesteres; anonym nettleser kunne lese begge språk. Ingen Access-innstillinger ble endret.

Skjermbilder fra publisert desktop: `test-results/des002/live-nb.png`, `live-en.png`. Lokale bilder fra alle fem bredder og begge motorer/språk ligger i samme mappe. Logger, kildepatch, backup og sanitert skyevidens ligger i `.local-development/des002/`.
