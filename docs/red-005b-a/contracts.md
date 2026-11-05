# RED-005B-A – server-/klientkontrakt, ikke implementert

Styrende: RED-005A v1.1, særlig §§3–9 og 12. Forberedelse 03.11.2026. Ingen endepunkter, roller eller Auth-funksjoner her er aktive. Det godkjente v1.1-dokumentet endres ikke; formuleringen der om at RED-005B ikke var autorisert beskriver den tidligere oppgaven. Nåværende fullmakt dekker B-A-forberedelse, ikke G1 eller aktiv implementering.

## Datakontrakt og eksakt versjon

`TargetV1` består av `repository_scope='raaensimen-rgb/modus'`, `slug`, eksplisitt `locale=nb|en`, positiv `revision`, `hash_algorithm='modus-owner-snapshot-v1'`, `content_sha256`, `content_schema_version`, `render_contract_version`, `media_manifest_sha256`, `review_bundle_id`, `review_bundle_sha256`, positiv `owner_binding_version`. Serveren fyller feltene fra privat, uforanderlig snapshot og gjeldende binding/bevis. Klientens eventuelle forventede verdier er sammenligningsgrunnlag, aldri sannhetskilde. Ingen NB→EN-arv. Ny revisjon med identiske bytes krever ny eierbeslutning.

Hashprototypen i `model.py` definerer **kandidatvektorer**, ikke en ferdig SQL-kanonisering: UTF-8, rekursivt ASCII-sorterte skjema-nøkler, kompakt JSON, arrayrekkefølge bevart, ingen Unicode-normalisering, ingen flyttall/ugyldige surrogater/U+0000, heltall innen ±(2^53−1). JSON-escaping må gi samme bytes i SQL og JS. Ukjente innholdsnøkler avvises. Kandidaten inkluderer eksakte lagrede strenger for slug/locale, tittel/intro, nivå/kategori/topic, seksjoner, øvelse/praksis, bilde-src/alt, quiz og læringsmetadata. Bare eksplisitt `_ui` utelates i syntetisk fixture. Produksjonens payload må ha en separat godkjent allowlist; ingen rå nettleserstatus skal legges i innholdet.

Hash-envelope: `{domain,content_schema_version,render_contract_version,content,media_manifest}`. Mediemanifest binder ordnet ressursidentitet, uforanderlig versjon og bytes-SHA-256; tom manifest er bare lov når ingen ressurser brukes. Eksterne/resolver-uverifiserte bytes gjør godkjenning utilgjengelig, men må ikke blokkere lagring av et uferdig utkast. Ingen vilkårlig URL-henting/SSRF. Legacy-/ukjent payload kan lagres som eksisterende utkast, men merkes `unsupported` for godkjenning. Ingen stille normalisering eller oppdiktet historisk aktør. Gjeldende normalisering/sanitization i CMS erstattes ikke av prototypen.

Git-`article_text_version`, RED-004-`modus-editor-content-v1` og serverhash er tre forskjellige domener. Kandidatvektorene er ikke bevis på ekvivalens med noen av dem. Fremtidig SQL↔JS-bytesamsvar og separat server↔Git-adapter må godkjennes og testes.

## Fremtidige operasjoner

Alle ruter er **forslag**, ikke registrerte URL-er. JSON-felter utenfor kontrakten avvises. TLS, eksplisitt tillatt origin, korrekt CSRF-beskyttelse ved cookies, `Cache-Control: no-store`, begrenset requeststørrelse/rate og ingen token-/nonce-/kode-logging kreves. Ingen generisk service-role/SQL-proxy.

