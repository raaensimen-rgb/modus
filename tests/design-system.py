"""Verify critical MODUS design assets survive the Cloudflare build."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
pages = (
    "index.html", "teori.html", "akkorder.html", "backingtracks.html",
    "artikler.html", "modus-plus.html", "laer-dorisk.html", "om-modus.html",
)
assert (dist / "design-system.css").is_file(), "Missing public design system CSS"
for name in pages:
    page = dist / name
    assert page.is_file(), f"Missing published page: {name}"
    html = page.read_text(encoding="utf-8")
    assert html.count('href="design-system.css"') == 1, f"Missing or duplicate design link: {name}"
    for asset in re.findall(r'<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"', html):
        if not asset.startswith(("http:", "https:", "/")):
            clean = asset.split("?", 1)[0].split("#", 1)[0]
            assert (page.parent / clean).is_file(), f"Stylesheet not published: {name} -> {clean}"
print("MODUS design-system integration and page styles verified.")
