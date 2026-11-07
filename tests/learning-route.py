"""#53 independent route/content/locale/privacy assertions."""
from pathlib import Path
import re,json,sys,urllib.parse,hashlib,tempfile,shutil
R=Path(__file__).resolve().parents[1];P=R.parent/'package';B=R/'release-inputs/learning-route-24670c5';sys.path.insert(0,str(R/'scripts'))
from article_library import ORDER
from learning_route import reverse_for_legacy_checks
for pre,n in [('',52),('en/',16)]:
 root=P/pre;catalog=(root/'artikler.html').read_text();ids=[s for s in ORDER if f'data-article-id="{s}"' in catalog]
 assert len(ids)==n and ids[0]=='toner-og-intervaller'
 home=(root/'index.html').read_text();assert 'href="laeringssti.html" data-start-learning' in home
 for name in ['laeringssti.html','grunnstudier.html','studierute.html']:
  page=(root/name).read_text();assert page.count('id="learning-route-data"')==1
  assert page.count('data-learning-route')==1
  assert 'data-publication-hold' not in page
  raw=re.search(r'<template id="learning-route-data">(.*?)</template>',page)[1]
  import html
  rows=json.loads(html.unescape(raw));assert [x['id'] for x in rows]==ids
  if pre:assert '52 articles' in page and '16 complete English' in page
 full=(root/'grunnstudier.html').read_text();assert re.findall('data-route-step="([^"]+)"',full)==ids
 for slug in ids:
  reader=(root/'artikler'/f'{slug}.html').read_text();assert 'id="route-practice"' in reader
  assert f'../grunnstudier.html#route-{slug}' in reader
  assert f'data-quiz-id="{slug}"' in reader
  assert re.search(r'<section class="article-practice" id="route-practice">',reader)
  for href in re.findall(r'href="([^"]+)"',reader):
   u=urllib.parse.urlsplit(html.unescape(href))
   if u.path in ('../teori.html','../backingtracks.html','../akkorder.html','../skalabibliotek.html'):
    assert urllib.parse.parse_qs(u.query).get('fromArticle')==[slug],(slug,href)
  if slug=='dorisk-og-eolisk':
   pattern=r'<section class="related" data-article-jam="[^" ]+".*?</section>'
   before=re.search(pattern,(B/pre/'artikler'/f'{slug}.html').read_text())[0]
   after=re.search(pattern,reader)[0]
   assert re.sub(r'&amp;fromArticle=[a-z0-9-]+','',after)==before,'Jam music/prose changed'
  for folder in ['images/articles','images/teaching-diagrams']:
   for p in (B/pre/folder).glob(slug+'*.svg'):assert p.read_bytes()==(root/folder/p.name).read_bytes()
 for name in ['article-quiz.js','account.js','articles.js','theory.js','app.js','scale-model.js','preview-guard.js']:
  assert (root/name).read_bytes()==(B/pre/name).read_bytes(),pre+name
 # Only the reviewed query-context and local keyboard patch are allowed in the scale runtime.
 scale_old=(B/pre/'scale-library.js').read_text();scale_new=(root/'scale-library.js').read_text()
 from scale_p1 import keyboard_patch
 assert scale_new==keyboard_patch(scale_old.replace("const query=new URLSearchParams(state);if(document.body.classList.contains('scale-practicing'))","const query=new URLSearchParams(state);const fromArticle=params.get('fromArticle');if(/^[a-z0-9-]+$/.test(fromArticle||''))query.set('fromArticle',fromArticle);if(document.body.classList.contains('scale-practicing'))"))
for slug in set(ORDER)-{x['id'] for x in rows}:assert 'learning-route' not in (P/'en/artikler'/f'{slug}.html').read_text()
nb=(P/'studierute.html').read_text();old=(B/'studierute.html').read_text();assert all(f'id="T{i}"' in nb for i in range(1,11))
# The existing detailed curriculum body is intact, not replaced with a second course.
assert re.search(r'<div class="reading-body">[\s\S]*?</main>',re.sub(r'<template id="learning-route-data">[\s\S]*?</template>','',nb))[0]==re.search(r'<div class="reading-body">[\s\S]*?</main>',old)[0]
assert '.setItem(' not in (R/'learning-route.js').read_text()
assert json.loads((P/'cms-seed.json').read_text())==[]
with tempfile.TemporaryDirectory() as temp:
 out=Path(temp)/'reversed';reverse_for_legacy_checks(P,out)
 assert (out/'index.html').read_bytes()==(B/'index.html').read_bytes()
for f in P.rglob('*'):
 if f.is_file():assert not f.relative_to(P).as_posix().startswith(('editorial/','content/','cms/','tests/','scripts/'))
print('PASS: shared ORDER; 52 NB/16 EN real readers/activities; no private manuscript/storage/security-header/media changes; bounded scale URL-context/keyboard repair; T1–T10 preserved.')
