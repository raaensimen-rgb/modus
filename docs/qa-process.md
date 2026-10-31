# MODUS 1.0 – fast QA-prosess (AC-085)

Status: implementert forslag i PR #16. Ikke aktivert og ingen deployment
utført som del av leveransen. Uavhengig QA-07 og prosjektledelsens separate
beslutning om merge/aktivering kreves. Denne prosessen publiserer aldri til
MODUS-produksjon.

## 1. Oppsett som må verifiseres av 04/eier

### Cloudflare

1. Bruk en egen Cloudflare **QA-konto**, forskjellig fra produksjonskontoen.
   Den skal kun inneholde Pages-prosjektet `modus-qa`. Opprett prosjektet som
   **Direct Upload**, uten Git-integrasjon eller egendefinerte domener.
2. Sett prosjektets `production_branch` til `qa-production-disabled` via
   Cloudflare Projects API. Direct Upload har ikke samme dashboardkontroller
   for produksjonsgren som Git-integrerte prosjekter. Dette er en sentinel,
   ikke en Cloudflare-funksjon som deaktiverer alle produksjonsdeployments.
   Workflowen kontrollerer verdien og deployer bare en annen, unik QA-gren.
3. Ingen secrets, miljøvariabler, KV/D1/R2-/service-/AI-/andre runtimebindings
   skal legges på prosjektet. Workflowen kontrollerer kjente previewbindings.
   Serverkode og Pages Functions avvises; dette løpet er **statisk frontend-QA**.
4. Eier oppretter selv et dedikert token med Cloudflare Pages Write/Edit
   (og nødvendig metadata-lesing), begrenset til QA-kontoen. Ikke bruk Global
   API Key, produksjonstoken, alle kontoer, DNS-rettigheter eller Workers-
   administratorrettigheter. Dokumenter utløp, rotasjon og hvem som kan bruke
   tokenet i driftsrutinen, aldri selve tokenet i kode, rapport eller chat.

**Rettighetsgrensen:** Pages Write kan opprette, endre og slette Pages-
prosjekter. Prosjektnavn og previewgren i workflowen er kodekontroller, ikke
en garanti om prosjekt-/grenavgrensning i tokenet. Derfor krever løsningen
separat konto og et token som faktisk er avgrenset til bare den kontoen.
Runtimekontrollen av kontoliste/ID kan ikke bevise tokenets fulle rettigheter
til andre kontoer. Eier/QA-07 må kontrollere tokenpolicyen separat.

Workflowen endrer ikke Cloudflare-konfigurasjon og oppretter ikke prosjektet
automatisk. Hvis konfigureringen avviker, stopper den før upload.

### GitHub

Opprett environment **`modus-qa`** med required reviewer, prevent self-review
og eksplisitt deploy-branchregel for **`main`**. Ikke velg bare «protected
branches» dersom ingen grenbeskyttelse finnes. Aktiver beskyttelse av `main`
og krev review av workflow, `scripts/qa/` og `tools/qa/` (eventuelt CODEOWNERS).
Oppsett av disse innstillingene inngår ikke i kodeendringen.

| Type/plassering | Navn | Verdi |
| --- | --- | --- |
| Repository variable | `MODUS_QA_PROJECT` | `modus-qa` |
| Repository variable | `CF_QA_ACCOUNT_ID` | QA-kontoens 32-tegns konto-ID |
| Repository variable | `CF_PRODUCTION_ACCOUNT_ID` | Produksjonskontoens ID, kun til sammenligning |
| Repository variable | `MODUS_QA_ENABLED` | La være tom til uavhengig godkjenning; deretter `true` |
| Environment `modus-qa` secret | `CF_QA_API_TOKEN` | Eier setter QA-tokenet direkte i GitHub |

Konto-ID-er er ikke API-nøkler. Ikke legg tokenet på repository-/organization-
nivå og ikke gjenbruk gamle `CLOUDFLARE_API_TOKEN`-secrets i dette løpet.
Tilgjengelige verktøy i denne økten kan ikke kontrollere eksisterende secrets
eller Cloudflare-administrasjon. Oppsettet over er derfor **ikke verifisert**.

