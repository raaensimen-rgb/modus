"""Verify the bounded change against the exact last approved public package."""
from pathlib import Path
import json,re,hashlib,runpy,tempfile,shutil
R=Path(__file__).resolve().parents[1];B=R.parents[1]/'intro-button-smaller-20261105/package';P=R.parent/'package'
api=runpy.run_path(str(R/'scripts/apply-subpage-hero.py'));pages=api['PAGES'];allowed={pre+n+'.html' for pre in ('','en/') for n in pages}
changed=[];unchanged=[]
for p in B.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(B).as_posix();q=P/rel;assert q.is_file(),rel
 if rel=='release-manifest.json':continue
 if p.read_bytes()==q.read_bytes():unchanged.append(rel);continue
 assert rel in allowed,rel
 changed.append(rel);old=p.read_text();new=q.read_text()
 assert re.search(r'<header class="site-header">[\s\S]*?</header>',old)[0]==re.search(r'<header class="site-header">[\s\S]*?</header>',new)[0],rel+' header'
 # Everything outside the hero is retained exactly (resume moves beneath the top).
 strip=lambda s:re.sub(r'<link rel="stylesheet" href="subpage-hero\.[a-f0-9]{10}\.css">','',s).replace('modus-interior shared-hero-page','modus-interior')
 new=strip(new)
 kind=pages[p.stem]
 if kind=='dynamic':assert old==new,rel;continue
 if kind:
  a=re.search(r'<section class="'+kind+r'"[^>]*>[\s\S]*?</section>',old)[0]
 else:
  a=re.search(r'(<main\b[^>]*data-publication-hold[^>]*>)([\s\S]*?)(<div id="quiz"></div>)',old)[2]
 b=re.search(r'<section class="[^"]*subpage-hero"[^>]*>[\s\S]*?</section>',new)[0]
 content=re.search(r'<div class="subpage-hero-copy">([\s\S]*)</div></section>',b)[1]
 if kind:
  expected=re.sub(r'<div class="(?:intro-art|theory-landscape|membership-landscape)"[^>]*>[\s\S]*?</div>','',a[a.index('>')+1:-10])
 else:expected=a
 assert content==expected,rel+' hero text/CTA'
 old=old.replace(a,'HERO',1);new=new.replace(b,'HERO',1)
 if p.stem=='laeringssti':
  pattern=r'<section class="journey-resume"[^>]*>[\s\S]*?</section>'
  assert re.search(pattern,old)[0]==re.search(pattern,new)[0]
  old=re.sub(pattern,'',old);new=re.sub(pattern,'',new)
 assert old==new,rel+' content below/around hero'
assert len(changed)==len(pages)*2
assert len(list((P/'artikler').glob('*.html')))==52
assert len(json.loads((P/'en/search-index.json').read_text()))>0
assert json.loads((P/'cms-seed.json').read_text())==[]
assert not any(p.name in ['admin-app.js','_worker.js','library-draft-backup.json'] for p in P.rglob('*'))
# Applying the same shared component again must not duplicate it.
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp)/'site';shutil.copytree(P,t)
 before={p.relative_to(t).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in t.rglob('*') if p.is_file()}
 api['apply'](t)
 assert before=={p.relative_to(t).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in t.rglob('*') if p.is_file()}
result={'changed_html':changed,'unchanged_files':len(unchanged),'navigation_and_all_runtime_js_unchanged':True,'hero_copy_CTA_and_surrounding_content_preserved':True,'private_boundary_preserved':True,'idempotent':True}
(R.parent/'evidence/preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
