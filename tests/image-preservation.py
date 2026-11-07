"""A06 preservation after exact verification and reversal of the four reviewed scale P1 files."""
from pathlib import Path
import json,hashlib,re,sys,shutil,tempfile
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
import production_workflow as w
from image_optimization import lock,PAGES,css
c=w.config(R);P=R.parent/'package';images=lock()
# A06's reversal still compares against the historical package preceding A06.
a06_base=R/'release-inputs/production-584c98f'
a06_manifest=w.read(a06_base/w.MANIFEST)
c={**c,'source_sha':a06_manifest['source_sha'],'package':str(a06_base.relative_to(R)),
   'files':{**w.file_map(a06_manifest['files']),w.MANIFEST:w.digest((a06_base/w.MANIFEST).read_bytes())}}

def check_a06(package):
 actual=w.inventory(package);original=c['files'];added={'images/a06/'+n:v['sha256'] for n,v in images['files'].items()}
 assert set(actual)==set(original)|set(added),'File inventory changed outside A06'
 for n,h in original.items():
  if n==w.MANIFEST:continue
  if n not in PAGES:assert actual[n]==h,'Unrelated product bytes changed: '+n
  else:
   s=(package/n).read_text();assert s.count(css())==1;s=s.replace(css(),'');s=re.sub(r'<picture data-a06-background=""[^>]*>.*?</picture>','',s)
   def reverse(m):
    img=re.search(r'<img\b[^>]*>',m[0])[0]
    if 'data-a06-critical-reuse' in m[0]:
     assert 'modus-design-landscape.png' in img and 'loading="eager"' in img
     img=img.replace('loading="eager"','loading="lazy"')
    assert img.count(' srcset=')==1 and img.count(' sizes=')==1
    return re.sub(r' (?:srcset|sizes)="[^"]*"','',img)
   s,count=re.subn(r'<picture data-a06-photo="[a-z0-9-]+"[^>]*>.*?</picture>',reverse,s)
   assert count==(5 if n.endswith('index.html') else 1),(n,count)
   assert s==(R/c['package']/n).read_text(),'Text, structure or unrelated attributes changed: '+n
 for n,h in added.items():assert actual[n]==h,'Derivative changed: '+n
 w.public_boundary(package,actual,c)
 return {'baseline_sha':c['source_sha'],'unchanged_files':len(original)-len(PAGES)-1,'changed_html':list(PAGES),'metadata_only':w.MANIFEST,'added_derivatives':added,'removed':[],'all_original_images_runtime_articles_media_storage_security_hash_identical':True}

def check(package):
 from scale_p1 import reverse
 from learning_menu_copy import previous
 from learning_entry_preservation import original_pages
 with tempfile.TemporaryDirectory() as tmp:
  normalized=Path(tmp)/'a06';reverse(package,normalized)
  from harmony_loop import restore_reviewed_files
  restore_reviewed_files(normalized)
  for name, original in original_pages(package).items():
   (normalized/name).write_bytes(original)
  for page in normalized.rglob("*.html"):
   html=page.read_bytes();original=previous(html)
   if original!=html:page.write_bytes(original)
  return check_a06(normalized)

result=check(P)
result['normalization_scope']='A06 proof after strict P1 reversal; actual four-file P1 delta is checked in scale-p1-preservation.json'
with tempfile.TemporaryDirectory() as temp:
 q=Path(temp)/'package';shutil.copytree(P,q)
 mutations=[('index.html',(P/'index.html').read_bytes().replace(b'home-hero',b'UNAUTHORIZED',1)),('article-quiz.js',b'changed progression'),('admin-app.js',b'private'),('content/private-draft.json',b'private'),('images/a06/'+next(iter(images['files'])),b'changed derivative')]
 for n,data in mutations:
  p=q/n;old=p.read_bytes() if p.exists() else None;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  try:check(q)
  except (AssertionError,ValueError):pass
  else:raise AssertionError('Unsafe A06 delta accepted: '+n)
  if old is None:p.unlink()
  else:p.write_bytes(old)
result['negative_cases_rejected']=len(mutations);w.write(R.parent/'delivery/image-preservation.json',result);print(json.dumps(result))
