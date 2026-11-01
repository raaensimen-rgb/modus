"""Preview-only card permission, exact NB/EN metadata and preserved private prose."""
import copy, hashlib, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
from unittest.mock import patch
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from publication import preview_catalog_cards, catalog_card_metadata, public_articles, preview_illustrations
articles=json.loads((ROOT/'content/articles.json').read_text())
assert len(articles)==len({a['slug'] for a in articles})==16
assert hashlib.sha256((ROOT/'content/articles.json').read_bytes()).hexdigest()=='7a56d5fe2ca3100142c888b7ecf4e4102aef27c0c03edcfdac2a08a259d39d11'
with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'','CONTEXT':''}):
 for locale in ('nb','en'):
  cards=preview_catalog_cards(ROOT,locale)
  assert len(cards)==16 and not public_articles(ROOT,locale)
  assert all(set(c)=={'slug','title','level','category','level_label','category_label'} for c in cards)
for env in ({'MODUS_CATALOG_PREVIEW':'0','CF_PAGES':'0','CF_PAGES_BRANCH':''},
            {'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'main'},
            {'MODUS_CATALOG_PREVIEW':'1','CONTEXT':'production'},
            {'MODUS_CATALOG_PREVIEW':'0','CF_PAGES':'1','CF_PAGES_BRANCH':'unapproved-branch'}):
 with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'0','CF_PAGES':'0','CF_PAGES_BRANCH':'','CONTEXT':'',**env}):assert not preview_catalog_cards(ROOT)
with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'0','CF_PAGES':'1','CF_PAGES_BRANCH':'test/pl101-visibility-integration','CONTEXT':''}):assert len(preview_catalog_cards(ROOT))==16
class Cards(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.cards=[];self.active=None
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='article' and 'catalog-preview-card' in d.get('class',''):
   self.active={'attrs':d,'text':[],'images':[]};self.cards.append(self.active)
  if self.active:
   if tag=='img':self.active['images'].append(d)
   assert tag not in ('a','button','input','script','textarea','select')
   assert not any(k in d for k in ('href','onclick','tabindex','data-article-id'))
 def handle_endtag(self,tag):
  if tag=='article':self.active=None
 def handle_data(self,text):
  if self.active:self.active['text'].append(text)
for locale,prefix in (('nb',''),('en','en/')):
 images=preview_illustrations(ROOT,locale)
 expected=preview_catalog_cards(ROOT,locale);html=(ROOT/'dist'/prefix/'artikler.html').read_text();p=Cards();p.feed(html)
 assert len(p.cards)==len(expected)
 by_id={c['attrs']['data-catalog-id']:c for c in p.cards}
 for a in expected:
  c=by_id[a['slug']];visible=' '.join(c['text'])
  assert a['title'] in visible and a['level_label'] in visible and a['category_label'] in visible
  if a['slug'] in images:
   assert len(c['images'])==1 and c['images'][0]['src']==images[a['slug']]['src'] and c['images'][0]['alt']==''
   assert hashlib.sha256((ROOT/'dist'/prefix/images[a['slug']]['src']).read_bytes()).hexdigest()==images[a['slug']]['sha256']
  else:assert not c['images']
  assert ('In progress' if locale=='en' else 'Under arbeid') in visible
  assert c['attrs']['data-topic']==a['category']
  assert c['attrs']['data-search']==a['title']+' '+a['level_label']+' '+a['category_label']
  assert (ROOT/'dist'/prefix/'artikler'/f"{a['slug']}.html").read_text().count('data-publication-hold')==1
 assert json.loads((ROOT/'dist/cms-seed.json').read_text())==[]
 assert not [a for a in json.loads((ROOT/'dist'/prefix/'search-index.json').read_text()) if a['type']=='article']
with tempfile.TemporaryDirectory(prefix='modus-card-policy-') as tmp:
 target=Path(tmp)
 for name in ('content','scripts','editorial'):shutil.copytree(ROOT/name,target/name)
 source=target/'content/articles.json';data=json.loads(source.read_text())
 with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'','CONTEXT':''}):
  data[0]['intro']='PRIVATE_CATALOG_CANARY_NOT_AUTHORIZED';source.write_text(json.dumps(data))
  assert len(preview_catalog_cards(target))==16,'Prose is not a card input'
  data[0]['title']='CHANGED_TITLE_NOT_AUTHORIZED';source.write_text(json.dumps(data))
  assert len(preview_catalog_cards(target))==15,'Changed metadata closes only that card'
  data.append({**data[1],'slug':'new-unapproved-article'});source.write_text(json.dumps(data))
  assert len(preview_catalog_cards(target))==15,'New articles have no implicit card permission'
  policy=target/'content/article-card-permissions.json';p=json.loads(policy.read_text());p['cards'][data[1]['slug']]['versions']['en']='bad';policy.write_text(json.dumps(p))
  assert len(preview_catalog_cards(target,'en'))==14,'EN has a separate version permission'
print('Illustrated catalog cards: exact 16 NB/EN metadata, static non-link cards, Preview-only context, changed/new metadata denied, 0 full texts, sources preserved.')

with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'','CONTEXT':''}):
 for locale in ('nb','en'):
  assert len(preview_illustrations(ROOT,locale))==16
with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'main','CONTEXT':''}):
 assert not preview_illustrations(ROOT)
with tempfile.TemporaryDirectory(prefix='modus-illustration-policy-') as tmp:
 target=Path(tmp)
 for name in ('content','scripts','editorial'):shutil.copytree(ROOT/name,target/name)
 with patch.dict(os.environ,{'MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'','CONTEXT':''}):
  original=preview_illustrations(target)
  assert len(original)==16
  first=articles[0]['slug'];source=target/'editorial/catalog-illustrations/nb'/f'{first}.svg'
  source.write_text(source.read_text().replace('</svg>','<text>PRIVATE_ILLUSTRATION_CANARY</text></svg>'))
  assert first not in preview_illustrations(target),'Changed image bytes have no implicit permission'
  assert len(preview_illustrations(target,'en'))==16,'NB change must not grant/change EN permission'
  assert len(preview_catalog_cards(target))==16,'Image permission is separate from metadata'
  proof=target/'content/article-illustration-permissions.json';data=json.loads(proof.read_text());data['images'][first]['en']['reference']='unapproved';proof.write_text(json.dumps(data))
  assert first not in preview_illustrations(target,'en')
print('32 exact existing SVG versions approved only in isolated Preview; changed images and wrong locale proofs rejected; full text remains private.')
