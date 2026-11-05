"""Finalize the public artifact boundary after *all* generators have run."""
import json
import re
from pathlib import Path
from publication import ROOT, public_articles
from article_library import ORDER

dist = ROOT / 'dist'
for locale, prefix in [('nb', ''), ('en', 'en/')]:
    allowed = [a['slug'] for a in public_articles(ROOT, locale)]
    for name, pattern in [('article-quiz.js', r'const IDS = \[[^\]]*\]'),
                          ('articles.js', r'const orderedIds=\[[^\]]*\]')]:
        file = dist / prefix / name
        text = file.read_text()
        match = re.search(pattern, text)
        if not match:
            raise ValueError('Cannot locate public article ID registry: ' + str(file))
        old = json.loads(match[0][match[0].index('['):])
        ids = [x for x in ORDER if x in allowed]
        text = text[:match.start()] + match[0][:match[0].index('[')] + json.dumps(ids) + text[match.end():]
        file.write_text(text)
print('Finalized public-only article IDs; no private editorial source is deployed.')

# P1: public content builds must not replace the protected administrator or open its UI.
# Keep the existing public unavailable route while cloud publishing remains disabled.
if json.loads((ROOT/'cms/deployment-config.json').read_text()).get('publishingEnabled') is not True:
    from editor_boundary import preserve_public_editor_hold
    preserve_public_editor_hold(ROOT)
