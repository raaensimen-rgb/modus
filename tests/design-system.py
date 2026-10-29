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
# Only instructional prose is enlarged; avoid globally overriding headings and tiny UI labels.
type_css = (dist / "design-system.css").read_text(encoding="utf-8")
assert "MODUS body-copy readability only" in type_css
for selector in (".article-card p", ".journey-stage p", ".reading-body section>p", ".theory-hero p:last-child", ".path-card p", ".mode-detail p", ".about-reading p", ".map-copy"):
    assert selector in type_css, f"Missing content readability rule: {selector}"
type_rules = type_css.split("MODUS body-copy readability only", 1)[1]
assert "font-size:15px;line-height:1.75" in type_rules
assert "font-size:16px;line-height:1.8" in type_rules
assert "body{font-size:" not in type_rules, "Do not override the site's global font-size"
print("MODUS design-system integration and page styles verified.")
