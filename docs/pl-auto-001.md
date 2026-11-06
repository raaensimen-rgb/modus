# PL-AUTO-001 – én MODUS 2.0-arbeidsflyt

Gjelder A03/A04/T05, oppdatert av C10 7. november 2026. C07 utvikler og ferdigstiller lokalt; C06 utfører bare separat eiergodkjent publisering. Automatiske tester og offentlig etterkontroll følger samme versjonsbundne pakke. Ingen oppgave trenger ekstra mellomstasjoner eller nye tjenester.

## Autoritativt grunnlag

- Offentlig prosjekt: `modus`, ID `befea306-6ef6-4282-9fbb-a754c93e6d1b`, https://modus-4ye.pages.dev/.
- Produksjonskilde: `584c98f06843e6981e3009cbfbb9bdda5ba34169`; deployment `73e46085-18ca-495a-9b3e-5ee120ba4283`.
- C06s eksakte offentlige pakke er låst i `release-inputs/production-584c98f`, med alle 660 filhash i `production-baseline.json`. Dette er inngangsgrunnlaget, ikke en ny deployfullmakt.
- 52 NB/16 EN-fulltekster, valgte illustrasjoner/medier og private grenser bevares. Nye utkast er private. Ingen opphevede passive kort eller generelle fulltekstsperrer gjeninnføres.
- Privat administrator/Access er separat i `modus-2-preview`; prosjektet er ikke et offentlig utviklingsmål. Ikke flytt, slett eller deploy administrator fra den offentlige flyten.

## Enkel prosedyre for hver utviklingspakke

### 1. C07 – utvikle fra faktisk nyeste produksjon

Les siste C06-rapport og AGENTS.md. Klon den aktuelle 2.0-kilden lokalt med full Git-historikk og opprett en isolert `codex/...`-gren. Ikke bruk rotkopien eller gammel GitHub main. Kjør `npm run production:workflow -- status --out /ny/mappe/status` for lesende kontroll av faktisk Cloudflare-prosjekt, canonical deployment, kilde-SHA, offentlig manifest og avslått Git-autodeploy.

`production-baseline.json` og den låste pakken må vise samme siste faktiske leveranse. Hvis produksjon er nyere, skal C07 oppdatere grunnlaget fra C06s verifiserte kilde/pakke/rapport før videre arbeid. Ikke rediger baselinefiler for å få gamle byte til å passe, og ikke flytt baseline bakover. Både kilden og den nye baseline-SHA-en må være etterkommere av MODUS 2.0-ankeret `584c98f…`.

Gjør bare bestilte kildeendringer. Oppgi eksakt forventet offentlig delta i `release-inputs/production-delta.json`: `allowed_changes`, `allowed_additions`, `allowed_removals`. Ingen jokertegn. C10 har tomt offentlig produktdelta. Kun kandidatmanifestets kilde-, QA- og baselineopplysninger endres; ingen produktfil endres. Fremtidig innholdsutvidelse krever også korrekt eierutvalg/versjoner og oppdaterte forventede språk-/artikkeltall; dette er ikke en ny generell sperre for allerede valgt innhold.

Det ordinære kildebygget og eksisterende avgrensede produktbygger gjenbrukes. Et rått `dist/` er aldri en publiseringspakke. Dagens produktbygger viderefører historiske, hashbundne overlegg for å reprodusere godkjente bytes; den skal ikke automatisk synkronisere alle kildefiler til offentlig pakke. For en ny produktendring må C07 også overføre den bestilte endringen i produktbyggeren og la delta- og funksjonstestene bekrefte resultatet. Dette hindrer både mistede endringer og utilsiktet redesign.

### 2. C07 – én automatisk ferdigstilling

Commit gjennomgått lokal kilde, og kjør fra den rene isolerte kopien:

```sh
npm run production:workflow -- prepare --sha FULL_SOURCE_SHA --out /ny/mappe/kandidat
```

