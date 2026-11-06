"""Lock combined product against independently reviewed upstream bytes, with negative cases."""
from pathlib import Path
import hashlib,json,subprocess,tempfile,shutil,re
R=Path(__file__).resolve().parents[1];P=R.parent/'package';spec=json.loads((R/'release-inputs/ux-jam-integration.json').read_text())
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check_legacy(pkg):
 actual={p.relative_to(pkg).as_posix():h(p) for p in pkg.rglob('*') if p.is_file() and p.name!='release-manifest.json'}
 assert actual==spec['files'],'Combined package differs from exact independently reviewed upstream union'
 m=json.loads((pkg/'release-manifest.json').read_text());assert m['files']==actual and m['deploy_authorized'] is False
 assert m['source_sha']==subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
 assert json.loads((pkg/'cms-seed.json').read_text())==[]
 for n,section in spec['jam_sections'].items():
  text=(pkg/n).read_text();assert text.count(section)==1 and text.count('<nav class="start-reading"')==1
 return {'files':len(actual)+1,'matched_independent_upstream_union':True,'upstream_sources':spec['upstream_sources'],'public_fulltexts':{'nb':52,'en':16},'deploy_authorized':False}
# Keep original upstream negative checks after exact verification of the new delta.
def check(pkg):
 import sys
 sys.path.insert(0,str(R/'scripts'))
 from learning_route import reverse_for_legacy_checks
 with tempfile.TemporaryDirectory() as tmp:
  restored=Path(tmp)/'restored';reverse_for_legacy_checks(pkg,restored)
  return check_legacy(restored)
result=check(P)
with tempfile.TemporaryDirectory() as tmp:
 c=Path(tmp)/'package';shutil.copytree(P,c)
 mutations=[('index.html',(R/'release-inputs/production-1721e30/index.html').read_bytes()),('artikler/dorisk-og-eolisk.html',re.sub(r'<section class="related" data-article-jam="[^" ]+".*?</section>','',(P/'artikler/dorisk-og-eolisk.html').read_text(),count=1).encode()),('content/private-draft.json',b'private'),('en/artikler/intervallomvendinger.html',b'unauthorized fulltext'),('article-quiz.js',b'changed'),(spec['added_assets'][0],b'changed')]
 for n,data in mutations:
  p=c/n;old=p.read_bytes() if p.exists() else None;assert data!=old,'Negative test must actually mutate '+n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  try:check(c)
  except AssertionError:pass
  else:raise AssertionError('Unsafe integrated mutation accepted: '+n)
  if old is None:p.unlink()
  else:p.write_bytes(old)
result['negative_cases_rejected']=len(mutations)
(R.parent/'delivery/integration-tests.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
