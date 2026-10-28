# MODUS – læreplan og kvalitetssikring (utkast)

Dette er en **strukturert plan**, ikke publiserte kurs. Den første oversikten består av seks nivåer og 24 kortfattede moduloverskrifter. Tidligere skisser med 48 moduler er ikke endelig vedtatt eller godkjent.

## Ansvar og publiseringsport

Den interne journalen ligger i `content/curriculum/quality-register.json`. For hvert modul-ID registreres:

- `sources`: etterprøvbare, relevante fagkilder (verk, forfatter, utgave, avsnitt/side, lenke der tilgjengelig) og resultat av kildekritikken.
- `competency_evidence`: presis kobling til dokumentert og godkjent kompetanse fra Musikkutdannelse 3.0 (mål-ID, arbeid og vurdering), ikke bare gjennomgått materiale.
- `editorial_review`: kontroll av språk, pedagogikk, nivå, note- og lydillustrasjoner.
- `publication_approval`: eksplisitt sluttgodkjenning fra eier/redaktør.

En modul kan bare merkes `approved` når alle fire kontrollene er oppfylt. Inntil da brukes `planned` eller `in_review`; ingen av disse betyr at undervisningen er klar for publisering.

**Viktig:** Dagens journal inneholder ingen faglige kilder eller kompetansebevis. Dette er med hensikt; slike referanser skal ikke oppdiktes. Den offentlige oversiktssiden omtaler derfor bare *planlagte* moduler, uten faglig autorisasjon.

## Hvordan registrere et emne

1. Kontroller kilder og avklar hva som er faktum, analysevalg eller pedagogisk tolkning.
2. Kontroller tilsvarende emne-/mål-ID i Musikkutdannelse 3.0, med originale vurderingsspor og faktisk dokumentert mestring.
3. La redaktøren gjennomgå undervisningsteksten, og tilpass formuleringene til hans dokumenterte forklaringsmåte.
4. Godkjenn først etter at både kilder, egenmestring, faglig redigering og publiseringsbeslutning er dokumentert.
5. Kjør `npm run build` og `npm test`, og kontroller norsk og engelsk, mobil og tastatur. Engelsk tekst må gjennom egen språkvask før den omtales som ferdig oversatt.

## Implementasjon

- `dist/laereplan.html`: ny oversikt, utvidbare nivåkort og lenker til eksisterende deler av MODUS.
- `scripts/site_navigation.py`: Læreplan under «Lær».
- `scripts/sync-navigation.py`: aktiv navigasjon på læreplansiden.
- `tests/curriculum.py`: struktur og intern publiseringsport.

Læreplansiden er merket `noindex,nofollow` så lenge dette er en forhåndsvisning. Det er **ikke** en sikkerhetsmekanisme: Utkast bør holdes i egen gren og ikke merges før godkjenning.