Kommandoen kjører eksisterende `quality:local`: komplett bygg, alle ordinære testgrupper, to komplette byte-identiske bygg og deterministiske ZIP-er, skala/atlas, navigasjon, release/fulltekster/film, piano og faktisk lydsignal. Deretter kontrolleres det erklærte deltaet mot låst produksjon, privatgrenser, språk/fullteksttall og kildehistorikk. Låste release-inputs er sporet i samme kilde; det kreves ingen historiske søskenmapper. Node-avhengigheter installeres fra package-lock.json med npm ci og Chromium/WebKit må være tilgjengelige på forhånd. Arbeidsflyten installerer ingenting og deployer ingenting. `delivery/reproducibility.json` inneholder filkart, baseline og ZIP-bevis fra de to komplette produktbyggene.

Ny pakke, deterministisk ZIP, QA-kopi og rapport skrives til den nye resultatmappen. Ingen tidligere evidens overskrives. Rent kildegrunnlag kreves både før og etter testene.

`READY_FOR_OWNER_REVIEW` betyr ferdig lokal kandidat, aldri eier-GO eller publisert resultat. Rapporten binder SHA, Git-tre, manifest, QA-evidens og ZIP SHA-256. Pakken arver ingen gammel `deploy_authorized=true` fra historiske leveranser.

### 3. Prosjekteier gir konkret GO; C06 publiserer

C06 registrerer den faktisk mottatte separate eiergodkjenningen i en privat fil utenfor kilden. Filen dokumenterer en godkjenning; å opprette den gir ingen fullmakt i seg selv:

```json
{
  "project": "modus",
  "source_sha": "FULL_SOURCE_SHA",
  "zip_sha256": "EXACT_CANDIDATE_ZIP_SHA256",
  "baseline_deployment": "CURRENT_BASELINE_DEPLOYMENT_ID",
  "owner_approved": true,
  "approval_reference": "Referanse til prosjekteiers uttrykkelige GO for denne pakken"
}
```

C06 kan kjøre lesende førkontroll separat:

```sh
npm run production:workflow -- preflight --candidate /mappe/kandidat --approval /privat/go.json --out /ny/mappe/forkontroll
```

Den avviser feil prosjekt, gammel canonical deployment, annen kilde/ZIP, endret QA/pakke, privatinnhold, endret kilde, gammel Git main eller aktivert Git-autodeploy. Anonym Access-grense prøves med GET/HEAD/Range. Et generisk 403 er ikke godkjent Access. Førkontroll er ikke publisering.

Etter separat GO kan C06 bruke én kommando som automatisk etterkontrollerer etter opplastingen:

```sh
npm run c06:publish -- --candidate /mappe/kandidat --approval /privat/go.json --owner-go-source FULL_SOURCE_SHA --wrangler-js /eksisterende/wrangler/bin/wrangler.js --out /ny/mappe/publisering
```

Bruk eksisterende installert Wrangler. Ingen `npx`-installasjon kjøres automatisk. Hvis Wrangler finnes på PATH kan `--wrangler-js` utelates. Kommandoen gjentar førkontroll, laster kun den forseglede pakken direkte til `modus`, Cloudflare-gren `main`, og utfører etterkontrollen nedenfor. Dette er ikke Git-push/main-merge og ingen mellomliggende Preview. Sikkerhetskopiert baseline/deployment i førkontrollen er rollback-referanse; rollback krever egen avklart eierinstruks og skal ikke reaktivere Git-deploy.

**A03 implementerer og tester denne C06-kommandoen med testdobler; den kjøres ikke mot Cloudflare i denne oppgaven.**

### 4. Automatisk offentlig etterkontroll

Etterkontrollen leser faktisk nytt deployment-ID fra Cloudflare, kontrollerer riktig prosjekt/canonical/SHA og alle serverbare filhash på den faste produksjonsadressen. `_headers` og `_redirects` er Pages-konfigurasjon og bytehentes ikke som vanlige ressurser; faktisk CSP/nosniff på HTML kontrolleres i stedet. Deployment-originens manifest bindes til samme pakke. Bare eksakt forventet samme-origin HTML-normalisering følges, ingen vilkårlige redirects.

