# RED-005A v1.1 – Samordnet sikkerhets- og implementeringskontrakt

Til 00 – Prosjektledelse. Fagansvar: 04 – Nettredaktør. Kontroll: 03 – Faglig revisjon og 05 – Kvalitetssikring.

**Versjon:** 1.1. **Revidert:** 03.11.2026. **Status:** bindende kontraktskrav innarbeidet; ikke implementert eller teknisk sikkerhetsgodkjent. RED-005B er ikke autorisert. **Kontrollert baseline/HEAD:** `e54572dda08b425301f6943fae54af56f38316eb`, gren `dev/modus-2-pr52`. RED-004 er forutsatt godkjent som lokal leveranse; dette gir ingen individuell artikkelgodkjenning.

Lokale kilder, eksisterende SQL-filer, de samordnede rapportene fra 00/03/04/05 og relevant offisiell dokumentasjon er lest. Ingen database er kontaktet. Ingen SQL-migrering, RLS-/Auth-endring, backendbinding, eiergodkjenning eller produksjonshandling er utført. I v1.1 er bare kontrakten og dokumentasjonsbevis revidert/opprettet; tidligere syntetiske kontrollbevis, eksisterende appkode, registre, dist og tidligere leveranser er beholdt. Ingen ny commit er opprettet i denne dokumentasjonsoppgaven.

## 0. Revisjonskontroll og faktisk status

Kontrollen viste at filen før denne revisjonen fortsatt var det opprinnelige **uversjonerte v1.0-grunnlaget**: ingen v1.1-markør, ingen RED005A-03-K01–K04 og ingen samlet sporbar matrise etter kontrollrunden. RED004-F01–F04 var allerede eksplisitt dekket. De fleste tekniske sikkerhetstemaene var beskrevet, men ikke samlet og gjort etterprøvbare mot 05s syv nummererte bindende vilkår. Det var derfor ikke riktig å omtale filen som ferdig revidert v1.1.

Denne versjonen innarbeider den allerede bestilte revisjonen. **Innarbeidet i kontrakt betyr ikke implementert, testet mot backend, faglig sannhetsbekreftet eller lukket som sikkerhetsfunn.** Baseline og kildekode er fortsatt uendret. Før-revisjonen, lesbar endringsdiff og SHA-256-bevis bevares separat; historiske v1.0-testlogger omskrives ikke.

| Kontrollgrunnlag | Identifiserbar kilde / verifikasjonsgrense |
| --- | --- |
| 00 – samlet v1.1-ordre | Tråd `6ae84f95-bd48-83ed-bfb2-eb7d07750a76`, turn `481a459d-5a7d-469f-8081-8436adcd140d`; siste presisering `b50658d5-c742-426a-bc2d-ec60b7f54c3a`. Bare kontraktsrevisjon, ikke RED-005B. |
| 03 – kontraktskontroll | Tråd `6ae8dee2-4d38-83eb-9448-af6b8a3cf8aa`, turn `8901cb74-e648-4d77-9b36-4a8831854480`: F01–F04 videreføres, K01–K04 tilføyes. BETINGET GO til kontrakt, ingen artikkel-/lisensgodkjenning. |
| 04 – produktfaglig vurdering | Tråd `6ae8df7e-ef48-83ed-8b96-c9002f6854f3`, turn `44795020-4fd1-4c30-87aa-c8efa76b936e`: syv forutsetninger og forståelig normalflyt uten JSON. Vurderingen var basert på historikk/rapportert grunnlag, ikke direkte gjennomgang av originalfilen. |
| 05 – sikkerhetsvurdering | Tråd `6ae8e047-9e54-83eb-8f9b-c17de7d564cd`, turn `a5839862-d60f-4995-9034-f0aa6e17076a`: syv bindende vilkår i avsluttende nummererte liste, og ytterligere faseporter i rapportens §6. BETINGET GO på kontraktsnivå; ingen reelle DB/Auth/MFA-kontroller utført. |

Kravene er gjengitt som kravdata fra kontrollrapportene, ikke som ny autorisasjon til drift. Endringslogg finnes i §15, samlet kravmatrise i §16 og isolert implementeringsplan i §12.

## 1. Beslutning som anbefales til 00

00 skal først beslutte om v1.1 oppfyller den samlede kontraktsbestillingen. Ikke gjenta en identisk kontrollrunde av v1.0. Bestill eventuelt deretter en **avgrenset, isolert implementering av serververifisert eierbeslutning**, med alle publiseringsveier fortsatt stengt. Ikke åpne `cms_publish_article`, CMS-Worker eller produksjonsmiljø som del av den bestillingen.

Minste sikre endring er en smal skrivegrense rundt eksisterende utkast/historikk, serverberegnet innholdshash, privat eierbinding, engangsutfordring og append-only beslutningslogg. Ingen ny CMS-arkitektur, automatisk Git-skriving eller ny backendplattform trengs. Nåværende brede tabellrettigheter må lukkes samtidig med at en kontrollert lagringsvei etableres; en godkjenningsknapp alene er ikke en sikker endring.

Kontrakten skiller tre uavhengige forhold:

1. **Kontrollgrunnlag:** fag-, kilde- og rettighetsgjennomgang av en bestemt innholdsversjon, med RED004-F01–F04 lukket.
2. **Personlig eiergodkjenning:** eieren bekrefter én eksakt serverlagret versjon gjennom verifisert identitet og en ny, eksplisitt handling.
3. **Publisering:** eksisterende Git-policy og kontrollert kilde-/byggversjon må fortsatt tillate publisering. Eiergodkjenning er nødvendig i den fremtidige eierflyten, men er ikke alene en publiseringsordre.

## 2. Eksisterende modell og påviste svakheter

Funnene under gjelder **kildekode ved baseline**, ikke en attestasjon av installert produksjonsskjema eller aktive brukere.

| Kontrollert kilde | Eksisterende oppførsel / sikkerhetskonsekvens |
| --- | --- |
| `supabase/schema/article-editor.sql:4–11` | `cms_editors` har `user_id` og `enabled`. Administrator må aktivere brukeren; registrering gir ikke redaktørrolle. Ingen egen eier-/godkjennerrolle finnes. |
| Samme fil, tabeller og GRANT/policyer rundt linje 13–60 | Alle aktiverte redaktører kan lese/endre alle utkast. `authenticated` har direkte INSERT/UPDATE på utkast og publikasjoner og INSERT på historikk; RLS kontrollerer aktivert redaktør. Dette kan omgå RPC-ens revisjonskontroll, historikkføring og enhver fremtidig klientbasert eiergate. |
| `cms_article_publications` | Anonym SELECT er tillatt på alle publikasjonsrader. En ulovlig innlagt rad kan derfor være offentlig uten Git-registerets kontroll dersom runtime aktiveres. |
| `cms_save_draft` | `SECURITY INVOKER`, tom `search_path`, identitetskontroll og optimistisk revisjon. RPC-lagring skriver utkast/historikk atomisk. Direkte tabellskriving kan likevel velge payload/revisjon og omgå dette løpet. `updated_by` ved slik skriving er ikke bundet til faktisk aktør. |
| `cms_publish_article` | Kontrollerer redaktør, forventet revisjon, seksjoner og quiz; kopierer deretter til offentlig snapshot. Ingen personlig eier, innholdshash, kontrollpakke eller Git-tillatelse valideres. |
| Historikktabellen | Payload/revisjon/tid og unik identitet finnes. Egen `saved_by`, serverhash og eierhendelse mangler. Redaktør kan sette inn konstruert historikk. |
| `client/editor.js` | Bruker eksisterende Auth/SDK og RPC-er. `publishingEnabled:false` deaktiverer UI, men er ikke en serverregel. `confirmPublish` kaller først `save()`, som normalt øker revisjonen; dette må ikke videreføres som skjult revisjonsskifte etter en eiergodkjenning. |
| `cms/middleware.mjs`, `cms/worker.mjs` | Parkert runtime leser `cms_article_publications`, ikke privat utkasttabell. Den sjekker ikke Git-policyens kildehash eller personlig eierbeslutning. Må forbli deaktivert. |
| `cms/review-model.mjs`, `client/editor-review.js` | RED-004 gir lokale notater, referanser og `modus-editor-content-v1`. `authoritative:false`; `checked` er egenregistrert aktivitet. Privat filinnlesing er ikke autentisert dokumentasjon. Disse dataene kan aldri alene bli en eier-/faglig attestasjon. |
| `scripts/publication.py` | Krever blant annet `approved`, `public`, godkjent locale, referanser og eksakt `publication_evidence[locale].reviewed_version_sha256`. EN krever dessuten godkjent NB. Denne eksisterende regelen bevares. |
| `scripts/build-editor.py`, `scripts/build-client.py`, `scripts/finalize-preview.py` | Offentlig seed filtreres gjennom Git-gaten. Privat Worker er parkert. Isolert Preview krever tom seed og utelater editor/SDK/runtime. Ingen eier- eller kontrollnotater skal legges til her. |

**Viktig konsekvens:** Man kan ikke bare tilbakekalle direkte tabellskriving og beholde nåværende `SECURITY INVOKER`-funksjoner uendret; de trenger innringerens skriverettigheter. Lagringsgrensen må redesignes snevert og testes samlet. Ingen slik endring er gjort nå.

## 3. Normativ godkjenningsidentitet og innholdskontrakt

En eierbeslutning må binde følgende serverbestemte mål:

```text
repository_scope
slug, locale                     // locale eksplisitt nb eller en
revision                         // serverens eksakte lagrede revisjon
hash_algorithm, content_sha256
content_schema_version, render_contract_version
media_manifest_sha256
review_bundle_id, review_bundle_sha256
owner_binding_version            // eierbindingens epoke
```

Beslutningen får servergenerert `approval_id`, aktør-UUID, serverklokkeslett, handling, idempotens-ID og privat spor til autentisert sesjon/engangsutfordring. Klienten kan ikke velge godkjenner, tidspunkt, rolle, aktiv-status eller serverhash. Ingen reelle identiteter eller tokens skal stå i dokumenter eller offentlige artefakter.

### 3.1 Serverberegnet hash – eget, navngitt domene

Anbefalt første serverformat: **`modus-owner-snapshot-v1`**. Det er bevisst et eget domene, ikke en påstått direkte likhet med RED-004s lokale hash eller `article_text_version()`.

