# RED-004 – Integrert fag-, kilde- og rettighetskontroll

Til 00 – Prosjektledelse, 04 – Nettredaktør, 03 – Faglig kontroll og 05 – Kvalitetssikring. Dato: 03.11.2026.

## Baseline og leveranse

Arbeidet er utført lokalt på `dev/modus-2-pr52`. Baseline/forelder er verifisert: `8f386b54b207ae16bd92af379c673508c8ef6214`. Leveranse-SHA står i leveransemeldingen og i QA-arkivets `delivery.json`; rapportens egen commit finnes med `git log -1 --format=%H -- docs/modus-2-red-004.md`.

Eksisterende endringer i generert `dist/`, tidligere rapporter og QA-pakker er beholdt. Ingen nye grener eller endringer i eksisterende registre, Auth, RLS, SDK-konfigurasjon, publiserings-RPC eller produksjonsinnstillinger er gjort. Nye funksjoner er frontend-/modellkode og et eksplisitt lokalt eksportverktøy, ikke en backendbinding.

## Kartlagte registre og myndighetsgrenser

| Eksisterende kilde | Faktisk rolle i RED-004 |
| --- | --- |
| `editorial/article-publication-review.json` | 16 artikkelgjennomganger, avgrensede dokumentasjonsreferanser og egne NB/EN-kildehash. Ikke fullført fag-/rettighets- eller publiseringsgodkjenning. Referanser og kontrollstatus kan vises som lokalt innlastet grunnlag. |
| `content/publication.json` | Eksisterende Git-basert publiseringsmyndighet. Leses som kontekst; endres ikke. En lokal registrering kan aldri endre policyen. |
| `content/article-illustration-permissions.json` | Eksakte bilde-SHA-er og referanser for et begrenset Preview-omfang. Samsvarende bytes og referanse/omfang er ikke en generell lisens eller fulltekstgodkjenning. |
| `content/article-card-permissions.json` | Versjonsbundet tillatelse til passive katalogmetadata, ikke artikkeltekst eller medier generelt. Visning beholder dette skillet og egne versjonshasher. |
| `content/curriculum/quality-register.json` | Modulbasert kvalitetsregister med 24 moduler, fire separate gater og plass for kilder. Nå har ingen modul registrerte kilder. Dekker ikke artikkel-/språk-/CMS-versjonsbundet dokumentasjon. Ingen modulstatus overføres til artiklene. |
| `content/curriculum/competence-map.json` | Kandidatkoblinger og kompetansegrunnlag; ikke artikkelgodkjenning. |
| `content/atlas-links.json` | Koblinger mellom artikler, moduler og atlas. Eldre «published»-markører tolkes ikke som publiseringsmyndighet. |
| `content/upcoming-articles.json`, språkregistrene | Planlegging og oversettelses-/tekstgrunnlag, ikke kilde-/lisensregister eller godkjenning. |

Det finnes dermed ikke en eksisterende komplett lokal artikkelform for opphav, støttet påstand, lisens, kreditering, kontrollstatus og avvik bundet til en CMS-innholdsversjon. Den nye dokumentasjonsformen fyller dette avgrensede hullet uten et nytt autoritativt register.

## Kontrollvisning og registerinnlesing

En kontrollseksjon er integrert i eksisterende nettredaktør, per `(slug,locale)`. Den viser faglig status, kildekontroll, medierettigheter, dokumentasjonsreferanser, avvik, lokalt vurdert fingeravtrykk, eksisterende registerhash og lokale registreringer. Den gjenbruker artikkelmodell og statusadapter gjennom `cms/review-model.mjs`.

Manglende, ugyldig, utdatert eller ikke sikkert koblet dokumentasjon vises som **Ikke vurdert**. En uferdig registerverdi som «Under vurdering» vises som registrert bakgrunnsopplysning, ikke som gjennomført kontroll av gjeldende CMS-versjon. Ingen fag-/rettighetsgodkjenning konstrueres fra personlig mestring, fritekst, tilstedeværelsen av en referanse eller en lokal «checked»-verdi.

Registrene inneholder private vurderingsopplysninger og kan derfor ikke bygges inn i offentlig seed/bundle. Brukeren oppretter en eksplisitt lokal kopi:

```sh
npm run editor:review-context
```

Verktøyet leser de fire artikkelregistrene og skriver en ny, eksklusivt opprettet fil med modus `0600` under `.build-private/editor-review-<tidspunkt>.json`. Eksisterende filer overskrives ikke. Kopien inneholder registermetadata og SHA-256 for inngangsregistrene, ikke artikkelmanus eller Auth-konfigurasjon. Den er ikke del av `npm run build`.