Private offentlige ruter skal være 404. Utgåtte medier skal være 404 direkte, eller via nøyaktig den eksisterende 302-ruten i den låste `_redirects`-filen til `/retired-media-resource`, som selv må være 404. Eksisterende admin-gren og admin-hashadresse skal fortsatt kreve riktig Access-team. Deretter gjenbrukes release-/skala-/lydtestene offentlig i Chromium/WebKit på NB/EN. Offentlig lydtest gjør feil til en hard testfeil, også i den historiske baseline-modusen. Kilde/ZIP og canonical kontrolleres igjen etter alle nettlesertestene. Først `PUBLIC_VERIFIED` er ferdig offentlig teknisk leveranse.

En avbrutt/feilet opplasting eller etterkontroll rapporteres som `PUBLICATION_NOT_VERIFIED`, med `upload_attempted`, eventuell deployment og logger. Det skal ikke påstås at produksjon er uendret etter et opplastingsforsøk. Ikke utfør automatisk ny deploy eller rollback ved en testfeil.

Ved behov kan C06 kjøre etterkontrollen på nytt, uten opplasting:

```sh
npm run production:workflow -- verify --candidate /mappe/kandidat --deployment ACTUAL_DEPLOYMENT_ID --out /ny/mappe/etterkontroll
```

C06 avslutter med kort rapport om SHA, ZIP-hash, faktisk deployment, testresultater, avvik og lokal/offentlig status. Ved bestått etterkontroll lager C06-kommandoen automatisk en kopi av eksakt publisert pakke og `NEXT-BASELINE.json` med nytt deployment, SHA og filinventar. Før neste oppgave bruker C07 disse til å oppdatere låsen og den angitte release-inputs-mappen i en ny isolert kopi; den allerede gjennomgåtte kildecommiten omskrives aldri i stedet. Ingen nye oppgaver eller generelle deployfullmakter opprettes.

## Vern og kontrollgrenser

- Git-autodeploy skal være av på alle Cloudflare-grener; kontrollen stopper ved aktivert produksjon eller Preview. Ikke gjenaktiver Git-integrasjonens deployer.
- GitHub-workflow inneholder bare tester/evidens, ingen skyhemmelighet eller deploysteg. `main` avvises som releasekilde. CI er bare klargjort lokalt inntil en separat godkjent push.
- Wrangler-konfigurasjonens standardoutput peker bevisst til en fraværende sperremappe. C06 må oppgi eksakt godkjent pakkemappe; `dist/` er ingen implicit uploadkilde.
- Metadata støtter både gjeldende dictionary-filmanifest og listeformat, men nye kandidater får ett normalisert versjonert manifest. Doble/nestede/uvalide filnavn, ekstra byte, private filer og symlenker avvises.
- Ingen nye tjenester, avhengigheter, deployplanleggere eller betalte komponenter. Lokal og offentlig QA installerer ingenting automatisk.
- Automatisk WebKit er ikke fysisk Safari-/iPhone-/VoiceOver-attest. Anonym Access-kontroll er ikke autentisert administrator-QA eller en policy-/rettighetsrevisjon. Ingen ekte utkast eller lagringsnøkler berøres.


## C10: gjenta lokal leveranse fra ren kopi

Klon den leverte lokale kilden eller Git-bundlen med full historikk til en ny oppdragsmappe med `source` som undermappe, og bruk grenen `codex/c10-release-workflow`. Installer låste avhengigheter og eksisterende Playwright-nettlesere før kontrollen. Kjør kommandoen over med faktisk full `git rev-parse HEAD` og en ny resultatmappe utenfor source. Alle baselinefiler følger kildecommiten. `check --candidate /mappe/kandidat --out /ny/mappe/kontroll` kontrollerer SHA/tre, filkart, privatgrense, QA, manifest og ZIP på nytt lokalt.

C10 oppdaterer og tester bare lokale utviklerverktøy. Den eksisterende C06-publiseringsfunksjonen er historisk kode og er urørt; ingen ny opplasting, deployfunksjon eller fullmakt inngår. Ikke kjør den som del av denne pakken. Offentlig `verify` brukes først etter en separat autorisert faktisk publisering; C10s lokale kandidat skal aldri omtales som publisert.
