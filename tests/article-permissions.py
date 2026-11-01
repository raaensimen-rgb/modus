"""Review provenance, preserved 16-record source, and the public pending-library state."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from publication import article_text_version, public_articles, load_policy

source = ROOT / 'content/articles.json'
articles = json.loads(source.read_text())
review = json.loads((ROOT / 'editorial/article-publication-review.json').read_text())
policy = load_policy(ROOT)
assert len(articles) == len(review['articles']) == 16
assert hashlib.sha256(source.read_bytes()).hexdigest() == review['source_file_sha256']
assert {a['slug'] for a in articles} == {a['slug'] for a in review['articles']}
for a in articles:
    row = next(r for r in review['articles'] if r['slug'] == a['slug'])
    assert row['title'] == a['title']
    assert row['evidence_reviewed'] and all(e['url'].startswith('https://github.com/raaensimen-rgb/modus/') for e in row['evidence_reviewed'])
    for locale in ('nb', 'en'):
        assert row['source_versions_sha256'][locale] == article_text_version(a, locale, ROOT)
    assert policy['articles'][a['slug']]['publication_decision'] == 'awaiting_owner'
    assert policy['articles'][a['slug']]['visibility'] == 'private'
    assert not any(row['complete_publication_evidence'].values())
for prefix, locale in (('', 'nb'), ('en/', 'en')):
    assert not public_articles(ROOT, locale), 'No owner permission exists in the current evidence matrix'
    page = (ROOT / 'dist' / prefix / 'artikler.html').read_text()
    assert 'data-source-count="16"' in page and 'data-published-count="0"' in page
    assert ('The library is preserved' if locale == 'en' else 'Biblioteket er bevart') in page
    assert ('The articles have not been deleted.' if locale == 'en' else 'Artiklene er ikke slettet.') in page
    assert 'article-publication-review' not in page
assert not (ROOT / 'dist/editorial').exists()
assert not (ROOT / 'dist/en/editorial').exists()
print('16/16 source articles and exact NB/EN versions preserved; provenance and pending publication decisions agree; public notice exposes counts only.')
