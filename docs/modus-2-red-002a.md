# RED-002A – Sikre lagring og gjenoppretting

Til 04 – Nettredaktør, 05 – Kvalitetssikring og 00 – Prosjektledelse. Dato: 02.11.2026.

Gren: `dev/modus-2-pr52`. Utgangspunkt: `2f2a2c2787af9f680731dc6ed09434c1d78857ac`. Leveransecommit er den lokale commiten med denne rapporten (`git log -1 --format=%H -- docs/modus-2-red-002a.md`); eksakt SHA oppgis også i leveransemeldingen. Rapporten kan ikke inneholde SHA-en til sin egen commit.

## Implementert retting

**Lokal lagring:** `persistLocal()` returnerer nå et eksplisitt resultat. Kvotefeil eller annen localStorage-feil beholder ulagret-tilstanden og gir en forståelig feilmelding i eksisterende synlige `role="status"`/`aria-live`-område. Autolagring og manuell lagring skriver ikke suksess etter en feil. Eksportknappen er tilgjengelig. Ved feil i den første lokale sikkerhetskopien avbrytes kontolagringen før RPC. Dersom kontolagring lykkes, men oppdatering av den lokale kopien feiler, vises nettopp dette skillet som feil; ulagret lokal tilstand og eksport beholdes.

Ved artikkel-/språkbytte, oppdatering, avslutning av lokal modus eller utlogging tas den lokale sikkerhetskopien før eventuell overgang. Mislykkes den, kreves en egen advarsel og eksplisitt bekreftelse på å fortsette uten sikkerhetskopi. Avbryt beholder artikkel, språk og ulagret-tilstand. Dermed kan brukeren fremdeles logge ut bevisst etter eksport, også når nettleserlageret er fullt. Nettleserens eksisterende `beforeunload`-varsel beholdes.

**Gjenoppretting:** Når den lokale kopiens baserevisjon avviker fra den observerte skyrevisjonen, vises revisjonskonflikt allerede ved åpning. Gjenoppretting krever en bekreftelsesdialog som oppgir begge revisjoner og forklarer at neste kontolagring vil forsøke å erstatte den observerte skyversjonen. Avbryt endrer verken innhold eller lagret kopi og sender ingen RPC. Kopier uten revisjonsinformasjon behandles som ukjent base og krever samme bekreftelse. Samme-basert gjenoppretting virker fortsatt.

Opprinnelig baserevisjon og tidspunkt beholdes i lokal metadata:

```json
{
  "revision": 4,
  "recovery": {
    "sourceRevision": 1,
    "sourceSavedAt": "2026-01-01T00:00:00Z",
    "replacementBaseRevision": 3
  }
}
```

Eksempelet viser en lokal kopi fra revisjon 1 som brukeren uttrykkelig valgte å bruke over observert skyrevisjon 3, og som senere ble lagret som revisjon 4. Manglende opprinnelig revisjon/tidspunkt representeres med `null`. Opprinnelsen vises også i revisjonsfeltet og beholdes ved videre lokal lagring.

Den observerte skyrevisjonen sendes fortsatt uendret som `p_expected_revision`. Dersom skyen endres fra 3 til 4 etter brukerens bekreftelse, avvises forsøket med eksisterende `40001`-håndtering. Klienten henter ikke ny revisjon og prøver ikke automatisk på nytt. Ingen RPC-signatur, databasefunksjon, rettighet eller publiseringsregel er endret. Metadataene er lokal sporbarhet, ikke autoritativ godkjenning.

## Endrede filer i leveransecommiten

- `client/editor.js`: eksplisitt lagringsutfall, bevart ulagret-tilstand, trygg overgang og bekreftet revisjonskonflikt med opprinnelsesmetadata.
- `tests/editor-storage-browser.cjs`: regresjonstester av faktisk klient med syntetisk SDK, data og nettverkssperre.
- `package.json`: kommandoen `npm run test:editor-storage`; ingen nye pakker eller avhengighetsendringer.
- `docs/modus-2-red-002a.md`: denne rapporten.

Eksisterende endringer i `dist/`, tidligere rapporter og RED-002-evidens inngår ikke i commiten. Arbeidskopiens `dist/` er beholdt; byggkontroller kjøres i midlertidige kopier.

## Tester og resultater

