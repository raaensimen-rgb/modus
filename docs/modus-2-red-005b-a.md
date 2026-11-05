# RED-005B-A – lokal implementeringsforberedelse

**Til:** 00 – Prosjektledelse. Fagansvar 04; kontrollgrunnlag 03 og 05. **Dato:** 03.11.2026. **Status:** lokal forberedelse levert; ingen aktiv backendimplementering eller miljøgodkjenning.

**Verifisert gren:** `dev/modus-2-pr52`. **HEAD/baseline:** `e54572dda08b425301f6943fae54af56f38316eb`. Forelder `8f386b54b207ae16bd92af379c673508c8ef6214`; RED-002A/003/004 inngår. Styrende kontrakt er eksisterende `docs/modus-2-red-005a.md`, eksplisitt **v1.1**. Denne er beholdt uendret. Den nye B-A-ordren autoriserer bare lokal forberedelse; den er ikke G1-fullmakt.

Ingen ny commit er opprettet. Alle nye forberedelsesfiler identifiseres med filmanifest/SHA-256, ikke ved å tillegge dem baseline-commitens innhold. Eksisterende lokale dist-endringer, brukerfiler og historiske testresultater bevares.

## 1. Hva som faktisk er levert

En smal, ikke-aktivert modell rundt eksisterende CMS: kontrollert utkastlagring, immutable versjonssnapshot, fag-/rettighetskontrollpakke, eierbinding med epoke, kortlivet challenge/step-up-receipt og append-only hendelser. Ingen ny CMS-arkitektur, ny binding eller endret design.

| Lokal fil | Leveranse |
| --- | --- |
| `docs/red-005b-a/inventory.md` | Grants/RLS/RPC-/skriveveismatrise, faktiske svakheter og live-ukjente privilegier. |
| `docs/red-005b-a/contracts.md` | TargetV1, kandidathash, rollegrenser, server-/klientkontrakter, MFA, revoke, idempotens, audit og fail closed. |
| `docs/red-005b-a/drafts/01-private-model.sql.txt` | Ikke-utført DDL-design for 8 private tabeller og 4 kandidatroller; RLS/FORCE, eier/executor-skille og default-deny. |
| `docs/red-005b-a/drafts/02-cutover-contract.sql.txt` | Ikke-utførte kapabilitetsstubber som alltid avviser, samt atomisk cutover-plan. Ingen app-EXECUTE eller endring i eksisterende save. |
| `docs/red-005b-a/drafts/03-inventory-queries.sql.txt` | Ikke-utførte katalogspørringer for senere privilegie-/RLS-/rollekontroll. |
| `docs/red-005b-a/model.py`, `canonical-candidate.mjs` | Syntetisk sekvensiell modell og uavhengig JS-kandidatencoder, bare testkode. |
| `docs/red-005b-a/test-plan.json`, `test_preparation.py` | OA-01–OA-28: konkrete v1.1-scenarioer, forventninger, lokal dekning og utestede integrasjonskrav. |
| `docs/red-005b-a/run_checks.py`, `recheck_browser.py`, `README.md` | Repeterbare lokale kontroller, avgrenset nettlesernykjøring og veiledning uten overskriving av historiske logger. |
| `test-results/red-005b-a/` | Før-/etterbevis, kildeinventar, nye logger, artefaktmanifest, bytekontroll, QA-manifest/kontrollsummer og arkiv. Ignorert lokal evidens, ikke appdata. |

SQL-tekstfilene ligger bevisst **utenfor** `supabase/schema`, `supabase/migrations` og byggeløpet. Hver helfil stopper med RAISE og ender ROLLBACK. **Ingen SQL er kjørt eller validert i en SQL-motor.** Dette er ikke ferdige migreringer som kan aktiveres ved å fjerne stopplinjen. Policyer/kapabiliteter/serverkanonisering/faktisk Auth-gate må implementeres og testes separat før en brukbar migrering kan godkjennes.

## 2. Kartlegging og minste sikre endring

Eksisterende SQL gir authenticated direkte INSERT/UPDATE på alle redaktørutkast og publikasjoner, INSERT i historikk og sequence USAGE. RLS sjekker aktivert redaktør, men direkte DML kan omgå RPC-revisjon/historikk/aktør. Den eksisterende save-funksjonen er SECURITY INVOKER og avhenger av disse rettighetene; de kan derfor **ikke bare revokeres** uten en ny, ferdig kontrollert lagringsvei. `publishingEnabled:false` er UI, ikke serverbeskyttelse.

