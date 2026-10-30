# Progresjon og nullstilling – kontrolløkt 31. oktober 2026

Baseline: `41449f99b39f45fd8c28a4ac7569dc32610fbedc`.

Eksisterende `tests/music-map-reset.cjs` kjøres allerede av
`tests/music-map.py` i den vanlige testpakken. Ingen ekstra parallell
testkjører eller frontendendring innføres.

Testen er utvidet til å bruke gjengitte SVG-modulnoder og status-/notat-/
idé-kontroller i et isolert VM-miljø. Den kontrollerer lagring og ny lasting
av samme datasett, statusknappens aria-pressed, og at «Se hele landskapet»
ikke nullstiller lagrede data. Avbrutt og gjentatt nullstilling kontrolleres.

Korrupte JSON-data, avviste lesinger/skrivinger og mislykket lagring etter
nullstilling testes. Ved nektet lagring skal synlig tilstand kunne endres
mens siden viser lagringsfeil; lagrede data skal ikke endres. Testen lover
ikke at endringer overlever gjenåpning når nettleseren har nektet lagring.

Eksisterende kontroll av 24 moduler, notater, idémarkeringer, kategorier,
tellere, quizbevis og bevisst ødelagt nullstillingskode beholdes.

Alle data er lokale JavaScript-objekter opprettet av testen. Ingen reell
brukerprogresjon, konto eller database leses eller endres. Faktisk nettleser-
QA og ekstern kontosynkronisering omfattes ikke av denne kontrollen.

Validering: `npm ci` og `npm run build` fullført. Den utvidede
`node tests/music-map-reset.cjs` består. Samlet lokal kjøring bestod 18/22;
fire andre kontroller feilet (`article-quizzes`, `article-library`,
`article-editor`, `design-system`). De rapporterte avvik mellom bygde
ressurser og forventet innhold. Årsaken er ikke fastslått og den lokale
kjøringen er ikke godkjent. Samme fenomen ble observert i forrige arbeidsøkt;
ikke løs dette ved å svekke testene.

Resultat fra separat GitHub Actions-kjøring og eksakt rettelsescommit oppgis
i Draft PR og leveransen. Ingen merge eller eksplisitt deployment inngår.
