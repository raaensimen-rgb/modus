# RED-003 – Lesende status- og versjonsoversikt

Til 04 – Nettredaktør, 05 – Kvalitetssikring og testing og 00 – Prosjektledelse. Dato: 02.11.2026.

## Leveranse og baseline

Implementert i eksisterende `dev/modus-2-pr52`, med verifisert baseline/forelder `e45bb8f775db2c3e2b8dc5d2197c7a3ef48725b4` (RED-002A). Lokal SHA for denne leveransen finnes med `git log -1 --format=%H -- docs/modus-2-red-003.md` og oppgis i leveransemeldingen. Rapporten inngår i samme commit som implementasjonen og kan derfor ikke inneholde sin egen commit-SHA.

Implementeringsordren i `RED-003_faglig_implementeringsordre.md` er lest og fulgt. Dokumentets avsluttende begrensning om en ikke-montert arbeidskopi gjelder avsenderens tidligere miljø; baseline og lokal arbeidskopi er her kontrollert. Kjente, eksisterende endringer i generert `dist/` og tidligere rapporter er beholdt og inngår ikke i commiten. Ingen nye grener, publiseringsrettigheter, backendbindinger eller databaseendringer er innført.

## Status- og versjonskontrakt

`cms/editor-presentation.mjs` er en ren funksjon: `editorPresentation()`. Den leser identitet, eksisterende policy-/vurderingsgrunnlag, versjonskontekst og separate lagringsopplysninger. Den returnerer en presentasjonsmodell, muterer ikke input og skriver ikke registre. `readOnly:true` beskriver metadataenes rolle, ikke en ny autorisasjonsmekanisme.

Fem dimensjoner vises i eksisterende sidebar og et kompakt detaljpanel:

| Dimensjon | Presentasjon og begrensning |
| --- | --- |
| Arbeid | `draft` → Utkast, `in_review` → Under vurdering, `approved` → Godkjent når riktig språk- og innholdsversjon er verifisert. Manglende grunnlag → Ikke vurdert. Ukjent/ugyldig verdi → Ukjent status med avvik. Synlighet fra registeret vises separat, uten å bli en tillatelse. |
| Fag/kilde/rettigheter | Tre egne felt med kildeangivelse. Eksisterende `source_control_status` leses i kontekst. Personlig mestring eller fri tekst om rettigheter brukes ikke som fag-/rettighetsgodkjenning. Manglende strukturerte data forblir Ikke vurdert. Godkjente kontrollverdier krever samsvarende språk-/versjonsgrunnlag. |
| Språk | NB og EN er separate identiteter. Eksisterende motpart vises som tilgjengelig; manglende motpart vises som tekst, aldri som en falsk kontroll. Godkjenning arves ikke mellom språk. |
| Lagring | Lokal kopi, kontoutkast, publisert revisjon og ulagrede endringer er egne opplysninger. En eldre publisert revisjon godkjenner ikke et nyere utkast. Et kjent offentlig kildebygg uten database-revisjon vises med ukjent revisjon. |
| Versjon | Kjente revisjonsnumre og ukjent revisjon skilles. RED-002A-opprinnelse fra lokal gjenoppretting vises som lokal historikk, uttrykkelig ikke som godkjenningsbevis. |

Klienten bruker eksisterende seed, kontoutkast, publikasjonsmetadata og lokal lagring. Det gjøres ingen nye backend-kall. Artikkelidentiteten er fortsatt `(slug,locale)` og slugs/progresjons-ID-er beholdes.

### Kobling til publiseringsregisteret

Private policy-/vurderingsfiler sendes ikke til klienten. `scripts/build-editor.py` lager en liten `editorial`-leseprojeksjon **kun for artikler/språk som allerede passerer `public_articles()`**. Nå er seed fortsatt tom. Projeksjonen inneholder enumverdier og versjonshash, ikke interne vurderingstekster, identiteter eller godkjenningsreferanser. Ukjent/objektformet kontrollmetadata erstattes med en ufarlig ukjent-markør; dette testes med en privat canary.

Klienten holder denne projeksjonen utenfor artikkelpayloaden og sammenligner den normaliserte arbeidsversjonen med seed-øyeblikksbildet. Godkjent-status krever identisk innhold, riktig locale, gyldig kildehash og eksisterende samsvarende språkbevis. Endres innholdet, gjelder ikke seed-vurderingen lenger. Dette viser redaksjonell arbeidsstatus; det oppretter ikke aktuell eiergodkjenning og gir ingen publiseringsmyndighet.

For private/nye kontoutkast uten et verifiserbart tilgjengelig vurderingsgrunnlag vises **Ikke vurdert**. De 16 private manusene lastes ikke inn for å demonstrere panelet. Et eget statusregister eller en alternativ vei rundt Git-publiseringspolicyen er ikke innført.