## 2. Send en PR til isolert QA

1. Noter PR-nummer og **hele head-SHA-en**. Review kildekoden og endringer i
   bygg/test før den kjøres. Workflowen bygger bare commits fra samme repo;
   ingen repository-/gren-/prosjektparameter kan velge andre mål.
2. Etter at selve QA-infrastrukturen er godkjent og merget separat, åpner 04
   **Actions → MODUS isolated QA deployment → Run workflow**.
3. Velg workflow fra **main**, og lim inn head-SHA i `source_sha`. Workflowen
   avviser andre ref-er og alt annet enn full lowercase 40-tegns SHA.
4. Preflight kontrollerer struktur og konfigurering. Bygg/test kjører på egen
   runner uten Cloudflare-token. Hele `npm ci → npm run build → npm test`
   må lykkes før en statisk QA-pakke lastes opp.
5. Reviewer vurderer kildecommit og testbevis før environment-godkjenning.
   Deploy-jobben henter kontrollkode fra workflowens godkjente commit på main,
   **ikke fra kildecommit som testes**. Den bruker ny runner, ingen
   installasjon av kildeavhengigheter og ingen checkout av testkoden.
6. En låst Wrangler-installasjon leses fra `tools/qa/package-lock.json` med
   `npm ci --ignore-scripts`. Tokenet gis bare til ett deploy-steg. Kommandoen
   kjører uten shell i tom arbeidsmappe, uten prosjektets `wrangler.toml` eller
   `functions/`. Artefakten behandles som data og kontrolleres på nytt.

Det brukes kun `modus-qa` fra en kodebasert tillatelsesliste. Prosjektnavnet
er konfigurerbart via variabel, men **ingen andre verdier godtas**. Et nytt
QA-prosjekt krever review av tillatelseslisten, prosjektkontrollen og testene.
Produksjonsprosjektet `modus` kan ikke velges med workflow-input.

## 3. Finn eksakt testet versjon og bevis

Hver kjøring har kilde-SHA, workflow-SHA, run-ID og run-attempt:

| Bevis | Plassering |
| --- | --- |
| PR-regresjonstester | PR Checks → MODUS build and tests → Summary og `modus-test-results` |
| QA-preflight | `qa-preflight-<run-id>-<attempt>` |
| QA-bygg og tester | `qa-tests-<run-id>-<attempt>`: JSON/Markdown og `qa-execution.json` |
| Testet statisk pakke | `qa-site-<run-id>-<attempt>`: site, SHA-256-manifest og testbevis |
| Deployment | `qa-deployment-<run-id>-<attempt>`: `deployment.json` og sanitert Wrangler-logg |

Det komplette kilderepoets eksisterende testpakke kjøres, inkludert eventuelle
nye tester i valgt commit. Dagens infrastrukturgrein har 23 testoppføringer,
der siste oppføring har 20 infrastrukturtester. En eldre kildecommit kan ha
22; det dokumenteres med testbeviset og er ikke et løfte om samme testantall.

QA-07 åpner **den uforanderlige deployment-URL-en** fra `deployment.json`,
ikke produksjon eller en flytende branchalias. Record må ha `status=verified`,
`environment=preview` er verifisert mot API, og rett `source_sha`. Åpne også
`/qa-build.json`: kilde-/workflow-SHA og kjøringsidentitet skal samsvare med
rapporten. Statusen er teknisk identitetskontroll, **ingen visuell godkjenning**.

Client-JavaScript er fortsatt nettstedets kode. Bruk isolert nettleserprofil,
testdata og ingen reelle brukerkontoer. Ingen serverbindings deployeres, men
statiske klienter kan fortsatt inneholde offentlige lenker/API-adresser.
Dette løpet verifiserer ikke ekstern kontosynkronisering, CMS eller betaling.

## 4. Gjenbrukbar QA-sjekkliste

