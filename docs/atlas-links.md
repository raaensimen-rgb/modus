# Artikkelkoblinger i Musikkatlas

Bygget leser det redaksjonelle registeret `content/atlas-links.json` og bruker den ordinære versjonskontrollerte artikkelpubliseringen til å avgjøre hvilke språkversjoner som får lenker. Nettleseren får bare artikkel-ID, lokalisert tittel og godkjente modul-ID-er for tilgjengelige fulltekster.

- `articles` er de 16 opprinnelige koblingene. Disse brukes både til leselenker og til eksisterende automatisk progresjon. Listen er det faste quizgrunnlaget for allerede opparbeidet progresjon.
- `pending_articles` er registerets historiske navn på tilleggskoblinger. Et element kan kobles når det har `approval: subject_approved` og artikkelversjonen faktisk er offentlig på det aktuelle språket. `status: planned` i dette registeret er historisk og gir ingen publiseringsrett.
- PL-067 godkjente fem slike tillegg. Primærmodulene er F03, I01, A01, P02 og A02. De godkjente sekundærkoblingene er I01-artikkelen til I02, P02-artikkelen til E02 og A02-artikkelen til I03. Koblingene blir leselenker på begge modulene der fullteksten er tilgjengelig. De endrer ingen quizkrav.
- Nye forslag skal ligge i vurderingsmatrisen med status «Venter på 02». Etter dokumentert faglig godkjenning kan koblingen registreres under `pending_articles`. Når den aktuelle fullteksten er valgt og versjonsgodkjent for offentliggjøring, blir lenken med automatisk ved neste bygg.

En ny godkjent modul legges til i katalogen i `musikkart.js`, i ID-listen for én av de ti eksisterende grenene og i redaksjonelt modulregister. Hold læreplanens kvalitetsregister, oversettelser og ID-testene samordnet. Kartet beregner høyden fra modultallet i grenene og beholder samme bokser, forbindelseslinjer og globus. Alle eksisterende modul-ID-er beholdes ved utvidelser.

`npm run build` og `npm test` kontrollerer kilden. `scripts/build-ux003.py` bygger den lokale kandidaten fra den verifiserte offentlige UX-002-pakken. Den bruker bare ny Atlas-HTML, JavaScript og CSS for hvert språk. Se leveranserapporten for reproduksjonskommandoer.
