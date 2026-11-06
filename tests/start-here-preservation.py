"""Exact public-boundary and unchanged-body checks, with adversarial mutations."""
from pathlib import Path
import hashlib,json,re,sys,shutil,tempfile
R=Path(__file__).resolve().parents[1];B=R/'release-inputs/ux001-production-1721e30';P=R.parent/'package'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected=json.loads((R/'release-inputs/ux001-production-files.json').read_text())
def inventory(root):return {p.relative_to(root).as_posix():h(p) for p in root.rglob('*') if p.is_file()}
def check(base,pkg):
 assert inventory(base)==expected,'Baseline altered'
 actual=inventory(pkg);added=set(actual)-set(expected)
 assert len(added)==4 and all(re.fullmatch(r'(en/)?start-here\.[a-f0-9]{10}\.(css|js)',n) for n in added)
 assert set(expected)<=set(actual)
 changed=[]
 for n in expected:
  old=(base/n).read_text() if n.endswith('.html') else None
  if n=='release-manifest.json':continue
  if actual[n]==expected[n]:continue
  assert old is not None,n
  new=(pkg/n).read_text();original=new
  approved=json.loads((R/'release-inputs/ux-jam-integration.json').read_text())['jam_sections']
  if n in approved:
   assert new.count(approved[n])==1,'Missing or modified approved Jam section: '+n
   new=new.replace(approved[n],'',1)
  new=re.sub(r'<link rel="stylesheet" href="(?:../)?start-here\.[a-f0-9]{10}\.css">','',new)
  new=re.sub(r'<script src="start-here\.[a-f0-9]{10}\.js" defer></script>','',new)
  new=re.sub(r'<aside class="start-resume"[\s\S]*?</aside>','',new)
  new=re.sub(r'<template id="start-reading-route">[\s\S]*?</template>','',new)
  if n in ('index.html','en/index.html'):
   a=re.search(r'<a [^>]*data-start-learning[\s\S]*?</a>',new)[0];a0=re.search(r'<div class="hero-actions">\s*(<a[\s\S]*?</a>)',old)[1];new=new.replace(a,a0,1)
  elif n in ('artikler.html','en/artikler.html'):
   new=new.replace('article-card start-recommended','article-card').replace('<span class="start-badge">Recommended start</span>','').replace('<span class="start-badge">Anbefalt start</span>','')
  elif re.fullmatch(r'(en/)?artikler/[a-z0-9-]+\.html',n):
   new=re.sub(r'<nav class="start-reading"[\s\S]*?</nav>','',new)
   # Three inherited editorial detours are labelled as related reading, not the main route.
   if Path(n).stem in ('romertall-i-musikk','treklanger-fra-grunnform-til-omvending','bygg-akkorder-i-en-toneart'):
    pattern=r'(<section class="article-next"[^>]*><p class="eyebrow">)[^<]+'
    original_heading=re.search(pattern,old)[0]
    new=re.sub(pattern,lambda m:original_heading,new,count=1)
   # Four inherited Dorian practice links point to a held course. Only the link changes.
   if Path(n).stem in ('moduser-og-tonalt-sentrum','dorisk-og-eolisk'):
    pattern=r'(<section class="article-practice">[\s\S]*?)(<a class="button"[^>]*>[\s\S]*?</a>)'
    original_anchor=re.search(pattern,old)[2];m=re.search(pattern,new);new=new[:m.start()]+m[1]+original_anchor+new[m.end():]
  else:raise AssertionError('Unexpected HTML change '+n)
  assert new==old,'Unrelated bytes changed: '+n
  assert re.search(r'<header class="site-header">[\s\S]*?</header>',old)[0]==re.search(r'<header class="site-header">[\s\S]*?</header>',original)[0]
  changed.append(n)
 assert len(changed)==72
 assert json.loads((pkg/'cms-seed.json').read_text())==[]
 manifest=json.loads((pkg/'release-manifest.json').read_text());assert manifest['deploy_authorized'] is False and manifest['baseline_sha']=='1721e302a3880804073e0dcb0de6543f939ba0f6'
 assert manifest['files']=={n:v for n,v in actual.items() if n!='release-manifest.json'}
 return {'changedHtml':len(changed),'preservedExistingFiles':sum(actual[n]==v for n,v in expected.items()),'addedAssets':len(added),'readerProseQuizzesHeadersMediaAndStoragePreserved':True}
result=check(B,P)
with tempfile.TemporaryDirectory() as tmp:
 c=Path(tmp)/'candidate';shutil.copytree(P,c)
 for n,data in [('admin-app.js',b'private'),('content/private.json',b'private'),('musikkart.html',b'changed'),('article-quiz.js',b'changed'),('en/artikler/intervallomvendinger.html',b'unauthorized translation')]:
  p=c/n;before=p.read_bytes() if p.exists() else None;p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(data)
  try:check(B,c)
  except AssertionError:pass
  else:raise AssertionError('Unsafe mutation accepted: '+n)
  if before is None:p.unlink()
  else:p.write_bytes(before)
 b=Path(tmp)/'baseline';shutil.copytree(B,b);(b/'index.html').write_text('tampered')
 try:check(b,P)
 except AssertionError:pass
 else:raise AssertionError('Baseline mutation accepted')
result['negativeCasesRejected']=6
(R.parent/'evidence/preservation-tests.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS:',json.dumps(result))
