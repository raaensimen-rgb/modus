# MODUS article editor

Entry: `/redaktor.html`. The Norwegian editor manages Norwegian and English independently.

- Preview mode stores drafts only in this browser and cannot publish.
- Supabase email/password authentication uses a separate editor session. Public learner account registration remains disabled.
- Accounts never become editors merely by signing up. Once the owner has verified their email and supplied their own displayed user UUID, an administrator explicitly inserts that UUID into `public.cms_editors`. Never use user-editable metadata for this grant.
- No administrator account or password is provisioned by this change. Authenticated cloud saving/publishing must be tested with the owner's session after access is granted.

## Content and publishing

`cms_article_drafts` contains private work. `cms_article_history` snapshots each cloud save. `cms_article_publications` contains only public snapshots. All tables have RLS. The save/publish functions run with caller privileges, not SECURITY DEFINER. Optimistic revision checks reject an old tab overwriting a newer draft. There is no delete action in this first version.

The 13 existing articles in both languages are imported from the current published source into a public, generated `cms-seed.json`. They are not silently republished. The first cloud save creates a draft; publication updates only that language. Existing slug and quiz completion IDs are preserved. New articles use the same three-question quiz structure. Images can be selected from the existing illustration library; uploads and translation automation are not included.

Cloudflare Pages Functions render public database snapshots on article and library requests. They never query the draft table. Existing articles keep their static fallback if the content service is unavailable. A new article returns 503 during a content-service failure, not an incorrect homepage. No service-role key is included in the browser or function; public rendering uses the publishable key and public RLS SELECT only.

`cms/model.mjs` normalizes article payloads and serializes an HTML allow-list from a parse5 tree. Rich text excludes scripts, event handlers, SVG, embedded frames, arbitrary CSS, forms and unsafe URLs. Preview is sandboxed and cannot access the parent editor's session or storage.

CMS publications are stored in Supabase, **not** committed back into `content/articles.json`. A GitHub rollback does not revert database content. Back up the CMS tables as part of database backup, and use the editor's JSON download for an individual draft. Keep the static files and generators for initial imports and outage fallback.

## Setup and validation

The schema is in `supabase/schema/article-editor.sql`. It has already been applied to the MODUS project. Do not rerun it blindly. No editor grants have been created. After verification of the owner's UUID, use a parameterized insert into `cms_editors(user_id)`; ordinary clients have no INSERT/UPDATE permission on this table.

Build with `npm run build`, then `npm test`. Cloudflare's existing pre-copy build command remains valid. The build creates `dist/redaktor.html`, `dist/editor.js`, `dist/cms-seed.json`, `dist/_routes.json`, `dist/_headers`, and the bundled `functions/_middleware.js`. Commit the source wrapper for the function; the build replaces it with the bundle.

Validated: original site checks, 26 imports, rich-text sanitization, quiz validation, publication routing, static fallback, and rejection of unprivileged writes. Security advisors returned no notices. Authenticated save/publish and email delivery require owner-account setup before claiming full end-to-end readiness.