Fremtidig endring må etableres atomisk: samme save-signatur og 40001-semantikk → privat, smal kapabilitet med aktørkontroll → korrekt minsteprivilegium/RLS → direkte DML og samtlige gamle omveier tilbakekalles i samme cutover. Ufullstendige utkast lagres fortsatt, selv om hash/media/bevis ikke er klare for godkjenning. RED-002A-lokal lagring, eksport, eksplisitt gjenoppretting og konfliktbehandling beholdes. Ingen forfatterprivat lagringsmodell innføres; dagens repository-delte redaktørutkast beholdes.

Fremtidig backendpublisering skal stenges for alle approller gjennom hele første implementeringsfase. Eierbeslutning blir ikke publisering. Git-policy, NB-/EN-bevis og eksakt kildehash er fortsatt autoritative. Parkert Worker og M3.3-isolasjon beholdes.

Quizprogresjon og feedback er også kartlagt. `modus_feedback` brukes fra offentlig innsending og redaktørinnboks, men tilhørende DDL finnes ikke lokalt. Historisk notat om en anvendt migrering er ikke live bevis. Hele installerte privilegieinventaret, service/admin-arv/defaultprivilegier, views/GraphQL/jobs/triggere og Auth-tilstand kan **ikke verifiseres uten senere isolert miljø**. Denne begrensningen skal ikke omgås med produksjonslesing.

## 3. Bindende sikkerhetsavhengigheter

| Krav | Lokal forberedelse | Gjenstår før faktisk kontroll/eierflyt |
| --- | --- | --- |
| F01 / K03 | Skille creator/rights_holder, immutable assetversjon/hash, dokumentert bruks-/språkomfang og lisens/credits. | Verifiserte rettigheter til bearbeiding, oversettelse, redistribusjon per NB/EN; 03s faglige akseptanse. Ukjent/omstridt blokkerer. |
| F02 / K02 | Claim-ID/passasjehash/locator/kildeversjon og faktisk støtte/motstrid i kontrollpakke. | Faktisk kildearbeid, relevans/autoritet og dokumentert behandling av motstrid; struktur/URL er ikke sannhet. |
| F03 / K01 | Lokal checked er ikke attestasjon; egen mandat-/scope-/språk-/varighetskontrakt og utførte kontrollhandlinger. | Verifisert kontrollørmandat og manuelt vurdert faglig arbeid; ingen automatisk full pass. |
| F04 / K04 | Funnslivssyklus og bevisrevokering uten endret tekst/R. Modell viser umiddelbar invalidering. | Database/API-bevis for atomicitet, race og samme-R-revoke; faglig kontroll av funn og lukking. |
| 05-S01 | Alle lokale skriveveier og nødvendig atomisk cutover beskrevet. | Faktiske ACL/RLS/rolle-/overlastingsprøver, legitim save og ingen alternativ DML. |
| 05-S02 | Ny provider-challenge etter prepare, privat receipt bundet person/session/target/epoch/serverklokke. | Virkelig provider-/servergate, fersk MFA, aktiv sesjon og dokumentert logout-lineariseringspunkt; AAL2/JWT-iat alene utilstrekkelig. |
| 05-S03/S04 | Alle F-/K-gater er eksplisitte; lokal aktivitet kan ikke godkjenne. | F01/F02 løst før reell attestasjon; F03 obligatorisk, F04 ved relevante/ukjente funn. |
| 05-S05 | Python/JS-kandidatbytes og navngitt hashdomene; privat immutable snapshot/media/bundle. | SQL/JS-golden vectors, godkjent schema/renderkontrakt, immutable assetresolver og separat Git-adapter. |
| 05-S06 | OA-01–28 og syntetiske negative tester forberedt. | Faktiske isolerte API/Auth/DB/RLS-/samtidighetsprøver, replay/idempotens/revoke/audit med uavhengig QA. |
| 05-S07 | Serverstengt publisering gjennom hele første fase er eksplisitt cutover-krav. | Bevis på avslag i alle gamle publish-RPC/table/job/worker-veier for ALLE approller i isolert miljø. |

Ingen av disse markeres teknisk lukket av en dokumentasjons-/modelltest.

## 4. Testresultater og bevisomfang

