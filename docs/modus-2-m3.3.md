# MODUS 2.0 · M3.3 · backend-isolert Preview

Denne rapporten erstatter backend-blokkeringen i M3.2. Kun lokal kode, bygg, tester og commit er autorisert. Ingen Cloudflare-/GitHub-endringer er utført. Kildecommit identifiseres av Git-loggen for denne rapporten; hvert nytt isolert bygg skriver eksakt HEAD og filhashene til `dist/preview-isolation.json`.

## Eksplisitt byggemodus

```sh
MODUS_ISOLATED_PREVIEW=1 MODUS_PREVIEW_PROJECT=modus-2-preview \
MODUS_CATALOG_PREVIEW=1 CF_PAGES_BRANCH=dev/modus-2-pr52 npm run build
```

Alle fire verdier kreves. Feil verdi, manglende nødvendig verdi, produksjonskontekst eller release-flagg stopper bygget. Prosjektmarkøren `modus-2-preview` med manglende isolasjonsflagg stopper også. Et ordinært bygg uten begge nye Preview-variabler beholder tidligere oppførsel; katalogflagget alene isolerer ikke backend. Opplastingsporten krever derfor isolasjonsmanifest, riktig SHA, ren kilde, eksakte CSP-regler og samsvar mellom alle filhashene. Et ordinært eller delvis bygget resultat avvises.

Pages-forslaget i `preview/modus-2-preview.project.proposed.json` har de tre MODUS-variablene, build `npm run build`, output `dist`, Node 22 som eksisterende CI, ingen secrets/bindings og all automatisk deploy avslått. I Git-integrerte bygg leverer Cloudflare gren/SHA; ikke overstyr disse i dashboardet. Lokal testing bruker Node 26.13.0/Python 3.9.6. CI-versjonen er ikke kjørt lokalt.

## Kartlagt grense

| Område | Eksisterende avhengighet | Isolert artefakt |
|---|---|---|
| Konto | `client/account.js`, Supabase SDK/config, auth, tokenfornyelse, fremdriftssynkronisering | Eget inngangspunkt `preview-account.js`, kun lokal gjesteprogresjon. Ingen SDK, config, innloggingsskjema eller auth-sesjonslesing. Blokkert nettleserlagring gir minnebasert fremdrift. |
| Kontakt | `feedback.js`, REST-innsetting i `modus_feedback` | Hele nettverkshåndtereren utelates ved kopiering. Felter deaktivert, status og forklaring på NB/EN; hjelpepanelet beholdes. Transformasjonen stopper hvis forventet kildeanker endres. |
| Redaktør | `client/editor.js`, egen auth, feedback-lesing/-oppdatering, `cms_save_draft`, `cms_publish_article` | Statisk utilgjengelig-side på NB/EN. Ingen editor-bundle, skjema, adminlister eller private data. |
| CMS-server | `cms/middleware.mjs`, ekstern CMS-lesing, worker | Fortsatt parkert; ingen worker, functions, routes eller CMS-runtime. Separat CMS-runtime-bygg nektes i isolert modus. |
| Medlemskap/betaling | Konfigurasjon for checkout/portal | Eksisterende salg/livssyklus må være av; alle Stripe-testkasse-/portal-lenker erstattes med deaktivert tekst og NB/EN-forklaring. Ingen nye betalingstjenester eller nøkler. |
| Offentlige verktøy | Lokale JSON-indekser, lydfiler, Web Audio, lokal fremdrift/tema/språk/Atlas | Beholdt. Kun GET/HEAD mot egen statiske origin tillates; API-/auth-/CMS-stier og alle skrivekall nektes. Native `method=dialog`-skjema tillates fordi de bare lukker lokale dialoger. |
| Skrifter | Google Fonts CSS/fontfiler | Eneste tillatte eksterne ressursopprinnelser: `fonts.googleapis.com` og `fonts.gstatic.com`, bare for stil/skrift. Referrer utelates. IP/adresse for skriftforespørsler er en gjenværende tredjepartsavhengighet. |
| Eksterne lenker | Bl.a. eksplisitte fag-/ressurslenker | Vanlig brukerinitiert navigasjon er ikke en backend-operasjon og beholdes. |

