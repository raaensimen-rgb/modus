# MODUS Studio — ST-002 / 0.2.3 testversjon

Isolert Tauri 2-app under `studio/`. Ingen tilkobling til produksjonspublisering.
Første 0.1.0-versjon er brukerobservert åpnet og testet på Mac (PR #40).
0.2.1 er neste kontrollerte testversjon; tidligere Mac-test er ikke godkjenning av denne.

## Artikkelarbeid
- Åpne lokal `articles.json`. Biblioteket viser kort med full tittel, beskrivelse, nivå, språk og valgt-status. Søk omfatter tittel, intro, Artikkel-ID og tema; nivåfilter kan kombineres med søk.
- Bruk Tab og Enter/Mellomrom på vanlige kortknapper. Filtrering endrer ikke den åpne artikkelen og mister ikke redigering.
- Artikkel-ID og språk er skrivebeskyttet. Rediger tittel, introduksjon og seksjoner.
- Seksjonsknapper flytter fokus direkte til valgt seksjon. Formateringsknappene setter inn `<p>`, `<strong>` eller `<em>` rundt valgt tekst i innholdsfeltet. Dette er en kildeeditor med hjelpemidler, ikke en WYSIWYG-editor.
- HTML beholdes ved eksport og utføres aldri i forhåndsvisningen. Ukjente felter, status og øvrige metadata beholdes; Studio setter ingen faglig godkjenning.
- Lagre eksplisitt med «Lagre kopi…». Rust-broen krever nytt filnavn og overskriver aldri kilden. Avbrutt eller feilende lagring lar utkastet være ulagret. Redigering under en pågående lagring forblir ulagret etter at eldre snapshot er eksportert.

## Tester og bygging

```sh
cd studio
npm ci
npm test
npm run build
npm run tauri -- icon icon.svg
npm run dev:mac
npm run build:mac
```

`npm test` kjører 15 modell-/DOM-regresjonstester med reelle artikkeldata og en mock av native fildialoger. `npm run build` kjører dem først via `prebuild`, også i eksisterende macOS-workflow. Mockene er kun i testene, ikke i appen. `package-lock.json` låser frontend/testavhengigheter.

Eksisterende workflow «ST-001 macOS prototype build» lager `.app`/`.dmg` på macOS-15 og verifiserer både app-signaturen og appen inne i montert DMG. Hent bare artefakten for siste dokumenterte PR-commit. Rust-avhengighetene har foreløpig ikke innchecket Cargo.lock; eksakt reproduserbar Rust-oppløsning er ikke dokumentert.

## Kontrollgrenser

Se [ST-002-QA.md](ST-002-QA.md). Nettleser-/DOM-tester erstatter ikke faktisk macOS-installasjon, native fildialoger, lukking eller VoiceOver. Ad-hoc-signatur er beholdt fra forrige bygg; ingen Apple-notarisering eller offentlig distribusjon. Ikke slå av macOS-sikkerhet.

Stilene følger faktiske standardverdier fra `home.css` og `design-system.css`: oliven/svart/lime, samme paneler, fokus og kortradius. Manrope/DM Sans brukes dersom installert, ellers eksplisitt lokal macOS-systemfont. Ingen fontfiler eller nettverkskall er lagt til; eksakt fontgjengivelse må designkontrolleres på Mac.

F03 #28 beholder hovedprioriteten. Ingen endring av nettsidens filer, `main`, Cloudflare, merge eller produksjonspublisering.

## Teknisk oppfølging etter brukerens 0.2.0-test
En regresjonstest reproduserte at seksjonssletting kunne forskyve bevarte quizreferanser. Versjon 0.2.1 hindrer seksjonssletting for artikler med quiz både fra kortknappen og via redusert seksjonsliste i avansert JSON. Tittel-/tekstredigering og tillegg av seksjoner er beholdt. Quizdata oppdateres aldri automatisk. 15/15 modell-/DOM-tester dekker nå også begge slettingsforsøkene. Faktisk Mac-test av 0.2.1 er separat fra brukerens 0.2.0-test.

## 0.2.2 – native avslutningsvern
Prosjekteier rapporterte at 0.2.1 avsluttes direkte med ulagret artikkelarbeid. Nettleserens beforeunload er ikke tilstrekkelig. 0.2.2 synkroniserer ulagret-status med et versjonert native state og fanger både Tauri WindowEvent::CloseRequested og RunEvent::ExitRequested. Operasjonen stoppes før et native varsel vises. Fortsett redigering og Avbryt beholder arbeid; bare eksplisitt Forkast og avslutt tillater lukking. Gjentatte forespørsler stabler ikke dialoger, og gamle IPC-oppdateringer kan ikke fjerne nyere dirty-status. Ingen nye filrettigheter eller endringer av datamodellen.

16 frontend-/DOM-tester inkluderer synkronisering til native-vernet. Åtte Rust-tester kontrollerer ren/ulagret tilstand, avbrudd, forkasting, duplikatforespørsler og rekkefølgebeskyttelse. Rust-testene kjøres automatisk som prebuild:mac før eksisterende macOS-bygg. Tidligere 0.2.0/0.2.1-resultater ovenfor er historiske; gjeldende build/commit oppgis i PR-rapporten.

Faktisk Mac-retest: importer, endre Tittel, bekreft Ulagrede endringer, trykk Cmd+Q og velg Fortsett redigering. Tittelen skal være bevart. Gjenta med vinduets røde lukkeknapp. Lagre kopi og kontroller at ren tilstand kan avsluttes normalt. Dette må ikke godkjennes bare fra Rust-/DOM-testene. Native vernet gjelder artikkelarbeid; designnotater er fortsatt separat manuell eksport uten recovery.


## 0.2.3 – rettet avslutningsvei for macOS-meny og ⌘Q
Prosjekteiers faktiske 0.2.2-test viste direkte avslutning med synlige ulagrede endringer. Dermed er 0.2.2-vernet ikke godkjent. Årsaken er at macOS-menyens innebygde Quit kaller native terminate: og kan omgå Tauri ExitRequested (Tauri #13778 / #9198). Tidligere åtte tilstandstester dekket ikke den native menyrutingen.

0.2.3 erstatter bare Quit-elementet i den eksisterende macOS-appmenyen med en vanlig menyevent og samme CmdOrCtrl+Q-snarvei. Denne går eksplisitt gjennom request_close før app.exit. Standard Edit-, Services-, File-, View-, Window- og Help-menyer beholdes. Native standardmeny verifiseres før erstatningen, slik at en endret rammeverksstruktur ikke gir en utilsiktet menyendring.

Tre nye Rust-rutingtester kontrollerer at ulagret menyevent ikke avslutter, at Fortsett/Avbryt ikke tillater avslutning, at eksplisitt forkasting tillater avslutning, at ren avslutning skjer én gang, og at andre menyeventer ikke ber om lukking. Totalt 16 frontend-/DOM-tester og 11 Rust-tester. Dette er komponent-/rutingtester, ikke faktisk trykk på ⌘Q i macOS.

**Gjenstående native QA:** importer, endre Tittel, bekreft Ulagrede endringer, trykk ⌘Q. Velg Fortsett redigering; tittelen skal være bevart. Gjenta med menypunktet Avslutt MODUS Studio og rød lukkeknapp. Avbryt skal beholde arbeidet. Forkast og avslutt skal lukke; lagret dokument skal lukke uten varsel. Denne versjonen må testes fra sin egen DMG.

**Kjent begrensning:** Dock → Avslutt, systemavslutning, tvungen avslutning og krasj er ikke dekket av denne menyrutingen. Ingen automatisk recovery finnes. Lagre kopi før slike handlinger. Derfor er et generelt vern mot tap av ulagret arbeid fortsatt ikke fullt QA-godkjent. Designnotater har fortsatt separat manuell eksport uten native dirty-vern. Ingen merge eller produksjonspublisering.
