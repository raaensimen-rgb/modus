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
