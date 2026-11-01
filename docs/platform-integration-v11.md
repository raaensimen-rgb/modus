# Samlet plattformkandidat – PL-VSC-01 v1.1

Arbeidsordre: Issue #42, kommentar 6563038330. Dette er én ny isolert integrasjonsgren. De opprinnelige PR-ene, main og Studio endres ikke.

## Eksakte innganger

- Plattform / PR #46: bb14a9f346ec897577b12d9df01cc4838cb62028.
- Godkjent toppmeny / PR #51: b510a2aa920c3bd246f05441be13d12c2a35c16e.
- navigation.css og themes.css videreføres byteidentisk fra sistnevnte SHA. Ingen redesign.
- Eksisterende navigasjonstest følger med. Kun testoppsettet får håndtering av plattformens innledende veiledningsdialog før målinger; testkravene til design og atferd beholdes.
- Integrasjonsgrenen tillates i den eksisterende Preview-policyen. Dette gir ikke fullteksttillatelse eller produksjonsgodkjenning.

## Synlig og privat innhold

Samme 16 Under arbeid / In progress-kort per språk med versjonsbundne eksisterende SVG-er, passive kort og sperrede fulltekster. PL-101s tekniske læringsramme, Jam, Harmoni, Teorirommet og Musikkatlas beholdes fra plattformkandidaten. PR #43 er ikke inkludert eller endret.

Fulltekstpolicy, kilde-/mestringsvurderinger og articles.json endres ikke. Standard/main/production har fortsatt den eksisterende strengere kortporten; ved senere produksjonsbygg må eksakt godkjent katalogomfang følge distribusjonsbeslutningen. En Preview må ikke forveksles med produksjon eller gis en release-GO av 08 alene.

## Kontrollgrunnlag

Full bygging og 29 eksisterende automatiske kontroller. CI kjører i tillegg release-, navigasjons-, piano-, publikasjons-/kort-, PL-101-journey- og lydsignaltester. Navigasjon v1.1 prøves i Chromium/WebKit, NB/EN, tre temaer, 1440/1051/768/375/320 piksler og 100/200 prosent reflow. Halvert CSS-viewport og doblet pikselmål er en reflow-tilnærming, ikke en ny manuell Safari-godkjenning.

Publikasjonsaudit kontrollerer hele dist, 95 private kildefragmenter, tom CMS-seed, søkeindeks, sperresider og fravær av editorial/content/kildekart/private kjørbare undervisningsfiler. En separat lokal ART-002-kontroll sammenligner tekstrepresentasjonen av manuspakken ART-002_fem_artikkelmanus_revidert_v1.3_K05.md mot hele bygget med normaliserte sammenhengende 24-ords-fingeravtrykk. Manus hentes fra privat dokumenttilgang og legges aldri i repo, dist eller rapporten. Dette er eksakt tekstmatching, ikke en semantisk attest mot parafraser.

## Målrettet overlevering til 07

På den eksakte nye SHA/deploymenten: kontroller godkjent to-raders meny, Studier/Spill, tastatur/Escape/fokus, søk og språk, alle kort/bilder/status og ingen navigasjon fra kortene, F03-ramme/lagring, Jam/Harmoni/Teorirommets lyd/piano og Musikkatlas. Nytt samlet GO/NO-GO må dokumenteres før produksjon; tidligere godkjenning av enkeltkomponenter arves ikke automatisk.

Publisering skal bruke eksisterende faste MODUS-adresse og bevare en kjent fungerende rollback. Ingen opprinnelig Draft-PR skal merges som sideeffekt. Hvis konto-/distribusjonstilgang eller eksakt samlet GO mangler, rapporteres faktisk status og én samlet nødvendig eierhandling. Ingen påstand om publisering før driftssystemet og den faste adressen er kontrollert.
