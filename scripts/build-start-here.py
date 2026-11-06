"""Build UX-001 only, on the hash-pinned latest public release. No network calls."""
from pathlib import Path
import json,hashlib,shutil,subprocess
from start_here import apply
R=Path(__file__).resolve().parents[1];B=R/'release-inputs/ux001-production-1721e30';P=R.parent/'package'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def inventory(root):return {p.relative_to(root).as_posix():h(p) for p in sorted(root.rglob('*')) if p.is_file()}
expected=json.loads((R/'release-inputs/ux001-production-files.json').read_text());assert inventory(B)==expected,'Published baseline drift'
assert json.loads((B/'release-manifest.json').read_text())['source_sha']=='1721e302a3880804073e0dcb0de6543f939ba0f6'
if P.exists():shutil.rmtree(P)
shutil.copytree(B,P);apply(P)
files=inventory(P);changed=[n for n in expected if files.get(n)!=expected[n] and n!='release-manifest.json'];added=sorted(set(files)-set(expected))
assert len(changed)==72 and all(n.endswith('.html') for n in changed)
assert len(added)==4 and all(n.startswith(('start-here.','en/start-here.')) for n in added)
m={'kind':'ux-001-start-here-local','source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'baseline_sha':'1721e302a3880804073e0dcb0de6543f939ba0f6','baseline_deployment':'2c46a5f1-fdca-4920-b233-cac50f34d7bf','project':'modus','deploy_authorized':False,'changed':changed,'added':added,'preserved':sum(files[n]==v for n,v in expected.items()),'files':{n:v for n,v in files.items() if n!='release-manifest.json'}}
(P/'release-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in m.items() if k!='files'},indent=2))
