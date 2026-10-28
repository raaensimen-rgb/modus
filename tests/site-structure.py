"""Audit local links, navigation, IDs, translated text and required audio assets."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re, json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'dist'
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.links=[]; self.ids=[]; self.nav=[]; self.active=0; self.in_nav=False; self.skip=0; self.text=[]
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag=='nav' and attrs.get('class')=='site-nav': self.in_nav=True
        if tag=='a' and self.in_nav:
            self.nav.append(attrs.get('href'))
        if tag=='a': self.active += attrs.get('aria-current')=='page'
        if tag in ('script','style'): self.skip+=1
        for key in ('href','src'):
            if key in attrs: self.links.append(attrs[key])
    def handle_endtag(self, tag):
        if tag=='nav': self.in_nav=False
        if tag in ('script','style'): self.skip-=1
    def handle_data(self, value):
        if not self.skip and value.strip(): self.text.append(value.strip())

pages={p.resolve():Page(p.read_text()) for p in ROOT.rglob('*.html') if p.name!='redaktor.html'}
article_count=len(json.loads((ROOT.parent/'content/articles.json').read_text()))
assert len(pages)==2*(article_count+10), f'Unexpected page count: {len(pages)}'
nav=['./','laer-dorisk.html','teori.html','backingtracks.html','akkorder.html','artikler.html','om-modus.html']
for file,page in pages.items():
    assert page.links.count('/redaktor.html')==1, ('editor footer link',file)
    assert len(page.ids)==len(set(page.ids)), ('duplicate ID',file)
    expected=[('../' if link=='./' else '../'+link) for link in nav] if file.parent.name=='artikler' else nav
    assert page.nav==expected, ('navigation mismatch',file,page.nav)
    assert page.active==1, ('active page count',file)
    for link in page.links:
        url=urlsplit(link)
        if url.scheme or url.netloc: continue
        target=(ROOT/url.path.lstrip('/') if url.path.startswith('/') else file.parent/url.path).resolve() if url.path else file
        if target.is_dir(): target=target/'index.html'
        if not target.exists() and not target.suffix: target=target.with_suffix('.html')
        assert target.exists(), ('missing target',file,link)
        if url.fragment and target in pages:
            fragment=unquote(url.fragment)
            # The theory page opens the matching interactive tab via its hash.
            routed=target.name=='teori.html' and fragment in ('akkorder','intervaller','moduser','kadenser')
            assert fragment in pages[target].ids or routed, ('missing anchor',file,link)
for file,page in pages.items():
    if '/en/' in str(file): continue
    translated=pages[ROOT/'en'/file.relative_to(ROOT)]
    common=set(page.text)&set(translated.text)
    leftovers=[s for s in common if len(s)>16 and any(w in s.lower() for w in (' og ',' til ',' med ',' du ','akkord','toneart','æ','å'))]
    assert not leftovers, ('untranslated text',file,leftovers)
for stem,lo,hi in [('piano',48,84),('grand',48,84),('bass',28,64),('jazz-bass',28,64)]:
    for n in range(lo,hi+1,3): assert (ROOT/'audio'/f'{stem}-{n}.mp3').is_file()
for name in ('kick','snare','hihat'): assert (ROOT/'audio'/f'{name}.mp3').is_file()
for svg in ROOT.rglob('*.svg'):
    ET.parse(svg)
for css in ROOT.rglob('*.css'):
    for url in re.findall(r'url\([\'\"]?([^\'\")]+)',css.read_text()):
        if urlsplit(url).scheme or url.startswith('#'): continue
        assert (css.parent/url.split('?')[0]).is_file(), ('missing CSS asset',css,url)
print('Passed: all pages, consistent navigation, local links/anchors, unique IDs, visible translations, CSS assets and all required audio samples.')
