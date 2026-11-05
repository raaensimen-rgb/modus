# MODUS 2.0 · M3.2 · isolert Cloudflare Preview

> Historisk M3.2-rapport. Backend-blokkeringen og oppsettsforslaget nedenfor er videreført og oppdatert i [M3.3](modus-2-m3.3.md). Bruk M3.3-oppskriften for nye bygg; denne rapportens SHA og funn beskriver M3.1.

**Status: lokal kontroll og konkret oppsett er klargjort. Publisering av den nåværende M3.1-artefakten er blokkert av backend-koblinger. Ingen skytjeneste er opprettet eller endret.**

Kontrollert kilde: `raaensimen-rgb/modus`, gren `dev/modus-2-pr52`, HEAD `0e2e62d23e209b46077d01cea9824e6bbe6baa06`.

## 1. Miljø og eksisterende konfigurasjon

- Rotens `wrangler.toml` har `name = "modus"`, `pages_build_output_dir = "./dist"` og `compatibility_date = "2026-10-27"`. Den inneholder ingen lokale bindings-/hemmelighetsdefinisjoner. Filen er urørt.
- Dashboard-innstillinger, eksisterende Pages-prosjekter, domener, deploy hooks, Access-regler og serverlagrede secrets er **ikke** lest eller verifisert. Kontrollen her er utført lokalt; ingen Cloudflare-API-kall mot kontoen er gjort. Cloudflare-token og konto-ID er ikke satt i de undersøkte miljøvariablene. Dette beviser ikke at andre innloggingsmekanismer mangler.
- `cms/deployment-config.json`: `publishingEnabled=false`. `client/supabase-config.json`: `accountsEnabled=false`, men inneholder URL og en offentlig publishable key til den eksisterende Supabase-backenden.
- Ingen `functions/`-mappe finnes. Eksisterende bygg fjerner `_worker.js` og `_routes.json`, og kopierer ikke `cms/`-runtime til output. `cms/middleware.mjs` kan lese og injisere eksternt CMS-innhold dersom den senere aktiveres; den skal forbli parkert.
- Eksisterende GitHub-workflow kjører tester og pakker egne artefakter. Den inneholder ikke en deployjobb. Workflowens eksplisitte produksjonspakking bruker `MODUS_PLATFORM_RELEASE=1`; dette valget skal ikke gjenbrukes i dette testprosjektet.
- `dist/` har historisk sporede genererte filer. Ikke bruk et generelt `git add .`, og ikke tolk byggeendringer i `dist/` som endret kildecommit.

## 2. Foreslått eksakt testkonfigurasjon

Maskinlesbart forslag: `preview/modus-2-preview.project.proposed.json`. Filen er et **uutført API-/konfigurasjonsforslag**, ikke et bevis på at et prosjekt finnes. Cloudflare-konto og GitHub-appens repository-tilgang må verifiseres etter separat tillatelse.

| Felt | Verdi |
|---|---|
| Prosjektnavn | `modus-2-preview` |
| GitHub-kilde | `raaensimen-rgb/modus` |
| Utviklings-/Preview-gren | `dev/modus-2-pr52` |
| Production branch i dette nye prosjektet | `main` som klassifisering; ingen produksjonsdeploy tillates |
| Automatiske produksjonsbygg | `production_deployments_enabled=false` |
| Automatiske Preview-bygg ved oppstart | `preview_deployment_setting="none"` |
| PR-kommentarer fra testprosjektet | `pr_comments_enabled=false` |
| Root directory | Repository-roten |
| Build command | `npm run build` |
| Build output | `dist` |
| Preview build variables | `MODUS_CATALOG_PREVIEW=1`, `NODE_VERSION=22` (som eksisterende CI) |
| Production variables | Tomt |
| Release flag | `MODUS_PLATFORM_RELEASE` skal være fraværende |
| Supabase-/Stripe-secrets, D1/KV/R2, service bindings, routes | Ingen kopieres eller kobles til |
| Custom domains | Ingen |
| Første deploy | Manuell, med eksplisitt prosjekt, Preview-gren, godkjent SHA og manifest |

Etter senere separat godkjenning kan automatikk eventuelt åpnes med `preview_deployment_setting="custom"`, `preview_branch_includes=["dev/modus-2-pr52"]` og tom exclude-liste. Produksjonsbygg forblir av. Ikke bruk `all`. Ikke aktiver automatikk før riktig Preview-byggmodus, kilde-SHA, Wrangler-valg og Access er verifisert.

Det nye prosjektets innstillinger endrer ikke Git-grenen `main`. Et push kan likevel trigge **andre allerede tilkoblede Pages-prosjekter**. Derfor skal første manuelle Preview ikke kreve et push. Eksisterende prosjektkontroller må avklares før eventuell senere GitHub-push; de er ikke endret her.

