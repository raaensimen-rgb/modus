# MODUS 2.0 – RED-002: Datamodell, lagring og sikkerhetsgrenser

Til 00 – Prosjektledelse, for koordinering med 04 – Nettredaktør og innholdsadministrasjon og 05 – Kvalitetssikring og testing.

**Dato:** 02.11.2026. **Gren:** `dev/modus-2-pr52`. **Kontrollert HEAD:** `2f2a2c2787af9f680731dc6ed09434c1d78857ac`.

**Konklusjon:** Eksisterende CMS kan videreutvikles. Innholdsmodell, lokal sikkerhetskopi, optimistisk revisjonskontroll og separat publisert øyeblikksbilde finnes allerede. Byggsystemet har dessuten en versjonsbundet publiseringsgate. Det mangler en sammenhengende, autorisert redaksjonell arbeidsflyt mellom disse delene. En fremtidig eiergodkjenning må håndheves på serveren; dagens SQL gir alle aktiverte redaktører direkte skriverettigheter som kan omgå RPC-kontrollene. Dette er en blokkering for å aktivere CMS-publisering med en eiergodkjenningsgate, ikke et påvist innholdsutslipp fra dagens isolerte artefakt.

Ingen applikasjonskode, SQL, publiseringspolicy eller backend-konfigurasjon er endret. Ingen eksterne lagringsoperasjoner, autentiseringsforsøk eller backend-kall er aktivert. Leveransen består av denne rapporten og syntetiske lokale tester/bevis i `docs/modus-2-red-002-evidence/`. Ingen ny commit er opprettet; denne oppgaven ba om analyse og rapportering.

## 1. Sporbarhet og metode

Arbeidsmappe: `/Users/simenraaen/Documents/ChatGPT/MODUS 2.0`.

De 18 sentrale kildefilene i [kildemanifestet](modus-2-red-002-evidence/source-manifest.json) er bytekontrollert mot oppgitt HEAD. RED-001-konklusjonen fra 04 er brukt som føring: videreutvikle eksisterende CMS, bevar identiteter og publiseringssperrer. Historiske beskrivelser i `docs/article-editor.md` er kontrollert mot faktisk kode, ikke behandlet som verifisert nåtilstand.

Kontrollen kombinerer kilde- og SQL-lesing, eksisterende lokale tester, syntetiske modelltester, nettlesertester av den faktiske redaktørklienten med fullstendig simulert SDK, samt kontroll av eksisterende distribusjonsartefakt. Nettleserfixture eksponerer bare syntetiske data; den serverer ikke prosjektmappen. Andre nettverksoriginer avvises før transport. Ingen private artikkeltekster eller credentials er kopiert til bevispakken.

Ved oppstart fantes endringer i genererte, historisk sporede `dist/`-filer og fem uregistrerte M3.4–M3.8-dokumenter. Disse er beholdt. RED-002 har ikke gjenoppbygd eller ryddet arbeidsmappens `dist/`; seks bygg ble utført i testens midlertidige prosjektkopi.

## 2. Eksisterende datamodell

### 2.1 Normalisert redaktørinnhold – `cms/model.mjs`

Artikkelidentiteten er **`(slug, locale)`**, ikke et separat UUID. Samme slug binder språkversjoner og quizprogresjon sammen. Tillatte språk er `nb` og `en`; manglende/ukjent språk blir stille normalisert til `nb`.

| Felt | Eksisterende format og grense |
| --- | --- |
| `slug` | Trimmet tekst, maks. 80 tegn; validering krever små ASCII-bokstaver/tall og bindestrek |
| `locale` | `nb` eller `en` |
| `title`, `intro` | Maks. 180 / 1200 tegn |
| `level` | `beginner`, `intermediate`, `advanced`; standard `beginner` |
| `category` | `basics`, `chords`, `harmony`, `modes`, `improvisation`, `rhythm`; standard `basics` |
| `topic` | Maks. 100 tegn; standard fra kategorien, med norsk tekst |
| `sections` | Inntil 30 par `[overskrift, HTML]`; overskrift maks. 180 tegn; HTML renses med tillatelsesliste |
| `exercise` | Maks. 4000 tegn |
| `practice`, `practice_label` | Kontrollert URL / tekst maks. 120 tegn |
| `image.src`, `image.alt` | Kontrollert URL / tekst maks. 300 tegn |
| `quiz` | Inntil tre spørsmål med `question` (500), tre `options` (500 hver), `answer` (indeks 0–2), `explanation` (2000), `section` (1-basert) |

