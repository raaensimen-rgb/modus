"""Sync the actively maintained MODUS pages into Cloudflare's dist output.

The project keeps source HTML/CSS in the repository root, while Cloudflare
serves dist/. Run before page generation, then run --finish after generated
pages have been written and before English translations are built.
"""
from pathlib import Path
import shutil
import sys
import json
from publication import load_policy, is_public, holding_page

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
# Public frontend assets only. Never copy configuration, source code or secrets.
PUBLIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"}
PUBLIC_ASSET_DIRS = ("images", "audio", "media")

def add_design_link(path):
    if not path.is_file():
        return
    page = path.read_text(encoding="utf-8")
    if 'href="design-system.css"' not in page:
        if "</head>" not in page:
            raise RuntimeError(f"Missing </head> in {path}")
        page = page.replace("</head>", '<link rel="stylesheet" href="design-system.css"></head>', 1)
        path.write_text(page, encoding="utf-8")

if not (ROOT / "media/modus-introduksjon.mp4").is_file():
    raise RuntimeError("Missing approved introduction film: media/modus-introduksjon.mp4")

DIST.mkdir(exist_ok=True)
if "--finish" in sys.argv:
    # The article index is rebuilt from content; preserve its generated markup.
    add_design_link(DIST / "artikler.html")
    print("MODUS shared design system applied to generated article index.")
else:
    # dist is generated, never a source of permission. Remove stale HTML/JSON/JS,
    # including files pre-copied by an older Cloudflare build command.
    policy = load_policy(ROOT)
    shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / 'artikler').mkdir()
    (DIST / 'images/articles').mkdir(parents=True)
    for name in policy.get('platform_pages', []) + policy.get('platform_assets', []):
        if name in ('account.js', 'editor.js'):
            continue  # Rebuilt from current client source; never retain an old bundle.
        source = ROOT / name
        if source.is_file():
            target = DIST / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    for name, record in policy['learning_pages'].items():
        source = ROOT / name
        if is_public(record) and source.is_file():
            shutil.copy2(source, DIST / name)
        else:
            (DIST / name).write_text(holding_page(active='course' if name == 'laer-dorisk.html' else 'path' if name == 'grunnstudier.html' else 'lesson'))
    print("MODUS public frontend pages, styles, scripts, images and audio synced to dist.")
