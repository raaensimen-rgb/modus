# MODUS 2.0 – 08: komplett lokal artikkelkandidat

Denne arbeidskopien gjennomfører eierbeslutningen 5. november 2026 med ordinært bygg: 16 norske og 16 komplette engelske lesesider, 32 illustrasjoner, aktive artikkelkort, 48 quizspørsmål per språk og lokal progresjon som deles mellom språkene.

Tre tidligere engelske sammendrag er fullført. Tre engelske illustrasjoner har fått engelske etiketter; geometri og arkiverte originalversjoner er bevart. Norske artikkel- og quizkilder er uendret.

## Kjør lokalt

```sh
npm ci
npm run build
npm test
npm run test:browser
node tests/modus08-browser.cjs
python3 -m http.server 8788 --bind 127.0.0.1 --directory dist
```

Åpne http://127.0.0.1:8788/artikler.html?lang=nb eller http://127.0.0.1:8788/en/artikler.html?lang=en.

`dist/` følger med som ferdig kjørbar statisk kandidat. Kun dist er en nettstedspakke; kilde-/dokumentasjonsmappen skal ikke serveres offentlig.

## Publiseringsregel

Se AGENTS.md og docs/modus-08-owner-decision.md. `publication_decision: owner_authorized` dokumenterer offentliggjøringsvalget uavhengig av `editorial_status`, faglig kontroll og personlig mestring. Tekst, quiz, språk og bilder er versjonsbundet. Nye uvalgte utkast er private. Tester kontrollerer både at de 16 valgte artiklene er lesbare og at uvalgte/private eller endrede versjoner ikke lekker.

Dette er en lokal leveranse. Ingen push, merge, deploy eller produksjonsendring følger av bygget. Eksisterende kontokonfigurasjon og CMS-backend er ikke aktivert eller endret. Progresjonstesten gjelder faktisk lokal lagring og språkdeling, ikke ny ekstern kontosynkronisering.

Historisk eksportveiledning er bevart i docs/export-readme-2026-10-27.md.

P1: Offentlig `/redaktor` beholder sperresiden. Den allerede publiserte beskyttede administratoren finnes på https://dev-modus-2-pr52.modus-2-preview.pages.dev/redaktor . Se docs/pl-data-001-p1.md. Artikkelbygget endrer verken denne originens lagring eller Access.
