"""Offline PL-AUTO-001 regressions: no deployment, credentials or live requests."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('production',Path(__file__).resolve().parents[1]/'scripts/production_workflow.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
SHA='a'*40


class ProductionTests(unittest.TestCase):
    def fixture(self, root):
        files={'index.html':'<html>fixture</html>','cms-seed.json':'[]','_headers':'/*\n  Content-Security-Policy: default-src self\n  X-Content-Type-Options: nosniff\n'}
        for pre in ('','en/'):
            files[pre+'artikler/selected.html']='<main><article>selected public article</article></main>'
            files[pre+'redaktor.html']='<main data-preview-unavailable>Private editor unavailable here</main>'
        for name,text in files.items():
            p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
        c={'source_sha':w.ANCHOR,'deployment_id':'baseline','files':w.inventory(root),'public_fulltexts':{'nb':1,'en':1},'admin_origins':['https://dev-modus-2-pr52.modus-2-preview.pages.dev','https://e785d3db.modus-2-preview.pages.dev'],'access_host':'modus-2-preview-pages.cloudflareaccess.com'}
        m={'schema_version':1,'kind':'modus-public-candidate','project':'modus','project_id':w.PROJECT_ID,'production_origin':w.PUBLIC,'source_sha':SHA,'deploy_authorized':False,'public_baseline_sha':w.ANCHOR,'public_baseline_deployment':'baseline','files':w.inventory(root)}
        w.write(root/w.MANIFEST,m)
        return c,m

    def test_real_published_baseline_and_legacy_dictionary(self):
        c=w.config()
        self.assertEqual(subprocess.run(['git','merge-base','--is-ancestor',w.ANCHOR,c['source_sha']],cwd=w.ROOT).returncode,0)
        self.assertEqual(w.inventory(w.ROOT/c['package']),c['files'])
        m=w.read(w.ROOT/c['package']/w.MANIFEST)
        self.assertEqual(w.file_map(m['files']),{n:h for n,h in c['files'].items() if n!=w.MANIFEST})
        w.public_boundary(w.ROOT/c['package'],c['files'],c)

    def test_small_profiles_select_only_affected_browser_suites(self):
        for profile, names in w.SMALL_RELEASE_FILES.items():
            delta = dict(changed=sorted(names), added=[], removed=[])
            self.assertEqual(w.small_profile(delta), profile)
            checks = w.small_checks(profile)
            self.assertEqual(len(checks), 2 if profile == 'harmony' else 1)
            if profile == 'harmony':
                self.assertEqual(checks[1][1], {'MODUS_AUDIO_APP': 'akkorder.html'})
                self.assertEqual(w.small_checks(profile, public=True)[1][0], 'public-audio-browser.cjs')
        for delta in [dict(changed=[], added=[], removed=[]),
                      dict(changed=['app.js'], added=[], removed=[]),
                      dict(changed=['akkorder.html', 'undervisning.html'], added=[], removed=[]),
                      dict(changed=['chord-tool.css'], added=['extra.css'], removed=[]),
                      dict(changed=['chord-tool.css'], added=[], removed=['old.css'])]:
            with self.subTest(delta=delta), self.assertRaises(ValueError):
                w.small_profile(delta)
        with self.assertRaises(ValueError):
            w.small_checks('unknown')

    def test_small_prepare_copies_baseline_and_runs_selected_tests(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            root = parent/'source'
            root.mkdir()
            base = parent/'baseline'
            base.mkdir()
            c, _ = self.fixture(base)
            (base/'chord-tool.css').write_text('old')
            c.update(package=str(base), files=w.inventory(base))
            shutil.copytree(base, parent/'package')
            (parent/'package/chord-tool.css').write_text('new')
            (root/'release-inputs').mkdir()
            w.write(root/'release-inputs/production-delta.json', dict(
                allowed_changes=['chord-tool.css'], allowed_additions=[], allowed_removals=[]))
            out = parent/'result'
            out.mkdir()
            state = dict(source_sha=c['source_sha'], deployment=c['deployment_id'],
                         manifest_sha256=c['files'][w.MANIFEST])
            provenance = dict(source_sha=SHA, source_tree='tree')
            with patch.object(w, 'source_gate', return_value=provenance), \
                 patch.object(w, 'baseline_status', return_value=state), \
                 patch.object(w, 'run_stage') as run, \
                 patch.object(w, 'seal_candidate', return_value={'ok': True}) as seal:
                self.assertEqual(w.prepare_small(root, SHA, out, c), {'ok': True})
                self.assertEqual(run.call_count, 3)
                self.assertEqual(run.call_args_list[1].args[1], ['node', 'tests/harmony-loop-browser.cjs'])
                self.assertEqual(run.call_args_list[2].args[1], ['node', 'tests/audio-signal-browser.cjs'])
                self.assertEqual(run.call_args_list[2].args[3]['MODUS_TEST_DIST'], str(out/'package'))
                self.assertEqual((out/'package/chord-tool.css').read_text(), 'new')
                self.assertEqual((out/'package/index.html').read_bytes(), (base/'index.html').read_bytes())
                self.assertEqual(seal.call_args.args[4]['profile'], 'harmony')
            shutil.rmtree(out/'package')
            with patch.object(w, 'source_gate', return_value=provenance), \
                 patch.object(w, 'baseline_status', side_effect=[state, {**state, 'deployment': 'new'}]), \
                 patch.object(w, 'run_stage'), self.assertRaisesRegex(ValueError, 'Production changed'):
                w.prepare_small(root, SHA, out, c)

    def test_schema_both_formats_and_reject_duplicates_or_traversal(self):
        self.assertEqual(w.file_map({'a.js':'b'*64}),w.file_map([{'path':'a.js','sha256':'b'*64}]))
        for rows in [[{'path':'a.js','sha256':'b'*64}]*2,{'../private':'b'*64},{'x%2fy':'b'*64},{'release-manifest.json':'b'*64},{'x\\y':'b'*64},{'x':'bad'}]:
            with self.subTest(rows=rows),self.assertRaises(ValueError):w.file_map(rows)

    def test_manifest_mutations_and_private_resources_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);c,m=self.fixture(root)
            self.assertEqual(len(w.manifest(root,SHA,c)),len(m['files'])+1)
            for name in ['admin-app.js','content/new-private.json','editorial/draft.json','en/editor.js','.env.production']:
                p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('private')
                # Even a freshly rehashed manifest cannot authorize private resources.
                bad=copy.deepcopy(m);bad['files'][name]=w.digest(b'private');w.write(root/w.MANIFEST,bad)
                with self.subTest(name=name),self.assertRaises(ValueError):w.manifest(root,SHA,c)
                p.unlink();w.write(root/w.MANIFEST,m)
            (root/'index.html').write_text('changed')
            with self.assertRaises(ValueError):w.manifest(root,SHA,c)
            (root/'index.html').write_text('<html>fixture</html>')
            for key,value in [('source_sha','b'*40),('project','modus-2-preview'),('deploy_authorized',True),('public_baseline_deployment','stale')]:
                bad={**m,key:value};w.write(root/w.MANIFEST,bad)
                with self.subTest(key=key),self.assertRaises(ValueError):w.manifest(root,SHA,c)
            w.write(root/w.MANIFEST,m)
            (root/'symlink').symlink_to(root/'index.html')
            with self.assertRaises(ValueError):w.manifest(root,SHA,c)

    def test_seed_and_fulltext_preserved_without_general_article_hold(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);c,m=self.fixture(root)
            (root/'cms-seed.json').write_text('[{"private":true}]');m['files']['cms-seed.json']=w.digest((root/'cms-seed.json').read_bytes());w.write(root/w.MANIFEST,m)
            with self.assertRaises(ValueError):w.manifest(root,SHA,c)
            (root/'cms-seed.json').write_text('[]');m['files']['cms-seed.json']=w.digest(b'[]')
            p=root/'artikler/selected.html';p.write_text('<main data-publication-hold>old block</main>');m['files']['artikler/selected.html']=w.digest(p.read_bytes());w.write(root/w.MANIFEST,m)
            with self.assertRaises(ValueError):w.manifest(root,SHA,c)

    def test_zip_reproducibility_and_archive_tampering(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)/'package';root.mkdir();self.fixture(root)
            a=Path(temp)/'a.zip';b=Path(temp)/'b.zip'
            self.assertEqual(w.archive(root,a),w.archive(root,b));w.check_archive(root,a)
            (root/'index.html').write_text('changed')
            with self.assertRaises(ValueError):w.check_archive(root,a)

    def test_source_gate_old_main_dirty_detached_and_wrong_ancestry(self):
        c={'source_sha':w.ANCHOR}
        clean=[SHA,'codex/c07','', 'tree']
        with patch.object(w,'git',side_effect=clean),patch.object(w.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            self.assertEqual(w.source_gate(Path('.'),SHA,c)['source_tree'],'tree')
        for values in [[SHA,'main'],[SHA,''],[SHA,'feature/unreviewed'],[SHA,'codex/c07',' M source.js']]:
            with patch.object(w,'git',side_effect=values),patch.object(w.subprocess,'run',return_value=subprocess.CompletedProcess([],0)),self.assertRaises(ValueError):w.source_gate(Path('.'),SHA,c)
        with patch.object(w,'git',side_effect=[SHA,'codex/old']),patch.object(w.subprocess,'run',return_value=subprocess.CompletedProcess([],1)),self.assertRaises(ValueError):w.source_gate(Path('.'),SHA,c)

    def project(self):
        return {'name':'modus','id':w.PROJECT_ID,'subdomain':'modus-4ye.pages.dev','production_branch':'main','source':{'config':{'deployments_enabled':False,'production_deployments_enabled':False,'preview_deployment_setting':'none'}},'canonical_deployment':{'id':'baseline','url':'https://1234abcd.modus-4ye.pages.dev','deployment_trigger':{'metadata':{'commit_hash':w.ANCHOR}},'latest_stage':{'status':'success'}}}

    def test_cloud_gate_old_deployment_and_auto_deploy_refused(self):
        p=self.project();w.project_gate(p,{},w.ANCHOR,'baseline')
        for field in ['deployments_enabled','production_deployments_enabled','preview_deployment_setting']:
            bad=copy.deepcopy(p);bad['source']['config'][field]='all' if field=='preview_deployment_setting' else True
            with self.assertRaises(ValueError):w.project_gate(bad,{},w.ANCHOR,'baseline')
        with self.assertRaises(ValueError):w.project_gate(p,{},SHA,'baseline')
        with self.assertRaises(ValueError):w.project_gate(p,{},w.ANCHOR,'old')

    def test_public_targets_and_redirect_normalization(self):
        for url in ['https://modus-2-preview.pages.dev','https://modus.no','http://modus-4ye.pages.dev','https://modus-4ye.pages.dev/?key=x','https://evil.modus-4ye.pages.dev','https://user@modus-4ye.pages.dev']:
            with self.assertRaises(ValueError):w.origin(url)
        for name,canonical in [('index.html','/'),('artikler/x.html','/artikler/x')]:
            with patch.object(w,'request',side_effect=[(301,{'location':canonical},b''),(200,{},b'correct')]):
                self.assertEqual(w.public_get(w.PUBLIC,name)[2],b'correct')
        with patch.object(w,'request',return_value=(302,{'location':'https://evil.invalid'},b'')),self.assertRaises(ValueError):w.public_get(w.PUBLIC,'index.html')

    def test_public_bytes_wrong_hash_status_headers_and_access_fail(self):
        for response in [(200,{'content-security-policy':'test','x-content-type-options':'nosniff'},b'old'),(403,{},b'right'),(200,{},b'right')]:
            with patch.object(w,'public_get',return_value=response),self.assertRaises(ValueError):w.verify_files(Path('.'),{'index.html':w.digest(b'right')},w.PUBLIC)
        with tempfile.TemporaryDirectory() as temp:
            c,_=self.fixture(Path(temp))
            def request(url,*args):
                if url.startswith(w.PUBLIC):return 404,{},b''
                return 302,{'location':'https://'+c['access_host']+'/cdn-cgi/access/login/test'},b''
            with patch.object(w,'request',side_effect=request):self.assertEqual(len(w.perimeter(c)),48)
            for status,location in [(403,''),(200,''),(302,'https://evil.invalid/cdn-cgi/access/login/test')]:
                def bad(url,*args):return (404,{},b'') if url.startswith(w.PUBLIC) else (status,{'location':location},b'')
                with patch.object(w,'request',side_effect=bad),self.assertRaises(ValueError):w.perimeter(c)

    def test_only_declared_retirement_redirect_to_404_is_accepted(self):
        with tempfile.TemporaryDirectory() as temp:
            c,_=self.fixture(Path(temp));c['retired_redirects']={'media/modus-introduksjon.mp4':'/retired-media-resource'}
            def request(url,*args):
                if url==w.PUBLIC+'/media/modus-introduksjon.mp4': return 302,{'location':'/retired-media-resource'},b''
                if url.startswith(w.PUBLIC):return 404,{},b''
                return 302,{'location':'https://'+c['access_host']+'/cdn-cgi/access/login/test'},b''
            with patch.object(w,'request',side_effect=request):self.assertEqual(len(w.perimeter(c)),48)
            for location in ['https://evil.invalid/retired-media-resource','/arbitrary-page']:
                def bad(url,*args):
                    if url==w.PUBLIC+'/media/modus-introduksjon.mp4':return 302,{'location':location},b''
                    return request(url,*args)
                with patch.object(w,'request',side_effect=bad),self.assertRaises(ValueError):w.perimeter(c)
            def exposed(url,*args):
                if url==w.PUBLIC+'/retired-media-resource':return 200,{},b'old film'
                return request(url,*args)
            with patch.object(w,'request',side_effect=exposed),self.assertRaises(ValueError):w.perimeter(c)

    def test_scope_does_not_silently_change_public_content(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);c,_=self.fixture(root);empty={'allowed_changes':[],'allowed_additions':[],'allowed_removals':[]}
            w.check_delta(root,c,empty)
            (root/'index.html').write_text('unexpected redesign')
            with self.assertRaises(ValueError):w.check_delta(root,c,empty)
            self.assertEqual(w.check_delta(root,c,{**empty,'allowed_changes':['index.html']})['changed'],['index.html'])

    def test_inventory_loss_and_rehashed_secrets_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);c,m=self.fixture(root)
            empty={'allowed_changes':[],'allowed_additions':[],'allowed_removals':[]}
            (root/'index.html').unlink()
            with self.assertRaises(ValueError):w.check_delta(root,c,empty)
            for secret in ['-----BEGIN PRIVATE KEY-----','sb_secret_'+'x'*24,'sk_live_'+'x'*24,'ghp_'+'x'*24]:
                (root/'index.html').write_text(secret)
                m['files']['index.html']=w.digest(secret.encode());w.write(root/w.MANIFEST,m)
                with self.subTest(secret=secret[:12]),self.assertRaises(ValueError):w.manifest(root,SHA,c)

    def test_baseline_tampering_and_wrong_identity_are_rejected(self):
        # Copy only the baseline, not a historical sibling checkout.
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);original=w.read(w.ROOT/'release-inputs/production-baseline.json')
            (root/'release-inputs').mkdir()
            shutil.copytree(w.ROOT/original['package'],root/original['package'])
            lock=root/'release-inputs/production-baseline.json'
            with patch.object(w.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
                for field,value in [('project','modus-2-preview'),('source_sha','short'),('origin','https://modus.no')]:
                    w.write(lock,{**original,field:value})
                    with self.subTest(field=field),self.assertRaises(ValueError):w.config(root)
                w.write(lock,original)
                (root/original['package']/'index.html').write_text('tampered baseline')
                with self.assertRaises(ValueError):w.config(root)

    def test_candidate_seals_qa_manifest_zip_and_source_tree(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);directory=root/'candidate';package=directory/'package';package.mkdir(parents=True)
            c,m=self.fixture(package);m['source_tree']='d'*40;w.write(package/w.MANIFEST,m)
            (root/'release-inputs').mkdir();w.write(root/'release-inputs/production-delta.json',{'allowed_changes':[],'allowed_additions':[],'allowed_removals':[]})
            qa={'status':'LOCAL_CANDIDATE_PASSED','sourceSha':SHA};w.write(directory/'qa.json',qa)
            report={'status':'READY_FOR_OWNER_REVIEW','source_sha':SHA,'source_tree':'d'*40,'manifest_sha256':w.digest((package/w.MANIFEST).read_bytes()),'qa_sha256':w.digest((directory/'qa.json').read_bytes()),'zip_sha256':w.archive(package,directory/'candidate.zip')};w.write(directory/'report.json',report)
            with patch.object(w,'source_gate',return_value={'source_tree':'d'*40}):
                w.candidate(root,directory,c)
                w.write(directory/'qa.json',{**qa,'status':'FAILED'})
                with self.assertRaises(ValueError):w.candidate(root,directory,c)
                w.write(directory/'qa.json',qa)
                w.write(package/w.MANIFEST,{**m,'source_tree':'c'*40})
                with self.assertRaises(ValueError):w.candidate(root,directory,c)

    def test_explicit_exact_owner_approval_required_and_stale_state_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);a=root/'approval.json'
            r={'source_sha':SHA,'zip_sha256':'b'*64};c={'deployment_id':'baseline'}
            good={'project':'modus','source_sha':SHA,'zip_sha256':'b'*64,'baseline_deployment':'baseline','owner_approved':True,'approval_reference':'Explicit owner GO in chat'}
            for key,value in [('owner_approved',False),('source_sha','c'*40),('zip_sha256','c'*64),('baseline_deployment','old'),('approval_reference','')]:
                w.write(a,{**good,key:value})
                with patch.object(w,'candidate',return_value=(r,{})),self.subTest(key=key),self.assertRaises(ValueError):w.preflight(root,root,a,c)
            w.write(a,good)
            with patch.object(w,'candidate',return_value=(r,{})),patch.object(w,'baseline_status',side_effect=ValueError('production advanced')),self.assertRaises(ValueError):w.preflight(root,root,a,c)
            with patch.object(w,'candidate',return_value=(r,{})),patch.object(w,'baseline_status',return_value={'deployment':'baseline'}),patch.object(w,'perimeter',return_value=[]):
                result=w.preflight(root,root,a,c);self.assertEqual(result['status'],'C06_PREFLIGHT_PASSED');self.assertFalse(result['deployed']);self.assertIn('modus',result['command'])

    def test_c06_upload_is_separate_and_postcheck_is_mandatory(self):
        sys.path.insert(0,str(w.ROOT/'scripts'))
        spec=importlib.util.spec_from_file_location('c06',w.ROOT/'scripts/c06-publish.py')
        c06=importlib.util.module_from_spec(spec);spec.loader.exec_module(c06)
        plan={'command':['wrangler','pages','deploy','/sealed/package','--project-name','modus','--branch','main'],'source_sha':SHA}
        c={'account_id':'synthetic','deployment_id':'old'}
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp);(out/'package').mkdir()
            (out/'package/index.html').write_text('sealed synthetic package')
            for failure in [False,True]:
                with patch.object(c06.w,'config',return_value=c),patch.object(c06.w,'candidate',return_value=({'source_sha':SHA},{})),patch.object(c06.w,'preflight',return_value=plan),patch.object(c06.shutil,'which',return_value='/installed/wrangler'),patch.object(c06.w,'run_stage') as run,patch.object(c06.w,'cloud_project',return_value={'canonical_deployment':{'id':'new'}}),patch.object(c06.w,'verify',side_effect=ValueError('public bytes wrong') if failure else None,return_value={'status':'PUBLIC_VERIFIED','deployed':False}) as verify:
                    result=c06.publish(out,out/'go.json',SHA,out)
                    self.assertTrue(result['upload_attempted']);self.assertTrue(result['deployed']);verify.assert_called_once();run.assert_called_once()
                    self.assertEqual(result['status'],'PUBLICATION_NOT_VERIFIED' if failure else 'PUBLIC_VERIFIED')
            with patch.object(c06.w,'config',return_value=c),patch.object(c06.w,'candidate',return_value=({'source_sha':SHA},{})),patch.object(c06.w,'run_stage') as run,self.assertRaises(ValueError):
                c06.publish(out,out/'go.json','b'*40,out)
            run.assert_not_called()
            with patch.object(c06.w,'config',return_value=c),patch.object(c06.w,'candidate',return_value=({'source_sha':SHA},{})),patch.object(c06.w,'preflight',return_value=plan),patch.object(c06.shutil,'which',return_value='/installed/wrangler'),patch.object(c06.w,'run_stage',side_effect=ValueError('upload interrupted')),patch.object(c06.w,'verify') as verify:
                result=c06.publish(out,out/'go.json',SHA,out)
                self.assertIsNone(result['deployed']);self.assertTrue(result['upload_attempted']);verify.assert_not_called()

    def test_qa_failure_or_timeout_never_becomes_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            with patch.object(w,'source_gate',return_value={}),patch.object(w,'run_stage',side_effect=ValueError('tests failed')),self.assertRaises(ValueError):w.prepare(root,SHA,root,{})
            with self.assertRaises(ValueError):w.run_stage(w.ROOT,[sys.executable,'-c','raise SystemExit(7)'],root/'failed.log',{},timeout=3)
            with self.assertRaises(ValueError):w.run_stage(w.ROOT,[sys.executable,'-c','import time;time.sleep(10)'],root/'timeout.log',{},timeout=.05)


if __name__=='__main__':unittest.main()
