# AC-085 – teknisk leveranserapport

Dato: 31. oktober 2026. Leveranse i eksisterende Draft PR #16,
`feature/pl-081-cloud-qa-preview`. Utgangspunkt i PR-commit
`60969738d6a8817ddce58d0fd75d62e04e0a3934`, oppdatert med main
`aada1c39d24a8114c43a2162929fe372bda6b734` (uten endring av main).
Eksakt leveransecommit og GitHub Actions-kjøring føres i PR-beskrivelsen.

## A – sikker QA-deployment

- Erstattet hardkodet gammel baseline med manuelt valgt full kilde-SHA.
- Kun manuell workflow fra main. Kun `contents: read`, ingen vedvarende
  checkout-legitimasjon, handlinger låst til SHA og verktøy til eksakte versjoner.
- Prosjekt konfigureres med repo-variabel, men bare `modus-qa` godtas.
  Produksjonsprosjektet `modus` er avvist. Ingen prosjektparameter i skjemaet.
- Egen QA-konto kreves. Kontrollen avviser lik produksjons-/QA-konto, uventede
  Pages-prosjekter, Git-integrasjon, egendefinerte domener og kjente preview-
  runtimebindings. Tokenets fulle kontoomfang må fortsatt vurderes manuelt.
- Tre jobber: preflight, hemmelighetsfritt bygg/test, separat beskyttet deploy.
  Bare ett deploy-steg får `CF_QA_API_TOKEN` fra environment `modus-qa`.
- Deploy bruker kontrollkode fra workflow-SHA, ikke kildecommit som testes.
  Ingen kildekode, kildeavhengigheter, npm-lifecycle-scripts, shellkommandoer
  eller Wrangler-konfigurasjon fra testartefakten kjøres med tokenet.
- Bare statiske filer. Worker/Functions, symlinker, uventede skjulte filer
  og deploykonfigurasjon avvises. Kjente `.gitkeep`-plassholdere utelates.

## B – automatisk verifikasjon

- Full bygging og eksisterende testpakke beholdes.
- PyYAML med duplikatnøkkelavvisning parser YAML; struktur og sikkerhetspolicy
  kontrolleres automatisk, inkludert feil-/avhengighetsporter før deployment.
- 20 offline-infrastrukturtester inkluderer negative konfigurasjoner,
  feilende testbevis, endret artefakt/commit/kjøringsidentitet, feil prosjekt,
  manglende token, verktøyfeil, API-timeout, ikke-preview-resultat, feil live-
  markør og redigering av utrygge workflow-egenskaper.
- Kilde-/workflow-SHA, run-ID/attempt og testresultater lagres. SHA-256-
  manifest følger den bygde siden. Deploy kontrollerer API-returnert ID,
  previewmiljø, commit, unik gren og uforanderlig URL samt `/qa-build.json`.
- Testbevis/deploymentrecord publiseres som Actions-artefakter, også ved feil
  der stegene kan kjøres. Summary viser utfallet. Ingen feil markeres bestått.

## C – fast prosess

`docs/qa-process.md` beskriver oppsett, valg av eksakt PR-commit, bevis,
standardisert nettlesersjekkliste, merge/produksjonsgrenser og håndtering av
mislykket eller uavklart upload uten blind gjentakelse.

## Utført lokal validering

- `npm ci`, `pip install -r .github/qa/requirements.txt`, `npm run build`.
- `npm test`: 23/23 oppføringer bestått; infrastrukturdelen har 20 tester.
- Egen låst verktøyinstallasjon: `npm ci --prefix tools/qa --ignore-scripts`.
- Installerte Wrangler rapporterer 4.151.3. Ingen innlogging/deployment kjørt.
- Den reelt bygde siden er pakket og kontrollert med samme kode som QA-
  løpet: 348 statiske filer, inkludert build-identitetsmarkør. Ingen upload.

Dette dokumenterer kode og offline-kontroller, ikke en gjennomført deployment.
GitHub Actions-serverens fulle språkvalidering, reell tokenpolicy og faktisk
Cloudflare/Safari-QA krever fortsatt egen kontroll. Runner-VM-en er ikke
bit-for-bit låst. Tester som følger kildecommit kan ikke erstatte kildekodereview.

## Konkret blokkering for aktivering

Det finnes ingen tilgjengelig Cloudflare-administrasjonstilkobling i denne
økten. QA-konto/prosjekt, ID-er, sentinelgren og tokenavgrensning kan derfor
ikke verifiseres. GitHub secrets/environment-beskyttelse er heller ikke
tilgjengelig for kontroll gjennom verktøyene som er brukt.

04/eier må verifisere/opprette oppsettet i seksjon 1 av `qa-process.md` og
QA-07 må gjennomføre uavhengig sikkerhetsreview. Workflowen ligger i Draft PR
og er ikke manuelt startet, aktivert eller merget. Manglende variabler eller
`MODUS_QA_ENABLED != true` vil stoppe preflight. Ingen nøkler er opprettet,
forespurt i chat eller eksponert; ingen produksjonsendring er utført.
