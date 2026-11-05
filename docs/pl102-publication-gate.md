> Historisk dokument. For de 16 eksisterende artiklene erstatter prosjekteierbeslutning MODUS 2.0 – 08, 05.11.2026, tidligere sperrer og krav om ny eierbekreftelse. Se [gjeldende beslutning](modus-08-owner-decision.md) og AGENTS.md. Uvalgte utkast og uautoriserte versjoner omfattes ikke av dette unntaket.

# PL-102 / #42 – offentlig bygggrense og PL-101-kandidat

Arbeidsordre: #28, kommentar 6551064272. Rettelsen er isolert fra main
cda616a31a57f7157ab2427b15f8c3e6f362a687. PR #43 og Studio berøres ikke.
PR #44s head/historikk skal beholdes. Kandidatgren oppgis separat i PR-rapporten.

## Faktisk migrering / beslutningsgrunnlag

De 16 kildeartiklene manglet separate redaksjons-/synlighetsfelt og eksplisitt
publiseringsreferanse. F03 har planned, editorial_review=false og
publication_approval=false i quality-register.json. For Dorisk og Grunnstudier
ble det heller ikke funnet en slik eksplisitt fulltekstgodkjenning. Fem planlagte
artikkelkort var metadata, ikke godkjente komplette undervisningsartikler.
Tidligere offentlige URL-er og bestått teknisk QA er ikke nye faglige tillatelser.

content/publication.json registrerer artikler, undervisningssider og planlagte
katalogtekster separat. Alle starter draft/private uten godkjente språk eller
publiseringsreferanse. Dette er en bevisst, konservativ kandidatmigrering etter
arbeidsordren, ikke en påstand om at kildene er slettet eller faglig feil.
Dermed viser kandidatens bibliotek ingen publiserte artikkel-/quizkort eller
ikke-godkjente katalogtekster før prosjekteier gir dokumentert tillatelse.
Verktøyene, læreplanens emneoversikt og læringsreisens UI beholdes.

Alt originalmateriale og historikk bevares i kildene. De tre legacyfilene som
bare hadde dist som kilde er kopiert byteidentisk til editorial/legacy/ før
byggingen gjøres uavhengig av gammel dist. Læreplanens offentlige UI har fått en
rotkilde, laereplan.html, i stedet for å kreve en gammel generert fil.
Eksisterende kildetester av det arkiverte piano-/gehørutkastet kjøres fortsatt;
de skal ikke lenger kreve at et privat utkast er offentlig distribuert.

Dette er en **statisk publiseringssperre**, ikke autentisering for et offentlig
eller privat GitHub-repository. Repositoryets tilgangsnivå endres ikke her.
Private ART-002-filer fra Library er ikke importert i repositoryet eller bygget.

## Datamodell og åpning / lukking

- editorial_status: draft / in_review / approved.
- visibility: private / preview / public. preview betyr aldri offentlig Pages.
- approved_locales: eksplisitt nb og/eller en.
- approval_reference: ikke-tom dokumentasjonsreferanse.
- Bare approved + public + riktig språk + referanse er offentlig tillatelse.
- Manglende post/felt betyr ikke tillatelse; ugyldig register/schema stopper
  bygget. Stabile ID-er, språk og tillatte kildebaner valideres.
- Engelsk artikkelgenerering krever også tillatelse til den norske masteren;
  løsrevet EN-only-publisering er ikke implementert. Det er en fail-closed
  begrensning som krever en separat redaksjonell/teknisk avklaring hvis ønsket.
- Katalogtittel/ingress kan tillates separat fra selve artikkelen gjennom
  catalog_previews. Ingen slik tillatelse er oppfunnet i denne migreringen.

En senere åpning krever redaksjonell beslutning og commit av rett record, ikke
manuell kopiering av HTML. Lukking skjer ved visibility=private (uten sletting).
Ny bygging og separat godkjent deployment er nødvendig. Tilbakerulling av data
kan gjøres gjennom Git-historikken; tilbakerulling til en eldre usikker
publiseringspipeline anbefales ikke som sikkerhetsrollback. Ingen annen modul-
eller Atlas-progresjon slettes. Gamle lokale quizhaker bevares i nettleseren.

## Hele build-banen

1. sync-design-system.py renser generert dist helt, også hvis Cloudflares gamle
   kommando har forhåndskopiert kildefiler dit. Eksplisitte platform_pages og
   platform_assets i registeret velger eksisterende UI/verktøy/medier. Nye
   ukjente rotfiler, bilder, utkast, kilderegistre og mapper kopieres ikke inn
   automatisk. account/editor bundles bygges fra gjeldende client-kilder.
2. Undervisning, Dorisk og Grunnstudier blir generiske Under arbeid-sider uten
   kildetekst eller runtime. Private artikkelruter får samme ærlige tomtilstand;
   gamle slug-URL-er beholdes for navigasjonskompatibilitet, uten privat tittel.
