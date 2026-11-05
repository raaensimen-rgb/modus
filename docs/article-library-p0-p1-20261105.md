# MODUS 2.0 – samordnet P0/P1-kandidat

Prosjekteiers oppdrag 2026-11-05: ferdigstill individuelle artikkelillustrasjoner og responsivt bibliotek i nyeste eksisterende kodebase, med bygg, tester, faktiske skjermbilder og commit-SHA. Ingen push, merge eller deploy uten separat GO.

## Utgangspunkt

Nyeste eksisterende designkode er `1a781fe23e60f8d6225cc976b33e9be3d220e7f4`, etterfølger av sist publiserte `2ec2ce517fabbc8c691703868b73115241d330fb`. Oppfølgingen forbedrer felles temavisning og native kontroller; den videreføres her uten å endre den godkjente forsiden. Den offentlige manifestadressen ble lest med vanlig HTTP og bekreftet publisert `2ec2ce5` ved oppstart. Dette oppdraget publiserer ikke en ny versjon.

P0 er integrert fra den eksisterende 52-artikkelkilden: alle 52 norske og 16 komplette engelske lesesider beholder individuelle diagrammer. De 32 opprinnelige illustrasjonene og alle nyere kort-/undervisningsdiagrammer er identiske med tidligere publiserte filer. De øvrige 36 EN-diagramsettene er privat kildemateriale fordi fullstendige EN-artikler ikke finnes. Ingen tekster, artikler eller oversettelser er lagt til.

## Implementering

- `article-library-layout.css` og `.js`: avgrenset til biblioteket. Ett eksisterende kortsett skifter mellom rutenett og liste. Ingen nye lagringsnøkler eller kopierte kort.
- `scripts/apply-article-library.py`: idempotent siste byggesteg etter godkjent fellesdesign. Legger bare til lokaliserte visningskontroller og innholdshashede ressurser på NB/EN-katalogen. Med JavaScript av vises et fungerende rutenett uten inaktiv bryter.
- `scripts/integrate-teaching-diagrams.py`: riktige alternativtekster for de 36 nyere kortenes faktisk viste diagrammer. Kilde- og publiseringsregistre endres ikke.
- Kort: bilde uten beskjæring, full tittel, kategori, introduksjon og tydelig artikkelinngang. Leserekkefølgens trinnnummer ligger utenfor illustrasjonen. Synlig quizstatus og quizlenke beholdes.
- Kolonner: 1 under 360 px, 2 fra 360 px, 3 fra 700 px, 4 fra 1000 px. Testpunkter: 320/375/768/1024/1440 px. Liste bruker én kolonne.
- Introduksjoner i rutenett: opptil 2/4/6 linjer på mobil/nettbrett/desktop. Originaltekst er i DOM og på lesesiden; liste viser introduksjonen fullt ut. Titler avkortes ikke.
- Tastatur, minst 44 px kontrollflater, synlig fokus, original/readable/contrast, 200 % CSS-zoom og eksisterende søk/filter/gruppering er kontrollert.

## Bygg og kontroll

```sh
npm ci
npm run build
npm run build:candidate
npm test
npm run test:library-layout
node tests/teaching-diagrams-browser.cjs
npm run test:library-regression
```

Nettstedskandidaten bygges i `../package` med eksisterende P0-pakking. Utviklingsbygget `dist` er ikke deploygrunnlag. Offentlig seed er tom, administratorruntime og private kontroll-/kildemapper er utelatt, Access-administratoren ligger på separat gren, introfilm og annen ikke-valgt media forblir sperret. Bevarte originale naturbilder/appikon og den nye godkjente designforsiden er ikke erstattet.

`tests/article-library-coordination.py` kontrollerer versjoner, bevarte kilde-/policy-/adminfiler, 104 uendrede lesesiders main-innhold (inkludert EN-plassholdere), alle illustrasjonsbytes og private grenser. Testen skriver artikkelvis bevaringsoversikt. `tests/article-library-layout-browser.cjs` tester rutenett/liste ved alle fem bredder, korttekst mot tidligere katalog, filter/søk på samme DOM-noder, tastatur, faktisk quiz/progresjon, temaer, bildevisning og skjermbilder. Tre engelske katalogtitler/introer var allerede formulert annerledes enn lesesidens overskrift; begge eksisterende versjoner bevares. Faglig sluttgodkjenning eller manuell VoiceOver/Safari/iPhone-prøve påstås ikke.

Ferdig rapport og artefakter ligger i `../delivery`. Kildearkiv er privat materiale og skal aldri lastes opp som nettsted. Separat GO må navngi den ferdige kandidaten før eventuell publisering til eksisterende MODUS 2.0-adresse; ingen MODUS.NO-, GitHub main-, database- eller Access-endring er utført.