## Metadata-integritet og feilgrenser

Det tidligere tapsstedet var `normalizeArticle()` i `cms/model.mjs`: den returnerte en fast innholdsstruktur uten `learning`, `practice_steps` eller `next_step`. Disse feltene følger nå en snever, validert adapter:

- `learning.goals`, `learning.prerequisites`, `learning.links[{slug,label}]`.
- `practice_steps` som tekstliste.
- `next_step{slug,reason}`.

De gyldige feltene bevares uten avkorting gjennom normalisering, lokal lagring, gjenoppretting, RPC-payload og JSON-eksport. JSON-parse + normalisering er testet som modellens innlesings-/importgrense. Det er fortsatt ingen filimportknapp i eksisterende UI; en slik funksjon er ikke lagt til i denne statusoppgaven.

Ukjent/manglende locale avvises i stedet for å bli NB. Korrupte felttyper, feil struktur, ukjente læringsunderfelter og for store støttede felter avvises synlig, uten å skrive data på nytt. Tomme uferdige utkast er fortsatt mulig; ny artikkel får oversikt når gyldig adresse er oppgitt. Rå `art`/SVG er fremdeles ikke et tillatt usanitert redaktørfelt; eksisterende byggadapter bruker godkjent bildereferanse. Ukjente toppfelter blir ikke blindt spredd til HTML eller gjort til autoritative statusfelter.

Avvist lokal kopi, ugyldig JSON eller motstridende lagringsidentitet blir beholdt. Den aktuelle lagringsnøkkelen beskyttes mot senere auto-/manuell overskriving i sesjonen. Brukeren får en forståelig melding og kan eksportere teksten i skjemaet. Rettelse av en slik original må avklares eksplisitt; ingen automatisk reparasjon eller sletting gjøres.

## UI, skjermbilder og tilgjengelighet

Eksisterende mørke MODUS-profil, redaktør, navigasjon, språkvalg, lagring og deaktivert publiseringsknapp beholdes. Detaljpanelet bruker semantisk `dl/dt/dd` og lesende tekst; det har ingen godkjenningsknapper. Feil og avvik bruker eksisterende/supplerende synlige `role=status`/`aria-live`-områder. Ny CSS gir tekstbryting og én kolonne på mobil, uten nytt redesign.

Reelle bilder fra lokal Chromium med faktisk klient/HTML/CSS og **kun syntetiske data og simulert SDK**:

- [Desktop, norsk, 1440 px](../test-results/red-003/screenshots/editor-nb-1440.png).
- [Mobil, norsk, 375 px](../test-results/red-003/screenshots/editor-nb-375.png).
- [Desktop, engelsk artikkel, 1440 px](../test-results/red-003/screenshots/editor-en-1440.png).
- [Mobil, engelsk artikkel, 375 px](../test-results/red-003/screenshots/editor-en-375.png).
- [Detaljpanel desktop](../test-results/red-003/screenshots/editor-overview-nb-1440.png) og [detaljpanel mobil](../test-results/red-003/screenshots/editor-overview-nb-375.png).

Bildene dokumenterer lokal redaktørfunksjon, ikke en aktivert CMS-backend eller offentlig Preview. Google-fontforespørsler besvares lokalt med tomt stilark i testen; skjermbildene bruker systemfont. Ingen ekstern font-/backendtransport skjer i testen. Visuell gjennomgang viser adskilte dimensjoner og bevart profil. Alle testede bredder 320, 375, 768, 1024 og 1440 px er uten horisontal sidescrolling. Tekstfelt kan rulle sin egen tekst som vanlige inputfelt.

Tastaturtest bekrefter fokusrekkefølge og synlig fokus. Axe-kontroll av redaktørtilstanden gir 0 WCAG A/AA-avvik; dette er en automatisk kontroll, ikke en full skjermlesertest. Testen bruker redusert animasjon. Ingen nye animasjoner er innført. Visuell gjennomgang av desktop-/mobilbildene er dokumentert separat fra automatiserte kontroller.

## Tester og bygg

Alle backendrelaterte nettlesertester bruker syntetisk SDK, syntetiske konto-/artikkeldata og transportblokkering for eksterne adresser. Ingen ekte innlogging, Supabase-operasjon eller annen ekstern lagring er utført.

