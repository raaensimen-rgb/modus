# RED-005B-A – kildeinventar og omgåelsesveier

Baseline `e54572dda08b425301f6943fae54af56f38316eb`, gren dev/modus-2-pr52. Dette er komplett inventar av **lokale deklarasjoner og identifiserte kall**, ikke live databaseprivilegier. Bare to SQL-kildefiler finnes. Ingen forbindelse til DB/Auth er åpnet. Bevismanifest binder de leste filene til faktiske lokale bytes.

| Objekt / vei | Kildedeklarasjon / innringer | Risiko / minste fremtidige tiltak |
| --- | --- | --- |
| cms_editors | article-editor.sql:4–11; RLS, authenticated SELECT egen enabled-rad; ingen app-DML gitt | Adminaktivering i dag. Ingen owner-rolle. Live arv/defaults ukjent. Behold redaktørmodell, egen privat eierbinding med epoke. |
| cms_article_drafts | article-editor.sql:13–22,40–50; authenticated SELECT/INSERT/UPDATE, FOR ALL enabled editor | Alle redaktører deler utkast; direkte insert/update omgår expected_revision/actor/historikk. DELETE-policy finnes logisk i FOR ALL, men DELETE-grant er ikke gitt her. Revoke alle direkte/kolonnewrites, behold guarded save og editor-read. |
| cms_article_publications | article-editor.sql:23–32,44–55; anon/auth SELECT true; editor INSERT/UPDATE | Åpen publiseringsomvei om runtime aktivert. Steng ALLE app-writes og gamle publish-RPC-er, ikke bare knapp. Ingen sletting/produksjonsendring nå. |
| cms_article_history / identity sequence | article-editor.sql:33–39,45–46,57–60; editor SELECT/INSERT, authenticated sequence USAGE | Konstruert historikk mulig direkte. Kun smal draft-executor INSERT/sekvens; append-only og serveraktør i ny sidecar. Manglende saved_by/hash i eksisterende modell. |
| cms_save_draft(text,text,jsonb,integer) | article-editor.sql:62–76; SECURITY INVOKER, search_path='', authenticated EXECUTE, PUBLIC/anon revoke | Optimistisk revisjon + historie atomisk, men direkte DML omgår. Nåværende invoker feiler hvis DML bare revokeres. Samme signatur/return/40001 beholdes med ny guarded kapabilitet og atomisk ACL-cutover. Ingen krav om MFA/komplett artikkel bare for utkast-save. |
| cms_publish_article(text,text,integer) | article-editor.sql:77–104; invoker, editor, revisjon/fullstendighet | Mangler personlig eier, evidence/hash/Git-gate. Skal unconditional deny gjennom hele første fase, alle faktiske overlastinger inventeres senere. |
| quiz_progress | quiz-progress.sql + article-editor.sql:107–113; authenticated SELECT/INSERT own user_id; legacy13 eller public snapshot | Behold legitime progresjonswrites. account.js upsert(ignoreDuplicates) skal ikke gis ny UPDATE som «feilretting». Policy avhenger av publikasjoner; isolert test må bevise legacyprogresjon selv om publish stengt. Ingen owner-grants her. |
| modus_feedback | feedback.js POST; editor.js:119–142 SELECT/status UPDATE; docs/contact-feedback.md beskriver eldre migrering | DDL/migrering mangler i kildekopien. Historisk rapport er IKKE bevis på live RLS/kolonnegrants. Kall kartlagt; krev senere isolert pg_catalog-verifikasjon. Ikke bruk ekte innsending eller endre eksisterende feedback. |
| Konto/Auth | account.js signUp/signInWithPassword/resetPasswordForEmail/updateUser/signOut/getSession/onAuthStateChange; editor.js getUser/access lookup | Ingen MFA/owner-gate finnes. Lokal PKCE-persistent sesjon beviser ikke fersk MFA/aktiv sesjon. Ingen registrering/test mot tjenesten nå. |
| Nettredaktør | editor.js save RPC; confirmPublish gjør save før publish; lokale backups/import/export | Ikke gjenbruk skjult save i ny ownerflyt. Behold RED-002A dirty/kvote/eksport/opprinnelig recovery-R og eksplisitt erstatning; 40001-race må ikke rebases. |
| RED-004 lokalkontroll | review-model.mjs, editor-review.js, editorial/publication/rights-registre | LocalStorage/file import/private context er ikke attestasjon. Lokal checked/JSON og begrensede bilde-/kortrettigheter kan ikke gi full godkjenning. |
| Parkert runtime | cms/middleware.mjs og worker.mjs; anonym REST-publication-lesing | Runtime ville vise backend-snapshots uten Git-gate. Skal forbli parkert; build-editor fjerner Worker/routes, isolated finalizer fjerner editor/SDK/seed. |
| Git-bygg / Preview | publication.py, build-editor.py, build-client.py, preview_mode.py, finalize-publication.py, finalize-preview.py, preview/artifact_boundary.py | Autoritativ Git-policy uendret. Kildedata/private kontrollpakker skal aldri kopieres som generiske assets. Nye docs/sql.txt holdes utenfor dist og byggtest må bevise dette. |
| Asset/HTML-eksport | editor.js fetch preview CSS/quiz/image; editor-review.js begrenset same-origin mediedigest | Eksport er manuell nedlasting av brukerens utkast, ikke publisering. Eksisterende image fetch godtas ikke som betrodd servermanifest. Fremtidig server verifiserer immutable bytes uten vilkårlig URL-fetch. Ingen frontend-fetch endres nå. |