`validateArticle()` krever gyldig slug, tittel, innledning, ikke-tomme seksjoner og nøyaktig tre komplette spørsmål med tre ulike alternativer og gyldige seksjonsreferanser. Uferdige utkast kan likevel lagres: klientens lagringsfunksjon validerer bare slug, mens fullstendighet kontrolleres før publisering. Dette skillet er hensiktsmessig.

Normalisering er **ikke** en tapsfri importvalidator: ukjente felter fjernes, ugyldige enumverdier får standardverdi, og for lange lister/tekster avkortes. Den kontrollerer ikke faglig godkjenning, rettigheter eller at et bilde faktisk har meningsfull alternativtekst.

### 2.2 Faktiske kildedata og språk

- `content/articles.json`: 16 unike slugs; norsk er implisitt, uten `locale` i selve kilderekkene. Alle har `slug`, `level`, `topic`, `title`, `intro`, `art`, `practice`, `practice_label`, `sections`, `exercise`, `category`.
- Fire artikler har i tillegg `learning` (`goals`, `prerequisites`, `links`), `practice_steps` (tekstliste) og `next_step` (`slug`, `reason`). Disse feltene finnes **ikke** i normalisert redaktørpayload og forsvinner gjennom denne normaliseringen. Dette sletter ikke kildefilen, men hindrer tapsfri fremtidig redigering og tilbakeføring.
- `art` er eksisterende illustrasjonskilde; byggadapteren lager `image.src/alt`. Rå `art` skal ikke ukritisk føres inn som tillatt SVG/HTML i redaktøren. Skill nødvendig innholdsbevaring fra dagens bevisste sikkerhetsfiltrering.
- `content/article-quizzes.json`: 16 slugoppføringer, 48 norske spørsmål, med engelske overstyringer under `en`.
- Engelsk produseres gjennom `content/i18n/en.json`, `content/i18n/dynamic.tsv` og artikkelspesifikke overstyringer i `scripts/build-languages.py`. Språkversjonene har derfor ikke én felles lagringsform i kilde og CMS.
- `cms/static-ids.json` inneholder 13 eldre slugs. Dette er et kompatibilitets-/fallbackregister, ikke en fullstendig oversikt over dagens 16 kildeartikler. Bevar eksisterende slugs og progresjonskoblinger ved videreutvikling.
- CMS-klienten kan redigere NB/EN separat; grensesnittet i `cms/editor.html` er norsk. Validering av begge localeverdier dokumenterer ikke at alle engelske oversettelser er faglig riktige.

### 2.3 Status og publiseringsmetadata finnes i separate lag

| Lag | Eksisterende data | Begrensning |
| --- | --- | --- |
| Redaktørpayload | Innholdsfeltene over | Ingen redaksjonell status, fagkontroll, rettighetskontroll, godkjenner eller godkjent versjon |
| Klientens liste | «På nettsiden», «Utkast», «Publisert», «Bare lagret lokalt» | Avledes av lagringssted/revisjon; er ikke en faglig statusmodell |
| `content/publication.json` | `editorial_status`, `visibility`, `approved_locales`, `approval_reference`, `publication_evidence`, samt beslutnings-/kontrollmetadata | Git-basert publiseringsmyndighet, ikke synkronisert med CMS-lagring |
| `editorial/article-publication-review.json` | Proveniens, kildehash, språkversjonshasher, gjennomgåtte bevis, `personal_mastery_status`, `source_control_status`, rettighets-/faggater, beslutningsbehov | Privat vurderingsgrunnlag, ikke en serverhåndhevet CMS-arbeidsflyt |

Byggpolicyens tillatte hovedstatuser er `draft`, `in_review`, `approved`; synlighet er separat: `private`, `preview`, `public`. Nå står alle 16 artikkeloppføringer som `draft`/`private`, uten godkjente språk, med beslutning `awaiting_owner`. Vurderingsregisteret viser blant annet `not_documented` for personlig mestring og `under_review` for kildekontroll. Ingen av disse oppføringene gir automatisk publiseringsrett.