| Kontroll | Kommando | Resultat |
| --- | --- | --- |
| Nye nettleserregresjoner | `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers npm run test:editor-storage` | **20/20 bestått**, 0 eksterne forespørsler, 0 sidefeil |
| Eksisterende regresjoner | `MODUS_ISOLATED_PREVIEW=1 MODUS_PREVIEW_PROJECT=modus-2-preview MODUS_CATALOG_PREVIEW=1 CF_PAGES_BRANCH=dev/modus-2-pr52 npm test` | **31/31 bestått** |
| Ordinært bygg i midlertidig kopi | `npm run build`, deretter `tests/preview-isolation.py`, `tests/publication-audit.py`, `tests/article-editor.mjs` | Bestått |
| Isolert bygg i midlertidig kopi | Samme bygg med de fire Preview-variablene og korrekt `CF_PAGES_COMMIT_SHA`, deretter samme kontroller og `tests/article-permissions.py` | Bestått |
| Publiseringsgrenser | Inngår i `npm test`: `tests/publication.py` | Bestått; seks syntetiske bygg, versjons-/språkbevis, private canaries, rent/skittent bygg og produksjonskontekst |

De 20 nye scenarioene dekker:

- Vellykket automatisk/manuell lagring i NB og EN, uendrede slugs og språkidentitet.
- Kvotefeil i NB/EN, varig feil, fungerende JSON-nedlasting og avbrutt artikkel-/språk-/modusbytte; `beforeunload` bekrefter beholdt ulagret-tilstand.
- Vellykket nytt forsøk etter at lageret igjen er tilgjengelig.
- Vellykket simulert kontolagring, uendret publisert kopi og deaktivert publisering.
- Revisjonskonflikt, ordinær RPC-feil, kvotefeil før RPC og lokal oppdateringsfeil etter vellykket RPC.
- Bevisst utlogging uten lokal kopi først etter egen advarsel/bekreftelse.
- Avbrutt og uttrykkelig godkjent eldre gjenoppretting i NB/EN, bevart baserevisjon/tidspunkt, uendrede offentlige kopier.
- Skyendring etter bekreftelse av gjenoppretting, uten automatisk retry.
- Samme-basert gjenoppretting, ukjent baserevisjon og avbrutt overgang med fungerende lagring.

Nettleseren kjører kun lokalt. SDK-importen og konfigurasjonen erstattes ved testbundling med syntetiske implementasjoner; alle andre nettverksoriginer avvises før transport. Ingen ekte Auth-, Supabase- eller andre backend-operasjoner utføres. Testharnessen ble justert for korrekt håndtering av `beforeunload` og Playwrights serviceWorker-hook i sandboxet iframe; disse var testfeil og er ikke skjult som beståtte applikasjonstester.

Lokale bevis ligger under `test-results/red-002a/` (ignorert av Git): `editor-storage.json` med scenarioer og klientens SHA-256, `browser.log`, `regression.log/json`, `builds.json`, bygglogger, ordinært/isolert filmanifest og fersk isolasjons-/provenienskontroll. Før-commit-bevis oppgir utgangs-HEAD og kildehash; midlertidig Preview rapporterer ærlig skitne kilder før commit. Byggkontrollen gjentas etter commit for å binde fersk Preview til leveranse-SHA uten å endre rapporten.

## Bevarte grenser og restavvik

NB/EN-artikler, slugs og progresjons-ID-er er bevart. Alle 16 private kildeartiklers beslutninger og eksakte språkversjoner passerer eksisterende tester. Publiseringsregister, SQL, CMS-arkitektur, SDK-konfigurasjon og `publishingEnabled:false` er urørt. Isolert M3.3-Preview utelater fortsatt redaktør-/CMS-runtime og SDK, krever tom seed, og håndhever eksisterende CSP, nettverksguard og ugyldig-konfigurasjonsavvisning.

Ingen kjente restfeil i de to rettede flytene er funnet i de gjennomførte testene. Avgrensninger:

- Ingen virkelig database, RLS, Auth eller PostgreSQL-samtidighet er testet; simulert SDK verifiserer klientkontrakten og avvisningshåndteringen.
- RED-002s uendrede serverrettighetsgap blokkerer fortsatt en fremtidig eiergodkjenningsgate. Disse klientrettingene autoriserer ikke sky-CMS eller publisering.
- JSON-eksportens eksisterende format er fortsatt normalisert innhold, uten revisjonskonvolutt/importfunksjon. `recovery` beholdes i lokal sikkerhetskopi, ikke i eksport eller backend-payload. Eksportformat og redaksjonell versjonskontrakt hører til neste avgrensede oppgave.
- Ingen historikk-/diff-funksjon eller automatisk fletting er innført. Brukeren må eksplisitt velge gjenoppretting/erstatning.
- Lokal lagring er fortsatt originbasert klartekst, og kontoens lokale kopier beholdes etter utlogging. Ved fullstendig nettleser-/prosesskrasj finnes ikke garanti for bevaring; JSON-eksport er tilgjengelig ved feil.

**Anbefaling til 00/04/05:** Godkjenn den lokale rettingen etter gjennomgang av de nye regresjonstestene. Fortsett deretter med RED-003s avgrensede status-/versjonskontrakt. Ingen backendaktivering, push, merge eller deploy er utført eller følger av denne leveransen.