## Hva kildekoden IKKE kan bevise

Ingen lokale CREATE VIEW/TRIGGER/ROLE/ALTER DEFAULT PRIVILEGES eller andre funksjonsoverlastinger er funnet i eksisterende SQL. Det betyr **ikke** at de ikke finnes live. service_role/superuser/tableowner/rolemedlemskap/BYPASSRLS, default ACL for hver creator, kolonnegrants, sekvenser, eksponerte schemas, view/rule/GraphQL, triggers/hooks, scheduled jobs/Edge Functions/storage og eksterne deployer er uverifisert. Det finnes ingen grunnlag for å kalle «alle databaseprivilegier verifisert» uten et autorisert miljøinventar.

`drafts/03-inventory-queries.sql.txt` forbereder read-only katalogspørringer; heller ikke disse er kjørt. Senere inventar må bare inneholde struktur/ACL og maskerte kapabiliteter, aldri ekte tokens/secrets/artikkelpayload. Managed plattformadmin/superuser er eksplisitt betrodd drift, ikke personlig godkjenner.

## Foreslått kontrollpunkt per omgåelse

OA-02/03/04/05/07/25: separat verifisert UUID, live owner epoch, faktisk Auth/MFA/session. OA-06/26: alle direkte/indirekte writes stenges samtidig med legitim save. OA-08–16/21–24: serverfrosset innhold, deterministic hash, fagpakker og tilbakekalling. OA-17/20/28: ingen publiserings-/seed-/runtimeomvei. Alle privilegier må etterprøves gjennom faktisk API og DB-roller i senere isolert miljø; statisk gjennomgang er bare forberedelse.

## Arkiverte og genererte klientbundles

Bredt navnesøk fant også account.js, hashnavngitte account-bundles i rot/en og arkiv under del-1/dist. Disse er eldre klientartefakter, ikke nye databaseprivilegier. Bare eksplisitt tillatte ressurser skal kopieres i offentlig bygg; fullartefaktaudit verifiserer den nye outputen. Arkiverte filer er bevart og skal være med i kildekopiering for korrekt Git-proveniens, selv om rotens genererte dist utelates. Ingen historisk bundle eller brukerfil er ryddet/slettet.
