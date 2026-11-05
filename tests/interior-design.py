"""Public shell scope, nested asset paths and idempotent build regression."""
from pathlib import Path
import sys, re
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from interior_design import header_css
from site_navigation import apply_navigation
css=header_css((ROOT/'home-2.css').read_text())
assert (ROOT/'dist/interior-header.css').read_text()==css
assert '.modus-home' not in css and '.hero' not in css
assert '.modus-interior .site-header' in css
sample='@media(min-width:700px){.modus-home .site-header{background:url("data:image/svg+xml,{x}")}.modus-home .hero{color:red}}.home-wordmark{color:green}'
filtered=header_css(sample)
assert 'color:red' not in filtered and '{x}' in filtered and '@media' in filtered
assert '.modus-interior .home-wordmark' in filtered
for page in (ROOT/'dist').rglob('*.html'):
    if page.name in ('index.html','redaktor.html'):
        continue
    html=page.read_text()
    assert 'modus-interior' in html, page
    assert html.count('class="home-control-icon"')==6, page
    assert '🇳🇴' not in html and '🇬🇧' not in html, page
    assert html.count('class="interior-skip"')==1, page
    main=re.search(r'<main\b[^>]*>',html)[0]
    assert 'tabindex="-1"' in main, page
    assert len(re.findall(r'href="(?:\.\./)?interior-2\.[a-f0-9]{10}\.css"',html))==1, page
    if page.parent.name=='artikler':
        assert 'src="../images/modus-design-diamond.svg"' in html, page
source=(ROOT/'teori.html').read_text()
once=apply_navigation(source,'theory')
twice=apply_navigation(once,'theory')
assert once.split('<body',1)[1]==twice.split('<body',1)[1], 'Repeated builds must preserve body and identity'
assert once.count('interior-2.')==twice.count('interior-2.')==1
print('Shared interior CSS excludes hero; all public pages, nested links and repeat builds verified.')
