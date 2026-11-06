"""PL-AUTO-001: local candidate preparation and read-only C06 release controls.
No deploy, Git write, database, Access or Cloudflare mutation is implemented here.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ANCHOR = '1721e302a3880804073e0dcb0de6543f939ba0f6'
MANIFEST = 'release-manifest.json'
PUBLIC = 'https://modus-4ye.pages.dev'
PROJECT_ID = 'befea306-6ef6-4282-9fbb-a754c93e6d1b'
SHA = re.compile(r'[0-9a-f]{40}')
HASH = re.compile(r'[0-9a-f]{64}')


def read(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result: raise ValueError('Duplicate JSON key: '+key)
            result[key] = value
        return result
    return json.loads(Path(path).read_text(), object_pairs_hook=unique)


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


def safe_name(name):
    if not isinstance(name, str) or not name or '\\' in name or '%' in name or any(ord(c)<32 for c in name):
        raise ValueError('Unsafe package path')
    p = PurePosixPath(name)
    if p.is_absolute() or any(s in ('', '.', '..') for s in name.split('/')) or '?' in name or '#' in name or ':' in name:
        raise ValueError('Unsafe package path: ' + name)
    return name


def inventory(root):
    root = Path(root)
    if root.is_symlink() or not root.is_dir():
        raise ValueError('Package must be a real directory')
    result = {}
    for p in sorted(root.rglob('*')):
        if p.is_symlink():
            raise ValueError('Package symlinks are forbidden')
        if p.is_file():
            result[safe_name(p.relative_to(root).as_posix())] = digest(p.read_bytes())
    return result


def file_map(value):
    if isinstance(value, dict):
        rows = list(value.items())
    elif isinstance(value, list):
        rows = [(v['path'], v['sha256']) for v in value]
    else:
        raise ValueError('Unsupported file manifest')
    result = {}
    for name, hash_value in rows:
        safe_name(name)
        if name in result or name == MANIFEST or not isinstance(hash_value, str) or not HASH.fullmatch(hash_value):
            raise ValueError('Duplicate, recursive or invalid file manifest entry')
        result[name] = hash_value
    return result


def config(root=ROOT):
    c = read(root/'release-inputs/production-baseline.json')
    if (c['project'], c['project_id'], c['origin']) != ('modus', PROJECT_ID, PUBLIC) or not SHA.fullmatch(c['source_sha']):
        raise ValueError('Wrong production target/baseline')
    if subprocess.run(['git','merge-base','--is-ancestor',ANCHOR,c['source_sha']],cwd=root,capture_output=True).returncode:
        raise ValueError('Production baseline may not precede current MODUS 2.0 anchor')
    base = root/safe_name(c['package'])
    if inventory(base) != c['files']:
        raise ValueError('Pinned production package changed')
    marker = read(base/MANIFEST)
    if marker['source_sha'] != c['source_sha'] or marker.get('production_project', marker.get('project')) != 'modus':
        raise ValueError('Pinned production identity mismatch')
    if file_map(marker['files']) != {n:h for n,h in c['files'].items() if n != MANIFEST}:
        raise ValueError('Pinned production manifest mismatch')
    return c


def source_gate(root, sha, c):
    if not SHA.fullmatch(sha) or git(root, 'rev-parse', 'HEAD') != sha:
        raise ValueError('Source must match exact reviewed SHA')
    branch = git(root, 'branch', '--show-current')
    if not branch or branch in ('main', 'master'):
        raise ValueError('Use an isolated development branch, never Git main')
    for ancestor in (ANCHOR, c['source_sha']):
        if subprocess.run(['git', 'merge-base', '--is-ancestor', ancestor, sha], cwd=root, capture_output=True).returncode:
            raise ValueError('Source does not descend from authoritative MODUS 2.0 production')
    if git(root, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('Commit all reviewed source changes before preparation')
    return {'source_sha':sha, 'source_tree':git(root,'rev-parse','HEAD^{tree}'), 'source_branch':branch}


def public_boundary(package, files, c):
    forbidden = re.compile(r'(^|/)(?:content|editorial|cms|docs|tests|functions|private|release-inputs|\.git)(?:/|$)|(^|/)(?:\.env[^/]*|admin-app\.js|admin-package\.json|editor(?:-admin)?\.js|_worker\.js|library-draft-backup\.json)$')
    secrets = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{12,}|sb_publishable_[A-Za-z0-9_-]{10,}|[a-z0-9-]+\.supabase\.(?:co|in)|cms_save_draft|cms_publish_article', re.I)
    for name in files:
        if forbidden.search(name) or name.endswith('media/modus-introduksjon.mp4'):
            raise ValueError('Private/retired resource in public package: ' + name)
        p = package/name
        if p.suffix in ('.html','.js','.json','.css','.txt') and secrets.search(p.read_text(errors='ignore')):
            raise ValueError('Backend/secret material in ' + name)
    if read(package/'cms-seed.json') != []:
        raise ValueError('Public CMS seed must remain empty')
    for locale, prefix in [('nb',''),('en','en/')]:
        count = sum(bool(re.search(r'<article(?:\s|>)', p.read_text())) and 'data-publication-hold' not in p.read_text() for p in (package/prefix/'artikler').glob('*.html'))
        if count != c['public_fulltexts'][locale]:
            raise ValueError('Selected fulltext count changed: ' + locale)
        editor = (package/prefix/'redaktor.html').read_text()
        if 'data-preview-unavailable' not in editor or re.search(r'<(?:input|textarea|form)\b', editor):
            raise ValueError('Public editor boundary changed')
    headers = (package/'_headers').read_text()
    if 'Content-Security-Policy:' not in headers or 'X-Content-Type-Options: nosniff' not in headers:
        raise ValueError('Public security headers missing')


def manifest(package, sha, c):
    actual = inventory(package)
    m = read(package/MANIFEST)
    if (m.get('schema_version'),m.get('kind'),m.get('project'),m.get('project_id'),m.get('production_origin'),m.get('source_sha'),m.get('deploy_authorized')) != (1,'modus-public-candidate','modus',PROJECT_ID,PUBLIC,sha,False):
        raise ValueError('Wrong candidate identity or inherited deployment authorization')
    if m.get('public_baseline_sha') != c['source_sha'] or m.get('public_baseline_deployment') != c['deployment_id']:
        raise ValueError('Stale production baseline')
    if file_map(m['files']) != {n:h for n,h in actual.items() if n != MANIFEST}:
        raise ValueError('Package bytes differ from manifest')
    public_boundary(package, actual, c)
    return actual


def check_delta(package, c, delta):
    actual = inventory(package)
    old = {n:h for n,h in c['files'].items() if n != MANIFEST}
    new = {n:h for n,h in actual.items() if n != MANIFEST}
    result = {'changed':sorted(n for n in old.keys() & new.keys() if old[n]!=new[n]),
              'added':sorted(new.keys()-old.keys()), 'removed':sorted(old.keys()-new.keys())}
    for key, scope in [('changed','allowed_changes'),('added','allowed_additions'),('removed','allowed_removals')]:
        allowed = delta[scope]
        for name in allowed:
            safe_name(name)
        if set(result[key]) != set(allowed):
            raise ValueError('Public delta differs from declared task scope: ' + key)
    return result


def archive(package, target):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in inventory(package):
            info = zipfile.ZipInfo(name, (2026,11,6,0,0,0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info,(package/name).read_bytes())
    return digest(target.read_bytes())


def check_archive(package, target):
    expected = inventory(package)
    with zipfile.ZipFile(target) as z:
        if len(z.namelist()) != len(set(z.namelist())):
            raise ValueError('Duplicate archive entry')
        actual = {safe_name(v.filename):digest(z.read(v)) for v in z.infolist()}
    if actual != expected:
        raise ValueError('ZIP and package differ')
    return digest(Path(target).read_bytes())


def run_stage(root, command, log, env, timeout=1200):
    with log.open('w') as output:
        p = subprocess.Popen(command, cwd=root, env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = p.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            try: os.killpg(p.pid,signal.SIGKILL)
            except ProcessLookupError: pass
            p.wait()
            raise ValueError('Check timed out: ' + ' '.join(command))
    if code:
        raise ValueError('Check failed; see ' + str(log))


def prepare(root, sha, out, c):
    provenance = source_gate(root,sha,c)
    env = {k:v for k,v in os.environ.items() if not k.startswith(('MODUS_','CF_PAGES_','CONTEXT'))}
    run_stage(root,['npm','run','quality:local'],out/'quality.log',env)
    qa = read(root.parent/'delivery/REPORT.json')
    if qa.get('status')!='LOCAL_CANDIDATE_PASSED' or qa.get('sourceSha')!=sha or not qa.get('stages') or not all(v['status']=='passed' for v in qa['stages']):
        raise ValueError('Complete automatic QA did not pass for this SHA')
    required = {'build','static','reproducibility','scales-browser','navigation','release','piano','audio'}
    if {v['name'] for v in qa['stages']} != required or qa.get('ordinaryGroups',{}).get('failed') != 0:
        raise ValueError('Incomplete automatic QA evidence')
    source_gate(root,sha,c)
    product = root.parent/'package'
    delta = check_delta(product,c,read(root/'release-inputs/production-delta.json'))
    package = out/'package'
    shutil.copytree(product,package)
    files = inventory(package)
    m = dict(schema_version=1,kind='modus-public-candidate',project='modus',project_id=PROJECT_ID,
             production_origin=PUBLIC,**provenance,public_baseline_sha=c['source_sha'],
             public_baseline_deployment=c['deployment_id'],deploy_authorized=False,
             approval_required=True,backend='disabled',cms_seed_records=0,
             public_fulltexts=c['public_fulltexts'],delta=delta,
             files={n:h for n,h in files.items() if n!=MANIFEST})
    write(package/MANIFEST,m)
    files = manifest(package,sha,c)
    zip_hash = archive(package,out/'candidate.zip')
    check_archive(package,out/'candidate.zip')
    write(out/'qa.json',qa)
    return dict(status='READY_FOR_OWNER_REVIEW',**provenance,zip_sha256=zip_hash,
                manifest_sha256=digest((package/MANIFEST).read_bytes()),files=len(files),delta=delta,
                qa_sha256=digest((out/'qa.json').read_bytes()),
                baseline_sha=c['source_sha'],baseline_deployment=c['deployment_id'],
                approval_required=True,deployed=False)


def candidate(root, directory, c):
    r = read(directory/'report.json')
    if r['status']!='READY_FOR_OWNER_REVIEW':
        raise ValueError('Candidate was not fully prepared')
    provenance = source_gate(root,r['source_sha'],c)
    if provenance['source_tree']!=r['source_tree']:
        raise ValueError('Source tree mismatch')
    files = manifest(directory/'package',r['source_sha'],c)
    if read(directory/'package'/MANIFEST).get('source_tree') != r['source_tree']:
        raise ValueError('Manifest source tree differs from reviewed source')
    check_delta(directory/'package',c,read(root/'release-inputs/production-delta.json'))
    if digest((directory/'package'/MANIFEST).read_bytes())!=r['manifest_sha256'] or check_archive(directory/'package',directory/'candidate.zip')!=r['zip_sha256']:
        raise ValueError('Candidate or ZIP changed after QA')
    qa=read(directory/'qa.json')
    if digest((directory/'qa.json').read_bytes())!=r['qa_sha256'] or qa['sourceSha']!=r['source_sha'] or qa['status']!='LOCAL_CANDIDATE_PASSED':
        raise ValueError('QA evidence changed')
    return r,files


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None


def request(url, method='GET', ranged=False):
    headers={'User-Agent':'MODUS-PL-AUTO-001-readonly/2.0','Cache-Control':'no-cache'}
    if ranged: headers['Range']='bytes=0-63'
    try:
        response=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,method=method,headers=headers),timeout=45)
    except urllib.error.HTTPError as error:
        response=error
    with response:
        return response.code,dict((k.lower(),v) for k,v in response.headers.items()),response.read()


def cloud_project(c):
    # Existing Wrangler login only. Never prints, stores or forwards credentials to the public origin.
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:
        cfg=(Path.home()/'Library/Preferences/.wrangler/config/default.toml').read_text()
        token=re.search(r'oauth_token\s*=\s*"([^"]+)"',cfg)[1]
    url='https://api.cloudflare.com/client/v4/accounts/'+c['account_id']+'/pages/projects/modus'
    with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token}),timeout=30) as f:
        result=json.load(f)
    if not result.get('success'):
        raise ValueError('Cannot read production project')
    return result['result']


def project_gate(p,c,sha,deployment):
    if (p['name'],p['id'],p['subdomain'],p['production_branch'])!=('modus',PROJECT_ID,'modus-4ye.pages.dev','main'):
        raise ValueError('Wrong Cloudflare production project/branch')
    auto=p['source']['config']
    if auto.get('deployments_enabled') is not False or auto.get('production_deployments_enabled') is not False or auto.get('preview_deployment_setting')!='none':
        raise ValueError('Git auto-deploy must remain disabled on every branch')
    d=p['canonical_deployment']
    if d['id']!=deployment or d['deployment_trigger']['metadata']['commit_hash']!=sha or d['latest_stage']['status']!='success':
        raise ValueError('Canonical deployment/source changed; refresh authoritative baseline')
    return d


def origin(url):
    u=urllib.parse.urlsplit(url)
    if u.scheme!='https' or u.username or u.password or u.port or u.path not in ('','/') or u.query or u.fragment:
        raise ValueError('Use a clean approved production origin')
    if u.hostname!='modus-4ye.pages.dev' and not re.fullmatch(r'[0-9a-f]{8}\.modus-4ye\.pages\.dev',u.hostname or ''):
        raise ValueError('Wrong production origin; Preview and MODUS.NO are forbidden')
    return 'https://'+u.hostname


def public_get(base,name):
    path='/'+urllib.parse.quote(safe_name(name))
    url=base+path
    code,headers,body=request(url)
    if code in (301,302,307,308) and path.endswith('.html'):
        canonical=path[:-5]
        if canonical.endswith('/index'): canonical=canonical[:-5]
        if canonical=='/index': canonical='/'
        if urllib.parse.urljoin(url,headers.get('location',''))!=base+canonical:
            raise ValueError('Unexpected redirect for '+name)
        code,headers,body=request(base+canonical)
    return code,headers,body


def verify_files(package,files,base):
    origin(base)
    def check(item):
        name,expected=item
        code,headers,body=public_get(base,name)
        if code!=200 or digest(body)!=expected:
            raise ValueError('Public file mismatch: '+name+' HTTP '+str(code))
        if name.endswith('.html') and ('content-security-policy' not in headers or headers.get('x-content-type-options')!='nosniff'):
            raise ValueError('Missing public security headers: '+name)
        return {'path':name,'status':code,'sha256':expected}
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows=list(pool.map(check,((n,h) for n,h in files.items() if n not in ('_headers','_redirects'))))
    return rows


def perimeter(c):
    rows=[]
    for pre in ('','en/'):
        for name in ('admin-app.js','admin-package.json','editor.js','editor-admin.js','library-draft-backup.json','content/articles.json','editorial/article-publication-review.json','_worker.js','media/modus-introduksjon.mp4'):
            code,_,_=request(PUBLIC+'/'+pre+name)
            if code!=404: raise ValueError('Private/retired public path responds: '+pre+name)
            rows.append({'path':pre+name,'status':code})
    for base in c['admin_origins']:
        if base not in ('https://dev-modus-2-pr52.modus-2-preview.pages.dev','https://e785d3db.modus-2-preview.pages.dev'):
            raise ValueError('Unexpected admin origin in baseline')
        for name in ('redaktor.html','admin-app.js','admin-package.json','cms-seed.json'):
            for method,ranged in [('GET',False),('HEAD',False),('GET',True)]:
                code,h,_=request(base+'/'+name,method,ranged)
                u=urllib.parse.urlsplit(h.get('location',''))
                if code not in (301,302,303,307,308) or u.scheme!='https' or u.hostname!=c['access_host'] or not u.path.startswith('/cdn-cgi/access/login/'):
                    raise ValueError('Admin anonymous Access boundary failed')
                rows.append({'origin':base,'path':name,'method':method,'range':ranged,'AccessProtected':True})
    return rows


def baseline_status(c):
    d=project_gate(cloud_project(c),c,c['source_sha'],c['deployment_id'])
    code,_,body=public_get(PUBLIC,MANIFEST)
    if code!=200 or digest(body)!=c['files'][MANIFEST]:
        raise ValueError('Live production manifest differs from pinned baseline')
    return {'project':'modus','deployment':d['id'],'source_sha':c['source_sha'],'git_auto_deploy':'disabled','manifest_sha256':digest(body)}


def preflight(root,directory,approval,c):
    r,_=candidate(root,directory,c)
    a=read(approval)
    for key,expected in [('project','modus'),('source_sha',r['source_sha']),('zip_sha256',r['zip_sha256']),('baseline_deployment',c['deployment_id'])]:
        if a.get(key)!=expected: raise ValueError('Approval does not match exact candidate: '+key)
    if a.get('owner_approved') is not True or not str(a.get('approval_reference','')).strip():
        raise ValueError('Separate explicit owner GO must be recorded by C06')
    state=baseline_status(c)
    boundary=perimeter(c)
    return dict(status='C06_PREFLIGHT_PASSED',source_sha=r['source_sha'],zip_sha256=r['zip_sha256'],
                project='modus',branch='main',rollback=state,anonymous_access_checks=len(boundary),
                approval_reference=a['approval_reference'],deployed=False,
                command=['wrangler','pages','deploy',str(directory/'package'),'--project-name','modus','--branch','main','--commit-hash',r['source_sha'],'--commit-dirty=false'],
                next_command=['npm','run','production:workflow','--','verify','--candidate',str(directory),'--deployment','ACTUAL_DEPLOYMENT_ID','--out','NEW_REPORT_DIRECTORY'])


def verify(root,directory,deployment,out,c):
    r,files=candidate(root,directory,c)
    d=project_gate(cloud_project(c),c,r['source_sha'],deployment)
    base=origin(d['url'])
    rows=verify_files(directory/'package',files,PUBLIC)
    # Also bind the deployment origin's manifest, not an invented or stale hash URL.
    code,_,body=public_get(base,MANIFEST)
    if code!=200 or digest(body)!=files[MANIFEST]: raise ValueError('Deployment origin has wrong version')
    boundary=perimeter(c)
    env={k:v for k,v in os.environ.items() if not k.startswith(('MODUS_','CF_PAGES_','CONTEXT'))}
    env['MODUS_TEST_URL']=PUBLIC
    for test in ('tests/release-browser.cjs','tests/public-scale-browser.cjs','tests/public-audio-browser.cjs'):
        run_stage(root,['node',test],out/(Path(test).stem+'.log'),env)
    candidate(root,directory,c)
    project_gate(cloud_project(c),c,r['source_sha'],deployment)
    if digest(public_get(PUBLIC,MANIFEST)[2])!=files[MANIFEST]: raise ValueError('Production changed during verification')
    write(out/'files.json',rows)
    write(out/'perimeter.json',boundary)
    return dict(status='PUBLIC_VERIFIED',source_sha=r['source_sha'],deployment=deployment,project='modus',origin=PUBLIC,
                hashed_files=len(rows),boundary_checks=len(boundary),browser_groups=3,
                manual_safari=False,authenticated_admin=False,deployed=False)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['prepare','check','status','preflight','verify','baseline-verify'])
    p.add_argument('--sha')
    p.add_argument('--candidate',type=Path)
    p.add_argument('--approval',type=Path)
    p.add_argument('--deployment')
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    out=a.out.resolve()
    if out.exists(): p.error('Choose a new output directory; prior evidence is preserved')
    if out==ROOT or ROOT in out.parents: p.error('Keep delivery outside source')
    out.mkdir(parents=True)
    r={'status':'BLOCKED','deployed':False}
    try:
        c=config()
        directory=a.candidate.resolve() if a.candidate else None
        if a.action=='prepare':
            if not a.sha or directory: raise ValueError('prepare requires --sha and builds its own candidate')
            r=prepare(ROOT,a.sha,out,c)
        elif a.action=='status': r=dict(status='BASELINE_CONFIRMED',**baseline_status(c),deployed=False)
        elif a.action=='baseline-verify':
            state=baseline_status(c)
            rows=verify_files(ROOT/c['package'],c['files'],PUBLIC);boundary=perimeter(c)
            baseline_status(c)
            write(out/'files.json',rows);write(out/'perimeter.json',boundary)
            r=dict(status='BASELINE_VERIFIED',**state,hashed_files=len(rows),boundary_checks=len(boundary),deployed=False)
        else:
            if not directory: raise ValueError('This action requires --candidate')
            if a.action=='check':
                candidate_report,files=candidate(ROOT,directory,c)
                r=dict(status='CANDIDATE_CHECKED',source_sha=candidate_report['source_sha'],files=len(files),deployed=False)
            elif a.action=='preflight':
                if not a.approval: raise ValueError('preflight requires a separate owner approval receipt')
                r=preflight(ROOT,directory,a.approval,c)
            else:
                if not a.deployment: raise ValueError('verify requires actual --deployment from C06')
                r=verify(ROOT,directory,a.deployment,out,c)
    except Exception as error:
        r.update(status='BLOCKED',error=str(error))
    r['completed_utc']=datetime.now(timezone.utc).isoformat()
    write(out/'report.json',r)
    (out/'report.md').write_text(r['status']+'\n\n'+json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(r,ensure_ascii=False,indent=2))
    return 2 if r['status']=='BLOCKED' else 0


if __name__=='__main__': sys.exit(main())