| Operasjon | Klientinput | Serverkrav og resultat |
| --- | --- | --- |
| Eksisterende `cms_save_draft` | Samme fire parametre og heltallsresultat som nå | Identifisert, aktivert redaktør; ikke anonym Auth eller servicekonto. Samme expected_revision, 40001 ved konflikt. Lagre utkast/historikk/snapshot/event atomisk under scope-lås. Behold ufullstendige utkast. Ingen MFA kreves for vanlig save; eksisterende lokal kvotefeil, eksport og eksplisitt gjenoppretting beholdes. |
| `owner.prepare` | `{slug,locale,expected_revision,purpose}`; ved revoke også `approval_id` | Verifisert aktiv personlig eier. Frys eksakt TargetV1 fra server. Approve krever komplett gyldig kontrollpakke; revoke laster gammel beslutning og krever ikke fortsatt innhold-/bevisgyldighet. Servergenerert ≥128-bit tilfeldig nonce, bare hash lagres, UUID-challenge og ≤5 min utløp, bundet actor/session/epoch/purpose/target. Manglende konfigurasjon gir 503. |
| `owner.step_up` | `{challenge_id,factor_id,code}` over verifisert servergate | Gate oppretter NY provider-MFA-challenge etter prepare, sjekker faktoreierskap og verifiserer resultat gjennom betrodd Auth-grense. Sig/issuer/aud/prosjekt/UUID/AAL2/session sjekkes. Privat receipt binder provider-challenge, prepare, target, epoch, session og serverklokke. Kode/nonce/token lagres aldri i logger/payload. Klienten kan ikke lage receipt. Sesjonsrotasjon starter ny prepare. Provider/API-tilpasningen er uimplementert og må bevises i isolert Auth. |
| `owner.confirm` | `{challenge_id,receipt_id,nonce,request_id}` | Ingen actor/hash/approved/time-parametre. Ny validering av personlig identitet, aktiv sesjon og binding; scope-lås; ny lesing av mål og bevis; fersk, uforbrukt receipt og nonce. Atomisk event + consumption + idempotens. Returner `operation_id`, historisk utfall og **nåværende** effektiv status, aldri en cachet grønn status. |
| `owner.revoke` | Samme confirmation-kontrakt etter prepare(purpose=revoke) | Samme personlige MFA-/sesjonsgrense; eksplisitt gammel approval_id fra frosset mål. Tillat tilbakekalling selv om teksten/R/bevis/lisens senere er endret. Sikkerhetsadmin kan fryse/øke epoch, men ikke utgi seg for personlig eier. |
| `owner.operation` | `{request_id}` | Bare egen autorisert operasjon; privat. Etter timeout gjøres oppslag, ikke automatisk ny approve. Samme request-ID/annet mål avvises; identisk retry gir samme referanse og oppdatert gyldighet, også etter revoke. |
| `review.attest/revoke/replace/reopen` | Referanser til serverfrosset mål, mandat og strukturert kontrollpakke | Egen smal kapabilitet, kontrollørmandat i live register, faglig scope/språk/varighet. Nytt bevis/bundle-ID ved erstatning. Gjenåpning eller tilbakekalling ugyldiggjør umiddelbart avhengige beslutninger uten tekstendring eller lagring. Ingen ny attestasjon bare fordi lokal RED-004 har `checked`. |

HTTP 401 ugyldig/manglende autentisering; 403 manglende autorisasjon; 409 stale target/idempotenskonflikt; 422 ufullstendig/ugyldig kontrollgrunnlag; 503 ukjent/nede sikkerhetsavhengighet. SQL 40001 må fortsatt håndteres uten automatisk rebase i eksisterende save. Maskerte feil, ingen private notater eller SQL-detaljer i offentlige svar.

## Rolle- og kapabilitetsgrense

`modus_oa_owner`: NOLOGIN/NOBYPASSRLS, bare eier av private objekter, aldri appmedlemskap. Tre atskilte NOLOGIN/NOBYPASSRLS-executors for draft, decision og receipt er **kandidatnavn**, ingen roller opprettes nå. Ingen executor eier tabeller. Private begrensede SECURITY DEFINER-funksjoner må ha tom search_path, fullt kvalifiserte objekter, egen aktørkontroll også ved direkte kall, eksplisitt REVOKE EXECUTE og smal ACL/RLS. Offentlig fasade er SECURITY INVOKER. Man kan ikke bare endre eksisterende save til definer eid av postgres.

Approller får aldri direkte DML på snapshot/bundle/challenge/receipt/event/binding. Draft-executor får bare nødvendig draft/historikk/snapshot/event-skriving. Decision-executor kan forbruke challenge/receipt og append events, ikke endre innhold, owner binding, bevis eller publikasjoner. Receipt-executor kan bare registrere serververifisert kvittering via betrodd gate; ingen personlig godkjenningskompetanse. Anon/general/editor/service/riktig e-post med feil UUID kan ikke approve. Reviewer og eier er separate mandater; ingen automatisk editor-rolle til eier.

Direkte DML, kolonnegrants, sekvenser, gamle RPC-overlastinger, PUBLIC/defaultprivilegier, rollearv/SET ROLE, views/rules/GraphQL, jobber/triggere og alternative workers må inventeres. Faktiske eksisterende privileges er ikke tilgjengelige uten database og er derfor en blokkerende senere port. Managed admin/superuser kan ikke teknisk fratas all makt; de er betrodde driftsaktører, aldri bevis for personlig eierhandling.

## Atomicitet, lagring og invalidering

