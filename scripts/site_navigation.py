"""Shared, build-time navigation. No JavaScript is required to find another page."""
import re
import hashlib
from pathlib import Path
from html import escape

NAV_ITEMS = (
    ('home', './', 'Hjem'),
    ('jam', 'backingtracks.html', 'Backingtracks'),
    ('theory', 'teori.html', 'Teorirommet'),
    ('chords', 'akkorder.html', 'Akkordverksted'),
    ('articles', 'artikler.html', 'Artikler'),
    ('path', 'laeringssti.html', 'Læringssti'),
    ('mindmap', 'musikkart.html', 'Mitt musikkatlas'),
    ('course', 'laer-dorisk.html', 'Dorisk leksjon'),
    ('curriculum', 'laereplan.html', 'Læreplan'),
    ('lesson', 'undervisning.html', 'Undervisningsrom'),
    ('membership', 'modus-plus.html', 'Medlemskap'),
    ('about', 'om-modus.html', 'Om MODUS'),
)


def render_header(prefix='', active='home'):
    home = prefix or './'
    def link(key, path, label, description=None, css=''):
        target = home if key == 'home' else prefix + path
        current = ' aria-current="page"' if key == active else ''
        body = f'<strong>{label}</strong><small id="nav-hint-{key}">{description}</small><span aria-hidden="true">↗</span>' if description else label
        accessible = f' aria-label="{label}" aria-describedby="nav-hint-{key}"' if description else ''
        hints = {
            'home': 'Tilbake til MODUS-forsiden og oversikten over mulighetene.',
            'mindmap': 'Se hele musikklandskapet og hva du har lært.',
            'articles': 'Les fagartikler om musikk, teori og praksis.',
            'about': 'Les om tanken bak MODUS og hvem som står bak.',
            'membership': 'Forhåndsvis planlagte medlemskap og funksjoner. Kjøp er ikke åpnet.',
            'account': 'Logg inn for å administrere kontoen din.',
        }
        if key == 'membership':
            body += '<span class="nav-coming" aria-hidden="true">Kommer</span>'
        hint = hints.get(key) if description is None else None
        if hint:
            accessible += f' aria-description="{escape(hint, quote=True)}"'
            body += f'<span class="nav-tooltip" aria-hidden="true">{escape(hint)}</span>'
        return f'<a href="{escape(target, quote=True)}" class="{css}"{current}{accessible}>{body}</a>'
    def group(key, label, destinations):
        selected = any(item[0] == active for item in destinations)
        links = ''.join(link(*item) for item in destinations)
        return (f'<div class="nav-group{ " is-active" if selected else ""}">'
                f'<button type="button" class="nav-trigger" id="nav-{key}" aria-expanded="false" aria-controls="nav-panel-{key}">{label}<span class="nav-chevron" aria-hidden="true"></span></button>'
                f'<div class="nav-panel" id="nav-panel-{key}" aria-labelledby="nav-{key}" hidden>{links}</div></div>')
    play = group('play', 'Spill', (
        ('jam', 'backingtracks.html', 'Backingtracks', 'Spill med trommer, bass og piano.'),
        ('chords', 'akkorder.html', 'Akkordverksted', 'Bygg akkordrekker og utforsk grep.'),
    ))
    learn = group('learn', 'Studier', (
        ('path', 'laeringssti.html', 'Start å lære', 'Finn ditt utgangspunkt og neste steg.'),
        ('curriculum', 'laereplan.html', 'Hele utdanningsløpet', 'Se nivåene, fagområdene og progresjonen.'),
        ('lesson', 'undervisning.html', 'Leksjoner og øvelser', 'Prøv undervisningsmoduler under utvikling.'),
        ('theory', 'teori.html', 'Utforsk musikkteori', 'Interaktive verktøy for harmoni og teori.'),
    ))
    return (
        f'<header class="site-header"><a class="brand" href="{home}" aria-label="MODUS – forsiden">'
        '<span class="brandmark" aria-hidden="true">m</span>MODUS<span class="branddot">.</span></a>'
        '<nav class="site-nav" aria-label="Hovedmeny">' + link('home', './', 'Hjem') + learn + play + link('mindmap', 'musikkart.html', 'Mitt musikkatlas') + link('articles', 'artikler.html', 'Artikler')
        + link('about', 'om-modus.html', 'Om MODUS') + '</nav><div class="header-tools">'
        + link('membership', 'modus-plus.html', 'Medlemskap', css='nav-membership')
        + link('account', 'konto.html', 'Logg inn', css='nav-account')
        + render_language_picker() + render_theme_picker() + '</div></header>'
    )