Velg deretter filen under «Last inn lokalt registergrunnlag» i redaktøren. Den lastes **bare i minnet**; ingen opplasting, register-HTTP-endepunkt eller ny API er lagt til. En innlastet fil er ikke autentisert som godkjenningsmyndighet. Skjult kontrollvisning tømmes ved bytte/utlogging, og registerkontekst beholdes ikke over en endret brukeridentitet. Ingen Auth-kode eller Auth-kall er endret.

## Lokal dokumentasjonsmodell

Egen, bruker-/artikkel-/språknavngitt localStorage-nøkkel:

```text
modus.editor.review-draft.v1.<user-id|preview>.<locale>:<slug>
```

Formen er adskilt fra artikkelpayload, seed og publisering:

```json
{
  "schema_version": 1,
  "kind": "modus-local-review-draft",
  "slug": "synthetic-review",
  "locale": "nb",
  "authoritative": false,
  "entries": [{
    "type": "source",
    "status": "checked",
    "algorithm": "modus-editor-content-v1",
    "contentFingerprint": "<64 hex-tegn>",
    "resource": "Syntetisk kildeverk",
    "creator": "Syntetisk forfatter",
    "reference": "ref:synthetic-source-p7",
    "supports": "Syntetisk påstand i avsnitt 1",
    "license": "Ikke relevant for ren referanse",
    "credit": "Syntetisk kreditering",
    "issues": ""
  }]
}
```

Typer: `subject`, `source`, `rights`. Lokale statuser: `not_reviewed`, `in_review`, `checked`, `rejected`. `checked` vises som **Sjekket lokalt**, aldri Godkjent. Importert `authoritative:true` kan ikke overføre myndighet; normalisert utdata er alltid `false`. Manglende opphav, ressurs eller støttet påstand, ugyldig referanse, manglende lisens/kreditering og åpne avvik vises eksplisitt. Uferdige registreringer kan lagres som lokale utkast.

Identitet, format, felttyper, kjente felter, antall og lengder valideres. Maksimalt 50 registreringer; felter maksimalt 4000 tegn. Dokumentasjonsimport er begrenset til 1 MB, registerimport til 4 MB. Ukjent skjemaversjon/felt/status eller feil språk/slug avvises før skriving. Referanser aksepterer HTTPS uten innebygde credentials, eller identifiserbar `doi:`, `isbn:` og `ref:`. Dette er syntaks-/formatkontroll, ikke en påstand om at kilden finnes eller støtter innholdet.

UI støtter lokal registrering, lesing, JSON-eksport og append-import. Tidligere oppføringer slettes eller rebases ikke. En ugyldig eksisterende lokal original beskyttes mot overskriving; rå original kan eksporteres for avklaring. Lagringsfeil gir ingen suksess og beholder registreringsfeltene. Ulagrede feltbufre beholdes i minnet per bruker/artikkel/språk ved intern navigasjon, og `beforeunload` varsler ved usikret dokumentasjon. Lagre eksplisitt før lukking. Ordinær dokumentasjonseksport omfatter lagrede registreringer eller uleselig original. Den egne knappen «Eksporter registreringsfelt uten lagring» laster ned et versjonsbundet utkast av nåværende felt, også ved kvotefeil eller beskyttet original, uten å endre lageret. Ulagret-tilstanden beholdes til eksplisitt lagring.

Artikkelens eksisterende sikkerhetskopi og dokumentasjonsfilen er to separate filer. Notatene følger ikke med artikkelens kontolagring eller ordinære artikkel-JSON. Dette er bevisst for å hindre utilsiktet offentliggjøring.

## Deterministisk versjonsbinding

Algoritmen heter **`modus-editor-content-v1`**:

1. Normaliser artikkelen med eksisterende `normalizeArticle()`.
2. Behold de eksplisitte normaliserte innholdsfeltene, inkludert slug, locale, tekst, quiz, øvelser, læringsmetadata, bildereferanse og alternativtekst.
3. Legg til SHA-256 over faktisk verifiserte illustrasjonsbytes, eller en eksplisitt uverifisert-markør. Ingen valgt illustrasjon representeres med `null`.
4. Serialiser objektet `{algorithm,content,media}` som kompakt JSON med rekursivt sorterte objektnøkler og beholdt arrayrekkefølge. Beregn SHA-256 over UTF-8.

