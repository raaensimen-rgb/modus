"""Build the English static site from Norwegian sources and reviewed translations.
Run after article generation and shared navigation. No runtime translation service.
"""
from pathlib import Path
from html.parser import HTMLParser
import html, json, re, shutil
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
EN=DIST/'en'
translations=json.loads((ROOT/'content/i18n/en.json').read_text())
for line in (ROOT/'content/i18n/dynamic.tsv').read_text().splitlines():
    if line:
        source, target=line.split('\t',1)
        translations[source]=target
long={k:v for k,v in translations.items() if k!=v and len(k)>=12}
long_re=re.compile('|'.join(re.escape(k) for k in sorted(long,key=len,reverse=True)))
short={k:v for k,v in translations.items() if k!=v and len(k)<12}
def translate(s):
    stripped=s.strip()
    if stripped in translations:
        return s[:len(s)-len(s.lstrip())]+translations[stripped]+s[len(s.rstrip()):]
    return long_re.sub(lambda m:long[m[0]],s)
def script(s):
    # Short terms only in whole string literals or whole HTML text nodes.
    # Longer, reviewed phrases include complete template fragments, preserving ${…}.
    patterns={}
    for k,v in short.items():
        for quote in ('"',"'"):
            patterns[quote+k+quote]=quote+v+quote
        patterns['>'+k+'<']='>'+v+'<'
    all_patterns={**long,**patterns}
    rx=re.compile('|'.join(re.escape(k) for k in sorted(all_patterns,key=len,reverse=True)))
    return rx.sub(lambda m:all_patterns[m[0]],s)
class EnglishHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.out=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        raw=self.get_starttag_text()
        for key,value in attrs:
            if value is None:continue
            target=value
            if key in ('title','aria-label','placeholder','alt','content','data-search'):
                target=translate(value)
            if tag=='html' and key=='lang':target='en'
            if target!=value:
                raw=re.sub(r'(?<![\w-])'+re.escape(key)+r'=("[^"]*"|\x27[^\x27]*\x27)',lambda m:key+'="'+html.escape(target,quote=True)+'"',raw,count=1)
        self.out.append(raw)
        if tag in ('style','script'):self.skip+=1
    def handle_startendtag(self,t,a):self.handle_starttag(t,a)
    def handle_endtag(self,tag):
        self.out.append('</'+tag+'>')
        if tag in ('style','script'):self.skip-=1
    def handle_data(self,data):self.out.append(data if self.skip else html.escape(translate(data),quote=False))
    def handle_entityref(self,n):self.out.append('&'+n+';')
    def handle_charref(self,n):self.out.append('&#'+n+';')
    def handle_decl(self,d):self.out.append('<!'+d+'>')
    def handle_comment(self,d):self.out.append('<!--'+d+'-->')

def language_assets(page,prefix=''):
    if 'language-init.js' not in page:
        page=page.replace('<head>',f'<head><script src="{prefix}language-init.js"></script>',1)
    if 'language.js"' not in page:
        page=page.replace('</head>',f'<script src="{prefix}language.js" defer></script></head>',1)
    return page

if EN.exists():shutil.rmtree(EN)
EN.mkdir()
for source in list(DIST.rglob('*')):
    if not source.is_file() or EN in source.parents or source.name in ('redaktor.html','editor.js','editor.css','cms-seed.json','_routes.json','_headers','_worker.js'):continue
    rel=source.relative_to(DIST);target=EN/rel;target.parent.mkdir(parents=True,exist_ok=True)
    if source.suffix=='.html':
        page=language_assets(source.read_text(),'../' if rel.parts[0]=='artikler' else '')
        source.write_text(page)
        p=EnglishHTML();p.feed(page);result=''.join(p.out)
        result=result.replace('<html lang="en">','<html lang="en">',1)
        target.write_text(result)
    elif source.suffix=='.js' and source.name not in ('language-init.js','language.js','account.js') and not source.name.startswith('account.'):
        target.write_text(script(source.read_text()))
    elif source.suffix=='.svg':
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        svg=ET.fromstring(source.read_text())
        for element in svg.iter():
            if element.text: element.text=translate(element.text)
            if element.tail: element.tail=translate(element.tail)
            for key in ('aria-label','title'):
                if key in element.attrib: element.attrib[key]=translate(element.attrib[key])
        target.write_text(ET.tostring(svg, encoding='unicode'))
    else:shutil.copyfile(source,target)
print('Built English pages, scripts and illustrations in dist/en/.')
