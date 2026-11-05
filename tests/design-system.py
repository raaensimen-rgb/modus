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
assert "font-size:18px;line-height:1.8" in type_rules
assert "body{font-size:" not in type_rules, "Do not override the site's global font-size"
# Explicitly guard real prose in Musikkatlas and other editorial pages, not headings.
assert ".atlas-intro-heading>p:not(.map-eyebrow)" in type_css, "Atlas explanatory introduction must be covered"
assert "font-size:18px;line-height:1.75" in type_css, "Explanatory prose must meet desktop reading size"
assert ".atlas-intro-step p" in type_css and ".path-card p" in type_css, "Feature descriptions must be covered"
# Article paragraphs, exercises and tables must stay legible at desktop distance.
article_css = (dist / "articles.css").read_text(encoding="utf-8")
assert "Comfortable article reading size" in article_css
assert ".reading-body p," in article_css and ".reading-body li," in article_css
assert "font-size:18px;" in article_css
assert ".reading-body table{font-size:16px" in article_css
assert ".reading-body td,.reading-body th{font-size:15px" in article_css

# Brand consistency: public navigation and the approved PL-ADM-001 geometric editor identity.
assert (dist / "modus-identity-icon.svg").is_file(), "Missing MODUS Safari icon"
assert (dist / "apple-touch-icon.png").is_file(), "Missing Safari favorites touch icon"
assert (dist / "apple-touch-icon.png").stat().st_size > 1000, "Safari favorites touch icon is unexpectedly small"
assert (dist / "modus-arch.svg").is_file(), "Missing primary MODUS Arch asset"
assert (dist / 'images/modus-geometric.svg').is_file(), 'Missing geometric homepage logo'
assert 'gradientUnits="userSpaceOnUse"' in (dist / 'images/modus-waves.svg').read_text(), 'Missing homepage wave gradient'
for name in pages:
    html = (dist / name).read_text(encoding="utf-8")
    assert 'class="brand"' in html, f"Missing public logo: {name}"
    if name == 'index.html':
        assert 'class="home-geometric"' in html and 'class="home-wordmark"' in html, 'Missing homepage identity'
    else:
        assert 'modus-interior' in html, f'Missing shared interior shell: {name}'
        assert 'class="home-geometric"' in html and 'class="home-wordmark"' in html, f'Missing approved public identity: {name}'
        assert re.search(r'interior-header\.[a-f0-9]{10}\.css',html), f'Missing derived header CSS: {name}'
        assert re.search(r'interior-2\.[a-f0-9]{10}\.css',html), f'Missing interior design CSS: {name}'
    assert '<span class="brandmark"' not in html, f"Legacy monogram in primary navigation: {name}"
    assert 'rel="icon" type="image/svg+xml"' in html, f"Missing branded favicon: {name}"
editor = (dist / "redaktor.html").read_text(encoding="utf-8")
assert 'class="brand editor-brand"' in editor, "Editor is missing branded header"
assert '<svg class="modus-mark"' in editor, "Approved administrator geometric mark missing"
assert 'viewBox="0 0 60 60"' in editor, "Incorrect administrator logo geometry"
for path in ('M30 4 40 14 30 24 20 14Z', 'M14 20 24 30 14 40 4 30Z', 'M46 20 56 30 46 40 36 30Z', 'M30 36 40 46 30 56 20 46Z'):
    assert path in editor, "Incomplete approved MODUS geometric mark"
assert 'class="compact-wordmark"' in editor, "Administrator wordmark missing"
assert 'href="modus-identity-icon.svg"' in editor, "Editor favicon missing"
print("MODUS public wordmark, approved administrator geometry and branded icon verified.")

print("MODUS design-system integration and page styles verified.")
