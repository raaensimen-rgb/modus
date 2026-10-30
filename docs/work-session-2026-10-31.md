# Arbeidsøkt – kommende artikkelkort, 31. oktober 2026

Baseline: `41449f99b39f45fd8c28a4ac7569dc32610fbedc`.
Gren: `test/upcoming-cards-both-locales`.

## Kontrollert status

- PR #12 er allerede merget. `articles.css` har egne mobilregler for
  QA-078-02, inkludert `minmax(0, 1fr)`, `min-width: 0`, tekstbryting og
  kontaktknapp-klaring. Dette bekrefter implementering, ikke faktisk visuell QA.
- PR #17 (Safari Escape) og #16 (QA Preview) er separate, åpne arbeidsspor.
  De er ikke endret i denne økten.

## Utført

Styrket eksisterende `tests/upcoming-articles.py`, som allerede kjøres i
`npm test`. Den tidligere kontrollen dekket bare norsk og brukte
`r'<a\\b'`, som søker etter en bokstavelig backslash fremfor ordgrensen
etter taggnavnet. En lenke uten href kunne derfor passere.

Testen parser nå faktiske HTML-elementer og kontrollerer:

- Fem kommende kort på norsk og fem på engelsk.
- Alle fem forventede titler, uten manglende eller dupliserte titler.
- Nøyaktig ett korrekt statusmerke: «Kommer» / «Coming soon».
- Ingen interaktive elementer, hendelsesattributter, href, tabindex,
  contenteditable eller interaktive roller i passive kort.
- Ekstra CSS-klasser eller annen klasseorden kan ikke omgå kontrollen.
- Seks negative prøver av lenke, knapp, hendelsesattributt, tabindex,
  interaktiv rolle og tomt statusmerke må avvises.

Eksisterende kontroller av mobil-CSS, status «planned» og skillet mellom
planlagte og publiserte artikler beholdes. Ingen frontend, faginnhold,
personlig progresjon, betalingssystem eller publiseringsworkflow endres.

## Verifisering og gjenstående arbeid

`npm ci`, `npm run build` og `npm test` er kjørt i en ny, ren klone:
22/22 kontroller bestod, inkludert kortkontrollen og seks negative prøver.
En tidligere lokal worktree ga fire feil i andre tester etter bygging.
Årsaken er ikke fastslått; den kjøringen regnes ikke som bestått.
Den rene klonen er det lokale verifiseringsgrunnlaget. Endelig commit og
GitHub Actions-resultat oppgis i Draft PR-en. Ingen merge eller eksplisitt
deployment utføres.

Dette er strukturell regresjonskontroll. Faktisk lesbarhet, avkutting,
kontrast, 375 px og 200 % tekst må fortsatt kontrolleres i nettleser mot
eksakt commit. En bestått test er ikke visuell godkjenning av QA-078-02.
