"""Project editorial Atlas mappings into each public language build."""
import json
import re

from publication import ROOT, catalog_card_metadata, public_articles

PROGRESS = '/* atlas-progress */ {}'
READING = '/* atlas-reading */ []'
PIANO = 'teori.html?topic=intervals&amp;key=0&amp;fromArticle=toner-og-intervaller&amp;interval=4'


def mappings(root=ROOT):
    registry = json.loads((root / 'content/atlas-links.json').read_text())
    if registry['schema_version'] != 1:
        raise ValueError('Unsupported Atlas registry schema')
    module_ids = {m['id'] for m in registry['modules']}
    approved = {}
    for entries, legacy in ((registry['articles'], True), (registry['pending_articles'], False)):
        for entry in entries:
            if not legacy and entry['approval'] != 'subject_approved':
                continue
            if legacy and entry['status'] != 'published':
                raise ValueError('Unexpected legacy Atlas mapping status')
            slug = entry['slug']
            primary = entry['module_id']
            related = [] if legacy else entry['related_module_ids']
            if not isinstance(related, list):
                raise ValueError(f'Invalid secondary modules for {slug}')
            modules = [primary, *related]
            if (not re.fullmatch(r'[a-z0-9][a-z0-9-]*', slug) or slug in approved
                    or len(set(modules)) != len(modules) or not set(modules) <= module_ids):
                raise ValueError(f'Invalid or duplicate approved Atlas mapping for {slug}')
            approved[slug] = (modules, legacy)
    return module_ids, approved


def projection(locale, root=ROOT):
    _, approved = mappings(root)
    progress, reading = {}, []
    for article in public_articles(root, locale):
        slug = article['slug']
        if slug in approved:
            modules, legacy = approved[slug]
            title = catalog_card_metadata(article, locale, root)['title']
            reading.append({'slug': slug, 'title': title, 'modules': modules})
            if legacy:
                progress[slug] = modules[0]
    return progress, reading


def script(code, locale):
    module_ids, _ = mappings()
    catalog = re.search(r'const catalog=(\[.*?\]);\s*const groups=', code, re.S)
    modules = [m['id'] for m in json.loads(catalog[1])]
    branches = re.findall(r'\{id:"[a-z]+",name:".*?",color:".*?",ids:(\[.*?\])\}', code)
    assigned = [module for branch in branches for module in json.loads(branch)]
    if len(branches) != 10 or sorted(modules) != sorted(assigned) or sorted(modules) != sorted(module_ids):
        raise ValueError('Atlas module IDs must each belong to one existing branch')
    progress, reading = projection(locale)
    for token, data in ((PROGRESS, progress), (READING, reading)):
        if code.count(token) != 1:
            raise ValueError(f'Expected one Atlas template marker: {token}')
        code = code.replace(token, json.dumps(data, ensure_ascii=False))
    return code


def page(html, locale):
    en = locale == 'en'
    if 'id="module-practice"' not in html:
        controls = re.search(r'<a id="module-open"[^>]*>.*?</a>', html)[0]
        practice = 'Try intervals on the piano' if en else 'Prøv intervaller på pianoet'
        html = html.replace(controls, controls + f'<a id="module-practice" href="{PIANO}" hidden>{practice}</a>', 1)
    meta = '<p id="inspector-meta" class="map-meta"></p>'
    if html.count(meta) != 1:
        raise ValueError('Missing Atlas inspector details')
    label = 'Theory articles' if en else 'Teoriartikler'
    reading = ('<section id="atlas-reading" class="atlas-reading" aria-labelledby="atlas-reading-title" hidden>'
               f'<h3 id="atlas-reading-title" class="map-subheading">{label}</h3>'
               '<ul id="atlas-articles"></ul></section>')
    # Keep UX-002's first-article/piano actions before the reading list.
    html, count = re.subn(r'(<a id="module-practice"[^>]*>.*?</a></div>)', r'\g<1>' + reading, html, count=1)
    if count != 1:
        raise ValueError('Missing Atlas practice controls')
    if en:
        html = html.replace('aria-label="Egenvurdert læringsstatus"', 'aria-label="Self-assessed learning status"')
    note = (
        'Automatic status uses the Atlas’s original set of articles and quizzes. Additional reading links leave your progress unchanged. This is personal learning progress. '
        'Your notes and marks are stored in this browser and can be exported. Quiz results can also be linked to your account.'
        if en else
        'Automatisk status følger atlasets opprinnelige sett med artikler og quizer. Flere leselenker endrer ikke progresjonen din. '
        'Dette er læringsprogresjon, ikke en faglig godkjenning. Markeringer og notater lagres lokalt i denne nettleseren og kan eksporteres. '
        'Quizresultater kan også være knyttet til kontoen din.'
    )
    html = re.sub(r'(<p class="atlas-intro-note">).*?(</p>)', rf'\g<1>{note}\2', html, count=1)
    return re.sub(r'(musikkart\.(?:css|js))\?v=[^"]+', r'\1?v=ux003', html)


def finalize(dist):
    for locale, folder in (('nb', dist), ('en', dist / 'en')):
        js = folder / 'musikkart.js'
        js.write_text(script(js.read_text(), locale))
        html = folder / 'musikkart.html'
        html.write_text(page(html.read_text(), locale))
