from pathlib import Path
import json,re,html
from article_localization import override
from preview_mode import isolated
from publication import public_articles, load_policy, article_text_version
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
articles=[] if isolated() else public_articles(ROOT);quizzes=json.loads((ROOT/'content/article-quizzes.json').read_text());tr=json.loads((ROOT/'content/i18n/en.json').read_text())
for line in (ROOT/'content/i18n/dynamic.tsv').read_text().splitlines():
 if line:
  k,v=line.split('\t',1);tr[k]=v
long={k:v for k,v in tr.items() if k!=v and len(k)>=12};rx=re.compile('|'.join(re.escape(k) for k in sorted(long,key=len,reverse=True)))
def translate(s):
 stripped=s.strip()
 if stripped in tr:return s[:len(s)-len(s.lstrip())]+tr[stripped]+s[len(s.rstrip()):]
 return rx.sub(lambda m:long[m[0]],s)
seed=[]
policy=load_policy(ROOT)
for a in articles:
 for lang in ['nb','en']:
  if a['slug'] not in {x['slug'] for x in public_articles(ROOT,lang)}:continue
  b=dict(a);b['locale']=lang;b['image']={'src':('/en' if lang=='en' else '')+'/images/articles/'+a['slug']+'.svg','alt':a['title']};b['practice']='/'+('en/' if lang=='en' else '')+a['practice']
  b['quiz']=[{**{k:v for k,v in q.items() if k!='en'},**(q['en'] if lang=='en' else {})} for q in quizzes[a['slug']]]
  if lang=='en':
   for key in ['title','intro','topic','exercise','practice_label']:b[key]=translate(a[key])
   b['sections']=[[translate(s[0]),re.sub(r'(?<=>)[^<>]+(?=<)',lambda m:html.escape(translate(html.unescape(m[0])),quote=False),s[1])] for s in a['sections']];b['image']['alt']=b['title']
  if lang=='en' and override(a,ROOT):
   translated=override(a,ROOT)
   for field in ['title','intro','topic','exercise','practice_label','sections','learning','practice_steps','next_step']:b[field]=translated[field]
   b['image']['alt']=b['title']
  # Public-only read projection. Never copy private review text or references.
  record=policy['articles'][a['slug']];version=article_text_version(a,lang,ROOT)
  b['editorial']={'locale':lang,'sourceVersion':version,'policy':{
   'editorial_status':record['editorial_status'],'visibility':record['visibility'],
   'approved_locales':[lang],'source_control_status':record.get('source_control_status') if record.get('source_control_status') in ('not_documented','under_review','approved') else (None if record.get('source_control_status') is None else 'unknown'),
   'publication_evidence':{lang:{'reviewed_version_sha256':version,'reference':'Verified public build'}}}}
  seed.append(b)
(DIST/'cms-seed.json').write_text(json.dumps(seed,ensure_ascii=False))
# Private editor/CMS deployment is parked; no source registry mutation.
# Cloud rendering is staged until its deployment has been verified.
for name in ['_routes.json','_worker.js']:(DIST/name).unlink(missing_ok=True)
(DIST/'_headers').write_text('/redaktor*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n')
(DIST/'redaktor.html').write_text((ROOT/'cms/editor.html').read_text())
print(f'Built public-only CMS seed: {len(seed)} records. Private CMS deployment remains disabled.')
# The approved administrator skin belongs to the private/local editor only.
# Public isolated builds replace the editor with a static unavailable page.
from preview_mode import isolated
if not isolated():
 import shutil
 for name in ('editor-admin.css','admin-console.css'):
  shutil.copy2(ROOT/name,DIST/name)

if not isolated():
 import subprocess
 subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),'editor-admin.js','--bundle','--format=esm','--target=es2022','--outfile=dist/editor-admin.js'],cwd=ROOT,check=True)
