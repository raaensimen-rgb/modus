import os
"""Independent data-boundary checks, including real clean/dirty production builds."""
import copy
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from publication import is_public, load_policy, article_text_version, article_permission

valid = {'editorial_status': 'approved', 'visibility': 'public',
         'approved_locales': ['nb', 'en'], 'approval_reference': 'Synthetic test approval'}
assert is_public(valid, 'nb') and is_public(valid, 'en')
for key, values in {'editorial_status': ['draft', 'in_review', None, 'bad'],
                    'visibility': ['private', 'preview', None, 'bad'],
                    'approved_locales': [[], ['en']], 'approval_reference': ['', None]}.items():
    for value in values:
        assert not is_public({**valid, key: value}, 'nb'), (key, value)
assert not is_public(None) and not is_public({})
assert not is_public({**valid, 'approved_locales': ['nb']}, 'en')

with tempfile.TemporaryDirectory(prefix='modus-publication-test-') as temp:
    project = Path(temp) / 'site'
    shutil.copytree(ROOT, project, ignore=shutil.ignore_patterns('.git', 'node_modules', 'dist', 'test-results', '__pycache__', '.build-private'))
    (project / 'node_modules').symlink_to((ROOT / 'node_modules').resolve(), target_is_directory=True)
    registry = project / 'content/publication.json'
    original = json.loads(registry.read_text())
    # Missing registry must never silently grant public permission.
    registry.unlink()
    assert load_policy(project)['articles'] == {}
    registry.write_text(json.dumps({**original, 'schema_version': 999}))
    try:
        load_policy(project)
        raise AssertionError('Unknown schema accepted')
    except ValueError:
        pass
    registry.write_text(json.dumps({**original, 'platform_assets': ['../private.json']}))
    try:
        load_policy(project)
        raise AssertionError('Traversal accepted')
    except ValueError:
        pass
    policy = copy.deepcopy(original)
    # Synthetic boundary fixtures have no owner selection. Actual 16 remain selected in the project.
    for record in policy['articles'].values():
        record.update(editorial_status='draft',visibility='private',approved_locales=[],publication_decision='awaiting_owner')
    registry.write_text(json.dumps(policy))
    # A source article with no registry record must also remain private.
    policy['articles'].pop('dur-og-moll',None)
    registry.write_text(json.dumps(policy))
    source = project / 'content/articles.json'
    articles = json.loads(source.read_text())
    public_slug, private_slug = articles[0]['slug'], articles[1]['slug']
    public_marker, private_marker = 'PUBLIC_CANARY_102_QA', 'PRIVATE_CANARY_102_QA'
    review_marker = 'PRIVATE_LOCAL_REVIEW_CANARY_RED004'
    (project / '.build-private').mkdir(exist_ok=True)
    (project / '.build-private/editor-review.json').write_text(json.dumps({'private_notes': review_marker}))
    (project / 'local-review-draft.json').write_text(json.dumps({'private_notes': review_marker}))
    articles[0]['title'] = public_marker
    articles[0]['intro'] = public_marker
    articles[0]['sections'][0][1] = '<p>' + public_marker + '</p>'
    articles[1]['title'] = private_marker
    articles[1]['intro'] = private_marker
    articles[1]['sections'][0][1] = '<p>' + private_marker + '</p>'
    source.write_text(json.dumps(articles))
    catalog=project/'content/upcoming-articles.json'
    catalog_data=json.loads(catalog.read_text());catalog_data[0]['description']=private_marker;catalog.write_text(json.dumps(catalog_data))
    # Newly added source assets have no implicit permission.
    (project / 'private-draft.html').write_text(private_marker)
    (project / 'draft-data.js').write_text(private_marker)
    (project / 'images/private-image.svg').write_text('<svg>' + private_marker + '</svg>')
    dist = project / 'dist'

    def build():
        # These synthetic approval/production cases exercise the unchanged ordinary
        # publication pipeline. Isolated-mode rejection is covered independently.
        env = dict(os.environ)
        for key in ('MODUS_ISOLATED_PREVIEW', 'MODUS_PREVIEW_PROJECT'):
            env.pop(key, None)
        # These deliberately mutated, Git-free fixtures exercise source publication policy.
        # The separate candidate test checks the pinned production package and rejects drift.
        run = subprocess.run(['npm', 'run', 'build:source'], cwd=project, capture_output=True, text=True, env=env)
        assert run.returncode == 0, run.stdout[-2000:] + run.stderr[-2000:]
        return {p.relative_to(dist).as_posix(): p.read_bytes() for p in dist.rglob('*') if p.is_file()}

    def private_absent(files):
        assert all(private_marker.encode() not in data for data in files.values())
        assert all(review_marker.encode() not in data for data in files.values()), 'Private local review escaped into public artifact'
        for path in ('f03-atelier.js', 'undervisning.js', 'course.js', 'en/f03-atelier.js', 'draft-data.js', 'private-draft.html', 'images/private-image.svg'):
            assert path not in files, path
        for prefix in ('', 'en/'):
            for name in ('undervisning.html', 'laer-dorisk.html', 'grunnstudier.html'):
                assert b'data-publication-hold' in files[prefix + name]

    clean = build()
    private_absent(clean)
    assert all(public_marker.encode() not in data for data in clean.values())
    assert json.loads(clean['cms-seed.json']) == []
    # Old files, arbitrary binaries and nested sources must be removed on rebuild.
    (dist / 'old-private.html').write_text(private_marker)
    (dist / 'en/old-private.js').write_text(private_marker)
    (dist / 'leaked.zip').write_bytes(private_marker.encode())
    dirty = build()
    private_absent(dirty)
    assert clean == dirty, 'Dirty build is not identical to clean build'

    # Explicit public permission opens one locale, without opening EN or private peers.
    policy['articles'][public_slug] = {**valid, 'approved_locales': ['nb'],
        'source_control_status': {'private_note': 'PRIVATE_REVIEW_CANARY_RED003'},
        'publication_evidence': {'nb': {'reference': 'Synthetic version-specific QA decision',
            'reviewed_version_sha256': article_text_version(articles[0], 'nb', project)}}}
    registry.write_text(json.dumps(policy))
    public = build()
    private_absent(public)
    assert public_marker.encode() in public['artikler/' + public_slug + '.html']
    assert public_marker.encode() not in public['en/artikler/' + public_slug + '.html']
    assert public_marker.encode() in public['artikler.html']
    assert public_marker.encode() not in public['en/artikler.html']
    seed = json.loads(public['cms-seed.json'])
    assert [(x['slug'], x['locale']) for x in seed] == [(public_slug, 'nb')]
    assert seed[0]['editorial']['policy']['source_control_status']=='unknown'
    assert seed[0]['editorial']['policy']['publication_evidence']['nb']['reference']=='Verified public build'
    assert all(b'PRIVATE_REVIEW_CANARY_RED003' not in data for data in public.values())
    assert any(x['type'] == 'article' for x in json.loads(public['search-index.json']))
    assert not any(x['type'] == 'article' for x in json.loads(public['en/search-index.json']))
    assert b'data-publication-hold' in public['artikler/' + private_slug + '.html']
    assert 'images/articles/' + private_slug + '.svg' not in public
    # NB approval plus an unproved EN flag must not copy the private EN illustration/text.
    policy['articles'][public_slug]['approved_locales']=['nb','en']
    registry.write_text(json.dumps(policy))
    unproved_en=build()
    assert public_marker.encode() not in unproved_en['en/artikler/'+public_slug+'.html']
    assert 'en/images/articles/'+public_slug+'.svg' not in unproved_en

    # Permission for an old text version must not open a changed article or translation.
    proof=policy['articles'][public_slug]
    assert article_permission(proof, articles[0], 'nb', project)
    changed=copy.deepcopy(articles[0]);changed['intro'] += ' changed'
    assert not article_permission(proof, changed, 'nb', project)
    assert not article_permission({**valid}, articles[0], 'nb', project)
    assert not article_permission({**proof, 'publication_evidence': []}, articles[0], 'nb', project)
    en_proof={**valid,'publication_evidence':{'en':{'reference':'Synthetic EN decision',
        'reviewed_version_sha256':article_text_version(articles[0],'en',project)}}}
    assert article_permission(en_proof,articles[0],'en',project)
    translations=project/'content/i18n/en.json';translation_data=json.loads(translations.read_text())
    translation_data['Synthetic change']='New translation';translations.write_text(json.dumps(translation_data))
    assert not article_permission(en_proof,articles[0],'en',project)

    # Status, visibility and locale permission remain independently enforceable.
    policy['articles'][public_slug] = {**valid, 'editorial_status': 'draft'}
    registry.write_text(json.dumps(policy))
    unpublished = build()
    assert all(public_marker.encode() not in data for data in unpublished.values())
    private_absent(unpublished)
    previous_branch=os.environ.get('CF_PAGES_BRANCH')
    os.environ['CF_PAGES_BRANCH']='main'
    try:
        production=build()
        assert all(b'catalog-preview-card' not in production[p] for p in ('artikler.html','en/artikler.html'))
        private_absent(production)
    finally:
        if previous_branch is None:os.environ.pop('CF_PAGES_BRANCH',None)
        else:os.environ['CF_PAGES_BRANCH']=previous_branch

print('Publication boundary passed: default-private, independent fields, locale permission, source preservation, clean/dirty builds and whole-artifact canaries.')
