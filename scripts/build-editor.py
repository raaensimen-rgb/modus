from pathlib import Path
import json,re,html
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
articles=json.loads((ROOT/'content/articles.json').read_text());quizzes=json.loads((ROOT/'content/article-quizzes.json').read_text());tr=json.loads((ROOT/'content/i18n/en.json').read_text())
for line in (ROOT/'content/i18n/dynamic.tsv').read_text().splitlines():
 if line:
  k,v=line.split('\t',1);tr[k]=v
long={k:v for k,v in tr.items() if k!=v and len(k)>=12};rx=re.compile('|'.join(re.escape(k) for k in sorted(long,key=len,reverse=True)))
def translate(s):
 stripped=s.strip()
 if stripped in tr:return tr[stripped]
 return rx.sub(lambda m:long[m[0]],s)
seed=[]
for a in articles:
 for lang in ['nb','en']:
  b=dict(a);b['locale']=lang;b['image']={'src':('/en' if lang=='en' else '')+'/images/articles/'+a['slug']+'.svg','alt':a['title']};b['practice']='/'+('en/' if lang=='en' else '')+a['practice']
  b['quiz']=[{**{k:v for k,v in q.items() if k!='en'},**(q['en'] if lang=='en' else {})} for q in quizzes[a['slug']]]
  if lang=='en':
   for key in ['title','intro','topic','exercise','practice_label']:b[key]=translate(a[key])
   b['sections']=[[translate(s[0]),re.sub(r'(?<=>)[^<>]+(?=<)',lambda m:html.escape(translate(html.unescape(m[0])),quote=False),s[1])] for s in a['sections']];b['image']['alt']=b['title']
  seed.append(b)
(DIST/'cms-seed.json').write_text(json.dumps(seed,ensure_ascii=False))
(ROOT/'cms/static-ids.json').write_text(json.dumps([a['slug'] for a in articles]))
(DIST/'_routes.json').write_text(json.dumps({'version':1,'include':['/artikler','/artikler.html','/artikler/','/artikler/*','/en/artikler','/en/artikler.html','/en/artikler/','/en/artikler/*'],'exclude':[]}))
(DIST/'_headers').write_text('/redaktor*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n')
(DIST/'redaktor.html').write_text((ROOT/'cms/editor.html').read_text())
print('Built article editor, 26 source articles and CMS routes.')
