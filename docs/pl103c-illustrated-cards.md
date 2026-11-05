> Historisk dokument. For de 16 eksisterende artiklene erstatter prosjekteierbeslutning MODUS 2.0 – 08, 05.11.2026, tidligere sperrer og krav om ny eierbekreftelse. Se [gjeldende beslutning](modus-08-owner-decision.md) og AGENTS.md. Uvalgte utkast og uautoriserte versjoner omfattes ikke av dette unntaket.

# PL-103C – Existing illustrated cards in isolated Preview

## Scope and authorization
Direct owner instruction is recorded in Issue #42, comment 6558266639. Reuse the earlier illustrated card composition and existing illustrations in Norwegian and English. Keep Under arbeid / In progress, passive cards and private full texts. No merge, main change or production deployment; PR #43 is untouched and Studio remains paused.

This change is stacked on PR #48 (1174b5a2e6f04147565d628873f60c90cf0b72cd). The combined test candidate remains PR #46. Earlier reports describe earlier builds; illustration authorization applies to this revision only.

## Implementation
- Restore the existing card sequence: level/status row, illustration panel, category, complete title. Reuse site colors and typography. Natural text height, contained SVG proportions and a single column at narrow widths avoid fixed empty title areas.
- Preserve all 16 existing SVGs per language byte for byte. Norwegian files match the existing generator output; English files reuse the earlier translated compiled assets. No new illustration or article prose is generated.
- Store protected source images under editorial/catalog-illustrations/{nb,en}; only exact independently approved image hashes enter an enabled isolated Preview. Policy/source directories are not deployed. Separate per-language illustration permission does not approve a manuscript, teaser, quiz or article full text.
- Metadata permission and all full-text gates stay in force. Default, main and production contexts do not expose these Preview cards/images. Changed image bytes or incorrect approval references fail closed.
- Card illustration is decorative (empty alt) next to the complete accessible title. There is no card link, button, click handler or added keyboard focus stop. Search, filters, grouping and reset remain available.
- content/articles.json stays byte-identical: SHA-256 7a56d5fe2ca3100142c888b7ecf4e4102aef27c0c03edcfdac2a08a259d39d11.

## Validation and QA evidence
Local full build and existing automated checks run for both isolated and combined sources. CI adds Chromium/WebKit at 375 and 1440 CSS pixels in both languages, loading all 32 illustrations, testing passive title/image clicks, search/filter/reset, grid/reflow and CSS zoom 200%. It captures focused card and full-page screenshots. Existing release, piano and audio-signal tests are retained; the combined candidate also retains the PL-101 journey tests.

Publication tests check version/hash boundaries, source preservation, default/production exclusion, direct holding routes, empty public CMS seed, absence of private source files, and private text/canaries. Artifact manifests permit verification of exact deployed-build candidates. CI artifacts are not a remote byte-for-byte deployment attestation.

01: compare reused illustrations, spacing and complete titles on Mac/iPhone. 02: inspect independent metadata/image/full-text permissions and unchanged article model. 07: independent visual, keyboard/VoiceOver and actual Safari browser-zoom QA on the new exact Preview. CSS zoom and automated WebKit are not manual iPhone/Safari approval. No new release GO is implied.

Exact commits, CI results, Preview URL/deployment and remaining limitations are reported in Issue #42 and #28 after validation. No routine intermediate approval is required for this authorized Preview work.