## 3. Faktisk publiseringsomfang

Lokalt bygget med `CF_PAGES=1`, `CF_PAGES_BRANCH=dev/modus-2-pr52`, `CF_PAGES_COMMIT_SHA` lik kontrollert HEAD og `MODUS_CATALOG_PREVIEW=1`. `CONTEXT` og `MODUS_PLATFORM_RELEASE` var eksplisitt fjernet fra byggmiljøet.

| Kontrollert kombinasjon | NB / EN |
|---|---|
| Flagget av | 0 kort, 0 illustrasjoner, 0 fulltekster |
| Utviklingsgren + Preview-flagget | 16 passive kort, 16 godkjente illustrasjoner, 0 fulltekster |
| `main` + Preview-flagget | 0 kort, 0 illustrasjoner, 0 fulltekster |
| `CONTEXT=production` + Preview-flagget | 0 kort, 0 illustrasjoner, 0 fulltekster |

`MODUS_CATALOG_PREVIEW` er et **byggflagg for katalogens publiseringsomfang**, ikke autentisering, nettverksisolasjon eller en Supabase-sandbox. Ikke sett `CF_PAGES_BRANCH`, `CF_PAGES_COMMIT_SHA` eller `CONTEXT` manuelt i en ekte Git-integrert Pages-build; Cloudflare leverer korrekt build-metadata. Lokalt ble de satt bare for å simulere miljøet.

Preview-bygget består publiseringsaudit: 336 filer, 95 private kildefragmenter fraværende, tom `cms-seed.json`, ingen åpne private artikkelfulltekster, ingen privat undervisningsruntime eller CMS-worker. Alle 30 eksisterende ordinære kontroller består. Originale private kilde-/godkjenningsregistre er uendret.

Bevis: `test-results/m3.2/publication-matrix.json`, `test-results/publication-audit.json` og `test-results/test-results.json`.

## 4. Produksjonskoblinger og blokkeringer

Den eksisterende Supabase-adressen behandles som produksjon/delt backend. Dens faktiske miljøklassifisering, RLS og Data API-tilgang er ikke testet mot tjenesten.

| Del | Funn | Krav før offentlig Preview |
|---|---|---|
| Konto | Skjemafeltene er deaktivert, men SDK-klienten opprettes før flaggsjekken og bruker eksisterende backend. Sesjonshåndtering, tokenfornyelse og kode for synkronisering finnes fortsatt. | Preview må bruke lokal/gjestefremdrift uten produksjonsklient, eller en separat testbackend etter egen godkjenning. |
| Kontakt / feedback | Hardkodet POST til eksisterende `modus_feedback`. En besøkende kan sende selv om konto er deaktivert. | Deaktiver innsending tydelig i Preview eller bruk separat godkjent testmottaker. |
| Nettredaktør | Egen innlogging og registrering er aktive. `accountsEnabled=false` stopper ikke disse. `publishingEnabled=false` sperrer publisering, men ikke all innlogging, lesing, `cms_save_draft` eller oppdatering av feedback for en autorisert redaktør. | Ikke lever aktiv editor-/auth-/utkastkode i offentlig testartefakt. Behold eventuelt en tydelig statisk sperreside på ruten. |
| CMS-runtime | Parkert i eksisterende bygg. | Ingen `_worker.js`, `functions/` eller dynamisk CMS-runtime i første Preview. |
| Medlemskap | `salesOpen=false`, `lifecycleReady=false`, tomme checkout-/portal-lenker. | Behold deaktivert. Ingen betalingshemmeligheter eller live betaling. |
| HTTP-grense | Nåværende `_headers` har bare editorens noindex/cache-regler. | Egen Preview-CSP som blokkerer ekstern dataoverføring og skjemaer, som ekstra vern. |

Nettleserproben blokkerte **alle eksterne requests før de ble sendt**, og observerte to faktiske skriveforsøk: feedback-POST til `/rest/v1/modus_feedback` og redaktørinnlogging til `/auth/v1/token`. **0 backend-requests ble videresendt.** Syntetisk testtekst og `.invalid`-adresse ble brukt; ingen ekte brukerdata eller legitimasjon ble brukt.

Bevis: `test-results/m3.2/runtime-probe.json`. Dette bekrefter koblingen i klienten, ikke at databasen ville godta innsetting eller at RLS er feil. Publishable key er beregnet på offentlig klientbruk og er ikke en service-role-hemmelighet. Ingen secret-key-/privatnøkkelmønstre ble funnet av den avgrensede artefaktsjekken; dette er ikke en full hemmelighetsattest av skykontoen.

