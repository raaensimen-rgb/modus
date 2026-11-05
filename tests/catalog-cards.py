"""Active public cards plus independent text, language and static-image version controls."""
import copy,hashlib,json,os,shutil,sys,tempfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from publication import public_articles,public_illustrations,preview_catalog_cards,article_permission,load_policy
articles=json.loads((ROOT/'content/articles.json').read_text())
assert len(articles)==52
assert len({a['slug'] for a in articles})==52
for env in [{},{'CF_PAGES_BRANCH':'main','CONTEXT':'production'},{'MODUS_CATALOG_PREVIEW':'1'},{'MODUS_PLATFORM_RELEASE':'1'}]:
 with patch.dict(os.environ,env,clear=True):
  for locale in ['nb','en']:
   assert len(public_articles(ROOT,locale))==(52 if locale=='nb' else 16)
   assert len(public_illustrations(ROOT,locale))==(52 if locale=='nb' else 16)
   assert not preview_catalog_cards(ROOT,locale)
for locale,prefix in [('nb',''),('en','en/')]:
 page=(ROOT/'dist'/prefix/'artikler.html').read_text();images=public_illustrations(ROOT,locale)
 assert page.count('data-article-id=')==(52 if locale=='nb' else 16) and 'catalog-preview-card' not in page
 for a in public_articles(ROOT,locale):
  assert 'artikler/'+a['slug']+'.html' in page
  image=ROOT/'dist'/prefix/images[a['slug']]['src']
  if a['slug'] in {x['slug'] for x in articles[:16]}:
   assert hashlib.sha256(image.read_bytes()).hexdigest()==images[a['slug']]['sha256']
  else:
   # New diagram bytes are a local candidate, never an inherited image approval.
   manifest=json.loads((ROOT/'editorial/teaching-diagrams/manifest.json').read_text())
   diagram=next(x for x in manifest['articles'] if x['slug']==a['slug'])
   assert hashlib.sha256(image.read_bytes()).hexdigest()==diagram['locales'][locale]['assets']['card']['sha256']
 assert len([a for a in json.loads((ROOT/'dist'/prefix/'search-index.json').read_text()) if a['type']=='article'])==(52 if locale=='nb' else 16)
assert len(json.loads((ROOT/'dist/cms-seed.json').read_text()))==68
with tempfile.TemporaryDirectory(prefix='modus08-versions-') as t:
 target=Path(t)
 for name in ['content','scripts','editorial']:shutil.copytree(ROOT/name,target/name)
 first=articles[0]['slug'];p=target/'editorial/catalog-illustrations/nb'/f'{first}.svg'
 p.write_text(p.read_text().replace('</svg>','<text>UNSELECTED_IMAGE_CANARY</text></svg>'))
 assert first not in public_illustrations(target,'nb')
 assert len(public_illustrations(target,'en'))==16
 policy=load_policy(target);a=copy.deepcopy(articles[0]);a['intro']='UNSELECTED_TEXT_CANARY'
 assert not article_permission(policy['articles'][first],a,'nb',target)
 source=target/'content/articles.json';data=json.loads(source.read_text());data.append({**data[0],'slug':'new-private-draft','title':'PRIVATE_NEW_DRAFT_CANARY'});source.write_text(json.dumps(data))
 assert len(public_articles(target))==52
 # Wrong locale image proof cannot grant another image version.
 p=target/'content/article-illustration-permissions.json';d=json.loads(p.read_text());d['images'][first]['en']['public_reference']='unknown';p.write_text(json.dumps(d))
 assert first not in public_illustrations(target,'en')
print('Active cards and 32 exact images; owner selection survives build flags; changed/new text, changed images and wrong-locale proofs remain denied.')

# Three inherited EN drawings contained Norwegian labels. Only text was corrected.
import xml.etree.ElementTree as ET
permissions=json.loads((ROOT/'content/article-illustration-permissions.json').read_text())
def geometry(e):return (e.tag,dict(e.attrib),tuple(geometry(c) for c in e))
for slug,item in permissions['images'].items():
 proof=item.get('en',{})
 if 'previous_sha256' in proof:
  old=ROOT/'editorial/legacy/catalog-illustrations/en'/(slug+'.svg')
  current=ROOT/'editorial/catalog-illustrations/en'/(slug+'.svg')
  assert hashlib.sha256(old.read_bytes()).hexdigest()==proof['previous_sha256']
  assert geometry(ET.fromstring(old.read_bytes()))==geometry(ET.fromstring(current.read_bytes()))
print('Three corrected English image label sets retain exact drawing geometry and archived original hashes.')
