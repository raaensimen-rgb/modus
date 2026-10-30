# Automatisk kvalitetsrunde for MODUS

## Hva skjer automatisk?

`.github/workflows/verify.yml` bygger og kontrollerer alle pull requests mot
`main`, endringer på `main` og manuelt startede kjøringer. Ved flere endringer
på samme gren avbrytes den gamle kjøringen til fordel for den nyeste.
Arbeidsflyten har kun lesetilgang og utfører ingen merge eller publisering.
Cloudflare kan som før lage en separat forhåndsvisning av utviklingsgrenen.

Alle 25 oppføringer i `scripts/run-tests.cjs` kjøres selv om en test feiler.
Hver oppføring har en tidsgrense på to minutter. Arbeidsflyten har en samlet
tidsgrense på 15 minutter.

- Eksisterende sidekontroll: byggede sider, lokale lenker/ankere og ressurser.
- Eksisterende funksjonskontroller: blant annet musikkverktøy, språkvalg,
  quiz, medlemskapsvisninger og progresjon.
- Atlasregister og negative tester vises nå som separate resultater. De var
  tidligere nestet inne i `tests/music-map.py`; de kjøres ikke dobbelt.
- Oversettelseskatalog: manglende oversettelser for registrerte kildestrenger
  som finnes som hele tekstnoder eller relevante attributter i norsk HTML,
  tomme verdier, dupliserte JSON-nøkler og ugyldige dynamiske TSV-rader.
- Negative tester av oversettelseskontrollen bekrefter at feil blir avvist.

## Hvor finner jeg resultatet?

Åpne pull request → **Checks** → **MODUS build and tests**. På kjøringens
oppsummeringsside ligger en tabell over testene. Under **Artifacts** kan du
laste ned `modus-test-results` med JSON- og Markdown-rapport og full
standardutskrift/feilutskrift i JSON. Hvis installasjon eller bygging feiler,
vises at ingen testrapport ble produsert; dette er ikke bestått QA.

Grønn kjøring betyr at de automatiske kontrollene bestod for den aktuelle
commiten. Det betyr ikke at en eldre eller nyere commit er kontrollert.
Disse endringene gjør ikke sjekken obligatorisk i grenbeskyttelsen.

## Kjør samme runde lokalt

Fra prosjektroten, med Node.js 22 og Python 3.12:

```sh
npm ci
npm run build
npm test
```

Rapportene skrives til `test-results/`. Denne mappen og `node_modules/` skal
ikke committes. Byggingen oppdaterer også genererte filer; vurder diffen før
commit. Ikke inkluder utilsiktede genererte frontendendringer i en test-PR.

## Hva krever fortsatt vurdering?

Automatiseringen vurderer ikke faglig riktighet, dokumentert mestring,
oversettelsenes språklige kvalitet, læringseffekt eller visuell sluttkvalitet.
Oversettelseskatalogen dekker ikke all ny uregistrert tekst eller alle
dynamiske JavaScript-strenger. Eksisterende sidekontroll supplerer med en
heuristikk for synlig norsk tekst i engelsk HTML. Ingen av dem beviser at
hele nettstedet er fullstendig oversatt.

Nettleserbaserte skjermbilder og tilgjengelighetsrevisjon er fremtidige
utvidelser og er ikke implementert i denne runden.

Før merge: kontroller riktig commit, les rapporten, gjennomfør relevante
faglige/visuelle kontroller og følg prosjektets godkjenning. Produksjon krever
egen beslutning etter gjeldende rutine.

## Arbeidsform for større kodeoppdrag

Beskriv ønsket resultat, avgrensning, ferdigkriterier og tillatte handlinger.
Arbeid i egen gren fra oppdatert `main`, kjør kvalitetsrunden og lever en PR
med testbevis og gjenstående vurderinger. Denne arbeidsflyten kjører tester;
den starter ikke nye AI-oppdrag, skriver ikke kode selv og er ingen
kontinuerlig bakgrunnsagent.
