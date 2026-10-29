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
# A readable shared type scale must be present in the published styles and work for EN.
css = (dist / "design-system.css").read_text(encoding="utf-8")
for rule in (
    "--modus-reading-body:16px", "--modus-reading-secondary:14px",
    "--modus-reading-label:12px", ".reading-body p", ".article-card p",
    ".path-card p", ".topic-tabs small", ".map-copy",
    ".student-info-trigger", ".site-header .nav-panel small",
):
    # The last example belongs to membership.css; all others to shared styles.
    text = (dist / "membership.css").read_text(encoding="utf-8") if rule == ".student-info-trigger" else css
    assert rule in text, f"Missing readable typography coverage: {rule}"
assert (dist / "en" / "design-system.css").is_file(), "English site missing readable shared styles"
assert (dist / "en" / "design-system.css").read_bytes() == (dist / "design-system.css").read_bytes(), "English type scale differs"
print("MODUS design-system integration and page styles verified.")
