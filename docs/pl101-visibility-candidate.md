# Samlet isolert kandidat – PL-101 + publiseringssperre

Arbeidsordre #28 / 6551064272. Dette er en testkandidat, ikke en releaseordre.

## Sammensetning
- Aktuell main-base: cda616a31a57f7157ab2427b15f8c3e6f362a687.
- Sperreretting fra Draft-PR #45: 0375b8a54c84bbe567f06ec4d39a36366bb8ea26.
- PL-101 fra uendret Draft-PR #44: e6097fc9b2786a32ece532d208dc1f47670dbb03.
- Egen gren: test/pl101-visibility-integration. Kandidatens eksakte head og CI
  føres i PR-/Issue-rapporten. Ingen GitHub-PR eller main er merget/endret.

Kandidatens parent er sperrerettingen. De åtte rene PL-101-kildefilene er hentet
fra #44s eksakte commit. Delte bygg-/testfiler er komponert avgrenset: registrer
F03-ruten i navigasjonsbygget, behold Fortsett-kortet etter den engelske Lær-
overstyringen, kjør både journey- og publication-browser, juster sideantall og
last opp begge sett med resultater/skjermbilder. Publiseringssperren gjelder
også når PL-101 er med. Ingen andre PR-er er cherry-picket.

Journey-skjermbildene skjuler bare den eksisterende usynlige nav-tooltipen under
opptaket; runtime-/breddekontrollene beholdes. Produktsidens CSS/atferd er ikke
endret for å skjule et avvik. #44s head og historikk står urørt.

## Hva kandidaten skal vise
- NO/EN Lær har Fortsett-kort og korrekt lokal progresjon. Fem steg er fritt
  tilgjengelige. 0–5, angre, reset og Repeter skal fungere som i #44.
- Selve læringsaktivitetene er fortsatt Under arbeid / In progress.
- Eldre F03, Dorisk og Grunnstudier viser generiske holding-sider, uten privat
  undervisningsruntime. Bibliotek/seed/søk viser bare eksplisitt tillatte data.
- Jam, Harmoni, Teorirommet, Atlas, søk, film og annen offentlig UI beholdes.
- Ingen privat manuspakke er importert. Ingen personlige brukerdata slettes.

## QA-port

27 lokale kontroller, deretter full CI med Chromium/WebKit, NO/EN, 375/1440,
lydsignal/piano, F03-progresjon og direkte ressurskontroll. Faktiske resultater
oppgis først når gjennomført; denne listen er ikke en uavhengig GO-attest.
Se også docs/pl102-publication-gate.md og docs/pl101-f03-qa.md.

Ny kandidat krever **ny** Cloudflare Preview for eksakt SHA. Den gamle
4dfa7c53-adressen er en usikker baseline, ikke den rettede kandidaten. Hvis
kontotilgang mangler, parkeres deployment mens all lokal/CI-QA fullføres.
Faktisk ekstern HTML/JSON/JS-kontroll og Safari/VoiceOver/ekte nettleserzoom
må da fortsatt dokumenteres på den nye adressen. Ingen eldre QA arves automatisk.

Kandidat-PR skal aldri merges som en erstatning for vurdering av de to isolerte
endringene. 01 vurderer design, 02 vurderer datagrense/modell og 07 gir
uavhengig GO/NO-GO. Ny godkjenning kreves før enhver merge/produksjonsdeploy.
PR #43 og Studio er urørt/pauset.
