# P0 – illustrasjoner til 52 eksisterende artikler

Lokal, isolert kandidat fra prosjekteiers ordre 2026-11-05. Kildegrunnlaget er den nyere 52-artikkelutgaven `cf1258793e8eb28cf49683cf9a020948a48ed764`, ikke en eldre 16-artikkelgren. Ingen push, merge, deploy eller produksjonsendring er autorisert eller utført i dette oppdraget.

`content/articles.json` inneholder 52 norske artikler. Bare de opprinnelige 16 har komplette engelske artikkelutgaver. Dette arbeidet oversetter diagrammer, ikke de manglende 36 artikkeltekstene.

## Kilder og integrasjon

- `scripts/teaching_diagram_specs.py`: individuell, tospråklig brief for alle 52 artikler, basert på lesning av alle eksisterende seksjoner og øvelser.
- `scripts/teaching_diagrams.py`: deterministisk SVG-konstruksjon. Notehøyde, diatonisk linjeplassering, faktiske pianotangenter og gitarposisjoner kommer fra presise tonedata.
- `editorial/teaching-diagrams/{nb,en}`: 52 diagramsett og 52 kompakte varianter per språk. De kompakte variantene brukes som lokale erstatninger for de 36 generiske placeholder-bildene. Opprinnelige godkjente 16 × 2 illustrasjoner beholdes byte for byte.
- `editorial/teaching-diagrams/manifest.json`: artikkel, kildeoverskrifter, tekstalternativ, språktilgjengelighet og hash per diagram.
- `editorial/teaching-diagrams/index.html`: privat, lesbar oversikt over begge språk.
- `scripts/integrate-teaching-diagrams.py`: siste byggesteg. Integrerer bare allerede tillatte artikkel-/språkpar; endrer ingen tillatelse, faglig status, tekst, quiz eller CMS-nøkkel. Ved bortfall av tillatelse fjernes diagrammet også fra et skittent bygg. Uavhengig tidligere godkjent bildeversjon kan beholdes etter sin egen policy.

Diagrammene settes etter første innholdsseksjon, før andre seksjon, med eget `figure`, beskrivende alternativtekst og tastaturåpent tekstalternativ. Statisk originalartikkel, artikkelslug, quiz-ID og lagringsnøkler er uendret. Diagrammene er et separat byggelag; de skriver ikke nye avsnitt til CMS-kilden eller endrer administrator-master.

## Lokal bygging

```sh
npm ci
npm run build
npm test
npm run build:candidate
node tests/teaching-diagrams-browser.cjs
```

`build:candidate` bruker eksisterende reproduserbare P0-pakking og legger til diagramlaget i `../package`. Denne pakken bevarer offentlig sperreside, tom CMS-seed, utelatte medier, rettighetsrettinger og norsklenker fra de 36 manglende engelske artiklene. Det er denne pakken som skal forhåndsvises lokalt. `dist` er et utviklingsbygg, ikke publiseringspakken.

Ingen ny publiseringsbeslutning er skrevet til policyen. Det ferdige nettstedet er en kandidat og krever separat GO før eventuell deploy. Kildearkivet og det private tospråklige diagramgalleriet skal aldri publiseres som nettsted.

## Verifikasjon og faglig avgrensning

`tests/teaching-diagrams.py` bruker en uavhengig toneverdi-tabell som orakel og kontrollerer tone-/strengtall, alle markerte tangenter, linjeplassering, akkord- og skalaforhold, omvendingssummer, guide-toner, 3:2-forhold, metrisk modulasjon og instrumenttransponering. Testen kontrollerer også identiske kilder/policy/adminfiler, originalillustrasjonene, SVG-sikkerhet og bortfall av diagramtillatelse i et skittent bygg.

`tests/teaching-diagrams-browser.cjs` kontrollerer alle 68 eksisterende språkversjoner i to motorer og to bredder, tekstbevaring, lagret quiz, tastatur, bildelasting, katalog, 200 % CSS-zoom og utestenging av private EN-diagrammer. Alle 208 kilde-SVG-er kontrolleres i begge motorer for tekst innenfor bildeflaten. 79 skjermbilder dokumenterer alle 68 integrerte diagrammer i mobilvisning og utvalgte desktop-/katalogvisninger.

Dette er avgrenset matematisk, musikkteoretisk og teknisk kontroll. Opplevd sentrum, interpretasjon, kunstnerisk effekt, fysisk instrumentprøve og full faglig sluttgodkjenning er ikke dokumentert av disse testene.