## 3. Lagring, eksport og versjonering

### 3.1 Dokumentert flyt

1. `scripts/build-editor.py` velger kun artikler som allerede passerer `public_articles()`; quiz, bilde og språk tilpasses før `cms-seed.json` bygges. Nåværende seed er `[]`. Private manus lastes ikke inn som offentlig redaktørgrunnlag.
2. `client/editor.js` normaliserer seed/payload ved åpning. Endringer merkes lokalt og sikkerhetskopieres etter ca. 500 ms.
3. `localStorage`-nøkkelen er `modus.editor.local.v1.<user-id|preview>.<locale>:<slug>`. Verdien er `{article, revision, savedAt}`. «Lagre lokalt» gjør ingen lagrings-RPC.
4. Kontolagring bruker `cms_save_draft(p_slug, p_locale, p_payload, p_expected_revision)`. Klienten beholder lokal kopi før forespørselen. Vellykket svar oppdaterer klientens revisjon.
5. SQL-funksjonen oppretter revisjon 1 eller øker eksisterende revisjon ved samsvar med forventet revisjon, og skriver en historikkrad i samme transaksjon. Utdatert revisjon avvises med `40001`.
6. Publisering er en egen operasjon som kopierer lagret payload/revisjon til `cms_article_publications`. Videre lagring av utkast skal ikke endre denne kopien. `publishingEnabled` er nå `false`; isolert Preview utelater hele redaktør-/CMS-runtime.
7. Kontolagring skriver ikke tilbake til `content/articles.json` eller Git. Git-versjon og databaseversjon er forskjellige spor. Git-rollback tilbakefører ikke databasepublikasjoner.

**Lokal sikkerhetsgrense:** Lokal lagring er klartekst innenfor nettleserens origin/profil. Nøkkel med bruker-ID er en navneromskonvensjon, ikke tilgangskontroll eller kryptering. Kontoutkast blir liggende etter utlogging. Delt maskin, originens øvrige JavaScript og eventuelle XSS-feil må tas med i trusselmodellen. Det finnes ingen påvist lokal revisjonshistorikk utover siste sikkerhetskopi.

### 3.2 JSON-import og eksport

«Last ned sikkerhetskopi» laster faktisk ned `normalizeArticle(article)` som `<slug>.<locale>.json`. Eksporten inneholder ikke lokal konvolutt, revisjon, tidsstempel, skjemaversjon, eier eller godkjenningsbevis. Innhold som normaliseringen fjerner, følger heller ikke med.

**Det finnes ingen JSON-filimport i dagens redaktørgrensesnitt.** Ingen filvelger/importhandler er funnet. Modell-/seedinnlesing må ikke omtales som en ferdig, brukerbetjent importfunksjon. En normalisert JSON-rundtur er testet lokalt; opplasting av eksportfil til redaktøren kan ikke testes som eksisterende funksjon.

Eksport er en bevisst nedlasting av det åpne utkastet, som kan være privat. Den gjør ikke filen offentlig, men filen må håndteres som privat av mottakeren. Fremtidig import må ikke kunne gjøre medsendt `approved` eller et godkjenningsobjekt til autoritativ publiseringstillatelse.

### 3.3 SQL-tabeller og revisjonsgrenser

| Tabell | Eksisterende felter/nøkler |
| --- | --- |
| `cms_editors` | `user_id` (UUID, PK til Auth), `enabled` |
| `cms_article_drafts` | PK `(slug,locale)`, `payload` JSONB-objekt maks. 512000 byte, `revision > 0`, `updated_at`, `updated_by` |
| `cms_article_publications` | PK `(slug,locale)`, FK til utkast, `payload`, `revision`, `published_at` |
| `cms_article_history` | `id`, `slug`, `locale`, `payload`, `revision`, `saved_at`; unik `(slug,locale,revision)` |

Historikk har ikke egen `saved_by`, innholdshash eller godkjenningshendelse. UI-et har ingen historikkleser, diff, treveisfletting eller historikkgjenoppretting.

