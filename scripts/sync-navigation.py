from pathlib import Path
from site_navigation import apply_navigation

root = Path(__file__).resolve().parents[1] / 'dist'
active_pages = {
    'index.html': 'home',
    'konto.html': 'account',
    'backingtracks.html': 'jam',
    'teori.html': 'theory',
    'laereplan.html': 'curriculum',
    'undervisning.html': 'lesson',
    'akkorder.html': 'chords',
    'artikler.html': 'articles',
    'laer-dorisk.html': 'course',
    'laeringssti.html': 'path',
    'modus-plus.html': 'membership',
    'betaling-test.html': 'membership',
    'om-modus.html': 'about',
}
for page in root.rglob('*.html'):
    path = page.relative_to(root)
    if path.parts[0] == 'en' or str(path) == 'redaktor.html':
        continue
    if path.parts[0] == 'artikler':
        active, prefix = 'articles', '../'
    else:
        active, prefix = active_pages[str(path)], ''
    page.write_text(apply_navigation(page.read_text(), active, prefix))
print('Updated shared navigation on all pages.')
