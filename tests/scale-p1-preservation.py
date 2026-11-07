"""Independent complete-file A06 preservation, with bounded JS/CSS and negative cases."""
from pathlib import Path
import sys,json,hashlib,tempfile,shutil
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from scale_p1 import reviewed,HASHES
from production_workflow import inventory,public_boundary,config
from learning_entry_preservation import original_pages
from learning_menu_copy import previous
P=R.parent/'package';pinned=json.loads((R/'release-inputs/scale-p1-a06-files.json').read_text());allowed={pre+n for pre in ('','en/') for n in HASHES}
def check(package):
 old,new=reviewed();actual=inventory(package);actual.pop('release-manifest.json')
 for page in package.rglob("*.html"):
  actual[page.relative_to(package).as_posix()]=hashlib.sha256(previous(page.read_bytes())).hexdigest()
 for name, original in original_pages(package).items():
  actual[name]=hashlib.sha256(original).hexdigest()
 assert set(actual)==set(pinned),'P1 must not add/remove package files'
 for n,h in pinned.items():
  if n not in allowed:assert actual[n]==h,'Unrelated A06 delta: '+n
  else:assert (package/n).read_bytes()==new[Path(n).name],'Unreviewed P1 delta: '+n
 public_boundary(package,inventory(package),config(R))
 return {'status':'passed','files':len(actual)+1,'unchanged_a06_product_files':len(pinned)-len(allowed),'changed':sorted(allowed),'a06_images_articles_audio_storage_security_preserved':True}
result=check(P)
with tempfile.TemporaryDirectory() as tmp:
 q=Path(tmp)/'package';shutil.copytree(P,q)
 cases=[('scale-library.js',b'keyboard missing'),('en/scale-library.css',b'wrong theme'),('images/a06/modus-design-landscape-384.webp',b'wrong image'),('article-quiz.js',b'wrong storage'),('content/private-draft.json',b'private')]
 for name,data in cases:
  p=q/name;before=p.read_bytes() if p.exists() else None;assert data!=before;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  try:check(q)
  except (AssertionError,ValueError):pass
  else:raise AssertionError('Negative P1 mutation accepted: '+name)
  if before is None:p.unlink()
  else:p.write_bytes(before)
result['negative_cases_rejected']=len(cases)
(R.parent/'delivery/scale-p1-preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
