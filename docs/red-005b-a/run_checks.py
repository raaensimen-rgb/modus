"""Local offline preparation checks. Builds/browser fixtures run in a disposable copy.
No SQL execution, Supabase/Cloudflare CLI or real backend operations.
Prior project artifacts and historical test logs are never overwritten.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results/red-005b-a/run-01'
if OUT.exists(): raise SystemExit('Refusing overwrite: choose a new evidence run directory before retry')
OUT.mkdir(parents=True)
results=[]
env=dict(os.environ)
for k in ('MODUS_ISOLATED_PREVIEW','MODUS_PREVIEW_PROJECT','MODUS_CATALOG_PREVIEW','MODUS_PLATFORM_RELEASE','CF_PAGES','CF_PAGES_BRANCH','CF_PAGES_COMMIT_SHA','CONTEXT'):
    env.pop(k,None)
env['PYTHONDONTWRITEBYTECODE']='1'

def run(name,command,cwd,extra=None):
    started=time.monotonic(); actual={**env,**(extra or {})}
    p=subprocess.run(command,cwd=cwd,env=actual,text=True,capture_output=True)
    (OUT/(name+'.log')).write_text(p.stdout+'\n'+p.stderr)
    row={'name':name,'command':command,'cwd_scope':'disposable source copy' if cwd!=ROOT else 'original read-only source',
         'exit_code':p.returncode,'seconds':round(time.monotonic()-started,3),'environment_overrides':extra or {}}
    results.append(row); (OUT/'commands.json').write_text(json.dumps(results,indent=2)+'\n')
    print(name, 'PASS' if not p.returncode else 'FAIL',flush=True)
    return p.returncode==0

def filemap(dist):
    return {str(p.relative_to(dist)):hashlib.sha256(p.read_bytes()).hexdigest() for p in dist.rglob('*') if p.is_file()}

with tempfile.TemporaryDirectory(prefix='modus-red005ba-') as t:
    site=Path(t)/'site'
    shutil.copytree(ROOT,site,ignore=lambda directory,names: list(shutil.ignore_patterns('node_modules','test-results','.build-private','__pycache__')(directory,names))+(['dist'] if Path(directory)==ROOT and 'dist' in names else []))
    # .git is a physically separate copy: tests only read its existing source SHA.
    (site/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
    # Non-secret private documentation canary must never reach either output.
    canary='PRIVATE_RED005BA_PREPARATION_CANARY_20261103'
    (site/'docs/red-005b-a/canary.txt').write_text(canary)
    run('candidate-oa-model',['python3','docs/red-005b-a/test_preparation.py'],site)
    if run('ordinary-build',['npm','run','build'],site):
        ordinary=filemap(site/'dist')
        run('ordinary-regressions',['npm','test'],site)
        shutil.copy2(site/'test-results/test-results.json',OUT/'ordinary-test-results.json')
        # Browser fixtures substitute SDK and abort nonlocal requests; no real Auth/DB.
        for name,cmd,folder in (
          ('red002a-browser',['node','tests/editor-storage-browser.cjs'],'red-002a'),
          ('red003-browser',['node','tests/editor-status-browser.cjs'],'red-003'),
          ('red004-browser',['node','tests/editor-review-browser.cjs'],'red-004')):
            run(name,cmd,site)
            src=site/'test-results'/folder
            if src.exists(): shutil.copytree(src,OUT/folder)
        ordinary_bytes=(site/'dist/index.html').read_bytes()
        boundary={}
        for mode,extra in [('ordinary',{}),('isolated',{'MODUS_ISOLATED_PREVIEW':'1','MODUS_PREVIEW_PROJECT':'modus-2-preview','MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'dev/modus-2-pr52'})]:
            if mode=='isolated':
                if not run('isolated-build',['npm','run','build'],site,extra): continue
                run('isolated-regressions',['npm','test'],site,extra)
                shutil.copy2(site/'test-results/test-results.json',OUT/'isolated-test-results.json')
            mapping=filemap(site/'dist')
            assert not any(n.startswith('docs/') or n.endswith(('.sql','.sql.txt','.md','.py','.zip')) for n in mapping)
            assert all(canary.encode() not in p.read_bytes() for p in (site/'dist').rglob('*') if p.is_file())
            (OUT/(mode+'-artifact-manifest.json')).write_text(json.dumps(mapping,indent=2)+'\n')
            boundary[mode]={'files':len(mapping),'preparation_paths_absent':True,'private_canary_absent':True}
        (OUT/'artifact-boundary.json').write_text(json.dumps(boundary,indent=2)+'\n')
        # Remove ONLY new preparation docs inside the disposable copy, never user data.
        shutil.rmtree(site/'docs/red-005b-a')
        if run('ordinary-without-preparation-build',['npm','run','build'],site):
            baseline=filemap(site/'dist')
            diffs=[n for n in sorted(set(ordinary)|set(baseline)) if ordinary.get(n)!=baseline.get(n)]
            (OUT/'ordinary-byte-comparison.json').write_text(json.dumps({'comparison':'same actual local source with vs without new RED005B-A preparation directory; not historical production deployment','files_with':len(ordinary),'files_without':len(baseline),'different_paths':diffs,'equal':not diffs},indent=2)+'\n')
            assert not diffs,diffs
(OUT/'summary.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
 'total_commands':len(results),'passed':sum(r['exit_code']==0 for r in results),'results':results,
 'scope':'local static/synthetic regression evidence; no SQL/API/Auth acceptance'},indent=2)+'\n')
raise SystemExit(1 if any(r['exit_code'] for r in results) else 0)
