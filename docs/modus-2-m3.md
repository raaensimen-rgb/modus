# MODUS 2.0 · M3

Utviklingskopi: `/Users/simenraaen/Documents/ChatGPT/MODUS 2.0`.
Gren: `dev/modus-2-pr52`.
Utgangspunkt: PR #52, commit `5b86d93feb98c1aaab2451f1e04a14296ab52e1e`.

## Implementasjon

Komposisjonen følger `design-references/a_refined_redesign_of_the_modus_homepage_that_blen.png`: geometrisk emblem over sentrert MODUS-ordmerke, M-formet bølgesignatur, mørk grønn fjellhero, gul hovedhandling, fire innganger og «Hvorfor MODUS?». De øvrige referansene støtter uttrykket og videreføringen til verktøyoversikten nedenfor.

`images/mountain-lake.webp` er den eksisterende bildefilen. `images/modus-geometric.svg` og `images/modus-waves.svg` er ny, selvstendig vektorgeometri; ingen skjermbildeutsnitt brukes. Logoen er en SVG-tolkning av emblemet i referansene. Originale referansebilder kopieres ikke til publiseringsbygget.

Introduksjonsfilmen ligger som en egen, frivillig handling under hero-knappene. Dette gjør heroen litt høyere enn i hovedreferansen. Eksisterende Jam-forhåndsvisning, verktøyoversikt og grunnleggerhilsen fortsetter nedenfor filosofiseksjonen. Kontroller for konto, søk, språk og visning er beholdt med tekst og synlige tastaturfokus. Ingen varslingsknapp uten eksisterende funksjon er lagt til.

## Endrede kilder

- `index.html`: hero, fire innganger, filosofi og hopp til innhold.
- `home-2.css`: forsideavgrenset layout, mobiltilpasning og tre visningstemaer; øvrige sider beholder sitt design.
- `images/modus-geometric.svg`, `images/modus-waves.svg`: skalerbare logo- og bølgeressurser.
- `content/i18n/home.en.json`: nye engelske forsidetekster.
- `scripts/build-languages.py`: egne forsidetekster brukes bare ved bygging av engelsk forside.
- `scripts/site_navigation.py`: forsidens logo genereres i den eksisterende menybyggeren.
- `content/publication.json`: kun tre nye offentlige ressurser på tillatelseslisten. Ingen undervisningsgodkjenninger er endret.
- `package.json`, `package-lock.json`: låst axe-testavhengighet og kommandoen `test:homepage`.
- `scripts/run-tests.cjs`, `tests/homepage.cjs`, `tests/homepage-browser.cjs`: nye målrettede kontroller.
- `tests/curriculum.py`, `tests/design-system.py`, `tests/platform-browser.cjs`, `tests/navigation-controls-browser.cjs`: forventninger oppdatert for ny forside og logo; eksisterende funksjonskontroller beholdt.
- `.github/workflows/verify.yml`: ny forsidekontroll og lagring av testartefakter i eksisterende testjobb.

`dist/` inneholder generert byggoutput og er ikke redigeringskilde. Artikkelmanus, progresjonskode, publiseringsbeslutninger, redaktørkode og verktøykode er ikke endret. `content/i18n/en.json` og `dynamic.tsv` er byteuendret for å bevare artikkelversjonenes kontrollsummer.

## Lokal forhåndsvisning

Fra prosjektmappen:

```sh
npm ci
MODUS_CATALOG_PREVIEW=1 npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Åpne `http://127.0.0.1:4173/` (norsk) og `http://127.0.0.1:4173/en/` (engelsk). Serveren skal peke på `dist/`, slik at private kildefiler ikke serveres. Ctrl+C stopper serveren.

Preview-flagget viser eksisterende passive artikkelkort; det åpner ingen fulltekster. Ingen produksjonsflagg eller deploykommandoer trengs.

## Gjenta kontrollene

```sh
MODUS_CATALOG_PREVIEW=1 npm test
npx playwright install chromium webkit
MODUS_CATALOG_PREVIEW=1 npm run test:homepage
MODUS_CATALOG_PREVIEW=1 node tests/navigation-controls-browser.cjs
MODUS_CATALOG_PREVIEW=1 npm run test:browser
```

I denne sesjonen er nettleserne installert under `/tmp/modus-2-playwright-browsers`; sett `PLAYWRIGHT_BROWSERS_PATH=/tmp/modus-2-playwright-browsers` foran nettleserkommandoene for å bruke dem. Lokalt ble Node 26.13.0 og Python 3.9.6 brukt; eksisterende CI bruker Node 22 og Python 3.12.

