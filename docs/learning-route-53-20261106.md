# #53 – sammenhengende start, artikkel og øving

C02 eier én integrert kandidat. Oppdraget fra prosjekteier via C04 omfatter lokal implementering, C01s avgrensede frontendstøtte, C05s uavhengige sluttkontroll og C06s påfølgende publisering. Tillegget «Samt publisering av rettelse etterpå» er avklart hos C04/C06; ingen ny GO-runde kreves innen denne rettelsen. C02 laster ikke opp.

## Autoritativt grunnlag

Produksjon er lesende bekreftet som 1721e302a3880804073e0dcb0de6543f939ba0f6 / 2c46a5f1-fdca-4920-b233-cac50f34d7bf på modus-4ye.pages.dev. Nyere relevant lokal integrasjon 24670c510bc84b934c35b37f95f8d7f41392e743 samler allerede UX-001, A03 og artikkel→Jam-piloten. Denne historikken og den gjennomgåtte piloten er videreført, ikke skrevet på nytt. C11s separate søk/filter/runtime-kandidat er ikke tatt inn. Ingen eldre GitHub main eller pensjonert Preview brukes som autoritativt produktgrunnlag.

## Én rute og gjenbruk

`article_library.ORDER`, det eksisterende artikkelregisteret og faktisk offentlig katalog bestemmer rekkefølge, publiserte språk og titler. `scripts/learning_route.py` bygger veiledningen over dette, ikke et nytt kurs eller nye private manus.

- Forsidens primære startknapp og Studier → Start å lære går til samme eksisterende `/laeringssti`.
- Inngangspanelet kommer rett etter eksisterende hero, med Begynn fra starten / Fortsett der du slapp og navnet på neste artikkel.
- `/grunnstudier` er nå en indeks over publiserte artikler og deres faktiske instrumentoppgaver, valgfrie quizer og eksisterende verktøy. Den er ikke en publisering av det private, uferdige Grunnstudier-manuset eller dets runtime.
- `/studierute` beholder hele den norske T1–T10-teksten og får samme inngangspanel før kartet. EN får en faktisk 16-artikkeloversikt og tydelig henvisning til det større norske kartet, ikke norsk utgitt som engelsk.
- De 68 lesesidene beholder UX-001s forrige/neste og får tilbake-lenke til samme rute. Den eksisterende instrumentoppgaven får et stabilt anker. Kjente svake teori-hashlenker bruker verktøyets allerede støttede topic-query; original aktivitet og tekst beholdes. Ingen endring i verktøymotor eller autoplay.
- Verktøyene viser tilbake til artikkel/studierute bare ved kjent offentlig artikkelkontekst. `fromArticle` valideres mot den samme språkspesifikke ruten; samme-origin artikkelreferrer kan gi retur etter den bevarte Jam-pilotlenken. Ingen fri redirect eller HTML-innsetting fra URL.

## Progresjon og lagring

Ingen ny lagringsnøkkel, skriving, migrering eller sletting innføres. Eksisterende `modus.article-quiz.v1.*`, ModusAccount og `modus.atlas.article-evidence.v1` leses. Åpnet vises som åpnet, ikke som lest. Quizresultat vises som faktisk quizresultat, ikke fullført praksis eller automatisk mestring. Videre navigasjon er alltid åpen uten obligatorisk quiz. Fortsettelse etter reload betyr uttrykkelig første artikkel uten fullført quiz, ikke eksakt leseposisjon. Egenvurdert forståelse i Atlas og gammel F03-progresjon påvirkes ikke. Domenebinding og feil ved blokkert/ugyldig lagring beholdes synlig som kontrollgrense.

## Bygg, sikkerhet og QA

Den normale kildebyggingen bevarer de opprinnelige private kurs-/publiseringsportene. Det avgrensede produktbygget legger den nye offentlige artikkelindeksen på låst produksjonsgrunnlag. `build-start-here.py` beholder UX/Jam før den nye ruten legges på. Den nye deltaverifikasjonen rekonstruerer den gjennomgåtte 24670c5-pakken nøyaktig før eksisterende upstream negative tester gjenbrukes; de er ikke fjernet. Manipulert baseline, privat fil, uautorisert EN-tekst, manglende Jam-seksjon eller endret runtime skal fortsatt avvises.

`tests/learning-route.py` kontrollerer modell, språk, virkelige oppgaver, ankre, bevart T1–T10, uendret runtime/medier/storage og private grenser. `tests/learning-route-browser.cjs` følger faktisk start → rute → artikkel → valgfritt verktøy → retur → quiz → fortsett etter reload ved 320/375/768/1440, NB/EN og Chromium/WebKit. Den støtter `MODUS_TEST_URL=https://modus-4ye.pages.dev` uten lokal server for C06s offentlige etterkontroll. Den måler ingen lydstart før eksplisitt Play og tester blokkert/ugyldig lagring. Oppgaven er obligatorisk trinn `learning-route` i A03 prepare, sammen med alle øvrige kjørte kontroller.

C01 eier kun learning-route.css og avgrenset UI-evidens. En reell mobilfeil fra gammel `nav>a:first-child` som skjulte første returanker er rettet bare innen `nav.route-return`. Felles header og designfiler er ikke endret. Et tidlig testløp manglet venting på eksisterende artikkelpremissdialog; testen håndterer dialogen, produktpremissene er ikke fjernet.

Ingen faglig sluttgodkjenning, personlig mestring, fysisk Safari/iPhone, VoiceOver eller autentisert adminattest påstås. Administrator, Access, utkast og backup er urørt. Ingen GitHub-push/merge, Git-main-, DNS/MODUS.NO-, database-, tjeneste- eller autodeploy-endring er utført av C02.

## Rettet returfeil etter C05-kontroll

C05 fant at skalabibliotekets `render()` kanoniserte URL-en uten `fromArticle`. Etter retur til artikkelen og nettleserens Tilbake forsvant derfor den synlige returknappen. Den avgrensede rettingen bevarer kun en syntaktisk gyldig artikkel-ID i eksisterende URL-bygging. Returknappen bruker fortsatt bare den offentlige artikkelmodellens hviteliste; ukjente/private ID-er åpner ingen returadresse. Ingen skala-, lyd- eller lagringslogikk er endret. Den samme presise patchen legges på NB/EN gjennom ordinær produktbygger; alle andre runtimefiler er hashbevart. En regresjonstest kontrollerer kontrollendring, øvingsvisning, språklenke, artikkelretur, browser Tilbake og omlasting på NB/EN i Chromium/WebKit, samt negativ ukjent artikkel. Tidligere kandidat f428316 er erstattet og skal ikke publiseres.
