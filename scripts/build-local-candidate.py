"""Build the bounded package-A delta on the exact last published 2.0 artifact.

The ordinary article/CMS build is a prerequisite, never a replacement baseline.
No network, credentials, deployment or administrator operations are performed.
"""
from pathlib import Path
import hashlib, json, re, shutil, subprocess, zipfile

R = Path(__file__).resolve().parents[1]
B = R / 'release-inputs/published-d809a7b'
O = R.parent / 'package'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def inventory(root):
    return {p.relative_to(root).as_posix(): sha(p) for p in sorted(root.rglob('*')) if p.is_file()}

def build():
    expected = json.loads((R / 'release-inputs/published-d809a7b-files.json').read_text())
    assert inventory(B) == expected, 'Pinned published package changed'
    invariants = json.loads((R / 'release-inputs/published-source-invariants.json').read_text())
    for name, digest in invariants.items():
        assert sha(R / name) == digest, 'Out-of-scope product-source change: ' + name
    assert (R / 'dist/navigation.js').read_bytes() == (R / 'navigation.js').read_bytes(), 'Run the ordinary build first'
    baseline = json.loads((B / 'release-manifest.json').read_text())
    assert baseline['source_sha'] == 'd809a7b0fc4fbb8480f7ee5b8e3daa7ffb5227e5'
    if O.exists():
        shutil.rmtree(O)
    shutil.copytree(B, O)
    data = (R / 'navigation.js').read_bytes()
    versioned = 'navigation.' + hashlib.sha256(data).hexdigest()[:10] + '.js'
    updated = []
    for pre in ['', 'en/']:
        (O / pre / 'navigation.js').write_bytes(data)
        (O / pre / versioned).write_bytes(data)
    # Only script URLs change in HTML; preserve all other bytes, including line endings.
    pattern = rb'(<script\b[^>]*\bsrc=")(?:([^"<>]*/)?)(navigation\.[a-f0-9]{10}\.js)([?][^"<>]*)?("[^>]*>)'
    for p in sorted(O.rglob('*.html')):
        before = p.read_bytes()
        after, n = re.subn(pattern, lambda m: m[1] + (m[2] or b'') + versioned.encode() + (m[4] or b'') + m[5], before)
        if n:
            assert n == 1, str(p)
            p.write_bytes(after)
            updated.append(p.relative_to(O).as_posix())
    assert len(updated) == 137, f'Unexpected public navigation coverage: {len(updated)}'
    # Keep existing cached-version files as history; all HTML points at the fixed hash.
    files = inventory(O)
    changed = [n for n in expected if files.get(n) != expected[n] and n != 'release-manifest.json']
    added = sorted(set(files) - set(expected))
    allowed = set(updated + ['navigation.js', 'en/navigation.js'])
    assert set(changed) == allowed
    assert added == sorted([versioned, 'en/' + versioned])
    manifest = dict(baseline)
    manifest.update(kind='modus-package-a-local', project='modus',
                    source_sha=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=R, text=True).strip(),
                    public_baseline_sha=baseline['source_sha'],
                    public_baseline_deployment='536b0e35-23a1-4dad-99bd-337a51afb13b',
                    baseline_inventory_sha256=sha(R / 'release-inputs/published-d809a7b-files.json'),
                    deploy_authorized=False, requires_owner_deploy_approval=True,
                    owner_authorization='Local package A only, 2026-11-06; no push, merge, deploy or GitHub changes',
                    navigation_asset=versioned, navigation_pages=updated,
                    preserved_baseline_files=sum(files.get(n) == h for n, h in expected.items() if n != 'release-manifest.json'),
                    files=[{'path': n, 'bytes': (O/n).stat().st_size, 'sha256': h} for n, h in files.items() if n != 'release-manifest.json'])
    # Remove obsolete historical target/authorization descriptions from active metadata.
    manifest.pop('owner_authorization_ref', None)
    (O / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    delivery = R.parent / 'delivery'
    delivery.mkdir(exist_ok=True)
    archive = delivery / 'MODUS-package-A-local.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in sorted(O.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(p.relative_to(O).as_posix(), (2026, 11, 6, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes())
    print(json.dumps({'package_files': len(inventory(O)), 'html_script_references_updated': len(updated),
                      'changed_existing_files': len(changed)+1, 'added_files': len(added),
                      'preserved_baseline_files': manifest['preserved_baseline_files'],
                      'zip_sha256': sha(archive), 'deployment': 'not authorized'}, indent=2))

if __name__ == '__main__':
    build()
