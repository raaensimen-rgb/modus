"""A second build must reproduce every byte of the local QA package."""
from pathlib import Path
import hashlib,subprocess
R=Path(__file__).resolve().parents[1];P=R.parent/'package'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
snapshot=lambda:{p.relative_to(P).as_posix():h(p) for p in P.rglob('*') if p.is_file()}
before=snapshot()
subprocess.run(['python3','scripts/build-scale-local.py'],cwd=R,check=True)
assert snapshot()==before,'Candidate rebuild changed public bytes'

print('PASS: second candidate build is byte-identical; '+str(len(before))+' files.')