**Observert konfliktgap:** Åpnes skyrevisjon 3 og brukeren velger «Gjenopprett lokal kopi» fra revisjon 1, blir den gamle teksten lagt i skjemaet mens klienten beholder revisjon 3. Neste lagring sender `p_expected_revision=3`. Dermed beskytter RPC-ens vanlige revisjonskontroll ikke mot denne bevisste, men utilstrekkelig varslede overskrivingen av nyere innhold. Dette er bekreftet i klient med simulert RPC, ikke ved databaseoverskriving.

**Observert lagringsfeil:** `persistLocal()` viser en kvotefeil, men etterfølgende lokal lagring/autolagring kan overskrive meldingen med «lagret»; lokal «Lagre» kan også klarere endret-tilstanden uten at data ble lagret. Testen fremprovoserte feilen uten å endre applikasjonen.

### 3.4 Eksakt innholdsversjon og faglig godkjenning

Dette finnes delvis allerede: `article_text_version()` i `scripts/publication.py` beregner SHA-256 over kanonisk JSON med hele kildeartikkelen, quizoppføringen og locale. For EN inngår også hasher av hele `en.json` og `dynamic.tsv`, samt relevant artikkeloverstyring fra språkbyggeren. `article_permission()` krever samsvar med `publication_evidence[locale].reviewed_version_sha256`, i tillegg til godkjent status, offentlig synlighet, godkjent språk og referanser.

Konsekvenser:

- Endring i tekst, quiz eller eksisterende læringsmetadata ugyldiggjør tidligere kildegodkjenning.
- EN krever eget versjonsbevis. `public_articles(...,'en')` krever dessuten godkjent NB-versjon. Dette er eksisterende publiseringsregel og skal bevares.
- Oversettelseshashene er konservative: en endring i en annen EN-oversettelse kan kreve ny godkjenning av flere EN-artikler. Hele quizoppføringen inngår også i NB-hashen, inkludert EN-overstyringer.
- Hashen binder ikke automatisk en CMS-databaserevisjon til kilden og autentiserer ikke personen bak referansen. Illustrasjonens faktiske bytes, rettigheter og eksterne ressurser er heller ikke fullstendig attestert av teksthashen alene. Katalogens separate illustrasjons-/metadataregler må beholdes.

Et fremtidig godkjenningsbevis må derfor binde artikkel-ID, språk, eksakt revisjon **og** innholdshash til en verifisert godkjenner. Revisjon alene er ikke tilstrekkelig når direkte tabellskriving tillates.

## 4. Sikkerhetsvurdering

### 4.1 Statisk publisering og private ressurser

Publiseringsregisteret er autoritativt for statisk bygging; innholdets tilstedeværelse, redigering eller lokale lagring gir ingen publiseringstillatelse. Manglende policy gir ikke offentlig artikkeltilgang; ugyldig policy avvises. `approved` er ikke alene nok til `public`. Katalogpreview gir bare særskilt godkjente metadata/illustrasjoner, ikke full artikkeltekst.

Eksisterende tester bekrefter privat som standard, separat språkbevis, ugyldiggjøring ved innholdsendring, tom privat seed, fravær i søkeindeks og ingen private canary-data etter rent eller skittent bygg. Hele dagens 339-filers artefakt er kontrollert: 95 private kildeavsnitt er fraværende; ingen private kildekataloger, CMS-runtime eller backendreferanser ble funnet. Dette er spesifikke kontroller og mønstersøk, ikke et matematisk bevis på fravær av enhver mulig hemmelighet.

### 4.2 Database- og rollegrense: viktig før RED-005

Kilde-SQL slår på RLS. Anonyme brukere får bare SELECT på publiserte kopier, ikke utkast/historikk. Registrering gir ikke automatisk redaktørrett; egen tilgangsrad må være aktivert av administrator.

Men «private utkast» betyr i skjemaet **private for offentligheten**, ikke private per forfatter. Alle aktiverte redaktører kan lese og endre alle utkast og lese historikk. De har også direkte INSERT/UPDATE på publikasjoner og INSERT på historikk. Disse rettighetene og RLS-policyene kontrollerer bare aktivert redaktørstatus, ikke eiergodkjenning, forventet revisjon, komplett godkjenningsbevis eller publiseringsregisteret.

