"""Fail-closed publication policy. Source/editorial data never implies permission."""
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
            if is_public(policy['articles'].get(a['slug']), locale)
            and (locale == 'nb' or is_public(policy['articles'].get(a['slug']), 'nb'))]

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
    'Under arbeid': 'In progress',
    'Dette undervisningsinnholdet er ikke publisert. Fremdriften din i tilgjengelige verktøy er uendret.': 'This teaching content has not been published. Your progress in available tools is unchanged.',
    'Tilbake til Lær': 'Back to Learn',
    'Artiklene venter på redaksjonell publiseringsgodkjenning.': 'Articles are awaiting editorial publication approval.',
    'Artikler åpnes etter publiseringsgodkjenning.': 'Articles open after publication approval.',
}
