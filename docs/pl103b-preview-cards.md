# PL-103B – 16 metadata cards in isolated Preview

Order: https://github.com/raaensimen-rgb/modus/issues/42#issuecomment-6557889070

The decision authorizes the existing 16 titles, levels and categories in NB/EN, pinned to the review matrix at a80851bab91359ba9e1f79b5c3d27a0e79c1a5e9. It does not authorize any full text or production publication. Source articles, quiz payloads, editorial status, personal mastery and source-control approvals are unchanged.

## Output and permissions

`content/article-card-permissions.json` is an internal policy, never deployed. Each slug has separate NB/EN digests for exactly slug/title/level/category/level_label/category_label. Values come from existing article and translation inputs. New or changed metadata defaults to hidden. Missing EN metadata denies that card rather than falling back to an unapproved language. No prose, intro, teaser, exercise, private illustration, approval matrix or article JSON is rendered.

The minimal catalog extract is server-rendered directly into HTML. There is no separate public article-data JSON file. Cards are semantic articles with a title heading, level/category and Under arbeid / In progress. They have no link, button, event handler, focus stop or illustration. Keyboard users navigate search/filter/group controls; cards are readable with screen-reader browse navigation. Clicking a card cannot open private text.

Existing library grouping, local title/category/level search, clear/reset, empty results and responsive grid are retained. Metadata cards are separate from `.article-card` and `data-article-id`; account/quiz code cannot mistake them for readable articles or record completion. Public CMS seed and global article search remain empty. Direct private routes still return a generic holding page; HTTP 200 is not interpreted as content permission. Cloudflare may return a homepage fallback for absent files, so remote QA checks content rather than status alone.

## Preview-only build context

Default build: no metadata cards. Explicit main branch or production context: no cards even if a local flag is present. Isolated CI can opt in with `MODUS_CATALOG_PREVIEW=1`; the workflow sets it only for PR builds. Cloudflare's existing isolated routine uses `CF_PAGES=1` and an exact branch allowlist: `fix/pl103b-preview-cards` or `test/pl101-visibility-integration`. No production setting, deploy hook or account permission is changed. Granting full-text permission later is a separate decision.

## Tests and QA

Run `MODUS_CATALOG_PREVIEW=1 npm run build` then `MODUS_CATALOG_PREVIEW=1 npm test`. Test catalog policy fields/digests, default/main/unapproved branch denial, 16 NB + 16 EN cards, exact headings/taxonomy, passive semantics, changed/new titles, missing EN proof and all 16 preserved source texts. Publication tests rebuild from stale Preview output in main context to confirm cards disappear and full texts remain private. Existing clean/dirty canaries cover all output resources.

Publication browser suite: Chromium/WebKit × 375/1440 CSS px × NB/EN, title/category search, no-match/reset, grouping, keyboard focus, grid columns, CSS zoom 200%, non-clickable titles, seed and private routes. Existing release/piano/audio suites remain. Combined candidate additionally runs PL-101 journey regressions and exports screenshots/results.

01: assess static-card design and title wrapping on Mac/iPhone. 02: review exact metadata scope, language/version binding and source preservation. 07: independently verify latest exact deployment, 16 cards/0 full texts per locale, actual Safari/VoiceOver/browser zoom and no manuscript exposure. Automated WebKit/CSS zoom is not a claim of native Safari/manual accessibility approval.

Main, PR #43/#44/#45/#47 and Studio are not changed. Implementation is a separate stacked Draft-PR on #47; the combined #46 receives only the same reviewed source changes, preserving its journey hooks. No merge or production deployment.
