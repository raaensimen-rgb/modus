"""A second build must reproduce every public byte and the deterministic ZIP."""
from pathlib import Path
import hashlib,subprocess
R=Path(__file__).resolve().parents[1];P=R.parent/'package';Z=R.parent/'delivery/MODUS-package-A-local.zip'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
snapshot=lambda:{p.relative_to(P).as_posix():h(p) for p in P.rglob('*') if p.is_file()}
before=snapshot();archive=h(Z)
subprocess.run(['python3','scripts/build-local-candidate.py'],cwd=R,check=True)
assert snapshot()==before,'Candidate rebuild changed public bytes'
assert h(Z)==archive,'ZIP is not reproducible'
print('PASS: second candidate build and ZIP are byte-identical; '+str(len(before))+' files.')