- [ ] Noter PR, kilde-SHA, workflow-SHA, run-ID/attempt, deployment-ID og URL.
- [ ] Bekreft bestått bygg/test og riktig `/qa-build.json`.
- [ ] Desktop 1440 px og mobil 375 px; noter høyde, OS og nettleserversjon.
- [ ] Norsk og engelsk: navigasjon, innhold, status og tom-/feiltilstander.
- [ ] 200 % tekstforstørrelse: ingen avkuttede titler eller skjulte kontroller.
- [ ] Tastatur: Tab/Shift+Tab, synlig fokus, Enter/Space, Escape og fokusretur.
- [ ] Dialoger: åpne/lukke/gjenåpne, tomt/utfylt felt, bakgrunnsklikk.
- [ ] Tilgjengelige navn/roller, kontrast, lesbarhet og berøringsmål.
- [ ] Relevant funksjonstest med isolerte testdata; gjenåpning/nullstilling.
- [ ] Dokumenter skjermbilder og avvik. Ukontrollerte punkter merkes som det.
- [ ] Safari-avvik kontrolleres i faktisk Safari; annen motor er ikke bevis.

## 5. Merge og produksjon er egne beslutninger

QA-07 leverer beslutning for **eksakt kildecommit**. Nye funksjonsendringer
krever ny relevant kontroll. 00 tar beslutning om merge etter review, tester,
fag-/designkontroll der relevant og håndtering av åpne avvik.

Denne workflowen har ingen produksjonsmodus. Produksjonspublisering følger
egen godkjent prosedyre med egen tilgang, produksjonscommit, deployment-ID og
tilbakeføringsplan. Ingen av QA-secrets skal ha produksjonsrettigheter.

## 6. Ved feil

- **Preflight/bygg/test feiler:** ingen deployment. Les Summary og artefakter.
  Manglende testfil er ikke bestått. Rett årsaken og start en ny kjøring.
- **Prosjekt-/konto-/tokenkontroll feiler:** ikke utvid tillatelseslisten for
  å få grønt. 04 kontrollerer oppsettet og tokenpolicyen mot seksjon 1.
- **Wrangler/API/nettverksfeil:** record kan vise `failed` selv om upload er
  delvis eller helt utført. Kontroller QA-kontoens deployments før ny kjøring.
  Ikke gjenta blindt. Unik gren inneholder SHA-prefiks, run-ID og attempt.
- **Live markør/ID ikke verifisert:** ikke gi URL-en status som godkjent QA-
  miljø. Behold bevis. Ikke bytt til produksjon som reserve.
- **Behov for opprydding:** eier kan fjerne feil QA-deployments i QA-kontoen
  etter dokumentasjon. Workflowen sletter/tilbakefører ikke automatisk.
- **Mistanke om lekkasje:** tilbakekall QA-tokenet og roter det i environment.
  Ikke lim nøkkelen i logg eller chat. Bekreft at produksjonskonto ikke var
  omfattet av tokenet.

## Verktøy og valideringsgrenser

Node 22.22.0, Python 3.12.14, PyYAML 6.0.3 og Wrangler 4.151.3 er eksakt låst.
GitHub Actions er låst til commit-SHA. Ubuntu 24.04 er en runnerfamilie som
GitHub oppdaterer; dette er ikke en bit-for-bit låst VM. Transitive Wrangler-
avhengigheter er integritetslåst i egen npm-lockfil. Versjonsoppgraderinger
skal gå gjennom review/test.

YAML parse-/struktur- og sikkerhetspolicykontroll erstatter ikke alle GitHub
Actions-serverens valideringer. Negative tester og falske API/deploy-kall
beviser kontrollflyt, ikke en reell Cloudflare-deployment eller tokenpolicy.
Artefaktkontrollsummer dokumenterer integritet, ikke at ureviewet kode eller
selvskrevne tester er troverdige. Review av source_sha er fortsatt nødvendig.

## Primærkilder kontrollert ved implementering

- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