Kontrollen omfatter kilde, alle endelige UTF-8-byggefiler og faktisk nettlesertrafikk. Gamle kilde-/bundlefiler utenfor bygg-whitelisten leveres ikke. Supabase-prosjektet kontaktes ikke for å teste RLS, autentisering eller datatilgang.

## Teknisk håndheving og personvern

Første script på alle HTML-sider håndhever lokale lesekall og sperrer fetch-skriving, XHR til backend, WebSocket, EventSource, Beacon og nettverksskjemaer. Auth-callbackparametre fjernes uten å konsumeres. Ingen eksisterende auth-token overføres til et isolert kontoobjekt.

Uavhengig CSP i HTTP-header og tidlig HTML-meta sperrer eksterne datakall, skjemainnsending, workers, objekter og vilkårlige eksterne scripts/bilder/media. HTTP-header sperrer også innramming. `noindex` er ikke tilgangsbeskyttelse. CSP tillater eksisterende inline-script/-stil for å bevare kodebasen og er ikke en generell XSS-attest. Ingen produksjonshemmeligheter, backend-SDK eller backend-endepunkter skal være med i denne statiske artefakten.

Privat publiseringspolicy og godkjenningsregistre er urørt. Isolert modus krever tom CMS-seed. Katalogen viser kun de tidligere godkjente passive kortene og illustrasjonene; flagget åpner ingen private artikkelfulltekster eller undervisningsmanus. Ordinære publiseringsregler brukes før Preview-finaliseringen.

## Verifikasjon

Kommandoene kjøres med samme fire miljøverdier som bygget, slik at eksisterende katalogtester ser korrekt publiseringskontekst:

```sh
npm test
npm run test:browser
npm run test:homepage
npm run test:preview-isolation
python3 tests/publication-audit.py
```

Nettleserregresjonen besøker alle offentlige HTML-sider i Chromium og WebKit, begge språk. Syntetiske utløpte auth-/refresh-token og lagringshendelser skal ikke aktivere nettverk. Direkte API-forsøk, redirect, XHR, socket, eventstrøm, beacon og skjemakall skal avvises. CSP prøves også uten JavaScript-vernet, separat for HTTP-header og HTML-meta. Ekstern trafikk avbrytes før transport under testen; ingen ekte data/nøkler brukes. Google Fonts fanges lokalt. Resultatet beskriver nettleserens faktiske forespørselsforsøk, ikke bare synlige knapper.

| Kontroll | Resultat |
|---|---|
| Isolert og ordinært bygg | Bestått |
| `npm test`, isolert / ordinært | 31/31 i begge modi |
| Eksisterende nettlesersuite (release, plattform, læringsreise, publisering, piano, lyd) | 92/92 registrerte scenarier i begge modi, Chromium/WebKit og NB/EN |
| Forside | 28/28 i begge modi, 160–1536 px, inkludert 320, 375, 768, 1024 og 1440; tema, tastatur, ruter og redusert animasjon |
| Forsidens automatiserte tilgjengelighetskontroll | 24/24 kombinasjoner i begge modi, ingen rapporterte brudd |
| Navigasjon, isolert | 20/20 eksisterende kontroller |
| Backend-isolasjon | 142/142 side-/API-/CSP-kontroller; 66 offentlige HTML-sider per nettleser, begge språk; 0 backend-forsøk og 0 lokale skriveforespørsler |
| Uavhengig CSP | HTTP og meta hver for seg uten JS-vern, begge nettlesere; eksternt kall avvist før transport |
| Tilgjengelige sperremeldinger | Axe WCAG A/AA på kontomeldinger, fokus til kontaktstatus og Escape kontrollert på begge språk/nettlesere |
| Byggkonfigurasjon | 7/7 reelle negative bygg avvist, inkludert forbudt CMS-runtime; øvrige manglende konfigurasjonsfelt dekkes av enhetstest |
| Artefaktportens negative kontroller | 12/12 avvist: filhash, CSP, backend, secret, editor, privat sti, seed, guard, HTML, betaling, manifest og proveniens |
| Publiseringsaudit | 339 filer; alle 95 private kildefragmenter fraværende; tom CMS-seed; 0 offentlige private fulltekster |
| Ordinær produksjon mot baseline | 304/304 filer byte-identiske med M3.1 |
| Ordinært katalog-Preview mot baseline | 336/336 filer byte-identiske med M3.1 |