Revisjonsteller, lagringstid, status, lokal gjenopprettingsmetadata, kontrollnotater og UI-presentasjon inngår ikke. Men semantiske innholdsfelter og læringsklassifikasjon inngår. Endringer i tekst, quiz, læringsmetadata, illustrasjons-URL/alt eller illustrasjonsbytes gir en annen versjon. NB/EN har egne fingeravtrykk. Registreringens opprinnelige fingeravtrykk beholdes og sammenlignes ved ny visning; det oppdateres ikke automatisk til gjeldende versjon.

For bilder verifiserer klienten bare strengt tillatte statiske bildepaths på samme origin, uten credentials, redirect eller nettlesercache. Eksterne bilder og API-/traversalpaths hentes ikke; ukjente bytes gir Ikke vurdert. Ressurskontroll skjer ved åpning, eksplisitt oppdatering og dokumentasjonsoperasjoner. Endringer på en server kan ikke oppdages uten en ny kontroll; det er ingen bakgrunnspolling. Kontrollbildet markeres som ikke bekreftet mens et nytt innholdsfingeravtrykk beregnes, og gamle async-resultater kan ikke erstatte nyere innhold.

Eksisterende `article_text_version()` og katalog-/illustrasjonshasher har andre omfang og algoritmer. De vises som egne registerbevis og sammenlignes ikke blindt med den nye CMS-hashen. Det er ikke etablert en autoritativ migreringskobling. Derfor forblir samlet fag-/kilde-/rettighetsstatus **Ikke vurdert** når den nødvendige verifiserte versjonskoblingen eller komplette kontrollen mangler, også om en lokal notatregistrering har samsvarende innhold. Dette er en fail-closed-grense, ikke en ny godkjenningsmodell.

## Tester, bilder og sporbarhet

Alle nettleserkontroller bruker faktisk lokal klient/HTML/CSS med syntetiske artikler, registerkopier, notater, bildebytes og SDK. Ingen ekte backend-operasjoner eller kildenettsteder kontaktes. Eksterne fontforespørsler besvares lokalt; bildene bruker systemfont. De viser nettredaktøren, ikke forsiden eller en aktivert offentlig CMS-Preview.

| Kontroll | Kommando | Resultat |
| --- | --- | --- |
| Fingeravtrykk, registeradapter og dokumentasjon | `node tests/editor-review.mjs` | 11/11 grupper: determinisme, relevante endringer, irrelevante metadata, bildebytes, NB/EN, ugyldige referanser, rettigheter, stale bevis, JSON-bevaring, avvisning og de fire faktiske registerskjemaene |
| RED-004 nettleser | `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers npm run test:editor-review` | 12/12 scenarioer, ingen eksterne forespørsler eller sidefeil |
| RED-002A-regresjoner | `npm run test:editor-storage` med lokal Playwright-sti | 20/20; testfilen uendret fra baseline |
| RED-003-regresjoner | `npm run test:editor-status` med lokal Playwright-sti | 11/11; testfilen uendret fra baseline |
| Ordinært bygg/test i midlertidig kopi | `npm run build`, `npm test` | Bestått; 33/33 testkommandoer |
| Isolert bygg/test i midlertidig kopi | Samme med M3.3-miljø | Bestått; 33/33 |
| Publisering/isolasjonsgrenser | Eksisterende `tests/publication.py`, `tests/publication-audit.py`, `tests/preview-isolation.py`, `tests/article-permissions.py`, `tests/article-editor.mjs` | Bestått; private kontrollnotat-canaries lagt til i publiseringstesten. Hele ordinær/isolert artefakt skannes. 95 private kildefragmenter er fraværende. |

De 33 kommandoene inkluderer de tidligere 32 og den nye modelltesten. Ingen eksisterende test er fjernet. Private canaries ligger både under `.build-private/` og i en lokal JSON-fil; de skal ikke forekomme noe sted i offentlig artefakt. Ordinært bygg beholder eksisterende editor/SDK uten aktivert CMS-Worker. Isolert Preview utelater fortsatt SDK/editor/CMS-runtime, krever tom seed og eksisterende CSP/guard. Ingen private registre eller kontrollnotater legges til i offentlig seed.

M3.3-miljø: `MODUS_ISOLATED_PREVIEW=1`, `MODUS_PREVIEW_PROJECT=modus-2-preview`, `MODUS_CATALOG_PREVIEW=1`, `CF_PAGES_BRANCH=dev/modus-2-pr52`, `CF_PAGES_COMMIT_SHA=<kontrollert SHA>`. Ingen production-/releasekontekst aktiveres. Arbeidskopiens eksisterende dist overskrives ikke. Etter commit gjentas sluttkontrollene slik at ferske logger, byggets proveniens og bilde-/kildehash kan knyttes til leveranse-SHA.

