"""UX-001: small entry points over the existing public article route."""
from pathlib import Path
import re,html,hashlib,json,shutil
from article_library import ORDER
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target);data=json.loads((R/'content/articles.json').read_text());assert len(data)==52 and len(set(ORDER))==52
 for pre,en in [('',False),('en/',True)]:
  base=target/pre;catalog=(base/'artikler.html').read_text()
  visible=set(re.findall(r'data-article-id="([^"]+)"',catalog));ids=[s for s in ORDER if s in visible]
  assert len(ids)==(16 if en else 52) and ids[0]=='toner-og-intervaller'
  titles={}
  for slug in ids:
   s=(base/'artikler'/f'{slug}.html').read_text();assert 'data-quiz-id="'+slug+'"' in s
   titles[slug]=re.sub('<[^>]+>','',re.search(r'<h1[^>]*>([\s\S]*?)</h1>',s)[1])
  esc=lambda s:html.escape(s,quote=True)
  css=(R/'start-here.css').read_bytes();js=(R/'start-here.js').read_bytes()
  css_name='start-here.'+hashlib.sha256(css).hexdigest()[:10]+'.css';js_name='start-here.'+hashlib.sha256(js).hexdigest()[:10]+'.js'
  (base/css_name).write_bytes(css);(base/js_name).write_bytes(js)
  def assets(s,reader=False,runtime=False):
   prefix='../' if reader else ''
   s=s.replace('</head>',f'<link rel="stylesheet" href="{prefix}{css_name}"></head>',1)
   if runtime:s=s.replace('</body>',f'<script src="{js_name}" defer></script></body>',1)
   return s
  route=[{'id':s,'title':html.unescape(titles[s]),'href':'artikler/'+s+'.html'} for s in ids]
  # A template, not executable inline code; runtime uses only these known public IDs.
  resume='<aside class="start-resume" data-start-resume hidden><a class="start-resume-link" data-start-resume-link href="artikler/'+ids[0]+'.html"><span class="start-resume-label">'+('Continue where you left off' if en else 'Fortsett der du slapp')+'</span><strong data-start-resume-title></strong><span class="start-resume-note" data-start-resume-note></span></a></aside>'
  route_data='<template id="start-reading-route">'+esc(json.dumps(route,ensure_ascii=False))+'</template>'
  p=base/'index.html';s=p.read_text();m=re.search(r'(<div class="hero-actions">\s*)(<a\b[\s\S]*?</a>)',s);assert m
  a=m[2];a=re.sub(r'href="[^"]+"',f'href="artikler/{ids[0]}.html" data-start-learning',a,count=1)
  label='Start learning music theory' if en else 'Start å lære musikkteori'
  a=re.sub(r'(</svg>)[\s\S]*?</a>',r'\g<1>'+label+'</a>',a,count=1)
  s=s[:m.start()]+m[1]+a+s[m.end():]
  # Reuse current hero; no extra tall introduction or competing primary CTA.
  s=s.replace('</main>',resume+route_data+'</main>',1)
  # Resume sits directly after the hero, in normal document order.
  s=s.replace(resume,'',1);hero_end=s.index('</section>',s.index('class="hero home-hero"'))+10;s=s[:hero_end]+resume+s[hero_end:]
  p.write_text(assets(s,runtime=True))
  p=base/'artikler.html';s=p.read_text();marker='Recommended start' if en else 'Anbefalt start'
  pattern=r'(<article\b[^>]*data-article-id="'+ids[0]+r'"[^>]*>)([\s\S]*?)(<div class="card-copy">)'
  m=re.search(pattern,s);assert m
  opening=m[1].replace('class="article-card','class="article-card start-recommended',1)
  s=s[:m.start()]+opening+m[2]+m[3]+f'<span class="start-badge">{marker}</span>'+s[m.end():]
  s=s.replace('</main>',resume+route_data+'</main>',1);p.write_text(assets(s,runtime=True))
  for i,slug in enumerate(ids):
   p=base/'artikler'/f'{slug}.html';s=p.read_text()
   m=re.search(r'<section class="article-practice">[\s\S]*?<a class="button" href="([^"]+)"[^>]*>([\s\S]*?)</a>',s);assert m,p
   practice=m[1];practice_label=re.sub('<[^>]+>','',m[2]).strip()
   # Do not invent or expose a private F03 route: use the article's current practice link.
   if 'laer-dorisk.html' in html.unescape(practice).split('?')[0]:
    practice='../teori.html#moduser';practice_label='Explore scales and modes with a piano' if en else 'Utforsk skalaer og moduser med piano'
    old=m[0];new=old.replace(m[1],practice,1);new=new[:new.index('>',new.index('<a class="button"'))+1]+practice_label+'</a>'
    s=s.replace(old,new,1)
   editorial=next(x for x in data if x['slug']==slug).get('next_step')
   canonical=ids[i+1] if i+1<len(ids) else None
   if editorial and editorial['slug']!=canonical:
    s=re.sub(r'(<section class="article-next"[^>]*><p class="eyebrow">)[^<]+',lambda m:m[1]+('RELATED READING' if en else 'RELATERT FORDYPNING'),s,count=1)
   index=f'Article {i+1} of {len(ids)}' if en else f'Artikkel {i+1} av {len(ids)}'
   nav='<nav class="start-reading" aria-label="'+('Suggested reading order' if en else 'Anbefalt leserekkefølge')+'"><p class="start-reading-position">'+('Suggested order' if en else 'Anbefalt rekkefølge')+' · '+index+'</p><div class="start-reading-links">'
   if i:
    nav+=f'<a rel="prev" class="start-reading-prev" href="{ids[i-1]}.html"><span>'+('Previous article' if en else 'Forrige artikkel')+'</span><strong>'+titles[ids[i-1]]+'</strong></a>'
   if i+1<len(ids):
    nav+=f'<a rel="next" class="start-reading-next" href="{ids[i+1]}.html"><span>'+('Next recommended article' if en else 'Neste anbefalte artikkel')+'</span><strong>'+titles[ids[i+1]]+'</strong><span aria-hidden="true">→</span></a>'
   nav+='</div><div class="start-reading-tools"><a class="start-practice" href="'+practice+'"><span>'+('Practical exercise' if en else 'Praktisk øvelse')+'</span><strong>'+practice_label+'</strong></a><a href="../artikler.html">'+('Browse all articles' if en else 'Se alle artiklene')+'</a></div></nav>'
   assert '<section class="related">' in s,p
   s=s.replace('<section class="related">',nav+'<section class="related">',1);p.write_text(assets(s,reader=True))
 print('UX-001 integrated: 52 NB / 16 EN readers; existing practice and progress')
