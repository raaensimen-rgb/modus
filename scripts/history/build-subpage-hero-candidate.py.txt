"""Build this bounded local candidate on the exact latest published artifact.
The ordinary build remains available separately. No network or deployment operations.
"""
from pathlib import Path
import hashlib,json,shutil,runpy,subprocess
R=Path(__file__).resolve().parents[1]
B=R.parents[1]/'intro-button-smaller-20261105/package'
O=R.parent/'package'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected=json.loads((R/'release-inputs/hero-baseline-files.json').read_text())
assert {p.relative_to(B).as_posix():sha(p) for p in B.rglob('*') if p.is_file()}==expected,'Published baseline changed'
if O.exists():shutil.rmtree(O)
shutil.copytree(B,O)
runpy.run_path(str(R/'scripts/apply-subpage-hero.py'))['apply'](O)
manifest=json.loads((O/'release-manifest.json').read_text())
manifest.update(kind='modus-shared-study-tools-hero',source_sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),public_baseline_sha='fe94e064df70290c852a16936f25289cd19dfae5',deploy_authorized=False,owner_authorization='Local implementation only; separate GO required')
manifest['files']=[{'path':p.relative_to(O).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(O.rglob('*')) if p.is_file() and p.name!='release-manifest.json']
(O/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Local candidate built from published fe94e064; no deployment authorized')
