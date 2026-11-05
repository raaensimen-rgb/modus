"""Local release preparation and read-only verification. Deliberately no deploy command.
Run against a clean, reviewed development checkout; never resets or cleans user files.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

PROJECT = 'modus-2-preview'
BRANCH = 'dev/modus-2-pr52'
PUBLIC = PROJECT + '.pages.dev'
ADMIN = 'dev-modus-2-pr52.' + PUBLIC
ACCESS = PROJECT + '-pages.cloudflareaccess.com'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def run(root, args, env=None):
    return subprocess.run(args, cwd=root, env=env, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout


def source_gate(root, sha):
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('Use the exact 40-character reviewed source SHA')
    if run(root, ['git', 'rev-parse', 'HEAD']).strip() != sha:
        raise ValueError('Source SHA differs from reviewed candidate')
    if run(root, ['git', 'branch', '--show-current']).strip() != BRANCH:
        raise ValueError('Only the approved development branch is supported')
    if run(root, ['git', 'diff', '--name-only', 'HEAD', '--', '.', ':!dist']).strip():
        raise ValueError('Source has uncommitted changes; use an isolated reviewed checkout')
    if run(root, ['git', 'ls-files', '--others', '--exclude-standard']).strip():
        raise ValueError('Unreviewed untracked source files')


def manifest(package, kind, sha):
    name = 'admin-package.json' if kind == 'admin' else ('release-manifest.json' if (package/'release-manifest.json').is_file() else 'preview-isolation.json')
    m = json.loads((package / name).read_text())
    if m['project'] != PROJECT or m['source_sha'] != sha or (name != 'release-manifest.json' and m.get('tracked_source_dirty') is not False):
        raise ValueError('Wrong project, source version or dirty artifact')
    if kind == 'admin':
        if (m.get('kind'), m.get('planned_hostname'), m.get('backend'), m.get('publishing'), m.get('externalAI'), m.get('crossDeviceSync'), m.get('cmsSeedRecords')) != ('modus-protected-admin-browser-only', ADMIN, 'disabled', 'disabled', 'disabled', False, 0):
            raise ValueError('Invalid protected administrator isolation')
    elif name == 'release-manifest.json':
        if m.get('backend') != 'disabled' or m.get('cms_seed_records') != 0 or json.loads((package/'cms-seed.json').read_text()) != []:
            raise ValueError('Invalid selected-content public isolation')
    elif (m.get('mode'), m.get('backend'), m.get('branch')) != ('isolated', 'disabled', BRANCH):
        raise ValueError('Invalid public Preview isolation')
    expected = {v['path']: v['sha256'] for v in m['files']}
    for n in expected:
        p = Path(n)
        if p.is_absolute() or '..' in p.parts or '\\' in n:
            raise ValueError('Unsafe artifact path')
    actual = {}
    for p in package.rglob('*'):
        if p.is_symlink():
            raise ValueError('Artifact symlinks are forbidden')
        if p.is_file():
            actual[p.relative_to(package).as_posix()] = digest(p.read_bytes())
    if {k: v for k, v in actual.items() if k != name} != expected:
        raise ValueError('Artifact changed since its manifest was generated')
    return actual


def target(kind, url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or u.username or u.password or u.port or u.path not in ('', '/') or u.query or u.fragment:
        raise ValueError('Use a clean HTTPS deployment origin')
    allowed = [PUBLIC] if kind == 'public' else [ADMIN]
    if u.hostname not in allowed and not re.fullmatch(r'[0-9a-f]{8}\.' + re.escape(PUBLIC), u.hostname or ''):
        raise ValueError('Target is outside the existing Preview project')
    if kind == 'admin' and u.hostname == PUBLIC:
        raise ValueError('Administrator must never target the public root')
    return 'https://' + u.hostname


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def request(url, method='GET', ranged=False):
    headers = {'User-Agent': 'MODUS-PL-AUTO-001-readonly/1.0', 'Cache-Control': 'no-cache'}
    if ranged:
        headers['Range'] = 'bytes=0-63'
    try:
        response = urllib.request.build_opener(NoRedirect()).open(
            urllib.request.Request(url, method=method, headers=headers), timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.code, response.headers.get('Location', ''), response.read()


def verify(package, kind, sha, urls):
    files = manifest(package, kind, sha)
    origins = [target(kind, url) for url in urls]
    rows = []
    for origin in origins:
        for name, expected in files.items():
            # Pages consumes configuration files instead of serving their bytes.
            if name in ('_headers', '_redirects'):
                continue
            path = '/' if name == 'index.html' else '/' + urllib.parse.quote(name)
            methods = [('GET', False)] if kind == 'public' else [('GET', False), ('HEAD', False), ('GET', True)]
            for method, ranged in methods:
                code, location, body = request(origin + path, method, ranged)
                if kind == 'admin':
                    u = urllib.parse.urlsplit(location)
                    passed = code in (301, 302, 303, 307, 308) and u.hostname == ACCESS and u.path.startswith('/cdn-cgi/access/login/')
                else:
                    # Pages canonicalizes /name.html to /name (index to /).
                    # Follow only that exact same-origin normalization.
                    canonical = path[:-5] if path.endswith('.html') else path
                    if canonical.endswith('/index'):
                        canonical = canonical[:-5]
                    destination = urllib.parse.urljoin(origin + path, location)
                    if code in (301, 302, 307, 308) and path.endswith('.html') and destination == origin + canonical:
                        code, _, body = request(destination)
                    passed = code == 200 and digest(body) == expected
                rows.append({'origin': origin, 'path': path, 'method': method, 'range': ranged, 'status': code, 'passed': passed})
                if not passed:
                    raise ValueError(f'Verification failed: {origin}{path} {method} HTTP {code}')
    return {'checks': len(rows), 'urls': origins, 'rows': rows,
            'owner_login': 'requires interactive owner verification' if kind == 'admin' else 'not applicable',
            'scope': 'anonymous perimeter only; not an Access policy audit' if kind == 'admin' else 'served bytes match local manifest, including source SHA and CSS'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['prepare', 'verify'])
    p.add_argument('--kind', choices=['public', 'admin'], required=True)
    p.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
    p.add_argument('--sha', required=True)
    p.add_argument('--out', type=Path, required=True, help='New private result directory')
    p.add_argument('--package', type=Path, help='Already built artifact for read-only verification')
    p.add_argument('--url', action='append', default=[])
    a = p.parse_args()
    root, out = a.source.resolve(), a.out.resolve()
    if out.exists():
        p.error('Output already exists; prior evidence is preserved. Choose a new directory.')
    if out == root or root in out.parents and '.build-private' not in out.relative_to(root).parts:
        p.error('Store results outside source or under .build-private/')
    out.mkdir(parents=True)
    report = {'project': PROJECT, 'kind': a.kind, 'source_sha': a.sha,
              'deployed': False, 'approval_required': True, 'checks': [], 'status': 'BLOCKED'}
    def step(args, env=None):
        i = len(report['checks']) + 1
        try:
            log = run(root, args, env)
        except subprocess.CalledProcessError as e:
            (out / f'{i:02d}.log').write_text(e.stdout or '')
            raise ValueError(f'Check failed; see {i:02d}.log') from e
        (out / f'{i:02d}.log').write_text(log)
        report['checks'].append(args)
    try:
        source_gate(root, a.sha)
        package = a.package.resolve() if a.package else root / ('dist' if a.kind == 'public' else '.build-private/admin-preview')
        if a.action == 'prepare':
            if a.package or a.url:
                raise ValueError('prepare builds its own candidate; package/url apply only to verify')
            env = {k: v for k, v in os.environ.items() if not k.startswith(('MODUS_', 'CF_PAGES_', 'CONTEXT'))}
            if a.kind == 'public':
                # Reuse the current owner-selected-content pipeline, not historical passive-card flags.
                step(['npm', 'run', 'build'], env)
                step(['npm', 'test'], env)
                step(['npm', 'run', 'build:candidate'], env)
                package = root.parent / 'package'
                step(['python3', 'tests/design-reference-artifact.py'], env)
                step(['node', 'tests/design-reference-browser.cjs'], env)
                step(['node', 'tests/platform-appearance-browser.cjs'], env)
            else:
                package = out / 'package'
                step(['node', 'tests/admin-model.mjs'], env)
                step(['node', 'tests/editor-storage-browser.cjs'], env)
                step(['node', 'tests/editor-review.mjs'], env)
                step(['node', 'tests/editor-presentation.mjs'], env)
                step(['node', 'scripts/build-admin-preview.cjs', '--out=' + str(package)], env)
                step(['node', 'tests/admin-preview-package.cjs', '--dir=' + str(package), '--reviewed'], env)
                step(['node', 'tests/admin-preview-browser.cjs', '--dir=' + str(package)], env)
            source_gate(root, a.sha)
            files = manifest(package, a.kind, a.sha)
            archive = out / 'candidate.zip'
            with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
                for name in sorted(files):
                    z.write(package / name, name)
            report.update(status='READY_FOR_OWNER_REVIEW', package=str(package), archive=str(archive),
                          sha256=digest(archive.read_bytes()), files=len(files),
                          next_action='Owner approves this exact source SHA and ZIP SHA-256 before any upload')
        else:
            if not a.package or not a.url:
                raise ValueError('verify requires --package and at least one --url; include fixed and hash origins')
            report['verification'] = verify(package, a.kind, a.sha, a.url)
            report.update(status='VERIFIED_BYTES' if a.kind == 'public' else 'VERIFIED_ANONYMOUS_ACCESS_BOUNDARY',
                          next_action='Verify owner login interactively' if a.kind == 'admin' else 'Review the verified site in Safari')
    except Exception as error:
        report.update(error=str(error), next_action='Resolve the reported blocking check; no upload was performed')
    finally:
        (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        (out / 'report.md').write_text(f"{report['status']} · {a.kind} · {a.sha}\n\n" +
                                     (report.get('error', 'Checks completed; no deployment performed.')) +
                                     '\n\nNext: ' + report['next_action'] + '\n')
        print(json.dumps({k: v for k, v in report.items() if k not in ('checks', 'verification')}, ensure_ascii=False, indent=2))
    return 2 if report['status'] == 'BLOCKED' else 0


if __name__ == '__main__':
    sys.exit(main())
