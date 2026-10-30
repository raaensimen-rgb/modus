from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
upcoming=json.loads((ROOT/'content/upcoming-articles.json').read_text(encoding='utf-8'))
articles=json.loads((ROOT/'content/articles.json').read_text(encoding='utf-8'))
assert len(upcoming)==5
assert len(articles)==16
assert not {a['slug'] for a in upcoming} & {a['slug'] for a in articles}
assert all(a['status']=='planned' for a in upcoming)
source=(ROOT/'articles.css').read_text(encoding='utf-8')
for token in ('.upcoming-card','.upcoming-status','.upcoming-illustration'):
 assert token in source, f'Missing source stylesheet selector: {token}'
page=(ROOT/'dist/artikler.html').read_text(encoding='utf-8')
assert page.count('class="upcoming-card"')==5
assert 'class="upcoming-library"' not in page
for card in re.findall(r'<article class="upcoming-card".*?</article>',page,re.S):
 assert not re.search(r'<a\\b|href=|onclick=',card),'Planned cards must not be links'
for article in upcoming:assert article['title'] in page, article['slug']

print('PL-049 upcoming article cards, source CSS and non-clickable state validated')

# QA-078-02: responsive guardrails for passive cards in narrow viewports.
# Static assertions complement (but do not replace) the 375 px browser QA.
mobile=source.split('/* QA-078-02:', 1)
assert len(mobile)==2, 'Missing passive card mobile regression styles'
mobile=mobile[1]
assert '@media (max-width: 550px)' in mobile
assert '.article-grid { grid-template-columns: minmax(0, 1fr); }' in mobile
assert '.article-grid > article.upcoming-card' in mobile
for rule in ('min-width: 0;', 'max-width: 100%;', 'flex-wrap: wrap;', 'overflow-wrap: anywhere;'):
 assert rule in mobile, f'Missing mobile width safeguard: {rule}'
assert '.articles-page { padding-bottom:' in mobile, 'Fixed contact button needs scroll clearance'
assert 'filter: blur(2px)' in source, 'Illustrations must retain 2px blur'
assert 'filter: blur(2px)' not in mobile, 'Mobile text must not be blurred'
assert 'class="upcoming-card"' in page and 'Coming soon' not in page, 'Check source-language markup separately'
