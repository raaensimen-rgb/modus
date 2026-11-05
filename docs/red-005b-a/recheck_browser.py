"""Rerun only sandbox-blocked synthetic browser fixtures, never live backend.
Separate evidence directory; previous blocked attempts are retained.
"""
import hashlib,json,os,shutil,subprocess,tempfile,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results/red-005b-a/browser-recheck-02'
if OUT.exists(): raise SystemExit('Refusing overwrite')
OUT.mkdir(parents=True)
rows=[]
with tempfile.TemporaryDirectory(prefix='modus-red005ba-browser-') as t:
 site=Path(t)/'site'
 shutil.copytree(ROOT,site,ignore=lambda directory,names: list(shutil.ignore_patterns('node_modules','test-results','.build-private','__pycache__')(directory,names))+(['dist'] if Path(directory)==ROOT and 'dist' in names else []))
 (site/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 for name,script,folder in [('red002a','editor-storage-browser.cjs','red-002a'),('red003','editor-status-browser.cjs','red-003'),('red004','editor-review-browser.cjs','red-004')]:
  test=site/'tests'/script
  original=test.read_text()
  adapted=original.replace('chromium.launch({headless:true})',"chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})")
  assert adapted != original
  test.write_text(adapted)
  (OUT/(script+'.adaptation.json')).write_text(json.dumps({'original_sha256':hashlib.sha256(original.encode()).hexdigest(),'adapted_sha256':hashlib.sha256(adapted.encode()).hexdigest(),'only_change':'chromium.launch uses existing /Applications/Google Chrome.app instead of unavailable Playwright-managed executable; temporary copy only'},indent=2)+'\n')
  command=['node','tests/'+script]
  p=subprocess.run(command,cwd=site,text=True,capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
  (OUT/(name+'.log')).write_text(p.stdout+'\n'+p.stderr)
  rows.append({'name':name,'command':command,'exit_code':p.returncode,'cwd_scope':'disposable synthetic fixture copy'})
  if (site/'test-results'/folder).exists():shutil.copytree(site/'test-results'/folder,OUT/folder)
  print(name,'PASS' if not p.returncode else 'FAIL',flush=True)
(OUT/'summary.json').write_text(json.dumps({'source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':rows,'scope':'rerun after local listen EPERM, synthetic SDK only, no live backend'},indent=2)+'\n')
raise SystemExit(1 if any(r['exit_code'] for r in rows) else 0)
