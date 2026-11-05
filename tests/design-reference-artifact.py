"""Preserve published content and safety while integrating the approved visual reference."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parents[1];P=R.parent/'package';B=R.parents[1]/'restore-original-images-20261105/package'
for pre,count in [('',52),('en/',16)]:
 index=(P/(pre+'artikler.html')).read_text();assert index.count('data-article-id=')==count
 for path in (B/(pre+'artikler')).glob('*.html'):
  old=path.read_text();new=(P/pre/'artikler'/path.name).read_text()
  a=re.search(r'<main\b[\s\S]*?</main>',old);b=re.search(r'<main\b[\s\S]*?</main>',new)
  assert a and b and a[0]==b[0],str(path)
 for file in ['app.js','chord-tool.js','piano-interaction.js','theory.js','midi.js','account.js','article-quiz.js','articles.js','musikkart.js','learning-journey.js','preview-guard.js']:
  if (B/(pre+file)).exists():assert (B/(pre+file)).read_bytes()==(P/(pre+file)).read_bytes(),file
 for image in (B/(pre+'images/articles')).rglob('*'):
  if image.is_file():assert image.read_bytes()==(P/image.relative_to(B)).read_bytes(),str(image)
for name in ['admin-app.js','admin-package.json','editor.js','_worker.js','content/articles.json','library-draft-backup.json']:
 assert not (P/name).exists(),name
assert json.loads((P/'cms-seed.json').read_text())==[]
assert not (P/'media/modus-introduksjon.mp4').exists()
assert not (P/'design-references').exists()
assert 'stroke-dasharray' not in (P/'images/modus-continuous-wave.svg').read_text()
for pre in ['','en/']:
 html=(P/(pre+'index.html')).read_text();assert 'data-modus-preview="isolated"' in html;assert 'Content-Security-Policy' in html
 assert 'preview-guard.js' in html and 'global-search' in html
 assert 'data-intro-film-open' in html and 'film-unavailable' not in html
 assert html.count('class="home-portal"')==4
 assert re.search(r'design-refresh\.[a-f0-9]{10}\.css',html)
# No secrets, source maps or backend-enabled transport in final public resources.
for p in P.rglob('*'):
 if not p.is_file():continue
 assert not p.is_symlink()
 if p.suffix in ('.js','.html','.json','.css'):
  text=p.read_text();assert not re.search(r'sb_secret_[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|cms_save_draft|cms_publish_article',text),str(p)
print('Final artifact: 52 NB / 16 EN retained; all 104 existing reader bodies, learning/audio/storage runtime and article illustrations unchanged; public CMS empty, admin absent, retired film remains withheld; approved replacement is enabled, no dotted waves or private reference image.')