- Innholdet hentes fra den låste serverrevisjonen. Serveren validerer eksisterende artikkelfelter og læringsmetadata, kjent schema, identitet, typer, grenser og eksplisitt tillatte URL-/ressursreferanser. Ukjente innholdsfelter avvises; de kan ikke smugle inn godkjenningsmetadata.
- Materialet inneholder `algorithm`, `content_schema_version`, `render_contract_version`, de tillatte **lagrede innholdsfeltene** og manifestet for uforanderlige medieressurser. Slug og locale inngår i innholdet. Tekst, HTML-strenger, quiz, læringsmetadata, øvelser, bildereferanse og alt-tekst omfattes.
- Tidsstempel, UI-paneltilstand, lokal gjenoppretting, lagringssted og klientstatus inngår ikke. Kontrollpakken har egen digest som også må samsvare i beslutningsmålet. Endringer i meningsfulle kontrollbevis kan dermed ugyldiggjøre godkjenning uten å late som artikkelteksten er endret.
- Kanonisk serialisering: rekursivt sorterte ASCII-skjemanøkler, beholdt arrayrekkefølge, JSON-strenger med en fastlagt JSON-escaping, UTF-8 og bare tillatte heltall i tallfelter. Ingen Unicode-, case- eller whitespace-normalisering på serveren. Ugyldig Unicode, U+0000, flyttall, NaN og ukjente former avvises. Dokumenterte gyldige Unicode-strenger skal gi like bytes i alle implementasjoner.
- SHA-256 beregnes av serveren over disse bytes. Databaseleverandørens tilfeldige visningsformat eller `jsonb::text` skal ikke uten test antas lik JavaScript-kanonisering. SQL-/serverimplementasjonen må bestå felles golden vectors.

Hashen binder eksakte validerte, lagrede strenger. Den hevder ikke at rå HTML og sanitert forhåndsvisning er samme bytes. Eierbildet skal vise den uforanderlige serverversjonen med eksisterende trygge renderer, identitet, revisjon, hash og kontrollgrunnlag; den kan også vise kilde-/payloadvisning. Endret renderer-/saniteringskontrakt skal kreve ny verifisering. Rene farge-/layoutendringer er ikke en ny innholdsversjon.

RED-004s lokale fingeravtrykk beholdes som lokal sporbarhet. Serveren må ikke godta klienthashen, en lokal «checked»-verdi eller en importert fil som sannhetskilde. En senere adapter mellom lokale, server- og Git-hasher må ha eksplisitt versjon og likhetstester; ukjent adapter/hashalgoritme gir avslag.

### 3.2 Illustrasjoner og øvrige medier

Manifestet skal binde faktisk verifiserte bytes, ressurs-ID, media-type og uforanderlig ressursversjon. En brukeroppgitt SHA-streng er ikke verifisering. Eksisterende Preview-bilderegister beviser bare sitt eget avgrensede omfang.

Minstekrav for eierflyten: medier må være frosset til en kontrollert, innholdsadressert versjon, med faktiske bytehasher kontrollert av en betrodd ressurskontroll og rettighetsbevis fra F01. En muterbar URL uten slik binding er ikke godkjennbar. Nytt bilde på samme URL skal enten avvises som brudd på uforanderlighet eller opprette en ny ressursversjon og ugyldiggjøre gammel kontroll. Markert ressurskorrupthet/tilbakekalte rettigheter gjør aktiv godkjenning ubrukbar for ny utgivelse.

Ingen vilkårlige URL-er skal hentes av privilegert serverkode; det ville åpne SSRF-/credential-risiko. Nåværende modell har én bildereferanse. Lyd/video eller andre medietyper krever eksplisitt schema-/manifestutvidelse og tester, ikke en usynlig unntaksvei. Manglende eller utilgjengelig ressursbevis gir avslag.

## 4. Serverautentisering og personlig handling

1. **Bekreftet UUID:** Prosjekteier må senere bekrefte sin faktiske Supabase-brukeridentitet gjennom en separat, dokumentert prosess. Git-navn, e-postadresse, Cloudflare-identitet, kontoens visningsnavn eller redaktørstatus identifiserer ikke automatisk godkjenneren. Ingen UUID er valgt i RED-005A.
2. **Privat eierbinding:** Administrator etablerer én aktiv eierbinding for repository-scope, med versjon/epoke. Vanlige klienter kan ikke lese hele personregisteret, opprette eiere, endre `enabled` eller tildele roller. Endring/deaktivering øker epoken og kan ikke gjenaktivere gamle beslutninger automatisk.
3. **Verifisert sesjon:** API-/Auth-laget verifiserer signatur, issuer, prosjekt/audience, utløp og rolle. Den autoritative UUID-en kommer fra den verifiserte forespørselen (`auth.uid()` i den eksisterende arkitekturen), aldri fra et RPC-felt. Anonyme Auth-brukere, maskin-/service-roller og feil prosjekt avvises.
4. **Levende autorisasjon:** Aktiv eierbinding og relevant sesjonsgyldighet sjekkes på serveren ved hver sensitiv handling. JWT-claims om rolle alene er ikke tilstrekkelig fordi de kan være gamle. `user_metadata` er aldri autorisasjonsgrunnlag. En signert, ennå ikke utløpt JWT fra en avsluttet sesjon skal ikke kunne opprette en ny beslutning.
5. **Ny personlig bekreftelse:** Bekreftelse krever MFA/AAL2 og en fersk, leverandørverifisert step-up-handling knyttet til den aktuelle utfordringen. JWT `iat`, token-refresh, en checkbox eller en klientpåstand om MFA teller ikke som ny personlig autentisering. Foreslått maksimal alder: 5 minutter, målt mot serverklokke.
6. **Fail-closed ved manglende støtte:** Implementeringen må demonstrere hvordan verifisert step-up-tid og sesjonsstatus hentes fra den faktiske isolerte Auth-versjonen. Hvis det ikke kan dokumenteres, skal eierbekreftelse forbli deaktivert. Ikke anta et bestemt udokumentert claim eller at en eksisterende sesjonsrad alene dekker alle timeoutregler.

Anbefalt totrinnsflyt:

- **Forbered:** Eieren ber om et frosset mål for `(slug,locale,revision)`. Serveren verifiserer tilgang, beregner hash og kontrollpakke, og oppretter en kortlivet CSPRNG-utfordring (minst 128 bit), bundet til UUID, sesjon, eier-epoke og hele måltuplen. Serveren lagrer nonce-hash; rå nonce logges ikke. Dette gir ingen godkjenning.
- **Bekreft:** Etter visning og ny personlig step-up sender klienten bare utfordrings-ID/nonce og idempotens-ID. Serveren verifiserer alt på nytt og forbruker utfordringen atomisk med beslutningshendelsen. Dersom innhold, kontrollgrunnlag, ressursversjon, eierbinding eller sesjon er endret, avvises forespørselen. Ved eventuelt rotert sesjons-ID kreves en ny utfordring, ikke stille rebinding.

Ingen AI, redaktør, CI-jobb eller servicekonto får eierens legitimasjon eller mulighet til å godkjenne på vegne av eieren. Et API kan likevel ikke bevise «menneske» hvis en angriper kontrollerer eierens enhet og ferske sesjon. Betrodd enhet, eksplisitt handling og MFA er forutsetninger, ikke en garanti mot en kompromittert eierklient.

### 4.1 Konkret mekanismedesign for fersk step-up – vilkår 05-S02

**Valgt kontraktsmønster:** En fremtidig, beskyttet servergate observerer selv en ny verifikasjon hos eksisterende Auth-leverandør og oppretter en privat, engangs **step-up-kvittering**. Dette er et implementeringsdesign som skal bevises i godkjent isolert miljø, ikke en mekanisme som finnes i dagens kode. Ingen rute, rolle, credential eller binding opprettes i v1.1.

1. Etter `prepare` fryser serveren artikkel-/språkmål, revisjon, alle hasher, eier-epoke, bruker og sesjon. Den utsteder kun en utfordring, ingen beslutning.
2. Den beskyttede gaten oppretter en ny MFA-utfordring hos Auth for en faktor som serveren har kontrollert tilhører riktig eier. Leverandørens challenge-ID kobles privat til MODUS-utfordringen. Opprettelsen må skje etter at målet er frosset.
3. Eieren svarer gjennom den beskyttede flyten. Serveren sender svaret til leverandørens dokumenterte verifikasjonsoperasjon; den godtar ikke et klientopplastet «MFA OK»-bevis eller en gammel AAL2-JWT som erstatning. Engangskoder, passord, rå token og nonce skal aldri lagres eller logges.
4. Før kvittering utstedes, må gaten verifisere autentisk leverandørsvar, signatur/issuer/prosjekt, eier-UUID, AAL2 og riktig sesjon. Den registrerer selv verifiseringstidspunktet og referanser til faktoren og begge utfordringene. Klienten kan ikke velge eller tilbakeføre tidspunktet. Roterer leverandøren sesjonen, må det dokumenteres en ny trygg `prepare`-flyt; ingen stille rebinding.
5. Kvitteringen bindes til **hele** det frosne målet, eierbindingens epoke og sesjonen, utløper senest etter fem minutter og kan brukes én gang. Den kan bare opprettes av den særskilt avgrensede serververifikatoren. En slik teknisk rolle får ikke personlig godkjenningsmyndighet eller generelle tabellrettigheter.
6. Selve beslutnings-RPC-en krever både eierens gyldige forespørsel og den ferske private kvitteringen. Den kontrollerer aktiv eierbinding og aktuell sesjonsgyldighet på nytt, sammen med gjeldende mål/kontrollpakke, før atomisk forbruk og hendelsesføring.
7. Nettverksfeil etter MFA-verifikasjon, men før privat kvittering er lagret, gir ingen godkjenning. En pending/verifisert kvittering kan ikke presenteres som `OWNER_APPROVED`. Gamle, dobbeltbrukte eller ufullstendige kvitteringer avvises; idempotens må kontrolleres ved begge trinn.