**Nåværende SHA er derfor ikke godkjenningsklar for en offentlig, backend-isolert deploy.** Ingen sikkerhetsmodifikasjon er skjult i det genererte bygget: dette oppdraget har bevart M3.1-kildene og dokumentert hva som må rettes. Det kreves en ny separat kontrollert kildeversjon for Preview-begrensningene, med nye tester. Frontendens gjesteprogresjon, søk, språk og film bør beholdes.

## 5. Konkrete lokale forberedelser

- `preview/check-preview-artifact.py`: leser output, kontrollerer SHA/gren/kildestatus, genererer SHA-256-manifest og stopper med exit 2 ved backend-koblinger, aktiv editor, privat output, CMS-runtime, secret-mønstre eller manglende global Preview-CSP. Det er ikke en deploykommando eller en komplett sikkerhetssertifisering.
- `preview/prepare-reviewed-upload.sh`: lokal bygging/audit og staging, ingen nettverksdeploy. Nåværende M3.1 stanser i kontrollen før en opplastingsmappe opprettes.
- `preview/wrangler.preview.toml.example`: eget, korrekt prosjektnavn for en senere separat opplastingsmappe. Rotens `wrangler.toml` blir aldri erstattet. Byggvariabler settes i Pages build settings, ikke som om `[vars]` i Wrangler automatisk kontrollerer HTML-bygget.
- `preview/_headers.proposed`: separat CSP/noindex/no-store-forslag, ikke installert i `dist/` eller produksjonskilder. CSP er ekstra vern; å skjule en knapp eller legge til CSP alene erstatter ikke Preview-frakobling av klientene.

Den lokale sikkerhetskontrollen er testet med ni syntetiske fixtures: trygg minimal artefakt, backend-referanse, syntetisk secret, editor, worker, privat sti, ikke-tom seed, manglende CSP og feil SHA. 9/9 forventede utfall består. Originalartefakten blokkeres som forventet.

## 6. Tilgangsbeskyttelse

Anbefalt første gjennomgang: Cloudflare Access med en eksplisitt godkjent eier-/QA-tillatelsesliste **før innhold lastes opp**. Identiteter og tilgangsregler er ikke bestemt eller opprettet her.

Preview-URL-er er offentlige som standard. Pages sin Access-innstilling dekker Preview-deploymenter, men ikke automatisk prosjektets vanlige `modus-2-preview.pages.dev` eller egne domener. Verifiser uautentisert tilgang mot både hash-URL, grenalias og prosjektets rotadresse. Ikke legg ut innhold på rot-/produksjonsadressen. Verken noindex eller en vanskelig URL er tilgangsbeskyttelse.

Access er nyttig for kontrollert gjennomgang, men hindrer ikke en autorisert tester fra å sende et produksjonskoblet skjema. Backend-frakoblingen må derfor gjennomføres uavhengig av Access. En senere offentlig demo krever eget GO etter samme dataisolasjon.

## 7. Sporbarhet og første deploy – kommandoer som IKKE er kjørt

### A. Etter at Preview-begrensningene er implementert og en ny SHA er godkjent

```sh
# Sett til faktisk ny gjennomgått SHA; ikke anta at M3.1 er sikker å publisere.
export APPROVED_SHA='<GODKJENT_FULL_40_TEGNS_SHA>'
bash preview/prepare-reviewed-upload.sh
```

Skriptet kontrollerer aktiv gren, HEAD og sporede kilder, kjører eksisterende `npm run build` og publiseringsaudit, og deretter artefaktkontrollen. Ved bestått kontroll opprettes en ny mappe under systemets temp-katalog med **kun** `dist/`, separat Wrangler-konfigurasjon og et utenforliggende kilde-/artefaktmanifest. Ingen kilde-/miljøfiler kopieres til offentlig output.

Kontroller manifestets `source_sha`, samtlige filhashverdier og `manifest_sha256` mot den godkjente pakken. `--commit-hash` er deployment-metadata, ikke i seg selv bevis på hva som er bygget. Opplastingsmappen skal ikke redigeres etter godkjenningen. Sammenlign filene på nytt før opplasting.

### B. Bare etter separat tillatelse til å opprette det nye Cloudflare-prosjektet

```sh
# Konto-ID/token må tilhøre korrekt konto og være eksplisitt godkjent.
: "${CLOUDFLARE_ACCOUNT_ID:?Konto-ID mangler}"
: "${CLOUDFLARE_API_TOKEN:?Token mangler}"
curl --fail-with-body --request POST \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects" \
  --header "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  --header 'Content-Type: application/json' \
  --data-binary @preview/modus-2-preview.project.proposed.json
```

Ikke kjør POST dersom navnet allerede finnes. Verifiser ny prosjekt-ID, kilde, build command/output, begge miljøers variable-/bindingsnavn, disabled automatiske bygg og ingen custom domains. GitHub-appens installasjon kan kreve oppsett/tilgang som ikke er bekreftet her. Ikke logg token eller secret-verdier. Slå på og test Access før neste steg.

