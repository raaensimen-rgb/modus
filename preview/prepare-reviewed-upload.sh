#!/usr/bin/env bash
# LOCAL ONLY: builds, audits and prepares an isolated upload directory. Never deploys.
set -euo pipefail
: "${APPROVED_SHA:?Set the exact source SHA approved for the isolated Preview}"
preview_repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$preview_repo"
test "$(git branch --show-current)" = 'dev/modus-2-pr52'
test "$(git rev-parse HEAD)" = "$APPROVED_SHA"
git diff --quiet HEAD -- . ':!dist'
# Do not inherit release flags or production context from the caller.
unset MODUS_PLATFORM_RELEASE CONTEXT
export MODUS_CATALOG_PREVIEW=1 CF_PAGES=1 CF_PAGES_BRANCH=dev/modus-2-pr52
export MODUS_ISOLATED_PREVIEW=1 MODUS_PREVIEW_PROJECT=modus-2-preview
export CF_PAGES_COMMIT_SHA="$APPROVED_SHA"
npm run build
python3 tests/publication-audit.py
mkdir -p test-results/m3.3
python3 preview/check-preview-artifact.py --expect-sha "$APPROVED_SHA" --report test-results/m3.3/reviewed-upload-gate.json
# The gate refuses ordinary, stale, dirty-source or backend-connected artifacts.
preview_stage=$(mktemp -d "${TMPDIR:-/tmp}/modus-2-preview-upload.XXXXXX")
cp -R dist "$preview_stage/dist"
cp preview/wrangler.preview.toml.example "$preview_stage/wrangler.toml"
cp test-results/m3.3/reviewed-upload-gate.json "$preview_stage/source-and-artifact-manifest.json"
printf 'LOCAL STAGE (not deployed): %s\n' "$preview_stage"
printf 'Source SHA: %s\n' "$APPROVED_SHA"
printf 'Project: modus-2-preview; branch: dev/modus-2-pr52\n'