Ny forberedelsestest: `PYTHONDONTWRITEBYTECODE=1 python3 docs/red-005b-a/test_preparation.py` – **28/28 bestått**. Det er 28 lokale tester med OA-spor, **ikke** 28 godkjente DB/Auth-akseptansetester. Testene omfatter tuple-/språkmismatch, materialendringer, identisk innhold i ny revisjon, stale save, receipt/nonce/epoch/replay, revoke av gamle beslutninger, bevisrevokering uten innholdsendring, feil-/audit-/timeoutmodeller og separate Git-/publiseringsgrenser. Rolle-, JWT-, MFA- og fagutfall er eksplisitte syntetiske fixturer. Ingen ekte kryptografi, RLS, SQL-transaksjon eller faglig sannhet er testet av modellen.

Kommandoer, exit codes og logg ligger i `test-results/red-005b-a/run-01/commands.json` og tilhørende `.log`:

- `npm run build` ordinært: **bestått**. `npm test`: **33/33 bestått**.
- `MODUS_ISOLATED_PREVIEW=1 MODUS_PREVIEW_PROJECT=modus-2-preview MODUS_CATALOG_PREVIEW=1 CF_PAGES_BRANCH=dev/modus-2-pr52 npm run build`: **bestått**. Samme miljø med `npm test`: **33/33 bestått**.
- Helartefaktkontroll: ordinært **304 filer**, isolert **339 filer**; ingen nye forberedelsesfiler/private dokumentasjonscanaries i output. Eksisterende publikasjonstest prøver private innholds-/RED-003-/RED-004-canaries og både NO/EN. Manifestene dokumenterer alle artefaktfiler.
- Ordinært bygg med/uten den nye forberedelsesmappen: **304/304 filer byteidentiske, 0 avvik**. Dette er sammenligning av samme faktiske lokale kildegrunnlag, ikke attestasjon mot en historisk produksjonsdeploy.

Alle bygg/tester som skriver output er kjørt i en disponibel, fysisk separat kilde-/Git-kopi med eksisterende avhengigheter. Rotens dist og tidligere evidens er ikke gjenoppbygd. Root-HEAD alene beviser ikke de nye ucommittede forberedelsesfilene; QA-manifestet binder dem separat.

**Nettleserregresjoner:** første forsøk i run-01 fikk lokal `listen EPERM`; browser-recheck-01 nådde lokal server, men Playwrights administrerte Chromium manglet. Disse forsøkene er beholdt som miljøblokkerte, ikke applikasjonsfeil eller beståtte tester. I browser-recheck-02 brukes allerede installert Chrome gjennom én dokumentert executablePath-endring **bare i de midlertidige testkopiene**. **Endelig resultat: RED-002A 20/20, RED-003 11/11 og RED-004 12/12 bestått; null eksterne forespørsler og sidefeil.** Resultater finnes i `browser-recheck-02/`, med SHA-256 for original og midlertidig adaptert testfil. Originale testfiler/appkode er uendret; tester bruker syntetisk SDK og blokkerer ekstern trafikk. Ingen nye eier-UI-er er implementert eller visuelt godkjent.

En første avsluttende artefaktkontroll avviste korrekt kildeproveniens fordi testkopieringen også utelot sporede, arkiverte `del-1/dist`-filer. Kopieringen er rettet til å utelate bare rotens genererte dist. Den mislykkede kontrollen beholdes i `final-artifacts-01`; komplett, korrigert kontroll finnes i `final-artifacts-02`. Dette var en feil i testforberedelsen, ingen app-/publiseringsendring.

SQL-utkast er bare struktur-/tekstkontrollert (STOP/ROLLBACK, separat plassering, ingen app-EXECUTE); **SQL-syntaks-/RLS-/GRANT-/migreringstest er ikke kjørt**. Full OA-akseptanse er NOT RUN i test-plan.json. Negative faglige eksempler krever i tillegg manuell 03-vurdering.

## 5. Neste isolerte implementeringsplan

| Trinn | Fremtidige filområder / leveranse | Port |
| --- | --- | --- |
| B1 – inventar | Gjennomgå `drafts/03`, innhent godkjent isolert schema/ACL/Auth-konfigurasjon og feedback-DDL; noter alle overloads/arv/defaults. | G1, navngitt miljø og eksplisitt fullmakt før kontakt. |
| B2 – fungerende save-grense | Ferdigstill gjennomgått migrering fra DDL-/cutover-utkast; private guards/executors/RLS, uendret offentlig save-signatur. Ingen eierflow eller publish åpnes. | Legitimate save + RED-002A/003/004 og OA-06/26/28 må bestå atomisk. Ingen brede DML-fallbacks. |
| B3 – serverhash/fagpakker | Privat canonicalizer/golden vectors og immutable assetmanifest; snapshot-sidecar og mandat/evidence/funnskontrakt. Ikke normaliser legacy-data stille. | F/K og 03/04/05 godkjenner modell/prosess; reell attestasjon fortsatt ikke autorisert. |
| B4 – MFA/personlig test | Ny isolert servergate/receipt/prepare/confirm/revoke/status; klientadapter i eksisterende redaktør først etter stabil kontrakt. | Separat Auth-/serverfullmakt, syntetisk UUID, ingen produsentcredentials; fail closed ved manglende mekanisme. |
| B5 – full negativ akseptanse | OA-01–28 via API/DB/Auth + faglig manuell test, parallelle transaksjoner, audit/feil/invalidering og rollback. | 05 uavhengig teknisk kontroll, 03 faglig kontroll; intet kritisk avvik kan vektes bort. |
| B6 – eventuell videreføring | Server↔Git-bro/fersk revokasjonskontroll og release vurderes som separat oppdrag. | Ny 00-/prosjekteierbeslutning; ingen publisering følger av B1–B5. |