Bevis under `test-results/red-004/`: `delivery.json`, `builds.json`, modusskilte bygg-/testlogger og manifest, `ordinary-tests.json`, `isolated-tests.json`, `red002a-browser.json`, `red003-browser.json`, `browser.json`, `model.log`, `axe.json`, `fresh-provenance.json`, `fresh-isolation.json` og skjermbilder. QA-arkivet inkluderer lesbar komplett diff, filmanifest, kildehash/Git-blob-ID-er, kontrollsummer og uavhengig verifikator. Privat registereksport og ekte lokale notater er ikke med i QA-arkivet.

Reelle syntetiske bilder:

- [Desktop, NB, 1440 px – kontrollpanel](../test-results/red-004/screenshots/review-panel-nb-1440.png).
- [Mobil, NB, 375 px – kontrollpanel](../test-results/red-004/screenshots/review-panel-nb-375.png).
- [Fullside desktop NB](../test-results/red-004/screenshots/review-nb-1440.png) / [mobil NB](../test-results/red-004/screenshots/review-nb-375.png).
- [Fullside desktop EN](../test-results/red-004/screenshots/review-en-1440.png) / [mobil EN](../test-results/red-004/screenshots/review-en-375.png).

Bredder 320, 375, 768, 1024 og 1440 er uten horisontal sidescrolling. Automatisk WCAG A/AA-kontroll gir 0 avvik. Visuell kontroll av reelle desktop-/mobilopptak er gjort separat. Full manuell skjermleser- og faglig kildevurdering er ikke erstattet av disse testene.

## Endrede filer og restavvik

- `cms/review-model.mjs`: ren kontroll-/dokumentasjonsmodell, syntaksvalidering, deterministisk fingeravtrykk og konservativ registerprojeksjon.
- `client/editor-review.js`: lokal kontrollvisning, statisk ressursverifisering, privat filinnlesing og separat lokal dokumentasjon.
- `client/editor.js`, `cms/editor.html`, `editor.css`: minimal integrasjon i eksisterende editor og mobiltilpasning.
- `scripts/export-editor-review.mjs`: eksplisitt privat lokal registerkopi uten overskriving.
- `tests/editor-review.mjs`, `tests/editor-review-browser.cjs`, `scripts/run-tests.cjs`, `tests/publication.py`, `package.json`: målrettede tester, canaries og kommandoer.
- `docs/modus-2-red-004.md`: denne rapporten.

Ingen kjente restfeil i de gjennomførte lokale scenarioene. Begrensninger som 03/05 må ta med i signeringen:

1. Lokale registerfiler og notater er ikke autentisert godkjenningsgrunnlag. Ingen automatisk autoritativ bro mellom gammel kildehash og ny CMS-hash. Fag, kilde og rettigheter skal ikke godkjennes før korrekt innhold og dokumentasjon faktisk er kontrollert av ansvarlig instans.
2. Eksterne kilders eksistens, faktiske støtte for en påstand, lisensgyldighet og juridiske rettigheter er ikke kontrollert ved nettverksoppslag. HTTPS/DOI/ISBN/ref-valideringen er syntaktisk.
3. Eksterne/ukjente illustrasjonsbytes forblir uverifiserte. Nytt bildeinnhold på samme URL krever ny ressurskontroll før samsvar kan vises.
4. Lokal lagring er klartekst i nettleserprofilens origin, ikke kryptert eller en per-bruker sikkerhetsgrense mot originens øvrige JavaScript. Bruk privat, betrodd nettleserprofil; lagrede notater blir liggende ved utlogging. Usikrede feltbufre er bare i minnet og kan tapes ved krasj. Full skjermleser-QA gjenstår.
5. Ingen live Auth/RLS, database-/RPC-endring, ekte flerbrukertest, Cloudflare-tilgangskontroll eller deploy er utført. RED-002s uendrede serverrettighetsgap består. Denne leveransen åpner ikke publisering eller RED-005-eiergodkjenning.

**Overlevering til 00/04/03/05:** lokal implementasjon og dokumentert QA-grunnlag er levert. Separat fag-/QA-beslutning må tas før videre arbeid eller publisering. Ingen push, merge, Cloudflare-deploy, backendaktivering eller produksjonsendring er utført.
