"""Independent UX-001 route and locale assertions against real publication data."""
from pathlib import Path
import json,re,sys,urllib.parse
R=Path(__file__).resolve().parents[1];P=R.parent/'package';sys.path.insert(0,str(R/'scripts'))
from article_library import ORDER
articles=json.loads((R/'content/articles.json').read_text());assert len(articles)==52 and len(ORDER)==52
rows=[]
for pre,en in [('',False),('en/',True)]:
 b=P/pre;catalog=(b/'artikler.html').read_text();available=set(re.findall(r'data-article-id="([^"]+)"',catalog));ids=[i for i in ORDER if i in available];assert len(ids)==(16 if en else 52)
 home=(b/'index.html').read_text();assert home.count('data-start-learning')==1
 assert re.search(r'<a href="artikler/toner-og-intervaller.html" data-start-learning[^>]*>[\s\S]*?'+('Start learning music theory' if en else 'Start å lære musikkteori')+r'</a>',home)
 assert catalog.count('class="start-badge"')==1 and 'start-recommended' in catalog
 for i,slug in enumerate(ids):
  p=b/'artikler'/f'{slug}.html';s=p.read_text();nav=re.search(r'<nav class="start-reading"[\s\S]*?</nav>',s)[0]
  prev=re.findall(r'rel="prev"[^>]*href="([^"]+)"',nav);nxt=re.findall(r'rel="next"[^>]*href="([^"]+)"',nav)
  assert prev==([ids[i-1]+'.html'] if i else []),(pre,slug,'prev')
  assert nxt==([ids[i+1]+'.html'] if i+1<len(ids) else []),(pre,slug,'next')
  assert f'{i+1} '+('of' if en else 'av')+f' {len(ids)}' in nav
  practice=re.search(r'<a class="start-practice" href="([^"]+)"',nav)[1]
  parsed=urllib.parse.urlsplit(practice);target=(p.parent/parsed.path).resolve();assert target.is_file() and target.is_relative_to(P.resolve())
  assert not any(x in target.read_text() for x in ['data-publication-hold','id="f03-journey"'])
  assert 'data-quiz-id="'+slug+'"' in s
  rows.append({'locale':'en' if en else 'nb','slug':slug,'practice':practice,'position':i+1})
 # No new links/nav on the 36 unavailable EN placeholders.
 if en:
  for slug in set(ORDER)-available:assert 'start-reading' not in (b/'artikler'/f'{slug}.html').read_text()
assert 'localStorage.setItem' not in (R/'start-here.js').read_text() and '.setItem(' not in (R/'start-here.js').read_text()
(R.parent/'evidence/route-tests.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS: 68 readers, two entry CTAs, first/last boundaries, locale chains and real public exercises')
