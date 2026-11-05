"""52 selected NB versions, 16 EN editions; no fabricated academic review."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from publication import article_text_version,public_articles,load_policy,preview_catalog_cards,public_illustrations,article_permission
p=load_policy();source=json.loads((ROOT/'content/articles.json').read_text());assert len(source)==52
for locale,prefix,count in [('nb','',52),('en','en/',16)]:
 allowed=public_articles(ROOT,locale);assert len(allowed)==count;assert len(public_illustrations(ROOT,locale))==count;assert not preview_catalog_cards(ROOT,locale)
 listing=(ROOT/'dist'/prefix/'artikler.html').read_text();assert listing.count('data-article-id=')==count;assert 'catalog-preview-card' not in listing
 for a in allowed:
  r=p['articles'][a['slug']];assert r['editorial_status']=='draft' and r['personal_mastery_status']=='not_documented';assert r['source_control_status']!='approved'
  assert r['publication_evidence'][locale]['reviewed_version_sha256']==article_text_version(a,locale,ROOT)
  t=(ROOT/'dist'/prefix/'artikler'/(a['slug']+'.html')).read_text();assert 'data-publication-hold' not in t;assert t.count('<section id="del-')==len(a['sections'])
  changed={**a,'intro':a['intro']+' UNSELECTED_VERSION'};assert not article_permission(r,changed,locale,ROOT)
 for a in source[count:] if locale=='en' else []:assert 'data-publication-hold' in (ROOT/'dist'/prefix/'artikler'/(a['slug']+'.html')).read_text()
assert not article_permission(None,{**source[0],'slug':'private-unselected-draft'})
print('52 NB / 16 EN exact versions; private drafts and altered text remain denied; academic status unchanged.')
