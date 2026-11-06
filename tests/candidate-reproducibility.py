"""A complete second build must reproduce every file and deterministic ZIP."""
from pathlib import Path
import hashlib,subprocess,json,sys,tempfile
R=Path(__file__).resolve().parents[1];P=R.parent/'package'
sys.path.insert(0,str(R/'scripts'))
import production_workflow as workflow
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
snapshot=lambda:{p.relative_to(P).as_posix():h(p) for p in P.rglob('*') if p.is_file()}
before=snapshot()
with tempfile.TemporaryDirectory() as temp:
 first=workflow.archive(P,Path(temp)/'first.zip')
 subprocess.run(['npm','run','build'],cwd=R,check=True)
 after=snapshot()
 assert after==before,'Complete candidate rebuild changed public bytes or file inventory'
 second=workflow.archive(P,Path(temp)/'second.zip')
 assert first==second,'Complete rebuild changed deterministic ZIP'
 baseline=workflow.config(R)
 delta=workflow.check_delta(P,baseline,workflow.read(R/'release-inputs/production-delta.json'))
 workflow.public_boundary(P,after,baseline)
 workflow.write(R.parent/'delivery/reproducibility.json',{
  'source_sha':workflow.git(R,'rev-parse','HEAD'),'complete_builds':2,
  'byte_identical':True,'zip_sha256':first,'baseline_sha':baseline['source_sha'],
  'product_delta':delta,'files':after,'network_or_deployment':False})

print('PASS: two complete builds and deterministic ZIPs are byte-identical; '+str(len(before))+' files.')