Testresultater, tilgjengelighetsfunn og skjermbilder skrives til `test-results/`. De er lokale artefakter, ikke nettstedinnhold. Automatiske tilgjengelighetskontroller erstatter ikke manuell kontroll med skjermleser.

## Kontrollresultater

| Kontroll | Resultat |
|---|---|
| Norsk og engelsk Preview-bygg | Bestått |
| `npm test` | 30/30 kontroller bestått |
| Release | 8/8 scenario-poster bestått |
| Plattform og Musikkatlas | 8/8 bestått |
| Navigasjon | 20/20 bestått: NB/EN, tre temaer, 100/200 % reflow |
| Artikkelkort og publiseringssperrer | 8/8 bestått |
| F03-læringsreise og progresjon | 8/8 bestått |
| Piano | 28/28 bestått |
| Faktisk lydsignal og fallback | 32/32 bestått |
| Nye forsidekontroller | 24/24 nettleser-/bredde-/språkkombinasjoner, tre temaer per kombinasjon |
| axe WCAG A/AA | 24 analyser, 0 automatiske regelbrudd |
| Helhetlig publiseringsaudit | 336 filer; 95 private kildefragmenter fraværende |
| Private artikler / CMS-seed | Ingen åpne fulltekster; seed `[]` |
| Kilde-diff uten generert `dist/` | Ingen whitespace-feil |

Nye nettleserkontroller dekker Chromium og WebKit, NB/EN og bredder 1536, 1024, 768, 375, 320 og 160 CSS-piksler. De kontrollerer tre temaer, hovedinnganger med Enter og nettleserens Tilbake, filosofilenken med faktisk klikk, hopp til innhold, synlig fokus, ingen sidescroll, redusert bevegelse og tilgang til hovedruter uten JavaScript. Den eksisterende navigasjonstesten dekker også menyenes tastaturbruk, Escape, søk, språkbytte, uavhengige 44 px treffområder og visningsvalg ved 200 % reflow.

Artefakter:

- `test-results/test-results.md` og `test-results/test-results.json`: ordinære kontroller.
- `test-results/homepage-browser-results.json`: nye responsive forsidekontroller.
- `test-results/homepage-accessibility.json`: komplette axe-resultater, inkludert kontroller som krever manuell vurdering.
- `test-results/publication-audit.json`: full filmanifest og publiseringsaudit.
- `test-results/homepage-comparison.html` og `test-results/homepage-comparison.png`: hovedreferanse og lokal implementasjon ved 1536 × 1024.
- `test-results/homepage-{chromium,webkit}-{1536,375,320}-{nb,en}.png`: skjermbilder av hele forsiden.
- `test-results/homepage-theme-{original,readable,contrast}.png`: kontroll av visningstemaene.

## Visuell sammenligning og gjenværende begrensninger

![Hovedreferanse og lokal implementasjon](../test-results/homepage-comparison.png)

Komposisjon, mørkegrønn naturprofil, fjell/speiling, akademisk serifoverskrift, gule handlinger, fire innganger og filosofi følger hovedreferansen. Det eksisterende fjellfotoet gir en annen fjelltopp og utsnitt. Bølgene og det geometriske emblemet er egne skalerbare tolkninger. Menyen viser eksisterende konto-/søke-/visningskontroller med tekst, og filmknappen er beholdt. Mer av den eksisterende forsiden fortsetter nedenfor referansekomposisjonen.

Ingen kjente blokkerende funksjonsfeil står igjen i det kontrollerte omfanget. axe kan ikke avgjøre alle kontraster over bilder, pseudoelementer og gradienter; disse står som `incomplete` i JSON-rapporten, og er ikke det samme som beståtte kontrastmålinger. Originalt, lesevennlig og høykontrast-tema er visuelt inspisert. Manuell skjermlesertest og fysisk iOS/Android-test er ikke utført; WebKit-/Chromium-testene bruker automatiserte visningsstørrelser. Native nettleserzoom er representert ved reflow-test, ikke manuell zoom på fysisk enhet.

Nettredaktøren inngår i bygget og de eksisterende redaktørtestene består. Ingen autentisert ekstern redaktør-/kontosesjon eller skriveoperasjon mot tjenester er utført. Ingen push, merge eller deploy er utført. Alle endringer og genererte filer ligger i den isolerte kopien.
