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
PAGES = ("index.html", "teori.html", "akkorder.html", "backingtracks.html", "modus-plus.html", "laer-dorisk.html", "om-modus.html")
STYLES = ("home.css", "style.css", "design-system.css")

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
    for name in (*PAGES, *STYLES):
        shutil.copy2(ROOT / name, DIST / name)
    print("MODUS source pages and shared styles synced to dist.")
