"""Build a local UX-003 candidate over an exact, verified production package."""
import argparse
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory

from atlas import page, projection
from production_workflow import (
    MANIFEST, ROOT, config, digest, git, inventory, manifest, read, source_gate, write,
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--live-manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error('--out must be a new directory')
    baseline = config(ROOT, args.baseline)
    if digest(args.live_manifest.read_bytes()) != baseline['files'][MANIFEST]:
        raise ValueError('Captured production manifest differs from verified baseline')
    sha = git(ROOT, 'rev-parse', 'HEAD')
    provenance = source_gate(ROOT, sha, baseline)
    subprocess.run(['npm', 'run', 'build:source'], cwd=ROOT, check=True)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=args.out.parent) as temporary:
        package = Path(temporary) / 'package'
        shutil.copytree(baseline['package'], package)
        allowed = set()
        for locale, prefix in (('nb', ''), ('en', 'en/')):
            for name in ('musikkart.js', 'musikkart.css'):
                shutil.copyfile(ROOT / 'dist' / prefix / name, package / prefix / name)
                allowed.add(prefix + name)
            html = package / prefix / 'musikkart.html'
            html.write_text(page(html.read_text(), locale))
            allowed.add(prefix + html.name)
            for article in projection(locale)[1]:
                target = package / prefix / 'artikler' / (article['slug'] + '.html')
                if not target.is_file() or '<article' not in target.read_text():
                    raise ValueError(f'Atlas link requires full text in this package: {target}')

        files = inventory(package)
        changed = {name for name, checksum in files.items() if baseline['files'].get(name) != checksum}
        if files.keys() != baseline['files'].keys() or changed != allowed:
            raise ValueError('Unexpected Atlas package delta')
        files.pop(MANIFEST)
        release = read(package / MANIFEST)
        release.update(provenance, public_baseline_sha=baseline['source_sha'],
                       public_baseline_deployment=baseline['deployment_id'], deploy_authorized=False,
                       approval_required=True, files=files,
                       delta={'changed': sorted(changed), 'added': [], 'removed': []})
        write(package / MANIFEST, release)
        manifest(package, sha, baseline)
        package.rename(args.out)
    print(f'Local UX-003 package: {len(changed)} Atlas files and manifest changed, '
          f'{len(files) - len(changed)} files byte-identical to production.')


if __name__ == '__main__':
    main()