Korrigering underveis: nettverksskjema-sperren må tillate native dialogbekreftelser (`method=dialog`), som ikke sender data. Eksisterende dialog-, Atlas-reset- og læringsreisetester består etter rettingen. WebKit rapporterer en forventet sidefeil ved den bevisst blokkerte redirect-testen; kun denne eksakte feilen aksepteres, andre sidefeil feiler regresjonen. CSP kontrolleres i separate, ferske nettleserkontekster.

Ingen gjenværende funksjonsfeil ble funnet i de kjørte testene. Automatiserte tester gir ikke en manuell skjermleserattest eller bevis for skykontoens tilgangsregler. Lokale rårapporter under `test-results/m3.3/` og øvrige `test-results/` er ikke commit-innhold. `preview-isolation-browser-results.json` viser 252 unike lokale leseforespørsler og bare Google Fonts som observert ekstern ressursopprinnelse; skriftforespørslene besvares lokalt under sikkerhetstesten.

## Filer i kildeendringen

- `client/preview-account.js`, `client/preview-guard.js`
- `scripts/build-client.py`, `scripts/finalize-preview.py`, `scripts/preview_mode.py`, `scripts/sync-design-system.py`, `scripts/run-tests.cjs`, `package.json`
- `tests/preview-isolation.py`, `tests/preview-isolation-browser.cjs`, `tests/feedback.cjs`, `tests/publication.py`
- `preview/artifact_boundary.py`, `preview/check-preview-artifact.py`, `preview/prepare-reviewed-upload.sh`, `preview/modus-2-preview.project.proposed.json`, `preview/wrangler.preview.toml.example`, `preview/_headers.proposed`
- `docs/modus-2-m3.2.md` (historisk rapport fra forrige oppdrag, nå merket som historisk), `docs/modus-2-m3.3.md`

M3.2-forberedelsene var lokale og usporede ved oppstart; de sikres her sammen med den videreførte porten. Ingen generert `dist/`, avhengigheter, rå testresultater, designreferanser eller private undervisningskilder inngår. De historisk sporede genererte `dist/`-filene kan fortsatt gi lokal Git-diff etter bygg; kildekontrollen og commit-listen skiller disse fra endrede kilder.

## Godkjenningsport videreført fra M3.2

Etter godkjent lokal commit, klargjør kun en lokal opplastingsmappe:

```sh
APPROVED_SHA=$(git rev-parse HEAD) bash preview/prepare-reviewed-upload.sh
```

Scriptet bygger på nytt, kjører publiseringsaudit og SHA-/artefaktport og kopierer bare kontrollert `dist` og separat Wrangler-konfigurasjon til en ny midlertidig mappe. Det utfører ingen deploy. Rotens `wrangler.toml` og eksisterende produksjonsinnstillinger er urørt. Ikke last opp repository-roten eller gjenbruk produksjonens prosjekt/config/secrets.

Før senere separat tillatelse til opprettelse/deploy må eier godkjenne eksakt SHA og manifest, bekrefte nytt prosjektnavn, ingen bindings/secrets, avslåtte automatiske bygg og Cloudflare Access for eier/QA. Verifiser beskyttelse på hash-URL, grenalias og prosjektets rotadresse; Access for Preview beskytter ikke nødvendigvis rotadressen. Fjernkontoinnstillinger er ikke inspisert lokalt. Først etter dette kan det isolerte, kontrollerte opplastingsområdet brukes med eksplisitt prosjekt og Preview-gren. Ingen av disse skystegene er utført her.
