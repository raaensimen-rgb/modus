from pathlib import Path
from html.parser import HTMLParser
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
class Cards(HTMLParser):
 """Inspect real elements; class order/extra classes must not bypass checks."""
 def __init__(self,html):
  super().__init__(convert_charrefs=True)
  self.nodes=[];self.card=None;self.capture=None
  self.feed(html)
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='article' and 'upcoming-card' in attrs.get('class','').split():
   assert self.card is None, 'Unexpected nested planned card'
   self.card={'elements':[],'titles':[],'statuses':[]}
  if self.card is None:return
  self.card['elements'].append((tag,attrs))
  kind='titles' if tag=='h2' else 'statuses' if 'upcoming-status' in attrs.get('class','').split() else None
  if kind:
   self.card[kind].append('');self.capture=(tag,kind)
 def handle_data(self,text):
  if self.card is not None and self.capture:self.card[self.capture[1]][-1]+=text
 def handle_endtag(self,tag):
  if self.capture and tag==self.capture[0]:self.capture=None
  if tag=='article' and self.card is not None:
   self.nodes.append(self.card);self.card=None;self.capture=None

def validate_card(card,status):
 for tag,attrs in card['elements']:
  assert tag not in {'a','button','input','select','textarea','summary','iframe'}, f'Planned card contains interactive {tag}'
  assert not any(key.startswith('on') or key in {'href','tabindex','contenteditable'} for key in attrs), 'Planned card has interactive attributes'
  assert attrs.get('role') not in {'button','link'}, 'Planned card has interactive role'
 assert len(card['titles'])==1 and card['titles'][0].strip(), 'Planned card needs one nonempty heading'
 assert [s.strip() for s in card['statuses']]==[status], 'Missing or incorrect upcoming status'

translations=json.loads((ROOT/'content/i18n/en.json').read_text(encoding='utf-8'))
for line in (ROOT/'content/i18n/dynamic.tsv').read_text(encoding='utf-8').splitlines():
 if line:
  key,value=line.split('\t',1);translations[key]=value
for locale,status in [('', 'Kommer'),('en/', 'Coming soon')]:
 page=(ROOT/'dist'/locale/'artikler.html').read_text(encoding='utf-8')
 assert 'class="upcoming-library"' not in page
 cards=Cards(page).nodes
 assert len(cards)==5, f'{locale}: expected five planned cards'
 for card in cards:validate_card(card,status)
 expected=[translations[a['title']] if locale else a['title'] for a in upcoming]
 actual=[card['titles'][0].strip() for card in cards]
 assert sorted(actual)==sorted(expected), f'{locale}: planned titles missing, duplicated or incorrect'

# Negative probes prove that passive-state checks actually reject regressions.
fixture='<article class="extra upcoming-card"><span class="upcoming-status">Kommer</span><h2>Planlagt</h2>{}</article>'
validate_card(Cards(fixture.format('')).nodes[0],'Kommer')
for injection in ['<a>Åpne</a>','<button>Åpne</button>','<div onkeydown="open()">Åpne</div>',
                  '<div tabindex="0">Åpne</div>','<div role="link">Åpne</div>']:
 try:validate_card(Cards(fixture.format(injection)).nodes[0],'Kommer')
 except AssertionError:pass
 else:raise AssertionError('Interactive planned card was accepted: '+injection)
try:validate_card(Cards(fixture.format('').replace('Kommer','')).nodes[0],'Kommer')
except AssertionError:pass
else:raise AssertionError('Empty upcoming status was accepted')

print('Upcoming cards: five correct titles and passive labelled cards in each locale; six negative probes rejected.')

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
