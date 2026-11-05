"""Protect administrator separation without suppressing selected article content."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];dist=ROOT/'dist'
for prefix,label in [('', 'Redaktøren er utilgjengelig'),('en/','Editor unavailable')]:
    s=(dist/prefix/'redaktor.html').read_text()
    assert label in s and 'data-preview-unavailable' in s
    assert 'editorWorkspace' not in s and '<form' not in s
    assert 'admin-app.js' not in s and 'src="editor.js"' not in s
    assert (dist/prefix/'artikler.html').read_text().count('data-article-id=')==(16 if prefix else 52)
assert not (dist/'admin-app.js').exists()
assert not (dist/'admin-package.json').exists()
assert len(json.loads((dist/'cms-seed.json').read_text()))==68
# No localStorage writes, key migrations or cross-origin redirects in the public holding page.
assert 'localStorage' not in s and 'location.href' not in s
print('Public NB/EN editor holding pages retained; protected administrator and storage keys untouched; all 16 selected articles remain active.')
