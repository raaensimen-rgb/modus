"""Keep the published 35e0a8d artifact byte-for-byte outside the film integration.
The ordinary article/CMS build and private boundary checks run before this step.
"""
from pathlib import Path
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target).resolve();assert target!=R
 baseline=R/'release-inputs/film-public-baseline';expected=json.loads((R/'approved-intro-film/baseline-files.json').read_text())
 actual={p.relative_to(baseline).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in baseline.rglob('*') if p.is_file()}
 assert actual==expected,'Published baseline changed'
 for p in target.rglob('*'):
  if p.is_file() and p.relative_to(target).as_posix() not in expected:p.unlink()
 for f in expected:
  p=target/f;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(baseline/f,p)
 print('Pinned published slim-navigation baseline preserved:',len(expected),'files')
