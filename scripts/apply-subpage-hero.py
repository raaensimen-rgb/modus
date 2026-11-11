"""Shared, presentation-only hero for Study/Tools routes; no publication changes."""
from pathlib import Path
import hashlib,re,sys
R=Path(__file__).resolve().parents[1]
PAGES={'laeringssti':'path-hero','laereplan':'curriculum-hero','teori':'theory-hero','backingtracks':'intro','akkorder':'theory-hero','undervisning':None,'grunnstudier':None,'laer-dorisk':None,'f03-laeringsreise':'dynamic','modus-plus':'membership-hero'}
FULL_WIDTH_PAGES={'laeringssti','teori','laereplan','undervisning','backingtracks','akkorder','skalabibliotek'}

def full_width_study_hero(page):
 template=(R/'scripts/full-width-study-hero.html').read_text().strip()
 style,script=template.split('</style>\n',1)
 return page.replace('</head>',style+'</style></head>',1).replace('</header>','</header>'+script,1)

def apply(target):
 target=Path(target).resolve()
 css=(R/'subpage-hero.css').read_bytes();name='subpage-hero.'+hashlib.sha256(css).hexdigest()[:10]+'.css'
 for prefix in ('','en/'):
  base=target/prefix;(base/name).write_bytes(css)
  for slug,kind in {**PAGES,'skalabibliotek':None}.items():
   p=base/(slug+'.html');s=p.read_text()
   if slug in FULL_WIDTH_PAGES and 'id="modus-study-landscape"' not in s:
    s=full_width_study_hero(s)
   if slug=='skalabibliotek':
    p.write_text(s);continue
   if 'shared-hero-page' in s:
    s=re.sub(r'<link rel="stylesheet" href="subpage-hero\.[a-f0-9]{10}\.css">','',s)
    p.write_text(s.replace('</head>',f'<link rel="stylesheet" href="{name}"></head>',1));continue
   if kind=='dynamic':
    # Runtime header retains all existing translated copy, progress and events.
    pass
   elif kind:
    m=re.search(r'<section class="'+kind+r'"[^>]*>([\s\S]*?)</section>',s);assert m,p
    content=m[1]
    content=re.sub(r'<div class="(?:intro-art|theory-landscape|membership-landscape)"[^>]*>[\s\S]*?</div>','',content)
    hero=m[0][:m[0].index('>')+1].replace('class="'+kind+'"','class="'+kind+' subpage-hero"')+'<div class="subpage-hero-copy">'+content+'</div></section>'
    s=s[:m.start()]+hero+s[m.end():]
    if slug=='laeringssti':
     resume=re.search(r'<section class="journey-resume"[^>]*>[\s\S]*?</section>',s)
     if resume:s=s.replace(resume[0],'',1).replace(hero,hero+resume[0],1)
   else:
    m=re.search(r'(<main\b[^>]*data-publication-hold[^>]*>)([\s\S]*?)(<div id="quiz"></div>)(</main>)',s);assert m,p
    s=s[:m.start()]+m[1]+'<section class="subpage-hero"><div class="subpage-hero-copy">'+m[2]+'</div></section>'+m[3]+m[4]+s[m.end():]
   s=s.replace('<body class="modus-interior">','<body class="modus-interior shared-hero-page">')
   assert 'shared-hero-page' in s,p
   s=s.replace('</head>',f'<link rel="stylesheet" href="{name}"></head>',1)
   p.write_text(s)
 print(f'Shared hero: {len(PAGES)} routes × NB/EN;',name)
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')
