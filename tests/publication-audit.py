"""Audit the complete current public output; record hashes for independent QA."""
import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from publication import load_policy, is_public, public_articles, public_catalog

dist = ROOT / 'dist'
policy = load_policy(ROOT)
files = {p.relative_to(dist).as_posix(): p.read_bytes() for p in dist.rglob('*') if p.is_file()}
def normalized(value):
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', html.unescape(value))).strip()
texts = {}
for path, data in files.items():
    try:
        texts[path] = normalized(data.decode('utf-8'))
    except UnicodeDecodeError:
        pass

private_phrases = []
for article in json.loads((ROOT / 'content/articles.json').read_text()):
    record = policy['articles'].get(article['slug'])
    if any(is_public(record, locale) for locale in ('nb', 'en')):
        continue
    private_phrases += [normalized(article['intro'])]
    private_phrases += [normalized(section[1]) for section in article['sections']]
for phrase in private_phrases:
    if len(phrase) < 80:
        continue
    for path, text in texts.items():
        assert phrase not in text, 'Private source paragraph is present in ' + path

for prefix, locale in [('', 'nb'), ('en/', 'en')]:
    for name, record in policy['learning_pages'].items():
        if not is_public(record, locale):
            assert b'data-publication-hold' in files[prefix + name]
    for name in ('f03-atelier.js', 'undervisning.js', 'course.js'):
        assert prefix + name not in files, 'Private lesson runtime deployed: ' + name
    allowed = {a['slug'] for a in public_articles(ROOT, locale)}
    index = json.loads(files[prefix + 'search-index.json'])
    assert {Path(x['url']).stem for x in index if x['type'] == 'article'} == allowed
    for source in json.loads((ROOT / 'content/articles.json').read_text()):
        if source['slug'] not in allowed:
            assert b'data-publication-hold' in files[prefix + 'artikler/' + source['slug'] + '.html']
            assert prefix + 'images/articles/' + source['slug'] + '.svg' not in files

seed = json.loads(files['cms-seed.json'])
expected = {(a['slug'], locale) for locale in ('nb', 'en') for a in public_articles(ROOT, locale)}
assert {(a['slug'], a['locale']) for a in seed} == expected
assert not any(Path(path).suffix in {'.map', '.md', '.zip', '.tsv'} for path in files)
assert not any(path.startswith(('content/', 'editorial/', 'docs/', 'tests/', '.build-private/')) for path in files)
assert '_worker.js' not in files, 'Private CMS runtime must remain parked'

report = {'status': 'passed', 'scope': 'Complete local public build, not a remote deployment attestation',
          'files': len(files), 'utf8_files': len(texts), 'private_paragraphs_checked': len(private_phrases),
          'public_article_locales': sorted([list(x) for x in expected]),
          'public_catalog_metadata': {locale: len(public_catalog(ROOT, locale)) for locale in ('nb', 'en')},
          'manifest': [{'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                       for path, data in sorted(files.items())]}
out = ROOT / 'test-results'
out.mkdir(exist_ok=True)
(out / 'publication-audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'Public artifact audit passed: {len(files)} files; {len(private_phrases)} private source fragments absent; public seed/index/lesson boundaries checked.')
