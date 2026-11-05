# MODUS 2.0 – M3.6: Tilgangsbeskyttelse før opplasting

**Til 00 – Prosjektledelse · 02.11.2026 · Kun kartlegging/dokumentasjon.**

**Konklusjon: NO-GO for opplasting/deploy nå.** En konkret eierpolicy er foreslått, men Access er ikke aktivert eller verifisert. Tomt prosjekt og utilgjengelig origin er ikke tilgangsbeskyttelse.

## 1. Faktisk kontroll

Konto: `Raaensimen@gmail.com's Account`, `d56ac50a4568da9b7995405c62d7479e`. Prosjekt: `modus-2-preview`, ID `9162f418-3185-4967-a5c9-9b1d17cf8d18`.

Lesekontroll kl. 20:19:59 UTC: **0 deployments**, ingen Git-kilde, ingen latest/canonical deployment og 0 miljøvariabler i begge miljøer. Eksisterende OAuth kunne lese Pages, men Access-appene og Zero Trust-organisasjonen svarte **403**. Dette dokumenterer manglende lesetilgang med denne autentiseringen, ikke fravær av Access eller årsaken til avslaget. Gjeldende policyer, IdP, Zero Trust-plan og kontofakturering er derfor **uavklart**.

Uautentisert HTTP-klient uten cookies fikk **522** på `/`, `/en/` og `/preview-isolation.json` kl. 20:21:06 UTC, uten Access-redirect. Dette er ikke en bestått Access-test og sier ikke at en senere opplasting blir privat. Ingen innlogging eller PIN-sending ble gjennomført.

[GET-logg](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.6/read-only-inventory.json>) · [Anonym HTTP-probe](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.6/anonymous-current.json>). Ingen Cloudflare-innstillinger, applikasjonskode, DNS, bindings eller produksjon er endret. HEAD er fortsatt `2f2a2c2787af9f680731dc6ed09434c1d78857ac`. Bygg/tester er ikke gjentatt; M3.4-evidensen er fortsatt lokal kodebaseline.

## 2. Hele adressen må beskyttes