| Kontroll | Kommando | Resultat |
| --- | --- | --- |
| Ren presentasjonsmodell / metadata | `node tests/editor-presentation.mjs` | 9/9 testgrupper; blant annet NB/EN-status, ukjente/nullverdier, eksakt språk-/versjonsgrunnlag, uavhengige revisjoner, 32 kilde/locale-rundturer og 24 bevarte metadatafelt |
| Uendrede RED-002A-regresjoner | `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers npm run test:editor-storage` | 20/20; testfilen er byteidentisk med RED-002A-baseline |
| RED-003 nettleser | `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers npm run test:editor-status` | 11/11 scenarioer, 0 sidefeil, 0 uventede eksterne forespørsler; metadata bekreftet også i faktisk RPC-payload og nedlasting |
| Ordinært bygg og samlet testrekke i midlertidig kopi | `npm run build`, `npm test` | Bestått; 32/32 kommandoer i samlet testrekke (de 31 eksisterende + ny modelltest) |
| Isolert bygg og samlet testrekke i midlertidig kopi | Samme kommandoer med Preview-miljøet nedenfor | Bestått; 32/32 |
| Ekstra bygggrenser | `python3 tests/preview-isolation.py`, `python3 tests/publication-audit.py`, `node tests/article-editor.mjs`; isolert også `python3 tests/article-permissions.py` | Bestått |

Modelltesten er lagt til i eksisterende `npm test`. Nettlesertesten har egen npm-kommando. Eksisterende publiseringstest er utvidet med en privat kontrollmetadata-canary og kontroll av den offentlige leseprojeksjonen. Ingen test er fjernet. De 20 RED-002A-scenarioene er ikke omskrevet for å tilpasse dem til endringen.

Isolert miljø:

```text
MODUS_ISOLATED_PREVIEW=1
MODUS_PREVIEW_PROJECT=modus-2-preview
MODUS_CATALOG_PREVIEW=1
CF_PAGES_BRANCH=dev/modus-2-pr52
CF_PAGES_COMMIT_SHA=<kontrollert lokal SHA>
```

Produksjons-/releasekontekst er ikke aktivert. Bygg utføres i midlertidige kopier; arbeidskopiens eksisterende 339-filers dist er beholdt. Sluttkontroll etter commit binder fersk Preview-proveniens og kildehashene til leveranse-SHA. Bevis ligger under `test-results/red-003/`: `builds.json`, modusskilte logger og filmanifest, `fresh-provenance.json`, `fresh-isolation.json`, `red002a-browser.json`, `browser.json`, `model.log`, `axe.json`, skjermbilder og `delivery.json`. De er genererte lokale QA-artefakter, ikke applikasjonsfiler.

## Publisering, sikkerhet og restavvik

Eksisterende `content/publication.json`, godkjennings-/synlighetsregler, `scripts/publication.py`, SQL, SDK-konfigurasjon og M3.3-isolasjonskode er urørt. `publishingEnabled` er fortsatt `false`. Ingen nye publiseringsknapper eller RPC-signaturer er innført.

Ordinært bygg beholder den eksisterende redaktør-/SDK-koden, med privat CMS-Worker parkert og offentlig seed filtrert. Dette er ikke backendaktivering. Isolert Preview utelater fortsatt redaktør-/CMS-runtime, Worker og SDK, krever tom seed og håndhever eksisterende CSP/guard. Begge bygg passerer publiseringsaudit; 95 private kildefragmenter er fraværende. Isolert artefakt passerer også negative konfigurasjons-/manipulasjonstester. Private vurderingstekster og referanser er ikke eksponert via den nye projeksjonen.

Ingen kjente restfeil i det leverte RED-003-omfanget er funnet i kontrollene. Følgende begrensninger består:

- Ingen live database/RLS/Auth, reell flerbrukersamtidighet, e-post eller Cloudflare-kontroll er testet. Mocktester erstatter ikke dette.
- RED-002s serverrettighetsgap består. Visningen gir ingen aktuell eier-/publiseringsmyndighet; RED-005 trenger separat serverhåndhevet kontroll.
- Private artiklers vurderingsgrunnlag vises ikke når det ikke finnes en autorisert tilgjengelig datakilde. UI-et viser da Ikke vurdert; private kilder publiseres ikke for å fylle panelet.
- Metadataene bevares, men nye redigeringsfelt for læringsmetadata, JSON-filimport, full historikk/diff og automatisk fletting er ikke del av RED-003. Grensesnittet er fortsatt norsk og håndterer NB/EN-innhold separat. Ingen automatiske oversettelser er innført.
- Automatisk tilgjengelighet og tastatur er kontrollert; full manuell skjermlesergjennomgang gjenstår hos QA.

**Overlevering til 04/05/00:** Leveransen er lokal og klar for separat faglig/QA-vurdering. Ingen push, merge, Cloudflare-deploy, backendaktivering eller produksjonsendring er utført. Videre arbeid eller publisering krever en ny beslutning.
