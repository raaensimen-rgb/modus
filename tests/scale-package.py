"""Bounded local package audit with negative privacy/version checks."""
from pathlib import Path
import hashlib,json,re,subprocess,tempfile,shutil,sys,os
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from site_navigation import add_scale_library_link
R=Path(__file__).resolve().parents[1];B=R/'release-inputs/published-d809a7b';P=R.parent/'package'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
new=['scale-model.js','scale-library.js','scale-library.css','skalabibliotek.html']
def check(base,candidate):
 expected=json.loads((R/'release-inputs/published-d809a7b-files.json').read_text());assert {p.relative_to(base).as_posix():h(p) for p in base.rglob('*') if p.is_file()}==expected
 nav=(R/'navigation.js').read_bytes();asset='navigation.'+hashlib.sha256(nav).hexdigest()[:10]+'.js'
 actual={p.relative_to(candidate).as_posix():h(p) for p in candidate.rglob('*') if p.is_file()}
 assert set(actual)==set(expected)|{pre+n for pre in ('','en/') for n in new+[asset]}
 manifest=json.loads((candidate/'release-manifest.json').read_text());assert manifest['deploy_authorized'] is False;assert manifest['source_sha']==subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();assert manifest['files']=={n:v for n,v in actual.items() if n!='release-manifest.json'}
 for n in expected:
  if n=='release-manifest.json':continue
  before=(base/n).read_bytes();after=(candidate/n).read_bytes()
  if n in ('navigation.js','en/navigation.js'):assert after==nav;continue
  if n in ('theory.js','en/theory.js'):
   s=before.decode();a=s.index('function spellFrom(');b=s.index('\nfunction scaleNames',a);assert after.decode()==s[:a]+'const spellFrom=window.ModusScales.spell;'+s[b:];continue
  if n.endswith('.html'):
   s=re.sub(rb'navigation\.[a-f0-9]{10}\.js',asset.encode(),before).decode()
   if n in ('teori.html','en/teori.html'):s=s.replace('<script src="theory.js','<script src="scale-model.js"></script><script src="theory.js')
   if n in ('musikkart.html','en/musikkart.html'):s=s.replace('<section class="map-next">','<p><a href="skalabibliotek.html">'+('Interactive Scale Library' if n.startswith('en/') else 'Interaktivt Skalabibliotek')+' ↗</a></p><section class="map-next">')
   locale_root=candidate/'en' if n.startswith('en/') else candidate
   prefix=os.path.relpath(locale_root,(candidate/n).parent).replace(os.sep,'/');prefix='' if prefix=='.' else prefix+'/'
   s=add_scale_library_link(s,prefix,english=n.startswith('en/'))
   if n in ('en/musikkart.html','en/laeringssti.html','en/f03-laeringsreise.html'):s=s.replace('Læringsstien','Learning path')
   assert after.decode()==s,n
  else:assert after==before,n
 for pre in ('','en/'):
  for n in new[:3]:assert (candidate/pre/n).read_bytes()==(R/n).read_bytes()
  assert (candidate/pre/asset).read_bytes()==nav
  page=(candidate/pre/'skalabibliotek.html').read_text();main=(R/'skalabibliotek.html').read_text();main=main[main.index('<main'):main.index('</main>')+7]
  if pre:main=main.replace('Skalabibliotek','Scale library').replace('Musikkatlas','Music atlas')
  assert page[page.index('<main'):page.index('</main>')+7]==main
  assert len(list((candidate/pre/'artikler').glob('*.html')))==52 # EN retains 36 unavailable placeholders
 assert json.loads((candidate/'cms-seed.json').read_text())==[]
 return {'status':'passed','baseline_files':len(expected),'candidate_files':len(actual),'new_files':10,'preserved_files':sum(actual[n]==v for n,v in expected.items()),'negative_cases':5}
result=check(B,P)
with tempfile.TemporaryDirectory() as tmp:
 c=Path(tmp)/'candidate';shutil.copytree(P,c)
 for n,data in [('admin-app.js',b'private'),('content/private.json',b'private'),('index.html',b'changed'),('scale-model.js',b'unauthorized version')]:
  p=c/n;old=p.read_bytes() if p.exists() else None;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  try:check(B,c)
  except (AssertionError,ValueError):pass
  else:raise AssertionError('Negative case accepted '+n)
  if old is None:p.unlink()
  else:p.write_bytes(old)
 b=Path(tmp)/'baseline';shutil.copytree(B,b);(b/'navigation.js').write_text('tampered')
 try:check(b,P)
 except AssertionError:pass
 else:raise AssertionError('Baseline mutation accepted')
(R.parent/'delivery/scale-package-tests.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
