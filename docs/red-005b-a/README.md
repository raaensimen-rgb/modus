# RED-005B-A – lokal forberedelsespakke

Til 00. Les først `../modus-2-red-005b-a.md`. Alle utkast her er **ikke-aktiverte**, uten import i app/bygg, ikke SQL-migreringer. Ingen faktisk DB/Auth-kontroll er utført. Appen, eksisterende SQL, v1.1-kontrakten og tidligere leveranser er uendret.

| Fil | Formål / status |
| --- | --- |
| inventory.md | Eksisterende lokale grants/RLS/RPC, klienter, publisering og ukjente live-flater. |
| contracts.md | Konkret target-/hash-/rolle-/MFA-/server-/klient-/audit-kontrakt. Ikke endepunktimplementering. |
| drafts/01-private-model.sql.txt | Private tabeller, kandidatrettigheter/roller, FORCE RLS, default-deny. Ikke kjørt; ikke fullstendig migrering. |
| drafts/02-cutover-contract.sql.txt | Bevisst avvisende kapabilitetsstubber og ordnet, atomisk cutover-plan. Mangler faktiske guards/grants/policyer; ikke koblet til eksisterende save. |
| drafts/03-inventory-queries.sql.txt | Ikke-kjørte fremtidige katalogspørringer. Bare for senere navngitt isolert miljø. |
| model.py | Syntetisk, sekvensiell beslutningsmodell; ingen server, DB, JWT-verifikasjon eller CSPRNG. |
| canonical-candidate.mjs | Uavhengig JS-kandidatencoder, kjøres bare på syntetiske vektorer over stdin. Ikke produksjonskanonisering. |
| test_preparation.py | 28 lokale tester med OA-spor, avgrenset statisk/syntetisk omfang. |
| test-plan.json | Samtlige OA-01–OA-28 med forventning fra v1.1, lokalt testomfang og utestet isolert akseptanse. |
| recheck_browser.py | Kun de tre syntetiske nettleserregresjonene med eksisterende system-Chrome; adapterer bare midlertidig testkopi og bevarer opprinnelig filhash. |
| run_checks.py | Kjørbar lokal evidensrunner. Avviser overskriving av run-01. Kopierer kilder og fysisk separat .git til midlertidig mappe, bruker eksisterende node_modules, bygger/tester uten å endre rot-dist eller gamle logger. |

## Gjenta bare tilgjengelige lokale tester

Fra prosjektroten:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/red-005b-a/test_preparation.py
node tests/article-editor.mjs
node tests/editor-presentation.mjs
node tests/editor-review.mjs
```

For ny komplett evidensrunde velges først et **nytt** OUT-mappenavn i en kopi av runneren; behold eksisterende run-01 og gamle testresultater. Deretter kan samme runner kjøres lokalt. Den utfører npm build/test og syntetiske browser-regresjoner i disponibel kopi. Den starter ingen Supabase-/Auth-/Cloudflare-tjeneste. Nettlesertestene substituerer SDK og avbryter eksterne nettverksforsøk.

**Ikke kjør noen SQL-fil.** `.sql.txt`, første STOP-guard og avsluttende ROLLBACK gjør helfilen avvisende, men er ikke tillatelse til delvis utføring. Filene er ikke SQL-parser-/DB-testet, og kan ikke tas i bruk ved bare å fjerne guarden. De må ferdigstilles, granskes og få separat miljøfullmakt.

QA-bevis i `../../test-results/red-005b-a/` inkluderer før-/etterbevaring, kommandoer, logger, artefaktmanifest, bytekontroll og SHA256SUMS. Filhash identifiserer de **ucommittede forberedelsesfilene**; baseline-SHA alene identifiserer bare eksisterende appkilder. Ingen ny commit er påstått.
