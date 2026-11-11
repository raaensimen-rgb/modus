"""Scoped article-library hero using existing approved landscape and ribbon assets."""
from pathlib import Path
import hashlib,re,sys
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target).resolve();css=(R/'article-library-hero.css').read_bytes();name='article-library-hero.'+hashlib.sha256(css).hexdigest()[:10]+'.css'
 landscape=(R/'scripts/library-landscape.html').read_text().strip()
 style,script=landscape.split('</style>\n',1)
 for pre,en in [('',False),('en/',True)]:
  root=target/pre;p=root/'artikler.html';s=p.read_text()
  match=re.search(r'<section class="articles-hero(?: library-hero)?">([\s\S]*?)</section>',s);assert match,p
  if 'library-hero-copy' not in match[1]:
   copy=re.search(r'^<div>([\s\S]*?)</div>',match[1]);assert copy,p
   intro=copy[1]
  else:intro=re.search(r'<div class="library-hero-copy">([\s\S]*?)<div class="library-hero-actions">',match[1])[1]
  explore='Explore the articles' if en else 'Utforsk artiklene';about='About the article library' if en else 'Om artikkelbiblioteket'
  hero='<section class="articles-hero library-hero"><div class="library-hero-copy">'+intro+f'<div class="library-hero-actions"><a class="library-hero-primary" href="#library">{explore}<span aria-hidden="true"> ↗</span></a><a class="library-hero-secondary" href="#learningOverviewTitle">{about}</a></div></div><div class="articles-landscape" aria-hidden="true"><img src="images/modus-design-landscape.png" width="1536" height="1024" alt="" fetchpriority="high" decoding="async"></div><img class="library-hero-wave" src="images/modus-continuous-wave.svg" alt="" aria-hidden="true"></section>'
  s=s[:match.start()]+hero+s[match.end():]
  s=s.replace('id="learningOverviewTitle">','id="learningOverviewTitle" tabindex="-1">')
  s=re.sub(r'<link rel="stylesheet" href="article-library-hero\.[a-f0-9]{10}\.css">','',s)
  s=s.replace('</head>',f'<link rel="stylesheet" href="{name}"></head>',1)
  if 'id="modus-library-landscape"' not in s:
   s=s.replace('</head>',style+'</style></head>',1)
   s=s.replace('</header>','</header>'+script,1)
  for old in root.glob('article-library-hero.*.css'):old.unlink()
  (root/name).write_bytes(css);p.write_text(s)
 print('Integrated NB/EN article-library hero only:',name)
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')
