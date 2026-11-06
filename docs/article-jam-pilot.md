# Pakke A · Artikler → Jam

Lokal vertikal pilot fra A03 `ee935340387b9469522f918c48e5e1a8e9084ac0`, etterkommer av faktisk offentlig `1721e302a3880804073e0dcb0de6543f939ba0f6`, deployment `2c46a5f1-fdca-4920-b233-cac50f34d7bf` i `modus`. Ingen publiseringsfullmakt. `production:workflow prepare` brukes til lokal ferdigstilling; separat GO kreves for eksakt ny SHA/ZIP.

## Kartlegging og avgrensning

- `content/articles.json`: 52 norske artikler; `content/i18n/articles.en.json`: 16 engelske fulltekster. Eksisterende `practice`/`practice_label` lenker, originaltekst, kilde-/eier-/illustrasjonsregistre og quiz bevares.
- `progressions.js` tilbyr `validSequence`, `link`, `readLaunch`, og `model`. Rekker har 1–8 akkorder, rotindeks 0–11 og kvalitetsindeks. URL-lengde, typer og rotenes enharmoniske navn valideres; ingen kode evalueres fra URL.
- `app.js` gjenbruker denne modellen, overstyrer gamle lokale valg fra URL, og starter lyd bare etter Play. Eksisterende modalgrader er bl.a. dorisk i–IV–i–IV og eolisk i–VI–III–VII. Verkstedet kan allerede sende egne akkordrekker. Instrumenter, lisenser, lydmotor og MIDI-eksport er urørt.
- Motoren bruker fast 4/4 (16 underdelinger per takt). Registeret tillater derfor bare 4/4; andre taktarter avvises ved bygg. URL bærer `meter=4/4` som eksplisitt metadata; eksisterende motor leser ikke denne parameteren og får sin identiske faste 4/4-implementering. Dette innfører ingen støtte for andre taktarter.
- C02 og C07 er kontaktet etter brukerens samordningsordre. Begge bekrefter ingen aktive konfliktende kodeendringer og starter ikke parallelt arbeid. Historiske plattformfunn er bevart som begrensninger.

## Pilot og utvidelsespunkt

`dorisk-og-eolisk` får én tilleggseksjon etter uendret artikkel på NB/EN: E dorisk, Em7–A7–Em7–A7, én takt per akkord, 90 BPM, Fusion, eksisterende akustisk piano. Lytt etter C♯ som stor sekst; dette er en dorisk anvendelsesøvelse, ikke lydbevis for artikkelens fulle dorisk/eolisk-sammenligning. Start skjer med eksisterende Play/Start jam. Ingen nye opptak eller tjenester.

`content/article-jams.json` er et separat versjonert register knyttet til eksisterende artikkelslug; det publiseres ikke som CMS-data. `scripts/apply-article-jams.cjs` bygger statiske, HTML-escapede lenker med den eksisterende Jam-serialiseringen. Samme steg inngår i ordinært CMS-kildebygg og avgrenset produktbygg. Manglende/private språkversjoner får ingen seksjon; eksisterende publiseringspolicy bestemmer fortsatt hvilke fulltekster som finnes. Bare valgte eksakte artikler i registeret berøres. Ingen fritekst fra URL gjengis av den nye løsningen.

Foreslått neste utvidelse til seks artikler totalt, etter faglig kontroll av øvelsene og eksisterende språkdekning:

| Eksisterende artikkel | Konkret foreslått øvelse (4/4) |
|---|---|
| dorisk-og-eolisk (pilot) | E dorisk · Em7–A7 · 90 BPM |
| moduser-og-tonalt-sentrum | E dorisk · Em7–A7 · 80 BPM; hold E som sentrum |
| kirketonearter-ett-system-sju-uttrykk | D dorisk · Dm7–G7 · 80 BPM |
| dur-og-moll | C ionisk · C–F–G–C · 80 BPM |
| septimakkorder | C ionisk · Dm7–G7–Cmaj7–Cmaj7 · 75 BPM |
| harmonisk-moll-og-frygisk-dominant | E frygisk dominant · E–F–Am–E · 75 BPM |

Dette er forslag, ikke implementert innhold eller faglig sluttgodkjenning. Ny EN-oversettelse utover eksisterende fulltekster er separat arbeid.

## Test og begrensninger

`tests/article-jam.cjs` krever eksakt to endrede HTML-filer og uendret øvrig produksjonsinnhold, uendret artikkel etter fjerning av kun øvingsseksjonen, NB/EN-ruting, riktige akkorder/parametre og avvisning av ugyldige rekker. `tests/article-jam-browser.cjs` kontrollerer Chromium/WebKit × NB/EN × 320/375/768/1440, gamle lagrede valg, ingen lydkontekst/samplehenting før Play, lydfeil, nytt forsøk med faktisk målt lydsignal og stopp. Bevaringstester tillater bare den særskilt verifiserte tilleggseksjonen; private negative tester beholdes.

Full A03-kjøring omfatter også kildebygg, ordinære testgrupper, reproduserbarhet, skala/atlas, navigasjon, alle 68 fulltekster, film, piano og lydfallback. Se oppdragets delivery for faktiske sluttresultater og SHA. Ingen manuell Safari, VoiceOver, fysisk enhet eller menneskelig lytting attesteres. Ingen eksport-/eierskapsutvidelse er gjort; eksisterende MIDI-funksjon er uendret.