Ingen GitHub-push er nødvendig for manuell opplasting. En ad hoc-deployment kan merkes med lokal SHA selv om den ikke finnes på GitHub ennå; rapporter det ærlig. For senere Git-bygde deploymenter må fjernbranchens head, Cloudflares checkout-logg og deploymentens commit-hash samsvare.

### C. Bare etter separat deploy-GO for manifest, konto, prosjekt og Access

```sh
# Bruk den konkrete mappen som det lokale skriptet opprettet etter beståtte kontroller.
export PREVIEW_STAGE='<ABSOLUTT_GODKJENT_TEMP_MAPPE>'
export WRANGLER_VERSION='<GODKJENT_EKSAKT_CLI_VERSJON>'
: "${PREVIEW_STAGE:?}"
: "${WRANGLER_VERSION:?}"
cd "$PREVIEW_STAGE"
# Verifiser på nytt at wrangler.toml sier modus-2-preview og at pakken matcher manifestet.
# Sett verdien ærlig fra manifestets git_worktree_dirty; byggoutput kan gjøre Git dirty.
export PREVIEW_COMMIT_DIRTY='<true_eller_false_fra_manifest>'
npx --yes "wrangler@${WRANGLER_VERSION}" pages deploy ./dist \
  --project-name=modus-2-preview \
  --branch=dev/modus-2-pr52 \
  --commit-hash="$APPROVED_SHA" \
  --commit-dirty="$PREVIEW_COMMIT_DIRTY"
```

CLI-versjonen er ikke installert/låst for deploy i dette oppdraget. Kontroller og lås den før GO. Opplastingen kjøres fra staging-mappen utenfor repositoriet, slik at rotens `name="modus"`, lokale `.env`-filer eller produksjonsbindings ikke autodetekteres. Ikke kjør en bar `wrangler pages deploy` fra repository-roten.

Lagre deployment-ID, immutable hash-URL, prosjekt-ID, branch, SHA, build-logg og manifest ved godkjenningen. Kontroller faktiske NB/EN-URL-er, HTTP-headere, Access, fravær av eksterne backend-requests og publiseringssperrer. Ikke stol bare på grenaliaset, som kan flyttes til senere deploymenter.

## 8. Blokkeringer og konkret godkjenningspunkt

1. **Kode/artefakt:** fjern eller isoler eksisterende backend-klienter, feedback-sending og aktiv editor i en separat Preview-byggmodus. Behold CMS-runtime parkert og test at ingen eksterne backend-requests forsøkes, også med simulerte sesjoner. Kjør eksisterende funksjons- og publiseringstester på ny SHA.
2. **Cloudflare-oppsett:** korrekt konto, repository-tilgang, tilgjengelig prosjektnavn, eksisterende auto-builds og fravær av produksjonshemmeligheter/bindings er ikke verifisert eksternt. Ny prosjektkonfigurasjon og Access må kontrolleres etter eksplisitt tillatelse. Root-Wrangler-filens navneforskjell må avklares før eventuell Git-automatikk åpnes; manuell staging unngår den i første deploy.
3. **Tilgang:** eier-/QA-identiteter må velges, og alle relevante URL-varianter må beskyttes/verifiseres.
4. **Sporbarhet:** godkjenn nøyaktig ny SHA, kilde-/artefaktmanifest, CLI-versjon og deployment-target. M3.1 sin dokumenterte SHA forblir uendret her og kan ikke alene brukes som GO.

Foreslått godkjenningspunkt: Prosjekteier gjennomgår **ny testet SHA + bestått isolasjonskontroll + manifest + modus-2-preview-oppsett + Access-tillatelsesliste** og gir separat eksplisitt tillatelse til prosjektopprettelse og den ene første Preview-deploymenten. Dette dokumentet er ikke en slik tillatelse.

## Kilder

Kontrollert mot offisiell dokumentasjon 2. november 2026:

- [Cloudflare Pages branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)
- [Preview deployments og Access-begrensningene](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Pages project create API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)
- [Wrangler Pages deploy-flagg](https://developers.cloudflare.com/workers/wrangler/commands/pages/)
- [Pages Wrangler-konfigurasjon og source of truth](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase changelog](https://supabase.com/changelog): ingen database-/SDK-migrasjon utført. Data API-/RLS-status på eksisterende tjeneste er ikke utledet fra changeloggen.

**Ingen push, merge, commit, Cloudflare-opprettelse, deploy, produksjonsendring eller databaseforespørsel er utført i M3.2.** Nye forberedelsesfiler er lokale og ikke committet.
