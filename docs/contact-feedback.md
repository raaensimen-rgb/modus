# Kontakt MODUS — visitor feedback (preview)

The floating widget is added to public HTML during `scripts/sync-navigation.py` via `scripts/site_navigation.py`. Source assets: `feedback.js` and `feedback.css`. Article pages and the English mirror inherit this integration.

Feedback is inserted through the Supabase REST Data API into `public.modus_feedback` using the publishable key. The private inbox is in `/redaktor.html`, using the existing editor Supabase authentication session, `cms_editors` role check and PostgreSQL RLS. Editor actions: read latest 100 submissions and change status between new, in_progress, resolved. Anonymous users can only insert the permitted columns.

Database migration applied to MODUS Supabase on 2026-10-29: `create_modus_feedback_inbox`. Database RLS verified: anonymous SELECT denied, anonymous insertion permitted on selected fields, status field insertion denied. A rolled-back anonymous-role insert was successful.

Important before public release:
- Validate the Cloudflare Preview build and submit a real end-to-end test via the browser.
- Add server-side spam protection (Cloudflare Turnstile / request rate limiting). The current hidden honeypot and one-minute browser cooldown provide usability deterrence only and are bypassable.
- Consider adding retention/deletion rules for messages and optional email addresses, and update the site's privacy notice.
- Do not publish this branch to main until reviewed.
