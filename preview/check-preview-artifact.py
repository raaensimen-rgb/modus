"""Local, read-only fail-closed gate. No database/cloud requests or deployment.
Exit 2 means publication is BLOCKED. Isolated artifacts require verified manifests.
This gate supplements, and does not replace, tests/publication-audit.py.
"""
import argparse,hashlib,json,re,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--dist',default='dist');p.add_argument('--expect-sha',required=True)
p.add_argument('--report');p.add_argument('--expect-blocked',action='store_true')
a=p.parse_args();root=Path(__file__).resolve().parents[1];dist=Path(a.dist).resolve()
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=root,text=True).strip()
blockers=[]
if sha!=a.expect_sha:blockers.append('HEAD does not match the reviewed SHA')
if branch!='dev/modus-2-pr52':blockers.append('Not on the approved development branch')
changed=subprocess.check_output(['git','diff','--name-only','HEAD','--','.',':!dist'],cwd=root,text=True).splitlines()
if changed:blockers.append('Tracked source differs from HEAD')
status=subprocess.check_output(['git','status','--porcelain=v1'],cwd=root,text=True).splitlines()
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines()
unknown=untracked
if unknown:blockers.append('Unreviewed untracked files')
from artifact_boundary import inspect_artifact
boundary=inspect_artifact(dist,a.expect_sha)
blockers.extend(boundary.pop('blockers'))
result={'source_sha':sha,'branch':branch,'expected_sha':a.expect_sha,'tracked_source_clean':not changed,'git_worktree_dirty':bool(status),'untracked_preparation_files':untracked,'scope':'local artifact, not remote configuration or RLS attestation','status':'BLOCKED' if blockers else 'LOCAL_ARTIFACT_GATE_PASSED','blockers':blockers,**boundary}
if a.report:Path(a.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='manifest'},ensure_ascii=False,indent=2))
if a.expect_blocked:
 assert blockers,'Negative-control regression: expected unsafe original artifact to be blocked'
 sys.exit(0)
sys.exit(2 if blockers else 0)