Cloudflares vanlige «Enable access policy» beskytter Preview-deploymenter, **ikke prosjektets rotadresse**. Gamle hash-adresser kan fortsatt nås etter at grenaliaset flyttes. Begge vertsnavnomfang må derfor beskyttes, uten path-avgrensning, også for NO/EN, JS, JSON, bilder, lyd og video. [Pages Preview-dokumentasjon](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

| Foreslått Access-applikasjon | Omfang |
|---|---|
| `MODUS 2 Preview - root` | `modus-2-preview.pages.dev`, alle paths |
| `MODUS 2 Preview - deployments` | `*.modus-2-preview.pages.dev`, alle paths; hash-URL-er og eventuelle grenalias |

Cloudflares dokumenterte fremgangsmåte er: aktiver Pages sin Preview-policy; åpne den genererte Access-appen og fjern `*` fra hostname for å sikre roten; gi den et eget navn; aktiver deretter Pages Preview-policyen igjen og bekreft at **begge** apper finnes. Dette skal først utføres etter særskilt autorisasjon. Ingen custom domain eller DNS-endring trengs for dette forslaget. [Eksakt Pages-prosedyre](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).

Eksisterende, overlappende hostname-/path-apper må også gjennomgås. Mer spesifikke path-regler kan ha forrang; en offentlig asset-app må ikke omgå hovedvernet. [Policyarv for paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).

## 3. Foreslått policy: bare prosjekteier

Samme begrensning på begge appene:

| Felt | Foreslått verdi, ikke anvendt |
|---|---|
| Handling | `Allow` |
| Include | `Emails` = **kun** `raaensimen@gmail.com` |
| Require | `Cloudflare Account Member` = `d56ac50a4568da9b7995405c62d7479e` |
| Tillatt innloggingsmetode i appen | Kun `Cloudflare` |
| Applikasjonssesjon | 30 minutter |
| Andre besøkende | Avvises som standard |
| Bypass / Service Auth / offentlige asset-unntak | Ingen |

E-postadressen er kandidaten fra eksisterende Cloudflare-innlogging; eier må bekrefte den i neste vedtak. Kontomedlemskap alene tillater flere enn eier og er derfor **ikke** tilstrekkelig. Ingen `Everyone`, `@gmail.com`-regel eller generell innloggingsmetode skal legges til som et ekstra Include-alternativ. [Access-policyer](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).

Gjeldende Cloudflare støtter egen Cloudflare-konto som IdP, inkludert kontomedlemskapsbegrensning. Det gjør gjenbruk av eierens eksisterende konto mulig uten ny Google-/Microsoft-integrasjon eller e-post-PIN. MFA følger kontosikkerheten; eierens faktiske MFA-status er ikke kontrollert her. [Cloudflare som IdP](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/).

Hvis denne IdP-en eller Zero Trust-organisasjonen ikke finnes, må etablering godkjennes separat og vurderes mot eksisterende apper. Ikke endre globale innloggings-/MFA-innstillinger eller innføre OTP som automatisk reserve. Forslaget er også lagret som [logisk konfigurasjonsspesifikasjon](</Users/simenraaen/Documents/ChatGPT/MODUS 2.0/test-results/m3.6/access.proposed.json>), ikke som en kjørbar API-forespørsel.

## 4. Nødvendige handlinger før neste GO

1. **Lesende avklaring:** Eier åpner riktig konto i Zero Trust-dashboardet, eller gir godkjent lesetilgang. Access-appoversikten krever `Access: Apps and Policies Read`; organisasjon/IdP krever også `Access: Organizations, Identity Providers, and Groups Read`. Ikke opprett eller utvid tokenrettigheter gjennom denne arbeidsordren. [Appoversikt](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/list/) · [organisasjonslesing](https://developers.cloudflare.com/api/resources/zero_trust/subresources/organizations/methods/list/).
2. Bekreft eieridentitet, faktisk Zero Trust-plan, eksisterende team/IdP og alle overlappende apper/policyer. Bruk eksisterende organisasjon der mulig. Avklar eventuelle konto-/vilkårs-/betalingssteg før de utføres.
3. Etter **egen konfigurasjonsfullmakt**, etabler de to hostname-omfangene og policyen over. Erstatt eventuell bred standardtillatelse på disse appene; ikke endre produksjonens apper. Kontroller at ingen global IdP-endring påvirker andre tjenester.
4. Verifiser policyenes hostname/path-matching og anonym Access-håndheving på det fortsatt tomme prosjektet. Dersom UI/API krever en første deployment før dette lar seg konfigurere eller kontrollere: **stopp og rapporter begrensningen**. Ikke last opp en offentlig prøve-/plassholderside for å komme videre.
5. Behold automatikk/Git-integrasjon av. Opplasting krever en **egen deploy-GO**, godkjent isolert SHA/manifest og ren kildekopi gjennom eksisterende artefaktport. Access erstatter ikke backend-isolasjon eller publiseringsaudit. Fremtidige faktiske hash-/alias-URL-er kan først sluttestes når en separat autorisert, beskyttet deployment finnes.

**Ingen offentlig tilgang ved senere opplasting kan attesteres under dagens fullmakt.** Før konfigurasjon og verifikasjon foreligger, skal ingen opplasting tillates. Verken `noindex`, 522 eller en vanskelig hash-URL lukker denne porten.

## 5. Verifikasjon fra ikke-autentisert nettleser – plan, ikke utført

Bruk ny privat profil uten Cloudflare-/Access-cookies, bearer-/service-token eller annen betrodd automatisk identitet. Ikke bruk eierens allerede innloggede dashboardfane som anonym test. Åpne DevTools Network med cache av; dokumenter tidspunkt, hostname, app-/policy-ID, status og Access-redirect. Masker cookies, tokens og autentiseringsparametre i logger.

| Test | Forventet resultat etter konfigurering |
|---|---|
| ANON-01: Rot og `/en/`, GET og HEAD | Access-login/avvisning før applikasjonsinnhold; ikke bare origin-feil |
| ANON-02: Alle faktiske deployment-hash-URL-er og alias | Samme sperre, også gamle hash-URL-er; hent faktisk URL-liste fra Pages |
| ANON-03: Direkte JS, CSS, JSON, bilder og media, også Range-GET for video/lyd | Ingen applikasjons-/asset-bytes eller 206-respons uten Access-autorisasjon |
| ANON-04: Følg innloggingsredirect separat | En 200-side på bekreftet Access-login-domene er tillatt; 200 med MODUS-innhold anonymt er feil |
| OWNER-01: Prosjekteier logger inn | Riktig isolert SHA/innhold tilgjengelig, begge språk |
| DENY-01: Annen gyldig Cloudflare-identitet | Ingen tilgang, heller ikke et annet kontomedlem med annen e-post |
| REVOKE-01: Fjern eiertillatelse og tilbakekall app-/brukersesjoner i godkjent øvelse | Gammel sesjon og ny forespørsel avvises på rot, alias, hash og assets |

302/303 til riktig Access-login eller en identifisert Access-avvisning kan være forventet. En generell 403, 404 eller 522 er **ikke alene** bevis. Sammenhold med faktisk policy og Access-logger. Etter testen skal kontrollert eiertillatelse bare gjenopprettes innen øvelsens fullmakt. [Sesjonsstyring og tilbakekalling](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).

## 6. Kostnader og beslutning

Offentlig Access-pris er **Free: 0 USD** for små team under 50 brukere. Én eier passer innen dette oppgitte omfanget. To Access-apper betyr ikke to personer. Publisert Pay-as-you-go-pris er **7 USD per bruker/måned ved årlig betaling**; dette er ikke foreslått bestilt. Faktisk eksisterende konto-/Zero Trust-plan, eventuell seteprising, avgifter og betalingskrav er ikke verifisert. [Gjeldende Access-prisside](https://www.cloudflare.com/sase/products/access/).

**Foreslått kostnadsramme for neste konfigurasjonsvedtak: 0 USD i tillegg, kun Free/allerede dekket tilgang.** Stopp dersom dette krever betalt plan, utvidet avtale, betalingsopplysninger eller nye vilkår som ikke er godkjent. Ingen kostnadskrevende handling, onboarding eller abonnement er utført i M3.6.

Neste vedtak bør bare autorisere avklart Access-konfigurasjon og tilgangstest på tomt prosjekt, med bekreftet eier og kostnadsramme. Det må ikke tolkes som tillatelse til kodeopplasting/deploy.

## 7. Forhold til QA-001

M3.4-resultater beholdes som historisk lokal evidens; ingen kriterier oppgraderes til skyverifisert bestått av denne kartleggingen.

| Kriterium | Status etter M3.6 |
|---|---|
| M33-01 Ingen produksjons-Supabase-trafikk | Lokalt dokumentert i M3.4; må gjentas mot senere beskyttet origin |
| M33-02 Endepunkter/config/workers | Lokal audit beholdes; ingen ny runtime er distribuert |
| M33-03 Ingen proxy-/binding-fallback | Fortsatt ekstern kontroll før/ved beskyttet deployment |
| M33-04 Fail-closed | Lokal bygg-/artefaktport beholdes; Access er ekstra vern |
| M33-05 Private manus ute | M3.4-audit beholdes; nytt opplastingsartefakt må bestå samme port |
| M33-06 Ingen secrets | Ingen nye secrets; eksisterende lokal audit beholdes |
| M33-07 Direkte URL/API-sperrer | Lokal evidens beholdes; ANON-02/03 må gjentas i skyen |
| M33-08 Access konfigurert | **Ikke verifisert/ikke utført her**; Access-lesekall 403 |
| M33-09 Anonym tilgang avvist | **Ikke bestått med bevis ennå**; dagens 522 er ikke Access-test |
| M33-10 Eiertilgang og tilbakekalling | Avventer OWNER-01, DENY-01 og REVOKE-01 |
| M33-11 NO/EN | Lokal kontroll beholdes; begge språk med i tilgangstesten |
| M33-12 Manuell mobilkontroll | Åpen menneskelig QA fra M3.4; ikke lukket her |
| M33-13 Manuell tastaturkontroll | Åpen menneskelig QA fra M3.4; inkluder fremtidig Access-innlogging |
| M33-14 Fag-/spillfunksjoner | Lokal regresjon beholdes; Access skal også beskytte statiske verktøyressurser |
| M33-15 SHA og sporbarhet | Kilde-SHA uendret; nye GET-/anonym-prober dokumentert lokalt |
| M33-16 Tilbakeføring | M3.4-prosedyre beholdes; faktisk stenging/sesjonsrevokering gjenstår |
| M33-17 Eier-GO før deploy | **Ikke gitt**; M3.5 tillot kun tom prosjektopprettelse |
