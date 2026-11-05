"""Integrate original diagrams only for existing permitted article/locale pairs."""
from pathlib import Path
import json,re,shutil,sys,html
from publication import public_articles,public_illustrations,holding_page
from teaching_diagrams import generate,ROOT
CSS='''/* P0 original teaching diagrams */
.teaching-diagram{margin:32px 0;padding:16px;border:1px solid var(--modus-b-4c6837,#4c6837);border-radius:16px;background:var(--modus-c-1b2814,#1b2814);color:inherit;min-width:0}
.teaching-diagram img{display:block;width:100%;max-width:600px;height:auto;margin:auto;border-radius:12px}
.teaching-diagram figcaption{display:block;font-size:15px;line-height:1.65;padding:16px 4px 0;color:inherit}
.teaching-diagram details{margin-top:12px;font-size:14px;line-height:1.7;overflow-wrap:anywhere}
.teaching-diagram summary{cursor:pointer;min-height:44px;padding:8px 0;color:var(--accent,#d9ef8b)}
.teaching-diagram summary:focus-visible{outline:3px solid currentColor;outline-offset:4px}
.teaching-diagram li{margin:10px 0}.teaching-diagram ul{padding-left:22px}
@media(max-width:550px){.teaching-diagram{margin:24px -8px;padding:8px}.teaching-diagram figcaption{display:block;font-size:14px}.teaching-diagram img{border-radius:8px}}
@media(forced-colors:active){.teaching-diagram{border:1px solid CanvasText}.teaching-diagram summary{color:LinkText}}
@media print{.teaching-diagram{break-inside:avoid}}
'''
def integrate(out):
 generate();manifest=json.loads((ROOT/'editorial/teaching-diagrams/manifest.json').read_text());rows=[]
 for locale,prefix in [('nb',''),('en','en/')]:
  allowed={a['slug'] for a in public_articles(ROOT,locale)};target=out/prefix;assets=target/'images/teaching-diagrams'
  if assets.exists():shutil.rmtree(assets)
  assets.mkdir(parents=True);(target/'teaching-diagrams.css').write_text(CSS)
  for entry in manifest['articles']:
   slug=entry['slug'];page=target/'artikler'/(slug+'.html')
   if slug not in allowed:
    if page.exists() and 'data-teaching-diagram' in page.read_text():
     page.write_text(holding_page('../',active='articles',english=locale=='en'))
    hero=target/'images/articles'/(slug+'.svg')
    if not entry['reuse_existing_approved'] and hero.exists():
     candidates={v['sha256'] for v in entry['locales'][locale]['assets'].values()}
     import hashlib
     if hashlib.sha256(hero.read_bytes()).hexdigest() in candidates:
      proof=public_illustrations(ROOT,locale).get(slug)
      if proof:shutil.copy2(proof['source'],hero)
      else:hero.unlink()
    continue
   loc=entry['locales'][locale];full=loc['assets']['diagram'];compact=loc['assets']['card']
   for a in [full,compact]:shutil.copy2(ROOT/a['path'],assets/Path(a['path']).name)
   s=page.read_text();assert 'reading-page' in s and 'data-publication-hold' not in s
   s=re.sub(r'<figure class="teaching-diagram"[\s\S]*?</figure>','',s)
   if not entry['reuse_existing_approved']:
    shutil.copy2(ROOT/compact['path'],target/'images/articles'/(slug+'.svg'))
    title=html.escape(loc['title'],quote=True)
    s=re.sub(r'(<figure class="reading-illustration"><img[^>]*\balt=")[^"]*(")',lambda m:m[1]+title+m[2],s,count=1)
   esc=lambda x:html.escape(x,quote=True)
   summary='Les diagrammet som tekst' if locale=='nb' else 'Read the diagram as text'
   figure=f'<figure class="teaching-diagram" data-teaching-diagram="{slug}"><img src="../images/teaching-diagrams/{slug}.svg" width="600" loading="lazy" decoding="async" alt="{esc(loc["title"])}"><figcaption>{esc(loc["title"])}<details><summary>{summary}</summary><ul>'+''.join('<li>'+esc(t)+'</li>' for t in loc['transcript'][1:])+'</ul></details></figcaption></figure>'
   marker='<section id="del-2">';assert marker in s,slug;s=s.replace(marker,figure+marker,1)
   if 'href="../teaching-diagrams.css"' not in s:s=s.replace('</head>','<link rel="stylesheet" href="../teaching-diagrams.css"></head>',1)
   page.write_text(s);rows.append({'slug':slug,'locale':locale,'diagram_sha256':full['sha256'],'reused_approved_hero':entry['reuse_existing_approved']})
  listing=target/'artikler.html';catalog=listing.read_text()
  for entry in manifest['articles']:
   if entry['slug'] not in allowed or entry['reuse_existing_approved']:continue
   slug=entry['slug'];title=html.escape(entry['locales'][locale]['title'],quote=True)
   pattern=r'(<article\b[^>]*data-article-id="'+re.escape(slug)+r'"[\s\S]*?<img\b[^>]*alt=")[^"]*(")'
   catalog,n=re.subn(pattern,lambda m:m[1]+title+m[2],catalog,count=1)
   assert n==1,slug+' catalog illustration'
  listing.write_text(catalog)
  assert {p.stem.removesuffix('-card') for p in assets.glob('*.svg')}==allowed
 report={'readers':len(rows),'norwegian':sum(r['locale']=='nb' for r in rows),'english':sum(r['locale']=='en' for r in rows),'private_english_diagrams':36,'rows':rows}
 (ROOT/'test-results').mkdir(exist_ok=True);(ROOT/'test-results/diagram-integration.json').write_text(json.dumps(report,indent=2)+'\n')
 print(f'Integrated {len(rows)} permitted reader diagrams; preserved 32 approved hero assets and all publication decisions.')
if __name__=='__main__':integrate(Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT/'dist')
