# MODUS — eksisterende nettside, eksport til Cloudflare Pages

Eksportert 27. oktober 2026 fra commit `eba8d16461be5a294a76f014306f4db05a13691f`.
Dette er det eksisterende prosjektet, ikke en ny nettside. Alle 309 sporede prosjektfiler er med. Nettstedet har 46 HTML-sider, norsk og engelsk, 13 artikler med quizer, backingtracks, teorirom, akkordverksted, læringssti, temaer og konto-/medlemskapsvisninger.

## Flytt til GitHub og Cloudflare Pages

1. Pakk ut ZIP-filen. Åpne mappen `modus`.
2. Opprett et GitHub-repository. Last opp **innholdet** i `modus` til roten i repositoryet, inkludert `dist`, `content`, `client`, `scripts`, `package.json`, `package-lock.json` og `wrangler.toml`. Ikke last opp selve ZIP-filen som nettsiden.
3. I Cloudflare oppretter du et **Pages**-prosjekt og kobler det til GitHub-repositoryet.
4. Bruk disse innstillingene:

| Innstilling | Verdi |
| --- | --- |
| Framework preset | None |
| Root directory | Repositoryets rot (tomt felt) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | Din hovedgren, vanligvis `main` |
| Node.js | 22 (`.node-version` følger med) |
| Python | 3.12 (`.python-version` følger med) |

Cloudflare installerer npm-avhengighetene fra låsefilen før byggingen. Prosjektet bruker Python-standardbiblioteket og trenger ingen pip-pakker. Ingen hemmelige miljøvariabler kreves for dagens statiske side. `wrangler.toml` angir `dist` som publiseringsmappe. Endre `name = "modus"` dersom Pages-prosjektet ditt får et annet navn.

`dist` inneholder også en komplett ferdigbygd kopi av siden. Den kan publiseres som statiske filer uten å regenerere kildekoden. Bare innholdet i `dist` skal serveres offentlig, ikke hele repositoryet.

## Bygg og kontroller lokalt

Se [automatisk kvalitetsrunde](docs/automated-quality.md) for PR-kontroller,
rapporter, avgrensninger og arbeidsform for større kodeoppdrag.

Installer Node.js 22 og Python 3.12, og kjør fra prosjektroten:

```sh
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory dist
```

Åpne http://localhost:8080 i nettleseren. Stopp serveren med Ctrl+C.

`npm run build` bygger kontobundelen, konto- og artikkelsidene, felles navigasjon og engelsk versjon. Hovedsider, spillverktøy, stilark og lydressurser ligger i `dist` og beholdes under byggingen. `dist` skal derfor være med i GitHub, ikke slettes som en midlertidig byggemappe.

## Hva følger med?

- `dist/`: alle eksisterende sider, JS, CSS, bilder, illustrasjoner og lydressurser.
- `content/`: artikkelinnhold, quizer og oversettelser.
- `client/`: kildekode for kontointegrasjon og fremdriftslagring.
- `scripts/`: eksisterende generatorer og hjelpeprogrammer.
- `tests/`: prosjektets eksisterende kontroller.
- `supabase/schema/`: databaseskjema og tilgangspolicyer som SQL.
- `docs/`: eksisterende prosjektdokumentasjon.
- `.openai/hosting.json`: opprinnelig hostinginformasjon for sporbarhet; Cloudflare bruker den ikke.
- `EXPORT-SNAPSHOT.json`: kildecommit og SHA-256 for de 309 opprinnelige filene.

Nettstedets eksisterende filer er bevart byte for byte. Bare `package.json` har fått kommandoene `build` og `test`. I tillegg er denne veiledningen, Cloudflare-konfigurasjonen, versjonsfilene og eksportmanifestet lagt til. Git-historikk, `node_modules` og Python-cache er utelatt; npm-avhengighetene gjenopprettes med `npm ci`.

## Tilkoblinger og fremdrift ved flytting

Supabase-konfigurasjonen og databaseskjemaet er med. Den eksterne databasen, brukerkontoer og serverinnstillinger ligger fortsatt hos Supabase og kopieres ikke inn i ZIP-filen. Bruk samme Supabase-prosjekt for å beholde eksterne data. Kun den offentlige publishable-nøkkelen ligger i klienten; ingen hemmelig adminnøkkel er nødvendig for dagens side.

Innlogging og registrering er fortsatt deaktivert (`accountsEnabled: false`), akkurat som på den eksporterte siden. Før de eventuelt åpnes må SMTP/e-post og redirect-URL-er konfigureres og testes. Bruk den nye Pages-adressen eller domenet i Supabase, både `/konto.html` og `/en/konto.html`. Se `docs/accounts.md`; gamle vertsadresser i dette dokumentet beskriver opprinnelig oppsett.

Quizhaker og andre nettleserinnstillinger er lagret per nettadresse. De følger ikke automatisk med fra den gamle adressen til en ny Pages-adresse. Eksisterende lokal fremdrift på den gamle siden blir ikke slettet av eksporten.

Medlemskap, priser og Stripe-testvisninger er bevart. Salg er fortsatt stengt; eksporten aktiverer ikke betaling eller betalt medlemstilgang. Se `docs/payments.md`.

Google Fonts og eksisterende eksterne referanse-/testlenker er beholdt. Nettleseren trenger tilgang til disse tjenestene slik den gjorde før flyttingen. Lokale lyd- og bilderessurser er inkludert.

## Verifisering av eksporten

Eksporten er installert med `npm ci`, bygget med `npm run build` og kontrollert med `npm test`. Kontrollene dekker begge språk, lokale lenker og ressurser, navigasjon, 39 quizspørsmål per språk, artikkelfiltre og kontotilstand. Ferdigbygd `dist` er sammenlignet med den eksisterende versjonen og er identisk. Ingen publisering til Cloudflare eller endring av den eksisterende siden er utført.

Cloudflare-referanser kontrollert ved eksport:
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