Dette gjør det mulig, dersom samme skjema er installert og rollen aktivert, å omgå RPC-en via direkte tabellkall: endre payload uten automatisk revisjonsøkning/historikk, skrive en publikasjon uten faglig godkjenning, eller sette inn en konstruert historikkrad. `updated_by` er heller ikke bundet til innlogget bruker ved direkte tabellskriving. Dette er en kildebasert rettighetsanalyse, ikke et utført angrep eller en bekreftelse av dagens installerte produksjonsskjema.

`publishingEnabled:false` beskytter UI-flyten, men er ikke en databaseautorisasjonsregel. Den parkerte `cms/middleware.mjs` leser publikasjonstabellen uten å kontrollere Git-registerets versjonsbevis. Den må ikke aktiveres som alternativ vei rundt eksisterende publiseringspolicy.

Før en eiergodkjenningsgate kan godtas, må alle mulige skriveveier håndheve samme versjons- og rollekontroll. **Ikke bare tilbakekall tabellrettigheter og anta at eksisterende funksjoner virker:** de kjører som `security invoker` og trenger rettighetene til innringeren. En avgrenset, sikker gjennomføring må utformes og testes i isolert database med eksplisitt fullmakt. Ingen slik endring er gjort her. Supabase dokumenterer samspillet mellom [tabellrettigheter og RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) og [funksjoners invoker-/definer-rettigheter](https://supabase.com/docs/guides/database/functions).

### 4.3 Preview-isolasjon og rich text

Isolert M3.3-Preview er forskjellig fra knappen «Prøv redaktøren lokalt». Den ordinære klienten initialiserer SDK og spør etter sesjon også når lokal prøvevisning velges. Den er derfor bare testet med frakoblet, simulert SDK her.

Isolert bygg krever samlet:

```text
MODUS_ISOLATED_PREVIEW=1
MODUS_PREVIEW_PROJECT=modus-2-preview
MODUS_CATALOG_PREVIEW=1
CF_PAGES_BRANCH=dev/modus-2-pr52
```

Produksjons-/releasekontekst avvises. Preview krever tom seed, utelater SDK, `editor.js`, Worker og kontobackend, og viser statiske utilgjengelighetsmeldinger på NB/EN. CSP og tidlig nettverksguard gir tekniske sperrer; ugyldig konfigurasjon og 12 artefakt-/proveniensmanipulasjoner avvises av testen. Artefaktets kilde-SHA er kontrollert mot HEAD.

Rich text renses med `parse5` og en tillatelsesliste; scripts, hendelsesattributter, SVG, skjema og farlige protokoller fjernes. Forhåndsvisningsiframe mangler `allow-same-origin`, og får dermed ikke originens sesjon/lager. `safeURL()` tillater likevel vilkårlige HTTPS-URL-er; ordinær artikkelforhåndsvisning kan hente eksterne bilder. Dette gir mulig sporings-/rettighetsrisiko og krever strengere ressursavklaring før utvidet CMS. Dagens isolerte Preview utelater redaktøren og begrenser bilder til egne/data/blob-ressurser. Eksterne Google-fontressurser er fortsatt tillatt; dette er ikke redaksjonell datalagring.

Backend-isolasjon er ikke tilgangskontroll for selve nettstedet. Rapporten autoriserer ingen offentlig opplasting og endrer ingen tidligere krav om beskyttet Preview.

## 5. Testresultater og reproduksjon

Alle kommandoer er kjørt fra prosjektroten med de fire Preview-variablene over for Python-testene. `tests/publication.py` fjerner isolasjonsmarkørene inne i sine midlertidige ordinære bygg og tester også produksjonsgren `main`. Den endrer ikke arbeidskopiens policy eller dist.

| ID | Kjørt kommando | Resultat og faktisk omfang |
| --- | --- | --- |
| RED2-T01 | `node tests/article-editor.mjs` | Bestått: modell, sanitering, quiz, statisk fallback, publisert kontra utkast, simulert middleware-fetch |
| RED2-T02 | `python3 tests/article-permissions.py` | Bestått: 16 kilder, eksakte NB/EN-versjoner og private beslutninger bevart |
| RED2-T03 | `python3 tests/publication-audit.py` | Bestått: 339 filer / 95 private avsnitt / tom seed / publikasjon og indeksgrenser |
| RED2-T04 | `python3 tests/preview-isolation.py` | Bestått: konfigurasjonsfeil, tekniske artefaktgrenser, 12 negative manipulasjoner inkl. proveniens |
| RED2-T05 | `python3 tests/publication.py` | Bestått: seks `npm run build` i midlertidig kopi, rent/skittent bygg byteidentisk, syntetiske språk-/versjonsgater og produksjonskontekst |
| RED2-M01–M06 | `node test-results/red-002/model-roundtrip.mjs` | 6/6 karakteriseringsscenarioer, inkludert 32/32 kilde/locale-kombinasjoner |
| RED2-V01–V02 | `python3 test-results/red-002/approval-version.py` | 2/2: eksakt versjonsbevis, separat EN, endret læringsmetadata/quiz/oversettelse |
| RED2-B01–B08 | `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers node test-results/red-002/editor-offline.cjs` | 8/8 karakteriseringsscenarioer i Chromium, 0 eksterne forespørsler, 0 sidefeil; faktisk klient med syntetisk SDK |

**Bestått karakterisering betyr at observert oppførsel er dokumentert, ikke at påviste feil er akseptable.** B04 beviser feilaktig suksessmelding ved lagringsfeil; B08 beviser gjenopprettingsgapet. B07 dokumenterer vedvarende lokal kopi etter utlogging. B05/B06 verifiserer klientens forventede revisjon og håndtering av `40001`, ikke PostgreSQLs faktiske samtidighet.

Eksisterende T01 skriver «26 editor imports» i konsollen. Tallet er en gammel, hardkodet tekst: løkken behandler dagens 16 artikler × 2 localeverdier = 32. M05 teller og kontrollerer 32 eksplisitt. Dette er ikke 26/32 JSON-filimporter via brukergrensesnittet.

Den nye nettleserharnessens første kjøring feilet fordi testens init-script også forsøkte lokal lagring i et sandboxet iframe. Testen ble avgrenset til hovedvinduet og kjørt på nytt; 8/8 bestått. Ingen produksjonskode ble endret for å få resultatet.

Bevis og gjentakelse:

- [Kommandoer, miljø, tidspunkt og HEAD](modus-2-red-002-evidence/results.json); hver eksisterende test har egen `.log` i samme mappe.
- [Nettleserscenarioer og avgrensning](modus-2-red-002-evidence/editor-offline.json), [nettleserlogg](modus-2-red-002-evidence/editor-offline.log), [modellogg](modus-2-red-002-evidence/model-roundtrip.log), [versjonslogg](modus-2-red-002-evidence/approval-version.log).
- [Hele publiseringsauditten med filmanifest](modus-2-red-002-evidence/publication-audit.json) og [isolasjonskontroll med HEAD og filhashkontroll](modus-2-red-002-evidence/artifact-check.json).
- De tre nye testskriptene er bevart byteidentisk i evidensmappen. Gjentakelse kan bruke `node docs/modus-2-red-002-evidence/model-roundtrip.mjs`, `python3 docs/modus-2-red-002-evidence/approval-version.py` og den tilsvarende browserkommandoen med `docs/modus-2-red-002-evidence/editor-offline.cjs`. Nettleserharnessen skriver nye resultater under ignorerte `test-results/red-002/`.
- [SHA256SUMS](modus-2-red-002-evidence/SHA256SUMS) kontrollerer bevisfilene; kontroller lokalt med `cd docs/modus-2-red-002-evidence && shasum -a 256 -c SHA256SUMS`. Rapport og checksumfilen selv inngår ikke i listen.

Full `npm test`, lydtester, alle skjermbredder og Cloudflare-kontroll er ikke gjentatt: ingen applikasjonsendringer er gjort, og oppgaven gjelder modell-/lagrings-/publiseringsgrenser. Nytt ordinært bygg er verifisert gjennom de seks testbyggene, ikke ved å overskrive eksisterende Preview-artefakt.

### Ikke verifisert lokalt

Ingen PostgreSQL-server/`psql` er tilgjengelig. Nåværende installerte skjema, reelle RLS-/rollegrants, aktive redaktører, transaksjonsrollback, samtidige databaseklienter, Auth-sesjoner, e-postlevering, backup/gjenoppretting og faktisk lagringsvarighet i backend er ikke kjørt. SQL-vurderingen må etterprøves i en særskilt godkjent, isolert testdatabase med anonyme, uprivilegerte, redaktør- og eierroller før sky-CMS kan godkjennes. Mocktester erstatter ikke dette. Ingen Cloudflare- eller produksjonstester inngår.

## 6. Identifiserte mangler og prioritet

| Prioritet | Mangel | Anbefalt avgrensning |
| --- | --- | --- |
| Blokkerer eierstyrt CMS-publisering | Direkte redaktørskriving omgår RPC/revisjon/godkjenningsgate; live-policy er ukontrollert | Serverhåndhevet, felles skrive-/publiseringsgrense, verifisert separat før aktivering |
| Høy | Status og godkjenning er ikke versjonsbundet i CMS; Git- og CMS-kilder har ulike myndighetsløp | Én uttrykkelig kontrakt mot eksisterende register, uten alternativ publiseringsvei |
| Høy | Lokal gjenoppretting mister gammel baserevisjon som konfliktgrunnlag | Vis begge revisjoner og krev eksplisitt sammenligning/valg; ingen stille overskriving |
| Høy | Lokal lagringsfeil kan meldes som suksess | Returner lagringsutfall; behold endret-tilstand og tydelig feil/eksportmulighet |
| Middels | Læringsmetadata faller bort; ukjent locale/listelengde endres stille | Versjonert adapter, tapsrapport og avvist uventet import før lagring |
| Middels | JSON-sikkerhetskopi mangler konvolutt/revisjon; import finnes ikke | Spesifiser format og trygg migrering; importert godkjenning er aldri autoritativ |
| Middels | Lokal kopi beholdes etter utlogging; alle redaktører deler alle skyutkast | Avklar og kommuniser delings-/oppbevaringsmodell; sikker sletting må være bevisst og ikke destruktiv som standard |
| Middels | Ingen historikk-UI, full aktørproveniens eller uforanderlig godkjenningslogg | Bygg videre på historikktabellen; dokumenter gjenoppretting som ny revisjon |
| Middels | Eksterne HTTPS-bilder tillates uten kilde-/rettighetsbinding | Tillatt ressursregister med hash og rettighetsreferanse; ikke vilkårlig HTML/SVG |

## 7. Minimal anbefalt datamodell for RED-003–RED-006

Dette er en kontraktsanbefaling, **ikke** en implementert migrering eller en ny CMS-arkitektur. Behold `(slug,locale)`, dagens innholdsfelter, historikk og register. Ikke innfør et parallelt register som kan utvide publiseringsrett.

| Del | Minimum |
| --- | --- |
| Versjonert konvolutt | `schema_version`, `slug`, `locale`, `revision`, `content_sha256`, `updated_at`, `updated_by`, eksisterende `content`/payload; inkluder eksisterende læringsmetadata gjennom eksplisitt adapter |
| Arbeidsstatus | `editorial_status: draft | in_review | approved` **per språkversjon**, separat fra `visibility` og faktisk publisert revisjon; ukjent verdi må avvises |
| Versjonsbundet gjennomgang | `reviewed_revision`, `reviewed_content_sha256`, `reviewed_by`, `reviewed_at`, `decision_reference`; separate fag-/kilde-/rettighetskontroller med referanser til det som faktisk er vurdert |
| Eiergodkjenning | Eget, serverautorisert bevis med `slug`, `locale`, revisjon, innholdshash, godkjenner-ID, tidspunkt og beslutningsreferanse; klient/import kan ikke selv tildele gyldighet |
| Ressursgrunnlag | Kilde-/rettighetsreferanser og hash for godkjente illustrasjoner; rå private kilder skal ikke følge offentlige payloads eller seed |
| Publisert kopi | Eksisterende snapshot, pluss sporbar binding til godkjent versjon/bevis når backend senere får slik fullmakt; ingen automatisk publisering ved `approved` |
| Lokal kopi/import | `base_revision`, innholdshash og skjemaversjon; tidspunkt; import gir utkast og beholder opprinnelse som ikke-autoritativ metadata |

`content_sha256` må ha en dokumentert kanoniserings-/versjoneringsalgoritme og omfatte alt vurdert innhold, quiz, pedagogiske felter og ressursbindinger. Det må finnes en eksplisitt kobling til eksisterende `article_text_version()`/Git-gate; hashen til en normalisert CMS-payload er ikke automatisk lik eksisterende kildehash. Utvid ikke godkjenningsomfanget ved å normalisere bort vurderingsrelevante felter.

En redigert godkjent versjon må bli en ny, ikke-godkjent arbeidsversjon. Bevar historisk godkjenning som hendelse, men la den ikke gjelde det endrede innholdet. Den tidligere publiserte kopien kan beholdes uendret etter eksisterende policy. NB-godkjenning gir aldri EN-godkjenning.

## 8. Akseptansekriterier for neste implementeringsoppgave

Anbefalt neste oppgave er **RED-003: avgrenset status-/versjonskontrakt og visning**, først uten å aktivere sky-CMS eller publisering. RED-004 legger til kilde-/fag-/rettighetsgrunnlag, RED-005 den serverhåndhevede eiergodkjenningen, og RED-006 uavhengig språkpreview. Kritiske lagringsfeil bør få egne små rettinger før bruk av reelle private utkast.

| ID | Etterprøvbart kriterium |
| --- | --- |
| RED003-01 | Eksisterende 16 slugs, NB/EN-kobling og quizprogresjons-ID-er er uendret. Ingen private kilder gjøres offentlige. |
| RED003-02 | UI skiller arbeidsstatus, fag-/kilde-/rettighetskontroll, synlighet, lagringssted og publisert revisjon. «Godkjent» vises ikke som «publisert». |
| RED003-03 | Eksisterende `draft/in_review/approved` brukes med dokumentert per-locale-mapping mot registeret. Manglende/ukjent status er aldri godkjennende; ingen automatisk migrering til offentlig. |
| RED003-04 | Modelltester bevarer læringsmetadata via eksplisitt adapter. Rå `art`/SVG blir ikke et tillatt usanitert innholdsfelt. Uventet språk eller avkorting gir synlig avvisning/tapsrapport ved import. |
| RED003-05 | Lokal lagringsfeil gir varig tilgjengelig feilmelding, ingen suksess og ingen klarering av ulagrede endringer. Eksport er fortsatt mulig. |
| RED003-06 | Gjenoppretting av lokal rev. 1 over skyrev. 3 viser begge versjoner og krever eksplisitt valg/diff; gammel base blir ikke stille erstattet av ny forventet revisjon. |
| RED003-07 | JSON-formatet har skjemaversjon og revisjons-/hashgrunnlag. Eventuell import saniteres, størrelsesbegrenses, valideres og gir utkast uten autoritativ godkjenning; tapsfri normalisert rundtur testes. |
| RED003-08 | Endring i tekst, quiz, læringsmetadata eller vurdert ressurs gjør godkjenningsbeviset ugyldig for den nye versjonen. NB/EN testes separat. |
| RED003-09 | Eksisterende publiserings-, canary-, seed-, indeks- og Preview-isolasjonstester består; ingen ny backendbinding og ingen Worker-aktivering. |
| RED005-GATE | Før godkjennings-/publiseringsfunksjoner aktiveres: isolert databasetest beviser at anon, vanlig konto og redaktør ikke kan forfalske eiergodkjenning eller omgå den via direkte tabell-/RPC-kall; stale revisjon avvises atomisk, historikk er sporbar og publisert kopi følger eksisterende registerpolicy. |

**Beslutningsbehov hos 00/04/05:** Avklar om utkast skal deles mellom alle aktiverte redaktører eller være forfatterbegrenset, hvem som kan gjennomgå/godkjenne, og hvordan CMS-versjon bindes til eksisterende Git-basert publiseringsmyndighet. Fortsett med statusvisning og lokale tester uten å aktivere ekstern lagring eller publisering. Ingen produksjonstilgang er nødvendig for RED-003-kontrakten.
