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
for token in ('.upcoming-grid','.upcoming-card','.upcoming-heading','.upcoming-status'):
 assert token in source, f'Missing source stylesheet selector: {token}'
page=(ROOT/'dist/artikler.html').read_text(encoding='utf-8')
assert page.count('class="upcoming-card"')==5
section=re.search(r'<section class="upcoming-library".*?</section>',page,re.S)
assert section, 'Upcoming section not rendered'
assert not re.search(r'<a\b|href=|onclick=',section[0]),'Upcoming cards must not be links'
for article in upcoming:assert article['title'] in section[0], article['slug']
print('PL-049 upcoming article cards, source CSS and non-clickable state validated')