API-navn og lagringsfelt må fastsettes i det senere isolerte detaljdesignet. Leverandørens [challenge](https://supabase.com/docs/reference/javascript/auth-mfa-challenge) og [verify](https://supabase.com/docs/reference/javascript/auth-mfa-verify) er verifikasjonsbyggesteiner, ikke ferdig transaksjonsbinding. **Dette mønsteret forutsetter en særskilt godkjent serververifikator og avgrenset rett til å registrere kvitteringer.** Hvis arkitekturen ikke kan levere dette uten en uakseptabel privilegert skrivevei, stopper G4; klientbasert step-up, token-iat eller økt tokenlevetid er ingen reservevei.

Aktiv sesjonskontroll skal dokumentere den faktisk brukte kilden, kontrollpunktet, utlogging/tilbakekalling og eventuelle timeoutregler. En eksisterende `auth.sessions`-rad alene er ikke bevis for alle gyldighetsregler. Samtidig utlogging skal ha dokumentert rekkefølge: avsluttet før handlingsautorisasjon gir avslag; en gyldig committet beslutning slettes ikke av senere utlogging. Denne ordningen og feiltilfellene skal bevises gjennom reell isolert Auth/API, ikke boolske testflagg.

## 5. Minste sikre serverendring – foreslått, ikke utført

Eksisterende utkast/historikk beholdes. Følgende er logiske ansvarsområder og foreslåtte navn, ikke SQL som skal kjøres nå:

| Område | Minste nødvendige endring |
| --- | --- |
| Utkast/historikk | Serverstyrt revisjon, aktør og innholdshash. Uforanderlig innholdssnapshot i eksisterende historikk. Ingen klientvalgt `updated_by`, hash eller historikkrevisjon. Gamle rader blir ikke ettergodkjent eller tilskrevet en oppdiktet aktør. |
| Privat eierbinding | Eksempel `cms_owner_authorizers`: bekreftet UUID, scope, enabled og epoke. Bare kontrollert administratorprosess kan endre den. |
| Privat kontrollpakke | Eksempel `cms_verified_review_bundles`: uforanderlig, versjonsbundet fag-/kilde-/rettighetsgrunnlag med aktør/attestasjon og media-/evidence-digest. Eksisterende registre beholdes som kilder. RED-004-notater er input til gjennomgang, ikke en ferdig attestasjon. |
| Engangsutfordring | Eksempel `cms_approval_challenges`: mål, UUID/sesjonsbinding, nonce-hash, utløp og forbruksstatus. Ingen anonym tilgang. |
| Beslutningslogg | Eksempel `cms_owner_approval_events`: godkjenning, tilbakekalling og invalidering med mål, faktisk aktør, serverklokke og referanser. En avledet status viser gjeldende gyldighet. Ingen redigerbar «approved»-kolonne i klientpayload som autoritet. |

### 5.1 Lukk alle skriveveier

- Trekk tilbake direkte DML fra `anon`, `authenticated`, `PUBLIC` og andre app-/service-roller som ikke skal skrive. Kontroller også arvede rettigheter, default privileges, sekvenser, views, alle funksjonsoverlastinger, GraphQL/Data API, Storage-/Edge-/Worker-jobber og eventuelle SQL-loginroller. «BYPASSRLS» er ikke en tillatelse som skal brukes av denne funksjonen.
- Kontrollerte RPC-er er eneste app-skrivevei. Eier-RPC-er tar ikke aktør-, rolle-, klokke- eller statusfelter fra klienten. Alle innvendige skrivefunksjoner må selv kontrollere identitet, rolle, scope og versjon; en alternativ innvendig funksjon skal ikke kunne omgå en trygg ytre wrapper.
- Anbefalt avgrensning: eksponert `SECURITY INVOKER`-fasade og gjennomgåtte private skrivefunksjoner som kjører med en dedikert `NOLOGIN`, `NOBYPASSRLS`-utførerrolle som ikke eier tabellene og ikke kan overtas av klientrollene. Den private rollen får bare nødvendige objektprivilegier. Private skjemaer eksponeres ikke via Data API. Eventuell nødvendig schema-USAGE/EXECUTE må kartlegges eksplisitt; det er ikke rett til tabell-DML.
- Dette er en bevisst kapabilitetsgrense som krever egen SQL-/sikkerhetsreview, **ikke** et forslag om bare å bytte de to eksisterende funksjonene til en privilegert definer. Ingen funksjon skal eies/kjøres som `postgres`, superuser eller `service_role`. Ingen dynamisk SQL fra brukerinput.
- RLS beholdes også for utførerrollene, med nødvendige policyer og vurdering av FORCE RLS. Tom `search_path`, fullt kvalifiserte objektnavn og eksplisitt tilbakekalt EXECUTE fra PUBLIC/anon på alle beskyttede funksjoner er krav. Nye funksjoner og overlastinger må ikke få en utilsiktet standard-EXECUTE-vei.
- Integritetskontroller/guard-triggere skal sikre serverhash, identitet, serveraktør, immutable snapshots og lovlige hendelser på alle tillatte skriveveier. Det skal ikke være mulig å merke en godkjenning som «APPROVED» via en generisk logg-/import-RPC. Ikke baser slike sperrer på klientstyrbare GUC-er, skjulte knapper eller et «called_from_rpc»-flagg.
- Aktiverte redaktører kan fortsatt lagre gyldige utkast gjennom kontrollert lagrings-RPC. Dette skal ikke gjøre dem til eiere eller fag-/rettighetsattestører. Tillatelsene må bevises samlet; tilbakekallinger som ødelegger `cms_save_draft` er ikke en godkjent løsning.

### 5.2 Publisering forblir stengt

Første isolerte implementering skal på serveren avvise `cms_publish_article` og annen innsetting/oppdatering i `cms_article_publications`, også for eieren. Tilbakekall app-EXECUTE/skrivetilgang og ha en serverstyrt, default-stengt utgivelsesgrense. Klientens `publishingEnabled:false` beholdes, men er ikke sperringen alene. Parkert Worker og M3.3-isolasjon beholdes.

Ingen nye private godkjennings-/kontrolltabeller skal ha anonym SELECT. Godkjenning må aldri kopiere et privat utkast til den allerede offentlig lesbare publikasjonstabellen. Eventuelle eksisterende public-snapshots er et separat inventar, ikke bevis på gyldig eiergodkjenning.

## 6. Rolle- og tillatelsesmatrise for senere isolert implementering

«RPC» betyr serverkontrollert operasjon etter alle gater. Direkte tabell-DML er ikke en apprettighet i noen av radene.

| Rolle | Lese private utkast/kontroll | Lagre utkast | Attestere fag/rettigheter | Eiergodkjenne | Tilbakekalle/fryse | Publisere |
| --- | --- | --- | --- | --- | --- | --- |
| Anonym / anonym Auth | Nei | Nei | Nei | Nei | Nei | Nei |
| Vanlig innlogget konto | Nei | Nei | Nei | Nei | Nei | Nei |
| Aktivert redaktør | Eksisterende redaktørscope, ikke automatisk per-forfatterprivat | RPC | Ikke automatisk | Nei | Nei | Nei |
| Bekreftet fag-/rettighetskontrollør | Eksplisitt kontrollscope | Bare med egen redaktørrett | Egen, verifisert kontrollprosess etter F01–F04 | Nei | Eget kontrollbevis kan trekkes tilbake/avvik gjenåpnes | Nei |
| Bekreftet prosjekteier | Eierens scope | Bare med egen redaktørrett | Ikke automatisk kontrollør | RPC + fersk personlig handling | RPC for beslutninger i eget scope | Nei i første fase |
| Release-verifikator, fremtidig | Minimal verifiseringsprojeksjon, ikke manus/persondata | Nei | Nei | Nei | Nei | Ingen direkte rett; separat Git-/utgivelsesgate |
| App-/servicekonto | Ingen standardrett til nye private bevis | Ingen direkte DML | Nei | Nei | Ingen personlig beslutning | Nei |
| Sikkerhetsadministrator | Kontrollert operatørtilgang | Ikke redaksjonell normalflyt | Nei som automatikk | Kan ikke utgi en administratorhandling for å være personlig eiergodkjenning | Kan stenge eierbinding/utgivelse | Ikke som følge av denne rollen |
| Privat utførerrolle | Kun nødvendig innvendig funksjonsbruk | Kun kuraterte funksjoner | Kun kuraterte funksjoner | Kun etter bekreftet innringer/hele gaten | Kuraterte funksjoner | Nei i første fase |

Database-superbruker, prosjektadministrator og signeringsnøkkelholder kan teknisk endre infrastrukturen. De ligger i den betrodde operatørgrensen; RLS eller en intern logg kan ikke gjøre slik tilgang umulig å misbruke. Minimer adgang, skill driftsendring fra eierbeslutning, og behold ekstern kontroll av avvikende endringer. En admin/service-hendelse må aldri presenteres som personlig godkjenning.

## 7. Tilstand, konflikter, logg og tilbakekalling

### 7.1 Atomisk beslutning

Godkjenning skal i én transaksjon kontrollere eierbinding/epoke og sesjon, låse mål/kontrollpakke/utfordring i fast rekkefølge, beregne gjeldende hash og validere kontrollgrunnlaget. Deretter forbrukes nonce og hendelsen appendes sammen. Feil gir ingen halvferdig godkjenning eller forbrukt nonce uten hendelse. Alle funksjoner som endrer innhold eller kontrollstatus må bruke samme låserekkefølge; samtidige save/approve/revoke skal få én dokumentert rekkefølge, ikke en TOCTOU-luke.

Låsestrategi og nødvendige objektprivilegier må testes på PostgreSQL-versjonen som faktisk brukes; SELECT FOR UPDATE må ikke føre til at en klient får generelle UPDATE-rettigheter. Ingen automatisk klient-retry med ny revisjon/hash ved `40001` eller konflikt.

### 7.2 Automatisk bortfall for endret innhold

Effektiv godkjenning av en **arbeidsversjon** krever at alle målfelter fortsatt samsvarer, eierbinding/epoke er aktiv, kontrollpakke og medier er gyldige og ingen tilbakekalling finnes. En ny tekst-, quiz-, læringsmetadata- eller medieressursversjon gjør det gamle beviset ubrukbart for den nye versjonen umiddelbart ved lagrings-/kontrolltransaksjonen. Samme gjelder ny renderer-/hashkontrakt eller meningsfull endring/gjenåpning i kontrollgrunnlaget.

Gamle hendelser beholdes som historikk, ikke omskrives til å gjelde nytt innhold. Samme tekst tilbakeført i en ny revisjon arver ikke en gammel godkjenning. Med dagens revisjonskontrakt vil også en ny lagring med identiske bytes, men nytt revisjonsnummer, kreve ny beslutning; godkjenningsflyten må derfor ikke kalle `save()` etter bekreftelsen. En eventuell senere no-op-optimalisering må først validere forventet revisjon og testes separat. Ren lokal UI-tilstand skal ikke utløse kontolagring eller innholdsrevisjon.

Eierens senere utlogging opphever ikke en allerede gyldig, committet beslutning. En ny handling med en avsluttet sesjon avvises. Deaktivering/endring av eierbinding eller en eksplisitt tilbakekalling er egne mekanismer som kan gjøre beslutningen ubrukbar for videre utgivelse.

### 7.3 Hendelser og feil

Hendelser skal minst omfatte `DRAFT_SAVED`, `OWNER_APPROVED`, `APPROVAL_INVALIDATED`, `OWNER_REVOKED`, `OWNER_BINDING_DISABLED`, `REVIEW_ATTESTED`, `REVIEW_REVOKED`, `REVIEW_REPLACED` og `FINDING_REOPENED`, med serveraktør, scope, eksakt mål, serverklokke, beslutnings-/kontrollreferanse og request/idempotens-ID. Uforanderlige snapshots og logg skal ikke kunne oppdateres eller slettes av klientroller. Historiske beslutningsbevis skal ikke forsvinne gjennom kaskadesletting av en bruker. Ikke logg passord, JWT, nonce, unødvendige persondata eller manus i feilmeldinger.

- Gjentatt identisk request-ID etter nettverksbrudd gir samme committede operasjonsreferanse, ikke en ny beslutning. Avvikende innhold med samme ID avvises.
- En brukt nonce med ny request-ID avvises. Et gammelt idempotent svar skal ikke fremstille en senere tilbakekalt beslutning som aktiv; responsen må skille opprinnelig operasjonsutfall fra nåværende gyldighet.
- Tilbakekalling refererer til konkret `approval_id` og begrunnelse. Den krever autorisert personlig/sikkerhetsmessig handling, men **ikke** at innholdet fortsatt er gjeldende eller at fag-/rettighetsbevis fortsatt er komplette. Man må kunne tilbakekalle et allerede problematisk bevis.
- Avvisninger logges i et betrodd request-/sikkerhetsloggløp med minimale metadata. Et INSERT i samme transaksjon etterfulgt av RAISE rulles tilbake; det teller ikke som en varig avvisningslogg.
- Uautentisert → 401, manglende rolle/MFA → 403, stale mål/replay → konflikt/409, ugyldig schema eller manglende bevis → 422, utilgjengelig avhengighet → 503. Eksisterende revisjonskonflikt/SQLSTATE `40001` skal fortsatt forstås som avslag, ikke som lov til automatisk rebase.
- Ved timeout skal klienten vise uavklart utfall og lese status for samme request-ID før ny personlig handling. Ingen suksessmelding fra lokal lagring, tom respons eller nettverksfeil.

### 7.4 Tilbakekalling av fag-/rettighetsattestasjon uten tekstendring – RED005A-03-K04

Et faglig kontrollresultat er et eget, tilbakekallbart bevis, ikke en egenskap som bare endres når artikkelteksten endres. Dokumentert faglig feil, en tilbaketrukket/misforstått kilde, feil mandat, ugyldig rettighet eller kompromittert kontrollgrunnlag kan gjøre beviset ubrukbart mens `(slug,locale,revision,content_sha256)` er helt uendret.

- Ansvarlig kontrollør innenfor gyldig mandat skal kunne tilbakekalle eget bevis. Ansvarlig fag-/rettighetsinstans skal ha en eksplisitt, serverkontrollert adgang til å tilbakekalle et bevis i sitt oppnevnte scope. Utløpt/sperret mandat og ordinær redaktør gir ikke en skjult unntaksrett. Sikkerhetsadministrator kan fryse bruk, ikke konstruere en personlig/faglig beslutning.
- Hendelsen binder `attestation_id`, artikkel-/språk-/versjonsmål, begrunnelse, konkret avviks-ID, aktør, mandat og servertid. Den gamle attestasjonen beholdes uendret. Ny dokumentasjon erstatter ikke en tilbakekalling i det stille.
- Kontrollpakken har en serverstyrt gyldighets-/avhengighetstilstand. Tilbakekalling, rettighetsutløp eller gjenåpning gjør pakken ubrukbar og invaliderer enhver **effektiv** eiergodkjenning som avhenger av den. Invalideringen må ikke vente på et nytt tekst-save, ny artikkelrevisjon, klient-refresh eller en ny build.
- Tilbakekall, save og approve må serialiseres gjennom samme beslutningsgrense. Hvis approve ordnes først, skal etterfølgende tilbakekall gjøre den beslutningen ubrukbar; hvis tilbakekall ordnes først, skal approve avvises. Ingen sluttstatus kan være aktiv mot tilbakekalt grunnlag.
- Et korrigert faglig resultat krever en ny attestasjon og kontrollpakkeversjon med kobling til det gamle beviset/avviket. Ny gyldig pakke **gjenoppliver ikke** gammel personlig eiergodkjenning. Ny personlig bekreftelse må binde den nye kontrollpakken, selv når teksthash og revisjon er like.
- UI viser «kontrollgrunnlag tilbakekalt» / «Ikke vurdert» eller «Må korrigeres» etter dokumentert resultat, aldri grønn gyldighet fra en cachet attestasjon. Ny utgivelse blokkeres. Allerede publisert statisk innhold håndteres særskilt av 00 som beskrevet i §8; denne kontrakten gir ingen automatisk produksjonsendring.

Dette oppfyller både K04 og F04: historikken bevares, men uriktige faglige resultater kan trekkes tilbake uavhengig av innholdets byteendringer.

## 8. Git forblir autoritativt for publisering

Dagens `is_public`/`article_permission` og NB-forutsetningen for EN beholdes. Eier-RPC får ingen GitHub-legitimasjon, skriver ikke `content/publication.json` og starter ikke et bygg/deploy.

En senere, separat bestilt utgivelsesintegrasjon må oppfylle **begge** gater:

```text
ny_utgivelse_tillatt = eksisterende_Git_policy_for_eksakt_kildeversjon
                      AND verifisert_aktiv_eierbeslutning_for_samme_innhold
                      AND verifisert_fag_kilde_rettighetspakke
                      AND kontrollert_bygg_commit_og_artefakt
```

Nødvendig bro før slik integrasjon:

1. Frys den personlig godkjente serverrevisjonen og kontrollpakken. En betrodd kontrollprosess sammenholder den med den faktiske NB/EN-kilden og mediemanifestet i en eksakt Git-commit.
2. En versjonert adapter må vise deterministisk likhet mellom den lagrede serverrepresentasjonen og det faktiske innholdet som Git-generatorene vil publisere. Ved forskjell i tekst, språkoverstyring, normalisering eller bilder: stopp og innhent beslutning for den reelle versjonen. Manuell påstand om «samme innhold» eller kopiering av én hash til et annet hashfelt er ikke nok.
3. Eksisterende Git-felter og `article_text_version()` verifiseres fortsatt. Den norske godkjenningen gir ingen engelsk eierbeslutning; eksisterende ekstra NB-gate for EN beholdes.
4. En senere betrodd, kun-lesende utgivelsesverifikator må kontrollere aktiv beslutning, eier-epoke og tilbakekalling mot en fersk serverkilde ved bygg og igjen før utgivelse. Ingen slik konto, hemmelighet eller binding opprettes her. Hvis sikker, avgrenset tilgang ikke er besluttet/tilgjengelig, forblir publisering stengt.
5. Et offline JSON-bevis eller tidligere SHA-256 beviser ikke at en beslutning fortsatt er aktiv. Ukjent eller utilgjengelig revokasjonsstatus skal avvise ny utgivelse. Private eier-UUID-er, sesjoner, utfordringer og fagnotater skal ikke eksporteres til offentlig Git-/dist-data; bare nødvendige, ikke-sensitive beslutningsreferanser.

En databasehendelse endrer ikke et allerede utgitt statisk nettsted. Nytt utkast gjør ikke det gamle offentlige innholdet til den nye versjonen. Tilbakekalling av tidligere publisert innhold krever et separat, kontrollert stenge-/tilbakeføringsløp hos 00, med Git-policy, berørte artefakter og cachekontroll. Kontrakten lover ikke umiddelbar fjerning fra produksjon, og den autoriserer ingen slik handling nå.

## 9. RED004-F01–F04 – faktiske avhengigheter

Definisjonene er kontrollert i [03 – Faglig revisjon, kilder og opphavsrett](https://chatgpt.com/c/6ae8dee2-4d38-83eb-9448-af6b8a3cf8aa), rapportturn `a1d8cfe1-de60-4248-a849-46dbe9fded98`, 03.11.2026. 03s senere GO lukker lokal RED-004-leveranse, men opphever ikke disse forbedringspunktene før fullstendig fag-/rettighetsgodkjenning. De må ikke forveksles med 04s separate UI-forbedringsønsker.

| ID / prioritet | Faktisk funn | Avhengighet og akseptansekriterium for full godkjenning |
| --- | --- | --- |
| RED004-F01 / P1 | Rettighetshaver mangler som selvstendig felt | Eget rettighetshaverfelt, adskilt fra opphav, samt dokumentert tillatelsesomfang: ressursversjon/bytes, bruksform/kanal, lisens/versjon, kreditering og relevante tids-/bruksbegrensninger. Ansvarlig rettighetskontroll må verifisere beviset. «creator» eller et Preview-bildesamsvar er ikke nok. Manglende/utløpt tillatelse blokkerer. |
| RED004-F02 / P1 | Påstandskoblingen er ikke tilstrekkelig presis | Stabil påstands-/avsnitts-ID i en bestemt artikkelversjon, eksakt tekstpassasje eller passasjehash, kildeplassering (side/avsnitt/tidskode), kildeversjon og dokumentert støtteforhold. Faktisk faglig kontroll må attestere støtten. En gyldig URL eller fritekst i `supports` er ikke nok. Endret passasje krever ny kobling. |
| RED004-F03 / P2 | «Sjekket lokalt» trenger tydeligere avgrensning | Skill egenregistrert aktivitet fra kontrollresultat og personlig eierbeslutning i data/UI/API. `checked` i lokal fil kan ikke bli `passed`, gi et verifisert kontrollør-UUID eller lukke en gate. Test mangelfulle dokumenter og selvpåført godkjenningsflagging. |
| RED004-F04 / P2 | Avvik mangler strukturert lukking | Egen avviks-ID, type/alvorlighetsgrad, status, grunnlag, ansvarlig aktør, løsning, verifisert etterkontroll og dokumentert lukking. Fritekst kan ikke alene lukke avvik. Gjenåpning eller endret klassifisering versjonerer kontrollgrunnlaget og gjør gammel effektiv godkjenning ubrukbar. |

Alle fire inngår i fullstendighetsgaten før modellen kan brukes til full fag-/rettighetsgodkjenning. Lokale kontrollnotater er fortsatt nyttige arbeidsdata. Ingen av punktene er rettet eller gitt et nytt autoritativt statusregister i RED-005A. Ansvar/akseptanse må avtales mellom 00, 03, 04 og 05 før senere implementering.

### 9.1 Autoritativ faglig attestasjon – RED005A-03-K01 (P1)

Autentisering bekrefter hvem som gjorde en handling. Den bekrefter ikke fagkompetanse, at en kilde er lest eller at en konklusjon er riktig. En rolle/UUID og et komplett JSON-skjema er derfor ikke tilstrekkelig som faglig attestasjon.

Før et kontrollbevis kan inngå i en fullstendig pakke, må 00/03 fastsette og dokumentere kontrollørens kompetansegrunnlag, mandat og tillatte scope. Oppnevningen er en egen, sporbar beslutning med oppnevner, mandat-ID/versjon, gyldighetstid, fagområde, språk og eventuelle habilitets-/uavhengighetsbegrensninger. Eieren er ikke automatisk fag-/rettighetskontrollør, og en teknisk verifikator eller AI får ikke et menneskelig mandat ved å kjenne et API.

Attestasjonen skal minst binde:

- Eksakt artikkel-/språk-/innholdsmål og kontrollpakke-/medieversjon.
- Verifisert kontrolløridentitet og mandat-ID/versjon; mandatet skal være aktivt og dekke den aktuelle handlingen.
- Faktisk gjennomførte kontrollhandlinger: hvilke påstander, kilder, ressurser og avvik som er kontrollert, med etterprøvbare referanser.
- Begrunnet resultat (`pass`, `fail`, `needs_correction`, `not_assessed`), faglig vurdering og vesentlige forbehold/avgrensninger. Avgrenset kontroll kan ikke oppgraderes til full artikkelkontroll.
- Serverbestemt tidspunkt, bevis-/attestasjons-ID, vedtak om nødvendig etterkontroll og kobling til funn, erstattede eller tilbakekalte bevis.

Teknisk validering kontrollerer identitet, mandat, struktur, versjonsbinding og lovlig tilstand. Faglig godhet krever en faktisk, dokumentert kontrollprosess og akseptanse fra ansvarlig faginstans. Tilsvarende gjelder rettighetsvurdering. Ansvarlig kontrollinstans må definere når uavhengig etterkontroll kreves; ingen automatisk `passed` fra felttilstedeværelse eller lokal `checked`. Bare attestasjon som har gjennomgått denne prosessen kan inngå i `cms_verified_review_bundles`.

**Avslagstest:** En autentisert, også mandatbundet kontrollør som bare fyller på syntaktisk korrekte, men udokumenterte referanser, skal ikke få fullstendig godkjenningsgrunnlag. Maskinelle tester kan kontrollere at nødvendig attestasjon/etterkontroll mangler; de kan ikke alene bevise kildens faglige sannhet. 03 må gjennomføre en separat manuell negativ kontroll med en oppdiktet eller irrelevant kilde.

### 9.2 Faktisk kildestøtte – RED005A-03-K02 (P1)

F02 utvides fra presis plassering til en etterprøvbar vurdering av **hvorfor kilden støtter påstanden**. Hver vesentlige påstand skal ha stabil ID og eksakt tekstpassasje/hash i den vurderte artikkelversjonen. Kildebeviset skal angi referanse, forfatter/utgiver, utgave/versjon, relevant kildeplassering og kontrolltidspunkt, samt relevant bevart kildegrunnlag der dette lovlig kan dokumenteres privat.

Kontrolløren skal eksplisitt vurdere kildens **faglige autoritet, relevans, versjon, faktiske støtteforhold og vesentlige forbehold**. Resultatet skal skille direkte støtte, avgrenset/indirekte støtte, motstrid, uavklart støtte og ingen støtte. Det skal fremgå hvilke kontrollhandlinger som faktisk er utført, ikke bare at referansen finnes eller kan åpnes.

Motstridende, foreldet eller utilstrekkelig dokumentasjon blir et identifiserbart F04-avvik med faglig begrunnelse og konsekvens for påstanden. Kritiske/uavklarte forhold blokkerer full attestasjon. Lukking krever dokumentert vurdering og etterkontroll fra riktig mandat, ikke bare at eieren eller redaktøren endrer et statusfelt. Endret påstand/passasje eller vesentlig kildegrunnlag krever ny kobling og ny vurdering av kontrollpakken. Referanser/notater er private bevis og skal ikke automatisk bli offentlige artikkeldata.

### 9.3 Utvidet rettighetsomfang – RED005A-03-K03 (P1)

F01 gjelder både identitet og **faktisk tillatt bruk**. For hver ressursversjon skal rettighetskontrolløren skille opphavsperson fra rettighetshaver og dokumentere rettighetskjeden, lisens/avtaleversjon, identifiserbart tillatelsesbevis, relevant kreditering, gyldighet og begrensninger.

Tillatelsesvurderingen skal uttrykkelig dekke den planlagte MODUS-bruken, inkludert **bearbeiding, oversettelse, redistribusjon og bruk i NB og EN** når relevant, i tillegg til kanal, bruksform og relevante tids-/territoriale vilkår. For hver brukstype/språkversjon registreres tillatt, ikke tillatt eller uavklart, med bevis og begrunnelse. «Ikke relevant» krever en dokumentert faglig/rettighetsmessig begrunnelse; tomme felter eller NB-tillatelse er ikke en EN-tillatelse.

Et SHA-samsvar beviser ressursidentitet, ikke at MODUS har bruksrett. Ukjente eller omstridte rettigheter skal blokkere full rettighetsattestasjon. Et avgrenset Preview-/katalogvedtak kan ikke utvides til fulltekst, generell lisens, oversettelse eller redistribusjon. Utløp, endret bruk eller tilbakekalt rettighet får konsekvens for kontrollpakken selv om bytes er uendret; hendelsesløpet følger §7.4.

### 9.4 De fire fagkravene er ikke lukket av dokumentasjonen

K01–K04 er innarbeidet som normative krav, sammen med F01–F04. De er **ikke** implementert, faglig utført på artikler eller lukket i drift. F01/F02 og K01–K03 er forutsetninger før reell fag-/rettighetsattestasjon. F03 er en ufravikelig godkjenningsgate selv om opprinnelig utviklingsprioritet er P2. F04 og K04 er obligatoriske når avvik, feil eller tilbakekallingsavhengigheter finnes; et tomt avviksregister er ikke bevis på at det ikke finnes avvik.

### 9.5 Normal eierflyt – 04s bindende produktforutsetninger

Fremtidig normalflyt i eksisterende nettredaktør skal være:

1. **Gjennomgå kontrollgrunnlag:** Les en forståelig oversikt over fag, kilde og rettigheter, mandat/omfang, avvik, forbehold og eventuell tilbakekalling. Manglende grunnlag blokkerer handlingen og forklares med konkret årsak.
2. **Se eksakt innholdsversjon:** Vis artikkel, språk, lagret revisjon og frosset forhåndsvisning. Usikrede endringer må avklares før forberedelse. Tekniske hash-/JSON-detaljer kan være tilgjengelige for kontroll, men brukeren skal ikke måtte beregne, kopiere eller redigere dem.
3. **Bekreft personlig:** Bare riktig eier får tilgang til handlingen. Ny MFA-step-up knyttes til det konkrete målet. Endres mål/kontrollgrunnlag underveis, stoppes forløpet; en gammel dialog kan ikke godkjenne nytt innhold. En deaktivert/skjult knapp er ingen serverautorisasjon.
4. **Registrere beslutning:** Serveren registrerer beslutningen atomisk. Avbryt gir ingen godkjenning. Timeout viser uavklart utfall og leser samme request-ID før eventuell ny handling; ikke grønn suksess fra lokal status eller automatisk retry.
5. **Vise status:** Vis separat faglig kontroll, personlig godkjent revisjon og publiseringsstatus. «Eiergodkjent revisjon R – ikke publisert», «ny arbeidsversjon avventer», «grunnlag tilbakekalt» og «ikke vurdert» skal ikke blandes. En personlig beslutning utløser ikke publisering, Git-endring eller deploy.

**Ingen manuell JSON-behandling skal kreves i denne normale godkjenningsflyten.** RED-004s lokale fil-/notatverktøy kan beholdes som forberedelse og kontrollverktøy, men kan ikke være eierens autoritative godkjenningshandling. Dette er en UX-kontrakt, ikke et nytt grensesnitt implementert nå.

## 10. Trusselmodell

| Trussel | Påkrevd sperre / restgrense |
| --- | --- |
| Redaktør eller vanlig konto skriver direkte via REST/GraphQL, gammel RPC, view eller sekvens | Ingen direkte app-DML; alle eksisterende og nye skriveinnganger kartlagt; kuraterte funksjoner + RLS/integritetskontroll. Eksplisitt negativt testet. |
| Forfalsket `owner_id`, e-post, `user_metadata`, status, klokke eller klienthash | Serveridentitet og live privat eierbinding; serverhash/-tid; ukjente autoritetsparametre avvises. |
| Anonym Auth-bruker med rollen authenticated | Egen avvisning av anonym identitet og manglende aktiv eierbinding. Rollen alene er ikke nok. |
| Gammel JWT etter utlogging eller rolleendring | Sesjonsgyldighet + live eierbinding/epoke ved ny handling. Refresh/iat er ikke ny personlig step-up. |
| Stjålet nonce, replay eller automatisk approve-retry | Kortlevd, engangs- og sesjons-/tuppelbundet utfordring; idempotens og atomisk forbruk. Ingen automatisk rebase. |
| Edit/save, asset- eller evidence-endring under godkjenning | Serverlåsing og ny hash-/gatesjekk i samme transaksjon; stale mål avvises. |
| NB-bevis brukes for EN, gammel revisjon eller annen artikkel | Hele identitetstuplen inngår; begge språk må ha egne beslutninger. |
| Importert RED-004-fil eller kilde-/kort-/Preview-tillatelse blir godkjenning | Behold lokal ikke-autoritativ status; separate algoritmer/omfang, F01–F04 og eksplisitt verifisert bro. |
| Klient gir en vilkårlig bildehash eller privilegert server henter en intern URL | Betrodd byteverifisering og uforanderlige ressursversjoner; ingen vilkårlig serverfetch. |
| Lokal XSS, ondsinnet eierklient eller eierens legitimasjon gitt til en agent | Eksisterende sanitering, sikker godkjenningsvisning, fersk MFA og ingen deling av eierlegitimasjon. Full enhets-/signeringsnøkkelkompromittering ligger utenfor API-ets bevisstyrke. |
| Intern service-/adminrolle brukes som personlig eier | Ikke en tillatt eieraktør; begrens objektprivilegier. Superuser kan fortsatt manipulere infrastruktur og må ligge i betrodd, separat operatørkontroll. |
| Historikk eller logg etterkonstrueres, slettes eller feiltolkes som uforanderlig | Append-only for approller, serveraktør, snapshotreferanser og ekstern QA. Intern hash/logg beskytter ikke mot all superbrukertilgang. |
| Databasetilbakekalling forveksles med umiddelbar avpublisering | Steng nye utgivelser, vis forskjell på historisk og aktiv beslutning, separat kontrollert Git-/cache-tilbakeføring. |

## 11. Konkrete akseptansekriterier og fremtidige negative tester

Disse skal kjøres senere i **særskilt godkjent isolert database/Auth-prosjekt**, ikke produksjon. SQL `SET ROLE`-tester dekker privilegier, men beviser ikke JWT-verifisering; reelle isolerte API/Auth-tester trengs i tillegg.

| ID | Akseptanse / negativt forsøk | Forventet resultat |
| --- | --- | --- |
| OA-01 | Bekreftet syntetisk eier, fersk step-up, gyldig sesjon, komplett kontrollpakke og eksakt mål | Én privat, sporbar godkjenningshendelse; ingen publikasjonsrad eller Git-endring. |
| OA-02 | Anonym, anonym Auth, vanlig bruker, redaktør, servicekonto, riktig e-post men feil UUID | Avvist, ingen beslutning og ingen privat datalekkasje. |
| OA-03 | Endre `user_metadata`, sende actor/approved/timestamp/hash eller rolle som parametre | Ingen økte rettigheter; ukjente autoritetsparametre avvises. |
| OA-04 | Ugyldig signatur, feil issuer/prosjekt/audience, utløpt token, manglende/revokert sesjon | Avvist før beslutning. Ekte tokenvalidasjon testes gjennom API, ikke bare simulerte claims. |
| OA-05 | AAL1, gammel MFA, ny JWT-iat uten ny step-up | Avvist. Manglende verifiserbar step-up-kilde holder funksjonen deaktivert. |
| OA-06 | Direkte INSERT/UPDATE/DELETE/UPSERT/COPY, masseoperasjon, view, GraphQL, gammel/overlastet RPC | Avvist i hver tilgjengelig appvei. Test ACL, default privileges, sekvenser, schema-USAGE og SET ROLE-arv. |
| OA-07 | Vanlig konto forsøker å aktivere seg som redaktør/eier eller endre epoke | Avvist. Reaktivering av eier gir ikke gamle beslutninger ny gyldighet. |
| OA-08 | Manipulert slug, locale, revisjon, hash, evidence-/media-digest eller algoritme | Avvist. NB-beslutning kan ikke brukes for EN. |
| OA-09 | To klienter: save før/under approve, to approve-forsøk, samtidig revoke, endret kontrollpakke | Serialiserbart, dokumentert utfall uten stale godkjenning eller delvis historikk. Ingen klient-rebase. |
| OA-10 | Endre tekst, quiz, læringsmetadata, bilde-URL, alt eller faktiske bytes | Tidligere bevis gjelder ikke den nye versjonen; opprinnelig hendelse beholdes. |
| OA-11 | Endre bare UI-panel, local savedAt, visuell CSS eller klientstatus | Ingen annen innholdshash; heller ingen ny godkjenning gjennom slike felter. |
| OA-12 | Samme hash i ny revisjon / revert til tidligere innhold | Ingen arvet godkjenning. Hvis no-op-optimalisering foreslås, må stale expected_revision likevel avvises. |
| OA-13 | Gjenbruk nonce, annen sesjon, utløpt challenge, gjenbruk request-ID med annet mål | Avvist; identisk nettverksretry returnerer bare samme operasjonsreferanse og nåværende gyldighet. |
| OA-14 | Tilbakekall etter innholdsendring eller utløpt rettighet; logout etter allerede committet godkjenning | Tilbakekalling kan gjennomføres autorisert uten krav om gyldig gammelt innhold. Logout alene sletter ikke en gyldig historisk beslutning, men token kan ikke gjøre en ny. |
| OA-15 | F01 rettighetshaver/omfang mangler, F02 påstand ikke koblet, F03 bare checked, F04 åpent/gjenåpnet avvik | Ingen fullstendig kontrollgate eller eiergodkjenning. Ingen manuell lokal flagging kan omgå sperren. |
| OA-16 | Kilde-/server-/lokalhash blandes, ukjent canonicaliseringsversjon eller Unicode-/escaping-forskjell | Ingen likhet antas. Felles server-/JS-golden vectors må passe eksakt. |
| OA-17 | Bekreftet DB-eierbeslutning med Git draft/private, feil legacyhash, feil locale eller feil commit | Ingen publisering. Eksisterende Git-regel må fortsatt bestås. |
| OA-18 | Manglende fersk revokasjonskontroll eller registry/asset/Auth-avhengighet nede | Fail closed; ingen ny beslutning/utgivelse på cachet eller uavklart grunnlag. |
| OA-19 | Timeout etter commit / audit-feil før commit / transaksjonsrollback | Les operasjonsstatus uten ny beslutning. Atomicitet bevises. Avvist forespørsel skal ikke hevdes varig logget av en rollbacket transaksjon. |
| OA-20 | Forsøk å lese private godkjenner-/kontrollrader anonymt eller få dem i seed, søk, logging, dist og isolert Preview | Ingen private data eller writer-/godkjenningsflate lekkes. Eksisterende publiserings-/canary-/M3.3-tester består. |

### 11.1 Tilleggstester fra samlet vurdering – OA-21–OA-28

| ID | Krav / negativ kontroll | Påkrevd resultat / bevis |
| --- | --- | --- |
| OA-21 | K01: autentisert kontrollør uten gyldig/relevant mandat, eller manglende faktisk kontroll/avgrensning | Ingen autoritativ attestasjon. API/DB-avslag og manuell mandat-/fagkontroll dokumenteres separat. |
| OA-22 | K02: gyldig formatert, men oppdiktet, irrelevant, feilversjonert eller motstridende kilde | Ingen fullstendig kildeattestasjon fra referansens form alene. Maskinell gatekontroll og 03s manuelle test av faktisk støtteforhold må begge dokumenteres. |
| OA-23 | K03/F01: ressurs med riktig filhash, men manglende rettighetshaver, ukjent rett, manglende oversettelses-/bearbeidings-/redistribusjons- eller EN-tillatelse | Full rettighetsattestasjon avvises. Relevant bruks-/språkomfang må ha eget dokumentert bevis. |
| OA-24 | K04: tilbakekall fagbevis ved dokumentert feil mens tekst, quiz, media og artikkelrevisjon er uendret | Kontrollpakke og avhengig effektiv eiergodkjenning blir ubrukbare; historikken står, ny utgivelse blokkeres. Nytt fagbevis gjenoppliver ikke gammel eierbeslutning. |
| OA-25 | 05-S02: gammel AAL2-token, klientpåstått step-up-tid, verifikasjon for annen utfordring/sesjon, dobbelt eller utløpt receipt | Ingen beslutning. Reell isolert Auth/gate/RPC må bevise at kvittering bare oppstår fra ny leverandørverifikasjon og forbrukes én gang. |
| OA-26 | 05-S01: rettighetsstramming eller feil i privat skrivefunksjon | Alle alternative skriveveier avvises, mens legitim utkastlagring, optimistisk konflikt og historikk fortsatt fungerer. Ingen midlertidig gjenåpning av direkte DML godtas. |
| OA-27 | 04: normalbruker kan ikke JSON/hash/RPC; eier avbryter, har ulagret arbeid eller får timeout | Forståelig, tastatur-/mobiltilgjengelig flyt med serverstyrte tekniske detaljer. Ingen manuell JSON kreves, ingen automatisk godkjenning/revisjonsskifte/publisering. |
| OA-28 | 05-S07: alle roller, inkludert eier og tekniske roller, prøver gammel publish-RPC, publikasjonstabell, Worker eller utgivelsesjobb | Ingen ny offentlig rad eller utgivelse. Serverstengt publisering og M3.3-isolasjon gjelder hele første fase. |

Kritisk NO-GO uavhengig av total testscore: noen annen appaktør kan gi eiergodkjenning, direkte skrivevei omgår kontrollen, gammel sesjon/step-up/nonce blir godtatt, feil versjon eller tilbakekalt grunnlag fremstår aktivt, eller personlig godkjenning alene kan gi offentlig publikasjon.

## 12. Isolert implementeringsplan v1.1 – ingen gjennomføring autorisert nå

### 12.1 Portene og skillet mellom lokale og miljøendrende handlinger

| Port | Senere leveranse / ansvar | Krever beslutning før handling | Stoppkriterium |
| --- | --- | --- | --- |
| G0 – kontraktslukking | 00 samordner v1.1, mandat-/rollegrenser, F/K-krav og 05-S01–S07. 03/04/05s eksisterende betingede vurderinger er input; v1.0 sendes ikke gjennom en identisk ny runde. | 00 beslutter om kontrakten er tilstrekkelig og om RED-005B skal bestilles. Nåværende ordre gjelder bare dokumentasjon. | Manglende kontraktsbeslutning: ingen implementering, heller ikke lokal app-/SQL-kode. |
| G1 – miljøfullmakt | Navngitt isolert konto/prosjekt, database-/Auth-versjon, tilganger, syntetiske identiteter, ressursgrenser og eventuelle kostnader dokumenteres. Ingen produksjonsdata, secrets eller legitimasjon kopieres. | Separat, uttrykkelig prosjekteier-GO før opprettelse/endring av database, Auth, skyressurser eller bindinger. En ordre om lokalt implementeringsdesign er ikke denne fullmakten. | Uklart miljø, kostnad eller tilgang: ingen miljøoperasjon. |
| G2 – minste sikre skrivegrense | Etter særskilt bestilling: komplett eksisterende/fremtidig privilegieinventar, kontrollert utkastlagring, private guard-funksjoner, snapshots og serverstengt publisering. 05 gransker roller, alle funksjonsoverlastinger, RLS, views, GraphQL, sekvenser og service/worker-veier. | Lokal koding/DDL-utkast krever RED-005B-ordre; faktisk isolert DDL/RLS/RPC krever også G1-fullmakt. | OA-06/OA-26/OA-28 eller legitim save feiler: ingen eierflyt, ingen midlertidig bred DML. |
| G3 – innhold og fag-/rettighetsgrunnlag | Serverkanonisering og byte-/mediemanifest med golden vectors. F01–F04 og K01–K04 modelleres, med mandater, faktisk kildestøtte, bruks-/språkomfang og tilbakekallbare kontrollbevis. 03 eier den faglige prosessvurderingen, 04 arbeidsflyten, 05 tekniske gater. | Syntetiske kontrollpakker i godkjent isolert test er mulig; reell attestasjon er ikke autorisert. | Manglende determinisme, mandat, F01/F02/K01–K03 eller relevant F03/F04/K04: ingen reell kontroll-/eiergodkjenning. |
| G4 – fersk personlig testflyt | Beskyttet step-up-gate og privat receipt etter §4.1, aktiv sesjonskontroll, atomisk approve/revoke, idempotens, feillogging og samtidighet. Bare syntetisk testidentitet og innhold. | Endringer i isolert Auth/servergater krever konkret fullmakt. Reell eierbinding eller personlig artikkelgodkjenning krever en separat senere beslutning. | Mekanismen kan ikke serververifiseres eller receipt-/sesjons-/samtidighetstest feiler: funksjonen forblir deaktivert. |
| G5 – uavhengig kontroll | OA-01–OA-28 gjennom faktisk isolert API/Auth/DB, i tillegg til syntetiske og eksisterende regresjonstester. Kilde-/fag-/rettighetsvurdering skilles fra teknisk test. Diff, eksakt SHA, miljøinventar, negative logger og rollback-bevis leveres til 00/03/04/05. | Implementerings-/miljøfullmaktene må dekke de konkrete testene. Ingen testresultater antas på forhånd. | Et kritisk NO-GO kan ikke overstyres av samlet antall beståtte tester. |
| G6 – separat videreførings-/utgivelsesbeslutning | Eventuell server↔Git-bro og fersk revokasjonskontroll etter §8 behandles som eget oppdrag. Første implementering har ingen publiseringsfase. | Ny autorisasjon før eventuell faktisk eiergodkjenning, produksjon, push/merge/deploy eller Cloudflare-/backendaktivering. | Ingen slik beslutning foreligger i denne kontrakten. |

### 12.2 Leveransepakker for et eventuelt senere RED-005B

**A – lokalt detaljdesign, uten databasehandling:** Frys kilde-SHA; lever ACL-/skriveveismatrise med innringerrolle, målobjekt, nåværende/fremtidig rettighet, guard og avslagstest. Fastsett navngitte private tabeller/funksjoner, executor-eierskap, journal-/receipt-format og canonicaliseringsvektorer. Gjennomgå alle stier før privilegier endres. Lokal kode eller migreringsfiler skrives først etter egen RED-005B-ordre.

**B – godkjent isolert migrering:** Ta et godkjent tomt/syntetisk utgangspunkt. Opprett private bevis-/eier-/challenge-objekter med default-deny og uten app-DML. Etabler gjennomgåtte skrivefunksjoner og nødvendige minsteprivilegier før gamle klientrettigheter fjernes. Serverpublisering er stengt fra start. Tilbakekall direkte rettigheter og erstatt/avgrens alle gamle RPC-overlastinger samlet i en kontrollert transaksjon/utgivelse; ingen mellomfase med en åpen alternativ godkjenningsvei. Bevis legitim save/historikk og avslag før videreføring. Ingen eksisterende rad backfilles som eiergodkjent, og ingen ukjent historisk aktør oppdiktes.

**C – beslutningsserialisering:** Første isolerte design skal bruke en enkel felles beslutningsgrense per repository-scope for lavvolum-CMS: alle appoperasjoner som endrer utkast, eier-epoke, kontrollpakke, medie-/rettighetsgyldighet, attestasjon eller tilbakekalling må ta samme serverstyrte transaksjonslås før lesing av autorisasjonsgrunnlaget. Navn, låseorden og rettigheter skal dokumenteres i designet. Dette prioriterer etterprøvbarhet fremfor finmasket parallellitet. Approve leser gjeldende innhold/bevis og forbruker receipt/nonce under den samme grensen. En asynkron invalideringsjobb er ikke sperringen; effektiv gyldighet må også sjekkes ved bruk. Direkte app-DML er allerede sperret. Sesjonskontroll og samtidig utlogging skal ha et separat dokumentert validerings-/lineariseringspunkt som §4.1 beskriver; ingen påstand om distribuert Auth-atomicitet uten testbevis.

**D – Auth-/MFA-bevis og UX:** Verifiser challenge/verify-mønsteret på faktisk isolert leverandørversjon, opprett bare de eksplisitt autoriserte serverkapabilitetene, og vis at gammel AAL2/JWT ikke gir fersk receipt. Bevis klokke-, sesjons-, utfordrings-, mål- og epokebinding, og at klient/servicekonto ikke kan utstede kvitteringen. Bygg deretter 04s normale, forståelige flyt rundt frosset serverinnhold; ikke gjør JSON-filutveksling til en sikkerhetsmekanisme.

**E – faglige akseptansebevis og negative tester:** 03 fastsetter mandat, faktiske kontrollhandlinger og hvordan relevante kilder/rettigheter etterkontrolleres. F01–F04/K01–K04 får egne bevis. Bruk syntetiske moteksempler, inkludert en tilsynelatende gyldig men oppdiktet kilde og et korrekt bildehash uten bruksrett. API-/RLS-test og manuell faglig test får egne resultater; ingen av dem erstatter den andre. Gjennomfør OA-01–OA-28, RED-002A/RED-003/RED-004-regresjoner, bygg-/publiseringscanaries og M3.3-isolasjon.

**F – tilbakeføring og overlevering:** Steng beslutningsendepunkter og ny receipt-utstedelse først. Steng eierbinding/epoke og behold publisering stengt. Bevar journal, snapshot og funn før eventuell tilbakeføring av kode/funksjoner; aldri gjeninnfør den gamle brede DML-svakheten for å få en UI-test til å virke. Test failure/rollback/idempotens med dokumenterte før-/etterprivilegier, slik at feil ikke gir halvferdige beslutninger eller tapte bevis. Destruktiv rollback/sletting av testmiljø må være dekket av fullmakten. Lever bevis til 00; ingen produksjonsmigrering eller deploy følger automatisk.

### 12.3 Åpne beslutningspunkter og sikkerhetsvilkår fra 05s faseoversikt

Følgende er **uavklart i implementasjon**, selv om kontraktskravet er fastsatt: faktisk isolert miljø/versjon og tillatelser, godkjent eier-testidentitet, kontrollørmandater, konkret executor-/schema-ACL, leverandør-/gateoppsett for step-up/aktiv sesjon, kanoniseringsimplementasjon og medieimmutabilitet, atomisk tilbakekalling/idempotens/varig avvisningslogg og eventuell senere utgivelsesverifikator. Ingen manglende mekanisme kan erstattes av et klientflagg eller erklæres bestått ved dokumentasjonsrevisjonen.

Dette dekker også 05s supplerende syv fasekrav: privilegieoversikt før G2, dokumentert MFA/sesjon før personlig test, F-struktur før G3, serverhash/media/golden vectors før G3, atomicitet/idempotens/feillogging før G4, serverstengt publisering/M3.3 hele veien, og separat prosjekteiergodkjent miljø/tilgang/kostnad før G1.

## 13. Verifikasjonsgrenser og historiske tester

**Historisk v1.0-grunnlag, ikke nye v1.1-kjøretidstester:**

- Gren, lokal HEAD og ancestor til oppgitt baseline ble verifisert. Kode-/SQL-skriveveier, lokal dokumentasjonsmodell, parkert runtime og Git-gater er lest ved eksakt baseline.
- Definisjonene RED004-F01–F04 er hentet fra 03s faktiske rapport, ikke utledet fra nummereringen.
- `python3 test-results/red-005a/contract-model.py`: **35/35 syntetiske beslutnings-/hashscenarioer bestått**. Dette er en liten modell av foreslåtte regler, ikke kjørende autorisasjon. Den tester tuplemismatch, identitet/MFA-/sesjonsforutsetninger som simulerte tilstander, replay, tilbakekalling, rolle-epoke og Git-AND-gate. En tidlig modellkjøring fanget delt testobjektreferanse; testfixturene ble kopiert uavhengig og kjørt på nytt. Ingen appkode ble endret.
- `node tests/editor-review.mjs`: **11/11 eksisterende RED-004-modellgrupper bestått**, kjørt lokalt på nytt som målrettet kontroll av eksisterende fingeravtrykk og ikke-autoritativ dokumentasjon.
- Ingen SQL, faktisk JWT-/MFA-validering, RLS/ACL-inngripen, nonce-transaksjon, samtidighet eller ekte eierbeslutning er testet nå. OA-tabellen er akseptanseplan for en senere databasefase, ikke beståtte DB-tester.
- Ingen full bygg-/nettleserrekke er gjentatt: appen er ikke endret, og denne oppgaven gjelder kontrakt. Tidligere RED-004-leveranse er ikke fremstilt som nye RED-005A-tester.

Historiske v1.0-bevis (uendret; rapporthashen gjelder originalen, ikke denne revisjonen): [kildemanifest](../test-results/red-005a/source-manifest.json), [syntetiske testresultater](../test-results/red-005a/contract-results.json) og [kontrollsummer](../test-results/red-005a/SHA256SUMS). Mappen `test-results/red-005a/` inneholder: syntetisk modell, `contract-results.json`, `contract-model.log`, `red004-fingerprint.log` og kilde-/dokumentasjonsmanifest. Disse inneholder bare syntetiske eksempler, filhash og referanser, ikke manus, faktiske eieridentiteter eller credentials.

## 14. Primærkilder for sikkerhetskontrakten

Offisiell dokumentasjon er kontrollert 03.11.2026. Anbefalingene i dette dokumentet er MODUS-kontraktsforslag, ikke påstander om at infrastrukturen allerede oppfyller dem.

- [Supabase: Database functions](https://supabase.com/docs/guides/database/functions): invoker/definer-privilegier, tom search_path, eksplisitt funksjons-EXECUTE og behov for egen rad-/aktørkontroll i privilegerte funksjoner.
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): skillet mellom roller/RLS, risiko ved brukerredigerbare metadata, gamle JWT-claims, views og privilegert bypass. Dette understøtter kravet om live eierbinding og komplette skriveveisprøver.
- [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa): serverhåndhevet AAL2 er mulig; UI-bekreftelse alene er ikke en sikkerhetsregel. Kravet om fersk personlig step-up er en ytterligere MODUS-kontrakt som må implementeres/verifiseres særskilt.
- [Supabase: Sessions](https://supabase.com/docs/guides/auth/sessions): session_id kan knyttes til auth.sessions, og utlogging og tidsavhengige sesjonsregler har ulike kontrollbehov. Derfor er verken tokenets iat eller bare en eksisterende rad tilstrekkelig for alle MODUS-krav.
- [Supabase: Changelog](https://supabase.com/changelog) er konsultert som aktuell dokumentasjonsinngang. Markdown-endepunktet kunne ikke leses av nettverktøyet; HTML-inngangen ble brukt. Ingen leverandøroppgradering er foreslått eller utført som del av denne kontrakten.

**Rapport til 00:** RED-005A v1.1 er levert som den bestilte samordnede dokumentasjonsrevisjonen. 00 skal nå kontrollere kravinnarbeidingen og ta kontrakts-/RED-005B-beslutningen under G0. Ingen implementering eller database-/Auth-fullmakt følger av denne leveransen. Ingen eiergodkjenning, RLS-/backendendring, push, merge eller deploy er utført.

## 15. Endringslogg – v1.0-grunnlag til v1.1

| Endring | Hva som faktisk er endret i dokumentet | Begrunnelse |
| --- | --- | --- |
| V11-01 | Tittel/header er eksplisitt versjonert 1.1. §0 dokumenterer at originalen ikke var revidert, og oppgir de faktiske kontrollrapportene med turn-ID. | Unngår å sende v1.0 tilbake som om v1.1 allerede var levert; sporbarhet til 00/03/04/05. |
| V11-02 | §9.1 krever kontrollørmandat, kompetanse-/scopegrunnlag, faktisk utførte handlinger, resultat, avgrensninger og korrekt skille mellom teknisk validering og faglig sannhet. | RED005A-03-K01; F03. |
| V11-03 | §9.2 krever vurdert kildeautoritet, relevans, versjon, faktisk støtte og behandling av motstrid/forbehold, i tillegg til F02s konkrete passasje-/plassering. | RED005A-03-K02; F02. |
| V11-04 | §9.3 krever eksplisitt vurdert bearbeiding, oversettelse, redistribusjon og NB/EN-bruk; ukjent/omstridt rett blokkerer uavhengig av filhash. | RED005A-03-K03; F01. |
| V11-05 | §7.4 gir eget spor for fag-/rettighetsbevis tilbakekalt uten tekstendring, avhengig eierinvalidering, bevart historikk og krav om ny beslutning ved ny kontrollpakke. Nye hendelsestyper presiseres i §7.3. | RED005A-03-K04; F04; 05s tilbakekallingskrav. |
| V11-06 | §4.1 beskriver konkret foreslått serverobservert challenge/verify og privat, mål-/sesjonsbundet engangs step-up-kvittering, uten å påstå at den er implementert. | 05-S02; AAL2 alene er ikke en ny personlig transaksjonsbekreftelse. |
| V11-07 | §9.5 beskriver normal eierflyt uten obligatorisk JSON-/hash-/RPC-håndtering og med tydelige avbrudd-, feil- og serverstatuser. | 04s produktforutsetning 7 og 00s v1.1-ordre. |
| V11-08 | OA-01–OA-20 beholdes. OA-21–OA-28 tilføyes for nye fagkrav, fersk step-up, fortsatt legitim save, forståelig UX og serverstengt publisering. Kritiske NO-GO-regler tydeliggjøres. | Samlet etterprøvbarhet; syntaktiske og manuelle fagtester må ikke blandes. |
| V11-09 | §12 erstatter den korte faseoversikten med trinnvis isolert plan, eksplisitt fullmaktsdeling, skrivegrense, felles beslutningsserialisering, migrering/rollback og åpne mekanismebevis. | 00s bestilling og 05s bindende/fasevilkår. |
| V11-10 | §16 samler alle 15 navngitte/nummererte kjernekrav og 04s syv produktforutsetninger i én matrise. §13 skiller historiske testlogger fra ny dokumentkontroll. | Entydig kravdekning uten å fremstille dokumentasjon som implementerings-GO. |

**Uendret:** eksisterende arkitektur og artikkelmodell, eksakt tuplebinding, separate NB/EN-beslutninger, Git som autoritativ publiseringsgate, stengt første publiseringsfase og forbud mot faktisk implementering i denne ordren. F01–F04 er ikke «nylig løst»; de var allerede normativt dekket og er videreført/presisert. Ingen applikasjonskode, migreringsfil, database, Auth, RLS, backend eller produksjon er endret.

Originaldokumentet bevares som dokumentasjonsbevis, ikke som en konkurrerende kontrakt. Den gjeldende kontrakten er denne filen. Lesbar [før/etter-diff](../test-results/red-005a-v1.1/changes.diff), [revisjonsmanifest](../test-results/red-005a-v1.1/revision-manifest.json) og [dokumentkontroll](../test-results/red-005a-v1.1/coverage-check.md) ligger under `test-results/red-005a-v1.1/`. Original/revidert snapshot og SHA-256 bevares der; snapshots er kontrollbevis, mens denne filen er gjeldende kontrakt.

## 16. Samlet kravmatrise – kontraktsdekning, ikke implementeringsgodkjenning

**Leseregel:** «Innarbeidet» i tabellen betyr normativt innarbeidet i v1.1. Alle faktiske server-/fag-/rettighetsbevis og implementeringsgater er fortsatt utestet/åpne til et særskilt autorisert oppdrag. Ingen rad er lukket i kode av denne revisjonen.

`RED005A-05-S01–S07` er lokale sporbarhetsnavn for **05s avsluttende nummererte bindende liste 1–7**, ikke nye opprinnelige saks-ID-er fra 05. `RED005A-04-P01–P07` er tilsvarende lokale navn for 04s syv produktforutsetninger. 05s supplerende faseoversikt er dekket i §12.3 og portene G1–G5.

| Krav / kilde | V1.0-grunnlag før revisjon | V1.1 – konkret innarbeiding | Påkrevd senere bevis / ansvar |
| --- | --- | --- | --- |
| RED004-F01 / 03, P1 | Dekket i §9 | Videreført i §9; presisert §9.3 med egen rettighetshaver, dokumentert omfang og adskilte bruks-/språkbevis. | OA-15/OA-23, faktisk rettighetskontroll og G3; 03/04/05. |
| RED004-F02 / 03, P1 | Dekket i §9 | Videreført i §9; presisert §9.2 med eksakt påstands-/passasjekobling og faktisk vurdert støtte. | OA-15/OA-22, manuell kildevurdering og G3; 03/04. |
| RED004-F03 / 03, P2 | Lokal checked adskilt i §9 | Skjerpet som ufravikelig gate i §9.1/§9.4: aktivitet er ikke verifisert resultat eller personlig godkjenning. | OA-03/OA-15/OA-21; G3/G5, 03/05. |
| RED004-F04 / 03, P2 | Strukturert lukking/gjenåpning dekket | Videreført i §9 og utvidet §7.4 med avhengigheter, ny attestasjon og tilbakekalling også uten innholdsendring. | OA-09/OA-15/OA-24; G3–G5, 03/05. |
| RED005A-03-K01 / 03, P1 | Identitet/rolle omtalt; eksplisitt faglig autoritetskontrakt manglet | Ny §9.1: mandat, kompetanse-/scopegrunnlag, utførte kontrollhandlinger, resultat og avgrensninger. Teknisk attestasjon er ikke faglig sannhet. | OA-21 og manuell mandat-/fagkontroll før G3; 03/00, teknisk gate 05. |
| RED005A-03-K02 / 03, P1 | Påstand/passasje omtalt; autoritet/relevans/forbehold utilstrekkelig presisert | Ny §9.2: dokumentert kildeautoritet, relevans, versjon, faktisk støtte og behandling av motstridende/uavklart dokumentasjon som avvik. | OA-22, inkludert oppdiktet/irrelevant kilde; 03s manuelle kontroll og G3. |
| RED005A-03-K03 / 03, P1 | Bruksomfang delvis omtalt; de konkrete brukstypene/språkene ikke samlet | Ny §9.3: bearbeiding, oversettelse, redistribusjon, NB/EN, ukjent/omstridt rett som blokkering; filhash alene er ikke bruksrett. | OA-23; faktisk rettighetsvurdering før G3, 03/04. |
| RED005A-03-K04 / 03, P2 | Generisk invalidering/gjenåpning; faglig tilbakekalling uten tekstendring ikke eksplisitt | Ny §7.4 og hendelser i §7.3: tilbakekall konkret bevis, behold historikk, ugyldiggjør avhengig effektiv eierbeslutning uten tekst-save. | OA-24/OA-09/OA-14; G4/G5, 03/05. |
| RED005A-05-S01 / vilkår 1 | Brede privilegier og fremtidig grense beskrevet | Bindende §5.1, §12 A/B/C: inventer og steng **alle** direkte app-skriveveier samtidig som legitim utkastlagring bevares. | OA-06/OA-26; ACL-/RPC-/RLS-/view-/GraphQL-/sekvens-/service-/workerbevis før G2; 05. |
| RED005A-05-S02 / vilkår 2 | AAL2/ferskhet/sesjon krevd, konkret verifikasjonsløp åpent | Ny §4.1: serverobservert ny leverandørverifikasjon, privat engangskvittering, tidspunkt, sesjon og mål; uverifiserbar mekanisme holder funksjonen av. | OA-04/OA-05/OA-13/OA-25, faktisk isolert Auth/API før G4; Codex/05 etter fullmakt. |
| RED005A-05-S03 / vilkår 3 | F01/F02 allerede forutsatt | §9, §9.1–§9.3, §12 G3: F01 og F02 må være løst i modell og kontrollprosess, med verifiserte akseptansebevis, før reell fag-/rettighetsattestasjon. Skjema og testplan alene er ikke nok. | OA-15/OA-22/OA-23; 03/04/05. Bare syntetiske pakker før godkjent reell prosess. |
| RED005A-05-S04 / vilkår 4 | F03/F04 som avhengigheter | §9.4 og §7.4: F03 er obligatorisk gate uansett P2-prioritet; F04 er obligatorisk ved relevante åpne/gjenåpnede avvik. Ingen fritekst-/checked-omgåelse. | OA-03/OA-15/OA-21/OA-24; G3–G5, 03/05. |
| RED005A-05-S05 / vilkår 5 | Serverhash/media/evidence-tuple allerede definert | §3, §7, §12 C: deterministisk/etterprøvbar serverhash, manifest og kontrollpakke; golden vectors, samtidighet og ingen automatisk hashbro. | OA-08–OA-12/OA-16/OA-18/OA-24; G3/G4, 05. |
| RED005A-05-S06 / vilkår 6 | OA-01–OA-20 planlagt, ikke DB-testet | §11/§11.1, §12 G5: negative API-, RLS-, Auth-, samtidighets- og tilbakekallingstester må faktisk bestås i autorisert isolert miljø. Nye OA-21–OA-28 supplerer. | Reelle isolerte logger/SQL-/API-resultater, ikke 35 syntetiske tilstandsflagg; 05. |
| RED005A-05-S07 / vilkår 7 | Serverstengt publisering allerede krevd | §5.2, §8, §12 og OA-28: publiseringsveier stengt **hele første implementeringsfase**, også for eier og tekniske roller. M3.3 og Git-gate beholdes. | OA-17/OA-20/OA-28, negative publish-/artefakttester ved hver fase; 05/00. |
| RED005A-04-P01 / forutsetning 1 | Servergrense beskrevet | §5.1 og §12 G2; alle databaseskriveveier sikres mot omgåelse. | Samme bevis som S01; ingen backendaktivering før gjennomført test. |
| RED005A-04-P02 / forutsetning 2 | Tuplebinding beskrevet | §3/§4/§7: eksakt artikkel, locale, revisjon, serverhash, media og kontrollpakke. | OA-08/OA-16; 04/05. |
| RED005A-04-P03 / forutsetning 3 | Invalidering beskrevet | §7.2/§7.4: ny innholds-/kontrollversjon arver ikke gammel beslutning. | OA-09/OA-10/OA-12/OA-24; 05. |
| RED005A-04-P04 / forutsetning 4 | Ikke-autoritativ RED-004 dokumentasjon presisert | §9.1/§9.4: lokale registreringer og import gir aldri attestørrolle eller autoritativ godkjenning. | OA-03/OA-15/OA-21; 03/04/05. |
| RED005A-04-P05 / forutsetning 5 | Tilbakekalling/logg omtalt | §7.3/§7.4 og §12 C/F: serverstyrt logg, tilbakekalling, idempotens og bevart historikk. | OA-09/OA-13/OA-14/OA-19/OA-24; 05. |
| RED005A-04-P06 / forutsetning 6 | Skille godkjenning/publisering allerede absolutt | §1/§5.2/§8/§9.5: personlig beslutning publiserer aldri automatisk. | OA-17/OA-28; 04/05/00. |
| RED005A-04-P07 / forutsetning 7 | Teknisk totrinnsflyt, manglet konkret normal UX | Ny §9.5: gjennomgå → frosset versjon → personlig bekreftelse → registrering → tydelig status. Ingen obligatorisk manuell JSON/hash. | OA-27, faktisk senere UX-/tastatur-/mobilkontroll; 04/05. |

### 16.1 Hva er faktisk verifisert ved v1.1-revisjonen?

- Originalfilen er lest og klassifisert mot versjonsmarkør, K-ID-er og samordnet matrise; v1.1 manglet før denne revisjonen.
- De faktiske rapportene fra 00, 03, 04 og 05 er lest, inkludert 03s fire K-krav og både 05s avsluttende nummererte sikkerhetsvilkår og faseoversikt.
- Hver av de **15 kjernekravene** og **7 produktforutsetningene** er knyttet til konkret kontraktstekst og et fremtidig kontrollbevis i matrisen over. Dette er en dokumentasjonskontroll av 22 kravrader, ikke 22 beståtte implementeringstester.
- Det er ikke kjørt nye 35-/11-modelltester, bygg-, API-, RLS-, Auth- eller nettlesertester i denne revisjonen. De tidligere 35/35 og 11/11 hører til v1.0-grunnlaget og er bare historisk dokumentasjon.
- Ingen applikasjonskode, SQL, database, Auth, RLS, backend, produksjonsinnstillinger eller Git-ref/commit er endret. Ingen implementering, push, merge eller deploy er startet.

**Entydig overlevering:** V1.1-kravene er innarbeidet i denne kontrakten. Faktisk implementering og fag-/sikkerhetsbevis er fortsatt åpne. Neste handling er at 00 vurderer denne samordnede revisjonen for kontraktslukking og eventuell ny RED-005B-ordre. Opprettelse/endring av database, Auth eller skyressurser krever fremdeles separat, uttrykkelig prosjekteierfullmakt.
