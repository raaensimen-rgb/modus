# MODUS 2.0 – varig publiseringsregel

Prosjekteierbeslutning 5. november 2026, «MODUS 2.0 – 08» styrer videre arbeid.

- MODUS utvikles med offentlig læringsinnhold som mål. De 16 eksisterende artiklene er valgt av prosjekteier for klargjøring til publisering i norsk og engelsk fulltekst med eksisterende illustrasjoner, klikkbare kort, quiz og progresjon.
- Tidligere passive kort, skjult fulltekst og generelle «Under arbeid»-sperrer for disse 16 er opphevet. Ikke gjeninnfør dem fra historiske dokumenter eller tester. Eierbeslutningen skal ikke etterspørres på nytt fordi eldre godkjenningsreferanser mangler.
- Offentliggjøringsbeslutning er ikke faglig sluttkontroll. Bevar ærlig status for kildekontroll, personlig mestring, rettigheter og konkrete avvik. Bevar versjonskontroll per artikkel, språk og illustrasjon.
- Nye utkast forblir private til de er valgt for publisering. Bevar negative tester for private utkast, hemmeligheter og uautoriserte versjoner. Ikke innfør nye generelle publiseringssperrer uten dokumentert konkret grunn.
- Gjennomfør ordinær lokal utvikling, retting, bygging og testing autonomt i isolert arbeidskopi.
- Push, merge, Cloudflare-deploy (også Preview), produksjonsendring og offentliggjøring utover valgt innhold krever separat uttrykkelig autorisasjon. Lokal ferdigstilling skal fortsette uten slike operasjoner.
- Bruk det eksisterende MODUS 2.0-designet og ordinært artikkel-/CMS-bygg i raaensimen-rgb/modus. modus-4ye.pages.dev er kun historisk referanse.

Gjeldende komplette lokale 08-implementering og kandidat ligger i `.local-development/modus08/source`; se `.local-development/modus08/delivery/REPORT.md` for kilde-SHA, tester og artefakter når leveransen er ferdig. Ikke gjenbruk rotkopiens eldre publiseringspolicy til å overstyre denne implementeringen.

## Nyere P0-illustrasjonskandidat

Denne isolerte kopien bygger på 52-artikkelutgaven cf1258793e8eb28cf49683cf9a020948a48ed764. Se docs/p0-illustration-candidate.md. Ikke erstatt dette innholdet med eldre 16-artikkelkopier. Den aktuelle ordren tillater lokal illustrasjonsproduksjon og testing; ingen publisering uten separat GO.

## Samordnet P0/P1 – lokal kandidat 2026-11-05

Denne arbeidskopien bygger videre på nyeste eksisterende designkode 1a781fe etter publisert 2ec2ce5, med 52 norske/16 engelske fulltekster og P0-diagrammene bevart. Se docs/article-library-p0-p1-20261105.md. Den godkjente forsiden og øvrige lokale designforbedringer skal videreføres. Oppdraget tillater kun lokal implementering, bygging og testing; ingen push, merge eller deploy uten separat GO.

## Lokal godkjent introduksjonsfilm – 2026-11-05

Prosjekteier har sett og godkjent den nye filmen med SHA-256 `81eed15e5f0fa3c43ef0ba3130162bed23564621d68a9c96cf8f2fefcf4359b4`. Se `docs/approved-intro-film-20261105.txt`. Denne isolerte kopien klargjør kun integrasjon i eksisterende filmfelt på NB/EN. Den tidligere filmen `media/modus-introduksjon.mp4` forblir pensjonert. Ikke la eldre generell mediesperre deaktivere den eksakte godkjente erstatningen på nytt. Godkjenningen av filmen er ikke et eget GO til deploy, push eller merge; slik autorisasjon gjenstår.

## Lokal større filmknapp – 2026-11-05

Se docs/intro-film-button-visibility-20261105.txt. Brukerens lydproblem ble avklart av brukeren som en feil på hans egen maskin og er rettet. Denne kandidaten endrer bare filmfeltets plassering/utseende og gjør posteren klikkbar. Publisert MP4 og spiller-JS er uendret fra cefe31c. Den separate modale musikkandidaten er ikke publisert her. Ingen ny deploy-fullmakt foreligger; separat GO kreves for denne knapprettingen.
