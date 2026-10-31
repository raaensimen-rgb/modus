# ST-002 – implementering og overlevering

Dato: 31.10.2026. Draft-PR #40, `feature/st-001-studio-mvp`. Appversjon 0.2.1.

## Implementert

| Område | Endring |
| --- | --- |
| Bibliotek | Native `select` erstattet med native knapper som artikkelkort; titler og beskrivelser brytes uten ellipsis/linjekutt. Nivå, språk, valgt-status, tastaturfokus og tomt søkeresultat vises. |
| Søk/filter | Kombinert tittel/intro/slug/tema-søk og eksisterende nivåfilter. Åpen artikkel beholdes når søket skjuler kortet. |
| Seksjoner | Navngitte hoppknapper, koblede feltetiketter, avsnitt/fet/kursiv-hjelpere, bekreftet seksjonsfjerning og fokus på nye seksjoner. Avansert JSON beholdt. |
| Artikkel-ID | Skrivebeskyttet felt med forklarende tekst. Ingen endring av identifikatorer eller språk. |
| Ulagret | Vedvarende statusmerke og vindustittel; avbrutt/feilende lagring beholder status. Redigering mens eldre kopi lagres blir ikke feilaktig markert lagret. |
| Data | Samme artikkelliste og `[overskrift, HTML]`-seksjoner. Ukjente felter beholdes. Validering før import/eksport, uendret native filbro uten overskriving. Tom import tømmer gammel editor. |
| Identitet | Standardfarger fra `home.css`, radius/fokus fra `design-system.css`. Blå restfarger og separat blå preview fjernet. Ingen nye fontressurser. |

## Teknisk testomfang

`npm test`: 15 tester for ekte artikkeldata uten datatap, validering, artikkelkort, kombinert søk/filter, NO/EN-metadata, redigering/bytte, seksjoner/formatering/navigasjon, ugyldig JSON, avbrutt/feilende lagring/import, redigering under lagring, tom fil og ikke-eksekverbar HTML-preview.

Native filbro er mock i DOM-testene. Rust lagringskode er uendret. Ulagret-varsel i vindustittelen er synlig; eksisterende `beforeunload` beholdes, men native lukking må testes og må ikke godkjennes fra DOM-testene alene.

## 01 – Design og UX (kontroll kreves)

- Test 1260×800, 800×600 minimumsvindu og bredt vindu. Ved mellomstørrelser ligger preview under redigeringspanelet; biblioteket forblir en egen kolonne. Ved smalere arbeidsflater stabler panelene.
- Alle 16 titler skal kunne leses, også lange titler, uten horisontal avkutting. Kontroller søk, selected-status, Tab/Enter/Mellomrom og seksjonsnavigasjon.
- Sammenlign mot godkjent Design 3.0, lokale fontfallbacks og MODUS.NO; ingen påstand om identiske fontfiler.
- Visuell macOS-/WebView-kontroll er ikke utført i Linux-miljøet. Den tilgjengelige Cloud Browser tillater ikke lokal `file:`-visning. Dette er et dokumentert testhull, ingen designgodkjenning.

## 02 – datamodell (kontroll kreves)

- Sammenlign eksporter med `content/articles.json` og `cms/model.mjs`, inkludert ukjente/nestede felter, engelske artikler, tom liste og uendret HTML.
- Ingen normalisering av ukjente felter eller status. Redigerte felter er kun title/intro/sections; andre felt er bevart.
- Bekreft at kildeeditor med HTML-hjelpere er riktig avgrensning; trygg forhåndsvisning er fortsatt ren tekst, ikke produksjonslik riktekst.

## 07 – faktisk macOS-QA (kontroll kreves)

1. Installer **0.2.1-artefakten for eksakt ny commit**. Første Mac-test av 0.1.0 overføres ikke automatisk.
2. Importer 16 artikler; rediger tittel, intro, seksjonstittel/-innhold og formatering. Bytt artikkel og tilbake.
3. Eksporter til nytt filnavn, gjenåpne og sammenlign. Prøv avbryt, ugyldig JSON, eksisterende filnavn og filfeil. Kilden skal være uendret.
4. Test ulagret-varsling ved filbytte og vinduslukking/avslutning. Ingen automatisk recovery finnes.
5. Kontroller lesbarhet, fokus og VoiceOver i begge vindusstørrelser, norsk og engelsk innhold.

## Status

Kildekode og lokale tekniske tester er klare. macOS-bygg, signatur/DMG-verifikasjon og artefakt knyttes til eksakt commit i PR-rapporten etter CI. Faktisk installasjon og design-/datamodell-/QA-godkjenning gjenstår for 0.2.1. Ingen merge, nettsideendring eller produksjonspublisering.

## Teknisk oppfølging etter brukerens 0.2.0-test
En regresjonstest reproduserte at seksjonssletting kunne forskyve bevarte quizreferanser. Versjon 0.2.1 hindrer seksjonssletting for artikler med quiz både fra kortknappen og via redusert seksjonsliste i avansert JSON. Tittel-/tekstredigering og tillegg av seksjoner er beholdt. Quizdata oppdateres aldri automatisk. 15/15 modell-/DOM-tester dekker nå også begge slettingsforsøkene. Faktisk Mac-test av 0.2.1 er separat fra brukerens 0.2.0-test.

## 0.2.2 – native avslutningsvern
Prosjekteier rapporterte at 0.2.1 avsluttes direkte med ulagret artikkelarbeid. Nettleserens beforeunload er ikke tilstrekkelig. 0.2.2 synkroniserer ulagret-status med et versjonert native state og fanger både Tauri WindowEvent::CloseRequested og RunEvent::ExitRequested. Operasjonen stoppes før et native varsel vises. Fortsett redigering og Avbryt beholder arbeid; bare eksplisitt Forkast og avslutt tillater lukking. Gjentatte forespørsler stabler ikke dialoger, og gamle IPC-oppdateringer kan ikke fjerne nyere dirty-status. Ingen nye filrettigheter eller endringer av datamodellen.

16 frontend-/DOM-tester inkluderer synkronisering til native-vernet. Åtte Rust-tester kontrollerer ren/ulagret tilstand, avbrudd, forkasting, duplikatforespørsler og rekkefølgebeskyttelse. Rust-testene kjøres automatisk som prebuild:mac før eksisterende macOS-bygg. Tidligere 0.2.0/0.2.1-resultater ovenfor er historiske; gjeldende build/commit oppgis i PR-rapporten.

Faktisk Mac-retest: importer, endre Tittel, bekreft Ulagrede endringer, trykk Cmd+Q og velg Fortsett redigering. Tittelen skal være bevart. Gjenta med vinduets røde lukkeknapp. Lagre kopi og kontroller at ren tilstand kan avsluttes normalt. Dette må ikke godkjennes bare fra Rust-/DOM-testene. Native vernet gjelder artikkelarbeid; designnotater er fortsatt separat manuell eksport uten recovery.
