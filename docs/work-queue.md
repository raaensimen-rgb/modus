# MODUS – arbeidsliste for utviklingsassistenten

Arbeidsgrunnlag per 30. oktober 2026. Dette er en prioritert liste, ikke en
bakgrunnsagent eller et løfte om automatisk videre kjøring. Ved gjenopptakelse
leses denne listen, aktuell kode, åpne PR-er og eventuelle prosjektinstrukser
før neste oppgave velges. Endringer i status krever konkret bevis.

## Rammer

- Arbeid i utviklingsgren. Ingen merge eller produksjonspublisering uten egen
  autorisasjon. Ikke endre andre åpne utviklingsgrener.
- Prioriter stabilitet og fullføring fremfor flere funksjoner.
- Bevar eksisterende modul-ID-er og brukerprogresjon.
- Undervisningsinnhold kan bare godkjennes på grunnlag av kildekontroll og
  dokumentert mestring. En grønn teknisk test er ingen faglig godkjenning.
- Kontoer, betaling og eksterne tjenester aktiveres ikke som del av listen.
- Prosjektet skal tåle pauser og ikke forutsette kontinuerlig arbeidskapasitet.

## Prioritert kø

| ID | Arbeid | Status | Ferdigkriterium |
| --- | --- | --- | --- |
| A01 | Samlet automatisk kvalitetsrunde | Implementert i PR #14, ikke merget | Bygg og 25 kontroller bestått for aktuell commit i GitHub Actions; rapport og avgrensninger dokumentert. |
| A02 | Én lokal kommando for bygg og kontroll | Implementert, validering dokumenteres i PR | `npm ci` og `npm run quality` fungerer fra prosjektroten; tester starter ikke etter et mislykket bygg. |
| A03 | Dokumentere første kartlegging og gjenstående kontrollbehov | Utført som kartlegging, ikke slutt-QA | Funn har kilde/avgrensning; ukontrollerte punkter merkes tydelig. |
| A04 | Nettleserbasert grunnkontroll og skjermbilder | Planlagt | Hovedsider på norsk/engelsk kontrolleres ved 1440 og 375 px; skjermbilder og faktiske funksjonssjekker knyttes til commit. Ingen påstand om full visuell godkjenning. |
| A05 | Samlet prioritering av funksjonsavvik | Planlagt etter A04 | Reproduserbare avvik får alvorlighet, fremgangsmåte og ansvar; feil rettes i avgrensede PR-er med relevante regresjonskontroller. |
| A06 | Tilgjengelighet og tekstforstørrelse | Planlagt | Tastatur, fokus, 200 % tekst, kontrast og hjelpetekster gjennomgås; automatiske og manuelle funn skilles. |
| A07 | Full brukerreise og lagret progresjon | Planlagt | En valgt reise fra artikkel til øvelse/atlas og tilbake kan gjennomføres; gjenåpning og nullstilling kontrolleres uten å endre brukerens reelle data. |
| A08 | Faglig gjennomgang av ett komplett læringsløp | Planlagt | Kilder, forklaringer, øvelser og læringsmål dokumentert; mestringsgrunnlag avklart før godkjent publisering. |
| A09 | Drift, dokumentasjon og overlevering | Planlagt | Bygg, test, tilbakeføring og kjente begrensninger kan forstås av en annen utvikler. Kontroller mot eksisterende driftsarbeid før ny dokumentasjon lages. |

## Første kartlegging

Utgangspunkt: `main` på `43141c3e566769cf0bb6e07fe63046fdf0f615a3`.

- PR #13 er allerede merget. Atlasregisteret inneholder 24 moduler,
  16 publiserte artikler og fem planlagte artikkelkoblinger.
- PR #12 var fortsatt åpen i gjennomgangen. Visuell godkjenning er ikke
  utført som del av dette arbeidet; ikke anta at den er ferdig.
- Før endringene bestod eksisterende 21 testoppføringer etter lokal bygging.
- Atlasprøvene var allerede kjørt indirekte gjennom karttesten. PR #14 gjør
  dem selvstendige, synlige og uavhengige av at karttesten når slutten.
- PR #14 på `04ecc6a971d9c1c01be04c281812ce3e1e945970` bestod 25/25 lokalt
  og GitHub Actions-kjøring `41001215910`. Nye commits må kontrolleres på nytt.
- Oversettelseskontrollen dekker 689 aktive registrerte HTML-strenger.
  Dette dokumenterer katalogdekning, ikke fullstendig eller faglig god
  oversettelse. Engelsk har flere bevisste sammendrag/ventesider.
- Vanlig bygging oppdaterte flere sporede `dist`-filer og
  `cms/static-ids.json`. Endringene ble ikke inkludert i automatiserings-PR-en.
  Før en senere publisering må forskjellen mellom kildefiler og innchecket
  bygg undersøkes; dette funnet dokumenterer ingen produksjonsfeil i seg selv.
- Ingen manuell nettleser-QA, full tilgjengelighetskontroll eller faglig
  sluttkontroll er utført i denne kartleggingen.

## Leveranse ved hver arbeidsøkt

Oppdater relevant oppgave med commit, utførte kontroller, PR og avvik.
Rapporter hva som faktisk er ferdig, hva som venter på vurdering og neste
prioritet. Ikke kall noe godkjent, publisert eller ferdig testet uten bevis.
