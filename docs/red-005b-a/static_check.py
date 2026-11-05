"""Offline source-preservation and dormant-draft structure checks, NOT SQL parsing."""
import ast,hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
before=json.loads((ROOT/'test-results/red-005b-a/before.json').read_text())
changed=[]
for n,want in before['existing_files'].items():
 p=ROOT/n; got=hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
 if got!=want:changed.append(n)
assert not changed,changed
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==before['head']
assert subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()==before['branch']
for path in HERE.glob('*.py'):ast.parse(path.read_text())
ids=re.findall(r'def test_OA(\d\d)_',(HERE/'test_preparation.py').read_text())
assert sorted(ids)==[str(i).zfill(2) for i in range(1,29)]
plan=json.loads((HERE/'test-plan.json').read_text()); assert len(plan['cases'])==28
assert all(c['isolated_acceptance_status'].startswith('NOT RUN') for c in plan['cases'])
sql=(HERE/'drafts/01-private-model.sql.txt').read_text()
tables=re.findall(r'CREATE TABLE modus_oa\.(\w+)',sql)
assert len(tables)==8
for t in tables:
 assert f'ALTER TABLE modus_oa.{t} FORCE ROW LEVEL SECURITY;' in sql
 assert f'ALTER TABLE modus_oa.{t} OWNER TO modus_oa_owner;' in sql
for p in (HERE/'drafts').glob('*'):
 s=p.read_text();assert p.name.endswith('.sql.txt') and 'RAISE EXCEPTION' in s and s.rstrip().endswith('ROLLBACK;')
 assert 'supabase.co' not in s and 'sb_secret_' not in s
assert 'GRANT EXECUTE' not in (HERE/'drafts/02-cutover-contract.sql.txt').read_text()
assert not re.search(r'(postgres(?:ql)?://|eyJ[A-Za-z0-9_-]{20,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{10,})', '\n'.join(p.read_text() for p in HERE.rglob('*') if p.is_file()))
print(json.dumps({'status':'passed','source_head':before['head'],'branch':before['branch'],
 'existing_files_checked':len(before['existing_files']),'changed_existing_files':changed,
 'oa_test_ids':len(ids),'private_table_draft_count':len(tables),
 'scope':'static AST/text/source-preservation, not SQL parsing, grants/RLS/Auth verification'},indent=2))
