"""Independently enforce the candidate's narrow public delta and private boundary."""
from pathlib import Path
import hashlib, json, re, tempfile, shutil, subprocess, zipfile
R=Path(__file__).resolve().parents[1];B=R/'release-inputs/published-d809a7b';P=R.parent/'package'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check(baseline,candidate):
    expected=json.loads((R/'release-inputs/published-d809a7b-files.json').read_text())
    for name,digest in json.loads((R/'release-inputs/published-source-invariants.json').read_text()).items():
        assert h(R/name)==digest, 'Product-source change: '+name
    assert {p.relative_to(baseline).as_posix():h(p) for p in baseline.rglob('*') if p.is_file()}==expected
    m=json.loads((candidate/'release-manifest.json').read_text())
    asset='navigation.'+h(R/'navigation.js')[:10]+'.js'
    assert m['navigation_asset']==asset and m['project']=='modus' and m['deploy_authorized'] is False
    assert m['source_sha']==subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
    actual={p.relative_to(candidate).as_posix():h(p) for p in candidate.rglob('*') if p.is_file()}
    assert {f['path']:f['sha256'] for f in m['files']}=={n:v for n,v in actual.items() if n!='release-manifest.json'}
    assert all((candidate/f['path']).stat().st_size==f['bytes'] for f in m['files'])
    assert set(actual)-set(expected)=={asset,'en/'+asset}
    assert not set(expected)-set(actual), 'Baseline files must not disappear'
    changed=[]
    for n,v in expected.items():
        before=(baseline/n).read_bytes();after=(candidate/n).read_bytes()
        if actual[n]==v:continue
        changed.append(n)
        if n=='release-manifest.json':continue
        if n in ['navigation.js','en/navigation.js']:
            assert after==(R/'navigation.js').read_bytes();continue
        assert n.endswith('.html'), 'Unexpected resource change: '+n
        normalize=lambda data:re.sub(rb'navigation\.[a-f0-9]{10}\.js',b'navigation.FIXED.js',data)
        assert normalize(before)==normalize(after), 'HTML content/design changed: '+n
        assert asset.encode() in after
    assert len([n for n in changed if n.endswith('.html')])==137
    assert len(changed)==140
    for pre,count in [('',52),('en/',16)]:
        if not pre:assert json.loads((candidate/'cms-seed.json').read_text())==[]
        rows=json.loads((candidate/pre/'search-index.json').read_text())
        assert len([x for x in rows if x['type']=='article'])==count
        assert (candidate/pre/asset).read_bytes()==(R/'navigation.js').read_bytes()
    for p in candidate.rglob('*'):
        if not p.is_file():continue
        n=p.relative_to(candidate).as_posix()
        assert not n.startswith(('content/','editorial/','tests/','scripts/','cms/','.git/'))
        assert p.name not in ['admin-app.js','admin-package.json','editor.js','editor-admin.js','_worker.js','library-draft-backup.json']
    assert h(candidate/'media/modus-intro-81eed15e5f0f.mp4')=='81eed15e5f0fa3c43ef0ba3130162bed23564621d68a9c96cf8f2fefcf4359b4'
    return {'baseline_files':len(expected),'candidate_files':len(actual),'preserved_files':len(expected)-len(changed),'html_script_urls_only':137,'articles_nb':52,'articles_en':16}

result=check(B,P)
# Negative tests must reject leaked private runtime, content mutation and baseline drift.
with tempfile.TemporaryDirectory(prefix='modus-package-a-negative-') as tmp:
    c=Path(tmp)/'candidate';shutil.copytree(P,c)
    for name,data in [('admin-app.js',b'private runtime'),('content/private.json',b'{"private":true}'),('index.html',(c/'index.html').read_bytes()+b'changed content')]:
        p=c/name;p.parent.mkdir(parents=True,exist_ok=True);original=p.read_bytes() if p.exists() else None;p.write_bytes(data)
        try:check(B,c)
        except AssertionError:pass
        else:raise AssertionError('Negative test accepted '+name)
        if original is None:p.unlink()
        else:p.write_bytes(original)
    b=Path(tmp)/'baseline';shutil.copytree(B,b);(b/'navigation.js').write_text('tampered')
    try:check(b,P)
    except AssertionError:pass
    else:raise AssertionError('Changed baseline accepted')
with zipfile.ZipFile(R.parent/'delivery/MODUS-package-A-local.zip') as z:
    assert set(z.namelist())=={p.relative_to(P).as_posix() for p in P.rglob('*') if p.is_file()}
    for n in z.namelist():assert hashlib.sha256(z.read(n)).hexdigest()==h(P/n)
result.update(status='passed',negative_cases=4,zip_bytes_verified=True)
(R/'test-results').mkdir(exist_ok=True)
(R/'test-results/local-candidate.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
