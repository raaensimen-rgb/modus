"""Pure final-byte verification, shared by local tests and the mandatory upload gate."""
import hashlib,json,re,sys
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from preview_mode import CSP,PROJECT,BRANCH

class SecurityHead(HTMLParser):
    def __init__(self,text):
        super().__init__();self.meta=[];self.scripts=[];self.mode=None;self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.mode=a.get('data-modus-preview')
        if tag=='meta' and a.get('http-equiv','').lower()=='content-security-policy':self.meta.append(a.get('content'))
        if tag=='script':self.scripts.append(a.get('src'))

def inspect_artifact(dist,expected_sha=None):
    dist=Path(dist).resolve();errors=[]
    files={p.relative_to(dist).as_posix():p.read_bytes() for p in dist.rglob('*') if p.is_file()}
    texts={}
    for n,b in files.items():
        try:texts[n]=b.decode('utf-8')
        except UnicodeDecodeError:pass
    refs=sorted(n for n,t in texts.items() if re.search(r'[a-z0-9-]+\.supabase\.(?:co|in)|sb_publishable_[A-Za-z0-9_-]{10,}|cms_save_draft|cms_publish_article',t,re.I))
    secrets=sorted(n for n,t in texts.items() if re.search(r'sb_secret_[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',t))
    if refs:errors.append('Backend/client credential references remain')
    if secrets:errors.append('Secret-looking material remains')
    runtime=sorted(n for n in files if n in ('editor.js','_worker.js','_routes.json') or n.startswith(('functions/','cms/')) or n.endswith('/editor.js'))
    if runtime:errors.append('Editor/CMS runtime remains')
    private=sorted(n for n in files if n.startswith(('content/','editorial/','docs/','tests/','design-references/','.build-private/')) or Path(n).name.startswith('.env'))
    if private:errors.append('Private/source paths remain')
    for name in ('konto.html','en/konto.html','redaktor.html','en/redaktor.html'):
        text=texts.get(name,'')
        if 'data-preview-unavailable' not in text or re.search(r'<form\b|editorLoginForm|feedbackAdminList|editorInbox',text):errors.append('Missing static unavailable surface: '+name)
    if any(re.search(r'href=[\"\']https://(?:buy|billing)\.stripe\.com/',t) for n,t in texts.items() if n.endswith('.html')):errors.append('Payment navigation remains enabled')
    if 'fetch(' in texts.get('feedback.js','') or 'fetch(' in texts.get('en/feedback.js',''):errors.append('Feedback submit code remains')
    try:seed=json.loads(texts.get('cms-seed.json','null'))
    except ValueError:seed=None
    if seed!=[]:errors.append('CMS seed is not empty')
    header='/*\n  Content-Security-Policy: '+CSP+"; frame-ancestors 'none'\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n"
    if texts.get('_headers')!=header:errors.append('Missing or altered whole-site Preview headers')
    guard=(ROOT/'client/preview-guard.js').read_bytes()
    for name in ('preview-guard.js','en/preview-guard.js'):
        if files.get(name)!=guard:errors.append('Missing or untrusted network guard: '+name)
    for name,text in texts.items():
        if not name.endswith('.html'):continue
        p=SecurityHead(text)
        if p.mode!='isolated' or p.meta!=[CSP] or not p.scripts or not p.scripts[0]:
            errors.append('Missing early CSP/guard in '+name);continue
        resolved=(dist/Path(name).parent/p.scripts[0]).resolve()
        if resolved not in (dist/'preview-guard.js',dist/'en/preview-guard.js'):errors.append('Guard not first script in '+name)
    try:marker=json.loads(texts.get('preview-isolation.json','null'))
    except ValueError:marker=None
    actual=[{'path':n,'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items()) if n!='preview-isolation.json']
    if not isinstance(marker,dict):errors.append('Missing isolation manifest')
    else:
        if (marker.get('schema_version'),marker.get('mode'),marker.get('project'),marker.get('branch'),marker.get('backend'),marker.get('csp'))!=(1,'isolated',PROJECT,BRANCH,'disabled',CSP):errors.append('Invalid isolation configuration')
        if marker.get('files')!=actual:errors.append('Stale/tampered final-file manifest')
        if expected_sha and (marker.get('source_sha')!=expected_sha or marker.get('tracked_source_dirty') is not False):errors.append('Unreviewed source provenance')
    manifest=[{'path':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items())]
    return {'blockers':errors,'supabase_reference_files':refs,'secret_candidate_files':secrets,'runtime_files':runtime,'private_paths':private,'cms_seed_empty':seed==[],'isolation_mode':marker.get('mode') if isinstance(marker,dict) else None,'manifest_sha256':hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'manifest':manifest}