def render_language_picker():
    return (
        '<nav class="language-picker" aria-label="Språk / Language">'
        '<a href="?lang=nb" data-language="nb" lang="nb" hreflang="nb" aria-label="Norsk" title="Norsk" aria-current="true">'
        '<span aria-hidden="true">🇳🇴</span> NO</a>'
        '<a href="?lang=en" data-language="en" lang="en" hreflang="en" aria-label="English" title="English">'
        '<span aria-hidden="true">🇬🇧</span> EN</a></nav>'
    )


def render_theme_picker():
    return (        '<details class="theme-picker"><summary><span aria-hidden="true">◐</span> Visning'
        '<span class="theme-current" data-theme-name>Original</span></summary>'
        '<fieldset class="theme-options"><legend>Velg visning</legend>'
        '<label><input type="radio" name="modus-theme" value="original" checked>'
        '<span><strong>Original</strong><small>Mørke naturfarger, slik siden er nå.</small></span></label>'
        '<label><input type="radio" name="modus-theme" value="readable">'
        '<span><strong>Lesevennlig</strong><small>Lys bakgrunn, mørk tekst og større leseskrift.</small></span></label>'
        '<label><input type="radio" name="modus-theme" value="contrast">'
        '<span><strong>Høy kontrast</strong><small>Svart-hvitt, tydelige rammer og mindre dekor.</small></span></label>'
        '<p>Valget huskes i denne nettleseren.</p></fieldset></details>'
        '<span id="theme-status" class="theme-sr-only" role="status" aria-live="polite"></span>'
    )


def with_navigation_css(page, prefix=''):
    root = Path(__file__).resolve().parents[1] / 'dist'
    paths = {}
    for suffix in ('css', 'js'):
        data = (root / ('navigation.' + suffix)).read_bytes()
        filename = 'navigation.' + hashlib.sha256(data).hexdigest()[:10] + '.' + suffix
        (root / filename).write_bytes(data)
        paths[suffix] = prefix + filename
    page = re.sub(r'<script src="(?:\.\./)?navigation(?:\.[a-f0-9]{10})?\.js" defer></script>', '', page)
    page = re.sub(r'<link rel="stylesheet" href="(?:\.\./)?navigation(?:\.[a-f0-9]{10})?\.css">', '', page)
    page = page.replace('</head>', f'<link rel="stylesheet" href="{paths["css"]}"><script src="{paths["js"]}" defer></script></head>', 1)
    if 'language-init.js' not in page:
        page = page.replace('<head>', f'<head><script src="{prefix}language-init.js"></script>', 1)
    if 'language.js"' not in page:
        page = page.replace('</head>', f'<script src="{prefix}language.js" defer></script></head>', 1)
    if 'theme-init.js' not in page:
        page = page.replace('<head>', f'<head><script src="{prefix}theme-init.js"></script>', 1)
    if f'href="{prefix}theme-palette.css"' not in page:
        page = page.replace('</head>', f'<link rel="stylesheet" href="{prefix}theme-palette.css"><link rel="stylesheet" href="{prefix}themes.css"><script src="{prefix}theme.js" defer></script></head>', 1)
    if (root / 'account.js').exists():
        digest = hashlib.sha256((root / 'account.js').read_bytes()).hexdigest()[:10]
        filename = f'account.{digest}.js'
        (root / filename).write_bytes((root / 'account.js').read_bytes())
        page = re.sub(r'<script src="(?:\.\./)?account(?:\.[a-f0-9]{10})?\.js" defer></script>', '', page)
        page = page.replace('</head>', f'<script src="{prefix}{filename}" defer></script></head>', 1)
    # Shared visitor feedback is added at build time, including article and language pages.
    if 'feedback.css' not in page:
        page = page.replace('</head>', f'<link rel="stylesheet" href="{prefix}feedback.css"><script src="{prefix}feedback.js" defer></script></head>', 1)
    page = page.replace('class="nav-account"', 'class="nav-account" data-account-link')
    if 'class="footer-editor"' not in page:
        page = page.replace('</footer>', '<a class="footer-editor" href="/redaktor.html">Redaktør <span aria-hidden="true">↗</span></a></footer>', 1)
    return page


def apply_navigation(page, active, prefix=''):
    page, count = re.subn(r'<header\b[^>]*>.*?</header>', lambda _: render_header(prefix, active), page, count=1, flags=re.S)
    if count != 1:
        raise ValueError('Expected one site header')
    return with_navigation_css(page, prefix)
