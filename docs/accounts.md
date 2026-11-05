# MODUS accounts

Prepared integration for Supabase project `kwwsixmsdsilwcwpdbtc` (MODUS, organization Modus, Stockholm). The existing Site remains public. A visual account preview is published with accountsEnabled=false. Authentication and registration remain disabled until email and redirects are configured.

## Implemented

- Norwegian and English account page (`konto.html`) with email/password sign-in, registration and password reset.
- Pinned Supabase JS SDK, bundled locally; only the publishable key is in client configuration.
- Per-user quiz progress protected by Postgres row-level security. Guests retain device-local progress.
- Signed-in progress caches and offline pending writes are separated by user ID.
- Old guest completions are imported only after an explicit action. An import never runs automatically on sign-in.
- No payment or membership rights are derived from quiz completion. These are self-assessment records, not certifications.

## Required before enabling accounts

The Supabase database and account code exist. Dashboard settings are not configured: the secure browser sign-in request was declined. Do not announce public registration as working until the following is done and verified.

1. In Supabase Authentication > URL Configuration, set the Site URL to `https://modus-jam.raaensimen.chatgpt.site/konto.html`.
2. Allow these exact redirect URLs:
   - `https://modus-jam.raaensimen.chatgpt.site/konto.html`
   - `https://modus-jam.raaensimen.chatgpt.site/en/konto.html`
3. Keep email confirmation enabled. Configure a production SMTP sender before opening registration to the public. Supabase's built-in SMTP only sends to organization team members.
4. Test sign-up, email confirmation, sign-in, password reset and sign-out using a consenting test user. No real emails or passwords were entered during the implementation tests.
5. Confirm a completion is visible on a second device and that another account cannot see it. The database RLS isolation itself has already been verified using rolled-back fixtures.
6. Set accountsEnabled=true, rebuild the account bundle/pages and publish the updated Sites version, then verify the same flow on the hosted origin. If a custom domain is introduced later, update the allowed redirects first and test account email flows again.

## Source and build

`client/account.js` owns session integration and UI. `client/progress-state.js` handles isolated local caches. `client/supabase-config.json` contains public connection settings. `supabase/schema/quiz-progress.sql` matches the remote schema migration `create_user_quiz_progress`.

Run after account source changes:

```
npm ci --no-audit --no-fund
npm run build:account
python scripts/build-account.py
python scripts/sync-navigation.py
python scripts/build-articles.py
python scripts/build-languages.py
```

Checks:

```
python tests/site-structure.py
node tests/languages.cjs
node tests/navigation.cjs
node tests/article-quizzes.cjs
node tests/account-state.cjs
```

`account.<hash>.js` is generated for browser cache invalidation. English pages reuse the same bundle; runtime UI chooses its language from the document. Do not translate or hand-edit the bundled SDK.

## Verified

- 40 pages, navigation, local assets, unique IDs and both locales.
- Quiz grading, guest/account cache isolation, account switching, offline queuing/retry and sign-out transitions.
- SQL transaction: own progress read/write allowed; another user's insert denied; anonymous reads denied; fixtures rolled back.
- Supabase security advisors: no findings after the schema change.
- Desktop and 320px iframe rendering; registration/reset mode changes and no horizontal overflow.

## Not verified

End-to-end email delivery, confirmation redirects, real account creation/sign-in and real cross-device sync. These depend on the remaining dashboard/email configuration.
