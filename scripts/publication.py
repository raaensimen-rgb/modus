"""Fail-closed publication policy. Source/editorial data never implies permission."""
import os
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATUSES = {'draft', 'in_review', 'approved'}
VISIBILITIES = {'private', 'preview', 'public'}

def load_policy(root=ROOT):
    path = root / 'content/publication.json'
    if not path.exists():
        return {'schema_version': 1, 'articles': {}, 'learning_pages': {}, 'catalog_previews': {}}
    data = json.loads(path.read_text())
    if data.get('schema_version') != 1:
        raise ValueError('Unsupported publication policy schema; refusing public build')
    for name in data.get('platform_pages', []) + data.get('platform_assets', []):
        path = Path(name)
        if path.is_absolute() or '..' in path.parts or path.as_posix() != name:
            raise ValueError('Unsafe public source path')
    for group in ('articles', 'learning_pages', 'catalog_previews'):
        if not isinstance(data.get(group), dict):
            raise ValueError('Invalid publication registry')
        for name, record in data[group].items():
            pattern = r'[a-z0-9][a-z0-9-]*' if group != 'learning_pages' else r'[a-z0-9][a-z0-9-]*\.html'
            if not re.fullmatch(pattern, name):
                raise ValueError('Unsafe editorial identifier')
            if not isinstance(record, dict) or record.get('editorial_status') not in STATUSES or record.get('visibility') not in VISIBILITIES:
                raise ValueError('Invalid publication status/visibility')
            locales = record.get('approved_locales', [])
            if not isinstance(locales, list) or any(x not in ('nb', 'en') for x in locales):
                raise ValueError('Invalid approved locales')
    return data

def is_public(record, locale='nb'):
    return (isinstance(record, dict)
            and record.get('editorial_status') == 'approved'
            and record.get('visibility') == 'public'
            and locale in record.get('approved_locales', [])
            and isinstance(record.get('approval_reference'), str)
            and bool(record['approval_reference'].strip()))

def public_articles(root=ROOT, locale='nb'):
    policy = load_policy(root)
    articles = json.loads((root / 'content/articles.json').read_text())
    ids = [a.get('slug') for a in articles]
    if any(not isinstance(x, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', x) for x in ids) or len(set(ids)) != len(ids):
        raise ValueError('Invalid or duplicate article identifier')
    return [a for a in articles
            if article_permission(policy['articles'].get(a['slug']), a, locale, root)
            and (locale == 'nb' or article_permission(policy['articles'].get(a['slug']), a, 'nb', root))]

def article_text_version(article, locale='nb', root=ROOT):
    """Pin the actual article/quiz source, and the EN translation inputs separately."""
    quizzes = json.loads((root / 'content/article-quizzes.json').read_text())
    data = {'article': article, 'quiz': quizzes.get(article['slug']), 'locale': locale}
    if locale == 'en':
        # Conservative: any translation/override change requires a fresh EN decision.
        data['translation_inputs'] = {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
            for name in ('content/i18n/en.json', 'content/i18n/dynamic.tsv')}
        overrides = (root / 'scripts/build-languages.py').read_text()
        block = re.search(r"(?ms)^        if rel\.as_posix\(\) == 'artikler/" + re.escape(article['slug'])
                          + r"\.html':\n(.*?)(?=^        if |\Z)", overrides)
        data['article_translation_override'] = block[1] if block else None
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':')).encode()).hexdigest()

def article_permission(record, article, locale='nb', root=ROOT):
    if not is_public(record, locale):
        return False
    evidence = record.get('publication_evidence', {})
    proof = evidence.get(locale) if isinstance(evidence, dict) else None
    return (isinstance(proof, dict)
            and isinstance(proof.get('reference'), str) and bool(proof['reference'].strip())
            and proof.get('reviewed_version_sha256') == article_text_version(article, locale, root))


CARD_LEVELS = {'beginner': 'Grunnleggende musikkteori', 'intermediate': 'Videregående musikkteori', 'advanced': 'Faglig fordypning'}

def catalog_card_metadata(article, locale='nb', root=ROOT):
    """Only approved title/taxonomy inputs; never copy article prose into a card."""
    from article_library import TOPICS
    translations = {}
    if locale == 'en':
        translations = json.loads((root / 'content/i18n/en.json').read_text())
        for line in (root / 'content/i18n/dynamic.tsv').read_text().splitlines():
            if line:
                source, target = line.split('\t', 1)
                translations[source] = target
    def label(value):
        if locale == 'en' and value not in translations:
            raise ValueError('Missing existing English catalog metadata')
        return translations.get(value, value)
    return {'slug': article['slug'], 'title': label(article['title']),
            'level': article['level'], 'category': article['category'],
            'level_label': label(CARD_LEVELS[article['level']]),
            'category_label': label(TOPICS[article['category']][0])}

