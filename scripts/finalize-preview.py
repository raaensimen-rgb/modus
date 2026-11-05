"""Finalize and attest the isolated artifact after all normal generators finish.
Ordinary builds are a strict no-op here. Publication registries stay untouched.
"""
import hashlib,html,json,os,re,subprocess
from pathlib import Path
from preview_mode import isolated,CSP,NOTICE,PROJECT,BRANCH
if not isolated():
    raise SystemExit(0)
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
# A stale marker must never attest a partially finalized artifact.
(DIST/'preview-isolation.json').unlink(missing_ok=True)
if json.loads((DIST/'cms-seed.json').read_text()) != []:
    raise ValueError('Isolated Preview requires an empty CMS seed; review any new publication scope')
if not re.search(r'salesOpen:\s*false', (DIST/'membership-config.js').read_text()) or not re.search(r'lifecycleReady:\s*false',(DIST/'membership-config.js').read_text()):
    raise ValueError('Isolated Preview cannot activate payment/membership services')
# Account presentation remains familiar, but no credential forms or auth UI are shipped.
for locale in ('nb','en'):
    base=DIST/('en' if locale=='en' else '')
    p=base/'konto.html';page=p.read_text()
    page=re.sub(r'<form\b[^>]*>.*?</form>','',page,flags=re.S)
    page=re.sub(r'<div class="account-tabs".*?</div>','',page,flags=re.S)
    page=re.sub(r'<details class="account-privacy".*?</details>','',page,flags=re.S)
    page=page.replace('<section class="account-intro">','<section class="account-intro"><p class="account-preview-note" data-preview-unavailable role="note">'+NOTICE[locale]+'</p>',1)
    page=re.sub(r'(<p id="accountLoading"[^>]*)(>)',r'\1 hidden\2',page)
    page=page.replace('<div id="accountGuest" hidden>','<div id="accountGuest">')
    p.write_text(page)
# The editor gets a static unavailable surface, not a disabled writer/client.
source=(ROOT/'cms/editor.html').read_text()
brand=re.search(r'<a class="brand editor-brand".*?</a>',source,re.S)
if not brand:raise ValueError('Editor identity missing')
for locale in ('nb','en'):
    prefix='../' if locale=='en' else ''
    label='Editor unavailable' if locale=='en' else 'Redaktøren er utilgjengelig'
    back='Back to MODUS' if locale=='en' else 'Tilbake til MODUS'
    mark=brand[0].replace('href="/"',f'href="/{"en/" if locale=="en" else ""}"')
    if locale=='en':mark=mark.replace('MODUS – forsiden','MODUS home')
    page=f'''<!doctype html><html lang="{locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{label} · MODUS</title><link rel="stylesheet" href="{prefix}home.css"><link rel="stylesheet" href="{prefix}editor.css"><link rel="stylesheet" href="{prefix}design-system.css"><link rel="icon" type="image/svg+xml" href="{prefix}modus-identity-icon.svg"></head><body class="editor-page"><header class="editor-top">{mark}</header><main class="account-page"><section class="account-intro"><h1>{label}</h1><p data-preview-unavailable role="note">{NOTICE[locale]}</p><a class="button" href="/{'en/' if locale=='en' else ''}">{back}</a></section></main></body></html>'''
    (DIST/('en/' if locale=='en' else '')/'redaktor.html').write_text(page)
for p in DIST.rglob('editor.js'):p.unlink()
for p in DIST.rglob('_worker.js'):p.unlink()
# Preserve all ordinary script URLs and cache hashes; add only the separate first-loaded guard.
for base in (DIST,DIST/'en'):
    (base/'preview-guard.js').write_bytes((ROOT/'client/preview-guard.js').read_bytes())
for p in DIST.rglob('*.html'):
    page=p.read_text()
    # Existing payment-test routes must not navigate into any shared checkout/portal.
    page=re.sub(r'href="https://(?:buy|billing)\.stripe\.com/[^"]*"', 'aria-disabled="true" tabindex="-1" data-preview-payment-disabled',page)
    if p.name=='betaling-test.html':
        locale='en' if p.parent.name=='en' else 'nb'
        message='Payments are unavailable in this isolated test version.' if locale=='en' else 'Betaling er utilgjengelig i denne isolerte testversjonen.'
        page=re.sub(r'(<main\b[^>]*>)',r'\1<p class="account-preview-note" data-preview-unavailable role="note">'+message+'</p>',page,count=1)
    page=re.sub(r'(<html\b[^>]*)(>)', r'\1 data-modus-preview="isolated"\2',page,count=1)
    prefix='../' if p.parent.name=='artikler' else ''
    if p.name=='redaktor.html' and p.parent.name=='en':prefix='../'
    page=re.sub(r'<meta\s+charset="utf-8"\s*>','',page,flags=re.I)
    security='<meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="'+html.escape(CSP,quote=True)+'"><script src="'+prefix+'preview-guard.js"></script>'
    page=page.replace('<head>','<head>'+security,1)
    p.write_text(page)
# Header enforcement is independent of JS, and meta enforcement works on plain local servers too.
(DIST/'_headers').write_text("/*\n  Content-Security-Policy: "+CSP+"; frame-ancestors 'none'\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n")
# Verify the final bytes, not only the chosen source entry point.
for p in DIST.rglob('*'):
    if not p.is_file():continue
    try:text=p.read_text()
    except UnicodeDecodeError:continue
    if re.search(r'[a-z0-9-]+\.supabase\.(?:co|in)|sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}|cms_save_draft|cms_publish_article',text,re.I):
        raise ValueError('Backend/credential material remains in isolated artifact: '+str(p.relative_to(DIST)))
# Build metadata is public provenance, never credentials. Source dirtiness is reported honestly.
try:
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
    source_dirty=bool(subprocess.check_output(['git','diff','--name-only','HEAD','--','.',':!dist'],cwd=ROOT,text=True))
except subprocess.CalledProcessError:
    sha=os.environ.get('CF_PAGES_COMMIT_SHA','');source_dirty=False
provided=os.environ.get('CF_PAGES_COMMIT_SHA')
if not re.fullmatch('[a-f0-9]{40}',sha) or (provided and provided!=sha):
    raise ValueError('Missing or mismatched source commit metadata')
manifest=sorted([{'path':p.relative_to(DIST).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in DIST.rglob('*') if p.is_file()],key=lambda row:row['path'])
marker={'schema_version':1,'mode':'isolated','project':PROJECT,'branch':BRANCH,'source_sha':sha,'tracked_source_dirty':source_dirty,'csp':CSP,'backend':'disabled','guest_progress':'browser-only','external_resource_origins':['https://fonts.googleapis.com','https://fonts.gstatic.com'],'files':manifest}
(DIST/'preview-isolation.json').write_text(json.dumps(marker,ensure_ascii=False,indent=2)+'\n')
print('Isolated Preview finalized: offline account, disabled feedback, static editor, CSP and file manifest.')
