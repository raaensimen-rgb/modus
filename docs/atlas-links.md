# PL-066 – Atlas link registry (phase 1)

`content/atlas-links.json` is **editorial content metadata**, not progression or competence evidence.

- `schema_version: 1` identifies the registry format.
- `modules` preserves all 24 canonical module IDs. Each module provides `topics: []` and `lessons: []` as future editorial reference slots. A future topic should have a stable ID such as `A01.S01`, a `module_id`, and article/lesson references, but must be approved by subject review before being registered.
- `articles` contains 16 published article slugs and their **unchanged** existing module links from `musikkart.js`.
- `pending_articles` contains five planned slugs with `module_id: null` and `approval: awaiting_subject_review`. Do not assign module IDs without a documented decision from 03 – Musikkteori og faginnhold.

## Registering a future article

1. Add/review the article in the existing article CMS/content pipeline, retaining its stable `slug`.
2. Obtain subject-area approval of the module/topic association and document it in the relevant project work order.
3. Move the entry from `pending_articles` to `articles` **only after publication** and confirm its approved `module_id`. Use a stable existing module ID; add any approved topic/lesson references separately.
4. In a subsequent **separately approved integration phase**, reconcile the registry with the current runtime `articleModules` mapping without changing saved `modus-musikkart-v1` values. Phase 1 does not wire the registry into browser runtime.
5. Run `npm run build && npm test`. `tests/atlas-links.py` validates module IDs, published references, pending references and isolation from progression; `tests/music-map-reset.cjs` validates persisted reset and quiz preservation.

## Progression and safety

Never write the registry into localStorage or infer assessed competence from opening an article, passing a quiz, or self-assessment. The current personal mark key `modus-musikkart-v1`, article evidence and quiz keys are unchanged; existing exporter, `save()`, and reset function remain untouched. Future undertopic progress would require a separately approved data model, storage key, privacy review, migration/progression-protection tests and explicit QA.

The existing renderer still uses its hardcoded `articleModules` mapping. This is intentional in phase 1: the register is validated but **not yet used to compute visual progression**.
