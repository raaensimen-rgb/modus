# PL-DATA-001 – lokal artikkellagring

Eksisterende `modus.editor.local.v1.<bruker>.<språk>:<adresse>` gjenbrukes. Ingen ny database, lagringsmotor eller synkronisering.

- Automatisk lokal lagring etter 500 ms og umiddelbar lagring ved skjult fane, pagehide og før avslutting videreføres.
- Lagringsadressen låses etter første vellykkede lokale lagring. Endring av overskriften oppretter ikke nye kopier. Innhold skrevet før overskrift får en unik lokal utkastadresse og kan gjenåpnes fra listen.
- Språkvalget ligger tilgjengelig ved artikkellisten også når språkbytte lukker den åpne artikkelen. Brukeren kan derfor bytte tilbake og gjenåpne utkastet uten å måtte opprette en tom artikkel.
- En eksplisitt lokal revisjon telles uavhengig av serverrevisjonen. Uendret lagring lager ingen ny revisjon.
- Opptil fem tidligere innholdsversjoner ligger inne i samme utkastpost. Eksisterende backupformat v1 og eldre utkast er fortsatt kompatible. Historikk valideres med samme språk/artikkelidentitet.
- Redaktøren viser siste vellykkede lagringstid, lokal revisjon, lagringsomfang og valg for bekreftet gjenoppretting. Nåværende tekst sikres før en historisk versjon gjenopprettes. Serverens revisjonsgrunnlag endres ikke.
- Et endret lagringsgrunnlag eller en adressekollisjon blokkerer overskriving. Teksten i skjemaet beholdes og kan eksporteres. Åpne den lagrede kopien på nytt etter privat eksport for å velge grunnlaget videre.
- Full lokal backup gjennom eksisterende Sikkerhetskopi tar med historikken og RED-notater. Gjenoppretting legger bare til manglende kopier, aldri over eksisterende originaler. Eksport av ett utkast beholder eksisterende artikkel-JSON-format og inneholder den åpne teksten, uten historikken.
- Eksisterende feilvern for blokkert/full lagring, ødelagte kopier, avbrutt overgang, konto-revisjonskonflikt og faglig godkjenning består.

## Kontroll

PL-AUTO-001 sitt adminløp gjenbrukes. Eksisterende modell-, RED-003/004- og lagringstester er lagt til før adminbygg og den eksisterende strenge artefakt-/Chromium-/WebKit-kontrollen. Pakkens kilde-SHA og SHA-256 rapporteres først etter beståtte kontroller. Ingen deploy, skytilgang eller backendaktivering inngår.

Nye pakkescenarioer kontrollerer oppdatering/gjenåpning, NB/EN-bytte, umiddelbar lagring ved avbrudd, historikkgjenoppretting med bevart nyeste tekst, stabile adresser, ingen ekstra revisjon ved uendret lagring, konflikt mellom faktiske faner og eksport av konfliktteksten. Modelltestene kontrollerer historikkens identitet, revisjoner, størrelse, ugyldige tidsstempler og eksakt full backup/gjenoppretting.

## Begrensninger

Data finnes bare i aktuell nettleser og origin. Tømming av nettleserdata, privat modus eller skade på nettleserprofilen kan fjerne alle lokale versjoner. Privat fileksport er fortsatt nødvendig for uavhengig backup og flytting mellom enheter. Ingen automatiske nedlastinger eller nye filrettigheter er innført.

Historikken er begrenset til fem tidligere versjoner og deler nettleserens lagringskvote med utkastet. Ved full kvote beholdes den tidligere lagrede posten, og redaktøren viser feil samt mulighet for eksport. Full backup har eksisterende størrelsesgrenser; svært store utkast med historikk kan kreve eksport av enkeltartikkelen.

Konfliktvernet er en kontroll av sist observerte localStorage-post før synkron skriving og varsling ved storage-hendelser. Det er ikke en transaksjonsdatabase eller samarbeidsredigering: samtidig redigering av samme artikkel i flere faner bør unngås. Plattform-/strømbrudd kan fortsatt skje før første lagring eller før nettleseren skriver data varig til disk.
