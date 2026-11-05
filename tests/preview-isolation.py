"""Configuration failures and complete final-byte isolation verification in both modes."""
import json,os,sys
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'preview')]
from preview_mode import isolated
from artifact_boundary import inspect_artifact
valid={'MODUS_ISOLATED_PREVIEW':'1','MODUS_PREVIEW_PROJECT':'modus-2-preview','MODUS_CATALOG_PREVIEW':'1','CF_PAGES_BRANCH':'dev/modus-2-pr52'}
with patch.dict(os.environ,{},clear=True):assert not isolated()
with patch.dict(os.environ,{'CF_PAGES_BRANCH':'main','CONTEXT':'production'},clear=True):assert not isolated()
with patch.dict(os.environ,valid,clear=True):assert isolated()
invalid=[{**valid,k:v} for k,v in [('MODUS_ISOLATED_PREVIEW','true'),('MODUS_PREVIEW_PROJECT','modus'),('MODUS_CATALOG_PREVIEW','0'),('CF_PAGES_BRANCH','main'),('CONTEXT','production'),('MODUS_PLATFORM_RELEASE','1')]]
invalid += [{k:v for k,v in valid.items() if k!=missing} for missing in valid]
for env in invalid:
    with patch.dict(os.environ,env,clear=True):
        try:isolated()
        except ValueError:pass
        else:raise AssertionError('Unsafe/missing Preview config accepted: '+str(env))
if (ROOT/'dist/preview-isolation.json').exists():
    result=inspect_artifact(ROOT/'dist')
    assert not result['blockers'],result['blockers']
    # A valid artifact is rejected if any final byte or security rule is changed.
    import shutil,tempfile
    with tempfile.TemporaryDirectory(prefix='modus-isolation-tamper-') as t:
        copy=Path(t)/'dist';shutil.copytree(ROOT/'dist',copy)
        cases=[
            ('account.js',b'// changed\n','Stale/tampered final-file manifest'),
            ('_headers',b"/*\n  Content-Security-Policy: connect-src *\n",'Missing or altered whole-site Preview headers'),
            ('leak.js',b'https://synthetic.supabase.co/rest/v1/test','Backend/client credential references remain'),
            ('leak.js',b'sb_secret_SYNTHETIC_NOT_A_REAL_SECRET','Secret-looking material remains'),
            ('editor.js',b'// synthetic runtime','Editor/CMS runtime remains'),
            ('content/private.txt',b'SYNTHETIC','Private/source paths remain'),
            ('cms-seed.json',b'[{"synthetic":"not-public"}]','CMS seed is not empty'),
            ('preview-guard.js',b'// missing protection','Missing or untrusted network guard: preview-guard.js'),
            ('index.html',b'<html><head></head><body></body></html>','Missing early CSP/guard in index.html'),
            ('betaling-test.html',b'<a href="https://buy.stripe.com/test_synthetic">test</a>','Payment navigation remains enabled'),
            ('preview-isolation.json',b'{}','Invalid isolation configuration'),
        ]
        for name,data,expected in cases:
            f=copy/name;before=f.read_bytes() if f.exists() else None
            f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
            assert expected in inspect_artifact(copy)['blockers'],name
            if before is None:f.unlink()
            else:f.write_bytes(before)
        assert 'Unreviewed source provenance' in inspect_artifact(copy,'f'*40)['blockers']
    print('Isolated artifact: complete manifest, all HTML guards/CSP, no SDK/credentials/editor/CMS, configuration and tamper rejection passed.')
else:
    assert b'.supabase.co' in (ROOT/'dist/account.js').read_bytes(),'Ordinary account bundle must retain existing behavior'
    assert (ROOT/'dist/editor.js').is_file(),'Ordinary editor unchanged'
    print('Ordinary build retained; isolation is opt-in and invalid configurations fail closed.')
