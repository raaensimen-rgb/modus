"""Scoped deployment: exact public baseline plus shared navigation only."""
from pathlib import Path
import json,hashlib,shutil,subprocess,runpy,re
R=Path(__file__).resolve().parents[1];old=R.parents[1]/'top-navigation-20261105/package';out=R.parent/'package'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((old/'release-manifest.json').read_text());assert m['source_sha']=='bc69a366af8ca99e700368bbc531adcf2147d667'
for f in m['files']:assert hash(old/f['path'])==f['sha256'],f['path']
if out.exists():shutil.rmtree(out)
shutil.copytree(old,out)
# Only the toolbar order changes in the existing shared component. Preserve all other DOM.
count=0
for p in out.rglob('*.html'):
 s=p.read_text()
 if '<header class="site-header">' not in s or p.name=='redaktor.html':continue
 def reorder(match):
  h=match[0];lang=re.search(r'<nav class="language-picker"[\s\S]*?</nav>',h)
  if lang:
   h=h.replace(lang[0],'',1);h=h.replace('<button type="button" class="global-search-trigger"',lang[0]+'<button type="button" class="global-search-trigger"',1)
  return h
 p.write_text(re.sub(r'<header class="site-header">[\s\S]*?</header>',reorder,s,count=1));count+=1
runpy.run_path(str(R/'scripts/apply-compact-navigation.py'))['apply'](out)
changed=[];unchanged=[]
for f in m['files']:
 p=out/f['path']
 (unchanged if hash(p)==f['sha256'] else changed).append(f['path'])
assert all(x.endswith('.html') for x in changed),changed
for name in ['_headers','_redirects','cms-seed.json','app.js','en/app.js']:
 assert hash(out/name)==hash(old/name),name
assert all(hash(out/f['path'])==f['sha256'] for f in m['files'] if any(x in f['path'] for x in ['images/','audio/']) or f['path'].endswith('.js'))
m.update(kind='modus-compact-navigation',public_baseline_sha=m['source_sha'],source_sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),owner_authorization='Current explicit GO: compact navigation only on existing modus-2-preview',changed_existing_files=changed,unchanged_existing_files=len(unchanged),shared_header_pages=count)
m['files']=[{'path':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,'sha256':hash(p)} for p in sorted(out.rglob('*')) if p.is_file() and p.name!='release-manifest.json']
(out/'release-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'header_pages':count,'changed':len(changed),'unchanged':len(unchanged),'sha':m['source_sha']}))
