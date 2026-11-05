"""Offline preparation tests. Never execute SQL or contact a network/backend.
OA ids are trace links, NOT claims of completed isolated API/Auth acceptance.
"""
import copy
import json
from pathlib import Path
import subprocess
import unittest
from model import Model, Denied, article, canonical, candidate_digest, context, digest
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

class Preparation(unittest.TestCase):
    def challenge(self, m, loc='nb'):
        c=context(); cid=m.prepare(c,loc); m.issue_receipt_fixture(c,cid)
        return c,cid,m.challenges[cid]['nonce']
    def denied(self, action):
        with self.assertRaises(Denied): action()
    def test_OA01_positive_synthetic_only(self):
        m=Model(); aid=m.approve_fixture(); self.assertTrue(m.effective(aid))
        self.assertEqual(m.events.count('OWNER_APPROVED'),1); self.assertEqual(m.publications,[])
    def test_OA02_roles(self):
        for role in ('anon','auth-anonymous','general','editor','service','email-match-only'):
            with self.subTest(role=role): self.denied(lambda:Model().prepare(context(role)))
    def test_OA03_untrusted_authority_fields(self):
        for extra in ({'actor':'synthetic-owner'},{'approved':True},{'hash':'a'*64},{'timestamp':1},{'role':'owner'}):
            m=Model(); c,cid,n=self.challenge(m); self.denied(lambda:m.confirm(c,cid,n,'r',extra)); self.assertEqual(m.approvals,{})
    def test_OA04_auth_failure_fixture_not_crypto(self):
        for field in ('token_valid','session_live'):
            m=Model(); c=context(); c[field]=False; self.denied(lambda:m.prepare(c)); self.assertEqual(m.challenges,{})
    def test_OA05_no_fresh_receipt(self):
        m=Model(); c=context(); cid=m.prepare(c); c['aal']=1
        self.denied(lambda:m.issue_receipt_fixture(c,cid))
        c['aal']=2; self.denied(lambda:m.confirm(c,cid,m.challenges[cid]['nonce'],'r'))
    def test_OA06_static_bypass_and_inactive_acl_draft(self):
        sql=(ROOT/'supabase/schema/article-editor.sql').read_text()
        self.assertIn('grant select,insert,update on public.cms_article_drafts',sql)
        self.assertIn('security invoker',sql)
        for p in (HERE/'drafts').glob('*.sql.txt'):
            s=p.read_text(); self.assertIn('RAISE EXCEPTION',s); self.assertTrue(s.rstrip().endswith('ROLLBACK;'))
            self.assertIn('NOT EXECUTED',s)
        self.assertNotIn('GRANT EXECUTE', (HERE/'drafts/02-cutover-contract.sql.txt').read_text())
    def test_OA07_epoch_and_binding(self):
        m=Model(); a=m.approve_fixture(); m.enabled=False; self.assertFalse(m.effective(a))
        m.epoch+=1; m.enabled=True; self.assertFalse(m.effective(a)); self.denied(lambda:m.prepare(context('editor')))
    def test_OA08_target_tamper_locale_separate(self):
        fields={'repository_scope':'other','slug':'other','locale':'en','revision':9,'hash_algorithm':'local',
          'content_sha256':'f'*64,'media_manifest_sha256':'f'*64,'review_bundle_id':'other',
          'review_bundle_sha256':'f'*64,'owner_binding_version':9,'render_contract_version':'other','content_schema_version':'other'}
        for field,value in fields.items():
            m=Model(); c,cid,n=self.challenge(m); m.challenges[cid]['target'][field]=value
            self.denied(lambda:m.confirm(c,cid,n,'r')); self.assertEqual(m.approvals,{})
        m=Model(); a=m.approve_fixture('nb'); self.assertEqual(m.approvals[a]['target']['locale'],'nb')
        self.assertFalse(any(a['target']['locale']=='en' for a in m.approvals.values()))
    def test_OA09_sequential_interleavings_not_sql_concurrency(self):
        m=Model(); c,cid,n=self.challenge(m); m.save(context('editor'),article(),1)
        self.denied(lambda:m.confirm(c,cid,n,'r'))
        m=Model(); a=m.approve_fixture(); m.save(context('editor'),article(),1); self.assertFalse(m.effective(a))
        m=Model(); c,cid,n=self.challenge(m); m.revoke_evidence('nb'); self.denied(lambda:m.confirm(c,cid,n,'r'))
    def test_OA10_material_mutation(self):
        a=article(); h=candidate_digest(a,[])
        for mutate in (lambda x:x.update(title='Changed'),lambda x:x['quiz'][0].update(answer=1),
          lambda x:x['learning'].update(goals=['Changed']),lambda x:x['image'].update(src='/images/test.svg'),
          lambda x:x['image'].update(alt='Changed'),lambda x:x['sections'][0].__setitem__(1,'<p>Changed</p>')):
            b=copy.deepcopy(a); mutate(b); self.assertNotEqual(h,candidate_digest(b,[]))
        self.assertNotEqual(h,candidate_digest(a,[{'resource':'synthetic','sha256':'a'*64}]))
    def test_OA11_ui_only(self):
        a=article(); b=copy.deepcopy(a); b['_ui']={'panel':'review','savedAt':777,'local_status':'checked'}
        self.assertEqual(candidate_digest(a,[]),candidate_digest(b,[]))
    def test_OA12_revision_and_revert(self):
        m=Model(); aid=m.approve_fixture(); m.save(context('editor'),article(),1)
        self.assertFalse(m.effective(aid)); self.denied(lambda:m.save(context('editor'),article(),1))
        b=article(); b['title']='Changed'; m.save(context('editor'),b,2); m.save(context('editor'),article(),3)
        self.assertFalse(m.effective(aid)); self.assertEqual(len(m.history),5)
    def test_OA13_replay_session_expiry_idempotency(self):
        m=Model(); c,cid,n=self.challenge(m); a=m.confirm(c,cid,n,'r')
        self.assertEqual(a,m.confirm(c,cid,n,'r')); self.assertEqual(m.events.count('OWNER_APPROVED'),1)
        self.denied(lambda:m.confirm(c,cid,n,'other'))
        other=m.prepare(c,'en'); m.issue_receipt_fixture(c,other)
        self.denied(lambda:m.confirm(c,other,m.challenges[other]['nonce'],'r'))
        for mode in ('session','expiry','nonce'):
            m=Model(); c,cid,n=self.challenge(m)
            if mode=='session': c['session']='other'
            if mode=='expiry': m.now+=300
            if mode=='nonce': n='wrong'
            self.denied(lambda:m.confirm(c,cid,n,'r'))
    def test_OA14_revoke_stale_and_logout(self):
        m=Model(); a=m.approve_fixture(); m.save(context('editor'),article(),1); m.revoke_evidence('nb')
        c=context(); cid=m.prepare(c,purpose='revoke',approval_id=a); m.issue_receipt_fixture(c,cid)
        m.confirm(c,cid,m.challenges[cid]['nonce'],'revoke'); self.assertTrue(m.approvals[a]['revoked'])
        m=Model(); a=m.approve_fixture(); c=context(); c['session_live']=False
        self.assertTrue(m.effective(a)); self.denied(lambda:m.prepare(c))
    def test_OA15_F01_to_F04_gates_fixture(self):
        for key in ('F01','F02','F03','F04'):
            m=Model(); m.bundles['nb'][key]=False; self.denied(lambda:m.prepare(context()))
    def test_OA16_candidate_vectors_and_unknown_domains(self):
        vectors=[{}, {'z':'Å😀音\n\t"\\','a':[True,None,-1,9007199254740991]},
                 {'composed':'é','decomposed':'e\u0301'}, {'text':'\u2028\u2029/<>'}]
        out=subprocess.run(['node',str(HERE/'canonical-candidate.mjs')],input=json.dumps(vectors),text=True,capture_output=True,check=True)
        for v, js in zip(vectors,json.loads(out.stdout)):
            self.assertEqual(canonical(v).decode(),js['bytes']); self.assertEqual(digest(v),js['sha256'])
        self.assertNotEqual(digest('é'),digest('e\u0301'))
        for v in (1.5, '\ud800','\x00', {'æ':1}, 9007199254740992):
            with self.assertRaises(ValueError): canonical(v)
        with self.assertRaises(ValueError): candidate_digest({**article(),'approved':True},[])
    def test_OA17_existing_git_gate_not_owner_model(self):
        import sys
        sys.path.insert(0,str(ROOT/'scripts'))
        from publication import is_public
        m=Model(); m.approve_fixture()
        self.assertFalse(is_public({'editorial_status':'draft','visibility':'private','approved_locales':[]}))
        self.assertEqual(m.publications,[])
    def test_OA18_dependency_outage(self):
        m=Model(); c,cid,n=self.challenge(m); m.dependency_available=False
        self.denied(lambda:m.confirm(c,cid,n,'r')); self.assertEqual(m.approvals,{})
    def test_OA19_audit_failure_retry_cancel(self):
        m=Model(); c,cid,n=self.challenge(m); before=copy.deepcopy(m.__dict__); m.audit_available=False
        self.denied(lambda:m.confirm(c,cid,n,'r')); self.assertFalse(m.challenges[cid]['used']); self.assertEqual(m.approvals,{})
        m.audit_available=True; first=m.confirm(c,cid,n,'r'); self.assertEqual(first,m.confirm(c,cid,n,'r'))
        m=Model(); c,cid,n=self.challenge(m)  # cancelled: do not confirm
        self.assertEqual(m.approvals,{}); self.assertNotIn('OWNER_APPROVED',m.events)
    def test_OA20_static_no_backend_import_and_private_build_finalizer(self):
        s=(HERE/'model.py').read_text(); self.assertNotIn('import requests',s); self.assertNotIn('createClient',s)
        final=(ROOT/'scripts/finalize-preview.py').read_text()
        self.assertIn('cms-seed.json',final); self.assertIn('cms_publish_article',final)
        self.assertFalse((ROOT/'dist/docs/red-005b-a').exists())
    def test_OA21_wrong_mandate_fixture(self):
        m=Model(); m.bundles['nb']['K01']=False; self.denied(lambda:m.prepare(context()))
    def test_OA22_source_support_fixture_not_truth_verification(self):
        m=Model(); m.bundles['nb']['K02']=False; self.denied(lambda:m.prepare(context()))
    def test_OA23_rights_scope_fixture(self):
        m=Model(); m.bundles['en']['K03']=False; m.approve_fixture('nb'); self.denied(lambda:m.prepare(context(),'en'))
    def test_OA24_revoke_evidence_same_revision(self):
        m=Model(); a=m.approve_fixture(); target=copy.deepcopy(m.approvals[a]['target'])
        m.revoke_evidence('nb'); self.assertFalse(m.effective(a)); self.assertEqual(target,m.target('nb'))
        m.bundles['nb'].update(valid=True,id='replacement',hash='c'*64)
        self.assertFalse(m.effective(a)); m.approve_fixture(request_id='new-evidence-decision')
    def test_OA25_receipt_trust_and_binding_fixture(self):
        for mode in ('untrusted','old-provider','alter-target','old-epoch'):
            m=Model(); c=context(); cid=m.prepare(c)
            if mode in ('untrusted','old-provider'):
                self.denied(lambda:m.issue_receipt_fixture(c,cid,trusted_gate=mode!='untrusted',provider_challenge_new=mode!='old-provider'))
            else:
                m.issue_receipt_fixture(c,cid)
                if mode=='alter-target':m.receipts[cid]['target_hash']='f'*64
                else:m.epoch+=1
                self.denied(lambda:m.confirm(c,cid,m.challenges[cid]['nonce'],'r'))
    def test_OA26_legitimate_save_optimistic_history_and_incomplete(self):
        m=Model(); a=article(); a['title']=''; a['quiz']=[]; a['image']['src']='/images/unknown.svg'
        self.assertEqual(m.save(context('editor'),a,1),2); self.assertEqual(m.history[-1]['payload'],a)
        before=copy.deepcopy(m.__dict__); self.denied(lambda:m.save(context('editor'),a,1)); self.assertEqual(before,m.__dict__)
        self.denied(lambda:m.save(context('service'),a,2)); self.denied(lambda:m.prepare(context()))
    def test_OA27_cancel_conflict_plan_not_ui_acceptance(self):
        m=Model(); c,cid,n=self.challenge(m); m.now+=301
        self.denied(lambda:m.confirm(c,cid,n,'r')); self.assertNotIn('OWNER_APPROVED',m.events)
        self.assertIn('ingen skjult save',(HERE/'contracts.md').read_text())
    def test_OA28_no_publication_any_model_actor(self):
        m=Model(); m.approve_fixture()
        for r in ('anon','editor','owner','service','admin'):
            self.denied(lambda:m.publish(context(r)))
        self.assertEqual(m.publications,[])

if __name__=='__main__': unittest.main(verbosity=2)
