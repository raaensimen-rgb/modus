"""Sync the actively maintained MODUS pages into Cloudflare's dist output.

The project keeps source HTML/CSS in the repository root, while Cloudflare
serves dist/. Run before page generation, then run --finish after generated
pages have been written and before English translations are built.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
# Public frontend assets only. Never copy configuration, source code or secrets.
PUBLIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"}
PUBLIC_ASSET_DIRS = ("images", "audio")

def add_design_link(path):
    if not path.is_file():
        return
    page = path.read_text(encoding="utf-8")
    if 'href="design-system.css"' not in page:
        if "</head>" not in page:
            raise RuntimeError(f"Missing </head> in {path}")
        page = page.replace("</head>", '<link rel="stylesheet" href="design-system.css"></head>', 1)
        path.write_text(page, encoding="utf-8")

DIST.mkdir(exist_ok=True)
if "--finish" in sys.argv:
    # The article index is rebuilt from content; preserve its generated markup.
    add_design_link(DIST / "artikler.html")
    print("MODUS shared design system applied to generated article index.")
else:
    for source in ROOT.iterdir():
        if source.is_file() and source.suffix.lower() in PUBLIC_EXTENSIONS:
            shutil.copy2(source, DIST / source.name)
    for name in PUBLIC_ASSET_DIRS:
        source = ROOT / name
        if source.is_dir():
            shutil.copytree(source, DIST / name, dirs_exist_ok=True)
    print("MODUS public frontend pages, styles, scripts, images and audio synced to dist.")
