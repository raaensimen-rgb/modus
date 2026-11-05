"""INACTIVE synthetic state machine, not an Auth/SQL/server implementation.
No SDK, HTTP, database, real identities, credentials or production article data.
Fixture trust flags simulate boundaries; passing these does not verify those boundaries.
"""
import copy
import hashlib
import json

DOMAIN = 'modus-owner-snapshot-v1'
SCOPE = 'raaensimen-rgb/modus'
FIELDS = set('slug locale title intro level category topic sections exercise practice practice_label image quiz learning practice_steps next_step'.split())

def canonical(value):
    def check(v):
        if v is None or type(v) is bool:
            return
        if type(v) is int and abs(v) <= 9007199254740991:
            return
        if type(v) is str:
            if '\x00' in v or any(0xD800 <= ord(c) <= 0xDFFF for c in v):
                raise ValueError('invalid Unicode')
            return
        if type(v) is list:
            for x in v: check(x)
            return
        if type(v) is dict and all(type(k) is str and k.isascii() for k in v):
            for k, x in v.items(): check(k); check(x)
            return
        raise ValueError('unsupported canonical value')
    check(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')

def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()

def candidate_digest(article, media):
    if set(article) - FIELDS - {'_ui'}:
        raise ValueError('unknown content field')
    return digest({'domain': DOMAIN, 'content_schema_version': 'candidate-1',
                   'render_contract_version': 'candidate-1',
                   'content': {k: v for k, v in article.items() if k in FIELDS},
                   'media_manifest': media})

def article(locale='nb'):
    return {'slug': 'synthetic-owner-test', 'locale': locale, 'title': 'Syntetisk Å / 音',
            'intro': 'Not real editorial content', 'sections': [['A', '<p>Test</p>']],
            'quiz': [{'question': 'Q', 'options': ['A','B','C'], 'answer': 0, 'section': 1}],
            'learning': {'goals': ['Test']}, 'image': {'src':'', 'alt':''}}

def context(role='owner'):
    return {'role': role, 'actor': 'synthetic-owner' if role == 'owner' else 'synthetic-editor',
            'session': 'synthetic-session', 'token_valid': True, 'session_live': True,
            'aal': 2, 'editor_enabled': role == 'editor'}

class Denied(Exception): pass

class Model:
    def __init__(self):
        self.now = 1000
        self.epoch = 1
        self.enabled = True
        self.drafts, self.history, self.challenges, self.receipts = {}, [], {}, {}
        self.bundles, self.approvals, self.operations, self.events = {}, {}, {}, []
        self.publications = []
        self.dependency_available = True
        self.audit_available = True
        self.seq = 0
        for loc in ('nb', 'en'):
            self.save(context('editor'), article(loc), 0)
            self.bundles[loc] = {'id': 'synthetic-bundle-'+loc, 'hash': 'b'*64,
                'valid': True, 'F01': True, 'F02': True, 'F03': True, 'F04': True,
                'K01': True, 'K02': True, 'K03': True}
    def auth(self, c, owner=False):
        if not self.dependency_available: raise Denied('dependency unavailable')
        if not c['token_valid'] or not c['session_live']: raise Denied('authentication')
        if owner and (c['role'] != 'owner' or c['actor'] != 'synthetic-owner' or not self.enabled):
            raise Denied('owner authorization')
    def save(self, c, a, expected):
        self.auth(c)
        if c['role'] != 'editor' or not c['editor_enabled']: raise Denied('editor authorization')
        loc = a['locale']
        current = self.drafts.get(loc)
        if loc not in ('nb', 'en') or a['slug'] != 'synthetic-owner-test': raise Denied('identity')
        if expected != (current['revision'] if current else 0): raise Denied('40001')
        if not self.audit_available: raise Denied('audit unavailable')
        # No image-resolution requirement for saving an incomplete draft.
        hashed = candidate_digest(a, [])
        rev = expected + 1
        self.drafts[loc] = {'payload': copy.deepcopy(a), 'revision': rev, 'hash': hashed}
        self.history.append(copy.deepcopy(self.drafts[loc]))
        self.events.append('DRAFT_SAVED')
        return rev
    def target(self, loc):
        d, b = self.drafts[loc], self.bundles[loc]
        return {'repository_scope': SCOPE, 'slug': d['payload']['slug'], 'locale': loc,
            'revision': d['revision'], 'hash_algorithm': DOMAIN, 'content_sha256': d['hash'],
            'content_schema_version': 'candidate-1', 'render_contract_version': 'candidate-1',
            'media_manifest_sha256': digest([]), 'review_bundle_id': b['id'],
            'review_bundle_sha256': b['hash'], 'owner_binding_version': self.epoch}
    def eligible(self, loc):
        b = self.bundles[loc]
        return (b['valid'] and all(b[k] for k in ('F01','F02','F03','F04','K01','K02','K03'))
                and not self.drafts[loc]['payload'].get('image', {}).get('src'))
    def prepare(self, c, loc='nb', purpose='approve', approval_id=None):
        self.auth(c, True)
        if purpose not in ('approve','revoke'): raise Denied('purpose')
        if purpose == 'approve':
            if not self.eligible(loc): raise Denied('not assessed')
            target = self.target(loc)
        else:
            old = self.approvals.get(approval_id)
            if not old: raise Denied('unknown approval')
            target = {'approval_id': approval_id, 'original': copy.deepcopy(old['target'])}
        self.seq += 1
        cid = 'synthetic-challenge-'+str(self.seq)
        # Deterministic fixture nonce is deliberately NOT a CSPRNG implementation.
        self.challenges[cid] = {'target': copy.deepcopy(target), 'purpose': purpose,
            'actor': c['actor'], 'session': c['session'], 'epoch': self.epoch,
            'created': self.now, 'expires': self.now+300, 'used': False, 'nonce': 'fixture-'+cid}
        return cid
    def issue_receipt_fixture(self, c, cid, trusted_gate=True, provider_challenge_new=True):
        self.auth(c, True)
        ch = self.challenges[cid]
        if (not trusted_gate or not provider_challenge_new or c['aal'] != 2
            or self.now >= ch['expires'] or c['session'] != ch['session']): raise Denied('step-up')
        self.receipts[cid] = {'verified': self.now, 'session': c['session'],
            'target_hash': digest(ch['target']), 'epoch': self.epoch, 'used': False}
    def effective(self, aid):
        if not self.dependency_available: return False
        a = self.approvals[aid]
        return (not a['revoked'] and self.enabled and a['target']['owner_binding_version']==self.epoch
                and self.eligible(a['target']['locale']) and a['target']==self.target(a['target']['locale']))
    def confirm(self, c, cid, nonce, request_id, extra=None):
        self.auth(c, True)
        if extra: raise Denied('unknown authority fields')
        ch = self.challenges[cid]
        operation_key = (c['actor'], request_id)
        binding = digest({'purpose': ch['purpose'], 'target': ch['target']})
        old = self.operations.get(operation_key)
        if old:
            if old['binding'] != binding: raise Denied('idempotency conflict')
            return {'operation_id': old['id'], 'effective': self.effective(old['id'])}
        r = self.receipts.get(cid)
        if (not r or c['aal'] != 2 or ch['used'] or r['used'] or nonce != ch['nonce']
            or c['actor'] != ch['actor'] or c['session'] != ch['session'] or r['session'] != c['session']
            or self.epoch != ch['epoch'] or self.epoch != r['epoch']
            or self.now >= ch['expires'] or self.now >= r['verified']+300
            or r['target_hash'] != digest(ch['target'])): raise Denied('challenge/receipt')
        if ch['purpose'] == 'approve':
            target = ch['target']
            if target != self.target(target['locale']) or not self.eligible(target['locale']): raise Denied('stale target/evidence')
        if not self.audit_available: raise Denied('audit unavailable')
        # The model has one sequential commit point, NOT a real concurrency/SQL proof.
        if ch['purpose'] == 'approve':
            aid = 'synthetic-approval-'+str(len(self.approvals)+1)
            self.approvals[aid] = {'target': copy.deepcopy(ch['target']), 'revoked':False}
            self.events.append('OWNER_APPROVED')
        else:
            aid = ch['target']['approval_id']
            self.approvals[aid]['revoked'] = True
            self.events.append('OWNER_REVOKED')
        ch['used'] = r['used'] = True
        self.operations[operation_key] = {'binding': binding, 'id':aid}
        return {'operation_id': aid, 'effective':self.effective(aid)}
    def approve_fixture(self, loc='nb', request_id='synthetic-request'):
        c = context(); cid = self.prepare(c, loc)
        self.issue_receipt_fixture(c, cid)
        return self.confirm(c, cid, self.challenges[cid]['nonce'], request_id)['operation_id']
    def revoke_evidence(self, loc):
        self.bundles[loc]['valid'] = False
        self.events.append('REVIEW_REVOKED')
    def publish(self, c):
        raise Denied('publication closed for all actors')