def catalog_card_version(metadata):
    return hashlib.sha256(json.dumps(metadata, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':')).encode()).hexdigest()

def preview_catalog_cards(root=ROOT, locale='nb'):
    """Preview-only metadata permission, independent of all full-text approvals."""
    path = root / 'content/article-card-permissions.json'
    if not path.is_file():
        return []
    policy = json.loads(path.read_text())
    if policy.get('schema_version') != 1:
        raise ValueError('Invalid catalog-card policy')
    branch = os.environ.get('CF_PAGES_BRANCH', '')
    # Explicit main/production always wins over a local/CI opt-in.
    if branch == 'main' or os.environ.get('CONTEXT') == 'production':
        return []
    enabled = os.environ.get('MODUS_CATALOG_PREVIEW') == '1' or (
        os.environ.get('CF_PAGES') == '1' and branch in policy.get('preview_branches', []))
    if not enabled:
        return []
    result = []
    for article in json.loads((root / 'content/articles.json').read_text()):
        record = policy.get('cards', {}).get(article['slug'], {})
        try:
            metadata = catalog_card_metadata(article, locale, root)
        except (ValueError, KeyError):
            continue
        if (record.get('visibility') == 'preview'
                and record.get('reference') == policy.get('approval_reference')
                and record.get('reference') == 'https://github.com/raaensimen-rgb/modus/issues/42#issuecomment-6557889070'
                and record.get('versions', {}).get(locale) == catalog_card_version(metadata)):
            result.append(metadata)
    return result

def holding_page(prefix='', active='lesson', english=False):
    from site_navigation import render_header, with_navigation_css
    title = 'In progress' if english else 'Under arbeid'
    message = ('This teaching content has not been published. Your progress in available tools is unchanged.' if english else
               'Dette undervisningsinnholdet er ikke publisert. Fremdriften din i tilgjengelige verktøy er uendret.')
    back = 'Back to Learn' if english else 'Tilbake til Lær'
    lang = 'en' if english else 'nb'
    return with_navigation_css(f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MODUS · {title}</title><link rel="stylesheet" href="{prefix}home.css"><link rel="stylesheet" href="{prefix}design-system.css"><style>.publication-hold{{max-width:960px;padding:48px 24px;min-height:50vh;line-height:1.8}}.publication-hold h1{{font-size:clamp(32px,6vw,48px);letter-spacing:-.03em}}.publication-hold a{{color:var(--accent)}}</style></head><body>{render_header(active=active,prefix=prefix)}<main class="publication-hold" data-publication-hold><h1>{title}</h1><p>{message}</p><p><a href="{prefix}laeringssti.html">{back} ↗</a></p><div id="quiz"></div></main><footer><a class="brand footer-brand" href="{prefix or './'}">MODUS</a><span>MODUS</span></footer></body></html>''', prefix)


def public_catalog(root=ROOT, locale='nb'):
    policy = load_policy(root)
    return [a for a in json.loads((root / 'content/upcoming-articles.json').read_text())
            if is_public(policy['catalog_previews'].get(a['slug']), locale)]


EN_TRANSLATIONS = {
    'Artikkelbibliotek · under arbeid': 'Article library · in progress',
    '16 artikkelkort · fulltekst ikke tilgjengelig': '16 article cards · full text unavailable',
    'Forhåndsvisning: kun titler, nivå og kategori. Artiklene er under arbeid og kan ikke åpnes.': 'Preview: titles, level and category only. The articles are in progress and cannot be opened.',
    'Titler og artikkeltekst vises først når publiseringstillatelsen er avklart.': 'Titles and article text are shown only after publication permission has been confirmed.',
    'Biblioteket er bevart': 'The library is preserved',
    'Artiklene er ikke slettet. Tekstene er bevart i redaksjonell kilde og avventer dokumentert publiseringstillatelse.': 'The articles have not been deleted. Their texts are preserved in editorial sources and await documented publication permission.',
    'Bevart i redaksjonell kilde:': 'Preserved in editorial sources:',
    'Tilgjengelig for lesing her:': 'Available to read here:',
    'Titler og artikkeltekst vises først når publiseringstillatelsen er avklart.': 'Titles and article text are shown only after publication permission has been confirmed.',
    'Under arbeid': 'In progress',
    'Dette undervisningsinnholdet er ikke publisert. Fremdriften din i tilgjengelige verktøy er uendret.': 'This teaching content has not been published. Your progress in available tools is unchanged.',
    'Tilbake til Lær': 'Back to Learn',
    'Artiklene venter på redaksjonell publiseringsgodkjenning.': 'Articles are awaiting editorial publication approval.',
    'Artikler åpnes etter publiseringsgodkjenning.': 'Articles open after publication approval.',
}
