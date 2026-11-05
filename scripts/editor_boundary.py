"""Public unavailable surface; the protected administrator keeps its own origin and CMS."""
from pathlib import Path
import re

def preserve_public_editor_hold(root):
    root=Path(root);dist=root/'dist'
    source=(root/'cms/editor.html').read_text()
    brand=re.search(r'<a class="brand editor-brand".*?</a>',source,re.S)
    if not brand:raise ValueError('Missing existing administrator identity')
    for locale in ('nb','en'):
        prefix='../' if locale=='en' else ''
        label='Editor unavailable' if locale=='en' else 'Redaktøren er utilgjengelig'
        message='Use the existing protected administrator address. This public page does not open drafts.' if locale=='en' else 'Bruk den eksisterende beskyttede administratoradressen. Denne offentlige siden åpner ikke utkast.'
        back='Back to MODUS' if locale=='en' else 'Tilbake til MODUS'
        mark=brand[0].replace('href="/"',f'href="/{"en/" if locale=="en" else ""}"')
        if locale=='en':mark=mark.replace('MODUS – forsiden','MODUS home')
        page=f'''<!doctype html><html lang="{locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{label} · MODUS</title><link rel="icon" type="image/svg+xml" href="{prefix}modus-identity-icon.svg"><link rel="stylesheet" href="{prefix}home.css"><link rel="stylesheet" href="{prefix}editor.css"><link rel="stylesheet" href="{prefix}design-system.css"></head><body class="editor-page"><header class="editor-top">{mark}</header><main class="account-page"><section class="account-intro"><h1>{label}</h1><p data-preview-unavailable role="note">{message}</p><a class="button" href="https://dev-modus-2-pr52.modus-2-preview.pages.dev/redaktor">{'Open protected administrator' if locale=='en' else 'Åpne beskyttet administrator'}</a> <a class="button" href="/{'en/' if locale=='en' else ''}">{back}</a></section></main></body></html>'''
        target=dist/('en' if locale=='en' else '')/'redaktor.html';target.parent.mkdir(exist_ok=True);target.write_text(page)