3. Artikkelgenerator, kontotitler, søk og CMS-seed filtrerer med samme policy.
   EN-bibliotek og artikkelkilder rendres separat i .build-private/en og først
   deretter til offentlig EN. Mellomfilene ligger aldri i dist. Private
   illustrasjoner følger heller ikke med gjennom det engelske kopieringstrinnet.
4. finalize-publication.py begrenser offentlige quiz-/leserekkefølge-ID-er.
   Kontoen viser bare titler den har publiseringstillatelse til; null artikler
   gir ikke undefined-lenker. Tomt bibliotek gir ingen nextArticle-feil.
5. cms-seed.json inneholder bare tillatte publiserte språkposter (nå []).
   Private editor-data skal ikke hentes derfra. CMS-worker aktiveres ikke.
   Ingen ny Supabase-/Cloudflare-innlogging eller tilgang er satt opp.

Ingen eksisterende sitemap/RSS-generator er funnet. Gamle sitemap/RSS/JSON/JS,
source maps og arkiver i uren dist fjernes ved ren oppbygging. Det er ikke nok
å bruke CSS, hidden, noindex eller ulistet Preview for private data.

## Tester og dokumentert bevis

npm run build; npm test. publication.py bygger separate syntetiske prosjekter:
private standard, manglende post, status/synlighet uavhengig, feil skjema/sti,
NB-tillatelse uten EN-tillatelse, offentlig positivt tilfelle og ny privat
status. Private canaries legges i artikkeltekst, ukjent HTML/JS/bilde og gamle
artefakter/arkiver. Alle offentlige bytes undersøkes. Rent og urent bygg må
være byteidentiske. Testfixturene ligger aldri i offentlig utgang.

publication-audit.py undersøker hele aktuelle dist, sammenligner kjente private
introer/seksjonstekster (nå 95 fragmenter), seed/indeks mot policy, holding-ruter,
fravær av private runtimes og interne mapper. Filmanifest med byteantall og
SHA-256 lagres i test-results/publication-audit.json. Dette er et presist lokalt
byggbevis, ikke en attest om en ekstern Cloudflare-deployment.

Eksisterende musikk-/piano-/lydtester bevares for de offentlige verktøyene.
Piano-browser erstatter offentlig kjøring av privat legacy-F03 med kontroll av
holding-siden og fravær av runtime; intern legacy-logikk testes fremdeles.
Publication-browser tester 1440/375, NO/EN, tomt bibliotek uten runtime-feil,
seed, direkte 404-ruter og redusert bevegelse/CSS 200 %. Fullsidebilder skjuler
bare den eksisterende usynlige nav-tooltipen under selve skjermbildeopptaket;
faktisk layout måles før dette. Dette erstatter ikke ekte browserzoom/VoiceOver.

CI skal levere testresultater/skjermbilder samt public-site-dist-artefakt etter
beståtte kontroller. Artefakten skal aldri inneholde .build-private, editorial,
content, tests eller dokumentasjonsfiler. Eksakt SHA/CI/artefaktdigest oppgis i
PR/Issue-rapporten etter gjennomført kjøring, uten å attestere fremtidige tester.

## Kandidat og parkerte deler

PL-101-filer kombineres på en egen kandidatgren med denne sperren, med parent og
sammensetning dokumentert. Ingen GitHub-PR merges, og main endres ikke. PR #44
og #43 beholder sine heads. Ny SHA krever egen isolert Cloudflare Preview.
Gammel 4dfa7c53-Preview er baseline og inneholder fortsatt påvist eksponering.

Cloudflare-deploy krever autentisert kontotilgang som ikke finnes i agentens
terminal/tilkoblede tjenester. Parker deploy hvis det fortsatt er tilfellet;
fullfør kode, CI, tilgjengelig nettleser-QA, artefaktkontroll og dokumentasjon.
Én kort eierhandling med endelig kandidatgren/SHA gis til slutt. Ingen passord
skal sendes i chatten. Privat CMS/redaktørinfrastruktur er også parkert fremfor
å bygge ny innlogging eller eksponere utkast i en offentlig seed.

Til 01: kontroller tomt bibliotek og Under arbeid-visninger i eksisterende design.
Til 02: kontroller schema, fail-closed regel, språk, rensing og reversible data.
Til 07: verifiser ny nøyaktig Preview/SHA, direkte HTML/JSON/JS og ukjent URL-
fallback, 375/1440, faktisk 200 %, tastatur/VoiceOver, F03-progresjon og regresjon.
Automatisk PASS eller 08s selvkontroll er ikke uavhengig release-GO.

Produksjon og gamle Preview-build er **ikke rettet** av at denne grenen finnes.
Ingen merge/main-endring/produksjonspublisering er autorisert av denne leveransen.
