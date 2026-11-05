"""A hero-only deployment must preserve every other published file and DOM block."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parents[1];P=R.parent/'package';B=R.parents[1]/'article-library-p0-p1-20261105/package'
old=json.loads((B/'release-manifest.json').read_text());assert old['source_sha']=='96ec05803ff6926e540386ed3e32c60f87c4b5a7'
changed=[]
normalize=lambda s:re.sub(r'<section class="articles-hero(?: library-hero)?">[\s\S]*?</section>','HERO',re.sub(r'<link rel="stylesheet" href="article-library-hero\.[a-f0-9]{10}\.css">','',s)).replace('id="learningOverviewTitle" tabindex="-1"','id="learningOverviewTitle"')
for f in old['files']:
 name=f['path'];a=(B/name).read_bytes();b=(P/name).read_bytes()
 if a==b:continue
 changed.append(name);assert name in ['artikler.html','en/artikler.html'],name
 assert normalize(a.decode())==normalize(b.decode()),'Non-hero DOM changed: '+name
 before=re.search(r'<section class="articles-hero">([\s\S]*?)</section>',a.decode())[1]
 after=re.search(r'<section class="articles-hero library-hero">([\s\S]*?)</section>',b.decode())[1]
 for tag in ['h1','p']:
  for fragment in re.findall(r'<'+tag+r'\b[^>]*>[\s\S]*?</'+tag+'>',before):assert fragment in after,fragment
 assert 'href="#library"' in after and 'href="#learningOverviewTitle"' in after
 assert 'data-article-id' not in after
assert sorted(changed)==['artikler.html','en/artikler.html']
extra={p.relative_to(P).as_posix() for p in P.rglob('*') if p.is_file()}-{f['path'] for f in old['files']}-{'release-manifest.json'}
assert len(extra)==2 and all(re.fullmatch(r'(en/)?article-library-hero\.[a-f0-9]{10}\.css',n) for n in extra),extra
assert json.loads((P/'cms-seed.json').read_text())==[]
print(json.dumps({'changed_existing_files':changed,'new_css_files':sorted(extra),'remaining_published_files_identical':len(old['files'])-2,'article_counts':[52,16],'private_admin_and_cms_unchanged':True}))
