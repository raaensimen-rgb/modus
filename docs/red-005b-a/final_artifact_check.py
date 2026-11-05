"""Final documentation boundary check; disposable builds only, no backend calls."""
import hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results/red-005b-a/final-artifacts-02'
if OUT.exists():raise SystemExit('Refusing overwrite')
OUT.mkdir(parents=True)
env=dict(os.environ)
for k in ('MODUS_ISOLATED_PREVIEW','MODUS_PREVIEW_PROJECT','MODUS_CATALOG_PREVIEW','MODUS_PLATFORM_RELEASE','CF_PAGES','CF_PAGES_BRANCH','CF_PAGES_COMMIT_SHA','CONTEXT'):env.pop(k,None)
env['PYTHONDONTWRITEBYTECODE']='1'
rows=[]
def build(site,name,extra=None):
 p=subprocess.run(['npm','run','build'],cwd=site,env={**env,**(extra or {})},capture_output=True,text=True)
 (OUT/(name+'.log')).write_text(p.stdout+'\n'+p.stderr)
 assert p.returncode==0,name
 m={str(f.relative_to(site/'dist')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (site/'dist').rglob('*') if f.is_file()}
 assert not any(n.startswith(('docs/','editorial/','content/')) or n.endswith(('.sql','.sql.txt','.md','.py','.zip')) for n in m)
 (OUT/(name+'-manifest.json')).write_text(json.dumps(m,indent=2)+'\n')
 rows.append({'command':['npm','run','build'],'mode':name,'environment_overrides':extra or {},'exit_code':p.returncode,'files':len(m)})
 print(name,'PASS',len(m),flush=True)
 return m
with tempfile.TemporaryDirectory(prefix='modus-red005ba-final-') as t:
 site=Path(t)/'site'
 shutil.copytree(ROOT,site,ignore=lambda directory,names: list(shutil.ignore_patterns('node_modules','test-results','.build-private','__pycache__')(directory,names))+(['dist'] if Path(directory)==ROOT and 'dist' in names else []))
 (site/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 new=[ROOT/'docs/modus-2-red-005b-a.md']+sorted(p for p in (ROOT/'docs/red-005b-a').rglob('*') if p.is_file())
 (OUT/'tested-preparation-files.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in new},indent=2)+'\n')
 withprep=build(site,'ordinary-with-complete-preparation')
 isolated=build(site,'isolated-with-complete-preparation',{'MODUS_ISOLATED_PREVIEW':'1','MODUS_PREVIEW_PROJECT':'modus-2-preview','MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'dev/modus-2-pr52'})
 import sys
 sys.path.insert(0,str(site/'preview'))
 from artifact_boundary import inspect_artifact
 audit=inspect_artifact(site/'dist','e54572dda08b425301f6943fae54af56f38316eb')
 (OUT/'isolated-audit.json').write_text(json.dumps(audit,indent=2)+'\n');assert not audit['blockers'],audit['blockers']
 shutil.rmtree(site/'docs/red-005b-a');(site/'docs/modus-2-red-005b-a.md').unlink()
 without=build(site,'ordinary-without-complete-preparation')
 different=[n for n in sorted(set(withprep)|set(without)) if withprep.get(n)!=without.get(n)]
 assert not different,different
(OUT/'summary.json').write_text(json.dumps({'source_head':'e54572dda08b425301f6943fae54af56f38316eb','results':rows,'ordinary_byte_equal':True,'different_paths':different,'scope':'final complete preparation files excluded from output; isolated static audit, no deploy or live backend'},indent=2)+'\n')