Én `scope_guard`-rad for repository-scope låses med SELECT FOR UPDATE før autorisasjons-/målavlesning i alle mutasjoner: save, bind/freeze, bevis/mandat/medierettigheter, prepare, receipt, approve og revoke. Deretter fast låseorden: scope → gjeldende draft/snapshot → bundle/mandat → challenge/receipt → idempotens/event. Ingen ekstern Auth-/mediehenting under en lang database-transaksjon; kortlivet betrodd Auth-resultat revalideres ved dokumentert beslutningspunkt. Samtidig provider-logout er **ikke** automatisk atomisk med Postgres; isolert Auth-test må dokumentere grensen og fail-closed løsning før GO.

Effektiv approval utledes på brukstidspunktet fra eksakt gjeldende revisjon/hash/media/bundle/epoch og ingen revoke/finding/mandatendring som bryter grunnlaget. Et nyinnsatt event eller gammel cache er ikke godkjenning. Immutable snapshots/bevis/events kan ikke oppdateres/slettes av app/executors; actorhistorikk bevares uten auth.users cascade. Bare consumed_at kan endres kontrollert på engangsobjekter. Ingen aktiv eier seedes, ingen historiske rader backfilles som godkjent.

Eksisterende delt repository-utkastlagring beholdes; dette oppdraget innfører ikke forfatterprivate kontoer. Direkte DML-revokering og ny gjennomgått save-fasade skal skje i **samme fremtidige transaksjon**, uten åpen mellomfase. Før godkjent cutover må legitim redaktør-save og RED-002A-konflikt/kvote/gjenoppretting bestå. Stubben i SQL-utkastet er bevisst ikke koblet til fasaden og kan ikke brukes som fungerende migrering.

## Faglige kontrollpakker

F01: ressurs, creator **og** rights_holder, identifiserbar lisens-/rettighetsdokumentasjon, assetversjon/hash, kreditering, tids-/territorie-/bruksomfang. K03 inkluderer eksplisitt bearbeiding, oversettelse og redistribusjon per NB/EN; ukjent/omstridt blokkerer.

F02: stabil claim-ID, konkret passasjehash, avsnitt/plassering, kildeversjon og locator (side/tidskode). K02 krever faktisk vurdert autoritet/relevans/støtte/motstrid/forbehold; en fin URL beviser ikke sannhet.

F03/K01: lokal aktivitet er aldri attestasjon; live mandat/kompetanse/scope/språk/utløp, utførte handlinger, resultater pass/fail/needs_correction/not_assessed og begrensninger. Full pass kan ikke utledes av ufullstendig omfang. 03 må kontrollere faglig sannhet manuelt, ikke bare strukturfelt.

F04/K04: funn med ID/alvorlighet/status/ansvarlig/begrunnelse/løsning/verifisert lukking og gjenåpning. Endring/revokering av kontrollbevis ugyldiggjør straks avhengige beslutninger selv ved identisk artikkelhash/R. Tomt register beviser ikke at ingen funn finnes. Nye bevis krever ny personlig bekreftelse.

## Klientflyt og publikasjon

Fremtidig normalflyt: «Kontroller lagret versjon» → «Bekreft personlig» → ny MFA → «Registrer beslutning». Detaljer om hash/revisjon er valgfrie. Endringer som ikke er lagret må avklares før prepare; ingen skjult save mellom bekreftelse og beslutning. Avbryt, utløp, konflikt og usikkert utfall gir forståelig status uten suksessfarge; tastatur/fokus/live region testes på NO/EN og mobil senere. Ingen endring i eksisterende design nå.

**Hele første fase:** ingen `cms_publish_article`, publikasjonstabell-DML, automatisk Git-skriving, aktiv Worker eller release. Backendpublisering sperres på server i senere cutover for ALLE approller, eier og tekniske kontoer. Git-gaten er fortsatt autoritativ og må bestås separat; ingen servergodkjenning gir automatisk publisering. M3.3-Preview skal fortsatt være uten denne backendflaten og uten private seed/notater. Ingen utkast i denne mappen inngår i dist.

Audit: DRAFT_SAVED, OWNER_APPROVED, APPROVAL_INVALIDATED, OWNER_REVOKED, OWNER_BINDING_DISABLED, REVIEW_ATTESTED, REVIEW_REVOKED, REVIEW_REPLACED og FINDING_REOPENED. Suksessjournal atomisk med tilstand; journalfeil gir rollback. INSERT etterfulgt av RAISE i samme transaksjon er **ikke varig avvisningslogg**. Avvisninger logges uten sensitive felt gjennom separat betrodd logger, ikke klienten. Utilgjengelig nødvendig audit gir fail closed.