Tilbakeføring i senere testmiljø: steng nye beslutninger/receipts, frys owner binding og øk epoch; behold publish stengt og immutable hendelser/snapshots. Ingen gjenåpning av brede tabellrettigheter som snarvei. Bevar bevis før eventuell godkjent destruktiv opprydding. Ingen rollback kjøres nå.

## 6. Eksakte handlinger som krever separat prosjekteiergodkjenning

1. Kontakte, opprette eller velge faktisk isolert database/Auth-/skyprosjekt, med navngitt konto/prosjekt/versjon, tilgang, ressurs-/kostnadsramme og syntetiske data. Dette inkluderer kjøring av katalogspørringene, selv om de bare leser.
2. Kjøre SQL, migreringer eller endre roller, medlemskap, grants/default ACL, RLS, funksjoner, exposed schemas, triggers/jobs eller eksisterende databasedata.
3. Opprette/binde servergate, nye service-/verifierkapabiliteter, secrets, Auth-konfigurasjon/MFA, syntetiske kontoer eller kjøre faktiske API/Auth-/database-/samtidighetstester.
4. Aktivere en eier-testbinding med bekreftet syntetisk UUID. Reell personlig eierbinding eller faktisk artikkel-/fag-/rettighetsgodkjenning krever en ytterligere uttrykkelig beslutning; ingen slik identitet er antatt nå.
5. Aktivere ny eierflyt i klient/server eller reell kontrollpakkeimport/attestasjon. Lokal UI-/kodeimplementering utover denne forberedelsesmappen må bestilles separat. Eksisterende funksjoner berøres ikke av B-A.
6. Implementere/aktivere releaseverifikator eller server↔Git-bro, åpne backendpublisering, faktisk publisering, produksjonsendring, GitHub-push/merge, Cloudflare-opprettelse/endring/deploy/DNS/Access eller nye betalte tjenester.
7. Destruktiv rollback, sletting av miljø/data/audit eller opprydding som berører eksisterende brukerfiler. Dette er ikke del av ordinær disponibel lokal testkopi.

Ingen ny tjenestekostnad er påløpt. Fremtidige miljø-/Auth-/MFA-/loggingkostnader er ikke undersøkt mot en valgt konto og må avklares før G1; det gis ingen påstand om kostnadsfri cloudaktivering.

## 7. Kilder og verifikasjonsgrenser

Lokal v1.1, SQL, CMS-/klientkode, bygg- og testinfrastruktur er lest. Offisielle kilder kontrollert 03.11.2026: [Database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Sessions](https://supabase.com/docs/guides/auth/sessions), [MFA](https://supabase.com/docs/guides/auth/auth-mfa). Disse begrunner skillet invoker/definer, ACL/RLS, token/sesjon og MFA-nivå; fersk målbundet step-up er et ytterligere MODUS-krav som ikke finnes ferdig i eksisterende kode. [Changelog](https://supabase.com/changelog) er konsultert; markdown-inngangen ga unsupported content-type, HTML ble brukt. Ingen SDK-/plattformoppgradering eller faktisk tjeneste er testet/kjørt.

## 8. Leveransestatus til 00

Se også `test-results/red-005b-a/delivery-status.json` for faktisk sluttstatus, verifiserte bevaringskontroller og avsluttende browser-resultater. Ny forberedelse ligger lokalt med manifest/SHA-256 og lesbar additions-diff. **GO til dokumentert lokal forberedelse; NO-GO til SQL-/Auth-/backendaktivering uten separat miljøfullmakt og senere faktisk sikkerhetstest.** Ingen push, merge, deploy, backend- eller produksjonsendring er utført.
