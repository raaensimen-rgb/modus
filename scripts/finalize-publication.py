"""Finalize the public artifact boundary after *all* generators have run."""
import json
import re
from pathlib import Path
from publication import ROOT, public_articles

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
        ids = [x for x in old if x in allowed]
        text = text[:match.start()] + match[0][:match[0].index('[')] + json.dumps(ids) + text[match.end():]
        file.write_text(text)
print('Finalized public-only article IDs; no private editorial source is deployed.')
