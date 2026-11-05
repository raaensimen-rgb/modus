# MODUS 2.0 · M3.1: sikring og kvalitetssikring

Arbeidskopi: `/Users/simenraaen/Documents/ChatGPT/MODUS 2.0`, gren `dev/modus-2-pr52`.
M3 bygger på PR #52, commit `5b86d93feb98c1aaab2451f1e04a14296ab52e1e`.

## Lokal sikring

M3-kildene beskrives i `docs/modus-2-m3.md`. M3.1 legger til lokale ignore-regler,
denne oversikten og kontroll av faktisk kontonavigasjon samt 1440 px i forsidetesten.
Ingen designendringer er planlagt i denne sikringsrunden.

Den visuelle 320 px-kontrollen avdekket to ordinære lesbarhetsfeil: portaloverskriften
«Musikkatlas» overlappet nabokortet, og akkordnavn kunne klippes, også i en smal
forhåndsvisning ved 768 px. Under 360 px får portalikonet sin egen rad.
Jam-forhåndsvisningen viser akkordene i to kolonner når selve forhåndsvisningen
er smal (container query); fire kolonner beholdes når det er plass.
Disse små mobilrettingene inngår i samme lokale commit; grunnuttrykket beholdes.
Forsidetesten kontrollerer nå også faktisk tekstutstrekning og klipping.

Kun eksplisitt valgte kildefiler, vektorressurser, språkfil, låsefil, tester og
dokumentasjon skal committes. Ingen `git add .` eller `git add -A` brukes.

`dist/` har 89 historisk sporede filer fra PR #52. Ignore-regelen fjerner ikke
disse fra Git. Byggendringene der holdes utenfor commit uten å slette eller
tilbakestille det fungerende lokale bygget. Derfor kan `git status` fortsatt vise
genererte endringer etter en vellykket kildecommit. `node_modules/`,
`test-results/`, `.build-private/`, lokale miljøfiler, `.DS_Store` og
`design-references/` skal ikke inngå. Private undervisningskilder og deres
godkjennings-/versjonsregistre skal være uendret fra PR #52.

Eksakt commit-SHA, filmanifest og nye testresultater lagres etter commit i
`test-results/m3.1-report.md` og `test-results/m3.1-summary.json`. Disse lokale
QA-artefaktene inngår ikke i kildecommiten eller det offentlige bygget.

## Kontroll av den committede versjonen

Kjør Preview-bygg med `MODUS_CATALOG_PREVIEW=1 npm run build`, deretter `npm test`
med samme flagg. Kjør `npm run test:homepage`,
`node tests/navigation-controls-browser.cjs` og `npm run test:browser` med samme
Preview-flagg og tilgjengelige Playwright-nettlesere. Ingen produksjonsflagg trengs.

Norsk og engelsk kontrolleres i Chromium og WebKit ved 320, 375, 768, 1024 og
1440 px; forsidetesten dekker også 1536 og 160 CSS-piksler. Kontroller inkluderer
kontoens faktiske rute uten innsending av innlogging, søk, språkbytte,
introduksjonsfilm, meny, tastatur, redusert bevegelse, tre visningstemaer,
publiseringssperrer og privat kildeinnhold. axe-kontroller kjøres på desktop
1440 px og mobil 375 px. Kontrast over foto/gradienter krever supplerende manuell
vurdering; automatisk null funn er ikke en full WCAG-attest.

## Designpunkter til prosjekteier

Behold hoveduttrykket. Vurder disse avgrensede justeringene mot originalreferansen:

1. **Bølger:** Den nåværende SVG-en har tettere linjer og mindre gul glød.
   Eventuell justering bør gjelde linjeavstand, opasitet og fargebalanse.
2. **Meny og kontroller:** Tekstknapper for konto, søk og visning tar mer plass enn
   ikonene i referansen. Mobilheaderen blir høy. Vurder en mer kompakt plassering
   med de samme funksjonene, forståelige navnene og minst 44 px treffområdene.
3. **Fjellutsnitt og logo:** Eksisterende fjellfoto og SVG-tolkningen av emblemet
   avviker fra referansens nøyaktige bilde og geometri. Vurder utsnitt og optisk
   størrelse før nye ressurser eventuelt bestilles.
4. **Hero og innhold videre:** Filmknappen er en ekstra handling, og eksisterende
   verktøyoversikt og grunnleggerhilsen fortsetter under «Hvorfor MODUS?».
   Bekreft ønsket plassering og avstand; ikke fjern funksjoner som del av en ren
   visuell opprydding.
5. **Mobiltypografi og kontaktknapp:** Ved 320 px gir det faste linjeskiftet i
   heroen en kort egen linje med «gir». Den faste kontakt-/hjelpeknappen kan
   visuelt dekke korttekst ved enkelte scrollposisjoner, blant annet i
   375/768 px-skjermbildene. Vurder linjebryting og plassering av hjelpeknappene
   uten å endre hovedkomposisjonen.

Dette er vurderingspunkter, ikke besluttede designendringer. Skjermbilder for begge
språk og alle etterspurte bredder lagres under `test-results/homepage-*.png`.

## Neste steg mot isolert Cloudflare Preview

Etter separat tillatelse: publiser kun utviklingsgrenen og bind et separat
Preview-oppsett til den kontrollerte commiten. Bruk eksisterende byggkommando,
`MODUS_CATALOG_PREVIEW=1` og kun `dist/` som offentlig output. Ingen
produksjonsflagg, produksjonsdomener eller produksjonsressurser skal kobles til.
Bekreft head-SHA, byggmanifest og publiseringsaudit på Preview-artefakten før
prosjekteiers gjennomgang. Ekstern Preview må kontrolleres på den faktiske URL-en;
lokale tester alene bekrefter ikke ekstern servertilstand.

Ingen push, merge eller deploy utføres som del av M3.1.
