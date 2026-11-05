"""Explicit build-only isolation. No changes to ordinary publication permissions."""
import os
from pathlib import Path

PROJECT = 'modus-2-preview'
BRANCH = 'dev/modus-2-pr52'
CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; form-action 'none'; base-uri 'self'; object-src 'none'; worker-src 'none'"
NOTICE = {
 'nb': 'Isolert testversjon: Innlogging, kontaktinnsending og redaktørfunksjoner er utilgjengelige. Fremdrift lagres bare i denne nettleseren.',
 'en': 'Isolated test version: Sign-in, contact submissions and editor features are unavailable. Progress is stored only in this browser.'
}

def isolated():
    value = os.environ.get('MODUS_ISOLATED_PREVIEW', '')
    if value not in ('', '0', '1'):
        raise ValueError('MODUS_ISOLATED_PREVIEW must be unset, 0 or 1')
    # A project explicitly marked as isolated must never silently build ordinary clients.
    target = os.environ.get('MODUS_PREVIEW_PROJECT', '')
    if target == PROJECT and value != '1':
        raise ValueError('Isolated Preview project requires MODUS_ISOLATED_PREVIEW=1')
    if value != '1':
        return False
    if target != PROJECT or os.environ.get('CF_PAGES_BRANCH') != BRANCH:
        raise ValueError('Isolated Preview requires explicit project and development branch')
    if os.environ.get('MODUS_CATALOG_PREVIEW') != '1':
        raise ValueError('Isolated Preview requires MODUS_CATALOG_PREVIEW=1')
    if os.environ.get('CONTEXT') == 'production' or os.environ.get('MODUS_PLATFORM_RELEASE') not in (None, '', '0'):
        raise ValueError('Production/release context is forbidden in isolated Preview')
    return True


def feedback_source(root):
    """Keep the existing help/contact layout, omit the entire network submit handler."""
    text = (Path(root)/'feedback.js').read_text()
    anchor = "form.addEventListener('submit',async e=>{"
    if text.count(anchor) != 1 or not text.rstrip().endswith('})();'):
        raise ValueError('Feedback source changed: isolation transform requires review')
    text = text.split(anchor)[0]
    text = text.replace("const root=document.createElement('aside');", "t.intro=en?'Contact submissions are unavailable in this isolated test version.':'Kontaktinnsending er utilgjengelig i denne isolerte testversjonen.';t.privacy=en?'Nothing is sent. Use the public learning tools without signing in.':'Ingenting sendes. Bruk de offentlige læringsverktøyene uten innlogging.';\nconst root=document.createElement('aside');")
    text = text.replace("if(open)panel.querySelector('select').focus();", 'if(open)status.focus();')
    return text + """status.tabIndex=-1;
status.textContent=en?'Contact submissions are unavailable in this isolated test version.':'Kontaktinnsending er utilgjengelig i denne isolerte testversjonen.';
form.querySelectorAll('input,textarea,select,button[type=submit]').forEach(e=>e.disabled=true);
form.addEventListener('submit',e=>e.preventDefault());
})();
"""
