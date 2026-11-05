# PL-DATA-001 – P1: administrator kontrollert 05.11.2026

**Status: administratorleveransen finnes og åpner. Ingen gjenopprettingsdeploy nødvendig. Ingen deploy utført i denne oppgaven.**

Fast administratoradresse:
https://dev-modus-2-pr52.modus-2-preview.pages.dev/redaktor

Gjeldende deployment: `e785d3db-71af-471e-8302-3f92a017af7d`.
Gjeldende publisert kilde-SHA: `f43d8449240648ea5e21dcf070e6251ab21b34b4`.
Publisert administratorbundle SHA-256: `3e09f921e825076280c89d983d167225db52c3e77c87facd57b09fd59ede4789`.

## Hva som faktisk ble distribuert

Den opprinnelige PL-DATA-001-kandidaten ble publisert i deployment `09d321b5-0fec-459d-9f19-73c64bc46008`, med kilde-SHA `fef3713c669c651996667b75de683cfac35df52f`. Cloudflares faktiske deploymenthistorikk bekrefter dette. Fast grenadresse peker nå på den senere PL-ART-PREVIEW-001-leveransen med SHA `f43d844…`, som viderefører administratoren og PL-DATA-001.

Syv sentrale filer er byteidentiske med PL-DATA-001: `client/editor.js`, `cms/admin-model.mjs`, `cms/editor.html`, administrator-masterens CSS, administratoradapter, konsoll-CSS og offline transport. Oppstartsadapteren fikk bare videreutviklet inngangen til artikkelbiblioteket; derfor er den samlede bundlehashen ulik den opprinnelige. Lagringskode og eksisterende nøkler er bevart.

Gjeldende manifest ble faktisk åpnet via den faste beskyttede adressen i en eksisterende innlogget nettleserøkt. Den viste kilde-SHA-en over og korrekt bundlehash. Deretter åpnet `/redaktor` med «MODUS administrasjon», «Arbeidsoversikt», eksisterende sidemeny og lokal modus. Ingen utkast ble skrevet eller endret. Dette er innlogget kontroll i in-app-nettleseren, ikke en påstand om en ny full Safari-lagringstest.

## Rotårsak

- Den offentlige `https://modus-2-preview.pages.dev/redaktor` skal vise «Redaktøren er utilgjengelig». Dette er den tilsiktede offentlige sperresiden. `/admin-package.json` er fraværende med HTTP 404.
- `https://ca1f7c99.modus-2-preview.pages.dev/redaktor` peker på en eldre DES-deployment, kilde-SHA `f119eaef777e001779739a672232b54b6ada3679`. Den er ikke PL-DATA-001-administratorleveransen. Innlogget åpning bekreftet «Redaktøren er utilgjengelig» også der.
- At en eldre design-deployment er Access-beskyttet betyr ikke at den inneholder administratorpakken. Den faste grenadressen er den riktige inngangen.

## Nødvendig retting

Bruk den faste administratoradressen i lenker og bokmerker. Det er ikke nødvendig å erstatte fungerende administrator eller deploye noe for å løse den rapporterte adressefeilen.

Som lokal regresjonssikring er 08-kandidatens ordinære bygg rettet til å beholde statisk offentlig sperreside på NB/EN når sky-publisering er deaktivert. `scripts/editor_boundary.py`, avslutningen i `scripts/finalize-publication.py` og `tests/public-editor-boundary.py` skiller den offentlige siden fra den beskyttede administratoren. Endringen åpner ikke CMS eller private utkast, endrer ikke lagringsnøkler og berører ikke de valgte artiklenes lesbarhet. Den er kun lokal og inngår i 08-kandidaten; ingen ny deploy er utført.

## Beskyttelse og avgrensning

Anonyme forespørsler til fast grenadresse, gammel hash og PL-DATA-001-hash videresendes til eksisterende Cloudflare Access. Ingen Access-regler, backend, SQL, brukerrettigheter eller produksjon er endret. Privat artikkelinnhold er ikke kopiert til offentlig rot som del av P1. Eksisterende lokale utkast er ikke flyttet mellom origins eller endret. Utkast på en annen nettadresse forblir knyttet til den adressen.

Bevis: `live-state.json` (lesende Cloudflare API og anonym HTTP), `source-preservation.json` (filhashverdier), eksisterende `../pl-data-001/authorized-deploy/deployment-verified.json`, og den innloggede manifest-/sidekontrollen dokumentert i `authenticated-check.json`.
